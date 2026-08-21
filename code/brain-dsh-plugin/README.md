# @dsh-external/brain-dsh-plugin

brain-dsh 记忆系统 DSH 原生插件：按项目根懒 spawn brain-dsh（MCP stdio），注册 7 个
`brain_*` 操作工具（**`brain_think` 默认不对模型开放**），并由宿主**自动注入**接管
brain_think：收到用户消息后自动调用并把结果注入模型上下文。

配套项目：`code/brain-dsh`（MCP server，本插件零改动 spawn 其 `dist/index.mjs`）。

## 设计要点

- **会话接线（宿主直读，无需 `_meta`）**：每次工具调用从执行上下文取
  `exec.agent.id`（当前会话 UUID）；项目根取
  `exec.agent.session.header.cwd`（DSH 会话创建时校验写入），`config.brain.projectRoot` 兜底。
- **自动注入（autoThink，默认开）**：`system-prompt/assemble` 时扫描会话事件流，
  以 `agent/inbox/spliced` 事件中 `data.inserted[].source.kind === 'user'` 识别
  **真正收到的用户消息**（已用真实会话数据验证；steer 等用户输入同样触发；
  inject/plugin 注入不触发；消息被 step 取走的 `removedCount` splice 不触发）；
  发现新用户消息 → 自动调用 `brain_think`（session_id = 当前会话）→ 结果在
  `agent/pre-step` 构造成 **user 消息**（自定义 source）push 进 messages
  （AGENTS.md 同款消息通道，非 contexts 条目——来源显示
  `上下文注入 @dsh-external/brain-dsh-plugin`，不占用 contexts 列表、不归因 system-prompt）。
  **每条新用户消息必定注入**（内容相同也输出，think 每次调用推进 tick）；
  同一条消息的多步工具循环只注入一次（消息级去重）。
- **brain_think 工具面**：实际注册条件 = `exposeThink && !autoThink.enabled`——
  自动注入开启时对模型隐藏（宿主接管，避免双调）；关闭自动注入后开放给模型手动调
  （brain-dsh 工具描述明确要求"每条用户消息后立即调用一次"）。
- **每项目一实例**：`InstanceManager` 按项目根懒 spawn brain-dsh 进程，崩溃 1s 冷却后
  自动重启，10s 内崩溃 >3 次熔断并给模型明确报错；插件 dispose 时全杀。
- **工具契约静态 vendored**（`src/tools.ts`，与 brain-dsh `src/index.ts` 逐字对齐）：
  模型在任何 server spawn 之前就能看到工具；`scripts/verify.mjs` 会连接真 server
  交叉核对工具名与 schema，防漂移。
- 客户端为裸 MCP JSON-RPC over stdio（无 SDK 依赖），协议面极小且已实测。

## 配置（Config）

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `server.command` | `node` | server 启动命令（`node` 映射为当前进程的 node） |
| `server.args` | `[]` | 为空时自动用 `<插件>/../brain-dsh/dist/index.mjs`；启动时校验存在 |
| `server.timeoutMs` | `30000` | 单次 tools/call 超时 |
| `brain.projectRoot` | 会话 cwd | 固定项目根覆盖（多项目部署一般不需要） |
| `brain.home` | `~/.brain-data` | 全局层记忆根（`@global/` 与 `@core/global.md`） |
| `brain.askLongTerm` | `none` | `protect` 时非会话层写需两段式确认（brain-dsh 服务端支持） |
| `injectSessionId` | `true` | 是否把当前会话 id 注入 `brain_think` |
| `exposeThink` | `true` | 是否开放 brain_think 给模型（实际条件 = `exposeThink && !autoThink.enabled`） |
| `autoThink.enabled` | `true` | 收到用户消息后自动 think + 注入模型上下文 |
| `autoThink.timeoutMs` | `5000` | 自动注入单次调用超时（超时静默跳过，不阻塞 step） |

## 构建与注入

