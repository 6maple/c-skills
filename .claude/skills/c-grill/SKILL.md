---
name: c-grill
description: Challenge a plan or unclear task against the project's domain language and decisions. Use when requirements are ambiguous, a design needs stress-testing, or a blocking decision must be resolved before implementation.
disable-model-invocation: true
---

# c-grill

Interview one decision at a time until the blocker is gone. If code or docs can answer the question, inspect them instead of asking.

## Domain awareness

Read `.claude/skills/c-shared/config.md`, then look for:

- `{config.docs.context_file}` — stable domain vocabulary.
- `{config.docs.adr_dir}` — hard-to-reverse decisions.
- `CONTEXT-MAP.md` if the repo uses multiple bounded contexts.

Create docs lazily. Write only when a term or decision actually crystallises.

## During the session

- Challenge glossary conflicts immediately.
- Sharpen vague language into one canonical term.
- Use concrete scenarios to expose boundary problems.
- Cross-check user claims with code when cheap.
- Update `CONTEXT.md` inline when a stable term is resolved.
- Offer an ADR only when the decision is hard to reverse, surprising without context, and a real trade-off.

Ask one numbered question. Include your recommended answer.

## Output

```text
c-grill(blocked|clear[,doc])

q:
1. ...
recommend:
- ...
doc:
- none
next:
- wait user
```
