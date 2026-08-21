# Archive

本目录保存 brain-dsh 的历史材料：早期问题分析、设计依据、旧领域模型、实现笔记、讨论过程、旧 TDD matrix 与阶段性测试审查。

这些文件用于：

- 追溯某个设计为什么出现；
- 查找被否方案与历史 failure mode；
- 理解规范演进背景。

当前行为、设计和测试真相请回到 `doc/brain-dsh/`：

- `bdd-brain-dsh-behavior-requirements.md`
- `brain-tools-contract.md`
- `acceptance-spec-brain-dsh.md`
- `design-brain-dsh-runtime.md`
- `design-rule.md`
- `test-plan-brain-dsh-ci.md`

Archive 中的表述允许与当前规范不同；发生冲突时，它只作为历史证据，不作为当前 contract。

## 文件

- `01-problem-and-context.md`：早期问题背景与 skill 局限分析。
- `02-design-rationale.md`：早期设计依据与参考机制。
- `03-memory-model.md`：旧领域模型/存储语义快照。
- `05-implementation-notes.md`：旧实现边界、开放项与阶段性验证记录。
- `06-discussion-log.md`：设计讨论、被否方案与演进过程。
- `tdd-brain-dsh-test-matrix.md`：被当前 Acceptance/Test Plan 取代的旧 TDD matrix。
- `test-review-brain-dsh-functional-coverage.md`：进入当前测试方法前的阶段性覆盖审查。