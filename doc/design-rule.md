# Design Rules

> **用途：本项目各能力设计与验证时的上位判断规则；brain-dsh 是当前主要实践来源与示例。**  
> 本文不是具体功能规格，也不替代 BDD / Design；它回答的是“遇到新的设计问题时，应如何判断”。  
> 规则来自本项目持续讨论中的稳定取舍，以及 `doc/brain-dsh/archive/06-discussion-log.md` 所保留的历史决策轨迹。`doc/brain-dsh/archive/06` 的具体方案可能已过时，但其中反复出现的设计倾向可作为方法论旁证。

## 1. 总纲：只引入最小充分机制

设计追求的不是机制数量最少，而是让每一份复杂度都与真实目标和真实风险对应：

> **每一份复杂度都应能说明自己在什么背景下，为哪个目标，解决哪个真实问题。**

一个机制进入核心设计时，应能从至少一种真实依据推出：

- 已观察到的失败模式；
- 真实部署拓扑与数据流必然产生的问题；
- 模型实际使用方式会稳定触发的问题；
- 已有可靠实践、明确算法或认知依据支持的必要机制。

当这些依据都不存在时，保持当前系统简单通常是更合适的设计选择。完整性应服务于真实问题，而不是独立成为目标。

### 1.1 先定义设计语境，再定义机制

开始设计具体机制前，先把以下五件事说清楚：

1. **背景**：这个组件处在什么系统里，上下游是谁，已有能力和约束是什么；
2. **目的**：真正要保障的用户结果、模型结果或系统结果是什么；
3. **使用场景**：正常路径、可预期失败、异常终止等情况在真实运行中如何发生；
4. **职责边界**：哪些事实由本组件负责，哪些由模型、宿主或其他系统负责；
5. **保证边界**：什么必须保证，什么允许丢失、重试、重建或由上层恢复。

推荐的推导顺序是：

```text
背景 / 目的 / 使用场景 / 职责边界
                ↓
        真实 failure mode
                ↓
          所需 guarantee
                ↓
            最小机制
```

机制应从完整语境中推导；“事务”“一致性”“恢复”“分布式”等技术名词用于描述已经由背景、职责和 guarantee 推导出的实现选择。

---

## 2. 先从模型真实工作方式出发

brain-dsh 首先服务的是模型，而不是人类 API 调用者。

设计工具和交互时优先考虑：

1. 模型已有的训练先验；
2. 模型有限的注意力和上下文容量；
3. 模型实际的工具调用习惯；
4. 模型能做好的语义判断；
5. 哪些可靠性约束需要由机制稳定承担。

因此：

- 优先使用 `ls / grep / cat / write / edit / rm / mv` 等模型熟悉的动作语义；
- 参数和行为尽量对齐同名工具，不无故创造 memory-specific 操作习惯；
- 已有训练先验能够表达的行为，直接沿用熟悉语义，减少额外协议学习成本；
- 工具 description 是模型理解行为的重要接口，应清晰、直接、动作顺序明确。

---

## 3. 真实运行拓扑、事实归属与恢复路径决定机制

设计并发、锁、事务、生命周期和恢复策略时，先画清楚真实运行关系，再决定机制。这里至少包括三类拓扑：

1. **执行拓扑**：有哪些进程、宿主和并发访问者，谁会同时操作同一份状态；
2. **事实归属**：哪一份数据是主真相，哪些只是缓存、辅助状态、派生状态或可重建状态；
3. **恢复路径**：发生失败后，事实可以从哪里重试、重建或恢复，恢复责任属于哪个组件。

例如当前 brain-dsh：

- 每个项目最多一个项目级 MCP process；
- project/session 数据只由该进程访问；
- global 数据可能被多个项目进程共享；
- DSH / Codex 等宿主侧会话记录持有对话事实，brain-dsh 保存的是辅助认知状态。

因此 global 的真实跨进程竞争需要跨进程互斥；project/session 使用进程内串行化即可。进程强制终止时，brain-dsh 未完成 mutation 可以丢失，因为对话事实仍有宿主侧恢复来源。

规则：

> **机制的作用域应与真实 failure domain、事实归属和恢复责任一致。**

---

## 4. 机制管结构，模型管语义

程序只负责它能确定做对的事情。

### 机制应负责

