# SP-116: Playwright E2E Infrastructure + Login Smoke Test

**Story ID:** SP-116
**Epic:** [EP09: E2E Test Automation](../../epics/EP09-e2e-test-automation.md)
**Milestone:** Ongoing quality
**Dependencies:** None (covers existing EP01 auth features)
**Status:** Queued

## Summary

Introduce Playwright browser automation for the repo and prove the full stack
end to end: a smoke test that loads the app, logs in with a real user against
the real API, and lands on an authenticated page.

## Scope

- Playwright installed and configured for `apps/web` (Chromium).
- Test DB / env conventions established so E2E runs don't require manual data
  setup and don't corrupt developer data.
- One smoke test: login with valid credentials → authenticated page renders.
- Documented in the repo so the next person can run it with one command.

Explicitly out of scope: full auth coverage (SP-117), semester/course
coverage (SP-118), CI wiring beyond "it runs locally".

## Acceptance criteria

1. `@playwright/test` is a dev dependency; `pnpm test:e2e` (repo root) runs
   the suite and is documented in the repo README.
2. The suite starts against a running dev stack; a missing API/DB produces a
   clear failure, not a confusing timeout cascade.
3. The smoke test registers/uses a real user via the API, logs in through the
   real login UI, and asserts an authenticated destination renders.
4. The test is deterministic: no fixed sleeps; unique data per run; passes
   repeatedly on re-run.
5. Login failure path (wrong password) shows an error — minimal negative
   case so the smoke test isn't only a happy path.

## Technical notes

- Web dev server: Vite on port 3000 (`vite.config.ts`), proxying `/api` to
  the API on port 4000 — tests only need `http://localhost:3000`.
- Login route: `/login`; authenticated entry is `/` (dashboard/home).
- Register endpoint: `POST /api/auth/register` with `{ name, email, password }`
  (min 8 chars). Use it in a setup step to guarantee a known user instead of
  depending on seed data.
- Playwright config lives in `apps/web`; tests in `apps/web/e2e/`.

## Sizing

~1–2 hours: config + smoke test + README wiring. No new production code.
