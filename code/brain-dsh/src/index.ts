#!/usr/bin/env node
/**
 * brain-dsh: generic MCP server implementing the brain_think memory system.
 *
 * Current behavior/design contracts live under ../../doc/.
 * Tools: brain_think (the mandatory per-message anchor) plus
 * brain_ls / brain_grep / brain_cat / brain_write / brain_edit (reusing pi
 * tool execution) and brain_rm / brain_mv (self-implemented). All paths use
 * the @-scheme (doc/brain-dsh/brain-tools-contract.md): @/... (project layer), @global/... (global
 * layer), @core/global.md | @core/project.md | @core/sessions/<sid>.md (the
 * single core document of a layer). Ids are mechanism-internal — the model
 * addresses memories by path only. All descriptions and schemas are English
 * and follow the current BDD / public tool contract.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGrepToolDefinition, createLsToolDefinition } from "@earendil-works/pi-coding-agent";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  parseBrainPath,
  projectBrainRoot,
  resolveRoots,
  type BrainPath,
  type MemoryLayer,
} from "./memory/paths.ts";
import { rewriteBrainPaths } from "./memory/locator.ts";
import {
  editSummary,
  moveSummary,
  pendingApprovalText,
  removeSummary,
  requireApproval,
  requireApprovalForLayers,
  writeSummary,
} from "./tools/approval.ts";
import { buildCorePayload, readMemoryFile, renderCorePayload } from "./memory/core.ts";
import {
  atomicWriteText,
  loadIndex,
  loadState,
  saveIndex,
  saveState,
  updateCore,
  withGlobalLock,
  withStoreLock,
} from "./memory/store.ts";
import { registerPiTool, type PiToolLike } from "./tools/pi-adapt.ts";
import { moveItem, removeItem } from "./tools/lifecycle.ts";
import {
  syncAfterWriteUnlocked,
  validateMemoryDocument,
  type FeedbackPath,
} from "./tools/sync.ts";

/* --------------------------- descriptions --------------------------- */

const BRAIN_THINK_DESCRIPTION =
  "Memory anchor tool. **Call this tool once immediately after EACH and EVERY user message you receive, before " +
  "continuing your reasoning or taking substantive action.** Read the returned core memories, candidates and " +
  "signals, then continue thinking with them as your current memory context. The call advances the memory event " +
  "timeline. Optional session_id selects the session layer; when omitted the server uses host-provided _meta " +
  "session id when available, otherwise \"default\". All memory paths use the @-scheme.";

const BRAIN_CAT_DESCRIPTION =
  "Memory read tool. Reads a memory file with progressive disclosure — the first call (without offset) returns " +
  "the frontmatter summary (L1), then page the body with offset/limit (L2) — or a layer core document " +
  "(@core/global.md | @core/project.md | @core/sessions/<sid>.md). Paths use the @-scheme: @/... (project " +
  "layer), @/sessions/<sid>/... (session layer), @global/... (global layer).";

const BRAIN_LS_DESCRIPTION =
  'Memory directory tool. Lists the memory tree of the given @-scheme path (default "@/memories" — the project ' +
  "memories root): the memories/{decision,knowledge,intention,skill} type directories and their body files. Use it to " +
  "discover what memory exists before reading, mirroring `ls` semantics.";

const BRAIN_GREP_DESCRIPTION =
  "Memory search tool. Searches the memory body files (regex or literal pattern, per `grep` semantics) to find " +
  "relevant memories. Use it after brain_think when the candidates are insufficient or you need targeted " +
  'retrieval; the pattern is matched against file contents under the given @-scheme path (default "@/memories" — ' +
  "the project memories root).";

const BRAIN_WRITE_DESCRIPTION =
  "Memory write tool. Writes the complete archival memory document at path: creates it when absent and overwrites " +
  "the whole document when present (existing mechanism learning state is preserved). The markdown frontmatter " +
  "must contain type/summary/importance; ids are assigned by the mechanism — never write an id. Write the summary yourself before storing " +
  "(frontmatter `summary`), pick the `type` (decision/knowledge/intention/skill) and `importance` (0..1). " +
  "Recording principle: clarity and unambiguity first, then remove redundancy, then conservatively shorten — " +
  "never sacrifice precision for brevity. The index and mechanism state are synced automatically after writing. " +
  "Paths use the @-scheme: @/... (project), @/sessions/<sid>/... (session), @global/... (global).";

