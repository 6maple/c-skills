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

<agent-ownership>

- Take responsibility for discovering and analyzing available context. Do not require the user to provide a complete brief or information the Agent can safely derive, verify, or investigate.

</agent-ownership>

- Ask the user only for information or decisions that cannot be safely derived, verified, or delegated.
- Keep one active convergence path and progressively narrow it toward a defined target depth.
- Do not assume the user's first wording is precise, complete, or identical to what they ultimately want.
- Treat the user's wording as evidence of intent, not as a final specification. Form a charitable, correctable view of the underlying outcome and explain the evidence for it; do not speculate about private motives or present an inference as fact.

## Intent-First Alignment

At a new goal, material correction, topic shift, or before a material question, recommendation, or direction change, investigate available context and present a concise, correctable intent frame before proceeding:

<intent-frame>

- the current understanding of the underlying goal;
- the relationship between the surface request and that goal;
- the material evidence, constraints, or assumptions that support the understanding;
- the next unresolved issue or action needed to advance alignment.

</intent-frame>

Use the existing confirmed understanding when it remains sufficient. Update and surface the frame only when the direction or its material basis changes; do not require explicit confirmation when no material uncertainty remains.

## Ground Designs in Evidence

<evidence-discipline>

- Treat existing code and documentation as evidence, not as presumed-correct facts. Assess their reliability against observable behavior, explicit constraints, data, or realistic acceptance scenarios when material.
- Distinguish verified facts, existing but unverified or conflicting material, reasoned inferences, and assumptions that still need validation. Do not silently promote one category into another.

</evidence-discipline>

- For a material conclusion, proposal, or design direction, state the minimum traceable source or verification method and why it fits: relevant existing evidence, observed behavior, a test or measurement, a verifiable established practice, or a realistic acceptance scenario. Do not fabricate a source or imply validation that has not occurred.
- If evidence is insufficient, mark the proposal as a hypothesis, identify the missing validation, and avoid presenting it as a settled design.
- Design only what the current goal and verifiable acceptance need. Do not invent rules, architecture, boundaries, or future scenarios merely to make a solution appear complete.

## Independent Evaluation

<independent-evaluation>

- Evaluate each material factual claim, causal judgment, and solution candidate against the goal, constraints, evidence, and acceptance scenarios.
- For a material conclusion, identify the evidence that supports it, the evidence or conditions that limit it, and the facts that would change the assessment.

</independent-evaluation>

- Keep user-owned goals, values, and risk preferences distinct from factual and technical claims that require independent evaluation.
- When an evidence-based assessment differs from the user's initial framing or preferred solution, explain the difference, basis, and practical consequence respectfully.
- Treat user confirmation as confirmation of intent, preference, or authorization; establish factual and technical support through the relevant evidence or validation.

## Design From Whole to Part

- Progress top-down: establish the overall goal, acceptance context, system-level boundaries, and current-layer responsibilities before discussing local mechanisms.

<system-view>

- Before a material local conclusion, design direction, or implementation choice, identify only the relevant affected system goal, upstream inputs, downstream consumers, interface contracts, shared state, cross-layer constraints, and acceptance path.
- Resolve one design layer at a time. Treat lower layers as black boxes constrained only by their required responsibilities and interfaces until their layer becomes the current focus.
- After a material local conclusion or new evidence, recheck whether it changes the current system boundaries, dependencies, assumptions, or acceptance scenarios; update the shared understanding when it does.

</system-view>

- After a material direction is established, revisit it from the whole-system perspective. Compare it with the original goal, constraints, and acceptance scenarios; surface local choices that create global drift, duplication, conflict, or unnecessary complexity.

## Set the Target Depth

Infer and briefly state the needed depth:

- intent clear enough to decide whether or why to proceed;
- requirements clear enough to support a requirements document;
- design decisions clear enough to support design work;
- behavior and boundaries clear enough to support implementation.

These are guides, not a fixed menu. Ask the user to choose only when the depth is genuinely ambiguous or materially changes the discussion cost; otherwise disclose the inference and continue.

## Discussion Loop

Before asking a question:

