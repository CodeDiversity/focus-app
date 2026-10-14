# SP-103: Email Verification (Non-Blocking)

**Story ID:** SP-103
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** Medium / P1
**Dependencies:** SP-101
**Jira key:** STUDY-12
**Refined:** 2026-10-13

## Summary

Send verification email after registration using a reusable SMTP provider, confirm it through an explicit action with a single-use token, and offer resend from both a signed-in banner and a public verification page. Verification never blocks login or application features. Use Mailpit for development before a production email provider is provisioned.

## Description

As a student, I want my email verified so that account recovery works, without being blocked from using the app while I wait for the email.

Opening a verification link shows a confirmation page; it does not change account state. Students can request another email without signing in, including when a link is invalid, expired, or already used. A delivery failure leaves the account usable and recoverable through manual resend.

## Acceptance Criteria

1. Successful registration persists a hashed verification token with a 24-hour TTL and attempts email delivery. It preserves SP-101's `201 { id, name, email }` response and redirect to login; it issues no session token. SMTP failure does not undo account creation or change the success response.
2. The email opens `/verify-email` for signed-in or signed-out students. Opening the page does not redeem the token. An explicit "Verify email" action submits `POST /auth/verify-email`; one successful confirmation sets the token owner's `emailVerifiedAt` and retires every outstanding verification token for that account atomically. Confirmation does not sign anyone in, switch accounts, or revoke sessions.
3. Unknown, malformed, used, or expired tokens are rejected with an actionable message and a resend form. A token is expired when `expiresAt <= now`. Earlier links remain valid until their own expiry when another email is requested; a successful verification makes all subsequent confirmations fail, including concurrent submissions.
4. Public `POST /auth/resend-verification` accepts an email address. It permits at most one issuance attempt per minute per unverified account, including the initial registration email, and enforces this across concurrent requests and API restarts. Validly formatted addresses receive the same `200` status and generic response for eligible, unknown, already verified, throttled, and SMTP-failure cases. Throttled requests send no email, create no token, and do not extend the cooldown.
5. Unverified students can log in, restore their sessions, and use every protected feature. Login and refresh responses expose `emailVerifiedAt` so the frontend can distinguish verified from unverified students without adding a verification gate.
6. Signed-in, unverified students see a dismissible "Verify your email" banner with a resend action. Dismissal lasts through navigation until sign-out or app reload; it is held in memory and resets for another account. Successful verification hides the banner after current-profile refresh in that app, or when another unverified app tab regains focus. Profile-refresh failure never blocks application use.
7. The public verification page provides an email resend form, including when the token is missing. Both frontend and backend reject empty or malformed resend emails with actionable validation messages. Banner resend uses the signed-in student's email, rather than accepting another student's ID.
8. Confirmation and resend handle pending, success, empty/missing-token, and error states. Controls prevent duplicate submissions; generic resend feedback explains checking the inbox and waiting a minute before another request. The page and banner support keyboard interaction, visible focus, announced status/errors, and responsive desktop/mobile layouts meeting applicable WCAG 2.2 AA requirements.
9. Email delivery uses a reusable provider interface with an SMTP implementation and a local Mailpit inbox. Development can complete registration, resend, and verification without a production provider. Automated tests inject a fake provider and never contact real mailboxes. Production delivery requires externally supplied SMTP and sender settings; SMTP failures produce sanitized server-side diagnostics and manual resend remains the recovery path.

## Technical Notes

### Decisions

