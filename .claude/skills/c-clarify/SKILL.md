---
name: c-clarify
description: Manual-only skill for clearing blocking ambiguity before coding/planning.
disable-model-invocation: true
---

# c-clarify

Clear blockers only. No source edits. No planning.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

Terminal turn. Do not read/execute another `c-*` skill. Put next command only under `next:`.

## Boundary with c-plan

`c-clarify` owns blocking questions. `c-plan` owns slice planning. If planning is still needed after answers, route to `/c-plan`; otherwise route to `/c-implement`.

## Algo

inspect code/tests/README/context -> facts/assumptions/unknowns -> ask only blockers -> persist if needed -> next command.

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

Record goal, facts, assumptions, questions, next. Do not edit `{config.docs.work_items_index}`.

Hard decisions -> `{config.docs.adr_dir}`. Stable terms/facts -> `{config.docs.context_file}`.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.
Questions go only under `q:`. Assumptions go only under `assume:`.

List rules:

- `q:` uses numbered questions when blocking, otherwise `- none`
- assumptions, docs, and `next:` use bullets
- `blocking:<n>` must equal the count of numbered `q:` items
- valid forms: use either `- none` or numbered items such as `1. ...`

## Out

c-clarify(clear|blocking:<n>[,persist])

q:
- none
assume:
- none
doc:
- none
next:
- <one default action>
