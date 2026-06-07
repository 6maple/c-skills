---
name: c-tdd
description: Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions red-green-refactor, wants integration tests, or asks for test-first development.
disable-model-invocation: true
---

# Test-Driven Development

## Philosophy

**Core principle**: Tests should verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** are integration-style: they exercise real code paths through public APIs. They describe what the system does, not how it does it. A good test reads like a specification.

**Bad tests** are coupled to implementation. They mock internal collaborators, test private methods, or verify through external means instead of using the public interface. The warning sign: your test breaks when you refactor, but behavior hasn't changed.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines when the repo provides them.

## Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation.** This is horizontal slicing.

Correct approach: vertical slices via tracer bullets.

```text
WRONG:
RED: test1, test2, test3, test4, test5
GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT:
RED -> GREEN: test1 -> impl1
RED -> GREEN: test2 -> impl2
RED -> GREEN: test3 -> impl3
```

## Workflow

### 1. Planning

Read `.claude/skills/c-shared/config.md` first, then use the configured domain glossary and ADR paths.

Before writing any code:

- [ ] Confirm with user what interface changes are needed.
- [ ] Confirm with user which behaviors to test.
- [ ] Identify opportunities for deep modules.
- [ ] Design interfaces for testability.
- [ ] List the behaviors to test, not implementation steps.
- [ ] Get user approval on the plan.

Ask: "What should the public interface look like? Which behaviors are most important to test?"

You can't test everything. Confirm with the user exactly which behaviors matter most. Focus testing effort on critical paths and complex logic, not every possible edge case.

### 2. Tracer Bullet

Write ONE test that confirms ONE thing about the system:

```text
RED: Write test for first behavior -> test fails
GREEN: Write minimal code to pass -> test passes
```

### 3. Incremental Loop

For each remaining behavior:

```text
RED: Write next test -> fails
GREEN: Minimal code to pass -> passes
```

Rules:

- One test at a time.
- Only enough code to pass the current test.
- Don't anticipate future tests.
- Keep tests focused on observable behavior.

### 4. Refactor

After all tests pass, look for refactor candidates:

- [ ] Extract duplication.
- [ ] Deepen modules.
- [ ] Apply SOLID principles where natural.
- [ ] Consider what new code reveals about existing code.
- [ ] Run tests after each refactor step.

**Never refactor while RED.** Get to GREEN first.

## Checklist Per Cycle

```text
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```
