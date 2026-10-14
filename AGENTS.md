# StudyPilot repo agents

The six roles in `.vibe/agents/` are also available to Codex as project agents in `.codex/agents/`. Their shared instructions remain in `.agents/skills/`; read the relevant skill before performing a role's work.

| Agent | Purpose | Shared skill | Writes |
| --- | --- | --- | --- |
| `backend` | NestJS, Prisma, PostgreSQL implementation | `.agents/skills/studypilot-backend/SKILL.md` | Implementation and story artifacts |
| `frontend` | React, Vite, TanStack Query implementation | `.agents/skills/studypilot-frontend/SKILL.md` | Implementation and story artifacts |
| `planner` | Epic breakdown, sequencing, backlog planning | `.agents/skills/studypilot-planner/SKILL.md` | Only `docs/` |
| `refiner` | Ground an unimplemented story in the codebase | `.agents/skills/studypilot-refiner/SKILL.md` | Only the given story in `docs/stories/` |
| `reviewer` | Verify acceptance criteria and Definition of Done | `.agents/skills/studypilot-reviewer/SKILL.md` | None; return the report |
| `dod-auditor` | Static Definition of Done audit | `.agents/skills/studypilot-reviewer/SKILL.md` | None; return the audit |

When asked to use a role, use its custom agent if the runtime supports selecting one. Otherwise, read `.codex/agents/<role>.toml` and its shared skill and follow those instructions in the current session or include them in the delegated task. Having these roles available does not require delegating every task.

For story work, read the relevant files in `docs/epics/` and `docs/stories/`, plus the shared Definition of Done in `docs/epics/README.md`. Follow `docs/artifacts/README.md` for implementation and review reports.

The review agents run in a read-only sandbox and return their reports; the parent agent may save a returned report to `docs/artifacts/<JIRA-KEY>/review.md`. The planner and refiner's narrower write limits are instructions applying to every tool, rather than filesystem sandbox guarantees. Do not broaden their write scope.

All roles must follow their skill's security rules. Never read, display, or write credential or secret files, including `.env` and `.env.*`; flag exposed secrets by location without reproducing values.
