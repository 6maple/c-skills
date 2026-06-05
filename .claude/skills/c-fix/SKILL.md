---
name: c-fix
description: Manual-only skill for bug fixes with a feedback loop.
disable-model-invocation: true
---

# c-fix

Repro -> fix -> verify.

Use for bugs, regressions, failing tests, runtime errors, wrong behavior. Continuation/unknown first touch -> `next: /c-takeover`.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

Terminal turn. Do not read/execute another `c-*` skill. Put next command only under `next:`.

## Algo

repro -> minimize -> inspect -> cause -> regression test if practical -> smallest fix -> checks -> remove debug logs -> update resolved item -> out.

## Gates

Unknown project + commands needed + no probe -> stop with `next: /c-takeover`. Use `project_probe.py` command suggestions only when present; otherwise inspect config and state uncertainty.

Explicit continue/takeover/handed-off item -> stop with `next: /c-takeover` unless already done.

## Work item I/O

```bash
python .claude/skills/c-shared/work_items.py resolve --active-only [<id-or-path>]
```

Use stdout path only. Fail=no scan. None=skip update unless handoff is needed. Many=explicit id or `next: /c-takeover`.

No trivial work item. Update resolved item. Incomplete handoff -> recommend `c-handoff`.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.


## Out

c-fix(done|partial|blocked)

cause:
- ...
fix:
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

- fix only the reported/reproven bug
- no unrelated refactor or public behavior change beyond the bug
- no fake checks or leftover debug logs
