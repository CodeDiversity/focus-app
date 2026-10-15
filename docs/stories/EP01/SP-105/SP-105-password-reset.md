# SP-105: Password Reset

**Story ID:** SP-105 (parent / coordination record)
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** High / P0
**Dependencies:** SP-102 (sessions), SP-103 (email provider) — both implemented
**Jira key:** STUDY-7 (this parent coordination issue)
**Refined:** 2026-10-14 — split into independently testable children

## What this file is

SP-105 is a **coordination record, not an implementation ticket.** The original SP-105 was a single combined backend+frontend story; it has been split so the backend and frontend work can be implemented and reviewed separately. This file defines the shared API contract the children must agree on and links each child. The per-requirement ownership map, locked decisions, correction log, and readiness table live in the [breakdown README](./README.md).

## Children

| Child | Layer | Scope (one working session each) | Depends on | Jira key |
|---|---|---|---|---|
| [SP-105A](./SP-105A-password-reset-backend-issuance.md) | Backend | `PasswordResetToken` model + `User.passwordResetRequestedAt`; `POST /auth/forgot-password` (token issuance, 1-hour single-use token, 60s per-account cooldown, generic response, async email) | SP-102, SP-103 | Pending creation |
| [SP-105B](./SP-105B-password-reset-backend-redemption.md) | Backend | `POST /auth/reset-password` (token validation, atomic single-use claim, password update, account-wide token retirement, refresh-family revocation) | SP-105A | Pending creation |
| [SP-105C](./SP-105C-password-reset-frontend-ui.md) | Frontend | `/forgot-password` + `/reset-password` screens (URL-token handling, states, keyboard/responsive, session clearing); connect the dead Login link; wire routes | SP-105A, SP-105B (contract) | Pending creation |
| [SP-105D](./SP-105D-password-reset-integration.md) | Integration | Cross-layer end-to-end + real-Postgres concurrency proofs; DoD 10 integrated development review | SP-105A, SP-105B, SP-105C | Pending creation |

**Dependency graph**

```
SP-102, SP-103 ──▶ SP-105A ──▶ SP-105B ──┐
                    │                    ├─▶ SP-105D
                    └────────▶ SP-105C ──┘
                              (contract)
```

- **SP-105C can start** against the shared API contract below (and the existing `VerifyEmailPage` as the UX reference) and **finishes only after** SP-105A/B land, so its integration paths can be exercised.
- **SP-105D** can start only once A, B, and C have all landed.

## Shared API contract (all children must agree)

Both routes are already present in `PUBLIC_ROUTES` (`apps/api/src/modules/auth/public-routes.ts`) and are **inert** until implemented; the global `JwtAuthGuard` (registered via `APP_GUARD`) treats them as public. The `AllExceptionsFilter` envelope `{ statusCode, message, error, path, timestamp }` applies to all non-2xx responses.

### `POST /auth/forgot-password`

- **Request** — `ForgotPasswordDto { email: string }`: `@Transform(trim+toLowerCase)`, `@IsString`, `@IsEmail` (`'Please enter a valid email address'`), `@MaxLength(254)`. Global pipe is `whitelist` + `forbidNonWhitelisted` + transform (rejects extra fields such as `userId`).
- **Behavior** — look up the user by normalized email. In **every** valid-email case — known+eligible, known+cooled-down, unknown, or SMTP failure — return the **same** `200` status and the **same** message. For a known+eligible account, transactionally retire the account's outstanding reset tokens, create a new 1-hour single-use token (SHA-256 digest at rest), and send the email **asynchronously off the response path** (bounded timeout; sanitized failure handling). The endpoint **never** returns `429`, exposes a cooldown header, or emits an account-specific message.
- **Response** — `200 { "message": "If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another." }`; `400` (actionable field message) for empty or malformed email.
- **Link** — the email opens `${FRONTEND_URL}/reset-password#token=<raw-token>` (trusted `FRONTEND_URL`; the fragment never enters the initial HTTP request, analytics, or storage).

### `POST /auth/reset-password`

