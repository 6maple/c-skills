---
name: c-handoff
description: Compact current work into one handoff snapshot for a fresh agent. Use when the session is ending, context is too long, or another agent will continue the task.
argument-hint: What will the next session focus on?
disable-model-invocation: true
---

# c-handoff

Write one compact continuation snapshot. Reference existing artifacts instead of duplicating them. Handoff is a short-lived continuation hint, not a source of truth.

## Process

1. Read `.claude/skills/c-shared/config.md`.
2. Summarize only current state needed by the next agent.
3. Overwrite `{config.docs.handoff_file}`.
4. Include the current issue path when one exists.
5. Include the issue status if an issue is active.
6. Include suggested skill for the next session.
7. Redact secrets, tokens, passwords, personal data, and environment-specific credentials.

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
- {config.docs.handoff_file}
state:
- ...
next:
- /c-takeover
risk:
- none
```
