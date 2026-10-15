# StudyPilot repo agents

The five roles in `.vibe/agents/` are also available to Codex as project agents in `.codex/agents/`. Their shared instructions remain in `.agents/skills/`; read the relevant skill before performing a role's work.

| Agent | Purpose | Shared skill | Writes |
| --- | --- | --- | --- |
| `implementer` | Sequential backend, frontend, database and integration implementation | `.agents/skills/studypilot-implementer/SKILL.md` | Implementation and checkpoint artifacts |
| `planner` | Epic breakdown, sequencing, backlog planning | `.agents/skills/studypilot-planner/SKILL.md` | Only `docs/` |
| `refiner` | Ground an unimplemented story in the codebase | `.agents/skills/studypilot-refiner/SKILL.md` | Only the given story in `docs/stories/` |
| `reviewer` | Review plans before implementation or verify completed work against acceptance criteria and DoD | `.agents/skills/studypilot-reviewer/SKILL.md` | None; return Markdown report |
| `dod-auditor` | Static Definition of Done audit | `.agents/skills/studypilot-reviewer/SKILL.md` | None; return the audit |

When asked to use a role, use its custom agent if the runtime supports selecting one. Otherwise, read `.codex/agents/<role>.toml` and its shared skill and follow those instructions in the current session or include them in the delegated task. Having these roles available does not require delegating every task.

Use one active `implementer` for all layers in a shared workspace. Do not run
parallel implementation writers or split backend/frontend into different agents.
The backend/frontend skills remain technical guidance loaded by that implementer;
legacy requests naming those agents route to `implementer`. Coordinate an explicit
checkpoint handoff before another implementation session takes over. Read-only
review/exploration remains separate; role availability is not a locking mechanism.

For story work, read the relevant files in `docs/epics/` and `docs/stories/`, plus the shared Definition of Done in `docs/epics/README.md`. Follow `docs/artifacts/README.md` for implementation and review reports.

Every role must apply [delivery state](.agents/delivery-state.md). Read the parent
README's execution queue first: it records the active/next substory, blockers,
and canonical artifact paths. Keep plans and artifacts in the same delivery home.
The implementer may update only execution fields/table and the active child's
status/artifact pointers as a narrow exception to planner-owned planning docs;
refiner write limits and reviewer/auditor read-only limits remain unchanged.

All story roles must apply [story sizing](.agents/story-sizing.md): default to one
30–90-minute implementation outcome with explicit file, context and verification
boundaries. The planner splits oversized unimplemented stories; refiners and
implementers hand scope growth back to the planner within their existing write
limits. Reviewers verify sizing from evidence. Preserve atomic security invariants
and all original AC/test/DoD coverage when splitting.

Implementation tasks use [checkpoint-based execution](.agents/checkpoint-execution.md).
Implementers maintain the queue-resolved `artifacts/<story-id>/checkpoint.md` after logical
milestones and before fresh-context handoffs. A task may span multiple context
windows or different agent tools; resume from the checkpoint after reconciling
Git state. Checkpoints do not establish completion or replace the final
implementation/review artifacts.

Apply [review cadence](.agents/review-cadence.md): test and record each substory,
then review the entire parent scope once after all substories and integration
work are implemented. Do not automatically review/audit individual substories.
Implementation-complete children may unblock dependencies while awaiting the
parent's formal sign-off. Preserve historical reports.

The review agents run in a read-only sandbox and return Markdown reports. The parent saves implementation reviews at the parent README's resolved artifact path (`<delivery-home>/artifacts/<parent-story-id>/review.md` for migrated/new groups) and plan reviews to `<delivery-home>/plan-review.md` (for SP-105: `docs/stories/EP01/SP-105/plan-review.md`). During a planner/reviewer cycle, the planner reads that report, records each original finding and correction by stable ID in the breakdown README, and leaves the report unchanged. The reviewer independently verifies closure on the next pass; the parent replaces the report with the latest returned Markdown. Earlier committed reports remain in Git history. The planner and refiner's narrower write limits are instructions applying to every tool, rather than filesystem sandbox guarantees. Do not broaden their write scope.

All roles must follow their skill's security rules. Never read, display, or write credential or secret files, including `.env` and `.env.*`; flag exposed secrets by location without reproducing values.

## Ownership scoping

Every Prisma query for a student's academic data must include the authenticated student's `userId` in its `where` clause — use the helpers in `apps/api/src/common/ownership/ownership.ts` (`ownedWhere` for single-record where-clauses, `assertOwned` for fetched records, `assertAffected` for `updateMany`/`deleteMany` counts), and read the principal with `@CurrentUser()` (never `@Req()`/`@Request()` in controllers; the global `APP_GUARD` already 401s unauthenticated routes). Access that is not owned — the record missing, or owned by another student — returns the same uniform 404 with the generic message `Resource not found`. Never answer with a 403 or a distinct message: that reveals another student's records exist (an existence oracle). The canonical in-code copy of this convention is the header comment in `apps/api/src/common/ownership/ownership.ts`.
