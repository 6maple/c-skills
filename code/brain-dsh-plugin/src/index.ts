/**
 * @dsh-external/brain-dsh-plugin — brain-dsh 记忆系统 DSH 原生插件。
 *
 * 薄包装：按项目根懒 spawn brain-dsh（MCP stdio），把 8 个 brain_* 工具注册进
 * dsh-tools 注册表，并把当前 DSH 会话 id 注入 brain_think 的 session_id
 * （优先级：模型显式传参 > 注入的会话 id > 服务端 default）。
 *
 * 会话/项目解析（宿主直读，无需 _meta）：
 * - 会话 id：exec.agent.id
 * - 项目根：exec.agent.session.header.cwd（DSH 会话创建时校验写入），
 *   缺失时回退 config.brain.projectRoot
 *
 * 资源注册全部挂 ctx.effect（热重载/卸载自动清理）。
 */
import type { Context } from 'cordis'
import z from 'schemastery'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { JsonSchemaNode, ToolRunContext } from '@deepseek-ai/dsh-tools'
import { setupAutoThink } from './autothink.js'
import { InstanceManager } from './instances.js'
import { extractText } from './mcp.js'
import { BRAIN_TOOLS, type BrainToolSpec } from './tools.js'

// Programmatic surface (verification scripts / embedding): the manager, the
// vendored contracts, and the result renderer.
export { InstanceManager } from './instances.js'
export { BRAIN_TOOLS, type BrainToolSpec } from './tools.js'
export { extractText } from './mcp.js'

export const name = '@dsh-external/brain-dsh-plugin'
export const inject = ['tools', 'agents']

export interface Config {
  server: {
    command: string
    args: string[]
    timeoutMs: number
  }
  brain: {
    /** Fixed project root override; default resolves from the session cwd per call. */
    projectRoot?: string
    /** Global memory root; default ~/.brain-data. */
    home: string
    askLongTerm: string
  }
  injectSessionId: boolean
  /**
   * 是否把 brain_think 注册给模型（默认开放）。
   * 注意：当 autoThink.enabled 开启（宿主自动注入）时，brain_think 自动对模型隐藏
   * （避免模型重复调用），即实际注册条件 = exposeThink && !autoThink.enabled。
   * DSH 部署下 autoThink 默认开启 → brain_think 默认不开放，由自动注入接管。
   */
  exposeThink: boolean
  autoThink: {
    /** 收到用户消息后自动调用 brain_think 并注入模型上下文（默认开启）。 */
    enabled: boolean
    /** 自动注入的单次调用超时（默认 5s；超时静默跳过，不阻塞 step）。 */
    timeoutMs: number
  }
}

export const Config = z.object({
  server: z.object({
    command: z.string().default('node'),
    args: z.array(z.string()).default([]),
    timeoutMs: z.number().default(30_000),
  }),
  brain: z.object({
    projectRoot: z.string().default(''),
    home: z.string().default(''),
    askLongTerm: z.string().default('none'),
  }),
  injectSessionId: z.boolean().default(true),
  exposeThink: z.boolean().default(true),
  autoThink: z.object({
    enabled: z.boolean().default(true),
    timeoutMs: z.number().default(5000),
  }),
})

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: 'object',
  properties: { content: { type: 'array', items: {} } },
  required: ['content'],
  additionalProperties: false,
}

/** Whether a vendored tool declares `session_id` (only brain_think does today). */
function declaresSessionId(spec: BrainToolSpec): boolean {
  const properties = spec.parameters.properties as Record<string, unknown> | undefined
  return typeof properties === 'object' && properties !== null && 'session_id' in properties
}

/** Per-call project root: session cwd first, config override as fallback. */
export function resolveProjectRoot(agent: Agent | undefined, config: Config): string {
  const cwd = agent?.session?.header?.cwd
  if (cwd) return cwd
  if (config.brain.projectRoot) return config.brain.projectRoot
  throw new Error(
    'brain: cannot determine project root — no session cwd available and brain.projectRoot is not configured',
  )
}

