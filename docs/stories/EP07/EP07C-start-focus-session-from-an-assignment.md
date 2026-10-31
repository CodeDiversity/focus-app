# EP07C: Start a Focus Session From an Assignment

**Story ID:** EP07C
**Title:** Frontend — start a focus session from an assignment (entry points, duration selection, start call, entry into focus mode)
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Frontend
**Status:** **Ready** — UI refinement captured 2026-10-30 (D07-5); technical refinement in Technical Notes.
**Dependencies:** **EP07A** (the `POST /study-sessions` endpoint) and **EP07B** (the session projection this story consumes). The EP03 frontend surfaces (assignments list, course detail) are implemented. `ui-refiner` pass required.
**Jira key:** Pending creation
**Refined:** 2026-10-30 (ui-refiner pass — UI/UX decisions settled; see Technical Notes → "UI/UX design" and "Decisions". Technical refinement of files/endpoints/DTOs is unchanged; status reconciliation to Ready is the planner/coordinator's.)

## Summary

The student picks an assignment and starts a focus session on it. Each assignment row — on the cross-course assignments list and on the course-detail surface — gains a keyboard-reachable **Start focus session** action that opens a small dialog for choosing the session's duration and confirming the start. A successful start creates the session on the server and moves the student into focus mode.

## Description & bounded scope

### In scope

1. **Entry points** — a "Start focus session" action on the assignment row, on both the cross-course assignments list (`apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` → `AssignmentRow`) and the course-detail surface (`apps/web/src/pages/courses/ui/CourseDetailPage.tsx` → `AssignmentsSection` → `AssignmentRow`). The action must be reachable by keyboard and have an accessible name that identifies the assignment.
2. **The start dialog** — choose the session's duration, see which assignment the session is for, and confirm. The dialog is a `Dialog` from the EP10 primitives (`apps/web/src/shared/ui/Dialog.tsx`), not a bespoke modal.
3. **Duration resolution (provisional EP06 seam, V-07-1)** — the pre-filled duration comes from `User.preferences.studyDefaults` when that preference is present **and well-formed**, otherwise from EP07's own fallback default. The preference bag is free-form today (validated only as a plain object of bounded size — `apps/api/src/modules/users/dto/update-user.dto.ts`), so the client must read it defensively and fall back rather than assume a shape.
4. **The start call** — `POST /study-sessions` with the assignment id and the chosen duration. Exactly one request per confirm; a second confirm while the request is in flight is prevented.
5. **Entry into focus mode** — on a successful start the app navigates into the focus route. **The focus route and page are owned by EP07D**; this story's navigation target lands with EP07D (see *Dependencies / exclusions*).
6. **The entity client** — `apps/web/src/entities/study-session/api/studySessionApi.ts` with the session projection type and `startStudySession`, over the shared axios transport (`apps/web/src/shared/api/httpClient.ts`).
7. **States and errors** — a loading state while the start request is in flight; an actionable error message when it fails (the repo's `getErrorMessage` helper in `apps/web/src/shared/lib/errors`); dismissing or failing never leaves the student on a broken surface.
8. **Tests** — component tests for the entry points, the duration default resolution, the request payload, the navigation, the duplicate-submit guard and the error state.

### Out of scope

- The focus-mode screen, the timer display and the start/pause/resume/finish controls — **EP07D**.
- The completion confirm/adjust dialog and the study-history surface — **EP07E**.
- The optional subtask link on a session (`taskId`): the API accepts it (D07-1) but this story sends only the assignment id and the duration. Whether the subtask is chosen at start time or inside focus mode is a presentation decision the `ui-refiner` settles together with EP07D (see *UI/UX gaps*).
- The dashboard's "Start Focus Session" quick action — EP05's surface, not broken down yet (D07-9).
- EP06's final preference shape (V-07-1) and EP06's own session-duration settings screen.
- Any backend change (EP07A/EP07B own the API).

## Source requirement references

- **Epic AC-E07-01** (frontend half: start a focus session from an assignment), **AC-E07-05** (frontend half: the session is created against the chosen assignment).
- **TR-E07-03** (this child's test obligations).
- **Shared DoD** — items 1, 2, 4, 5, 6, 7, 8 apply; items 10/11 belong to the combined EP07 parent review.
- **Decisions:** D07-1 (the session carries the assignment link), D07-3 (EP07 owns the study surface; the dashboard stays EP05's), D07-4/V-07-1 (the provisional duration-default seam), D07-5 (this story is `Needs refinement`), D07-9 (the dashboard quick action stays out).

## Acceptance criteria

1. Every assignment row on the cross-course assignments list and on the course-detail surface offers a "Start focus session" action; the action is reachable by keyboard, has a visible focus ring and an accessible name that identifies the assignment it acts on.
2. Activating the action opens the start dialog for that assignment; the dialog names the assignment and offers a duration control pre-filled with the resolved default — `User.preferences.studyDefaults` when present and well-formed, otherwise EP07's own fallback default.
3. Confirming the dialog sends exactly one `POST /study-sessions` whose body carries the assignment id and the chosen duration; while the request is in flight the confirm control is disabled and a second submit is not sent; on success the app navigates into focus mode.
4. The dialog shows a loading state while the request is in flight and an actionable error message when it fails; the student can retry or dismiss, and dismissing or failing leaves the assignment list or course-detail page exactly as it was.
5. No session is created when the dialog is dismissed without confirming, when the duration is invalid, or when the start request fails.
6. Component tests cover both entry points, the default-duration resolution (preference present, preference absent, preference malformed), the request payload, the navigation on success, the duplicate-submit guard and the error state.

## Tests to add / update

- `apps/web/src/features/focus-session/ui/StartFocusSessionDialog.test.tsx` (new):
  - renders the assignment name and the resolved default duration;
  - confirms with the chosen duration → one `POST /study-sessions` call with `{ assignmentId, plannedMinutes }`;
  - the confirm control is disabled while the request is in flight and a second click sends no second request;
  - a failed request renders an actionable error message and keeps the dialog open;
  - dismissing without confirming sends no request;
  - an out-of-range duration is rejected client-side before the request is sent.
- `apps/web/src/features/assignments/ui/AssignmentRow.test.tsx` (new or extended): the row renders the "Start focus session" action with an accessible name that identifies the assignment, and activating it opens the dialog for that assignment.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx` (extend) and `apps/web/src/pages/courses/ui/CourseDetailPage.test.tsx` (extend): the entry point is present on both surfaces and the start flow ends in a navigation to the focus route.
- The existing assignments/courses suites must stay green (no regression in the row layout or the row action menu).

## Technical notes

### Verified baseline (inspected 2026-10-29 at HEAD `8e31c0d`)

- `apps/web/src/features/assignments/ui/AssignmentRow.tsx` — renders the assignment row; it composes `RowActionsMenu` (`:284`) and `SubtaskChecklist` (`:295`). Both the assignments list and the course-detail surface render this one component (`apps/web/src/pages/assignments/ui/AssignmentsPage.tsx:571` and `apps/web/src/features/assignments/ui/AssignmentsSection.tsx:71`), so **one** row-level entry point covers both surfaces.
- `apps/web/src/features/assignments/ui/RowActionsMenu.tsx` — the existing per-row overflow menu; the natural home for a secondary "Start focus session" item, and the place where the keyboard/focus behaviour of a menu item is already established.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — the entity-client precedent: typed request interfaces, `api.post<…>` / `api.get<…>` over `@/shared/api/httpClient`, and doc comments naming the contract's status codes.
- `apps/web/src/shared/api/httpClient.ts` — base URL `/api`; `apps/web/vite.config.ts:15-26` strips `/api` before proxying to the API, so the client calls `/study-sessions`.
- `apps/web/src/shared/lib/errors` — `getErrorMessage` is the repo's helper for turning an API failure into a user-facing message (used by the auth flow); it is the mechanism for the "actionable error message" obligation.
- `apps/web/src/entities/user/model/types.ts:11` — `SessionUser.preferences?: Record<string, unknown> | null`, populated from `GET /users/me` (`apps/api/src/modules/users/users.controller.ts:16`, `users.service.ts:57`). The auth context exposes the signed-in user (`apps/web/src/features/auth/model/AuthContext.tsx`), so the default duration can be resolved client-side without a new request.
- `apps/api/src/modules/users/dto/update-user.dto.ts:17-20` — `preferences` is validated only as a plain object of bounded size, so the client must not assume `preferences.studyDefaults` exists or has a given shape.
- `apps/web/src/shared/ui/` — the EP10 primitives: `Button`, `Input`, `Select`, `Card`, `Dialog`, `Badge`, `EmptyState`. The start dialog uses `Dialog` + `Button` + `Input`/`Select` and the semantic tokens; no ad-hoc colors or spacing (EP10 contract, D10-4/D10-7).
- `apps/web/src/shared/types/academic.ts:112-122` — the existing `StudySession` web interface still mirrors the old required-`endTime` schema; it is replaced by the new projection type in this story's new entity module.
- FSD: `apps/web/.eslintrc.cjs` enforces `import/no-restricted-paths`; the `@/` alias points at `apps/web/src`. New work belongs in `entities/study-session/` (client + types), `features/focus-session/` (the dialog and its model), `pages/…` (route screens) and `features/assignments/ui/` (the row action) — never flat top-level.
- Web commands: `pnpm --filter web test -- <path>`, `pnpm --filter web typecheck` (`strict` + `noUnusedLocals` + `noUnusedParameters` — dead code is a typecheck failure), `pnpm --filter web lint` (`--max-warnings 0`).

### Implementation notes (concrete)

1. **Entity module.** `apps/web/src/entities/study-session/model/types.ts` holds the `StudySession` projection type (matching the parent README's shared contract exactly — `endTime: string | null`, `status`, `elapsedSeconds`, `durationMinutes`, `plannedMinutes`); `apps/web/src/entities/study-session/api/studySessionApi.ts` holds `startStudySession({ assignmentId, plannedMinutes })`. Later frontend children extend the same client file with the functions they consume (pause/resume/current in EP07D; finish/list/confirmed-time in EP07E) — the file grows with its consumers, exactly as `assignmentApi.ts` did across SP-113/SP-120/SP-122.
2. **Duration resolution.** A small pure helper (for example `resolveDefaultSessionMinutes(user)` in the feature's `model/`) that reads `user.preferences?.studyDefaults` and returns a number only when the value is a finite number inside the server's accepted range (5–480); otherwise it returns EP07's own fallback default. The fallback constant and the preference key are recorded in this story's implementation record. **Provisional (V-07-1)** — re-check against EP06's final preference shape when it lands.
3. **The dialog.** `apps/web/src/features/focus-session/ui/StartFocusSessionDialog.tsx`, using the EP10 `Dialog` primitive. The open/close state and the selected assignment live in the page that owns the row (the assignments page and the course-detail page), or in a small feature hook — the `ui-refiner` pass settles the interaction, so the exact shape is deliberately open here.
4. **Duplicate-submit guard.** Disable the confirm control while the request is in flight and ignore repeat activations — the repo's `Dialog` already handles Escape and backdrop close; the confirm path needs its own guard.
5. **Navigation.** On success the app navigates to the focus route (path owned by EP07D). Until EP07D lands, the catch-all route in `apps/web/src/app/App.tsx:63` redirects to `/` — an accepted inter-commit transient inside the EP07 implementation sequence, gated by the combined EP07 review (see *Dependencies / exclusions*).

### UI/UX design (settled 2026-10-30 by the `ui-refiner` pass)

All decisions below reuse the EP10 primitives and semantic tokens; no ad-hoc colors, spacing, or motion. Component names and placements come from the inspected codebase.

**Entry point — placement and affordance.**
- Lives **inside the existing `RowActionsMenu`** (`apps/web/src/features/assignments/ui/RowActionsMenu.tsx`) as a third menu item, above Edit/Delete. No visible button is added; row density and the current compact layout are preserved.
- Icon: `Play` from `lucide-react` (already a dependency), size 14, `aria-hidden`, paired with the text label "Start focus session".
- Menu item order: **Start focus session** → Edit → Delete. The start item is first because it is the primary forward action on an unfinished assignment; Edit/Delete remain secondary.
- Accessible name: `Start focus session for ${assignmentTitle}` (matches the row's existing `aria-label={`Edit ${assignmentTitle}`}` / `Delete` pattern).
- **Hidden on completed assignments.** The menu item is not rendered when `assignment.status === 'COMPLETED'` (and likewise `SUBMITTED`/`GRADED` — i.e. any finished status via `isFinishedAssignment`). A finished assignment cannot be studied again in this MVP; the row's overflow menu then shows only Edit/Delete. This keeps the action scoped to work that still has remaining time.
- The menu item is disabled while the row is `busy` (in-flight status/subtask request), exactly like the trigger already is (`disabled={busy}`), so a row-level mutation in flight blocks starting a session.
- Keyboard/focus: inherits `RowActionsMenu`'s model — opening focuses the first item (now "Start focus session"), ArrowUp/Down cycles, Escape closes and restores the trigger, activating returns focus to the trigger before the callback so the dialog can capture it as its restoration target (`runAction`).

**Dialog — shape and context.**
- Uses the EP10 `Dialog` primitive (`apps/web/src/shared/ui/Dialog.tsx`), size `sm` (`max-w-sm`), modal, with backdrop close and Escape-to-close (the primitive's behavior). No bespoke modal.
- `title`: `Start a focus session`. `description`: `Choose how long you want to focus on this assignment.`
- Body shows an assignment context block (not the heading alone): the assignment title as a strong line, then a compact meta line `Due {date} · {estimatedHours}h estimated` (estimated hours rendered only when `estimatedHours != null`; due date falls back to "No due date"). This gives the student the cue to pick a duration.
- Footer: Cancel (secondary/outline) on the left, "Start focus session" (primary, `isLoading` while in flight) on the right, in the primitive's `flex-col-reverse sm:flex-row sm:justify-end` layout so Cancel sits above on mobile.
- The dialog is mounted once per owning page (assignments page and course-detail page), driven by a single `startingAssignment` state (`AssignmentInteractionItem | null` / the row's assignment) — the same "one dialog mount for the host" pattern as `AssignmentDialogs`. The row's menu item calls `onStartFocus(assignment)`; the page sets `startingAssignment` and renders `<StartFocusSessionDialog assignment={startingAssignment} open={!!startingAssignment} onClose={...} />`.

**Duration control.**
- Three preset chips (25 / 50 / 90 minutes) rendered as `Button` (variant `secondary` when unselected, `primary` when selected) plus a numeric `Input` (`type="number"`, `min={5}`, `max={480}`, `step={5}`) for any custom value. Chips and input are mutually consistent: clicking a chip sets the input value; typing a value that equals a preset highlights that chip; typing any other in-range value leaves no chip highlighted.
- The input's `aria-label` is "Duration in minutes"; a visible label "Duration" sits above; a hint line reads "Between 5 and 480 minutes."
- Client-side validation: the value must be an integer in 5–480. Out of range or non-integer → inline `Input` error ("Duration must be between 5 and 480 minutes.") and the confirm control stays disabled. No request is sent.
- The resolved default is marked, not explained: the preset chip matching the default carries a small "Your default" caption (text, not color-only) beneath it; if the default is a custom value, the input is pre-filled and no chip is highlighted, with the hint line reading "Your default: {n} minutes." instead. The fallback default (no preference) is worded as "Your default: 25 minutes." without naming EP06, so the student is never told about the provisional seam.

**Default duration resolution (provisional V-07-1).**
- Helper `resolveDefaultSessionMinutes(user)` in `apps/web/src/features/focus-session/model/resolveDefaultSessionMinutes.ts` reads `user.preferences?.studyDefaults`.
- Accepted shape: `studyDefaults` must be a plain object whose `sessionMinutes` (the key EP07 reads today) is a finite number in 5–480. Any other shape — missing key, wrong key, non-number, `NaN`/`Infinity`, out of range, non-object `studyDefaults`, or a null/undefined preferences bag — falls back to EP07's own default of **25 minutes**.
- The key name `sessionMinutes` and the fallback 25 are recorded here as provisional; if EP06 later chooses a different key, only the helper changes. The helper is pure and unit-tested for: preference present & well-formed, preference absent, preference malformed (each malformed variant).

**States.**
- In-flight: confirm `Button` uses `isLoading` (spinner + disabled) and `aria-busy`; Cancel is disabled; backdrop close and Escape are ignored (the primitive's `disableBackdropClose` is set to `true` while in flight, and the dialog's keydown handler ignores Escape). The input and preset chips are disabled while in flight.
- Error: a `role="alert"` block below the input shows `getErrorMessage(err)` (or the API message), with the 409 special-cased: when `extractApiError(err)?.statusCode === 409`, the message is the API's verbatim "A focus session is already in progress." plus a secondary text line "Finish your open session first, then start a new one." and the confirm button's label changes to "View current session"; activating it closes the dialog and navigates to the focus route (`/focus`, owned by EP07D — until then it falls through to the catch-all, the accepted inter-commit transient). For any other failure the message is the sanitized error and a retry is the re-clicked confirm (button re-enables).
- Success: the dialog closes and the app navigates to the focus route; no toast and no list refetch (the session is not part of the assignment list). Dismissing or failing leaves the list/course-detail exactly as it was.
- No empty state is reachable: the action is always assignment-scoped, so the dialog is never opened without an assignment.

**Duplicate-submit guard.**
- Confirm handler early-returns when `isStarting` is true; the control is disabled via `isLoading`. A second click/Enter sends no second request. Matches the `ArchiveCourseDialog` pattern.

**Navigation.**
- On success: `navigate('/focus')` (path owned by EP07D). Until EP07D lands this falls through to the catch-all redirect to `/` — the accepted inter-commit transient, gated by the combined EP07 review. EP07C is explicitly not releasable on its own.
- 409 "View current session" uses the same `navigate('/focus')`.

**Keyboard behaviour.**
- Initial focus: the first preset chip (or the input if no presets match) — the primitive focuses the first focusable, which is the first preset chip; chips are ordered 25, 50, 90 before the input, so focus lands on 25. Acceptable and announced by the chip's label.
- Escape closes (restores focus to the triggering menu's trigger, then to the row), except while in flight.
- Tab order: assignment context (non-interactive) → preset chips → duration input → Cancel → confirm. Focus trap provided by the primitive.
- Focus restoration: on close, the primitive restores focus to the element that had focus when the dialog opened (the overflow trigger), which is already the established row pattern.

**Responsive behaviour.**
- Dialog: the primitive is `w-full max-w-sm` with `p-4` outer padding, so at 375px it fills the viewport minus 32px with no horizontal scroll. Footer stacks vertically (`flex-col-reverse`) on mobile, so Cancel and confirm are full-width and ≥44px (Button's `max-sm:min-h-[44px]`).
- Preset chips wrap (`flex flex-wrap gap-2`) and each is ≥44px tall on mobile (Button `sm` plus `max-sm:min-h-[44px]`).
- The overflow menu item already meets ≥44px via the menu's `py-2` + the page-level `max-sm:[&_button]:min-h-[44px]` rule on list containers; the course-detail list applies the same rule.

**Reduced motion.**
- The primitive's open/close uses `transition-all duration-base ease-standard` with `opacity-0 scale-95` → `opacity-100 scale-100`. Respect `prefers-reduced-motion`: apply `motion-reduce:transition-none motion-reduce:transform-none` (or rely on the token's reduced-motion variant) so the dialog appears without animation. The spinner uses `motion-reduce:animate-none` (already in Button). No other animations are introduced.

**Copy (final).**
- Menu item: "Start focus session" (icon `Play`).
- Dialog title: "Start a focus session".
- Dialog description: "Choose how long you want to focus on this assignment."
- Context meta: "Due {date} · {n}h estimated" (estimated hours only if present).
- Field label: "Duration"; hint: "Between 5 and 480 minutes." / "Your default: {n} minutes."
- Preset caption: "Your default" (under the matching chip).
- Confirm: "Start focus session" (idle) / "Starting…" (in flight, via `isLoading`) / "View current session" (409).
- Cancel: "Cancel".
- Error alert: sanitized message; 409 adds "Finish your open session first, then start a new one."

**Tests to add / update** (refined from the story's list; framework: Vitest + Testing Library, matching `DeleteAssignmentDialog.test.tsx`):
- `StartFocusSessionDialog.test.tsx`:
  - renders assignment title, due date, estimated hours and the resolved default duration (preference present);
  - resolves default from preference when present & well-formed; falls back to 25 when absent; falls back when malformed (each malformed variant);
  - preset chip click sets the value and highlights the chip; typing a custom value clears chip highlight;
  - out-of-range / non-integer duration shows inline error and keeps confirm disabled; no request sent;
  - confirm sends exactly one `POST /study-sessions` with `{ assignmentId, plannedMinutes }`;
  - confirm disabled + `aria-busy` while in flight; a second click/Enter sends no second request;
  - failed request renders an actionable error alert and keeps the dialog open; confirm re-enables;
  - 409 renders the verbatim message + "Finish your open session first…" and switches confirm to "View current session", which navigates to `/focus`;
  - dismissing (Cancel / Escape / backdrop) sends no request and restores focus to the trigger;
  - success closes the dialog and navigates to `/focus`.
- `RowActionsMenu.test.tsx` (extend): renders "Start focus session" item with accessible name `Start focus session for {title}`; item absent on completed assignments; item disabled when `disabled`; keyboard cycle includes it first; activating calls `onStartFocus` and returns focus to the trigger.
- `AssignmentsPage.test.tsx` / `CourseDetailPage.test.tsx` (extend): entry point present on both surfaces; selecting it opens the dialog for that assignment; the flow ends in a navigation to `/focus`.
- `resolveDefaultSessionMinutes.test.ts` (new, co-located in `model/`): pure helper cases.
- Reduced-motion / responsive are covered by the existing primitive tests and the manual a11y pass (TR-E07-08); no new automated assertions required beyond the primitive's own.

**New/modified files (UI scope only — no application code written by this pass):**
- `apps/web/src/features/focus-session/ui/StartFocusSessionDialog.tsx` (new) — uses `Dialog`, `Button`, `Input`.
- `apps/web/src/features/focus-session/model/resolveDefaultSessionMinutes.ts` (new) — pure helper.
- `apps/web/src/features/focus-session/model/useStartFocusSession.ts` (new, recommended) — owns `isStarting`, the submit handler, error state, and the `navigate('/focus')` call; keeps the dialog presentational. Owning the navigation in a hook (rather than the dialog) matches the page-level ownership used for `useAssignmentActions`.
- `apps/web/src/features/assignments/ui/RowActionsMenu.tsx` (modify — add the item + `onStartFocus` prop).
- `apps/web/src/features/assignments/ui/AssignmentRow.tsx` (modify — thread `onStartFocus`).
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` and `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` (modify — `startingAssignment` state + dialog mount).
- `apps/web/src/shared/types/academic.ts` — replace the stale `StudySession` interface with a pointer to the new entity type (per technical notes).

### Decisions (settled by the `ui-refiner` pass, 2026-10-30)

- Entry-point placement: inside the existing `RowActionsMenu` as a third item above Edit/Delete; no visible button. (row density preserved; matches the established overflow pattern)
- Entry-point affordance: `Play` icon + text "Start focus session"; accessible name `Start focus session for {title}`.
- Entry-point visibility: hidden on finished assignments (`COMPLETED`/`SUBMITTED`/`GRADED`); menu then shows only Edit/Delete.
- Dialog: EP10 `Dialog` primitive, size `sm`, modal; backdrop close + Escape except while in flight. Title "Start a focus session".
- Dialog context: assignment title + due date + estimated hours (compact meta line); estimated hours only if present.
- Duration control: three preset chips (25/50/90) plus a numeric input (5–480, step 5); chips and input stay in sync; inline validation.
- Default duration: `resolveDefaultSessionMinutes(user)` reads `preferences.studyDefaults.sessionMinutes`; fallback 25. Provisional key/fallback (V-07-1).
- Default presentation: matching preset chip carries a "Your default" caption; custom default shows "Your default: {n} minutes." hint. Fallback default is not attributed to EP06.
- Confirm label: "Start focus session" (idle) / "Starting…" (in flight) / "View current session" (409).
- Cancel label: "Cancel".
- 409 handling: verbatim API message + "Finish your open session first, then start a new one." + confirm becomes "View current session" → navigates to `/focus`.
- Other failure: sanitized `getErrorMessage` in a `role="alert"` block; retry by re-clicking confirm.
- Duplicate-submit guard: early-return when `isStarting`; control disabled via `isLoading`; backdrop/Escape ignored in flight.
- Navigation: `navigate('/focus')` on success and on the 409 affordance; accepted inter-commit transient until EP07D.
- Keyboard: initial focus first preset chip; Tab order context → chips → input → Cancel → confirm; focus trap from primitive; Escape closes except in flight; focus restored to the overflow trigger.
- Responsive: dialog full-width `max-w-sm` with no horizontal scroll at 375px; footer/chips stack and are ≥44px on mobile.
- Reduced motion: primitive transition gets `motion-reduce` overrides; spinner uses `motion-reduce:animate-none`; no new animations.
- TaskId selection UI: remains out of scope for EP07C (settled with EP07D); this story sends only `assignmentId` + `plannedMinutes`.

### Risks / open questions

- **The navigation target is EP07D's route.** This story is therefore **not releasable on its own**; it needs EP07D for the destination screen. The transient between the two commits is acceptable because the whole epic ships behind one combined review, but it must not be presented as a standalone release.
- **`preferences.studyDefaults` shape.** Unverified — the bag is free-form. The defensive read plus the fallback is the mitigation; if EP06 later chooses a different key, only the helper changes.
- **The 409 "a focus session is already in progress" response (D07-06).** When a student starts a session while one is open, the API answers 409. The dialog must surface that as an actionable message and offer the way forward (finish the open session first). The exact copy and affordance are `ui-refiner` territory.
- **The row's action density.** The assignments row already carries a status control, an overflow menu and a subtask checklist; adding a start action has a narrow-screen cost. The `ui-refiner` decides whether the start action lives in the overflow menu, as a visible control, or both.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is handled: the duration is validated client-side against the server's accepted range before the request is sent, and the API's 400 field errors are surfaced.
3. Academic data is scoped to the authenticated student — the client calls the authenticated endpoints; no client-supplied user id is ever sent.
4. API errors produce actionable messages — the start failure surfaces the repo's `getErrorMessage` output, and the 409 case explains what to do.
5. Loading and error states are handled: an in-flight state on the confirm control and an error state on the dialog; the empty state (no assignment selected) is not reachable because the action is always assignment-scoped.
6. Core interactions support keyboard accessibility — the entry point is focusable and operable, and the dialog traps focus and closes on Escape (the EP10 `Dialog` primitive's behaviour).
7. Responsive layouts work on desktop and mobile — the entry point and the dialog are usable at narrow widths with ≥44px tap targets.
8. Business rules have automated tests — the component tests above; the full web suite stays green.
9. Not applicable — no API change in this story (the API contract is EP07A/EP07B's).
10. Integrated review — the combined EP07 parent review.
11. Reviewer walkthrough — the combined EP07 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** a student can start a focus session from any assignment on the assignments list or the course-detail surface, choosing the duration, and lands in focus mode.
- **Request/token estimate:** 1–2 requests/tokens — one entity client + type module, one dialog component with its test, one row action, and wiring on two pages. Low uncertainty once the presentation is settled by the `ui-refiner`.
- **Model recommendation:** 2 — an additive entry point over an existing contract with no new domain logic; the care points are the duplicate-submit guard and the row's action density, not the implementation. A value model suffices once the UI is settled.
- **Files:**
  - `apps/web/src/entities/study-session/model/types.ts` (new);
  - `apps/web/src/entities/study-session/api/studySessionApi.ts` (new);
  - `apps/web/src/features/focus-session/ui/StartFocusSessionDialog.tsx` (new);
  - `apps/web/src/features/focus-session/ui/StartFocusSessionDialog.test.tsx` (new);
  - `apps/web/src/features/focus-session/model/` (duration-default helper + start hook — new);
  - `apps/web/src/features/assignments/ui/AssignmentRow.tsx` (modify — the entry point);
  - `apps/web/src/features/assignments/ui/RowActionsMenu.tsx` (modify — if the action lives in the overflow menu);
  - `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (modify — wire the dialog);
  - `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` (modify — wire the dialog);
  - `apps/web/src/shared/types/academic.ts` (modify — replace the stale `StudySession` interface with a pointer to the new entity type).
- **Start context:** this story file; the parent README's shared API/data contract (the projection shape) + decision register (D07-1, D07-3, D07-4/V-07-1, D07-5, D07-9); EP07A/EP07B's implementation records (`./artifacts/EP07A/implementation.md`, `./artifacts/EP07B/implementation.md`); `apps/web/src/features/assignments/ui/AssignmentRow.tsx` and `RowActionsMenu.tsx`; `apps/web/src/entities/assignment/api/assignmentApi.ts`; `apps/web/src/shared/ui/Dialog.tsx`; `apps/web/src/shared/lib/errors`. Do not read unrelated epic stories.
- **Verification:** `pnpm --filter web test -- src/features/focus-session src/features/assignments src/pages/assignments src/pages/courses`; `pnpm --filter web typecheck`; `pnpm --filter web lint`; `pnpm --filter web test` (full suite).
- **Dependencies / exclusions:** EP07A and EP07B implemented; `ui-refiner` pass completed. Excludes the focus-mode screen and timer controls (EP07D), completion confirm/adjust and history (EP07E), the dashboard quick action (D07-9), the `taskId` selection UI (settled with EP07D), and all backend work. **Not releasable on its own** — the destination focus route and page land with EP07D; the combined EP07 review is the release gate.

## UI/UX decisions (settled 2026-10-30 — D07-5)

All gaps listed below are now settled; the authoritative, implementation-ready detail lives in Technical Notes → "UI/UX design" and "Decisions". This section is retained for traceability against the original gap list.

- **Entry-point placement.** Where the "Start focus session" action lives on the assignment row: inside the existing overflow menu, as a visible control beside the status control, or both (visible on wide screens, in the menu on narrow screens). The row already carries a status control, an overflow menu and a subtask disclosure.
- **Entry-point affordance and iconography.** Icon + text versus icon-only; the icon set (lucide-react is already a dependency); the label wording ("Start focus session" vs "Focus" vs "Study now"); whether the action appears on completed assignments.
- **Dialog shape.** Modal versus an inline panel; the dialog's width and placement; whether it shows the assignment title, due date and estimated hours as context, and how much of that is visible at once.
- **Duration control.** Preset buttons (e.g. 25 / 50 / 90) versus a numeric input versus a stepper; the unit and format; whether the server's 5–480 range is exposed or a friendlier subset is offered; how the resolved default is marked ("your default"); whether custom values are allowed at all.
- **Default duration presentation and copy.** How the fallback default is worded when no preference exists, and what the user is told when the preference comes from EP06.
- **Confirmation and error copy.** The confirm label, the cancel label, the in-flight wording, the failure wording, and specifically the 409 wording ("a focus session is already in progress") and what the student is invited to do next.
- **Loading, empty and error states.** The in-flight state on the confirm control, the failure state, and whether the dialog shows a retry affordance.
- **Keyboard behaviour.** Initial focus, Escape-to-close versus "Escape cancels but keeps the typed duration", focus restoration to the triggering row action, and the tab order between the assignment context, the duration control and the confirm/cancel actions.
- **Responsive behaviour.** The dialog at 375px (no horizontal scrolling, ≥44px tap targets), the row action's narrow-screen placement, and whether the dialog becomes a full-height sheet on phones.
- **Reduced motion.** Any dialog open/close animation must use the EP10 token durations and respect `prefers-reduced-motion` (D10-16).
