/**
 * L0 anchor payload for `brain_think` (the mandatory per-message tool) and
 * the progressive-disclosure file read for `brain_cat <path>`.
 *
 * Core arrays come straight from each layer's
 * state.json — each layer holds exactly ONE core document (the array is only
 * a storage form for merging; the model sees @core/global.md, @core/project.md
 * and @core/sessions/<sid>.md). Candidates are the merged layer index ranked
 * by importance with exposure deweighting (no query on L0 — semantic
 * refinement happens via brain_grep).
 *
 * Read-level reviews: L0 — every candidate shown in the anchor
 * payload gets exposure+1 and a lazy decay (stability unchanged); L1 — the
 * frontmatter-summary read applies the hard (small) stability update; L2 — a
 * body page read applies the good update. Usage counters are never touched by
 * reads: they belong to adoption/correction feedback on brain_edit.
 */
import { readFile } from "node:fs/promises";
import { relative, sep } from "node:path";
import {
  applyReadReview,
  decay,
  ensureLayer,
  loadIndex,
  loadState,
  parseFrontmatter,
  saveState,
  validateStoreStructure,
  withGlobalLock,
  withStoreLock,
  type IndexEntry,
  type LayerState,
  type MemoryItem,
} from "./store.ts";
import {
  assertInsideMemoryTree,
  brainPathFor,
  layerDir,
  layerOf,
  rootsForPath,
  type MemoryLayer,
  type ResolvedRoots,
} from "./paths.ts";

const LAYERS: MemoryLayer[] = ["global", "project", "session"];
export const CANDIDATE_LIMIT = 10;
const EXPOSURE_ALPHA = 0.05;
const QUESTIONED_PENALTY = 0.1;
const PAGE_LIMIT_DEFAULT = 100;
/** usage.ok threshold for the promotion signal (Design/Calibration). */
const PROMOTE_OK_THRESHOLD = 3;
/** retrievability threshold for the demotion signal (Design/Calibration). */
const DEMOTE_R_THRESHOLD = 0.05;
/** importance threshold for the demotion signal (Design/Calibration). */
const DEMOTE_IMP_THRESHOLD = 0.4;

export interface CoreCandidate {
  layer: MemoryLayer;
  /** @-scheme address of the entry (the model addresses memories by path, not id). */
  path: string;
  type: string;
  summary: string;
  relevance: number;
  status?: "active" | "questioned";
}

export interface CorePayload {
  core: Record<MemoryLayer, string[]>;
  candidates: CoreCandidate[];
  signals: string[];
}

/** Build the L0 anchor payload and bump the tick on all layers. */
export async function buildCorePayload(roots: ResolvedRoots): Promise<CorePayload> {
  // Same-process mutations are serialized; global is additionally protected
  // across project-scoped MCP processes because every think advances it.
  return withStoreLock(() => withGlobalLock(roots, () => buildCorePayloadUnlocked(roots)));
}

async function buildCorePayloadUnlocked(roots: ResolvedRoots): Promise<CorePayload> {
  // Validate every participating layer before mutating any tick. This makes
  // predictable corruption fail before a partial think event is recorded.
  const initialStates = new Map<MemoryLayer, LayerState>();
  for (const layer of LAYERS) {
    await ensureLayer(roots, layer);
    const state = await loadState(roots, layer);
    const index = await loadIndex(roots, layer);
    validateStoreStructure(state, index);
    initialStates.set(layer, state);
  }
  for (const layer of LAYERS) {
    const state = initialStates.get(layer)!;
    state.tick += 1;
    await saveState(roots, layer, state);
  }

  const core: Record<MemoryLayer, string[]> = { global: [], project: [], session: [] };
  const signals: string[] = [];
  for (const layer of LAYERS) {
    const state = await loadState(roots, layer);
    core[layer] = state.core;
    // Promotion/demotion signals: the mechanism
    // only reports candidates with their @-scheme address; the model executes
    // (brain_mv for promotion, importance feedback for demotion — never
    // deletion). Retrievability for the demotion check is computed live from
    // the review point (last_at), since only exposed items get a persisted
    // decay. Items without an index entry (already removed) emit no signal.
    const index = await loadIndex(roots, layer);
    const relById = new Map(index.map((e) => [e.id, e.file]));
    for (const [id, item] of Object.entries(state.items)) {
      if (item.status !== "active") continue;
      const rel = relById.get(id);
      if (rel === undefined) continue;
      const dt = Math.max(0, state.tick - item.last_at);
      const R = Math.exp(-dt / Math.max(0.01, item.stability));
      const path = brainPathFor(layer, roots, rel);
      if (item.usage.ok >= PROMOTE_OK_THRESHOLD) {
        const target = layer === "session" ? "project" : layer === "project" ? "global" : undefined;
        if (target) {
          // H3: promotion means layer promotion in the archival tree
          // (session → project → global). Moving into @core/<layer>.md is an
          // explicit "make this resident" choice the model may make with
          // brain_mv, but it is not the default automatic promotion target.
          const archivalTarget = target === "project" ? `@/${rel}` : `@global/${rel}`;
          signals.push(
            `promotion-candidate: ${path} (usage.ok=${item.usage.ok}, importance=${item.importance}) — usage.ok reached the promotion threshold; promote to ${target} layer via brain_mv ${path} ${archivalTarget} (approval applies); if this should be a resident core document, you may instead use brain_mv ${path} @core/${target}.md`,
          );
        }
      }
      if (R < DEMOTE_R_THRESHOLD && item.importance < DEMOTE_IMP_THRESHOLD) {
        signals.push(
          `demotion-candidate: ${path} (retrievability=${R.toFixed(2)}, importance=${item.importance}, unreviewed for ${dt} ticks) — long-unreviewed and low-value; consider lowering importance (brain_edit feedback=attribute) or marking questioned (feedback=correct), never delete`,
        );
      }
    }
  }

  const candidates = await buildCandidates(roots);
  return { core, candidates, signals };
}

