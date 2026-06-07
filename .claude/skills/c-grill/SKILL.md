---
name: c-grill
description: Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates documentation inline as decisions crystallise. Use when the user wants to stress-test a plan against their project's language and documented decisions.
disable-model-invocation: true
---

# c-grill

Interview me relentlessly about every aspect of this plan until we reach a shared understanding.

Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer. Ask the questions one at a time, waiting for feedback on each question before continuing. If a question can be answered by exploring the codebase, explore the codebase instead.

## Domain awareness

Read `.claude/skills/c-shared/config.md` first, then use:

- `{config.docs.context_file}` as the domain glossary.
- `{config.docs.adr_dir}` for ADRs.
- `CONTEXT-MAP.md` if the repo uses multiple contexts.

Create files lazily — only when you have something to write.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `{config.docs.context_file}`, call it out immediately.

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term.

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it.

### Update context inline

When a term is resolved, update `{config.docs.context_file}` right there. Don't batch these up. Use [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`{config.docs.context_file}` should be totally devoid of implementation details. Do not treat it as a spec, scratch pad, or repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will wonder why.
3. **The result of a real trade-off** — there were genuine alternatives and one was picked for specific reasons.

If any of the three is missing, skip the ADR. Use [ADR-FORMAT.md](./ADR-FORMAT.md).
