# SP-105B: Password Reset — Redemption & Session Revocation

**Story:** [SP-105B](../../stories/EP01/SP-105/SP-105B-password-reset-backend-redemption.md)
**Epic:** EP01 — Authentication & Onboarding
**Parent:** SP-105 (STUDY-7)
**Layer:** Backend (NestJS + Prisma + PostgreSQL)
**Status:** Implemented (2026-10-15)

## Summary

Implemented the **redemption** half of password reset: `POST /auth/reset-password` redeems a reset token, updates the password, retires every other outstanding reset token, and revokes every refresh family for the owner **in one transaction**, then expires the HttpOnly `refresh_token` cookie on the response. Uses the SP-105 owner-first locking protocol (discover owner → lock `users.id FOR UPDATE` → fresh post-lock wall clock → conditional claim), shared with SP-105A issuance; SP-105E applies the same order to login/refresh/logout.

## What was built

### API

| Endpoint | File | Notes |
|---|---|---|
| `POST /auth/reset-password` | `auth.controller.ts` | Public (already reserved in `PUBLIC_ROUTES`), no `@UseGuards`. Explicit `200` on success via `@HttpCode`. |

**Request:** `ResetPasswordDto` (`dto/reset-password.dto.ts`): `{ token, password, confirmPassword }`
- `token`: trimmed; must be a 43-character base64url string. Missing/empty/malformed all carry the **uniform** `INVALID_RESET_MESSAGE` — a malformed link must read exactly like an unknown/used/expired one.
- `password`: registration policy (`@MinLength(8)`, same message as `RegisterDto`).
- `confirmPassword`: cross-field equality via an inline `ValidateBy` `matchesField('password')` — class-validator 0.14 removed the old `@MatchesProperty` helper. Mismatch is a **field error**, never an invalid-token error.
- Global pipe: `whitelist` + `forbidNonWhitelisted` rejects extra owner/family identifiers before the service runs.
- Message constants `RESET_SUCCESS_MESSAGE` / `INVALID_RESET_MESSAGE` live in `password-reset.service.ts` (single source; the DTO imports them).

**Response**
- Success: `200 { message: 'Password updated. Please sign in.' }` **plus** an expiry `Set-Cookie` for `refresh_token` using the existing `clearRefreshCookie(res)` attributes (`HttpOnly`, `Path=/auth`, `SameSite=Lax`, production `Secure`, `Max-Age=0`). The cookie is expired **only after commit** — a rejected or rolled-back redemption throws before it and emits no cleanup header. Frontend JavaScript never clears this HttpOnly cookie (SP-105C/G handle local state).
- Token failures (malformed/unknown/used/expired/missing owner): uniform `400 { message: INVALID_RESET_MESSAGE }` through the global error envelope — no owner or token-state distinctions, no existence oracle.
- Field failures: `400` with field messages; never imply anything about the token.

### Service: `PasswordResetService.resetPassword(dto)`

Hash order per the story: validate token shape → **hash the proposed password before opening the transaction** (argon2 with the registration `ARGON2_OPTIONS`, now exported from `auth.service.ts`) → one `Prisma.$transaction`:

1. Advisory discovery: `passwordResetToken.findUnique({ where: { tokenHash } })` — no lock, no write. Missing → uniform 400.
2. **Owner-first lock**: `SELECT id FROM "users" WHERE id = $1 FOR UPDATE` (new `owner-lock.ts: lockOwner`) **before any token write**. Missing owner → same uniform 400.
3. **Fresh post-lock time**: `SELECT clock_timestamp()` (`owner-lock.ts: databaseNow`) — not transaction-start `now()`, so a token whose expiry lands *while waiting for the lock* cannot be claimed.
4. **Conditional claim**: `updateMany` on `id + userId + usedAt: null + expiresAt > checkedAt` → `usedAt: checkedAt`; count ≠ 1 → uniform 400, everything rolls back.
5. **Retire** the remaining unused reset rows for the owner; **revoke** every unrevoked `refresh_tokens` row for the owner (all families).
6. **Update** the locked owner's password hash. The issuance cooldown marker (`passwordResetRequestedAt`) is deliberately untouched — reset never grants an extra email attempt.

