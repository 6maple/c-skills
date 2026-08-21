# Agent / Crew 开发通用规则

## 1. 从业务职责开始设计

- 先定义真实业务目标与真实团队如何完成它，再映射为 Workflow、Agent、Crew、Tool、State；业务流程由真实职责决定，框架能力用于承载和实现这些职责。
- 每个 Agent 首先定义其 **认知职责（cognitive ownership）**：它最终负责形成什么判断、承担什么业务责任、向谁交接什么结果。操作步骤和 Tool 调用作为实现手段服务于这一角色职责。
- Workflow 节点定义业务阶段与交接边界；Agent 负责阶段内需要语义理解和动态判断的工作；100% 明确、稳定且可用代码表达的规则由系统实现。
- Role、Workflow、Tool 分工保持清晰：Role 定义“谁负责判断”，Workflow 定义“何时交接”，Tool 定义“有哪些能力可调用”。
- 单 Agent 能可靠完成一个完整认知职责时，优先保持单 Agent；出现明确的独立职责、独立上下文、并行研究或有价值的独立挑战需求时，再增加 Agent 或 Crew 角色。
- 每个新增机制都应对应一个已经存在的业务问题、正确性问题或真实 Eval 问题；机制的存在理由应能用一句具体的问题陈述说明。

## 2. 让 Agent 围绕问题和判断工作

- Agent 的基本研究循环应是：**形成当前最重要的问题 → 判断什么信息可能改变当前判断 → 自主选择能力获取信息 → 解释新信息意味着什么 → 更新判断 → 选择下一步最重要的问题 → 收敛**。
- Agent 继续研究的主要依据是：新增信息是否有合理可能改变当前判断、置信度、优先级、风险认识、关键不确定性或结论；Tool、预算和字段是否仍可用只作为执行条件。
- Agent 应先理解 Tool 返回的真实结果，再决定下一步；每次重要观察都应被解释为对当前问题的支持、削弱、冲突、限制或无实质影响。
- 研究中允许形成“当前公开信息无法回答”“信息存在冲突”“问题的重要性下降”等结论；这些同样是有效研究结果。
- Agent 的停止条件应使用业务语义定义，例如“当前信息已足以形成可辩护判断，且剩余重要不确定性已明确”；固定搜索次数、证据数量或字段完成度只在存在明确业务依据时使用。
- Runtime 可以保留预算、超时、上下文容量等安全边界；研究方法和业务收敛标准仍由业务语义定义。

## 3. Plan 用于约束研究空间

- Plan 应定义 **重要问题、问题为何重要、已较清楚的方向、需要重点验证的未知、继续条件和停止条件**，帮助 Agent 建立有限且相关的研究空间。
- Plan 保持为判断与收敛指南，让 Agent 根据实际结果决定下一步；Tool、Query、调用次数、委派顺序等执行动作由执行阶段动态决定。
- Plan 的完成标准应描述“主要且相互不同的重要问题已经覆盖”，并允许继续拆分在边际价值降低时自然停止。
- Plan、Agenda、Scope 等自然语言产物的简洁度优先通过职责说明和 Prompt 引导；Schema 主要校验业务有效性，字符长度只在存在明确业务或接口约束时使用。

## 4. Prompt 优先描述正确行为

- Prompt 优先明确：**目标、认知职责、当前输入、可用能力、继续研究条件、停止条件、最终业务产物及其 owner**。
- 优先使用正向行为描述，例如“当一个新问题可能实质改变判断时继续研究”“当 specialist 能增加独立专业价值时委派”，让模型明确应该做什么。
- 必要的禁止性规则主要用于 correctness boundary，例如对象隔离、权限边界、时间边界、不可逆操作和最终职责边界。
- Prompt 应指导 Agent 使用业务判断选择动作；固定 Tool 顺序、固定搜索次数或固定角色轮次仅在业务流程本身确实要求固定执行顺序时使用。
- 稳定行为规则放在固定 Prompt 中；任务数据、用户输入、当前状态和动态工作面通过独立 Context 注入。
- Prompt 的 DRY 按“语义职责”理解：避免互相矛盾或重复的规则，同时允许关键 ownership / stop-condition 在真正执行该行为的位置再次出现，以提高可靠性。
- Output Prompt 应明确正式业务结果写到哪里；当正式结果通过 Record Tool 或其他业务 commit 保存后，最终自然语言输出只承担必要的确认或展示职责。

