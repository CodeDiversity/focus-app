# EP15F implementation record

**Story:** [EP15F — Day Bounds UI: "When Does Your Day Start and End?"](../../EP15F-day-bounds-ui.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-17
**Commit scope:** new `apps/web/src/entities/day-bounds/{model/types,api/dayBoundsApi}.ts` (+ test), `shared/ui/Switch.tsx` (+ test), `features/day-bounds/lib/midnight.ts` (+ test), `features/day-bounds/ui/{DayBoundsBanner,DayBoundsSheet}.tsx` (+ tests); `features/calendar/ui/WeekGrid.tsx` (`onEditBounds` entry point, + test), `pages/calendar/ui/CalendarPage.tsx` (bounds read, banner slot, sheet, announcement, focus return; + tests); this record; story Status/rulings/sizing; README row + Next; `efficiency.md`.

Decisions applied: D-F1, D-F2, D-F3 (ratified by default 2026-11-17 at implementation start, on the user's instruction). Epic D15-13, D15-14 as written. None reopened.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP15F-AC1 — one-line banner while `configured: false` with "Set it" and a dismiss control; dismiss hides for the session; never a modal, nothing blocked; gone for good once saved | **Done.** `DayBoundsBanner` reads `sessionStorage` key `sp.dayBoundsBannerDismissed` (D-F1); copy "Your days run 08:00–23:00 for now. When does your day usually start and end? Set it" with the current defaults; renders nothing when `bounds` is null, configured, or dismissed. Sits under the status line, above the view. | `DayBoundsBanner.test.tsx` (3), `CalendarPage.test.tsx` EP15F (2) |
| EP15F-AC2 — opens from the banner and from the shaded caption; "Same every day" on by default with one pre-filled pair; off → seven rows Monday first; Save sends exactly seven entries; mirror validation after the midnight mapping; `00:00` end ↔ `24:00`; 400 maps to the field | **Done.** `DayBoundsSheet` on the shared `Dialog`; `Switch` (`role="switch"`, new primitive owned here, R-EP15-14); pre-fill from the current values (D-F3) with `24:00` shown as `00:00`; the switch starts **off** when the stored bounds differ by weekday (see Deviations); seven entries built client-side (D-F2); `validatePair` runs on the mapped value, so `22:00`–`00:00` is valid; API keys `days[<i>].wakeTime/sleepTime` map onto the single pair or the matching weekday row, `days` → form-level alert. The grid's "Day starts / Day ends" captions become buttons (`…, change`) beside the `role="img"` region. | `DayBoundsSheet.test.tsx` (8), `midnight.test.ts` (2), `WeekGrid.test.tsx` EP15F (1), `dayBoundsApi.test.ts` (2) |
| EP15F-AC3 — on success the sheet closes, focus returns to the trigger, the week re-reads, the status region announces "Day start and end saved."; shared Dialog; ≥ 44 px on mobile; native `type="time"` | **Done.** The page announces in the one `role="status"` line (prefix cleared on the next week change), refetches the week, keeps the saved bounds (banner disappears) and returns focus to the trigger itself (the dialog restores focus only on cancel paths). All controls carry `max-sm:min-h-[44px]` (or 44 px square for Dismiss). | `CalendarPage.test.tsx` EP15F (2: open from both entry points, Escape focus return, save → announcement/refetch/banner gone/focus; announcement clears), `Switch.test.tsx` (3) |

## Manual accessibility pass (TR-E15-11)

| Step | Result |
|---|---|
| Keyboard: open from banner and caption, Tab order inside the sheet (switch → starts → ends → Cancel → Save), Escape | **Executed by test** (page + sheet suites; shared Dialog focus trap). |
| 44 px controls on the narrow viewport | **Executed by test** (class assertions on Set it, Dismiss, switch, Save, Cancel). |
| Visual pass (desktop) | **Executed**: banner, sheet (both modes). Found and fixed: per-day field labels read "Monday Day starts" seven times — now the legend carries the weekday and the fields read "Starts" / "Ends" with the weekday in the accessible name (F-EP15F-01). Screenshots `f-banner.png`, `f-sheet-perday.png` in the session scratchpad. |
| Screen reader read-through | **Not executed** (no screen reader here). User instruction: open the sheet with VoiceOver; expect "When does your day start and end?, dialog … Same every day, switch, on … Day starts, 08:00, time … Day ends, 23:00, time … Cancel, button … Save, button"; after Save, the status region reads "Day start and end saved. Showing …". |

**TR-E15-11 closure (2026-11-17):** the user confirmed executing the remaining manual steps above (screen reader / visual / OS reduce-motion) and that they passed — instruction "Mark all human steps as passed" in the coordinating session; R-EP15-19 closed ([review addendum](../EP15/review.md#addendum--r-ep15-19-closed-by-the-user-2026-11-17-recorded-by-the-live-session)).

## Verification (2026-11-17, this worktree)

**Tested state:** `HEAD b714f68` + the uncommitted changes that form this commit.

- **Web unit:** `npx vitest run` → **121 files, 1363 passed, 0 failed** (23 new: banner 3, sheet 8, midnight 2, API 2, Switch 3, grid 1, page 4). One intermediate full run showed 4 failures in `CourseForm.test.tsx` while the Playwright stack was booting in parallel on the same machine; that file passes alone (36/36) and the clean full rerun is 1363/0 — load-induced, unrelated to this change.
- **Static:** `tsc --noEmit` ✓; `eslint --max-warnings 0` ✓; prettier ✓.
- **Web E2E (full, self-contained stack):** `pnpm --filter @studypilot/web test:e2e` → **55 passed / 0 failed, 30.8 s**. (A first attempt failed to start its API because my screenshot API was compiling into the same `dist-test` directory at that moment — infrastructure, rerun alone.)
- **Flake fixed in the page suite:** its `afterEach` restored the `matchMedia` mock before Testing Library unmounted, so any late render (a resolving fetch) called an undefined `matchMedia`; `cleanup()` now runs first (F-EP15F-02). This was also the cause of the one-off 3-test failure noted in the EP15E record.

## Changed paths

- New: `apps/web/src/entities/day-bounds/model/types.ts`, `entities/day-bounds/api/dayBoundsApi.ts` (+ test), `shared/ui/Switch.tsx` (+ test), `features/day-bounds/lib/midnight.ts` (+ test), `features/day-bounds/ui/DayBoundsBanner.tsx` (+ test), `features/day-bounds/ui/DayBoundsSheet.tsx` (+ test).
- Changed: `features/calendar/ui/WeekGrid.tsx` (+ test), `pages/calendar/ui/CalendarPage.tsx` (+ test).
- Docs: this record; story Status, D-F1…D-F3 rulings, sizing; README row + Next; `efficiency.md`.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP15F-01 | `DayBoundsSheet.tsx` per-day mode; visual pass | Field labels repeated the weekday ("Monday Day starts") under a legend that already said "Monday" — fourteen long labels on one sheet. | **Fixed:** visible "Starts" / "Ends", weekday in the accessible name (`aria-label` contains the visible text). | — |
| F-EP15F-02 | `CalendarPage.test.tsx` `afterEach` | Mock restore ran before unmount — a latent flake that bit twice. | **Fixed** (`cleanup()` first). | — |
| F-EP15F-03 | `DayBoundsSheet.tsx` + `DayBoundsBanner.tsx` on an empty week | A brand-new student sees two stacked banners (day-bounds nudge + "Nothing on your calendar yet"). Both are correct, but together they are the busiest the calendar ever looks. | **Noted** for the refiner: hide the empty-week line while the bounds banner is showing, or merge the two sentences. | refiner / planner |

## Deviations

1. **"Same every day" starts off when the stored bounds differ by weekday.** The AC says on by default; with differing bounds a single pre-filled pair would silently discard the per-day values on save, so the switch opens in the mode that matches the data (D-F3's intent). Equal or default bounds open with the switch on, as specified.
2. **Focus return after save is the page's job**, not the dialog's: the shared Dialog restores focus only when it closes via its own close paths, and Save is a commit (`data-dialog-commit`).
3. **The midnight helper shows only while `00:00` is entered** (as the hint of the end field) rather than as a permanent footer line — one line less on the sheet (D15-14).
4. **`Switch` shows its state as text ("On"/"Off")** beside the track so the state never relies on colour alone.
