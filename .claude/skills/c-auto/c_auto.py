#!/usr/bin/env python3
"""Deterministic gate for /c-auto.

Stdlib-only. Provides conservative phase, budget, and allowed-action hints.
It does not read source for meaning, call an LLM, or execute edits.
"""
from __future__ import annotations

import argparse, datetime as dt, json, re, sys, xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

CONFIG = Path('.claude/skills/c-shared/config.md')
DEFAULT_DATA_DIR = Path('.cache/c-skills-data')
STATE_REL = Path('c-auto/state.json')
SCHEMA = 2

RE = {
    'handoff': re.compile(r'\b(handoff|save state|checkpoint|交接|保存状态)\b', re.I),
    'review': re.compile(r'\b(review|diff|pr|审查|检查)\b', re.I),
    'fix': re.compile(r'\b(bug|fix|error|failing|failed|failure|regression|exception|crash|slow|perf|修复|报错|失败|回归)\b', re.I),
    'refactor': re.compile(r'\b(refactor|cleanup|rename|move|重构|清理|改名)\b', re.I),
    'arch': re.compile(r'\b(architecture|deep module|seam|coupling|boundary|架构|模块|抽象|边界|耦合)\b', re.I),
    'grill': re.compile(r'\b(ambiguous|unclear|not sure|不知道|不确定|澄清|讨论|对齐)\b', re.I),
    'prd': re.compile(r'\b(prd|spec|requirement|new feature|product|需求|功能文档|规格)\b', re.I),
    'issues': re.compile(r'\b(issue|ticket|slice|break down|拆分|任务|切片)\b', re.I),
    'tdd': re.compile(r'\b(tdd|test first|red-green|regression test|integration test|测试先行)\b', re.I),
    'takeover': re.compile(r'\b(takeover|resume|continue|接手|继续|恢复)\b', re.I),
    'implement': re.compile(r'\b(ui|frontend|flutter|react|style|layout|small|local|implement|实现|页面|样式|局部)\b', re.I),
}

def extract_config_block(text: str) -> str:
    m = re.search(r'<config\b[^>]*>.*?</config>', text, re.DOTALL)
    return m.group(0) if m else ''

def data_dir() -> Path:
    try:
        block = extract_config_block(CONFIG.read_text(encoding='utf-8'))
        if block:
            root = ET.fromstring(block)
            v = root.findtext('./runtime/data_dir')
            if v and v.strip():
                return Path(v.strip())
    except Exception:
        pass
    return DEFAULT_DATA_DIR

def state_path() -> Path:
    return data_dir() / STATE_REL

def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()

def load_state() -> dict[str, Any]:
    p = state_path()
    if not p.is_file():
        return {}
    try:
        x = json.loads(p.read_text(encoding='utf-8'))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}

def save_state(x: dict[str, Any]) -> None:
    p = state_path(); p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(x, ensure_ascii=False, indent=2, sort_keys=True)+'\n', encoding='utf-8')

def classify(goal: str) -> tuple[str, str]:
    g = goal.strip()
    if not g: return 'grill', 'ask'
    order = ['handoff','review','fix','refactor','arch','takeover','grill','prd','issues','tdd','implement']
    for k in order:
        if RE[k].search(g):
            return k, 'ask' if k == 'grill' else 'read' if k in {'review','fix','refactor','arch','takeover','prd','issues','tdd'} else 'write'
    return 'takeover', 'read'

def rules(phase: str, mode: str) -> dict[str, Any]:
    common_forbid = ['broad unrelated edits', 'manual runtime/cache/index writes', 'fake checks', 'destructive git commands']
    if phase == 'grill':
        return {'allow':['ask one blocking question', 'read code only if it answers the question'], 'forbid':['source edits', *common_forbid], 'budget':'one question', 'next':'wait user'}
    if phase in {'takeover','prd','issues','review','arch'}:
        return {'allow':['read config', 'run project_probe.py', 'read targeted docs/files'], 'forbid':['source edits', *common_forbid], 'budget':'targeted reads only', 'next':f'/{"c-"+phase}'}
    if phase in {'fix','refactor','tdd'}:
        return {'allow':['read config', 'run project_probe.py', 'build feedback loop', 'targeted edits after evidence'], 'forbid':['scope creep', *common_forbid], 'budget':'one defect/slice/refactor', 'next':f'/{"c-"+phase}'}
    if phase == 'implement':
        return {'allow':['read config', 'run project_probe.py', 'one bounded implementation slice', 'targeted verification'], 'forbid':['unrelated refactor', *common_forbid], 'budget':'one small vertical slice', 'next':'/c-implement'}
    if phase == 'handoff':
        return {'allow':['summarize current state', 'write handoff snapshot'], 'forbid':['source edits', *common_forbid], 'budget':'no code changes', 'next':'/c-handoff'}
    return {'allow':['ask user'], 'forbid':common_forbid, 'budget':'one question', 'next':'wait user'}

def emit(st: dict[str, Any]) -> None:
    phase, mode = st.get('phase','grill'), st.get('mode','ask')
    r = rules(str(phase), str(mode))
    print(f"c-auto-gate({phase}:{mode})\n")
    print('state:'); print(f"- {state_path().as_posix()}")
    print('goal:'); print(f"- {st.get('goal','none') or 'none'}")
    print('allow:'); [print(f'- {x}') for x in r['allow']]
    print('forbid:'); [print(f'- {x}') for x in r['forbid']]
    print('budget:'); print(f"- {r['budget']}")
    print('next:'); print(f"- {r['next']}")

def start(args: argparse.Namespace) -> None:
    phase, mode = classify(args.goal)
    st = {'schema':SCHEMA,'goal':args.goal.strip(),'phase':phase,'mode':mode,'created_at':now(),'updated_at':now(),'history':[]}
    save_state(st); emit(st)

def step(args: argparse.Namespace) -> None:
    st = load_state()
    if not st: sys.exit('error: no c-auto state; run start --goal first')
    note = (args.note or '').strip()
    if note: st.setdefault('history',[]).append({'at':now(),'note':note})
    phase, mode = classify(note or st.get('goal',''))
    st.update({'phase':phase,'mode':mode,'updated_at':now()})
    save_state(st); emit(st)

def checkpoint(args: argparse.Namespace) -> None:
    st = load_state()
    if not st: sys.exit('error: no c-auto state; run start --goal first')
    st.setdefault('history',[]).append({'at':now(),'status':args.status,'summary':args.summary.strip()})
    st['updated_at']=now(); save_state(st)
    print(f"c-auto-checkpoint({args.status})")
    print('state:'); print(f"- {state_path().as_posix()}")

def reset(_args: argparse.Namespace) -> None:
    try: state_path().unlink()
    except FileNotFoundError: pass
    print('c-auto-reset(done)')
    print('state:'); print(f"- {state_path().as_posix()}")

def main() -> int:
    ap=argparse.ArgumentParser(description='deterministic /c-auto gate')
    sub=ap.add_subparsers(dest='cmd', required=True)
    p=sub.add_parser('start'); p.add_argument('--goal', required=True); p.set_defaults(func=start)
    p=sub.add_parser('step'); p.add_argument('--note', default=''); p.set_defaults(func=step)
    p=sub.add_parser('checkpoint'); p.add_argument('--status', choices=['done','partial','blocked'], required=True); p.add_argument('--summary', required=True); p.set_defaults(func=checkpoint)
    p=sub.add_parser('reset'); p.set_defaults(func=reset)
    args=ap.parse_args(); args.func(args); return 0
if __name__ == '__main__': raise SystemExit(main())