Concurrency: two redemptions for one owner — same or distinct tokens — serialize on the owner lock; the loser's conditional claim fails after the winner commits and rolls back, so exactly one succeeds. This redemption never holds a token row lock while waiting for the owner lock, which rules out the token-before-owner deadlock. SP-105A's issuance serializes against the same `users` row via its cooldown claim (a row update takes a row lock in PostgreSQL). Credential rows of other accounts are only ever addressed through `userId` scopes; no academic data is read or written.

### New shared helper: `apps/api/src/modules/auth/owner-lock.ts`

`lockOwner(tx, userId)` and `databaseNow(tx)` — the owner-first protocol step with documentation for all SP-105 consumers. Typed against the generated Prisma client's `$queryRaw`; raw SQL uses Prisma's bound parameters (never interpolation) and the real mapped table name `users`. SP-105E is expected to reuse it for login/refresh/logout.

### Module wiring

| File | Change |
|---|---|
| `password-reset.service.ts` | `resetPassword()` added; contract constants exported; no issuance changes (SP-105A untouched) |
| `owner-lock.ts` | Created (shared protocol helper) |
| `auth.service.ts` | `ARGON2_OPTIONS` exported (login/register unchanged) |
| `dto/reset-password.dto.ts` / `.spec.ts` | Created |
| `auth.controller.ts` | `reset-password` endpoint + post-commit `clearRefreshCookie` |
| `public-routes.ts` | Stale "inert until routes land" comment refreshed — both SP-105 routes have landed |
| `auth.module.ts` | No change (`PasswordResetService` already provided by SP-105A) |

### Schema

No schema change: `PasswordResetToken` and `User.passwordResetRequestedAt` exist from SP-105A's migration; redemption reuses them. **No new migration** (DoD 9 — API documented here; nothing to migrate).

### Test coverage (45 new tests; full API suite green)

| Test file | New coverage |
|---|---|
| `reset-password.dto.spec.ts` (20) | Trimming; uniform invalid-link wording for missing/empty/blank/42/44-char/standard-base64/null/non-string tokens; 8-char boundary; field errors (short password, mismatched/null confirmation) never containing the invalid-link wording; non-whitelisted `userId`/`familyId`/`tokenHash`/`email` rejected |
| `password-reset.service.spec.ts` (16) | Stateful double with the serialized rollback-capable transaction contract, a `$queryRaw` double for the lock (with simulated lock wait) and post-lock clock: argon2id registration options; success message; post-lock `usedAt`; owner-token retirement (used/foreign untouched); all-family refresh revocation (already-revoked/foreign untouched); cooldown marker preserved (no `passwordResetRequestedAt` in the update); uniform 400 for unknown/malformed/missing-owner/used/expired with zero writes; **post-lock expiry** (token expiring during the 5s simulated wait is not claimed; claim compared against now+5s); same-token race (1 success + 1 uniform 400); distinct-token race (winner commits, loser rolls back, foreign account untouched); rollback of claim/retirement/revocation on password-persistence failure; raw token/password never logged |
| `auth.controller.spec.ts` (9) | Unit: expiry cookie emitted only after commit, with `httpOnly`/`path: /auth`/`sameSite: lax`/`maxAge: 0`; no cookie on failure. HTTP wiring (real global pipe + `AllExceptionsFilter`): public access, explicit 200, real `Set-Cookie` with `refresh_token=; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=0`; uniform 400 envelope + no `Set-Cookie` on token failure; token-shape failures carry only the invalid-link wording; password/confirmation/whitelist failures stay field errors without `Set-Cookie` and without service execution |

## Acceptance criteria status

