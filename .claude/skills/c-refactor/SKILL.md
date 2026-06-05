---
name: c-refactor
description: Manual-only skill for refactoring without behavior change.
disable-model-invocation: true
---

# c-refactor

Change structure, not behavior.

Continuation/unknown first touch -> `next: /c-takeover`.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

Terminal turn. Do not read/execute another `c-*` skill. Put next command only under `next:`.

## Algo

intent -> coverage/checks -> inspect patterns -> small mechanical steps -> checks -> update resolved item -> out.

If behavior change is required, stop with `next: /c-implement` or `next: /c-fix`.

## Gates

Unknown project + commands needed + no probe -> stop with `next: /c-takeover`. Use `project_probe.py` command suggestions only when present; otherwise state uncertainty.

Explicit continuation -> stop with `next: /c-takeover` unless already done.

## Work item I/O

```bash
python .claude/skills/c-shared/work_items.py resolve --active-only [<id-or-path>]
```

Use stdout path only. Fail=no scan. None=skip update unless handoff is needed. Many=explicit id or `next: /c-takeover`.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.


## Out

c-refactor(done|partial|blocked)

chg:
- ...
ev:
- ...
doc:
- none
risk:
- ...
next:
- ...

## Guards

- preserve behavior, public API, and dependencies unless explicit
- defer required bug fixes instead of mixing work
