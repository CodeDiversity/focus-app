# EP15E — The Week Grid: Hour Axis, Day Bounds, Free Time

**Story ID:** EP15E
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Frontend
**Status:** Ready — refined 2026-11-16 (technical + UI/UX, D15-16); implementation blocked on the EP14 review unit (D15-11) and this story's queue dependencies
**Refined:** 2026-11-16 (refiner; layout, hour range, threshold, density and copy settled below — ready to implement once EP15D lands)
**Dependencies:** EP15D implemented (payload). Epic decisions D15-9, D15-10, D15-12, D15-14 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** `/calendar` renders an hour-axis week grid: Monday–Sunday columns, timed items positioned by start/end, the hours outside wake–sleep shaded, free time drawn and labelled, deadlines and flex planned sessions in a day-level row; the current week and its headers come from the server's civil dates (FU-EP04-01); the narrow-screen agenda shows the same items.
- **Why it improves it:** a student sees their real week and where study fits, instead of a list of chips (product, AC-E15-08/12); the week range stops depending on the browser clock (AC-E15-09, the FU-EP04-01 defect).
- **Decisions needing you:** none ▲ — D-E1…D-E4 ratify by default (D15-17); the refiner added D-E5…D-E8 (2026-11-16), none ▲ — they ratify by default too.
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Rebuild the read-only calendar on the new payload. No editing yet: EP15F
adds the bounds sheet, EP15G the block sheet, EP15H dragging. The grid is
the one surface everything else attaches to, so it is deliberately quiet:
few colours, text and icon markers, nothing interactive that does not open
details.

## Scope

**In:** `pages/calendar` (page + `lib/week.ts`), `features/calendar/ui/{WeekGrid (new), CalendarAgenda, CalendarEventChip, CalendarEventDetails}`, `features/calendar/lib/gridModel.ts` (new, pure), `entities/calendar` types/API, week derivation from server dates, states, keyboard order, reduced motion, component tests; the existing `calendar.spec.ts` (minus the slot assertions EP15D retired) stays green at the journey level; its "Manage availability" expectation (`:22`) is removed by EP15I; the full rewrite is EP15J.

**Out (explicit, against drift):**
- any write — the "Add" button, block sheet, bounds sheet and banner (EP15F/G/H); the toolbar's "Manage availability" link stays until EP15I;
- pointer handlers, `editable` prop, drag preview, resize handles (EP15H);
- free pieces as click/drag targets (D-E2; EP15H);
- the Plan page's own grid (`features/study-plan/ui/WeekGrid.tsx` → `PlanWeek`, unchanged — see Technical notes on why it is *not* borrowed);
- a day view, month view, "now" line, or any zoom/hour-density control (D15-14: one surface, no extra controls);
- new shared primitives (none are needed here); `index.css` / `tailwind.config.js` changes.

## Source requirement references

AC-E15-08 (rendering), AC-E15-09 (client), AC-E15-12; carried-forward AC-E04-01/02/03/06/07/08; TR-E15-05, TR-E15-11; DoD-5, DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. Above the `sm` breakpoint the calendar is a seven-column week grid with an hour axis whose visible range covers at least the week's earliest wake to latest sleep (exact range: refiner); every timed item (`CLASS`, `EVENT`, `STUDY_BLOCK`, `STUDY_SESSION`, FIXED `PLANNED_SESSION`) is positioned by its start and end; deadlines and `FLEX_DAY` planned sessions sit in a day-level row above the hours. Each kind keeps a text label and icon (never colour alone), and activating any item opens its details.
2. Hours outside `[wakeTime, sleepTime)` are shaded per day with an accessible name ("Before your day starts" / "After your day ends"); each `free` interval is drawn and labelled ("Free · 14:00–16:00"); pieces shorter than the refiner's threshold are drawn but not labelled.
3. The visible week, its day headers and the "today" marker derive from the server's `today`/`from`/`to` by civil-date string arithmetic; "Today" returns to the server's `today`; previous/next step seven civil days. With a profile zone of `Pacific/Kiritimati` and a browser zone of `Etc/GMT+12` the headers are the profile zone's week, no event is dropped, and the marked column equals `today` (FU-EP04-01 evidence a–d).
4. Below `sm` the agenda lists the same days with bounds, items and free intervals in time order and opens the same details; the loading skeleton, the error state with retry, and the empty week ("Nothing on your calendar yet — it's all free time" with the bounds still drawn) are implemented; items are reachable by keyboard in time order within a day, with a visible focus ring; motion respects `prefers-reduced-motion`.

