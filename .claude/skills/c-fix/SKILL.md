---
name: c-fix
description: Disciplined bug diagnosis and fix loop. Use when the user reports a bug, failing test, runtime error, wrong behavior, crash, or performance regression.
disable-model-invocation: true
---

# c-fix

A bug is not understood until there is a feedback loop. Skip phases only when explicitly justified.

## Evidence precedence

Use configured docs as intent and vocabulary. Current source code, tests, typecheck/build output, and git diff are stronger evidence than stale `{config.docs.root_dir}` text.

## Phase 1 — Build a feedback loop

This is the skill. Spend disproportionate effort here.

Try, roughly in order:

1. Failing test at the seam that reaches the bug.
2. Curl / HTTP script against a dev server.
3. CLI invocation with fixture input and expected output.
4. Headless browser script that asserts DOM, console, or network.
5. Captured trace replay.
6. Throwaway harness around the smallest relevant subsystem.
7. Property/fuzz loop for intermittent wrong output.
8. Bisection or differential loop.
9. HITL checklist as last resort.

If the bug is non-deterministic, raise reproduction rate before debugging: loop 100x, parallelise, inject stress, narrow timing windows.

If no trustworthy loop can be built, stop. State what was tried and ask for artifact, environment access, logs, HAR, trace, core dump, screen recording, or permission to add temporary instrumentation.

## Phase 2 — Reproduce

Run the loop. Confirm it produces the failure the user described, not a nearby failure. Capture exact symptom.

## Phase 3 — Hypothesise

Write 3–5 ranked falsifiable hypotheses before testing. Format:

```text
If <cause> is true, then <probe/change> will make <prediction> happen.
```

Show the list to the user before testing when they are present. If AFK, proceed with your ranking.

## Phase 4 — Instrument

Test one hypothesis at a time. Change one variable at a time. Prefer debugger/REPL where available, then targeted logs.

Tag temporary logs with a unique prefix like `[DEBUG-a4f2]`. Never log everything and grep.

For performance regressions: measure first, fix second.

## Phase 5 — Fix + regression

Fix at the smallest correct seam. Add a regression test before the fix only when there is a correct seam that exercises the real bug pattern. If no correct seam exists, document that as an architecture finding and recommend `c-arch` after the fix.

## Phase 6 — Cleanup + post-mortem

Before declaring done:

- Original loop no longer reproduces.
- Regression test passes, or absence of correct seam is documented.
- All `[DEBUG-...]` instrumentation is removed.
- Throwaway harnesses/prototypes are deleted or clearly marked.
- Cause is stated for the next debugger.

## Issue status writeback

If invoked with an issue file path, update that file before final output.

- On success: set frontmatter `status: done`, update `updated: YYYY-MM-DD`, and refresh the `## Result` section with changed files, verification evidence, and short notes.
- On stop/block: set `status: blocked`, update `updated: YYYY-MM-DD`, and refresh the `## Blocked` section with reason, tried steps, and exact next action.
- Do not leave a completed or stopped issue as `todo`.
- Do not write long logs into the issue. Keep details in final response or verification output.

## Output

```text
c-fix(done|partial|blocked)

loop:
- ...
hypotheses:
1. ...
cause:
- ...
fix:
- ...
ev:
- ...
issue:
- none|updated <issue-path> to done|blocked
risk:
- none
next:
- none|/c-review <issue-path>
```
