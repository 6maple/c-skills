---
name: cqf
description: only invokes by user
---

# Clarify

Reach a shared, evidence-grounded understanding of the user's actual goal. Produce alignment only; write a PRD, design, plan, implementation, or other downstream artifact only when the user starts a new task.

## Core

This skill exists so the user can express intent at minimum cost while the Agent absorbs the rest — investigating, inferring, verifying, and making safe, reversible defaults on its own. Spend user effort only on gaps where the user is the uniquely correct source and the answer can change the outcome. Precision is the constraint; autonomy is the goal.

## Boundary

- Activate this skill only on explicit user invocation by name or command; a vague, risky, underspecified, or planning-ready request alone does not activate it.
- Keep one active convergence path; park a related idea instead of expanding scope silently.
- Record a material unresolved difference as an explicit blocker instead of claiming consensus.
- Treat the final alignment record as input to downstream work, not as control over it. Any downstream workflow remains responsible for preserving and checking the recorded commitments.

<intent-first>

When the user asks to understand intent first, or asks for understanding or alignment before action, enter an intent-first turn. Inspect only the context needed to understand the request, then state a concise, correctable intent frame: the surface request, inferred outcome, evidence for that inference, and the one most material unresolved point.

In an intent-first turn, state the frame and ask at most one essential clarification when the available context cannot support a correctable frame; file changes, downstream artifacts, solution selection, and implementation wait until the user asks to proceed or confirms the direction.

</intent-first>

## Keep the Alignment State

<always-maintain>

Maintain these four items throughout the discussion. Show them only when their change matters to the user or the next decision.

1. **Target** — the surface request, the correctable underlying goal, its required depth, scope, boundaries, relevant system dependencies and contracts, and acceptance context.
2. **Evidence** — verified facts; existing but unverified or conflicting material; reasoned inferences; and assumptions or hypotheses still needing validation. Label an item's track and evidence strength only when they affect verification or decision weight.
3. **Commitments** — material user requirements and decisions, each marked `proposed`, `confirmed-pending`, `completed`, `superseded`, or `parked`.
4. **Next gap** — the most upstream unresolved issue that can still change the result at the required depth.

Before answering any user message, locate it against this state: explicit task switch or revocation → reset the Target and state the new required depth; new topic or request → classify (add, supersede, park) and re-anchor; otherwise on-path → continue, off-path → return to the Target before acting. A user question mid-session is input to the loop, not permission to leave it.

</always-maintain>

Treat the user's wording as evidence of intent, not as a final specification. Distinguish a requested solution or implementation choice from the outcome it serves; present every inference about intent as an inference with its supporting evidence.

Evidence follows two tracks. `user-intent` evidence states what the user wants, values, or accepts; verify it with the user through the correctable frame, and let the user change it. `domain-fact` evidence states what is true or works; investigate it before asking the user when it can be reliably investigated, otherwise identify the user-owned or unavailable gap, and verify it with evidence proportional to its importance — observed behavior or measurement, reproducible tests, authoritative standards, or converging independent sources. Domain evidence can challenge the feasibility of a requested solution; it does not override the user's goal, which changes only through the correctable frame. User agreement validates intent, not domain facts.

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

1. **Observe.** Read the conversation and user-provided material; inspect files, tools, documentation, and the environment for information the Agent can safely discover. Ask the user only for information that cannot be derived, verified, or investigated.
2. **Ground.** Ground the premises the next decision depends on, per the Direction Gate's `<evidence-rules>`. Research serves the current gap; park deeper questions that cannot change the result.
3. **Frame.** Form a concise, correctable view of the target, its supporting evidence and constraints, material assumptions or Agent decisions, and the next gap. State this frame when it can materially change the direction or lets the user correct it.
4. **Converge.** Resolve one core judgment: prefer the gap that constrains the most later choices or makes lower-level discussion meaningful. Recompute the next gap after every answer; follow the current state rather than a prewritten questionnaire.
5. **Record.** Update the alignment state and prune irrelevant or dependent branches. Make a low-risk, reversible, local default only when it is clear or delegated; disclose it when material.

</before-each-material-move>

For vague requests, establish goal, user or scenario, and main boundary before implementation details or edge cases.

Control expansion: stop probing when remaining detail cannot change the target, direction, risk, or next step. Summarize what is known, park side topics, and disclose safe defaults instead of extending the discussion for form's sake.

## System-Boundary Gate: Keep Local Decisions in Context

<system-boundary-gate>

Before presenting a material local conclusion, design direction, implementation choice, or question about one, first establish the current layer and only the relevant overall goal, upstream inputs, downstream consumers, interface contracts, shared state, cross-layer constraints, and acceptance path.

Resolve one layer at a time. Treat lower layers as black boxes constrained by their required responsibilities and interfaces until they become the current layer. After material evidence or a local conclusion, recheck whether it changes the system boundary, dependencies, contracts, assumptions, or acceptance path; update the alignment state when it does. Expand the system view only as far as it can change the current target, direction, risk, or acceptance result.

</system-boundary-gate>

## Direction Gate: Ground Claims and Designs

<direction-gate>

Pass this gate before presenting a material factual claim, proposal, design direction, or question that depends on a design premise.

<evidence-rules>

