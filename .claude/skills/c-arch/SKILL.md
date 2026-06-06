---
name: c-arch
description: Find codebase deepening opportunities using project domain language and ADRs. Use for architecture friction, shallow modules, missing seams, excessive coupling, or architecture review.
disable-model-invocation: true
---

# c-arch

Surface architectural friction and propose **deepening opportunities**. Do not directly refactor. Do not propose interfaces before the user chooses a candidate.

## Vocabulary

Use [LANGUAGE.md](./LANGUAGE.md) exactly. Architecture vocabulary consistency is part of the skill.

Use project domain terms from `{config.docs.context_file}`. Respect ADRs under `{config.docs.adr_dir}`.

## Process

### 1. Explore

Read the project glossary and relevant ADRs first. Then explore the codebase organically. Note where you experience friction:

- Understanding one concept requires bouncing across many modules.
- A module is shallow: interface nearly matches implementation.
- Pure functions exist only for testability, but bugs hide in orchestration.
- Tight coupling leaks across seams.
- Important behavior is hard to test through the current interface.

Apply the deletion test: if deleting the module makes complexity vanish, it is shallow; if complexity reappears across N callers, it is earning its keep.

### 2. Present candidates as an HTML report

Write a self-contained HTML report to the OS temp directory, not the repo:

```text
$TMPDIR/architecture-review-<timestamp>.html
/tmp/architecture-review-<timestamp>.html
%TEMP%\architecture-review-<timestamp>.html
```

Use [HTML-REPORT.md](./HTML-REPORT.md). Each candidate card must include:

- Files/modules involved.
- Problem.
- Solution.
- Benefits in terms of leverage and locality.
- Before/after visualisation.
- Recommendation strength: `Strong`, `Worth exploring`, or `Speculative`.

End with one top recommendation.

After writing the report, open it for the user when possible and provide the absolute path. Then ask: `Which of these would you like to explore?`

### 3. Grilling loop

When the user picks a candidate, walk the design tree with them:

- constraints
- dependencies
- seam placement
- what sits behind the seam
- what tests survive
- adapter strategy

If the user wants alternative interfaces, use [INTERFACE-DESIGN.md](./INTERFACE-DESIGN.md).

### 4. Side effects

- If a deepened module needs a stable domain term, update `{config.docs.context_file}` using `../c-grill/CONTEXT-FORMAT.md`.
- If the user rejects a candidate with a load-bearing reason future reviews would need, offer an ADR using `../c-grill/ADR-FORMAT.md`.
- If the chosen candidate is ready to execute, route to `c-issues` or `c-refactor`.

## Output

```text
c-arch(report|blocked)

report:
- <absolute temp html path>
candidates:
1. <candidate> — Strong|Worth exploring|Speculative
recommend:
- <top recommendation>
doc:
- none
next:
- wait user
```