## Tests (TR-E15-05)

Framework: Vitest + Testing Library (jsdom), files beside the component (`*.test.tsx`), pure helpers in `*.test.ts`. `matchMedia` is stubbed as in `CalendarPage.test.tsx` (`installMatchMedia`/`setNarrow`). Names below are the `it(...)` titles; each cites its AC.

- `features/calendar/lib/gridModel.test.ts` (pure, AC1/AC2):
  - "EP15E-AC1: hourRange — defaults 08:00–23:00 give 07:00–24:00 (one hour of padding each side, whole hours)"
  - "EP15E-AC1: hourRange — never narrower than 08:00–22:00 (bounds 10:00–20:00 → 08:00–22:00)"
  - "EP15E-AC1: hourRange — widens to include a timed item outside bounds (class at 06:30 → starts 05:00) and clamps to 00:00/24:00"
  - "EP15E-AC1: hourRange — mixed weekdays use the week's min wake and max sleep"
  - "EP15E-AC1: rowSpan — 15-minute rows from HH:mm, 24:00 → 1440, items are clipped to the visible range"
  - "EP15E-AC1: layoutLanes — two overlapping timed chips share the column in two lanes; three → three; a fourth stacks with an offset (D-E6)"
  - "EP15E-AC1: layoutLanes — STUDY_BLOCK never takes a lane (it is a zone under the chips, D-E6)"
  - "EP15E-AC2: isLabelledFree — 30 minutes is labelled, 29 is not (D-E7)"
- `features/calendar/ui/WeekGrid.test.tsx`:
  - "EP15E-AC1: renders seven day columns, an hour axis from the computed range, and the all-day row above the hours"
  - "EP15E-AC1: each timed item carries data-start/data-end minutes and a grid-row span matching its times (EVENT, CLASS, STUDY_SESSION, FIXED PLANNED_SESSION, STUDY_BLOCK)"
  - "EP15E-AC1: deadlines and FLEX_DAY planned sessions render in the all-day row, never in the hours"
  - "EP15E-AC1: every kind shows a lucide icon and a visible text label; no kind relies on colour (EVENT 'Busy', STUDY_BLOCK 'Study block')"
  - "EP15E-AC1: a chip equal to its default title ('Busy'/'Study') shows the kind label once"
  - "EP15E-AC1: density tiers — ≥ 60 min shows label, title and time; 30–59 min shows label and title with the time sr-only; < 30 min shows icon and title with label and time sr-only; the accessible name is complete in every tier (D-E8)"
  - "EP15E-AC1: click and Enter on any chip call onOpenEvent with the event"
  - "EP15E-AC2: the before/after shaded regions have role img and the exact accessible names 'Before your day starts' / 'After your day ends'; the visible captions read 'Day starts 08:00' / 'Day ends 23:00' and are aria-hidden"
  - "EP15E-AC2: a 24:00 sleep value renders no 'after' region"
  - "EP15E-AC2: free pieces ≥ 30 min read 'Free · 14:00–16:00'; shorter pieces are drawn with aria-hidden and no text"
  - "EP15E-AC2: free pieces and shaded regions are not focusable (D-E2)"
  - "EP15E-AC4: tab order within a day is time order, all-day row first; focus ring class present"
  - "EP15E-AC4: introduces no animation without its reduced-motion companion" (dashboard pattern: every `animate-*` element also carries `motion-reduce:animate-none`)
