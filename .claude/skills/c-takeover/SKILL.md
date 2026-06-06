---
name: c-takeover
description: Establish a trusted project starting point before coding. Use for first-touch repos, resumed work, stale handoff snapshots, unknown project state, or when another c-* skill lacks stack/tooling evidence.
disable-model-invocation: true
---

# c-takeover

Trust fresh repo evidence over prior summaries. Treat configured docs under `{config.docs.root_dir}` as hints, not truth.

## Process

1. Read `.claude/skills/c-shared/config.md`.
2. Run the probe:

```bash
python .claude/skills/c-takeover/project_probe.py
```

3. Read `{config.docs.handoff_file}` only as a continuation hint; verify it against repo evidence.
4. Inspect `{config.docs.issues_dir}` only for active issue status: `doing`, `blocked`, or explicitly referenced issue files.
5. Read `{config.docs.context_file}`, ADR, PRD, issue, and source files only when directly relevant. Prefer `{config.docs.context_file}` for vocabulary; treat PRD, issues, ADRs, and handoff as dated intent/decisions until confirmed by code.
6. Check `git status`, targeted diff, source files, and available tests/build evidence before trusting docs.
7. Run a lightweight document hygiene check over configured docs paths. Do not read every document in full; identify stale candidates by issue status, age, superseded ADR status, orphan PRDs, and handoff freshness.
8. Recommend exactly one next skill.

## Rules

- If probe says unknown/new/empty, route to `c-grill`; do not guess stack or commands.
- If several active issues exist, ask the user to choose by issue filename/path.
- If `{config.docs.handoff_file}`, PRD, issue text, or ADR conflicts with repo evidence, trust repo evidence and mark the doc stale in `risk`.
- Do not implement during takeover.

## Output

```text
c-takeover(verified|dirty|blocked|stale|project)

probe:
- ...
state:
- ...
ev:
- ...
docs_hygiene:
- none
risk:
- none
next:
- /c-skill ...
```
