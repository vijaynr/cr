{{PLATFORM_HEADER}}
Research a user-provided topic by reading the codebase first and producing a decision-useful research artifact.

Inputs:
{{INPUT_RESEARCH}}

Principles:

1. Start with evidence from the repository before proposing solutions.
2. Separate facts, inferences, and unknowns.
3. Reuse existing patterns where they already fit.
4. Keep the scope focused on the user’s topic.
5. Ask up to 5 concise clarifying questions only when missing information materially changes the research outcome.
6. If external context is requested, prefer high-quality primary sources and cite links.
   {{BUILD_RULE}}

Read:

- Relevant code, tests, configuration, and documentation in the repo
- Existing architecture or workflow documents if present

Write `.rpi/<topic-folder>/research.md` using this exact section order:

1. `Topic summary`
2. `Research scope`
3. `Clarifying questions`
4. `Codebase findings`
5. `Existing patterns to reuse`
6. `Constraints and risks`
7. `External references and principles`
8. `Assumptions and unknowns`
9. `Recommended direction`
10. `Planning handoff`

Folder rules:

- Normalize topic name to kebab-case as `<topic-name>`.
- Generate a random 4-digit numeric id and build `<topic-folder>` as `<topic-name>-<random-number>`.
- Create `.rpi/<topic-folder>/` if missing.

Research rules:

- In `Codebase findings`, cite concrete files, modules, functions, or classes.
- In `Existing patterns to reuse`, prefer local conventions over introducing new abstractions.
- In `External references and principles`, summarize the relevant principle briefly and include source links.
- In `Planning handoff`, list the most important implementation questions the planning phase must resolve.

Output:

- Return created topic folder path.
- Return a short summary of the research outcome.
- End with: `Next command to run: /rpi.plan`.
