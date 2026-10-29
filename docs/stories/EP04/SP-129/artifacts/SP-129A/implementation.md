# SP-129A implementation record

Completed: 2026-10-28
Role: implementer (frontend)
Story: [SP-129A-mobile-agenda-view.md](../../SP-129A-mobile-agenda-view.md)
Checkpoint: [checkpoint.md](./checkpoint.md) (progress boxes marked complete; links here)
Parent queue: [SP-129 README execution queue](../../README.md)

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1. Events grouped by `date`, payload order preserved within a day | Met | `CalendarAgenda` iterates `days` (week order) and renders `eventsByDay` arrays untouched; component test asserts within-group order via accessible names (`CalendarAgenda.test.tsx` — "groups events by day in payload order…"). |
| 2. Every event renders exactly once | Met | Component test asserts `toHaveLength(1)` per unique accessible name (4 events). |
| 3. Time, title, type label per entry; type identifiable without color | Met | Entries reuse `CalendarEventChip`: type label text + icon (`TYPE_META`), title, `startTime` text, "Completed" text badge for completed deadlines; accessible name `{type label}: {title}, {time}`. Component test asserts label text counts and names. |
| 4. Activating an entry opens the details dialog; Escape closes and focus returns | Met | Page test at narrow viewport (`CalendarPage.test.tsx` — "opens the details dialog from an agenda entry…"): dialog visible, Escape closes, focus returns to the entry. Reuses SP-127B's `CalendarEventDetails` unchanged. E2E asserts dialog open/close from an agenda entry. |
| 5. Days with no events omitted | Met | `daysWithEvents` filter; component test asserts Tue–Fri/Sun headings absent. |
| 6. 375px: no horizontal scroll; 44px tap targets | Met | E2E (`calendar.spec.ts` phone-viewport test, 375×667) asserts `scrollWidth <= clientWidth`; chip gains `max-sm:min-h-[44px]`. |
| 7. Loading/empty/error states render in the agenda form | Met (per D129A-05) | The states live in `CalendarPage` above the viewport switch and are viewport-independent (D129A-05: "Loading/error states remain in CalendarPage as-is"); empty week shows the page's existing "No events this week" state instead of an agenda (`isEmpty` branch precedes the switch). Existing loading/empty/error page tests still pass. |
| 8. Keyboard-operable, visible focus, labelled day groups | Met | Entries are buttons with the repo's `focus:outline-none focus:ring-2 focus:ring-primary-500`; day groups are `role="group"` with `aria-labelledby` → header `<h3>` (component test asserts the id linkage); container is `role="list"` `aria-label="Week agenda"`. |

## DoD (parent EP04 items applying here)

- Item 1 (ACs): all above met.
- Item 5 (states): met per D129A-05 as recorded for AC 7.
- Item 6 (a11y): met (AC 8).
- Item 7 (responsive): verified at 375px via e2e; wide viewport keeps `WeekView` (page test), i.e. tablet/desktop behavior unchanged — the switch is `matchMedia('(max-width: 639px)')`.
- Item 8 (tests): component tests, page tests, e2e phone-viewport journey — all passing.
- Items 10–11 (in-environment integrated review + reviewer walkthrough): belong to the combined SP-129 parent review.

## Verification

