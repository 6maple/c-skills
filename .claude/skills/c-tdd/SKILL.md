---
name: c-tdd
description: Test-driven development with a red-green-refactor loop. Use for stable, testable, high-risk behavior, core logic, API contracts, regressions, or when the user asks for TDD/test-first development.
disable-model-invocation: true
---

# c-tdd

Tests verify behavior through public interfaces, not implementation details.

Good tests exercise real code paths and read like specifications. Bad tests mock internals, test private methods, or break when behavior is unchanged.

See [tests.md](tests.md) and [mocking.md](mocking.md) if this repo provides them.

## Anti-pattern: horizontal RED/GREEN

Do not write all tests first, then all implementation.

```text
WRONG:
RED: test1, test2, test3
GREEN: impl1, impl2, impl3

RIGHT:
RED -> GREEN: behavior 1
RED -> GREEN: behavior 2
RED -> GREEN: behavior 3
```

## Evidence precedence

Use configured docs as intent and vocabulary. Current source code, tests, typecheck/build output, and git diff are stronger evidence than stale `{config.docs.root_dir}` text.

## Workflow

### 1. Planning

- Read the project glossary and relevant ADRs.
- Confirm public interface changes.
- Confirm behavior priority.
- Identify opportunities for deep modules.
- Design interfaces for testability.
- List behaviors, not implementation steps.

Ask when unclear: `What should the public interface look like? Which behaviors matter most?`

### 2. Tracer bullet

Write one test for one observable behavior. Run it. Ensure it fails for the expected reason. Implement only enough code to pass.

### 3. Incremental loop

For each remaining behavior:

```text
RED: one failing behavior test
GREEN: minimal code to pass
```

Do not anticipate future tests.

### 4. Refactor

Refactor only while GREEN. Deepen modules where useful. Run tests after each refactor step.

## Checklist per cycle

- [ ] Test describes behavior, not implementation.
- [ ] Test uses a public seam.
- [ ] Test would survive internal refactor.
- [ ] Code is minimal for this test.
- [ ] No speculative feature was added.

## Issue status writeback

If invoked with an issue file path, update that file before final output.

- On success: set frontmatter `status: done`, update `updated: YYYY-MM-DD`, and refresh the `## Result` section with changed files, verification evidence, and short notes.
- On stop/block: set `status: blocked`, update `updated: YYYY-MM-DD`, and refresh the `## Blocked` section with reason, tried steps, and exact next action.
- Do not leave a completed or stopped issue as `todo`.
- Do not write long logs into the issue. Keep details in final response or verification output.

## Output

```text
c-tdd(done|partial|blocked)

red:
- ...
green:
- ...
refactor:
- none
ev:
- ...
issue:
- none|updated <issue-path> to done|blocked
risk:
- none
next:
- none|/c-review <issue-path>
```
