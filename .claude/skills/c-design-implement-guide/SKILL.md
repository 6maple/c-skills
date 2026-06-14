---
name: c-design-implement-guide
description: Produces a concise implementation design guide from an issue and relevant project context. Use before or during implementation when the agent needs to preserve architecture boundaries, avoid code degradation, or align the implementation approach before writing code.
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

Create an implementation design guide. Do not implement code or write tests.

## Inputs

Required:

- The target issue or vertical task slice.

Optional, read only when needed:

- Existing code and project conventions.
- PRD documents, especially for broad or ambiguous product design impact.
- Architecture docs, technical constraints, prior decisions, or related notes.

Prefer the issue as the primary source. Do not assume the PRD is required unless the issue is insufficient for design decisions.

## Core behavior

1. Understand the issue scope, expected behavior, and implementation boundary.
2. Inspect existing code when needed to align with current architecture, naming, dependencies, and test style.
3. Design the smallest clean change that solves the issue without over-engineering.
4. Preserve module boundaries, dependency direction, file size, and ownership of responsibilities.
5. Identify tests that prove real behavior without bloating the suite.
6. Write the guide to the design-implement-guide docs dir.

## Decision rules

- Do not leave TBD items silently. If a detail affects architecture, behavior, data flow, or tests, give your recommended option first, then ask the user to confirm or choose.
- Avoid over-design. Do not introduce abstractions, layers, frameworks, or new patterns unless the issue and existing code justify them.
- Prefer existing project conventions over generic best practices.
- Prefer explicit boundaries over broad rewrites.
- Prefer real behavior over shape-only implementation.

## Test design rules

Recommend tests only for distinct behavior, bug risk, or important integration boundaries.

Avoid:

- Test case explosion.
- Tests that only verify constructors, defaults, wiring, or framework behavior.
- Call-order tests unless order is the actual behavior.
- Real network, filesystem, database, timer, or IO resources in normal tests.
- Incorrect fakes that hide missing behavior.

Use fakes for core behavior and mocks/stubs only at external boundaries or hard-to-run dependencies.

## Output

Create one Markdown design guide in the design-implement-guide docs dir.

Keep the structure flexible. Include only sections that help the next implementer. A good guide usually covers:

- Scope and non-scope.
- Existing code touchpoints.
- Recommended design.
- File/module changes.
- Data flow or dependency direction when relevant.
- Test strategy.
- Risks, open decisions, and recommended answers.

The guide must be concise, concrete, and implementation-ready. Prefer dense wording; use bullets, tables, arrows, or symbols when they express the design more clearly than prose.
