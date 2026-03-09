{{PLATFORM_HEADER}}
Refine existing design or requirements based on human feedback or codebase changes.

Inputs:
{{INPUT_DESIGN}}

Rules:
1. Resolve target feature folder under `.features/`.
2. Fail fast if no files exist in the folder.
3. Apply updates surgically to `requirements.md`, `design.md`, or `threat-model.md`.
{{BUILD_RULE}}

Read:
- Files in `.features/<feature-folder>/`
- Relevant codebase modules

Output:
- Summary of changes made.
- End with: `Next command to run: /spec.plan`.
