# SP-105D: Password Reset — Cross-Layer Integration

**Story ID:** SP-105D
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Priority:** High / P0
**Layer:** Integration (backend + frontend, real PostgreSQL + real SMTP)
**Dependencies:** [SP-105A](./SP-105A-password-reset-backend-issuance.md), [SP-105B](./SP-105B-password-reset-backend-redemption.md), [SP-105C](./SP-105C-password-reset-frontend-ui.md) , [SP-105E](./SP-105E-auth-session-coordination.md), [SP-105F](./SP-105F-password-reset-ip-limits.md) plus G, H, I and J — **all prerequisites must land first**
**Jira key:** Pending creation (child of STUDY-7)
**Refined:** 2026-10-14
**Status:** Draft — corrected; awaiting independent re-review

## Summary

One 2–4 hour integrated sign-off session after all automated prerequisites pass. A **verification** story, not a feature or harness-construction story. It wires the already-built backend (SP-105A/B) and frontend (SP-105C) together and proves, against a real PostgreSQL database and real local SMTP, the guarantees that mocks cannot: the single-use / one-success concurrency invariants, session revocation, and the full end-to-end recovery flow. It performs the **DoD 10** integrated development review and records evidence in the artifacts.

## Description

As a reviewer of the password-reset feature, I want the whole flow proven together — database locking, email delivery, browser recovery, and session invalidation — so that the security invariants hold in an integrated environment, not only in isolated unit tests.

## Acceptance Criteria

1. **End-to-end:** a student requests a reset; a **real local email** (Mailpit) carries the link; the browser reset screen consumes it; a new password is set; the student signs in with the new password while old-password login and every prior refresh family are rejected. Previously issued access JWTs may remain valid until their configured expiry under approved SD7. *(cross-layer; original SP-105 AC1–4 end-to-end)*
2. **Real-Postgres concurrency:** against a live `postgres:15` database, two concurrent redemptions of the **same** token yield exactly one success, and two **different** valid tokens for one account yield exactly one success — proving the SP-105B single-use guarantees at the database, not via mocks. *(original SP-105 AC2, concurrency)*
3. **Real-Postgres revocation:** test both lock orders: reset-first rejects stale login/refresh with 401; session-first can return 200 but reset revokes its newly-created refresh family/successor. New-password login succeeds. Delayed delivery of a pre-reset access JWT is within the approved expiry window, not a fresh credential renewal. *(original SP-105 AC4)*
4. **DoD 10 integrated development review** is performed: migration applied, signed-in **and** signed-out entry to both screens, missing/malformed/expired/used tokens, duplicate submissions, keyboard-only completion with announcements, and real desktop/mobile viewports — with evidence recorded. *(shared DoD item 10)*
5. F's real shared-store limits and account-independent 429s are verified on both endpoints; no denied request mutates credentials or sends email. C shows retry guidance and retains the reset token.
6. Issuance/redemption races, expiry-after-wait, rollback, delayed browser refresh and residual database-path timing are reviewed with recorded evidence.
7. The full flow runs from the Login link through to successful re-login with no console/auth errors and **no** raw token reaching storage, analytics, or the network beyond the intended request. *(security; SP-105C AC2/C2)*

**DoD:** Per [shared DoD](../../../epics/README.md), SP-105D **performs item 10** and **verifies 1, 5, 6, 7, 8 in the integrated environment** (real DB, real SMTP, real viewports, real keyboard). The unit-test obligations for DoD 5/6/7 remain with SP-105C; SP-105D confirms them at real fidelity. DoD 3 is N/A (public recovery flow).

## Technical Notes

### What this story does (and does not do)

- **Does:** execute H/I/J suites, run the manual cross-layer smoke, perform integrated review, and record evidence. No suite/harness construction belongs here.
- **Does not:** change product feature behavior — that belongs to SP-105A/B/C/E/F. If a gap is found, file it back to the owning child rather than patching feature code here.

### Explicit automated prerequisites

H owns new real-Postgres fixtures, independent connections, deterministic barriers and cleanup; existing CI already supplies postgres:15-alpine and migrations before Jest. I owns all credential/expiry/rollback/login/refresh ordering suites. J owns shared-limiter races and failure paths. Their linked implementation artifacts and passing commands are entry criteria for D; if missing/failing, D is blocked and returns the gap to that child.

