---
name: c-auto-route
description: Route one user request to the next c-* skill. Use when the user wants automatic selection but not execution, or when c-auto needs a route-only decision.
disable-model-invocation: true
---

# c-auto-route

Pick exactly one next skill. Do not inspect the repo. Do not ask questions. Do not plan or execute.

## Routing

- unclear design, blocking ambiguity, vocabulary conflict -> `/c-grill`
- first-touch project, resume, takeover, unknown project state -> `/c-takeover`
- new feature or cross-module product behavior -> `/c-prd`
- approved PRD/spec/plan that needs tickets -> `/c-issues`
- UI, frontend, exploratory, volatile, small local change -> `/c-implement`
- stable logic, API contract, high-risk behavior, test-first request -> `/c-tdd`
- bug, regression, failing test, performance failure -> `/c-fix`
- behavior-preserving cleanup, rename, move, small structure change -> `/c-refactor`
- architecture friction, shallow modules, missing seams -> `/c-arch`
- review diff/branch/PR/current changes -> `/c-review`
- save state for another session -> `/c-handoff`
- multi-step autonomous goal -> `/c-auto`

## Output

Emit one slash command only.

```text
/c-skill <tightened task>
```
