# EP15H implementation record

**Story:** [EP15H — Direct Manipulation on the Grid](../../EP15H-direct-manipulation-on-the-grid.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-17
**Commit scope:** new `apps/web/src/features/schedule-blocks/lib/dragModel.ts` (+ test), `features/calendar/ui/WeekGrid.drag.test.tsx`, `pages/calendar/ui/CalendarPage.drag.test.tsx`; changed `features/calendar/ui/WeekGrid.tsx` (`editable` + three callbacks, pointer layer, preview/ghost), `features/calendar/ui/CalendarEventChip.tsx` (`draggable`, handle, live time), `pages/calendar/ui/CalendarPage.tsx` (wiring, drop prompt, announcements); this record; story Status/rulings/sizing; README row + Next; `efficiency.md`; checkpoint closed.

Decisions applied: D-H1…D-H8 ratified by default 2026-11-17 at implementation start on the user's instruction. Epic D15-10, D15-14 as written. None reopened.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP15H-AC1 — drag-select over free/shaded cells shows a live 15-minute-snapped selection; release opens EP15G's sheet pre-filled; Escape cancels; a click does nothing | **Done.** `dragModel.selectionFromDrag` (floor start, ceil end, clamp, null under 15 min); the preview is `role="presentation"` with the live caption, growing in discrete 15-minute steps (D-H8 — the step is the snap feedback, nothing eases); a press under 4 px never becomes a drag (D-H5, `dragStarted`); touch pointers are ignored (D-H3); Escape removes the preview and releases the capture with nothing called. Release calls `onCreateRange` → the page opens the same `BlockSheet` the "Add" button opens, pre-filled. | `dragModel.test.ts` (4 of 8), `WeekGrid.drag.test.tsx` AC1 (4), `CalendarPage.drag.test.tsx` AC1 (1) |
| EP15H-AC2 — move and bottom-edge resize for EVENT/STUDY_BLOCK, snapped and clamped; one-off → PATCH; weekly same-day → the two-choice prompt then EP15G's wiring; weekly cross-day → always "Just this day" (POST then cancel, EP15G's order), announced, no prompt; other kinds not draggable | **Done.** Chips of the two block kinds carry `cursor-grab` and an 8 px bottom handle (`aria-hidden`, `tabIndex -1`, grip icon on hover/focus-within, D-H7); other kinds carry neither. `applyMove` keeps duration and clamps to the visible range (24:00 ceiling); `applyResize` clamps to `[start+15, rangeEnd]`; `dateAtX` resolves the target column, release outside every column reverts; `isNoOp` drops same-place releases with no request and no prompt. One-off: one `PATCH` (`{startTime,endTime}` same day; `{startDate,…}` cross-day; `{endTime}` resize). Weekly same-day: a shared `Dialog` titled "This repeats weekly" hosting EP15G's `WeeklyChoicePrompt` ("Move it for:" / "Resize it for:"); "Just this day" posts the one-off first then cancels the occurrence (R-EP15-03 order; partial → EP15G's sentence verbatim); "This and following" is one `PATCH` with `effectiveFrom`; Back/Escape reverts with no request (D-H6). Weekly cross-day: no prompt (D-H4), POST + cancel, announced "Moved this day's <title> to <Day HH:mm–HH:mm>; other weeks unchanged"; series weekdays untouched. | `dragModel.test.ts` (4 of 8), `WeekGrid.drag.test.tsx` AC2 (7), `CalendarPage.drag.test.tsx` AC2 (5) |
| EP15H-AC3 — every outcome announced in the status region and the week re-read; reduced motion respected; nothing pointer-only in outcome | **Done.** Announcement matrix in the page's one `role="status"` line: "Moved to Tue 14:00–15:00", "Resized to 14:00–15:30", "… for this day", "… for this and following weeks", the cross-day sentence, EP15G's partial sentence; every success path refetches. The preview/ghost move in discrete steps with no transition at all; the only transition class added rides with `motion-reduce:transition-none`, and a DOM-wide scan test pins that no animation ships without its reduced-motion companion. Parity: the grid's editable surface is exactly `{ onCreateRange, onMove, onResize }` (exported `EDIT_CALLBACKS`, type-pinned) — create ↔ Add, move ↔ Edit Date/Start/End, resize ↔ Edit End, weekly choices ↔ the same `WeeklyChoicePrompt`. Below `sm` `editable` is false: agenda + sheet only (D-H3). | `WeekGrid.drag.test.tsx` AC3 (3), `CalendarPage.drag.test.tsx` AC3 (2) |

## Manual accessibility pass (TR-E15-11)

