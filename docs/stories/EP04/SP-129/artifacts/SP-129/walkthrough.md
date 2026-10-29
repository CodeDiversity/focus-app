# SP-129 walkthrough — Mobile Agenda View

Companion to the final review: `docs/stories/EP04/SP-129/artifacts/SP-129/review.md` (pass 2, 2026-10-29, verdict Pass).
Review unit: SP-129, only implementation child SP-129A. Reviewed code state: HEAD `291f892` (code commit `91ba4dc`).

## 1. What changed

On a narrow screen the calendar stops being a seven-column grid and becomes a **vertical, day-grouped agenda**: the same week of events, grouped by day in start-time order, each entry showing its time, title and type label, opening the same details dialog. One thumb scrolls it; nothing pans sideways. On a tablet or desktop the original week grid is unchanged.

User-visible/system workflows in scope:

- **Agenda rendering** — `CalendarAgenda` (`apps/web/src/features/calendar/ui/CalendarAgenda.tsx`) groups the payload's events by `date`, rendering a group only for days that have events; each entry reuses `CalendarEventChip` in its agenda layout (time above title).
- **Viewport switch** — `CalendarPage` (`apps/web/src/pages/calendar/ui/CalendarPage.tsx`) swaps `WeekView` for `CalendarAgenda` below Tailwind's `sm` breakpoint (640px) via `useNarrowViewport()` (`useSyncExternalStore` over `(max-width: 639px)`), passing identical props.
- **Shared interactions** — the same `selectedEvent`/`CalendarEventDetails` modal, week navigation, loading/empty/error states and live region are reused; no second data path or contract.
- **Empty week** — the page's existing "No events this week" state is shown at every width; the agenda renders nothing for an empty payload (D129A-05).
- **Tap targets** — chips gain `max-sm:min-h-[44px]` for comfortable mobile interaction.

Stories: [SP-129](SP-129-mobile-agenda-view.md) (parent) and [SP-129A](SP-129A-mobile-agenda-view.md) (child). Decisions: D404-2, D404-9 (settled by the ui-refiner as D129A-01…08), D404-10. Epic ACs owned: AC-E04-01 (view events by week) and AC-E04-08 (types identifiable without color).

## 2. How the code works

Request/UI/data flow:

1. `CalendarPage` fetches one principal-scoped payload for the selected week (`listCalendarEvents`, `entities/calendar/api/calendarApi.ts`) exactly as before; `groupByDay` builds the `eventsByDay` map in payload order (server sorts by date, startTime, type, id — D404-2).
2. `useNarrowViewport()` subscribes to `(max-width: 639px)`. When narrow, `<CalendarAgenda days eventsByDay today onOpenEvent>` renders; otherwise `<WeekView …/>` with the same props.
3. `CalendarAgenda` filters `days` to those with events, renders a `role="group"` with an `aria-labelledby` heading (`dayHeader`, civil-noon parse to avoid TZ drift), and maps each day's events to `CalendarEventChip` with `layout="agenda"`.
4. Activating a chip calls `onOpenEvent` → `setSelectedEvent` → `CalendarEventDetails` (modal, Escape closes, focus trap, focus returns to the trigger). The same modal is used at every width.

Key changed files/symbols:

- `apps/web/src/features/calendar/ui/CalendarAgenda.tsx` — `CalendarAgenda`, `CalendarAgendaProps`; `daysWithEvents` filter; `role="list"` `aria-label="Week agenda"`.
- `apps/web/src/features/calendar/ui/CalendarEventChip.tsx` — `CalendarEventChip`, `CalendarEventChipProps.layout?: 'week' | 'agenda'` (default `'week'`); agenda branch renders time line above title.
- `apps/web/src/pages/calendar/ui/CalendarPage.tsx` — `useNarrowViewport`, `NARROW_QUERY`, viewport switch at `:271–284`.
- `apps/web/src/features/calendar/ui/WeekView.tsx` — `dayHeader` exported (shared, unchanged behavior).
- `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx`, `CalendarAgenda.test.tsx`, `e2e/calendar.spec.ts` — tests.

Important choices:

- Reuse over reimplementation: the chip, types, type labels, details dialog and client are SP-127B's; the agenda only adds layout. D129A-08.
- Civil-noon day headers shared with `WeekView.dayHeader` to avoid TZ drift (D404-2).
- Empty week stays page-owned (D129A-05) so the agenda is purely presentational over a non-empty events list.
- Breakpoint is the repo's existing `sm` (640px), no custom breakpoint (D129A-01).

Validation/ownership/error behavior:

