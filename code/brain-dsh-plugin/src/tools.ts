/**
 * Vendored brain_* tool contracts — the plugin registers these statically so the
 * tools are available to the model before any brain-dsh instance spawns.
 *
 * Source of truth: brain-dsh `src/index.ts` (tool names, descriptions, zod
 * schemas). The runtime cross-check lives in `scripts/verify.mjs`: it connects
 * to a real brain-dsh server and asserts the vendored names/schema shapes still
 * match `tools/list`. Keep this file in sync with brain-dsh when it changes.
 */
export interface BrainToolSpec {
  name: string
  description: string
  /** Standard JSON Schema for the tool's parameters (MCP inputSchema shape). */
  parameters: Record<string, unknown>
}

const thinkDescription =
  'Memory anchor tool. **Call this tool once immediately after EACH and EVERY user message you receive ' +
  '(before answering) — do not skip any message**: ' +
  'it loads the three-layer core memory (global/project/session: goal, progress, commitments) as documents, the ' +
  'candidate memory directory and mechanism signals, and advances the memory timeline. Optional session_id ' +
  'selects the session layer; when omitted the server uses host-provided _meta session id (Codex threadId / DSH ' +
  'dshSessionId) if present, otherwise "default". Optional project_root is a per-call debug override ' +
  'only — the recommended deployment is one MCP instance per project with BRAIN_PROJECT_ROOT set, because this ' +
  'override does not persist to other brain_* tools. All memory paths use the @-scheme: @/memories/... = this ' +
  "project's memory, @global/memories/... = global memory, @core/global.md | @core/project.md | " +
  '@core/sessions/<sid>.md = the single core document of a layer.'

const catDescription =
  'Memory read tool. Reads a memory file with progressive disclosure — the first call (without offset) returns ' +
  'the frontmatter summary (L1), then page the body with offset/limit (L2) — or a layer core document ' +
  '(@core/global.md | @core/project.md | @core/sessions/<sid>.md). Paths use the @-scheme: @/... (project ' +
  'layer), @/sessions/<sid>/... (session layer), @global/... (global layer).'

const lsDescription =
  'Memory directory tool. Lists the memory tree of the given @-scheme path (default "@/memories" — the project ' +
  'memories root): the memories/{decision,knowledge,intention,skill} type directories and their body files. Use it to ' +
  'discover what memory exists before reading, mirroring `ls` semantics.'

const grepDescription =
  'Memory search tool. Searches the memory body files (regex or literal pattern, per `grep` semantics) to find ' +
  'relevant memories. Use it after brain_think when the candidates are insufficient or you need targeted ' +
  "retrieval; the pattern is matched against file contents under the given @-scheme path (default \"@/memories\" — " +
  'the project memories root).'

const writeDescription =
  'Memory write tool. Creates a new memory body file (markdown with frontmatter: type/summary/importance; ' +
  'ids are assigned by the mechanism — never write an id). Write the summary yourself before storing ' +
  '(frontmatter `summary`), pick the `type` (decision/knowledge/intention/skill) and `importance` (0..1). ' +
  'Recording principle: clarity and unambiguity first, then remove redundancy, then conservatively shorten — ' +
  'never sacrifice precision for brevity. The index and mechanism state are synced automatically after writing. ' +
  'Paths use the @-scheme: @/... (project), @/sessions/<sid>/... (session), @global/... (global).'

const editDescription =
  'Memory edit tool. Updates an existing memory body file with targeted replacements (oldText/newText, ' +
  'non-overlapping); or replaces a layer core document with path=@core/global.md | @core/project.md | ' +
  '@core/sessions/<sid>.md and the content argument — each layer holds exactly ONE core document, and an ' +
  'over-long document is rejected with a split hint (prune it, move the rest to archival, retry). Use it for ' +
  'mild corrections (e.g. adjusting importance in frontmatter), content refinement, and maintaining the ' +
  'resident core documents (like CLAUDE.md); the index and mechanism state are synced automatically after ' +
  'editing. For strong corrections such as explicit prohibitions, use brain_rm instead.'

const rmDescription =
  'Memory remove tool. Logically deletes an archival memory body file: the file is physically moved into the ' +
  "layer's memories/history/ recycle directory, history.jsonl records the moved-to path with the given reason, " +
  'and the index entry is removed. Nothing is ever destroyed. Core documents are not removable — replace them ' +
  'via brain_edit @core/<layer>.md or move them out via brain_mv. Use this for strong corrections such as ' +
  'explicit prohibitions or removing memories; for mild feedback prefer brain_edit adjusting importance instead.'

const mvDescription =
  'Memory move tool. Moves a memory entry: file paths move across/inside layers with fs.rename (index and ' +
  'mechanism state migrate along); core moves use @core/global.md | @core/project.md | @core/sessions/<sid>.md ' +
  '— as destination it makes the file the layer\'s core document (REPLACING the current one), as source it ' +
  'writes the layer\'s core document out as a file.'

const confirmedDesc =
  'Optional. Pass true to confirm a pending approval (protect mode): the operation executes after the user approved.'

