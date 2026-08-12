---
name: cqf
description: only invokes by user
---

# Clarify

Reach a shared, evidence-grounded understanding of the user's actual goal. Produce alignment only: do not write a PRD, design, plan, implementation, or other downstream artifact unless the user starts a new task.

## Boundary

- Use only when the user explicitly invokes this skill by name or command. Never select it automatically because a request is vague, risky, underspecified, or ready for planning.
- Keep one active convergence path. Do not silently expand scope because a related idea appears.
- Do not force agreement. Record a material unresolved difference rather than claim consensus.
- Treat the final alignment record as input to downstream work, not as control over it. Any downstream workflow remains responsible for preserving and checking the recorded commitments.

<intent-first>

When the user says to first understand their intent, or otherwise asks for understanding or alignment before action, enter an intent-first turn. Inspect only the context needed to understand the request, then state a concise, correctable intent frame: the surface request, inferred outcome, evidence for that inference, and the one most material unresolved point.

Do not modify files, create a downstream artifact, select a solution, recommend a direction, or advance to implementation in an intent-first turn. Ask at most one essential clarification when the available context cannot support a correctable frame. Wait for the user to ask to proceed or to confirm the direction before leaving this turn type.

</intent-first>

## Keep the Alignment State

<always-maintain>

Maintain these four items throughout the discussion. Show them only when their change matters to the user or the next decision.

1. **Target** — the surface request, the correctable underlying goal, its required depth, scope, boundaries, relevant system dependencies and contracts, and acceptance context.
2. **Evidence** — verified facts; existing but unverified or conflicting material; reasoned inferences; and assumptions or hypotheses still needing validation.
3. **Commitments** — material user requirements and decisions, each marked `proposed`, `confirmed-pending`, `completed`, `superseded`, or `parked`.
4. **Next gap** — the most upstream unresolved issue that can still change the result at the required depth.

</always-maintain>

Treat the user's wording as evidence of intent, not as a final specification. Distinguish a requested solution or implementation choice from the outcome it is meant to achieve; do not speculate about private motives or present an inference as fact.

Use the least depth that supports the user's next stage: intent sufficient to decide whether to proceed; requirements sufficient to write requirements; design decisions sufficient to design; or behavior and boundaries sufficient to implement. State the inferred depth; ask the user only if the choice materially changes discussion cost or outcome.

Classify new information immediately:

- correction → update the current direction;
- necessary dependency → resolve it before dependent details;
- additive requirement → add a commitment;
- explicit replacement or incompatibility → supersede the affected commitment and state why;
- independent goal → park it explicitly;
- invalidated goal or explicit focus change → reset the target and state the new required depth.

## Run the Alignment Loop

<before-each-material-move>

At a new goal, material correction, topic shift, before a material question or direction change, and before closure, run this loop. Reuse a sufficient current state rather than repeating it mechanically.

1. **Observe.** Read the conversation and user-provided material. Inspect files, tools, documentation, and the environment for information the Agent can safely discover. Do not ask the user for information that can be derived, verified, or investigated.
2. **Ground.** Verify material facts when practical. For a material technical or design premise, investigate applicable real-world practice when external research is available and proportionate. Update the evidence state; do not treat code, documentation, an online example, or user agreement as proof.
3. **Frame.** Form a concise, correctable view of the target, its supporting evidence and constraints, material assumptions or Agent decisions, and the next gap. State this frame when it can materially change the direction or lets the user correct it.
4. **Converge.** Resolve one core judgment: prefer the gap that constrains the most later choices or makes lower-level discussion meaningful. Recompute the next gap after every answer. Do not follow a prewritten questionnaire.
5. **Record.** Update the alignment state and prune irrelevant or dependent branches. Make a low-risk, reversible, local default only when it is clear or delegated; disclose it when material.

</before-each-material-move>

For vague requests, establish goal, user or scenario, and main boundary before implementation details or edge cases.

Control expansion: stop probing when remaining detail cannot change the target, direction, risk, or next step. Summarize what is known, park side topics, and disclose safe defaults instead of extending the discussion for form's sake.

## System-Boundary Gate: Keep Local Decisions in Context

<system-boundary-gate>

Before presenting a material local conclusion, design direction, implementation choice, or question about one, first establish the current layer and only the relevant overall goal, upstream inputs, downstream consumers, interface contracts, shared state, cross-layer constraints, and acceptance path.

Resolve one layer at a time. Treat lower layers as black boxes constrained by their required responsibilities and interfaces until they become the current layer. After material evidence or a local conclusion, recheck whether it changes the system boundary, dependencies, contracts, assumptions, or acceptance path; update the alignment state when it does. Do not expand the system view beyond what can change the current target, direction, risk, or acceptance result.

</system-boundary-gate>

## Direction Gate: Ground Claims and Designs

<direction-gate>

Pass this gate before presenting a material factual claim, proposal, design direction, or question that depends on a design premise.

