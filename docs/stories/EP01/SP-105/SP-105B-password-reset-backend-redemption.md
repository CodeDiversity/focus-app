# SP-105B: Password Reset — Redemption & Session Revocation

**Story ID:** SP-105B
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Priority:** High / P0
**Layer:** Backend (NestJS + Prisma + PostgreSQL)
**Dependencies:** [SP-105A](./SP-105A-password-reset-backend-issuance.md) (`PasswordResetToken` model, SHA-256 hashing boundary, `ARGON2_OPTIONS`), SP-102 (`RefreshToken` model, rotation/reuse detection)
**Jira key:** Pending creation (child of STUDY-7)
**Refined:** 2026-10-14

## Summary

Build the **redemption** half of password reset: implement `POST /auth/reset-password`, which validates the token, claims it atomically, sets the new password with the registration policy, retires the account's other tokens, and revokes every refresh-token family — all in a single all-or-nothing transaction. This is the child that carries the concurrency guarantees (single-use, one-success) and the session-revocation mechanism.

## Description

As a student who has a valid reset link, I want to set a new password so that I regain access and my old sessions everywhere are invalidated.

## Acceptance Criteria

1. `POST /auth/reset-password` with a valid, unexpired, unused token updates `User.passwordHash` using the same argon2id policy and options as registration (`ARGON2_OPTIONS`). *(original SP-105 AC3)*
2. The presented token is claimed **atomically** with the predicate `usedAt IS NULL AND expiresAt > now()`; a zero-row claim (used, expired, unknown, or malformed) rolls back **all** dependent writes and rejects. *(original SP-105 AC2, redemption half)*
3. A successful reset **retires every other outstanding** reset token for that account and **revokes every** `RefreshToken` row for that account (all families), so no second token and no prior session can succeed afterward. *(original SP-105 AC4 + single-use invariant)*
4. Used, expired, unknown, or malformed tokens are rejected with one **actionable** message that offers to request a new one; the cases are **never distinguished**. *(original SP-105 AC5)*
5. Competing redemptions are serialized: two concurrent redemptions of the **same** token yield exactly one success, and two **different** valid tokens for one account yield exactly one success. *(original SP-105 AC2, concurrency guarantee)*

