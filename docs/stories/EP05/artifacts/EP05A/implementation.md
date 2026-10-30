# EP05A — implementation record

**Child:** EP05A — Dashboard data layer: RTK Query slices, store registration, "today" derivation, assignment split
**Parent review unit:** EP05 (Student Dashboard, Jira STUDY-19)
**Story:** [docs/stories/EP05/EP05A-dashboard-data-layer-rtk-query-slices.md](../../EP05A-dashboard-data-layer-rtk-query-slices.md)
**Checkpoint:** [./checkpoint.md](./checkpoint.md) (kept for resume state; the completed behaviour and the evidence live here)
**Role:** implementer — implementation only. **This child is `implementation complete — awaiting parent review`; it does not carry its own approval.**
**Date:** 2026-10-30
**Base commit:** `b7728c8` (branch `main`)

---

## 1. Acceptance criteria — outcomes

| AC | Requirement | Outcome | Evidence |
|---|---|---|---|
| **AC 1** | `useAssignmentsQuery()` issues exactly one `GET /assignments` with **no** query parameters and returns `AssignmentListItem[]` unchanged; `useCalendarEventsQuery({ from, to })` issues exactly one `GET /calendar/events` carrying **only** `from` and `to` and returns `CalendarEventsResult` unchanged. Neither slice invents, reshapes or drops a field. | **PASS** | `features/assignments/api/assignmentsApi.test.ts` — the axios config is asserted field by field (`url === '/assignments'`, `method === 'GET'`, `params === undefined`, `data === undefined`) and the payload is asserted unchanged. `features/calendar/api/calendarApi.test.ts` — `params` equals exactly `{ from, to }` (and `Object.keys(params)` is asserted to be exactly `['from','to']`), the payload is asserted unchanged. Neither slice defines a `transformResponse`, so no field is reshaped. |
| **AC 2** | The request window is the browser-local civil date **± 2 days** (5 days inclusive, ≤ the API's 31-day cap); the selected day is the payload's `today` (`event.date === result.today`). | **PASS** | `features/dashboard/model/dashboardRange.ts` — `dashboardTodayRange()` returns a 5-day window centred on the browser-local civil date; `selectTodayEvents(events, today)` filters on `event.date === today`. `dashboardRange.test.ts` — the 5-day/31-day-cap assertions, the **adversarial 26-hour-spread case in both directions** (containment property), the worst picker-to-picker pair, and the ±1-day-pair selection case. |
| **AC 3** | The assignment split is derived **only** with the shared predicates; both lists keep the endpoint's documented order — no client-side re-sort. | **PASS** | `features/dashboard/model/dashboardSelectors.ts` calls `isUnfinishedAssignment` / `isOverdueAssignment` from `entities/assignment/model/status.ts` and only filters. `dashboardSelectors.test.ts` — the overdue boundaries (strictly-before `now`, null `dueDate`, due exactly at `now`, finished rows), the upcoming split, and the order-preservation case whose payload's title order contradicts its due-date order. |
| **AC 4** | Both APIs are registered in the app store (reducer + middleware + the serializability ignore list) and expose their query states (`isLoading`, `isFetching`, `isError`, `data`, `refetch`); the existing `features/session` RTK Query API keeps working unchanged. | **PASS** | `app/store/store.ts` registers both reducers, concatenates both middlewares and ignores both reducer paths in `serializableCheck`. `app/store/store.test.tsx` asserts the five state keys and each slice's `{ queries, mutations }` shape. The slice tests render the hooks against a real store and assert `isLoading` → `false`, `isFetching`, `isError`, `data` and `refetch` (and the `{ message, code }` error payload on failure). `features/session/api/sessionApi.test.ts` (8 pre-existing tests) passes unchanged — the base-query move is a move. |

### Shared DoD items that apply to this child

| DoD | Outcome |
|---|---|
| **1 — functional acceptance criteria** | Met (the four ACs above). |
| **5 — loading, empty and error states** | **This child's half is met:** the two queries expose `isLoading`, `isFetching`, `isError`, `data`, `error` and `refetch` independently, and the empty case is simply `data` being an empty list. The **visible** loading/empty/error states are EP05B's (DoD map: "EP05A (query states), EP05B (per-section states)"). |
| **8 — automated tests (TR-E05-01)** | Met — 34 new test cases across four new test files plus the updated `store.test.tsx`; the offset-verification command's output is recorded in §5. |
| **3 / 4 — data scoping / actionable errors** | **Not weakened.** The assignments request carries **no** query parameter at all and the calendar request carries **only** `from`/`to` (the DTO's whitelist) — no `userId`/`courseId`/`assignmentId`/`tz` is ever sent, so the server's principal-scoped queries and the profile-zone lookup remain the only sources of truth. The error path is the shared base query's `{ message, code }` shape (asserted in both slice tests), which is the shape `getErrorMessage` (`shared/lib/errors.ts`) already consumes. |

---

## 2. What was built

### 2.1 `apps/web/src/shared/api/rtkBaseQuery.ts` (new)

`AxiosBaseQueryArgs`, `AxiosBaseQueryError` and `axiosBaseQuery` moved here from `features/session/api/sessionApi.ts` (D05-7). The transport is unchanged: the shared `shared/api/httpClient` instance (bearer token, single-flight refresh, recovery barrier, error sanitization) and the same `{ message, code }` error shape with `code` = the HTTP status as a string.

`features/session/api/sessionApi.ts` now imports the base query from `shared/` and **re-exports** `axiosBaseQuery`, `AxiosBaseQueryArgs` and `AxiosBaseQueryError`, so `sessionApi.test.ts` and `features/email-verification/model/useResendVerification.ts` keep importing them from the old path unchanged. **No behaviour change to the session API** — its pre-existing test suite passes untouched.

### 2.2 `apps/web/src/features/assignments/api/assignmentsApi.ts` (new)

`createApi` with `reducerPath: 'assignmentsApi'`, `baseQuery: axiosBaseQuery`, `keepUnusedDataFor: 60`, one query endpoint `assignments` (`GET /assignments`, no query parameters) and the exported hook `useAssignmentsQuery()`.

### 2.3 `apps/web/src/features/calendar/api/calendarApi.ts` (new)

`createApi` with `reducerPath: 'calendarApi'`, `baseQuery: axiosBaseQuery`, `keepUnusedDataFor: 60`, one query endpoint `calendarEvents` (`GET /calendar/events`, `params: { from, to }` only) and the exported hook `useCalendarEventsQuery({ from, to })`. The RTK Query cache key is derived from the query argument, so `from`/`to` are part of it — different ranges cannot collide (asserted in the test).

### 2.4 `apps/web/src/app/store/store.ts` (modified)

Both reducers registered, both middlewares concatenated, and the serializability ignore list extended with both reducer paths (otherwise the store warns on every RTK Query dispatch).

### 2.5 `apps/web/src/features/dashboard/model/dashboardRange.ts` (new)

- `dashboardTodayRange({ instant?, timeZone? })` → `{ from, to }` — the browser-local civil date **± 2 days** (5 days inclusive). The instant and the browser's zone are injectable so the test is deterministic and independent of the machine's own zone. The ±2-day arithmetic runs on the UTC calendar, so a daylight-saving transition in the browser's zone cannot shift the result by a day.
- `selectTodayEvents(events, today)` → the events whose `date === today`.
- `browserLocalCivilDate(instant?)`, `DASHBOARD_RANGE_RADIUS_DAYS`, `DASHBOARD_RANGE_DAYS`, `CALENDAR_RANGE_MAX_INCLUSIVE_DAYS`.

**No client-side profile-zone arithmetic** (D05-6 / D404-2): the production modules never compute the profile zone's civil date. The window's *size* comes from the verified offset bound; the *selection* is always the server-echoed `today`.

### 2.6 `apps/web/src/features/dashboard/model/dashboardSelectors.ts` (new)

`selectTodayClasses`, `selectTodayStudySessions`, `selectUpcomingAssignments`, `selectOverdueAssignments` and `limitRows(rows, n)` → `{ rows, remaining }`. All pure, all filter-only (no re-sort), all using the shared predicates.

---

## 3. Changed paths

**New (11):**

- `apps/web/src/shared/api/rtkBaseQuery.ts`
- `apps/web/src/features/assignments/api/assignmentsApi.ts`
- `apps/web/src/features/assignments/api/assignmentsApi.test.ts`
- `apps/web/src/features/calendar/api/calendarApi.ts`
- `apps/web/src/features/calendar/api/calendarApi.test.ts`
- `apps/web/src/features/dashboard/model/dashboardRange.ts`
- `apps/web/src/features/dashboard/model/dashboardRange.test.ts`
- `apps/web/src/features/dashboard/model/dashboardSelectors.ts`
- `apps/web/src/features/dashboard/model/dashboardSelectors.test.ts`
- `docs/stories/EP05/artifacts/EP05A/checkpoint.md`
- `docs/stories/EP05/artifacts/EP05A/implementation.md`

**Modified (5):**

- `apps/web/src/features/session/api/sessionApi.ts` — base-query move + re-export (no behaviour change)
- `apps/web/src/app/store/store.ts` — both slices registered
- `apps/web/src/app/store/store.test.tsx` — updated for the two new reducer paths (the old assertions `['api','auth','onboarding']` and state size `3` would otherwise fail)
- `apps/web/src/test/providers.tsx` — the shared test-store factory now mirrors the app store (see deviation **D-2**)
- `docs/stories/EP05/README.md` — narrow execution-status fields only (Active substory / Next substory / the EP05A queue row)

**Not touched:** `apps/api/**` (including the other contributor's dirty `apps/api/tsconfig.json`), `apps/web/src/pages/**`, `apps/web/src/features/assignments/ui/**` (EP03's shared components — D05-18), `apps/web/src/features/calendar/ui/**`, `docs/stories/EP05/EP05B*`, `docs/stories/EP05/EP05C*`, `docs/stories/EP05/plan-review.md`, the `## Autopilot` section of the EP05 README, and every planning-owned section of the EP05 README (ACs, decisions, dependency register, correction log, quality gates).

---

## 4. Verification

All commands were run from the repository root `/Users/michaelrobert/Desktop/focus-app` (the `pnpm --filter web …` commands execute in `apps/web`). The tested state is the working tree described in §3, **before** the EP05A commit — the commit's own hash is returned in the handoff rather than written into this record.

| # | Command | Result |
|---|---|---|
| V1 | `pnpm --filter web test -- src/features/dashboard src/features/assignments src/features/calendar src/app/store` | **PASS** — 14 test files, **171 tests** passed, 0 failed. The 4 new EP05A test files contribute 34 of them and the updated `store.test.tsx` 3; the other 9 files are the pre-existing EP03/EP04 suites matched by the same path filters. |
| V2 | `pnpm --filter web typecheck` | **PASS** — `tsc --noEmit`, no output, exit 0. |
| V3 | `pnpm --filter web lint` | **PASS** — `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`, no output, exit 0. |
| V4 | `pnpm --filter web test -- src/features/session` (after the base-query move) | **PASS** — 3 files, 21 tests — the session API's behaviour is unchanged by the move. |
| V5 | `pnpm --filter web test` (full web suite) | **PASS with a pre-existing, unrelated flake** — 71 files / 876 tests. See finding **F-EP05A-03**: `src/features/courses/ui/CourseForm.test.tsx` fails intermittently (2 of 3 runs). **Verified pre-existing**: with all EP05A changes stashed away (`git stash push -u -- apps/web`), the pristine `b7728c8` tree failed the same two cases in 2 of 3 full-suite runs and passed in one. The file is in the untouched `features/courses` feature, uses no Redux store and passes in isolation and in the courses-only run. EP05A introduces no change to it. |

### 5. The offset-verification command (D05-6 / PC-EP05-05 obligation)

The plan requires the ±2-day bound to be backed by a **recorded command run in the implementer's own environment**, not by a quoted zone/offset label. Command actually run (cwd `/Users/michaelrobert/Desktop/focus-app`):

```console
$ node -e "
const zones = ['Pacific/Kiritimati','Etc/GMT+12','Pacific/Midway','Pacific/Auckland','UTC'];
for (const tz of zones) {
  const s = new Intl.DateTimeFormat('en-US',{timeZone:tz,timeZoneName:'longOffset'}).formatToParts(new Date('2026-10-30T12:00:00Z'));
  console.log(tz, '->', s.find(p=>p.type==='timeZoneName').value);
}
"
Pacific/Kiritimati -> GMT+14:00
Etc/GMT+12 -> GMT-12:00
Pacific/Midway -> GMT-11:00
Pacific/Auckland -> GMT+13:00
UTC -> GMT+00:00
```

**Observed result:** `Pacific/Kiritimati` is **+14:00** and `Etc/GMT+12` is **−12:00** in this environment → the maximum IANA offset spread is **26 hours**, exactly as the plan states. The pass-1 plan-review claim (PR-002) that `Pacific/Kiritimati` is UTC+13 is **not reproduced here**; the plan-review pass-2 disposition and the coordinator's recorded run agree with the output above.

The permanent test does **not** quote any of these labels. `dashboardRange.test.ts` computes each zone's UTC offset at the chosen instant from the live `Intl` output (`zoneOffsetMinutes`) and asserts the **property** — the spread is `> 24 h` and `≤ 26 h` — then asserts the **containment property**: the server-echoed `today` (the profile zone's civil date, computed by the test's own oracle) lies inside `[from, to]`, in **both** directions of the spread. It additionally asserts that a ±1-day window would have **missed** it, which is the reason the window is ±2.

---

## 6. Findings and deviations

### Findings

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| **F-EP05A-01** | EP05A in-scope item 1 ("move … **no behaviour change** to the transport") vs. the calendar endpoint's need for `from`/`to` | `apps/web/src/shared/api/rtkBaseQuery.ts` | The moved `AxiosBaseQueryArgs` had no way to carry query parameters, so the base query as moved could not issue the calendar range. | **Fixed (deviation D-1 below).** The args interface gained an **optional** `params?: Record<string, string>` forwarded to the axios config; the session API never passes it, so its request and error shapes are untouched. Chosen over the alternatives (a `queryFn` that calls the entity clients, or a hand-built query string) because it keeps one transport, one error-shape definition and one request-shape definition per slice. | implementer | `features/session/api/sessionApi.test.ts` passes unchanged (V4); the calendar slice test asserts `params` equals exactly `{ from, to }`. |
| **F-EP05A-02** | EP05A in-scope item 4 (store registration) vs. `apps/web/src/test/providers.tsx`, which documents that it mirrors `src/app/store/store.ts` | `apps/web/src/test/providers.tsx` | The shared test-store factory did not carry the two new slices. Left as it was, EP05B's component tests could not mount the new hooks (an RTK Query hook needs its slice's reducer registered) and the file's own stated invariant would be false. The story's file list does not name the file. | **Fixed (deviation D-2 below).** Both slices are now registered in `makeTestStore`, mirroring the app store exactly. | implementer | `pnpm --filter web typecheck` + `lint` pass; the full web suite is unaffected (V5). |
| **F-EP05A-03** | Shared DoD 8 (automated tests) — the **full** web suite must be green | `apps/web/src/features/courses/ui/CourseForm.test.tsx` (EP02/courses — **not** EP05A) | `rejects a description over 2000 characters client-side and never calls the API` and `selects a color swatch and submits it (F111C-3)` fail intermittently under the full parallel suite. The first types 2001 characters with `userEvent`, which is timing-sensitive. | **Open — not EP05A's to fix, and not caused by EP05A.** Verified pre-existing: with every EP05A change stashed away, the pristine `b7728c8` tree fails the same cases in 2 of 3 full-suite runs. The file uses no Redux store, is in an untouched feature, and passes in isolation and in the courses-only run. **The story's required focused command (V1) is green.** | **Not EP05A** — the courses feature (EP02) owner / the coordinator. EP05A does not modify that file. | Evidence in V5 above; to be raised by the coordinator as a separate follow-up. |
| **F-EP05A-04** | EP05A AC 1 — "exactly one `GET /assignments` request" | `apps/web/src/features/assignments/api/assignmentsApi.ts` | Considered but rejected: reusing the plain-axios entity clients (`listAssignments` / `listCalendarEvents`) inside a `queryFn`. | **Closed — no change made.** Rejected because a `queryFn` rejection is RTK Query's *unhandled error* path (it logs and does not produce the base query's `{ message, code }` payload), which would weaken DoD 4's error contract. The slices therefore issue the **identical axios request** through the shared base query — the alternative the plan's design decision 2 explicitly allows. The entity clients are unchanged and still used by EP03's/EP04's pages. | implementer | `features/*/api/*.test.ts` assert the error shape `{ message, code }` for a failing request in both slices. |

