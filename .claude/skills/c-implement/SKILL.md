---
name: c-implement
description: Implement one bounded non-TDD slice. Use for UI, frontend, volatile requirements, exploratory integration, small local edits, or changes where test-first would create brittle low-value tests.
disable-model-invocation: true
---

# c-implement

Bounded implementation without mandatory RED phase.

## Evidence precedence

Use configured docs as intent and vocabulary. Current source code, tests, typecheck/build output, and git diff are stronger evidence than stale `{config.docs.root_dir}` text.

## Process

1. Read `.claude/skills/c-shared/config.md`.
2. Run `project_probe.py` before using commands.
3. Understand the slice and identify the smallest modification surface.
4. Patch only files needed for the slice.
5. Verify with the best available feedback loop: typecheck, lint, build, smoke run, emulator/device run, Storybook, screenshot/manual checklist.
6. Report changed files, evidence, residual risk, and next action.

## Rules

- Prefer existing patterns over new abstractions.
- Do not mix bug fix, refactor, and feature unless the task explicitly requires it.
- If the change is stable, testable, and high risk, route to `c-tdd`.
- If the work is throwaway exploration or UI/state options, route to `c-prototype`.
- If a design decision blocks implementation, route to `c-grill`.

## Issue status writeback

If invoked with an issue file path, update that file before final output.

- On success: set frontmatter `status: done`, update `updated: YYYY-MM-DD`, and refresh the `## Result` section with changed files, verification evidence, and short notes.
- On stop/block: set `status: blocked`, update `updated: YYYY-MM-DD`, and refresh the `## Blocked` section with reason, tried steps, and exact next action.
- Do not leave a completed or stopped issue as `todo`.
- Do not write long logs into the issue. Keep details in final response or verification output.

## Output

```text
c-implement(done|partial|blocked)

chg:
- ...
ev:
- ...
issue:
- none|updated <issue-path> to done|blocked
doc:
- none
risk:
- none
next:
- none|/c-review <issue-path>
```
