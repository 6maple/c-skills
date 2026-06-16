---
name: c-fix-ui
description: no
description-only: Fixes frontend UI issues explicitly listed in UI QA review text. Use when applying QA feedback to page, component, style, or shared UI code; propose a plan before broad refactors.
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

# c-fix-ui

## Purpose

Apply user-provided UI QA review text to frontend code.

Only fix UI issues explicitly identified by the QA text.

This Skill fixes code. It does not perform new UI QA.

## Input

Required:

- UI QA review text

Optional context may include page name, route, file path, component name, tech stack notes, or user constraints.

If the QA text is missing, ask for it.

## Rules

Use the QA text as the only fix source.

Do not:

- Require additional visual materials as input
- Fix issues not stated in the QA text
- Make unrelated polish changes
- Change product behavior unrelated to the stated QA items
- Leave temporary styles, debug code, unused wrappers, or dead code behind

## Scope judgment

Before editing, inspect the relevant code enough to decide whether each QA item is caused by:

- Page-level implementation
- Component implementation
- Shared component design
- Style or token usage
- Layout foundation
- Broader project structure

Prefer a direct clean fix when the issue is local.

Do not force a tiny patch if it creates messy, duplicated, fragile, or misleading code.

Broader refactoring is allowed when it is necessary to fix the stated QA items cleanly.

If the clean fix may affect shared components, multiple pages, design tokens, layout foundations, component boundaries, or broader project structure, do not modify immediately. First provide a short proposal for user confirmation.

The proposal should include:

- QA items that require broader change
- Why a local patch is not clean or reliable
- Affected files or areas
- Recommended approach
- Main risks
- Verification plan

After confirmation, apply only the approved scope.

## Missing information

If page name, route, or file path is missing, locate the target from the project code when reliable.

If the target code cannot be located reliably, ask for the missing page, route, file, or component information instead of guessing.

## Repair guidance

Every meaningful code change should map to a QA item.

Follow existing project patterns, styling systems, tokens, and conventions.

Add dependencies only when the stated QA item cannot be fixed cleanly with the existing stack.

Run verification through existing project-declared commands when appropriate.

## Output

Use any clear, concise format. This structure is only a reference:

## Summary

[Brief repair summary]

## Fixed QA Items

- [QA item]: [fix]

## Skipped / Unclear Items

- [item]: [reason]

## Needs Confirmation

- [QA item]: [proposal summary]

## Verification

- [command]: [result]

Prioritize traceability, clean code, and controlled scope.
