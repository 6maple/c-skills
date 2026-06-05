---
name: c-handoff
description: Manual-only skill for saving compact continuation state.
disable-model-invocation: true
---

# c-handoff

Manual save-state for interruption, agent switch, or later continuation.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

This skill is terminal for this turn. Never read/execute another `c-*` skill. If needed, put it only under `next:` and stop; `next:` is inert text.

## Algo

diff -> relevant files -> `work_items.py list/resolve` -> patch resolved item or create if none -> set status/archive -> out.

```bash
python .claude/skills/c-shared/work_items.py list
python .claude/skills/c-shared/work_items.py resolve --active-only [<id-or-path>]
python .claude/skills/c-shared/work_items.py create --title "<task>"
python .claude/skills/c-shared/work_items.py set-status <id-or-path> <status>
python .claude/skills/c-shared/work_items.py archive <id-or-path>
```

Use resolved path only. Create only when work is incomplete/complex and no active item exists. Multiple active items -> require explicit id/path; do not create another.

Do not edit `{config.docs.work_items_index}`. Inspect only resolved/created item. Final status must be archived via `work_items.py archive`.

## Record

owner, branch, base commit, status, goal, progress, files, evidence, blockers, assumptions, risks, next.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.

## Out

c-handoff(saved|blocked)

doc: {config.docs.work_items_active_dir}/<task>.md
state: active|handed-off|blocked|done
next:
- ...
risk:
- ...

## Never

- no source edits
- no separate checkpoint docs
- no manual index edits
- no recursive work item scans
- no long history
- no secrets
- no invented completed work/checks
