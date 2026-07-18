# c-skills

English docs: [README.md](README.md).

本仓库只包含 `cqf` skill，用于聚焦澄清讨论：在进入后续工作前，帮助明确真实目标、范围、约束、关键决策和未解决风险，并形成共同理解。

## Skill

- `cqf`：澄清意图、范围、约束、决策和未解决风险。

该 skill 在达成对齐后停止。除非用户明确开始新的任务，否则不会创建计划、实现、PRD 或其他后续产物。

## 安装

在你想安装 skill 的项目根目录运行以下命令。

PowerShell：

```powershell
New-Item -ItemType Directory -Force .cache
Invoke-WebRequest https://raw.githubusercontent.com/6maple/c-skills/main/scripts/install.py -OutFile .cache/install.py
uv run .cache/install.py --agent claude
```

macOS/Linux：

```sh
mkdir -p .cache
curl -fsSL https://raw.githubusercontent.com/6maple/c-skills/main/scripts/install.py -o .cache/install.py
uv run .cache/install.py --agent claude
```

如果不使用 `uv`，可以执行 `python .cache/install.py --agent claude`。
如果要安装到 Codex 的目录，把 `claude` 换成 `codex`：

```sh
uv run .cache/install.py --agent codex
```

安装器会将本仓库 clone 或更新到 `.cache/c-skills`，再把 `skills/` 复制到统一的 `.agents/skills/` 目录。
如果选择 Claude，会创建 `.claude/skills` 到 `.agents/skills` 的目录链接：Windows 使用 junction，macOS/Linux 使用相对符号链接。如果当前环境不支持创建链接，安装器会自动降级为复制；也可以用 `--copy` 强制 Claude 使用复制模式。

`.claude/skills` 是安装器生成的本地目录，已加入 Git 忽略；`.agents/skills/` 是项目共享的实际安装目录。

## 项目结构

- `skills/cqf/SKILL.md`：skill 定义。
- `.agents/skills/`：项目共享的实际安装目录。
- `scripts/install.py`：将 `cqf` 安装到其他项目。
- `README.md` 和 `README.zh-CN.md`：项目文档。
- `LICENSE`：许可证信息。