/** JSON-schema building blocks mirroring brain-dsh's zod schemas (src/index.ts). */
const str = (description: string) => ({ type: 'string', description })
const num = (description: string) => ({ type: 'number', description })
const bool = (description: string) => ({ type: 'boolean', description })

export const BRAIN_TOOLS: readonly BrainToolSpec[] = [
  {
    name: 'brain_think',
    description: thinkDescription,
    parameters: {
      type: 'object',
      properties: {
        session_id: str(
          'Optional. Session layer id. When omitted, the server uses host-provided _meta session id (Codex threadId / DSH dshSessionId) if present, otherwise "default".',
        ),
        project_root: str(
          'Optional per-call debug override for the project base used to resolve @/ paths (default BRAIN_PROJECT_ROOT or cwd). Does not persist to other tools; prefer one MCP instance per project.',
        ),
      },
      additionalProperties: false,
    },
  },
  {
    name: 'brain_cat',
    description: catDescription,
    parameters: {
      type: 'object',
      properties: {
        path: str(
          'Required. @-scheme address: a memory file (@/... project layer, @/sessions/<sid>/... session layer, @global/... global layer) for progressive reading, or a core document (@core/global.md | @core/project.md | @core/sessions/<sid>.md).',
        ),
        offset: num('Line number to start reading from (1-indexed).'),
        limit: num('Maximum number of lines to read.'),
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'brain_ls',
    description: lsDescription,
    parameters: {
      type: 'object',
      properties: {
        path: str('Directory to list as an @-scheme path (default "@/memories": the project memories root).'),
        limit: num('Maximum number of entries to return.'),
      },
      additionalProperties: false,
    },
  },
  {
    name: 'brain_grep',
    description: grepDescription,
    parameters: {
      type: 'object',
      properties: {
        pattern: str('Search pattern (regex or literal string).'),
        path: str('Directory or file to search as an @-scheme path (default "@/memories": the project memories root).'),
        glob: str("Filter files by glob pattern, e.g. '*.md'."),
        ignoreCase: bool('Case-insensitive search (default: false).'),
        literal: bool('Treat pattern as literal string instead of regex (default: false).'),
        context: num('Number of lines to show before and after each match (default: 0).'),
        limit: num('Maximum number of matches to return (default: 100).'),
      },
      required: ['pattern'],
      additionalProperties: false,
    },
  },
  {
    name: 'brain_write',
    description: writeDescription,
    parameters: {
      type: 'object',
      properties: {
        path: str(
          'Memory body file to create as an @-scheme path (@/... project layer, @/sessions/<sid>/... session layer, @global/... global layer).',
        ),
        content: str('Full markdown content: frontmatter (type/summary/importance — no id) plus body.'),
        confirmed: bool(confirmedDesc),
      },
      required: ['path', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'brain_edit',
    description: editDescription,
    parameters: {
      type: 'object',
      properties: {
        path: str(
          'Memory body file to edit as an @-scheme path; or a core document (@core/global.md | @core/project.md | @core/sessions/<sid>.md) to replace that layer\'s core document with the content argument.',
        ),
        edits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              oldText: str('Exact text for one targeted replacement; must be unique in the file.'),
              newText: str('Replacement text for this targeted edit.'),
            },
            required: ['oldText', 'newText'],
            additionalProperties: false,
          },
          description: 'One or more targeted replacements; must not overlap or nest. Required when path is a file.',
        },
        content: str(
          'Full markdown document. Required when path is a core document: replaces that layer\'s core array with this document.',
        ),
        feedback: {
          type: 'string',
          enum: ['adopt', 'correct', 'attribute'],
          description:
            'Optional. Declares the semantic feedback path of an importance change: adopt (raising within [0,+0.2]), correct (mild correction within [-0.3,-0.05], marks the item questioned), attribute (failure attribution within [-0.15,0], does not question the content). When omitted the mechanism infers: raise = adopt, lower = correct.',
        },
        confirmed: bool(confirmedDesc),
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'brain_rm',
    description: rmDescription,
    parameters: {
      type: 'object',
      properties: {
        path: str('Memory body file to remove as an @-scheme path (core documents are not removable).'),
        reason: str("Why this memory is removed; for strong corrections quote the user's words."),
        confirmed: bool(confirmedDesc),
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'brain_mv',
    description: mvDescription,
    parameters: {
      type: 'object',
      properties: {
        src: str(
          'Source: a memory file path (@-scheme), or a core document (@core/global.md | @core/project.md | @core/sessions/<sid>.md) to write that layer\'s core document out as a file.',
        ),
        dst: str(
          'Destination: a memory file path (@-scheme), or a core document (@core/global.md | @core/project.md | @core/sessions/<sid>.md) to make a file the layer\'s core document (replacing it).',
        ),
        confirmed: bool(confirmedDesc),
      },
      required: ['src', 'dst'],
      additionalProperties: false,
    },
  },
]

export function brainToolNames(): string[] {
  return BRAIN_TOOLS.map((tool) => tool.name)
}
