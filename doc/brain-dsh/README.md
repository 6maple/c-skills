# brain-dsh 文档入口

本目录只保留当前有效的规范、设计与验证基线。历史问题分析、旧设计快照、实现笔记、讨论记录和被替代测试资料统一放在 [`archive/`](archive/) 中。

## 当前真相层

| 文档 | 职责 |
|---|---|
| [../design-rule.md](../design-rule.md) | 上位设计/测试方法：如何判断复杂度、failure mode、训练先验、测试边界与歧义处理。 |
| [bdd-brain-dsh-behavior-requirements.md](bdd-brain-dsh-behavior-requirements.md) | **行为需求基线（What）**；已确认行为的唯一需求真相。 |
| [brain-tools-contract.md](brain-tools-contract.md) | 当前模型可见/public `brain_*` tool contract。 |
| [acceptance-spec-brain-dsh.md](acceptance-spec-brain-dsh.md) | **Frozen Specification by Example**；把 BDD 展开为验收场景与边界。 |
| [design-brain-dsh-runtime.md](design-brain-dsh-runtime.md) | **Engineering Design（How）**；落实 Frozen BDD/Acceptance。 |

| [test-review-brain-dsh-production-ci.md](test-review-brain-dsh-production-ci.md) | 2026-08-20 Production CI / Compliance Review 执行快照。 |

## 阅读顺序

新需求或行为变更：

`design-rule → BDD → Acceptance → Design → implementation/tests`

理解当前公开工具：

`BDD + brain-tools-contract`

理解当前实现：

`Design → src/**`

追溯历史决策或被否方案：

`archive/README.md → archive/*`

## 当前验证基线

`code/brain-dsh` 默认 `pnpm test` 执行 Production CI：真实 production business/application logic + deterministic fake resource boundaries。当前 dated 结果见 [test-review-brain-dsh-production-ci.md](test-review-brain-dsh-production-ci.md)。

历史材料只用于解释背景和演进，不直接覆盖当前 BDD、Acceptance、Design 或 production tests。
