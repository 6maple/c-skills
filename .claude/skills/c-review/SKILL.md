---
name: c-review
description: Review changes along two axes: Standards and Spec. Use when the user wants to review a branch, PR, current diff, or work-in-progress changes.
disable-model-invocation: true
---

# c-review

Review as if you are a fresh agent. Do not rely on the implementation conversation.

## Evidence precedence

Use configured docs as intent and vocabulary. Current source code, tests, typecheck/build output, and git diff are stronger evidence than stale `{config.docs.root_dir}` text.

## Process

1. Pin the fixed point. If unspecified, ask what to review against: branch, commit, tag, or `main`.
2. Capture:

```bash
git diff <fixed-point>...HEAD
git log <fixed-point>..HEAD --oneline
```

3. Identify the spec source in order: issue reference, user-passed path, PRD/spec under docs, matching local issue, or none.
4. Run two independent axes:
   - Standards — repo conventions, architecture, tests, type safety, complexity, security, docs.
   - Spec — whether the diff implements the originating issue/PRD/spec.
5. Aggregate findings. Prefer correctness and scope risks over style noise.

## Output

```text
c-review(pass|changes-requested|blocked)

spec:
1. none
standards:
1. none
ev:
- ...
next:
- none
```