/**
 * Model args → wire args. Injects the caller's session id into tools that
 * declare `session_id`, only when the model did not pass one explicitly.
 */
function buildCallArgs(
  args: unknown,
  agent: Agent | undefined,
  config: Config,
  injectable: boolean,
): Record<string, unknown> {
  const raw = (typeof args === 'object' && args !== null ? args : {}) as Record<string, unknown>
  const out: Record<string, unknown> = { ...raw }
  if (config.injectSessionId && injectable && agent && typeof out.session_id !== 'string') {
    out.session_id = agent.id
  }
  return out
}

export function apply(ctx: Context, config: Config): void {
  // ---- resolve the brain-dsh server entry ----
  // lib/ sits one level below the package root; the sibling project is at
  // <pkg>/../brain-dsh, so the dist entry is lib/../../brain-dsh/dist/index.mjs.
  const pluginLibDir = dirname(fileURLToPath(import.meta.url))
  const defaultServerPath = join(pluginLibDir, '..', '..', 'brain-dsh', 'dist', 'index.mjs')
  const serverArgs = config.server.args.length > 0 ? [...config.server.args] : [defaultServerPath]
  if (config.server.args.length === 0 && !existsSync(defaultServerPath)) {
    throw new Error(
      `brain-dsh-plugin: brain-dsh dist not found at ${defaultServerPath} — build brain-dsh first ` +
        '(cd ../brain-dsh && vp pack), or point server.args at the built entry explicitly',
    )
  }
  const command = config.server.command === 'node' ? process.execPath : config.server.command
  const home = config.brain.home || join(homedir(), '.brain-data')

  const manager = new InstanceManager({
    command,
    args: serverArgs,
    timeoutMs: config.server.timeoutMs,
    home,
    askLongTerm: config.brain.askLongTerm === 'protect' ? 'protect' : 'none',
  })
  ctx.effect(() => () => manager.dispose(), 'brain-dsh: instances')

  // ---- register brain_* tools (vendored contracts, lazy instances) ----
  // brain_think 的实际注册条件 = exposeThink && !autoThink.enabled：
  // 自动注入开启时它对模型隐藏（宿主接管），关闭时才开放给模型手动调。
  const exposeThink = config.exposeThink && !config.autoThink.enabled
  const registered: string[] = []
  for (const spec of BRAIN_TOOLS) {
    if (spec.name === 'brain_think' && !exposeThink) continue
    const injectable = declaresSessionId(spec)
    registered.push(spec.name)
    ctx.effect(
      () =>
        ctx.tools.register({
          name: spec.name,
          description: spec.description,
          parameters: spec.parameters,
          output: {
            schema: OUTPUT_SCHEMA,
            render: (_args: unknown, value: { content?: Array<{ type: string; text?: string }> }) => [
              { type: 'text' as const, text: extractText(value.content, spec.name) },
            ],
          },
          async execute(args: unknown, exec: ToolRunContext) {
            const projectRoot = resolveProjectRoot(exec.agent, config)
            const callArgs = buildCallArgs(args, exec.agent, config, injectable)
            const result = await manager.call(projectRoot, spec.name, callArgs, exec.signal)
            if (result.isError === true) throw new Error(extractText(result.content, spec.name))
            return { content: result.content }
          },
        }),
      `brain-dsh: ${spec.name}`,
    )
  }

  // ---- 自动注入：收到用户消息后自动 brain_think + 注入模型上下文 ----
  ctx.effect(
    () =>
      setupAutoThink(
        ctx,
        manager,
        { enabled: config.autoThink.enabled, timeoutMs: config.autoThink.timeoutMs },
        (agent) => resolveProjectRoot(agent, config),
      ),
    'brain-dsh: auto-think',
  )

  ctx.logger.info(
    `brain-dsh-plugin: ${registered.length} tools registered (${registered.join(', ')}); ` +
      `server ${command} ${serverArgs.join(' ')}, home=${home}, injectSessionId=${config.injectSessionId}, ` +
      `exposeThink=${exposeThink}, autoThink=${config.autoThink.enabled}`,
  )
}
