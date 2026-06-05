# c-* AI Coding Skills

极简、手动边界、证据优先。

## Daily

```text
/c-auto <goal>
/c-auto-route <task>
```

`c-auto` is a Python-gated ReAct goal runner. It does not read/execute other `c-*` skills.

`c-auto-route` is route-only. It emits one slash command and stops.

## Skills

- `c-auto`: Python-gated ReAct goal runner.
- `c-auto-route`: route-only next command selector.
- `c-clarify`: clear blockers.
- `c-plan`: slice complex/high-risk work.
- `c-implement`: one vertical slice.
- `c-fix`: repro/fix/verify bug.
- `c-refactor`: no behavior change.
- `c-review`: diff/file review.
- `c-handoff`: manual save-state.
- `c-takeover`: manual resume/first-touch verification.

## Tools

```text
.claude/skills/c-auto/c_auto.py
.claude/skills/c-shared/work_items.py
.claude/skills/c-takeover/project_probe.py
```

Runtime data lives under one configured directory:

```text
{config.runtime.data_dir} default .cache/c-skills-data
```

Current runtime files:

```text
.cache/c-skills-data/project-probe.json
.cache/c-skills-data/c-auto/state.json
```

Only tool scripts read/write runtime data. AI consumes stdout only.

`c_auto.py` controls `/c-auto` phase, context budget, edit gate, and state. It does not call an LLM or execute edits.

```bash
python .claude/skills/c-auto/c_auto.py start --goal "<task>"
python .claude/skills/c-auto/c_auto.py step --note "<short input/result>"
python .claude/skills/c-auto/c_auto.py checkpoint --status done|partial|blocked --summary "<short factual summary>"
python .claude/skills/c-auto/c_auto.py reset
```

`project_probe.py` is used by `c-takeover` first. It detects project stack and emits only 100%-certain command suggestions.

`work_items.py` mechanically manages active work items, resolution, status, archive, and index CSV. It rejects paths outside configured work-item dirs and does not search or summarize history.

```bash
python .claude/skills/c-shared/work_items.py list
python .claude/skills/c-shared/work_items.py resolve --active-only [<id-or-path>]
python .claude/skills/c-shared/work_items.py create --title "<task>"
python .claude/skills/c-shared/work_items.py set-status <id-or-path> <status>
python .claude/skills/c-shared/work_items.py archive <id-or-path>
python .claude/skills/c-shared/work_items.py validate
```

## Collaboration

1. One work item = one task.
2. One main writing agent per task.
3. Agent switch: `c-handoff` -> `c-takeover`.
4. Unknown/no-docs/first-touch repo: use `c-auto-route` or `/c-takeover`.
5. Goal mode: use `/c-auto`; it is gated by `c_auto.py`.
6. Before merge: `c-review`.
7. Bugs: `c-fix`; do not hide inside feature work.

## Docs

- `{config.docs.context_file}` default `.docs/CONTEXT.md`: stable terms/facts.
- `{config.docs.adr_dir}` default `.docs/adr`: hard decisions.
- `{config.docs.work_items_active_dir}` default `.docs/work-items/active`: current task state.
- `{config.docs.work_items_archive_dir}` default `.docs/work-items/archive`: completed/stale task state.
- `{config.docs.work_items_index}` default `.docs/work-items/INDEX.csv`: generated short CSV index.
