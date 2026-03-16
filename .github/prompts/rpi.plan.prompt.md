Create an implementation plan from research findings and the current codebase.

Inputs:
- Topic selector: ${input:topic:Topic name or exact folder name}
- Extra context: ${input:context:Constraints, decisions, or user guidance}

Principles:

1. Plan before editing code.
2. Keep the plan incremental, testable, and reversible where practical.
3. Ask concise clarifying questions when scope, rollout, or architecture is still ambiguous.
4. Base decisions on `research.md` and current code rather than general preference.
5. Prefer the smallest design that solves the stated problem cleanly.

Read:

- `.rpi/<topic-folder>/research.md`
- Relevant code, tests, and configuration

Rules:

1. Resolve target topic folder under `.rpi/`.
2. Fail fast if `.rpi/<topic-folder>/research.md` is missing.
3. Ask up to 5 concise clarifying questions if unresolved decisions would change the plan in a meaningful way.
4. Call out tradeoffs explicitly when multiple paths are viable.

Write `.rpi/<topic-folder>/plan.md` using this exact section order:

1. `Topic summary`
2. `Planning goals and non-goals`
3. `Clarifying questions`
4. `Chosen approach`
5. `Alternatives considered`
6. `Implementation stages`
7. `File and module impact`
8. `Validation strategy`
9. `Risks and mitigations`
10. `Implementation handoff`

Plan rules:

- Each item in `Implementation stages` must include:
  - Goal
  - Changes
  - Dependencies
  - Validation
  - Exit criteria
- `File and module impact` must name the main files or packages likely to change.
- `Implementation handoff` must identify the recommended first stage to execute.

Output:

- Return topic folder path.
- Return a concise summary of the plan.
- End with: `Next command to run: /rpi.implement`.
