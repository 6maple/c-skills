---
name: c-refactor
description: Refactor existing code without changing observable behavior. Use when the user explicitly asks to refactor, rename, move, simplify, clean up, or mechanically improve existing code structure.
disable-model-invocation: true
---

# c-refactor

Change structure, not behavior.

Read `.claude/skills/c-shared/config.md` first, then use the configured domain glossary and ADR paths where relevant.

## Process

1. State the behavior that must stay unchanged.
2. Make the smallest coherent structural change.
3. Preserve public interfaces unless the user explicitly requested an API change.
4. Run the relevant existing feedback loop after each meaningful step.
5. If the work needs new behavior, use `c-tdd`. If it needs a boundary or design decision, use `c-arch`. If it reveals a bug, use `c-fix`.
