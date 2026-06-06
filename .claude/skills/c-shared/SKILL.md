---
name: c-shared
description: Shared configuration for the c-* engineering skills. Do not invoke directly; read config.md when another c-* skill needs repo-local paths.
disable-model-invocation: true
---

# c-shared

Shared assets only.

`config.md` contains values referenced by `{config.*}` in skills or read by helper scripts. Keep it small.

## Artifacts

- `CONTEXT` stores stable project vocabulary and conventions.
- `ADR` stores important hard-to-reverse technical decisions.
- `PRD` stores large feature specifications.
- `issues` store planned vertical backlog slices and their status.
- `HANDOFF` stores one current continuation snapshot. Overwrite it; do not accumulate handoff history.

## Scripts

- `project_probe.py` lives under `c-takeover` and reports stack/tooling evidence.

Script stdout is evidence. Private script caches are not user-editable state.
