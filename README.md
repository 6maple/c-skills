# c-* Skills

Chinese docs: [README.zh-CN.md](README.zh-CN.md).

A c-* adaptation of Matt Pocock's skills for Claude-style skill directories.
The mapped skill text stays close to upstream while this package preserves only
the approved local adaptations: c-* names, repo-local path resolution through
`c-shared/config.md`, the local `c-takeover` entrypoint, the narrow
behavior-preserving `c-refactor` skill, and handoff/takeover Doc Hygiene
reminders.

## Usage

Use the narrowest skill that matches the task. Ordinary small code edits do not
need a skill.

Typical entrypoints:

- Start with `c-takeover` when the project state is unknown or stale.
- Use `c-grill`, `c-prd`, and `c-issues` to shape work before implementation.
- Use `c-tdd`, `c-fix`, `c-refactor`, `c-arch`, and `c-review` for engineering
  execution and review.
- Use `c-handoff` before compacting or passing work to another agent.

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
- `c-refactor`: behavior-preserving refactor workflow.

Shared paths live in `.claude/skills/c-shared/config.md`; `c-shared` is shared
configuration, not an invokable skill.

## Install

Run these commands from the project where you want to install c-skills.

PowerShell:

```powershell
New-Item -ItemType Directory -Force .cache
Invoke-WebRequest https://raw.githubusercontent.com/6maple/c-skills/main/scripts/install.py -OutFile .cache/install.py
uv run .cache/install.py --agent claude
```

macOS/Linux:

```sh
mkdir -p .cache
curl -fsSL https://raw.githubusercontent.com/6maple/c-skills/main/scripts/install.py -o .cache/install.py
uv run .cache/install.py --agent claude
```

Use `python .cache/install.py --agent claude` if you are not using `uv`.

Use `codex` instead of `claude` when installing for Codex:

```sh
uv run .cache/install.py --agent codex
```

The installer:

- clones or updates `https://github.com/6maple/c-skills.git` into
  `.cache/c-skills`;
- installs skills into `.claude/skills` for `claude`, or `.agent/skills` for
  `codex`;
- copies `.docs` templates without overwriting existing docs;
- records managed skill names in `.cache/c-skills/lock.json` so later installs
  can replace only previously managed skills.

If a same-name destination skill directory already exists and was not recorded
in `.cache/c-skills/lock.json` by a previous installer run, the installer exits
with an error and tells you to move or delete that directory manually.

## Project Layout

- `.claude/skills/`: packaged c-* skills.
- `.claude/skills/c-shared/config.md`: required path mapping injected into
  synced skills.
- `.claude-plugin/plugin.json`: plugin manifest listing invokable skills.
- `.docs/CONTEXT.md`: default project glossary template.
- `.docs/HANDOFF.md`: default handoff template with Doc Hygiene.
- `.docs/adr/ADR-0000-template.md`: ADR template.
- `scripts/install.py`: install this package into another project.
- `scripts/sync.py`: sync mapped skills from upstream.
- `UPSTREAM-SYNC.md`: review checklist and mapping for upstream updates.

## Config

All c-* docs resolve project paths from `.claude/skills/c-shared/config.md`.
Current mappings include:

- `CONTEXT.md` -> `.docs/CONTEXT.md`
- `CONTEXT-MAP.md` -> `.docs/CONTEXT-MAP.md`
- `docs/adr/` -> `.docs/adr`
- PRD output -> `.docs/prd`
- issue output -> `.docs/issues`
- handoff output -> `.docs/HANDOFF.md`
- temporary output -> `.docs/.tmp`
- architecture reports -> `.docs/.tmp/architecture-review-<timestamp>.html`
- issue tracker config -> `.docs/agents/issue-tracker.md`

## Doc Hygiene

There is no cleanup skill and no cleanup script.

- `c-handoff` records `Doc Hygiene`: active docs, stale docs, and
  `cleanup_next`.
- `c-takeover` reads that section and surfaces pending cleanup before
  continuing.

## Upstream Sync

Use [UPSTREAM-SYNC.md](UPSTREAM-SYNC.md) before updating this package against
`mattpocock/skills`.

For mapped upstream skills, run:

```sh
python scripts/sync.py
```

The sync script updates only directly mapped upstream skills, reapplies c-* names
and the shared config instruction, validates plugin paths, and reminds you to
review local-only skills plus README/release packaging. It intentionally does
not add new upstream skills, update local-only skills, rewrite README files, or
rebuild release zips.

## Bundled Files

- `c-grill/CONTEXT-FORMAT.md` and `ADR-FORMAT.md`.
- `c-arch/LANGUAGE.md`, `DEEPENING.md`, `HTML-REPORT.md`, and
  `INTERFACE-DESIGN.md`.
- `c-prototype/LOGIC.md` and `UI.md`.
- `c-tdd/tests.md`, `mocking.md`, `refactoring.md`, `interface-design.md`, and
  `deep-modules.md`.
- `c-fix/scripts/hitl-loop.template.sh`.
