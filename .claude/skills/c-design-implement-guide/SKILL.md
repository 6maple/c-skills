---
name: c-design-implement-guide
description: ban
description-only: Produces a concise implementation design guide from an issue and relevant project context. Use before or during implementation when the agent needs to preserve architecture boundaries, avoid code degradation, or align the implementation approach before writing code.
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

# c-design-implement-guide

Create one concise implementation design guide before code changes. Do not implement code or tests.

Use the target issue as the source of truth. The guide must be a design delta over the issue, not an issue summary: reference the issue and add only implementation-relevant decisions, boundaries, touchpoints, risks, and test guidance.

Read PRD/spec/ADR/code/tests only when they affect scope, boundaries, APIs, data flow, dependencies, tests, or risk. Prefer issue links, mentioned paths, module names, APIs, and nearby tests over broad scanning.

## Inputs

- Required: target issue or vertical task slice.
- Optional, only when needed: related PRD/spec, ADR, handoff, existing code/tests/conventions.

## Rules

- Design the smallest clean change that preserves architecture, dependency direction, naming, and ownership.
- Do not duplicate issue background, requirements, acceptance criteria, or task lists. Reference the issue instead.
- Do not add abstractions, layers, frameworks, or broaden scope unless justified by the issue and existing code.
- For uncertainty affecting behavior, architecture, APIs, data flow, or tests: give the recommended answer first; ask only when confirmation is needed.
- Do not leave important uncertainty as silent TBD.
- Prefer real behavior over shape-only implementation.

## Tests

Recommend tests only for distinct behavior, real bug risk, or meaningful integration boundaries.

Avoid test explosion, framework-only tests, constructor/default checks, call-order tests unless order is behavior, and real external IO in normal tests.

Prefer fakes for core behavior; use mocks/stubs only at external boundaries or hard-to-run dependencies.

## Output

Create one Markdown guide in `.docs/design-implement-guide/`. Keep structure flexible. Include:

- `Issue`: relative issue path or best available identifier.
- Implementation design: implementation-specific scope boundary, touchpoints, recommended changes, and data/dependency flow when useful.
- Test strategy: meaningful behavior/risk coverage not already specified by the issue.
- Risks/open decisions with recommended answers.
- After implementation: update the source issue status; record validation/follow-up only where project convention expects it.

Do not restate issue content. Write dense, implementation-ready Markdown. Prefer bullets, tables, arrows, or small diagrams over long prose.
