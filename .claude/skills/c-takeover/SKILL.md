---
name: c-takeover
description: Establish a trusted project starting point before coding. Use for first-touch repos, resumed work, stale handoff snapshots, unknown project state, or when another c-* skill lacks stack/tooling evidence.
disable-model-invocation: true
---

# c-takeover

Trust fresh repo evidence over prior summaries.

## Process

1. Read `.claude/skills/c-shared/config.md`.
2. Run the probe:

```bash
python .claude/skills/c-takeover/project_probe.py
```

3. Read `{config.docs.handoff_file}` if it exists.
4. Inspect `{config.docs.issues_dir}` only for active issue status: `doing`, `blocked`, or explicitly referenced issue files.
5. Read `CONTEXT`, ADR, PRD, issue, and source files only when directly relevant.
6. Check `git status` and targeted diff when code may already be modified.
7. Recommend exactly one next skill.

## Rules

- If probe says unknown/new/empty, route to `c-grill`; do not guess stack or commands.
- If several active issues exist, ask the user to choose by issue filename/path.
- If `HANDOFF` conflicts with repo evidence, trust repo evidence and mark handoff stale.
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
risk:
- none
next:
- /c-skill ...
```
