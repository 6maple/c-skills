---
name: c-refactor
description: Refactor existing code without changing observable behavior. Use when the user explicitly asks to refactor, rename, move, simplify, clean up, or mechanically improve existing code structure.
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
    "per_context_CONTEXT.md": "<context>/.docs/CONTEXT.md",
    "per_context_docs/adr/": "<context>/.docs/adr"
  },
  "outputs": {
    "prd": ".docs/prd",
    "issue": ".docs/issues",
    "handoff": ".docs/HANDOFF.md",
    "temporary": ".docs/.tmp",
    "architecture_report": ".docs/.tmp/architecture-review-<timestamp>.html"
  },
  "configs": {
    "issue_tracker": ".docs/agents/issue-tracker.md"
  },
  "search_dirs": {
    "spec": [
      ".docs/prd",
      ".docs/issues",
      ".docs/specs",
      ".docs/.scratch"
    ]
  }
}
```
</important>

# c-refactor

Change structure, not behavior.

Use the configured domain glossary and ADR paths where relevant.

## Process

1. State the behavior that must stay unchanged.
2. Make the smallest coherent structural change.
3. Preserve public interfaces unless the user explicitly requested an API change.
4. Run the relevant existing feedback loop after each meaningful step.
5. If the work needs new behavior, use `c-tdd`. If it needs a boundary or design decision, use `c-arch`. If it reveals a bug, use `c-fix`.
