# E2E Test Automation — Stories

Parent epic: [EP09: E2E Test Automation](../../epics/EP09-e2e-test-automation.md)

## Purpose

Browser end-to-end coverage for StudyPilot: real-browser journeys against the
real API and database so wiring regressions (routing, auth, API contracts,
persistence) are caught before release.

## Environment contract (applies to all E2E stories)

- Tests run against the **real, unmocked stack** — a Vite dev server proxying
  `/api` to the NestJS API, plus Postgres. No API mocking in E2E tests.
  (Default self-contained runs use test-only instances on ports 3100/4100 —
  see the SP-119 bullet below; the dev-stack ports 3000/4000 are the target
  only in `E2E_BASE_URL` external-stack mode.)
- A dedicated test database (or throwaway schema) is used so runs never
  destroy developer data; the suite seeds its own users and cleans up what it
  creates.
- Tests must not depend on execution order and must clean up or namespace
  their data (unique email prefixes per run).
- **SP-119 implements this contract as a self-contained run**: `pnpm test:e2e`
  starts its own test instances (web :3100, API :4100) against a dedicated
  `*_e2e_test` database that is created, migrated, and dropped after each run —
  the developer stack is neither required nor touched. Setting `E2E_BASE_URL`
  runs against an externally provided stack instead and skips the
  self-contained servers and database lifecycle.

## Stories

| Story | Title | Status | Depends on |
|---|---|---|---|
| SP-116 | Playwright infrastructure + login smoke test | Reviewed (EP09 complete, 2026-10-25) | — |
| SP-117 | Auth journey coverage (register, logout, session) | Reviewed (EP09 complete, 2026-10-25) | SP-116 |
| SP-118 | Semester & course management E2E coverage | Reviewed (EP09 complete, 2026-10-25) | SP-116 |
| SP-119 | E2E dedicated test database + self-contained test stack | Reviewed (EP09 complete, 2026-10-25) | SP-116 |

## Test inventory (coverage map)

| Area | Flow | Covered by | Status |
|---|---|---|---|
| Auth | Register → auto-login/redirect | SP-117 | Implemented with SP-117 (actual flow: register → login → session, F1) |
| Auth | Login (valid credentials) | SP-116 | Implemented with SP-116 |
| Auth | Login (invalid credentials error) | SP-117 | Implemented with SP-117 (unknown-email path added; wrong-password in SP-116) |
| Auth | Logout returns to login, protected route redirects | SP-117 | Implemented with SP-117 |
| Auth | Protected route redirects unauthenticated visitor | SP-117 | Implemented with SP-117 |
| Semesters | Create, edit, delete semester | SP-118 | Implemented with SP-118 |
| Courses | Create, edit, delete course | SP-118 | Implemented with SP-118 (course removal = confirmed archive/restore — the product has no hard delete, F2) |
| Dashboard | Renders with seeded data | Backlog | Not planned yet |
| Profile | Update profile / password | Backlog | Not planned yet |
| Tasks | Assignment CRUD journey | Backlog | Not planned yet |
| Infrastructure | Dedicated `*_e2e_test` database + own API/web instances; dev stack untouched; per-run drop | SP-119 | Implemented with SP-119 (per-run create/migrate/drop; 5 consecutive green runs; dev DB verified untouched — resolves SP-116 F5 / SP-117 F4 / SP-118 F4) |

Backlog items are deliberately not scheduled; they should be picked up when
the corresponding features stabilize or when a regression justifies the cover.

## Decisions

- 2026-10-25: Run E2E against the real API + Postgres (no mocks). Rationale:
  the suite's value is proving the wired stack; a mocked API would only test
  the frontend in isolation, which unit tests already cover. Test DB keeps
  runs isolated.
- 2026-10-25: Chromium-only for now. Rationale: fastest feedback; broaden
  browsers only if a cross-browser defect appears.
