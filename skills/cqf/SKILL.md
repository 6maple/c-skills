---
name: cqf
description: only invokes by user
---

# Clarify

Use a focused discussion to uncover the user's actual goal, resolve material decisions, and reach shared understanding without unnecessary questioning.

The result is a confirmed understanding, not a PRD, design, plan, implementation, or other downstream artifact. Stop after alignment unless the user explicitly starts a new task.

## Boundary

- Use only when the user explicitly invokes this skill by name or command.
- Never select it automatically because a request is vague, risky, underspecified, or ready for planning.
- Do not couple it to any project workflow, document path, or downstream skill.
- Do not force agreement. An explicit unresolved difference is better than false consensus.

## Core Behavior

- Discuss what is necessary and useful; do not optimize for the fewest questions.
- Make material assumptions, inferences, recommendations, and Agent decisions visible when they can change the target, scope, trade-offs, downstream artifact, or practical result.
- Ask the user only for information or decisions that cannot be safely derived, verified, or delegated.
- Keep one active convergence path and progressively narrow it toward a defined target depth.
- Do not assume the user's first wording is precise, complete, or identical to what they ultimately want.

## Set the Target Depth

Infer how far the discussion needs to go from the user's request, then state it briefly.

Possible depths include:

- intent clear enough to decide whether or why to proceed;
- requirements clear enough to support a requirements document;
- design decisions clear enough to support design work;
- behavior and boundaries clear enough to support implementation.

These are guides, not fixed stages or a required menu.

Ask the user to choose only when the target depth is genuinely ambiguous or materially changes the discussion cost. Otherwise, disclose the inferred depth and continue. The target depth defines what counts as sufficient and when to stop.

## Discussion Loop

Before asking a question:

1. Read the existing conversation and user-provided material.
2. Verify material facts through available files, tools, documentation, or the environment when practical.
3. Form a concise, correctable view of:
   - what the user currently asks for;
   - what change or outcome may actually matter;
   - known constraints and boundaries;
   - material assumptions or Agent decisions;
   - the most upstream unresolved issue.
4. Present only what is useful for correction or review.

Then repeat:

```text
identify the most upstream material gap
→ resolve one core judgment
→ prune dependent or irrelevant branches
→ update the shared understanding
→ repeat until the target depth is supported
```

Prefer the unresolved issue that constrains the most later decisions, excludes the most irrelevant directions, or must be resolved before lower-level details become meaningful.

For obviously vague requests, begin with scope-narrowing questions. Do not jump into implementation choices, local details, or edge cases while the goal, user, scenario, or main boundary remains unclear.

Recompute the next question after every answer. Do not follow a prewritten questionnaire after the direction changes. The skill may ask no question when the existing context already supports alignment.

## Handle Facts and Decisions Differently

### Verifiable facts

Look them up instead of asking the user. Briefly disclose only facts that materially affect the shared understanding.

If a material fact cannot be verified, mark it as an unknown premise rather than presenting it as true.

### User-owned decisions

Ask the user when a decision materially affects the goal, scope, success criteria, major trade-offs, risk, reversibility, or next step, especially when it depends on the user's values or domain judgment.

Give a recommendation first when responsible. For high-impact choices, state:

- the recommendation;
- the main reason;
- the principal cost or trade-off;
- the condition that would change the recommendation.

The user's informed decision is final. Shared understanding does not require accepting the Agent's recommendation.

### Agent decisions

The Agent may decide low-risk, reversible, local matters with a clear default, or decisions the user explicitly delegates.

Disclose material Agent decisions briefly, usually before the next question:

```text
I will use A for now because it is simpler and reversible.

The next decision that needs your input is ...
```

Do not report trivial presentation or operational choices.

### Irrelevant details

Ignore matters whose different answers would not affect the target depth, current direction, or next step.

## Question Rules

- Ask for one core judgment per turn; do not batch independent decisions.
- Attach a current interpretation or recommendation when useful, so the user can correct rather than generate from nothing.
- Do not invent facts, experiences, feelings, or private context known only to the user.
- Use open questions to discover unknown intent.
- Use limited options to clarify known trade-offs.
- <important-question-schema>When a supported question/input tool is available, use it first to present the question and options. Otherwise, use a concise Markdown list labeled `A`, `B`, `C`, etc.</important-question-schema>
- Put the recommendation first when appropriate, keep options to 2–4, and allow the user to reject or reframe them. Use labeled options only for real decision branches.
- Use recommendations to reduce decision burden.
- Always allow the user to reject or reframe the offered options.

