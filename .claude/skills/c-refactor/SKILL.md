---
name: c-refactor
description: Thin entry for behavior-preserving code structure changes. Use for rename, move, cleanup, small mechanical refactor, or when the user explicitly asks to refactor.
disable-model-invocation: true
---

# c-refactor

Change structure, not behavior.

## Evidence precedence

Use configured docs as intent and vocabulary. Current source code, tests, typecheck/build output, and git diff are stronger evidence than stale `{config.docs.root_dir}` text.

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

## Issue status writeback

If invoked with an issue file path, update that file before final output.

- On success: set frontmatter `status: done`, update `updated: YYYY-MM-DD`, and refresh the `## Result` section with changed files, verification evidence, and short notes.
- On stop/block: set `status: blocked`, update `updated: YYYY-MM-DD`, and refresh the `## Blocked` section with reason, tried steps, and exact next action.
- Do not leave a completed or stopped issue as `todo`.
- Do not write long logs into the issue. Keep details in final response or verification output.

## Output

```text
c-refactor(done|partial|blocked)

chg:
- ...
ev:
- ...
issue:
- none|updated <issue-path> to done|blocked
risk:
- none
next:
- none|/c-review <issue-path>
```
