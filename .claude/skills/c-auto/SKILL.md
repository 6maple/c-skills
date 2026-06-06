---
name: c-auto
description: Probe-first workflow manager for a single coding goal. Use when the user asks for multi-step automatic progress, wants the system to decide the next c-* skill, or says to handle the task end-to-end.
disable-model-invocation: true
---

# c-auto

Run a bounded ReAct workflow. `c-auto` coordinates; it does not replace the specialist skills.

## Process

1. Run the deterministic gate:

```bash
python .claude/skills/c-auto/c_auto.py start --goal "<user task>"
```

For continuation:

```bash
python .claude/skills/c-auto/c_auto.py step --note "<new user input or result>"
```

2. Read `.claude/skills/c-shared/config.md`.
3. Run `project_probe.py` before relying on stack, package manager, or commands:

```bash
python .claude/skills/c-takeover/project_probe.py
```

4. Pick one specialist skill using gate output, probe evidence, and current artifacts.
5. Do one bounded action only.
6. After the action, checkpoint when useful:

```bash
python .claude/skills/c-auto/c_auto.py checkpoint --status done|partial|blocked --summary "<fact>"
```

## Routing discipline

- Missing project facts -> `c-takeover`.
- Missing design decision -> `c-grill`.
- New feature without spec -> `c-prd`.
- Spec needing tickets -> `c-issues`.
- Volatile/UI/exploratory change -> `c-implement`.
- Stable/testable/high-risk behavior -> `c-tdd`.
- Bug -> `c-fix`.
- Refactor intent -> `c-refactor`.
- Architecture smell -> `c-arch`.
- Completed implementation -> `c-review`.

## Output

```text
c-auto(done|partial|blocked|ask)

obs:
- ...
act:
- ...
changed:
- none
checks:
- none
doc:
- none
q:
- none
risk:
- none
next:
- <one default action>
```