## 5. Tool 提供业务能力，Agent 负责思考

- Tool 按 Agent 的任务语义划分，一个 Tool 完成一个明确业务动作；常见业务动作尽量由一个清晰 Tool 完成，减少 Agent 组合多个底层接口才能完成一次普通研究动作的负担。
- Tool 的名称、描述和参数应让 Agent 明确判断：**什么时候调用、需要提供什么业务信息、会得到什么类型的结果**。
- Tool 参数只表达业务动作所需语义；assignment、trace、缓存键、内部重试状态、分页状态机等 Harness 实现细节由系统绑定。
- 同名参数在不同任务中代表不同含义时，优先拆分或重命名 Tool / 参数，使语义在调用点唯一明确。
- Tool 输入输出应结构化，并明确区分：正常有数据、正常无数据、部分数据、数据冲突、数据过时、provider 失败、可修复参数错误、Harness policy 拒绝等状态。
- Harness 自己拒绝的调用保持为 Harness 执行状态；真实 provider 已被调用但没有业务数据时，形成对应的数据缺失事实。
- Tool 失败时向 Agent 返回可理解、可操作的结构化反馈；Agent 根据新信息修正参数、换路径、记录限制或停止。系统重试用于有明确工程依据的瞬态故障；路径调整、研究取舍和停止决策继续由 Agent 判断。
- 具有副作用的 Tool 明确区分查询与执行；权限校验、目标绑定、不可逆操作确认等由 Harness 保证正确性。
- 对受限对象的写入由 Harness 绑定目标和权限范围；Agent 只提供业务内容与操作意图，系统负责保持任务归属和对象身份正确。

## 6. ToolResult、Research Judgment 与正式业务结果分层

- Tool / Provider 负责返回外部世界的结构化事实、状态与限制；Agent 负责解释“这些事实对当前问题意味着什么”。
- 推荐链路：**Provider Result → bounded observation → Agent interpretation → recorded judgment → final business result**。
- ToolResult 是执行事实，Research Judgment 表达业务意义；Summary 用于上下文适配；Record Tool 保存由对应业务 owner 形成的正式业务产物。
- Specialist 返回局部问题的最佳当前答案、支持/削弱事实、冲突与限制；Primary / Owner 负责吸收结果并更新整体判断。
- 正式业务结果成功写入后，该业务 commit 是权威完成事实；后续 completion text、receipt、日志或展示处理作为独立外围步骤处理，业务 commit 保持有效。

## 7. Context 聚焦当前工作面

- **System State 与 Agent Context 分离**：系统可以保存完整执行事实，但每轮模型只应看到当前判断真正需要的工作面。
- 当前工作面通常包含：任务目标、当前业务对象、已形成的重要判断、显式不确定性、尚未被吸收的新观察，以及当前最重要的问题。
- 已被 Agent 转化并记录为 judgment 的 Tool / Specialist 执行过程，可以退出后续模型上下文；长期状态与审计信息继续保存在系统侧。
- 可重新获取或可确定性重建的信息优先按需加载，让模型 Context 持续聚焦当前工作。
- 长任务持续把已确认的研究判断和业务产物写入外部状态，使后续步骤直接从已完成事实继续。
- Context 使用渐进披露：先提供紧凑业务语义；只有当前问题需要更深资料时，再读取对应 detail。
- 上下文过大时，优先优化信息访问结构和 projection；静默字符截断或固定 top-N 仅作为明确的 runtime safety protection。

## 8. Model-visible projection 使用正向选择

