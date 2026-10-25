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

## Stories

| Story | Title | Status | Depends on |
|---|---|---|---|
| SP-116 | Playwright infrastructure + login smoke test | Queued | — |
| SP-117 | Auth journey coverage (register, logout, session) | Queued | SP-116 |
| SP-118 | Semester & course management E2E coverage | Queued | SP-116 |

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

Backlog items are deliberately not scheduled; they should be picked up when
the corresponding features stabilize or when a regression justifies the cover.

## Decisions

- 2026-10-25: Run E2E against the real API + Postgres (no mocks). Rationale:
  the suite's value is proving the wired stack; a mocked API would only test
  the frontend in isolation, which unit tests already cover. Test DB keeps
  runs isolated.
- 2026-10-25: Chromium-only for now. Rationale: fastest feedback; broaden
  browsers only if a cross-browser defect appears.

## Quality gate

- Every story lands with its test green locally (`pnpm test:e2e`) and does not
  break the other stories' runs.
- No story marks the suite "green" while skipping failing checks.

## Execution queue

Delivery home: `docs/stories/EP09/` · Artifact root: `docs/stories/EP09/artifacts/`
Active substory: None · Next substory: SP-119 (plan — autopilot run in progress; see Autopilot section)

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| SP-116 | Implemented — awaiting parent review | None | Await EP09 parent review | `artifacts/SP-116/implementation.md` |
| SP-117 | Implemented — awaiting parent review | SP-116 (met) | Await EP09 parent review | `artifacts/SP-117/implementation.md` |
| SP-118 | Implemented — awaiting parent review | SP-116 (met) | Await EP09 parent review | `artifacts/SP-118/implementation.md` |

## Autopilot

**Scope and entry:** EP09 parent review unit — children SP-116/117/118 (implemented, `awaiting parent review`) + new child **SP-119** (E2E test-data cleanup / dedicated test database). Entry: user request 2026-10-25 — "plan and implement data cleanup as autopilot", resolving the carried findings SP-116 F5 / SP-117 F4 / SP-118 F4. No explicit user limits; standard tracker/database/deployment authorization boundaries apply. The user's "ok" on SP-117 F1 (AC1 wording vs. SP-102 flow) and SP-118 F2 (course removal = archive) defers both to the final parent review for disposition — no implementation work requested for them.

**Coordinator:** branch `main`, run 2026-10-25 (data-cleanup run); Git baseline `c52ebf2` (before the first included change, SP-116's `2659504`) — retained until the parent implementation index owns the combined scope.

**Stage:** plan

**Active dispatch:** `sp119-plan` — planner, fresh isolated context: plan SP-119 (story file + EP09 queue row + EP03 anticipated-ID reconciliation); dispatch running.

**Last result / retry state:** none yet — first dispatch of this run.

**Resume:** await planner return → verify story file/queue → commit planner output → whole-plan review (EP09 has no `plan-review.md`; SP-119 is a scope addition within the epic's documented dedicated-test-DB scope) → implement SP-119 (fresh implementer) → refresh parent index → final EP09 parent review (fresh reviewer; also disposes SP-117 F1 / SP-118 F2) → close.
