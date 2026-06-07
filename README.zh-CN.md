# c-* Skills

这是对 Matt Pocock skills 的 c-* 适配版。Skill 文本尽量贴近上游，只保留 c-* 命名、基于 `config.md` 的仓库本地路径解析、已确认的 `c-takeover` 入口，以及 handoff/takeover 的文档清理提醒。

## 使用

选择最窄的匹配 skill。普通小代码修改不需要 skill。

## Skills

- `c-takeover`：编码前建立可信项目起点。
- `c-grill`：用项目领域语言和 ADR 追问/校准方案。
- `c-prd`：把当前上下文合成为 PRD。
- `c-issues`：把计划/规格/PRD 拆成 tracer-bullet 垂直 issue。
- `c-prototype`：用可丢弃的逻辑/UI 原型回答设计问题。
- `c-zoom-out`：把代码区域提升一层解释。
- `c-tdd`：稳定、可测试行为的 red-green-refactor。
- `c-fix`：反馈闭环优先的 bug 诊断与修复。
- `c-arch`：深模块架构评估。
- `c-review`：双轴审查：Standards 与 Spec。
- `c-handoff`：压缩当前交接状态。

共享路径放在 `.claude/skills/c-shared/config.md`；`c-shared` 不是 skill。

## Config

所有 c-* 文档路径从 `.claude/skills/c-shared/config.md` 解析。

默认值：

- `{config.docs.context_file}`：`.docs/CONTEXT.md`
- `{config.docs.adr_dir}`：`.docs/adr`
- `{config.docs.prd_dir}`：`.docs/prd`
- `{config.docs.issues_dir}`：`.docs/issues`
- `{config.docs.handoff_file}`：`.docs/HANDOFF.md`

## 文档清理

不保留清理 skill，也不保留清理脚本。

- `c-handoff` 记录 `Doc Hygiene`：活跃文档、过期文档、`cleanup_next`。
- `c-takeover` 读取该部分，并在继续前提示待清理项。

## 上游同步

更新本包前先看 [UPSTREAM-SYNC.md](UPSTREAM-SYNC.md)。不提供同步脚本，因为与 `mattpocock/skills` 对齐时需要人工保留已确认的 c-* 适配。

## Assets

- `c-grill/CONTEXT-FORMAT.md`、`ADR-FORMAT.md`。
- `c-arch/LANGUAGE.md`、`HTML-REPORT.md`、`INTERFACE-DESIGN.md`。
- `c-prototype/LOGIC.md`、`UI.md`。
