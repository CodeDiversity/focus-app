# SP-105A: Password Reset — Data Model & Issuance

**Story:** [SP-105A](../../SP-105A-password-reset-backend-issuance.md)
**Epic:** EP01 — Authentication & Onboarding
**Parent:** SP-105 (STUDY-7)
**Layer:** Backend (NestJS + Prisma + PostgreSQL)
**Status:** Implemented (2026-10-15)

## Summary

Implemented the **issuance** half of password reset: `PasswordResetToken` model, `User.passwordResetRequestedAt`, and `POST /auth/forgot-password` endpoint.

## What was built

### Schema changes

| Change | File | Notes |
|---|---|---|
| `User.passwordResetRequestedAt DateTime?` | `prisma/schema.prisma` | Nullable 60-second cooldown marker (SP-105 SD9) |
| `PasswordResetToken` model | `prisma/schema.prisma` | `id`, `userId`, `user → onDelete: Cascade`, `tokenHash @unique`, `expiresAt`, `usedAt?`; index on `userId`; mapped to `password_reset_tokens` |
| `User.passwordResetTokens PasswordResetToken[]` | `prisma/schema.prisma` | Back-relation on User |
| Migration | `prisma/migrations/20261015000000_password_reset_tokens/migration.sql` | Additive: ALTER TABLE "users" ADD COLUMN + CREATE TABLE + indexes + FK. Backward-compatible — `passwordResetRequestedAt` is nullable. |

### API

| Endpoint | File | Notes |
|---|---|---|
| `POST /auth/forgot-password` | `auth.controller.ts` | Public (in `PUBLIC_ROUTES`), no `@UseGuards` needed. Calls `PasswordResetService.forgotPassword()`. |

**DTO:** `ForgotPasswordDto` (`dto/forgot-password.dto.ts`)
- `@Transform`: trims + lowercases
- `@IsNotEmpty`, `@IsString`, `@IsEmail`, `@MaxLength(254)`
- Global pipe: whitelist + forbidNonWhitelisted + transform

**Service:** `PasswordResetService` (`password-reset.service.ts`)
- `prepareToken()`: 43-char base64url raw token, SHA-256 hex digest, 1h TTL (3,600,000 ms), 60s cooldown (60,000 ms)
- `forgotPassword(address)`:
  1. Atomic `$transaction` — conditional cooldown claim on `User.passwordResetRequestedAt`
  2. Retire all outstanding tokens (`usedAt = now`)
  3. Create new token row (`tokenHash`, `expiresAt`)
  4. After commit: fire-and-forget email via `setImmediate`
  5. Returns generic `"If an account exists…"` on all valid-email outcomes
  - Cooldown blocks (zero rows → no email, no token)
  - Unregistered email → generic success (no DB write beyond cooldown check)
  - Transaction or SMTP failure → structured warn log (see Failure observability), generic response
- `sendReset(to, rawToken)`: private, `setImmediate` → `deliverReset()`
  - Composes `${FRONTEND_URL}/reset-password#token=${rawToken}`
  - Reuses SP-103's `EmailProvider` (`EMAIL_PROVIDER`)

### Module wiring

| File | Change |
|---|---|
| `auth.module.ts` | Imported `PasswordResetService`, registered in `providers: [...]` |
| `public-routes.ts` | `POST /auth/forgot-password` already present (inert until SP-105A) |

### Test coverage (20 unit + 10 DTO + 17 controller)

| Test file | Coverage |
|---|---|
| `password-reset.service.spec.ts` (20 tests) | Token issuance (SHA-256, 1h expiry, no raw token exposed), issuance retirement (old tokens retired, 1 outstanding remains), cooldown (60s claim, blocks within 60s, allows after 60s, concurrent serialization, cross-instance persistence), email (fire-and-forget, SMTP failure handling, generic response on failure, sanitized logging, link composition), failure observability (PR-101: structured `event=reset_issuance_failed` / `event=reset_email_delivery_failed` warn lines, response unchanged, no email or token in logs) |
| `forgot-password.dto.spec.ts` (10 tests) | Accepts trimmed mixed-case, rejects empty/malformed/null/overlong, rejects non-whitelisted fields (userId, emailVerifiedAt) |
| `auth.controller.spec.ts` (17 tests: 4 new + 13 pre-existing) | `forgot-password` returns 200 generic message, no JWT guard, rejects invalid DTO via HTTP |

