---
name: c-plan
description: Manual-only skill for planning complex, high-risk, or cross-cutting work.
disable-model-invocation: true
---

# c-plan

Plan only. No source edits. No questions. No client todo/task tool. Even if asked to implement, output plan and stop.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

Terminal turn. Do not read/execute another `c-*` skill. Put next command only under `next:`.

## Boundary with c-clarify

`c-plan` owns slice planning. `c-clarify` owns blocking questions. If a blocker prevents a useful plan, stop with `c-plan(blocked)` and route to `/c-clarify`.

## Algo

goal -> inspect -> context -> blockers? -> smallest slice -> affected areas -> checks -> risks -> slices -> persist? -> stop

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

List rules:

- `slices:` uses numbered items when present, otherwise `- none`
- blockers, docs, risks, evidence, and `next:` use bullets
- `slices:<n>` must equal numbered `slices:` items
- valid forms: use either `- none` or numbered items such as `1. ...`

## Out

c-plan(not-needed|slices:<n>|blocked[,persist])

plan:
- none
first:
- none
blocker:
- none
slices:
- none
doc:
- none
risk:
- none
next:
- <one default action>

## Guards

- keep slices minimal; avoid broad rewrites unless unavoidable
- inspect repo before abstraction
