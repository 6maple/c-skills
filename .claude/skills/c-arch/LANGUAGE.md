# Language

Shared vocabulary for every suggestion this skill makes. Use these terms exactly. Do not substitute `component`, `service`, `API`, `signature`, `boundary`, `unit`, `layer`, or `wrapper` when the terms below are meant.

## Terms

**Module** — anything with an interface and an implementation. Scale-agnostic: function, class, package, or tier-spanning slice.

**Interface** — everything a caller must know to use the module correctly: types, invariants, ordering, error modes, config, and performance characteristics. Not just the type signature.

**Implementation** — what is inside a module.

**Depth** — leverage at the interface. A module is **deep** when a large amount of behavior sits behind a small interface. A module is **shallow** when the interface is nearly as complex as the implementation.

**Seam** — where a module interface lives; a place where behavior can be altered without editing in place.

**Adapter** — a concrete thing satisfying an interface at a seam.

**Leverage** — what callers get from depth: more capability per unit of interface they must learn.

**Locality** — what maintainers get from depth: change, bugs, knowledge, and verification concentrate in one place.

## Principles

- Depth is a property of the interface, not the implementation.
- The deletion test: if deleting the module makes complexity vanish, it was a pass-through; if complexity reappears across N callers, it was earning its keep.
- The interface is the test surface.
- One adapter means a hypothetical seam. Two adapters means a real seam.
