/**
 * Three-layer memory roots and the closed @-scheme namespace.
 * Model-visible addresses are directory/item/core abstractions; filesystem
 * paths remain an internal implementation detail.
 */
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";

export const MEMORY_DIR_NAME = ".brain-data";
export const MEMORY_ROOT_REL = "memories";
export const MEMORY_TYPE_DIRS = ["decision", "knowledge", "intention", "skill"] as const;
export type MemoryType = (typeof MEMORY_TYPE_DIRS)[number];
export type MemoryLayer = "global" | "project" | "session";

export interface ResolvedRoots {
  globalRoot: string;
  projectRoot: string;
  sessionId: string;
}

/** v1 session ids are safe single filesystem segments (Design §5.3). */
export function validateSessionId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) || value === "." || value === "..") {
    throw new Error(
      `invalid session id "${value}": expected a single identifier matching ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`,
    );
  }
  return value;
}

export function projectBrainRoot(projectRoot: string): string {
  return resolve(projectRoot, MEMORY_DIR_NAME);
}

export function sessionBrainDir(projectRoot: string, sessionId: string): string {
  const sid = validateSessionId(sessionId);
  const sessionsRoot = resolve(projectBrainRoot(projectRoot), "sessions");
  const out = resolve(sessionsRoot, sid);
  if (dirname(out) !== sessionsRoot) {
    throw new Error(`invalid session id "${sessionId}": resolved outside sessions root`);
  }
  return out;
}

export function layerDir(roots: ResolvedRoots, layer: MemoryLayer): string {
  if (layer === "global") return roots.globalRoot;
  if (layer === "project") return projectBrainRoot(roots.projectRoot);
  return sessionBrainDir(roots.projectRoot, roots.sessionId);
}

export function resolveRoots(options: {
  projectRoot?: string;
  sessionId?: string;
  env?: NodeJS.ProcessEnv;
}): ResolvedRoots {
  const env = options.env ?? process.env;
  const projectRoot = resolve(options.projectRoot ?? env.BRAIN_PROJECT_ROOT ?? process.cwd());
  const globalRoot = resolve(env.BRAIN_HOME ?? resolve(homedir(), MEMORY_DIR_NAME));
  const sessionId = validateSessionId(options.sessionId ?? "default");
  return { globalRoot, projectRoot, sessionId };
}

/** Public memories namespace membership (directories + body items, never history/mechanism files). */
export function isMemoryFileRel(rel: string): boolean {
  const r = rel.split("\\").join("/");
  if (r === MEMORY_ROOT_REL) return true;
  return MEMORY_TYPE_DIRS.some((type) => {
    if (r === `${MEMORY_ROOT_REL}/${type}`) return true;
    return new RegExp(`^${MEMORY_ROOT_REL}/${type}/[^/]+\\.md$`).test(r);
  });
}

export function isMemoryBodyFileRel(rel: string): boolean {
  const r = rel.split("\\").join("/");
  return MEMORY_TYPE_DIRS.some((type) => new RegExp(`^${MEMORY_ROOT_REL}/${type}/[^/]+\\.md$`).test(r));
}

export function assertInsideMemoryTree(
  rawPath: string,
  roots: ResolvedRoots,
  baseDir?: string,
): string {
  const normalized = normalize(
    isAbsolute(rawPath) ? rawPath : resolve(baseDir ?? roots.projectRoot, rawPath),
  );
  const projectBrain = projectBrainRoot(roots.projectRoot);
  if (isWithin(normalized, roots.globalRoot) || isWithin(normalized, projectBrain)) {
    assertNoSymlinkEscape(normalized, roots, projectBrain);
    return normalized;
  }
  throw new Error(
    `path "${rawPath}" is outside the memory tree; allowed roots are "${roots.globalRoot}" and "${projectBrain}"`,
  );
}

function isWithin(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent + sep);
}

function assertNoSymlinkEscape(
  normalized: string,
  roots: ResolvedRoots,
  projectBrain: string,
): void {
  let probe = normalized;
  while (!existsSync(probe)) {
    const parent = dirname(probe);
    if (parent === probe) return;
    if (!isWithin(parent, roots.globalRoot) && !isWithin(parent, projectBrain)) return;
    probe = parent;
  }
  const real = realpathSync.native(probe);
  if (!isWithin(real, roots.globalRoot) && !isWithin(real, projectBrain)) {
    throw new Error(`path "${normalized}" resolves outside the memory tree via a symlink/junction`);
  }
}

export function rootsForPath(roots: ResolvedRoots, absPath: string): ResolvedRoots {
  const projectBrain = projectBrainRoot(roots.projectRoot);
  const prefix = projectBrain + sep + "sessions" + sep;
  if (absPath.startsWith(prefix)) {
    const sid = absPath.slice(prefix.length).split(/[\\/]/)[0];
    if (sid) return { ...roots, sessionId: validateSessionId(sid) };
  }
  return roots;
}

