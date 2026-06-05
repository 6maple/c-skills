---
name: c-review
description: Manual-only skill for reviewing current diffs or requested files.
disable-model-invocation: true
---

# c-review

Review diff/files. No edits unless explicitly asked.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

Terminal turn. Do not read/execute another `c-*` skill. Put next command only under `next:`.

## Algo

diff -> surrounding code if needed -> correctness/tests/scope/security/docs -> blocking/minor -> minimal fixes/checks.

Check: correctness, tests, complexity, public behavior, security, docs mismatch, unrelated changes, hidden defaults, unjustified deps.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.

List rules:

- `blocking:` and `minor:` use numbered findings when present, otherwise `- none`
- `blocking:<n>` and `minor:<n>` must equal their numbered findings
- evidence and `next:` use bullets
- valid forms: use either `- none` or numbered items such as `1. ...`

## Out

c-review(clean|blocking:<n>,minor:<n>)

blocking:
- none
minor:
- none
ev:
- checks/reviewed files
next:
- none

## Guards

- report correctness/scope risks; skip harmless style noise
- suggest minimal fixes, not redesigns