- Q1 (resend access): Support both a public email-based resend form and the signed-in banner; use the same generic success response regardless of account existence, verification status, throttling, or SMTP outcome.
- Q2 (confirmation): Opening the email link does not consume a token; require an explicit "Verify email" button. The page is reachable whether signed in or signed out.
- Q3 (older links): Resend does not invalidate earlier unexpired tokens. The first successful confirmation retires all outstanding tokens for the account.
- Q4 (delivery failure): Account creation succeeds despite SMTP failure. Log a sanitized failure and recover through manual resend; durable queues and automatic delivery retries are excluded.
- Q5 (dismissal): Keep dismissal in memory until sign-out or reload, retaining it across navigation. Refresh verification state after confirmation and when an unverified signed-in app regains focus; no polling is needed.
- Q6 (provider readiness): No production email provider exists yet. Include provider-neutral SMTP support and local Mailpit delivery now; production-provider selection, provisioning, and sender/domain setup remain external prerequisites.
- Final callouts: The absence of an email provider was raised and resolved through Q6; the final follow-up was approved with no additional callouts.
- Work status: Jira displayed "In Progress", but the user clarified that implementation has not started. This refinement updates the description only and does not change workflow status.

### Existing code and sequencing

- SP-101 and SP-102 are implemented in the inspected checkout. `User.emailVerifiedAt` already exists; no verification-token model, verification endpoints, email provider, or banner exists. Preserve the metadata dependency on SP-101 and integrate with the implemented SP-102 session flow.
- `AuthService.register` uses `UsersService.create` and returns only `{ id, name, email }`. Extend creation so the account, initial token, and cooldown marker commit together before attempting SMTP delivery. Keep argon2id, normalized emails, and duplicate-registration handling intact.
- Login/refresh currently project only `{ id, name, email }`, while the frontend `User` type also requires `emailVerifiedAt`, `createdAt`, and `updatedAt`. Add `emailVerifiedAt` to auth projections and explicitly align session-user types with the actual response; do not pretend login returns the full profile or change refresh rotation to fetch a profile on boot.
- Existing authenticated `GET /users/me` already returns `emailVerifiedAt` and profile timestamps, scoped to `req.user.id`; reuse it for verification-state reconciliation. No new current-user endpoint or verification guard is required.

### API contracts and DTOs

- Keep existing `POST /auth/register` unchanged externally. Neither registration nor confirmation returns the raw verification token to the browser as API response data.
- Add public `POST /auth/verify-email` with `VerifyEmailDto { token: string }`. A valid confirmation returns `200 { message: 'Email verified successfully.' }`. Missing, malformed, unknown, used, and expired tokens return `400` with a message such as "This verification link is invalid or has expired. Request a new email." Never return the token owner's email or ID. Known token validation failure is not a session `401`.
- Add public `POST /auth/resend-verification` with `ResendVerificationDto { email: string }`. Trim and lowercase before validation/lookup, consistent with existing normalization. Return `200 { message: 'If this email needs verification, a link will be sent. Check your inbox and wait a minute before requesting another.' }` for every valid-email outcome. A malformed/empty email returns `400` with an actionable field message; account lookup must not influence this validation.
- Follow the existing class-validator/class-transformer DTO pattern and the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, transform). Validate tokens as the expected nonempty 43-character base64url representation of 32 random bytes; reject extra fields such as `userId` or `emailVerifiedAt`.
- Follow `AllExceptionsFilter`'s existing error envelope: `{ statusCode, message, error, path, timestamp }`. Use actionable validation errors and sanitized internal failures; public resend must not expose account-specific delivery errors or cooldown headers.
- Build the browser link from trusted `FRONTEND_URL`, targeting `/verify-email#token=<opaque-token>`. Read the fragment into page memory and remove it from the displayed URL with replacement; do not forward it to analytics or store it in browser storage. Opening the link makes no confirmation request. Preserve the token in memory for an explicit retry after network failure.

### Persistence and concurrency

