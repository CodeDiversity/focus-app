# SP-105: Password Reset

**Story ID:** SP-105 (parent / coordination record)
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** High / P0
**Dependencies:** SP-102 and SP-103; implementation exists, but SP-103 integrated-review completion remains unverified in its latest artifact
**Jira key:** STUDY-7 (existing parent; no new tracker changes made)
**Status:** Corrected draft — independent re-review pending
**Refined:** 2026-10-14

## Purpose and children

Coordination record, not a combined implementation ticket. The [breakdown README](./README.md) preserves source requirements, decisions, original findings and readiness evidence. Each child has its own pending tracker identity; no issue creation/sync is claimed.

| Child | Layer / coherent outcome | Dependencies | Jira |
|---|---|---|---|
| [SP-105A](./SP-105A-password-reset-backend-issuance.md) | Backend — reset persistence and email issuance | SP-102, SP-103 | Pending creation |
| [SP-105E](./SP-105E-auth-session-coordination.md) | Backend — coordinate login/refresh/logout with owner-first locking | SP-102 | Pending creation |
| [SP-105B](./SP-105B-password-reset-backend-redemption.md) | Backend — atomic reset redemption and server cookie expiry | A, E | Pending creation |
| [SP-105F](./SP-105F-password-reset-ip-limits.md) | Backend — shared per-IP limits for both recovery endpoints | A/B contracts; starts against contract | Pending creation |
| [SP-105C](./SP-105C-password-reset-frontend-ui.md) | Frontend — recovery screens consuming G session boundary | G + A/B/F contracts; finishes after endpoints/limiter | Pending creation |
| [SP-105D](./SP-105D-password-reset-integration.md) | Integration — database/browser/SMTP verification and DoD 10 | A, B, C, E, F, G, H, I, J completed | Pending creation |

| [SP-105G](./SP-105G-recovery-session-client.md) | Frontend — shared recovery session boundary | SP-102; A/B/F contracts | Pending creation |
| [SP-105H](./SP-105H-postgres-test-harness.md) | Integration infrastructure — Postgres fixtures/barriers | SP-102; A/F migrations | Pending creation |
| [SP-105I](./SP-105I-credential-race-tests.md) | Integration tests — credential race suite | A, B, E, H | Pending creation |
| [SP-105J](./SP-105J-limiter-integration-tests.md) | Integration tests — limiter race suite | F, H; A/B HTTP | Pending creation |

Each targets one focused working session; validate estimates at refinement and split further if needed. E and A can start independently. F/G can start against settled contracts, but the complete feature cannot release before A/B/C/E/F/G/H/I/J and D's verification. SP-103's latest `docs/artifacts/STUDY-12/review.md` still lacks integrated DoD evidence; inspect new evidence before treating that upstream dependency as verified complete.

## Shared API contract (all children must agree)

Both endpoints are public entries already reserved in `apps/api/src/modules/auth/public-routes.ts`. Use explicit 200 status for successful POSTs. Global DTO validation rejects extra owner/family identifiers, and failures use the global `{ statusCode, message, error, path, timestamp }` envelope. Request bodies/raw Axios configuration must never be logged, stored or sent to analytics.

### `POST /auth/forgot-password`

- Request: `{ email: string }`; transform using class-transformer's `({ value })` callback, trim/lowercase, require string/email/nonempty and maximum 254 characters.
- F first applies a shared per-IP limit of 10 admitted requests in a rolling 60-second window, independent of email or account existence. Requests over the limit return generic 429 with IP-only retry guidance; storage failure returns sanitized 503 before any reset mutation.
- For every other valid-email outcome (eligible, cooled-down, unknown, SMTP failure), return identical `200 { message: 'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.' }`. Invalid email/extra fields return actionable 400 field errors.
- A owns the separate persisted 60-second **existing-account** issuance cooldown. Unknown emails have no User marker; F protects those requests by IP, with the same account-independent response. No account-cooldown header. No HTTP rate-limit response based on whether an account exists.
- Eligible issuance uses owner-first transaction locking, retires prior unused tokens and creates one 1-hour token. Async email starts after commit, with bounded timeout and sanitized rejection handling, outside the public response path. Failed delivery may require manual re-request; no durable queue guarantee is made. Eligible database writes can still differ in timing from unknown/cooldown paths; A/D must measure and assess before security sign-off.

### `POST /auth/reset-password`

