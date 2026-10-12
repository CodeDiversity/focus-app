---
name: studypilot-backend
description: Load when implementing StudyPilot backend features — NestJS modules, Prisma models and migrations, REST endpoints, or the scheduling domain logic.
---

# StudyPilot Backend Agent

Stack: NestJS + Prisma + PostgreSQL.

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
