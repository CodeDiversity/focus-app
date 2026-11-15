---
name: refiner
description: Load when refining a StudyPilot story into an implementation-ready ticket before implementation starts — technical grounding (files, endpoints, tests) for every story, plus the UI/UX decisions (layout, components, states, accessibility, copy) for frontend stories. One pass settles both.
---

# StudyPilot Story Refiner

Refines a story in place into an implementation-ready ticket. The purpose of
refinement is to surface and resolve ambiguity before implementation; asking the
right questions matters more than filling every blank. For a frontend story the
same pass also settles the UI/UX decisions (see
[UI/UX section](#uiux-section-frontend-stories-only)); there is no separate
UI refiner role.

## Graph node

Node `refiner` in [workflow-graph.md](../../workflow-graph.md). Assignment:
`refine` for one unimplemented child. Write only that story file. Return
readiness and the shared closeout fields. The coordinator commits. Do not edit
the README or route the next task. An implemented or in-progress child is not
this node.

Apply [delivery state](../../delivery-state.md), [story sizing](../../story-sizing.md),
[ID conventions](../../id-conventions.md) and [context efficiency](../../context-efficiency.md).
Use the established parent review unit under [review cadence](../../review-cadence.md).
For multi-window stories read [checkpoint execution](../../checkpoint-execution.md)
to plan milestones; runtime artifacts remain implementer-owned. Return oversized
scope to the planner with proposed outcomes, dependencies and AC/test owners;
write only the given story, never siblings, README or artifacts.

## Common rules

- Refine only stories that have not been implemented yet. If the story's work is
  already merged or in progress, report that and stop.
- Read before refining: the story file, its epic in `docs/epics/`, the shared
  Definition of Done in `docs/epics/README.md`, the breakdown README's decision
  register, and the actual codebase. Grep and read the modules, Prisma schema,
  components, routes and existing tests the story will touch. Every file path,
  endpoint, component name, route and test name in the refined story must come
  from this reading, never from guessing.
- Consult existing decisions before asking. Ask only unresolved material
  questions affecting scope, security, public contracts, persisted data, UX or
  sequencing. Batch independent questions; ask dependent ones sequentially.
  Recommend an answer with a brief rationale when grounded; otherwise explain the
  trade-offs. Use an available user-input tool, or return questions to the parent
  when running as a subagent. Continue independent inspection while waiting, but
  do not finalize affected decisions without answers.
- Record harmless reversible assumptions explicitly. If no material ambiguity
  remains, refine directly; no mandatory final-callouts question or extra
  approval turn. Incorporate any callouts the user supplies.
- Refine the story in place under `docs/stories/`, preserving its metadata
  (Story ID, Epic, Milestone, Layer, Status, Dependencies) and the repository's
  story structure: Summary, Scope, Source requirement references, Acceptance
  criteria, Tests, Technical notes (with a Decisions subsection), Definition of
  Done, Sizing block. Add a `Refined: <date>` line to the metadata.
- Label everything per [ID conventions](../../id-conventions.md): child ACs are
  numbered and cited as `<STORY>-AC<n>`; story decisions are `D-<story suffix><n>`
  and name the epic decision they refine or override; tests are named per AC.
- Record each settled decision under the **Decisions** subsection of Technical
  notes, one line per question and answer, so later agents can rely on it. A
  story decision that changes an epic-level decision is flagged in the returned
  result for the planner to reflect in the register.
- Add an explicit out-of-scope list so implementers do not drift.
- AI features, syllabus parsing, LMS integrations, grade calculations,
  flashcards, and native mobile apps are out of scope. Flag a story whose
  refinement reveals them.
- You write documentation only. Do not write application code or modify files
  other than the story file.

## Technical section (every story)

- Relevant files: existing files to change with a one-line reason each; new
  files to create, following the repo's existing module and test naming
  conventions (Feature-Sliced Design placement for `apps/web`).
- Technical notes: endpoint signatures and DTOs, Prisma model changes and
  required migrations, module and service wiring, environment variables by name
  (never values), and security constraints (academic data scoped to the
  authenticated student, uniform 404, no user-enumeration leaks).
- Test cases to add: specific test files and case names per acceptance
  criterion, matching the repo's test framework and naming style. Include edge
  cases as named cases: expiry, single-use, rate limits, empty/loading/error
  states, authorization and scoping.

## UI/UX section (frontend stories only)

Skip this section for a backend-only story and say so in the returned result.
Read the shared DoD's WCAG 2.2 AA, loading/empty/error, keyboard and responsive
items, the existing components, routes and styling conventions, and any existing
views for the same feature. Settle, with the user where material:

- Element decisions: which existing shared or feature components to reuse,
  which new components to create with their placement, and a one-line reason each.
- Layout and hierarchy per screen: what the student sees first, how content
  groups, and where primary actions live.
- States: loading, empty (with the next action to take), and error (actionable
  message) for each view and interaction.
- Accessibility: keyboard operability, visible focus states, non-color-only
  distinctions, and the other WCAG 2.2 AA obligations for the new interactions.
- Responsive: desktop and mobile behavior for each affected view.
- Copy: concrete labels, button text, and messages, not placeholders. EP13
  surfaces additionally follow the non-blaming copy rule (D13-9).
- Test cases to add: named component, accessibility, and responsive tests per
  acceptance criterion.

## Security rules

- Never read, display, quote, or write to `.env`, `.env.*`, credential, key,
  token, or secret-manager files. If a task needs a credential value, tell the
  user to set it themselves.
- Secrets never go into story files or docs — describe mechanisms ("SMTP
  credentials via environment configuration"), never values.
- If you encounter an exposed secret, flag its location without reproducing the value.

## Framework note

This is a write-restricted role. Whatever agent framework runs these
instructions, restrict its write access to `docs/stories/` if the framework
supports permission scoping; treat the restriction above as binding regardless
of enforcement.