**Findings/deviations summary:** 4 findings — 3 fixed within EP05A, 1 open and owned outside EP05A (F-EP05A-03, a pre-existing courses-feature flake).

### Deviations from the story's file list / plan text

| ID | Deviation | Why | Impact |
|---|---|---|---|
| **D-1** | `shared/api/rtkBaseQuery.ts` gains an optional `params` on the base-query args (F-EP05A-01). The plan's risk note says "reuse the existing `axiosBaseQuery` implementation **verbatim**". | The calendar endpoint must carry `from`/`to`; the moved implementation had no way to express a query parameter. The change is **additive** and inert for the session API. | No behaviour change to the transport or to the session API. The error shape, the `code` = HTTP-status convention and the shared `httpClient` transport are unchanged. |
| **D-2** | `apps/web/src/test/providers.tsx` is modified although the story's file list does not name it (F-EP05A-02). | The file's own comment states it mirrors `src/app/store/store.ts`; the store-registration obligation (item 4) makes that mirror mandatory, and EP05B's component tests need the slices registered. | Test support only. No production behaviour change; the app store itself is untouched by this deviation. |
| **D-3** | The two slice test files additionally render the hooks (`renderHook` + a store `Provider`) to assert the exposed query states. | AC 4 requires the slices to "expose their query states (`isLoading`, `isFetching`, `isError`, `data`, `refetch`) to the sections"; without a rendered hook there is no evidence for that, and it also pins the hooks' call signatures (`useAssignmentsQuery()` takes **no** argument; `useCalendarEventsQuery({ from, to })` takes the range) that EP05B depends on. | Two extra test cases per slice file. The tests live in the four files the story names — no new file. |

