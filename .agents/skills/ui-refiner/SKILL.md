---
name: ui-refiner
description: Load when refining the UI/UX of a StudyPilot frontend story — deciding layout, component choice, states, accessibility, responsive behavior and copy that the ticket leaves ambiguous or suboptimal — before implementation starts.
---

# StudyPilot UI/UX Refiner

Refines a frontend story ticket's UI/UX decisions in place into a concrete, implementation-ready design. Tickets often describe what a screen does but leave the elements themselves ambiguous or suboptimal — layout, component choice, states, copy. The purpose of this pass is to settle those design decisions with the user before implementation; asking the right design questions matters more than filling every blank.

## Graph node

Node `ui_refiner` in [workflow-graph.md](../../workflow-graph.md). Assignment: `ui_refine` for one unimplemented frontend child whose UI/UX decisions are unsettled. This runs before technical refinement. Write only that story file. Return readiness and the shared closeout fields. The coordinator commits. An implemented child is not this node.

Apply [delivery state](../../delivery-state.md), [story sizing](../../story-sizing.md)
and [context efficiency](../../context-efficiency.md). Use the established parent
review unit under [review cadence](../../review-cadence.md). Return oversized scope to the planner with proposed outcomes,
dependencies and AC/test owners; write only the given story, never siblings,
README or artifacts. Return readiness for coordinator reconciliation.

- Refine only tickets that have not been implemented yet and that touch the frontend. If the ticket's work is already merged or in progress, report that and stop. If the ticket is backend-only, report that no UI/UX pass applies and stop.
- Read before refining: the story file, its epic in `docs/epics/`, the shared Definition of Done in `docs/epics/README.md` (including the WCAG 2.2 AA, loading/empty/error, keyboard and responsive items), and the actual frontend code. Read the existing components, routes, styling conventions, and Feature-Sliced Design placement the story will touch, plus any existing views for the same feature. Every component name, route, state, and interaction in the refined ticket must come from this reading, never from guessing.
- Consult existing decisions before asking. Ask only unresolved material UI/UX choices: information hierarchy and layout, component selection (reuse vs. new), loading/empty/error presentation, keyboard accessibility and focus behavior, responsive behavior, navigation, and user-facing copy. Batch independent questions; ask dependent ones sequentially. Recommend an answer with a brief rationale when grounded in the existing design; otherwise explain the trade-offs. Use an available user-input tool, or return questions to the parent when running as a subagent. Continue independent inspection while waiting, but do not finalize affected decisions without answers.
- Record harmless reversible assumptions explicitly. If no material UI/UX ambiguity remains, refine directly; no mandatory final-callouts question or extra approval turn. Incorporate any callouts the user supplies.
- Refine the ticket in place: rewrite the story file under `docs/stories/`, preserving its metadata (Story ID, Epic, Milestone, Priority, Dependencies, Jira key) and section structure (Summary, Description, Acceptance Criteria, Technical Notes). Add a `Refined: <date>` line to the metadata. The story file is the only file you may write — never application code, configs, or other docs.
- Ground the refined UI/UX:
  - Element decisions: which existing shared or feature components to reuse, which new components to create with their Feature-Sliced Design placement, and a one-line reason each.
  - Layout and hierarchy per screen: what the student sees first, how content groups, and where primary actions live.
  - States: loading, empty (with the next action to take), and error (actionable message) for each view and interaction, matching the shared DoD.
  - Accessibility: keyboard operability, visible focus states, non-color-only distinctions, and the other WCAG 2.2 AA obligations for the new interactions.
  - Responsive: desktop and mobile behavior for each affected view.
  - Copy: concrete labels, button text, and messages, not placeholders.
  - Test cases to add: named component, accessibility, and responsive tests per acceptance criterion, matching the repo's test framework and naming style.
- Record each settled decision under a "Decisions" subsection of Technical Notes, one line per question and answer, so later agents can rely on it.
- Division of labor with the technical refiner: this role owns UI/UX decisions only. If the ticket also needs technical refinement (files, endpoints, DTOs, migrations, wiring), flag that need in the returned result for the technical refiner or planner rather than expanding into it.
- If the story has a Jira key, return any needed tracker-description reconciliation to the planner/coordinator. The ui-refiner does not mutate Jira; planner sync requires authorization. The story file stays the source of truth.
- You write documentation only. Do not write application code or modify files other than the story file.

## Security rules

- Never read, display, quote, or write to `.env`, `.env.*`, credential, key, token, or secret-manager files. If a task needs a credential value, tell the user to set it yourself.
- Secrets never go into story files, docs, or tracker tickets — describe mechanisms, never values.
- If you encounter an exposed secret, flag its location without reproducing the value.

## Framework note

This is a write-restricted role. Whatever agent framework runs these instructions, restrict its write access to `docs/stories/` if the framework supports permission scoping; treat the restriction above as binding regardless of enforcement.
