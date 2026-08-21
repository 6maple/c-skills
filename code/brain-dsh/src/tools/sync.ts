/** Post-write semantic validation + index/mechanism synchronization. */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { relative, sep } from "node:path";
import {
  appendChange,
  atomicWriteText,
  applyReview,
  loadIndex,
  loadState,
  parseFrontmatter,
  saveIndex,
  saveState,
  validateStoreStructure,
  withGlobalLock,
  withStoreLock,
  type IndexEntry,
  type MemoryItem,
  type MemoryItemType,
} from "../memory/store.ts";
import {
  assertInsideMemoryTree,
  brainPathFor,
  isMemoryBodyFileRel,
  layerDir,
  layerOf,
  rootsForPath,
  type ResolvedRoots,
} from "../memory/paths.ts";

const TYPE_DIRS = ["decision", "knowledge", "intention", "skill"] as const;
const ADOPT_MAX = 0.2;
const CORRECT_MIN = -0.3;
const CORRECT_MAX = -0.05;
const ATTRIBUTE_MIN = -0.15;
const ATTRIBUTE_MAX = 0;
const DAMPING_IMP = 0.8;
const DAMPING_CORRECT_MIN = -0.1;

export type FeedbackPath = "adopt" | "correct" | "attribute";

export interface ParsedMemoryMetadata {
  type: MemoryItemType;
  summary: string;
  importance: number;
  title?: string;
}

function typeFromRel(rel: string): MemoryItemType {
  const match = /^memories\/(decision|knowledge|intention|skill)\/[^/]+\.md$/.exec(
    rel.split("\\").join("/"),
  );
  if (!match) throw new Error(`invalid archival item path "${rel}"`);
  return match[1] as MemoryItemType;
}

/** Strict semantic contract shared by write/edit/mv-to-archival. */
export function validateMemoryDocument(text: string, expectedType: MemoryItemType): ParsedMemoryMetadata {
  const { front } = parseFrontmatter(text);
  if (!front.type) throw new Error("memory frontmatter requires type");
  if (!TYPE_DIRS.includes(front.type as MemoryItemType)) {
    throw new Error(`frontmatter type "${front.type}" is not one of decision|knowledge|intention|skill`);
  }
  if (front.type !== expectedType) {
    throw new Error(`frontmatter type "${front.type}" does not match path type "${expectedType}"`);
  }
  const summary = front.summary?.trim();
  if (!summary) throw new Error("memory frontmatter requires non-empty summary");
  if (front.importance === undefined) throw new Error("memory frontmatter requires importance");
  const importance = Number(front.importance);
  if (!Number.isFinite(importance) || importance < 0 || importance > 1) {
    throw new Error(`frontmatter importance "${front.importance}" must be a number in [0,1]`);
  }
  return {
    type: front.type as MemoryItemType,
    summary,
    importance,
    ...(front.title?.trim() ? { title: front.title.trim() } : {}),
  };
}

export async function syncAfterWrite(
  roots: ResolvedRoots,
  rawPath: string,
  feedbackPath?: FeedbackPath,
): Promise<string> {
  const abs = assertInsideMemoryTree(rawPath, roots);
  const layerRoots = rootsForPath(roots, abs);
  const layer = layerOf(layerRoots, abs);
  return withStoreLock(() =>
    layer === "global"
      ? withGlobalLock(layerRoots, () => syncAfterWriteUnlocked(roots, rawPath, feedbackPath))
      : syncAfterWriteUnlocked(roots, rawPath, feedbackPath),
  );
}

