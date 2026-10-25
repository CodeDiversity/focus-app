# EP09: E2E Test Automation

**Epic:** Browser end-to-end coverage for StudyPilot
**Priority:** High / P0 (quality gate for all other epics)
**Labels:** `studypilot`, `e2e`
**Depends on:** EP01–EP02 features exist to cover; grows with new features

## Goal

Provide real-browser end-to-end coverage of StudyPilot's critical user journeys
so regressions in the wired stack (web → API → database) are caught before
release. Coverage is additive: each E2E story locks in flows that unit tests
cannot verify end to end (routing, auth session handling, form-to-API-to-DB
wiring, cross-page navigation).

## Scope

- Playwright-based browser automation running against the real dev-stack
  services (Vite dev server, NestJS API, Postgres) with a dedicated test
  database so runs never mutate developer data.
- One smoke journey proving the full stack (login), then incremental coverage
  of registration, semesters/courses, and other flows as stories.
- Deterministic, isolated runs: each run seeds its own data and never depends
  on execution order.

## Out of scope

- Visual regression snapshots and cross-browser matrices beyond Chromium
  (revisit when the suite is stable).
- Load/performance testing.
- Mobile-device-farm testing (responsive checks remain manual/visual for now).

## Stories

| Story | Title | Depends on |
|---|---|---|
| SP-116 | Playwright infrastructure + login smoke test | — |
| SP-117 | Auth journey coverage (register, login state, logout) | SP-116 |
| SP-118 | Semester & course management E2E coverage | SP-116 |

## Acceptance criteria (epic level)

1. `pnpm test:e2e` runs the browser suite locally from a clean checkout with
   only the documented prerequisites (Postgres running).
2. The suite is wired into the normal developer workflow and documented in the
   repo README/docs.
3. Every critical user journey (auth, CRUD on core entities) has at least one
   automated browser path or a recorded reason why not.
4. Flaky-by-design flows (email delivery, timing) use deterministic
   substitutes, not sleeps.