/**
 * Merge the three layer indexes, rank by importance − α·exposure, and record
 * the L0 exposure event: every candidate shown in the payload gets
 * exposure+1 plus a lazy decay, persisted back to its layer state
 * (seeing a summary is shallow contact: exposure grows,
 * stability unchanged).
 */
async function buildCandidates(roots: ResolvedRoots): Promise<CorePayload["candidates"]> {
  const ranked: Array<{
    layer: MemoryLayer;
    entry: IndexEntry;
    item?: MemoryItem;
    score: number;
    state: LayerState;
  }> = [];
  const states = new Map<MemoryLayer, LayerState>();
  for (const layer of LAYERS) {
    const state = await loadState(roots, layer);
    states.set(layer, state);
    const index = await loadIndex(roots, layer);
    for (const entry of index) {
      const item = state.items[entry.id];
      const score =
        entry.importance -
        EXPOSURE_ALPHA * (item?.exposure ?? 0) -
        (item?.status === "questioned" ? QUESTIONED_PENALTY : 0);
      ranked.push({ layer, entry, item, score, state });
    }
  }
  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, CANDIDATE_LIMIT);

  const touched = new Set<MemoryLayer>();
  for (const c of top) {
    if (c.item) {
      c.item.exposure += 1;
      decay(c.item, c.state.tick);
      touched.add(c.layer);
    }
  }
  for (const layer of touched) {
    await saveState(roots, layer, states.get(layer)!);
  }

  // Candidates are addressed by @-scheme path (ids are mechanism-internal).
  return top.map(({ layer, entry, item, score }) => ({
    layer,
    path: brainPathFor(layer, roots, entry.file),
    type: entry.type,
    summary: entry.summary,
    relevance: Math.max(0, Math.round(score * 100) / 100),
    ...(item?.status === "questioned" ? { status: "questioned" as const } : {}),
  }));
}

