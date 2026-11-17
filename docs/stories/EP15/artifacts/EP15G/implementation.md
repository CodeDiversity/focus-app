# EP15G implementation record

**Story:** [EP15G — Add, Edit and Delete Events and Study Blocks Through One Sheet](../../EP15G-add-edit-delete-blocks-via-form.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-17
**Commit scope:** new `apps/web/src/entities/schedule-block/{model/types,api/scheduleBlockApi}.ts` (+ test), `features/schedule-blocks/lib/{blockForm,defaults}.ts` (+ tests), `features/schedule-blocks/ui/{BlockSheet,WeeklyChoicePrompt,WeekdayChips}.tsx` (+ tests); `features/calendar/ui/CalendarEventDetails.tsx` (`onEdit` / `onDelete`, inline two-step and prompt; + test), `pages/calendar/ui/CalendarPage.tsx` ("Add", sheet mount, delete wiring, announcements, refetch, focus return; + tests), `shared/ui/Switch.test.tsx` (one case); this record; story Status/rulings/sizing; README row + Next; `efficiency.md`; checkpoint closed.

Decisions applied: D-G1…D-G9 and D-G11 ratified by default 2026-11-17 at implementation start on the user's instruction ("ratify all decisions for the current story"); D-G10 ▲ as already ruled (user grant 2026-11-16). Epic D15-5, D15-6, D15-14 as written. None reopened.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP15G-AC1 — "Add" opens the sheet: Busy/Study toggle (default Busy), date (today in view, else the week's Monday), start = next whole hour inside the day's bounds, end +1 h, optional title with kind placeholder, "Repeats weekly" switch revealing seven chips with the date's weekday pre-checked, "More" with Ends on (weekly) / Course + Energy (Study, default Normal); Save `POST`s; 400 → field; foreign-course 404 → uniform message | **Done.** `BlockSheet` (create mode) on the shared `Dialog`; defaults from `defaultFormValues` + `defaultStart` (clock minute supplied by the page's existing profile-zone "now" — no local getter in the sheet); `toPayload` sends only what applies (one-off omits weekdays/endDate, Busy omits course/energy, empty title omitted); the API's `errors` map maps through `API_TO_FORM_FIELD` (`startDate` → Date); 404 renders "Resource not found — it may no longer exist." as a form-level alert with values kept; courses load once on first Study selection, active only, soft-fail note (D-G8); "More" is absent for a one-off Busy block and collapsed by default otherwise. End `00:00` ↔ `24:00` (D-G6) with the shared midnight hint. | `BlockSheet.test.tsx` AC1 (9), `blockForm.test.ts` (4), `defaults.test.ts` (1), `scheduleBlockApi.test.ts` (5), `CalendarPage.test.tsx` AC1 (1) |
| EP15G-AC2 — Edit from EVENT/STUDY_BLOCK details pre-fills the sheet with the kind hidden; Remove in place; weekly items ask one question with two answers except series-level edits (D-G10); wiring: just-this-day edit = `POST` one-off **then** cancel occurrence (partial → the verbatim sentence), this-and-following = `PATCH` + `effectiveFrom`, weekly off = `{ weekdays: null, endDate: null, effectiveFrom }`, deletes = row / occurrence / `?from=`; a one-off asks nothing | **Done.** Edit mode reads `GET /schedule/blocks` once and picks `blockId` for chips and Ends on (fields disabled with "Loading…" meanwhile; a miss shows the uniform alert and disables Save). `toUpdatePayload` sends only changed fields with null-clears; `changedSeriesFields` routes series edits straight to this-and-following with the hint under the chips; other weekly edits show `WeeklyChoicePrompt` in place of the form (same dialog, Back/Escape return to the form unchanged, focus back on Save). "Just this day": `POST` first (failure → back on the form with the error, nothing announced), then `DELETE …/occurrences/:date` (failure → `this-day-partial`, the page announces the AC2 sentence and the refetched week shows both items). Details: Remove on a one-off swaps the footer to "Remove this? / No (focused) / Yes, remove"; on a weekly item to "This repeats weekly. Remove it for:"; Edit closes the details and opens the sheet (one dialog at a time). Page wiring 6–8 as specified; a failed removal toasts and restores the footer. | `BlockSheet.test.tsx` AC2 (9), `blockForm.test.ts` AC2 (2), `WeeklyChoicePrompt.test.tsx` (1), `CalendarEventDetails.test.tsx` EP15G (3), `CalendarPage.test.tsx` AC2 (2) |
| EP15G-AC3 — below `sm` the agenda has the same "Add" and the same sheet; its items open the same details with Edit and Remove | **Done.** The toolbar (one primary "Add", first in the row) renders at every width; the agenda's entries go through the same `onOpenEvent` → details → Edit/Remove path; classes and other kinds show neither. | `CalendarPage.test.tsx` AC3 (1) |
| EP15G-AC4 — shared `Dialog` (trap, Escape, focus return); chips are a labelled checkbox group; ≥ 44 px on mobile; duplicate submission prevented; week re-reads and the status region announces per the matrix | **Done.** Escape is inert and Save disabled while in flight (`busy` Dialog, `isLoading` Save with a stable `aria-label`); `WeekdayChips` is a `fieldset`/legend "On these days" with seven native checkboxes named Monday…Sunday (Space toggles; checked = fill **and** a check icon); every control carries `max-sm:min-h-[44px]`; the Dialog carries the D-G7 bottom-sheet classes; after any save or removal the page refetches, announces in the one `role="status"` line (prefix cleared on the next week change) and returns focus to the trigger ("Add" or the chip). Announcement matrix: "Busy/Study block added", "… updated", "… updated for this day", "… updated for this and following weeks", "Busy/Study block removed", "Removed for this day", "Removed for this and following weeks", partial sentence verbatim. | `BlockSheet.test.tsx` AC4 (3), `Switch.test.tsx` EP15G (1), `CalendarPage.test.tsx` AC4 (1) |

## Manual accessibility pass (TR-E15-11)

| Step | Result |
|---|---|
| Keyboard: Tab order (kind → Title → Date → Start → End → switch → chips → More → Cancel → Save), Space on chips, Escape on the sheet and on the prompt, focus return to "Add" / the chip after save, remove and cancel | **Executed by test** (sheet, details and page suites; shared Dialog trap). |
| 44 px controls and the bottom sheet on the narrow viewport | **Executed by test** (class assertions on every control, pills and the dialog's D-G7 classes). |
| Visual pass (desktop / 375 px) | **Not executed** this window (no browser screenshot harness was set up; the EP15F pass needed a throwaway API build). User instruction: open the calendar, press "Add", switch to Study, turn on "Repeats weekly", expand "More"; then at 375 px confirm the sheet sits at the bottom with Save lowest and the chips wrap to two rows. |
| Screen reader read-through | **Not executed** (no screen reader here). User instruction (VoiceOver): "Add to calendar, dialog … What is it?, radio group, Busy, selected … Title (optional), edit text, Busy … Date … Start … End … Repeats weekly, switch, off … Cancel, button … Save, button"; on a weekly Save: "This repeats weekly. Apply your change to:" then focus on "Just this day, button"; after saving the status region reads "Busy added. Showing …". |

## Verification (2026-11-17, this worktree)

**Tested state:** `HEAD 2dd361f` + the uncommitted changes that form this commit.

- **Web unit:** `npx vitest run` (cwd `apps/web`) → **126 files, 1406 passed, 0 failed** (43 new: API 5, blockForm 6, defaults 1, BlockSheet 21, prompt 1, details 3, page 5, Switch 1).
- **Static:** `tsc --noEmit` ✓; `eslint src --max-warnings 0` ✓; `prettier --check` ✓.
- **Web E2E (full, self-contained stack):** **not run in this worktree.** `pnpm --filter @studypilot/web test:e2e` fails at setup here because `apps/api/.env.local` (gitignored) exists only in the main checkout, and the session's policy did not allow loading it from there. The suite does not exercise any EP15G surface (its calendar spec checks Today, the interim "Manage availability" link and chip → details → Escape, all unchanged in behaviour) and the full web unit suite is green, but per EP14A-AC4 this is recorded as **not evidenced**. Run from the main checkout: `pnpm --filter @studypilot/web test:e2e` (expected 55 passed, as at EP15F).

## Changed paths

- New: `apps/web/src/entities/schedule-block/model/types.ts`, `entities/schedule-block/api/scheduleBlockApi.ts` (+ test), `features/schedule-blocks/lib/blockForm.ts` (+ test), `features/schedule-blocks/lib/defaults.ts` (+ test), `features/schedule-blocks/ui/BlockSheet.tsx` (+ test), `features/schedule-blocks/ui/WeeklyChoicePrompt.tsx` (+ test), `features/schedule-blocks/ui/WeekdayChips.tsx`.
- Changed: `features/calendar/ui/CalendarEventDetails.tsx` (+ test), `pages/calendar/ui/CalendarPage.tsx` (+ test), `shared/ui/Switch.test.tsx`.
- Docs: this record; checkpoint (closed); story Status, D-G rulings, sizing; README row + Next; `efficiency.md`.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP15G-01 | `BlockSheet.tsx` courses effect; `BlockSheet.test.tsx` D-G8 case | The first version keyed the load effect on the courses status, so the `idle → loading` transition re-ran the effect and its cleanup cancelled the very request it had started — the select never left "Loading courses…". | **Fixed:** a ref guards the single request; the effect depends on the kind only. | — |
| F-EP15G-02 | `BlockSheet.tsx` edit mode | Fields are disabled while the series shape loads, so the shared Dialog's first-focus found no enabled control and focus stayed on the container. | **Fixed:** after the row arrives the sheet focuses Title (`setFocus`), matching the UI/UX § Accessibility rule for edit mode. | — |
| F-EP15G-03 | `shared/ui/Button.tsx` (`isLoading`) | While loading the Button replaces its children with an `aria-hidden` spinner, so the control loses its accessible name mid-flight (the existing forms work around it with `aria-label`). | **Worked around** here (`aria-label="Save"`, "Yes, remove"); **noted** for the design-system owner: keep the label in the DOM (visually hidden) while loading. | planner / EP10 owner |
| F-EP15G-04 | `BlockSheet.tsx` edit mode; contracts § API | No `GET /schedule/blocks/:id` exists, so every edit reads the whole list to find one row (as the story anticipates). Fine today; grows with the student's history. | **Noted** for the planner (a `:id` read, or `weekdays`/`endDate` on the calendar payload, would remove the list read). | planner |

## Deviations

1. **"Just this day" uses the form's date for the one-off**, which defaults to the occurrence's date (AC2's `startDate: event.date`) — so moving one occurrence to another day works through the same path; the cancelled occurrence is always the original date.
2. **Save with nothing changed closes the sheet** without a request or announcement (an empty `PATCH` body is a 400 by contract).
3. **Edit-mode fields are disabled while the series shape loads**, with a "Loading…" line; a miss (the row is gone) shows the uniform alert and leaves only Cancel.
4. **A failed removal keeps the details dialog open** with its footer restored and toasts the error (the story specifies success paths only).
5. **The kind cards' "Selected" cue is screen-reader text** next to the icon + label; the visible selected state is the accent border/fill plus the checked native radio.