- Add `EmailVerificationToken` in `apps/api/prisma/schema.prisma`: `id String @id @default(uuid())`, `userId String`, cascading `User` relation, `tokenHash String @unique`, `expiresAt DateTime`, and `usedAt DateTime?`. Add `User.emailVerificationTokens`; index `userId` and map the table to `email_verification_tokens`, following `RefreshToken` naming conventions.
- Add nullable `User.emailVerificationRequestedAt DateTime?` for persisted per-account issuance cooldown. Initial registration sets it with the first token; existing users remain eligible with null. No verification backfill and no reset of existing accounts or sessions.
- Generate tokens using `crypto.randomBytes(32).toString('base64url')`; persist only a SHA-256 digest, following the existing opaque refresh-token pattern. Calculate expiry as issuance time plus 24 hours. The raw token exists only long enough to compose the outgoing message and is never persisted by the API.
- In a resend transaction, atomically claim an unverified account with a conditional update on its cooldown marker (`null` or at least 60 seconds old), then create its token. A zero-row claim means generic success with no issuance. Count delivery attempts, including failures, toward the cooldown; failed delivery does not invalidate older links. Do not use process-local maps or a read-then-write throttle.
- In one confirmation transaction, validate the presented token, atomically claim the still-unverified owner and still-unused/unexpired token, set `emailVerifiedAt`, and mark all outstanding tokens used/retired with `usedAt`. Roll back if either claim fails. Ensure two different valid tokens for the same user cannot both succeed. Use a consistent account-before-token locking order across issuance/confirmation; verification racing resend must leave no redeemable tokens after verification.
- Generate a new additive Prisma migration under `apps/api/prisma/migrations/<generated_timestamp>_email_verification/migration.sql`. Preserve all three applied migrations. Follow the existing Prisma 7 config/generated-client setup; regenerate the client and document migration apply/backward-compatible null defaults in the implementation artifact.

### Email provider and development setup

