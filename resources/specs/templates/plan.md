{{PLATFORM_HEADER}}
Generate a staged execution plan from design and codebase.

Inputs:
{{INPUT_DESIGN}}

Rules:
1. Resolve target feature folder under `.features/`.
2. Fail fast if `.features/<feature-folder>/design.md` is missing.
3. Plan must be modular, incremental, and testable.
{{BUILD_RULE}}

Read:
- `.features/<feature-folder>/requirements.md`
- `.features/<feature-folder>/design.md`
- Relevant codebase modules

Write `.features/<feature-folder>/plan.md` using this exact section order:
1. `Feature references`
2. `Implementation strategy`
3. `Proposed file changes` (Grouped by module/package)
4. `Stages` (Detailed checklist with goals and exit criteria per stage)
5. `Testing strategy` (Unit, integration, E2E)
6. `Plan-to-design traceability`
7. `Open questions and missing information`

Stage rules:
- Divide work into logical chunks (e.g., `Stage 1: Core Logic`, `Stage 2: API`, `Stage 3: UI`).
- Each stage must have a clear "Goal" and "Exit Criteria" (how to verify it's done).

Traceability rules:
- Include a table mapping each Stage/Goal to `DES-*` IDs.
- `Feature references` must include:
  - `requirements.md`
  - `design.md`
  - `threat-model.md`
  - `plan.md` (this document)
  - `done.md`

Output:
- Return feature folder path.
- Return concise summary.
- End with: `Next command to run: /doit`.