/** Render the L0 anchor payload as the tool result text. */
export function renderCorePayload(payload: CorePayload): string {
  // Core is presented as plain markdown documents: each layer
  // contributes its single document verbatim, so the model perceives three
  // documents (global/project/session), not a list of entries.
  const coreText: string[] = [];
  for (const layer of LAYERS) {
    coreText.push(`## ${layer} core`);
    if (payload.core[layer].length === 0) {
      coreText.push("(empty)");
    } else {
      for (const doc of payload.core[layer]) {
        coreText.push("", doc.trim(), "---");
      }
      coreText.pop(); // drop trailing separator
    }
  }
  const candidateText = payload.candidates.map(
    (c) => `- ${c.path} (${c.type}, relevance ${c.relevance}${c.status ? `, status ${c.status}` : ""}): ${c.summary}`,
  );
  return [
    "# core memory",
    ...coreText,
    "",
    "## candidates (most relevant memories)",
    ...(candidateText.length ? candidateText : ["(none)"]),
    "",
    ...(payload.signals.length ? [`## signals\n${payload.signals.join("\n")}`] : []),
    "",
    "## memory maintenance",
    "- Remember what will improve your future behavior: a decision you will rely on, a fact or norm you",
    "  must respect, a commitment you must keep, a method that worked, a correction of a past mistake.",
    "  If forgetting it would not change how you act later, it does not belong in memory. Most turns",
    "  produce nothing worth remembering — that is the expected case.",
    "- Classify each memory by what it is: decision — a choice you made and will stand by, with the",
    "  reasoning (\u201cwe chose X because Y\u201d), preventing re-litigation later; knowledge — a fact or norm you",
    "  must respect when acting in this domain; intention — a commitment or goal you are carrying, which",
    "  reloads every turn until fulfilled; skill — a reusable method that, followed again, gets a similar",
    "  task done better, and can be promoted once mature.",
    "- Place each memory by the scope it should serve: @/sessions/<sid>/ for this session's context,",
    "  commitments and lessons; @/ for this project's durable facts, decisions and conventions; @global/",
    "  for cross-project preferences, principles and reusable skills. Choose the scope from the memory's",
    "  semantics; use brain_mv when its appropriate scope later changes.",
    "- Prefer updating an existing entry (brain_edit) over writing a duplicate; archive outdated entries",
    "  with brain_rm. Work from the candidates above — read one in full with brain_cat when its summary",
    "  leaves you uncertain; search with brain_grep when the candidates miss what you need.",
    "- Keep the layer core documents current (@core/global.md, @core/project.md, @core/sessions/<sid>.md)",
    "  when the layer's goal, progress or commitments change.",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Progressive disclosure read                                          */
/* ------------------------------------------------------------------ */

export interface ReadMemoryResult {
  text: string;
  /** Review level applied (1 = L1 summary, 2 = L2 body page), when the file is an indexed item. */
  review?: 1 | 2;
  /** @-scheme address of the reviewed entry. */
  path?: string;
}

/**
 * `brain_cat <path>` progressive read: without offset → L1 (frontmatter
 * summary/frontmatter metadata only); with offset → L2 (page the body, 1-based line
 * numbers across the whole file). Both record the read-level review on the
 * item's mechanism state (stability/retrievability only). The item is
 * located by PATH (index `file` field) — ids are mechanism-internal and are
 * not part of the model contract.
 */
export async function readMemoryFile(
  roots: ResolvedRoots,
  absPath: string,
  offset?: number,
  limit?: number,
): Promise<ReadMemoryResult> {
  // Review events write mechanism state. Global reviews share the same
  // cross-process lock as every other global mutation.
  const layerRoots = rootsForPath(roots, absPath);
  const layer = layerOf(layerRoots, absPath);
  return withStoreLock(() =>
    layer === "global"
      ? withGlobalLock(layerRoots, () => readMemoryFileUnlocked(roots, absPath, offset, limit))
      : readMemoryFileUnlocked(roots, absPath, offset, limit),
  );
}

async function readMemoryFileUnlocked(
  roots: ResolvedRoots,
  absPath: string,
  offset?: number,
  limit?: number,
): Promise<ReadMemoryResult> {
  const abs = assertInsideMemoryTree(absPath, roots);
  const layerRoots = rootsForPath(roots, abs);
  const layer = layerOf(layerRoots, abs);
  if (!layer) throw new Error(`cannot determine memory layer for "${abs}"`);

  const text = await readFile(abs, "utf-8");
  const lines = text.split("\n");
  const { front } = parseFrontmatter(text);

  let review: 1 | 2 | undefined;
  let path: string | undefined;
  const rel = relative(layerDir(layerRoots, layer), abs).split(sep).join("/");
  const index = await loadIndex(layerRoots, layer);
  const entry = index.find((e) => e.file === rel);

  let out: string;
  let hasL2Content = false;
  if (offset === undefined) {
    if (!entry) {
      // Internal helper callers may inspect an unindexed file; such a file is
      // not an archival item and therefore has no progressive-review event.
      out = text;
    } else {
      out =
        "--- frontmatter ---\n" +
        Object.entries(front)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
    }
  } else {
    const start = Math.max(1, Math.floor(offset));
    const end = Math.min(lines.length, start + (limit ?? PAGE_LIMIT_DEFAULT) - 1);
    const pageLines = lines.slice(start - 1, end);
    hasL2Content = pageLines.length > 0;
    out = hasL2Content
      ? pageLines.map((line, i) => `${start + i} | ${line}`).join("\n")
      : "(no more lines)";
  }

  if (entry && (offset === undefined || hasL2Content)) {
    const state = await loadState(layerRoots, layer);
    const item = state.items[entry.id];
    if (item) {
      const level: 1 | 2 = offset === undefined ? 1 : 2;
      applyReadReview(item, level, state.tick);
      await saveState(layerRoots, layer, state);
      review = level;
      path = brainPathFor(layer, layerRoots, rel);
    }
  }
  return { text: out, review, path };
}