- 路径是否合法；
- session id 是否安全；
- schema / frontmatter 是否完整；
- 类型声明是否一致；
- 数值是否落在合法区间；
- index / state / body 是否一致；
- 是否需要审批；
- transaction 是否完整提交；
- 明确机械状态和信号。

### 模型应负责

- 一条记忆是什么语义类型；
- 应写 global / project / session 哪一层；
- summary 如何表达；
- importance 在合法范围内具体取多少；
- 用户反馈属于 adopt / correct / attribute 哪一种；
- 是否应晋升、移动、删除或改写某条记忆；
- 具体内容如何组织、压缩和梳理。

程序负责可确定判断的结构问题；需要上下文理解的语义判断保留给拥有完整语义上下文的主模型。

---

## 5. 工具保持纯程序化

brain-dsh 本体不内嵌独立 LLM 做：

- 语义分类；
- 自动写层；
- 自动摘要；
- 语义检索 rerank；
- 纠正意图判断；
- 记忆价值判断。

理由不是单纯节省模型调用，而是保持：

- 可测试；
- 可预测；
- 可复用；
- 对具体模型保持低耦合；
- 主模型拥有完整语义上下文和最终判断权。

---

## 6. 优先复用通用原语，不制造特殊结构

普通结构已经能够清晰表达需求时，优先沿用普通结构。

例如：

- “禁止做 X”作为普通记忆表达，与其他语义内容保持统一结构；
- 移动记忆使用 `mv`，而不是创造 promote/migrate/replace 多套特殊动作；
- 检索优先依赖目录、摘要、grep/read 以及主模型 query refinement；
- core 仍以模型能自然理解的 Markdown 文档呈现。

每新增一个特殊结构，都意味着：

- 模型要多学一种概念；
- tool schema 变复杂；
- 状态机变复杂；
- 测试矩阵扩大；
- 更容易让机制越界替模型做语义判断。

因此默认选择通用表达。

---

## 7. 可靠性保证与真实后果匹配

对程序可以低成本、确定性保证的 invariant，应优先由机制提供结构化保证。

例如：

- public path 始终限制在合法 memory namespace；
- write / edit 保持各自明确的工具职责；
- mutation 返回 success 时，body/index/state 已形成一致且立即可读的新状态；
- protect 未确认时保持零副作用；
- global 的真实跨进程并发保持无 silent lost update。

可靠性设计应进一步按 failure class 分开定义保证，让每一类情况拥有与真实后果匹配的语义。常见类别包括：

- **正常 success**：定义成功返回后必须成立的状态；
- **可捕获 operation failure**：定义失败返回时的 rollback、零副作用或 fail-loud 语义；
- **进程强制终止 / host failure**：根据事实归属和恢复来源决定允许丢失到什么程度；
- **持久数据损坏**：定义可解析性和 invariant 被破坏时的处理方式。

每一类 failure 都先确定真实后果和所需 guarantee，再选择相应机制。这样可以把可靠性资源放在真正需要保证的地方。

例如，`brain_think` 已有明确调用纪律时，保持每次成功调用都作为有效事件即可；project/session 没有真实跨进程竞争时，进程内串行化就是与 failure domain 对齐的机制。

判断标准：

> **可靠性保证应与真实后果相匹配：需要确定性保证的地方由结构保证，允许丢失、重试、重建或上层恢复的地方明确写成边界。**

---

## 8. 认知循环优先于存储实现

brain-dsh 是模型认知运行时，不是后台数据库任务系统。

任何存储设计都必须服从模型的即时循环：

`收到用户消息 → brain_think → 带记忆继续思考 → 读/写/移动 → 继续观察和行动`

因此 mutation 必须满足 read-your-writes：

- tool 返回 success 前完成全部持久提交；
- success 后下一次 read 必须看到刚写入的新状态；
- 提交与 success 同步完成，模型观察到的始终是已提交状态。

`MutationPlan`、journal、rollback 等内部机制服务于同步提交可靠性；模型可观察语义始终保持即时、确定。

---

## 9. 渐进披露同时优化注意力效率与准确性

目标是提高单位注意力里的有效信息，并在信息压缩与语义准确之间保持清晰边界。

优先级：

> **清晰无歧义 > 去冗余 > 保守简洁。**

