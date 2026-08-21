#!/usr/bin/env node
/**
 * router-creator 官方源更新脚本
 * ------------------------------------------------
 * 从 deepseek-ai/deepseek-harness 官方仓库拉取 __需要跟随上游__ 的文件：
 *
 *   - apps/cli/config/agent-presets/cordis/agent.cordis.yml
 *   - apps/cli/config/agent-presets/cordis/skills/cordis-plugin-development/SKILL.md
 *   - apps/cli/config/agent-presets/cordis/skills/editing-cordis-compositions/SKILL.md
 *
 * agent.cordis.yml 不是直接覆盖：会在拉到的官方文件上重新注入本地片段
 * `patches/router-bootstrap-creator.snippet.yml`（router-bootstrap-creator 行）。
 * 技能文件与官方逐字一致，直接覆盖（带备份）。
 *
 * 默认通过 https://raw.githubusercontent.com 拉取，支持代理：
 *   --proxy http://127.0.0.1:7890
 * 也支持离线模式，从本地官方仓库读取（不联网）：
 *   --local D:\Workspace\github\deepseek-harness
 *
 * 本脚本不 clone 整个仓库，只按 manifest 拉取需要的文件。
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const DEFAULT_REF = 'master'
const DEFAULT_PROXY = 'http://127.0.0.1:7890'
const RAW_BASE = 'https://raw.githubusercontent.com/deepseek-ai/deepseek-harness'
const OFFICIAL_REPO = 'https://github.com/deepseek-ai/deepseek-harness'

/**
 * manifest: [官方相对路径, 本地相对路径, 模式]
 * 模式:
 *   merge — 拉取后注入本地片段再写入
 *   copy  — 直接替换为官方内容
 */
const MANIFEST = [
  [
    'apps/cli/config/agent-presets/cordis/agent.cordis.yml',
    'agent.cordis.yml',
    'merge',
  ],
  [
    'apps/cli/config/agent-presets/cordis/skills/cordis-plugin-development/SKILL.md',
    'skills/cordis-plugin-development/SKILL.md',
    'copy',
  ],
  [
    'apps/cli/config/agent-presets/cordis/skills/editing-cordis-compositions/SKILL.md',
    'skills/editing-cordis-compositions/SKILL.md',
    'copy',
  ],
]

function printHelp() {
  console.log(`用法:
  node scripts/update-from-official.mjs [options]

选项:
  --ref <ref>        官方仓库 ref，默认 ${DEFAULT_REF}（branch/tag/commit 均可）
  --proxy <url>      代理地址，默认 ${DEFAULT_PROXY}
                     也会读取 ROUTER_UPDATE_PROXY / HTTPS_PROXY / HTTP_PROXY
  --no-proxy         不使用代理（直连；适合网络可直接访问官方仓库的环境）
  --local <path>     从本地官方仓库读取，不联网（如 D:/Workspace/github/deepseek-harness）
  --dry-run          只打印将要做什么/差异，不写文件
  --force            本地文件与上游不同时仍覆盖（仍会备份）
  --verbose          打印每个文件的哈希/长度
  -h, --help         显示帮助
`)
}

function parseArgs(argv) {
  const args = {
    ref: DEFAULT_REF,
    proxy:
      process.env.ROUTER_UPDATE_PROXY ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      DEFAULT_PROXY,
    local: null,
    dryRun: false,
    force: false,
    verbose: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--ref':
        args.ref = argv[++i]
        if (!args.ref) throw new Error('--ref requires a value')
        break
      case '--proxy':
        args.proxy = argv[++i]
        if (!args.proxy) throw new Error('--proxy requires a value')
        break
      case '--local':
        args.local = argv[++i]
        if (!args.local) throw new Error('--local requires a path')
        break
      case '--dry-run':
        args.dryRun = true
        break
      case '--no-proxy':
        args.proxy = null
        break
      case '--force':
        args.force = true
        break
      case '--verbose':
        args.verbose = true
        break
      case '-h':
      case '--help':
        printHelp()
        process.exit(0)
        break
      default:
        throw new Error(`unknown option: ${arg}`)
    }
  }
  return args
}

function fetchUrl(url, proxy) {
  const candidates = process.platform === 'win32' ? ['curl.exe', 'curl'] : ['curl']
  let last
  for (const cmd of candidates) {
    const args = ['--fail', '--silent', '--show-error', '--location', url]
    if (proxy) args.push('--proxy', proxy)
    const result = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    if (result.status === 0) return result.stdout
    last = result
  }
  throw new Error(
    `无法拉取 ${url}（curl 失败: ${last?.status ?? 'unknown'}）\n` +
      `${last?.stderr || last?.stdout || ''}`.trim(),
  )
}

