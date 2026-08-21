/**
 * Memory persistence: per-layer state.json / index.json / history.jsonl and
 * the FSRS-style mechanism-domain maintenance.
 *
 * Each layer persists the mechanism state below:
 *   state.json   { tick, core: string[], items: Record<id, MemoryItem> }
 *   index.json   IndexEntry[]
 *   history.jsonl  one JSON object per line (logical deletions)
 *   memories/ 下的 *.md 文件  item bodies (frontmatter + content)
 *
 * The model writes the semantic domain (type/content/note/importance/
 * difficulty); brain-dsh owns the mechanism domain
 * (stability/retrievability/last_at/exposure/usage/status/at).
 */
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";
import { layerDir, type MemoryLayer, type ResolvedRoots } from "./paths.ts";

export type MemoryItemType = "decision" | "knowledge" | "intention" | "skill";
export type MemoryItemStatus = "active" | "questioned" | "removed";

/** Unified item schema (semantic domain written by the model, mechanism domain by us). */
export interface MemoryItem {
  id: string;
  type: MemoryItemType;
  /** 0..1, model-supplied, feedback-adjusted */
  importance: number;
  /** FSRS difficulty; model initial, raised on again */
  difficulty: number;
  /** FSRS stability; mechanism-owned */
  stability: number;
  /** FSRS retrievability; mechanism-owned */
  retrievability: number;
  /** tick at last mechanism update (lazy decay) */
  last_at: number;
  /** L0 exposure count (ranking deweight) */
  exposure: number;
  usage: { ok: number; fail: number };
  status: MemoryItemStatus;
  /** tick at creation */
  at: number;
}

export interface IndexEntry {
  id: string;
  file: string;
  type: MemoryItemType;
  title: string;
  summary: string;
  importance: number;
  updated_at: number;
}

export interface LayerState {
  /** think-tick counter (one increment per brain_cat core call) */
  tick: number;
  /** core entries as markdown text, <= 10 per layer */
  core: string[];
  /** mechanism domain, keyed by item id */
  items: Record<string, MemoryItem>;
}

export interface HistoryRecord {
  moved_to: string;
  reason: string;
  removed_at: number;
  original_path: string;
}

/** One auditable memory change (change_history.jsonl, per layer). */
export interface ChangeRecord {
  action: string;
  /** @-scheme address of the affected memory (or core document). */
  path: string;
  /** Short human/audit summary. */
  summary?: string;
  /** Mechanism tick at the time of the change. */
  tick: number;
}

export interface LayerFiles {
  statePath: string;
  indexPath: string;
  historyPath: string;
  changeHistoryPath: string;
  memoriesDir: string;
  historyDir: string;
}

export function layerFiles(roots: ResolvedRoots, layer: MemoryLayer): LayerFiles {
  const dir = layerDir(roots, layer);
  return {
    statePath: join(dir, "state.json"),
    indexPath: join(dir, "index.json"),
    historyPath: join(dir, "history.jsonl"),
    changeHistoryPath: join(dir, "change_history.jsonl"),
    memoriesDir: join(dir, "memories"),
    historyDir: join(dir, "memories", "history"),
  };
}

const MEMORY_TYPE_DIRS = ["decision", "knowledge", "intention", "skill"] as const;

