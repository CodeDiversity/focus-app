# SP-105E: Coordinate Login and Refresh with Password Reset

**Story:** [SP-105E](../../stories/EP01/SP-105/SP-105E-auth-session-coordination.md)
**Epic:** EP01 — Authentication & Onboarding
**Parent:** SP-105 (STUDY-7)
**Layer:** Backend (NestJS + Prisma + PostgreSQL)
**Status:** Implemented (2026-10-15) — implementation complete, awaiting parent review

## Summary

Closes the two session races a reset-only transaction cannot close. Applies the SP-105 **owner-first** locking protocol (reuse of `owner-lock.ts` created by SP-105B) to the three existing session-mutating operations — `login`, `refresh`, `logout` — so a login that verified the *old* password, or an in-flight refresh that issued a successor, can no longer persist a **live, rotatable** refresh family after a password reset commits. No new endpoint, cookie/header change, or schema migration; the public API is unchanged.

This removes the partial invariant SP-105B flagged: until E lands, a pre-reset login/refresh could commit a family that `reset-password`'s revocation (`updateMany`, snapshot-scoped) never touches, so that family keeps rotating for up to its 30-day TTL. Now **every** post-reset renewal attempt using those credentials fails.

## What was built

### Shared helper (reused, not changed)
`apps/api/src/modules/auth/owner-lock.ts` — `lockOwner(tx, userId)` (`SELECT id FROM "users" WHERE id = $1 FOR UPDATE`, parameterized) and `databaseNow(tx)` (`clock_timestamp()` after the lock wait). Created by SP-105B; E reuses both exactly as documented.

### `apps/api/src/modules/auth/auth.service.ts`

New private `authenticate(email, password)`: the expensive argon2id verify runs **before** any transaction, and captures the exact stored hash it verified as an immutable snapshot. `validateUser` now delegates to it and strips the hash (shape unchanged — `LocalStrategy` and its tests are unaffected). Unknown email keeps the dummy-hash timing-equalization.

| Operation | New owner-first order | Behavior preserved |
|---|---|---|
| `login` | advisory read + verify snapshot → **lock `users.id FOR UPDATE`** → re-read account under lock → require `passwordHash === snapshot` → create refresh row → **sign JWT under lock** | Same generic `401 'Invalid email or password'` for unknown / wrong / **changed-after-verify**; same `AuthResult` shape, cookie, and 15-min access token |
| `refresh` | advisory owner discovery (no lock/write) → **lock owner before any token write** → fresh `clock_timestamp()` → re-read token under lock, validate **fresh** expiry → conditional claim / rotation / reuse-detection → create successor → sign JWT under lock | Same `401 'Invalid or expired session'`; lost/reuse claims **commit** family revocation then throw after commit (never throw inside the tx); same rotation & reuse-detection semantics |
| `logout` | advisory owner discovery → **lock owner** → revoke **that one family** with a fresh post-lock timestamp, inside one transaction | Idempotent; unknown token / missing owner commit as a no-op; other families untouched |

A reset that acquires the owner lock *after* a session commit revokes the new rows (SP-105B). A reset that commits *first* makes a pre-reset login fail its locked hash-snapshot check and a pre-reset refresh fail its locked re-read (revoked or expired by the fresh clock). Access-JWT window stays the SD7-approved bounded ~15 min — no denylist, no immediate invalidation (out of scope).

### Boundary semantics
- **No existence oracle:** unknown email, missing owner row, and a changed-after-verify hash all map to the identical generic 401 in `login`; missing token, missing owner, and a changed token all map to the identical invalid session 401 in `refresh`. No client-supplied owner/family identifier is trusted — the owner is always discovered from the credential.
- **Fresh post-lock clock** (`clock_timestamp()`), not transaction-start `now()`, so a token whose expiry lands *while waiting for the lock* is rejected at the exact boundary (`expiresAt <= checkedAt`).
- **Other accounts isolated:** all writes are scoped to the discovered owner / its family. No academic-data queries added.

## Test coverage

`apps/api/src/modules/auth/auth.service.spec.ts` (20 → **23 tests**, all pass):

| Added test | Proves |
|---|---|
| login — "persists no session when a password reset commits between verify and the lock" | pre-lock verify succeeds on the old hash; locked re-read sees a different hash → generic 401, no `refreshToken.create`, no `jwtService.sign` |
| login — "persists no session when the owner row is gone under the lock" | `lockOwner` finds no row → generic 401, no session written |
| refresh — "rejects a token that expires while the transaction waits for the owner lock" | token not expired at tx start but expired by the post-lock `clock_timestamp()` → 401, no successor (fresh-clock, not start-time) |

The pre-existing suite (stateful concurrent-refresh race, reuse-detection/family revocation, expired/unknown, logout single-family + idempotency) all still pass against the new protocol. The test double gained a `$queryRaw` mock (default: owner row exists, clock = now; overridable per test for missing-owner / moved-clock).

