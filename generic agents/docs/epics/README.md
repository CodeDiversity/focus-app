# Shared delivery reference

Use [project context](../../.agents/project-context.md) for accepted scope, stack,
commands, roadmap, security and optional tracker configuration. This starter
contains no product epics, milestones, issue keys or historical approvals.

## Definition of Done

Every completed story must satisfy these applicable conditions. Record a concrete
reason for `Not applicable`; absence of execution evidence is `CANNOT VERIFY`,
not non-applicability. Apply any additional destination-repo obligations without
weakening existing requirements during adoption.

1. Functional acceptance criteria pass, including required negative cases.
2. Input validation handles invalid data at the relevant interface boundaries.
3. Protected data is scoped to the authenticated principal/tenant; deliberately
   public/shared data follows its documented authorization policy.
4. Errors are actionable and do not leak sensitive data or private resources.
5. Loading, empty, error and recovery states are handled where applicable.
6. Interactive workflows meet the applicable keyboard/accessibility requirements.
7. Layouts and interactions work across the supported platforms and input modes.
8. Changed business rules and explicitly required behavior have automated tests.
9. Public-interface/API changes, migrations and required operational changes are
   documented, including relevant recovery/compatibility constraints.
10. The feature is verified in an appropriate integrated development environment.
    For a CLI/library, exercise the actual entry point or consumer; for a service,
    exercise its changed components together. Record environment, commands/actions,
    tested state and results. A web browser or shared database is not required
    for work that does not use one. Preserve stricter project-specific evidence
    requirements, including human verification when explicitly required.
11. The independent reviewer has saved and verified the separate final
    `walkthrough.md`, explaining the code/workflow, correctness evidence after
    corrections and manual test steps/expected results for each applicable flow.

Item 11 applies once per final review unit, in ordinary and autopilot reviews.
It is reviewer-owned, never an implementer prerequisite to initial review. Save
and verify both `review.md` and `walkthrough.md` before `Reviewed`/complete.
Optional user test instructions may be unexecuted; required manual gates need
actual evidence. See the [reviewer workflow](../../.agents/skills/delivery-reviewer/SKILL.md#final-user-walkthrough).

## Epic and milestone inventory

The planner adds actual epic files, stable IDs, requirement/test references,
dependencies and accepted milestones here when authorized. Preserve an existing
repository's inventory and conventions. Use the [epic template](../../templates/epic.md)
for a new source requirement document; planning a feature does not imply its
implementation or tracker synchronization.
