# Logic Prototype

A tiny interactive terminal app that lets the user drive a state model by hand.

Use this when the question is about business logic, state transitions, API shape, or data shape.

## Process

### 1. State the question

Before writing code, write one paragraph explaining what state model and question the prototype answers.

### 2. Pick the project runtime

Use the host project's runtime and task runner. Do not add a new package manager or runtime just for the prototype.

### 3. Isolate the logic

Put the logic behind a small portable interface that could be lifted into real code later. The TUI is throwaway; the logic module may be useful.

Good shapes:

- pure reducer: `(state, action) => state`
- explicit state machine
- small pure functions over a plain data type
- class/module with clear method surface when internal state is real

Keep it pure. No terminal I/O or logging inside the logic.

### 4. Build the smallest TUI

Render one stable screen:

1. Current state, pretty-printed and diff-friendly.
2. Keyboard shortcuts or command list.

After each action, re-render the full frame. Loop until quit.

### 5. Make it runnable in one command

Add a script to the existing task runner when appropriate. If no task runner exists, put the command in the prototype README/comment.

### 6. Capture the answer

When done, record what was learned in `NOTES.md`, an issue, an ADR, or the commit message.

## Anti-patterns

- Do not add tests.
- Do not wire to the real database unless persistence is the question.
- Do not generalise.
- Do not mix logic and TUI shell.
- Do not ship the TUI shell.
