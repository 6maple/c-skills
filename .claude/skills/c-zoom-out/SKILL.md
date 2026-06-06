---
name: c-zoom-out
description: Explain a code area one abstraction level up. Use when the user is unfamiliar with a section of code, asks how this fits into the bigger picture, or needs a module/caller map before changing code.
disable-model-invocation: true
---

# c-zoom-out

Go up one layer of abstraction. Do not implement.

## Process

1. Read `.claude/skills/c-shared/config.md`.
2. Use the project domain glossary when available.
3. Inspect only the relevant files, callers, callees, routes, commands, tests, and ADRs needed to explain the area.
4. Produce a concise map of the relevant modules and how they relate.
5. Name the likely next skill if the user wants to act.

## Output

```text
c-zoom-out(done|blocked)

map:
1. <module> -> <role / callers / callees>
flow:
- ...
vocabulary:
- ...
risk:
- none
next:
- /c-skill ...
```
