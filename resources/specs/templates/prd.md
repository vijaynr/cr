{{PLATFORM_HEADER}}
Create a product requirements artifact from user context.

Inputs:
{{INPUT_PRD}}

Rules:
1. Normalize feature name to kebab-case as `<feature-name>`.
2. Generate a random 4-digit numeric id and build `<feature-folder>` as `<feature-name>-<random-number>`.
3. Create `.features/<feature-folder>/` if missing.
4. Ask up to 5 concise clarifying questions if critical details are missing. If unanswered, proceed with explicit assumptions.
5. Keep the document implementation-agnostic and testable.
{{BUILD_RULE}}

Write `.features/<feature-folder>/requirements.md` using this exact section order:
1. `Feature references`
2. `Scope summary`
3. `Problem statement`
4. `Goals and non-goals`
5. `Personas and stakeholders`
6. `Functional requirements`
7. `Non-functional requirements`
8. `Assumptions`
9. `Open questions and missing information`
10. `Acceptance criteria`
11. `Requirement IDs and traceability seed`
12. `Quality checklist`

Traceability rules:
- Assign requirement IDs as `REQ-001`, `REQ-002`, ...
- In `Acceptance criteria`, reference related `REQ-*` IDs.
- In `Feature references`, include:
  - `requirements.md` (this document)
  - `design.md`
  - `threat-model.md`
  - `plan.md`
  - `done.md`

Quality checklist (must be explicit):
- Completeness
- Testability
- Assumptions captured
- Open questions captured
- Risks called out

Output:
- Return created feature folder path.
- Return a short summary.
- End with: `Next command to run: /design`.
