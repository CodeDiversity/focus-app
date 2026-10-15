# SP-105D: Password Reset — Cross-Layer Integration

**Story ID:** SP-105D
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Priority:** High / P0
**Layer:** Integration (backend + frontend, real PostgreSQL + real SMTP)
**Dependencies:** [SP-105A](./SP-105A-password-reset-backend-issuance.md), [SP-105B](./SP-105B-password-reset-backend-redemption.md), [SP-105C](./SP-105C-password-reset-frontend-ui.md) , [SP-105E](./SP-105E-auth-session-coordination.md), [SP-105F](./SP-105F-password-reset-ip-limits.md) — **all five must land first**
**Jira key:** Pending creation (child of STUDY-7)
**Refined:** 2026-10-14
**Status:** Draft — corrected; awaiting independent re-review

## Summary

A **verification** story, not a feature story. It wires the already-built backend (SP-105A/B) and frontend (SP-105C) together and proves, against a real PostgreSQL database and real local SMTP, the guarantees that mocks cannot: the single-use / one-success concurrency invariants, session revocation, and the full end-to-end recovery flow. It performs the **DoD 10** integrated development review and records evidence in the artifacts.

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

- **Does:** add the real-database integration tests, run the cross-layer smoke, perform the integrated review, and record evidence.
- **Does not:** change product feature behavior — that belongs to SP-105A/B/C/E/F. If a gap is found, file it back to the owning child rather than patching feature code here.

### Real-Postgres concurrency proofs (falsify the SP-105B mechanisms)

New `apps/api/src/modules/auth/password-reset.integration.spec.ts` using the **real** `PrismaService` against the CI `postgres:15` service (SP-104's CI setup; ensure `prisma migrate deploy` runs before the test step). Mocked transactions do **not** prove Postgres locking/EvalPlanQual (SP-103/SP-104 precedent):

- `two concurrent redemptions of the same token: exactly one 200, one 400` (fire in parallel against the live endpoint/service).
- `two different valid tokens for one account: exactly one 200` (the user-row `FOR UPDATE` lock + account-wide retirement proof — the counterexample that a naive read-then-write fails).
- Use deterministic barriers to test all four E orderings: login verified old hash then reset-first (no inserted family); login-first then reset (family revoked); refresh paused before owner lock then reset-first (401); refresh-first then reset (200 permitted, successor revoked). All later refresh attempts fail, new password works, other accounts remain untouched.
- Race issuance against redemption in both orders, and two eligible issuance requests across service instances. Assert no owner/token lock-order deadlock; a losing reset is uniform 400, a losing cooldown claim is generic 200 with no email. Seed two distinct valid tokens directly for redemption tests: A deliberately permits only one live token during normal issuance.
- Block an owner lock past expiry; a waiting redemption must fail using fresh post-lock time. Force password/revocation writes to fail and prove complete rollback of token/password/session state.
- Exercise F with two independent store instances at the last rolling-window slot: exactly one allowed, one 429; test both endpoints, restart persistence, spoofed proxy headers, cleanup racing requests, 503 fail-closed behavior, no mutation/email on rejection, and known/unknown response parity.
- Hold SMTP delivery unresolved: public issuance still returns; reject delivery and confirm sanitized handling. Measure eligible/unknown/cooled-down database-path timing and record the residual risk and mitigation assessment before security sign-off; do not assert constant time from async SMTP alone.
- `a second device's refresh after reset is revoked (all families dead)`; verify existing access JWTs remain usable only for the remaining configured TTL, as approved in SD7.

### Cross-layer end-to-end (real SMTP)

Integrated development smoke (SP-103's Mailpit workflow): start Mailpit + Postgres, run API + web; register a student; `POST /auth/forgot-password`; capture the email in Mailpit (`:8025`); open the `/reset-password#token=…` link; set a new password. Assert: old-password login `401`s; new password works; all prior refresh families revoked (a second device's refresh `401`s); the URL fragment was stripped from the displayed URL; the Login "Forgot password?" link resolves. Confirm no raw token appears in storage, analytics, or console.

### DoD 10 — integrated development review (this story performs it)

- Apply the SP-105A migration to the dev database.
- Verify B's reset HTTP response expires the HttpOnly cookie with the existing path/security attributes. In a real browser, delay an existing refresh response and prove C waits for it before reset; verify stale API-token writes and AuthContext restores cannot repopulate cleared state. A jsdom `document.cookie` assertion is insufficient.
- Exercise **signed-in and signed-out** entry to both screens; missing/malformed/expired/used tokens; duplicate submissions; network-failure retry.
- Exercise **keyboard-only** completion and status announcements; inspect **real** desktop/mobile viewports (CSS-class assertions alone do not establish responsiveness).
- Run the existing API/web test + typecheck commands; record commands, results, migration evidence, and the concurrency/E2E evidence in `docs/artifacts/STUDY-7/implementation.md` (parent key).
- Use each child's actual Jira-key artifact directory once assigned; do not treat the parent key as every child's implementation ticket. The integration artifact may link the child evidence. The read-only reviewer returns Markdown; the parent saves it to the integration issue's `review.md` per `docs/artifacts/README.md`.

### Relevant files

- `apps/api/src/modules/auth/password-reset.integration.spec.ts` — real-Postgres concurrency + revocation proofs (new).
- CI workflow — `prisma migrate deploy` ordered before the test step; `postgres:15` service (SP-104 precedent).
- `docker-compose.yml` — reuse SP-103's Mailpit service for the SMTP smoke.
- `docs/artifacts/STUDY-7/implementation.md` — evidence record (created/updated here).

### Proposed verification mechanisms (2026-10-14)

- **D1:** SP-105D is a verification story; it adds tests + performs the review, and files any feature gap back to A/B/C rather than changing feature code.
- **D2:** DoD 10 = the integrated development review performed here (real DB + SMTP + viewports + keyboard), recorded in artifacts; the formal reviewer writes `review.md`.
- **D3:** real-database tests will use the live `postgres:15` service; SP-105B concurrency mechanisms must be checked at the database, satisfying the "mocked transactions alone do not prove PostgreSQL behavior" rule.

### Out of scope

- Any product feature change (SP-105A/B/C/E/F); JWT denylist; durable email queues; refresh-token pruning.
