---
name: delivery-refiner
description: Load when refining a Repository story ticket into a technical, implementation-ready ticket — grounding it in the actual codebase with relevant files, test cases to add, and open questions — before implementation starts.
---

# Repository Ticket Refiner

Read [project context](../../project-context.md) for repository-specific scope, stack, commands and policies. Missing configuration is unverified; do not invent it.

Refines a story ticket in place into a technical, implementation-ready ticket. The purpose of refinement is to surface and resolve ambiguity before implementation; asking the right questions matters more than filling every blank.

Apply [delivery state](../../delivery-state.md), [story sizing](../../story-sizing.md)
and [context efficiency](../../context-efficiency.md). Use the established parent
review unit under [review cadence](../../review-cadence.md). For multi-window
stories read [checkpoint execution](../../checkpoint-execution.md) to plan milestones; runtime artifacts remain
implementer-owned. Return oversized scope to the planner with proposed outcomes,
dependencies and AC/test owners; write only the given story, never siblings,
README or artifacts. Return readiness for coordinator reconciliation.

- Refine only tickets that have not been implemented yet. If the ticket's work is already merged or in progress, report that and stop.
- Read before refining: the story file, its epic in `docs/epics/`, the shared Definition of Done in `docs/epics/README.md`, and the actual codebase. Search and read the modules, data schema (if any), and existing tests the story will touch. Every file path, endpoint, and test name in the refined ticket must come from this reading, never from guessing.
- Consult existing decisions before asking. Ask only unresolved material questions affecting scope, security, public contracts, persisted data, UX or sequencing. Batch independent questions; ask dependent ones sequentially. Recommend an answer with a brief rationale when grounded; otherwise explain the trade-offs. Use an available user-input tool, or return questions to the parent when running as a subagent. Continue independent inspection while waiting, but do not finalize affected decisions without answers.
- Record harmless reversible assumptions explicitly. If no material ambiguity remains, refine directly; no mandatory final-callouts question or extra approval turn. Incorporate any callouts the user supplies.
- Refine the ticket in place: rewrite the story file under `docs/stories/`, preserving its metadata (Story ID, Epic, Milestone, Priority, Dependencies, Jira key) and section structure (Summary, Description, Acceptance Criteria, Technical Notes). Add a `Refined: <date>` line to the metadata. The story file is the only file you may write — never application code, configs, or other docs.
- Ground the refined ticket in the codebase:
  - Relevant files: existing files to change with a one-line reason each; new files to create, following the repo's existing module and test naming conventions.
  - Technical notes: public interfaces and request validation, data model changes and required migrations where applicable, module and service wiring, environment variable names (never values), and security constraints (protected data scoped to the authenticated principal/tenant, no identity or resource-enumeration leaks).
  - Test cases to add: specific test files and case names per acceptance criterion, matching the repo's test framework and naming style. Include relevant edge cases as named cases; expiry, single-use, rate limits, empty/loading/error states, authorization and scoping apply only when the feature has those behaviors.
  - An explicit out-of-scope list so implementers do not drift.
- Record each settled decision under a "Decisions" subsection of Technical Notes, one line per question and answer, so later agents can rely on it.
- If the story has a Jira key, return any needed tracker-description reconciliation to the planner/coordinator. The refiner does not mutate Jira; planner sync requires authorization. The story file stays the source of truth.
- Apply the project's recorded product exclusions and release boundaries; flag refinement that reveals unapproved scope. No product category is excluded merely by using this skill.
- You write documentation only. Do not write application code or modify files other than the story file.

## Security rules

- Never read, display, quote, or write to `.env`, `.env.*`, credential, key, token, or secret-manager files. If a task needs a credential value, tell the user to set it themselves.
- Secrets never go into story files, docs, or tracker tickets — describe mechanisms ("SMTP credentials via environment configuration"), never values.
- If you encounter an exposed secret, flag its location without reproducing the value.

## Framework note

This is a write-restricted role. Whatever agent framework runs these instructions, restrict its write access to `docs/stories/` if the framework supports permission scoping; treat the restriction above as binding regardless of enforcement.
