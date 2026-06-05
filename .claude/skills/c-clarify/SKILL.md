---
name: c-clarify
description: Manual-only skill for clearing blocking ambiguity before coding.
disable-model-invocation: true
---

# c-clarify

Clear blockers. No source edits.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

This skill is terminal for this turn. Never read/execute another `c-*` skill. If needed, put it only under `next:` and stop; `next:` is inert text.

## Algo

inspect code/tests/README/context -> facts/assumptions/unknowns -> ask blockers -> persist if needed -> next slice.

## New/empty project

If repo config cannot prove stack/tooling, ask before coding:

```text
stack/runtime
package/tool manager
app/test command policy
```

For Python, confirm: `uv | poetry | plain python+venv+pip | other`.

Do not create config files from preference guesses.

## Ask only if blocking

UX, public API, DB/migration, auth, billing, deletion, security, external contract, required validation, stack/tooling for new/empty project.

Do not ask if repo patterns answer it. Max 3 questions.

## Persist

Create one work item only for complex/high-risk/multi-session/user-requested work:

```bash
python .claude/skills/c-shared/work_items.py create --title "<task>"
```

Record goal, facts, assumptions, questions, first slice, next. Do not edit `{config.docs.work_items_index}`.

Hard decisions -> `{config.docs.adr_dir}`. Stable terms/facts -> `{config.docs.context_file}`.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.
Questions go only under `q:`. Assumptions go only under `assume:`.

## Out

c-clarify(blocking:<n>|clear[,persist])

q:
- none|...
assume:
- none|...
doc: none|path
next:
- /c-implement ...

## Never

- no speculative questions
- no implementation design
- no trivial work item
