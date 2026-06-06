---
name: c-tdd
description: Test-driven development with a red-green-refactor loop. Use for stable, testable, high-risk behavior, core logic, API contracts, regressions, or when the user asks for TDD/test-first development.
---

# c-tdd

Tests verify behavior through public interfaces, not implementation details.

Good tests exercise real code paths and describe what the system does. Bad tests mock internals, test private methods, or break when behavior is unchanged.

## Anti-pattern: horizontal RED/GREEN

Do not write all tests first, then all implementation. Use vertical tracer bullets:

```text
RED -> GREEN: behavior 1
RED -> GREEN: behavior 2
RED -> GREEN: behavior 3
```

## Workflow

1. Planning
   - Read project glossary and ADRs in the touched area.
   - Confirm the public interface and behavior priority.
   - List behaviors, not implementation steps.

2. Tracer bullet
   - Write one failing test for one observable behavior.
   - Run it and see it fail for the expected reason.
   - Write minimal code to pass.

3. Incremental loop
   - Add one behavior at a time.
   - Only implement enough code for the current test.
   - Do not anticipate future tests.

4. Refactor
   - Refactor only while GREEN.
   - Deepen modules where useful.
   - Run tests after each refactor step.

## Checklist per cycle

- [ ] Test describes behavior, not implementation.
- [ ] Test uses a public seam.
- [ ] Code is minimal for this test.
- [ ] No speculative feature was added.

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
risk:
- none
next:
- none
```
