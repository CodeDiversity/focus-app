# StudyPilot repo agents

The six roles in `.vibe/agents/` are also available to Codex as project agents in `.codex/agents/`. Their shared instructions remain in `.agents/skills/`; read the relevant skill before performing a role's work.

| Agent | Purpose | Shared skill | Writes |
| --- | --- | --- | --- |
| `backend` | NestJS, Prisma, PostgreSQL implementation | `.agents/skills/studypilot-backend/SKILL.md` | Implementation and story artifacts |
| `frontend` | React, Vite, TanStack Query implementation | `.agents/skills/studypilot-frontend/SKILL.md` | Implementation and story artifacts |
| `planner` | Epic breakdown, sequencing, backlog planning | `.agents/skills/studypilot-planner/SKILL.md` | Only `docs/` |
| `refiner` | Ground an unimplemented story in the codebase | `.agents/skills/studypilot-refiner/SKILL.md` | Only the given story in `docs/stories/` |
| `reviewer` | Review plans before implementation or verify completed work against acceptance criteria and DoD | `.agents/skills/studypilot-reviewer/SKILL.md` | None; return Markdown report |
| `dod-auditor` | Static Definition of Done audit | `.agents/skills/studypilot-reviewer/SKILL.md` | None; return the audit |

When asked to use a role, use its custom agent if the runtime supports selecting one. Otherwise, read `.codex/agents/<role>.toml` and its shared skill and follow those instructions in the current session or include them in the delegated task. Having these roles available does not require delegating every task.

For story work, read the relevant files in `docs/epics/` and `docs/stories/`, plus the shared Definition of Done in `docs/epics/README.md`. Follow `docs/artifacts/README.md` for implementation and review reports.

The review agents run in a read-only sandbox and return Markdown reports. The parent saves implementation reviews to `docs/artifacts/<JIRA-KEY>/review.md` and plan reviews to `<breakdown-directory>/plan-review.md` (for SP-105: `docs/stories/EP01/SP-105/plan-review.md`). During a planner/reviewer cycle, the planner reads that report, records each original finding and correction by stable ID in the breakdown README, and leaves the report unchanged. The reviewer independently verifies closure on the next pass; the parent replaces the report with the latest returned Markdown. Earlier committed reports remain in Git history. The planner and refiner's narrower write limits are instructions applying to every tool, rather than filesystem sandbox guarantees. Do not broaden their write scope.

All roles must follow their skill's security rules. Never read, display, or write credential or secret files, including `.env` and `.env.*`; flag exposed secrets by location without reproducing values.

## Ownership scoping

Every Prisma query for a student's academic data must include the authenticated student's `userId` in its `where` clause — use the helpers in `apps/api/src/common/ownership/ownership.ts` (`ownedWhere` for single-record where-clauses, `assertOwned` for fetched records, `assertAffected` for `updateMany`/`deleteMany` counts), and read the principal with `@CurrentUser()` (never `@Req()`/`@Request()` in controllers; the global `APP_GUARD` already 401s unauthenticated routes). Access that is not owned — the record missing, or owned by another student — returns the same uniform 404 with the generic message `Resource not found`. Never answer with a 403 or a distinct message: that reveals another student's records exist (an existence oracle). The canonical in-code copy of this convention is the header comment in `apps/api/src/common/ownership/ownership.ts`.
