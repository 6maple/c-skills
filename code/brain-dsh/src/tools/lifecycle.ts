/** brain_rm / brain_mv lifecycle semantics. */
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { relative, sep } from "node:path";
import {
  appendChange,
  assertCoreDocLength,
  atomicWriteText,
  loadIndex,
  loadState,
  moveToHistory,
  saveIndex,
  saveState,
  validateStoreStructure,
  withGlobalLock,
  withStoreLock,
  type IndexEntry,
  type MemoryItem,
} from "../memory/store.ts";
import { validateMemoryDocument } from "./sync.ts";
import {
  brainPathFor,
  layerDir,
  layerOf,
  rootsForPath,
  type BrainPath,
  type MemoryLayer,
  type MemoryType,
  type ResolvedRoots,
} from "../memory/paths.ts";

export interface RemoveResult {
  layer: MemoryLayer;
  movedTo: string;
  removedId?: string;
}

export async function removeItem(
  roots: ResolvedRoots,
  absPath: string,
  reason: string,
): Promise<RemoveResult> {
  const parsed = pathFromAbs(roots, absPath);
  if (parsed.kind !== "item") throw new Error("brain_rm only accepts archival items");
  return withStoreLock(() => {
    const commit = () => removeParsedItem(parsed, reason);
    return parsed.layer === "global" ? withGlobalLock(parsed.roots, commit) : commit();
  });
}

async function removeParsedItem(
  parsed: Extract<BrainPath, { kind: "item" }>,
  reason: string,
): Promise<RemoveResult> {
  const state = await loadState(parsed.roots, parsed.layer);
  const index = await loadIndex(parsed.roots, parsed.layer);
  validateStoreStructure(state, index);
  const entry = index.find((candidate) => candidate.file === parsed.rel);
  if (!entry) throw new Error(`memory invariant violation: ${parsed.rel} is not indexed`);

  const { movedTo } = await moveToHistory(parsed.roots, parsed.layer, parsed.abs, reason, state.tick, true);
  const item = state.items[entry.id];
  if (!item) throw new Error(`memory invariant violation: missing state for ${entry.id}`);
  item.status = "removed";
  await saveIndex(parsed.roots, parsed.layer, index.filter((candidate) => candidate.id !== entry.id));
  await saveState(parsed.roots, parsed.layer, state);
  await appendChange(parsed.roots, parsed.layer, {
    action: "rm",
    path: brainPathFor(parsed.layer, parsed.roots, parsed.rel),
    summary: reason,
    tick: state.tick,
  });
  return { layer: parsed.layer, movedTo, removedId: entry.id };
}

export interface MoveResult {
  from: string;
  to: string;
  layer?: MemoryLayer;
}

export async function moveItem(
  roots: ResolvedRoots,
  src: BrainPath,
  dst: BrainPath,
): Promise<MoveResult> {
  return withStoreLock(() => {
    const commit = () => moveItemUnlocked(roots, src, dst);
    return src.layer === "global" || dst.layer === "global"
      ? withGlobalLock(roots, commit)
      : commit();
  });
}

async function moveItemUnlocked(
  roots: ResolvedRoots,
  src: BrainPath,
  dst: BrainPath,
): Promise<MoveResult> {
  if (src.kind === "directory") throw new Error("brain_mv source cannot be a memory directory");
  if (dst.kind === "directory") {
    throw new Error("brain_mv destination must be an explicit memory file path");
  }

  if (src.kind === "item" && dst.kind === "core") return moveItemToCore(src, dst);
  if (src.kind === "core" && dst.kind === "item") return moveCoreToItem(src, dst);
  if (src.kind === "core" && dst.kind === "core") return moveCoreToCore(src, dst);
  if (src.kind === "item" && dst.kind === "item") return moveItemToItem(src, dst);
  throw new Error(`invalid move combination: ${src.kind} → ${dst.kind}`);
}