- `features/calendar/ui/CalendarEventChip.test.tsx` (extend; remove the AVAILABILITY/BLOCKED_TIME cases):
  - "EP15E-AC1: EVENT reads 'Busy' with the Briefcase icon; STUDY_BLOCK reads 'Study block' with the BookOpen icon"
  - "EP15E-AC1: a recurring item shows the Repeat icon with sr-only 'repeats weekly'; a one-off shows none"
  - "EP15E-AC1: STUDY_BLOCK energy HIGH/LOW shows the text tag 'High energy'/'Low energy'; NORMAL shows no tag (D-J6 carried over)"
  - "EP15E-AC1 (EP14D D-D3 kept): the accessible name follows the visible order in week, agenda and grid layouts"
- `features/calendar/ui/CalendarEventDetails.test.tsx` (extend):
  - "EP15E-AC1: EVENT shows Type 'Busy', Date, Time and 'Repeats: Weekly' only when recurring"
  - "EP15E-AC1: STUDY_BLOCK shows Type 'Study block', Course link when tied, Energy text, and 'Repeats' when recurring"
  - "EP15E-AC1: an actions slot renders inside the footer when provided (EP15G hook); Close stays last"
- `features/calendar/ui/CalendarAgenda.test.tsx` (extend):
  - "EP15E-AC4: lists all seven days, each with a bounds line 'Day 08:00–23:00', items and free lines in time order (D-E4)"
  - "EP15E-AC4: free lines use the same 30-minute threshold as the grid"
  - "EP15E-AC4: activating an item opens the same details dialog"
- `pages/calendar/lib/week.test.ts` (AC3):
  - "EP15E-AC3: addDays / mondayOf are pure civil-date functions (month/year rollover, leap day, Sunday → previous Monday)"
  - (`gridModel.test.ts`) "EP15E-AC3: dayHeaderLabel('2026-10-26') is 'Mon 26' via Date.UTC/getUTCDay only"
  - "EP15E-AC3: the module uses no browser-local Date getters" (reads the source file and asserts `/\b(getDay|getDate|getMonth|getFullYear|getHours|setDate|setHours)\(/` is absent; `Date.UTC`, `getUTC*` and the single `new Date().toISOString()` inside `utcTodayGuess` are allowed — the test asserts that `new Date(` occurs exactly once and only in that function; R-EP15-13)
- `pages/calendar/ui/CalendarPage.test.tsx` (extend):
  - "EP15E-AC3 (FU-EP04-01 a): headers are the profile zone's week for Pacific/Kiritimati vs browser Etc/GMT+12 — the response's from..to drive the seven headers"
  - "EP15E-AC3 (FU-EP04-01 b): every returned event renders in the column matching its civil date; none is dropped"
  - "EP15E-AC3 (FU-EP04-01 c): the marked column equals result.today"
  - "EP15E-AC3 (FU-EP04-01 d): Today requests mondayOf(result.today); previous/next request from−7/from+7 as civil strings"
  - "EP15E-AC3: when the first response's today falls outside the guessed range, the page re-requests the week of today before rendering (D-E5)"
  - "EP15E-AC3: the page module uses no browser-local Date getters" (same regex, on `CalendarPage.tsx`)
  - "EP15E-AC4: loading skeleton has seven column placeholders and an sr-only 'Loading your calendar…'"
  - "EP15E-AC4: empty week shows 'Nothing on your calendar yet — it's all free time' with the grid (bounds shading) still rendered"
  - "EP15E-AC4: error state renders role alert and 'Try again' refetches"
  - "EP15E-AC4: narrow viewport renders the agenda with bounds and free lines; wide renders the grid; a live resize switches"
- Manual pass (TR-E15-11) recorded in `artifacts/EP15E/implementation.md`: keyboard order, focus ring, VoiceOver reading of a day column, reduced motion, 375 px agenda.

## UI/UX

### Components (reuse vs new; FSD placement)

