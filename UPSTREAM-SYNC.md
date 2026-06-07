# Upstream Sync

Goal: keep this package aligned with `mattpocock/skills` while preserving only the approved c-* adaptations.

No sync script is provided. This is not a 100% mechanical update: upstream text, c-* names, `{config.*}` paths, `c-takeover`, `c-refactor`, and Doc Hygiene require human judgement.

## Source of Truth

Upstream: https://github.com/mattpocock/skills

Local rule: upstream wording wins unless the change is one of the approved adaptations below.

## Approved Local Adaptations

Keep these differences:

1. `c-*` skill names.
2. Shared docs paths are resolved from `.claude/skills/c-shared/config.md`.
3. Skill text may reference `{config.docs.*}` instead of hardcoded doc paths.
4. `c-takeover` exists as the project entrypoint.
5. `c-refactor` exists as a narrow behavior-preserving refactor skill.
6. `c-handoff` records `Doc Hygiene`.
7. `c-takeover` surfaces pending `Doc Hygiene.cleanup_next`.
8. `README.zh-CN.md` is kept.

Do not add new routing layers, cleanup scripts, probe scripts, command discovery rules, or generic implementation skills without explicit approval.

## Upstream Mapping

| Local | Upstream |
|---|---|
| `c-arch` | `skills/engineering/improve-codebase-architecture` |
| `c-fix` | `skills/engineering/diagnose` |
| `c-grill` | `skills/engineering/grill-with-docs` |
| `c-handoff` | `skills/productivity/handoff` |
| `c-issues` | `skills/engineering/to-issues` |
| `c-prd` | `skills/engineering/to-prd` |
| `c-prototype` | `skills/engineering/prototype` |
| `c-review` | `skills/in-progress/review` |
| `c-tdd` | `skills/engineering/tdd` |
| `c-zoom-out` | `skills/engineering/zoom-out` |
| `c-takeover` | local-only |
| `c-refactor` | local-only |

## Update Procedure

1. Open upstream `mattpocock/skills`.
2. For each mapped skill, compare upstream `SKILL.md` and bundled files against the local c-* version.
3. Copy upstream wording by default.
4. Reapply only the approved local adaptations.
5. Keep all docs paths through `{config.docs.*}` where the skill reads or writes project docs.
6. Update `.claude-plugin/plugin.json` only if a local skill is intentionally added or removed.
7. Update both `README.md` and `README.zh-CN.md`.
8. Repack the zip.

## Review Checklist

Before release, verify:

- No removed skills are referenced: `c-auto-route`, `c-clean`, `c-implement`, `c-shared` as a skill.
- No removed scripts are referenced: `project_probe.py`, `project_probe_rule.json`, `doc_hygiene.py`.
- No hardcoded project doc path is required inside skill instructions when `{config.docs.*}` should be used.
- No generic implementation skill was recreated.
- `c-handoff` still records `Doc Hygiene`.
- `c-takeover` still surfaces `cleanup_next`.
- `plugin.json` paths all exist.
- `README.md` and `README.zh-CN.md` describe the same skill set.

## When Upstream Changes

- New upstream skill: do not add automatically. Decide whether it solves a real c-* need.
- Removed upstream skill: review the mapped c-* skill. Keep only with explicit reason.
- Upstream wording change: adopt by default, then reapply approved local adaptations.
- Conflict with local adaptation: preserve local adaptation only if it is listed above.
