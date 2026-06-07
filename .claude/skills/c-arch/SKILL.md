---
name: c-arch
description: Find deepening opportunities in a codebase, informed by the domain language and ADRs. Use when the user wants to improve architecture, find refactoring opportunities, consolidate tightly-coupled modules, or make a codebase more testable and AI-navigable.
disable-model-invocation: true
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones.

The aim is testability and AI-navigability.

## Glossary

Use these terms exactly in every suggestion. Consistent language is the point. Full definitions in [LANGUAGE.md](LANGUAGE.md).

- **Module** — anything with an interface and an implementation.
- **Interface** — everything a caller must know to use the module.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place.
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

Key principles:

- **Deletion test**: imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**

This skill is informed by the project's domain model. Read `.claude/skills/c-shared/config.md` first, then use the configured domain glossary and ADR paths.

## Process

### 1. Explore

Read the project's domain glossary and any ADRs in the area you're touching first. Then explore the codebase organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules shallow?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the deletion test to anything you suspect is shallow.

### 2. Present candidates as an HTML report

Write a self-contained HTML file to the OS temp directory so nothing lands in the repo. Open it for the user when possible and tell them the absolute path.

The report uses [HTML-REPORT.md](HTML-REPORT.md). Each candidate card includes:

- Files/modules involved.
- Problem.
- Solution.
- Benefits in terms of locality and leverage.
- Before / after visualisation.
- Recommendation strength: `Strong`, `Worth exploring`, or `Speculative`.

End with a top recommendation. Do NOT propose interfaces yet. After the file is written, ask: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Side effects happen inline as decisions crystallize:

- Naming a deepened module after a concept not in `{config.docs.context_file}`? Add the term using `../c-grill/CONTEXT-FORMAT.md`.
- User rejects the candidate with a load-bearing reason? Offer an ADR using `../c-grill/ADR-FORMAT.md`.
- Want to explore alternative interfaces? See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md).
