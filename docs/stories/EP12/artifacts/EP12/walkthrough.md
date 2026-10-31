# EP12 — User Walkthrough (Tech Debt Cleanup)

**Review unit:** EP12 (parent) — children EP12A (backend timezone), EP12B (Dialog primitive), EP12C (API client unification)
**Final review:** [`review.md`](./review.md) (PASS, 2026-10-31, HEAD `e124c95`)
**Scope:** Refactor-only. No new product behavior, no API contract or schema change.

---

## 1. What changed

EP12 removes three acknowledged duplication sources without changing product behavior:

1. **EP12A — one seam for IANA time-zone date conversion (backend).** `calendar.service.ts` and `study-plans.service.ts` no longer keep private copies of the `Intl.DateTimeFormat('en-CA', { timeZone })` civil↔instant conversion. All of it lives in `apps/api/src/common/lib/civil-date.ts` (`zoneParts`, `wallClockToInstant`, private `tzOffsetMs`) plus `addDays`/`dayOfWeekOf` in `apps/api/src/common/lib/calendar-date.ts`. Existing calendar/study-plans pins pass unchanged.

2. **EP12B — one shared modal primitive (frontend).** 11 hand-rolled dialogs (`role="dialog" aria-modal="true"`) in `apps/web/src/features/**` now render through `shared/ui/Dialog`. The primitive gained one backwards-compatible `busy?: boolean` prop for the in-flight state every dialog hand-rolled. ~450 lines of duplicated trap/escape/backdrop/scroll code removed. Header drawer, onboarding shell and action menus are intentionally untouched.

3. **EP12C — one client per dashboard endpoint (frontend).** The calendar and assignments RTK Query slices no longer re-state the URL/params contract; they delegate to the entity clients (`listCalendarEvents`, `listAssignments`) through a new generic `entityBaseQuery<Arg, Result>` in `shared/api/rtkBaseQuery.ts`. Error mapping stays byte-equivalent.

---

## 2. How the code works

### EP12A — civil-date seam
- **Forward (instant → civil):** `zoneParts(instant, timeZone)` runs the `en-CA` `formatToParts` arithmetic, normalizes hour `24` → `00`, returns `{ date, time }` with two-digit `HH:mm`. `toCivilDate` delegates to `zoneParts(...).date`. Invalid zones fall back to `UTC` via `resolveTimeZone` (never throws).
- **Reverse (civil → instant):** `wallClockToInstant(dateStr, timeStr, timeZone)` runs the existing 3-iteration correction loop using the private `tzOffsetMs` helper. Invalid zone → `UTC`.
- **Date-string arithmetic:** `addDays`/`dayOfWeekOf` in `calendar-date.ts` (UTC-midnight counter; assumes valid `YYYY-MM-DD`).
- **Call sites:** calendar's `rangeStartInstant`/`rangeEndInstant` are thin wrappers (`wallClockToInstant(from, '00:00', tz)` and `wallClockToInstant(addDays(to, 1), '00:00', tz)`); study-plans `save()` calls `wallClockToInstant` directly at `:787-788`; session display derives minutes from `zoneParts(...).time`.

### EP12B — Dialog primitive
- **`busy` prop:** while busy, Escape and backdrop clicks are internally inert (`onClose` never invoked), Tab is trapped on the container, and focus is re-focused on the container when the focusable set empties mid-flight. Container sets `aria-busy` when the prop is provided.
- **Restore focus:** tracked by `closedViaOnCloseRef`, set true only on primitive-initiated close (Escape/backdrop), so success paths skip restoring to a deleted trigger.
- **Migrated dialogs:** keep their `<form>` in children (buttons stay inside the form), `role="alert"` error blocks, dynamic titles via `title`, Delete `aria-label`, and `AvailabilitySlotForm`'s dirty-check `requestClose()` via `onClose`.