**DoD:** 1, 2, 4, 8, 9 apply. DoD 3 is N/A (public flow, no academic data; the token authorizes only its owner's change). DoD 5/6/7 are N/A (backend). DoD 10 is an obligation satisfied by the integrated review in [SP-105D](./SP-105D-password-reset-integration.md).

## Technical Notes

### API contract and DTOs

- Add public `POST /auth/reset-password` in `apps/api/src/modules/auth/auth.controller.ts` (already in `PUBLIC_ROUTES`; unguarded).
- New `apps/api/src/modules/auth/dto/reset-password.dto.ts`: `ResetPasswordDto { token, password, confirmPassword }`:
  - `token`: `@IsString({ message: INVALID_RESET_MESSAGE })` + `@Matches(/^[A-Za-z0-9_-]{43}$/, { message: INVALID_RESET_MESSAGE })` — mirrors `VerifyEmailDto`.
  - `password`: `@IsString` + `@MinLength(8, { message: 'Password must be at least 8 characters' })` — same as `RegisterDto`.
  - `confirmPassword`: `@IsString` + `@MinLength(8, { message: 'Passwords must match' })`; the service throws a `400` when `password !== confirmPassword`.
  - Global pipe `whitelist` + `forbidNonWhitelisted` rejects extra fields.
- Constants: `INVALID_RESET_MESSAGE = 'This reset link is invalid or has expired. Please request a new one.'`; `RESET_SUCCESS_MESSAGE = 'Password updated. Please sign in.'`.
- Responses follow the `AllExceptionsFilter` envelope. Success `200 { message: RESET_SUCCESS_MESSAGE }`; token failure `400 { message: INVALID_RESET_MESSAGE }`; validation failures `400` field errors.

### Persistence and concurrency (the core mechanism)

Add `resetPassword(dto)` to `apps/api/src/modules/auth/password-reset.service.ts` (same service as SP-105A). Compute the `argon2.hash(dto.password, ARGON2_OPTIONS)` digest **before** opening the transaction to keep the DB lock hold-time short, then run one all-or-nothing transaction:

```
1. claimed = UPDATE password_reset_tokens
             SET usedAt = now()
             WHERE tokenHash = sha256(dto.token)
               AND usedAt IS NULL AND expiresAt > now()
             RETURNING "userId";
   if claimed is empty → throw 400 INVALID_RESET_MESSAGE (rollback).
2. await SELECT 1 FROM "User" WHERE id = claimed."userId" FOR UPDATE;   // serialize per-account
3. UPDATE password_reset_tokens SET usedAt = now()
   WHERE "userId" = claimed."userId" AND usedAt IS NULL;               // retire all other tokens
4. UPDATE refresh_tokens SET revokedAt = now()
   WHERE "userId" = claimed."userId" AND revokedAt IS NULL;            // revoke every family
5. UPDATE "User" SET passwordHash = <argon2 digest> WHERE id = claimed."userId";
commit.
```

- **Isolation:** `READ COMMITTED` (default) plus the explicit `FOR UPDATE` lock on the user row. The lock is the serialization point: a blocked loser re-evaluates the step-1 `WHERE usedAt IS NULL` predicate after the lock is granted (Postgres EvalPlanQual) and sees the token already used. `Serializable` is a stricter alternative handled by Postgres via serialization-failure retries, but the row lock is the primary, lower-deadlock mechanism. All five writes are in one transaction — **all-or-nothing** (token consumption + session revocation + password change roll back together).
- **Why the read-then-write is safe:** the account-wide retirement (step 3) and the conditional claim (step 1) both run while holding the user-row lock, so two reset attempts for one account can never both observe an unused token. An *unconditional* password update followed by consuming only the presented token (the naive pattern) is **forbidden** — it is what lets a second distinct token succeed.

### Session revocation and the access-JWT window

- **Revoke =** set `revokedAt = now()` on **all** `RefreshToken` rows for the user. Every family is a chain of rows, so this invalidates all of them; any racing `POST /auth/refresh` with a pre-reset token hits SP-102 reuse detection and 401s (no new access token).
- **Bounded access-JWT window (SD7):** live access JWTs are stateless (15-minute TTL, SP-102) and are **not** invalidated by row revocation; they work until they expire. Reset blocks all *new* access tokens and refreshes immediately, but a captured access JWT is usable for at most ~15 minutes. A JWT denylist is explicitly out of scope (later hardening task).
- **Old-password login racing reset:** the `passwordHash` is replaced, so `argon2.verify(oldPassword, newHash)` fails → `401 Invalid email or password`; the new password verifies. (SP-102's `login` is unchanged.)
- **Ownership analog:** the reset token authorizes **only its owner's** password change and retires that owner's other credentials; it never touches academic data and never distinguishes a missing/foreign token (uniform `400`).

### Security — counterexamples (mechanism → falsifying test)

| Counterexample | Mechanism | Falsifying test (owner) |
|---|---|---|
| Two concurrent redemptions of the **same** token | atomic `UPDATE … WHERE usedAt IS NULL AND expiresAt>now() RETURNING userId`; loser re-checks after the lock → 0 rows → `400` | SP-105B unit (stateful mock); **SP-105D real-Postgres** — 2 parallel → exactly one `200`, one `400` |
| Two **different** valid tokens, one account | `SELECT … FOR UPDATE` on the user row serializes; account-wide retirement sets the loser's token `usedAt`; loser claim → 0 rows → `400` | SP-105B unit; **SP-105D real-Postgres** — 2 distinct tokens in parallel → exactly one `200` |
| `POST /auth/refresh` racing a reset | step-4 revokes all rows + SP-102 reuse detection → `401` | SP-105D |
| Old-password login racing a reset | step-5 replaces the hash → verify fails → `401` | SP-105B unit |
| Missing / malformed / 43-char token | DTO `@IsString` + `@Matches` → `400` generic | SP-105B DTO spec |
| Password validation | `@MinLength(8)` + confirmation equality in service | SP-105B DTO + service spec |

### Relevant files

- `apps/api/src/modules/auth/password-reset.service.ts` — add `resetPassword(dto)` (the transaction above); reuse `ARGON2_OPTIONS`.
- `apps/api/src/modules/auth/auth.service.ts` — export/reuse `ARGON2_OPTIONS` (currently module-private) if it is not already shared.
- `apps/api/src/modules/auth/dto/reset-password.dto.ts` (+ `.spec.ts`).
- `apps/api/src/modules/auth/auth.controller.ts` — public `POST /auth/reset-password`.
- Reuse: `RefreshToken` model, `argon2`.
- Tests: `password-reset.service.spec.ts`, `reset-password.dto.spec.ts`, `auth.controller.spec.ts`.

### Test cases

Backend — Jest, colocated. Concurrency uses **stateful** transaction mocks (SP-103 precedent) so a "losing" update returns zero rows rather than every update succeeding; the real-Postgres proof is SP-105D.

| AC | file / describe | Named cases |
|---|---|---|
| 1 | `password-reset.service.spec.ts` / `resetPassword` | `updates the password hash with argon2id when the token is valid`; `returns the generic success message` |
| 2, 5 | Same | `claims the token atomically and rejects a second redemption of the same token`; `rolls back the password and refresh writes when the claim returns zero rows` |
| 4 | Same | `rejects a used token with the generic message`; `rejects an expired token with the generic message`; `rejects an unknown token with the generic message` (never distinguished) |
| 3 | Same | `retires all other outstanding tokens for the account`; `revokes every refresh-token row for the account across families` |
| 5 | Same | `lets only one of two different valid tokens succeed`; `serializes concurrent redemptions via the user-row lock` |
| 1 | Same / `password policy` | `rejects a password shorter than 8 characters`; `rejects a password/confirmPassword mismatch`; `leaves an old-password login failing after reset` |
| — | `reset-password.dto.spec.ts` | `rejects a malformed token`; `rejects a short password`; `rejects non-whitelisted userId and familyId fields` |
| — | `auth.controller.spec.ts` | `exposes reset-password without a JWT guard`; `returns 200 on success and 400 on token failure` |

### Decisions (auto-approved 2026-10-14)

- **B1 (atomicity):** one all-or-nothing transaction — conditional claim, account-wide retirement, full refresh revocation, password update; user-row `FOR UPDATE` lock; `READ COMMITTED` isolation (rationale above).
- **B2 (uniform rejection):** every token failure (used/expired/unknown/invalid) is the same generic `400` — no token-state oracle.
- **B3 (revocation scope):** revoke = `revokedAt` on **all** the user's `RefreshToken` rows; accept the bounded ~15-min access-JWT window (SD7); no denylist.
- **B4 (hash policy):** argon2id `ARGON2_OPTIONS` (reused from registration) — the "same policy as registration" criterion.

### Out of scope

- The frontend ([SP-105C](./SP-105C-password-reset-frontend-ui.md)) and integration ([SP-105D](./SP-105D-password-reset-integration.md)).
- JWT access-token denylist, per-IP rate limiting, "force logout everywhere" UI, and refresh-token pruning (SP-102 later cleanup).