const BRAIN_EDIT_DESCRIPTION =
  "Memory edit tool. Updates an existing memory body file with targeted replacements (oldText/newText, " +
  "non-overlapping); or replaces a layer core document with path=@core/global.md | @core/project.md | " +
  "@core/sessions/<sid>.md and the content argument — each layer holds exactly ONE core document, and an " +
  "over-long document is rejected with a split hint (prune it, move the rest to archival, retry). Use it for " +
  "mild corrections (e.g. adjusting importance in frontmatter), content refinement, and maintaining the " +
  "resident core documents (like CLAUDE.md); the index and mechanism state are synced automatically after " +
  "editing. For strong corrections such as explicit prohibitions, use brain_rm instead.";

const BRAIN_RM_DESCRIPTION =
  "Memory remove tool. Logically deletes an archival memory body file: the file is physically moved into the " +
  "layer's memories/history/ recycle directory, history.jsonl records the moved-to path with the given reason, " +
  "and the index entry is removed. Nothing is ever destroyed. Core documents are not removable — replace them " +
  "via brain_edit @core/<layer>.md or move them out via brain_mv. Use this for strong corrections such as " +
  "explicit prohibitions or removing memories; for mild feedback prefer brain_edit adjusting importance instead.";

const BRAIN_MV_DESCRIPTION =
  "Memory move tool. Moves a memory entry: file paths move across/inside layers with fs.rename (index and " +
  "mechanism state migrate along); core moves use @core/global.md | @core/project.md | @core/sessions/<sid>.md " +
  "— as destination it makes the file the layer's core document (REPLACING the current one), as source it " +
  "writes the layer's core document out as a file.";

/* ----------------------------- schemas ------------------------------ */

const thinkSchema = z.object({
  session_id: z
    .string()
    .optional()
    .describe(
      'Optional. Session layer id. When omitted, the server uses host-provided _meta session id if present, otherwise "default".',
    ),
});

const catSchema = z.object({
  path: z
    .string()
    .describe(
      "Required. @-scheme address: a memory file (@/... project layer, @/sessions/<sid>/... session layer, @global/... global layer) for progressive reading, or a core document (@core/global.md | @core/project.md | @core/sessions/<sid>.md).",
    ),
  offset: z.number().optional().describe("Line number to start reading from (1-indexed)."),
  limit: z.number().optional().describe("Maximum number of lines to read."),
});

const lsSchema = z.object({
  path: z
    .string()
    .optional()
    .describe('Directory to list as an @-scheme path (default "@/memories": the project memories root).'),
  limit: z.number().optional().describe("Maximum number of entries to return."),
});

const grepSchema = z.object({
  pattern: z.string().describe("Search pattern (regex or literal string)."),
  path: z
    .string()
    .optional()
    .describe(
      'Directory or file to search as an @-scheme path (default "@/memories": the project memories root).',
    ),
  glob: z.string().optional().describe("Filter files by glob pattern, e.g. '*.md'."),
  ignoreCase: z.boolean().optional().describe("Case-insensitive search (default: false)."),
  literal: z
    .boolean()
    .optional()
    .describe("Treat pattern as literal string instead of regex (default: false)."),
  context: z
    .number()
    .optional()
    .describe("Number of lines to show before and after each match (default: 0)."),
  limit: z.number().optional().describe("Maximum number of matches to return (default: 100)."),
});

const writeSchema = z.object({
  path: z
    .string()
    .describe(
      "Archival memory item path to create or overwrite (@/... project layer, @/sessions/<sid>/... session layer, @global/... global layer).", 
    ),
  content: z
    .string()
    .describe("Full markdown content: frontmatter (type/summary/importance — no id) plus body."),
  confirmed: z
    .boolean()
    .optional()
    .describe(
      "Optional. Pass true to confirm a pending approval (protect mode): the write executes after the user approved.",
    ),
});

