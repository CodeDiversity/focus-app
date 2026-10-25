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
| Auth | Register → auto-login/redirect | SP-117 | Planned |
| Auth | Login (valid credentials) | SP-116 | Implemented with SP-116 |
| Auth | Login (invalid credentials error) | SP-117 | Planned |
| Auth | Logout returns to login, protected route redirects | SP-117 | Planned |
| Auth | Protected route redirects unauthenticated visitor | SP-117 | Planned |
| Semesters | Create, edit, delete semester | SP-118 | Planned |
| Courses | Create, edit, delete course | SP-118 | Planned |
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
Active substory: None · Next substory: SP-117 (implement — first eligible row; needs its own authorization)

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| SP-116 | Implemented — awaiting parent review | None | Await EP09 parent review (after SP-117/SP-118) | `artifacts/SP-116/implementation.md` |
| SP-117 | Queued | SP-116 (met) | Implement auth journey coverage | — |
| SP-118 | Queued | SP-116 (met) | Implement semester/course E2E coverage | — |