- 2026-10-25: E2E runs are **self-contained** (SP-119) — a dedicated
  `*_e2e_test` database + test-only API (:4100) + test-only web (:3100)
  launched by Playwright, database dropped after each run; the developer stack
  is never required or touched. Rationale: a structural guarantee for the
  environment contract and epic AC1 (only Postgres running as prerequisite);
  runtime cleanup and throwaway-schema alternatives rejected (full trade-off in
  the SP-119 story's Decisions D119-1…D119-5).

## Quality gate

- Every story lands with its test green locally (`pnpm test:e2e`) and does not
  break the other stories' runs.
- No story marks the suite "green" while skipping failing checks.

## Execution queue

Delivery home: `docs/stories/EP09/` · Artifact root: `docs/stories/EP09/artifacts/`
Active substory: None · Next substory: None (EP09 complete — final parent review passed 2026-10-25, `review.md`)

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| SP-116 | Reviewed | None | None — EP09 complete | `artifacts/SP-116/implementation.md` · `review.md` |
| SP-117 | Reviewed | SP-116 (met) | None — EP09 complete | `artifacts/SP-117/implementation.md` · `review.md` |
| SP-118 | Reviewed | SP-116 (met) | None — EP09 complete | `artifacts/SP-118/implementation.md` · `review.md` |
| SP-119 | Reviewed | SP-116 (met) | None — EP09 complete | `artifacts/SP-119/implementation.md` · `artifacts/SP-119/checkpoint.md` · `review.md` · `walkthrough.md` |

## Plan correction log

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PC-EP09-01 | 2026-10-25 | Low | `docs/stories/EP03/README.md`, "Anticipated IDs" note | The note reserved SP-116…SP-119 for future EP03 stories 4–7, but SP-116/117/118 were already consumed by EP09 (implemented) without updating the note. | Shifted the anticipated range to SP-120…SP-123 and recorded which IDs EP09 consumed, including SP-119 added by this planning turn. | SP-113/114/115 belong to EP03 stories 1–3; SP-116/117/118/119 all exist as EP09 stories (queue rows + story files). No ID collision remains. | Fixed in plan |
| PC-EP09-02 | 2026-10-25 | Should-fix (plan review pass 1, PR-001) | `docs/stories/EP09/README.md`, final implementation review unit — Gate line | The Gate line's "disposes" list (SP-116 F5 / SP-117 F1 / SP-117 F4 / SP-118 F2 / SP-118 F4 / SP-118 F5) omitted carried finding SP-117 F2 (lost-output e2e failure, open/monitored per `artifacts/EP09/implementation.md`); a final reviewer working from the README alone could skip recording its disposition. | Gate line now enumerates all five carried findings — cleanup trio SP-116 F5 / SP-117 F4 / SP-118 F4, SP-117 F1, SP-117 F2, SP-118 F2, SP-118 F5 — with their expected dispositions; SP-117 F2 annotated open/monitored. | Gate line re-read against `artifacts/EP09/implementation.md` "Open findings carried into the review" — all five groups present, dispositions match the parent index (trio closed by SP-119; SP-117 F1 / SP-118 F2 user-deferred; SP-117 F2 monitored; SP-118 F5 note). | Fixed — verified closed at pass 2 (`plan-review.md`, 2026-10-25, reviewed at `1f3b269`) |
| PC-EP09-03 | 2026-10-25 | Should-fix (plan review pass 1, PR-002) | `SP-119-e2e-dedicated-test-database.md`, D119-5 | D119-5 stated the fail-fast tail unconditionally as "ensure Postgres is running", conflicting with AC5's promise to preserve SP-116 AC2 semantics in `E2E_BASE_URL` external-stack mode — a dead external stack would get advice pointing at the wrong cause. | D119-5 now makes the fail-fast tail mode-conditional: self-contained (default) → "ensure Postgres is running"; `E2E_BASE_URL` set → keep the SP-116 AC2 semantics ("the externally provided stack at `<E2E_BASE_URL>` must be running"). | D119-5 re-read against AC5 and SP-116 AC2 — both modes keep an actionable, correct-cause message; the decision and the AC no longer contradict. | Fixed — verified closed at pass 2 (`plan-review.md`, 2026-10-25, reviewed at `1f3b269`) |
| PC-EP09-04 | 2026-10-25 | Polish (plan review pass 1, PR-003) | `docs/stories/EP09/README.md`, Environment contract — bullet 1 | Bullet 1 named the dev-stack ports (3000/4000) as the stack tests run against, while the SP-119 bullet below makes 3100/4100 the default — the two bullets could be read as describing different stacks. | Bullet 1 is now port-agnostic (real, unmocked stack: Vite proxying `/api` to the NestJS API, Postgres) and annotates 3000/4000 as the `E2E_BASE_URL` external-stack targets. | Bullet 1 re-read against the SP-119 bullet — the default run no longer reads as requiring the dev stack. | Fixed — verified closed at pass 2 (`plan-review.md`, 2026-10-25, reviewed at `1f3b269`) |
| PC-EP09-05 | 2026-10-25 | Polish (plan review pass 1, PR-004) | `SP-119-e2e-dedicated-test-database.md`, AC3/AC4 | AC3 named only "Postgres must be running" and AC4 left the root README wording unspecified, though the true prerequisite chain is `pnpm install` + `apps/api/.env.local` (with a `DATABASE_URL` whose database exists) + `pnpm db:generate` + Postgres running — epic AC1's "documented prerequisites" would be literally incomplete. | AC3 now requires the fail-fast message to distinguish Postgres-unreachable from configured-dev-DB-missing; AC4 now specifies the root README wording lists the one-time setup prerequisites alongside "Postgres running; no `pnpm dev` needed"; Notes and Sizing verification gain the missing-DB fail-fast case. | AC3/AC4 re-read against epic AC1 and the verified root `db:generate` script — the planned README/message wording covers the full chain. | Fixed — verified closed at pass 2 (`plan-review.md`, 2026-10-25, reviewed at `1f3b269`) |
| PC-EP09-06 | 2026-10-25 | Polish (plan review pass 2, PR-005) | `SP-119-e2e-dedicated-test-database.md`, Sizing — Files line | Files line lists the message-wording change as `helpers.ts` + `login.spec.ts`, but `auth-journeys.spec.ts` also carries the stale "Start the dev stack with `pnpm dev`" wording in two places (lines 34-35, 42) | Applied: Files line now includes `auth-journeys.spec.ts`; D119-5 tightened from "the three specs" to the verified footprint (the specs that carry the stale fail-fast wording: `login.spec.ts`, `auth-journeys.spec.ts`) + `helpers.ts`. The `auth-journeys.spec.ts:6` header-comment refresh ("via the running dev stack") is a comment in a test file — outside the planner's docs/ write boundary — deferred to the SP-119 implementer, who touches that file for the fail-fast wording | Files line + D119-5 re-read against the verified stale-wording footprint: `helpers.ts` (`describeSetupFailure`), `login.spec.ts` (lines 33-35, 44-46), `auth-journeys.spec.ts` (lines 34-35, 42) carry it; `semesters-courses.spec.ts` carries none (grep-verified) | Fixed — applied after pass 2 (polish; verdict `Plan Ready` stands) |
| RV-EP09-01 | 2026-10-25 | Should-fix (carried from SP-116 F5 / SP-117 F4 / SP-118 F4) | `artifacts/SP-116/implementation.md` F5, `artifacts/SP-117/implementation.md` F4, `artifacts/SP-118/implementation.md` F4 | Runs leaked `e2e-*` user/entity rows into the developer database with no cleanup (no user-deletion endpoint; direct-DB cleanup needed env wiring outside the tests-only child scopes) | Disposed by SP-119: per-run dedicated `*_e2e_test` database (created + migrated in global setup, dropped in global teardown) — a structural fix; no run can leak anymore | `review.md` (2026-10-25) against recorded scope-B evidence: dev DB byte-identical across 5 consecutive runs + 3 simulations (478/64/48 historical rows unchanged); `studypilot_e2e_test` absent after every run | **Closed** (final parent review, PASS) — the 478/64/48 historical rows remain as an optional one-time manual cleanup for the user (`DELETE FROM users WHERE email LIKE 'e2e-%';` — children cascade) |
| RV-EP09-02 | 2026-10-25 | Note (carried from SP-117 F1) | `artifacts/SP-117/implementation.md` F1 | AC1 wording ("registration → session") conflicts with the product's deliberate SP-102 register→login flow (no auto-login) | Accepted as-is: the test covers the real journey end-to-end (register → toast → `/login` → login → authenticated app); the AC wording is a documentation-level mismatch, not a defect. User deferral of 2026-10-25 ("ok") recorded in the Autopilot section; disposition recorded by the final parent review | `review.md` re-read `auth-journeys.spec.ts` (current text) — the register test asserts the SP-102 flow exactly | **Recorded — accepted** (non-blocking; optional planner follow-up: reword the SP-117 AC or schedule an auto-login product story) |
| RV-EP09-03 | 2026-10-25 | Note (carried from SP-118 F2) | `artifacts/SP-118/implementation.md` F2 | AC4's "deleting a course" vs. product decision D111-2 (no hard delete — "nothing is ever deleted") | Accepted as-is: the covered course-removal journey is the product's confirmed archive/restore with its own confirmation dialogs (guards used as-is); semester hard-delete covered as written. User deferral of 2026-10-25 ("ok") recorded in the Autopilot section; disposition recorded by the final parent review | `review.md` re-read `semesters-courses.spec.ts` (current text) — archive → show-archived → restore, all confirmed dialogs | **Recorded — accepted** (non-blocking; optional planner follow-up: reword the AC to name archive/restore) |
| RV-EP09-04 | 2026-10-25 | Should-fix (carried from SP-117 F2, open/monitored) | `artifacts/SP-117/implementation.md` F2 | One lost-output e2e failure observed once (~run 2 of the first repeat batch, before log capture); root cause never identified | Closed on the Gate line's own condition — sustained green runs with report capture in place: 39 consecutive greens after the single failure, then SP-119's 5 consecutive 14/14 greens on the final self-contained stack (53+ total; never reproduced), and `reporter: [['list'], ['html', { open: 'on-failure' }]]` + `screenshot: 'on'` capture any future recurrence automatically | `review.md` against the SP-117/SP-119 records + current `playwright.config.ts` (reporter/screenshot verified) | **Closed** (final parent review, PASS) |
| RV-EP09-05 | 2026-10-25 | Polish (carried from SP-118 F5) | `artifacts/SP-118/implementation.md` F5 | Helper consolidation: SP-116/SP-117 specs keep in-file register/login copies alongside the new `helpers.ts` | Disposition: optional, non-blocking — no correctness impact (each in-file copy is self-contained and carries the same mode-conditional fail-fast wording, verified in current text); consolidation would touch already-verified sibling specs for pure deduplication | `review.md` re-read `login.spec.ts` / `auth-journeys.spec.ts` / `helpers.ts` (current text) | **Recorded — optional follow-up** (a future infra touch; verdict stands) |
| RV-EP09-06 | 2026-10-25 | Note (SP-119 F-119-6) | `artifacts/SP-119/implementation.md` F-119-6 | Turbo's `test:e2e` `env` allowlist declares only `E2E_BASE_URL`, so a shell-level `DATABASE_URL` is not passed to the Playwright process | By design, no action — consistent with D119-5: the harness derives everything from `apps/api/.env.local` with the API's own ConfigModule semantics; `turbo.json` needs no change. Consequence (verification only): fail-fast simulations ran the same `playwright test` entrypoint directly from `apps/web` | `review.md` re-read `turbo.json` + `test-env.ts` (current text) | **Recorded — by design, no action** |
| RV-EP09-07 | 2026-10-25 | Polish (SP-119 F-119-7) | `artifacts/SP-119/implementation.md` F-119-7 | The unreachable-Postgres fail-fast message renders an empty `()` detail (pjs wraps `ECONNREFUSED` in an `AggregateError` with an empty `message`) | Disposition: non-blocking — the message stays clear and actionable (host:port + "Ensure Postgres is running") and the two AC3 branches stay distinct, so AC3 is functionally met; surfacing the underlying detail (e.g. the `AggregateError` code) is a one-line polish | `review.md` re-read `test-env.ts` `describeDatabaseSetupFailure` (current text) | **Recorded — optional follow-up** (verdict stands) |

## Quality gate — SP-119 addition (2026-10-25)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | SP-119 is one cohesive infra outcome (~2–3 h, sizing block in the story file). No split: each sub-piece (config, global setup/teardown, Vite env, scripts) is under 30 min and only meaningful together; the three existing specs are unchanged, so no test-suite-construction work exists to separate. |
| 2. Original AC/TR coverage | Pass | Epic AC1 (clean checkout, only Postgres running) → SP-119 AC1/AC3. AC2 (documented in workflow) → SP-116 + SP-119 (README wording). AC3 (critical journeys) → SP-116/117/118 + backlog rows. AC4 (deterministic, no sleeps) → SP-116 + SP-119 (fresh DB per run, order independence). Environment contract (dedicated test DB, cleanup) → SP-119. The epic defines no separate TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | SP-119 story maps items 1/4/8/10/11 and marks 2/3/5/6/7/9 N/A with reasons (no product code/UI/migration change). Item 10 = the EP09 parent review unit below. |
| 4. Contract consistency and integration ownership | Pass | `E2E_BASE_URL` escape hatch, ports 3100/4100, `*_e2e_test` naming (matches `recovery-db-harness.ts`), and dotenv non-override semantics are consistent across the story, this README, and the epic. No production API/data contract changes. |
| 5. Code paths inspected | Pass | `apps/web/playwright.config.ts`, `apps/web/e2e/*` (3 specs + helpers), `apps/api/src/app.module.ts` (dotenv `envFilePath`), `prisma.service.ts`, `prisma.config.ts`, `recovery-db-harness.ts`, `vite.config.ts`, `turbo.json`, all three `package.json` files, root `README.md`, `nest-cli.json` — all read this turn. One implementation checkpoint disclosed: the `nest start --path` output-dir switch must be verified on first build (fallback recorded in D119-3). |
| 6. Feature-specific risks | Pass | Dev-`dist` race → separate `dist-test` outDir (D119-3). Port collision → `--strictPort` + `reuseExistingServer: false` + actionable error. Secrets → programmatic dotenv only, sanitized failure text, URL never printed (D119-2). Hard-killed run → namespaced `*_e2e_test` DB fallback, never developer data (AC2). Failed setup → idempotent create/migrate, namespaced leftover. |
| 7. Dependency mapping | Pass | SP-119 depends only on SP-116 (implemented). SP-117/118 journeys must keep passing (verification, not a code dependency). Parent review comes after SP-119 implementation. |
| 8. Material decisions | Pass | D119-1…D119-5 resolved with rationale (self-contained stack chosen over runtime cleanup / throwaway schema; lifecycle, test API build, web instance, spec-message policy all settled). |
| 9. Correction log | Pass | PC-EP09-01 recorded and verified. Whole-plan review pass 1 (`plan-review.md`, 2026-10-25) returned **Changes Required** — PR-001…PR-004 recorded below (PC-EP09-02…PC-EP09-05). Focused re-review pass 2 (`plan-review.md`, 2026-10-25, reviewed at `1f3b269`) verified all four closures — **Plan Ready**; PR-005 (polish, Files line) recorded as PC-EP09-06, non-blocking. |
| 10. Jira identity/sync | Not applicable | No sync authorized for this turn. SP-119 key is `Pending creation`, consistent with SP-116/117/118. |

**Outcome:** **Plan Ready** (confirmed at focused re-review pass 2, 2026-10-25, reviewed at `1f3b269`) — SP-119 is `Ready` (all decisions settled, implementation prerequisites met). Pass 1's PR-001/PR-002 (should-fix) and PR-003/PR-004 (polish) verified closed (PC-EP09-02…05); one new polish finding PR-005 (PC-EP09-06) is non-blocking. SP-119 dispatch may proceed. No application code or passing tests are claimed.

## Final implementation review unit

- **Parent:** EP09 — `docs/stories/EP09/`
- **In scope:** SP-116, SP-117, SP-118, SP-119 (all implemented).
- **Integration/index owner:** parent implementation index `artifacts/EP09/implementation.md` (refreshed to cover all four children, including SP-119).
- **Gate:** one combined EP09 parent review after SP-119 is implemented (fresh reviewer; disposes all five carried findings — the cleanup trio SP-116 F5 / SP-117 F4 / SP-118 F4, expected closed by SP-119's per-run database drop; SP-117 F1 (AC1 wording vs. SP-102 flow) and SP-118 F2 (course removal = archive, D111-2), user-deferred, final review records the disposition; SP-117 F2 (lost-output e2e failure), open/monitored, final review records the disposition — close on sustained green runs with report capture in place, or keep monitored; SP-118 F5 (helper consolidation), final review records the disposition). Child completion never signs off the parent. See the Autopilot run record for dispatch sequencing.
- **Result:** **PASS** (2026-10-25, `review.md`) — all ACs met (SP-119 AC1–5, SP-116/117/118, epic ACs 1–4), DoD satisfied, all five carried-finding groups disposed (RV-EP09-01…07 in the correction log), no new findings. `walkthrough.md` saved. All four stories `Reviewed`; the EP09 unit is complete.

## Autopilot

**Scope and entry:** EP09 parent review unit — children SP-116/117/118 (implemented, `awaiting parent review`) + new child **SP-119** (E2E test-data cleanup / dedicated test database). Entry: user request 2026-10-25 — "plan and implement data cleanup as autopilot", resolving the carried findings SP-116 F5 / SP-117 F4 / SP-118 F4. No explicit user limits; standard tracker/database/deployment authorization boundaries apply. The user's "ok" on SP-117 F1 (AC1 wording vs. SP-102 flow) and SP-118 F2 (course removal = archive) defers both to the final parent review for disposition — no implementation work requested for them.

**Coordinator:** branch `main`, run 2026-10-25 (data-cleanup run); Git baseline `c52ebf2` (before the first included change, SP-116's `2659504`) — retained until the parent implementation index owns the combined scope.

**Stage:** complete — final EP09 parent review passed (2026-10-25, verdict **PASS**); run closed

**Active dispatch:** none. `ep09-final-review` (reviewer, fresh isolated context: one combined final implementation review of the EP09 parent unit SP-116/117/118/119) **returned PASS** — `review.md` + `walkthrough.md` saved; all five carried-finding groups disposed (cleanup trio CLOSED by SP-119's per-run drop; SP-117 F2 CLOSED on sustained greens + report capture; SP-117 F1 / SP-118 F2 user-deferred, accepted as-is; SP-118 F5 + F-119-7 optional polish; F-119-6 by design); no new findings. Prior dispatches: `sp119-verify-closeout` (returned; coordinator-verified: all 7 matrix items pass, all 5 ACs pass, docs-only closeout `6287d74`, tree clean, dev stack unaffected); `sp119-plan` (returned; coordinator-committed `5cad9c7`); `ep09-plan-review` (returned **Changes Required**; `plan-review.md` committed `9d3f546`); `ep09-plan-fix-1` (planner applied PR-001…PR-004, added PC-EP09-02…05, coordinator-committed `9a0aeb8`); `ep09-plan-review-2` (returned **Plan Ready**; report `plan-review.md` pass 2); `sp119-plan-fix-2` (planner applied PR-005, coordinator-committed `3be364b`); `sp119-implement` (first attempt — session truncated at output-token limit **before any code was written**; left a verified, complete resume checkpoint; coordinator preserved it in `artifacts/SP-119/checkpoint.md` + status pointers, committed `9eef2fb`).

**Last result / retry state:** `ep09-final-review` **completed** — verdict **PASS** (no open blocker/should-fix; no new findings; remaining items: SP-118 F5 + F-119-7 optional polish, F-119-6 by design, SP-117 F1 / SP-118 F2 user-deferred wording notes accepted as-is). All execution evidence is implementer-recorded (5 consecutive 14/14 green self-contained runs; dev DB byte-identical; `studypilot_e2e_test` absent after every run; fail-fast sims with distinct messages; lint/typecheck/Prettier clean) — the reviewer runtime has no shell, so nothing was re-executed; code/doc evidence is reviewer-executed file reads. Reviewer persisted `review.md` + `walkthrough.md` + this README sync; **commit deferred to the coordinator** (no shell in the reviewer runtime).

**Resume:** none — run closed. The passing final review marked all four stories `Reviewed` (queue + stories table), recorded the five carried-finding dispositions (RV-EP09-01…07), and saved `review.md` + `walkthrough.md`; the coordinator commits those plus this README sync. Optional non-blocking follow-ups for a future touch: reword SP-117 AC1 / SP-118 AC4 to the actual product flows, e2e helper consolidation (SP-118 F5), one-line `AggregateError` detail (F-119-7), and the four story files' `Status` lines (the README queue is the canonical execution state).