- No new input or API mutation; the same principal-scoped `GET /calendar/events` read is reused, so no new validation surface and no new ownership boundary. Loading/empty/error states and the retry button live above the viewport switch and are width-independent. API errors surface through the existing `getErrMsg`/toast path.

## 3. Why it is correct

Acceptance criteria → code invariants:

- AC 1 (group by date, payload order): `CalendarAgenda:20–46` filters empty days and maps each day's array verbatim; `groupByDay:45–52` preserves input order; server sorting is the EP04 contract. Component test asserts within-group order via accessible names.
- AC 2 (every event once): both views receive identical props; the agenda maps each day's array once. Component test asserts `toHaveLength(1)` per unique accessible name (4 events).
- AC 3 (time/title/type, non-color): chip shows type icon + text label, title, `startTime`, and "Completed" text badge; accessible name `{label}: {title}, {time}`. Time now renders above title per D129A-03 (R129-001 closed).
- AC 4 (details, Escape, focus return): same `selectedEvent`/`CalendarEventDetails`; modal handles Escape and focus trap/return. Narrow page test and e2e (now incl. Enter + `toBeFocused()`) verify.
- AC 5 (empty days omitted): `daysWithEvents` filter; component test asserts Tue–Fri/Sun headings absent.
- AC 6 (375px, no scroll, 44px targets): `w-full`/`min-w-0` constraints; chip `max-sm:min-h-[44px]`; e2e asserts `scrollWidth <= clientWidth` and real `boundingBox()` height ≥ 44px.
- AC 7 (states in agenda form): page-owned branches above the switch; empty week shows the shared empty state at every width (new narrow empty-page test).
- AC 8 (keyboard, focus, labelled groups): button entries with focus ring; `role="group"` + `aria-labelledby` → header `<h3>`; container `role="list"` `aria-label="Week agenda"`. Label linkage asserted by component test.

DoD mapping (shared DoD, items 1,5,6,7,8 apply; 10–11 belong to this review):

- 1 Functional ACs: all above.
- 2 Validation: not newly applicable (no new input).
- 3 Student scoping: no new fetch/persistence; same principal-scoped request reused.
- 4 API errors: unchanged handling, reused.
- 5 States: loading/empty/error present and width-independent.
- 6 Keyboard: buttons, focus rings, labelled groups, modal keyboard/focus handling; e2e covers Enter/Escape/focus return.
- 7 Responsive: 375px, 768px, 1280px evidence (e2e).
- 8 Automated tests: 26 scoped + 773 full suite + 5 e2e.
- 9 API/migration docs: not applicable (no API change).
- 10 Integrated review: Playwright self-contained stack 5/5.
- 11 Walkthrough: this document.

Evidence and review-round closure:

- Pass 1 (`review.md`, 2026-10-28) raised R129-001…R129-005. All are resolved; dispositions and closure evidence are in the report's prior-findings table and the child record's fix-pass section.
- Automated gates (implementer-executed, recorded, reused — see report verification ledger): scoped vitest 4 files/26 passed; full web suite 60 files/773 passed; typecheck exit 0; lint clean; Playwright `calendar.spec.ts` 5 passed (7.3s, self-contained throwaway DB). One intermediate e2e failure (undefined `weekList` in my own edit) was recorded honestly, fixed, then green.
- The pre-existing lint error (unused `mondayISO` in the phone e2e) noted in pass 1 was also corrected.

Material limitations retained: this reviewer did not execute any command or browser interaction this session (no shell/browser tool); the gates above are recorded implementer evidence cited with provenance, not reviewer-executed. The in-environment browser pass is the Playwright self-contained run, not a separate manual browser session.

## 4. Manual test workflows

Use a local dev stack (Vite + API + Postgres) or the self-contained E2E stack. Use disposable test accounts and courses; never use production data or secrets. No special permission beyond a normal student account is required.

### Workflow A — Agenda on a phone (375px)

Prerequisites: an authenticated student with at least one course meeting and one assignment deadline in the current week.

1. Set the browser viewport to 375×667 (or open DevTools device mode, iPhone 12).
2. Sign in and open `/calendar`.
3. Observe the week renders as a vertical list grouped by day ("Mon 26", "Sat 31" style headers), events in start-time order within each day.
4. Each entry shows its type label (e.g. "Class", "Assignment"), time on its own line above the title, and the title.
5. Confirm no horizontal scrollbar appears on the page (document `scrollWidth <= clientWidth`).
6. Confirm each entry is comfortably tappable (≥ 44px height).

