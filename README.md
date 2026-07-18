# c-skills

Chinese docs: [README.zh-CN.md](README.zh-CN.md).

This repository contains the `cqf` skill for focused clarification discussions.
It helps uncover the actual goal, resolve material decisions, and reach shared
understanding before downstream work begins.

## Skill

- `cqf`: clarify intent, scope, constraints, decisions, and unresolved risks.

The skill stops after alignment. It does not create a plan, implementation, PRD,
or other downstream artifact unless the user explicitly starts a new task.

## Install

Run these commands from the project where you want to install the skill.

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
Replace `claude` with `codex` to install into `.agents/skills` instead:

```sh
uv run .cache/install.py --agent codex
```

The installer clones or updates this repository in `.cache/c-skills`, then
copies `skills/` to the canonical `.agents/skills/` directory. For Claude, it
creates `.claude/skills` as a directory link to `.agents/skills`. Windows uses a
junction; macOS/Linux use a relative symbolic link. If linking is unavailable,
the installer automatically falls back to a copy. Use `--copy` to force copy
mode for Claude.

`.claude/skills` is a local generated path and is ignored by Git. The canonical
`.agents/skills/` directory is the project-shared installation.

## Project layout

- `skills/cqf/SKILL.md`: the skill definition.
- `.agents/skills/`: the canonical project installation directory.
- `scripts/install.py`: installs `cqf` into another project.
- `README.md` and `README.zh-CN.md`: project documentation.
- `LICENSE`: license information.