因此采用：

- L0：目录/候选；
- L1：摘要/必要 metadata；
- L2：正文；
- 按需 grep/read；
- 固定且简单的候选容量，而不是复杂动态预算算法。

如果压缩会让语义模糊，则宁愿多一点文本。

---

## 10. 文档与测试有不同真相层级

不同文档承担不同职责，并保持清晰、单向的真相层关系：

1. **BDD / requirements**：稳定的 What；
2. **Design**：当前确认的 How；
3. **Acceptance / Executable Specification**：把 BDD 与公开 contract 变成可执行行为规格；
4. **Fault / Invariant Tests**：验证损坏、崩溃、并发等无法只靠正常公开流程制造的故障场景；
5. **Mechanism Tests**：验证确实需要锁定的算法、纯函数或设计机制；
6. **Production code**：当前实现；
7. **Implementation review snapshot**：某个日期的实现差异；
8. **Discussion log**：历史决策轨迹与被否掉方案。

其中必须特别区分：

- **Acceptance tests 证明 BDD / public contract 的功能行为是否成立**；helper、state schema、锁、文件布局或算法函数等内部实现细节留在 Design / Mechanism 层；
- **Fault tests 可以在 Given 阶段有限白盒造出正常公开接口无法制造的损坏状态**，但 When / Then 仍应尽量验证公开行为或稳定 invariant；
- **Mechanism tests 可以跟 Design 耦合**，例如已确认需要锁定的数学公式或 parser 纯函数；BDD 功能覆盖仍由 Acceptance / Executable Specification 提供主要证据。

优先级：

```text
current BDD / confirmed public contract
> reviewed acceptance specification
> confirmed design
> fault/mechanism tests that correctly encode their own layer
> current implementation
> dated implementation snapshot
> historical discussion
```

测试的权威来自它对当前 BDD / public contract 的正确编码。若测试固化了旧错误行为或当前内部表示，应按当前需求修正测试。

历史 discussion 用于解释决策背景和被否方案；当前 baseline 始终由当前 BDD / contract / Design 等真相层定义。
## 11. Context + Failure-driven design

遇到新设计问题时，按“语境 → 后果 → 保证 → 机制”的顺序判断：

1. **背景和目的是什么？** 当前组件在整个系统中的作用是什么，真正要保障什么结果？
2. **真实使用场景是什么？** 正常路径、可预期失败和异常情况分别如何发生？
3. **事实由谁负责？** source of truth、派生状态和 recovery source 分别在哪里？
4. **失败后的真实后果是什么？** 状态可以丢失、重试、重建或由上层恢复吗？
5. **本组件需要提供什么 guarantee？** 哪些结果必须确定性成立，哪些属于明确边界？
6. **对应 failure mode 是否已经发生，或能从真实拓扑直接推出？**
7. **模型现有能力、训练先验、宿主或现有环境已经解决了哪些部分？**
8. **最小充分机制是什么？**
9. **这个机制带来的新概念、参数、状态和测试成本是否与收益匹配？**
10. **方案依据是什么？** 区分源码/真实 failure/成熟实践等直接依据，与当前工程取舍。

完成这组问题后，应能够从背景和职责边界直接解释“为什么需要这个 guarantee，以及为什么这个机制刚好足够”。如果真实后果和所需 guarantee 还说不清楚，继续补齐语境比直接增加机制更重要。

---

## 12. 设计讨论必须说明依据

提出新方案时，应区分：

- **有直接依据**：源码、已观察 failure、成熟实践、明确算法/认知机制；
- **部分依据**：原则可以支持，但具体实现是工程取舍；
- **无直接依据的落地选择**：为了当前最小可用实现做出的简单选择。

第三类应明确标记为当前工程取舍；“最佳实践”或“理论上必须”应有对应直接依据。

参数尤其如此：

- 先保证机制正确；
- 再通过真实使用标定阈值和系数；
- 参数在真实使用形成稳定结论前保持可标定，并在形成证据后再固化。

---

## 13. 验收规格先行：BDD / ATDD / Specification by Example

### 13.1 背景与目标

“测试先于代码”真正有价值的前提，是测试先来自**独立形成的行为规格**，而不是来自对当前实现结构的观察。

因此这里采用：

