---
name: c-fix
description: Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce -> minimise -> hypothesise -> instrument -> fix -> regression-test. Use when user says diagnose/debug, reports a bug, says something is broken/throwing/failing, or describes a performance regression.
disable-model-invocation: true
---

# Diagnose

A discipline for hard bugs. Skip phases only when explicitly justified.

Read `.claude/skills/c-shared/config.md` first, then use the configured domain glossary and ADR paths where relevant.

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical.

If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause. Spend disproportionate effort here.

Ways to construct one — try them in roughly this order:

1. Failing test at whatever seam reaches the bug.
2. Curl / HTTP script against a running dev server.
3. CLI invocation with a fixture input, diffing stdout against a known-good snapshot.
4. Headless browser script that drives the UI and asserts on DOM/console/network.
5. Replay a captured trace.
6. Throwaway harness around the smallest relevant subsystem.
7. Property / fuzz loop.
8. Bisection harness.
9. Differential loop.
10. HITL bash script as last resort.

Treat the loop as a product. Make it faster, sharper, and more deterministic.

For non-deterministic bugs, the goal is a higher reproduction rate. Loop the trigger 100x, parallelise, add stress, narrow timing windows, inject sleeps.

When you genuinely cannot build a loop, stop and say so explicitly. List what you tried. Ask the user for environment access, a captured artifact, or permission to add temporary instrumentation. Do not proceed to hypothesise without a loop.

## Phase 2 — Reproduce

Run the loop. Watch the bug appear.

Confirm:

- [ ] The loop produces the failure mode the user described.
- [ ] The failure is reproducible across multiple runs, or high enough rate for non-deterministic bugs.
- [ ] You captured the exact symptom so later phases can verify the fix.

## Phase 3 — Hypothesise

Generate 3–5 ranked hypotheses before testing any of them. Each hypothesis must be falsifiable:

```text
If <cause> is true, then <probe/change> will make <prediction> happen.
```

Show the ranked list to the user before testing. Don't block on it — proceed with your ranking if the user is AFK.

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. Change one variable at a time.

Tool preference:

1. Debugger / REPL inspection.
2. Targeted logs at boundaries that distinguish hypotheses.
3. Never "log everything and grep".

Tag every debug log with a unique prefix, e.g. `[DEBUG-a4f2]`.

For performance regressions: establish a baseline measurement, then bisect. Measure first, fix second.

## Phase 5 — Fix + regression test

Write the regression test before the fix only if there is a correct seam for it. A correct seam exercises the real bug pattern as it occurs at the call site.

If no correct seam exists, that itself is the finding. Note it.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the original feedback loop.

## Phase 6 — Cleanup + post-mortem

Required before declaring done:

- [ ] Original repro no longer reproduces.
- [ ] Regression test passes, or absence of seam is documented.
- [ ] All `[DEBUG-...]` instrumentation removed.
- [ ] Throwaway prototypes deleted or clearly marked.
- [ ] The hypothesis that turned out correct is stated in the commit / PR message.

Then ask: what would have prevented this bug? Make the recommendation after the fix is in, not before.
