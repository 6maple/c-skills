---
name: c-review
description: Manual-only skill for reviewing current diffs or requested files.
disable-model-invocation: true
---

# c-review

Review diff/files. No edits unless explicitly asked.

Before doc I/O, read `.claude/skills/c-shared/config.md`; use only `{config.docs.*}` paths.

## Skill boundary

This skill is terminal for this turn. Never read/execute another `c-*` skill. If needed, put it only under `next:` and stop; `next:` is inert text.

## Algo

diff -> surrounding code if needed -> correctness/tests/scope/security/docs -> blocking/minor -> minimal fixes/checks.

Check: correctness, tests, complexity, public behavior, security, docs mismatch, unrelated changes, hidden defaults, unjustified deps.

## Response contract

Emit only the output shape below. No prose, no fence, no appendix. Stop after final field.
Use short wrapped lines; put long values under bullets.

## Out

c-review(blocking:<n>,minor:<n>|clean)

blocking:
1. file: issue -> minimal fix
minor:
1. file: issue -> minimal fix
ev:
- checks/reviewed files
next:
- none|...

## Never

- no broad redesign
- no style-only noise unless harmful
- no edits unless requested
