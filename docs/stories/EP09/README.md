# E2E Test Automation — Stories

Parent epic: [EP09: E2E Test Automation](../../epics/EP09-e2e-test-automation.md)

## Purpose

Browser end-to-end coverage for StudyPilot: real-browser journeys against the
real API and database so wiring regressions (routing, auth, API contracts,
persistence) are caught before release.

## Environment contract (applies to all E2E stories)

- Tests run against the **real stack**: Vite dev server (port 3000, proxying
  `/api`), NestJS API (port 4000), Postgres. No API mocking in E2E tests.
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
| SP-116 | Playwright infrastructure + login smoke test | Implemented — awaiting parent review | — |
| SP-117 | Auth journey coverage (register, logout, session) | Implemented — awaiting parent review | SP-116 |
| SP-118 | Semester & course management E2E coverage | Implemented — awaiting parent review | SP-116 |
| SP-119 | E2E dedicated test database + self-contained test stack | Ready | SP-116 |

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
| Infrastructure | Dedicated `*_e2e_test` database + own API/web instances; dev stack untouched; per-run drop | SP-119 | Planned (resolves SP-116 F5 / SP-117 F4 / SP-118 F4) |

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
Active substory: None · Next substory: SP-119 (implement — plan complete 2026-10-25, all decisions settled; autopilot run in progress, see Autopilot section)

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| SP-116 | Implemented — awaiting parent review | None | Await EP09 parent review | `artifacts/SP-116/implementation.md` |
| SP-117 | Implemented — awaiting parent review | SP-116 (met) | Await EP09 parent review | `artifacts/SP-117/implementation.md` |
| SP-118 | Implemented — awaiting parent review | SP-116 (met) | Await EP09 parent review | `artifacts/SP-118/implementation.md` |
| SP-119 | Ready | SP-116 (met) | Implement (autopilot run in progress) | `SP-119-e2e-dedicated-test-database.md` |

## Plan correction log

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PC-EP09-01 | 2026-10-25 | Low | `docs/stories/EP03/README.md`, "Anticipated IDs" note | The note reserved SP-116…SP-119 for future EP03 stories 4–7, but SP-116/117/118 were already consumed by EP09 (implemented) without updating the note. | Shifted the anticipated range to SP-120…SP-123 and recorded which IDs EP09 consumed, including SP-119 added by this planning turn. | SP-113/114/115 belong to EP03 stories 1–3; SP-116/117/118/119 all exist as EP09 stories (queue rows + story files). No ID collision remains. | Fixed in plan |

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
| 9. Correction log | Pass | PC-EP09-01 recorded and verified. No prior plan review exists for EP09 (`plan-review.md` absent); the whole-plan review after this addition is the coordinator's next step. |
| 10. Jira identity/sync | Not applicable | No sync authorized for this turn. SP-119 key is `Pending creation`, consistent with SP-116/117/118. |

**Outcome:** **Plan Ready** — SP-119 is `Ready` (all decisions settled, implementation prerequisites met). No application code or passing tests are claimed.

## Final implementation review unit

- **Parent:** EP09 — `docs/stories/EP09/`
- **In scope:** SP-116, SP-117, SP-118 (implemented) and SP-119 (Ready).
- **Integration/index owner:** parent implementation index `artifacts/EP09/implementation.md` (currently covers SP-116/117/118; must be refreshed to include SP-119 after implementation).
- **Gate:** one combined EP09 parent review after SP-119 is implemented (fresh reviewer; also disposes SP-116 F5 / SP-117 F1 / SP-117 F4 / SP-118 F2 / SP-118 F4 / SP-118 F5). Child completion never signs off the parent. See the Autopilot run record for dispatch sequencing.

## Autopilot

**Scope and entry:** EP09 parent review unit — children SP-116/117/118 (implemented, `awaiting parent review`) + new child **SP-119** (E2E test-data cleanup / dedicated test database). Entry: user request 2026-10-25 — "plan and implement data cleanup as autopilot", resolving the carried findings SP-116 F5 / SP-117 F4 / SP-118 F4. No explicit user limits; standard tracker/database/deployment authorization boundaries apply. The user's "ok" on SP-117 F1 (AC1 wording vs. SP-102 flow) and SP-118 F2 (course removal = archive) defers both to the final parent review for disposition — no implementation work requested for them.

**Coordinator:** branch `main`, run 2026-10-25 (data-cleanup run); Git baseline `c52ebf2` (before the first included change, SP-116's `2659504`) — retained until the parent implementation index owns the combined scope.

**Stage:** plan fix

**Active dispatch:** `ep09-plan-fix-1` — planner, fresh isolated context: apply plan-review pass 1 corrections PR-001/PR-002 (mandatory) + PR-003/PR-004 (optional polish, same turn) — dispatch pending. Prior dispatches: `sp119-plan` (returned: story file + queue + contract + EP03 ID shift, coordinator-committed `5cad9c7`); `ep09-plan-review` (returned: **Changes Required** — `plan-review.md` saved, coordinator-committed `9d3f546`).

**Last result / retry state:** whole-plan review pass 1 (`plan-review.md`, reviewed at `5cad9c7`): **Changes Required** — PR-001 (Gate line omits carried SP-117 F2), PR-002 (D119-5 fail-fast wording vs. AC5 external-stack semantics); optional PR-003/PR-004. All ten planning gates independently assessed Pass/N-A; no planner code claim found false. Correction cycle 1 of max 2 without progress.

**Resume:** planner applies PR-001…PR-004 → fresh focused re-review (pass 2, corrected lines only) → on `Plan Ready`: implement SP-119 (fresh implementer; reviewer watch items O-3/O-4/O-5 apply) → refresh parent index (O-1) → final EP09 parent review (fresh reviewer; disposes all carried findings per the corrected Gate line) → close.