D runs those suites and records results rather than recreating them. Measure eligible/unknown/cooled-down HTTP timing on the same environment with SMTP unresolved/rejected and record sampling method, distributions, residual risk and security assessment. No constant-time guarantee is inferred. An unacceptable result blocks sign-off and returns to A.

### Browser verification method and retry evidence

No browser automation runner is currently declared. D uses an actual browser with developer tools and manual reproducible steps, not a future unowned automation harness. Test the API from a separate configured web origin with credentials: trigger 429 for both routes, read `Retry-After` in frontend JavaScript (not only the network panel), confirm CORS exposure, same bucket-derived values for known/unknown accounts, and retain reset token/form/session while retrying after the wait. Check missing/malformed-header fallback through G/C automated tests, rather than changing production responses manually.

For delayed refresh, use the browser network response interception facility (or an equivalent recorded debugging proxy) to hold a refresh response before cookie application, start reset, verify no reset POST until the refresh is released, then verify reset expiry wins and state remains cleared. Record the browser/version and exact interception procedure; if the environment cannot hold a response before cookie application, this check is blocked rather than replaced with jsdom. No tooling implementation is hidden in D.

### Cross-layer end-to-end (real SMTP)

Integrated development smoke (SP-103's Mailpit workflow): start Mailpit + Postgres, run API + web; register a student; `POST /auth/forgot-password`; capture the email in Mailpit (`:8025`); open the `/reset-password#token=…` link; set a new password. Assert: old-password login `401`s; new password works; all prior refresh families revoked (a second device's refresh `401`s); the URL fragment was stripped from the displayed URL; the Login "Forgot password?" link resolves. Confirm no raw token appears in storage, analytics, or console.

### DoD 10 — integrated development review (this story performs it)

- Apply the SP-105A migration to the dev database.
- Verify B's reset HTTP response expires the HttpOnly cookie with the existing path/security attributes. In a real browser, delay an existing refresh response and prove C waits for it before reset; verify stale API-token writes and AuthContext restores cannot repopulate cleared state. A jsdom `document.cookie` assertion is insufficient.
- Exercise **signed-in and signed-out** entry to both screens; missing/malformed/expired/used tokens; duplicate submissions; network-failure retry.
- Exercise **keyboard-only** completion and status announcements; inspect **real** desktop/mobile viewports (CSS-class assertions alone do not establish responsiveness).
- Run the existing API/web test + typecheck commands; record commands, results, migration evidence, and the concurrency/E2E evidence in `docs/artifacts/<integration-Jira-key>/implementation.md` once its real key exists.
- Use each child's actual Jira-key artifact directory once assigned; do not treat the parent key as every child's implementation ticket. The integration artifact may link the child evidence. The read-only reviewer returns Markdown; the parent saves it to the integration issue's `review.md` per `docs/artifacts/README.md`.

### Relevant files

- H harness and I/J proposed integration suites — constructed by prerequisites; execute here.
- CI workflow — `prisma migrate deploy` ordered before the test step; `postgres:15` service (SP-104 precedent).
- `docker-compose.yml` — reuse SP-103's Mailpit service for the SMTP smoke.
- `docs/artifacts/<integration-Jira-key>/implementation.md` — evidence record after issue creation; do not fabricate a key.

### Proposed verification mechanisms (2026-10-14)

- **D1:** SP-105D is a verification story; it executes prerequisite tests + performs the review, and files any feature gap back to A/B/C/E/F rather than changing feature code.
- **D2:** DoD 10 = the integrated development review performed here (real DB + SMTP + viewports + keyboard), recorded in artifacts; the read-only reviewer returns Markdown for the parent to save as `review.md`.
- **D3:** real-database tests will use the live `postgres:15` service; SP-105B concurrency mechanisms must be checked at the database, satisfying the "mocked transactions alone do not prove PostgreSQL behavior" rule.

### Out of scope

- Any product feature change (SP-105A/B/C/E/F); JWT denylist; durable email queues; refresh-token pruning.
