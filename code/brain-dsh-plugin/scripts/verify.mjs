/**
 * brain-dsh-plugin 本地验证（构建后、注入前运行：node scripts/verify.mjs）。
 *
 * Part A — 假 server：验证 InstanceManager 的 spawn / tools/list / call /
 *   timeout / abort / 崩溃重启冷却 / 崩溃风暴熔断。
 * Part B — 真 server：连接 brain-dsh dist，断言 8 工具名与 vendored 契约一致，
 *   且 brain_think（无参）返回 source: default。
 *
 * 通过输出 PASS 清单；任一失败 exit 1。
 */
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { InstanceManager, BRAIN_TOOLS } from '../dist/index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLUGIN = join(HERE, '..')
const VERIFY_DIR = join(PLUGIN, '.verify')
const results = []
const ok = (name) => results.push(`PASS ${name}`)
const fail = (name, detail) => results.push(`FAIL ${name}: ${detail}`)

/** Minimal MCP server used to exercise the client/manager without brain-dsh. */
function writeFakeServer(target) {
  const source = `import { createInterface } from 'node:readline'
const rl = createInterface({ input: process.stdin })
let id = 0
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\\n') }
rl.on('line', (line) => {
  if (!line.trim()) return
  const msg = JSON.parse(line)
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'fake-brain', version: '0.0.1' } } })
  } else if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: [
      { name: 'brain_think', description: 'fake think', inputSchema: { type: 'object', properties: { session_id: { type: 'string' } } } },
      { name: 'brain_write', description: 'fake write', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
      { name: 'brain_slow', description: 'sleeps', inputSchema: { type: 'object', properties: {} } },
      { name: 'brain_crash', description: 'exits', inputSchema: { type: 'object', properties: {} } },
    ] } })
  } else if (msg.method === 'tools/call') {
    const name = msg.params.name
    if (name === 'brain_crash') { process.exit(1) }
    if (name === 'brain_slow') { setTimeout(() => send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'slow done' }] } }), 5000); return }
    send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: '(session: fake; source: default) ' + name }] } })
  }
})`
  writeFileSync(target, source, 'utf8')
}

async function main() {
  rmSync(VERIFY_DIR, { recursive: true, force: true })
  mkdirSync(VERIFY_DIR, { recursive: true })
  const fakeServer = join(VERIFY_DIR, 'fake-server.mjs')
  writeFakeServer(fakeServer)
  const fakeRoot = join(VERIFY_DIR, 'fake-root')
  mkdirSync(fakeRoot, { recursive: true })

  // ---- Part A: fake server ----
  const mgr = new InstanceManager({
    command: process.execPath,
    args: [fakeServer],
    timeoutMs: 2000,
    home: join(VERIFY_DIR, 'fake-home'),
    askLongTerm: 'none',
  })

  try {
    const tools = await mgr.tools(fakeRoot)
    const names = [...tools.keys()]
    if (names.join(',') === 'brain_think,brain_write,brain_slow,brain_crash') ok('A1 tools/list')
    else fail('A1 tools/list', names.join(','))
  } catch (e) { fail('A1 tools/list', String(e)) }

  try {
    const r = await mgr.call(fakeRoot, 'brain_think', {})
    const text = r.content?.[0]?.text ?? ''
    if (text === '(session: fake; source: default) brain_think') ok('A2 call roundtrip')
    else fail('A2 call roundtrip', text)
  } catch (e) { fail('A2 call roundtrip', String(e)) }

  // timeout: separate manager with a small budget
  const mgrTimeout = new InstanceManager({
    command: process.execPath, args: [fakeServer], timeoutMs: 300,
    home: join(VERIFY_DIR, 'fake-home'), askLongTerm: 'none',
  })
  try {
    await mgrTimeout.call(fakeRoot, 'brain_slow', {})
    fail('A3 timeout', 'call unexpectedly succeeded')
  } catch (e) {
    if (/timed out/.test(String(e))) ok('A3 timeout')
    else fail('A3 timeout', String(e))
  }

  // abort: pre-aborted signal must reject immediately
  const aborted = new AbortController()
  aborted.abort()
  try {
    await mgr.call(fakeRoot, 'brain_slow', {}, aborted.signal)
    fail('A4 abort', 'call unexpectedly succeeded')
  } catch (e) {
    if (/aborted/.test(String(e))) ok('A4 abort')
    else fail('A4 abort', String(e))
  }

  // crash → cooldown → respawn → crash storm guard
  try {
    await mgr.call(fakeRoot, 'brain_crash', {})
    fail('A5 crash', 'call unexpectedly succeeded')
  } catch (e) {
    if (/exited/.test(String(e))) ok('A5 crash surfaced')
    else fail('A5 crash surfaced', String(e))
  }
  try {
    await mgr.call(fakeRoot, 'brain_crash', {})
    fail('A6 cooldown', 'call unexpectedly succeeded')
  } catch (e) {
    if (/restarted too recently/.test(String(e))) ok('A6 cooldown')
    else fail('A6 cooldown', String(e))
  }
  // respawn after cooldown works, then crash again twice → storm guard refuses
  let stormRefused = false
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 1100))
    try {
      await mgr.call(fakeRoot, 'brain_crash', {})
    } catch (e) {
      if (/refusing to restart/.test(String(e))) { stormRefused = true; break }
    }
  }
  if (stormRefused) ok('A7 crash storm guard')
  else fail('A7 crash storm guard', 'storm guard never refused')
  mgr.dispose()
  mgrTimeout.dispose()

  // ---- Part B: real brain-dsh ----
  const dist = join(PLUGIN, '..', 'brain-dsh', 'dist', 'index.mjs')
  if (!existsSync(dist)) {
    fail('B0 brain-dsh dist', `missing: ${dist}`)
  } else {
    const realRoot = join(VERIFY_DIR, 'real-root')
    mkdirSync(realRoot, { recursive: true })
    const mgrReal = new InstanceManager({
      command: process.execPath, args: [dist], timeoutMs: 5000,
      home: join(VERIFY_DIR, 'real-home'), askLongTerm: 'none',
    })
    try {
      const tools = await mgrReal.tools(realRoot)
      const liveNames = [...tools.keys()].sort()
      const vendoredNames = BRAIN_TOOLS.map((t) => t.name).sort()
      if (JSON.stringify(liveNames) === JSON.stringify(vendoredNames)) ok('B1 tool names match vendored')
      else fail('B1 tool names match vendored', `live=${liveNames.join(',')} vendored=${vendoredNames.join(',')}`)
      const liveThink = tools.get('brain_think')?.inputSchema ?? {}
      const props = Object.keys(liveThink.properties ?? {})
      if (props.includes('session_id') && props.includes('project_root')) ok('B2 brain_think schema has session_id/project_root')
      else fail('B2 brain_think schema', props.join(','))
      const r = await mgrReal.call(realRoot, 'brain_think', {})
      const text = r.content?.map((b) => b.text ?? '').join('\n') ?? ''
      if (text.includes('(session: default; source: default')) ok('B3 brain_think default session line')
      else fail('B3 brain_think default session line', text.split('\n').find((l) => l.includes('(session:')) ?? text.slice(0, 200))
    } catch (e) {
      fail('B real server', String(e))
    }
    mgrReal.dispose()
  }

  rmSync(VERIFY_DIR, { recursive: true, force: true })
  console.log(results.join('\n'))
  const failed = results.filter((r) => r.startsWith('FAIL'))
  console.log(failed.length === 0 ? '\nALL PASS' : `\n${failed.length} FAILED`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
