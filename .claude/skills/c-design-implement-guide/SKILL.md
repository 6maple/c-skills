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

# c-design-implement-guide

Create one concise implementation design guide before code changes. Do not implement code or tests.

Use the target issue as the source of truth for the requested change. Use `ARCH-FROM-AI.md` as the macro architecture map. The guide must be a design delta over the issue, not an issue summary.

## Inputs

Required:

- target issue or vertical task slice
- `ARCH-FROM-AI.md` or its project-specific path

Optional, only when needed:

- ADR / PRD / spec
- existing design guide / handoff
- affected module code
- adjacent tests / test conventions

If the issue, ARCH, or scan scope is missing or unclear, stop and ask. Give the recommended scope first. Do not silently assume.

## Role of ARCH-FROM-AI.md

`ARCH-FROM-AI.md` defines macro context only:

- system boundary
- layers and dependency direction
- directory ownership
- core flows
- module/API/external boundaries
- testing seams
- extension points
- known drift

Use it to locate the smallest relevant implementation area. Do not rebuild the system map inside the guide. Do not update ARCH from this skill.

## Reading Strategy

Read in this order:

```text
issue
  -> ARCH-FROM-AI.md
  -> ARCH-indicated module/boundary
  -> local code needed to verify facts
  -> adjacent tests
  -> ADR/PRD/spec only if they affect scope/API/data flow/risk
```

Rules:

- Do not scan the whole repo by default.
- Do not recursively read a whole module unless the user scope requires it.
- Prefer symbol/path search over broad file reading.
- Prefer code facts over assumptions.
- If code contradicts ARCH, record it as drift/risk; do not legalize it as intended architecture.
- If ARCH is too stale to guide the design, stop and recommend running `c-maintain-arch`.

## Design Rules

- Design the smallest clean change that preserves architecture, dependency direction, naming, and ownership.
- Do not duplicate issue background, requirements, acceptance criteria, or task lists. Reference the issue instead.
- Do not add abstractions, layers, frameworks, or broaden scope unless required by the issue and existing architecture.
- Keep implementation scope inside the ARCH-defined boundary unless the issue explicitly requires crossing it.
- For uncertainty affecting behavior, architecture, APIs, data flow, dependencies, or tests: give the recommended answer first, then ask for confirmation.
- Do not leave important uncertainty as silent TBD.
- Prefer real behavior over shape-only implementation.

## Tests

Recommend tests only for:

- distinct behavior
- real bug risk
- meaningful integration boundary
- architecture boundary worth protecting

Avoid:

- test explosion
- framework-only tests
- constructor/default checks
- call-order tests unless order is behavior
- real external IO in normal tests
- tests that only prove mocks were called

Prefer:

- fakes for core behavior
- mocks/stubs only at external boundaries or hard-to-run dependencies
- highest useful seam over low-level internals

## Output

Create one Markdown guide in `.docs/design-implement-guide/`.

Keep structure flexible, but include:

```md
# <short guide title>

Issue: <relative issue path or best available identifier>
ARCH: <ARCH-FROM-AI.md path used>

## Scope Boundary

What this change may touch / must not touch.

## Architecture Fit

How the change fits ARCH layers, ownership, boundaries, and flow.

## Implementation Design

Touchpoints, recommended changes, dependency/data flow, and constraints.

## Test Strategy

Meaningful behavior/risk/boundary coverage not already specified by the issue.

## Risks / Open Decisions

Recommended answer first. Ask only where confirmation is required.

## Validation / Follow-up

Commands or checks to run. Source issue status/update only if project convention expects it.
```

Write dense, implementation-ready Markdown. Prefer bullets, tables, arrows, or small diagrams over prose.

## Self-check

Before finishing, verify:

```text
- issue referenced, not restated
- ARCH consumed, not duplicated
- scope follows ARCH boundaries
- only relevant code was inspected
- code facts support the design
- no silent assumptions
- no unnecessary abstraction
- tests target behavior/risk/seams
- output is concise enough for an AI coding agent to implement
```