```bash
bash scripts/build.sh          # junction link 依赖 + unbuild 打包 src → dist（发布用）
node node_modules/unbuild/dist/cli.mjs --stub   # 开发态：生成 jiti stub（src 即产物）
node scripts/verify.mjs        # 本地验证（假 server 单测 + 真 server 冒烟）
npm pack                       # 产物 tgz（发布用）
```

- **开发默认走 stub 模式**（`unbuild --stub`）：dist/index.mjs 是 jiti stub，运行时实时转译
  `src/`——**改源码无需重新构建**，宿主侧 `dev_reload_package brain-dsh-plugin`
  （清缓存重新 import）即可生效。stub 引用 jiti 绝对路径（来自 pi-mp 工具链），
  仅限开发态；**发布/部署必须真 build**（`unbuild` → dist 完整产物 → npm pack）。
- **unbuild 关联构建**（参考 `D:/Workspace/ai-projects/pi-mp` 的
  `packages/workflow/build.config`；注意 unbuild 3.x 的标准配置文件名是
  **build.config.ts**，不是 unbuild.config.ts）：单入口 `dist/index.mjs` +
  `dist/index.d.mts`；`externals` 声明宿主提供/仅类型使用的包
  （cordis、schemastery、`@deepseek-ai/*`），运行时依赖经 junction links 解析。
- build.sh 自动探测 dsh 树：`DSH_CHECKOUT`（源码 checkout）→ 本机安装树
  （`~/.vite-plus/packages/@deepseek-ai/dsh/*/`）；unbuild + typescript 从
  pi-mp 参考项目链接（`PI_MP` 环境变量可覆盖基准路径）。
- 本机无源码 checkout 时，`dev_build_plugin` 的 detectCheckout 门禁需要空 marker
  目录 `~/dsh-harness/packages`（build.sh 的逐包回退会从安装树解析全部依赖）。
- 注入器环境内：`dev_build_plugin` → `dev_inject_plugin`（运行时）→
  `dev_install_package`（持久化：profile dependencies link + `dsh.profile.bundles`）。
- **重启装配**：本包自带 `cordis.patch.yml`（`dsh.bundle.patch` 声明，与
  dsh-super-injector 同构），boot 时由 dsh-app-boot 按 bundles 顺序装配；
  已用 `dsh --profile web --dump-config` 验证组合树。
- 卸载：`dev_uninject_plugin`（工具注销 + 进程全杀 + junction 清理，卸载即净；
  会在 profile patch 写 `disabled` 条目，重新安装后需手动移除该条目）。

## 验证记录

| 项 | 结果 |
| --- | --- |
| 假 server：tools/list / call / timeout / abort / 崩溃冷却 / 熔断 | ✅ |
| 真 server：8 工具名与 vendored 一致、brain_think schema 含 session_id | ✅ |
| 真 server：`brain_think` 无参 → `(session: default; source: default ...)` | ✅ |
| 注入后真实会话（子代理实测）：`brain_think` 无参 → `(session: 7627ba60-…; source: argument; …)` | ✅ 会话 id 注入生效 |
| 注入后真实会话：write（99B）/ cat（L1）/ grep / rm 全链路 | ✅ |
| **自动注入实测**：用户消息后 `[brain memory auto-refresh]` 进入模型上下文，session 行 = 当前会话 UUID + `source: argument`，`state.json tick` 推进，server 进程存活 | ✅ |
| **工具面**：autoThink 开启时 brain_think 隐藏（7 工具），模型无手动 think 入口 | ✅ |
| 卸载即净（无孤儿 brain-dsh 进程） | ✅ |
| 重启装配（`dsh --profile web --dump-config` 组合树含 brain-dsh-plugin） | ✅ |

## 注意

- **依赖 brain-dsh 的 dist**：brain-dsh 更新后需先重建（`cd ../brain-dsh && vp pack`），
  否则插件启动报错（路径明确）。
- **自动注入对每条用户消息触发一次 think**（时间轴 tick 推进，符合 brain-dsh 设计）；
  子代理输入非用户消息（source.kind ≠ user）不触发。
- 会话 cwd 非项目根时 `.brain-data` 落在该 cwd 下，可用 `brain.projectRoot` 覆盖。
