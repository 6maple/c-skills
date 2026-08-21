# Documentation

`doc/` 只放项目级文档入口与跨能力方法论；具体能力的规范、设计、测试和历史材料放到各自子目录。

## Project-level

| 文档 | 职责 |
|---|---|
| [design-rule.md](design-rule.md) | 跨能力的设计与验证方法：最小充分机制、failure-driven、训练先验、BDD/Design/Test 分层、Fake Green 与 Production CI 等。 |

## Capabilities

| 目录 | 内容 |
|---|---|
| [brain-dsh/](brain-dsh/) | brain-dsh 的 BDD、public tool contract、Acceptance、Engineering Design、Production CI tests/review 与历史 archive。 |

新增能力时，优先建立独立子目录；只有真正跨能力稳定复用的方法论才提升到 `doc/` 根目录。