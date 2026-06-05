---
name: c-takeover
description: Manual-only skill for verifying project/work state before continuing or first-touch coding.
disable-model-invocation: true
---

# c-takeover

Manual 接手校验. Trust nothing until verified. No source edits.

Use for continue/take over/resume, explicit work item, or existing unknown/no-docs/first-touch project.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

This skill is terminal for this turn. Never read/execute another `c-*` skill. If needed, put it only under `next:` and stop; `next:` is inert text.

## Algo

probe -> work_items.py list/resolve -> read resolved item only -> git status/diff -> touched files -> evidence -> blockers/stale assumptions -> next.

First commands:

```bash
python .claude/skills/c-takeover/project_probe.py
python .claude/skills/c-shared/work_items.py list
python .claude/skills/c-shared/work_items.py resolve --active-only
# explicit item only:
python .claude/skills/c-shared/work_items.py resolve <id-or-path>
```

Use `project_probe.py` stdout only; do not read/write runtime data under `{config.runtime.data_dir}`. Use `work_items.py` stdout only; read only the resolved path.

`resolve --active-only` is default. No active item is valid for first-touch/project takeover. Multiple active items -> require user/reference selection; do not scan. Explicit item may include archived item via `resolve <id-or-path>`.

If probe says `unknown` on new/empty project, stop with `next: /c-clarify stack-required`; do not guess stack/tooling.

Do not continue coding unless user explicitly asks after takeover or command includes continuation intent.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.

## Out

c-takeover(verified|dirty|blocked|stale|project)

probe:
- ...
cmd:
- ...
state:
- ...
ev:
- ...
risk:
- ...
next:
- /c-implement ...

## Never

- no source edits
- no trust in prior summary without repo evidence
- no manual cache/index reads/writes
- no recursive work item scans
- no expensive checks unless needed
- no auto-merge of unrelated work
