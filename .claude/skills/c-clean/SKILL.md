---
name: c-clean
description: Clean stale configured docs. List cleanup candidates, ask for confirmation, then delete only confirmed files. Use when the user asks to clean stale docs, old issues, old PRDs, superseded ADRs, or stale handoff state.
disable-model-invocation: true
---

# c-clean

Clean configured docs with minimal output.

## Process

1. Read `.claude/skills/c-shared/config.md`.
2. Collect candidates only under `{config.docs.root_dir}`:
   - `done` issues in `{config.docs.issues_dir}` older than 14 days.
   - PRDs in `{config.docs.prd_dir}` older than 30 days and not referenced by active issues.
   - ADRs in `{config.docs.adr_dir}` with `status: superseded` older than 90 days.
   - non-empty stale `{config.docs.handoff_file}` older than 7 days.
3. List candidates and ask for confirmation.
4. If user replies `y`, delete exactly the listed files. Otherwise cancel.

## Keep

- `{config.docs.context_file}`.
- active `todo`, `doing`, `blocked`, or `ready` issues.
- accepted/proposed ADRs.
- PRDs referenced by active issues.
- files outside `{config.docs.root_dir}`.

## Output

```text
c-clean(confirm|done|clean|cancelled)

rm:
1. path — reason
q:
1. Delete listed files? options: y | cancel
deleted:
- path
```
