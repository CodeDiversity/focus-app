# EP07F: Cross-Layer E2E, Calendar Regression & Parent Index

**Story ID:** EP07F
**Title:** Integration — the focus-session journey end to end against the real stack, the EP04 calendar regression, and the EP07 parent implementation index
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Integration
**Status:** Queued
**Dependencies:** **EP07A, EP07B, EP07C, EP07D and EP07E** implemented. The EP09 self-contained E2E stack (Postgres + API + web on ports 3100/4100) must be runnable.
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

## Summary

One Playwright suite proves the epic's cross-layer behaviour against the real stack: a student starts a session from an assignment, pauses it, resumes it, reloads the page, finishes it with an adjusted time, and finds that time in their history and in the confirmed-time endpoint — with the assignment untouched. The same suite pins the EP04 calendar regression (a session that is still running must not vanish from the calendar) and produces the EP07 parent implementation index for the combined review.

## Description & bounded scope

### In scope

1. **A new Playwright spec** `apps/web/e2e/study-sessions.spec.ts` against the self-contained EP09 stack, covering:
   - **the journey** — start from the assignments list → focus mode → pause → resume → finish (with an adjusted confirmed time) → the session appears in the study history;
   - **reload does not complete** — start a session, reload the focus page, and the session is still open (not `COMPLETED`), with its recorded time restored;
   - **finish without completing the assignment** — after the finish, the assignment's `status` is unchanged and its progress fields are unchanged;
   - **the recorded time reaches the confirmed-time endpoint** — `GET /study-sessions/confirmed-time` reports the confirmed minutes for that assignment;
   - **the calendar regression** — a session that is still running appears in the calendar (the null-`endTime` case EP07A's change handles), and the existing calendar journey stays green.
2. **Test setup helpers** — creating the assignment through the real API (the `POST /api/assignments` pattern already used by `apps/web/e2e/calendar.spec.ts:67`) and, where needed, extending `apps/web/e2e/helpers.ts`.
3. **Determinism** — the suite must not depend on wall-clock minutes. The confirmed value is set through the completion flow's adjustment (the student-facing path), and the elapsed-time assertions are about the **server's** recorded value, not about a specific number of seconds having passed.
4. **The EP07 parent implementation index** `./artifacts/EP07/implementation.md` — the review scope (the parent, the six children and their implementation links), the **combined** Git change scope (base commit and final commit, plus the child commits — not only the last child's diff), the AC/test/DoD ownership with links to the collected evidence, the commands and their results, and the known gaps.
5. **A regression sweep** — the API suite, the web suite and the existing E2E specs all pass after the epic's changes (in particular the EP04 calendar specs, whose query changed in EP07A).

### Out of scope

- Any product-code change. This story is verification and the parent index; if a failure exposes a product defect, it is fixed in the owning child's scope and re-verified here.
- New endpoint or schema work (EP07A/EP07B own the API).
- New frontend work (EP07C/D/E own the surfaces).
- The EP06 seam's implementation (V-07-1/V-07-2 — EP06 is not broken down).
- EP05's dashboard widget (D07-9).
- A per-child review gate — the epic has **one** combined review.

## Source requirement references

- **Epic AC-E07-02** (cross-layer proof), **AC-E07-04** (the confirm/adjust round trip), **AC-E07-05** (the recorded time is attached to the correct assignment), **AC-E07-06** (the reload case), **AC-E07-07** (the assignment is untouched), **AC-E07-08** (the confirmed time reaches the remaining-work read).
- **TR-E07-06** (this child's test obligations), **TR-E07-07** (the calendar regression), **TR-E07-08** (the manual accessibility evidence collected for the combined review).
- **Shared DoD** — items 1, 3, 8, 9, 10, 11 apply; items 10/11 are the combined review itself.
- **Decisions:** D07-2, D07-4 (the confirmed-time read seam), D07-8 (the calendar's null-`endTime` compatibility is EP07A's code change; this story owns its cross-layer verification).

## Acceptance criteria

1. `apps/web/e2e/study-sessions.spec.ts` runs against the self-contained stack and the start→pause→resume→finish journey passes end to end through the UI.
2. Reloading the focus page during a session leaves the session open — it is not `COMPLETED`, and its recorded elapsed time is preserved and shown again.
3. After the finish, the assignment is unchanged: its `status`, its `estimatedHours` and its progress fields are exactly what they were before the session, and the assignment is not marked complete.
4. The confirmed minutes the student confirmed are what `GET /study-sessions/confirmed-time` reports for that assignment, and the finished session appears in `GET /study-sessions` (and in the study-history surface).
5. A session that is still running appears in the calendar for the range that contains its start, and the pre-existing calendar E2E journey still passes.
6. The API suite, the web suite and the whole E2E suite pass after the epic's changes.
7. `./artifacts/EP07/implementation.md` exists and states the review scope (the parent and all six children with their implementation links), the combined Git change scope (base commit, final commit and the child commits), the AC/test/DoD ownership with links to the evidence, the commands and their actual results, and the known gaps — with no planned check presented as an executed one.

## Tests to add / update

- `apps/web/e2e/study-sessions.spec.ts` (new) — the cross-layer suite:
  1. **the journey** — register/log in, create an assignment through the API, open `/assignments`, start a focus session on that assignment, land in focus mode, pause, resume, open the completion dialog, adjust the confirmed time to a known value, confirm, and see the finished session in the study history;
  2. **reload does not complete** — start a session, reload the focus page, assert the session is still open and its recorded time is restored (the timer is re-anchored to the server's value);
  3. **finish without completing the assignment** — read the assignment through the API before and after the finish and compare the two payloads field-for-field (the assignment's `status` is unchanged);
  4. **the recorded time reaches the confirmed-time endpoint** — call `GET /study-sessions/confirmed-time` with the assignment id and assert it reports exactly the confirmed minutes;
  5. **the calendar regression** — with a session still running, open the calendar and assert the session appears (and that the pre-existing calendar journey is unaffected).
- `apps/web/e2e/helpers.ts` (extend only if a shared helper is needed — e.g. a `createAssignmentViaApi` helper mirroring `createSemesterViaApi`/`createCourseViaApi`).
- Regression sweep (no new files): `apps/api` Jest suite, `apps/web` Vitest suite, and the existing Playwright specs (`login`, `auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`).

## Technical notes

### Verified baseline (inspected 2026-10-29 at HEAD `8e31c0d`)

- `apps/web/e2e/` — the existing specs: `login.spec.ts`, `auth-journeys.spec.ts`, `assignments-list.spec.ts`, `calendar.spec.ts`, `semesters-courses.spec.ts`, plus `helpers.ts`, `global-setup.ts`, `global-teardown.ts` and `test-env.ts`.
- `apps/web/e2e/helpers.ts` — `createAuthenticatedUserViaApi(request)` returns `{ email, accessToken }`; `authHeaders(accessToken)` builds the bearer header; `loginViaUi(page, email)` establishes the browser session; `createSemesterViaApi` / `createCourseViaApi` are the model for a setup helper. The helpers fail fast with a mode-conditional remedy message (self-contained stack vs `E2E_BASE_URL`).
- `apps/web/e2e/calendar.spec.ts:67` — the existing pattern for creating an assignment through the real API (`POST /api/assignments` with the bearer token); the calendar spec is the file whose journey must keep passing after EP07A's query change.
- `apps/web/e2e/test-env.ts:256,296` — `setupTestDatabase` / `teardownTestDatabase`: the self-contained run creates and migrates a dedicated test database per run and drops it afterwards; the developer's own database is untouched. The EP07 migration must therefore apply cleanly in that harness.
- `apps/web/package.json` — `test:e2e` → `playwright test`; the root `package.json` exposes `pnpm test:e2e` (turbo). The self-contained mode is the default; `E2E_BASE_URL` runs against an externally provided stack.
- `docs/stories/EP09/README.md` — the environment contract: tests run against the **real, unmocked stack** (a Vite dev server proxying `/api` to the NestJS API, plus Postgres) — a mocked API would not test the wiring.
- The API surface under test is the parent README's shared contract: `POST /study-sessions`, `POST /study-sessions/:id/pause`, `POST /study-sessions/:id/resume`, `GET /study-sessions/current`, `POST /study-sessions/:id/finish`, `GET /study-sessions`, `GET /study-sessions/confirmed-time`.

### Implementation notes (concrete)

1. **Determinism.** A real session accrues a fraction of a minute, so the suite must not assert "45 minutes elapsed". Instead: the student adjusts the confirmed time in the completion dialog to a known value (for example 45), and the assertions are about that confirmed value — which is exactly the epic's "confirm or adjust" behaviour (AC-E07-04). The elapsed-time assertions check that the displayed value is re-anchored to the server's `elapsedSeconds` (not that a specific number of seconds passed).
2. **Data setup.** Create the assignment through `POST /api/assignments` with the bearer token (the `calendar.spec.ts` pattern) so the UI journey starts from a known assignment; drive the session itself through the UI, because the journey *is* the thing under test.
3. **Reload case.** `page.reload()` on the focus route, then assert the session is still open. The assertion should read the state through the API (`GET /study-sessions/current`) as well as through the UI, so a UI that silently completes the session cannot hide behind a rendering bug.
4. **The "assignment untouched" assertion.** Fetch `GET /api/assignments` before and after the finish and compare the matching row field-for-field. Comparing the whole projection catches an accidental write to `actualHours` or `status`.
5. **The calendar regression.** With a session still running, request the calendar API for the range that contains the session's start and assert a `STUDY_SESSION` event exists for it. Then run the existing `calendar.spec.ts` to confirm the EP04 journey is unchanged. This verifies EP07A's compatibility change through the wired stack rather than only in a unit test.
6. **The parent index.** `./artifacts/EP07/implementation.md` follows the review-cadence shape: review scope (the parent, the six children and their implementation links), the combined Git change scope (base commit and final commit plus the child commits — the last child's diff alone is insufficient), the AC/test/DoD ownership mapped to the collected evidence, the commands and their real results, and the known gaps. Planned checks must not be presented as executed.
7. **Failure handling.** If a spec fails because of a product defect, the defect is fixed in the owning child's scope (EP07A–EP07E) and the whole suite is re-run here — this story does not patch product code.

### Risks / open questions

- **Timing sensitivity.** Any assertion that depends on wall-clock elapsed time will be flaky. The suite must assert on the server's recorded values and on the student-adjusted confirmed value instead.
- **The focus route's selectors.** The E2E selectors depend on the `ui-refiner`'s settled copy and accessible names (EP07C/EP07D/EP07E). The spec must use role/label queries, not CSS classes, and it must be written after those copies are settled.
- **The migration in the E2E harness.** The self-contained harness creates and migrates the test database per run; the EP07 migration (with its backfill) must apply cleanly there. The migration's rollback is documented in EP07A's record, but the rollback is not exercised by this suite.
- **The confirmed-time endpoint's shape (V-07-2).** The spec reads the shape recorded in the parent README's shared contract; if EP06 later changes it, the spec changes with it.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input is introduced here; the API's validation is covered by EP07A/EP07B and the UI's by EP07C/EP07E.
3. Academic data is scoped to the authenticated student — the suite proves it end to end: a second student's session and assignment are unreachable through the same endpoints (a cross-layer negative case belongs in this suite).
4. API errors produce actionable messages — the suite asserts at least one failure path (a rejected transition or an invalid confirmed value) surfaces a readable message rather than a generic failure.
5. Loading, empty and error states are handled — the suite exercises the history's empty state and at least one error path.
6. Core interactions support keyboard accessibility — the manual accessibility pass (TR-E07-08) is collected for the combined review; the keyboard journey is driven through the UI in the spec.
7. Responsive layouts work on desktop and mobile — the focus journey is exercised at a phone viewport as well as on desktop.
8. Business rules have automated tests — this story's suite is the cross-layer layer; the API and web suites pass unchanged.
9. API changes and migrations are documented — the parent index records the migration, the backfill and the rollback from EP07A's record.
10. Integrated review — the combined EP07 parent review, on the strength of this index.
11. Reviewer walkthrough — the combined EP07 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** the epic's cross-layer behaviour is proven against the real stack, the EP04 calendar regression is pinned, and the parent index that the combined review needs exists.
- **Request/token estimate:** 2–3 requests/tokens — a new Playwright suite with five scenarios, a possible shared setup helper, the regression sweep across three suites, and the parent index. The uncertainty is in the UI selectors (they depend on the `ui-refiner`'s settled copy) rather than in the test logic.
- **Model recommendation:** 3 — the test logic is straightforward, but the suite is timing-sensitive and cross-layer: a wrong assertion about when a session completes or what the assignment looks like would produce a misleading green. A capable mid-tier model is appropriate.
- **Files:**
  - `apps/web/e2e/study-sessions.spec.ts` (new);
  - `apps/web/e2e/helpers.ts` (modify — only if a shared setup helper is needed);
  - `./artifacts/EP07/implementation.md` (new — the parent implementation index).
- **Start context:** this story file; the parent README's shared API/data contract (the exact request/response shapes) + decision register (D07-2, D07-4, D07-8) + quality gate; EP07A–EP07E's implementation records (`./artifacts/EP07A/implementation.md` … `./artifacts/EP07E/implementation.md`); `apps/web/e2e/helpers.ts`; `apps/web/e2e/calendar.spec.ts`; `docs/stories/EP09/README.md` (the environment contract). Do not read unrelated epic stories.
- **Verification:** `pnpm test:e2e` (the whole Playwright suite against the self-contained stack); `pnpm --filter api test`; `pnpm --filter web test`; `pnpm --filter api typecheck`; `pnpm --filter web typecheck`; `pnpm --filter api lint`; `pnpm --filter web lint`. The E2E run requires Postgres to be reachable (the harness says so in its fail-fast message).
- **Dependencies / exclusions:** EP07A–EP07E implemented; the EP09 self-contained E2E stack available. Excludes product-code changes (fixed in the owning child's scope instead), the EP06 seam implementation, EP05's dashboard widget, and any per-child review gate.

## UI/UX gaps for the `ui-refiner`

None — this is an integration/verification story. Its E2E selectors depend on the copy and accessible names that the `ui-refiner` settles for EP07C/EP07D/EP07E, but the story introduces no user-facing surface of its own.
