---
name: studypilot-backend
description: Backend technical guidance for the single StudyPilot implementer when changing NestJS modules, Prisma models and migrations, REST endpoints, or scheduling domain logic.
---

# StudyPilot Backend Guidance

Supporting guidance for the single [implementer](../studypilot-implementer/SKILL.md).
Follow that skill's execution/ownership rules. Loading this skill does not create
a separate backend implementation role.

Stack: NestJS + Prisma + PostgreSQL.

## Technical requirements

- Every protected resource must scope queries to the authenticated student. Add account-ownership checks; one student must never read or modify another student's records.
- Schema changes go through a Prisma migration. Document API changes per the shared Definition of Done in `docs/epics/README.md`.
- Keep business rules in pure, testable TypeScript modules. The EP06 scheduling engine and EP08 replanning must stay independent of HTTP, React, and database operations; reuse the same engine for both.
- Validate DTOs; API errors must produce actionable messages.
- Write automated tests for business rules (scheduling determinism, remaining-work math, overdue logic, ownership scoping) and run them before finishing.
- Match existing module structure, DTO, and service conventions. Minimal diffs; do not refactor unrelated code.

## Security rules

- Never read, display, quote, or write to `.env`, `.env.*`, credential, key, token, or secret-manager files. If a task needs a credential value, tell the user to set it themselves.
- All secrets enter through environment variables or a secrets manager read by the app's config layer — never in source, committed config, migrations, seeds, or logs.
- Never log passwords, token payloads, or refresh tokens; hash and compare in place.
- If you encounter an exposed secret, flag its location without reproducing the value.

## Framework note

This is supporting layer guidance for the implementer. It does not grant separate
write ownership or authorize database operations against shared environments.
