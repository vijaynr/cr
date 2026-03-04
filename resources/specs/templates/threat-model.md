{{PLATFORM_HEADER}}
Generate a STRIDE threat model from design.

Inputs:
{{INPUT_DESIGN}}

Rules:
1. Resolve target feature folder under `.features/`.
2. Fail fast if `.features/<feature-folder>/design.md` is missing.
3. Use STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
{{BUILD_RULE}}

Read:
- `.features/<feature-folder>/requirements.md`
- `.features/<feature-folder>/design.md`

Write `.features/<feature-folder>/threat-model.md` using this exact section order:
1. `Feature references`
2. `Trust boundaries`
3. `STRIDE threats` (Table with: Threat ID, Category, Description, Mitigation)
4. `Residual risks`
5. `Security checklist`

Traceability rules:
- Assign threat IDs as `THR-001`, `THR-002`, ...
- `Feature references` must include:
  - `requirements.md`
  - `design.md`
  - `threat-model.md` (this document)
  - `plan.md`
  - `done.md`

Output:
- Return feature folder path.
- Return concise summary.
- End with: `Next command to run: /refine`.
