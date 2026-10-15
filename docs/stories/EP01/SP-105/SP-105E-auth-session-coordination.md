# SP-105E: Coordinate Login and Refresh with Password Reset

**Story ID:** SP-105E
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer:** Backend
**Priority:** High / P0
**Status:** Draft — awaiting independent plan re-review
**Dependencies:** SP-102 (session implementation)
**Jira key:** Pending creation
**Refined:** 2026-10-14

## Summary and bounded scope

Close the old-password-login and refresh-successor races that a reset-only transaction cannot close. Introduce an owner-first locking protocol for existing credential writes. This is a prerequisite to B, not an extra reset endpoint or an access-JWT denylist. Target one focused backend session; split further if implementation sizing exceeds that.

## Source requirements and acceptance criteria

Original SP-105 AC4 and session-revocation TR; [shared API/session contract](./SP-105-password-reset.md).

1. Every session-changing transaction discovers the owner without a row write, locks `users.id FOR UPDATE`, then re-reads/claims or writes credential rows. Apply this order to login, refresh and logout; A/B apply it to reset issuance/redemption. Unknown credentials fail uniformly without accepting a client owner identifier. Use parameterized SQL for explicit locks.
2. Login may perform expensive Argon2 verification of an immutable password-hash snapshot before the transaction. Under the owner lock, re-read the account and require `passwordHash` still equals the verified snapshot before creating the refresh row. A mismatch returns the existing generic 401 with no session persisted. Unknown email keeps the existing dummy-hash behavior.
3. Refresh may perform advisory token lookup to discover the owner, then locks the owner **before any token write**, re-reads the token under the lock, validates fresh expiry, and preserves the existing conditional claim/rotation/reuse-detection behavior. Create any successor inside that transaction. Lost/reused claims must commit intended family revocation, not throw inside the transaction and roll it back.
4. Sign successful access JWTs while holding the owner lock; return them only after transaction commit. A reset that acquires the lock afterward revokes the session's refresh rows. A reset that commits first makes a pre-reset refresh fail, or makes an old-password login fail its locked hash-snapshot check. Signing/HTTP failures must not leak credential values.
5. Preserve ordinary login/refresh/logout status/body, cookie and rotation behavior; logout remains idempotent and revokes its current family only. Other accounts remain isolated. No protected academic-data queries are added.

## Counterexamples and planned tests

- **Login paused after old-password verification:** let reset commit, then release login. Locked snapshot comparison fails with generic 401; no new refresh row or JWT is returned. Reverse order: login commits first, reset then revokes its newly-created family. A delayed pre-reset response does not make that refresh credential usable.
- **Refresh paused before owner lock:** let reset commit first; token re-read is revoked and refresh returns 401. Reverse order: refresh commits first (200 allowed), then reset revokes the successor along with all families. Never assert every overlapping refresh must return 401.
- **Both session mutations:** shared user-before-token ordering prevents reset holding the user while refresh holds a token and waits for that user. Test with deterministic barriers, not sleep-based parallel requests alone.
- **Rollback:** failed session persistence/signing before commit rolls back token mutations. Preserve existing reuse-detection tests proving family retirement commits on an invalid outcome.
- **Expiry after lock wait:** use a fresh post-lock wall-clock value, not transaction-start `now()`; reject at the exact expiry boundary.

Extend `apps/api/src/modules/auth/auth.service.spec.ts` with stateful transaction tests; preserve existing auth-controller and JWT strategy tests. I adds real-Postgres, multi-client tests for each order above using H fixtures; D executes them for integrated sign-off. These are obligations, not executed tests.

## Technical notes and migration

Current `AuthService.login` verifies before an uncoordinated `refreshToken.create`; current `refresh` claims refresh rows without the user lock. Both must change. Reuse the Prisma service/transaction conventions and actual `users`/`refresh_tokens` mapped table names. No schema migration or new public contract is required for this story. A shared internal owner-lock helper may be introduced by the implementer; its exact filename is proposed, not an existing symbol.

The user approved retaining the existing access-JWT expiry window on 2026-10-14 in this conversation. Existing JWTs remain valid for their remaining configured TTL (default 15 minutes). This protocol blocks post-reset renewal using old credentials; it does not withdraw JWTs issued by operations ordered before reset. Response delivery can occur later than commit. Immediate JWT invalidation remains outside the approved scope.

## Definition of Done

[Shared DoD](../../../epics/README.md): 1, 2, 4, 8, 9 apply (document internal session semantics even though public API is unchanged); 3 N/A for academic data, with credential ownership still required; 5–7 N/A backend. Item 10 is required and performed by D. Record tests and race evidence under this child's actual Jira key after creation. No invented approval, tracker key, or test results.
