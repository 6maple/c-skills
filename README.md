# c-* Skills

中文说明见 [README.zh-CN.md](README.zh-CN.md)。

A c-* adaptation of Matt Pocock-style engineering skills with explicit user invocation, repo-local config, and `project_probe.py` evidence. Skills are atomic; queue execution should be handled outside the skill layer.

## Main loop

```text
c-auto-route -> specialist skill -> project_probe.py when needed -> c-review/c-handoff
```

## Skills

- `c-auto-route`: route only.
- `c-takeover`: establish trusted project state.
- `c-grill`: one-question-at-a-time design alignment with configured context/ADR updates.
- `c-prd`: synthesize confirmed context into PRD.
- `c-issues`: tracer-bullet vertical slices, HITL/AFK.
- `c-prototype`: throwaway logic/UI prototypes to answer design questions.
- `c-zoom-out`: explain a code area one abstraction level up.
- `c-clean`: clean stale configured docs after confirmation.
- `c-implement`: bounded non-TDD implementation.
- `c-tdd`: red-green-refactor for stable/testable behavior.
- `c-fix`: feedback-loop-first bug diagnosis.
- `c-refactor`: thin behavior-preserving refactor entry.
- `c-arch`: deep-module architecture review.
- `c-review`: fresh-context two-axis review.
- `c-handoff`: compact continuation state.
- `c-shared`: placeholder skill only; shared values live in `config.md`.


## Document trust model

Docs are hints. Repo evidence wins.

```text
current code > tests/typecheck/build > git diff/history > issue status > {config.docs.context_file}/ADR > PRD/{config.docs.handoff_file}/history
```

- `{config.docs.context_file}` is for stable vocabulary and naming only.
- ADRs under `{config.docs.adr_dir}` are decisions, not current implementation proof.
- PRDs under `{config.docs.prd_dir}` describe intent at a point in time.
- Issues under `{config.docs.issues_dir}` are the local task/status source.
- `{config.docs.handoff_file}` is an ephemeral continuation hint and must be verified by `c-takeover`.

Execution skills invoked with an issue path must set the issue to `done` or `blocked` before final output. Completed or stopped issues must not remain `todo`.

## Artifacts

Resolve all paths from `.claude/skills/c-shared/config.md`. Defaults are under `{config.docs.root_dir}`.

- `{config.docs.context_file}`: stable vocabulary and conventions.
- `{config.docs.adr_dir}`: important hard-to-reverse decisions.
- `{config.docs.prd_dir}`: large feature specs.
- `{config.docs.issues_dir}`: backlog slices plus local task/status source.
- `{config.docs.handoff_file}`: one current continuation hint, overwritten when refreshed.

`work-items` are intentionally removed. Issue files say what the work is; `{config.docs.handoff_file}` says where the current session stopped.


## Document hygiene

Configured docs are working assets, not an append-only knowledge base. Clean them after a feature ships, before long-task takeover, or when configured docs become noisy.

Use `/c-clean` for skill-based cleanup. It lists cleanup candidates, asks for confirmation, then deletes only confirmed files. Keep its output short.

Utility script for user-only manual cleanup:

```bash
python .claude/skills/c-shared/doc_hygiene.py
python .claude/skills/c-shared/doc_hygiene.py -y
```

Behavior:

- default: list candidates, then delete only after the user types `y`.
- `-y` / `--yes`: delete candidates without interactive confirmation.
- This script is only for users to call manually. Skills should not depend on it.

Default cleanup candidates:

- `done` issues under `{config.docs.issues_dir}` older than 14 days.
- orphan PRDs under `{config.docs.prd_dir}` older than 30 days and not referenced by active issues.
- ADRs under `{config.docs.adr_dir}` marked `superseded` and older than 90 days.
- stale `{config.docs.handoff_file}` older than 7 days.

Keep:

- current vocabulary in `{config.docs.context_file}`
- accepted ADRs that still affect decisions
- active `todo`, `doing`, `blocked`, or `ready` issues
- PRDs tied to active work
- the single current `{config.docs.handoff_file}`

Do not load all configured docs by default. Read only files directly relevant to the current issue, touched code area, or active handoff.

## Principle

Entry skills may be many. Execution paths stay few. Durable docs are written only when they will be reused and can be verified against repo evidence. Small one-shot changes should produce repo evidence, verification output, or a clear user question, not extra files.


## Matt-style assets

- `c-grill/CONTEXT-FORMAT.md` is consumed by `c-grill` when updating `{config.docs.context_file}`.
- `c-grill/ADR-FORMAT.md` is consumed by `c-grill` when creating ADRs under `{config.docs.adr_dir}`.
- `c-arch/LANGUAGE.md`, `HTML-REPORT.md`, and `INTERFACE-DESIGN.md` are consumed by `c-arch`.
- `c-prototype/LOGIC.md` and `c-prototype/UI.md` are consumed by `c-prototype`.
- `c-shared/SKILL.md` is intentionally frontmatter-only; use `.claude/skills/c-shared/config.md` for shared paths.
