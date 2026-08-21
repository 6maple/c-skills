/**
 * protect-mode approval gate.
 *
 * BRAIN_ASK_LONG_TERM=protect: writes targeting a non-session layer
 * (project/global) return a pending-approval response instead of executing;
 * the model relays the summary to the user and retries the identical call
 * with confirmed:true to pass the gate. The gate is stateless and idempotent
 * (the retry carries the confirmation). In "none" mode every write passes.
 */
import type { MemoryLayer } from "../memory/paths.ts";

export type AskMode = "protect" | "none";

/**
 * Decide whether a write needs approval.
 * Returns the layer to approve (project/global) or null when the write may
 * proceed (session layer, confirmed retry, or ask mode "none").
 */
export function requireApproval(
  askMode: AskMode,
  layer: MemoryLayer | undefined,
  confirmed: boolean | undefined,
): MemoryLayer | null {
  return requireApprovalForLayers(askMode, layer ? [layer] : [], confirmed);
}

/** A move mutates both source and destination, so approval considers all touched layers. */
export function requireApprovalForLayers(
  askMode: AskMode,
  layers: Iterable<MemoryLayer>,
  confirmed: boolean | undefined,
): MemoryLayer | null {
  if (askMode !== "protect" || confirmed === true) return null;
  const unique = new Set(layers);
  if (unique.has("global")) return "global";
  if (unique.has("project")) return "project";
  return null;
}

/** Render the pending-approval response text for the model to relay. */
export function pendingApprovalText(layer: MemoryLayer, summary: string, reason: string): string {
  return [
    `pending-approval: writing to the ${layer} layer requires user confirmation`,
    `summary: ${summary}`,
    `reason: ${reason}`,
    "retry the identical call with confirmed:true after the user approves",
  ].join("\n");
}

/** One-line summary for brain_write content (frontmatter summary or first line). */
export function writeSummary(content: string): string {
  const first = content.split("\n")[0] ?? "";
  if (first.startsWith("---")) {
    const m = /^summary:\s*(.*)$/m.exec(content);
    if (m && m[1].trim()) return m[1].trim().slice(0, 120);
  }
  return (first || "(empty content)").slice(0, 120);
}

/** One-line summary for brain_edit edits. */
export function editSummary(
  path: string,
  edits: Array<{ oldText: string; newText: string }>,
): string {
  const count = edits.length;
  const head = edits[0]?.newText?.split("\n")[0]?.slice(0, 60) ?? "";
  return `${count} edit(s) on ${path}${head ? `; e.g. → ${head}` : ""}`;
}

/** One-line summary for brain_rm. */
export function removeSummary(path: string, reason: string | undefined): string {
  return `remove ${path}${reason ? ` (reason: ${reason})` : ""}`;
}

/** One-line summary for brain_mv. */
export function moveSummary(src: string, dst: string): string {
  return `move ${src} → ${dst}`;
}
