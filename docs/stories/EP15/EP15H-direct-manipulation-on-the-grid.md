# EP15H — Direct Manipulation on the Grid: Select to Create, Drag to Move, Resize

**Story ID:** EP15H
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Frontend (pointer enhancement)
**Status:** Ready — refined 2026-11-16 (technical + UI/UX, D15-16); implementation blocked on the EP14 review unit (D15-11) and this story's queue dependencies
**Refined:** 2026-11-16 (refiner; affordances, snapping feedback, announcements, handle treatment and the drag model settled below — ready to implement once EP15G lands)
**Dependencies:** EP15G implemented (the sheet this pre-fills; the two-choice prompt it reuses). Epic decisions D15-10, D15-14 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** on a pointer device the student drags across free space to create (the sheet opens pre-filled), drags an event or study block to move it, and drags its edge to resize it; weekly items ask the same two-choice question before anything changes; times snap to 15 minutes.
- **Why it improves it:** blocking out a week becomes a few gestures (product, AC-E15-10); nothing new is persisted by a gesture that the form path cannot also do, so keyboard users lose nothing (code, AC-E15-10 "identical results").
- **Decisions needing you:** none ▲ — D-H1…D-H4 ratify by default (D15-17); the refiner added D-H5…D-H8 (2026-11-16), none ▲.
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

The pointer layer over EP15E's grid and EP15G's sheet. It introduces no new
API call and no new question — it only pre-fills and submits what the sheet
already does.

## Scope

