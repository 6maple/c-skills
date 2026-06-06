---
name: c-refactor
description: Thin entry for behavior-preserving code structure changes. Use for rename, move, cleanup, small mechanical refactor, or when the user explicitly asks to refactor.
disable-model-invocation: true
---

# c-refactor

Change structure, not behavior.

## Process

1. Confirm the intended behavior is unchanged.
2. Run `project_probe.py` before choosing commands.
3. Identify the smallest safe mechanical step.
4. Preserve public APIs unless the user explicitly requested an API change.
5. Verify with existing tests/typecheck/lint/build.
6. If a real architecture decision is needed, stop and route to `c-arch`.

## Routing

- Mechanical local refactor -> proceed here.
- Refactor requires behavior lock -> use `c-tdd` first.
- Shallow modules, missing seams, or boundary redesign -> `c-arch`.
- Bug discovered -> `c-fix`.

## Output

```text
c-refactor(done|partial|blocked)

chg:
- ...
ev:
- ...
risk:
- none
next:
- none
```
