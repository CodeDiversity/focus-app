# SP-103 email verification — implementation

**Date:** 2026-10-14 (backend evidence retained from 2026-10-13)  
**State:** Working tree, full backend/frontend scope implemented, integrated browser checks passed, and final review approved.  
**Story:** `docs/stories/EP01/SP-103-email-verification.md`  
**Jira:** STUDY-12

## Implemented behavior

- Registration preserves `201 { id, name, email }` with no session credentials. Prisma nested creation commits the account, first verification-token hash and initial cooldown together. Email delivery starts after persistence and failure cannot undo registration.
- Tokens contain 32 random bytes encoded as 43 base64url characters; only SHA-256 hashes persist. Expiry is 24 hours after issuance; `expiresAt <= now` is rejected. Confirmation marks the owner verified and retires every remaining token in one transaction.
- Resend uses a conditional persisted owner update to claim the 60-second cooldown, including the registration email. Throttled requests neither create tokens nor extend the timestamp. Earlier unexpired links stay valid until successful confirmation.
- Confirmation and issuance consistently write the owner before token rows. Atomic predicates prevent simultaneous redemption, including different valid tokens belonging to one account, and prevent an issuance racing confirmation from leaving a usable token.
- No login or feature verification gate was added. Login and refresh now project `{ id, name, email, emailVerifiedAt }`, where the verification value is null or a timestamp. Existing refresh rotation/family behavior and owner-scoped `GET /users/me` are preserved.
- A reusable `EMAIL_PROVIDER` interface and `EmailModule` export provider-neutral Nodemailer SMTP delivery. `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `FRONTEND_URL` and `NODE_ENV` are read through `ConfigService`. Local SMTP authentication is optional. Production requires implicit TLS or STARTTLS, always with certificate validation.
- SMTP uses five-second connect/greeting limits, ten-second idle socket timeout and a fifteen-second total delivery deadline. The supported Nodemailer `getSocket` hook owns the underlying TCP socket; completion, failure or timeout destroys it, including after TLS wrapping, preventing an active peer from retaining the connection or continuing delivery after the deadline. DNS and TCP connection setup are also bounded by the five-second connection timer. Delivery is detached from registration/resend responses, with handled rejection and no automatic retries. Diagnostics contain controlled categories and random internal correlation IDs, never provider exceptions, recipients or verification links.
- Verification links target the trusted frontend `/verify-email#token=...` location. The backend performs no action when a link is opened; verification requires the explicit public POST below.
- `ConfigModule` ignores credential files under `NODE_ENV=test`. New unit tests inject fake email providers, and HTTP contract tests use a real Nest controller/global validation pipe/exception filter on loopback.

## API contracts

| Endpoint | Request | Result |
| --- | --- | --- |
| `POST /auth/register` | Existing registration DTO | Unchanged `201 { id, name, email }` |
| `POST /auth/verify-email` | `{ token: string }`, exactly 43 base64url characters | `200 { message: 'Email verified successfully.' }`; invalid/missing/malformed/used/expired links return actionable `400` |
| `POST /auth/resend-verification` | `{ email: string }`, trimmed/lowercased then validated | Generic `200` for eligible, unknown, verified, throttled and SMTP-failure outcomes; malformed/missing email returns actionable `400` |
| `POST /auth/login`, `POST /auth/refresh` | Existing DTO/cookie | Existing session contract plus `user.emailVerifiedAt` |

Resend's generic message is: “If this email needs verification, a link will be sent. Check your inbox and wait a minute before requesting another.” New public endpoints set no session cookies, expose no owner identity or raw token, and provide no account-specific cooldown headers. Extra fields such as `userId` and `emailVerifiedAt` are rejected. Error responses keep `{ statusCode, message, error, path, timestamp }`.

## Persistence and migration

- Added nullable `User.emailVerificationRequestedAt`; existing accounts default to null and remain eligible. No account/session backfill or reset.
- Added `EmailVerificationToken` / `email_verification_tokens`: UUID ID, cascading owner relation, unique hash, expiry, nullable `usedAt`, and owner index.
- Additive migration: `apps/api/prisma/migrations/20261013180000_email_verification/migration.sql`. Original three migrations preserved.
- Generated the SQL using Prisma 7 schema-to-schema diff against the prior schema, without accessing any credential file, and regenerated `apps/api/src/generated/prisma` (gitignored generated output).
- Parent applied all four migrations successfully with direct `prisma migrate deploy` against a disposable, isolated local PostgreSQL database. No shared database was modified.

## Development email setup

