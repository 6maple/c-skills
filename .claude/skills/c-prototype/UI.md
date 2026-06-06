# UI Prototype

Generate several radically different UI variations on a single route, switchable by URL param and a floating bottom bar.

Use this when the question is what something should look like or how an interaction should feel.

## Preferred shape

Prefer modifying an existing page route with `?variant=`. Existing data fetching, params, auth, and app shell stay. Only rendering swaps.

Create a new throwaway route only when there is no sensible existing page to host the prototype.

## Process

### 1. State the question and pick N

Default to 3 variants. Cap at 5. Write one line near the prototype:

```text
Three variants of <surface>, switchable via ?variant=, on <route>.
```

### 2. Generate radically different variants

Each variant must differ in structure, layout, hierarchy, or primary affordance. Not just colors or copy.

Use the project's component library and styling system.

### 3. Wire them together

Use a single switcher based on a URL search param:

```tsx
const variant = searchParams.get('variant') ?? 'A'
```

Keep existing data fetching above the switcher.

### 4. Floating switcher

Add a small bottom-centre switcher:

- left arrow: previous variant
- label: current variant
- right arrow: next variant

Update the URL param so variants are shareable and reload-stable. Hide the switcher in production builds.

### 5. Capture and clean up

When a variant wins:

- delete losing variants
- delete switcher
- fold the winning idea into real code properly

## Anti-patterns

- Variants that differ only in color or text.
- Sharing so much code that variants cannot disagree structurally.
- Real mutations against production systems.
- Promoting prototype code directly to production.
