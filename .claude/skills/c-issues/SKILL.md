---
name: c-issues
description: Break a PRD, spec, or plan into tracer-bullet vertical issues. Use when approved work needs independently grabbable HITL/AFK slices.
disable-model-invocation: true
---

# c-issues

Break work into independently grabbable tracer-bullet issues. Avoid horizontal layer tickets.

## Evidence precedence

Treat configured docs as context, not proof. Prefer current code and verified behavior when they conflict with old `{config.docs.root_dir}` content.

## Process

### 1. Gather context

Work from the current conversation, passed PRD/spec/path, or referenced issue. If context is missing, stop and route to `c-grill`; do not invent scope.

### 2. Explore codebase when needed

Explore only enough to understand current seams and integration layers. Use project glossary terms and respect ADRs.

### 3. Draft vertical slices

Each issue is a thin vertical slice that cuts through all relevant integration layers end-to-end, not a horizontal slice of one layer.

Rules:

- Each slice delivers a narrow but complete path.
- Each slice is demoable or independently verifiable.
- Prefer many thin slices over few thick slices.
- Prefer `AFK` over `HITL` when verification does not need the user.

Mark each slice:

- `AFK` — can be implemented and verified without user interaction.
- `HITL` — requires user decision, design review, credential, environment, or approval.

Choose execution:

- `c-implement` — UI/volatile/exploratory or bounded non-TDD work.
- `c-tdd` — stable, testable, high-risk behavior.
- `c-fix` — bug/regression.
- `c-refactor` — behavior-preserving structure change.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. Ask whether to publish, split, merge, reorder, or change HITL/AFK.

### 5. Publish

Publish approved local issue files under `{config.docs.issues_dir}` in dependency order.

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

## Result

- status: todo
- changed: none
- verification: none
- notes: none

## Blocked

- reason: none
- tried: none
- next: none
```

## Status contract

Issue files under `{config.docs.issues_dir}` are the local status source. They are task contracts, not execution logs. Execution skills update only `status`, `updated`, and the compact `Result` or `Blocked` section. Do not append long transcripts.

Status semantics:

- `todo` — not started.
- `doing` — reserved for external runners or active manual execution.
- `done` — acceptance criteria met and relevant verification passed.
- `blocked` — missing information, missing environment, failed verification, or unsafe to continue.

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
