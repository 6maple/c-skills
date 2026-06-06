---
name: c-prd
description: Turn confirmed context into a PRD. Use when a new feature or cross-module change needs a durable product/engineering spec before issue slicing.
disable-model-invocation: true
---

# c-prd

Synthesize what is already known. Do not interview the user; if essential information is missing, route to `c-grill`.

## Evidence precedence

Treat configured docs as context, not proof. Prefer current code and verified behavior when they conflict with old `{config.docs.root_dir}` content.

## Process

1. Read `.claude/skills/c-shared/config.md`.
2. Explore the repo only enough to understand the current state.
3. Use project glossary terms and respect ADRs in the touched area.
4. Identify the highest practical test seams for the feature.
5. Write the PRD under `{config.docs.prd_dir}`.

## Template

```markdown
# PRD: <title>

## Problem Statement

## Solution

## User Stories
1. As a ..., I want ..., so that ...

## Implementation Decisions

## Testing Decisions

## Out of Scope

## Further Notes
```

Implementation decisions describe modules, interfaces, contracts, schema, interactions, and trade-offs. Avoid file paths and code snippets unless a prototype snippet encodes a decision more precisely than prose.

## Output

```text
c-prd(done|blocked)

doc:
- {config.docs.prd_dir}/<file>.md
ev:
- ...
risk:
- none
next:
- /c-issues <prd>
```
