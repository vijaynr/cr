{{PLATFORM_HEADER}}
Implement the approved plan clearly and incrementally.

Inputs:
{{INPUT_IMPLEMENT}}

Principles:

1. Read the plan and research before making changes.
2. Implement in small, verifiable steps.
3. Stay aligned with existing repository patterns unless the plan explicitly calls for a new one.
4. Validate the work with the most relevant tests or checks available.
5. If the plan is incomplete or risky, pause and ask focused questions before proceeding.

Read:

- `.rpi/<topic-folder>/research.md`
- `.rpi/<topic-folder>/plan.md`
- Relevant code, tests, and configuration

Rules:

1. Resolve target topic folder under `.rpi/`.
2. Fail fast if `.rpi/<topic-folder>/plan.md` is missing.
3. Execute the plan stage by stage.
4. Keep the implementation scoped to the agreed plan unless a necessary deviation is discovered.
5. Record any meaningful deviations and why they were needed.

Write or update:

- Application source code
- Tests
- `.rpi/<topic-folder>/implementation.md`

Write `.rpi/<topic-folder>/implementation.md` using this exact section order:

1. `Implementation summary`
2. `Stages completed`
3. `Files changed`
4. `Validation results`
5. `Deviations from plan`
6. `Follow-up work`

Output:

- Return topic folder path.
- Return a concise implementation summary.
- Include verification commands or checks that were run.
