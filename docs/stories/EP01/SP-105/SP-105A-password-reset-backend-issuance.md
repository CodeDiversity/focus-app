# SP-105A: Password Reset — Data Model & Issuance

**Story ID:** SP-105A
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Priority:** High / P0
**Layer:** Backend (NestJS + Prisma + PostgreSQL)
**Dependencies:** SP-102 (`User`, argon2, `RefreshToken`), SP-103 (`EmailProvider`/`EMAIL_PROVIDER`, Mailpit, cooldown pattern) — both implemented
**Jira key:** Pending creation (child of STUDY-7)
**Refined:** 2026-10-14
**Status:** Draft — corrected; awaiting independent re-review

## Summary

Build the **issuance** half of password reset: add the `PasswordResetToken` model and `User.passwordResetRequestedAt`, and implement `POST /auth/forgot-password`. The endpoint issues a 1-hour, single-use, SHA-256-hashed reset token, enforces a persisted 60-second per-account cooldown, and returns an identical generic `200` whether or not the email is registered, sending the email asynchronously.

## Description

As a student who has forgotten their password, I want to enter my email address so that I receive a reset link I can use to set a new password.

## Acceptance Criteria

1. `POST /auth/forgot-password` returns the **same** `200` status and **same** body for a known+eligible account, a known+cooled-down account, an unregistered email, and an SMTP failure; empty or malformed email returns a `400` with an actionable field message. SP-105F applies an account-independent per-IP 429 before issuance; all non-IP-limited valid-email outcomes remain identical. *(original SP-105 AC1)*
2. Issuing a reset generates a **single-use** token whose **SHA-256 digest** is stored and which **expires 1 hour** after issuance; the raw token is never persisted, logged, or returned in a response. *(original SP-105 AC2, issuance half)*
3. A new issuance **retires every other outstanding** reset token for that account, so at most one token is redeemable after each request. *(original SP-105 AC2, single-use invariant)*
4. At most one **issuance per account per 60 seconds** is enforced by a persisted cooldown, claimed atomically, across concurrent requests and service restarts; a throttled request still returns the generic success and sends **no** email and creates **no** token. *(original SP-105 AC7, per-account half — per-IP owned by SP-105F, README SD8)*
5. Email delivery reuses SP-103's `EmailProvider`, runs **off the public response path** with a bounded timeout, and a delivery failure is sanitized and never changes the response. *(reuses SP-103 AC9)*

**DoD:** 1, 2, 4, 8, 9 apply. DoD 3 is N/A (public flow, no academic data); DoD 5/6/7 are N/A (backend); DoD 10 is an obligation satisfied by the integrated review in [SP-105D](./SP-105D-password-reset-integration.md).

## Technical Notes

### API contract and DTOs

- Add public `POST /auth/forgot-password` in `apps/api/src/modules/auth/auth.controller.ts`. It is already in `PUBLIC_ROUTES`, so the global `JwtAuthGuard` treats it as public — no `@UseGuards`.
- New `apps/api/src/modules/auth/dto/forgot-password.dto.ts`: `ForgotPasswordDto { email: string }` with `@Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)`, `@IsString({ message: 'Please enter a valid email address' })`, `@IsEmail({}, { message: 'Please enter a valid email address' })`, `@MaxLength(254)`, `@IsNotEmpty` — mirrors `resend-verification.dto.ts`. The global pipe (`whitelist`, `forbidNonWhitelisted`, transform) rejects extra fields such as `userId`.
- Module constant for the single generic success message: `"If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another."` Reused for every valid-email outcome.

### Persistence and concurrency

- Add `PasswordResetToken` to `apps/api/prisma/schema.prisma`, mirroring `EmailVerificationToken`:
  ```
  model PasswordResetToken {
    id        String    @id @default(uuid())
    userId    String
    user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    tokenHash String    @unique
    expiresAt DateTime
    usedAt    DateTime?

    @@index([userId])
    @@map("password_reset_tokens")
  }
  ```
  Add `passwordResetTokens PasswordResetToken[]` on `User`.