- **BDD / Specification by Example**：先用真实业务示例定义系统应表现出的行为；
- **ATDD**：在实现进入视野前，把这些行为整理成可审查、可执行的验收规格；
- **Black-box Acceptance Thinking**：从稳定的公开输入、输出和可观察结果表达 What；
- **Double-Loop TDD**：进入实现后，外层功能目标保持稳定，内层再按 Design 需要补 mechanism/unit tests。

目标是让测试长期回答一个简单问题：**系统是否仍满足已确认的功能行为？**

这套流程希望得到六个结果：

1. **功能覆盖先形成**：先展开 happy path、boundary、failure、concurrency、restart、corruption 等真实场景；
2. **行为规格稳定**：内部重构只要不改变公开行为，acceptance expectations 仍然成立；
3. **测试保持独立**：测试表达产品/application contract，当前实现细节留在 implementation / mechanism 层；
4. **Red 有明确含义**：production 测试失败代表实现没有满足已冻结行为；
5. **测试基础设施保持最小**：抽象从真实重复中生长，不预支未来 wiring；
6. **稳定行为、灵活脚手架**：Scenario、边界和业务 assertions 稳定，Arrange/DI/wiring 可以随实现接入调整。

### 13.2 规格先于实现

Acceptance Specification Freeze 前，功能测试设计以这些信息为主要输入：

- 已确认 BDD；
- 已确认的模型可见 / public contract；
- 真实 deployment constraints；
- 真实 failure modes 与业务边界。

测试尽量用产品语言解释完整场景。一个好的 acceptance scenario 即使换掉内部模块、存储格式、ID 算法或锁实现，仍然能说明系统应该做什么。

Engineering Design 在规格冻结后进入，用来决定 How；Design 可以指导 production 和 mechanism tests，但 acceptance expectation 仍由已经冻结的 BDD / Examples 决定。

### 13.3 Given / When / Then 的正确边界

**Given**：优先用公开 application/tool 行为建立正常前置状态。对于 BDD 已明确要求保证、但公开接口无法自然制造的 corruption、commit failure 等条件，使用最小、确定性的测试 seam 构造前置状态。当背景、职责边界和 BDD 已明确对应 guarantee 时，再为这类技术事件设计 Fault case。

**When**：经过稳定的 public application/tool contract 执行动作。CI 直接验证 application/tool 行为；真实 MCP transport 的验证方式由项目自己的 Test Strategy 决定。

**Then**：观察模型/调用方真正关心的结果，例如：

- 返回成功、失败、pending 或 signal；
- 后续 public read/discovery 能否看到正确内容；
- memory 是否仍存在、被覆盖、移动或退出 active discovery；
- learning/history 语义是否连续；
- 并发成功结果是否都可观察；
- restart 后实体是否保持独立；
- private implementation information 是否保持不可见。

验收断言优先稳定的行为关系。例如“questioned 排在 otherwise-equivalent active 之后”比固定某个内部 score 更稳定；“两条 memory 保持独立”比固定某种 ID 格式更稳定。

### 13.4 三类测试各自回答不同问题

#### A. Acceptance / Executable Specification

它回答：**功能行为是否满足 BDD？**

这是 BDD 功能覆盖的主要证据。测试从稳定 application/tool contract 出发，断言公开行为与长期 invariant。

#### B. Fault / Invariant Tests

它回答：**公开场景不容易直接制造的稳定约束是否成立？**

CI 中使用最小 deterministic seam 或 fake resource port 注入已经成为稳定 contract 的条件，例如 commit failure、corrupt persisted input、event-time rule。Fault / Invariant Test 以已经成为稳定 contract 的 guarantee 为输入；对应技术故障在 guarantee 明确后进入验证范围。需要真实 filesystem、process 或 host environment 才能验证的已规定行为，再由具体项目选择人工、integration、E2E 或其他验证方式。

#### C. Mechanism Tests

它回答：**某个已经明确属于 Design 的确定性机制是否正确？**

适合独立数学规则、pure parser、deterministic transform 等。它可以了解 Design，但与 Acceptance coverage 分工明确。

### 13.5 CI Automated：真实业务逻辑 + 假资源边界

通用流程默认规范适合进入 CI 的自动化看护。CI 测试追求：**快速、确定性、可重复、资源无关**。

推荐结构是：