| Component | Reuse / new | Reason |
|---|---|---|
| `features/calendar/ui/WeekGrid.tsx` | **New** | The positioned grid. Replaces `WeekView.tsx` (deleted). Props: `days: CalendarDay[]` (payload `days[]`), `eventsByDay`, `today`, `onOpenEvent`; EP15H adds `editable`. |
| `features/calendar/lib/gridModel.ts` | **New, pure** | `minutesOf`, `hourRange`, `rowSpan`, `layoutLanes`, `isLabelledFree`, `dayHeaderLabel` ("Mon 26", replaces `WeekView.dayHeader`), `FREE_LABEL_MIN = 30`, `PX_PER_HOUR = 60`. Shared later with EP15H's `dragModel`. |
| `features/calendar/ui/CalendarEventChip.tsx` | Change | New kinds, `layout: 'grid'` with the density tiers, recurring marker, energy tag from `event.energy`. Keep EP14D's label-in-name rule (no `aria-label`). |
| `features/calendar/ui/CalendarEventDetails.tsx` | Change | Rows for the new kinds; an `actions?: ReactNode` footer slot EP15G fills. Stays on the shared `Dialog` (D-E3). |
| `features/calendar/ui/CalendarAgenda.tsx` | Change | Takes `days` too; renders a bounds line and free lines per day; lists all seven days. |
| `pages/calendar/lib/week.ts` | **New, pure** | `addDays`, `mondayOf`, `utcTodayGuess` — the only date helpers the page uses (headers come from `gridModel.dayHeaderLabel`). |
| `pages/calendar/ui/CalendarPage.tsx` | Change | Anchor = server `today`/`from`; passes `days`; new empty copy; the status line gains the bounds summary. |
| `shared/ui/{Dialog,Button,Badge}` | Reuse | Existing primitives (listed: Badge, Button, Card, Dialog, EmptyState, Input, Select — no Switch/Checkbox primitive exists; none needed here). |
| `features/study-plan/ui/WeekGrid.tsx` | **Not borrowed** | It re-exports `PlanWeek`, which is seven chip columns without an hour axis — the same shape as the current `WeekView`. Nothing to reuse; its `role="status"` sr-only live region pattern is the only idea carried over. |

### Layout and hierarchy (≥ `sm`)

What the student sees first: the week label and the seven day headers, then the grid with their day shaded in and their commitments positioned; free time is the quiet white space with small "Free" captions. Vertical order inside the card:

1. `role="status"` line (existing): "Showing N items for Oct 26 – Nov 1 · Your day 08:00–23:00" (when all seven bounds are equal; otherwise "· Day bounds vary by weekday"). This line is the sentence EP15F's banner and sheet later sit above.
2. **Header row:** a 56 px (`w-14`) axis spacer, then seven headers `Mon 26` … `Sun 1` (`dayHeaderLabel`); today's header is `font-bold text-accent` **and** carries sr-only "(today)" plus a 2 px top border — never colour alone.
3. **All-day row:** axis cell reads "All day"; each day cell stacks deadline chips (`ASSIGNMENT_DEADLINE`, `EXAM_DEADLINE`) and `FLEX_DAY` planned sessions (chip time reads "Anytime", D-H7 kept). Min height 32 px, grows with content.
4. **Hour grid:** one CSS grid per day column, `grid-template-rows: repeat(rows, 15px)` where `rows = (rangeEnd − rangeStart) / 15`; **60 px per hour** (D-E7). The axis column prints each whole hour (`08:00`) at the row boundary, `text-caption text-text-muted`, and is `sticky left-0 bg-surface` so it survives horizontal scroll. Columns are `minmax(112px, 1fr)`; the wrapper is `overflow-x-auto` (minimum grid width 7 × 112 + 56 = 840 px, so `sm`–`md` widths scroll inside the card, as today).

