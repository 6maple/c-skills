/**
 * tool-cordis-idempotent: host-plane compatibility shim.
 *
 * 让 `cordisInspect.register` 变成幂等：同名 Host provider 已注册时跳过，
 * 未注册时正常注册。这样多个 agent preset 各自包含 `@deepseek-ai/dsh-tool-cordis`
 * 时也能在同一 DSH 进程中共存（后挂载者复用先挂载者已注册的 provider）。
 */

export const name = 'tool-cordis-idempotent'

export const inject = ['cordisInspect']

/** Per-registry patch state so multiple copies of this shim can coexist and
 *  the native `register` is restored only after the last active copy unloads. */
const patchStates = new WeakMap()

export function apply(ctx) {
  const registry = ctx.cordisInspect
  let state = patchStates.get(registry)
  if (!state) {
    state = {
      original: registry.register.bind(registry),
      active: 0,
    }
    patchStates.set(registry, state)
  }

  const { original } = state
  const patched = (registration) => {
    try {
      return original(registration)
    } catch (error) {
      if (error instanceof Error && /already registered/i.test(error.message)) {
        return () => {}
      }
      throw error
    }
  }

  registry.register = patched
  state.active += 1
  ctx.effect(() => () => {
    state.active -= 1
    if (state.active <= 0) {
      registry.register = state.original
      patchStates.delete(registry)
    }
  })
}