| AC | Status | Notes |
|---|---|---|
| 1 — valid token updates password (registration argon2id + min-8, confirmation validated pre-mutation) | ✅ | `ARGON2_OPTIONS` reused from registration; confirmation enforced by the DTO before the service |
| 2 — owner locked before any token write; fresh post-lock time; conditional claim; zero rows → uniform 400 + rollback | ✅ | `lockOwner` + `databaseNow` + `usedAt IS NULL AND expiresAt > checkedAt` claim |
| 3 — retire other unused tokens, revoke **all** refresh rows by `userId`, update password; other owners untouched | ✅ | All `updateMany`s scoped to the claimed token's stored `userId`; foreign rows asserted untouched |
| 4 — missing/malformed/unknown/used/expired → same `INVALID_RESET_MESSAGE`; password errors stay field errors | ✅ | DTO + service both emit the constant; field messages never mention the link |
| 5 — same/distinct-token races yield one success + one uniform 400, no token-before-owner deadlock | ✅ at unit level | Serialized owner-first protocol proven in stateful tests; **real-Postgres proof belongs to SP-105D/I** (planned, not executed) |
| 6 — post-commit expiry of `refresh_token` via `clearRefreshCookie`, existing attributes; none on rollback | ✅ | Controller emits only after the service resolves; verified at unit and real-HTTP level |

## DoD checklist

| DoD | Status |
|---|---|
| 1 functional criteria | ✅ per the table above; integrated verification is SP-105D's item 10 |
| 2 invalid input validation | ✅ DTO (token shape, password policy, confirmation, whitelist) + service-level shape re-check |
| 3 academic data scope | N/A — no academic data accessed; credential mutations confined to the stored owner |
| 4 actionable errors | ✅ uniform token 400; field 400s; 503/429 handling is SP-105F's scope |
| 5–7 UI states/keyboard/responsive | N/A — backend |
| 8 automated business-rule tests | ✅ 45 new tests, all green |
| 9 API/migration documentation | ✅ this artifact; no migration (schema unchanged) |
| 10 integrated development review | Obligation — performed by SP-105D |

## Open items and known dependency state

- **SP-105E (login/refresh/logout coordination) is not yet implemented.** `AuthService.login` still verifies the old password snapshot outside the owner lock and `refresh` claims before locking the owner. Until E lands, a login/refresh that was *in flight before* a reset can still commit a new refresh family after it; that family is then dead on its next use, but the old-password-login race window remains. This is the story's declared dependency and was intentionally not widened into this ticket ("SP-105B only"). `owner-lock.ts` is in place for E to apply the protocol.
- **SP-105F (per-IP limits) not yet applied** to this endpoint; the endpoint currently relies on 256-bit single-use 1-hour token entropy (correct by design) and will gain the approved 30/minute admission limit when F lands.
- Real-Postgres race/expiry/rollback proofs: SP-105H (harness) → SP-105I (credential race suite) → SP-105D (execution + browser/SMTP sign-off).
- Jira child key: **Pending creation** (child of STUDY-7); no tracker mutation performed.
- SP-103 integrated-review evidence remains unverified upstream — recheck before release sign-off.

## Files modified/created

| File | Type |
|---|---|
| `src/modules/auth/dto/reset-password.dto.ts` | Created |
| `src/modules/auth/dto/reset-password.dto.spec.ts` | Created |
| `src/modules/auth/owner-lock.ts` | Created |
| `src/modules/auth/password-reset.service.ts` | Modified (`resetPassword`, constants) |
| `src/modules/auth/password-reset.service.spec.ts` | Modified (16 redemption tests + transaction double) |
| `src/modules/auth/auth.controller.ts` | Modified (`reset-password` endpoint, cookie expiry) |
| `src/modules/auth/auth.controller.spec.ts` | Modified (9 tests) |
| `src/modules/auth/auth.service.ts` | Modified (`ARGON2_OPTIONS` exported) |
| `src/modules/auth/public-routes.ts` | Modified (comment only) |
