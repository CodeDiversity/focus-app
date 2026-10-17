# StudyPilot repo agents

Use the requested custom role in `.codex/agents/` when supported; `.vibe/agents/`
provides the same roles for Vibe. Otherwise read its definition and shared skill.
Role availability does not require delegation.

| Role | Shared skill | Write boundary |
| --- | --- | --- |
| implementer | `.agents/skills/studypilot-implementer/SKILL.md` | Code, tests, implementation/checkpoint artifacts; scoped execution-status updates |
| planner | `.agents/skills/studypilot-planner/SKILL.md` | Only `docs/` |
| refiner | `.agents/skills/studypilot-refiner/SKILL.md` | Only the given unimplemented story |
| reviewer | `.agents/skills/studypilot-reviewer/SKILL.md` | Report; passing verdict's scoped docs sync |
| dod-auditor | `.agents/skills/studypilot-reviewer/SKILL.md` (static audit) | None |

One active implementer owns all layers sequentially in a shared workspace.
Legacy backend/frontend agent requests route to implementer; load their technical
skills only for affected layers. Coordinate a checkpoint handoff before another
implementation session takes over. Preserve other contributors' work.

For story work, read [delivery state](.agents/delivery-state.md) and the parent
README's execution queue first. Load the requested role's skill, relevant epic,
active story, shared DoD in `docs/epics/README.md`, and relevant contracts.
Use section-level reads; expand when dependencies or evidence require it.

Canonical workflow rules live in:

- [Story sizing](.agents/story-sizing.md): planning, refinement and scope assessment.
- [Checkpoint execution](.agents/checkpoint-execution.md): implementation/resume.
- [Review cadence](.agents/review-cadence.md): review unit and final gate.
- [Context and efficiency](.agents/context-efficiency.md): reads, handoffs and measurement.
- [Artifact conventions](docs/artifacts/README.md): layout and records.

Follow role write limits with every tool, including shell. Reviewer persistence
and restricted-runtime fallback are defined in its skill; an auditor stays
fully read-only. Never treat implementation completion as independent approval.

Never read, display, search inside, or write credential or secret files, including
`.env` and `.env.*`. Flag exposed secrets by location without reproducing values.
Existing authorization boundaries for trackers, shared databases, deployment and
destructive actions remain in force.

## Ownership scoping

Every Prisma query for a student's academic data must include the authenticated student's `userId` in its `where` clause — use the helpers in `apps/api/src/common/ownership/ownership.ts` (`ownedWhere` for single-record where-clauses, `assertOwned` for fetched records, `assertAffected` for `updateMany`/`deleteMany` counts), and read the principal with `@CurrentUser()` (never `@Req()`/`@Request()` in controllers; the global `APP_GUARD` already 401s unauthenticated routes). Access that is not owned — the record missing, or owned by another student — returns the same uniform 404 with the generic message `Resource not found`. Never answer with a 403 or a distinct message: that reveals another student's records exist (an existence oracle). The canonical in-code copy of this convention is the header comment in `apps/api/src/common/ownership/ownership.ts`.