---

## 7. Remaining risks / implementation notes (the story's list, answered)

- **`keepUnusedDataFor` — the choice and its rationale.** Both new slices set **`keepUnusedDataFor: 60`** explicitly (RTK's default, stated rather than inherited). Rationale: the calendar payload embeds the server's `today` and the assignment payload is the whole (un-paginated) list, so a long retention would let a stale "today" — or a stale list — outlive the page it was fetched for. 60 s is short enough that a return visit refetches (a fresh `today`), while still avoiding a refetch storm when the student moves between the dashboard and the calendar/assignments pages inside the same minute. The session API's `300` was left unchanged.
- **"Today" changes at midnight.** `result.today` is the server's date **at request time**. A tab left open across midnight keeps showing the previous day until the query refetches (the next mount/remount after the 60 s retention, or an explicit `refetch()`). This is a **known limitation, not a defect EP05A solves**; the section's refresh affordance is EP05B's decision.
- **Browser clock vs. server clock at a deadline boundary.** `isOverdueAssignment` defaults to `Date.now()` — the **browser** clock. The dashboard's clock and the server's clock can disagree by a minute or two exactly at a deadline. The shared predicate is the single source of truth and is **not** re-implemented or worked around here; `now` is injectable so the boundary is deterministic in tests. Recorded rather than papered over.
- **The two query states are independent.** The assignments and calendar slices are **separate `createApi` instances** with separate reducers, separate middlewares and separate cache entries. A failing assignments query therefore **cannot** blank the calendar sections (and vice versa): each section reads its own query's state. The independence is asserted by construction (separate reducers in `store.test.tsx`) and by each slice's own error-state test.
- **The sections' presentation of these states is EP05B's, not EP05A's.** This child decides only *what* is exposed (`isLoading`, `isFetching`, `isError`, `data`, `error`, `refetch`) and that the two are independent. The loading shape (whole-page spinner vs. per-section skeleton), the partial-failure presentation, the "Today" labelling, the refetch affordance and the empty-state copy are **EP05B/EP05C's** (the `ui-refiner` passes, D05-12). If either pass changes the query-state contract this child exposes, **EP05A is amended first** (the story's own instruction).
- **The whole-list fetch.** `GET /assignments` has no pagination, so the dashboard downloads the student's entire assignment list and slices it client-side. Accepted per D05-3 and re-checked by V-05-3 when pagination lands.

---

## 8. Commit scope

One scoped commit for this child:

- `apps/web/src/shared/api/rtkBaseQuery.ts` (new)
- `apps/web/src/features/assignments/api/assignmentsApi.ts` + `.test.ts` (new)
- `apps/web/src/features/calendar/api/calendarApi.ts` + `.test.ts` (new)
- `apps/web/src/features/dashboard/model/dashboardRange.ts` + `.test.ts` (new)
- `apps/web/src/features/dashboard/model/dashboardSelectors.ts` + `.test.ts` (new)
- `apps/web/src/features/session/api/sessionApi.ts` (modified)
- `apps/web/src/app/store/store.ts` + `store.test.tsx` (modified)
- `apps/web/src/test/providers.tsx` (modified)
- `docs/stories/EP05/artifacts/EP05A/checkpoint.md` + `implementation.md` (new)
- `docs/stories/EP05/README.md` (modified — narrow execution-status fields only)

**Explicitly excluded from the commit:** `apps/api/tsconfig.json` (another contributor's unrelated modification — left modified, unstaged and uncommitted), and every planning-owned section of `docs/stories/EP05/README.md`.

## 9. What EP05B needs from this child

- `useAssignmentsQuery()` — **no argument**; returns `AssignmentListItem[]` unchanged.
- `useCalendarEventsQuery({ from, to })` — the two endpoints are `YYYY-MM-DD` civil dates; the range comes from `dashboardTodayRange()`.
- The window: `dashboardTodayRange()` (browser-local ± 2 days) and the selection: `selectTodayEvents(events, result.today)` — never a client-derived date.
- The derived sets: `selectTodayClasses(events, today)`, `selectTodayStudySessions(events, today)`, `selectUpcomingAssignments(rows, now?)`, `selectOverdueAssignments(rows, now?)`, and `limitRows(rows, n)` → `{ rows, remaining }`.
- The query states each section reads: `isLoading`, `isFetching`, `isError`, `data`, `error`, `refetch` — independently per query.
- The rows are returned **in the endpoint's order** (no client-side re-sort) — a section must not re-sort them.

**Not provided by this child (by design):** any UI, the dashboard page, the empty states, the quick action, the parent index, and the `review.md` / `walkthrough.md` documents.
