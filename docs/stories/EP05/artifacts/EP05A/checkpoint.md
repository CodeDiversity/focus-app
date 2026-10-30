# EP05A checkpoint

Updated: 2026-10-30 (child complete — implementation finished, awaiting the combined EP05 parent review)
Execution state: [docs/stories/EP05/README.md → Execution queue](../../README.md#execution-queue) — EP05A row, state `Implemented — awaiting parent review`
Story: [docs/stories/EP05/EP05A-dashboard-data-layer-rtk-query-slices.md](../../EP05A-dashboard-data-layer-rtk-query-slices.md)
Review unit: EP05 (Student Dashboard, Jira STUDY-19) — the parent index `docs/stories/EP05/artifacts/EP05/` is **not** created by this child (EP05C owns it); the combined review is dispatched by the coordinator after EP05C.
Role / scope: implementer; **EP05A only** — the dashboard data layer (two RTK Query slices, the shared base query move, store registration, the "today" derivation, the assignment split) plus their tests. Excluded: any UI, the dashboard page, EP05B/EP05C, the parent index, `review.md`/`walkthrough.md`, the API (`apps/api/**`), EP03's shared assignment components, `apps/web/src/pages/**`.

> **The completed behaviour, the AC-by-AC outcomes, the verification and the findings' dispositions live in [./implementation.md](./implementation.md).** This checkpoint keeps only the resume state.

## Repository state

- Workspace / branch: `/Users/michaelrobert/Desktop/focus-app`, branch `main`.
- HEAD at last update: `b7728c8` (the base commit for this child; the EP05A commit hash is returned in the handoff).
- Saved work: the EP05A code, tests, artifacts and the narrow execution-status updates — committed as one scoped commit (paths listed in `implementation.md` §8). The commit's hash is in the returned handoff, not here.
- Other work to preserve: `apps/api/tsconfig.json` is modified in the working tree by **another contributor** and is unrelated to EP05 — it was left modified, unstaged and uncommitted. Never stage it.

## Progress

- [x] Read the repo rules, the implementer skill, the checkpoint/closeout contracts, the frontend guidance, the EP05 parent README (contract + decisions D05-1/3/6/7/8/9), the EP05A story, the shared DoD and the code EP05A touches.
- [x] Verified the IANA offset bound by command in this environment — `Pacific/Kiritimati` → `GMT+14:00`, `Etc/GMT+12` → `GMT-12:00` (a 26-hour spread). Output recorded in `implementation.md` §5.
- [x] Milestone 1 — shared base query move (`shared/api/rtkBaseQuery.ts`) + `sessionApi.ts` re-export; the session API's own test suite passes unchanged.
- [x] Milestone 2 — the two slices (`features/assignments/api/assignmentsApi.ts`, `features/calendar/api/calendarApi.ts`).
- [x] Milestone 3 — store registration (`app/store/store.ts`) + the `store.test.tsx` update.
- [x] Milestone 4 — `features/dashboard/model/dashboardRange.ts` (request window + `selectTodayEvents`).
- [x] Milestone 5 — `features/dashboard/model/dashboardSelectors.ts` (the derived sets + `limitRows`).
- [x] Milestone 6 — the four test files (TR-E05-01): the adversarial 26-hour-spread containment case in both directions, the overdue boundary cases, the order-preservation case, the request-shape assertions and the exposed query states.
- [x] Milestone 7 — verification (focused tests, typecheck, lint, full web suite), `implementation.md`, the narrow execution-status updates and the scoped commit.
- Current step: **none — the child is complete.** Implementation ownership is relinquished; the next action belongs to the coordinator (the `ui-refiner` pass on EP05B and EP05C, then EP05B).

## Decisions and dependencies

- **Base query move.** `axiosBaseQuery` + `AxiosBaseQueryError` moved to `shared/api/rtkBaseQuery.ts` (D05-7); `sessionApi.ts` re-exports both so the existing importers keep working. The transport stays the shared `httpClient` instance.
- **Query parameters on the base query.** The moved args interface gained an **optional** `params?: Record<string, string>` forwarded to the axios config (deviation D-1) — the calendar endpoint needs `from`/`to`, and the session API never passes it, so its behaviour is unchanged.
- **Cache key.** RTK Query derives the cache key from the query argument, so `useCalendarEventsQuery({ from, to })` keys on both values.
- **`keepUnusedDataFor`.** Explicit **60 s** for both new slices — short enough that a stale "today" does not outlive a navigation, long enough to avoid a refetch storm between the dashboard and the other pages.
- **Order preservation.** The selectors filter only — no client-side re-sort (D05-9).
- **Predicates.** `isUnfinishedAssignment` / `isOverdueAssignment` from `entities/assignment/model/status.ts` are the single source of truth; only `isOverdueAssignment` accepts the injectable `now`.
- **No client-side profile-zone arithmetic** (D05-6): the production modules never compute the profile zone's civil date; the test builds its expected profile-zone date with `Intl` inside the test file only.
- **Blockers:** none for EP05A. EP05B/EP05C stay `Needs refinement` (their `ui-refiner` pass, D05-12) and were **not** started here.
- **Open finding outside this child:** F-EP05A-03 — the pre-existing intermittent failure of `apps/web/src/features/courses/ui/CourseForm.test.tsx` in the full web suite (verified pre-existing at the pristine `b7728c8`; owned by the courses feature / the coordinator). Details and evidence in `implementation.md` §6.

## Verification

- Recorded in full in `implementation.md` §4–§5: the focused test run (171 tests, 14 files — PASS), `pnpm --filter web typecheck` (PASS), `pnpm --filter web lint` (PASS), the session-API run after the base-query move (PASS) and the full web suite (PASS apart from the pre-existing flake above), plus the offset-verification command's observed output.

## Resume next

1. **Nothing outstanding in EP05A.** Do not re-implement any milestone above; the code, the tests and the records are committed.
2. If the combined EP05 parent review returns findings against EP05A, resume it as `fix` with this checkpoint and `implementation.md` as the resume inputs.
3. For the next child (EP05B), the API surface this child exposes is listed in `implementation.md` §9.
- Read next (for EP05B): `apps/web/src/features/dashboard/model/dashboardRange.ts`, `apps/web/src/features/dashboard/model/dashboardSelectors.ts`, `apps/web/src/features/assignments/api/assignmentsApi.ts`, `apps/web/src/features/calendar/api/calendarApi.ts`, `docs/stories/EP05/README.md#shared-dashboard-data-contract`.