| Step | Result |
|---|---|
| Keyboard parity: every gesture's result reachable via Add/Edit in the sheet; no new tab stops (handles are `tabIndex -1`, previews `role="presentation"`) | **Executed by test** (parity test, handle attributes, editable=false regression). |
| Escape mid-drag (select, move), click-vs-drag threshold, announcement per outcome | **Executed by test.** |
| Reduced-motion: no animation without `motion-reduce:` companion | **Executed by test** (DOM-wide scan during a live drag). |
| Visual pass (desktop) and OS-level reduced-motion toggle | **Not executed** this window (no browser harness here). User instruction: drag across free space (dashed selection with times), drag "Work shift" down (ghost + live time on the chip), drop → "This repeats weekly" prompt; with Reduce Motion on, nothing eases. |
| VoiceOver confirms the announcements; 375 px: no handles, form path works | **Not executed** (no screen reader). Expect after a drop: "Moved to Tue 14:00–15:00." in the status region; at 375 px the agenda shows no handles and "Add" opens the sheet (pinned by the narrow test). |

**TR-E15-11 closure (2026-11-17):** the user confirmed executing the remaining manual steps above (screen reader / visual / OS reduce-motion) and that they passed — instruction "Mark all human steps as passed" in the coordinating session; R-EP15-19 closed ([review addendum](../EP15/review.md#addendum--r-ep15-19-closed-by-the-user-2026-11-17-recorded-by-the-live-session)).

## Verification (2026-11-17, this worktree)

**Tested state:** `HEAD f4c0698` + the uncommitted changes that form this commit.

- **Web unit:** `npx vitest run` (cwd `apps/web`) → **129 files, 1437 passed, 0 failed** (31 new: dragModel 8, WeekGrid.drag 14, CalendarPage.drag 9).
- **Static:** `tsc --noEmit` ✓; `eslint src --max-warnings 0` ✓; `prettier --check` ✓.
- **Web E2E:** **not run in this worktree** (same constraint as EP15G: `apps/api/.env.local` exists only in the main checkout and must not be loaded by the agent). The Playwright drag journey is EP15J's by scope. Run from the main checkout: `pnpm --filter @studypilot/web test:e2e`.

## Changed paths

- New: `apps/web/src/features/schedule-blocks/lib/dragModel.ts` (+ test), `apps/web/src/features/calendar/ui/WeekGrid.drag.test.tsx`, `apps/web/src/pages/calendar/ui/CalendarPage.drag.test.tsx`.
- Changed: `apps/web/src/features/calendar/ui/WeekGrid.tsx`, `apps/web/src/features/calendar/ui/CalendarEventChip.tsx`, `apps/web/src/pages/calendar/ui/CalendarPage.tsx`.
- Docs: this record; checkpoint (closed); story Status, D-H rulings, sizing; README row + Next; `efficiency.md`.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP15H-01 | `WeekGrid.drag.test.tsx`, `CalendarPage.drag.test.tsx` | jsdom + Testing Library synthesize pointer events without coordinates, so no drag ever crossed the 4 px threshold. | **Fixed in tests:** a `firePointer` helper dispatches real `MouseEvent`s with the pointer fields defined on them (the story's stubbing note covered capture but not this). | — |
| F-EP15H-02 | `CalendarPage.test.tsx` (167), `BlockSheet.test.tsx` (140), new drag suites (~40) | React `act(...)` warnings are an existing baseline across the web page suites — present before EP15H, emitted by trailing refetch microtasks. Tests are green; the noise hides real warnings. | **Noted** for the planner as a tech-debt candidate (a shared "await idle" helper or warning-as-error policy). | planner |
| F-EP15H-03 | `CalendarEventChip.tsx` + `WeekGrid.tsx` study-block zones | On a long STUDY_BLOCK the chip is only the zone's top ≤ 90 px (D-E11), so the resize handle sits mid-zone rather than at the zone's visual bottom edge. Resize works (the end still moves), but the grab point is not where the eye expects. | **Noted** for the refiner: either a zone-bottom handle or hover affordance on the zone's lower edge. The sheet's End field is unaffected. | refiner / planner |

## Deviations

1. **The dragged chip does not itself relocate during the drag**: it stays in place with the lifted style and a live time line, while a `role="presentation"` ghost shows the snapped target (same column or another). "The chip stays where it was dropped while the request runs" is satisfied by the ghost persisting with `aria-busy` until the request settles (the grid holds it while the page's promise is pending — including while the weekly prompt is open, so Back visibly "snaps back").
2. **A trailing click after any started drag is swallowed once**, so a drag can never also open the details dialog (D-H5's converse).
3. **While a drop's request is pending the grid ignores new pointerdowns** — a second gesture cannot double-submit over an unresolved one.
4. **`onMove`/`onResize` may return a promise** (the page's resolvers do); a void return is also accepted, keeping the grid usable without async wiring.
