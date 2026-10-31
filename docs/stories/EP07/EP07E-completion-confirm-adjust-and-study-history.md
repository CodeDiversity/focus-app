# EP07E: Completion Confirm/Adjust & Study-History Surface

**Story ID:** EP07E
**Title:** Frontend — confirm or adjust the recorded study time when finishing, and the student's study-history surface
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Frontend
**Status:** **Ready** — UI refinement captured 2026-10-30 (D07-5); technical refinement in Technical Notes.
**Dependencies:** **EP07A** (the current-session read) and **EP07B** (the finish endpoint, the history list and the confirmed-time read). **EP07D** supplies the focus screen this story completes. `ui-refiner` pass required.
**Jira key:** Pending creation
**Refined:** 2026-10-30 (ui-refiner pass — UI/UX decisions settled; see Technical Notes → "UI/UX design" and "Decisions". Technical refinement of files/endpoints/DTOs is unchanged; status reconciliation to Ready is the planner/coordinator's.)

## Summary

Finishing a focus session is a decision, not a button: the student sees the time the server recorded and either confirms it or adjusts it (within a bounded range) before the session is closed. The same story delivers the **study-history surface** — the student's completed sessions, with the confirmed time each assignment has accumulated and the assignment's estimate beside it.

## Description & bounded scope

### In scope

1. **The completion dialog** — opened from the focus screen's finish control. It shows the assignment, the server-recorded elapsed minutes, and a control to confirm or adjust that number. Confirming sends `POST /study-sessions/:id/finish` with `{ confirmedMinutes }`; cancelling sends nothing and leaves the session running.
2. **Bounded adjustment** — the confirmed value is an integer between 0 and 1440 minutes. The client validates before sending; the server's 400 field errors are surfaced when they arrive.
3. **The completed state** — after a successful finish the session is `COMPLETED`, its `endTime` is set and the confirmed minutes are shown; the focus screen then offers the way onward to the history.
4. **The study-history surface** — the student's completed sessions, newest first, with the assignment, the confirmed minutes and when the session ran. It can be narrowed to one assignment. It has loading, empty and error states, and it is reachable from the focus screen's completed state and from the assignments page.
5. **The per-assignment presentation** — each history row shows the confirmed time logged for that assignment and the assignment's estimate side by side (with a simple proportion indicator). This is the student-visible side of AC-E07-08: the confirmed time **contributes** to the remaining-work picture.
6. **The entity client** — `finishStudySession`, `listStudySessions` and `getConfirmedTime` added to `apps/web/src/entities/study-session/api/studySessionApi.ts`, plus the matching response types.
7. **Tests** — component tests for the completion dialog, the finish round-trip, the history list's states and filtering, and the per-assignment presentation.

### Out of scope

- The focus screen, the timer and the pause/resume controls — **EP07D**.
- Starting a session — **EP07C**.
- **The cross-assignment remaining-work view, workload ranking and deficit warnings** — those stay EP06's (D07-3). This story shows what has been logged against an estimate; it does not compute what is left across assignments and it never warns about a shortfall.
- The dashboard's "Today's study sessions" widget — EP05's surface (D07-3).
- The EP06 remaining-work calculation itself and EP06's preference shape (V-07-1/V-07-2).
- Any backend change (EP07A/EP07B own the API).
- Editing or deleting an existing session, and rating a session (`rating` exists on the model; the epic does not ask for it).

## Source requirement references

- **Epic AC-E07-04** (frontend half: confirm or adjust the recorded study time), **AC-E07-05** (frontend half: the history shows the recorded time against the correct assignment), **AC-E07-07** (frontend half: the completion flow completes the session, never the assignment), **AC-E07-08** (frontend half: the confirmed time is shown as a contribution to the remaining-work picture).
- **TR-E07-05** (this child's test obligations).
- **Shared DoD** — items 1, 2, 4, 5, 6, 7, 8 apply; items 10/11 belong to the combined EP07 parent review.
- **Decisions:** D07-2 (the session is the source of truth for confirmed time), D07-3 (EP07 owns the history; the dashboard and the full remaining-work view stay with EP05/EP06), D07-4/V-07-2 (the confirmed-time read seam), D07-5 (this story is `Needs refinement`), D07-7 (the confirmed minutes are stored on the session).

## Acceptance criteria

1. The focus screen's finish control opens the completion dialog for the running session; the dialog shows the assignment and the server-recorded minutes, pre-filled with the value the server reported.
2. Confirming the dialog sends exactly one `POST /study-sessions/:id/finish` whose body carries the confirmed minutes; cancelling sends no request and the session keeps running; a second confirm while the request is in flight sends no second request.
3. The confirmed value is validated client-side before the request is sent — a non-integer, a negative value or a value above 1440 is rejected with an inline message and no request is sent; a 400 from the server is surfaced with its field-level message.
4. A successful finish shows the completed session (its confirmed minutes and end time) and leaves the assignment untouched — the assignment's status, its estimate and its progress are not changed by completing a session.
5. The history surface lists the student's completed sessions newest first, each with the assignment, the confirmed minutes and when it ran; narrowing to one assignment filters the list; the list has a loading state, an empty state that explains what the student can do next, and an error state with a retry.
6. Each history row shows the confirmed time logged for that assignment together with the assignment's estimate and a proportion indicator; the surface shows **no** cross-assignment remaining-work total, no ranking and no shortfall warning (EP06's, D07-3).
7. The history surface is reachable from the focus screen's completed state and from the assignments page; a direct visit to the route works for an authenticated student.
8. Component tests cover the dialog's pre-fill, the adjustment and its validation, the cancel path, the request payload, the failed-finish state, the history list's loading/empty/error/filtering states and the per-assignment presentation.

## Tests to add / update

- `apps/web/src/features/focus-session/ui/FinishSessionDialog.test.tsx` (new):
  - opens pre-filled with the recorded minutes (rounded from `session.elapsedSeconds`) and the assignment name;
  - the recorded-time line shows the server-recorded minutes;
  - confirming with the unchanged value sends one `POST /study-sessions/:id/finish` with `{ confirmedMinutes }` equal to the recorded minutes;
  - changing the value sends the changed value;
  - an invalid value (empty, non-integer, negative, above 1440) shows the inline message "Enter a whole number between 0 and 1440." and sends no request; the confirm control stays disabled;
  - cancelling (Cancel / Escape / backdrop) sends no request and restores focus to the trigger;
  - a failed finish (400) maps `errors.confirmedMinutes` onto the field, keeps the dialog open and re-enables confirm; a 5xx shows a `role="alert"` with `getErrorMessage` output;
  - the confirm control is disabled with `aria-busy` while the request is in flight and a second click/Enter sends no second request;
  - success closes the dialog and calls `onFinished` with the completed session.
- `apps/web/src/features/focus-session/ui/FocusTimer.test.tsx` (extend) — the "Finish session" control still renders with its accessible name and is disabled while busy; clicking it calls `onFinish` (which now opens the dialog — the dialog is owned by the page).
- `apps/web/src/pages/focus/ui/FocusPage.test.tsx` (extend):
  - after a successful finish the completed state shows the confirmed minutes (`{n} minutes recorded`) and a "View study history" link to `/focus/history` (plus "Back to assignments");
  - finishing opens the completion dialog and sends no request until confirm; cancelling sends no request and leaves the session running;
  - the assignment row is not modified (no `updateAssignment` call).
- `apps/web/src/pages/focus/history/ui/StudyHistoryPage.test.tsx` (new):
  - renders the loading skeleton, then sessions newest first with assignment, minutes and time range;
  - renders the empty state ("No study sessions yet" + "Finish a focus session…" + "Go to assignments" link) when there are no sessions;
  - renders the error state with a retry when the list fails;
  - narrowing to one assignment sends the `assignmentId` filter and shows only that assignment's sessions;
  - each row shows the session's confirmed minutes, the assignment's accumulated confirmed total, the estimate and a proportion bar + percentage label; no cross-assignment remaining total, ranking or shortfall warning is rendered;
  - "Load more" appends the next page when `items.length < total`.
- `apps/web/src/entities/study-session/api/studySessionApi.test.ts` (extend or new) — `finishStudySession(id, n)` posts `{ confirmedMinutes: n }`; `listStudySessions` returns `{ items, total }` and forwards `assignmentId`/`limit`/`offset`; `getConfirmedTime()` returns `{ assignments }` and `getConfirmedTime(id)` returns the single-assignment shape.
- The existing web suite must stay green.

## Technical notes

### Verified baseline (inspected 2026-10-29 at HEAD `8e31c0d`)

- `apps/web/src/app/App.tsx:37-60` — the `ProtectedRoute` block; the history route is registered here next to `/focus` (which EP07D adds). `apps/web/src/app/App.tsx:63` — the catch-all redirect, so an unregistered path silently lands on `/` (a reason to register the route in the same story that links to it).
- `apps/web/src/shared/ui/` — the EP10 primitives: `Dialog` (the completion dialog), `Button`, `Input`, `Card`, `Badge`, `EmptyState` (the history's empty state), plus the semantic tokens.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — `listAssignments(params)` (`:124`) returns the cross-course list projection; each item carries `estimatedHours` (`:143` of `apps/web/src/shared/types/academic.ts`) and `subtasks`. The history's estimate comes from this projection.
- `apps/web/src/shared/types/academic.ts:136-150` — `AssignmentListItem` includes `estimatedHours: number | null`, `actualHours: number | null` and `status`. **`actualHours` is always `null` in practice** (no API writes it — D07-2), so the history must not read it as the logged time; it reads the confirmed time from the session projection (and, for the per-assignment total, from the confirmed-time endpoint).
- `apps/web/src/shared/lib/errors` — `getErrorMessage`, the repo's helper for a user-facing API failure message.
- `apps/web/src/features/focus-session/ui/` — the focus components created by EP07D; this story adds the completion dialog and modifies the finish control (`FocusTimer.tsx`) to open it.
- Web commands: `pnpm --filter web test -- <path>`, `pnpm --filter web typecheck` (`strict` + `noUnusedLocals` + `noUnusedParameters`), `pnpm --filter web lint` (`--max-warnings 0`).
- FSD: the history route screen goes in `pages/focus/history/ui/`; the completion dialog in `features/focus-session/ui/`; the client calls in `entities/study-session/api/`.

### Implementation notes (concrete)

1. **The finish flow.** The focus screen's finish control opens the completion dialog instead of calling the finish endpoint directly (EP07D's control called the endpoint with no body, which confirmed the server's recorded value; this story inserts the confirm/adjust step in front of it). The change to EP07D's control is one handler and is listed in this story's files.
2. **The recorded value shown in the dialog.** The dialog is pre-filled from the session's `elapsedSeconds` (converted to minutes the same way the server would round it). The authoritative minutes are the server's; the dialog's field is the student's *proposed* value.
3. **The finish request.** `POST /study-sessions/:id/finish` with `{ confirmedMinutes }` — a number, never a string, and never sent when the dialog is cancelled. The server's 400 response carries a field-level `errors` map; the dialog maps it onto the field.
4. **The history list.** `GET /study-sessions` with the optional `assignmentId` filter; the response is `{ items, total }`. The client renders `items` in the order the server returned them (`startTime` descending) — the client does not re-sort.
5. **The per-assignment total.** `GET /study-sessions/confirmed-time` provides the confirmed minutes per assignment; the history shows that total beside the assignment's `estimatedHours`. The proportion indicator is `confirmedMinutes / (estimatedHours * 60)`, clamped to 100% for the bar and labelled in text (never colour alone). If `estimatedHours` is null, the estimate is shown as "no estimate" and the bar is omitted.
6. **Do not read `actualHours`.** The list projection carries `actualHours`, but it is never written by any endpoint (D07-2). The history reads the confirmed time from the session log; using `actualHours` would show a permanently empty number.
7. **Route.** The history route is registered inside the `ProtectedRoute` block next to `/focus`. The route name is provisional (`/focus/history` keeps the surface inside EP07's area rather than adding a top-level entry to the app IA, which EP11 owns) — the `ui-refiner` and EP11's IA may rename it.

### UI/UX design (settled 2026-10-30 by the `ui-refiner` pass)

All decisions below reuse the EP10 primitives and semantic tokens; no ad-hoc colors, spacing, or motion. Component names and placements come from the inspected codebase (EP07D's focus screen, EP07C's start dialog, EP06's `RemainingWorkSection`, EP10's `Dialog`/`Input`/`Button`/`EmptyState`/`Card`/`Badge`).

**Completion dialog — shape, placement and context.**
- Uses the EP10 `Dialog` primitive (`apps/web/src/shared/ui/Dialog.tsx`), size `sm` (`max-w-sm`), modal, with backdrop close and Escape-to-close. No bespoke modal.
- Opened by the focus screen's existing "Finish session" control: `FocusTimer` keeps its `onFinish` prop; `FocusPage` now passes `() => setFinishDialogOpen(true)` and renders a single `<FinishSessionDialog>` mount (the EP07C "one dialog mount for the host" pattern). The dialog performs the finish; the control no longer calls the endpoint directly.
- `title`: "Finish this session". `description`: "Confirm or adjust the time you want to record."
- Body, top to bottom:
  1. Assignment context block: assignment title as a strong line; a compact meta line `Due {date} · {estimatedHours}h estimated · Target {planned} min` (estimated hours only if present; planned minutes only if present; due date falls back to "No due date"; no assignment → "No assignment linked to this session.").
  2. Recorded-time block: label "Recorded time" with the value `{recordedMinutes} min` (`recordedMinutes = Math.round(session.elapsedSeconds / 60)`, the server's unconfirmed elapsed — the client-ticked `displayedElapsed` is never used for the default).
  3. Adjustment field: `Input` (`type="number"`, `inputMode="numeric"`, `min={0}`, `max={1440}`, `step={1}`) labelled "Minutes to record", pre-filled with `recordedMinutes`, with hint "Between 0 and 1440 minutes." and auto-selecting its value on focus.
- Footer: Cancel (secondary) left, "Save time" (primary) right, in the primitive's `flex-col-reverse sm:flex-row sm:justify-end` layout.
- In flight: `disableBackdropClose` is set to `true` and `onClose` becomes a no-op (Escape/backdrop ignored); Cancel and the input are disabled; the confirm `Button` uses `isLoading` (spinner + disabled, `aria-busy`).
- On success the dialog closes and calls `onFinished(completedSession)`; `FocusPage` updates its session so the completed state renders. No toast.

**Adjustment control and validation.**
- A single numeric `Input`, not a stepper or +/- buttons. Unit is "minutes" throughout (label + hint); the value stays a raw integer (no "h m" formatting in the field) because the bound is an integer minute count.
- The common case needs no extra affordance: the field is pre-filled with the recorded value, so confirming unchanged is one click on "Save time". No "use recorded time" checkbox.
- Client validation (on change and on submit): the value must be an integer in `0–1440`. Empty / non-integer / negative / above 1440 → inline `Input` error "Enter a whole number between 0 and 1440." and the confirm control stays disabled; no request is sent.
- Server 400: map `errors.confirmedMinutes` (joined with a space when multiple) onto the field. Any other failure (5xx, network, 409) renders a `role="alert"` block above the footer with `getErrorMessage(err)` (409 → "This session changed. Reload to continue." with a "Reload session" affordance that calls the page's reload and closes the dialog). The dialog stays open and confirm re-enables on a recoverable failure.

**Completion copy (final).**
- Dialog title: "Finish this session".
- Description: "Confirm or adjust the time you want to record."
- Recorded-time label: "Recorded time" → "{n} min".
- Field label: "Minutes to record"; hint: "Between 0 and 1440 minutes."
- Confirm: "Save time" (idle; spinner + disabled in flight).
- Cancel: "Cancel".
- Error alert: sanitized `getErrorMessage` output; 409 adds "Reload to continue."
- Focus-timer completed state (existing block, updated links): heading "Session complete"; line "{n} minutes recorded"; helper "You can review and adjust this session in your study history."; actions: primary "View study history" (`/focus/history`) and secondary "Back to assignments" (`/assignments`).

**History surface — layout, filtering, pagination.**
- Route `/focus/history` (provisional, per the parent README), registered inside the `ProtectedRoute` block next to `/focus`. Page file `apps/web/src/pages/focus/history/ui/StudyHistoryPage.tsx`.
- Shell: `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12`, matching the assignments page. Header: h1 "Study history" + subtitle "Your completed focus sessions." No header CTA.
- Reachability: (a) focus screen's completed state — primary "View study history" link; (b) assignments page header — a secondary ghost `Button` "Study history" placed to the left of "Add assignment" (so the primary CTA stays rightmost); (c) direct visit to `/focus/history` for an authenticated student. No top-level nav entry (EP11 owns IA).
- Filter: a single `Select` labelled "Assignment" with an "All assignments" option (`value=""`), placed in a toolbar row above the results card. The filter is component state (not URL-synced), mirroring the assignments page. Changing it resets pagination to the first page and replaces the list.
- List: a `Card` with a `divide-y divide-border` list of rows (the `RemainingWorkSection` pattern), newest first in the order the server returns (`startTime` desc). The client does not re-sort.
- Pagination: 20 rows per page via `limit=20`, `offset`-based "Load more" button shown only when `items.length < total`; disabled while loading more; a count line "Showing {n} of {total} sessions" sits above the button.
- Loading: three skeleton rows (`h-4 animate-pulse rounded bg-surface-muted motion-reduce:animate-none`) with `aria-busy`. Empty: `EmptyState` with title "No study sessions yet", description "Finish a focus session to see your study history here.", action a "Go to assignments" link button. Error: `role="alert"` block "We could not load your study history. Try again." with a "Try again" button.
- Each row links its assignment title to the assignment's course detail page when a course is known, otherwise to `/assignments` (same tab).

**History row fields and per-assignment presentation.**
- Row layout:
  1. Top line: assignment title (link, truncated) on the left; the session's confirmed minutes (`{n} min` via `formatMinutes`) on the right.
  2. Course line (muted, only if a course resolves): `{course.code} · {course.name}`.
  3. Time line (muted): `{date} · {start}–{end}` (date = short month + day via `toLocaleDateString`; times = `toLocaleTimeString` with `hour: '2-digit', minute: '2-digit'`; range uses an en-dash).
  4. Contribution block (the per-assignment presentation, using the confirmed-time endpoint):
     - Line: "Confirmed for this assignment: {total}" (left) + "Estimate: {estimate | not set}" (right), muted xs.
     - When an estimate exists: a progress bar (`role="progressbar"`, `aria-valuenow={pct}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="{pct}% of estimate confirmed"`) whose fill width is `min(pct, 100)%`, plus a text line "{pct}% of estimate" (actual pct, not clamped, so over-estimate reads "120% of estimate").
     - When no estimate: no bar; the estimate side reads "not set" and a `Badge` variant `neutral` size `sm` with text "No estimate" sits beside the total.
  - `total` comes from the confirmed-time endpoint (`confirmedMinutes` for that assignment, defaulting to 0 when absent); `estimate` comes from the assignment projection (`estimatedHours * 60`, null when `estimatedHours` is null).
- Scope guardrails: no cross-assignment total, no ranking, no shortfall/deficit warning, no "remaining work" figure. The surface is a record of what was logged. The confirmed-time endpoint is consumed for the per-assignment total only.

**Data flow on the history page.**
- Three parallel loads on mount: `listStudySessions({ limit: 20, offset: 0 })` (and on filter change / "Load more"), `listAssignments()` (to resolve title/course/estimate; non-fatal — falls back to "Assignment" + no estimate on failure), and `getConfirmedTime()` (to build the per-assignment total map; non-fatal — contribution shows 0 / "Totals unavailable" when it fails).
- "Load more" calls `listStudySessions` with the next offset and appends to the existing items; the assignment/confirmed-time maps are reused (not refetched).
- Empty/error states are driven by the sessions list only; a failure of the secondary loads never replaces the list with an error.

**Keyboard behaviour.**
- Completion dialog: initial focus lands on the "Minutes to record" input (the primitive focuses the first focusable, which is the input; its value is auto-selected); Tab order recorded time → input → Cancel → confirm; Escape cancels (closes) except in flight; focus restores to the "Finish session" button on close (primitive).
- History: standard tab order through the filter select, rows' links, "Load more" and retry; no custom key handling. Filter select changes the list on change.

**Responsive behaviour.**
- Completion dialog: primitive is `w-full max-w-sm` with `p-4` outer padding, so at 375px it fills the viewport minus 32px with no horizontal scroll. Input and buttons are ≥44px on mobile via the primitive/Button `max-sm:min-h-[44px]` (Input `md` already bumps to 44 on `max-sm`).
- History: single column at all widths; rows stack (title/minutes on one line that wraps); no horizontal scroll; "Load more"/retry buttons ≥44px; tap targets on links ≥44px via padding.

**Reduced motion.**
- Dialog primitive transition keeps its `motion-reduce:transition-none motion-reduce:transform-none` (D10-16); the confirm spinner uses `motion-reduce:animate-none` (already in `Button`). No new animations are introduced.
- History skeleton uses `motion-reduce:animate-none`; the proportion bar has no width transition. All durations use the EP10 tokens.

### Decisions (settled by the `ui-refiner` pass, 2026-10-30)

- Completion dialog: EP10 `Dialog`, size `sm`, modal; opened by the focus screen's "Finish session" control; backdrop/Escape cancel except in flight.
- Dialog shows assignment context, the server-recorded minutes ("Recorded time"), and an editable "Minutes to record" field pre-filled with `Math.round(elapsedSeconds / 60)`.
- Adjustment control: single numeric `Input` (0–1440, integer, `inputMode="numeric"`, auto-select on focus); unit "minutes"; no stepper.
- Validation: client-side integer 0–1440 with inline message "Enter a whole number between 0 and 1440."; server 400 maps `errors.confirmedMinutes` onto the field; other failures show a `role="alert"`.
- Confirm label "Save time" (spinner + disabled in flight); Cancel "Cancel"; no in-flight text beyond the spinner.
- Success closes the dialog and shows the focus timer's completed state: "{n} minutes recorded" + "View study history" (`/focus/history`) and "Back to assignments".
- History route `/focus/history` (provisional), `max-w-5xl` shell, header "Study history".
- Assignment filter is a `Select` with "All assignments"; component state only (not URL-synced).
- List is `Card` + `divide-y` rows, newest first, server order; 20 per page with "Load more".
- Loading skeleton (3 rows), empty ("No study sessions yet" + CTA to assignments), error with retry.
- Each row: title (link) + minutes; course line; time range; contribution block using the confirmed-time endpoint (total + estimate + clamped bar + percentage label; "No estimate" badge when no estimate).
- Scope guardrails: no cross-assignment total, ranking, or shortfall warning.
- Data flow: parallel `listStudySessions` / `listAssignments` / `getConfirmedTime`; secondary loads are non-fatal.
- Keyboard: dialog initial focus on input (auto-select); Escape cancels (except in flight); focus restores to trigger; history standard tab order.
- Responsive: dialog fills 375px with no scroll, ≥44px targets; history single column, no horizontal scroll.
- Reduced motion: token durations + `motion-reduce` overrides; no new animations; bar has no width transition.

### Risks / open questions

- **The finish-control change touches EP07D's file.** This is a deliberate, one-handler change (open the dialog instead of calling the endpoint directly). It is recorded here so the reviewer does not read it as an accident.
- **The history's route placement.** `/focus/history` is provisional and may need to change once EP11's information architecture is settled. A route rename is cheap now and expensive after EP07 ships.
- **`estimatedHours` may be null.** The proportion indicator must degrade gracefully; a session against an assignment with no estimate shows the confirmed time only.
- **The confirmed-time endpoint's shape is provisional (V-07-2).** EP06 may prefer a different shape for its own consumption; the client uses the shape recorded in the parent README's shared contract. If EP06 changes the endpoint, the client call changes with it.
- **No top-level navigation entry.** The history is reachable from EP07's own surfaces. A header/nav entry belongs to EP11's IA work and is not added here.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is handled: the confirmed minutes are validated client-side (integer, 0–1440) before the request, and the server's field-level 400 errors are surfaced.
3. Academic data is scoped to the authenticated student — every call is an authenticated endpoint call; no client-supplied user id is ever sent.
4. API errors produce actionable messages — a failed finish or a failed history load shows the repo's `getErrorMessage` output and an inline field message where a field is at fault.
5. Loading, empty and error states are handled: the history's loading state, an empty state that explains what the student can do next, and an error state with a retry; the completion dialog's in-flight and failure states.
6. Core interactions support keyboard accessibility — the dialog traps focus and closes on Escape (the EP10 `Dialog` primitive), and every control is a native button with a visible focus ring.
7. Responsive layouts work on desktop and mobile — the completion dialog and the history list are usable at 375px with ≥44px tap targets and no horizontal scrolling.
8. Business rules have automated tests — the component tests above, including "completing a session changes nothing on the assignment"; the full web suite stays green.
9. Not applicable — no API change in this story (the API contract is EP07A/EP07B's).
10. Integrated review — the combined EP07 parent review.
11. Reviewer walkthrough — the combined EP07 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** finishing a session becomes a confirm-or-adjust decision, and the student can review the sessions they have logged with the confirmed time each assignment has accumulated.
- **Request/token estimate:** 1–2 requests/tokens — one dialog component with its test, one history page with its test, three additions to the entity client, and small edits to the focus screen and the assignments page. Low uncertainty: the endpoints and the projection exist by the time this story starts.
- **Model recommendation:** 2 — a presentation layer over two established read endpoints and one established write endpoint, with no new domain logic; the care points are the validation range and not reading `actualHours`. A value model suffices once the UI is settled.
- **Files:**
  - `apps/web/src/features/focus-session/ui/FinishSessionDialog.tsx` (new) + `FinishSessionDialog.test.tsx` (new);
  - `apps/web/src/features/focus-session/ui/FocusTimer.tsx` (modify — the finish control opens the completion dialog);
  - `apps/web/src/pages/focus/ui/FocusPage.tsx` (modify — the completed state and the link onward to the history);
  - `apps/web/src/pages/focus/history/ui/StudyHistoryPage.tsx` (new) + `StudyHistoryPage.test.tsx` (new);
  - `apps/web/src/app/App.tsx` (modify — register the history route);
  - `apps/web/src/entities/study-session/api/studySessionApi.ts` (modify — finish, list, confirmed-time);
  - `apps/web/src/entities/study-session/model/types.ts` (modify — the list and confirmed-time response types);
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (modify — the link to the history).
- **Start context:** this story file; the parent README's shared API/data contract (the projection, the list response and the confirmed-time response) + decision register (D07-2, D07-3, D07-4/V-07-2, D07-5, D07-7); EP07A/EP07B/EP07D's implementation records (`./artifacts/EP07A/implementation.md`, `./artifacts/EP07B/implementation.md`, `./artifacts/EP07D/implementation.md`); `apps/web/src/shared/ui/Dialog.tsx`; `apps/web/src/shared/ui/EmptyState.tsx`; `apps/web/src/entities/assignment/api/assignmentApi.ts`; `apps/web/src/shared/lib/errors`. Do not read unrelated epic stories.
- **Verification:** `pnpm --filter web test -- src/features/focus-session src/pages/focus`; `pnpm --filter web typecheck`; `pnpm --filter web lint`; `pnpm --filter web test` (full suite).
- **Dependencies / exclusions:** EP07A, EP07B and EP07D implemented; `ui-refiner` pass completed. Excludes starting a session (EP07C), the focus screen and timer (EP07D), the cross-assignment remaining-work view, ranking and deficit warnings (EP06), the dashboard widget (EP05), the session rating and notes, and all backend work.

## UI/UX decisions (settled 2026-10-30 — D07-5)

All gaps listed below are now settled; the authoritative, implementation-ready detail lives in Technical Notes → "UI/UX design" and "Decisions". This section is retained for traceability against the original gap list.

- **Completion dialog layout.** Modal versus inline panel; what the dialog shows around the number (assignment title, planned duration, a running total); where the recorded value and the editable value sit relative to each other; the dialog's width and placement.
- **The adjustment control.** A number input versus a stepper versus +/- buttons; the unit ("minutes" vs "min" vs "h m"); whether the value is presented as a duration rather than a raw integer; the affordance for the common case (confirm unchanged) so that adjusting is not accidentally triggered.
- **Validation and error presentation.** The inline message wording, whether the invalid state is signalled by colour, icon or text (never colour alone), and how the server's 400 field errors map onto the field.
- **Completion copy.** The dialog title, the confirm label ("Save this time" vs "Finish session" vs "Confirm"), the cancel label, the success wording after finishing, and whether the finished state is a dialog, a page transition or an inline summary.
- **History layout.** Whether the history is a list of rows, a group-by-day list, or cards; the columns or fields each entry shows (assignment, confirmed time, start–end, the estimate proportion); the sort/grouping; how an entry links back to its assignment.
- **History filtering.** Whether the assignment filter is a select, a search field or a set of chips; how "all assignments" is expressed; whether the filter is reflected in the URL.
- **Empty, loading and error states.** The empty-state wording and its call to action (start a session), the loading treatment (skeleton versus spinner), and the error state's retry affordance and wording.
- **Per-assignment presentation.** How the confirmed time and the estimate sit together, the proportion indicator's form and its label, and the treatment when the assignment has no estimate.
- **Scope guardrails to respect.** No cross-assignment remaining-work total, no ranking, no shortfall warning (EP06's — D07-3); the surface is a record of what was logged.
- **Keyboard behaviour.** Initial focus in the dialog, whether Escape cancels or confirms, focus restoration to the finish control on close, and the tab order in the history.
- **Responsive behaviour.** The dialog and the history at 375px, the number input's keyboard type on touch devices, and whether the history's entries become a stacked card on narrow screens.
- **Reduced motion.** Any dialog or list transition, using the EP10 token durations (D10-16).
