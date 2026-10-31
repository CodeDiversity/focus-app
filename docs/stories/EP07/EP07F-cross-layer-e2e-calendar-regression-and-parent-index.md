# EP07F: Cross-Layer E2E, Calendar Regression & Parent Index

**Story ID:** EP07F
**Title:** Integration — the focus-session journey end to end against the real stack, the EP04 calendar regression, and the EP07 parent implementation index
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Integration
**Status:** Ready
**Dependencies:** **EP07A, EP07B, EP07C, EP07D and EP07E** implemented. The EP09 self-contained E2E stack (Postgres + API + web on ports 3100/4100) must be runnable.
**Jira key:** Pending creation
**Refined:** 2026-10-30 (technical-refine; backend/integration; no `ui-refiner` pass needed)

## Summary

One Playwright suite proves the epic's cross-layer behaviour against the real, unmocked stack: a student starts a session from an assignment, pauses it, resumes it, reloads the page, finishes it with an adjusted confirmed time, and finds that time in their history and in the confirmed-time endpoint — with the assignment untouched. The same suite pins the EP04 calendar regression (a session that is still running must not vanish from the calendar) and the ownership negative case, and the story produces the EP07 parent implementation index that the single combined review needs.

## Description & bounded scope

### In scope

1. **A new Playwright spec** `apps/web/e2e/study-sessions.spec.ts` against the self-contained EP09 stack, covering:
   - **the journey** — start from the assignments list → focus mode → pause → resume → finish (with an adjusted confirmed time) → the session appears in the study history;
   - **reload does not complete** — start a session, reload the focus page, and the session is still open (not `COMPLETED`), with its recorded time restored;
   - **finish without completing the assignment** — after the finish, the assignment's `status` is unchanged and its progress fields are unchanged;
   - **the recorded time reaches the confirmed-time endpoint** — `GET /study-sessions/confirmed-time` reports the confirmed minutes for that assignment;
   - **the calendar regression** — a session that is still running appears in the calendar (the null-`endTime` case EP07A's change handles), and the existing calendar journey stays green.
2. **Test setup helpers** — reuse the existing `createAssignmentViaApi` (already present in `apps/web/e2e/helpers.ts`); extend `helpers.ts` only if a genuinely shared helper is missing (e.g. a `createOpenStudySessionViaApi`).
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
- Modifying the EP04 calendar query or EP07A's migration — verified here, not changed.

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

- `apps/web/e2e/study-sessions.spec.ts` (new) — the cross-layer suite, one `test.describe` per scenario, each test creating its own user via `createAuthenticatedUserViaApi` (per-test isolation, matching the suite's data-isolation rule). Scenarios:
  1. **the journey (start→pause→resume→finish)** — register/log in, create an assignment through the API, open `/assignments`, open the row's actions menu (`aria-label="Actions for {title}"`), click `aria-label="Start focus session for {title}"`, choose a preset duration (25) in the "Start a focus session" dialog, click "Start focus session", land on `/focus`, assert the timer is running, click "Pause", assert status paused, click "Resume", open the completion dialog via "Finish session", change "Minutes to record" to a known value (45), click "Save time", and see the completed state ("{n} minutes recorded") and a link to the study history; then visit `/focus/history` and assert the finished session row is present.
  2. **reload does not complete** — start a session (as above through `/focus`), capture `GET /study-sessions/current` → `elapsedSeconds` (call it `before`), `page.reload()`, wait for the focus page to re-resolve, assert the session is still open (`status` is `ACTIVE` or `PAUSED`, never `COMPLETED`) via both the UI (timer visible, "Finish session" button present) and `GET /study-sessions/current`, and assert the server's `elapsedSeconds` is unchanged (`before` === after reload) and the displayed timer is re-anchored to it.
  3. **finish without completing the assignment** — read `GET /api/assignments` and capture the matching row (full payload) before the finish; perform scenario 1's finish with 45 minutes; re-read `GET /api/assignments` and compare the matching row field-for-field (deep equality) — in particular `status`, `estimatedHours`, `actualHours` and every progress field are unchanged and the assignment is not `COMPLETED`.
  4. **the recorded time reaches the confirmed-time endpoint** — after scenario 1's finish, call `GET /study-sessions/confirmed-time?assignmentId={id}` and assert `confirmedMinutes === 45` and `sessionCount === 1`; also call `GET /study-sessions?assignmentId={id}` and assert the finished session is present with `status === 'COMPLETED'` and `durationMinutes === 45`.
  5. **the calendar regression** — create a user, create an assignment, start a session via `POST /study-sessions` (leaving it open), visit `/calendar`, and assert a chip whose accessible name matches `/Study session/` is visible for the current week; then run the pre-existing `calendar.spec.ts` unchanged and confirm it still passes.
  6. **ownership negative case (DoD 3)** — create user A and user B; for user A create an assignment and an open session; as user B, call `POST /study-sessions/{A's session}/pause`, `POST /study-sessions/{A's session}/finish`, `GET /study-sessions/confirmed-time?assignmentId={A's assignment}` and `GET /study-sessions/current`; assert every one returns the uniform 404 `Resource not found` (status 404, body message `Resource not found`) — never 403 and never a distinct message.
  7. **empty state (DoD 5)** — create a fresh user with no sessions, log in, visit `/focus/history`, and assert the empty state renders ("No study sessions yet.").
  8. **error path (DoD 4)** — in the completion dialog, enter `1441` (or `-1`, or `1.5`) in "Minutes to record" and assert the client validation message "Enter a whole number between 0 and 1440." appears and "Save time" is disabled; additionally, force a 400 (e.g. post an out-of-range `confirmedMinutes` directly through the API) and assert the server's field-level message surfaces rather than a generic failure.
  9. **mobile viewport (DoD 7)** — repeat the pause/resume portion of scenario 1 at a 375×667 viewport and assert the focus page renders without horizontal scroll and the primary controls are tappable (≥44px).
- `apps/web/e2e/helpers.ts` (modify only if a shared helper is needed — e.g. a `createOpenStudySessionViaApi` mirroring `createAssignmentViaApi`; reuse `createAuthenticatedUserViaApi`, `authHeaders`, `loginViaUi`, `createAssignmentViaApi`).
- Regression sweep (no new files): `apps/api` Jest suite, `apps/web` Vitest suite, and the existing Playwright specs (`login`, `auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`, `study-plan`).

## Technical notes

### Verified baseline (inspected 2026-10-30)

- Implemented children and their commits (from their implementation records):
  - EP07A `6e0088d` (planning) / migration `apps/api/prisma/migrations/20261030211833_study_session_focus_lifecycle/migration.sql`; calendar compatibility change in `apps/api/src/modules/calendar/calendar.service.ts` (null `endTime` handled via `OR: [{ endTime: null }, { endTime: { gt: rangeStart } }]` and `s.endTime ? zoneDateParts(...) : null`).
  - EP07B `bfe1cbf10b08013904c696f13a56db2249711d69` — finish + confirmed-time + history APIs.
  - EP07C `65d82a7` — start entry points; accessible name `Start focus session for {title}`; dialog title "Start a focus session".
  - EP07D `54f61e94f005d5c3b0e9d23851ac4b33d982c202` — `/focus` route; FocusTimer controls labelled "Pause"/"Resume"/"Finish session"; completed state shows "{n} minutes recorded".
  - EP07E `ffc1b930f940c0d724d3dc6adc1380771d9ec95f` — FinishSessionDialog title "Finish this session", input label "Minutes to record", button "Save time", validation message "Enter a whole number between 0 and 1440.", history empty state "No study sessions yet.", route `/focus/history`.
- `apps/web/e2e/` existing specs and helpers: `helpers.ts` already exports `createAssignmentViaApi` (so the story's "extend only if needed" is the likely case — no helper change expected); `createAuthenticatedUserViaApi`, `authHeaders`, `loginViaUi`; `calendar.spec.ts` is the regression target.
- `apps/web/playwright.config.ts` — self-contained by default (API :4100, Vite :3100, dedicated test DB per run via `global-setup.ts`/`global-teardown.ts`); `E2E_BASE_URL` for an external stack. `fullyParallel: true`, 0 retries locally, 2 in CI, `actionTimeout: 30_000`.
- API surface under test (parent README shared contract): `POST /study-sessions`, `POST /study-sessions/:id/pause`, `POST /study-sessions/:id/resume`, `GET /study-sessions/current`, `POST /study-sessions/:id/finish`, `GET /study-sessions`, `GET /study-sessions/confirmed-time`. Web calls go through the `/api` Vite proxy, so the spec uses `/api/...` paths via the `request` fixture and page navigation uses unprefixed routes.

### Implementation notes (concrete)

1. **Determinism / timing strategy.** The suite must never assert "N seconds elapsed". Concretely:
   - The journey sets the confirmed value to a fixed 45 via the completion dialog's "Minutes to record" input (the student-facing confirm/adjust path, AC-E07-04). All value assertions are on `45`.
   - Elapsed-time assertions are about the **server's** `elapsedSeconds`, not wall-clock. In the reload scenario, capture `elapsedSeconds` from `GET /study-sessions/current` before and after `page.reload()` and assert equality (the server only advances `elapsedSeconds` at pause/finish, so a reload during an ACTIVE segment returns the same accumulated value). Also assert the displayed timer text is re-anchored to that value (i.e. the page renders `formatElapsed(serverValue)`).
   - Do not insert `waitForTimeout` sleeps to let time pass; rely on server timestamps and the re-anchor behaviour.
2. **Data setup.** Create the user via `createAuthenticatedUserViaApi(request)` (returns `{ email, accessToken }`), create the assignment via `createAssignmentViaApi(request, accessToken, { title, ... })`, then drive the session through the UI (the journey *is* the thing under test). For the calendar-regression and ownership scenarios, creating the session directly via `POST /api/study-sessions` with `{ assignmentId, plannedMinutes }` is preferred for determinism; leave it open (no finish).
3. **Reload case.** `page.reload()` on `/focus`, then assert through both the UI (timer visible, "Finish session" button present, no "Session complete" block) and `GET /study-sessions/current` (`status !== 'COMPLETED'`). Read the state through the API so a UI that silently completes cannot hide behind a rendering bug.
4. **"Assignment untouched" assertion.** Fetch `GET /api/assignments` before and after the finish and compare the matching row field-for-field (deep equality over the full projection). This catches an accidental write to `actualHours`, `status` or any progress field. Assert specifically that `status`, `estimatedHours` and `actualHours` are unchanged.
5. **Calendar regression.** With an open session whose `startTime` is within the current week, visit `/calendar` and assert a chip whose accessible name matches `/Study session/` is visible. Then run the existing `calendar.spec.ts` unchanged to confirm the EP04 journey (null-`endTime` handling in `calendar.service.ts`) is unaffected. This verifies EP07A's compatibility change through the wired stack rather than only in a unit test.
6. **Ownership negative case.** Use two independent users (two `createAuthenticatedUserViaApi` calls). All foreign-resource assertions are status 404 with body `{ message: 'Resource not found' }` (the uniform message — never 403, never distinct). Drive the calls through the `request` fixture with user B's bearer token.
7. **The parent index.** `./artifacts/EP07/implementation.md` follows the review-cadence shape:
   - **Review scope:** the parent (EP07) and all six children (EP07A–EP07F) with links to their implementation records (`./artifacts/EP07A/implementation.md` … `./artifacts/EP07F/implementation.md`) and commit hashes.
   - **Combined Git change scope:** the base commit (the commit immediately preceding the first EP07 implementation commit — record it from `git log` at index time, not a guessed value), the final commit (HEAD after EP07F lands), and **every** child commit hash (EP07A…EP07F) — the last child's diff alone is insufficient. Include the migration file path.
   - **AC/test/DoD ownership:** map each epic AC (AC-E07-01…08), each TR (TR-E07-01…08) and each applicable DoD item to its owning child and the evidence location (test file + command output).
   - **Commands and their actual results:** list every command run (`pnpm test:e2e`, `pnpm --filter api test`, `pnpm --filter web test`, `pnpm --filter api typecheck`, `pnpm --filter web typecheck`, `pnpm --filter api lint`, `pnpm --filter web lint`) with pass/fail counts copied from real output. No planned check may be presented as an executed one.
   - **Known gaps:** the EP06 seam (V-07-1, V-07-2), EP05's dashboard widget (D07-9), the study-plans e2e pre-existing failure (if still present), and any spec skipped or flaky case.
   - **Manual accessibility evidence (TR-E07-08):** a section (or a sibling `./artifacts/EP07/accessibility.md`) recording the keyboard/focus-visibility/screen-reader/reduced-motion/narrow-screen pass on the focus-mode surface, performed during this story. Label performed checks vs. unexecuted user instructions honestly.
8. **Failure handling.** If a spec fails because of a product defect, the defect is fixed in the owning child's scope (EP07A–EP07E) and the whole suite is re-run here — this story does not patch product code. Record the defect and the re-run in the index's correction log.
9. **Selectors.** Use role/label queries only (no CSS classes), per the ui-refiner's settled copy: `getByRole('button', { name: 'Pause' })`, `getByRole('button', { name: 'Finish session' })`, `getByRole('button', { name: 'Save time' })`, `getByLabel('Minutes to record')`, `getByRole('link', { name: 'Study history' })`. The accessible names above are taken from the implemented components (verified 2026-10-30) and must be re-checked against HEAD at implementation time.

### Risks / open questions

- **Timing sensitivity.** Any assertion that depends on wall-clock elapsed time will be flaky. The suite must assert on the server's recorded values and on the student-adjusted confirmed value instead. (Settled: see implementation note 1.)
- **The focus route's selectors.** The E2E selectors depend on the `ui-refiner`'s settled copy and accessible names (EP07C/EP07D/EP07E). The spec must use role/label queries, not CSS classes, and it must be written after those copies are settled. (Settled: copies landed 2026-10-30; accessible names verified above.)
- **The migration in the E2E harness.** The self-contained harness creates and migrates the test database per run; the EP07 migration (with its backfill) must apply cleanly there. The migration's rollback is documented in EP07A's record, but the rollback is not exercised by this suite.
- **The confirmed-time endpoint's shape (V-07-2).** The spec reads the shape recorded in the parent README's shared contract; if EP06 later changes it, the spec changes with it.
- **Open question (non-blocking):** whether the manual accessibility pass is recorded as a section of `implementation.md` or a sibling `accessibility.md`. Recommendation: section in `implementation.md` to keep one artifact; split only if it exceeds ~40 lines. Implementer decides and records the choice.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input is introduced here; the API's validation is covered by EP07A/EP07B and the UI's by EP07C/EP07E.
3. Academic data is scoped to the authenticated student — the suite proves it end to end: a second student's session and assignment are unreachable through the same endpoints (the ownership negative case in scenario 6).
4. API errors produce actionable messages — the suite asserts at least one failure path (a rejected transition or an invalid confirmed value) surfaces a readable message rather than a generic failure (scenario 8).
5. Loading, empty and error states are handled — the suite exercises the history's empty state (scenario 7) and at least one error path (scenario 8).
6. Core interactions support keyboard accessibility — the manual accessibility pass (TR-E07-08) is collected for the combined review; the keyboard journey is driven through the UI in the spec (pause/resume/finish reachable by keyboard).
7. Responsive layouts work on desktop and mobile — the focus journey is exercised at a phone viewport (375×667) as well as on desktop (scenario 9).
8. Business rules have automated tests — this story's suite is the cross-layer layer; the API and web suites pass unchanged.
9. API changes and migrations are documented — the parent index records the migration, the backfill and the rollback from EP07A's record.
10. Integrated review — the combined EP07 parent review, on the strength of this index.
11. Reviewer walkthrough — the combined EP07 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Decisions (settled during refinement)

- **D-EP07F-1 (timing):** All value assertions use the fixed confirmed value 45 (set through the dialog), never wall-clock elapsed seconds. Elapsed assertions compare server `elapsedSeconds` before/after reload for equality.
- **D-EP07F-2 (calendar regression level):** Assert the open session appears in the calendar through the UI chip (`/Study session/`) against the real stack, in addition to the existing API-level unit coverage in `calendar.service.spec.ts`.
- **D-EP07F-3 (helpers):** Reuse existing helpers; no new helper expected. Add `createOpenStudySessionViaApi` only if a scenario needs a session without exercising the start UI.
- **D-EP07F-4 (ownership negative case):** Included in this suite (DoD 3), driven through the `request` fixture with a second user's token; all foreign-resource responses must be the uniform 404.
- **D-EP07F-5 (mobile viewport):** 375×667, matching the existing calendar/agenda spec, with a no-horizontal-scroll assertion.
- **D-EP07F-6 (accessibility evidence):** Recorded as a section of `./artifacts/EP07/implementation.md` (or a sibling file if it exceeds ~40 lines), using the TR-E07-08 checklist; performed checks labelled separately from unexecuted user instructions.
- **D-EP07F-7 (no questions raised):** No material ambiguity affected scope, security, public contracts, persisted data, UX or sequencing; assumptions above are reversible and recorded.

## Sizing

- **Outcome:** the epic's cross-layer behaviour is proven against the real stack, the EP04 calendar regression is pinned, the ownership negative case and empty/error/mobile states are covered, and the parent index that the combined review needs exists.
- **Request/token estimate:** 2–3 requests/tokens — a new Playwright suite with ~9 scenarios (one journey plus reload, assignment-untouched, confirmed-time, calendar regression, ownership, empty state, error path, mobile viewport), the regression sweep across the API/web/E2E suites, and the parent index. The uncertainty is in the UI selectors (they depend on the settled copy) rather than in the test logic; the timing-sensitive assertions are pinned to server values to remove flakiness. The 7 acceptance criteria are facets of one cross-layer outcome plus the index artifact and are not separable outcomes: splitting the suite from the index would leave the index without its evidence owner.
- **Model recommendation:** 3 — the test logic is straightforward, but the suite is timing-sensitive and cross-layer: a wrong assertion about when a session completes or what the assignment looks like would produce a misleading green. A capable mid-tier model is appropriate.
- **Files:**
  - `apps/web/e2e/study-sessions.spec.ts` (new);
  - `apps/web/e2e/helpers.ts` (modify — only if a shared setup helper is needed);
  - `./artifacts/EP07/implementation.md` (new — the parent implementation index);
  - `./artifacts/EP07/accessibility.md` (new — only if the accessibility evidence exceeds ~40 lines; otherwise a section of `implementation.md`).
- **Start context:** this story file; the parent README's shared API/data contract (the exact request/response shapes) + decision register (D07-2, D07-4, D07-8) + quality gate; EP07A–EP07E's implementation records (`./artifacts/EP07A/implementation.md` … `./artifacts/EP07E/implementation.md`); `apps/web/e2e/helpers.ts`; `apps/web/e2e/calendar.spec.ts`; `docs/stories/EP09/README.md` (the environment contract). Do not read unrelated epic stories.
- **Verification:** `pnpm test:e2e` (the whole Playwright suite against the self-contained stack); `pnpm --filter api test`; `pnpm --filter web test`; `pnpm --filter api typecheck`; `pnpm --filter web typecheck`; `pnpm --filter api lint`; `pnpm --filter web lint`. The E2E run requires Postgres to be reachable (the harness says so in its fail-fast message). Pass conditions: `study-sessions.spec.ts` all scenarios green; `calendar.spec.ts` unchanged and green; no new failures in the API/web/E2E suites; `implementation.md` present with real command results.
- **Dependencies / exclusions:** EP07A–EP07E implemented; the EP09 self-contained E2E stack available. Excludes product-code changes (fixed in the owning child's scope instead), the EP06 seam implementation, EP05's dashboard widget, and any per-child review gate.

## UI/UX gaps for the `ui-refiner`

None — this is an integration/verification story. Its E2E selectors depend on the copy and accessible names that the `ui-refiner` settled for EP07C/EP07D/EP07E, but the story introduces no user-facing surface of its own. (Verified 2026-10-30: accessible names listed in Technical Notes §9.)