**Verification (fresh, this session):** `pnpm --filter @studypilot/api typecheck` clean; `pnpm --filter @studypilot/api test` → 18 suites / **202 passed**, 13 pre-existing DB-dependent skips, 1 pre-existing skipped suite; `pnpm --filter @studypilot/api lint` → 0 errors (1 pre-existing `no-console` warning in `main.ts`, out of scope).

## Acceptance criteria status

| AC | Status | Notes |
|---|---|---|
| 1 — owner-first order for login/refresh/logout; uniform unknown-credential failure; no client owner id; parameterized SQL | ✅ | `lockOwner` reused; all three ops lock before any credential write; uniform 401s; `SELECT ... FOR UPDATE` bound by Prisma |
| 2 — login verifies immutable hash snapshot pre-tx, re-reads under lock, requires hash unchanged, else generic 401 with no session; unknown email keeps dummy hash | ✅ | `authenticate` snapshot + locked `user.findUnique` re-check; hash-mismatch + missing-owner tests |
| 3 — refresh advisory owner discovery, lock before token write, fresh re-read + expiry, conditional claim/rotation/reuse, successor in-tx; lost/reuse commits revocation | ✅ | two-phase findUnique + `databaseNow`; commit-then-throw on invalid; fresh-clock test |
| 4 — sign JWTs under lock, return after commit; reset-first fails pre-reset refresh/login; no credential leak on signing/HTTP failure | ✅ | `jwtService.sign` inside the tx; payload is `{sub,email}` only — no password/hash/token; raw refresh token only returned on the ok path after commit |
| 5 — preserve ordinary status/body/cookie/rotation; logout idempotent, revokes current family only; other accounts isolated | ✅ | no controller/cookie change; messages & `AuthResult` unchanged; existing rotation/reuse/logout tests green |

## DoD checklist

| DoD | Status |
|---|---|
| 1 functional criteria | ✅ per the table above; integrated (real-browser/Postgres) verification is SP-105D's item 10 |
| 2 invalid input validation | ✅ generic 401s for unknown/wrong/changed credentials; refresh invalid-session 401 |
| 3 academic data scope | N/A — no academic data accessed; all writes confined to the discovered owner/family |
| 4 actionable errors | ✅ uniform session/credential messages; field-level n/a (no new inputs) |
| 5–7 UI states / keyboard / responsive | N/A — backend |
| 8 automated business-rule tests | ✅ 3 new stateful protocol tests + preserved race/reuse/logout suite; real-Postgres proof is SP-105I/H |
| 9 API / migration documentation | ✅ internal session semantics documented here; **no public API or schema change** (no migration) |
| 10 integrated development review | Obligation — performed by SP-105D |

## Open items and known dependency state

- **Real-Postgres race/expiry/rollback proof (SP-105H → I → D).** The owner-first order, fresh-clock expiry, both login/refresh-vs-reset orderings, and the token-before-owner deadlock exclusion are proven here at the *contract* level with stateful mocks. Deterministic multi-client proof on PostgreSQL is SP-105I's job; D executes it. Unit green ≠ real-DB proven.
- **SP-105F (per-IP limits) not applied** to these endpoints; E is deliberately endpoint-agnostic and will coexist with F's shared rolling-window admission.
- **Access-JWT window** remains SD7-bounded (~15 min). This protocol blocks *post-reset renewal* (locked hash-snapshot for login, locked owner+token re-read for refresh); it does not withdraw already-issued JWTs.
- **Drive-by lint fix (B-scope):** `password-reset.service.spec.ts` had a pre-existing `@typescript-eslint/no-unused-vars` error (an unused `where` destructure in the `user.findUnique` test double) that failed the package lint gate at HEAD. Removed the unused destructure (behavior-neutral). Noted so the B artifact/review can absorb it; no B behavior changed.
- **Upstream release gate:** SP-103 (STUDY-12) integrated DoD 1/7/10 remains CANNOT VERIFY — a release/sign-off gate for the epic, independent of this backend child (E touches SP-102's session code only). Recheck before release.
- Jira child key: **Pending creation** (child of STUDY-7); no tracker mutation performed.

## Files modified/created

| File | Type |
|---|---|
| `src/modules/auth/auth.service.ts` | Modified — `authenticate` + owner-first `login`/`refresh`/`logout`, `INVALID_CREDENTIALS_MESSAGE`, `RefreshOutcome.accessToken` |
| `src/modules/auth/auth.service.spec.ts` | Modified — `$queryRaw` mock, login re-read mock, +3 protocol tests (20→23) |
| `src/modules/auth/password-reset.service.spec.ts` | Modified — drive-by lint fix (removed unused `where` destructure) |
| `docs/artifacts/SP-105E/checkpoint.md` | Created |
| `docs/artifacts/SP-105E/implementation.md` | Created (this file) |
