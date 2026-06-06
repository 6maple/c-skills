---
name: c-prototype
description: Build a throwaway prototype to answer a design question before committing to production code. Use for state model sanity checks, data model exploration, UI variants, interaction design, or when the user says prototype, mock up, try a few designs, or let me play with it.
disable-model-invocation: true
---

# c-prototype

A prototype is throwaway code that answers a question. The question decides the shape.

## Evidence precedence

Use configured docs as intent and vocabulary. Current source code and runnable prototype evidence beat stale `{config.docs.root_dir}` text.

## Pick a branch

Identify the question being answered:

- Logic/state/data model question -> use [LOGIC.md](./LOGIC.md).
- UI/visual/layout/interaction question -> use [UI.md](./UI.md).

If ambiguous and the user is unavailable, choose the branch that best matches the surrounding code and state the assumption at the top of the prototype.

## Rules that apply to both

1. Clearly mark prototype code as throwaway.
2. Locate it near the code it is prototyping for, but name it so it cannot be mistaken for production.
3. Provide one command or URL to run it.
4. Use in-memory state by default. Persistence only when persistence is the question.
5. Skip polish: no tests, no broad error handling, no abstractions beyond what makes it runnable.
6. Surface state after every action or variant switch.
7. Delete or absorb when done. Do not leave stale prototype code in the repo.

## Capture the answer

The answer is the only durable artifact. Capture it in a commit message, ADR, issue, or `NOTES.md` next to the prototype. If the user is present, ask what decision the prototype produced.

## Issue status writeback

If invoked with an issue file path, update that file before final output.

- On success: set frontmatter `status: done`, update `updated: YYYY-MM-DD`, and refresh the `## Result` section with changed files, verification evidence, and short notes.
- On stop/block: set `status: blocked`, update `updated: YYYY-MM-DD`, and refresh the `## Blocked` section with reason, tried steps, and exact next action.
- Do not leave a completed or stopped issue as `todo`.
- Do not write long logs into the issue. Keep details in final response or verification output.

## Output

```text
c-prototype(done|partial|blocked)

question:
- ...
branch:
- logic|ui
run:
- ...
artifact:
- ...
answer:
- pending|...
issue:
- none|updated <issue-path> to done|blocked
risk:
- prototype code must be deleted or absorbed
next:
- wait user | /c-implement ... | /c-refactor ...
```
