#!/usr/bin/env python3
"""Deterministic gate for /c-auto.

Stdlib-only. It controls phase, context budget, edit gate, and run state.
It does not call an LLM, read code for meaning, or execute edits.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

CONFIG = Path(".claude/skills/c-shared/config.md")
DEFAULT_DATA_DIR = Path(".cache/c-skills-data")
STATE_REL = Path("c-auto/state.json")
SCHEMA = 1

COMPLEX_RE = re.compile(
    r"\b(architecture|design|doc|project-[\w.-]+\.md|new module|module|layer|public api|api boundary|cross[- ]?cutting|multi[- ]?file|framework|sdk|core/|封装|架构|设计|公共|模块|多文件)\b",
    re.I,
)
BUG_RE = re.compile(r"\b(bug|fix|error|failing|failed|failure|regression|exception|crash|修复|报错|失败)\b", re.I)
REVIEW_RE = re.compile(r"\b(review|diff|check|审查|检查)\b", re.I)
HANDOFF_RE = re.compile(r"\b(handoff|save state|checkpoint|交接|保存状态)\b", re.I)
CLARIFY_RE = re.compile(r"\b(ambiguous|unclear|not sure|不知道|不确定|澄清)\b", re.I)
SMALL_RE = re.compile(r"\b(small|simple|tiny|local|rename|typo|clear|简单|小|局部)\b", re.I)


def extract_config_block(text: str) -> str:
    m = re.search(r"<config\b[^>]*>.*?</config>", text, re.DOTALL)
    return m.group(0) if m else ""


def data_dir() -> Path:
    try:
        block = extract_config_block(CONFIG.read_text(encoding="utf-8"))
        if not block:
            return DEFAULT_DATA_DIR
        root = ET.fromstring(block)
        value = root.findtext("./runtime/data_dir")
        return Path(value.strip()) if value and value.strip() else DEFAULT_DATA_DIR
    except Exception:
        return DEFAULT_DATA_DIR


def state_path() -> Path:
    return data_dir() / STATE_REL


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def load_state() -> dict[str, Any]:
    path = state_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_state(data: dict[str, Any]) -> None:
    path = state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def delete_state() -> None:
    try:
        state_path().unlink()
    except FileNotFoundError:
        pass


def classify(goal: str) -> tuple[str, str]:
    g = goal.strip()
    if not g:
        return "clarify", "blocked"
    if HANDOFF_RE.search(g):
        return "handoff", "checkpoint"
    if CLARIFY_RE.search(g):
        return "clarify", "blocked"
    if REVIEW_RE.search(g):
        return "review", "read"
    if BUG_RE.search(g):
        return "fix", "read"
    if COMPLEX_RE.search(g):
        return "plan", "read"
    if SMALL_RE.search(g):
        return "implement", "write"
    return "plan", "read"


def phase_rules(phase: str, mode: str, goal: str) -> dict[str, list[str] | str]:
    common_forbid = [
        "read/execute c-* skills",
        "client todo/task tool",
        "recursive work-item scan",
        "broad repo/doc scan",
        "fake checks",
    ]
    if phase == "clarify":
        return {
            "allow": ["ask user only"],
            "forbid": ["read files", "edit files", "run commands", *common_forbid],
            "budget": "max_questions: 3",
            "next": "wait user",
        }
    if phase == "handoff":
        return {
            "allow": ["resolve/create/update work item via work_items.py", "summarize current known state"],
            "forbid": ["edit source files", "manual index/cache writes", *common_forbid],
            "budget": "max_files: 0",
            "next": "checkpoint state",
        }
    if phase in {"plan", "review", "fix"} and mode == "read":
        allow = [
            "read .claude/skills/c-shared/config.md",
            "read {config.docs.context_file} if needed",
            "read user-referenced docs/files",
            "inspect targeted file tree only if needed",
        ]
        if phase == "fix":
            allow.append("run targeted repro/check command if known")
        if phase == "review":
            allow.append("read current diff/referenced files")
        return {
            "allow": allow,
            "forbid": ["edit files", "broad grep", *common_forbid],
            "budget": "max_files: 8; max_lines_per_file: 200",
            "next": "output bounded plan/review/fix target only",
        }
    if phase == "implement" and mode == "write":
        return {
            "allow": [
                "read .claude/skills/c-shared/config.md",
                "read only files needed for one small slice",
                "edit only files required for that slice",
                "run targeted check when practical",
            ],
            "forbid": ["architecture redesign", "unrelated refactor", "public API expansion unless explicit", *common_forbid],
            "budget": "max_files: 6; one slice only",
            "next": "implement one slice then checkpoint",
        }
    return {
        "allow": ["ask user only"],
        "forbid": ["read files", "edit files", "run commands", *common_forbid],
        "budget": "max_questions: 3",
        "next": "wait user",
    }


def emit(data: dict[str, Any]) -> None:
    phase = data.get("phase", "clarify")
    status = data.get("status", "blocked")
    goal = str(data.get("goal", "")).strip()
    rules = phase_rules(phase, str(data.get("mode", "")), goal)

    print(f"c-auto({phase}:{status})")
    print("")
    print("state:")
    print(f"- {state_path().as_posix()}")
    print("goal:")
    print(f"- {goal or 'none'}")
    print("allow:")
    for x in rules["allow"]:  # type: ignore[index]
        print(f"- {x}")
    print("forbid:")
    for x in rules["forbid"]:  # type: ignore[index]
        print(f"- {x}")
    print("budget:")
    print(f"- {rules['budget']}")
    print("next:")
    print(f"- {rules['next']}")


def start(args: argparse.Namespace) -> None:
    goal = args.goal.strip()
    phase, mode = classify(goal)
    state = {
        "schema": SCHEMA,
        "goal": goal,
        "phase": phase,
        "mode": mode,
        "status": mode if mode in {"read", "write"} else "blocked" if phase == "clarify" else "checkpoint",
        "created_at": now(),
        "updated_at": now(),
        "history": [],
    }
    save_state(state)
    emit(state)


def step(args: argparse.Namespace) -> None:
    state = load_state()
    if not state:
        sys.exit("error: no c-auto state; run start --goal first")
    note = (args.note or "").strip()
    if note:
        state.setdefault("history", []).append({"at": now(), "note": note})
    # Deterministic, conservative progression. User/model evidence still decides action quality.
    phase = state.get("phase")
    if phase == "clarify" and note:
        state["phase"], state["mode"], state["status"] = "plan", "read", "read"
    elif phase == "plan":
        state["phase"], state["mode"], state["status"] = "implement", "write", "write"
    elif phase == "fix":
        state["phase"], state["mode"], state["status"] = "fix", "read", "read"
    elif phase == "review":
        state["phase"], state["mode"], state["status"] = "review", "read", "read"
    else:
        state["status"] = state.get("mode", "read")
    state["updated_at"] = now()
    save_state(state)
    emit(state)


def checkpoint(args: argparse.Namespace) -> None:
    state = load_state()
    if not state:
        sys.exit("error: no c-auto state; run start --goal first")
    status = args.status
    summary = args.summary.strip()
    state.setdefault("history", []).append({"at": now(), "status": status, "summary": summary})
    state["last_status"] = status
    state["updated_at"] = now()
    if status == "done":
        state["phase"], state["mode"], state["status"] = "handoff", "checkpoint", "checkpoint"
    elif status == "blocked":
        state["phase"], state["mode"], state["status"] = "clarify", "ask", "blocked"
    else:
        state["status"] = "partial"
    save_state(state)
    print(f"checkpoint: {status} {state_path().as_posix()}")


def reset(_args: argparse.Namespace) -> None:
    delete_state()
    print(f"reset: {state_path().as_posix()}")


def main() -> int:
    ap = argparse.ArgumentParser(description="deterministic /c-auto gate")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("start")
    p.add_argument("--goal", required=True)
    p.set_defaults(func=start)

    p = sub.add_parser("step")
    p.add_argument("--note", default="")
    p.set_defaults(func=step)

    p = sub.add_parser("checkpoint")
    p.add_argument("--status", required=True, choices=["done", "partial", "blocked"])
    p.add_argument("--summary", required=True)
    p.set_defaults(func=checkpoint)

    p = sub.add_parser("reset")
    p.set_defaults(func=reset)

    args = ap.parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