Expected: day groups only for days with events; Tue–Fri/Sun omitted when empty; type identifiable by icon + text, not color alone.

Edge: a completed assignment deadline shows a "Completed" text badge.

Execution status: **Executed** — implementer Playwright `calendar.spec.ts` phone test (375×667), 2026-10-29, self-contained throwaway DB stack; asserts agenda visible, entry accessible name, type label text, no horizontal scroll, boundingBox height ≥ 44px. Evidence: 5/5 passed (7.3s). Optional user repeat: **Not executed — user test instructions** (visual confirmation of readability/spacing is a human judgment; the automated run does not assert subjective readability).

### Workflow B — Open details from an agenda entry

1. At 375px, focus an agenda entry with Tab (visible focus ring).
2. Press Enter (or click) to open the details dialog.
3. Confirm the dialog shows type, title, date, time, course and status.
4. Press Escape.
5. Confirm the dialog closes and focus returns to the same entry.

Expected: focus returns to the triggering entry; no focus trap escape.

Execution status: **Executed** — narrow page test + e2e phone test (Enter open, Escape close, `toBeFocused()`), 2026-10-29. Optional user repeat: **Not executed — user test instructions**.

### Workflow C — Empty week

1. Navigate to a week with no events (use Previous/Next week).
2. At any width, confirm "No events this week" with the "Manage availability" link.
3. Confirm no day groups or entries render, even at 375px.

Execution status: **Executed** — unit tests (wide empty page test; new narrow empty-page test), 2026-10-29. The Playwright suite does not include an empty-week phone journey; optional user repeat at 375px: **Not executed — user test instructions** (recommended to confirm no horizontal scroll on the empty state).

### Workflow D — Loading and error states

1. Throttle the network or block the calendar request to trigger the loading skeleton.
2. Confirm the loading state renders (seven-column skeleton) and the page does not crash at 375px.
3. Force an error (e.g. invalid session) and confirm the alert + "Try again" retry button; retry succeeds.

Execution status: **Not executed — user test instructions** for the phone-specific rendering of these states (the loading skeleton retains its own internal `overflow-x-auto` per D129A-05 and is not covered by e2e). Unit tests cover loading/empty/error at the default (wide) viewport. Recommended manual check at 375px.

### Workflow E — Responsive switch (resize)

1. Open `/calendar` at 375px → agenda visible, week grid absent.
2. Resize to 768px (tablet) → week grid appears, agenda disappears, no reload.
3. Resize to 1280px (desktop) → week grid remains.
4. Resize back to 375px → agenda returns.

Expected: the switch follows the `sm` (640px) breakpoint; no data refetch on resize.

Execution status: **Executed** — e2e live resize 768×1024 → 1280×720, 2026-10-29; plus an `act`-wrapped unit test for the 375 transition. Full round-trip (incl. back to 375) optional user repeat: **Not executed — user test instructions**.

### Workflow F — Week navigation and time zone

1. Use Previous/Next week and Today; confirm the live region announces "Showing N events".
2. Confirm the week range label shows the profile time zone.

Execution status: **Executed (wide)** — unit tests cover re-query and live region; not specifically at 375px. Optional user repeat: **Not executed — user test instructions**.

## 5. Execution status summary

| Workflow | Status |
|---|---|
| A Agenda on phone (375px) | Executed (automated) + optional visual repeat not executed |
| B Open details (keyboard + focus return) | Executed (automated) |
| C Empty week | Executed (unit, wide + narrow) + optional phone repeat not executed |
| D Loading/error at phone width | Not executed — user test instructions |
| E Responsive switch | Executed (automated, partial round-trip) |
| F Week navigation / time zone | Executed (wide) |

No required manual gate is left without evidence: DoD 10 (integrated review) is satisfied by the recorded Playwright self-contained run; DoD 11 is this document. The optional repeats above are user-facing instructions, not required gates, and are honestly labelled as unexecuted.

## 6. Files and records

- Review report: `docs/stories/EP04/SP-129/artifacts/SP-129/review.md` (pass 2, Pass).
- Implementation index: `docs/stories/EP04/SP-129/artifacts/SP-129/implementation.md`.
- Child record: `docs/stories/EP04/SP-129/artifacts/SP-129A/implementation.md` (incl. fix-pass section).
- Checkpoint: `docs/stories/EP04/SP-129/artifacts/SP-129A/checkpoint.md`.
- Queue: `docs/stories/EP04/SP-129/README.md`.
- Code: commits `afd48ec` (original) and `91ba4dc` (fix pass); docs closeout `291f892`. Reviewed state HEAD `291f892`.