/** Ensure the layer directory skeleton exists. */
export async function ensureLayer(roots: ResolvedRoots, layer: MemoryLayer): Promise<LayerFiles> {
  const files = layerFiles(roots, layer);
  await mkdir(files.memoriesDir, { recursive: true });
  for (const t of MEMORY_TYPE_DIRS) {
    await mkdir(join(files.memoriesDir, t), { recursive: true });
  }
  await mkdir(files.historyDir, { recursive: true });
  return files;
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw new Error(`corrupt JSON at ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Write one complete file without ever truncating the official path in place. */
export async function atomicWriteText(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temp, text, "utf-8");
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true }).catch(() => undefined);
  }
}

/** Load (or initialize) a layer state. */
export async function loadState(roots: ResolvedRoots, layer: MemoryLayer): Promise<LayerState> {
  const files = layerFiles(roots, layer);
  return readJson<LayerState>(files.statePath, { tick: 0, core: [], items: {} });
}

export async function saveState(
  roots: ResolvedRoots,
  layer: MemoryLayer,
  state: LayerState,
): Promise<void> {
  const files = layerFiles(roots, layer);
  await atomicWriteText(files.statePath, JSON.stringify(state, null, 2));
}

export async function loadIndex(roots: ResolvedRoots, layer: MemoryLayer): Promise<IndexEntry[]> {
  const files = layerFiles(roots, layer);
  return readJson<IndexEntry[]>(files.indexPath, []);
}

export async function saveIndex(
  roots: ResolvedRoots,
  layer: MemoryLayer,
  index: IndexEntry[],
): Promise<void> {
  const files = layerFiles(roots, layer);
  await atomicWriteText(files.indexPath, JSON.stringify(index, null, 2));
}

export async function appendHistory(
  roots: ResolvedRoots,
  layer: MemoryLayer,
  record: HistoryRecord,
): Promise<void> {
  const files = layerFiles(roots, layer);
  await writeFile(files.historyPath, JSON.stringify(record) + "\n", { flag: "a" });
}

/** Append one auditable change record (change_history.jsonl). */
export async function appendChange(
  roots: ResolvedRoots,
  layer: MemoryLayer,
  record: ChangeRecord,
): Promise<void> {
  const files = layerFiles(roots, layer);
  await writeFile(files.changeHistoryPath, JSON.stringify(record) + "\n", { flag: "a" });
}

/** List memory body markdown files for a layer. */
export async function listMemoryFiles(roots: ResolvedRoots, layer: MemoryLayer): Promise<string[]> {
  const files = layerFiles(roots, layer);
  const out: string[] = [];
  for (const t of MEMORY_TYPE_DIRS) {
    const dir = join(files.memoriesDir, t);
    const entries = await readdir(dir, { recursive: true }).catch(() => []);
    for (const entry of entries) {
      if (typeof entry === "string" && entry.endsWith(".md")) out.push(join(dir, entry));
    }
  }
  return out.sort();
}

/**
 * Move an item body file into the layer's history/ (recycle) directory.
 * history.jsonl is appended only when `record` is true (logical deletions,
 * deletion audit); other moves (for example promotion into core) recycle the
 * file without polluting the deletion audit.
 */
export async function moveToHistory(
  roots: ResolvedRoots,
  layer: MemoryLayer,
  absPath: string,
  reason: string,
  tick: number,
  record = true,
): Promise<{ movedTo: string; record: HistoryRecord | null }> {
  const files = layerFiles(roots, layer);
  const base = absPath.split(/[\\/]/).pop() ?? "item.md";
  const dest = join(files.historyDir, `${tick}-${Date.now().toString(36)}-${base}`);
  await mkdir(files.historyDir, { recursive: true });
  await rename(absPath, dest);
  const history: HistoryRecord = {
    moved_to: dest,
    reason,
    removed_at: tick,
    original_path: absPath,
  };
  if (record) {
    await appendHistory(roots, layer, history);
    return { movedTo: dest, record: history };
  }
  return { movedTo: dest, record: null };
}

/** Move a file with fs.rename (brain_mv), creating the destination directory. */
export async function moveFile(src: string, dst: string): Promise<void> {
  await mkdir(dirname(dst), { recursive: true });
  await rename(src, dst);
}

/** Parse markdown frontmatter (--- block) into a string map plus the body. */
export function parseFrontmatter(text: string): { front: Record<string, string>; body: string } {
  const front: Record<string, string> = {};
  if (!text.startsWith("---")) return { front, body: text };
  const end = text.indexOf("\n---", 4);
  if (end < 0) return { front, body: text };
  const block = text.slice(4, end);
  for (const line of block.split("\n")) {
    const m = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (m) front[m[1]] = m[2].trim();
  }
  return { front, body: text.slice(end + 4).trim() };
}

/* ------------------------------------------------------------------ */
/* Store lock (F12)                                                     */
/* ------------------------------------------------------------------ */

let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Serialize load-modify-save units: concurrent MCP tool calls must never
 * interleave a read-modify-write on the same state/index/history files
 * (lost update). Every tool-level entry point wraps its whole body in this
 * lock; internal helpers (loadState/saveState/tickLayer/buildCandidates…)
 * must NOT take the lock again (would deadlock). Read-only loads are left
 * unlocked — a stale snapshot read is benign.
 */
export function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function acquireGlobalFileLock(globalRoot: string): Promise<() => Promise<void>> {
  await mkdir(globalRoot, { recursive: true });
  const lockDir = join(globalRoot, ".brain.lock");
  const ownerPath = join(lockDir, "owner.json");
  for (let attempt = 0; attempt < 2000; attempt += 1) {
    try {
      await mkdir(lockDir);
      await writeFile(ownerPath, JSON.stringify({ pid: process.pid }), "utf-8");
      return async () => {
        await rm(lockDir, { recursive: true, force: true });
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const owner = JSON.parse(await readFile(ownerPath, "utf-8")) as { pid?: number };
        if (typeof owner.pid === "number" && !processAlive(owner.pid)) {
          await rm(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        // Another process may still be writing owner.json; retry shortly.
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  throw new Error("global memory lock timeout");
}

/** Only the global layer is shared across project-scoped MCP processes. */
export async function withGlobalLock<T>(roots: ResolvedRoots, fn: () => Promise<T>): Promise<T> {
  const release = await acquireGlobalFileLock(roots.globalRoot);
  try {
    return await fn();
  } finally {
    await release();
  }
}

/** Fast structural invariant check; does not scan markdown bodies. */
export function validateStoreStructure(state: LayerState, index: IndexEntry[]): void {
  if (!Array.isArray(state.core) || state.core.length > 1) {
    throw new Error("memory invariant violation: core must contain at most one document");
  }
  const seenIds = new Set<string>();
  const seenFiles = new Set<string>();
  for (const entry of index) {
    if (seenIds.has(entry.id)) throw new Error(`memory invariant violation: duplicate active id ${entry.id}`);
    if (seenFiles.has(entry.file)) throw new Error(`memory invariant violation: duplicate active file ${entry.file}`);
    seenIds.add(entry.id);
    seenFiles.add(entry.file);
    const item = state.items[entry.id];
    if (!item) throw new Error(`memory invariant violation: index id ${entry.id} has no state item`);
    if (item.status === "removed") {
      throw new Error(`memory invariant violation: removed item ${entry.id} is still indexed`);
    }
  }
  for (const [id, item] of Object.entries(state.items)) {
    if ((item.status === "active" || item.status === "questioned") && !seenIds.has(id)) {
      throw new Error(`memory invariant violation: active state item ${id} has no index entry`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* FSRS-style mechanism updates                                         */
/* ------------------------------------------------------------------ */

export type ReviewOutcome = "good" | "again" | "hard";

/* FSRS coefficients — values are mirrors of CALIBRATION.md (待标定). */
const STABILITY_GOOD = 2.2;
const STABILITY_AGAIN = 0.4;
const STABILITY_HARD = 1.2;
const DIFFICULTY_GOOD_DELTA = -0.05;
const DIFFICULTY_AGAIN_DELTA = 0.15;

/**
 * Read-level review (L1 gist / L2 deep read) — updates stability/retrievability
 * only, never usage (Design: L1 may hard-update retrieval state; L2 read only refreshes retrieval and is not adopt; usage.ok is
 * owned by adoption feedback, "high-frequency promotion is limited to success").
 */
export function applyReadReview(item: MemoryItem, level: 1 | 2, tick: number): void {
  decay(item, tick);
  if (level === 1) item.stability *= STABILITY_HARD;
  // L2 means the memory was deeply read, not successfully adopted. It may
  // refresh retrieval recency but must not apply good-style learning growth.
  item.retrievability = 1;
  item.last_at = tick;
}

/** Apply one review outcome to an item's FSRS state at the given tick. */
export function applyReview(item: MemoryItem, outcome: ReviewOutcome, tick: number): void {
  // Lazy decay: bring retrievability to its current value first.
  decay(item, tick);
  if (outcome === "good") {
    item.stability *= STABILITY_GOOD;
    item.usage.ok += 1;
    item.difficulty = Math.max(0.1, item.difficulty + DIFFICULTY_GOOD_DELTA);
  } else if (outcome === "again") {
    item.stability *= STABILITY_AGAIN;
    item.usage.fail += 1;
    item.difficulty = Math.min(1, item.difficulty + DIFFICULTY_AGAIN_DELTA);
  } else {
    item.stability *= STABILITY_HARD;
  }
  item.retrievability = 1;
  item.last_at = tick;
}

/**
 * Pure decay of retrievability, R = exp(-Δt/S) with Δt since the last REVIEW
 * point. Never moves last_at: only applyReview/applyReadReview reset
 * retrievability to 1 and advance last_at (a review event). Without this, a
 * repeatedly-exposed item would converge to a constant R instead of decaying
 * monotonically over time (event-time decay; explicit read reviews can lift it).
 */
export function decay(item: MemoryItem, tick: number): void {
  const dt = Math.max(0, tick - item.last_at);
  item.retrievability = Math.exp(-dt / Math.max(0.01, item.stability));
}

/**
 * Core document length cap (chars) — checked at WRITE time (edit/mv into
 * core). 旧版"core 条数上限"随单文档定稿作废；容量保护 = 文档长度。
 * @default 4000（经验值，待标定，见 CALIBRATION.md）
 * @todo 待标定：常驻文档合并后（3 份）的总量感知；观察模型梳理频率。
 */
export const CORE_DOC_MAX_CHARS = 4000;

/**
 * Reject an over-long core document with a split hint. The model is the
 * curator: it prunes resident essentials and moves the rest to
 * archival, then retries — the mechanism only enforces the cap.
 */
export function assertCoreDocLength(content: string): void {
  if (content.length > CORE_DOC_MAX_CHARS) {
    throw new Error(
      `core document too long (${content.length} chars, limit ${CORE_DOC_MAX_CHARS}); ` +
        `split it — keep resident essentials, move the rest to archival via ` +
        `brain_mv @core/<layer>.md → @/... (or @global/...)`,
    );
  }
}

/**
 * Replace a layer's core array with a single markdown document:
 * each layer holds exactly ONE core document — the array is only a storage
 * form for merging; a write replaces it entirely). Returns the previous
 * element count. The document is length-checked at write time: an over-long
 * core is rejected with a split hint so the model prunes it first
 * (机制执行容量约束，模型负责语义梳理).
 */
export async function updateCore(
  roots: ResolvedRoots,
  layer: MemoryLayer,
  content: string,
): Promise<number> {
  return withStoreLock(() => {
    const commit = async (): Promise<number> => {
      assertCoreDocLength(content);
      const state = await loadState(roots, layer);
      const prev = state.core.length;
      state.core = [content];
      await saveState(roots, layer, state);
      const label =
        layer === "session" ? `@core/sessions/${roots.sessionId}.md` : `@core/${layer}.md`;
      await appendChange(roots, layer, {
        action: "core_update",
        path: label,
        summary: content.trim().split("\n")[0]?.slice(0, 80),
        tick: state.tick,
      });
      return prev;
    };
    return layer === "global" ? withGlobalLock(roots, commit) : commit();
  });
}

/** Bump a layer's tick counter (one per brain_cat core call).
 * NOTE: no lock of its own — it runs inside buildCorePayload's store lock. */
export async function tickLayer(roots: ResolvedRoots, layer: MemoryLayer): Promise<number> {
  const state = await loadState(roots, layer);
  state.tick += 1;
  await saveState(roots, layer, state);
  return state.tick;
}