**Hour range (pins D-E1):** `start = floor_hour(min over days of wakeTime) − 1 h`, `end = ceil_hour(max over days of sleepTime) + 1 h`, then widened to include every timed item's start/end in the week, then widened to at least `08:00–22:00`, then clamped to `00:00–24:00`. Defaults (08:00–23:00) give **07:00–24:00**, 17 hours = 1020 px. The one-hour padding exists so each shaded region is at least 60 px tall and can carry its caption.

**Layers in a day column, bottom to top (D-E6):**
1. Shading: `[rangeStart, wake)` and `[sleep, rangeEnd)` as `bg-surface-muted` with a diagonal hatch (`repeating-linear-gradient`, 1 px lines at 8 px) so the region reads as "outside" without colour. Each region is `role="img"` with `aria-label="Before your day starts"` / `"After your day ends"` exactly; a visible, `aria-hidden` caption sits at the region's inner edge: "Day starts 08:00" (bottom of the before-region) / "Day ends 23:00" (top of the after-region). EP15F turns these captions into its second entry point. A `24:00` sleep has no after-region.
2. Free pieces: `days[].free` intervals drawn as a 2 px dotted `border-border-strong` outline on transparent background; pieces ≥ **30 min** (D-E7) carry the caption `Free · 14:00–16:00` (`text-caption text-text-muted`, top-left); shorter pieces are drawn with `aria-hidden` and no text (AC2). Not focusable, no handlers (D-E2).
3. Study-block zones: each `STUDY_BLOCK` spans the full column width as a dashed `border-accent/60` outline with `bg-accent/5`; its chip content (icon, "Study block", title, course code, energy tag) renders at the zone's top as a `button` 32–60 px tall depending on the tier; the rest of the zone is background so planned sessions placed inside it stay visible — this is the "fills them first" story told visually.
4. Timed chips (`CLASS`, `EVENT`, `STUDY_SESSION`, FIXED `PLANNED_SESSION`): `button`s positioned by `grid-row`; when two or more overlap in one column they share the width in lanes (greedy left-to-right assignment; max three lanes; a fourth and later stack with an 8 px left offset and `z-index` by start). `EVENT` is the one solid chip: `bg-surface-muted border-border-strong` with the `Briefcase` icon — busy time looks occupied; the others keep the existing white chip with the 3 px course-colour left border as a secondary cue.

**Chip content order (label-in-name, EP14D D-D3):** `[icon] Kind label` · title · `HH:mm–HH:mm`, in that visual and DOM order; sr-only ":" and "," keep the punctuation. Kind vocabulary (lucide 0.312, all present): `CLASS` GraduationCap "Class", `ASSIGNMENT_DEADLINE` ClipboardList "Assignment", `EXAM_DEADLINE` FileText "Exam", `STUDY_SESSION` Brain "Study session", `PLANNED_SESSION` CalendarClock "Planned", **`EVENT` Briefcase "Busy"**, **`STUDY_BLOCK` BookOpen "Study block"**. `AVAILABILITY`/`BLOCKED_TIME` and their icons (CheckCircle2, Ban) are removed. Extra markers: `recurring: true` → `Repeat` icon (14 px) after the title with sr-only "repeats weekly"; `STUDY_BLOCK` energy `HIGH`/`LOW` → the existing pill `High energy`/`Low energy` (`data-testid="energy-tag"`), `NORMAL` → nothing. When `title` equals the kind's default ("Busy"/"Study") the title line is omitted so the chip does not read "Busy, Busy".

**Density tiers (D-E8), by rendered height:** ≥ 60 px → three lines (label row, title, time); 30–59 px → one label row with the title inline-truncated, time sr-only; < 30 px → icon + title only, label and time sr-only. The accessible name is identical in every tier.

### Details dialog (D-E3)

`CalendarEventDetails` on the shared `Dialog` (`size="md"`), title = item title. Rows (`dl`): Type (icon + label) · Date · Time (`HH:mm – HH:mm`; `24:00` shown as "24:00") · **Repeats** ("Weekly") only when `recurring` · Course (link, existing) · **Energy** ("High energy" / "Normal" / "Low energy") for `STUDY_BLOCK` · the existing Status/Focus/Suggested rows for their kinds. Footer: an `actions` slot (empty in this story) left of the existing `Close` outline button, which stays last in DOM order. No "recurrence/series/exception" words anywhere (D15-14 rule 6).

