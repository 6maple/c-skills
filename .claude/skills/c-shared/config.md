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
    "architecture_report": ".docs/.tmp/architecture-review-<timestamp>.html",
    "design_implement_guide": ".docs/design-implement-guide"
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
