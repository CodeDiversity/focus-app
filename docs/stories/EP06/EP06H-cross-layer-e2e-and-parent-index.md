# EP06H: Cross-Layer E2E, Regression Sweep & Parent Index

**Story ID:** EP06H
**Title:** Integration — the study-plan journey end to end against the real stack, the regression sweep, and the EP06 parent implementation index
**Parent epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Parent:** [EP06 breakdown](./README.md)
**Milestone:** M3
**Layer:** Integration
**Status:** Queued
**Dependencies:** **EP06A, EP06B, EP06C, EP06D, EP06E, EP06F and EP06G** implemented. The EP09 self-contained E2E stack (Postgres + API + web on ports 3100/4100) must be runnable.
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

## Summary

One Playwright suite proves the epic's cross-layer behaviour against the real stack: a student sets their study defaults, generates a week, sees the proposal, moves and deletes a proposed session, saves the plan, reloads and finds it persisted — and sees the deficit warning when the work does not fit before its deadline. The same suite pins the cross-student isolation through the wired API, and produces the EP06 parent implementation index that the combined review needs.

## Description & bounded scope

### In scope

1. **A new Playwright spec** `apps/web/e2e/study-plan.spec.ts` against the self-contained EP09 stack, covering:
   - **the journey** — register/log in → open `/profile` → set the study preferences → open `/plan` → generate → the preview shows the week → move a proposed session → delete another → save → the saved week is shown → reload → the saved plan is still there;
   - **the deficit warning** — with an assignment whose workload cannot fit before its deadline, the warnings section names it with its minutes;
   - **the flagged marker** — an assignment with no estimate is marked as flagged and is not scheduled;
   - **the isolation case** — a second student's assignment is unreachable and invisible through the same endpoints.
2. **The setup fixtures** — creating the academic data the plan needs: a course with a weekly class meeting, the student's availability windows (an available window and a recurring blocked window), and assignments with due dates and estimates. The creation goes through the **real API** (the `POST /api/assignments` pattern already used by `apps/web/e2e/calendar.spec.ts:67`), with the availability slots and the class meeting created through their own endpoints.
3. **Determinism** — the suite must not depend on wall-clock minutes. The plan's window is the seven days from the server's "today", so the fixtures' due dates must be relative to the **server's** date, and the assertions must be made against the window the server computed rather than against a hard-coded week.
4. **The EP06 parent implementation index** `./artifacts/EP06/implementation.md` — the review scope (the parent, the eight children and their implementation links), the **combined** Git change scope (the base commit and the final commit, plus the child commits — not only the last child's diff), the AC/test/DoD ownership with links to the collected evidence, the commands and their real results, and the known gaps.
5. **The regression sweep** — the API suite, the web suite and the existing E2E specs all pass after the epic's changes (in particular the calendar and assignments specs, whose modules EP06's migration and new module sit next to).

### Out of scope

- Any product-code change. This story is verification and the parent index; if a failure exposes a product defect, it is fixed in the owning child's scope and re-verified here.
- New endpoint or schema work (EP06A–EP06D own the API).
- New frontend work (EP06E–EP06G own the surfaces).
- The EP07 seam's implementation (V-07-1/V-07-2/V-07-3 — EP06 does not depend on EP07).
- EP05's calendar/dashboard integration (V-05-1 — EP05's owner).
- A per-child review gate — the epic has **one** combined review.

## Source requirement references