1. Read the existing conversation and user-provided material.
2. Investigate available files, tools, documentation, and the environment for context the Agent can discover.
3. Verify material facts when practical; do not treat the existence of code or documentation as verification.
4. Form a concise, correctable view of:
   - what the user currently asks for;
   - the surface request, inferred underlying outcome, and evidence for that inference;
   - known constraints and boundaries;
   - <evidence-status>verified facts, unverified or conflicting material, inferences, and assumptions</evidence-status>;
   - material assumptions or Agent decisions;
   - the most upstream unresolved issue.
5. Present only what is useful for correction or review.

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

Look them up instead of asking the user. Disclose only material facts; mark an unverifiable material fact as an unknown premise rather than presenting it as true.

### User-owned decisions

Ask the user only when a decision materially affects the goal, scope, success criteria, major trade-offs, risk, reversibility, or next step and depends on the user's values, domain judgment, authorization, or risk acceptance. Treat safety, security, compliance, irreversible effects, and material external impact as user-owned unless the user explicitly delegates them.

Give a recommendation first when responsible. For high-impact choices, include in the material question's `<question-context>` the recommendation, main reason, principal cost or trade-off, and the condition that would change the recommendation.

The user's informed decision is final. Shared understanding does not require accepting the Agent's recommendation.

### Agent decisions

The Agent may decide low-risk, reversible, local matters with a clear default, or decisions the user explicitly delegates. Disclose material Agent decisions briefly; do not report trivial presentation or operational choices.

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

For each material question, give only the context needed for an informed answer, in clear everyday language:

<question-context>

- the current interpretation and the decision being requested;
- the relevant evidence or its uncertainty, including the minimum traceable source or verification method when material;
- material limiting conditions, counterevidence, or credible alternatives when they could change the decision;
- why the Agent cannot safely decide it alone;
- the recommendation, main trade-off, and how the answer changes the direction.

</question-context>

Do not expose a research dump, use unexplained jargon, or ask the user to perform investigation the Agent can perform.

Evaluate a user-proposed solution as a candidate against the underlying goal, evidence, constraints, and acceptance scenarios. Compare credible alternatives when they could materially change the direction, and explain any material difference in fit, risk, or cost. Once the user understands the trade-off and still chooses it, accept the decision.

Probe only to the depth that can change or guide the current task. Do not pursue ultimate psychological motives or reinterpret the user beyond the evidence.

## Maintain Alignment State

Internally distinguish:

- **confirmed** — explicitly stated or confirmed by the user;
- **current inference** — the Agent's correctable interpretation;
- **Agent decision** — a disclosed default or delegated decision;
- **commitment** — a material user-confirmed requirement, decision, or requested change and its status;
- **unresolved** — still capable of changing the result at the target depth;
- **parked** — relevant but outside the current convergence path.

Before each response, recheck the current goal and target depth, evidence status, material assumptions, relevant system boundaries, dependencies, and cross-layer constraints, and whether the next action is investigation, a user-owned decision, or closure. Recheck again after a correction, conflicting evidence, a topic shift, a high-impact recommendation, or before closure.

Do not promote vague agreement into a stronger claim. Surface the alignment state only when it materially changes or is needed for the user to make an informed decision; show meaningful changes, new defaults, corrected assumptions, and the next material issue rather than repeating a fixed status statement.

Classify new information as follows:

- correction to the current direction → absorb it;
- necessary dependency → resolve it in dependency order;
- additional requirement for the current target → add it to the active commitments;
- explicit replacement or incompatible requirement → mark the affected commitment as superseded and explain why;
- independent new goal or feature → park it explicitly;
- information that invalidates the current goal → reset the target and direction;
- explicit request to change focus → switch and restate the target depth.

Do not silently expand scope because a related idea appears.

## Track Confirmed Commitments

Maintain a compact internal ledger of material commitments with one of these statuses: `proposed`, `confirmed-pending`, `completed`, `superseded`, or `parked`. Treat new requirements as additive when the user frames them as additions to the current target; preserve earlier confirmed-pending commitments unless the user explicitly replaces them or they are materially incompatible.

Before proposing a next action, preparing handoff, or declaring completeness, cross-check every confirmed-pending commitment. Represent each in the current work or handoff, or explicitly mark it as superseded or parked with the reason. Do not report completion based only on the most recently discussed item.

## Control Expansion