Treat a user-proposed solution as an important candidate, not automatically as the underlying need. Challenge it only when there is a material mismatch, untested premise, simpler credible path, or important unacknowledged cost. Once the user understands the trade-off and still chooses it, accept the decision.

Probe only to the depth that can change or guide the current task. Do not pursue ultimate psychological motives or reinterpret the user beyond the evidence.

## Maintain Alignment State

Internally distinguish:

- **confirmed** — explicitly stated or confirmed by the user;
- **current inference** — the Agent's correctable interpretation;
- **Agent decision** — a disclosed default or delegated decision;
- **unresolved** — still capable of changing the result at the target depth;
- **parked** — relevant but outside the current convergence path.

Do not promote vague agreement into a stronger claim. Do not display the full state every turn; show only meaningful changes, new defaults, corrected assumptions, and the next material issue.

Classify new information as follows:

- correction to the current direction → absorb it;
- necessary dependency → resolve it in dependency order;
- independent new goal or feature → park it explicitly;
- information that invalidates the current goal → reset the target and direction;
- explicit request to change focus → switch and restate the target depth.

Do not silently expand scope because a related idea appears.

## Control Expansion

Do not set a fixed question limit. Compress the discussion when the marginal value of more questions falls, especially when:

- answers become repetitive, vague, or visibly fatigued;
- new questions only complete a format;
- each answer spawns lower-value details;
- remaining decisions are mostly low-risk and reversible;
- the Agent has a reliable recommendation but keeps pushing decisions back to the user;
- discussion drifts into unrelated motives, scenarios, or features.

When this happens, summarize what is known, park side branches, make and disclose safe defaults, and ask only what can still change the direction. Otherwise, move to validation and closure.

## Check Sufficiency

Judge sufficiency according to the target depth and current task, not a fixed questionnaire.

Before closing, ensure that:

- the current understanding excludes the main wrong directions;
- the next stage will not need to guess material information;
- remaining unknowns cannot overturn the current scope or main approach;
- material assumptions and Agent decisions are visible;
- the user understands the main cost of important choices;
- no material contradiction remains hidden.

Abstract phrases such as “for everyone,” “improve experience,” or “keep it simple” require refinement only when different interpretations would change the result.

## Validate Based on Risk

User confirmation is necessary, but brief agreement is not always sufficient evidence of alignment. Do not automatically distrust every confirmation.

Validate a material risk when there are signs such as:

- abstract or ambiguous goals;
- the user merely repeating the Agent's framing;
- inconsistency with earlier statements;
- quick acceptance of a recommendation with a significant cost;
- repeated delegation that may indicate fatigue rather than intent;
- conflicting desired outcomes;
- increasingly terse answers;
- a proposed solution without a clear problem it solves.

Validate one core risk at a time using a concrete example, acceptance of a consequence, a failure test, direct resolution of a contradiction, or explicit disclosure of an Agent decision and its trade-off.

Repeat only while a remaining material risk can still change the result. No risk signal means no extra interrogation.

## End States

The discussion may end in one of three valid states:

1. **Confirmed alignment** — the user confirms an understanding sufficient for the target depth.
2. **Actionable alignment with explicit unknowns** — remaining unknowns and temporary defaults are visible and do not block the agreed next stage.
3. **Explicit unresolved disagreement** — a material difference, missing fact, or unstable preference prevents alignment; record it rather than forcing agreement.

Only the first state is complete alignment.

## Final Output

Provide a concise summary scaled to the task. Include only applicable items, typically:

- the actual goal or change sought;
- success at the target depth;
- key scope, boundaries, and non-goals;
- important user-confirmed decisions;
- material Agent decisions and assumptions;
- unresolved but non-blocking matters;
- parked side topics;
- one recommended next step, clearly marked as a recommendation and not executed.

Invite correction in a way that lowers the cost of disagreement:

```text
Please point out the least accurate part or the trade-off that least reflects what you want. If none, confirm the summary.
```

If alignment cannot be reached, state what is agreed, the unresolved issue, both current positions when known, and what evidence or decision would allow it to be revisited.

Revise the record while useful new information is still emerging. If further discussion no longer adds information, state that no shared record can currently be formed and stop without claiming agreement.

After the user confirms or accepts an accurately recorded end state, stop. Do not create downstream artifacts or continue the original task within this skill.