const editSchema = z.object({
  path: z
    .string()
    .describe(
      "Memory body file to edit as an @-scheme path; or a core document (@core/global.md | @core/project.md | @core/sessions/<sid>.md) to replace that layer's core document with the content argument.",
    ),
  edits: z
    .array(
      z.object({
        oldText: z
          .string()
          .describe("Exact text for one targeted replacement; must be unique in the file."),
        newText: z.string().describe("Replacement text for this targeted edit."),
      }),
    )
    .optional()
    .describe(
      "Targeted replacements; must not overlap or nest. Archival edits normally require at least one replacement, but feedback-only adopt/attribute events may use edits=[].",
    ),
  content: z
    .string()
    .optional()
    .describe(
      "Full markdown document. Required when path is a core document: replaces that layer's core array with this document.",
    ),
  feedback: z
    .enum(["adopt", "correct", "attribute"])
    .optional()
    .describe(
      "Optional. Declares the semantic feedback path of an importance change: adopt (raising within [0,+0.2]), correct (mild correction within [-0.3,-0.05], marks the item questioned), attribute (failure attribution within [-0.15,0], does not question the content). When omitted, the edit is ordinary semantic maintenance and does not create a learning feedback event.",
    ),
  confirmed: z
    .boolean()
    .optional()
    .describe(
      "Optional. Pass true to confirm a pending approval (protect mode): the edit executes after the user approved.",
    ),
});

const rmSchema = z.object({
  path: z
    .string()
    .describe("Memory body file to remove as an @-scheme path (core documents are not removable)."),
  reason: z
    .string()
    .optional()
    .describe("Why this memory is removed; for strong corrections quote the user's words."),
  confirmed: z
    .boolean()
    .optional()
    .describe(
      "Optional. Pass true to confirm a pending approval (protect mode): the removal executes after the user approved.",
    ),
});

const mvSchema = z.object({
  src: z
    .string()
    .describe(
      "Source: a memory file path (@-scheme), or a core document (@core/global.md | @core/project.md | @core/sessions/<sid>.md) to write that layer's core document out as a file.",
    ),
  dst: z
    .string()
    .describe(
      "Destination: a memory file path (@-scheme), or a core document (@core/global.md | @core/project.md | @core/sessions/<sid>.md) to make a file the layer's core document (replacing it).",
    ),
  confirmed: z
    .boolean()
    .optional()
    .describe(
      "Optional. Pass true to confirm a pending approval (protect mode): the move executes after the user approved.",
    ),
});

/* --------------------------- session metadata --------------------------- */

/**
 * Extract the host-provided session/thread id from MCP tool-call `_meta`.
 *
 * - Codex injects `_meta.threadId` automatically.
 * - DSH (after the MCP bridge patch) injects `_meta.dshSessionId` (we control
 *   both sides, so a simple key is enough; `com.example.dsh/sessionId` is kept
 *   as a compatibility alias for the namespaced variant).
 * - `sessionId` is accepted as a generic fallback for other hosts.
 */
function metaSessionId(extra?: { _meta?: unknown }): string | undefined {
  const meta = extra?._meta;
  if (typeof meta !== "object" || meta === null) return undefined;
  const record = meta as Record<string, unknown>;
  for (const key of ["threadId", "dshSessionId", "com.example.dsh/sessionId", "sessionId"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

type ItemPath = Extract<BrainPath, { kind: "item" }>;

function applyTargetedEdits(
  before: string,
  edits: Array<{ oldText: string; newText: string }>,
): string {
  if (edits.length === 0) throw new Error("at least one edit is required");
  const spans = edits.map((edit) => {
    if (!edit.oldText) throw new Error("oldText must not be empty");
    const start = before.indexOf(edit.oldText);
    if (start < 0) throw new Error(`oldText not found: ${edit.oldText.slice(0, 80)}`);
    if (before.indexOf(edit.oldText, start + 1) >= 0) {
      throw new Error(`oldText is not unique: ${edit.oldText.slice(0, 80)}`);
    }
    return { ...edit, start, end: start + edit.oldText.length };
  });
  const ordered = [...spans].sort((a, b) => a.start - b.start);
  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i]!.start < ordered[i - 1]!.end) throw new Error("edits must not overlap");
  }
  let out = before;
  for (const edit of [...ordered].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.newText + out.slice(edit.end);
  }
  return out;
}

