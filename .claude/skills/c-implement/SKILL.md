---
name: c-implement
description: Manual-only skill for implementing one small vertical slice.
disable-model-invocation: true
---

# c-implement

Implement one small vertical slice.

Complex/high-risk -> block with `next: /c-plan`. Blockers -> `next: /c-clarify`. Continuation/unknown first touch -> `next: /c-takeover`.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

This skill is terminal for this turn. Never read/execute another `c-*` skill. If needed, put it only under `next:` and stop; `next:` is inert text.

## Algo

slice -> inspect files/tests/context -> resolve work item only if needed -> clarify gate -> test -> code -> targeted checks -> update resolved item -> out.

For non-trivial changes:

```text
c-implement(slice:<name>)
Plan: <step 1> -> <step 2> -> <checks>
```

Skip plan for trivial changes.

## Gates

Ask max 3 only when missing info affects UX, public API, DB/migration, auth, billing, deletion, security, required validation. Otherwise proceed with stated assumptions.

Unknown project + commands needed + no probe -> stop:

```text
c-implement(needs-takeover)
Next: /c-takeover project
```

Use `project_probe.py` command suggestions only when present; otherwise inspect config and state uncertainty. No command guessing.

Explicit continue/takeover/handed-off work -> stop unless takeover already completed:

```text
c-implement(needs-takeover)
Next: /c-takeover <work-item>
```

## Work item I/O

```bash
python .claude/skills/c-shared/work_items.py resolve --active-only [<id-or-path>]
```

Use stdout path only. Fail=no scan. None=skip update unless handoff is needed. Many=explicit id or `next: /c-takeover`.

No trivial work item. If resolved, update progress/files/evidence/risks/next. If incomplete and should continue later, recommend `c-handoff`; do not auto-run it.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.

## Out

c-implement(done|partial|blocked)

chg:
- ...
ev:
- ...
doc: none|path
risk:
- ...
next:
- ...

## Never

- no scope creep
- no unrelated refactor
- no silent defaults for required values
- no unjustified dependencies
- no fake checks
