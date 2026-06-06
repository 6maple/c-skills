# Interface Design

Use this when the user wants alternative interfaces for a chosen deepening candidate.

## Process

### 1. Frame the problem space

Explain:

- constraints the new interface must satisfy
- dependencies and adapter strategy
- what sits behind the seam
- rough illustrative sketch, not a proposal

Show this to the user, then proceed.

### 2. Design it multiple ways

Create at least three radically different interface designs:

1. Minimize the interface: 1–3 entry points, maximum leverage.
2. Maximize flexibility: supports many use cases.
3. Optimize for the common caller: default case is trivial.
4. If relevant, design around ports/adapters for cross-seam dependencies.

Each design must include:

- interface surface: types, methods, params, invariants, ordering, error modes
- usage example
- implementation hidden behind the seam
- dependency and adapter strategy
- trade-offs: leverage, locality, seam placement

### 3. Compare

Present designs sequentially, then compare by depth, locality, and seam placement. Recommend one. If a hybrid is stronger, propose it.
