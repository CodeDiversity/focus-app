# SP-105D: Password Reset — Cross-Layer Integration

**Story ID:** SP-105D
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Priority:** High / P0
**Layer / owner:** Integration (backend + frontend, real PostgreSQL + real SMTP); `implementer` (single sequential writer; layer is a scope label)
**Dependencies:** [SP-105A](./SP-105A-password-reset-backend-issuance.md), [SP-105B](./SP-105B-password-reset-backend-redemption.md), [SP-105C](./SP-105C-password-reset-frontend-ui.md), [SP-105E](./SP-105E-auth-session-coordination.md), [SP-105F](./SP-105F-password-reset-ip-limits.md) plus G, H, I and J — **all implemented** (awaiting the combined SP-105 parent review)
**Jira key:** Pending creation (child of STUDY-7)
**Refined:** 2026-10-16
**Status:** Ready for implementation — refined 2026-10-16 (one cohesive multi-window sign-off; manual browser DoD 10, no automation runner)
**Review unit:** one combined SP-105 review after every child, including D, is implemented. D performs DoD 10 and prepares the parent index; the formal review resolves to `./artifacts/SP-105/review.md`. D does not require its own child review.

## Summary

One integrated sign-off session after all automated prerequisites pass. A **verification** story, not a feature or harness-construction story. It wires the already-built backend (SP-105A/B) and frontend (SP-105C) together and proves, against a real PostgreSQL database and real local SMTP, the guarantees that mocks cannot: the single-use / one-success concurrency invariants, session revocation, and the full end-to-end recovery flow. It performs the **DoD 10** integrated development review and records evidence in the artifacts.

### Sizing and implementation boundary

- **Outcome:** the SP-105 password-reset feature is signed off in an integrated environment — the landed H/I/J suites are executed on a disposable real-PostgreSQL target, the manual real-browser + Mailpit cross-layer smoke and the DoD 10 review are performed and recorded, the AC6 timing review is captured, and the parent implementation index is prepared so the parent can be marked `ready for review`.
- **Time estimate:** one cohesive multi-window verification task, ~2–4 hours total rather than a single 30–90-minute slice, split into the three checkpoints below. The outcome is one coordinated sign-off and its evidence package, so it is not split into sibling stories; the uncertainty is the human-dependent manual step (Mailpit + a real browser) and any prerequisite suite failure, which returns to the owning child rather than being patched here.
- **Files:** no production, schema, migration, harness, `package.json`, or CI change. Write `./artifacts/SP-105D/checkpoint.md` and `./artifacts/SP-105D/implementation.md` (new, stable-ID layout). The parent index is `./artifacts/SP-105/implementation.md`; the combined review lands at `./artifacts/SP-105/review.md`. Execute, unchanged, `apps/api/src/modules/auth/testing/recovery-db-harness.integration.spec.ts` (H), `apps/api/src/modules/auth/password-reset.integration.spec.ts` (I), and `apps/api/src/modules/auth/recovery-rate-limit.integration.spec.ts` (J).
- **Start context:** this story; EP01 and shared DoD item 10; the parent shared contract in `SP-105-password-reset.md`; H/I/J [implementation artifacts](./artifacts/) and their suite paths above; `apps/api/src/modules/auth/password-reset.service.ts`, `auth.service.ts`, `recovery-rate-limit.store.ts`; `docker-compose.yml` (Mailpit); `.github/workflows/ci.yml` (postgres:15 service, `prisma migrate deploy` before tests); the SP-105C web reset and login screens.
- **Verification:** from the repo root, with a disposable `TEST_DATABASE_URL` whose database name ends in `_test`: `pnpm --filter @studypilot/api db:generate`; `DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @studypilot/api exec prisma migrate deploy`; `pnpm --filter @studypilot/api run test:integration --runInBand` (all H/I/J suites green, zero skips); `pnpm --filter @studypilot/api test --runInBand`; `pnpm --filter @studypilot/api typecheck`; the SP-105C web test/typecheck commands; the manual Mailpit + browser checklist; and the AC6 bounded timing sample. An unavailable `_test` database or an unreachable Mailpit fails or blocks the step — it is never a skip or a mock pass.
- **Dependencies / exclusions:** A/B/C/E/F/G/H/I/J are implemented (all awaiting the combined parent review). Feature gaps found here are filed back to A/B/C/E/F, never patched in D. SP-103's outstanding integrated evidence is a separate feature/release gate recorded in the artifact, not a D blocker. One sequential `implementer` owns D.

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

H owns the real-Postgres harness (`testing/recovery-db-harness.ts`, `testing/recovery-db-harness.integration.spec.ts`); I owns the credential/expiry/rollback/login/refresh ordering suite (`password-reset.integration.spec.ts`); J owns shared-limiter races and failure paths (`recovery-rate-limit.integration.spec.ts`). All three are now **implemented** — see their [implementation artifacts](./artifacts/) — and CI already supplies postgres:15-alpine and migrations before Jest. Their passing `pnpm --filter @studypilot/api run test:integration --runInBand` command is the entry criterion for D; if any suite is missing or failing, D is blocked and returns the gap to that child.