- **Epic AC-E06-01, AC-E06-02, AC-E06-03, AC-E06-04, AC-E06-05, AC-E06-06, AC-E06-07, AC-E06-08, AC-E06-09** (the cross-layer proof of every criterion).
- **TR-E06-08** (this child's test obligations) and **TR-E06-09** (the manual accessibility evidence collected for the combined review).
- **Shared DoD** — items 1, 3, 8, 9, 10, 11 apply; items 10/11 are the combined review itself.
- **Decisions:** D06-5 (the edit-then-save flow the journey drives), D06-6 (EP06's own confirmed-time read — the seam stays EP07's), D06-13 (the replace semantics the reload proves), D06-19 (the client-held proposal the journey exercises), D06-23 (the server names the window the page reads); and the parent README's **Shared API/data contract** → *Endpoints*.

## Acceptance criteria

1. `apps/web/e2e/study-plan.spec.ts` runs against the self-contained stack and the journey passes end to end through the UI: set the preferences → generate → move a session → delete a session → save → the saved week is shown → a reload shows the saved plan.
2. The generated week matches the server's window: the seven days shown are the ones the server computed, and the proposal contains no session inside a class window, a blocked window or outside the student's available window.
3. A session the student moved is persisted at its new time, and a session the student deleted is absent from the saved plan — the assertion reads the saved plan through the API as well as through the UI, so a UI that silently ignored an edit cannot hide behind a rendering bug.
4. An assignment whose workload cannot fit before its deadline is reported in the warnings section with its minutes; an assignment with no estimate is marked as flagged and is absent from the plan.
5. A second student's assignment is invisible through the plan endpoints: the preview contains no session for it, and a save naming it is rejected with the uniform 404 `Resource not found`.
6. The API suite, the web suite and the whole E2E suite pass after the epic's changes.
7. `./artifacts/EP06/implementation.md` exists and states the review scope (the parent and all eight children with their implementation links), the combined Git change scope (base commit, final commit and the child commits), the AC/test/DoD ownership with links to the evidence, the commands and their actual results, and the known gaps — with no planned check presented as an executed one.

## Tests to add / update

- `apps/web/e2e/study-plan.spec.ts` (new) — the cross-layer suite:
  1. **the journey** — register/log in, create the course, the class meeting, the availability windows and the assignments through the real API, set the study preferences in the profile page, open `/plan`, generate, assert the preview shows the seven days and the proposed sessions, move a session, delete a session, save, and assert the saved week;
  2. **the saved plan survives a reload** — reload `/plan` and assert the saved sessions are still shown; the window is read from the API response (the page calls `GET /study-plans` with **no query parameters** — the server names the window, D06-23) and the assertion never computes a date in the browser; read the saved plan through the API and compare the session ids and times;
  3. **the deficit warning** — with an assignment due tomorrow whose estimate exceeds the available capacity, assert the warnings section names it with its minutes;
  4. **the flagged assignment** — an assignment with no estimate is marked as flagged and has no session in the plan;
  5. **the isolation case** — a second student's assignment id is not in the preview, and a save naming it is rejected with the uniform 404;
  6. **the conflict case** — a save that names a slot inside the class meeting is rejected with a 409 and the plan is unchanged (the cross-layer proof of the save-time re-check).
- `apps/web/e2e/helpers.ts` (extend only if a shared helper is needed — for example a `createAssignmentViaApi` helper mirroring `createSemesterViaApi`/`createCourseViaApi`, and an availability-slot helper).
- Regression sweep (no new files): the `apps/api` Jest suite, the `apps/web` Vitest suite, and the existing Playwright specs (`login`, `auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`).

## Technical notes

### Verified baseline (inspected 2026-10-30 at HEAD `9b1ec19`)

- `apps/web/e2e/` — the existing specs: `login.spec.ts`, `auth-journeys.spec.ts`, `assignments-list.spec.ts`, `calendar.spec.ts`, `semesters-courses.spec.ts`, plus `helpers.ts`, `global-setup.ts`, `global-teardown.ts` and `test-env.ts`.
- `apps/web/e2e/helpers.ts` — `createAuthenticatedUserViaApi(request)` (`:87`) returns `{ email, accessToken }`; `loginViaUi(page, email)` (`:145`) establishes the browser session; `createSemesterViaApi` (`:102`) and `createCourseViaApi` (`:126`) are the model for a setup helper. There is **no** assignment helper yet — the calendar spec creates its assignment inline.
- `apps/web/e2e/calendar.spec.ts:67` — the existing pattern for creating an assignment through the real API (`POST /api/assignments` with the bearer token).
- `apps/web/e2e/test-env.ts:256,296` — `setupTestDatabase` / `teardownTestDatabase`: the self-contained run creates and migrates a dedicated test database per run and drops it afterwards; the developer's own database is untouched. **EP06's migration must therefore apply cleanly in that harness.**
- `apps/web/package.json` — `test:e2e` → `playwright test`; the root `package.json` exposes `pnpm test:e2e` (turbo). The self-contained mode is the default; `E2E_BASE_URL` runs against an externally provided stack.
- `docs/stories/EP09/README.md` — the environment contract: the tests run against the **real, unmocked stack** (a Vite dev server proxying `/api` to the NestJS API, plus Postgres) — a mocked API would not test the wiring.
- The API surface under test is the parent README's shared contract: `GET/PUT /study-preferences`, `GET /study-plans/remaining-work`, `POST /study-plans/preview`, `POST /study-plans`, `GET /study-plans`.

### Implementation notes (concrete)

1. **Determinism around "today".** The plan's window starts at the server's "today" in the profile zone. The fixtures must therefore create due dates relative to the server's date, not to a hard-coded calendar week. The suite reads the window from the preview response (`from`/`to`) and derives its assertions from it — for example, "the first session of the preview is on the `from` date". **The reload assertion does the same with the read**: the page calls `GET /study-plans` without query parameters and the server's response states the effective window (`from`/`to`), so the suite compares the rendered days against the API's — it never derives a date in the browser (D06-23).
2. **The data setup.** The course and its class meeting, the availability windows (one available, one recurring blocked), and the assignments are created through the real API with the bearer token, following the `calendar.spec.ts` pattern. The **journey itself** is driven through the UI — that is the thing under test.
3. **The isolation case.** A second student's assignment id must be inserted into the plan **through the API** (not through the UI, which cannot express it) and the 404 asserted. The response must be byte-identical to the response for a non-existent id.
4. **The conflict case.** A save naming a slot inside the class meeting must be rejected with a 409 whose `conflicts` array names the session and its reason (`OVERLAPS_CLASS` — the shared contract's vocabulary), and the stored plan must be unchanged afterwards (read it back through the API).
5. **The parent index.** `./artifacts/EP06/implementation.md` follows the review-cadence shape: the review scope (the parent, the eight children and their implementation links), the combined Git change scope (the base commit and the final commit plus the child commits — the last child's diff alone is insufficient), the AC/test/DoD ownership mapped to the collected evidence, the commands and their real results, and the known gaps. Planned checks must not be presented as executed.
6. **Failure handling.** If a spec fails because of a product defect, the defect is fixed in the owning child's scope (EP06A–EP06G) and the whole suite is re-run here — this story does not patch product code.
7. **The selectors.** The suite must use role/label queries, not CSS classes, and it must be written after the `ui-refiner` settles the copy and the accessible names for EP06E/EP06F/EP06G.

### Risks / open questions (none blocking)

- **The date-dependent fixture.** The suite's data depends on "today", so it can fail at a date boundary (a run that starts at 23:59 in the profile zone crosses midnight mid-run). The suite must read the window from the preview and assert against it, and it must not assume a fixed weekday. A run that crosses midnight **between the preview and the save** is covered by the contract: the save names the window it applies to and the server accepts any rolling window it could itself have generated (D06-21), so the save still succeeds — the suite asserts the saved sessions, not the save's success alone.
- **The manual accessibility pass (TR-E06-09)** is collected here for the combined review; the automated part of the accessibility evidence lives in EP06F's/EP06G's component tests. The manual pass must be recorded as a manual pass, with honest labels.
- **The migration in the E2E harness.** The self-contained harness creates and migrates the test database per run; EP06's migration (with its guard and its renames) must apply cleanly there. The rollback is documented in EP06D's record but is not exercised by this suite.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input is introduced here; the API's validation is covered by EP06A/EP06D and the UI's by EP06E/EP06F/EP06G.
3. Academic data is scoped to the authenticated student — the suite proves it end to end: a second student's assignment is unreachable through the same endpoints (a cross-layer negative case belongs in this suite).
4. API errors produce actionable messages — the suite asserts that the conflict rejection and the uniform 404 surface readable messages rather than generic failures.
5. Loading, empty and error states are handled — the suite exercises at least one empty state (no unfinished work) and the conflict path.
6. Core interactions support keyboard accessibility — the manual accessibility pass (TR-E06-09) is collected for the combined review; the journey is driven through the UI in the spec.
7. Responsive layouts work on desktop and mobile — the plan journey is exercised at a phone viewport as well as on desktop.
8. Business rules have automated tests — this story's suite is the cross-layer layer; the API and web suites pass unchanged.
9. API changes and migrations are documented — the parent index records the migration, the guard and the rollback from EP06D's record.
10. Integrated review — the combined EP06 parent review, on the strength of this index.
11. Reviewer walkthrough — the combined EP06 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** the epic's cross-layer behaviour is proven against the real stack — the generate/edit/save journey, the persisted plan, the deficit warning, the flagged assignment, the conflict rejection and the cross-student isolation — and the parent index that the combined review needs exists.

- **Request/token estimate:** 2 requests/tokens — a new Playwright suite with six scenarios, a possible shared setup helper, the regression sweep across three suites, and the parent index. The uncertainty is in the date-dependent fixture and in the E2E selectors (they depend on the `ui-refiner`'s settled copy), not in the test logic.
- **Model recommendation:** 3 — the test logic is straightforward, but the suite is date-dependent and cross-layer: a wrong assertion about what the plan contains would produce a misleading green. A capable mid-tier model is appropriate.
- **Files:**
  - `apps/web/e2e/study-plan.spec.ts` (new);
  - `apps/web/e2e/helpers.ts` (modify — only if a shared setup helper is needed);
  - `./artifacts/EP06/implementation.md` (new — the parent implementation index).
- **Start context:** this story file; the parent README's shared API/data contract (the exact request/response shapes) + the decision register (D06-5, D06-6, D06-13, D06-19) + the quality gate; EP06A–EP06G's implementation records (`./artifacts/EP06A/implementation.md` … `./artifacts/EP06G/implementation.md`); `apps/web/e2e/helpers.ts`; `apps/web/e2e/calendar.spec.ts`; `docs/stories/EP09/README.md` (the environment contract). Do not read unrelated epic stories.
- **Verification:** `pnpm test:e2e` (the whole Playwright suite against the self-contained stack); `pnpm --filter api test`; `pnpm --filter web test`; `pnpm --filter api typecheck`; `pnpm --filter web typecheck`; `pnpm --filter api lint`; `pnpm --filter web lint`. The E2E run requires Postgres to be reachable (the harness says so in its fail-fast message).
- **Dependencies / exclusions:** EP06A–EP06G implemented; the EP09 self-contained E2E stack available. Excludes product-code changes (fixed in the owning child's scope instead), the EP07 seams' implementation, EP05's calendar/dashboard integration (V-05-1), and any per-child review gate.

## UI/UX gaps for the `ui-refiner`

None — this is an integration/verification story. Its E2E selectors depend on the copy and the accessible names that the `ui-refiner` settles for EP06E/EP06F/EP06G, but the story introduces no user-facing surface of its own.