Original-implementation table (historical; the [fix-pass section](#fix-pass-2026-10-29--sp-129-parent-review-findings) below holds the current tested state):

| Command | cwd | Result |
|---|---|---|
| `pnpm --filter web test -- src/features/calendar src/pages/calendar` | repo root | 4 files, 21 tests passed (initial red run before the component existed: 1 failed — module missing, as expected) |
| `pnpm --filter web test` (full web suite, regression check after chip change) | repo root | 60 files, 768 tests passed |
| `pnpm --filter web typecheck` | repo root | exit 0 (one earlier failure in my own test helper typing, F-129A-02, fixed) |
| `pnpm --filter web lint` | repo root | clean (6 prettier issues auto-fixed via eslint --fix on the new/edited calendar files, then full run clean) — **correction (fix pass): the e2e file's unused `mondayISO` lint error was still present at HEAD `d8da534`; fixed in `91ba4dc`, see F-129A-03 note** |
| `pnpm --filter @studypilot/web exec playwright test calendar.spec.ts` | `apps/web` | 5 passed (10.2s), incl. the new 375×667 agenda test; self-contained throwaway DB stack |

Tested state: all checks run on the final committed-working code before closeout (see commit hashes in the parent index).

## Changed paths

- `apps/web/src/features/calendar/ui/CalendarAgenda.tsx` (new) — the agenda component (D129A-02/03/04/06/07/08).
- `apps/web/src/features/calendar/ui/CalendarAgenda.test.tsx` (new) — 4 tests.
- `apps/web/src/features/calendar/ui/WeekView.tsx` — `dayHeader` exported (single source of the civil-noon header, D129A-02 reuse); no behavior change.
- `apps/web/src/features/calendar/ui/CalendarEventChip.tsx` — added `max-sm:min-h-[44px]` (AC 6 tap target, D129A-06); no other change.
- `apps/web/src/pages/calendar/ui/CalendarPage.tsx` — `useNarrowViewport()` (`useSyncExternalStore` over `(max-width: 639px)`, D129A-01) + `isNarrow ? <CalendarAgenda/> : <WeekView/>` switch with identical props (D129A-07).
- `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx` — matchMedia stub + narrow/wide/dialog-focus tests.
- `apps/web/e2e/calendar.spec.ts` — new phone-viewport agenda test (375×667).

## Commit scope

- `7eb8b43` — SP-129A ui-refiner spec commit (pre-implementation; refiner's working-tree output preserved and committed as its own doc commit).
- `e4e96d7` — queue reconciliation + start-of-work checkpoint.
- `afd48ec` — feat(web): SP-129A calendar agenda — `CalendarAgenda` + tests, `WeekView`/`CalendarEventChip` shared-piece edits, `CalendarPage` viewport switch + page tests, e2e phone-viewport extension.
- `91ba4dc` — fix(web): SP-129A review findings (R129-001/002/003 evidence/005) — chip `layout="agenda"` variant, empty-agenda + narrow-empty-page tests, live-resize page test, e2e keyboard/focus/height/tablet-desktop extension, pre-existing unused-var lint fix.
- Closeout docs commit: this record, checkpoint finalization, parent index and queue update (its own hash is not inserted into its own contents).

## Deviations

- Two files not named in the story's sizing "Files" list were edited for mandated reuse/behavior: `WeekView.tsx` (export `dayHeader`, D129A-02/08) and `CalendarEventChip.tsx` (tap target, D129A-06/AC 6). Both are within the story's in-scope items (reuse of SP-127B's shared pieces; narrow-screen tap targets); no behavioral change beyond `max-sm:min-h-[44px]`.

## Findings/deviations

- **F-129A-01** (source: first component-test run) — `getByText('Class')` strict-mode failure: multiple class entries each carry the label. Affected: `CalendarAgenda.test.tsx`. Disposition: **fixed** during authoring — assertions switched to exact counts (`getAllByText(...).toHaveLength(2)`).
- **F-129A-02** (source: `pnpm --filter web typecheck`) — my test builder's `Partial<CalendarEvent> & { id: string }` parameter did not produce a `CalendarEvent` spread type. Affected: `CalendarAgenda.test.tsx`. Disposition: **fixed** — pragmatic builder cast with a comment; typecheck exit 0.
- **F-129A-03** (source: SP-129 parent review `../SP-129/review.md`, R129-001) — original build rendered the time below the title; the checkpoint's D129A-03 "time-above-title" claim was inaccurate. Disposition: **fixed** in the 2026-10-29 fix pass (chip `layout="agenda"` variant + order assertions). Code commit `91ba4dc`.
- **F-129A-04** (source: SP-129 parent review, R129-002) — the required empty-agenda regression test was missing. Disposition: **fixed** in the fix pass (empty-map component test + narrow empty-page test).
- **F-129A-05** (source: SP-129 parent review, R129-003) — integrated/keyboard/responsive verification incomplete; tablet/desktop evidence was mocked-unit only. Disposition: **implementer evidence added in the fix pass** (keyboard/focus/height e2e, live tablet→desktop resize, desktop week-view assertion); the **final in-environment browser gate remains open with the reviewer** — not closed by this record.
- **F-129A-06** (source: SP-129 parent review, R129-004 / R129-005) — stale child status; broken matchMedia mock listener signature. Disposition: **both fixed** in the fix pass (story status edit; mock `(type, callback)` + live-resize test).
- Nothing blocked. Open items: only the reviewer-owned re-review gates (parent re-review + walkthrough; DoD 10/11), which are not implementer deliverables.

## Notes for the parent review

- Loading-state markup is unchanged per D129A-05: its skeleton stays a 7-column grid inside its own `overflow-x-auto` container, so it still clips internally rather than scrolling the page at 375px (verified by inspection, not by e2e — the e2e covers the loaded state).
- The empty week at a narrow viewport intentionally shows the page's empty state (no agenda), per D129A-05 and the pre-existing `isEmpty` branch order — re-verified by the existing empty-state page test plus the new viewport tests.

## Fix pass (2026-10-29) — SP-129 parent review findings

Parent review: [`../SP-129/review.md`](../SP-129/review.md) (Changes Required, 2026-10-28). Finding IDs preserved. This section supersedes the conflicting claims flagged below.

| Finding | Disposition | Evidence |
|---|---|---|
| R129-001 (should-fix) — time below title despite D129A-03 | **fixed** | `CalendarEventChip` gained a `layout?: 'week' \| 'agenda'` prop; `'agenda'` renders the time line above the title, `'week'` (default) unchanged. `CalendarAgenda` passes `layout="agenda"`. New component test asserts `textContent` order in both layouts. The checkpoint's earlier "time-above-title" claim was wrong for the original build; corrected here. |
| R129-002 (should-fix) — required empty-agenda test missing | **fixed** | `CalendarAgenda.test.tsx` "an entirely empty payload renders no day groups and no entries" (list present, zero items/entries/headings); `CalendarPage.test.tsx` "an empty week at a narrow viewport shows the page empty state, not an agenda" (D129A-05: `No events this week`, no agenda/week list, no groups). |
| R129-003 (verification gate) — integrated/keyboard/responsive evidence | **implementer evidence added; final gate stays with the reviewer** | `calendar.spec.ts` phone test now also asserts: real `boundingBox()` height ≥ 44px at 375px, keyboard activation (focus + Enter opens the dialog), Escape closes and `toBeFocused()` returns to the entry, and live viewport growth (768×1024 → 1280×720) flips to the week grid without reload. The seeded desktop test additionally asserts the `Week view` list renders on desktop. In-environment browser pass (DoD 10/11) remains reviewer-owned. |
| R129-004 (should-fix) — child ticket said "Ready to implement" | **fixed** | [Story status](../../SP-129A-mobile-agenda-view.md) now `Implemented — awaiting the SP-129 parent review (2026-10-29 fix pass…)`; no AC/decision/plan content touched. |
| R129-005 (polish) — matchMedia mock stored the event type, not the listener | **fixed** | Mock signature now `(type, callback)` (`CalendarPage.test.tsx`); added "switches from the week view to the agenda after a live narrow resize" (`act`-wrapped post-mount change event). |

### Additional fix-pass notes

- **Pre-existing lint error found and fixed in scope:** the SP-129A phone e2e had an unused `mondayISO` (verified present at HEAD `d8da534` before any fix-pass edit — the original "lint clean" record was inaccurate for the e2e path; `pnpm exec eslint` on `src/` alone would have missed it). Removed the dead computation; the meeting is Monday-only via `dayOfWeek`.
- **No new `act(...)` noise from the mock change:** the two `act` warnings in the agenda-dialog page test are identical at HEAD and post-fix (2 before, 2 after, same test) — pre-existing, unrelated to R129-005.

### Fix-pass verification (implementer-executed, all on fix-pass code)

| Command | cwd | Exit | Result |
|---|---|---|---|
| `pnpm --filter web test -- src/features/calendar src/pages/calendar` | repo root | 0 | 4 files, 26 tests passed (21 → 26; +5 new) |
| `pnpm --filter web test` | repo root | 0 | full web suite: 60 files, 773 tests passed (768 → 773) |
| `pnpm --filter web typecheck` | repo root | 0 | clean |
| `pnpm --filter web lint` | repo root | 0 | clean, including the previously erroring e2e file |
| `pnpm --filter @studypilot/web exec playwright test calendar.spec.ts` | `apps/web` | 0 | 5 passed (7.3s); self-contained throwaway DB dropped in teardown. One intermediate failed run (my e2e edit referenced an undefined `weekList`) recorded honestly, fixed, then green. |

Fix-pass code commit: `91ba4dc` (chip layout prop, agenda usage, component/page tests, e2e extension). Closeout docs (this record, checkpoint, parent index, queue, story status) follow in their own commit.
