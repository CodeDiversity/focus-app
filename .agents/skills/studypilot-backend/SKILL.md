---
name: studypilot-backend
description: Load when implementing StudyPilot backend features — NestJS modules, Prisma models and migrations, REST endpoints, or the scheduling domain logic.
---

# StudyPilot Backend Agent

Stack: NestJS + Prisma + PostgreSQL.

Apply [story sizing](../../story-sizing.md) before implementation. Use the story's
start context and implement only its outcome. If it hides multiple independent
outcomes or grows beyond its sizing evidence, hand the split back to the planner
with progress and test evidence; do not silently expand scope or split atomic writes.

Use [checkpoint-based execution](../../checkpoint-execution.md): create/resume
the task's `checkpoint.md`, save progress after milestones and before context
handoff, and continue the same task across fresh windows. Verify Git/test state
on resume; do not replay completed work. Maintain the final implementation artifact
separately and do not equate a checkpoint with completion.

Follow [review cadence](../../review-cadence.md): run each substory's required
tests and record implementation completion, then proceed to dependent work.
Do not request individual substory review/audit by default. After all children
and integration work finish, the coordinating implementer prepares the parent
implementation index for one combined formal review.

## Working style

- **Commit as you go.** Make small, focused commits after each working unit (a passing test or a completed small feature). Do not wait until a story is fully done to commit — every meaningful step should be committed.
- **Prefer red/green TDD.** Write the failing test first (red), then make it pass (green), then refactor. For backend stories, write unit/integration tests before or alongside the implementation code. Run the failing test to confirm it actually fails, then implement just enough to pass it. Move to the next test or feature.
- Keep commits focused and self-contained so they can be reviewed or reverted independently.

- Read the relevant epic in `docs/epics/` and its story in `docs/stories/` before implementing. The acceptance criteria there define done.
- Every protected resource must scope queries to the authenticated student. Add account-ownership checks; one student must never read or modify another student's records.
- Schema changes go through a Prisma migration. Document API changes per the shared Definition of Done in `docs/epics/README.md`.
- Keep business rules in pure, testable TypeScript modules. The EP06 scheduling engine and EP08 replanning must stay independent of HTTP, React, and database operations; reuse the same engine for both.
- Validate DTOs; API errors must produce actionable messages.
- Write automated tests for business rules (scheduling determinism, remaining-work math, overdue logic, ownership scoping) and run them before finishing.
- Match existing module structure, DTO, and service conventions. Minimal diffs; do not refactor unrelated code.
- When finishing a story, record what was built in `docs/artifacts/<JIRA-KEY>/implementation.md` (e.g. `docs/artifacts/STUDY-20/implementation.md`; conventions in `docs/artifacts/README.md`): endpoints, schema changes, migrations, commands, and open items. If the file already exists, update it rather than creating a duplicate. The reviewer and DoD auditor read this file.

## Security rules

- Never read, display, quote, or write to `.env`, `.env.*`, credential, key, token, or secret-manager files. If a task needs a credential value, tell the user to set it themselves.
- All secrets enter through environment variables or a secrets manager read by the app's config layer — never in source, committed config, migrations, seeds, or logs.
- Never log passwords, token payloads, or refresh tokens; hash and compare in place.
- If you encounter an exposed secret, flag its location without reproducing the value.

## Framework note

This is an implementation role. The framework may auto-approve file edits for this agent; database operations against shared environments should still require human approval.
