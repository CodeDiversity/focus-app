# EP05A: Dashboard Data Layer — RTK Query Slices & "Today" Derivation

**Story ID:** EP05A
**Title:** Frontend — dashboard data layer: per-domain RTK Query slices, store registration, "today" derivation and the assignment split
**Parent epic:** [EP05: Student Dashboard](../../epics/EP05-student-dashboard.md) (Jira STUDY-19)
**Parent:** [EP05 breakdown](./README.md)
**Milestone:** M2 (Calendar and dashboard)
**Layer:** Frontend (data)
**Status:** Ready — sized, contracts settled (D05-1, D05-3, D05-6…D05-9); no `ui-refiner` pass applies (D05-12 — no user-visible surface). Not implemented.
**Dependencies:** EP02, EP03, EP04 complete (satisfied). No EP05 sibling dependency. `features/session/api/sessionApi.ts` (the only existing RTK Query API) is refactored, not duplicated.
**Jira key:** Pending creation
**Refined:** — (technical refinement is captured in this file; the `ui-refiner` pass does not apply to this child)

## Summary

Give the dashboard a tested data layer: two per-domain RTK Query API slices (assignments, calendar) over the shared axios transport, registered in the app store, plus the pure derivations the dashboard sections render — which civil day is "today", which assignments are overdue, which are still upcoming, and which events are today's classes and today's study sessions.

## Description & bounded scope

### In scope

1. **Shared RTK Query base query.** Move `axiosBaseQuery` and `AxiosBaseQueryError` out of `apps/web/src/features/session/api/sessionApi.ts` into a new `apps/web/src/shared/api/rtkBaseQuery.ts`; `sessionApi.ts` imports them from there. No behaviour change to the transport (same shared `httpClient`, same error shape, same `code` = HTTP status convention).
2. **Assignments slice.** New `apps/web/src/features/assignments/api/assignmentsApi.ts` — a `createApi` instance (`reducerPath: 'assignmentsApi'`) with one query endpoint that calls the existing `GET /assignments` with **no query parameters** and returns `AssignmentListItem[]` unchanged. Exports a `useAssignmentsQuery()` hook.
3. **Calendar slice.** New `apps/web/src/features/calendar/api/calendarApi.ts` — a `createApi` instance (`reducerPath: 'calendarApi'`) with one query endpoint that calls the existing `GET /calendar/events` with `from`/`to` only and returns `CalendarEventsResult` unchanged. Exports a `useCalendarEventsQuery({ from, to })` hook.
4. **Store registration.** `apps/web/src/app/store/store.ts` registers both reducers and both middlewares, and extends the serializability ignore list with both reducer paths.
5. **"Today" derivation.** New `apps/web/src/features/dashboard/model/dashboardRange.ts` — the request window and the day-selection helpers (see "Today" below).
6. **Section derivations.** New `apps/web/src/features/dashboard/model/dashboardSelectors.ts` — pure functions producing today's classes, today's study sessions, the upcoming-deadline list, the overdue list, and the limit application, using the shared assignment predicates and preserving the endpoint's order.
7. **Tests** for every item above (TR-E05-01).

### Out of scope

- Any UI component, the dashboard page, the quick action, the empty states (EP05B, EP05C).
- Any backend change, new endpoint, pagination, status filter or date picker (D05-3, D05-4).
- Changing the existing plain-axios entity clients (`entities/assignment/api/assignmentApi.ts`, `entities/calendar/api/calendarApi.ts`) — they are reused as-is, so EP03's assignments page and EP04's calendar page are untouched (D05-8).
- Any change to `features/session/api/sessionApi.ts`'s public behaviour (the refactor is a move, not a rewrite).
- Optimistic updates, cache persistence, polling or background refetch configuration beyond RTK Query's defaults.

## Source requirement references

