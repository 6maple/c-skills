---
name: c-auto
description: Python-gated ReAct goal runner for one coding goal.
disable-model-invocation: true
---

# c-auto

Run one goal through `c_auto.py`. The script controls phase, context budget, edit gate, and state.

Do not dispatch, read, or execute any other `c-*` skill.

## Start / step

New goal:

python .claude/skills/c-auto/c_auto.py start --goal "<user task>"

Continue active goal:

python .claude/skills/c-auto/c_auto.py step --note "<new user input or short result>"

After a bounded action:

python .claude/skills/c-auto/c_auto.py checkpoint --status done|partial|blocked --summary "<short factual summary>"

Reset only when user asks:

python .claude/skills/c-auto/c_auto.py reset

## Execution rule

Run `start` or `step`, then follow stdout exactly.

- obey `allow`
- never exceed `forbid`
- obey `budget`
- one turn = one bounded action
- if needed action is forbidden, stop as blocked
- no client todo/task tool

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Work item I/O

Only when stdout allows checkpoint/state work:

python .claude/skills/c-shared/work_items.py list
python .claude/skills/c-shared/work_items.py resolve --active-only [<id-or-path>]
python .claude/skills/c-shared/work_items.py create --title "<task>"
python .claude/skills/c-shared/work_items.py set-status <id-or-path> <status>
python .claude/skills/c-shared/work_items.py archive <id-or-path>

Use stdout paths only. Do not scan work-items or edit `{config.docs.work_items_index}`.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.

## Out

c-auto(<phase>:done|partial|blocked|ask|checkpoint)

obs:

- ...
  act:
- ...
  changed:
- none|...
  checks:
- none|not run: reason|...
  doc: none|path
  q:
- none|...
  risk:
- none|...
  next:
- stop|answer q|continue: <next bounded step>

## Never

- no other `c-*` skill reads/execution
- no skill search/glob
- no manual runtime data reads/writes
- no recursive work item scans
- no manual cache/index reads/writes
- no broad repo/doc scans
- no client todo/task tool
- no scope creep
- no fake checks
- no auto-merge of unrelated work