export async function syncAfterWriteUnlocked(
  roots: ResolvedRoots,
  rawPath: string,
  feedbackPath?: FeedbackPath,
): Promise<string> {
  const abs = assertInsideMemoryTree(rawPath, roots);
  const layerRoots = rootsForPath(roots, abs);
  const layer = layerOf(layerRoots, abs);
  if (!layer) throw new Error("path is not in a memory layer");
  const rel = relative(layerDir(layerRoots, layer), abs).split(sep).join("/");
  if (!isMemoryBodyFileRel(rel)) throw new Error(`invalid archival item path "${rel}"`);

  const text = await readFile(abs, "utf-8");
  const metadata = validateMemoryDocument(text, typeFromRel(rel));
  const state = await loadState(layerRoots, layer);
  const index = await loadIndex(layerRoots, layer);
  validateStoreStructure(state, index);
  const existing = index.find((entry) => entry.file === rel);
  const feedback: string[] = [];

  if (existing) {
    const item = state.items[existing.id];
    if (!item) throw new Error(`memory invariant violation: missing state for ${existing.id}`);
    const oldImportance = item.importance;

    existing.type = metadata.type;
    existing.summary = metadata.summary;
    existing.title = metadata.title ?? firstHeading(text) ?? existing.title;
    existing.updated_at = state.tick;
    item.type = metadata.type;

    if (feedbackPath) {
      const requestedDelta = metadata.importance - oldImportance;
      const appliedDelta = applyFeedback(item, feedbackPath, requestedDelta, state.tick, feedback);
      item.importance = clamp01(oldImportance + appliedDelta);
    } else {
      // Whole-document overwrite or ordinary edit is semantic content maintenance,
      // not evidence that the memory was adopted/corrected.
      item.importance = metadata.importance;
    }
    existing.importance = item.importance;
      if (item.importance !== metadata.importance) {
        await atomicWriteText(abs, rewriteFrontmatterImportance(text, item.importance));
      }
  } else {
    if (feedbackPath) {
      throw new Error(`feedback=${feedbackPath} requires an existing memory item`);
    }
    let id = randomUUID();
    while (state.items[id] || index.some((entry) => entry.id === id)) id = randomUUID();
    const entry: IndexEntry = {
      id,
      file: rel,
      type: metadata.type,
      title: metadata.title ?? firstHeading(text) ?? "untitled",
      summary: metadata.summary,
      importance: metadata.importance,
      updated_at: state.tick,
    };
    index.push(entry);
    state.items[id] = {
      id,
      type: entry.type,
      importance: entry.importance,
      difficulty: 0.4,
      stability: 1,
      retrievability: 1,
      last_at: state.tick,
      exposure: 0,
      usage: { ok: 0, fail: 0 },
      status: "active",
      at: state.tick,
    } satisfies MemoryItem;
  }

  validateStoreStructure(state, index);
  await saveIndex(layerRoots, layer, index);
  await saveState(layerRoots, layer, state);
  const address = brainPathFor(layer, layerRoots, rel);
  await appendChange(layerRoots, layer, {
    action: existing ? (feedbackPath ? `feedback_${feedbackPath}` : "edit") : "write",
    path: address,
    summary: metadata.summary,
    tick: state.tick,
  });
  const base = `index synced for ${address} (layer ${layer})`;
  return feedback.length ? `${base}; ${feedback.join("; ")}` : base;
}

function rewriteFrontmatterImportance(text: string, importance: number): string {
  if (!text.startsWith("---")) throw new Error("memory frontmatter requires importance");
  const end = text.indexOf("\n---", 4);
  if (end < 0) throw new Error("invalid memory frontmatter");
  const front = text.slice(0, end);
  if (!/^importance:\s*.*$/m.test(front)) throw new Error("memory frontmatter requires importance");
  return front.replace(/^importance:\s*.*$/m, `importance: ${importance}`) + text.slice(end);
}


function applyFeedback(
  item: MemoryItem,
  path: FeedbackPath,
  requestedDelta: number,
  tick: number,
  notices: string[],
): number {
  if (path === "adopt") {
    if (requestedDelta < 0) throw new Error("feedback=adopt cannot decrease importance");
    const applied = clamp(requestedDelta, 0, ADOPT_MAX);
    if (applied !== requestedDelta) notices.push(`adoption delta +${round2(requestedDelta)} capped at +0.2`);
    applyReview(item, "good", tick);
    notices.push(`adoption recorded: usage.ok=${item.usage.ok} stability=${round2(item.stability)}`);
    return applied;
  }

  if (path === "correct") {
    if (requestedDelta >= 0) throw new Error("feedback=correct must decrease importance");
    const floor = item.importance >= DAMPING_IMP ? DAMPING_CORRECT_MIN : CORRECT_MIN;
    const applied = clamp(requestedDelta, floor, CORRECT_MAX);
    if (applied !== requestedDelta) {
      notices.push(`correction delta ${round2(requestedDelta)} clamped to ${round2(applied)}`);
    }
    applyReview(item, "again", tick);
    item.status = "questioned";
    notices.push(`correction recorded: usage.fail=${item.usage.fail} status=questioned stability=${round2(item.stability)}`);
    return Math.max(-item.importance, applied);
  }

  if (requestedDelta > 0) throw new Error("feedback=attribute cannot increase importance");
  const applied = clamp(requestedDelta, ATTRIBUTE_MIN, ATTRIBUTE_MAX);
  if (applied !== requestedDelta) {
    notices.push(`attribution delta ${round2(requestedDelta)} clamped to ${round2(applied)}`);
  }
  applyReview(item, "again", tick);
  notices.push(`attribution recorded: usage.fail=${item.usage.fail} stability=${round2(item.stability)}`);
  return Math.max(-item.importance, applied);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function firstHeading(text: string): string | undefined {
  return text
    .split("\n")
    .find((line) => line.startsWith("# "))
    ?.replace(/^#+\s*/, "")
    .trim();
}