- **Epic AC-E05-01, AC-E05-02, AC-E05-03, AC-E05-04** (data half — the query and the derivation each section renders; the rendering is EP05B's).
- **Shared DoD** — items 1, 5, 8 (and item 10 through the combined EP05 parent review).
- **Decisions:** D05-1 (RTK Query, per-domain slices), D05-3 (compose client-side, no API change), D05-6 ("today" is the server's profile-zone date — **corrected 2026-10-29**, PC-EP05-01: the window is browser-local ± 2 days), D05-7 (shared base query in `shared/`), D05-8 (slice placement + store registration), D05-9 (assignment split, endpoint order preserved).

## Acceptance criteria

1. `useAssignmentsQuery()` issues exactly one `GET /assignments` request with **no** query parameters and returns the endpoint's `AssignmentListItem[]` unchanged; `useCalendarEventsQuery({ from, to })` issues exactly one `GET /calendar/events` request carrying **only** `from` and `to`, and returns `CalendarEventsResult` unchanged. Neither slice invents, reshapes or drops a field.
2. The dashboard's calendar request window is the browser-local civil date **± 2 days** (a 5-day inclusive range, within the API's 31-day inclusive cap), and the selected day is the payload's `today` — so a student whose profile time zone differs from their browser's time zone still receives and selects the profile zone's "today" events (`event.date === result.today`). The **± 2-day size is derived from the 26-hour maximum IANA UTC-offset spread** (UTC−12 `Etc/GMT+12` ↔ UTC+14 `Pacific/Kiritimati`): the browser's and the profile zone's civil dates can be **two calendar days apart**, so a ±1-day window would not necessarily contain the profile zone's "today" (D05-6, PC-EP05-01).
3. The assignment split is derived **only** with the shared predicates: overdue = `isUnfinishedAssignment(row)` ∧ `isOverdueAssignment(row)`; upcoming = `isUnfinishedAssignment(row)` ∧ ¬overdue (assignments with a null `dueDate` included, last). Both lists keep the endpoint's documented order (`dueDate asc` nulls last, `title asc`, `id asc`) — the dashboard performs no client-side re-sort.
4. Both APIs are registered in the app store (reducer + middleware + the serializability ignore list) and expose their query states (`isLoading`, `isFetching`, `isError`, `data`, `refetch`) to the sections; the store's existing `features/session` RTK Query API keeps working unchanged.

## Tests to add

- `apps/web/src/features/dashboard/model/dashboardRange.test.ts` (new):
  - **Window:** for a known instant, `dashboardTodayRange()` returns `{ from, to }` as `YYYY-MM-DD` strings spanning **five** days with the browser-local date in the middle (`from` = browser-local − 2 days, `to` = browser-local + 2 days); the span is ≤ 31 days (the API's cap). The helper must take the instant (and/or the browser-local civil date) as an injected input so the test is deterministic and does not depend on the machine's own zone.
  - **Adversarial zone pair (required — the 26-hour spread):** for a profile zone `Pacific/Kiritimati` (UTC+14) with a browser zone `Etc/GMT+12` (UTC−12) — the **26-hour** maximum IANA UTC-offset spread, where the two civil dates are **two days apart** — the computed window **contains the server-echoed `today`**. Assert both directions of the spread: the profile zone's civil date two days **ahead** of the browser's and two days **behind** it, and that the server's `today` falls inside `[from, to]` in each case.
  - **Day selection:** `selectTodayEvents(events, today)` returns only the events whose `date` equals the given day — including the case where the payload's `today` differs by one day from the browser-local date (a `Pacific/Auckland` profile zone with a `UTC` browser) **and** the two-day case above: the events dated `today` are selected, and the neighbouring days' events are not.
  - **Boundary:** an event dated the day before or after `today` is excluded.
- `apps/web/src/features/dashboard/model/dashboardSelectors.test.ts` (new):
  - **Overdue split:** a `PENDING`/`IN_PROGRESS` row with a `dueDate` strictly before `now` is overdue; a `COMPLETED`/`SUBMITTED`/`GRADED` row with the same `dueDate` is **not** overdue; a row with a null `dueDate` is not overdue; a row due exactly at `now` is not overdue (the predicate is "strictly before"). `now` is injected for determinism.
  - **Upcoming split:** the upcoming list contains the unfinished, non-overdue rows; a null-`dueDate` unfinished row is included; finished rows are excluded from both lists.
  - **Order preserved:** given a payload in the endpoint's order (`dueDate asc` nulls last, `title asc`, `id asc`), the derived lists keep that relative order — the selectors do not re-sort (assert with a payload whose title order contradicts the due-date order).
  - **Limits:** `limitRows(rows, n)` truncates to `n` and reports the remainder so the section can show "…and N more".
  - **Calendar sets:** `selectTodayClasses` / `selectTodayStudySessions` filter by `type` and by the selected day; a `STUDY_SESSION` event with `focus: true` keeps its flag.
- `apps/web/src/features/assignments/api/assignmentsApi.test.ts` and `apps/web/src/features/calendar/api/calendarApi.test.ts` (new): the endpoints hit the right URL and method, send no extra parameters (assignments) / only `from` and `to` (calendar), and return the payload unchanged.
- `apps/web/src/app/store/store.test.tsx` (existing — update): both new reducer paths are registered and their middleware is in the chain; the pre-existing `features/session` API slice still registers and dispatches.
- **Verification:** `pnpm --filter web test -- src/features/dashboard src/features/assignments src/features/calendar src/app/store`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified codebase facts (inspected 2026-10-29)

- **The only RTK Query API today** — `apps/web/src/features/session/api/sessionApi.ts`: `createApi` with `reducerPath: 'api'`, one `resendVerification` mutation, and a local `axiosBaseQuery` (a `BaseQueryFn` over `httpClient.request`, mapping a rejection to `{ error: { message, code } }` where `code` is the HTTP status as a string — RTK's `miniSerializeError` copies only string properties).
- **Store registration** — `apps/web/src/app/store/store.ts`: `configureStore` with `auth`, `onboarding` and `[api.reducerPath]: api.reducer`, `api.middleware` concatenated, and `serializableCheck: { ignoredActions: [api.reducerPath] }`. `apps/web/src/app/store/hooks.ts` holds the typed hooks; `apps/web/src/app/store/store.test.tsx` exists.
- **FSD lint zones** — `apps/web/.eslintrc.cjs:64-68`: `src/entities` may **not** import from `src/features`. This is why the base query must live in `shared/` (D05-7): `entities/` is the natural home for a domain API module, and it cannot import `features/session/api/sessionApi.ts`. `shared/` may import nothing above it (`:56-62`).
- **Transport** — `apps/web/src/shared/api/httpClient.ts`: an axios instance with `baseURL: import.meta.env.VITE_API_URL || '/api'`, `withCredentials: true`, the bearer-token/refresh/recovery interceptor chain and error sanitization. The Vite proxy strips `/api` (`apps/web/vite.config.ts`). RTK's base query must reuse this instance so the interceptor chain stays the single transport (the same reason `sessionApi.ts` uses it).
- **The two entity clients to reuse** — `entities/assignment/api/assignmentApi.ts` (`listAssignments(params = {})` — every param optional; an empty call sends no query string at all) and `entities/calendar/api/calendarApi.ts` (`listCalendarEvents({ from, to })`).
- **The calendar payload** — `apps/api/src/modules/calendar/calendar.service.ts:68-75` (`formatToday(timeZone)` → the profile zone's civil date) and `:156-178` (order + 31-day cap; `from === to` is legal). `today` is the **only** server-provided notion of the student's current day.
- **The client cannot derive the zone reliably — for a verified student either** — `apps/web/src/entities/user/model/types.ts:6-9` (`timeZone?: string`, "Undefined on login/refresh session users") and `apps/web/src/pages/profile/ui/ProfilePage.tsx:58` (IR-106-01: login/refresh/boot session users carry no `timeZone`). Confirmed for a **verified** student this pass: `apps/web/src/features/auth/model/AuthContext.tsx` calls `refreshProfile()` (which fetches `GET /users/me`) **only** when `emailVerifiedAt === null` — the `window` focus handler at `:153` and the effect's refresh at `:142`. So on the dashboard path `GET /users/me` is never fetched for a verified student, `SessionUser.timeZone` stays `undefined`, and the client **cannot** derive the profile zone from the session. The payload's `timeZone`/`today` are the only authoritative values.
- **The IANA offset bound that sizes the request window** — the maximum UTC-offset spread in the IANA database is **26 hours** (UTC−12 `Etc/GMT+12` / Baker Island ↔ UTC+14 `Pacific/Kiritimati`); both are permanent, non-DST zones, so the pair is realizable in practice, not only on paper. A 26-hour civil difference means the browser's and the profile zone's civil dates can be **two calendar days apart**, so the window must be **± 2 days** to contain the profile zone's "today" for every legal offset pair (PC-EP05-01).
- **The calendar page's range derivation (do not copy — it is an EP04 defect)** — `apps/web/src/pages/calendar/ui/CalendarPage.tsx:29-43` (`mondayOf`/`formatYMD` use the browser's local getters), `:56` and `:141` (`new Date()`), `:68-85` (browser-local `from`/`to` and `days`): the server interprets `from`/`to` in the **profile zone** (`calendar.service.ts` — `rangeStartInstant`/`rangeEndInstant` via `wallToInstant(..., timeZone)`) and buckets events by the profile-zone civil date, so the page's columns and its events can disagree. Recorded as EP04 follow-up **FU-EP04-01** (PC-EP05-02); EP05's own derivation is unaffected and must not be changed to match it.
- **The shared predicates** — `apps/web/src/entities/assignment/model/status.ts`: `isUnfinishedAssignment` (PENDING | IN_PROGRESS), `isOverdueAssignment` (unfinished ∧ non-null `dueDate` strictly before `now`; `now` is injectable), `isFinishedAssignment`, `isDueSoonAssignment`.
- **The endpoint's default order** — `apps/api/src/modules/assignments/assignments.service.ts:315-328`: `sort = 'dueDate'`, `order = 'asc'`, `orderBy: [{ dueDate: order }, { title: 'asc' }, { id: 'asc' }]`; ascending order keeps null `dueDate`s last (PostgreSQL default). SP-122's D122-5 documents the same contract.
- **`GET /assignments` has no pagination** (SP-122's D122-7) — the whole list comes back. The dashboard accepts this trade-off (D05-3) and re-checks it when pagination lands (V-05-3).
- **The calendar query DTO whitelists only `from`/`to`** — `apps/api/src/modules/calendar/dto/list-calendar-events-query.dto.ts`; the global `FieldValidationPipe` (`whitelist` + `forbidNonWhitelisted`) rejects any other query parameter with a 400. So the dashboard cannot widen the read surface even by accident.

### Design decisions (planner-recorded)

1. **Two `createApi` instances, not one.** D05-1 requires one RTK Query API per domain. Each instance owns its own `reducerPath` (`assignmentsApi`, `calendarApi`) and both are added to the store's reducer map, middleware chain and serializability ignore list. A single shared instance would re-create the "one large service that owns unrelated business rules" the epic's technical note warns against.
2. **The slices reuse the entity clients.** Each endpoint's `queryFn` calls the existing `listAssignments()` / `listCalendarEvents()` (or issues the identical axios request). This keeps one definition of each request's shape and leaves EP03's/EP04's pages untouched. `transformResponse` must not reshape the payload — the section selectors consume the endpoint's contract as-is.
3. **The request window is browser-local ± 2 days; the selection key is `result.today`.** The window's *size* is derived from the **26-hour maximum IANA UTC-offset spread** (UTC−12 ↔ UTC+14): the browser's and the profile zone's civil dates can be **two calendar days apart**, so a ±1-day window does not guarantee that the profile zone's "today" is inside the fetched range (PC-EP05-01). With |Δ| ≤ 26 h < 48 h, the profile zone's civil date is always within ±2 days of the browser's, so the **± 2-day window (5 days inclusive)** provably contains it for every legal offset pair; 5 ≤ the API's 31-day inclusive cap. The window's endpoints stay browser-local civil dates (the client cannot compute the profile zone's date at all — see the verified facts), and the **selection is always by the server's `today`**, so no client-side zone arithmetic is introduced (D404-2 stays intact). The API's minimum span is one day (`from === to` is legal) — recorded so the implementer knows a single-day window is *legal but not safe*.
4. **No client-side re-sort.** The selectors filter the endpoint's payload and keep its order (D05-9). The dashboard therefore inherits the documented default sort and does not duplicate a sort rule that could drift.
5. **Null-`dueDate` unfinished rows stay in "upcoming deadlines".** They are unfinished work without a deadline; the server's nulls-last order places them last, and the row must be labelled (not blank) by EP05B.
6. **Pure derivations live in `features/dashboard/model/`**, not in the page. They are testable without React and are the contract EP05B renders.
7. **The dashboard's derived model is derived, not stored.** There is no dashboard slice, no cached copy of "today's classes", and no local mutation of the source payloads.

### Proposed files

- `apps/web/src/shared/api/rtkBaseQuery.ts` (**new**) — `axiosBaseQuery` + `AxiosBaseQueryError` moved from `features/session/api/sessionApi.ts`; `sessionApi.ts` re-exports them so existing importers keep working.
- `apps/web/src/features/session/api/sessionApi.ts` (modify) — import the base query from `shared/`; **no behaviour change**.
- `apps/web/src/features/assignments/api/assignmentsApi.ts` (**new**) — `assignmentsApi` (`createApi`) + the `useAssignmentsQuery` hook.
- `apps/web/src/features/calendar/api/calendarApi.ts` (**new**) — `calendarApi` (`createApi`) + the `useCalendarEventsQuery` hook.
- `apps/web/src/app/store/store.ts` (modify) — register both slices.
- `apps/web/src/features/dashboard/model/dashboardRange.ts` (**new**) — `dashboardTodayRange()`, `selectTodayEvents()`.
- `apps/web/src/features/dashboard/model/dashboardSelectors.ts` (**new**) — `selectTodayClasses()`, `selectTodayStudySessions()`, `selectUpcomingAssignments()`, `selectOverdueAssignments()`, `limitRows()`.
- Tests beside each new module, plus the update to `apps/web/src/app/store/store.test.tsx`.

### Remaining risks / implementation notes (not blockers)

- **RTK Query + the axios interceptor chain.** The base query must go through the shared `httpClient` (not a bare axios call) so the bearer token, the single-flight refresh and the recovery barrier keep working. Reuse the existing `axiosBaseQuery` implementation verbatim.
- **`keepUnusedDataFor`.** The session API uses `300`. The dashboard's slices should pick an explicit value (the implementer's call, default 60s is RTK's) — record the choice in the implementation record; it affects how long a stale "today" survives a navigation.
- **"Today" changes at midnight.** `result.today` is the server's date **at request time**. A tab left open across midnight keeps showing the previous day until the query refetches. This is a known limitation, not a defect to solve in EP05; note it in the implementation record.
- **The `now` used for overdue.** `isOverdueAssignment` defaults to `Date.now()` (the browser clock). The dashboard's clock and the server's clock can disagree by a minute or two at a deadline boundary. The shared predicate is the single source of truth and is not re-implemented; the limitation is recorded rather than worked around.
- **Two RTK Query instances in one store.** Both middlewares must be concatenated and both reducer paths ignored by the serializability check, or the store will warn on every dispatch.
- **The hook's cache key.** The calendar query key must include `from`/`to`, so different ranges do not collide in the cache.
- **`entities/` may not import `features/`** — the lint zone (`apps/web/.eslintrc.cjs:64-68`) will fail the build if the slices are placed under `entities/`. Keep them under `features/` (D05-8).
- **No dashboard test file exists today**, so `apps/web/src/pages/dashboard/` has no test scaffolding to extend.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input (no form, no query parameter added by the student).
3. Not applicable — no data-access change; no backend endpoint is added or amended, and no principal-scoped identifier is accepted from the client.
4. Not applicable — no API error-contract change; the transport's error shape is unchanged.
5. The query states are exposed to the sections (loading / fetching / error / data / refetch) so EP05B can render them; EP05B owns the visible states.
6. Not applicable in this child — no interactive surface is added; keyboard behaviour is owned by EP05B/EP05C.
7. Not applicable in this child — no layout is added; responsive behaviour is owned by EP05B/EP05C.
8. Automated tests pass (TR-E05-01), including the profile-zone ≠ browser-zone case — **both** the ±1-day-pair case (`Pacific/Auckland` profile, `UTC` browser) **and** the adversarial 26-hour-spread pair (`Pacific/Kiritimati` +14 vs `Etc/GMT+12` −12) whose civil dates are two days apart — the overdue boundary cases and the order-preservation case.
9. Not applicable — no API change and no migration. The consumed contracts are documented in `docs/stories/EP05/README.md#shared-dashboard-data-contract`.
10. Integrated review — the combined EP05 parent review (all three children).
11. Reviewer walkthrough — the combined EP05 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** the dashboard has a tested data layer — two per-domain RTK Query slices registered in the store, plus the pure "today"/assignment-split derivations the sections render.
- **Request/token estimate:** ~2–3 requests/tokens — base-query extraction + two slices + store wiring + two pure modules with their unit tests and the store test update. Uncertainty: low-to-moderate; the RTK Query wiring is small but the time-zone reasoning and the store registration need care, so it may run to the upper end. The 2026-10-29 correction (PC-EP05-01) adds a bounded amount of work: the window computation becomes a **5-day** civil-date derivation and one adversarial test case (26-hour spread) is added beside the retained ±1-day-pair case — no new module, no new dependency.
- **Model recommendation:** 3 — moderate technical risk (RTK Query store wiring, the profile-zone-vs-browser-zone derivation, and keeping the existing session API intact through a refactor), but no novel algorithms and no UI decisions. The corrected window rule is a pure civil-date computation with a stated bound, which does not raise the tier.
- **Files:** `apps/web/src/shared/api/rtkBaseQuery.ts` (new), `apps/web/src/features/session/api/sessionApi.ts` (modify), `apps/web/src/features/assignments/api/assignmentsApi.ts` (new), `apps/web/src/features/calendar/api/calendarApi.ts` (new), `apps/web/src/app/store/store.ts` (modify), `apps/web/src/features/dashboard/model/dashboardRange.ts` (new), `apps/web/src/features/dashboard/model/dashboardSelectors.ts` (new), `apps/web/src/features/dashboard/model/dashboardRange.test.ts` (new), `apps/web/src/features/dashboard/model/dashboardSelectors.test.ts` (new), `apps/web/src/features/assignments/api/assignmentsApi.test.ts` (new), `apps/web/src/features/calendar/api/calendarApi.test.ts` (new), `apps/web/src/app/store/store.test.tsx` (modify).
- **Start context:** this story; `docs/stories/EP05/README.md` (shared dashboard data contract + decisions D05-1, D05-3, D05-6…D05-9); `apps/web/src/features/session/api/sessionApi.ts`; `apps/web/src/app/store/store.ts`; `apps/web/src/entities/assignment/api/assignmentApi.ts`; `apps/web/src/entities/calendar/api/calendarApi.ts`; `apps/web/src/entities/assignment/model/status.ts`; `apps/web/src/entities/calendar/model/types.ts`; `apps/api/src/modules/calendar/calendar.service.ts` (the `today` computation).
- **Verification:** `pnpm --filter web test -- src/features/dashboard src/features/assignments src/features/calendar src/app/store`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP02/EP03/EP04 complete (satisfied). Excludes all UI (EP05B, EP05C), the quick action and empty states (EP05C), the parent index (EP05C), any backend work (D05-3), and any date picker (D05-4).

## UI/UX gaps for the `ui-refiner`

None apply to this child: it renders no user-visible surface, so a UI/UX pass would be a category error (D05-12). The **narrow presentation coupling** this child owns — the contract EP05B/EP05C present — is recorded here so the `ui-refiner` can settle it as part of their pass:

- **Loading shape:** whether the page shows one whole-page spinner while the queries run, or a per-section skeleton — this child only decides that the two queries' states are independent and both are observable.
- **Partial failure:** if the assignments query fails but the calendar query succeeds, only the assignment sections may show an error; the calendar sections must still render. This child exposes the two states independently; EP05B renders them.
- **"Today" labelling:** the payload's `today` and `timeZone` are the values any "today" label must be derived from; the wording ("Today", "Wednesday 29 October", the zone label) is EP05B's/ui-refiner's decision.
- **Refetch affordance:** `refetch()` is available per query; whether a failed section shows a "Try again" button and whether a background refetch is silent is EP05B's decision.
- **If this pass changes any of the above, EP05A is amended first** (the sections depend on the exact states it exposes).