- Request: `{ token: string, password: string, confirmPassword: string }`. Token: raw 43-character base64url, generic invalid-link validation messages. Password: string, minimum eight characters, same registration policy; confirmation must match. Invalid passwords are field errors, not proof a token is invalid.
- F first applies 30 admitted submissions per IP in a rolling 60 seconds, with the same account-independent 429/503 rules.
- B discovers the token owner without a token write, locks mapped `users.id FOR UPDATE`, obtains fresh **post-lock** time and conditionally claims the token (`usedAt IS NULL`, `expiresAt > checkedAt`, token/owner IDs match). Then retire other reset tokens, revoke all owner's refresh rows and update the password in the same transaction. Lost claim/failure rolls everything back. Preserve issuance cooldown.
- Success: `200 { message: 'Password updated. Please sign in.' }`. Unknown/used/expired/malformed token: uniform `400` with `'This reset link is invalid or has expired. Please request a new one.'`; no owner or token-state distinctions. Password/confirmation failures are actionable field 400s.
- After commit, **B's controller** expires the HttpOnly `refresh_token` cookie via existing `clearRefreshCookie(res)` and its path/security attributes. C never uses JavaScript to remove it.

### Retry wire contract (F emits, C consumes, D verifies)

Every IP-limit 429 retains the standard error envelope and includes `Retry-After: N`, where N is integer delta-seconds `max(1, ceil((earliestRetainedAdmission + 60 seconds - checkedAt) / 1 second))`, calculated under F's bucket lock from fresh server time. N is 1–60 for this rolling window. No account cooldown enters this value. No retry body extension or HTTP-date representation is used.

F sets the header before throwing the 429 so the existing exception filter preserves it, and adds `Retry-After` to explicit CORS `exposedHeaders` in `apps/api/src/main.ts` while retaining the allowed origin and credentials. F tests the actual filtered HTTP response. C accepts only a decimal integer 1–60 from response headers, uses 60 seconds when absent/malformed/out of range, and measures waiting from receipt with a monotonic clock. No automatic resubmission occurs; retry becomes available after the wait. Network/503 failures use manual retry without a rate-limit countdown. D checks JavaScript readability from the configured separate web origin, generic account-independent values, and retained token/session state.

### Representation and browser entry

`randomBytes(32).toString('base64url')` produces the raw token; SHA-256 of raw is stored as hex. The browser sends raw in the intended reset POST; only the server hashes it for lookup. No client-side hashing or double hashing.

Use trusted, validated `FRONTEND_URL` (HTTPS in production) and `/reset-password#token=<raw>`. A fragment is absent from the initial HTTP request but can be visible to browser JavaScript/history. C captures into memory, replaces the displayed URL, never persists the token, and clears it after success or the specific invalid-token response. Field/transport/429 failures preserve it for retry. Both routes are outside `PublicRoute`/`ProtectedRoute` and support signed-in/signed-out entry.

### Session semantics and ordering

The user explicitly approved retaining the existing JWT-expiry window on 2026-10-14: previously-issued access JWTs may remain valid for their remaining configured TTL (default 15 minutes). Do not promise immediate denial on protected endpoints; no denylist is introduced.

E makes session creation/rotation participate in the same owner-first protocol as A/B: login rechecks the verified password-hash snapshot under the lock; refresh re-reads/claims tokens under the lock. JWT signing occurs under the lock, and results are returned only after commit. Reset-first rejects stale credentials; session-first may return 200 (even delivered later), but reset revokes its newly-created refresh row/successor. All post-reset renewal attempts using those credentials fail. Fresh logins with the **new** password are allowed.

G drains existing single-flight refresh and pauses automatic refresh before the reset POST. On success it advances a shared session generation, clears local token/user and rejects stale API token-store writes and context restores; C then navigates to login with a consumed-once notice. Draining before the reset also prevents an earlier refresh response from overwriting the expiry cookie. D proves server and browser behavior; no instantaneous cross-tab JWT withdrawal is claimed.

## Definition of Done and release

Every child references the [shared DoD](../../../epics/README.md). Backend A/B/E/F own applicable validation, business rules and API/migration documentation; G owns shared browser-session/client contract; H owns DB fixtures, I/J own automated database suites; C owns UI states, keyboard/focus/announcements and mobile/desktop behavior; D performs integrated item 10 and records real evidence. Academic-data scoping is N/A within this public recovery flow, but every credential mutation is confined to its stored owner.

## Out of scope

Immediate access-JWT invalidation (approved residual window), durable email queues, automatic mail retries, profile/email changes, unrelated API-wide rate limits and session-management UI. Per-IP recovery protection is **in scope in F**, not deferred. No application implementation, test pass or tracker sync is established by this document.
