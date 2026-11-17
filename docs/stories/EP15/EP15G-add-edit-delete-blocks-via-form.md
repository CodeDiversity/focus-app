# EP15G — Add, Edit and Delete Events and Study Blocks Through One Sheet

**Story ID:** EP15G
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Frontend
**Status:** Ready — refined 2026-11-16 (technical + UI/UX, D15-16); implementation blocked on the EP14 review unit (D15-11) and this story's queue dependencies
**Refined:** 2026-11-16 (refiner; sheet layout, chips, "More", prompt copy, details actions and request wiring settled below — ready to implement once EP15B and EP15E land)
**Dependencies:** EP15B (API) and EP15E (grid + details dialog) implemented. Epic decisions D15-5, D15-6, D15-14 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** one "Add" action on the calendar opens one sheet — Busy or Study, date and times pre-filled, title optional, a "Repeats weekly" switch that reveals weekday chips, and a "More" disclosure for end date, course and energy; edit and delete live in the item's details; a weekly occurrence asks exactly one question with two answers ("Just this day" / "This and following"); the agenda gets the same Add and the same sheet.
- **Why it improves it:** every event and study block is created or changed in one place with defaults that are usually right (product, AC-E15-03/04/06/10/11, D15-14); the form and keyboard path exists before any drag gesture, so parity is the baseline (code).
- **Decisions needing you:** none ▲ blocking — D-G1…D-G5 ratify by default (D15-17); the refiner added D-G6…D-G11 (2026-11-16); **D-G10 ▲** (a series-level edit skips the two-choice question) is user-visible and ratifies by default under D15-17 unless you edit its Ruling.
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

The editor. Kept deliberately small: two kinds, one switch, one disclosure,
one question with two answers. Nothing the student does not need is on the
screen until they ask for it.

## Scope

**In:** `features/schedule-blocks/ui/{BlockSheet, WeeklyChoicePrompt, WeekdayChips}.tsx`, `features/schedule-blocks/lib/{blockForm,defaults}.ts`, `entities/schedule-block/{api,model}`, `shared/ui/Switch.tsx` is **owned by EP15F** (lands first; R-EP15-14) and reused here — D-G9, the "Add" button on the calendar toolbar (serves grid and agenda), Edit/Delete in `CalendarEventDetails` for `EVENT`/`STUDY_BLOCK`, the two-choice wiring to the API, refetch + announcements, client validation mirror, tests.

**Out (explicit, against drift):**
- pointer gestures, drag pre-fill, `editable` grid prop (EP15H);
- day bounds banner/sheet (EP15F);
- class meetings, deadlines, study sessions, planned sessions — their details keep only the course link; no Edit/Delete;
- a third answer to the weekly question ("All occurrences", "Only future weeks", "Pick dates"), undo of a cancelled day (BL-15-05), templates, colours, categories, tags, notes field, reminders, "copy to next week" — all rejected under D15-14 or the epic's out-of-scope list;
- recurrence other than weekly (BL-15-03); `24:00` entry beyond the `00:00` mapping in D-G6;
- any change under Profile/Settings (D15-14 rule 7);
- the retirement of `/availability` and its nav entries (EP15I).

## Source requirement references

