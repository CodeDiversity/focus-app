# SP-104: Auth Guards and Student Data Scoping

**Story ID:** SP-104
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** High / P0
**Dependencies:** SP-102
**Jira key:** STUDY-10

## Summary

Enforce authentication on all protected routes and establish the ownership-scoping pattern every later epic relies on.

## Description

As a student, I want my academic data accessible only to me, so that no other student can read or modify my records.

## Acceptance Criteria

- A global JWT auth guard protects every route except the public auth allowlist (login, register, refresh, verify, reset endpoints).
- A `@CurrentUser()` decorator exposes the authenticated student's id to controllers.
- The ownership convention is established and documented: all Prisma queries for academic data must include a `userId` scope or an explicit ownership check that returns 403 on mismatch.
- Unauthenticated requests to protected academic data return 401.
- A student cannot fetch or modify another student's records: cross-student access returns 403 without leaking the existence or content of the resource.
- Integration tests demonstrate cross-student isolation using two seeded accounts.

## Technical Notes

- This is the epic's cross-cutting acceptance criterion ("Students cannot access or modify another student's records") made testable; it is the pattern EP02-EP08 stories will follow.
- Provide a small helper (e.g. `assertOwnership(userId, resource)` or scoped Prisma query helpers) so later epics apply the check consistently.
- Public route allowlist lives in one config location to keep it reviewable.
- Automated tests: 401 unauthenticated, 403 cross-student read and write, 200 own record.

## Existing scaffold code (from STUDY-20)

- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` + `strategies/jwt.strategy.ts` — per-controller JWT guard in place.
- `UsersController` is guarded at class level with `/me` routes only; `AuthenticatedRequest` typing lives in `apps/api/src/common/types.ts`.

Deltas this story must resolve against the acceptance criteria:

- The guard is applied per-controller; the story requires a **global guard with a public allowlist** in one config location.
- No `@CurrentUser()` decorator yet — controllers read `req.user` directly.
- No ownership helper (`assertOwnership` / scoped query helpers) and no cross-student integration tests — the core deliverable of this story.