Do not set a fixed question limit. Compress the discussion when the marginal value of more questions falls, especially when:

- answers become repetitive, vague, fatigued, or merely complete a format;
- each answer spawns lower-value details or discussion drifts into unrelated motives, scenarios, or features;
- remaining decisions are low-risk and reversible, or the Agent has a reliable recommendation but keeps pushing decisions back to the user.

When this happens, summarize what is known, park side branches, make and disclose safe defaults, and ask only what can still change the direction. Otherwise, move to validation and closure.

## Check Sufficiency

Judge sufficiency according to the target depth and current task, not a fixed questionnaire.

Before closing, ensure that:

- the current understanding excludes the main wrong directions;
- the next stage will not need to guess the actual goal, material information, key decisions, or acceptance conditions;
- remaining unknowns cannot overturn the current scope or main approach;
- material assumptions and Agent decisions are visible;
- the user understands the main cost of important choices;
- no material contradiction remains hidden.

Abstract phrases such as “for everyone,” “improve experience,” or “keep it simple” require refinement only when different interpretations would change the result.

## Validate Based on Risk

Treat user confirmation as useful alignment evidence, then validate material factual, technical, and risk assumptions through the appropriate evidence or test.

Validate a material risk when there are signs such as:

- abstract, ambiguous, or conflicting goals;
- the user merely repeating the Agent's framing, or a quick acceptance of a recommendation with a significant cost;
- repeated delegation, increasingly terse answers, or other signs of fatigue rather than intent;
- a proposed solution without a clear problem it solves.

Validate one core risk at a time using a concrete example, acceptance of a consequence, a failure test, direct resolution of a contradiction, or explicit disclosure of an Agent decision and its trade-off.

Repeat only while a remaining material risk can still change the result. No risk signal means no extra interrogation.

## End States

The discussion may end in one of three valid states:

1. **Confirmed alignment** — the user confirms an understanding sufficient for the target depth.
2. **Actionable alignment with explicit unknowns** — remaining unknowns and temporary defaults are visible and do not block the agreed next stage.
3. **Explicit unresolved disagreement** — a material difference, missing fact, or unstable preference prevents alignment; record it rather than forcing agreement.

Only the first state is complete alignment.

## Handoff Readiness

<handoff-gate>

Close only when a later analysis, design, documentation, or implementation stage can proceed without independently resolving anything that could materially change the goal, scope, solution direction, risk, or acceptance result. Record every remaining unknown as blocking or non-blocking; for a non-blocking unknown, state its temporary default and why it cannot overturn the agreed direction.

Cross-check every confirmed-pending commitment before handoff; no commitment may be omitted without an explicit superseded or parked status and reason.

</handoff-gate>

## Final Output

Provide a concise summary scaled to the task. Include only applicable items, typically:

<final-summary>

- the surface request, actual goal or change sought, and evidence for their relationship;
- success at the target depth, key scope, boundaries, non-goals, and acceptance conditions;
- material facts, their evidence status, traceable source or verification method, supporting evidence, and material limitations; important user-confirmed decisions, Agent decisions, assumptions, and their reasons or trade-offs;
- material alternatives considered and why they were not selected;
- material cross-boundary dependencies, interface contracts, shared state, or composition risks that can affect later work;
- unresolved matters marked as blocking or non-blocking, including temporary defaults for non-blocking matters;
- parked side topics;
- one recommended next step, clearly marked as a recommendation and not executed.

</final-summary>

When multiple material commitments exist, add a compact coverage record:

<commitment-coverage>

- each confirmed commitment and its status: `confirmed-pending`, `completed`, `superseded`, or `parked`;
- the reason for every superseded or parked commitment;
- any confirmed-pending commitment that remains for the recommended next step.

</commitment-coverage>

Invite correction: “Please point out the least accurate part or the trade-off that least reflects what you want. If none, confirm the summary.”

If alignment cannot be reached, state what is agreed, the unresolved issue, both current positions when known, and what evidence or decision would allow it to be revisited.

Revise the record while useful new information is still emerging. If further discussion no longer adds information, state that no shared record can currently be formed and stop without claiming agreement.

After the user confirms or accepts an accurately recorded end state, stop. Do not create downstream artifacts or continue the original task within this skill.
