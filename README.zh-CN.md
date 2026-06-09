# c-* Skills

English docs: [README.md](README.md).

这是 Matt Pocock skills 的 c-* 适配版，用于 Claude 风格的 skill 目录。映射自上游的
skill 文本尽量贴近上游；本仓库只保留已批准的本地适配：c-* 命名、通过
`c-shared/config.md` 做仓库内路径解析、本地 `c-takeover` 入口、范围很窄且保持行为不变的
`c-refactor` skill，以及 handoff/takeover 中的 Doc Hygiene 提醒。

## 使用

选择能匹配任务的最窄 skill。普通的小代码改动不需要 skill。

常见入口：

- 项目状态未知或过期时，先用 `c-takeover`。
- 实现前用 `c-grill`、`c-prd`、`c-issues` 梳理工作。
- 工程执行和评审时用 `c-tdd`、`c-fix`、`c-refactor`、`c-arch`、`c-review`。
- 压缩上下文或把工作交给另一个 agent 前，用 `c-handoff`。

## Skills

- `c-takeover`：编码前建立可信的项目状态。
- `c-grill`：用项目领域语言和 ADR 追问、校准方案。
- `c-prd`：把当前上下文综合成 PRD。
- `c-issues`：把计划、规格或 PRD 拆成 tracer-bullet 垂直 issue。
- `c-prototype`：用可丢弃的逻辑/UI 原型回答设计问题。
- `c-zoom-out`：把代码区域提升一层抽象来解释。
- `c-tdd`：为稳定、可测试的行为执行 red-green-refactor。
- `c-fix`：反馈闭环优先的 bug 诊断与修复。
- `c-arch`：深模块架构评审。
- `c-review`：沿 Standards 和 Spec 两个轴做评审。
- `c-handoff`：压缩当前交接状态。
- `c-refactor`：保持行为不变的重构流程。

共享路径放在 `.claude/skills/c-shared/config.md`；`c-shared` 是共享配置，不是可调用的 skill。

## 安装

在你想安装 c-skills 的项目根目录运行下面命令。

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

如果不用 `uv`，也可以执行 `python .cache/install.py --agent claude`。

如果要安装给 Codex，把 `claude` 换成 `codex`：

```sh
uv run .cache/install.py --agent codex
```

安装脚本会：

- clone 或更新 `https://github.com/6maple/c-skills.git` 到 `.cache/c-skills`；
- 为 `claude` 安装到 `.claude/skills`，或为 `codex` 安装到 `.agent/skills`；
- 复制 `.docs` 模板，但不会覆盖已有文档；
- 在 `.cache/c-skills/lock.json` 记录受管理的 skill 名称，便于后续安装只替换之前由脚本管理的 skill。

如果目标位置已经有同名 skill 目录，且它不是之前由安装脚本记录在
`.cache/c-skills/lock.json` 里的目录，安装脚本会报错退出，并提示你手动移动或删除该目录。

## 项目结构

- `.claude/skills/`：打包的 c-* skills。
- `.claude/skills/c-shared/config.md`：同步后注入各 skill 的必要路径映射。
- `.claude-plugin/plugin.json`：列出可调用 skill 的插件 manifest。
- `.docs/CONTEXT.md`：默认项目词汇表模板。
- `.docs/HANDOFF.md`：带 Doc Hygiene 的默认交接模板。
- `.docs/adr/ADR-0000-template.md`：ADR 模板。
- `scripts/install.py`：把本包安装到另一个项目。
- `scripts/sync.py`：从上游同步已映射的 skill。
- `UPSTREAM-SYNC.md`：上游更新的映射和审查清单。

## 配置

所有 c-* 文档路径都从 `.claude/skills/c-shared/config.md` 解析。当前映射包括：

- `CONTEXT.md` -> `.docs/CONTEXT.md`
- `CONTEXT-MAP.md` -> `.docs/CONTEXT-MAP.md`
- `docs/adr/` -> `.docs/adr`
- PRD 输出 -> `.docs/prd`
- issue 输出 -> `.docs/issues`
- handoff 输出 -> `.docs/HANDOFF.md`
- 临时输出 -> `.docs/.tmp`
- 架构报告 -> `.docs/.tmp/architecture-review-<timestamp>.html`
- issue tracker 配置 -> `.docs/agents/issue-tracker.md`

## Doc Hygiene

没有 cleanup skill，也没有 cleanup 脚本。

- `c-handoff` 记录 `Doc Hygiene`：活跃文档、可能过期的文档，以及 `cleanup_next`。
- `c-takeover` 读取该部分，并在继续前提示待清理项。

## 上游同步

更新本包前先看 [UPSTREAM-SYNC.md](UPSTREAM-SYNC.md)，再与 `mattpocock/skills` 对齐。

同步已映射的上游 skill：

```sh
python scripts/sync.py
```

同步脚本只更新直接映射的上游 skill，重新应用 c-* 命名和共享配置说明，校验插件路径，并提醒你检查本地专属
skill、README 和发布包。它不会自动添加新的上游 skill、更新本地专属 skill、重写 README，或重新打包发布 zip。

## Bundled Files

- `c-grill/CONTEXT-FORMAT.md` 和 `ADR-FORMAT.md`。
- `c-arch/LANGUAGE.md`、`DEEPENING.md`、`HTML-REPORT.md` 和 `INTERFACE-DESIGN.md`。
- `c-prototype/LOGIC.md` 和 `UI.md`。
- `c-tdd/tests.md`、`mocking.md`、`refactoring.md`、`interface-design.md` 和 `deep-modules.md`。
- `c-fix/scripts/hitl-loop.template.sh`。
