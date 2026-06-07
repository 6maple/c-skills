# c-* Skills

中文说明见 [README.zh-CN.md](README.zh-CN.md)。

A c-* adaptation of Matt Pocock's skills. The skill text stays close to the upstream skills; this package only adds the c-* names, repo-local `config.md` path resolution, the confirmed `c-takeover` entrypoint, and handoff/takeover Doc Hygiene reminders.

## Usage

Use the narrowest skill that matches the task. Ordinary small code edits do not need a skill.

## Skills

- `c-takeover`: establish trusted project state before coding.
- `c-grill`: challenge a plan against the project's domain language and ADRs.
- `c-prd`: synthesize current context into a PRD.
- `c-issues`: break a plan, spec, or PRD into tracer-bullet vertical issues.
- `c-prototype`: build throwaway logic/UI prototypes to answer design questions.
- `c-zoom-out`: explain a code area one abstraction level up.
- `c-tdd`: red-green-refactor for stable, testable behavior.
- `c-fix`: feedback-loop-first bug diagnosis and fix.
- `c-arch`: deep-module architecture review.
- `c-review`: two-axis review: Standards and Spec.
- `c-handoff`: compact continuation state.

Shared paths live in `.claude/skills/c-shared/config.md`; `c-shared` is not a skill.

## Config

All c-* docs resolve from `.claude/skills/c-shared/config.md`.

Defaults:

- `{config.docs.context_file}`: `.docs/CONTEXT.md`
- `{config.docs.adr_dir}`: `.docs/adr`
- `{config.docs.prd_dir}`: `.docs/prd`
- `{config.docs.issues_dir}`: `.docs/issues`
- `{config.docs.handoff_file}`: `.docs/HANDOFF.md`

## Doc Hygiene

No cleanup skill and no cleanup script.

- `c-handoff` records `Doc Hygiene`: active docs, stale docs, and `cleanup_next`.
- `c-takeover` reads that section and surfaces pending cleanup before continuing.

## Upstream Sync

Use [UPSTREAM-SYNC.md](UPSTREAM-SYNC.md) before updating this package against `mattpocock/skills`. No sync script is provided because alignment requires human review of the approved c-* adaptations.

## Assets

- `c-grill/CONTEXT-FORMAT.md` and `ADR-FORMAT.md`.
- `c-arch/LANGUAGE.md`, `HTML-REPORT.md`, and `INTERFACE-DESIGN.md`.
- `c-prototype/LOGIC.md` and `UI.md`.