`docker-compose.yml` preserves existing services and adds pinned `axllent/mailpit:v1.31.5` on `studypilot_network`, with SMTP `127.0.0.1:1025` and inbox `127.0.0.1:8025` bound only to loopback. API Compose configuration uses host `mailpit`, port 1025, `SMTP_SECURE=false`, a development sender and no authentication.

1. Start local Mailpit with `docker compose up -d mailpit`; start the existing local database/API as needed. Docker Compose may load its own operator configuration; agents do not read or edit credential files.
2. For the host pnpm API workflow, supply `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_SECURE=false` and a development `SMTP_FROM` through the process environment. For Compose API use `SMTP_HOST=mailpit`. Set `FRONTEND_URL=http://localhost:3000` so browser links use the browser origin.
3. Register/resend with test addresses and inspect `http://localhost:8025`. Mailpit captures messages locally and does not deliver to real inboxes. Open the email link, confirm with **Verify email**, and check banner reconciliation; opening the link alone sends no confirmation request.

Production requires an externally provisioned SMTP service, supplied sender/authentication settings and trusted HTTPS `FRONTEND_URL`. No credentials are committed. Missing/misconfigured transport produces sanitized failure diagnostics; manual resend is the recovery mechanism. In-process attempts may be lost on shutdown, as accepted by the story; there is no durable queue or delivery guarantee.

