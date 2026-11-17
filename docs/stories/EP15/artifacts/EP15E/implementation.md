# EP15E implementation record

**Story:** [EP15E — The Week Grid: Hour Axis, Day Bounds, Free Time](../../EP15E-week-grid.md)
**Status:** Implemented — awaiting parent review (amended 2026-11-17, see Addendum)
**Date:** 2026-11-17
**Commit scope:** `apps/web/src/entities/calendar/model/types.ts`; new `pages/calendar/lib/week.ts` (+ test), `features/calendar/lib/gridModel.ts` (+ test), `features/calendar/ui/WeekGrid.tsx` (+ test); `WeekView.tsx` deleted; `CalendarEventChip.tsx`, `CalendarEventDetails.tsx`, `CalendarAgenda.tsx`, `pages/calendar/ui/CalendarPage.tsx` (+ their tests); `days: []` added to two foreign fixtures (`features/calendar/api/calendarApi.test.ts`, `pages/dashboard/ui/DashboardPage.test.tsx`) and the `days` case in `entities/calendar/api/calendarApi.test.ts`; this record; story Status/rulings/sizing; README row + Next; `efficiency.md`. No `index.css` / `tailwind.config.js` change; no new shared primitive; no API change.

Decisions applied: D-E1…D-E8 (ratified by default 2026-11-17 at implementation start, on the user's instruction). Epic D15-9, D15-10, D15-12, D15-14 as written. None reopened.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP15E-AC1 — ≥ `sm`: seven-column grid with an hour axis covering at least min wake → max sleep; every timed kind positioned by start/end; deadlines + `FLEX_DAY` in a day-level row; each kind has text + icon; activating opens details | **Done.** `WeekGrid` renders header row, all-day row and a 15 px-row CSS grid per day at 60 px/hour (D-E7); `hourRange` = floor(min wake) − 1 h … ceil(max sleep) + 1 h, widened for timed items, ≥ 08:00–22:00, clamped (D-E1); `layoutLanes` greedy up to three lanes then an 8 px stacked offset; `STUDY_BLOCK` is a full-width dashed zone under the chips with its chip at the top (D-E6); the chip's grid layout reads label · title · time(–end) · course code · tags with three density tiers whose hidden parts are sr-only (D-E8); EVENT = Briefcase "Busy" solid chip, STUDY_BLOCK = BookOpen "Study block"; `Repeat` marker + sr-only "repeats weekly"; default-title chips show the kind once; details dialog gains Repeats / Energy rows and the `actions` slot (D-E3). | `gridModel.test.ts` (11), `WeekGrid.test.tsx` (13), chip (+4), details (+3); screenshots `calendar-desktop2.png` in the session scratchpad |
| EP15E-AC2 — outside-bounds shading with the exact accessible names; free intervals drawn and labelled from the threshold; shorter pieces drawn unlabelled | **Done.** Hatched `role="img"` regions "Before your day starts" / "After your day ends" with aria-hidden captions "Day starts 08:00" / "Day ends 23:00"; no after-region for `24:00`; free pieces are 2 px dotted outlines, captioned "Free · 14:00–16:00" from 30 min, `aria-hidden` below; nothing focusable (D-E2). | `WeekGrid.test.tsx` AC2 cases (4) |
| EP15E-AC3 — week, headers and today marker from server `today`/`from`/`to` by civil-string arithmetic; Today → server today; ± 7 civil days; Kiritimati vs Etc/GMT+12 evidence a–d | **Done.** `week.ts` (`addDays`, `mondayOf`, `weekdayOf` as integer arithmetic on `Date.UTC`; `utcTodayGuess` the only Date construction); the page anchors on a Monday string, bootstraps from the UTC guess and re-requests `mondayOf(today)` once when the server's today falls outside (D-E5); `dayHeaderLabel` via `Date.UTC`/`getUTCDay`. Grep tests pin the absence of local getters in both modules. | `week.test.ts` (3), `CalendarPage.test.tsx` FU-EP04-01 a–d + D-E5 + grep (6) |
| EP15E-AC4 — agenda below `sm` lists the same days with bounds, items and free intervals in time order; loading skeleton; error + retry; empty week copy with bounds still drawn; keyboard time order with a visible ring; reduced motion | **Done.** Agenda lists all seven days with "Day 08:00–23:00" lines and free lines on the same threshold (D-E4); skeleton = axis + seven columns, `motion-reduce:animate-none`; empty copy verbatim in the middle all-day cell (grid) or once above the agenda; chips are `button`s in time order (zones and chips share one time-sorted DOM sequence; z-index keeps zones under) with `focus-visible:ring-2 ring-focus-ring`; every `animate-*`/`transition` carries its `motion-reduce` companion. | agenda (+3 and 2 updated), page AC4 (4), `WeekGrid.test.tsx` AC4 (2) |

## Manual accessibility pass (TR-E15-11)

| Step | Result |
|---|---|
| Keyboard order within a day (all-day first, then start order) and visible focus ring | **Executed by test** (`WeekGrid.test.tsx` AC4) and by inspection of the DOM order in the screenshot session. |
| Reduced motion | **Executed by test**: no `animate-*`/`transition` without `motion-reduce:*-none` (grid and skeleton). |
| 375 px agenda | **Executed**: `calendar-phone.png` — seven days, bounds lines, free lines, chips ≥ 44 px, one-thumb scroll. |
| VoiceOver reading of a day column | **Not executed** — no screen reader in this environment. User instruction: on `/calendar`, VO+→ across Monday; expect "Mon 16 … Before your day starts, image … Class: Algorithms, 09:00–10:30, button … Free · 10:30–23:00 … Study block: Deep work, repeats weekly, 18:00–20:00 · CS101, High energy, button … After your day ends, image". |

**TR-E15-11 closure (2026-11-17):** the user confirmed executing the remaining manual steps above (screen reader / visual / OS reduce-motion) and that they passed — instruction "Mark all human steps as passed" in the coordinating session; R-EP15-19 closed ([review addendum](../EP15/review.md#addendum--r-ep15-19-closed-by-the-user-2026-11-17-recorded-by-the-live-session)).

## Verification (2026-11-17, this worktree)

**Tested state:** `HEAD 5797aa1` + the uncommitted changes that form this commit.

- **Web unit:** `npx vitest run` (cwd `apps/web`) → **115 files, 1335 passed, 0 failed** (45 new/rewritten in the calendar suites; 1290 at EP14E + EP15D's none).
- **Web static:** `npx tsc --noEmit -p tsconfig.json` ✓; `eslint . --max-warnings 0` ✓; prettier check on every changed file ✓.
- **Web E2E (full, self-contained stack):** `DATABASE_URL=postgresql://<local user>@localhost:5432/postgres JWT_SECRET=… FRONTEND_URL=http://localhost:3100 pnpm --filter @studypilot/web test:e2e` → **55 passed / 0 failed, 25.3 s** — the `calendar.spec.ts` journeys (grid chip regex, agenda, live resize) pass against the new grid unchanged.
- **Visual check:** a throwaway API (:4200) + Vite (:3200) on a migrated throwaway database, seeded with bounds (07:30–23:00 weekdays, 09:00 weekends), two class meetings, a deadline, weekly and one-off BUSY blocks, a 15-minute block and a weekly HIGH study block tied to a course; screenshots at 1280 and 375 px. Found and fixed before commit: the energy pill wrapped inside the 112 px column and pushed the study block's title out of its chip; the course code was not shown on the grid chip (F-EP15E-01). Servers stopped and database dropped afterwards.
- **Red-first:** the new grid/page tests were written against the story; first run failed 2 (a doc comment that contained the construction string the grep counts; study-block zones rendered before chips in DOM order, breaking keyboard time order — fixed by one time-sorted sequence). The visual pass caught F-EP15E-01, which no test had pinned.

## Changed paths

- Types/API: `apps/web/src/entities/calendar/model/types.ts` (+ `EVENT`/`STUDY_BLOCK`, − `AVAILABILITY`/`BLOCKED_TIME`, block fields, `CalendarDay`, `days`).
- New: `apps/web/src/pages/calendar/lib/week.ts`, `features/calendar/lib/gridModel.ts`, `features/calendar/ui/WeekGrid.tsx` (+ three test files).
- Changed: `features/calendar/ui/CalendarEventChip.tsx`, `CalendarEventDetails.tsx`, `CalendarAgenda.tsx`, `pages/calendar/ui/CalendarPage.tsx` (+ tests); deleted `features/calendar/ui/WeekView.tsx`.
- Fixtures: `features/calendar/api/calendarApi.test.ts`, `pages/dashboard/ui/DashboardPage.test.tsx` (`days: []`), `entities/calendar/api/calendarApi.test.ts`.
- Docs: this record; story Status, D-E1…D-E8 rulings, sizing; README row + Next; `efficiency.md`.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP15E-01 | `CalendarEventChip.tsx` grid layout; visual pass | In a 112 px column the energy pill wrapped onto two lines inside the label row and pushed the study block's title out of its 60 px chip; the course code the story lists for the chip was not rendered. | **Fixed:** tags are `whitespace-nowrap` and sit on the time line after the course code; the zone chip may use up to 75 px (5 rows). | — |
| F-EP15E-02 | Same chip, 75 px zone chip at 112 px columns | With title, time, course code and an energy pill, the pill falls below the chip's visible height at the narrowest column (it stays in the accessible name and in the details dialog). | **Open for the refiner / EP15G:** either drop the pill from the grid chip (energy is in the dialog) or let the zone chip grow to 90 px. No AC is unmet; recorded for the parent review. | refiner / EP15G |
| F-EP15E-03 | Agenda chip (`layout="agenda"`) | The agenda shows only the start time ("13:00"), not the range, so a four-hour shift and a 15-minute errand read alike until opened; the grid shows the range. | **Noted** (SP-129A behaviour kept; the story did not change the agenda chip's time text). Suggest "13:00–17:00" in EP15G when the agenda gains its actions. | EP15G / planner |
| F-EP15E-04 | `CalendarAgenda` R129-002 pin; `CalendarPage` narrow empty pin | Two SP-129A tests asserted an empty week renders **no** agenda; EP15E-AC4 says the agenda lists every day because bounds and free time exist every day. | **Superseded:** both tests rewritten to the new rule, titles cite EP15E-AC4. | parent review to note |

## Deviations

1. **`days` is required on `CalendarEventsResult`** (the story offered optional block fields "so older fixtures compile"); two fixtures outside the calendar slices gained `days: []`. The block fields themselves stay optional as specified.
2. **Study-block zones and timed chips render as one time-sorted sequence** rather than two layers in DOM order, so keyboard order is start order (AC4); z-index preserves the visual layering D-E6 asks for.
3. **The zone chip may be 75 px, not 60 px** (F-EP15E-01) so the three-line full tier plus course code fits.
4. **No `WeekView.dayHeader` alias kept**; the page, agenda and grid import `dayHeaderLabel` from `gridModel` as the story specifies.

## Addendum — user-ruled amendments (2026-11-17, second commit)

After the first visual pass the user ruled five changes (D-E7 override, D-E9…D-E12 in the story's Decisions table):

| Change | Where | Test |
|---|---|---|
| Free-time caption threshold 30 → 60 min (outline unchanged) | `gridModel.ts` `FREE_LABEL_MIN`; agenda free lines follow | `gridModel.test.ts`, `WeekGrid.test.tsx`, `CalendarAgenda.test.tsx` |
| "Now" marker on today's column, profile-zone minute via `Intl`, refreshed every minute (D-E9) | new `features/calendar/lib/now.ts`; `WeekGrid` `nowMinute`; page effect | `now.test.ts` (2), `WeekGrid.test.tsx` (1), `CalendarPage.test.tsx` (1) |
| Agenda chip shows the range (D-E10) | `CalendarEventChip.tsx` `timeTextOf` | chip + agenda tests; `apps/web/e2e/calendar.spec.ts` agenda regex loosened |
| Energy pill visible from 90 px, sr-only below; zone chip up to 6 rows (D-E11) | `CalendarEventChip.tsx`, `WeekGrid.tsx` | `WeekGrid.test.tsx` (1) — closes F-EP15E-02 |
| Empty-week copy as one full-width line above the view (D-E12) | `CalendarPage.tsx`; `WeekGrid` lost `emptyMessage` | `CalendarPage.test.tsx` |

Verification (final content): web unit **116 files, 1340 passed, 0 failed** (two consecutive full runs after a single non-reproducible 3-test failure during the edit; the page suite then passed 5/5 in isolation); `tsc`, eslint, prettier ✓; Playwright **55 passed (21.9s)**. F-EP15E-02 and -03 are closed by D-E11 / D-E10. The CalendarPage grep test still pins the absence of browser-local Date getters (the marker reads `Intl.DateTimeFormat`).