async function moveItemToCore(
  src: Extract<BrainPath, { kind: "item" }>,
  dst: Extract<BrainPath, { kind: "core" }>,
): Promise<MoveResult> {
  const body = await readFile(src.abs, "utf8");
  validateMemoryDocument(body, src.memoryType);
  assertCoreDocLength(body);
  const srcState = await loadState(src.roots, src.layer);
  const srcIndex = await loadIndex(src.roots, src.layer);
  validateStoreStructure(srcState, srcIndex);
  const entry = srcIndex.find((candidate) => candidate.file === src.rel);
  if (!entry) throw new Error(`memory invariant violation: ${src.rel} is not indexed`);
  const srcItem = srcState.items[entry.id]!;

  const sameStore = sameLayerStore(src, dst);
  const dstState = sameStore ? srcState : await loadState(dst.roots, dst.layer);
  const dstIndex = sameStore ? srcIndex : await loadIndex(dst.roots, dst.layer);
  if (!sameStore) validateStoreStructure(dstState, dstIndex);

  await moveToHistory(src.roots, src.layer, src.abs, "moved to core", srcState.tick, false);
  const srcPos = srcIndex.findIndex((candidate) => candidate.id === entry.id);
  if (srcPos >= 0) srcIndex.splice(srcPos, 1);
  srcItem.status = "removed";
  dstState.core = [body.trim()];
  validateStoreStructure(srcState, srcIndex);
  await saveIndex(src.roots, src.layer, srcIndex);
  await saveState(src.roots, src.layer, srcState);
  if (!sameStore) {
    validateStoreStructure(dstState, dstIndex);
    await saveState(dst.roots, dst.layer, dstState);
  }

  const srcPath = brainPathFor(src.layer, src.roots, src.rel);
  const dstPath = corePath(dst);
  await appendChange(src.roots, src.layer, {
    action: "mv_out",
    path: srcPath,
    summary: "moved to core",
    tick: srcState.tick,
  });
  await appendChange(dst.roots, dst.layer, {
    action: "core_replace",
    path: dstPath,
    summary: "archival moved to core",
    tick: dstState.tick,
  });
  return { from: srcPath, to: dstPath, layer: dst.layer };
}

async function moveCoreToItem(
  src: Extract<BrainPath, { kind: "core" }>,
  dst: Extract<BrainPath, { kind: "item" }>,
): Promise<MoveResult> {
  const srcState = await loadState(src.roots, src.layer);
  const text = srcState.core[0];
  if (text === undefined) throw new Error(`${corePath(src)} is empty; nothing to move out`);
  const metadata = validateMemoryDocument(text, dst.memoryType); // D2: before mutation

  const sameStore = sameLayerStore(src, dst);
  const dstState = sameStore ? srcState : await loadState(dst.roots, dst.layer);
  const dstIndex = await loadIndex(dst.roots, dst.layer);
  validateStoreStructure(dstState, dstIndex);
  await retireExistingDestination(dst, dstState, dstIndex);

  let id = randomUUID();
  while (dstState.items[id] || dstIndex.some((entry) => entry.id === id)) id = randomUUID();
  const entry: IndexEntry = {
    id,
    file: dst.rel,
    type: metadata.type,
    title: metadata.title ?? firstHeading(text) ?? "untitled",
    summary: metadata.summary,
    importance: metadata.importance,
    updated_at: dstState.tick,
  };
  dstIndex.push(entry);
  dstState.items[id] = newMechanismItem(entry, dstState.tick);

  await atomicWriteText(dst.abs, text);
  srcState.core = [];
  validateStoreStructure(dstState, dstIndex);
  if (sameStore) {
    await saveIndex(src.roots, src.layer, dstIndex);
    await saveState(src.roots, src.layer, srcState);
  } else {
    await saveState(src.roots, src.layer, srcState);
    await saveIndex(dst.roots, dst.layer, dstIndex);
    await saveState(dst.roots, dst.layer, dstState);
  }

  await appendChange(src.roots, src.layer, {
    action: "core_clear",
    path: corePath(src),
    summary: "moved out to archival",
    tick: srcState.tick,
  });
  await appendChange(dst.roots, dst.layer, {
    action: "mv_in",
    path: brainPathFor(dst.layer, dst.roots, dst.rel),
    summary: metadata.summary,
    tick: dstState.tick,
  });
  return { from: corePath(src), to: brainPathFor(dst.layer, dst.roots, dst.rel), layer: dst.layer };
}