References: [Mailpit Docker documentation](https://mailpit.axllent.org/docs/install/docker/), [Mailpit releases](https://github.com/axllent/mailpit/releases/tag/v1.31.5), [Nodemailer SMTP options](https://nodemailer.com/smtp).

## Backend verification evidence (2026-10-13)

- Baseline supplied by parent: API 39 tests across 7 suites passed before changes.
- TDD red: session tests failed because login/refresh omitted `emailVerifiedAt`; registration tests then failed because the token/cooldown were not supplied to creation. Verification service behavior tests produced 20 expected failures before implementing issuance/confirmation, and SMTP/DTO tests failed before implementing their behavior.
- `pnpm --filter @studypilot/api exec prisma generate` — passed, Prisma 7.10.0.
- `pnpm --filter @studypilot/api test -- --runInBand` — passed **101 tests across 12 suites**. Loopback HTTP tests needed execution outside the restricted sandbox; initial sandbox runs failed solely on `listen EPERM`. A HTTP-array assertion initially failed because Node fetch returned an array from another realm; it now checks `Array.isArray` and contents. Existing exception-filter tests emit their synthetic error fixture log.
- SMTP review regression: the original direct transport left its socket open after the budget when a real local SMTP peer drip-fed incomplete multiline replies. `smtp-email.provider.integration.spec.ts` reproduced that failure, then passed after explicit socket ownership/cancellation. Only the fifteen-second timer is shortened in this test; real Nodemailer and TCP prove peer-side closure and no continued delivery. The full API suite was rerun after the fix.
- Parent reran repository `pnpm test` after the SMTP socket fix — passed **131 tests**: 101 API tests across 12 suites freshly executed, plus 30 unchanged frontend tests across 6 suites served from the task cache; both tasks successful.
- `pnpm --filter @studypilot/api typecheck` — passed.
- `pnpm --filter @studypilot/api build` — passed.
- `pnpm --filter @studypilot/api exec eslint 'src/**/*.ts' --no-fix` — passed with the existing `main.ts` console warning; no errors.
- Parent ran direct `prisma migrate deploy` with a synthesized nonsecret URL for its disposable PostgreSQL instance — all four migrations applied.
- Parent ran an independent scratch HTTP/Prisma/PostgreSQL/real Mailpit integration harness, `node /private/tmp/studypilot-sp103-db.idHeG5/integration.cjs` — **11 checks passed**, rerun successfully after the SMTP cancellation fix: registration exact response/hash/TTL and actual SMTP capture; unverified login/refresh; generic cooldown; older-link preservation/all-token retirement; concurrent distinct/same-token confirmation; six concurrent resends issuing one token; five resend/confirmation races leaving no usable tokens; expired/unknown rejection; malformed/extra-field HTTP validation; cross-account owner-only confirmation/session preservation; forced nested-token hash collision rolls back the account/cooldown without leaving an orphan user. SMTP/inbox ran on alternate loopback ports for the isolated smoke environment. No real mailboxes contacted.

## Frontend implementation (2026-10-14)

- `apps/web/src/App.tsx` registers `/verify-email` outside both public and protected route guards, so it works signed in or signed out, including during initial session restoration.
- `apps/web/src/pages/VerifyEmail.tsx` captures the 43-character base64url fragment token in component memory with a pure initializer, then replaces the URL to remove the fragment. StrictMode does not lose the token. Opening the page makes no confirmation request; the explicit **Verify email** button sends the public POST. Pending confirmation prevents duplicates, success clears the token, invalid/expired/used links clear it and offer resend, and network errors preserve it for explicit retry. A link verifies only its recipient; any existing signed-in account remains unchanged unless its own current-profile response reports verification.
- The same page always offers a public resend form, including for missing or malformed links. Email validation uses the existing Zod convention, with trimming/lowercasing before validation/submission and actionable field feedback. Public resend keeps generic feedback for every valid-email server outcome and displays a 60-second countdown. Network failure allows retry without consuming the confirmation link.
- `apps/web/src/hooks/useResendVerification.ts` is a domain-specific TanStack Query mutation shared by page and banner. Pending requests and cooldown suppress duplicate sends; retries are explicit. Confirmation deliberately uses component-local async state rather than mutation variables/cache, keeping verification tokens out of TanStack Query caches and developer tools. Public service methods discard Axios request configuration before surfacing sanitized errors.
- `apps/web/src/components/EmailVerificationBanner.tsx` is composed into `Layout`. It renders only for a loaded authenticated user whose verification timestamp is explicitly null. Dismissal is held per account in `AuthContext`, survives navigation, and resets after sign-out/account change/reload. The account-keyed reminder resets local resend state for another account and always resends the signed-in student's email.
- `Header` supplies a permanent **Email verification** recovery link even after dismissal, and its flex wrapping accommodates the extra link on small screens.
- `AuthContext.refreshProfile()` reads the existing owner-scoped `/users/me` after confirmation and on window focus while unverified. Ordinary reads deduplicate; confirmation uses `{ fresh: true }` to wait for a pending boot restoration or queue a fresh read behind an older in-flight profile response. It checks account and session generation before applying a response or issuing a queued read, and ignores stale reads after logout/account change. Transient failures do not set global loading/error, log the student out, or block protected access. Profile reads do not rotate refresh tokens just to obtain verification state; real 401 errors retain the interceptor's existing refresh behavior. Restored/login session users now have the actual `{ id, name, email, emailVerifiedAt }` type; full profile timestamps are a separate `User` extension.
- Public verification/resend endpoints are excluded from auth interception, so their errors cannot initiate session refresh or logout. Access tokens remain exclusively in the existing in-memory store; verification tokens never enter browser storage/history state, logs, or query caches.
- Integrated reload testing found that the development `/api` proxy stripped the prefix from requests but left the backend refresh cookie's `/auth` path unchanged. Browsers therefore omitted the cookie from `/api/auth/refresh`, losing the restored session on reload. `apps/web/vite.config.ts` now maps response cookie paths from `/auth` to `/api/auth`, preserving the existing target and request rewrite. Deployments that expose the API under `/api` must apply the equivalent reverse-proxy cookie-path mapping; using an unprefixed API origin retains `/auth` directly. This is path translation only; httpOnly, SameSite, Secure, rotation and credentials remain unchanged.
- Page and banner include announced pending/success/errors, labelled email input with invalid/error association, keyboard controls and visible focus styles using existing components. Form controls, card width, banner controls and header wrap at mobile sizes. Actual desktop/mobile, keyboard and accessibility inspection passed as recorded below.

### Frontend verification evidence

- TDD red: two public-endpoint isolation tests initially initiated an unwanted refresh; six profile/focus tests failed before `refreshProfile()` existed; fourteen page tests failed because `/verify-email` redirected to home; eight banner interaction cases failed because no reminder existed. Their targeted runs passed after implementation.
- New tests: `pages/VerifyEmail.test.tsx`, `components/EmailVerificationBanner.test.tsx`; extended `context/AuthContext.test.tsx` and `services/api.test.ts`. These exercise actual routes/context/services with a fake HTTP adapter, including StrictMode token capture/removal, explicit action, signed-in/out access, generic resend/cooldown boundary, duplicate suppression, invalid/expired/used recovery, retry, keyboard form/dismissal, account dismissal lifecycle, focus reconciliation, profile deduplication and late-response isolation. Existing registration/session tests remain unchanged except wrapping two context interactions in `act`.
- Review regression red: confirmation before deferred boot restoration (normal and StrictMode) produced no profile read; confirmation overlapping an older focus request reused its pre-confirmation state. The three real App/AuthProvider/API-adapter cases failed before the freshness queue and passed after it. Existing late-response tests also verify that queued fresh reads are discarded on logout/account change.
- `pnpm --filter @studypilot/web test` — passed **68 tests across 8 suites** after the three review regression cases and queued-read ownership checks.
- Integrated cookie-path red evidence supplied by the parent: real registration returned 201, login returned 200, the shared browser cookie jar recorded path `/auth`, and subsequent `/api/auth/refresh` returned 401 because that path excluded the cookie. Keyboard banner dismissal persisted through navigation but reload lost the session. After restarting the proxy with the path mapping, the actual cookie jar recorded `/api/auth` and `/api/auth/refresh` returned 200; the browser restored its session and the dismissed banner reappeared on reload.
- `pnpm --filter @studypilot/web typecheck` — passed.
- `pnpm --filter @studypilot/web build` — passed (Vite production build).
- `pnpm --filter @studypilot/web lint` — passed, zero warnings/errors.
- Existing Vite CJS/PostCSS module notices, React Router future-flag notices, and the existing synthetic logout-network fixture remain non-failing diagnostics. New interaction tests use an asynchronous `act` helper instead of suppressing warnings; new UI cases emit no unwrapped React state-update warnings.
- Unit/component tests use fake HTTP responses and never contact real mailboxes. Parent-run real API/PostgreSQL/Mailpit browser smoke evidence is recorded below; the final [review report](./review.md) approves the complete story.

### Final integrated frontend verification (2026-10-14)

The parent independently ran real Chrome against the actual Vite frontend, API, disposable PostgreSQL database and local Mailpit inbox after the final profile-refresh and proxy fixes. **All 10 browser checks passed**:

1. Missing-link recovery, invalid/empty resend email feedback and email-field focus.
2. Actual Mailpit email link opens without confirmation, removes its fragment, and leaves no verification token in browser storage or history state.
3. Keyboard explicit confirmation, disabled pending controls and exactly one confirmation POST.
4. Used-link guidance, public unknown-account resend with generic feedback and a visible 60-second cooldown.
5. Network-failure retry retains the confirmation token in memory.
6. Unverified login, responsive banner, keyboard dismissal retained through navigation and restored after app reload.
7. Banner resend 503 shows a sanitized actionable error and retry without logging the student out.
8. Account A confirming account B's link retains A's session and unverified profile/banner.
9. Confirmation of the signed-in student's own email refreshes its profile and hides the banner.
10. Confirmation in another app tab reconciles the unverified tab when it regains focus.

The parent ran axe with WCAG 2 A/AA, 2.1 AA and 2.2 AA tags in six states: missing-link mobile, ready mobile, confirmation-success mobile, used-link/resend, banner mobile and signed-in confirmation success. **Zero automated accessibility violations** were reported in those scanned states. Keyboard behavior and visible focus were also inspected directly.

Actual **1280×900 desktop** and **375×812 mobile** layouts showed no horizontal overflow for the verification page or banner. The parent inspected screenshots captured under `/private/tmp`; wrapped text and focus indicators were clear. These temporary screenshot artifacts contain no credentials and are not committed. Automated scanning is evidence for the inspected states, rather than a claim of exhaustive WCAG certification.

Final repository `pnpm test` passed **169 tests total**: 68 web tests across eight suites freshly executed, plus 101 unchanged API tests across twelve suites replayed from the successful task cache. Web typecheck, production build, lint with zero warnings/errors and scoped diff checks all passed after the final changes. The historical eleven backend PostgreSQL/HTTP/Mailpit checks above remain preserved as separate backend evidence.

## Scope and remaining work

Backend checklist complete: atomic registration; hashed TTL; persisted cooldown; explicit confirmation; generic validated public resend; SMTP abstraction/adapter; Mailpit configuration; auth projections; migration/client; unit and HTTP coverage; typecheck/build/lint; isolated database/mail smoke testing.

Frontend implementation of acceptance criteria **6 and 8**, plus frontend portions of **2, 3, 7 and 9**, is complete, covered by automated checks and verified through the integrated browser flow. Full SP-103 implementation and applicable integrated development checks are complete; the final [review report](./review.md) approves all acceptance criteria and Definition of Done conditions.

Production SMTP provisioning is an external prerequisite. Frontend work changes only the web implementation/tests, development proxy configuration and this record, preserving backend implementation, planning documents and existing unrelated edits. No credentials, branch, commit or shared-environment database operation were created. The earlier parent completed the backend repository test run and isolated integration harness after the socket fix; scoped backend review resolved the SMTP deadline finding. Current integration evidence is recorded above. The parent saved the final approved review report and stopped the temporary frontend, API, Mailpit and PostgreSQL test services.