D runs those suites and records results rather than recreating them. Measure eligible/unknown/cooled-down HTTP timing on the same environment with SMTP unresolved/rejected and record sampling method, min/median/max, residual risk and security assessment. No constant-time guarantee is inferred. An unacceptable result blocks sign-off and returns to A.

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
- Run the existing API/web test + typecheck commands; record commands, results, migration evidence, and the concurrency/E2E evidence in `./artifacts/SP-105D/implementation.md`.
- Use each child's stable story-ID artifact directory (`./artifacts/SP-105H/`, `./artifacts/SP-105I/`, `./artifacts/SP-105J/`, …); do not treat the parent key as every child's implementation ticket. The integration artifact may link the child evidence. The read-only reviewer returns Markdown; the parent saves it to `./artifacts/SP-105/review.md` per the layout in `docs/artifacts/README.md`.

### Relevant files

- H harness (`apps/api/src/modules/auth/testing/recovery-db-harness.ts`) and the I/J integration suites — implemented by prerequisites; execute here.
- CI workflow — `prisma migrate deploy` ordered before the test step; `postgres:15` service (SP-104 precedent).
- `docker-compose.yml` — reuse SP-103's Mailpit service for the SMTP smoke.
- `./artifacts/SP-105D/implementation.md` — evidence record; `./artifacts/SP-105/implementation.md` — parent index. Do not fabricate a Jira key.

### Decisions

- **D1 — verification only (2026-10-14):** SP-105D is a verification story; it executes prerequisite tests + performs the review, and files any feature gap back to A/B/C/E/F rather than changing feature code.
- **D2 — DoD 10 here (2026-10-14):** DoD 10 = the integrated development review performed here (real DB + SMTP + viewports + keyboard), recorded in artifacts; the read-only reviewer returns Markdown for the parent to save as `review.md`.
- **D3 — real PostgreSQL (2026-10-14):** real-database tests use the live `postgres:15` service; SP-105B concurrency mechanisms must be checked at the database, satisfying the "mocked transactions alone do not prove PostgreSQL behavior" rule.
- **D4 — one story (2026-10-16):** D stays one cohesive multi-window sign-off story with the three checkpoints below, not split into siblings; the sign-off is one coordinated outcome under one implementer and one combined parent review.
- **D5 — no automation runner (2026-10-16):** no browser-automation harness is added; the manual real-browser review stays as D's DoD 10 method.
- **D6 — manual evidence ownership (2026-10-16):** a human with a browser and Mailpit runs the numbered manual procedure and returns results; the implementer transcribes them verbatim. D is not `implemented` until that evidence is recorded.
- **D7 — SP-103 gate (2026-10-16):** SP-103's outstanding integrated DoD 1/7/10 evidence is recorded in D's artifact as a separate feature/release gate; it does not block D's execution or sign-off claim.
- **D8 — timing standard (2026-10-16):** AC6 uses a recorded bounded sample per path class (eligible / unknown-account / cooled-down) — min/median/max, the exact command, and a security assessment; no constant-time guarantee is claimed.
- **D9 — callouts (2026-10-16):** no further callouts were supplied; the user asked for a minimal refinement.

### Checkpoints and resume inputs

1. **Prerequisite execution (AC2, AC3).** Run the H/I/J suites unchanged against a migrated disposable `_test` PostgreSQL target with `pnpm --filter @studypilot/api run test:integration --runInBand`, plus ordinary `test` and `typecheck`. Record commands and results, then write `./artifacts/SP-105D/checkpoint.md`. Resume inputs: this story, the H/I/J [implementation artifacts](./artifacts/), and the three suite paths.
2. **Manual cross-layer smoke + DoD 10 (AC1, AC4, AC5, AC7).** With Mailpit + Postgres + API + web running, register a student, request a reset, capture the Mailpit link, consume `/reset-password#token=…`, set a new password, and re-login; then perform the signed-in/signed-out entries, missing/malformed/expired/used tokens, duplicate submissions, keyboard-only completion, and real viewports. Human-run per D6; record browser/version and evidence. Resume inputs: `docker-compose.yml` Mailpit, the SP-105C screens, and the DoD 10 checklist above.
3. **Timing review + parent index (AC6, sign-off).** Capture the AC6 bounded sample per path class, write `./artifacts/SP-105D/implementation.md`, prepare the parent `./artifacts/SP-105/implementation.md` index, and mark the parent `ready for review`. Resume inputs: the timing command and the child implementation artifacts.

### Out of scope

- Any product feature change (SP-105A/B/C/E/F); JWT denylist; durable email queues; refresh-token pruning.
