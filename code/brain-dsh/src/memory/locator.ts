/**
 * @-scheme resource locator layer.
 *
 * This is the single isolation boundary between the model-visible memory
 * namespace (@/..., @global/..., @core/...) and the physical filesystem
 * layout (.brain-data/state.json, memories/**). All brain_* tools should:
 *
 *  - accept only @-scheme input (parseBrainPath);
 *  - return only @-scheme addresses in user-visible output (brainPathForAbs /
 *    rewriteBrainPaths).
 *
 * The layer deliberately refuses to expose mechanism files: brainPathForAbs
 * returns undefined for state.json/index.json/history.jsonl, and
 * parseBrainPath rejects them (H1).
 */
import { isAbsolute, resolve } from "node:path";
import { brainPathForAbs, projectBrainRoot, type ResolvedRoots } from "./paths.ts";

export { brainPathForAbs, parseBrainPath } from "./paths.ts";

export interface KnownPathReplacement {
  /** Absolute fs path that may appear in tool output. */
  abs: string;
  /** The @-scheme address that should be shown instead. */
  brain: string;
}

/**
 * Rewrite user-visible tool output so filesystem paths are replaced by
 * @-scheme addresses. `known` replacements are exact and cheap; a token scan
 * is used as a fallback for pi ls/grep style output.
 */
export function rewriteBrainPaths(
  text: string,
  roots: ResolvedRoots,
  known: KnownPathReplacement[] = [],
): string {
  let out = text;
  for (const k of known) {
    out = out.split(k.abs).join(k.brain);
  }

  return out
    .split("\n")
    .map((line) => {
      let l = line;
      for (const k of known) {
        l = l.split(k.abs).join(k.brain);
      }
      const tokens = l.match(/\S+/g) ?? [];
      for (const token of tokens) {
        const clean = token.replace(/[),;]+$/, "");
        const candidate = pathPart(clean);
        if (!looksLikeMemoryPath(candidate)) continue;
        const brain = resolveCandidate(candidate, roots);
        if (brain) l = l.split(token).join(token.replace(candidate, brain));
      }
      return l;
    })
    .join("\n");
}

function pathPart(token: string): string {
  // grep-style output appends :<line>: after the path. Keep the drive-letter
  // colon of Windows absolute paths while trimming only the location suffix.
  const from = /^[A-Za-z]:[\\/]/.test(token) ? 2 : 0;
  const suffix = /:\d+(?::|$)/g;
  suffix.lastIndex = from;
  const match = suffix.exec(token);
  return match ? token.slice(0, match.index) : token;
}
function looksLikeMemoryPath(value: string): boolean {
  return (
    value.includes(".brain-data") ||
    value.includes("memories") ||
    value.startsWith("sessions/") ||
    value.startsWith("sessions\\")
  );
}

function resolveCandidate(value: string, roots: ResolvedRoots): string | undefined {
  const candidates: string[] = [];
  if (isAbsolute(value)) {
    candidates.push(resolve(value));
  } else {
    candidates.push(
      resolve(roots.projectRoot, value),
      resolve(projectBrainRoot(roots.projectRoot), value),
      resolve(roots.globalRoot, value),
    );
  }
  for (const abs of candidates) {
    const brain = brainPathForAbs(roots, abs);
    if (brain) return brain;
  }
  return undefined;
}