### States

- **Loading:** the existing skeleton reshaped — axis column + seven columns of `animate-pulse motion-reduce:animate-none` blocks (`h-12`), sr-only "Loading your calendar…".
- **Empty week:** the grid still renders with shading and free pieces; the all-day row of the middle column holds the copy "Nothing on your calendar yet — it's all free time" in `text-text-muted` (AC4 copy, verbatim). No link (EP15G adds "Add"; EP15I removes "Manage availability").
- **Error:** existing `role="alert"` card with the API message or "We could not load your calendar. Try again." and the `Try again` button (≥ 44 px below `sm`).
- **Refetching:** the existing `Loader2 animate-spin` beside the week label gains `motion-reduce:animate-none`.

### Accessibility

- Focus order: toolbar (Today, Previous week, Next week, interim link) → status line (not focusable) → per day, all-day chips then timed chips in start order, Monday to Sunday. Chips are `button`s with the global `:focus-visible` ring (`ring-2 ring-focus-ring ring-offset-2`); the grid wrapper is `role="list" aria-label="Week view"` (kept — the current E2E locator) with each day column `role="listitem" aria-label="Mon 26"`.
- Nothing is conveyed by colour alone: kind = icon + text; today = bold + border + sr-only; outside-bounds = hatch + accessible name; free = dotted outline + caption; busy = solid fill + Briefcase + "Busy".
- Contrast: captions use `text-text-muted` on `bg-surface`/`bg-surface-muted` (≥ 4.5:1 with the EP14D token values); the `EVENT` chip text is `text-text` on `bg-surface-muted`.
- Touch targets: chips carry `max-sm:min-h-[44px]` (agenda); grid chips are pointer/keyboard targets ≥ `sm` only.
- Reduced motion: no new `transition-*`/`animate-*` without `motion-reduce:*-none`; `index.css` collapses durations globally as a second net.

### Responsive

- ≥ 640 px: grid as above; between 640 and ~900 px the grid scrolls horizontally inside the card with the sticky axis.
- < 640 px (`useNarrowViewport`, unchanged): `CalendarAgenda` lists **all seven days** (not only days with items — the bounds and free time exist every day), each: header `Mon 26` (today bold + sr-only "(today)"), a bounds line "Day 08:00–23:00" (`Sunrise` icon, aria-hidden), then items and free lines interleaved in start order; free lines read exactly "Free · 14:00–16:00" and use the same 30-minute threshold (D-E4). Entries keep the `layout="agenda"` chip (time above title). The page-level empty copy appears once above the list when the week has no items.

## Technical notes