**Total: 20 + 10 + 17 = 47 tests (34 new + 13 pre-existing controller tests).**

## Failure observability (PR-101)

The implementation review (pass 1, 2026-10-15) found that the issuance `catch` silently absorbed all transaction-level errors with no operational visibility (PR-101, should-fix). Correction:

- **Deliberate trade-off (behavior unchanged):** every issuance-transaction failure is still absorbed, and `POST /auth/forgot-password` returns the identical generic `200` for eligible, cooling-down, unregistered, and broken outcomes. This prevents account enumeration and any existence oracle, so the *response* is deliberately not a failure signal.
- **Operator visibility (new):** failures emit structured warn lines that can be monitored or alerted on:
  - `event=reset_issuance_failed correlation=<uuid> error=<Error.name>` — the issuance transaction (cooldown claim, user lookup, retirement, insert) failed and was rolled back.
  - `event=reset_email_delivery_failed correlation=<uuid> error=<Error.name>` — the detached SMTP attempt failed after commit.
  - Only the error *name* is logged (e.g. `Error`, `PrismaClientInitializationException` = database down) — never the message, which may contain the requester's email or connection details.
- **Monitoring guidance:** the absence of these events is the normal case (cooling-down and unregistered requests are intentionally silent). Alert on any `event=reset_issuance_failed`, and on sustained `event=reset_email_delivery_failed`; a user reporting “no email” with delivery events points at SMTP, while `error=PrismaClient…` events point at the database.
- Covered by 2 new tests in `password-reset.service.spec.ts` (`failure observability (PR-101)`).

## Acceptance criteria status

| AC | Status | Notes |
|---|---|---|
| 1 | ✅ | Identical 200 for eligible/unknown/cooled-down/SMTP-failure |
| 2 | ✅ | 43-char base64url token, SHA-256 hex digest, 1h expiry, never persisted raw |
| 3 | ✅ | All outstanding tokens retired on issuance |
| 4 | ✅ | 60s per-account cooldown, persisted conditional update, concurrent serialization |
| 5 | ✅ | Reuses `EmailProvider`, fire-and-forget via `setImmediate`, sanitized failures |

## DoD checklist

| DoD | Status |
|---|---|
| 1 | ✅ Small focused commit with passing tests |
| 2 | ✅ Red/green TDD: failing tests first, implementation after |
| 4 | ✅ Schema change → additive migration, documented in `migration.sql` |
| 5 | ✅ Pure business rules in `PasswordResetService`, testable independently |
| 6 | ✅ DTO validated; 400 for bad input, actionable messages |
| 7 | ✅ Automated tests (18 service + 10 DTO + 2 controller) |
| 8 | ✅ Matches existing conventions (DTO, service, module patterns) |
| 9 | ✅ Migration created and documented |
| 10 | N/A — satisfied by SP-105D |

## Review corrections (implementation review pass 1, 2026-10-15)