- **Request** — `ResetPasswordDto { token: string, password: string, confirmPassword: string }`:
  - `token`: `@IsString` + `@Matches(/^[A-Za-z0-9_-]{43}$/)` — mirrors `VerifyEmailDto`; the invalid-format message is the generic reset message below.
  - `password`: `@IsString` + `@MinLength(8, { message: 'Password must be at least 8 characters' })` — **the same policy as `RegisterDto`** (min 8, no complexity rules).
  - `confirmPassword`: `@IsString` + `@MinLength(8)`; the service rejects a `password !== confirmPassword` mismatch with the field error.
  - Global pipe `whitelist` + `forbidNonWhitelisted` rejects extra fields.
- **Behavior** — in a single **all-or-nothing** Prisma transaction: (1) lock the token owner's `User` row (`SELECT … FOR UPDATE`) to serialize all reset attempts for the account, (2) atomically claim the presented token with the conditional predicate `usedAt IS NULL AND expiresAt > now()`, (3) retire the account's other outstanding tokens, (4) revoke all of the account's `RefreshToken` rows (every family), and (5) update `User.passwordHash` with `ARGON2_OPTIONS`. A zero-row claim (used/expired/unknown/malformed) rolls back and rejects.
- **Response** — `200 { "message": "Password updated. Please sign in." }` on success; `400 { "message": "This reset link is invalid or has expired. Please request a new one." }` for used/expired/invalid/unknown (the cases are **never distinguished**); `400` field errors for password/confirmation validation.

### Token representation (one rule, agreed by all children)

- **Raw token** = `crypto.randomBytes(32).toString('base64url')` (43 characters). **Stored** = `SHA-256` digest (hex) in `PasswordResetToken.tokenHash`.
- The **raw** token appears only in: the outgoing email fragment, the browser URL fragment, the reset request body, and in-memory page state. It is **never persisted, never logged, and never returned in a response body.** This mirrors SP-103's `EmailVerificationToken` and SP-102's `RefreshToken` hashing boundary.

### Session-revocation semantics (agreed by B and C)

- A successful reset revokes **every** refresh-token row for the account (all families), forcing re-login on all devices.
- **Bounded residual window (accepted decision, README SD7):** already-issued access JWTs are stateless and remain valid until their 15-minute expiry; a JWT denylist is explicitly **out of scope** for MVP (later hardening task). Reset therefore blocks all *new* access tokens and refreshes immediately, but a captured access JWT is usable for at most 15 minutes after the reset.
- **Frontend (C):** on success, clear the in-memory access token + `user`, clear the `refresh_token` cookie, guard the in-flight silent session-restore (SP-102) from resurrecting the cleared session, then navigate to `/login`.

## Definition of Done (per child)

Each child carries the applicable items of the shared DoD (`docs/epics/README.md`):

| Child | DoD items |
|---|---|
| SP-105A | 1, 2, 4, 8, 9 (3 N/A public flow; 5/6/7 N/A backend; 10 obligation) |
| SP-105B | 1, 2, 4, 8, 9 (3 N/A; 5/6/7 N/A; 10 obligation) |
| SP-105C | 1, 2, 4, 5, 6, 7, 8 (3 N/A no academic data; 9 N/A no FE migration; 10 obligation) |
| SP-105D | 1, 8, 10 (performs the integrated development review) |

DoD 3 ("academic data is scoped to the authenticated student") is **not applicable** to a public auth-recovery flow. Its security analog is that a reset token authorizes **only its owner's** password change and retires the owner's other credentials; it never reads or writes academic data and never leaks whether an account exists.

## Out of scope (parent)

- JWT access-token denylist (bounded 15-minute window accepted; later hardening task — README SD7).
- Per-IP rate limiting on the reset endpoints (deferred to the epic's API-wide rate-limiting task — README SD8).
- Durable email queues, automatic retries, scheduled delivery, bounce webhooks (SP-103 scope).
- Profile/email-change flows (SP-106), social sign-in, and all AI / syllabus / LMS / flashcard / native-mobile work (per `docs/epics/README.md`).