- **Inspected (2026-11-16, at `960fb60`):** `CalendarPage.tsx` — `mondayOf`/`formatYMD` use local getters (`:29–43`), `selectedDate = new Date()` (`:56`), `useNarrowViewport` (`:17–27`, `(max-width: 639px)`), request sequencing via `requestSeq` (`:88–125`), `role="status"` line (`:235–241`), "Manage availability" links (`:229, 258`). `WeekView.tsx` — `role="list" aria-label="Week view"`, `dayHeader` parses `T12:00:00` with local `getDate()`. `CalendarAgenda.tsx` — renders only `daysWithEvents`. `CalendarEventChip.tsx` — `TYPE_META` incl. `AVAILABILITY`/`BLOCKED_TIME`, energy tag reads `subtitle` for `AVAILABILITY` (D-J6), label-in-name order (EP14D D-D3). `CalendarEventDetails.tsx` — `TYPE_META`, FLEX "Suggested" row, single `Close` button. `entities/calendar/model/types.ts` — `CalendarEventType` union, `CalendarEvent`, `CalendarEventsResult` (no `days`). `calendarApi.ts` — plain axios `listCalendarEvents({ from, to })`. API DTO `list-calendar-events-query.dto.ts` — **`from` and `to` are required** `YYYY-MM-DD` (drives D-E5). `features/study-plan/ui/WeekGrid.tsx` — two-line re-export of `PlanWeek` (chip columns, no hour axis). `shared/ui/Dialog.tsx` — `motion-reduce:transition-none` on the panel, focus restore (EP14D). `index.css:121–156` — global `prefers-reduced-motion` collapse. Existing tests: `CalendarPage.test.tsx` (matchMedia stub, frozen `Date`, `listCalendarEvents` mock), chip/agenda/details suites.
- **Files to change / create:**
  - `apps/web/src/entities/calendar/model/types.ts` — add `'EVENT' | 'STUDY_BLOCK'`, remove `'AVAILABILITY' | 'BLOCKED_TIME'`; add `blockId: string | null`, `recurring: boolean | null`, `energy: 'HIGH' | 'NORMAL' | 'LOW' | null` to `CalendarEvent` (optional on the client type, `?`, so older fixtures compile — the server always sends them, contracts.md); add `CalendarDay { date; wakeTime; sleepTime; free: { startTime; endTime }[] }` and `days: CalendarDay[]` on `CalendarEventsResult`.
  - `apps/web/src/entities/calendar/api/calendarApi.ts` — unchanged signature; its test gains the `days` shape case.
  - `apps/web/src/pages/calendar/lib/week.ts` (new) — `addDays(civil, n)`, `mondayOf(civil)`, `utcTodayGuess()`; implemented with `Date.UTC(y, m−1, d)` + `getUTCDay()` + string formatting only.
  - `apps/web/src/pages/calendar/ui/CalendarPage.tsx` — state `anchorFrom: string` (a Monday civil date); initial value `mondayOf(utcTodayGuess())`; on each response, if `result.today` is outside `[result.from, result.to]` **and** the request was the bootstrap, set `anchorFrom = mondayOf(result.today)` and refetch before leaving the loading state (D-E5); `days` = `result.days.map(d => d.date)`; Today → `mondayOf(result.today)`; prev/next → `addDays(anchorFrom, ∓7)`; passes `result.days` to grid and agenda; new empty copy; delete `mondayOf`/`formatYMD`/`groupByDay`'s local-date use.
  - `apps/web/src/features/calendar/lib/gridModel.ts` (new) + test — as listed in Components.
  - `apps/web/src/features/calendar/ui/WeekGrid.tsx` (new) + test — replaces `WeekView.tsx` (delete it; `dayHeader` becomes `dayHeaderLabel` in `features/calendar/lib/gridModel.ts`, implemented with `Date.UTC`/`getUTCDay` — `CalendarAgenda`, `WeekGrid` and the page import it from there, keeping FSD imports downward).
  - `apps/web/src/features/calendar/ui/CalendarEventChip.tsx` + test — new kinds, `layout: 'week' | 'agenda' | 'grid'`, `heightPx?: number` for the tiers, `Repeat` marker, energy from `event.energy`.
  - `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx` + test — new rows and the `actions` slot.
  - `apps/web/src/features/calendar/ui/CalendarAgenda.tsx` + test — `days` prop, bounds and free lines, all seven days.
  - `apps/web/e2e/calendar.spec.ts` — no edits in this story (EP15D retired the slot assertions; EP15I removes `:22`; EP15J rewrites). The `Week view` / `Week agenda` list names and the chip-name regexes stay valid by construction.