```text
真实 production business/application logic
        +
minimal stub/fake resource ports
```

resource ports 包括 persistence/filesystem、process coordination、network/external service、LLM/semantic reviewer 等会创建真实外部资源的边界。

普通 object / array / Map 是正常测试数据，可以自由使用。这样 CI 能充分验证业务行为，同时保持运行环境稳定。

### 13.6 真实资源、人工、E2E 是项目自己的验证策略

某些已确认需求更适合真实 filesystem、真实多进程、restart、host wiring、人工检查或 AI semantic review。是否需要验证某类异常终止，取决于该项目是否已经把对应 durability / recovery guarantee 定义为产品职责。

这些方式是**可选验证手段**，由具体项目、成熟度和发布阶段决定，例如：

- 人工 checklist；
- 定期 integration/E2E；
- release gate；
- 独立 pipeline；
- 暂时记录为已知验证缺口。

项目采用哪一种，应记录在自己的 Acceptance Specification / Test Strategy 中。CI 使用 fake resource ports 证明的是业务逻辑；真实 adapter 的验证状态由项目自己的策略单独说明。

### 13.7 Fake Green：先验证测试脚本本身

Acceptance tests 写完后，先用**最小 Stub/Fake**完成 Self-Validation，再让 production 成为测试对象。

Fake Green 的重点是简单：

- 每个 test 只创建它真正需要的对象，例如 `{ callTool: vi.fn() }`；
- 单次交互优先固定返回值或 Stub；
- 场景确实需要跨步骤状态时，再增加最小状态 Fake；
- 只有真实、稳定、重复的创建代码出现后，再抽 helper；
- Fake 只模拟当前场景需要的 public result，并把状态与行为范围保持在该场景所需的最小程度。

Fake Green 证明 test code、fixture、matcher、参数化和场景步骤能够自洽运行；production correctness 在下一阶段才验证。

#### Mock / Stub 行为保持认知局部性

安排、执行、断言尽量靠在一起：

```ts
const sut = {
  callTool: vi.fn(),
};

sut.callTool.mockResolvedValueOnce(firstResult);
const first = await sut.callTool(...);
expect(...);

sut.callTool.mockResolvedValueOnce(secondResult);
const second = await sut.callTool(...);
expect(...);
```

这种写法让每个 mock 的含义直接对应下一步 action。场景中间增加步骤时，只需调整局部代码，不需要维护整条调用序列的心智索引。

#### 接入 production 时保持行为，调整 wiring

Fake Green 后稳定的是：

- Scenario / Example 的业务意图；
- 输入边界；
- Expected behavior；
- 核心业务 assertions。

进入 production 阶段时，可以自然调整：

- `sut` 的创建方式；
- constructor/factory 参数；
- dependency injection；
- fixture/helper；
- resource port wiring。

因此不需要为了未来“零改测试 wiring”提前设计统一 SUT Factory 或 Adapter framework。只要接入 production 时业务期望没有改变，Arrange/wiring 的调整就是正常工程工作。

### 13.8 标准流程

```text
Phase 1  BDD / Requirements
        定义 What
        ↓
Phase 2  Specification by Example
        展开完整 Given / When / Then 与关键边界
        ↓
Phase 3  Test Design Review
        审查功能维度、场景质量与可观察性
        ↓
Phase 4  Acceptance Specification Freeze
        冻结 Scenario、边界与 Expected behavior
        ↓
Phase 5  Engineering Design
        设计数据模型、状态机、并发、一致性、算法等 How
        ↓
Phase 6  CI Automated Test Draft
        写适合确定性 CI 执行的测试
        ↓
Phase 7  Acceptance Test Review
        审查功能覆盖、抽象边界、资源边界与断言价值
        ↓
Phase 8  Automated Test Self-Validation / Fake Green
        每条测试使用局部最小 Stub/Fake
        mock/stub 行为紧贴对应步骤
        ↓
================ production implementation 从这里进入工作视野 ================
        ↓
Phase 9  Production CI Red / Green
        调整 Arrange/wiring 接入真实 production business logic
        resource ports 保持 stub/fake
        Scenario 与核心 assertions 保持稳定
        ↓
Phase 10 Double-Loop TDD / Implementation
        外环 acceptance goals
        内环 mechanism/unit tests + production implementation
        ↓
Phase 11 Compliance Review
        再从 BDD / Frozen Acceptance Spec 检查功能维度与追踪关系
```

