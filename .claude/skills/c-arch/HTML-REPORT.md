# HTML Report Format

Render the architecture review as one self-contained HTML file in the OS temp directory. Do not write it into the repo.

Use Tailwind via CDN for layout. Use Mermaid via CDN only when a graph, flow, or sequence is the clearest representation. Prefer hand-built boxes, arrows, and inline SVG when Mermaid would make the diagram generic.

## Header

Include repo name, date, and a compact legend:

- solid box = module
- dashed line = seam
- red arrow = leakage
- thick dark box = deep module

No long introduction. Start with candidates.

## Candidate card

Each candidate is one card:

- **Title** — short, names the deepening.
- **Badge row** — `Strong`, `Worth exploring`, or `Speculative`.
- **Files** — monospaced list.
- **Before / After diagram** — centrepiece; side-by-side.
- **Problem** — one sentence.
- **Solution** — one sentence.
- **Wins** — short bullets using `leverage` and `locality`.
- **ADR callout** — only when a real ADR conflict matters.

## Diagram patterns

Use whichever fits:

- Mermaid dependency/call graph.
- Hand-built boxes-and-arrows.
- Cross-section showing layered shallowness.
- Mass diagram showing interface size vs implementation size.
- Call-graph collapse showing many calls hidden behind one deep module.

## Top recommendation

End with one larger card naming the candidate to tackle first and why.

## Tone

Plain, sparse, visual. Use architecture terms from [LANGUAGE.md](./LANGUAGE.md). If a sentence can be a bullet, make it a bullet. If a bullet can be cut, cut it.
