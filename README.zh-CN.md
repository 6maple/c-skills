# c-* Skills

这是对 Matt Pocock-style engineering skills 的 c-* 适配版：显式调用、仓库本地配置、`project_probe.py` 工程事实探测。Skill 保持原子化；issue 队列执行应由外部 runner 处理，不放进 skill 层。

## 主流程

```text
c-auto-route -> specialist skill -> project_probe.py when needed -> c-review/c-handoff
```

## Skills

- `c-auto-route`：只做路由。
- `c-takeover`：建立可信项目起点。
- `c-grill`：一次只问一个阻塞问题，并按配置更新 CONTEXT/ADR。
- `c-prd`：把已确认上下文合成为 PRD。
- `c-issues`：拆 tracer-bullet 垂直切片，标记 HITL/AFK。
- `c-prototype`：用可丢弃的逻辑/UI 原型回答设计问题。
- `c-zoom-out`：把某个代码区域提升一层解释。
- `c-clean`：确认后清理过期配置文档。
- `c-implement`：非 TDD 的受约束实现。
- `c-tdd`：稳定、可测试行为的 red-green-refactor。
- `c-fix`：反馈闭环优先的 bug 诊断与修复。
- `c-refactor`：薄的行为保持型重构入口。
- `c-arch`：深层模块架构评估。
- `c-review`：fresh-context 双轴审查。
- `c-handoff`：压缩当前交接状态。
- `c-shared`：仅占位；共享配置在 `config.md`。

## 文档信任模型

配置文档只是线索，不是事实。仓库当前证据优先。

```text
current code > tests/typecheck/build > git diff/history > issue status > {config.docs.context_file}/ADR > PRD/{config.docs.handoff_file}/history
```

- `{config.docs.context_file}` 只放稳定词汇和命名约定。
- `{config.docs.adr_dir}` 下的 ADR 是决策记录，不是当前实现证明。
- `{config.docs.prd_dir}` 下的 PRD 是某个时间点的意图。
- `{config.docs.issues_dir}` 是本地任务和状态来源。
- `{config.docs.handoff_file}` 是临时交接线索，必须由 `c-takeover` 用仓库证据校验。

执行类 skill 如果带 issue 路径执行，结束前必须把 issue 更新为 `done` 或 `blocked`。完成或停止的 issue 不能继续保持 `todo`。

## 文档资产

所有路径从 `.claude/skills/c-shared/config.md` 解析。默认位于 `{config.docs.root_dir}`。

- `{config.docs.context_file}`：稳定词汇和项目约定。
- `{config.docs.adr_dir}`：重要且难逆的技术决策。
- `{config.docs.prd_dir}`：大功能规格。
- `{config.docs.issues_dir}`：backlog 切片和本地任务状态源。
- `{config.docs.handoff_file}`：当前交接提示，每次刷新覆盖。

`work-items` 已有意移除。Issue 文件说明“要做什么”；`{config.docs.handoff_file}` 说明“当前停在哪”。

## 文档清理

配置文档是工作资产，不是追加式知识库。功能交付后、长任务接手前、或配置文档变得嘈杂时，应执行清理。

使用 `/c-clean` 做 skill 化清理：先列出候选文件，等待用户确认，再删除确认过的文件。输出应保持极简。

仅供用户手动调用的工具脚本：

```bash
python .claude/skills/c-shared/doc_hygiene.py
python .claude/skills/c-shared/doc_hygiene.py -y
```

行为：

- 默认：列出候选，只有用户输入 `y` 才删除。
- `-y` / `--yes`：跳过确认，直接删除候选。
- 该脚本仅供用户手动调用，skill 不应依赖它。

默认清理候选：

- `{config.docs.issues_dir}` 下超过 14 天的 `done` issue。
- `{config.docs.prd_dir}` 下超过 30 天且未被活跃 issue 引用的孤儿 PRD。
- `{config.docs.adr_dir}` 下超过 90 天且标记为 `superseded` 的 ADR。
- 超过 7 天的 `{config.docs.handoff_file}`。

保留：

- `{config.docs.context_file}` 中的当前词汇。
- 仍影响判断的 accepted ADR。
- `todo`、`doing`、`blocked`、`ready` issue。
- 与活跃工作绑定的 PRD。
- 当前唯一的 `{config.docs.handoff_file}`。

不要默认加载所有配置文档。只读和当前 issue、涉及代码区域、活跃 handoff 直接相关的文件。

## 原则

入口 skill 可以多，执行路径必须少。持久文档只有在未来会复用、且能被仓库证据验证时才写入。小的一次性修改应产出代码证据、验证结果或明确问题，而不是制造新文档。

## Matt-style assets

- `c-grill/CONTEXT-FORMAT.md`：`c-grill` 更新 `{config.docs.context_file}` 时使用。
- `c-grill/ADR-FORMAT.md`：`c-grill` 在 `{config.docs.adr_dir}` 下创建 ADR 时使用。
- `c-arch/LANGUAGE.md`、`HTML-REPORT.md`、`INTERFACE-DESIGN.md`：由 `c-arch` 使用。
- `c-prototype/LOGIC.md`、`UI.md`：由 `c-prototype` 使用。
- `c-shared/SKILL.md` 只保留 frontmatter；共享路径看 `.claude/skills/c-shared/config.md`。