async function readUpstream(rel, args) {
  if (args.local) {
    const p = join(args.local, rel)
    try {
      return await readFile(p, 'utf8')
    } catch (error) {
      throw new Error(`--local 路径缺少 ${rel}: ${error.message}`)
    }
  }
  return fetchUrl(`${RAW_BASE}/${args.ref}/${rel}`, args.proxy)
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 12)
}

function validateContent(localRel, text) {
  if (typeof text !== 'string' || text.length < 50) {
    throw new Error(`拉取内容异常（过短），拒绝写入 ${localRel}`)
  }
  if (localRel === 'agent.cordis.yml') {
    if (!text.includes('agent-instructions') || !text.includes('router-bootstrap-creator')) {
      throw new Error(`合并后的 agent.cordis.yml 缺少关键行，拒绝写入 ${localRel}`)
    }
  } else if (localRel.endsWith('/SKILL.md')) {
    if (!/^#+\s/m.test(text)) {
      throw new Error(`拉取的 SKILL.md 缺少 Markdown 标题，拒绝写入 ${localRel}`)
    }
  }
}

async function readLocalText(rel) {
  const p = join(root, rel)
  if (!existsSync(p)) return undefined
  return readFile(p, 'utf8')
}

function mergeAgent(upstream, snippet) {
  if (upstream.includes('router-bootstrap-creator')) {
    return { text: upstream, inserted: false }
  }
  const marker = '# ── shell'
  const idx = upstream.indexOf(marker)
  if (idx < 0) {
    throw new Error(
      '上游 agent.cordis.yml 中找不到 "# ── shell" 锚点；官方结构可能变了，需要人工检查后更新脚本',
    )
  }
  const text =
    upstream.slice(0, idx) +
    snippet.replace(/\s+$/, '') +
    '\n\n' +
    upstream.slice(idx)
  return { text, inserted: true }
}

async function backupIfNeeded(localRel) {
  const abs = join(root, localRel)
  if (!existsSync(abs)) return
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = join(root, '.backups', stamp)
  await mkdir(backupDir, { recursive: true })
  await copyFile(abs, join(backupDir, localRel.split('/').pop()))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const snippet = await readFile(join(root, 'patches', 'router-bootstrap-creator.snippet.yml'), 'utf8')

  console.log(
    `router-creator 更新（来源: ${args.local ? `local ${args.local}` : `${OFFICIAL_REPO} @ ${args.ref}`}）` +
      `${args.proxy && !args.local ? `，代理 ${args.proxy}` : ''}` +
      (args.dryRun ? '，DRY-RUN（不写文件）' : ''),
  )

  for (const [officialRel, localRel, mode] of MANIFEST) {
    const upstream = await readUpstream(officialRel, args)
    let next
    if (mode === 'merge') {
      const merged = mergeAgent(upstream, snippet)
      next = merged.text
      if (args.verbose) console.log(`  merge: ${officialRel} -> ${localRel} (inserted=${merged.inserted})`)
    } else {
      next = upstream
      if (args.verbose) console.log(`  copy:  ${officialRel} -> ${localRel}`)
    }

    validateContent(localRel, next)

    const local = await readLocalText(localRel)
    const changed = local !== next
    const hash = (t) => sha256(t ?? '')

    if (args.verbose) {
      console.log(`    upstream sha=${hash(next)} local sha=${hash(local)}`)
    }

    if (!changed) {
      console.log(`  ✓ 无变化 ${localRel}`)
      continue
    }

    if (args.dryRun) {
      console.log(`  ~ 将更新 ${localRel}（本地与上游不同，未写入）`)
      continue
    }

    if (local !== undefined && mode === 'copy' && !args.force) {
      console.warn(
        `  ! ${localRel} 本地与上游不同：若这是你有意修改，请先确认；备份仍会创建。`,
      )
    }

    await backupIfNeeded(localRel)
    const target = join(root, localRel)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, next, 'utf8')
    console.log(`  ✓ 已更新 ${localRel}`)
  }

  if (args.dryRun) {
    console.log('\nDRY-RUN 结束：以上均为预计变更，未写入磁盘。')
  } else {
    console.log('\n完成。备份位于 .backups/<时间戳>/（如有覆盖）。')
  }
}

main().catch((error) => {
  console.error(`更新失败: ${error.message}`)
  process.exit(1)
})