- Add nullable `User.passwordResetRequestedAt DateTime?` next to the existing `emailVerificationRequestedAt`.
- New **additive** migration under `apps/api/prisma/migrations/<generated_timestamp>_password_reset_tokens/migration.sql`; regenerate the client (generator outputs to `../src/generated/prisma`). Never hand-edit existing applied migrations; derive the current inventory at implementation time.
- **Token:** `rawToken = crypto.randomBytes(32).toString('base64url')`; `tokenHash = createHash('sha256').update(rawToken).digest('hex')`; `expiresAt = now + RESET_TOKEN_TTL_MS` where `RESET_TOKEN_TTL_MS = 3_600_000` (1 hour, AC2). The raw token exists only to compose the email link.
- **Issuance transaction** (single Prisma `$transaction`, mirroring SP-103 `resendVerification`):
  1. Discover the normalized-email owner without credential writes; unknown email returns generic success (there is no User marker for an unknown account). Acquire the `users` row `FOR UPDATE` before reset-token writes, using the same owner-first order as B/E. Obtain fresh wall-clock time after any lock wait. Atomically claim the account's cooldown with a **conditional** update on `passwordResetRequestedAt` — `SET passwordResetRequestedAt = checkedAt WHERE id = $user AND (passwordResetRequestedAt IS NULL OR passwordResetRequestedAt <= checkedAt - interval '60 s')`. **Zero rows** (still cooling down) → generic success, **no email, no new token**.
  2. Retire the account's outstanding tokens: `UPDATE … SET usedAt = now() WHERE userId = $user AND usedAt IS NULL`.
  3. Create the new token row. Commit.
  4. **After commit**, `sendReset(to, rawToken)` async.
- **Concurrency:** two concurrent `forgot-password` for the same account serialize on the `User` row; the conditional cooldown claim lets exactly one issue. A read-then-write cooldown (process-local map) is **forbidden** — the persisted conditional update is the mechanism. Falsified by a real-Postgres race in SP-105D; unit-tested with stateful transaction mocks (SP-103 precedent).
- **Scope boundary with SP-105B:** this story guarantees "after each *request*, at most one token is live" (step 2). SP-105B additionally guarantees "at most one token can ever be *redeemed*" (retires the others **at redemption time**, because a user may never re-request). These guarantees apply to outstanding tokens in the current reset cycle, not every future reset of the account. If issuance wins the owner lock it retires the old token before B can redeem it; if B commits first, later eligible issuance starts a new cycle. D tests both orderings. A/B/E must always acquire the owner lock before token writes.

### Email provider

- Reuse SP-103's `EmailModule` / `EmailProvider` (`EMAIL_PROVIDER` injection token, `{ to, subject, text }`). Import `EmailModule` into `AuthModule`.
- New `apps/api/src/modules/auth/password-reset.service.ts` with `forgotPassword(email)` and a private `sendReset(to, rawToken)` (fire-and-forget via `setImmediate` → `deliver()`), composing `${FRONTEND_URL}/reset-password#token=${rawToken}` — the **same decoupling** SP-103 asked for: transport reused, no dependency on verification logic.
- Bounded SMTP timeout; catch and **sanitize** failures (never log the raw token, link, recipient, or SMTP credentials). Mirrors SP-103 `sendVerification`. Local Mailpit (SP-103) is reused; no new service/config.

### Security

- **Public response contract:** identical status/body across eligible / cooled-down / unknown / SMTP-failure cases when F's account-independent IP limit permits the request. SMTP work is off the response path. Do not promise identical wall-clock timing: eligible accounts perform database writes while unknown/cooled-down paths may not. A/D must verify an unresolved SMTP promise cannot delay the HTTP response and measure known/unknown/cooled-down timings under controlled load. Document any distinguishable database-path timing and review mitigation before security sign-off; a guessed fixed delay is not proof. No account-cooldown header or recipient-specific message. F's 429 depends only on IP+endpoint and applies equally to known and unknown emails.
- Never return or log the raw token or the owner's email/ID.
- The endpoint is public; the token is the sole credential and is single-use + hashed + 1h.
- Secrets by **name only** (SMTP_* via SP-103 config); no new secret values.

