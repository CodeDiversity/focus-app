# SP-105B: Password Reset — Redemption & Session Revocation

**Story ID:** SP-105B
**Execution state:** Implemented — awaiting parent review; E remains outstanding; see the [execution queue](./README.md#execution-queue) and [implementation record](./artifacts/SP-105B/implementation.md)
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer:** Backend
**Priority:** High / P0
**Status:** Implemented — awaiting parent review (see execution state above)
**Historical planning status:** Draft — corrected mechanism; awaiting independent re-review
**Dependencies:** SP-105A (reset persistence), [SP-105E](./SP-105E-auth-session-coordination.md) (shared owner-first session locking)
**Jira key:** Pending creation
**Refined:** 2026-10-14

## Summary and scope

Redeem a reset token, update the password, retire outstanding reset tokens and revoke all refresh families in one transaction. The controller expires the browser cookie after commit. A owns issuance, E owns changes to existing login/refresh/logout coordination, C owns browser state, F owns per-IP limits, and D owns integrated verification. Target one focused working session after A/E.

## Acceptance criteria

1. Original AC3: a valid raw token updates the stored password using the same argon2id options and minimum-eight-character policy as registration. Validate password confirmation before mutation.
2. Original AC2/TR single-use: lock the owner **before any token write**, then conditionally claim the token with `usedAt IS NULL` and `expiresAt >` a fresh time obtained after waiting for the owner lock. Zero affected rows returns the uniform actionable 400 and rolls back every dependent write.
3. Original AC4/TR session revocation: in that same transaction, retire all other unused reset tokens for the owner, revoke **all** refresh-token rows across families by `userId`, and update the password. Never touch another owner's credentials or academic data.
4. Original AC5: missing, malformed, unknown, used and expired token states use the same `INVALID_RESET_MESSAGE`. Password/confirmation errors remain field errors, not invalid-token errors.
5. Original AC2: two same-token requests or two distinct valid tokens for the same owner yield one success and one uniform 400, without a token-before-owner deadlock. Use the lock protocol shared with A/E; don't infer safety from `$transaction` alone.
6. After successful commit, `AuthController` expires `refresh_token` via the existing `clearRefreshCookie(res)` helper, preserving `HttpOnly`, `Path=/auth`, `SameSite=Lax`, production `Secure`, and host/domain behavior. No success cookie or response on rollback. Frontend JavaScript never clears this HttpOnly cookie.

## API contract

Follow the [parent shared API contract](./SP-105-password-reset.md#shared-api-contract-all-children-must-agree): `{ token, password, confirmPassword }`; raw token is 43-character base64url, SHA-256 once on the server. `RESET_SUCCESS_MESSAGE = 'Password updated. Please sign in.'`; `INVALID_RESET_MESSAGE = 'This reset link is invalid or has expired. Please request a new one.'`. Return explicit 200, or uniform 400 for token failures, with the global error envelope. Global DTO validation rejects extra owner/family identifiers. F may reject requests with account-independent 429 before service execution.

## Transaction order (proposed, not implemented)

Hash the proposed password before opening the transaction. Use parameterized Prisma raw queries only where row locks require them; actual mapped tables are `users`, `password_reset_tokens`, and `refresh_tokens` (`schema.prisma`), not `"User"`.

1. Read token by hash to discover `userId`, **without locking or writing the token**. This read is advisory; unknown token returns uniform 400.
2. In the same transaction, `SELECT id FROM users WHERE id = <owner> FOR UPDATE`. Missing owner returns the same 400. A/E must acquire this same owner lock before credential writes.
3. Obtain a fresh database wall-clock value **after** the lock wait (for example `clock_timestamp()`, not transaction-start `now()`). Conditionally update the presented reset row using `id`, `userId`, `usedAt: null`, and `expiresAt > checkedAt`; set `usedAt`. Require count = 1; otherwise throw and roll back.
4. Retire remaining unused reset rows for this `userId`, then revoke every unrevoked refresh row for this `userId`.
5. Update only the locked owner's password hash. Preserve the issuance cooldown marker; reset does not grant an extra email attempt. Commit all writes together, then expire the response cookie and return success.

With distinct tokens, both requests may discover the owner, but only one gets the user lock. The first claims its token, retires the other, and commits; the second then fails its conditional claim. It never holds a token lock while waiting for the owner. Same-token races follow the same order. If issuance gets the owner lock first it retires the old token; if redemption gets it first, a later eligible issuance is a **new** reset cycle. D must test both orders. Roll back claims/retirements/revocations if password persistence fails.

## Session boundary and counterexamples

- The user approved the existing access-JWT expiry window in this conversation on 2026-10-14 (“your suggestion” in response to the explicit JWT question). Existing JWTs can remain valid for their remaining configured TTL (default ~15 minutes); immediate invalidation is not promised. E must sign successful login/refresh JWTs while holding the owner lock so reset cannot race signing into a later issuance time. HTTP delivery can occur after reset even when the operation committed before it.
- E changes existing login: verify a password snapshot, then under the owner lock re-read and require the hash still matches that verified snapshot before creating a session. Reset-first means old-password login fails; login-first means its new refresh family is subsequently revoked by reset. Simply replacing the password hash is insufficient.
- E changes refresh: owner lock before re-reading/claiming refresh rows and creating a successor. Reset-first means refresh fails; refresh-first may return 200 but its successor is revoked by reset. Do not require every overlapping refresh to return 401.
- Unknown/foreign tokens never accept a caller-supplied owner; only the token's stored owner authorizes the change. Token/password/raw Axios request configuration must never reach logs or analytics.

## Relevant paths and tests

Current evidence: `auth.controller.ts` already defines `clearRefreshCookie`; `auth.service.ts` has login/refresh but no reset service; `ARGON2_OPTIONS` is module-private and must be reused/exported as appropriate. New: `password-reset.service.ts`, `dto/reset-password.dto.ts` and their specs. Public route allowlist already reserves the endpoint.

- Service/stateful unit tests: successful hash update; same-token and different-token loser; fresh expiry after lock wait; all-owner-token retirement; all-family revocation; other account untouched; rollback on claim/password/revocation failure; cooldown marker preserved.
- DTO/global-pipe HTTP tests: missing/malformed/extra fields, short password, confirmation mismatch, uniform invalid-token messages, public access, explicit success 200.
- Controller HTTP test: successful reset emits expiry `Set-Cookie` with the existing cookie attributes; failed reset does not emit success cleanup. This is B's obligation, not a jsdom cookie assertion in C.
- D owns real PostgreSQL lock-order tests, both login/refresh interleavings, rollback and browser cookie/session smoke. Planned tests are not passing evidence.

## Definition of Done

[Shared DoD](../../../epics/README.md): 1, 2, 4, 8, 9 apply; 3 N/A because no academic data is accessed (credential-owner isolation still required); 5–7 N/A for backend. Item 10 is required and performed in D. Document API, cookie behavior and concurrency in the eventual child issue's implementation artifact; keep Jira `Pending creation` until created. Independent plan re-review remains pending.
