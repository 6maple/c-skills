---
name: c-handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Read `.claude/skills/c-shared/config.md` first.

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to `{config.docs.handoff_file}` and overwrite the previous handoff.

Do not duplicate content already captured in other artifacts: PRDs, plans, ADRs, issues, commits, or diffs. Reference them by path or URL instead.

Include a "suggested skills" section in the document, which suggests skills the next agent should invoke.

Include a "Doc Hygiene" section so cleanup is hard to forget:

```markdown
## Doc Hygiene

active:
- <doc path> — <why still needed>

stale:
- <doc path> — <why likely stale>

cleanup_next:
- <delete|merge|review> <doc path> after <condition>
```

Use `none` when there is nothing to record. Do not delete docs during handoff.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