**In:** drag-select on free/shaded grid cells, move and resize of `EVENT`/`STUDY_BLOCK` chips, 15-minute snapping, Escape cancel, live-region feedback, reduced motion, `features/schedule-blocks/lib/dragModel.ts` (pure) + tests, pointer handlers on `WeekGrid` behind `editable`, tests (pointer events in jsdom; one Playwright drag journey is EP15J's).

**Out (explicit, against drift):**
- touch gestures and long-press (D-H3; the agenda's form path serves phones);
- dragging classes, deadlines, planned or study sessions (owned elsewhere — no handles, no handlers);
- top-edge resize, multi-select, copy-drag (Alt-drag), drag between weeks, auto-scroll while dragging, drag of the all-day row;
- any new API call, any new question or control (D15-14); the sheet's own fields and copy (EP15G);
- keyboard "nudge" shortcuts (arrow-key move) — the sheet *is* the keyboard path (AC-E15-10); a shortcut layer would be a third way to do one thing;
- a "now" line, zoom, or snapping granularity setting.

## Source requirement references

AC-E15-10 (pointer half); TR-E15-08, TR-E15-11; DoD-5, DoD-6, DoD-8.

## Acceptance criteria

1. Dragging across a day column's free or shaded cells shows a live selection snapped to 15 minutes and, on release, opens EP15G's sheet pre-filled with that date, start and end; Escape during the drag cancels with nothing persisted; a click without drag does nothing.
2. Dragging an `EVENT` or `STUDY_BLOCK` chip moves it and dragging its bottom edge resizes it, both snapped to 15 minutes and clamped to the grid's visible range; a one-off item is saved on release via `PATCH` (same day or another day). For a weekly item: a **same-day** move or resize first shows EP15G's two-choice prompt and then follows exactly EP15G's wiring; a **cross-day** drag always behaves as "Just this day" without the prompt — `POST` a one-off on the new date, then cancel the source occurrence (EP15G's order) — and announces "Moved this day's <title> to <Day HH:mm–HH:mm>; other weeks unchanged"; changing a series' weekdays is done in the sheet's chips (R-EP15-03). Other item kinds are not draggable and show no handles.
3. Every move or resize announces its result in the status region ("Moved to Tue 14:00–15:00") and re-reads the week; animations respect `prefers-reduced-motion`; every pointer action has the sheet as its keyboard equivalent and nothing is reachable only by pointer.

## Tests (TR-E15-08)

Vitest + Testing Library. jsdom lacks `setPointerCapture`/`releasePointerCapture` and `getBoundingClientRect` geometry: the grid test stubs `Element.prototype.setPointerCapture = vi.fn()` (and release) in `beforeEach` and mocks `getBoundingClientRect` on the column elements to a known rect (top 0, height = rows × 15). Pointer events are dispatched with `fireEvent.pointerDown/Move/Up` carrying `clientX/clientY`, `pointerId`, `pointerType: 'mouse'`, `button: 0`.

- `features/schedule-blocks/lib/dragModel.test.ts` (pure):
  - "EP15H-AC1: minuteAtY — y within a column rect maps to rangeStart + y / pxPerMinute (60 px per hour, D-E7)"
  - "EP15H-AC1: snapTo15 — floor for a selection start, ceil for its end, round for a move delta; 7 → 0/15, 8 → 15"
  - "EP15H-AC1: selectionFromDrag — dragging up (end above start) yields the same ordered interval; a drag shorter than 15 min after snapping is a click (null)"
  - "EP15H-AC2: applyMove — keeps duration; clamps start ≥ rangeStart and end ≤ rangeEnd (24:00 max); crossing a column yields the target date"
  - "EP15H-AC2: applyResize — end snaps to 15, never below start + 15, never above rangeEnd"
  - "EP15H-AC2: dateAtX — x inside the k-th column rect gives days[k]; outside every column gives null (drop reverts)"
  - "EP15H-AC2: isNoOp — same date, start and end → true (no request, no prompt)"
  - "EP15H-AC1: dragStarted — false until the pointer has moved ≥ 4 px from pointerdown (D-H5)"
- `features/calendar/ui/WeekGrid.drag.test.tsx` (the grid with `editable`):
  - "EP15H-AC1: pointerdown on a free cell, move 90 px, pointerup → onCreateRange({ date, startTime: '09:00', endTime: '10:30' }) with the selection preview shown during the drag (role presentation, text '09:00 – 10:30')"
  - "EP15H-AC1: Escape during a selection removes the preview and calls nothing"
  - "EP15H-AC1: pointerdown + pointerup without 4 px of movement calls nothing (click on free space)"
  - "EP15H-AC1: a touch pointer (pointerType 'touch') is ignored (D-H3)"
  - "EP15H-AC2: EVENT and STUDY_BLOCK chips carry cursor-grab and a bottom resize handle (aria-hidden, tabIndex -1); CLASS, STUDY_SESSION, PLANNED_SESSION chips carry neither"
  - "EP15H-AC2: dragging an EVENT 60 px down calls onMove(event, { date, startTime +1 h, endTime +1 h }) after release; the ghost shows the live time while dragging"
  - "EP15H-AC2: dragging an EVENT into the next column calls onMove with the next date and unchanged times"
  - "EP15H-AC2: dragging the handle 30 px calls onResize(event, { endTime +30 min })"
  - "EP15H-AC2: move/resize clamp at the visible range edges (end never past 24:00 or the range end)"
  - "EP15H-AC2: releasing outside every column reverts and calls nothing"
  - "EP15H-AC2: a 4 px-or-less pointer sequence on a chip is a click → onOpenEvent (details), not a move (D-H5)"
  - "EP15H-AC3: Escape mid-drag snaps the chip back and calls nothing; the snap-back class carries motion-reduce:transition-none"
  - "EP15H-AC3: introduces no animation without its reduced-motion companion"
  - "EP15H-AC3: with editable=false no pointer handlers or handles render (EP15E behaviour intact)"
- `pages/calendar/ui/CalendarPage.drag.test.tsx` (wiring):
  - "EP15H-AC1: onCreateRange opens BlockSheet in create mode with the selection pre-filled; Save POSTs; the sheet's keyboard path is unchanged"
  - "EP15H-AC2: one-off move → one PATCH { startDate, startTime, endTime }; one-off resize → one PATCH { endTime }; then refetch and 'Moved to Tue 14:00–15:00' / 'Resized to 14:00–15:30'"
  - "EP15H-AC2: weekly same-day move → a Dialog titled 'This repeats weekly' with the prompt 'Move it for:'; 'Just this day' → POST then occurrence cancel; 'This and following' → PATCH with effectiveFrom = date; Back/Escape reverts with no request (D-H6)"
  - "EP15H-AC2: weekly same-day resize → the same prompt with 'Resize it for:'"
  - "EP15H-AC2: weekly cross-day drag (Mon/Wed/Fri series, Wed → Thu) → no prompt; POST one-off on Thu, then DELETE …/occurrences/<Wed date>; series weekdays untouched (no PATCH); announces 'Moved this day's Work shift to Thu 14:00–15:00; other weeks unchanged'"
  - "EP15H-AC2: cross-day POST fails → no cancel, toast, chip reverts; cancel fails after POST → refetch shows both and the EP15G-AC2 partial sentence is announced"
  - "EP15H-AC2: a no-op drop (same place) issues no request and no prompt"
  - "EP15H-AC3: every pointer outcome has a sheet equivalent — table-driven: create ↔ Add, move ↔ Edit date/start/end, resize ↔ Edit end, weekly choices ↔ the same WeeklyChoicePrompt; the test asserts the grid exposes exactly the three callbacks { onCreateRange, onMove, onResize } and nothing else" (the "grep-style" parity assertion)
  - "EP15H-AC3: below sm (narrow) editable is false — the agenda has no drag surface (D-H3)"
- Manual pass (TR-E15-11): drag-create, move a weekly item (prompt), resize a one-off, Escape mid-drag, reduced-motion on, VoiceOver confirms the announcements; 375 px: no handles, form path works.

## UI/UX

### Components (reuse vs new; FSD placement)

| Component | Reuse / new | Reason |
|---|---|---|
| `features/schedule-blocks/lib/dragModel.ts` | **New, pure** | `minuteAtY`, `snapTo15`, `selectionFromDrag`, `applyMove`, `applyResize`, `dateAtX`, `isNoOp`, `dragStarted`, `DRAG_THRESHOLD_PX = 4`, `SNAP_MIN = 15`. Imports `PX_PER_HOUR`/`minutesOf` from `features/calendar/lib/gridModel` (same layer, allowed). |
| `features/calendar/ui/WeekGrid.tsx` | Change | `editable?: boolean` + `onCreateRange`, `onMove`, `onResize` callbacks; pointer handlers on columns and on `EVENT`/`STUDY_BLOCK` chips; selection preview and drag ghost. Nothing renders or binds when `editable` is false. |
| `features/calendar/ui/CalendarEventChip.tsx` | Change | `draggable?: boolean` → `cursor-grab active:cursor-grabbing`, the bottom handle, and a live time label slot while dragging. |
| `features/schedule-blocks/ui/WeeklyChoicePrompt.tsx` | Reuse (EP15G) | Same component, same two answers, inside one shared `Dialog` opened by the page for a weekly same-day drop (D-H6). |
| `features/schedule-blocks/ui/BlockSheet.tsx` | Reuse (EP15G) | `initial = { date, startTime, endTime }` from a selection; nothing else changes. |
| `shared/ui/Dialog` | Reuse | Container for the drop-time prompt (title "This repeats weekly"). |
| `pages/calendar/ui/CalendarPage.tsx` | Change | Passes `editable={!isNarrow}`, wires the three callbacks to EP15G's request functions, owns the prompt dialog and announcements. |

### Affordances and feedback

- **Draggable chips** (`EVENT`, `STUDY_BLOCK` only): `cursor-grab`; while dragging `cursor-grabbing`, `opacity-80 shadow-lg z-20`, and the chip's time line updates live (`14:00 – 15:00`). The chip stays a `button`: a press-and-release under 4 px opens details as before (D-H5).
- **Resize handle:** an 8 px-tall strip across the chip's bottom edge (`cursor-ns-resize`) with a centred `GripHorizontal` icon (12 px, `text-text-muted`) visible on hover and `focus-within`; `aria-hidden="true"`, `tabIndex={-1}` — it is pointer-only by design, and the keyboard equivalent is the sheet's End field (D-H7). Bottom edge only.
- **Selection preview** (create): a `div role="presentation"` in the column, `bg-accent/15 border-2 border-dashed border-accent rounded-md`, top-left caption `09:00 – 10:30` in `text-caption text-text`; it grows/shrinks in 15-minute steps as the pointer moves (snap feedback is the step itself — no easing). Minimum 15 minutes; a release under that is a click and shows nothing.
- **Drop feedback:** the moved/resized chip stays where it was dropped while the request runs (`aria-busy`), then the week refetches; on failure the chip animates back (`transition-transform duration-base motion-reduce:transition-none`) and a toast shows "We couldn't move this. Try again." / "We couldn't resize this. Try again."
- **Escape** during any drag: preview removed / chip snaps back, pointer capture released, nothing called.
- **Weekly same-day drop** (D-H6): the chip stays at the drop position; a shared `Dialog` opens, title **"This repeats weekly"**, body = `WeeklyChoicePrompt` with the sentence **"Move it for:"** (or **"Resize it for:"**) → **"Just this day"** / **"This and following"** · **Back**. Back/Escape snaps the chip back; no request.
- **Cross-day weekly drop** (D-H4): no prompt; the request pair runs; announcement = the AC2 sentence with `<title>` = the chip's title ("Busy"/"Study" when default) and `<Day HH:mm–HH:mm>` from `dayHeaderLabel`'s weekday + the new times.
- **Live region copy** (`role="status"`, the existing page line): "Moved to Tue 14:00–15:00" · "Resized to 14:00–15:30" · "Moved to Tue 14:00–15:00 for this and following weeks" · "Resized to 14:00–15:30 for this day" · the cross-day sentence · EP15G's partial-failure sentence verbatim.
- **Free pieces and shaded regions** become drag-select surfaces (`cursor-crosshair` on hover when `editable`), but stay non-focusable and unlabelled beyond EP15E's text — the sheet's "Add" is the keyboard way to create (AC3).

### States

- Dragging: as above. Pending: `aria-busy` on the chip, inputs on the page unaffected. Error: revert + toast. Success: refetch + announcement. Reduced motion: no transitions on preview/ghost at all (they move by discrete steps); the only transition (snap-back) carries `motion-reduce:transition-none`.

### Accessibility

- Nothing is pointer-only in outcome: create = Add → sheet; move = Edit → Date/Start/End; resize = Edit → End; weekly choices = the same prompt (AC3 parity table in the tests).
- Handles and previews are `aria-hidden`/`role="presentation"` so screen-reader users hear only the chips, the dialog and the status line.
- Announcements are polite, one sentence, past tense, no jargon (D15-14 rule 6).
- Drags ignore `pointerType === 'touch'` (D-H3); `editable` is false below `sm`.

### Responsive

- ≥ `sm`: all gestures. < `sm`: none (the agenda + sheet are the editor). No new layout.

## Technical notes

- **Inspected (2026-11-16, `960fb60`):** `WeekGrid` geometry as pinned by EP15E (15 px rows, 60 px/hour, `grid-row` spans, columns `minmax(112px,1fr)`, hour range from `gridModel.hourRange`) — so y → minute is `rangeStart + (y − colTop) / 1 px·min⁻¹`; `shared/ui/Dialog.tsx` focus restore and `busy`; pointer handlers already exist in the repo only in `RowActionsMenu.tsx`/`CourseActionsMenu.tsx` (menus, no capture); `index.css` reduced-motion collapse; the dashboard tests' "introduces no animation without its reduced-motion companion" pattern (`DashboardQuickActions.test.tsx:96`); `CalendarPage.tsx` `isNarrow`/`fetchWeek`/status line; EP15G's `BlockSheet` props, request functions and `WeeklyChoicePrompt`.
- **Files to change / create:**
  - `apps/web/src/features/schedule-blocks/lib/dragModel.ts` (new) + `dragModel.test.ts`.
  - `apps/web/src/features/calendar/ui/WeekGrid.tsx` + `WeekGrid.drag.test.tsx` — `editable`, three callbacks; `onPointerDown` on each day column (free/shaded surface) and on draggable chips/handles; `setPointerCapture(pointerId)` on the element that received `pointerdown`; `onPointerMove` computes the live state through `dragModel`; `onPointerUp` resolves; `keydown Escape` on `document` while a drag is active cancels. Drag state lives in a `useRef` + one `useState` for render (preview/ghost), to avoid re-rendering the whole grid per pixel.
  - `apps/web/src/features/calendar/ui/CalendarEventChip.tsx` + test — `draggable`, handle, live time slot.
  - `apps/web/src/pages/calendar/ui/CalendarPage.tsx` + `CalendarPage.drag.test.tsx` — `editable={!isNarrow}`; `onCreateRange` → `setSheet({ mode: 'create', initial })`; `onMove`/`onResize` → `resolveDrop(event, next)`: one-off → `updateScheduleBlock(blockId, { startDate?, startTime, endTime })`; weekly same-day → open the prompt dialog, then EP15G's wiring (this day: `createScheduleBlock` one-off then `cancelOccurrence`; following: `updateScheduleBlock(blockId, { startTime, endTime, effectiveFrom: date })`); weekly cross-day → `createScheduleBlock({ kind, title, courseId?, energy?, startDate: newDate, startTime, endTime })` then `cancelOccurrence(blockId, oldDate)`; every path → `fetchWeek(from, to, false)` + announcement.
- **Request bodies (no new API):** move one-off same day `PATCH { startTime, endTime }`; move one-off other day `PATCH { startDate, startTime, endTime }`; resize `PATCH { endTime }`; weekly following `PATCH { startTime, endTime, effectiveFrom }` (resize: `{ endTime, effectiveFrom }`); weekly this day / cross-day: `POST` one-off then `DELETE …/occurrences/:date` (EP15G order, R-EP15-03).
- **Clamp source:** the grid's visible range (`hourRange` output) — a drop can never produce `startTime < rangeStart` or `endTime > rangeEnd`; `24:00` is the absolute ceiling and is sent as `"24:00"`.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-H1 | Snap: (a) 15 minutes; (b) 5; (c) 30 | **(a)** — matches the grid rows and the engine's typical block sizes; fewer fiddly targets (D15-14) | Proposed |
| D-H2 | Weekly same-day drag: (a) always ask the two-choice question before saving; (b) default to "this and following" silently | **(a)** — a silent series move is the kind of surprise that erodes trust | Proposed |
| D-H4 | Weekly cross-day drag: (a) always "Just this day" (one-off on the new date + cancel the source occurrence), announced, no prompt — a series' weekdays change only in the sheet; (b) ask the two-choice question and define "this and following" as a weekday swap in the successor | **(a)** — "this and following" has no defined meaning for a multi-weekday series (Mon/Wed/Fri, Wed → Thu); one gesture, one outcome, said out loud (D15-14) | Proposed |
| D-H3 | Touch: (a) no touch gestures in v1 — below `sm` the agenda's form path is the editor; (b) long-press drag | **(a)** — scroll vs drag conflicts on phones; the form is two taps | Proposed |
| D-H5 | Click vs drag: (a) a drag starts only after 4 px of pointer movement; under that, a chip press opens details and a free-cell press does nothing; (b) drag on `pointerdown` immediately; (c) a modifier key to drag | **(a)** — preserves EP15E's click-to-open exactly and makes AC1's "a click without drag does nothing" mechanical; (c) is a hidden control | Proposed |
| D-H6 | Where the weekly same-day question appears after a drop: (a) EP15G's `WeeklyChoicePrompt` inside one shared `Dialog` ("This repeats weekly" / "Move it for:" · "Resize it for:"), Back/Escape reverts; (b) an anchored popover at the drop point; (c) a toast with buttons | **(a)** — one proven focus-managed container, the same two words the sheet uses; (b)/(c) are new primitives with their own focus and timeout problems | Proposed |
| D-H7 | Resize handle: (a) bottom edge only, an 8 px strip with a `GripHorizontal` icon on hover/focus-within, `aria-hidden`, pointer-only (the keyboard equivalent is the sheet's End field); (b) both edges; (c) no visible handle (edge-sensing only) | **(a)** — one target per chip (D15-14); start changes are a move; (c) is undiscoverable | Proposed |
| D-H8 | Feedback while dragging: (a) discrete 15-minute steps with a live time caption on the preview/ghost; no easing; on failure a single snap-back transition with `motion-reduce:transition-none`; (b) smooth pixel-following ghost that snaps on release | **(a)** — the step *is* the snapping feedback, nothing animates under reduced motion, and the caption tells the exact result before release | Proposed |

## Definition of Done

1, 5 (selection/drag states), 6 (nothing pointer-only), 8 (TR-E15-08), TR-E15-11 manual pass recorded. 2/3/4 N/A (no new inputs or API). 7 N/A by design (pointer ≥ `sm`). 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** blocking out a week takes a few drags, and nothing is lost for keyboard users.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/features/calendar/ui/WeekGrid.tsx` (pointer handlers) + `WeekGrid.drag.test.tsx`, `apps/web/src/features/calendar/ui/CalendarEventChip.tsx` (+ test), `apps/web/src/features/schedule-blocks/lib/dragModel.ts` (new) + test, `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (wiring) + `CalendarPage.drag.test.tsx`.
- **Start context:** this story (incl. the refiner's UI/UX section and D-H5…D-H8); EP15E's grid geometry (D-E6/D-E7); EP15G's sheet props, request functions and prompt.
- **Verification:** `pnpm --filter @studypilot/web test -- calendar schedule-blocks` green; `typecheck` + `lint` green; manual: drag-create, move a weekly item (prompt appears), resize a one-off, Escape mid-drag, reduced motion.
- **Dependencies / exclusions:** EP15G. Playwright drag journey → EP15J.