- Model-visible projection 应明确列出当前 Tool / 阶段允许进入 Agent Context 的业务字段，形成稳定的 **positive projection**。
- Provider 新增字段只有在被明确认定对当前 Agent 决策有意义后才进入 projection，使模型可见数据边界稳定可审计。
- 大量原始数据优先保存在系统状态、artifact 或 provider result 中，Agent 首次看到业务摘要、计数、index 或其他轻量工作面。
- 大集合优先采用 **index / overview → Agent 提出具体问题 → targeted detail** 的访问方式，让研究问题自然缩小材料范围。
- 如果一个具体问题仍对应很多相关材料，应向 Agent 暴露真实覆盖面并允许其进一步细化问题；固定 top-K 或 max-chars 只作为明确的 runtime safety protection，业务重要性仍由研究问题与 Agent 判断决定。

## 9. Summary / Digest 只承担上下文适配

- Summary / Digest 的主要职责是把一份过长、无法直接消费的单一材料转换为围绕当前目的的可读材料。
- Digest 保持 source-bounded：只基于原材料保留事实、限定条件和不确定性；最终业务判断由对应业务 Agent 形成。
- 多来源之间的重要性比较、冲突解释、商业含义和最终综合判断由负责该认知职责的 Agent 完成。
- 同一份材料可以围绕不同研究问题重新读取或生成 purpose-bound digest；材料身份负责定位内容，当前 research question 负责定义本次阅读目的。

## 10. State 只保存唯一业务事实

- 一个业务事实选择一个 authoritative owner 和 canonical state；其他 Agent working view、board、packet、summary 尽量由 canonical state 确定性 projection 得到。
- 可以完全由已有 Graph / Workflow State 重建的 projection 通常按需生成，减少双写、同步和“哪个版本才是最新”的问题。
- Harness 自动保存并绑定任务归属、权限、预算、trace、provider 状态、来源时间、artifact、执行状态等系统事实；Agent 的最终输出聚焦业务内容。
- Agent 保存研究意义：finding、interpretation、impact、limitation、unresolved question、conclusion 等需要语义判断的结果。
- 业务中间判断在适当的语义 commit 点写入状态；最终文本可以基于状态展示，但不承担唯一进度存储职责。

## 11. 上下游 Agent 以业务交接协作

- 上游节点完成其职责后，下游默认把上游研究判断作为可信的工作起点，并在自己更高一级或不同职责范围内继续研究。
- 下游需要更高确定性时，直接补充当前职责真正需要的新资料，并以自己的职责形成进一步判断。
- Agent 间 handoff 优先传递研究语义：**观察、解释、初步判断、限制、待研究问题**；完整 Tool history、trace、raw result 继续留在系统审计层并按真实需要读取。
- 不同阶段需要的信息强度与完整度应与阶段职责匹配：早期发现允许保留假设与限制，深入研究再补充会实质改变下一阶段判断的信息。

## 12. Crew 协作按真实需求发生

- Crew 中始终明确一个最终业务 owner；其他角色围绕独立认知职责提供增量价值。
- Primary / Owner 承担主要工作和最终判断；Specialist 在一个明确、局部、值得专业投入的问题上提供支持，完成后把判断 ownership 交回 Primary。
- Delegation 由当前问题的价值驱动：当独立专业知识、深层材料研究、不同视角或事实澄清能实质提高判断质量时委派。
- Crew 中各角色的参与频率由业务问题与增量价值决定。
- 独立挑战角色保持独立视角，重点寻找可能改变已有判断的重要反例、替代解释或遗漏风险，并把研究投入集中在这些挑战点。
- Crew 的 Planner、Specialist、Challenger 等角色各自保持窄而明确的 cognitive ownership，避免多个角色同时拥有同一个最终结论。

## 13. Schema、Guardrail 与 Harness 保护 correctness

