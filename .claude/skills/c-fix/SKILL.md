---
name: c-fix
description: Disciplined bug diagnosis and fix loop. Use when the user reports a bug, failing test, runtime error, wrong behavior, crash, or performance regression.
disable-model-invocation: true
---

# c-fix

A bug is not understood until there is a feedback loop. Fix inside this skill unless the task becomes a product/design decision or architecture redesign.

## Process

1. Create the cheapest trustworthy pass/fail loop: failing test, CLI fixture, curl script, headless browser script, trace replay, throwaway harness, bisect, differential check, or HITL checklist.
2. Reproduce the reported failure. If you cannot reproduce it, narrow the missing artifact/access and stop.
3. Write 3-5 ranked falsifiable hypotheses.
4. Test one hypothesis at a time. Temporary instrumentation must be easy to remove and tagged with a unique `[DEBUG-...]` prefix.
5. Fix at the smallest correct seam. Do not mix unrelated refactor or feature work.
6. Add a regression test when the behavior has a stable seam. When the seam is UI/integration and a test would be brittle, use build/typecheck/lint/smoke/manual checklist evidence instead.
7. Re-run the original loop, relevant verification commands, and remove temporary instrumentation.
8. If the fix exposes shallow modules or missing seams, finish the bug fix and recommend `c-arch` as follow-up.

## Output

```text
c-fix(done|partial|blocked)

loop:
- ...
cause:
- ...
fix:
- ...
ev:
- ...
risk:
- none
next:
- none
```
