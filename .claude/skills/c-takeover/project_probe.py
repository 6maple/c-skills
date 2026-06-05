#!/usr/bin/env python3
"""c-takeover private project probe.

Stdlib-only, cross-platform, rule-driven.
Only this script may read/write the configured project-probe cache.
AI must consume stdout only.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

SCHEMA = 3
VERSION = "3.0.0"
CONFIG = Path(".claude/skills/c-shared/config.md")
DEFAULT_DATA_DIR = Path(".cache/c-skills-data")
DEFAULT_CACHE = DEFAULT_DATA_DIR / "project-probe.json"


def extract_config_block(text: str) -> str:
    m = re.search(r"<config\b[^>]*>.*?</config>", text, re.DOTALL)
    return m.group(0) if m else ""


def configured_data_dir() -> Path:
    try:
        block = extract_config_block(CONFIG.read_text(encoding="utf-8"))
        if not block:
            return DEFAULT_DATA_DIR
        root = ET.fromstring(block)
        value = root.findtext("./runtime/data_dir")
        return Path(value.strip()) if value and value.strip() else DEFAULT_DATA_DIR
    except Exception:
        return DEFAULT_DATA_DIR


def configured_cache_path() -> Path:
    return configured_data_dir() / "project-probe.json"


CACHE = configured_cache_path()
RULES = Path(__file__).with_name("project_probe_rule.json")
MAX_READ = 512_000
MAX_GLOB_META = 80
IGNORE = {
    ".git",
    ".hg",
    ".svn",
    ".claude",
    ".agents",
    "node_modules",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".gradle",
    ".dart_tool",
    ".next",
    ".nuxt",
    "dist",
    "build",
    "target",
    "coverage",
}


def jload(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must be an object")
    return data


def sha(data: Any) -> str:
    raw = json.dumps(
        data, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode()
    return hashlib.sha256(raw).hexdigest()


def rel(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def ignored(path: Path) -> bool:
    return bool(set(path.parts) & IGNORE)


def safe_glob(root: Path, pattern: str) -> list[Path]:
    try:
        it = (
            root.rglob(pattern[3:]) if pattern.startswith("**/") else root.glob(pattern)
        )
        out: list[Path] = []
        for p in it:
            try:
                r = p.relative_to(root)
            except ValueError:
                continue
            if ignored(r):
                continue
            if p.is_file() or p.is_dir():
                out.append(p)
            if len(out) >= 10_000:
                break
        return sorted(out, key=lambda x: rel(x, root))
    except OSError:
        return []


def read_text(root: Path, p: str) -> str:
    f = root / p
    if not f.is_file():
        return ""
    try:
        return f.read_bytes()[:MAX_READ].decode("utf-8", errors="replace")
    except OSError:
        return ""


def read_json(root: Path, p: str) -> dict[str, Any]:
    try:
        data = json.loads(read_text(root, p))
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def package_scripts(root: Path, p: str) -> dict[str, str]:
    data = read_json(root, p)
    scripts = data.get("scripts")
    return scripts if isinstance(scripts, dict) else {}


def contains(root: Path, path: str, regex: str) -> bool:
    txt = read_text(root, path)
    if not txt:
        return False
    try:
        return re.search(regex, txt) is not None
    except re.error:
        return False


def cond(root: Path, c: dict[str, Any]) -> bool:
    if "path" in c:
        return (root / str(c["path"])).exists()
    if "glob" in c:
        return bool(safe_glob(root, str(c["glob"])))
    if "file_contains" in c:
        s = c["file_contains"]
        return isinstance(s, dict) and contains(
            root, str(s.get("path", "")), str(s.get("regex", "a^"))
        )
    if "json_script" in c:
        s = c["json_script"]
        return isinstance(s, dict) and str(s.get("name", "")) in package_scripts(
            root, str(s.get("path", "package.json"))
        )
    return False


def match(root: Path, rule: dict[str, Any]) -> bool:
    any_ = rule.get("any")
    all_ = rule.get("all")
    if any_ is not None and not any(cond(root, x) for x in any_ if isinstance(x, dict)):
        return False
    if all_ is not None and not all(cond(root, x) for x in all_ if isinstance(x, dict)):
        return False
    return any_ is not None or all_ is not None


def meta(root: Path, patterns: list[str]) -> dict[str, Any]:
    m: dict[str, Any] = {}
    for pat in sorted(set(patterns)):
        if any(x in pat for x in "*?["):
            files = [p for p in safe_glob(root, pat) if p.exists()]
            rows, size, mt = [], 0, None
            for p in files[:MAX_GLOB_META]:
                try:
                    st = p.stat()
                except OSError:
                    continue
                rows.append(
                    {
                        "path": rel(p, root),
                        "size": st.st_size,
                        "mtime_ns": st.st_mtime_ns,
                    }
                )
                size += st.st_size
                mt = st.st_mtime_ns if mt is None else max(mt, st.st_mtime_ns)
            m[pat] = {
                "kind": "glob",
                "count": len(files),
                "truncated": len(files) > MAX_GLOB_META,
                "size_sum_first": size,
                "max_mtime_ns_first": mt,
                "files": rows,
            }
        else:
            p = root / pat
            if p.exists():
                try:
                    st = p.stat()
                    m[pat] = {
                        "kind": "path",
                        "exists": True,
                        "size": st.st_size,
                        "mtime_ns": st.st_mtime_ns,
                    }
                except OSError:
                    m[pat] = {
                        "kind": "path",
                        "exists": True,
                        "size": None,
                        "mtime_ns": None,
                    }
            else:
                m[pat] = {
                    "kind": "path",
                    "exists": False,
                    "size": None,
                    "mtime_ns": None,
                }
    return m


def cache_get(root: Path, m: dict[str, Any], rh: str) -> dict[str, Any] | None:
    try:
        c = jload(CACHE)
    except Exception:
        return None
    ok = (
        c.get("schema") == SCHEMA
        and c.get("version") == VERSION
        and c.get("repo_root") == str(root.resolve())
        and c.get("rule_hash") == rh
        and c.get("tracked_meta") == m
        and isinstance(c.get("result"), dict)
    )
    if not ok:
        return None
    r = dict(c["result"])
    r["cache"] = "hit"
    return r


def cache_put(root: Path, m: dict[str, Any], rh: str, result: dict[str, Any]) -> None:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": SCHEMA,
        "version": VERSION,
        "repo_root": str(root.resolve()),
        "rule_hash": rh,
        "tracked_meta": m,
        "result": result,
    }
    tmp = CACHE.with_suffix(".tmp")
    tmp.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    os.replace(str(tmp), str(CACHE))


def detect_stacks(root: Path, rules: dict[str, Any]) -> list[str]:
    out = []
    for r in rules.get("stacks", []):
        if isinstance(r, dict) and match(root, r):
            v = str(r.get("id", ""))
            if v and v not in out:
                out.append(v)
    return out or ["unknown"]


def detect_packages(
    root: Path, rules: dict[str, Any], stacks: list[str]
) -> tuple[dict[str, str], list[str]]:
    hits: dict[str, list[tuple[int, str]]] = {}
    for r in rules.get("package_managers", []):
        if isinstance(r, dict) and match(root, r):
            hits.setdefault(str(r.get("scope", "unknown")), []).append(
                (int(r.get("priority", 0)), str(r.get("id", "unknown")))
            )
    out, risks = {}, []
    for scope in sorted(set(stacks) | set(hits)):
        if scope in {"unknown", "docker"}:
            continue
        arr = sorted(hits.get(scope, []), reverse=True)
        if not arr:
            out[scope] = "unknown"
            risks.append(f"{scope} package manager unknown")
            continue
        top = [v for p, v in arr if p == arr[0][0]]
        out[scope] = top[0] if len(top) == 1 else "mixed"
        if len(top) > 1:
            risks.append(f"multiple {scope} package managers")
    return out, risks


def detect_tools(root: Path, rules: dict[str, Any]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for r in rules.get("tools", []):
        if isinstance(r, dict) and match(root, r):
            k, v = str(r.get("kind", "other")), str(r.get("id", "unknown"))
            out.setdefault(k, [])
            if v not in out[k]:
                out[k].append(v)
    return out


def node_cmd(pm: str, script: str) -> str | None:
    return {
        "npm": "npm test" if script == "test" else f"npm run {script}",
        "pnpm": f"pnpm {script}" if script == "test" else f"pnpm run {script}",
        "yarn": f"yarn {script}",
        "bun": f"bun run {script}",
    }.get(pm)


def pick_os(v: Any) -> str | None:
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        key = "windows" if os.name == "nt" else "posix"
        x = v.get(key) or v.get("default")
        return x if isinstance(x, str) else None
    return None


def command(
    root: Path, r: dict[str, Any], packages: dict[str, str], tools: dict[str, list[str]]
) -> str | None:
    tool = str(r.get("tool", ""))
    if tool:
        known = {x for vals in tools.values() for x in vals}
        if tool not in known:
            return None
    if "command" in r:
        return str(r["command"])
    if "package_script" in r:
        script = str(r["package_script"])
        scope = str(r.get("package_scope", r.get("scope", "")))
        if scope == "node" and script in package_scripts(root, "package.json"):
            return node_cmd(packages.get("node", "unknown"), script)
        if scope == "php" and script in package_scripts(root, "composer.json"):
            return (
                f"composer {script}" if script == "test" else f"composer run {script}"
            )
        return None
    if "package_script_first" in r:
        scripts = package_scripts(root, "package.json")
        for s in r["package_script_first"]:
            if s in scripts:
                return node_cmd(packages.get("node", "unknown"), str(s))
        return None
    t = r.get("templates")
    if isinstance(t, dict):
        return pick_os(t.get(packages.get(str(r.get("scope", "")), "unknown")))
    return None


def detect_commands(
    root: Path,
    rules: dict[str, Any],
    packages: dict[str, str],
    tools: dict[str, list[str]],
) -> dict[str, str]:
    out: dict[str, str] = {}
    for r in rules.get("commands", []):
        if not isinstance(r, dict):
            continue
        cmd = command(root, r, packages, tools)
        if cmd:
            out.setdefault(str(r.get("name") or r.get("id")), cmd)
    return out


def roots(root: Path, rules: dict[str, Any]) -> tuple[list[str], list[str]]:
    src = [
        p
        for p in rules.get("source_roots", [])
        if isinstance(p, str) and (root / p).is_dir()
    ]
    tst = [
        p
        for p in rules.get("test_roots", [])
        if isinstance(p, str) and (root / p).is_dir()
    ]
    return src, tst


def evidence(root: Path, rules: dict[str, Any]) -> list[str]:
    patterns = rules.get("evidence_patterns") or rules.get("tracked_patterns", [])
    out: list[str] = []
    for pat in patterns:
        if not isinstance(pat, str):
            continue
        # stdout evidence is for config/lock files only.
        # keep source globs in tracked_patterns for cache invalidation, not output.
        if any(x in pat for x in "*?["):
            continue
        if (root / pat).exists() and pat not in out:
            out.append(pat)
    return out[:40]


def analyze(root: Path, rules: dict[str, Any], cache_state: str) -> dict[str, Any]:
    stacks = detect_stacks(root, rules)
    packages, risks = detect_packages(root, rules, stacks)
    tools = detect_tools(root, rules)
    commands = detect_commands(root, rules, packages, tools)
    src, tst = roots(root, rules)
    ev = evidence(root, rules)

    semantic_stacks = [s for s in stacks if s != "docker"]
    if not ev:
        risks.append("empty or config-free project; clarify stack/tooling")
    if stacks == ["unknown"]:
        risks.append("unsupported or unrecognized project")
    if len(semantic_stacks) > 1:
        risks.append("mixed stack; inspect manually")
    if stacks != ["unknown"] and not commands:
        risks.append("no 100%-certain commands")

    confidence = "high"
    if (
        risks
        or any(v in {"unknown", "mixed"} for v in packages.values())
        or len(semantic_stacks) > 1
    ):
        confidence = "partial"
    if stacks == ["unknown"] or not ev:
        confidence = "low"

    return {
        "cache": cache_state,
        "os": "windows" if os.name == "nt" else "posix",
        "stacks": stacks,
        "packages": packages,
        "tools": tools,
        "source_roots": src,
        "test_roots": tst,
        "commands": commands,
        "confidence": confidence,
        "unknowns": sorted(set(risks)),
        "evidence": ev,
        "rule_version": str(rules.get("rule_version", "unknown")),
    }


def print_result(r: dict[str, Any]) -> None:
    print(f"project-probe({r['cache']},{r['confidence']})")
    print("\nprobe:")
    print(f"- os: {r['os']}")
    print(f"- stack: {', '.join(r['stacks'])}")
    for k, v in sorted(r.get("packages", {}).items()):
        print(f"- package.{k}: {v}")
    for k in ["test", "lint", "format", "typecheck"]:
        if r.get("tools", {}).get(k):
            print(f"- {k}: {', '.join(r['tools'][k])}")
    if r.get("source_roots"):
        print(f"- src: {', '.join(r['source_roots'])}")
    if r.get("test_roots"):
        print(f"- tests: {', '.join(r['test_roots'])}")
    if r.get("commands"):
        print("\ncmd:")
        for k, v in sorted(r["commands"].items()):
            print(f"- {k}: {v}")
    if r.get("evidence"):
        print("\nev:")
        for x in r["evidence"]:
            print(f"- {x}")
    if r.get("unknowns"):
        print("\nrisk:")
        for x in r["unknowns"]:
            print(f"- {x}")


def main() -> int:
    root = Path.cwd()
    try:
        rules = jload(RULES)
    except Exception as e:
        print(f"project-probe(error)\n\nrisk:\n- cannot read rule file: {e}")
        return 1
    patterns = [p for p in rules.get("tracked_patterns", []) if isinstance(p, str)]
    rh, m = sha(rules), meta(root, patterns)
    cached = cache_get(root, m, rh)
    if cached:
        result = cached
    else:
        result = analyze(root, rules, "miss")
        cache_put(root, m, rh, result)
    print_result(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