- Add a reusable `EmailModule` exporting an injection token and `EmailProvider.send({ to, subject, text }): Promise<void>`. Keep verification-link composition in the auth verification service, so SP-105 can reuse the transport for password reset without depending on verification logic. Import the module into `AuthModule`; inject a fake provider in service tests.
- Implement provider-neutral SMTP delivery. Read configuration through the existing global `ConfigModule`/`ConfigService`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and existing `FRONTEND_URL`/`NODE_ENV`. Describe credentials only by variable name. Authentication is optional for local Mailpit; real SMTP uses the supplied provider's authentication and TLS requirements. Never disable certificate validation for production.
- Attempt delivery only after persistence commits, with bounded SMTP timeouts and handled promise rejection. Keep SMTP work outside the public resend response path so provider timing/failure does not reveal whether an email exists. An in-process attempt may be lost on process exit; that is an accepted limit of the manual-resend decision, not a durable delivery guarantee.
- Replace the original development-link logging approach with Mailpit. Add a development Mailpit service to existing `docker-compose.yml` on `studypilot_network`, using a maintained image pinned at implementation time. Bind host SMTP and inbox ports to loopback only. SMTP listens on `1025`; the browser inbox uses `8025`. Mailpit receives local messages without delivering them to real inboxes.
- For an API running in Compose, use `SMTP_HOST=mailpit`; for an API started on the host using the existing pnpm dev workflow, use `SMTP_HOST=localhost`. Both use `SMTP_PORT=1025`, local `SMTP_SECURE=false`, and no SMTP authentication. Select a development-only sender with `SMTP_FROM`. Keep `FRONTEND_URL=http://localhost:3000` for browser links; the Docker service hostname is not a browser URL.
- Development workflow: start Mailpit (and the existing database if needed), run API/web through Compose or their existing dev commands, register/resend, open `http://localhost:8025`, follow the email link, then explicitly confirm. Unit tests mock delivery; an integrated smoke test verifies real local SMTP capture, the link, and banner reconciliation.
- Record the setup and production prerequisites in the implementation documentation. Real delivery requires the operator to choose/provision an SMTP service, configure the sender/domain as needed, and supply configuration outside the repo. An unavailable/misconfigured mail transport is a sanitized delivery failure, not a reason to roll back registration or expose recipient details. Do not silently fall back to logging tokens in production.
- Mailpit references: [Docker setup](https://mailpit.axllent.org/docs/install/docker/), [SMTP configuration](https://mailpit.axllent.org/docs/configuration/smtp/).

### Frontend behavior and security

- Add the `/verify-email` route in `App.tsx` outside both `PublicRoute` and `ProtectedRoute`. Existing `PublicRoute` redirects authenticated users, which would prevent them from confirming links.
- Add auth-service methods for confirmation/resend. Update the auth-path exclusions in `services/api.ts` for these public operations so their failures cannot trigger session refresh/logout. Continue using the existing API proxy and in-memory session token store.
- Add a banner to `Layout`, rendered only for a loaded authenticated user whose `emailVerifiedAt` is explicitly null. Show no banner while auth is loading or for anonymous/verified users. Keep resend loading/errors local, rather than setting global auth loading or blocking protected routes.
- Hold dismissal per authenticated account in memory and clear it on logout/account change. Provide a link to the public verification/resend page so a dismissed banner does not prevent recovery. Give resend a visible 60-second cooldown after any generic success; the server remains authoritative.
- Extend `AuthContext` with a current-profile refresh method, used after confirmation and on window focus while signed in and unverified. Deduplicate requests and ignore late responses after logout/account change. Do not poll, rotate a refresh token solely to read verification state, or discard a usable session on a transient profile-refresh failure.
- A confirmation token is the authority to verify its owner. If account A is signed in while confirming B's token, only B is verified; refresh A's own `/users/me`, keep A's session, and never copy a token-derived identity or success state into A's user. These public endpoints never expose academic data. Academic routes retain authenticated-student scoping without verification gates.
- No account-enumeration leaks in the new endpoints: identical resend status/body, no recipient-specific errors, no account cooldown headers, no SMTP-dependent response timing. SP-101's existing duplicate-registration `409` is a separately accepted contract and is unchanged by this story.
- Never log raw verification links/tokens, SMTP credentials, or recipient addresses in failure diagnostics. Use controlled error categories and internal correlation IDs, not provider exceptions that may contain message or credential data. Tokens are never session credentials and do not alter existing refresh families.

### Relevant files

Existing files to change or extend (all read during refinement):

- `apps/api/prisma/schema.prisma` — token relation/model and persisted cooldown marker.
- `apps/api/src/modules/auth/auth.service.ts` — registration issuance and verification status in login/refresh projections, including `resolveTokenUser`.
- `apps/api/src/modules/users/users.service.ts` — support transactional registration creation while preserving safe user projections.
- `apps/api/src/modules/auth/auth.controller.ts` — public confirmation/resend routes and explicit response statuses.
- `apps/api/src/modules/auth/auth.module.ts` — verification-service provider and reusable email-module wiring.
- `apps/api/package.json` and `pnpm-lock.yaml` — SMTP dependency/type declarations and resolved dependency changes, if needed.
- `docker-compose.yml` — local Mailpit service and nonsecret development transport configuration; preserve existing services.
- `apps/web/src/App.tsx` — always-accessible verification route.
- `apps/web/src/components/Layout.tsx` — shared banner integration.
- `apps/web/src/context/AuthContext.tsx` — safe profile reconciliation and account-scoped dismissal lifecycle.
- `apps/web/src/services/auth.ts` — confirmation/resend API calls and current-profile refresh reuse.
- `apps/web/src/services/api.ts` — public auth-path exclusions.
- `apps/web/src/types/index.ts` — explicit session-user/verification response types matching the backend.
- `apps/api/src/modules/auth/auth.service.spec.ts`, `apps/api/src/modules/auth/auth.controller.spec.ts`, and `apps/api/src/app.module.spec.ts` — extend registration/auth projections, route contracts, and dependency wiring.
- `apps/web/src/context/AuthContext.test.tsx`, `apps/web/src/services/api.test.ts`, and `apps/web/src/pages/Register.test.tsx` — verification reconciliation, public-error/session isolation, and unchanged registration behavior.

Proposed new files, following existing `src/modules/<feature>` and colocated test conventions:

- `apps/api/src/modules/auth/email-verification.service.ts` and `email-verification.service.spec.ts` — issuance, confirmation, cooldown, and token-lifecycle rules.
- `apps/api/src/modules/auth/dto/verify-email.dto.ts` and `verify-email.dto.spec.ts` — confirmation validation with the real global-pipe settings.
- `apps/api/src/modules/auth/dto/resend-verification.dto.ts` and `resend-verification.dto.spec.ts` — normalized email validation and forbidden-field cases.
- `apps/api/src/modules/email/email.module.ts` and `email-provider.ts` — reusable module and delivery interface/injection token.
- `apps/api/src/modules/email/smtp-email.provider.ts` and `smtp-email.provider.spec.ts` — SMTP adapter, configuration, local authentication behavior, and sanitized failures.
- `apps/api/prisma/migrations/<generated_timestamp>_email_verification/migration.sql` — generated additive migration; the timestamp is chosen by Prisma at implementation.
- `apps/web/src/pages/VerifyEmail.tsx` and `VerifyEmail.test.tsx` — confirmation and public resend UI.
- `apps/web/src/components/EmailVerificationBanner.tsx` and `EmailVerificationBanner.test.tsx` — account reminder, dismissal, resend states, and accessibility.

### Test cases to add

Backend uses Jest with colocated `*.spec.ts`; frontend uses Vitest, React Testing Library, and user-event with `*.test.tsx`. The names below are proposed cases, not claims that tests already exist.

| AC | Test file / describe | Named cases |
| --- | --- | --- |
| 1 | `apps/api/src/modules/auth/auth.service.spec.ts` / `register` | `creates the account and hashed 24-hour verification token together`; `keeps registration successful when email delivery fails`; preserve `returns the created user without a token or password hash`; `rolls back account creation when token persistence fails` |
| 1 | `apps/web/src/pages/Register.test.tsx` / `RegisterPage` | Preserve `submits and redirects to /login on success without storing a token or signing in` |
| 2–3 | `apps/api/src/modules/auth/email-verification.service.spec.ts` / `verifyEmail` | `verifies the token owner and retires all outstanding tokens`; `rejects a used token`; `rejects an unknown token`; `rejects a token at and after its expiry`; `keeps earlier unexpired links valid after resend`; `lets only one concurrent confirmation succeed for the same token`; `lets only one of two different tokens verify the same account`; `leaves no redeemable token when resend races verification`; `rolls back token retirement when the user update fails`; `does not change another account or revoke sessions` |
| 4 | Same service spec / `resendVerification` | `normalizes the email before lookup`; `returns identical success for unknown verified throttled and eligible addresses`; `returns generic success when SMTP delivery fails`; `sends at most once within sixty seconds including registration`; `allows resend at the sixty-second boundary`; `does not extend cooldown on throttled requests`; `lets only one concurrent resend claim the account`; `preserves the cooldown across service instances`; `does not invalidate older links after delivery failure` |
| 2, 4, 7 | `apps/api/src/modules/auth/auth.controller.spec.ts` / `AuthController` | `exposes confirmation and resend without a JWT guard`; `returns 200 for confirmation and generic resend`; `rejects extra account identifiers through the global validation pipe`; `never returns raw verification tokens or owner details` — add HTTP-level checks using the real Nest route/global-pipe wiring, beyond direct-method mocks |
| 5 | `apps/api/src/modules/auth/auth.service.spec.ts` / `login`, `refresh` | `allows an unverified student to log in`; `restores an unverified session`; `returns null or a timestamp for emailVerifiedAt`; retain rotation/reuse/logout cases |
| 7 | New DTO specs / `VerifyEmailDto`, `ResendVerificationDto` | `rejects an empty or malformed token with a resend message`; `rejects an empty or malformed email with an actionable message`; `accepts a trimmed mixed-case email`; `rejects non-whitelisted userId and emailVerifiedAt fields` |
| 2–3, 7–8 | `apps/web/src/pages/VerifyEmail.test.tsx` / `VerifyEmailPage` | `opens without sending a confirmation request`; `requires an explicit Verify email action`; `is reachable while signed in and signed out`; `shows missing-token guidance and the resend form`; `shows pending confirmation and prevents duplicate submission`; `offers resend for invalid expired and used links`; `validates resend email without submitting`; `shows generic resend feedback and cooldown`; `keeps retry available after a network failure`; `removes the token fragment from the displayed URL`; `completes confirmation and resend using keyboard only` |
| 5–6, 8 | `apps/web/src/components/EmailVerificationBanner.test.tsx` / `EmailVerificationBanner` | `shows only for a loaded unverified student`; `stays dismissed through navigation`; `reappears after logout and login or app reload`; `does not carry dismissal to another account`; `shows local resend loading cooldown and actionable network error`; `hides after verified profile reconciliation`; `supports keyboard dismissal and resend`; `fits mobile and desktop viewports` |
| 6 | `apps/web/src/context/AuthContext.test.tsx` / `AuthContext` | `refreshes the current profile after confirmation and on focus`; `keeps the signed-in account when another account is verified`; `ignores a late profile response after logout or account change`; `deduplicates verification profile refresh`; `keeps the usable session when verification profile refresh fails` |
| 2, 4–5 | `apps/web/src/services/api.test.ts` / `api interceptor` | `does not attempt session refresh for verification or resend errors`; preserve existing single-flight refresh and auth-endpoint exclusion cases |
| 9 | `apps/api/src/modules/email/smtp-email.provider.spec.ts` / `SmtpEmailProvider` | `sends through the configured SMTP transport`; `supports local SMTP without authentication`; `uses supplied production authentication and TLS settings`; `reports unavailable transport without exposing credentials recipient or token`; `bounds delivery time and handles rejection without retrying` |
| 9 | `apps/api/src/app.module.spec.ts` / `AppModule wiring` | Extend `resolves every provider in the dependency graph` to include the verification service and email provider |

- Concurrency/cooldown unit tests should use stateful transaction mocks, following the existing refresh-token race tests, rather than independent mocks that let every update succeed. Verify the database predicates/atomicity against PostgreSQL as part of integrated review; mocked tests alone do not prove database locking behavior.
- Integrated development verification: apply the new migration, capture initial and resend email in Mailpit, confirm explicitly, test old/used/expired links, race confirmation/resend, check cooldown from two clients, and confirm two student accounts remain isolated. Inspect actual desktop/mobile viewports and keyboard focus/status announcements; CSS-class assertions alone do not establish responsiveness.
- Run the existing API/web test and typecheck commands after implementation. Record commands, results, migration evidence, and integrated review in `docs/artifacts/STUDY-12/implementation.md` following `docs/artifacts/README.md`; review against the shared DoD in `docs/epics/README.md`. This refiner writes only this story, not artifacts or implementation.

### Out of scope and prerequisites

- Production mail-service account creation, vendor selection, paid plans, DNS/sender/domain provisioning, and real SMTP credential setup; these are external prerequisites for real inbox delivery. The SMTP adapter and local Mailpit setup are included.
- Durable email queues, automatic retries, scheduled delivery, delivery/bounce webhooks, email analytics, token cleanup jobs, and rich email-template systems.
- Password reset and session revocation on reset (SP-105), profile/email-change flows, onboarding, social sign-in, and changes to SP-101 duplicate-registration behavior.
- Verification gates on login, onboarding, academic routes, or application features; long-lived dismissal preferences, browser token persistence, polling, and cross-device push synchronization.
- New API-wide/IP-based abuse infrastructure; this story implements the specified persisted per-account resend cooldown. Broader abuse protection belongs to a separate task.
- AI features, syllabus parsing, LMS integrations, grade calculations, flashcards, social collaboration, and native mobile apps.