AC-E15-03, AC-E15-04, AC-E15-06 (UI), AC-E15-10 (form + keyboard half), AC-E15-11, AC-E15-12 (details actions); TR-E15-07, TR-E15-11; DoD-2, DoD-4, DoD-5, DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. "Add" opens the block sheet with: a Busy / Study toggle (default Busy); date (the viewed week's today or the selected day); start and end (next whole hour, one hour long); optional title with the placeholder "Busy" or "Study"; a "Repeats weekly" switch that, when on, shows seven weekday chips with the date's weekday pre-selected; a "More" disclosure holding "Ends on" (weekly only) and, for Study only, Course and Energy (default Normal). Save creates via `POST /schedule/blocks`; a 400 maps to its field; a foreign-course 404 shows the uniform message.
2. From an `EVENT` or `STUDY_BLOCK` details dialog, Edit opens the same sheet pre-filled with the kind toggle hidden, and Delete is available in place (no second dialog). On a weekly item Save and Delete first ask one question — "Just this day" or "This and following" — **except** when the edit changes series-level fields (weekday chips, "Ends on", or switching "Repeats weekly" off), which saves as "This and following" with an inline hint and no prompt (▲ D-G10; "Just this day" has no meaning for a weekday change). Wire it as: just-this-day edit → **`POST` the one-off with the edited values first, then** `DELETE …/occurrences/:date` (one action, one announcement; R-EP15-03): if the `POST` fails nothing has changed and the error shows in the sheet; if the cancel fails after the `POST` succeeded, the week re-reads showing both the original occurrence and the new block for that day and the status region says "Saved your change, but the original block is still showing for this day — remove it from its details."; just-this-day delete → `DELETE …/occurrences/:date`; this-and-following edit → `PATCH` with `effectiveFrom` = the item's date; switching "Repeats weekly" off → `PATCH { weekdays: null, endDate: null, effectiveFrom: <date> }`, whose successor is a one-off on that date (contracts § PATCH semantics); this-and-following delete → `DELETE ?from=` the item's date. A one-off item asks nothing.
3. Below `sm` the agenda has the same "Add" and opens the same sheet; its items open the same details with Edit and Delete; results are identical to the grid path.
4. The sheet is the shared `Dialog` (focus trap, Escape, focus returns to the trigger); the weekday chips are a labelled checkbox group operable by keyboard; every control is ≥ 44px on mobile; duplicate submission is prevented; after any change the week re-reads and the status region announces the change ("Busy added", "Study block updated for this and following weeks", "Removed for this day").

## Tests (TR-E15-07)

Vitest + Testing Library; `scheduleBlockApi` mocked with `vi.mock` (page tests) or the axios-adapter pattern of `availabilityApi.test.ts` (entity tests). `it(...)` titles, each citing its AC:

- `entities/schedule-block/api/scheduleBlockApi.test.ts`:
  - "EP15G-AC1: createScheduleBlock POSTs /schedule/blocks with the body as given and returns the row"
  - "EP15G-AC2: updateScheduleBlock PATCHes /schedule/blocks/:id, passing effectiveFrom only when provided"
  - "EP15G-AC2: deleteScheduleBlock DELETEs /schedule/blocks/:id and appends ?from= only when provided"
  - "EP15G-AC2: cancelOccurrence DELETEs /schedule/blocks/:id/occurrences/:date"
  - "EP15G-AC1: listScheduleBlocks GETs /schedule/blocks and returns the API order"
- `features/schedule-blocks/lib/blockForm.test.ts` (zod mirror + payload mapping, pure):
  - "EP15G-AC1: defaults — kind Busy, date as given, start next whole hour, end +60 min, weekly off, energy NORMAL, title empty"
  - "EP15G-AC1: toPayload — one-off omits weekdays/endDate; weekly sends ascending weekdays; Busy omits courseId/energy; empty title → omitted"
  - "EP15G-AC1: toPayload — end 00:00 is sent as 24:00; fromBlock pre-fills 24:00 as 00:00 (D-G6)"
  - "EP15G-AC1: validation — end must be after start (except the 00:00 midnight case), at least one weekday when weekly, Ends on ≥ Date, title ≤ 60 after trim"
  - "EP15G-AC2: changedSeriesFields — detects weekdays/endDate/weekly-switch changes on a weekly item (D-G10)"
- `features/schedule-blocks/lib/defaults.test.ts`:
  - "EP15G-AC1: defaultStart — today → next whole hour by the clock, clamped to [wake, sleep − 1 h]; another day → the day's wake time rounded up to the hour"
- `features/schedule-blocks/ui/BlockSheet.test.tsx`:
  - "EP15G-AC1: create mode shows Busy checked, Title with placeholder 'Busy', Date, Start, End, 'Repeats weekly' off, no chips, and no 'More' for a one-off Busy block"
  - "EP15G-AC1: switching to Study changes the placeholder to 'Study' and reveals 'More' (Course, Energy default Normal)"
  - "EP15G-AC1: 'Repeats weekly' on reveals seven chips Mon…Sun with the date's weekday checked and 'More' gains 'Ends on'; the Date label reads 'Starts on'"
  - "EP15G-AC1: 'More' is collapsed by default (aria-expanded=false) and its fields are absent from the DOM until expanded"
  - "EP15G-AC1: Save with defaults POSTs { kind: 'BUSY', startDate, startTime, endTime } and nothing else"
  - "EP15G-AC1: Save of a weekly Study block with course/energy/Ends on POSTs the full body with ascending weekdays"
  - "EP15G-AC1: a 400 with errors.startTime renders under Start; errors.weekdays under the chips group; errors.courseId under Course"
  - "EP15G-AC1: a foreign-course 404 renders the uniform message as a form-level alert and keeps the values"
  - "EP15G-AC1: course list — loads once when Study is selected; shows 'Loading courses…' then options 'No course' + 'CODE — Name'; a load failure hides the select with the note 'Couldn't load your courses — you can tie a course later.' (D-G8)"
  - "EP15G-AC2: edit mode hides the kind toggle, pre-fills every field, auto-expands 'More' when any of its values is non-default"
  - "EP15G-AC2: Save on a one-off PATCHes in place, no prompt"
  - "EP15G-AC2: Save on a weekly item shows the prompt 'This repeats weekly. Apply your change to:' with exactly two choice buttons and a Back button"
  - "EP15G-AC2: 'Just this day' → POST one-off first, then DELETE occurrence; the sheet closes after both and onSaved reports 'this-day'"
  - "EP15G-AC2: 'Just this day' — POST fails → no cancel request, the error shows in the sheet, nothing announced"
  - "EP15G-AC2: 'Just this day' — cancel fails after POST → onSaved reports 'this-day-partial' (the page announces the verbatim AC2 sentence) and the sheet closes"
  - "EP15G-AC2: 'This and following' → one PATCH with effectiveFrom = the item's date"
  - "EP15G-AC2: Back on the prompt returns to the form with values intact; Escape on the prompt does the same; no request"
  - "EP15G-AC2: a weekly item whose weekdays, Ends on or weekly switch changed saves as 'This and following' without the prompt and shows the hint 'Changing the days or the end date applies to this and following weeks.' (D-G10)"
  - "EP15G-AC4: Escape closes (frozen while submitting), focus returns to the trigger, Save is disabled while in flight (duplicate-submit guard)"
  - "EP15G-AC4: chips are a fieldset with legend 'On these days' holding seven checkboxes named Monday…Sunday; Space toggles; tab enters the group once"
  - "EP15G-AC4: at a narrow viewport every control has min-h-[44px] and the dialog carries the bottom-sheet classes (D-G7)"
- `features/schedule-blocks/ui/WeeklyChoicePrompt.test.tsx`:
  - "EP15G-AC2: renders the context sentence, 'Just this day', 'This and following' and 'Back'; focus lands on 'Just this day'; Escape calls onBack"
- `features/calendar/ui/CalendarEventDetails.test.tsx` (extend):
  - "EP15G-AC2: EVENT/STUDY_BLOCK details show Edit and Remove; other kinds show neither"
  - "EP15G-AC2: Remove on a one-off swaps the footer to 'Remove this? Yes, remove / No' (D-G5); Yes calls onDelete({ mode: 'all' }); No restores the footer"
  - "EP15G-AC2: Remove on a weekly item swaps the footer to the prompt 'This repeats weekly. Remove it for:'; the two answers call onDelete with 'this-day' / 'following'"
- `pages/calendar/ui/CalendarPage.test.tsx` (extend):
  - "EP15G-AC1: the toolbar 'Add' opens the sheet with date = result.today when in view, else the week's Monday"
  - "EP15G-AC3: at a narrow viewport the same 'Add' is present and the agenda entry's details carry Edit and Remove"
  - "EP15G-AC2: delete wirings — one-off → DELETE /schedule/blocks/:id; weekly this-day → DELETE …/occurrences/:date; weekly following → DELETE ?from=date; each refetches"
  - "EP15G-AC4: announcements — 'Busy added', 'Study block added', 'Busy updated', 'Study block updated for this day', 'Study block updated for this and following weeks', 'Busy removed', 'Removed for this day', 'Removed for this and following weeks'"
  - "EP15G-AC2: partial failure announces exactly 'Saved your change, but the original block is still showing for this day — remove it from its details.' and the refetched week shows both items"
- `shared/ui/Switch.test.tsx` (if created here): "EP15G-AC4: role switch, aria-checked, label association, Space/Enter toggle, 44px on narrow"
- Manual pass (TR-E15-11): VoiceOver through the sheet and the prompt; 375 px bottom sheet; keyboard-only create/edit/delete of a weekly item.

## UI/UX

### Components (reuse vs new; FSD placement)

| Component | Reuse / new | Reason |
|---|---|---|
| `features/schedule-blocks/ui/BlockSheet.tsx` | **New** | The one editor. Props: `mode: 'create' \| 'edit'`, `initial` (date, start, end — from the page or EP15H), `block?` (edit: the `CalendarEvent` + its `blockId`/`date`), `onSaved(result)`, `onClose()`. Carries the `AvailabilitySlotForm` pattern verbatim: react-hook-form + zod, `FIELD_ERROR_FIELDS`, `extractApiError`/`getFieldError`/`apiErrorMessage`, `requestClose` frozen while submitting, `data-dialog-commit` on Save. |
| `features/schedule-blocks/ui/WeeklyChoicePrompt.tsx` | **New** | The two-choice question. Props: `question: string`, `onThisDay`, `onFollowing`, `onBack`. Rendered *inside* the open dialog (sheet or details), replacing its body/footer — never a stacked dialog. EP15H reuses it inside one `Dialog`. |
| `features/schedule-blocks/ui/WeekdayChips.tsx` | **New** | `fieldset` + legend "On these days" + seven native `checkbox` inputs styled as pills (D-G11). |
| `features/schedule-blocks/lib/blockForm.ts` | **New, pure** | zod schema (mirror of contracts § Field rules), `toPayload`, `fromBlock`, `changedSeriesFields`. |
| `features/schedule-blocks/lib/defaults.ts` | **New** | `defaultStart(dateIsToday, wake, sleep, now)` — the only module allowed to read the clock (an hour default is not zone arithmetic over dates; recorded assumption). |
| `entities/schedule-block/model/types.ts` | **New** | `ScheduleBlock`, `ScheduleBlockKind`, `EnergyLevel` (re-export from `entities/availability/model/types` until EP15I deletes it — then it moves here), request types. |
| `entities/schedule-block/api/scheduleBlockApi.ts` | **New** | Plain axios (D404-10 pattern of `availabilityApi.ts`). |
| `shared/ui/Switch.tsx` | **New** (D-G9) | `button role="switch" aria-checked` with a visible label; no switch/checkbox primitive exists in `shared/ui` (present: Badge, Button, Card, Dialog, EmptyState, Input, Select). If EP15F, which lands first, has already added one for "Same every day", reuse it. |
| `shared/ui/{Dialog,Button,Input,Select}` | Reuse | Dialog `size="md"` + bottom-sheet classes below `sm` (D-G7); Input `type="date"`/`type="time"`; Select for Course/Energy. |
| `features/calendar/ui/CalendarEventDetails.tsx` | Change | Fills EP15E's `actions` slot for `EVENT`/`STUDY_BLOCK` with Edit + Remove and hosts the inline two-step / prompt (D-G5). |
| `pages/calendar/ui/CalendarPage.tsx` | Change | Toolbar "Add" (primary, `Plus` icon), sheet mount, delete wiring, announcements, refetch. |
| `features/calendar/ui/CalendarAgenda.tsx` | No change | The toolbar "Add" is shared by grid and agenda (one primary action, D15-14); the agenda's entries already open the details dialog. |
| `features/availability/ui/AvailabilitySlotForm.tsx` | Not touched | Pattern source only; deleted by EP15I. |

### Layout and hierarchy

**Where "Add" lives:** the calendar toolbar, first in the button row (`Button variant="primary"`, `leftIcon={<Plus />}`, text "Add"), before Today/prev/next; the interim "Manage availability" link stays last until EP15I. One primary action on the page (D15-14 rule 1). The same toolbar renders at every width, so the agenda has the same Add (AC3).

**The sheet (`BlockSheet`), top to bottom — exact order and copy:**

| # | Control | Copy / behaviour |
|---|---|---|
| — | Dialog title | Create: **"Add to calendar"**. Edit: **"Edit {title}"** (e.g. "Edit Busy", "Edit Work shift"). |
| 1 | Kind — `radiogroup` of two radio-cards (the `AvailabilitySlotForm`/EP13N card pattern: native radio, `focus-within` ring, checked = `border-accent bg-accent/10`, plus a "Selected" text cue) | Label (sr-only legend) "What is it?". Cards: **Busy** — `Briefcase` icon, caption "You're not free then"; **Study** — `BookOpen` icon, caption "Time you plan to study". Default Busy (D-G2). **Hidden in edit mode** (kind is immutable, D-B1). |
| 2 | Title — `Input` | Label **"Title (optional)"**; placeholder follows the kind: **"Busy"** / **"Study"** (D-G4). Max 60 after trim; error "Keep the title under 60 characters." |
| 3 | Date — `Input type="date"` | Label **"Date"**; when "Repeats weekly" is on the label reads **"Starts on"**. Pre-filled (AC1). |
| 4 | Start / End — two `Input type="time"` side by side (`grid-cols-2`) | Labels **"Start"** / **"End"**. Pre-filled next whole hour, +1 h. Error under End: "End must be after start." End **`00:00` means midnight** and is sent as `24:00` (D-G6); hint under End appears only when the value is `00:00`: "Until midnight". |
| 5 | Repeats weekly — `Switch` | Label **"Repeats weekly"**, off by default. On → row 6 appears and "More" gains "Ends on". |
| 6 | Weekday chips — `WeekdayChips` (only when 5 is on) | Legend **"On these days"**; seven pills in grid order **Mon Tue Wed Thu Fri Sat Sun** (visible), accessible names Monday…Sunday (`aria-label`; "Mon" is a prefix of "Monday", so label-in-name holds). The date's weekday is pre-checked. Checked pill: `bg-accent text-white` **and** a `Check` icon (never colour alone). Error: "Pick at least one day." Edit mode hint (D-G10): "Changing the days or the end date applies to this and following weeks." |
| 7 | More — disclosure `button aria-expanded aria-controls` | Text **"More"** with `ChevronDown`/`ChevronUp`. Collapsed by default; **absent entirely** for a one-off Busy block (nothing to show — D15-14 rule 3). Contents, in order: **"Ends on"** (`Input type="date"`, weekly only, hint "Optional — leave empty to keep going"); **"Course"** (`Select`, Study only: "No course" + active courses as `CODE — Name`); **"Energy"** (`Select`, Study only: "High energy" / "Normal" / "Low energy", default Normal; hint "The planner gives demanding work to high-energy time."). Edit mode: auto-expanded when any value is non-default. |
| 8 | Form-level alert (`role="alert"`) | 404 (foreign/missing course or block): the API's uniform message + " — it may no longer exist."; network: toast "We couldn't save this. Try again." with values kept. |
| 9 | Footer | **Cancel** (outline) · **Save** (primary, `data-dialog-commit`, `isLoading` while in flight). Same text in both modes (the AC's verb). Below `sm` the footer is `flex-col-reverse` so Save is the lowest, thumb-reachable control. |

No field says "recurrence", "series", "exception", "occurrence" or "instance" (D15-14 rule 6).

**The two-choice prompt (`WeeklyChoicePrompt`):** replaces the sheet's fields and footer in place (same dialog, title unchanged). One sentence of context in `text-body-sm`, then two equal primary-outline buttons stacked below `sm`, side by side above, then a ghost **"Back"** button (returns to the form unchanged; Escape does the same — the AC's "cancellation of the prompt changes nothing"). Copy:

- Save on a weekly item: **"This repeats weekly. Apply your change to:"** → **"Just this day"** / **"This and following"**.
- Remove on a weekly item (in the details dialog): **"This repeats weekly. Remove it for:"** → **"Just this day"** / **"This and following"**.

Exactly two answers, ever (D15-14 rule 5). Focus moves to "Just this day" when the prompt appears and back to Save/Remove on Back.

**Details dialog actions (D-G5, fills EP15E's `actions` slot):** footer order left→right: **Remove** (`Button variant="ghost"` in `text-danger`, `Trash2` icon) · spacer · **Edit** (outline, `Pencil` icon) · **Close** (outline, last). Remove on a one-off swaps the footer for the inline two-step: text **"Remove this?"** + **"Yes, remove"** (danger) + **"No"** (outline, focused) — two taps, no second dialog. Remove on a weekly item swaps the footer for the prompt above. Edit closes the details dialog and opens the sheet (one dialog at a time; focus moves into the sheet, and on close returns to the chip that opened the details — the page keeps the trigger ref).

### States

- **Sheet loading:** none on open (defaults are local); the Course select shows a disabled "Loading courses…" option while `listCourses()` runs (D-G8).
- **Submitting:** Save `isLoading`, Dialog `busy` (Escape/backdrop inert), all inputs disabled.
- **Errors:** field-level 400 under the field (`startDate`, `endDate`, `weekdays`, `startTime`, `endTime`, `title`, `courseId`, `energy`); 404 form-level alert; network toast. Partial "just this day" failure: the sheet closes, the page refetches and announces the AC2 sentence verbatim.
- **After success:** sheet closes, focus returns to the trigger ("Add" or the chip), the week refetches (`fetchWeek(from, to, false)`), and the `role="status"` line announces per the matrix below.
- **Empty course list:** the Course select shows only "No course" (no error).

**Announcement matrix (AC4):** create → "Busy added" / "Study block added"; edit one-off → "Busy updated" / "Study block updated"; edit this day → "… updated for this day"; edit following → "… updated for this and following weeks"; delete one-off → "Busy removed" / "Study block removed"; delete this day → "Removed for this day"; delete following → "Removed for this and following weeks"; partial → the AC2 sentence.

### Accessibility

- Dialog focus trap/Escape/return (shared `Dialog`, EP14D fix); first focus lands on the Busy radio (create) or Title (edit).
- Tab order = the table order; the disclosure is one button; the prompt is three buttons.
- Chips: one `fieldset`, native checkboxes (Space toggles, no roving tabindex needed), errors via `aria-describedby` on the group.
- Switch: `role="switch" aria-checked` with its visible label as the accessible name.
- Every control ≥ 44 px below `sm` (`max-sm:min-h-[44px]` on inputs, pills, switch, buttons — the shared primitives already carry it).
- Non-blaming copy, no jargon; errors say what to do.

### Responsive

- ≥ `sm`: centred `Dialog size="md"`.
- < `sm` (D-G7): the same `Dialog` with `className="max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-w-none max-sm:rounded-b-none max-sm:max-h-[90vh] overflow-y-auto"` — a bottom sheet; Start/End stack (`grid-cols-1`), chips wrap to two rows of pills, footer `flex-col-reverse`.

## Technical notes

- **Inspected (2026-11-16, `960fb60`):** `AvailabilitySlotForm.tsx` (zod mirror, `FIELD_ERROR_FIELDS`, radio-card kind pair, `handleApiError` 400/409/404 branches, `requestClose`, `data-dialog-commit`, `busy`), `shared/ui/Dialog.tsx` (`size`, `busy`, `className` merge, focus restore), `Input`/`Select` (`error`/`hint`, `max-sm:min-h-[44px]`), `Button` (`isLoading`, `leftIcon`), `entities/course/api/courseApi.ts` (`listCourses({ includeArchived? })` → `CourseWithSemester[]` with `code`, `name`, `isActive`), `shared/lib/errors.ts` (`extractApiError`, `getFieldError`, `apiErrorMessage`, `getErrorMessage`), `CalendarPage.tsx` (status line, `fetchWeek`, `selectedEvent`), `CalendarEventDetails.tsx` (footer; EP15E adds the `actions` slot), `StudyPreferencesForm.tsx` `PresetRadioGroup` (fieldset/legend radio cards with "Selected" cue), lucide 0.312 (Briefcase, BookOpen, Repeat, Plus, Pencil, Trash2, ChevronDown/Up, Check present). No `Switch`/`Checkbox` primitive exists; `features/day-bounds` does not exist yet (EP15F creates it).
- **Files to create / change:**
  - `apps/web/src/entities/schedule-block/model/types.ts` (new) — `ScheduleBlock` (contracts § API response), `CreateScheduleBlockRequest`, `UpdateScheduleBlockRequest` (`Partial<Create>` minus `kind`, plus `effectiveFrom?`), `ScheduleBlockKind`.
  - `apps/web/src/entities/schedule-block/api/scheduleBlockApi.ts` (new) + test — `listScheduleBlocks()`, `createScheduleBlock(body)`, `updateScheduleBlock(id, body)`, `deleteScheduleBlock(id, { from? })`, `cancelOccurrence(id, date)`; plain axios on `httpClient`.
  - `apps/web/src/features/schedule-blocks/lib/blockForm.ts` (new) + test — schema, `toPayload`, `fromBlock(event: CalendarEvent, block?: ScheduleBlock)`, `changedSeriesFields`.
  - `apps/web/src/features/schedule-blocks/lib/defaults.ts` (new) + test.
  - `apps/web/src/features/schedule-blocks/ui/{BlockSheet,WeeklyChoicePrompt,WeekdayChips}.tsx` (new) + tests.
  - `apps/web/src/shared/ui/Switch.tsx` (new, D-G9) + test — skip if EP15F created it.
  - `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx` + test — `onEdit?`, `onDelete?(choice)` props; Edit/Remove in the `actions` slot; inline two-step and prompt.
  - `apps/web/src/pages/calendar/ui/CalendarPage.tsx` + test — "Add" button; `sheet` state `{ mode, initial | block } | null`; `handleSaved(result)` → refetch + announce; `handleDelete(event, choice)` → the wiring below + refetch + announce; trigger ref for focus return.
- **Edit pre-fill source:** the calendar payload carries `blockId`, `recurring`, `energy`, `courseId`, `title`, `date`, `startTime`, `endTime` but not `weekdays`/`endDate`/`startDate`; the sheet in edit mode fetches `GET /schedule/blocks` once (list, no `:id` route exists) and picks `blockId` to pre-fill chips and "Ends on" (loading: the fields render disabled with "Loading…"; a 404/miss shows the form-level alert). Title `"Busy"`/`"Study"` from the server default pre-fills as empty (the placeholder shows it).
- **Request wiring, in the order AC2 states** (`features/schedule-blocks/ui/BlockSheet.tsx` for saves; `CalendarPage.handleDelete` for removals):
  1. Create: `POST /schedule/blocks` with `toPayload(form)`.
  2. Edit, one-off (`recurring === false`): `PATCH /schedule/blocks/:blockId` with the changed fields; no prompt.
  3. Edit, weekly, **series fields changed** (D-G10): `PATCH /schedule/blocks/:blockId` with `{ …changed, effectiveFrom: event.date }`; no prompt.
  4. Edit, weekly, "Just this day": **(a)** `POST /schedule/blocks { kind, title, courseId?, energy?, startDate: event.date, startTime, endTime }` (no `weekdays`, no `endDate`) → on failure stop, show the error in the sheet; **(b)** `DELETE /schedule/blocks/:blockId/occurrences/:date` → on failure report `'this-day-partial'` (page announces the AC2 sentence); both succeed → `'this-day'`.
  5. Edit, weekly, "This and following": `PATCH /schedule/blocks/:blockId { …changed, effectiveFrom: event.date }`.
  6. Delete, one-off: `DELETE /schedule/blocks/:blockId`.
  7. Delete, weekly, "Just this day": `DELETE /schedule/blocks/:blockId/occurrences/:date`.
  8. Delete, weekly, "This and following": `DELETE /schedule/blocks/:blockId?from=:date`.
  Every success path: close → `fetchWeek(from, to, false)` → announce. A `400` on PATCH `effectiveFrom` (e.g. "after endDate") maps to the form-level alert.
- **Security:** no `userId` on the client; the API scopes everything; 404s are rendered uniformly (no "yours/not yours" wording).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-G1 | "Just this day" edit: (a) create the one-off **then** cancel the occurrence, as one client action (a failed cancel leaves a visible duplicate, never a hole — R-EP15-03); (b) a server endpoint | **(a)** — D15-5 as ratified; no new API | Proposed |
| D-G2 | Default kind: (a) Busy; (b) last used | **(a)** — predictable; most additions are real-life commitments | Proposed |
| D-G3 | Sheet container: (a) the shared `Dialog` (the refiner may style it as a bottom sheet below `sm`); (b) a new drawer primitive | **(a)** — one primitive, focus handling solved | Proposed |
| D-G4 | Title: (a) optional with kind placeholder; (b) required | **(a)** — the kind is the title for most blocks (D15-14) | Proposed |
| D-G5 | Delete confirmation: (a) inline two-step inside the details dialog ("Remove? Yes / No"), never a stacked dialog; weekly items get the two-choice question instead; (b) the existing delete-confirmation dialog | **(a)** — one dialog on screen at a time; two taps either way | Proposed |
| D-G6 | Midnight end (`24:00` is legal in the API, impossible in `type="time"`): (a) End `00:00` means midnight → sent as `24:00`, shown as `24:00` on the grid, pre-filled back as `00:00`, with the hint "Until midnight" only when chosen; (b) an "Until midnight" checkbox; (c) cap at `23:59` | **(a)** — zero extra controls (D15-14 rejects (b)); (c) leaves a one-minute free sliver on every late block | Proposed |
| D-G7 | Below `sm`: (a) the same `Dialog` styled as a bottom sheet via `className` (fixed bottom, full width, 90 vh, scrolling body, Save lowest); (b) the centred dialog as-is | **(a)** — thumb-reachable Save and no cramped centred card; D-G3 already permits it | Proposed |
| D-G8 | Course options source: (a) `listCourses()` once per sheet, fetched when Study is selected, active courses only, "No course" first, soft failure note; (b) fetch on every open regardless of kind; (c) a course picker dialog | **(a)** — Busy blocks never pay for the request; (c) stacks dialogs | Proposed |
| D-G9 | "Repeats weekly" control: (a) a new `shared/ui/Switch.tsx` (`role="switch"`), reused by EP15F's "Same every day" if F has not already added one; (b) a checkbox; (c) a Select "Once / Weekly" | **(a)** — a switch reads as on/off at a glance and is the AC's word; (c) adds a dropdown for a boolean | Proposed |
| ▲ D-G10 | Editing a weekly item's **series-level fields** (weekday chips, "Ends on", or turning "Repeats weekly" off): (a) save as "This and following" without the prompt, with a one-line hint under the chips — "Just this day" has no meaning for a weekday change; (b) show the prompt anyway and silently drop the series fields on "Just this day"; (c) disable "Just this day" in the prompt | **(a)** — the question is only asked when both answers are real; (b) loses input, (c) is a greyed third state (D15-14). Time/title/course/energy-only edits still get the prompt | Ratified (user grant 2026-11-16 — blanket ratification of recommended options, D15-17) |
| D-G11 | Weekday chips: (a) native `checkbox` inputs styled as pills inside a `fieldset` ("On these days"), Monday first, checked = fill + `Check` icon; (b) `button aria-pressed` toggles; (c) a multi-`Select` | **(a)** — native form semantics, react-hook-form `register('weekdays')` array, error via `aria-describedby`; (c) hides the week shape | Proposed |

## Definition of Done

1, 2 (mirror), 4 (per-field API messages), 5 (sheet states), 6 (dialog, chips, keyboard), 7 (narrow sheet, 44px, agenda), 8 (TR-E15-07), TR-E15-11 manual pass recorded. 3/9 N/A. 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** everything on the calendar can be added, changed and removed from one small sheet, on any screen size.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/entities/schedule-block/{api,model}/*` (new + test), `apps/web/src/features/schedule-blocks/lib/{blockForm,defaults}.ts` (new + tests), `apps/web/src/features/schedule-blocks/ui/{BlockSheet,WeeklyChoicePrompt,WeekdayChips}.tsx` (new + tests), `apps/web/src/shared/ui/Switch.tsx` (new + test, unless EP15F added it), `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx` (+ test), `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (+ test).
- **Start context:** this story (incl. the refiner's UI/UX section and D-G6…D-G11); contracts.md § API (blocks, PATCH semantics, field rules); `AvailabilitySlotForm.tsx`; EP15E's details dialog `actions` slot.
- **Verification:** `pnpm --filter @studypilot/web test -- schedule-blocks calendar shared/ui/Switch` green; `typecheck` + `lint` green; manual: add a weekly Busy, edit "this and following", cancel one day, confirm the grid; 375 px bottom sheet.
- **Dependencies / exclusions:** EP15B, EP15E. Drag → EP15H; retirement of the old page → EP15I.