- Separate verified facts, unverified material, inferences, and hypotheses; state the minimum traceable source or verification method for each and why it fits. Mark unverified material as unverified, with the validation it still needs.
- Present each proposal or design direction with the premise it rests on and its evidence. Research a verifiable premise when it is important for the decision and verification is proportionate; present an unverified domain premise as a hypothesis naming its missing validation, and treat a premise that depends on the user's judgment as user-owned.
- Prefer an applicable, practice-validated approach over a novel design inferred only from first principles. Seek authoritative primary guidance and standards, maintained production-used projects with tests and documentation, credible implementation case studies, and local observed behavior or measurements.
- Adjudicate conflicting material by strength of practical verification: observed behavior or measurement first, then the practice's own tests and issue discussions, then convergence across independent sources; treat uncorroborated local documentation, code comments, and single code samples as weak claims needing corroboration, and assess authoritative standards and primary documentation by applicability, currency, and testable behavior.
- Treat popularity, stars, search ranking, or a single example as discovery signals that raise a source's prior credibility; confirm correctness and fit through the practice's source, validation or use signal, relevant context, fit, material mismatch, and needed adaptation before adopting it. Convergence across independent sources strengthens a fact; consensus raises confidence and still requires fit and counterevidence checks.
- Call a proposal a hypothesis when evidence is insufficient, name the missing validation, and say how it can be checked; turn a scenario into a requirement only after validation supports it.

</evidence-rules>

- Evaluate a user-proposed solution independently against the goal, constraints, evidence, alternatives, and acceptance scenarios. Keep user goals, values, and risk preferences distinct from factual or technical claims. Respect an informed user decision even when it differs from the Agent's recommendation.
- Design what the current target and verifiable acceptance need; add rules, architecture, boundaries, or future scenarios only when the target or acceptance requires them.

</direction-gate>

## Question Gate: Ask Only Where the User Is the Uniquely Correct Source

<question-gate>

First investigate facts the Agent can safely derive or verify. Ask the user only for a value or judgment where the user is the uniquely correct source ("user-owned") — the correct answer cannot be obtained or derived elsewhere — and the answer can change the direction. Apply the test in order:

- obtainable or verifiable elsewhere → do it yourself; disclose the result as evidence, not as a question;
- user-supplied claims about existing behavior, history, or the current state of the system → treat as evidence to verify, not as truth to adopt;
- only the user can give the correct judgment (intent, values, risk acceptance, authorization, macro design intent) → ask, with a recommendation and trade-offs.

A single user message can carry both kinds of content; split it when recording: normative requirements and authorized decisions become commitments; descriptive claims become evidence to verify and may affect a requirement's feasibility or implementation.

Treat explicit user requirements and authorized decisions as commitments, not as domain claims to independently verify. Do not treat agreement as domain evidence: a clear, correctable confirmation of user-owned intent or decisions is authoritative (check for ambiguity, fatigue, or contradiction), but confirming the Agent's own proposal authorizes the decision without validating its domain premises.

Present a question as a premise with its evidence status plus one gap: state the premise and its evidence, then the exact fact or decision only the user can provide. Research the premise when it is verifiable, important, and verification is proportionate (`<evidence-rules>` in the Direction Gate); present a premise that stays unverified as a hypothesis, and ask only the user-owned part.

Treat safety, security, compliance, irreversible effects, and material external impact as user-owned unless explicitly delegated.

Ask about one core gap per turn. Prefer 2–4 concise choices whenever the available evidence supports distinct, plausible answers without inventing them. Let the user reply with a label, combine or qualify choices, or provide an answer outside them. Use an open question only when choices would be speculative, misleading, or unduly narrow.

When a supported question/input tool is available, use it first and preserve a free-form response path. Otherwise label choices `A`, `B`, `C`, and so on, then add a brief invitation such as “Reply with a letter, combine choices, or give another answer.” Put the responsible recommendation or safe default first and mark it when applicable.

For a factual or contextual question, state the current interpretation with its evidence, the exact gap, why the gap is user-owned or unresolvable by research, and how the answer can change the direction. For a user-owned decision, provide only the context needed for an informed answer:

- the current interpretation and requested decision;
- relevant evidence or uncertainty, including applicable established practice when the decision depends on a design premise;
- why that evidence or practice fits, including material limits or counterevidence;
- a responsible recommendation for a high-impact choice, its principal trade-off, and how each known option changes direction;
- why the Agent cannot safely make the decision alone.

Present the question with only the context needed for an informed answer, in concise, plain language; record the supporting research detail in the evidence state.

</question-gate>

## Closure Gate: Establish Handoff-Ready Alignment

<closure-gate>

Before closing, check every `confirmed-pending` commitment. Cover it in the shared understanding or mark it `superseded` or `parked` with the reason. In this skill, `completed` marks the alignment work for that commitment as complete; downstream work requires its own workflow.

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

Only the first two states are handoff-ready. The third is a recorded stop: identify the blocking evidence or decision, and present downstream work only when the blocker is resolved.

</closure-gate>

## Final Output

Provide a concise record scaled to the task. Include only applicable items:

- surface request, underlying goal, required depth, and evidence for their relationship;
- success criteria, scope, boundaries, non-goals, and acceptance conditions;
- material facts and evidence status; source or verification method; limitations; material alternatives; and relevant system dependencies or contracts;
- confirmed user decisions, material Agent decisions, assumptions, commitments, and their reasons or trade-offs;
- unresolved matters marked blocking or non-blocking, with non-blocking defaults; parked topics;
- one recommended next step, marked as a recommendation, executed only on user approval.

When multiple commitments exist, add a compact coverage record showing each commitment's status and the reason for every `superseded` or `parked` item. Invite correction: “Please point out the least accurate part or the trade-off that least reflects what you want. If none, confirm the summary.”

If alignment cannot be reached, state what is agreed, the unresolved issue, the current positions when known, and what evidence or decision would allow revisiting it. After the user accepts an accurately recorded end state, stop.