### EP12C — delegating baseQuery
- **`entityBaseQuery<Arg, Result>(fetcher)`** returns a `BaseQueryFn` that calls `fetcher(arg)` and maps rejections identically to `axiosBaseQuery` (`{ message, code: String(status) }` from `failure.response?.status`).
- **Calendar slice:** `baseQuery: entityBaseQuery(listCalendarEvents)` with `query: (arg) => arg`.
- **Assignments slice:** `baseQuery: entityBaseQuery(() => listAssignments())` with `query: () => undefined`.
- **Caching unchanged:** `reducerPath`, `keepUnusedDataFor: 60`, hook names, store registration all preserved; no tags/invalidation added.

---

## 3. Why it is correct

- **ACs:** every AC in EP12A/B/C is satisfied (see `review.md` AC tables). Private copies deleted; URL contract consolidated; primitive semantics preserved.
- **DoD:** applicable items 1, 3, 4, 5, 6, 8, 10, 11 pass; items 2, 7, 9 not applicable.
- **Automated evidence (implementer-recorded):**
  - EP12A: `pnpm --filter @studypilot/api test` — 40 suites, 883 passed, 436 skipped; lint (`--max-warnings 0`), typecheck, build, format clean.
  - EP12B: `pnpm --filter @studypilot/web test` — 1094 passed; lint/typecheck/build clean.
  - EP12C: `pnpm --filter @studypilot/web test` — 1092 passed; lint/typecheck/build clean.
- **Regression guards added:** T-12A-1…T-12A-5, T-12A-7/T-12A-8; T-12B-1…T-12B-5; T-12C-1…T-12C-3.
- **Mandatory findings:** none open (2 polish observations recorded in `review.md`).

---

## 4. Manual test workflows

### Workflow A — Calendar / study-plan dates (EP12A)
**Prerequisites:** local dev environment with API running; a student account with a non-UTC profile time zone (e.g. `America/New_York`).
**Actions:**
1. Open the calendar page and view a week spanning a DST transition.
2. Generate and save a study plan covering that week.
3. Verify session start/end wall times match the student's profile zone (no off-by-one day).
**Expected:** civil dates and wall times unchanged from pre-refactor behavior; no 404/500; existing e2e calendar/study-plan specs green.
**Edge cases:** invalid/unreadable stored time zone falls back to UTC (no crash); midnight renders as `00:00`.
**Status:** Not executed — user test instructions (no browser/E2E run recorded for EP12A; unit pins cover the conversion).

### Workflow B — Modal dialogs (EP12B)
**Prerequisites:** web app running; any page with a delete dialog and a form dialog.
**Actions:**
1. Open a delete dialog (e.g. delete an assignment). Press Escape → dialog closes, focus returns to trigger. Click backdrop → closes. Click Cancel → closes.
2. Trigger a delete and observe the Delete button disables + `aria-busy` on the container; Escape/backdrop do nothing while in flight; focus stays on container.
3. Open an assignment form dialog; submit with invalid input → error `role="alert"` renders; Escape while submitting is inert.
4. Verify scroll lock while open and focus trap (Tab cycles within dialog).
**Expected:** identical behavior to pre-refactor across all 11 dialogs; no layout/copy changes beyond accepted passive deltas (scroll-lock, close animation, `text-h3` title).
**Status:** Not executed — user test instructions (keyboard behavior covered by unit tests; no manual browser walk recorded).

### Workflow C — Dashboard data (EP12C)
**Prerequisites:** web app running; dashboard with calendar events and assignments.
**Actions:**
1. Load dashboard; verify events and assignments render with correct data.
2. Simulate a 400/404 from the API (or use existing failure fixtures) and verify the dashboard shows the actionable error message with the correct code.
3. Verify refetch behavior unchanged.
**Expected:** no duplicated requests; error shape `{ message, code }` preserved; no console errors.
**Status:** Not executed — user test instructions (unit tests cover delegation and error shape).

---

## 5. Execution status

| Workflow | Status |
|---|---|
| A — Calendar/study-plan dates | Not executed — user test instructions |
| B — Modal dialogs | Not executed — user test instructions |
| C — Dashboard data | Not executed — user test instructions |

Required manual gates (DoD 10/11) are satisfied by this review + recorded unit coverage; no AC required a manual-only gate that lacks evidence.
final