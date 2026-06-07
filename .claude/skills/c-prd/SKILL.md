---
name: c-prd
description: Turn the current conversation context into a PRD and publish it to the project issue tracker. Use when user wants to create a PRD from the current context.
disable-model-invocation: true
---

This skill takes the current conversation context and codebase understanding and produces a PRD. Do NOT interview the user — just synthesize what you already know.

Read `.claude/skills/c-shared/config.md` first. Write PRDs under `{config.docs.prd_dir}` unless the repo documents another PRD location.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the PRD, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. Check with the user that these seams match their expectations.

3. Write the PRD using the template below, then publish it to the configured issue tracker or PRD path.

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As a <role>, I want <capability>, so that <benefit>

## Implementation Decisions

A list of implementation decisions that were made.

This can include:

- The modules that will be built/modified.
- The interfaces of those modules that will be modified.
- Technical clarifications from the developer.
- Architectural decisions.
- Schema changes.
- API contracts.
- Specific interactions.

Do NOT include specific file paths or code snippets. They may become outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can, inline it within the relevant decision and note briefly that it came from a prototype.

## Testing Decisions

Include:

- A description of what makes a good test.
- Which modules will be tested.
- Prior art for the tests.

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.
