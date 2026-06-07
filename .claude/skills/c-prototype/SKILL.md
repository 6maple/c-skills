---
name: c-prototype
description: Build a throwaway prototype to flesh out a design before committing to it. Routes between two branches — a runnable terminal app for state/business-logic questions, or several radically different UI variations toggleable from one route. Use when the user wants to prototype, sanity-check a data model or state machine, mock up a UI, explore design options, or says prototype this, let me play with it, or try a few designs.
disable-model-invocation: true
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

Read `.claude/skills/c-shared/config.md` first, then use the configured domain glossary and ADR paths when relevant.

## Pick a branch

Identify which question is being answered — from the user's prompt, the surrounding code, or by asking if the user is around:

- **"Does this logic / state model feel right?"** -> [LOGIC.md](LOGIC.md). Build a tiny interactive terminal app that pushes the state machine through cases that are hard to reason about on paper.
- **"What should this look like?"** -> [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts — getting this wrong wastes the whole prototype.

If the question is genuinely ambiguous and the user isn't reachable, default to whichever branch better matches the surrounding code and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked as such.** Locate the prototype code close to where it will actually be used, but name it so a casual reader can see it's a prototype, not production.
2. **One command to run.** Whatever the project's existing task runner supports. The user must be able to start it without thinking.
3. **No persistence by default.** State lives in memory. Persistence is the thing the prototype is checking, not something it should depend on.
4. **Skip the polish.** No tests, no error handling beyond what makes the prototype runnable, no abstractions.
5. **Surface the state.** After every action or variant switch, print or render the full relevant state.
6. **Delete or absorb when done.** When the prototype has answered its question, either delete it or fold the validated decision into the real code.

## When done

The answer is the only thing worth keeping from a prototype.

Capture it somewhere durable — commit message, ADR, issue, or `NOTES.md` next to the prototype — along with the question it was answering. If the user is around, that capture is a quick conversation; if not, leave the placeholder so they or you on the next pass can fill in the verdict before deleting the prototype.
