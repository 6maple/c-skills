---
name: c-plan
description: Manual-only skill for planning complex, high-risk, or cross-cutting work.
disable-model-invocation: true
---

# c-plan

Plan only. No source edits. No client todo/task tool. Even if asked to implement, output plan and stop.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

This skill is terminal for this turn. Never read/execute another `c-*` skill. If needed, put it only under `next:` and stop; `next:` is inert text.

## Algo

goal -> inspect -> context -> smallest slice -> affected areas -> checks -> risks/blockers -> slices -> persist? -> stop

Ask max 3 blockers.

## Persist

Create work item only for multi-slice/multi-session/high-risk/requested work:

```bash
python .claude/skills/c-shared/work_items.py create --title "<task>"
```

Put plan in `Temporary Plan`. No separate plan files. Do not edit `{config.docs.work_items_index}`.

Hard decisions -> `{config.docs.adr_dir}`. Stable terms/facts -> `{config.docs.context_file}`.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.

## Out

c-plan(not-needed|slices:<n>|blocking:<n>[,persist])

plan: none|{config.docs.work_items_active_dir}/<task>.md
first:
- ...
decision: none|needs user
q:
- ...
next:
- /c-implement ...

## Never

- no broad rewrite unless unavoidable
- no abstraction before repo inspection
- no long chat plan when persisted