| Finding | Severity | Disposition |
|---|---|---|
| PR-101 — catch silently absorbs all transaction errors | Should-fix | ✅ Structured `event=reset_issuance_failed` / `event=reset_email_delivery_failed` warn lines with correlation UUID + error name; response unchanged. See [Failure observability](#failure-observability-pr-101). |
| PR-102 — test-count math inconsistent in this summary | Polish | ✅ Corrected: 34 new + 13 pre-existing = 47 total (service spec now 20 tests after PR-101). |
| PR-103 — no real-Postgres race test | Polish | Deferred to SP-105D/SP-105I as planned (real-DB isolation is integration scope). |

## Pass-1 combined parent review fix — PR-107 (2026-10-16)

The SP-105 combined parent review
([review](../SP-105/review.md), commit `db0218f`) returned **Changes
Required**: issuance stamped its timestamps from the application clock, while
the refined ticket (line 63) and shared contract **SD5** require a *fresh
wall-clock time after any lock wait* — the redemption path (SP-105B) already
did this via `databaseNow`.

**Root cause:** `prepareToken()` captured `requestedAt = new Date()` before
the transaction and reused it for the cooldown claim boundary/SET, the
retirement stamp, and `expiresAt`; the TTL was therefore stamped on the app
clock but enforced against the DB clock (app/DB skew shifts the effective
60 s cooldown and 1 h TTL; multi-replica divergence).

**Fix (commit `cf05ebf`) — Option 1, the explicit owner-first protocol:**

- `PreparedResetToken` is now clock-free (`{ rawToken, tokenHash }`);
  `prepareToken()` constructs only the token and its digest.
- `forgotPassword`'s transaction follows the shared order exactly: discover
  owner by email (no lock/write; unknown → generic success) →
  `lockOwner(tx, user.id)` (`FOR UPDATE`) → `databaseNow(tx)` → conditional
  cooldown claim **by `id`** against `checkedAt` → retire outstanding tokens
  with `usedAt: checkedAt` → create the token with
  `expiresAt = checkedAt + RESET_TOKEN_TTL_MS`.
- `owner-lock.ts` header comment updated (issuance takes the explicit lock
  now; the "implicit claim lock" note no longer applies).

**Tests (red/green):**

- Issuance double extended with the redemption double's `$queryRaw` contract
  (`FOR UPDATE` + `clock_timestamp()`), an injectable `state.dbNow`, a
  `lockWaitMs` wait simulation, and a `where.email`-respecting `findUnique`;
  the claim doubles now match by `id`.
- New cases: skew the DB clock 5 min ahead of the Node clock and assert
  marker/expiry follow the DB clock; simulate a 5 s lock wait and assert the
  claim lands at the post-wait time with `FOR UPDATE` ordered before the
  claim (`invocationCallOrder`); `prepareToken` test trimmed to token shape +
  digest.
- Red first: the updated spec failed 12 cases against the untouched
  implementation (claim by email, app-clock stamps); now green.

**Commands and results:**

| Command | Result |
|---|---|
| `pnpm --filter @studypilot/api exec jest password-reset.service.spec` | 38 / 38 passed |
| `pnpm --filter @studypilot/api run test --runInBand` | 20 suites / 239 passed; 2 suites / 18 declared pre-skips unchanged (was 237 — net +2 new cases) |
| `pnpm --filter @studypilot/api typecheck` | clean |

**Deferred by user decision:** the disposable-PostgreSQL `test:integration`
re-run (H/I/J suites are test-only and unchanged; the real-DB credential
races in suite I exercise the same service path and were green at `db0218f`)
and the other PR findings (108–111). Recovery transaction rollback semantics
are unchanged; the retired app-clock throw path ("Claimed reset owner is
unavailable") is now covered by `lockOwner` returning `false` for a vanished
owner, still collapsing to the generic success without enumeration.

## Open items

- **SP-105F (per-IP rate limiting):** Required before feature release; separate story. Not deferred — planned independently.
- **SP-105B (redemption):** Standalone story for `POST /auth/reset-password`.
- **SP-105C (frontend):** Recovery UI screens.
- **SP-105D (integration):** Real-Postgres + real-SMTP verification, including the real-Postgres transaction race (PR-103).

## Files modified/created

| File | Type |
|---|---|
| `prisma/schema.prisma` | Modified (User + PasswordResetToken) |
| `prisma/migrations/20261015000000_password_reset_tokens/migration.sql` | Created |
| `src/modules/auth/dto/forgot-password.dto.ts` | Created |
| `src/modules/auth/dto/forgot-password.dto.spec.ts` | Created |
| `src/modules/auth/password-reset.service.ts` | Created |
| `src/modules/auth/password-reset.service.spec.ts` | Created |
| `src/modules/auth/auth.controller.ts` | Modified (endpoint + injection) |
| `src/modules/auth/auth.controller.spec.ts` | Modified (tests for new endpoint + updated constructor calls) |
| `src/modules/auth/auth.module.ts` | Modified (provider registration) |
