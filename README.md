# c-* Skills

A c-* adaptation of Matt Pocock-style engineering skills with explicit user invocation, repo-local config, and `project_probe.py` evidence.

## Main loop

```text
c-auto-route -> c-auto -> project_probe.py -> specialist skill -> c-review/c-handoff
```

## Skills

- `c-auto-route`: route only.
- `c-auto`: workflow manager.
- `c-takeover`: establish trusted project state.
- `c-grill`: one-question-at-a-time design alignment with CONTEXT/ADR updates.
- `c-prd`: synthesize confirmed context into PRD.
- `c-issues`: tracer-bullet vertical slices, HITL/AFK.
- `c-implement`: bounded non-TDD implementation.
- `c-tdd`: red-green-refactor for stable/testable behavior.
- `c-fix`: feedback-loop-first bug diagnosis.
- `c-refactor`: thin behavior-preserving refactor entry.
- `c-arch`: deep-module architecture review.
- `c-review`: fresh-context two-axis review.
- `c-handoff`: compact continuation state.
- `c-shared`: placeholder skill only; shared values live in `config.md`.


## Artifacts

- `.docs/CONTEXT.md`: stable vocabulary and conventions.
- `.docs/adr/*.md`: important hard-to-reverse decisions.
- `.docs/prd/*.md`: large feature specs.
- `.docs/issues/*.md`: backlog slices plus active status.
- `.docs/HANDOFF.md`: one current continuation snapshot, overwritten when refreshed.

`work-items` are intentionally removed. Issue files say what the work is; `HANDOFF.md` says where the current session stopped.

## Principle

Entry skills may be many. Execution paths stay few. Durable docs are written only when they will be reused. Small one-shot changes should produce repo evidence, verification output, or a clear user question, not extra files.


## Matt-style assets

- `c-grill/CONTEXT-FORMAT.md` is consumed by `c-grill` when updating `{config.docs.context_file}`.
- `c-grill/ADR-FORMAT.md` is consumed by `c-grill` when creating ADRs under `{config.docs.adr_dir}`.
- `c-arch/LANGUAGE.md` is consumed by `c-arch` for deep-module architecture vocabulary.
- `c-shared/SKILL.md` is intentionally frontmatter-only; use `.claude/skills/c-shared/config.md` for shared paths.