- Separate verified facts, unverified material, inferences, and hypotheses. State the minimum traceable source or verification method and why it fits. Do not fabricate a source or imply validation that has not occurred.
- Prefer an applicable, practice-validated approach over a novel design inferred only from first principles. Seek authoritative primary guidance and standards, maintained production-used projects with tests and documentation, credible implementation case studies, and local observed behavior or measurements.
- Treat popularity, stars, search ranking, or a single example as discovery signals, not proof of correctness or fit. For a selected practice, state the source, validation or use signal, relevant context, fit, material mismatch, and needed adaptation. Do not copy a common pattern merely because it is common.
- If evidence is insufficient, call the proposal a hypothesis, name the missing validation, and say how it can be checked. Do not turn an imagined scenario into a requirement or ask the user to decide it as though it were established.
- Evaluate a user-proposed solution independently against the goal, constraints, evidence, alternatives, and acceptance scenarios. Keep user goals, values, and risk preferences distinct from factual or technical claims. Respect an informed user decision even when it differs from the Agent's recommendation.
- Design only what the current target and verifiable acceptance need. Do not invent rules, architecture, boundaries, or future scenarios to make a solution appear complete.

</direction-gate>

## Question Gate: Ask Only for User-Owned Information and Judgments

<question-gate>

First investigate facts the Agent can safely derive or verify. Ask the user only for either:

- material context or facts that the Agent cannot reliably obtain from the conversation, available sources, tools, or reasonable investigation; or
- a material decision that depends on the user's intent, values, domain judgment, authorization, or risk acceptance and cannot be safely decided by the Agent.

Treat safety, security, compliance, irreversible effects, and material external impact as user-owned unless explicitly delegated.

Ask about one core gap per turn. Prefer 2–4 concise choices whenever the available evidence supports distinct, plausible answers without inventing them. Let the user reply with a label, combine or qualify choices, or provide an answer outside them. Use an open question only when choices would be speculative, misleading, or unduly narrow.

When a supported question/input tool is available, use it first and preserve a free-form response path. Otherwise label choices `A`, `B`, `C`, and so on, then add a brief invitation such as “Reply with a letter, combine choices, or give another answer.” Put the responsible recommendation or safe default first and mark it when applicable.

For a factual or contextual question, state the current interpretation, the exact gap, why the Agent cannot reliably resolve it, and how the answer can change the direction. For a user-owned decision, provide only the context needed for an informed answer:

- the current interpretation and requested decision;
- relevant evidence or uncertainty, including applicable established practice when the decision depends on a design premise;
- why that evidence or practice fits, including material limits or counterevidence;
- a responsible recommendation for a high-impact choice, its principal trade-off, and how each known option changes direction;
- why the Agent cannot safely make the decision alone.

Do not use a research dump, unexplained jargon, or ask the user to investigate on the Agent's behalf.

</question-gate>

## Closure Gate: Establish Handoff-Ready Alignment

<closure-gate>

Before closing, check every `confirmed-pending` commitment. Cover it in the shared understanding or mark it `superseded` or `parked` with the reason. In this skill, `completed` means the alignment work for that commitment is complete; it never means downstream work was performed.

Declare the alignment handoff-ready only when the next analysis, design, documentation, or implementation stage will not need to independently resolve anything that could materially change the goal, scope, direction, risk, or acceptance result. Ensure that:

- the main wrong directions are excluded;
- scope, boundaries, acceptance conditions, evidence status, material assumptions, and Agent decisions are visible;
- remaining unknowns are marked blocking or non-blocking; every non-blocking unknown has a temporary default and cannot overturn the agreed direction;
- no material contradiction is hidden;
- important choices include their material cost or trade-off.

Validate weak alignment rather than mistaking it for confirmation. Do this one core risk at a time when goals conflict or remain abstract, the user merely repeats the Agent's framing, a costly recommendation receives quick agreement, delegation or terse replies suggest fatigue, or a proposal has no clear problem it solves. Use a concrete example, consequence, failure test, contradiction, or disclosed default; stop when no remaining risk can change the result.

Use one of these end states:

1. **Confirmed alignment** — the user confirms an understanding sufficient for the required depth.
2. **Actionable alignment with explicit unknowns** — remaining unknowns and defaults do not block the agreed next stage.
3. **Explicit unresolved blocker** — a material difference, missing fact, or unstable preference prevents alignment.

Only the first two states are handoff-ready. The third is a recorded stop: identify the blocking evidence or decision and do not present downstream work as ready to proceed.

</closure-gate>

## Final Output

Provide a concise record scaled to the task. Include only applicable items:

- surface request, underlying goal, required depth, and evidence for their relationship;
- success criteria, scope, boundaries, non-goals, and acceptance conditions;
- material facts and evidence status; source or verification method; limitations; material alternatives; and relevant system dependencies or contracts;
- confirmed user decisions, material Agent decisions, assumptions, commitments, and their reasons or trade-offs;
- unresolved matters marked blocking or non-blocking, with non-blocking defaults; parked topics;
- one recommended next step, clearly marked as a recommendation and not executed.

When multiple commitments exist, add a compact coverage record showing each commitment's status and the reason for every `superseded` or `parked` item. Invite correction: “Please point out the least accurate part or the trade-off that least reflects what you want. If none, confirm the summary.”

If alignment cannot be reached, state what is agreed, the unresolved issue, the current positions when known, and what evidence or decision would allow revisiting it. After the user accepts an accurately recorded end state, stop.
