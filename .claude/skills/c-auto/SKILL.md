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

## Script stdout

`c_auto.py` emits `c-auto-gate(<phase>:<status>)`. This is a gate, not the final user response.

After `start` or `step`:

- obey `allow`
- stay within `forbid`
- obey `budget`
- one turn = one bounded action
- if needed action is forbidden, stop as blocked
- no client todo/task tool

After a bounded action, run `checkpoint` when useful, then emit the final `c-auto(...)` response contract below.

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

List rules:

- `q:` uses numbered questions when status is `ask`, otherwise `- none`
- observations, actions, docs, risks, evidence, and `next:` use bullets
- valid forms: use either `- none` or numbered items such as `1. ...`

## Out

c-auto(<phase>:done|partial|blocked|ask|checkpoint)

obs:
- ...
act:
- ...
changed:
- none
checks:
- none
doc:
- none
q:
- none
risk:
- none
next:
- <one default action>

## Guards

- stay within gate `allow`/`forbid`/`budget`
- no manual runtime/cache/index I/O
- no scope creep, fake checks, or unrelated merges