### Relevant files

- `apps/api/prisma/schema.prisma` — `PasswordResetToken` model + `User.passwordResetRequestedAt`.
- `apps/api/prisma/migrations/<generated_timestamp>_password_reset_tokens/migration.sql` — additive.
- `apps/api/src/modules/auth/password-reset.service.ts` (+ `.spec.ts`) — issuance, cooldown, token lifecycle, async email.
- `apps/api/src/modules/auth/dto/forgot-password.dto.ts` (+ `.spec.ts`).
- `apps/api/src/modules/auth/auth.controller.ts` — public `POST /auth/forgot-password`.
- `apps/api/src/modules/auth/auth.module.ts` — register `PasswordResetService` (SP-105B's redemption lands in the same module).
- Reuse: `apps/api/src/modules/email/email-provider.ts`, `smtp-email.provider.ts`, `email.module.ts`.

### Test cases

Backend — Jest, colocated `*.spec.ts`. Stateful transaction mocks for the cooldown/retirement (SP-103 precedent); the real-Postgres predicate is proven in SP-105D.

| AC | file / describe | Named cases |
|---|---|---|
| 1 | `password-reset.service.spec.ts` / `forgotPassword` | `returns identical success for eligible unknown and smtp-failure`; `returns identical success for a cooled-down account`; `returns a 400 field error for an empty or malformed email` |
| 2 | Same / `token issuance` | `stores only the sha256 digest, never the raw token`; `expires one hour after issuance`; `never returns the raw token in the response` |
| 3 | Same / `issuance retirement` | `retires all outstanding tokens for the account on a new issuance`; `leaves a single redeemable token after a request` |
| 4 | Same / `cooldown` | `claims the 60s cooldown atomically`; `blocks a second issuance within 60s with generic success and no email`; `allows issuance after 60s`; `lets only one concurrent request claim the account`; `preserves the cooldown across service instances` |
| 5 | Same / `email` | `returns without awaiting an unresolved SMTP delivery promise`; `handles delivery rejection without an unhandled promise`; `keeps generic success when delivery fails`; `sanitizes delivery failures (no token, recipient, or credentials)` |
| — | `forgot-password.dto.spec.ts` | `rejects a non-whitelisted userId field`; `accepts a trimmed mixed-case email`; `rejects an overlong email` |
| — | `auth.controller.spec.ts` | `exposes forgot-password without a JWT guard`; `returns 200 with the generic message` |

- DoD 9: record the migration and apply/backward-compatible-null evidence in `docs/artifacts/<key>/implementation.md` when built.

### Mechanisms and recorded decisions (2026-10-14)

- **A1 (TTL):** 1-hour token expiry per original AC2 — distinct from verification's 24h.
- **A2 (hash):** SHA-256 digest at rest (not bcrypt — bcrypt truncates at 72 bytes and targets passwords, not 256-bit tokens); matches SP-103/SP-102.
- **A3 (cooldown):** 60s per-account cooldown on `User.passwordResetRequestedAt`, claimed via a persisted conditional update (SP-103 precedent).
- **A4 (delivery):** async email off the response path; no account-cooldown header; F may return IP-only 429.
- Per-IP rate limiting is owned by [SP-105F](./SP-105F-password-reset-ip-limits.md); it is required before feature release. User approved this separate story and its initial limits on 2026-10-14.

### Out of scope

- The redemption endpoint `POST /auth/reset-password` ([SP-105B](./SP-105B-password-reset-backend-redemption.md)).
- The frontend ([SP-105C](./SP-105C-password-reset-frontend-ui.md)) and integration ([SP-105D](./SP-105D-password-reset-integration.md)).
- Per-IP rate limiting (owned by F, not deferred), JWT denylist, durable email queues/retries.
