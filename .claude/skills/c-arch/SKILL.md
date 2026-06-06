---
name: c-arch
description: Find codebase deepening opportunities using project domain language and ADRs. Use for architecture friction, shallow modules, missing seams, excessive coupling, or refactoring strategy.
disable-model-invocation: true
---

# c-arch

Surface architectural friction and propose deepening opportunities. Do not directly refactor.

## Vocabulary

Use the architecture language in [LANGUAGE.md](./LANGUAGE.md) exactly. Consistent terms are part of the skill; do not drift into near-synonyms.

## Process

1. Read `CONTEXT.md` and relevant ADRs first.
2. Explore organically and note friction:
   - Understanding requires bouncing across many modules.
   - Interface is nearly as complex as implementation.
   - Pure functions were extracted only for testability but bugs hide in orchestration.
   - Tight coupling leaks across seams.
   - Important behavior is hard to test through current interfaces.
3. Apply the deletion test: if deleting the module makes complexity vanish, it is likely shallow; if complexity spreads to N callers, it is earning its keep.
4. Produce architecture candidates, not code changes.
5. Ask which candidate to explore. If selected, route to `c-grill`, then `c-issues`.

## Output

```text
c-arch(candidates|blocked)

candidates:
1. <module/seam> — Strong|Worth exploring|Speculative
risk:
- none
doc:
- none
next:
- wait user | /c-grill ...
```