async function moveCoreToCore(
  src: Extract<BrainPath, { kind: "core" }>,
  dst: Extract<BrainPath, { kind: "core" }>,
): Promise<MoveResult> {
  if (corePath(src) === corePath(dst)) return { from: corePath(src), to: corePath(dst), layer: dst.layer };
  const srcState = await loadState(src.roots, src.layer);
  const text = srcState.core[0];
  if (text === undefined) throw new Error(`${corePath(src)} is empty; nothing to move`);
  assertCoreDocLength(text);
  const dstState = await loadState(dst.roots, dst.layer);
  srcState.core = [];
  dstState.core = [text];
  await saveState(src.roots, src.layer, srcState);
  await saveState(dst.roots, dst.layer, dstState);
  await appendChange(src.roots, src.layer, {
    action: "core_clear",
    path: corePath(src),
    summary: "moved to another core",
    tick: srcState.tick,
  });
  await appendChange(dst.roots, dst.layer, {
    action: "core_replace",
    path: corePath(dst),
    summary: "core moved from another layer",
    tick: dstState.tick,
  });
  return { from: corePath(src), to: corePath(dst), layer: dst.layer };
}

async function moveItemToItem(
  src: Extract<BrainPath, { kind: "item" }>,
  dst: Extract<BrainPath, { kind: "item" }>,
): Promise<MoveResult> {
  const srcPublic = brainPathFor(src.layer, src.roots, src.rel);
  const dstPublic = brainPathFor(dst.layer, dst.roots, dst.rel);
  if (src.abs === dst.abs) return { from: srcPublic, to: dstPublic, layer: dst.layer };

  const sourceText = await readFile(src.abs, "utf8");
  validateMemoryDocument(sourceText, src.memoryType);
  const resultText =
    src.memoryType === dst.memoryType ? sourceText : rewriteFrontmatterType(sourceText, dst.memoryType);
  const metadata = validateMemoryDocument(resultText, dst.memoryType);

  const srcState = await loadState(src.roots, src.layer);
  const srcIndex = await loadIndex(src.roots, src.layer);
  validateStoreStructure(srcState, srcIndex);
  const srcEntry = srcIndex.find((entry) => entry.file === src.rel);
  if (!srcEntry) throw new Error(`memory invariant violation: ${src.rel} is not indexed`);
  const sourceItem = srcState.items[srcEntry.id];
  if (!sourceItem) throw new Error(`memory invariant violation: missing state for ${srcEntry.id}`);

  const sameStore = src.layer === dst.layer && src.roots.sessionId === dst.roots.sessionId;
  const dstState = sameStore ? srcState : await loadState(dst.roots, dst.layer);
  const dstIndex = sameStore ? srcIndex : await loadIndex(dst.roots, dst.layer);
  if (!sameStore) validateStoreStructure(dstState, dstIndex);
  const sameIdAtDestination = !sameStore ? dstState.items[srcEntry.id] : undefined;
  if (sameIdAtDestination && sameIdAtDestination.status !== "removed") {
    throw new Error(`memory invariant violation: destination already contains active id ${srcEntry.id}`);
  }

  const oldDst = dstIndex.find((entry) => entry.file === dst.rel && entry.id !== srcEntry.id);
  if (oldDst) {
    await moveToHistory(dst.roots, dst.layer, dst.abs, "replaced by brain_mv", dstState.tick, false);
    const oldItem = dstState.items[oldDst.id];
    if (oldItem) oldItem.status = "removed";
    const oldPos = dstIndex.findIndex((entry) => entry.id === oldDst.id);
    if (oldPos >= 0) dstIndex.splice(oldPos, 1);
    await appendChange(dst.roots, dst.layer, {
      action: "mv_replace_target",
      path: dstPublic,
      summary: oldDst.summary,
      tick: dstState.tick,
    });
  }

  // Remove source metadata before adding the same identity at destination.
  const srcPos = srcIndex.findIndex((entry) => entry.id === srcEntry.id);
  if (srcPos >= 0) srcIndex.splice(srcPos, 1);
  if (!sameStore) delete srcState.items[srcEntry.id];

  sourceItem.type = dst.memoryType;
  const movedEntry: IndexEntry = {
    ...srcEntry,
    file: dst.rel,
    type: dst.memoryType,
    summary: metadata.summary,
    importance: sourceItem.importance,
    title: metadata.title ?? srcEntry.title,
    updated_at: dstState.tick,
  };
  dstIndex.push(movedEntry);
  dstState.items[srcEntry.id] = sourceItem;

  await atomicWriteText(dst.abs, resultText);
  await rm(src.abs, { force: true });
  validateStoreStructure(srcState, srcIndex);
  if (!sameStore) validateStoreStructure(dstState, dstIndex);
  await saveIndex(src.roots, src.layer, srcIndex);
  await saveState(src.roots, src.layer, srcState);
  if (!sameStore) {
    await saveIndex(dst.roots, dst.layer, dstIndex);
    await saveState(dst.roots, dst.layer, dstState);
  }

  if (sameStore) {
    await appendChange(dst.roots, dst.layer, {
      action: "mv",
      path: dstPublic,
      summary: `moved from ${srcPublic}`,
      tick: dstState.tick,
    });
  } else {
    await appendChange(src.roots, src.layer, { action: "mv_out", path: srcPublic, tick: srcState.tick });
    await appendChange(dst.roots, dst.layer, { action: "mv_in", path: dstPublic, tick: dstState.tick });
  }
  return { from: srcPublic, to: dstPublic, layer: dst.layer };
}

