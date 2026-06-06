---
name: c-implement
description: Implement one bounded non-TDD slice. Use for UI, frontend, volatile requirements, exploratory integration, small local edits, or changes where test-first would create brittle low-value tests.
---

# c-implement

Bounded implementation without mandatory RED phase.

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
- If a design decision blocks implementation, route to `c-grill`.

## Output

```text
c-implement(done|partial|blocked)

chg:
- ...
ev:
- ...
doc:
- none
risk:
- none
next:
- none
```
