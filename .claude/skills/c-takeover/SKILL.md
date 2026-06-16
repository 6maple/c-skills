---
name: c-takeover
description: ban
description-info: Establish a trusted project starting point before coding. Use for first-touch repos, resumed work, stale handoff snapshots, unknown project state, or when another c-* skill lacks project context.
disable-model-invocation: true
---

<important>
Strictly follow this path mapping:
```json
{
  "path_mappings": {
    "CONTEXT.md": ".docs/CONTEXT.md",
    "CONTEXT-MAP.md": ".docs/CONTEXT-MAP.md",
    "docs/adr/": ".docs/adr",
    "docs/.scratch/": ".docs/.scratch",
    "per_context_CONTEXT.md": "<context>/.docs/CONTEXT.md",
    "per_context_docs/adr/": "<context>/.docs/adr",
    "ARCH-FROM-AI.md": ".docs/ARCH-FROM-AI.md"
  },
  "outputs": {
    "prd": ".docs/prd",
    "issue": ".docs/issues",
    "handoff": ".docs/HANDOFF.md",
    "temporary": ".docs/.tmp",
    "architecture_report": ".docs/.tmp/architecture-review-<timestamp>.html",
    "design_implement_guide": ".docs/design-implement-guide"
  },
  "configs": {
    "issue_tracker": ".docs/agents/issue-tracker.md"
  }
}
```
</important>

# c-takeover

Trust fresh repo evidence over prior summaries.

## Process

1. Inspect the repo directly: root files, manifests, source layout, test layout, tool config, and git status.
2. Read `.docs/HANDOFF.md` only as a continuation hint; verify it against repo evidence.
3. Surface any `Doc Hygiene.cleanup_next` or stale-doc notes from handoff before continuing.
4. Read `.docs/CONTEXT.md`, ADR, PRD, issue, and source files only when directly relevant.
5. If several active issues exist, ask the user to choose by issue filename/path.
6. If docs conflict with repo evidence, say so explicitly.
7. Do not implement during takeover.
8. Do not delete docs during takeover.
9. Recommend exactly one next skill.
