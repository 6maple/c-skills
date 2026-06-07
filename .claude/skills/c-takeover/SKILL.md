---
name: c-takeover
description: Establish a trusted project starting point before coding. Use for first-touch repos, resumed work, stale handoff snapshots, unknown project state, or when another c-* skill lacks project context.
disable-model-invocation: true
---

# c-takeover

Trust fresh repo evidence over prior summaries.

Read `.claude/skills/c-shared/config.md` first.

## Process

1. Inspect the repo directly: root files, manifests, source layout, test layout, tool config, and git status.
2. Read `{config.docs.handoff_file}` only as a continuation hint; verify it against repo evidence.
3. Surface any `Doc Hygiene.cleanup_next` or stale-doc notes from handoff before continuing.
4. Read `{config.docs.context_file}`, ADR, PRD, issue, and source files only when directly relevant.
5. If several active issues exist, ask the user to choose by issue filename/path.
6. If docs conflict with repo evidence, say so explicitly.
7. Do not implement during takeover.
8. Do not delete docs during takeover.
9. Recommend exactly one next skill.