真实资源 / Manual / E2E / AI Review 是否执行、何时执行，由项目自己的 Test Strategy 决定。

### 13.9 Acceptance Specification Freeze 的质量标准

进入 production implementation 前，理想状态是：

- 每个稳定 BDD Scenario 都能映射到 acceptance / contract / fault / invariant case，并说明合适的 Verification Method；
- Scenario 名称本身能用产品语言解释；
- happy path 与关键边界都有代表性 Example；
- failure case 关注调用方可观察的 failure 与零副作用；
- normal Given 优先通过 public operations 建立；
- When 使用稳定 public application/tool contract；
- Then 关注稳定 behavior/invariant；
- 替换内部实现而保持 public behavior 时，大部分 acceptance expectations 仍然成立。

一个很有用的健康度信号是：**纯内部重构通常只需要调整测试 wiring 或 mechanism tests，而不会迫使功能 expectations 大面积变化。**

### 13.10 Coverage 以场景质量和追踪关系为依据

测试数量用于描述执行规模；功能覆盖由场景质量、边界完整性与追踪关系判断。

更有意义的链路是：

```text
REQ
→ 功能维度
→ Scenario / Example
→ boundary / failure
→ stable Given / When / Then
→ verification case
```

因此 coverage review 关注的是：场景是否完整、边界是否正确、可观察结果是否稳定，以及 BDD → Acceptance → executable tests 是否保持清晰追踪。

### 13.11 出现歧义时，先完成需求裁决

测试和实现过程中发现歧义是正常的，它通常意味着规格还可以更精确。

当 public behavior、contract boundary、verification method 或工具训练先验存在两种都合理的解释时，正确流程是：

```text
识别歧义
→ 说明两种解释及真实 failure mode
→ 与需求决策者达成一致
→ 更新 BDD / Acceptance / Design
→ 再继续测试或实现
```

这样产品语义始终由明确需求决策产生；实现、测试脚手架和工程取舍负责落实已经确定的语义。
## 14. 文档层级必须保持干净

不同文档回答不同问题：

- **BDD**：稳定的 What，描述模型可观察行为与 invariant；
- **Design**：当前确认的 How；
- **代码 / tests**：实现事实；
- **审查快照**：某个日期实现与需求的 gap，代码更新后可失效；
- **`doc/brain-dsh/archive/06`**：历史决策与被否方案，用来分析为什么，不作为现行规格源；
- **本文**：设计判断方法。

BDD 只通过明确的需求决策更新；代码变化由 Design、tests 与 implementation 层吸收和验证。

如果需求真的要变：

`讨论 → 修改 BDD → 修改 Design → 修改 tests → 修改代码`

需求变化始终从明确的需求决策开始。

---

## 15. Review Checklist

每次新增或修改设计前，至少检查：

- [ ] **背景与目的**是否清楚：这个组件处在什么系统里，真正要保障什么结果？
- [ ] **真实使用场景**是否清楚：正常路径、可预期失败和异常情况分别怎样发生？
- [ ] **职责边界**是否清楚：source of truth、recovery source、模型、宿主与本组件分别负责什么？
- [ ] **保证边界**是否清楚：success、可捕获 failure、异常终止等情况下分别需要保证到什么程度？
- [ ] 设计是否对应当前部署中真实存在或可直接推出的 failure mode？
- [ ] 是否充分复用了模型已有训练先验、宿主能力和现有环境事实？
- [ ] 新机制是否只承担可确定的结构职责，并保持语义判断在正确的责任方？
- [ ] 机制的作用域是否与真实 failure domain、事实归属和恢复责任一致？
- [ ] 新概念、新参数、新状态和测试成本是否与实际收益匹配？
- [ ] 是否满足该产品已确认的即时认知循环或其他关键用户路径？
- [ ] 方案依据是否清楚区分直接证据、部分依据和工程取舍？
- [ ] 文档内容是否位于正确真相层：BDD、Design、实现事实、审查快照或历史依据？

当这些问题能够给出一致答案时，设计通常已经具备进入 TDD 的清晰边界；若答案仍冲突，先补齐背景或完成需求裁决。
