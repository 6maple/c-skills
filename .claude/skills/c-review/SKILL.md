---
name: c-review
description: Review the changes since a fixed point along two axes — Standards and Spec. Use when the user wants to review a branch, PR, work-in-progress changes, or asks to review since a branch, commit, tag, or merge-base.
disable-model-invocation: true
---

# Review

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards** — does the code conform to this repo's documented coding standards?
- **Spec** — does the code faithfully implement the originating issue / PRD / spec?

Both axes run as parallel sub-agents so they don't pollute each other's context, then this skill aggregates their findings.

Read `.claude/skills/c-shared/config.md` first.

## Process

### 1. Pin the fixed point

Whatever the user said is the fixed point — a commit SHA, branch name, tag, `main`, `HEAD~5`, etc. Don't be opinionated; pass it through.

If they didn't specify one, ask: "Review against what — a branch, a commit, or `main`?" Don't proceed until you have it.

Capture the diff command once:

```bash
git diff <fixed-point>...HEAD
git log <fixed-point>..HEAD --oneline
```

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in commit messages.
2. A path the user passed as an argument.
3. A PRD/spec file under configured docs, `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the Spec sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Anything in the repo that documents how code should be written. Common locations:

- `CLAUDE.md`, `AGENTS.md`.
- `CONTRIBUTING.md`.
- configured context and ADR docs.
- `.editorconfig`, `eslint.config.*`, `biome.json`, `prettier.config.*`, `tsconfig.json`.
- `STYLE.md`, `STANDARDS.md`, `STYLEGUIDE.md`, or similar.

Collect the list of files. The Standards sub-agent will read them.

### 4. Spawn both sub-agents in parallel

Send a single message with two `Agent` tool calls. Use the `general-purpose` subagent for both.

**Standards sub-agent prompt** — include:

- The full diff command and commit list.
- The list of standards-source files.
- The brief: read the standards docs, then read the diff, then report every place the diff violates a documented standard. Cite the standard. Distinguish hard violations from judgement calls. Skip anything tooling enforces. Under 400 words.

**Spec sub-agent prompt** — include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The brief: read the spec, then read the diff, then report missing/partial requirements, scope creep, and requirements that look implemented but wrong. Quote the spec line for each finding. Under 400 words.

If the spec is missing, skip the Spec sub-agent and note this in the final report.

### 5. Aggregate

Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do not merge or rerank findings. End with a one-line summary: total findings per axis, and the worst single issue if any.

## Why two axes

A change can pass one axis and fail the other. Reporting them separately stops one axis from masking the other.