- Schema 用来表达有效业务结构和不可违反的数据不变量；Prompt 用来引导质量、风格、简洁度和研究行为。
- 判断一个硬限制是否应进入 Schema 时，优先问：“超过这个限制后，业务语义本身是否变成非法状态？”答案为“是”时，适合作为阻断性业务校验。
- 对权限、对象隔离、租户隔离、不可逆操作、身份、时间边界、预算和其他 correctness invariant 使用明确硬约束。
- 对自然语言长度、资料数量、来源数量、研究轮数等不直接决定业务正确性的属性，优先使用职责、Prompt、projection、预算或 runtime safety boundary 管理。
- 可修复参数和格式问题尽量在调用发生处反馈，让 Agent 当场修正；正式业务 commit 成功后，外围格式或展示问题按独立问题处理。
- 缺失、partial、stale、conflict 等业务数据状态应作为研究边界披露，并允许 Agent 判断它们是否足以影响当前结论。

## 14. 业务数据、审计 provenance 与展示引用分离

- 业务数据回答“Agent 做当前判断需要知道什么”；系统审计回答“数据如何取得、何时取得、由哪个 provider / Tool 产生”；展示引用回答“最终用户如何查看支持来源”。
- 三层可以关联，同时保持各自职责独立；业务研究以实际业务数据及其限制为依据，展示引用用于增强可验证性和可信度。
- Provider/source time、trace、raw artifact 等细节默认由系统保存；当这些属性本身会影响当前业务判断时，再投影给 Agent。
- Evidence / provenance 机制优先增强可审计性和可信展示，同时保持业务研究能够显式携带 limitation 并继续完成自己的职责。

## 15. 优先修正 root cause，再增加编排机制

- Agent 行为异常时，按以下顺序定位：**业务目标 → 角色 ownership → Prompt → Agent Context → Tool contract / projection → State ownership → 最后才考虑新增 orchestration mechanism**。
- Agent 重复搜索时先检查问题定义、已有 judgment 是否进入当前工作面、Tool 语义是否清晰；上下文过大时先检查 projection 和访问模式；协作混乱时先检查角色 ownership。
- Scheduler、History、Memory、Registry、Knowledge Graph、额外 Reviewer、自动 Summary 等机制的引入条件是：更简单的职责 / Prompt / Context / Tool 修正已经不足以解决被真实任务验证的问题。
- 已有稳定行为和真实成功案例是设计证据；修改前先找出成功或失败行为产生的原因，再决定最小改动。

## 16. 测试契约，真实 Replay 验证行为

- Unit / integration test 主要验证：状态归属、scope isolation、Tool contract、schema、projection、routing、record ownership、错误分类和确定性逻辑。
- 真实 Agent / Crew 行为通过代表性 replay / eval 验证，包括：研究路径、Tool 选择、判断更新、上下文增长、角色协作、停止原因和最终业务产物。
- 解读 replay 时以节点业务职责判断结果：先确认该阶段真正应该产生什么业务产物，再解释 status、日志、parse failure、Tool error 或后续节点字段。
- 区分 **业务 commit 前失败** 与 **业务 commit 后外围失败**；两者使用不同修复策略。
- 每次真实 Eval 暴露问题后，先结合节点职责解释实际行为和 root cause，再决定是否修改架构；异常指标作为定位线索使用。
- 新增 Harness、Tool、Context、Prompt 或 Agent Loop 机制后，应能通过真实任务 Eval 说明它改善了什么；复杂度只有在能够稳定解决真实问题时保留。

## 17. 三个通用设计检查问题

设计或评审任何 Agent 机制时，优先回答：

1. **这是已经存在的业务 / correctness 需求，还是框架能力诱导出来的需求？**
2. **这个信息真的应该进入 Agent 当前工作面，还是只需要由系统保存？**
3. **这个机制是在帮助 Agent 做判断，还是已经替 Agent 做了本应由它负责的判断？**

总体目标：**业务职责真实、Agent 判断自主、上下文保持当前且有界、系统状态可信、协作按需发生、机制数量与真实问题匹配。**