- **Not in this story:** any `entities/schedule-block` or `features/schedule-blocks` module (EP15G), `features/day-bounds` (EP15F).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-E1 | Hour range: (a) dynamic — the week's min wake to max sleep, padded to whole hours, never less than 08:00–22:00; (b) fixed 00:00–24:00 with scroll | **(a)** — shows the student's day, not a wall of empty night (D15-14); the refiner may adjust the padding | Proposed |
| D-E2 | Free-time pieces in this story: (a) non-interactive, labelled only; (b) clickable to add | **(a)** — EP15H makes them create targets; EP15G's "Add" button is the baseline path | Proposed |
| D-E3 | Details dialog: (a) extend `CalendarEventDetails` on the shared `Dialog` for `EVENT`/`STUDY_BLOCK` (EP15G adds its buttons); (b) a popover | **(a)** — one dialog pattern, focus handling already solved (EP12B) | Proposed |
| D-E4 | Agenda free time: (a) one "Free" line per interval between items; (b) a per-day total only | **(a)** — the same information as the grid, same labels | Proposed |
| D-E5 | Bootstrapping the profile-zone week when `from`/`to` are required by the API (refines D15-12 / AC-E15-09): (a) first request = the Monday week of the **UTC civil date** (`new Date().toISOString().slice(0, 10)` — zone-free, no local getters); if the response's `today` lies outside `[from, to]`, re-request `mondayOf(today)` once before rendering; every later range derives from server strings; (b) a new "current week" API mode (no `from`/`to`) — a contract change outside EP15D's scope; (c) keep the browser-local Monday as the guess | **(a)** — zero contract change, one extra round-trip only in the rare straddle case, and the page module can be grep-tested for the absence of local getters (FU-EP04-01 evidence a–d) | Proposed |
| D-E6 | Layering and overlap: (a) `STUDY_BLOCK` renders as a full-width zone under the timed chips (planned sessions placed inside it stay visible); overlapping timed chips share the column in up to three greedy lanes, then stack with an 8 px offset; (b) every item in lanes, study blocks included; (c) no overlap handling (last wins) | **(a)** — a study block is a preference region, not an appointment, and "the planner fills it first" is literally visible; (c) hides data | Proposed |
| D-E7 | Geometry and free-time label threshold: (a) 60 px per hour (15 px per 15-minute row, 1 px ≈ 1 min — trivial pointer math for EP15H), label free pieces ≥ **30 min**; (b) 48 px per hour, label ≥ 45 min; (c) label every piece | **(a)** — 30 min is the smallest piece the engine's typical minimum block can use, and a 30 px piece fits one caption line; (c) litters the grid with 15-minute "Free" captions (D15-14) | Proposed |
| D-E8 | Chip density: (a) three tiers by rendered height (≥ 60 px label/title/time; 30–59 px label + title; < 30 px icon + title) with the hidden parts sr-only so the accessible name never changes; (b) always three lines, clipped; (c) a density control | **(a)** — short items stay readable and identifiable; (c) is a new control (rejected under D15-14) | Proposed |

## Definition of Done

1, 5 (states), 6 (keyboard order, focus ring, dialog), 7 (grid ≥ `sm`, agenda below), 8 (TR-E15-05), TR-E15-11 manual pass recorded. 2/3/4/9 N/A (read-only client). 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** the student's week, bounds and free time are visible at a glance, in the right zone.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (+ `lib/week.ts` new + test), `apps/web/src/features/calendar/lib/gridModel.ts` (new + test), `apps/web/src/features/calendar/ui/{WeekGrid.tsx (new + test), WeekView.tsx (removed), CalendarAgenda.tsx, CalendarEventChip.tsx, CalendarEventDetails.tsx}` + tests, `apps/web/src/entities/calendar/model/types.ts`, `apps/web/src/entities/calendar/api/calendarApi.test.ts`.
- **Start context:** this story (incl. the refiner's UI/UX section and D-E5…D-E8); contracts.md § Calendar read model; `CalendarPage.tsx`; FU-EP04-01 in the EP04 README.
- **Verification:** `pnpm --filter @studypilot/web test -- calendar` green; `pnpm --filter @studypilot/web typecheck` and `lint` green; the 26-hour-spread tests pass; `pnpm test:e2e -- calendar` journeys green at the smoke level (minus the EP15D-retired assertions).
- **Dependencies / exclusions:** EP15D payload. Writes → EP15F/G/H; full E2E rewrite → EP15J.
