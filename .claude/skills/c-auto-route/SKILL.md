---
name: c-auto-route
description: Manual route-only selector for the next c-* command.
disable-model-invocation: true
---

# c-auto-route

Select one next command. Do not execute it.

## Map

new/empty project, stack unknown          -> /c-clarify
unknown/no-docs/first-touch project       -> /c-takeover
continue/takeover/resume                  -> /c-takeover
architecture/design doc referenced        -> /c-plan
new module/layer/public API                -> /c-plan
cross-cutting or multi-file feature        -> /c-plan
complex or high-risk feature              -> /c-plan
small local clear edit                     -> /c-implement
ambiguous/blocking feature                -> /c-clarify
bug/error/failing test/regression          -> /c-fix
refactor                                  -> /c-refactor
review/diff-check                         -> /c-review
handoff/save-state                         -> /c-handoff
goal/multi-step auto mode                 -> /c-auto
impossible route                           -> /c-clarify

## Response contract

Emit one slash command only. No prose, no fence, no appendix. Stop.
Use the original task, tightened only when needed.

## Out

/c-skill <task>

## Never

- no file reads
- no skill reads
- no code edits
- no docs/work item I/O
- no stack probe
- no second command
- no explanation
