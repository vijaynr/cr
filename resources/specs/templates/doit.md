{{PLATFORM_HEADER}}
Execute implementation stages from plan.

Inputs:
{{INPUT_DESIGN}}

Rules:
1. Resolve target feature folder under `.features/`.
2. Fail fast if `.features/<feature-folder>/plan.md` is missing.
3. Execute stages one by one.
4. Update `.features/<feature-folder>/done.md` with progress after each session.
5. Create or modify source code and tests based on the plan.

Read:
- `.features/<feature-folder>/requirements.md`
- `.features/<feature-folder>/design.md`
- `.features/<feature-folder>/plan.md`
- Relevant codebase modules

Write/Update:
- Application source code
- Tests
- `.features/<feature-folder>/done.md` (Checklist of completed items)

Output:
- Summary of files modified and stages completed.
- Instructions for verification.