export function layerOf(roots: ResolvedRoots, absPath: string): MemoryLayer | undefined {
  const normalized = absPath.replace(/[\\/]+$/, "");
  const projectBrain = layerDir(roots, "project").replace(/[\\/]+$/, "");
  const sessionPrefix = projectBrain + sep + "sessions" + sep;
  if (normalized.startsWith(sessionPrefix)) return "session";
  if (normalized === projectBrain || normalized.startsWith(projectBrain + sep)) return "project";
  const globalRoot = layerDir(roots, "global").replace(/[\\/]+$/, "");
  if (normalized === globalRoot || normalized.startsWith(globalRoot + sep)) return "global";
  return undefined;
}

export type BrainPath =
  | {
      kind: "directory";
      abs: string;
      roots: ResolvedRoots;
      layer: MemoryLayer;
      rel: string;
      memoryType?: MemoryType;
    }
  | {
      kind: "item";
      abs: string;
      roots: ResolvedRoots;
      layer: MemoryLayer;
      rel: string;
      memoryType: MemoryType;
    }
  | { kind: "core"; layer: MemoryLayer; roots: ResolvedRoots };

function classifyRel(
  raw: string,
  abs: string,
  layerRoots: ResolvedRoots,
  layer: MemoryLayer,
  rel: string,
): BrainPath {
  const r = rel.split("\\").join("/");
  if (r === MEMORY_ROOT_REL) {
    return { kind: "directory", abs, roots: layerRoots, layer, rel: r };
  }
  const typeDir = new RegExp(`^${MEMORY_ROOT_REL}/(${MEMORY_TYPE_DIRS.join("|")})$`).exec(r);
  if (typeDir) {
    return {
      kind: "directory",
      abs,
      roots: layerRoots,
      layer,
      rel: r,
      memoryType: typeDir[1] as MemoryType,
    };
  }
  const item = new RegExp(
    `^${MEMORY_ROOT_REL}/(${MEMORY_TYPE_DIRS.join("|")})/([^/]+\\.md)$`,
  ).exec(r);
  if (item) {
    return {
      kind: "item",
      abs,
      roots: layerRoots,
      layer,
      rel: r,
      memoryType: item[1] as MemoryType,
    };
  }
  throw new Error(
    `invalid brain memory path "${raw}": expected memories root, memories/<type>, or memories/<type>/<name>.md`,
  );
}

export function parseBrainPath(raw: string, roots: ResolvedRoots): BrainPath {
  if (raw === "@core/global.md") return { kind: "core", layer: "global", roots };
  if (raw === "@core/project.md") return { kind: "core", layer: "project", roots };
  const coreSession = /^@core\/sessions\/([^/]+)\.md$/.exec(raw);
  if (coreSession) {
    const sid = validateSessionId(coreSession[1]!);
    return { kind: "core", layer: "session", roots: { ...roots, sessionId: sid } };
  }

  let abs: string;
  if (raw.startsWith("@/sessions/")) {
    const match = /^@\/sessions\/([^/]+)\/(.+)$/.exec(raw);
    if (!match) throw new Error(`invalid brain session path "${raw}"`);
    const sid = validateSessionId(match[1]!);
    const sessionRoots = { ...roots, sessionId: sid };
    abs = assertInsideMemoryTree(join(sessionBrainDir(roots.projectRoot, sid), match[2]!), sessionRoots);
  } else if (raw.startsWith("@/")) {
    abs = assertInsideMemoryTree(join(projectBrainRoot(roots.projectRoot), raw.slice(2)), roots);
  } else if (raw.startsWith("@global/")) {
    abs = assertInsideMemoryTree(join(roots.globalRoot, raw.slice("@global/".length)), roots);
  } else {
    throw new Error(
      `invalid brain path "${raw}": expected @/..., @global/..., or @core/<layer>.md`,
    );
  }

  const layerRoots = rootsForPath(roots, abs);
  const layer = layerOf(layerRoots, abs);
  if (!layer) throw new Error(`cannot determine memory layer for "${raw}"`);
  const rel = relative(layerDir(layerRoots, layer), abs).split(sep).join("/");
  return classifyRel(raw, abs, layerRoots, layer, rel);
}

export function brainPathFor(layer: MemoryLayer, roots: ResolvedRoots, rel: string): string {
  if (layer === "global") return `@global/${rel}`;
  if (layer === "project") return `@/${rel}`;
  return `@/sessions/${roots.sessionId}/${rel}`;
}

export function brainPathForAbs(
  roots: ResolvedRoots,
  absPath: string,
): string | undefined {
  const layerRoots = rootsForPath(roots, absPath);
  const layer = layerOf(layerRoots, absPath);
  if (!layer) return undefined;
  const rel = relative(layerDir(layerRoots, layer), absPath).split(sep).join("/");
  if (!isMemoryFileRel(rel)) return undefined;
  return brainPathFor(layer, layerRoots, rel);
}
