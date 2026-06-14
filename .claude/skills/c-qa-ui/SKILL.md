---
name: c-qa-ui
description: ban
description-only: Reviews visual fidelity between an original high-fidelity UI design image and a current page screenshot. Use manually via /c-qa-ui after UI code is generated to find visible restoration gaps and provide focused fix suggestions.
disable-model-invocation: true
---

<important>
Strictly follow this path mapping:
```json
{
  "path_mappings": {
    "CONTEXT.md": ".docs/CONTEXT.md",
    "CONTEXT-MAP.md": ".docs/CONTEXT-MAP.md",
    "docs/adr/": ".docs/adr",
    "per_context_CONTEXT.md": "<context>/.docs/CONTEXT.md",
    "per_context_docs/adr/": "<context>/.docs/adr"
  },
  "outputs": {
    "prd": ".docs/prd",
    "issue": ".docs/issues",
    "handoff": ".docs/HANDOFF.md",
    "temporary": ".docs/.tmp",
    "architecture_report": ".docs/.tmp/architecture-review-<timestamp>.html"
  },
  "configs": {
    "issue_tracker": ".docs/agents/issue-tracker.md"
  },
  "search_dirs": {
    "spec": [
      ".docs/prd",
      ".docs/issues",
      ".docs/specs",
      ".docs/.scratch"
    ]
  }
}
```
</important>

# c-qa-ui

## Goal

Compare the original high-fidelity design image with the current page screenshot.

Output visible UI restoration differences and actionable visual fix suggestions.

## Inputs

Required:

- Original design image
- Current page screenshot

Optional:

- Page name
- Target device size
- Design/screenshot size
- Notes for intentional differences

If either required image is missing, ask for it.

If size, ratio, crop, scroll position, or visible area differs, still review comparable areas and mark uncertain items.

## Scope

Only review visual fidelity.

Check:

- Structure: blocks, hierarchy, proportions
- Layout: position, spacing, alignment, margins, whitespace
- Size: component scale, image ratio, button/card size, radius, border
- Typography: size, weight, line height, color, hierarchy
- Color: background, gradient, opacity, shadow, border, state color
- Assets: image, icon, avatar, illustration, decoration
- Quality: roughness, clipping, overflow, overlap, density, polish

Exclude:

- Code
- Runtime/debugging
- Implementation cause
- Business logic
- Performance
- Interaction flow
- Code snippets or direct edits

## Review Rules

Focus on naked-eye differences.

Prioritize issues that most affect design fidelity.

Use approximate visual judgment; do not fake pixel precision.

Group repeated issues.

Do not report intentional differences stated by the user.

Mark uncertain findings when caused by crop, viewport, scaling, or missing area.

## Priority

- P0: Breaks main structure or visual identity
- P1: Obvious mismatch; should fix before acceptance
- P2: Detail polish

## Output

Use the format below only as a reference. Adapt as needed.

- Verdict: one-sentence fidelity judgment
- Major Gaps: high-impact visual mismatches
- Minor Gaps: detail-level mismatches
- Fix List: prioritized visual fixes

For each issue, prefer:

- Priority
- Location
- Difference
- Suggestion

Keep it concise, specific, and actionable.
