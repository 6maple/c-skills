---
name: c-issues
description: Break a PRD, spec, or plan into tracer-bullet vertical issues. Use when approved work needs independently grabbable HITL/AFK slices.
disable-model-invocation: true
---

# c-issues

Create thin vertical slices. Avoid horizontal layer tickets.

## Process

1. Gather context from the passed PRD/spec/issue or current conversation.
2. Explore the codebase only if needed to understand current seams.
3. Draft tracer-bullet issues. Each slice cuts through all relevant integration layers and is independently verifiable.
4. Mark each slice as:
   - `AFK` — can be implemented and verified without user interaction.
   - `HITL` — needs a human decision, design review, credential, environment, or approval.
5. Ask for approval of the numbered breakdown before publishing local issue files.
6. Publish approved issues under `{config.docs.issues_dir}` in dependency order.

## Issue body

```markdown
---
status: todo|doing|blocked|done
type: AFK|HITL
execution: c-implement|c-tdd|c-fix|c-refactor
blocked_by: none|<issue>
updated: YYYY-MM-DD
---

# <title>

## Parent

## What to build

## Acceptance Criteria
- [ ] ...

## Verification

## Risk
```

## Output

```text
c-issues(draft|published|blocked)

issues:
1. <title> — AFK|HITL — c-implement|c-tdd|c-fix|c-refactor
2. ...
doc:
- none
risk:
- none
next:
- wait user | /c-skill ...
```
