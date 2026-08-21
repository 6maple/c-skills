#!/bin/bash
# brain-dsh-plugin build: junction-link type/runtime deps from the dsh tree and
# the pi-mp toolchain, then bundle src/ → dist/ with unbuild (pi-mp 同款).
#
# DSH trees probed (both may be present; per-package resolution prefers the
# SOURCE checkout, then falls back to the INSTALLED deployment):
#   1. DSH_CHECKOUT env pointing at a SOURCE checkout (has packages/)
#   2. the INSTALLED deployment under ~/.vite-plus/packages/@deepseek-ai/dsh/*/
#      (node_modules layout, namespaced under @deepseek-ai/) — the layout this
#      machine actually has. dev_build_plugin's detectCheckout gate can be
#      satisfied with an empty marker dir ~/dsh-harness/packages; the per-package
#      fallback then resolves everything from the installed tree.
# Toolchain (unbuild + typescript) probed from the pi-mp reference project
# (D:/Workspace/ai-projects/pi-mp) unless PI_MP overrides the base path.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

link_pkg() { # $1=local name, $2=absolute target
  local link="node_modules/$1"
  if [ -e "$link" ]; then rm -rf "$link"; fi
  mkdir -p "$(dirname "$link")"
  node -e "
    const fs = require('fs');
    const path = require('path');
    const link = path.resolve(process.argv[1]);
    const target = path.resolve(process.argv[2]);
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  " "$link" "$2"
}

# ---- locate dsh trees ----
SOURCE_TREE=""
if [ -n "${DSH_CHECKOUT:-}" ] && [ -d "$DSH_CHECKOUT/packages" ]; then
  SOURCE_TREE="$DSH_CHECKOUT"
fi
DEPLOY_TREE=""
for d in "$HOME"/.vite-plus/packages/@deepseek-ai/dsh/*/node_modules/@deepseek-ai/dsh; do
  if [ -d "$d/node_modules/@deepseek-ai/dsh-tools" ]; then DEPLOY_TREE="$d"; break; fi
done
if [ -z "$SOURCE_TREE" ] && [ -z "$DEPLOY_TREE" ]; then
  echo "build: cannot locate a dsh tree (set DSH_CHECKOUT to a source checkout, or install the deployment under ~/.vite-plus/packages/@deepseek-ai/dsh)" >&2
  exit 1
fi
echo "=== source tree: ${SOURCE_TREE:-none} | deploy tree: ${DEPLOY_TREE:-none} ==="

# ---- link dependencies (source checkout preferred, install layout fallback) ----
echo "=== Linking build dependencies ==="
mkdir -p node_modules/@deepseek-ai
resolve_pkg() { # $1=local name, $2=source path (relative to SOURCE_TREE), $3=install path (relative to DEPLOY_TREE/node_modules)
  local local_name="$1" src_path="$2" inst_path="$3"
  if [ -n "$SOURCE_TREE" ] && [ -d "$SOURCE_TREE/$src_path" ]; then
    link_pkg "$local_name" "$SOURCE_TREE/$src_path"
  elif [ -n "$DEPLOY_TREE" ] && [ -d "$DEPLOY_TREE/node_modules/$inst_path" ]; then
    link_pkg "$local_name" "$DEPLOY_TREE/node_modules/$inst_path"
  else
    echo "build: dependency missing: $local_name (looked in source $src_path and deploy $inst_path)" >&2
    exit 1
  fi
}
resolve_pkg cordis vendor/cordis @deepseek-ai/cordis
resolve_pkg cosmokit vendor/cosmokit @deepseek-ai/cosmokit
resolve_pkg schemastery vendor/schemastery @deepseek-ai/schemastery
resolve_pkg @deepseek-ai/dsh-tools packages/core/tools @deepseek-ai/dsh-tools
resolve_pkg @deepseek-ai/dsh-llm packages/llm/llm @deepseek-ai/dsh-llm
resolve_pkg @deepseek-ai/dsh-system-prompt packages/core/system-prompt @deepseek-ai/dsh-system-prompt
resolve_pkg @deepseek-ai/dsh-agent packages/core/agent @deepseek-ai/dsh-agent
resolve_pkg @deepseek-ai/dsh-session packages/core/session @deepseek-ai/dsh-session
resolve_pkg @deepseek-ai/dsh-scope packages/core/scope @deepseek-ai/dsh-scope
# @types/node + @standard-schema/spec: probe common locations
for probe in "$DEPLOY_TREE/node_modules/@types/node" "$DEPLOY_TREE/node_modules/.pnpm/@types+node@*/node_modules/@types/node"; do
  for d in $probe; do
    if [ -d "$d" ]; then link_pkg @types/node "$d"; break 2; fi
  done
done
for probe in "$DEPLOY_TREE/node_modules/@standard-schema/spec" "$DEPLOY_TREE/node_modules/.pnpm/@standard-schema+spec@*/node_modules/@standard-schema/spec"; do
  for d in $probe; do
    if [ -d "$d" ]; then link_pkg @standard-schema/spec "$d"; break 2; fi
  done
done

# ---- link the pi-mp toolchain (unbuild + typescript for its dts step) ----
PI_MP="${PI_MP:-$ROOT/../../../pi-mp}"
echo "=== toolchain base: $PI_MP ==="
UNBUILD_SRC=""
for d in "$PI_MP"/node_modules/.pnpm/unbuild@*/node_modules/unbuild "$PI_MP/node_modules/unbuild"; do
  if [ -d "$d" ]; then UNBUILD_SRC="$d"; break; fi
done
if [ -z "$UNBUILD_SRC" ]; then
  echo "build: unbuild not found under $PI_MP (set PI_MP to the reference project)" >&2
  exit 1
fi
link_pkg unbuild "$UNBUILD_SRC"
TS_SRC=""
for d in "$PI_MP"/node_modules/.pnpm/typescript@*/node_modules/typescript "$PI_MP/node_modules/typescript"; do
  if [ -d "$d" ] && [ -f "$d/bin/tsc" ]; then TS_SRC="$d"; break; fi
done
if [ -n "$TS_SRC" ]; then link_pkg typescript "$TS_SRC"; fi

# ---- build with unbuild ----
echo "=== Building src → dist (unbuild) ==="
node node_modules/unbuild/dist/cli.mjs
echo "=== Build complete ==="
