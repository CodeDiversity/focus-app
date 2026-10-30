# EP07E: Completion Confirm/Adjust & Study-History Surface

**Story ID:** EP07E
**Title:** Frontend — confirm or adjust the recorded study time when finishing, and the student's study-history surface
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Frontend
**Status:** **Needs refinement** — the `ui-refiner` pass is required before implementation (D07-5).
**Dependencies:** **EP07A** (the current-session read) and **EP07B** (the finish endpoint, the history list and the confirmed-time read). **EP07D** supplies the focus screen this story completes. `ui-refiner` pass required.
**Jira key:** Pending creation
**Refined:** — (the `ui-refiner` pass is what settles this story's presentation; this file records the planner's breakdown and the exact gaps)

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
  - opens pre-filled with the recorded minutes and the assignment name;
  - confirming sends one finish request with the confirmed minutes;
  - changing the value sends the changed value;
  - an invalid value (non-integer, negative, above 1440) shows an inline message and sends no request;
  - cancelling sends no request;
  - a failed finish shows the server's message and keeps the dialog open;
  - the confirm control is disabled while the request is in flight.
- `apps/web/src/pages/focus/ui/FocusPage.test.tsx` (extend) — after a successful finish the completed state shows the confirmed minutes and the way onward to the history; the assignment is not modified.
- `apps/web/src/pages/focus/history/ui/StudyHistoryPage.test.tsx` (new):
  - renders the loading state, then the sessions newest first with assignment, minutes and time;
  - renders the empty state with a way to start a session when there are no sessions;
  - renders the error state with a retry when the list fails;
  - narrowing to one assignment sends the `assignmentId` filter and shows only that assignment's sessions;
  - each row shows the confirmed time and the estimate; no cross-assignment remaining total is rendered.
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

## UI/UX gaps for the `ui-refiner` (D07-5 — not yet settled)

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