async function retireExistingDestination(
  dst: Extract<BrainPath, { kind: "item" }>,
  state: Awaited<ReturnType<typeof loadState>>,
  index: IndexEntry[],
): Promise<void> {
  const old = index.find((entry) => entry.file === dst.rel);
  if (!old) return;
  await moveToHistory(dst.roots, dst.layer, dst.abs, "replaced by brain_mv", state.tick, false);
  const item = state.items[old.id];
  if (item) item.status = "removed";
  const pos = index.findIndex((entry) => entry.id === old.id);
  if (pos >= 0) index.splice(pos, 1);
  await appendChange(dst.roots, dst.layer, {
    action: "mv_replace_target",
    path: brainPathFor(dst.layer, dst.roots, dst.rel),
    summary: old.summary,
    tick: state.tick,
  });
}

function rewriteFrontmatterType(text: string, nextType: MemoryType): string {
  if (!text.startsWith("---")) throw new Error("memory frontmatter requires type");
  const end = text.indexOf("\n---", 4);
  if (end < 0) throw new Error("invalid memory frontmatter");
  const front = text.slice(0, end);
  if (!/^type:\s*.*$/m.test(front)) throw new Error("memory frontmatter requires type");
  return front.replace(/^type:\s*.*$/m, `type: ${nextType}`) + text.slice(end);
}

function newMechanismItem(entry: IndexEntry, tick: number): MemoryItem {
  return {
    id: entry.id,
    type: entry.type,
    importance: entry.importance,
    difficulty: 0.4,
    stability: 1,
    retrievability: 1,
    last_at: tick,
    exposure: 0,
    usage: { ok: 0, fail: 0 },
    status: "active",
    at: tick,
  };
}

function firstHeading(text: string): string | undefined {
  return text
    .split("\n")
    .find((line) => line.startsWith("# "))
    ?.replace(/^#+\s*/, "")
    .trim();
}

function sameLayerStore(a: BrainPath, b: BrainPath): boolean {
  if (a.layer !== b.layer) return false;
  if (a.layer === "session") return a.roots.sessionId === b.roots.sessionId;
  return true;
}

function corePath(path: Extract<BrainPath, { kind: "core" }>): string {
  return path.layer === "session" ? `@core/sessions/${path.roots.sessionId}.md` : `@core/${path.layer}.md`;
}

/** Internal conversion used by rm paths that have already passed @-scheme validation. */
function pathFromAbs(roots: ResolvedRoots, absPath: string): BrainPath {
  const layerRoots = rootsForPath(roots, absPath);
  const layer = layerOf(layerRoots, absPath);
  if (!layer) throw new Error("path not in memory tree");
  const rel = relative(layerDir(layerRoots, layer), absPath).split(sep).join("/");
  const match = /^memories\/(decision|knowledge|intention|skill)\/[^/]+\.md$/.exec(rel);
  if (!match) throw new Error("brain_rm only accepts archival items");
  return {
    kind: "item",
    abs: absPath,
    roots: layerRoots,
    layer,
    rel,
    memoryType: match[1] as MemoryType,
  };
}
