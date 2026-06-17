---
name: c-ai-arch
description: ban
description-only: Maintain an AI-generated macro architecture document.
disable-model-invocation: true
---

<important>
Strictly follow this path mapping:
```json
{
  "path_mappings": {
    "CONTEXT.md": ".docs/CONTEXT.md",
    "CONTEXT-MAP.md": ".docs/CONTEXT-MAP.md",
    "docs/adr/": ".docs/adr",
    "docs/.scratch/": ".docs/.scratch",
    "per_context_CONTEXT.md": "<context>/.docs/CONTEXT.md",
    "per_context_docs/adr/": "<context>/.docs/adr",
    "ARCH-FROM-AI.md": ".docs/<scope-name>/ARCH-FROM-AI.md"
  },
  "outputs": {
    "prd": ".docs/prd",
    "issue": ".docs/issues",
    "handoff": ".docs/HANDOFF.md",
    "temporary": ".docs/.tmp",
    "architecture_report": ".docs/.tmp/architecture-review-<timestamp>.html",
    "design_implement_guide": ".docs/design-implement-guide"
  },
  "configs": {
    "issue_tracker": ".docs/agents/issue-tracker.md"
  }
}
```
</important>

# c-ai-arch

Maintain an AI-generated macro architecture document named `ARCH-FROM-AI.md`. Do not implement code or tests.

Use only when the user explicitly asks to create, audit, or update `ARCH-FROM-AI.md`. The user owns the architecture scope, file location, and write decision.

`ARCH-FROM-AI.md` is a compact system map for later implementation design. It must be macro-level, code-aligned, non-overlapping, and free of issue/task noise.

## Required Inputs

Before broad reading or writing, confirm:

```text
mode     = init | audit | update
location = where ARCH-FROM-AI.md lives
scope    = user-approved code area to inspect
```

If any item is missing or unclear, stop and ask with a recommended default. Do not proceed until confirmed.

Optional context, only when relevant: existing `ARCH-FROM-AI.md`, issue, PRD/spec, ADR, design guide, user notes, related tests.

## Hard Rules

- Never auto-trigger this skill.
- Never infer scan scope silently.
- Never scan the whole repo unless the user explicitly authorizes it.
- Never rely on changed files as truth; inspect real code in the approved scope.
- Real code is the source of current facts.
- Code fact does not equal architecture approval; bad dependencies or unclear boundaries are drift, not accepted rules.
- Existing ARCH, ADRs, specs, issues, and notes are context, not code facts.
- Update only the confirmed scope.
- Do not record unconfirmed assumptions.
- Do not turn ARCH into implementation notes.

## Reading Order

```text
ARCH-FROM-AI.md
→ approved scope root
→ public entries / boundaries
→ key dependencies
→ nearest relevant tests
```

Read selectively inside scope. Do not recursively consume every file unless the user authorizes that depth.

## Workflow

```text
confirm mode + location + scope
→ read existing ARCH-FROM-AI.md if present
→ inspect real code within scope
→ compare code facts vs ARCH/context claims
→ produce proposed ARCH delta
→ write only after user authorization
```

If the initial request already says to create/update now and mode/location/scope are explicit, that counts as write authorization.

## Modes

- `init`: create initial macro map from confirmed code scope.
- `audit`: compare ARCH with confirmed code scope; output `ARCH unchanged` if no macro update is needed.
- `update`: apply confirmed macro changes within confirmed scope.

## Update Threshold

Update ARCH only when the fact helps future implementation design avoid boundary, dependency, ownership, flow, or testing mistakes.

Record only:

```text
system boundary / layers / directory responsibility / module boundaries
cross-module flows / external + infra boundaries / storage-config-runtime ownership
testing seams / stable extension points / drift or open architecture decisions
```

Do not record:

```text
issue requirements / acceptance criteria / task lists / feature details
function-class summaries / private implementation details / temporary workaround details
speculative roadmap / unconfirmed assumptions
```

## ARCH-FROM-AI.md Shape

Use this structure. If an existing document uses a different structure, ask before restructuring.

```md
# ARCH-FROM-AI

## 1. Scope

What code scope this document covers; what the repo owns / does not own.

## 2. Layers

System layers and allowed dependency direction.

## 3. Directory Map

Directory/module -> responsibility. Ownership only; no flow details.

## 4. Core Flows

Cross-module request/event/data flows. Flow only; no directory responsibility details.

## 5. Boundaries

Module boundaries, public APIs, adapters, storage, external systems, crossing rules.

## 6. Testing Seams

Where behavior should be tested; what should be faked/stubbed.

## 7. Extension Points

Stable replaceable components and replacement constraints. No roadmap.

## 8. Drift / Open Decisions

Code facts conflicting with intended architecture or needing user decision.
```

Section ownership:

```text
Scope          = system ownership
Layers         = dependency direction
Directory Map  = path responsibility
Core Flows     = cross-module flow
Boundaries     = crossing rules
Testing Seams  = validation seams
Extension      = stable replacement points
Drift          = conflict / unresolved decision
```

One fact belongs to one section only. Cross-reference instead of duplicating.

## Conflict Format

```text
Code fact: <what real code does>
ARCH/context claim: <what ARCH/docs/user notes say>
Risk: <why it matters>
Recommendation: <preferred update or follow-up>
Need user decision: yes/no
```

Do not silently resolve meaningful conflicts.

## Write Gate

Before editing `ARCH-FROM-AI.md`, verify:

```text
- mode/location/scope are user-confirmed
- delta is within scope
- each update is backed by real code or explicit user decision
- no unconfirmed assumption is recorded
```

If write authorization is missing, output the proposed delta and ask for confirmation.

## Self-Check

Before final output:

```text
- within approved scope
- macro-level only
- code-aligned
- sections non-overlapping
- no issue/task/feature noise
- no silent assumptions
- conflicts recorded as drift, not legalized
- useful for future c-design-implement-guide
```

## Reply Format

```text
ARCH-FROM-AI.md: created | updated | unchanged | proposed
Scope: <confirmed scope>
Evidence: <paths inspected>
Changed sections: <sections or none>
Open decisions: <only if any>
```

Keep the reply brief. The document or proposed delta is the main output.