function filterPrivateMemoryOutput(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const normalized = line.trim().replace(/\\/g, "/").toLowerCase();
      if (/^history(\/|$)/.test(normalized)) return false;
      return !/(^|\/)memories\/history(\/|$)/.test(normalized);
    })
    .join("\n");
}

function sanitizeErrorMessage(error: unknown, roots: ReturnType<typeof resolveRoots>): string {
  let message = error instanceof Error ? error.message : String(error);
  for (const [physical, replacement] of [
    [projectBrainRoot(roots.projectRoot), "<project-memory>"],
    [roots.globalRoot, "<global-memory>"],
    [roots.projectRoot, "<project>"],
  ] as const) {
    message = message.split(physical).join(replacement);
    message = message.split(physical.replace(/\\/g, "/")).join(replacement);
  }
  return message;
}

async function commitItemMutation(
  bp: ItemPath,
  buildAfter: (before: string | undefined) => string,
  feedback?: FeedbackPath,
): Promise<string> {
  return withStoreLock(async () => {
    const commit = async (): Promise<string> => {
      let beforeBody: string | undefined;
      try {
        beforeBody = await readFile(bp.abs, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      const after = buildAfter(beforeBody);
      validateMemoryDocument(after, bp.memoryType);
      const beforeIndex = structuredClone(await loadIndex(bp.roots, bp.layer));
      const beforeState = structuredClone(await loadState(bp.roots, bp.layer));
      try {
        await atomicWriteText(bp.abs, after);
        return await syncAfterWriteUnlocked(bp.roots, bp.abs, feedback);
      } catch (error) {
        if (beforeBody === undefined) await rm(bp.abs, { force: true }).catch(() => undefined);
        else await atomicWriteText(bp.abs, beforeBody);
        await saveIndex(bp.roots, bp.layer, beforeIndex);
        await saveState(bp.roots, bp.layer, beforeState);
        throw error;
      }
    };
    return bp.layer === "global" ? withGlobalLock(bp.roots, commit) : commit();
  });
}

/* ------------------------------- main ------------------------------- */

export interface RegisterBrainToolsOptions {
  roots: ReturnType<typeof resolveRoots>;
  askMode: "protect" | "none";
  env?: NodeJS.ProcessEnv;
  piTools?: Partial<Record<"ls" | "grep", PiToolLike>>;
}

/** Register the public brain_* tool handlers without creating a transport. */
export function registerBrainTools(
  server: McpServer,
  options: RegisterBrainToolsOptions,
): void {
  const { roots, askMode } = options;
  const env = options.env ?? process.env;
  /** One-line reason for the protect-mode approval relay. */
  function approvalReason(layer: MemoryLayer, action: string): string {
    return `${action} in the ${layer} layer affects ${layer === "global" ? "every project" : "all sessions of this project"}`;
  }


  server.registerTool(
    "brain_think",
    { title: "brain_think", description: BRAIN_THINK_DESCRIPTION, inputSchema: thinkSchema },
    async (args, extra) => {
      try {
        const sessionId = args.session_id ?? metaSessionId(extra) ?? roots.sessionId;
        const rootsForCall = resolveRoots({ projectRoot: roots.projectRoot, sessionId, env });
        const payload = await buildCorePayload(rootsForCall);
        return { content: [{ type: "text" as const, text: renderCorePayload(payload) }] };
      } catch (error) {
        const message = sanitizeErrorMessage(error, roots);
        return { content: [{ type: "text" as const, text: `error: ${message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    "brain_cat",
    { title: "brain_cat", description: BRAIN_CAT_DESCRIPTION, inputSchema: catSchema },
    async (args) => {
      try {
        const bp = parseBrainPath(args.path, roots);
        if (bp.kind === "core") {
          const state = await loadState(bp.roots, bp.layer);
          const text = state.core[0] ?? "(empty)";
          return { content: [{ type: "text" as const, text }] };
        }
        if (bp.kind !== "item") {
          return {
            content: [{ type: "text" as const, text: "error: brain_cat only reads archival memory items or core documents — use brain_ls to list directories" }],
            isError: true,
          };
        }
        const result = await readMemoryFile(bp.roots, bp.abs, args.offset, args.limit);
        return { content: [{ type: "text" as const, text: result.text }] };
      } catch (error) {
        const message = sanitizeErrorMessage(error, roots);
        return { content: [{ type: "text" as const, text: `error: ${message}` }], isError: true };
      }
    },
  );
  // ---- pi-reused read-only discovery/search execution ----
  const piTools: Record<string, PiToolLike> = {
    grep: options.piTools?.grep ?? (createGrepToolDefinition(roots.projectRoot) as unknown as PiToolLike),
    ls: options.piTools?.ls ?? (createLsToolDefinition(roots.projectRoot) as unknown as PiToolLike),
  };
  for (const binding of [
    { piName: "ls", name: "brain_ls", description: BRAIN_LS_DESCRIPTION, schema: lsSchema },
    { piName: "grep", name: "brain_grep", description: BRAIN_GREP_DESCRIPTION, schema: grepSchema },
  ]) {
    const tool = piTools[binding.piName]!;
    registerPiTool(
      server,
      {
        ...tool,
        execute: async (callId, args, signal, onUpdate, ctx) => {
          const effective: Record<string, unknown> = { ...args };
          const raw = typeof args.path === "string" && args.path !== "" ? args.path : "@/memories";
          const bp = parseBrainPath(raw, roots);
          if (bp.kind === "core") {
            return {
              content: [{ type: "text" as const, text: `error: ${binding.name} does not search/list core documents` }],
              isError: true,
            };
          }
          effective.path = bp.abs;
          return tool.execute(callId, effective, signal, onUpdate, ctx);
        },
      },
      {
        roots,
        cwd: roots.projectRoot,
        name: binding.name,
        description: binding.description,
        schema: binding.schema,
        rewrite: (text) => rewriteBrainPaths(filterPrivateMemoryOutput(text), roots),
      },
    );
  }

  server.registerTool(
    "brain_write",
    { title: "brain_write", description: BRAIN_WRITE_DESCRIPTION, inputSchema: writeSchema },
    async (args) => {
      try {
        const bp = parseBrainPath(args.path, roots);
        if (bp.kind !== "item") {
          return {
            content: [{ type: "text" as const, text: "error: brain_write requires an archival item path" }],
            isError: true,
          };
        }
        const need = requireApproval(askMode, bp.layer, args.confirmed);
        if (need) {
          return {
            content: [{ type: "text" as const, text: pendingApprovalText(need, writeSummary(args.content), approvalReason(need, "writing a memory in")) }],
          };
        }
        const syncMessage = await commitItemMutation(bp, () => args.content);
        return {
          content: [
            { type: "text" as const, text: `wrote ${args.path}` },
            { type: "text" as const, text: syncMessage },
          ],
        };
      } catch (error) {
        const message = sanitizeErrorMessage(error, roots);
        return { content: [{ type: "text" as const, text: `error: ${message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    "brain_edit",
    { title: "brain_edit", description: BRAIN_EDIT_DESCRIPTION, inputSchema: editSchema },
    async (args) => {
      try {
        const bp = parseBrainPath(args.path, roots);
        if (bp.kind === "core") {
          const need = requireApproval(askMode, bp.layer, args.confirmed);
          if (need) {
            const head = typeof args.content === "string" ? args.content.trim().split("\n")[0]?.slice(0, 80) ?? "" : "";
            return {
              content: [{ type: "text" as const, text: pendingApprovalText(need, `replace ${bp.layer} core document${head ? `: ${head}` : ""}`, approvalReason(need, "replacing the core document in")) }],
            };
          }
          if (typeof args.content !== "string" || !args.content.trim()) {
            return { content: [{ type: "text" as const, text: "error: content is required when editing a core document" }], isError: true };
          }
          const prev = await updateCore(bp.roots, bp.layer, args.content);
          return { content: [{ type: "text" as const, text: `${args.path} updated: 1 document (was ${prev})` }] };
        }
        if (bp.kind !== "item") {
          return { content: [{ type: "text" as const, text: "error: brain_edit requires an archival item or core document" }], isError: true };
        }
        const edits = args.edits ?? [];
        const need = requireApproval(askMode, bp.layer, args.confirmed);
        if (need) {
          return {
            content: [{ type: "text" as const, text: pendingApprovalText(need, editSummary(args.path, edits), approvalReason(need, "editing a memory in")) }],
          };
        }
        const feedback = args.feedback as FeedbackPath | undefined;
        const syncMessage = await commitItemMutation(
          bp,
          (before) => {
            if (before === undefined) throw new Error("brain_edit target does not exist");
            if (edits.length === 0) {
              if (feedback === undefined) throw new Error("at least one edit is required when feedback is omitted");
              return before;
            }
            return applyTargetedEdits(before, edits);
          },
          feedback,
        );
        return {
          content: [
            { type: "text" as const, text: `edited ${args.path}` },
            { type: "text" as const, text: syncMessage },
          ],
        };
      } catch (error) {
        const message = sanitizeErrorMessage(error, roots);
        return { content: [{ type: "text" as const, text: `error: ${message}` }], isError: true };
      }
    },
  );
  // brain_rm / brain_mv (self-implemented).
  server.registerTool(
    "brain_rm",
    { title: "brain_rm", description: BRAIN_RM_DESCRIPTION, inputSchema: rmSchema },
    async (args) => {
      try {
        const bp = parseBrainPath(args.path, roots);
        if (bp.kind !== "item") {
          return {
            content: [
              {
                type: "text" as const,
                text: "error: brain_rm only accepts archival memory items; directories and core documents are not removable",
              },
            ],
            isError: true,
          };
        }
        const need = requireApproval(askMode, bp.layer, args.confirmed);
        if (need) {
          return {
            content: [
              {
                type: "text" as const,
                text: pendingApprovalText(
                  need,
                  removeSummary(typeof args.path === "string" ? args.path : bp.abs, args.reason),
                  approvalReason(need, "removing a memory"),
                ),
              },
            ],
          };
        }
        await removeItem(bp.roots, bp.abs, args.reason ?? "removed by user correction");
        return {
          content: [
            {
              type: "text" as const,
              text: `removed ${args.path}`,
            },
          ],
        };
      } catch (error) {
        const message = sanitizeErrorMessage(error, roots);
        return { content: [{ type: "text" as const, text: `error: ${message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    "brain_mv",
    { title: "brain_mv", description: BRAIN_MV_DESCRIPTION, inputSchema: mvSchema },
    async (args) => {
      try {
        const srcBP = parseBrainPath(args.src, roots);
        const dstBP = parseBrainPath(args.dst, roots);
        const need = requireApprovalForLayers(
          askMode,
          [srcBP.layer, dstBP.layer],
          args.confirmed,
        );
        if (need) {
          return {
            content: [
              {
                type: "text" as const,
                text: pendingApprovalText(
                  need,
                  moveSummary(args.src, args.dst),
                  approvalReason(need, "moving a memory into"),
                ),
              },
            ],
          };
        }
        await moveItem(roots, srcBP, dstBP);
        return {
          content: [{ type: "text" as const, text: `moved ${args.src} → ${args.dst}` }],
        };
      } catch (error) {
        const message = sanitizeErrorMessage(error, roots);
        return { content: [{ type: "text" as const, text: `error: ${message}` }], isError: true };
      }
    },
  );

}

async function main(): Promise<void> {
  const env = process.env;
  const roots = resolveRoots({ env });
  const askMode: "protect" | "none" = env.BRAIN_ASK_LONG_TERM === "protect" ? "protect" : "none";
  const server = new McpServer({ name: "brain-dsh", version: "0.2.0" });
  registerBrainTools(server, { roots, askMode, env });

  if (askMode === "protect") {
    console.error(
      "brain-dsh: protect mode configured; long-term writes require user confirmation relay",
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `brain-dsh ready: project=${roots.projectRoot} global=${roots.globalRoot} ask=${askMode}`,
  );
}

const invokedAsCli =
  typeof process.argv[1] === "string" &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedAsCli) {
  main().catch((error) => {
    console.error(`brain-dsh fatal: ${error instanceof Error ? error.stack : String(error)}`);
    process.exit(1);
  });
}
