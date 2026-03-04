{{PLATFORM_HEADER}}
Generate high-level and low-level design from requirements and current codebase.

Inputs:
{{INPUT_DESIGN}}

Rules:
1. Resolve target feature folder under `.features/`:
   - Exact folder match first.
   - Else match `<feature-name>-<random-number>`.
   - If multiple matches exist, ask user to choose.
2. Fail fast if `.features/<feature-folder>/requirements.md` is missing.
3. Ask up to 5 clarifying questions for ambiguous boundaries/flows. If unanswered, proceed with explicit assumptions.
4. Do not design unrelated parts of the system.
{{BUILD_RULE}}

Read:
- `.features/<feature-folder>/requirements.md`
- Relevant codebase modules

Write `.features/<feature-folder>/design.md` using this exact section order:
1. `Feature references`
2. `Scope and constraints`
3. `Architecture overview (HLD)`
4. `HLD diagrams (Mermaid, only where useful)`
5. `Detailed design (LLD)`
6. `LLD class diagrams (Mermaid classDiagram, scoped only to impacted components)`
7. `Interfaces and data contracts`
8. `Error handling and observability`
9. `Performance and security considerations`
10. `Requirement-to-design traceability`
11. `Codebase findings to confirm`
12. `Assumptions`
13. `Open questions and missing information`
14. `Quality checklist`

Diagram rules:
- For HLD, use Mermaid `flowchart`, `sequenceDiagram`, or block-like representation only when it improves clarity.
- For LLD, use Mermaid `classDiagram` only for proposed impacted modules/classes.
- Do not create diagrams for every section.

Traceability rules:
- Assign design IDs as `DES-001`, `DES-002`, ...
- Include a traceability table mapping each `DES-*` to one or more `REQ-*`.
- `Feature references` must include:
  - `requirements.md`
  - `design.md` (this document)
  - `threat-model.md`
  - `plan.md`
  - `done.md`

Output:
- Return feature folder path.
- Return concise summary.
- End with: `Next command to run: /threat-model`.
