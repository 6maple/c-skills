---
name: c-handoff
description: Compact current work into one handoff snapshot for a fresh agent. Use when the session is ending, context is too long, or another agent will continue the task.
argument-hint: What will the next session focus on?
disable-model-invocation: true
---

# c-handoff

Write one compact continuation snapshot. Reference existing artifacts instead of duplicating them.

## Process

1. Read `.claude/skills/c-shared/config.md`.
2. Summarize only current state needed by the next agent.
3. Overwrite `{config.docs.handoff_file}`.
4. Include the current issue path when one exists.
5. Include suggested skill for the next session.
6. Redact secrets, tokens, passwords, personal data, and environment-specific credentials.

## Include

- Current issue or goal.
- Current state.
- Confirmed decisions.
- Changed files.
- Verification status.
- Open questions.
- Risks.
- Next recommended skill.

## Output

```text
c-handoff(saved|blocked)

doc:
- .docs/HANDOFF.md
state:
- ...
next:
- /c-takeover
risk:
- none
```
