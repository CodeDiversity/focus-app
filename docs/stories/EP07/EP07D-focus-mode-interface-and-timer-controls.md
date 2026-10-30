# EP07D: Focus-Mode Interface & Timer Controls

**Story ID:** EP07D
**Title:** Frontend — the distraction-reduced focus screen, the timer and its controls, and recovery of an in-progress session after a reload
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Frontend
**Status:** **Needs refinement** — the `ui-refiner` pass is required before implementation (D07-5).
**Dependencies:** **EP07A** (start/pause/resume/current endpoints) and **EP07B** (the projection). **EP07C** supplies the navigation into this route (the `/focus` route and page land here). `ui-refiner` pass required.
**Jira key:** Pending creation
**Refined:** — (the `ui-refiner` pass is what settles this story's presentation; this file records the planner's breakdown and the exact gaps)

## Summary

A dedicated focus route gives the student a quiet screen with the running timer, the pause/resume/finish controls, and the assignment they are working on with its unfinished subtasks. The timer is always anchored to the server's recorded elapsed time — the browser only smooths the display between server responses — and reloading the page restores the session exactly as it was, never completing it.

## Description & bounded scope

### In scope

1. **The focus route** — `/focus`, inside the `ProtectedRoute` block of `apps/web/src/app/App.tsx`. This is the route EP07C navigates into after a successful start.
2. **The focus screen** — a distraction-reduced surface: the timer, the controls, and the current assignment with its unfinished subtasks. Layout, information hierarchy and copy are the `ui-refiner`'s decision (D07-5).
3. **Recovery on load** — the screen reads `GET /study-sessions/current` on mount. An `ACTIVE` session is restored as running, a `PAUSED` session as paused, and no session shows an empty state that explains what to do next. **Loading the page never writes**: a reload can never mark a session complete (AC-E07-06).
4. **The timer** — the displayed elapsed time is `elapsedSeconds` (the server's recorded value) plus the time elapsed since the last server response; it is re-anchored to the server's value after every pause, resume, finish and reload. The client never sends elapsed time to the server — the server measures it from its own timestamps (D07-07).
5. **The controls** — pause, resume and finish, driven by the session status; each control reflects the current state, is disabled while its request is in flight, and surfaces an actionable error if the transition fails.
6. **The current assignment and its unfinished subtasks** — visible in focus mode (AC-E07-03). The assignment and its subtasks come from the existing `GET /assignments` cross-course list projection (which already carries `subtasks` — D120-5); **no new endpoint is required**.
7. **Accessibility and motion** — every control is a native button with a visible focus ring and a ≥44px tap target; the session status is announced in a polite live region **on state change only** (never a per-second announcement); reduced motion is respected through the EP10 token durations; the layout works at 375px.
8. **Tests** — component tests for recovery, the timer's re-anchoring, the controls, the assignment/subtask panel, the "a reload never completes a session" guarantee, keyboard operation and the error state.

### Out of scope

- Starting a session (EP07C's entry points) — this screen never starts one; its empty state points back at the assignment list.
- The completion confirm/adjust dialog and the study-history surface — **EP07E**.
- Marking a subtask complete from focus mode: the subtask list is **read-only** here (visible, with completed ones marked). Subtask editing stays on the assignment surfaces (EP03). Whether focus mode should make subtasks interactive is a `ui-refiner` question recorded below, not an EP07 requirement.
- Any backend change (EP07A/EP07B own the API).
- The dashboard's "Start Focus Session" quick action (D07-9) and EP06's planning surfaces.

## Source requirement references

- **Epic AC-E07-02** (frontend half: pause / resume / finish controls and the timer), **AC-E07-03** (the current assignment and unfinished subtasks remain accessible in focus mode), **AC-E07-06** (frontend half: a reload restores the session and never completes it).
- **TR-E07-04** (this child's test obligations), **TR-E07-08** (the manual accessibility pass).
- **Shared DoD** — items 1, 4, 5, 6, 7, 8 apply; items 10/11 belong to the combined EP07 parent review.
- **Decisions:** D07-1, D07-5 (this story is `Needs refinement`), D07-6 (one open session at a time — provisional), D07-7 (elapsed time is server-derived), D07-8 (the calendar's null-`endTime` handling is backend-side).

## Acceptance criteria

1. `/focus` is a protected route that renders the focus screen; an unauthenticated visitor is handled by the existing `ProtectedRoute` behaviour.
2. On load the screen reads the student's current session and restores it: an `ACTIVE` session is shown as running, a `PAUSED` session as paused, and no open session shows an empty state explaining what to do next. **Loading the page sends no write request** — the session's status, `endTime` and `durationMinutes` are unchanged by a reload.
3. The displayed elapsed time equals the server's `elapsedSeconds` plus the time since the last server response; after every pause, resume and finish the display is re-anchored to the value the server returns. The client never sends an elapsed-time value to the server.
4. Pause and resume work from the screen and the control set reflects the session status (running → pause; paused → resume; plus finish). The control is disabled while its request is in flight; a failed transition shows an actionable message and the control returns to the state the session is actually in.
5. The linked assignment and its subtasks are visible in focus mode, with finished subtasks distinguishable from unfinished ones; a session without an assignment shows the corresponding empty variant instead of a broken panel.
6. Every control is a native button with a visible focus ring and a ≥44px tap target; the whole screen is operable with the keyboard alone; the session status is announced in a polite live region when it changes (running/paused), not on every timer tick.
7. The screen respects `prefers-reduced-motion` through the EP10 token durations, and at 375px it has no horizontal scrolling and no overlapping or clipped controls.
8. Component tests cover recovery for an active, a paused and an absent session; the timer's re-anchoring after a server response; pause and resume; the assignment and unfinished-subtask panel; the "a reload never completes a session" guarantee (no write request is made on mount); keyboard operation; and the error state.

## Tests to add / update

- `apps/web/src/pages/focus/ui/FocusPage.test.tsx` (new):
  - an `ACTIVE` session is restored as running and the screen issues **no** write request on mount (assert the mock client recorded only the `current` call);
  - a `PAUSED` session is restored as paused with the pause control showing "Resume";
  - no session renders the empty state with a way back to the assignments list, and sends no write;
  - the assignment title and its subtasks render, with completed subtasks distinguishable;
  - a session without an assignment renders the empty-assignment variant;
  - a failed pause shows an actionable message and the control returns to the session's real state;
  - the elapsed display matches the server's `elapsedSeconds` right after a response and advances afterwards.
- `apps/web/src/features/focus-session/ui/FocusTimer.test.tsx` (new):
  - renders the elapsed time in the agreed format (the format is a `ui-refiner` decision — the test asserts the agreed one);
  - exposes the status in a polite live region and updates it on a state change, not on every tick;
  - the pause/resume/finish controls are real buttons with accessible names and are disabled while a request is in flight.
- `apps/web/src/features/focus-session/ui/FocusAssignmentPanel.test.tsx` (new): renders the assignment and the subtask list, distinguishing unfinished from finished ones; renders the empty variant when there is no assignment.
- `apps/web/src/features/focus-session/model/useFocusSession.test.ts` (new): the anchor/re-anchor logic (a server response replaces the local offset), the recovery mapping (`ACTIVE` → running, `PAUSED` → paused), and the in-flight guard that prevents a double submit.
- The existing web suite must stay green.

## Technical notes

### Verified baseline (inspected 2026-10-29 at HEAD `8e31c0d`)

- `apps/web/src/app/App.tsx:37-60` — the `ProtectedRoute` block holds the authenticated routes (`/dashboard`, `/semesters`, `/courses`, `/courses/:id`, `/assignments`, `/calendar`, `/availability`, `/profile`, `/onboarding`); `/focus` is added here, inside the same block, rendered within the standard `Layout` like every other page.
- `apps/web/src/app/App.tsx:63` — the catch-all `<Route path="*" element={<Navigate to="/" replace />} />` is what an unknown path falls back to (the accepted transient between EP07C and EP07D — the navigation target lands with this story).
- `apps/web/src/shared/api/httpClient.ts` — the shared axios transport; base URL `/api`; `apps/web/vite.config.ts:15-26` strips `/api` before proxying.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — the client functions this story needs already exist: `listAssignments(params)` (`:124`) returns the cross-course list projection, whose items carry `subtasks` (`apps/web/src/shared/types/academic.ts:136-150`); `listSubtasks(assignmentId)` (`:65`) returns the assignment-scoped 6-key subtask projection. **The checklist UI reads the course projection instead of `listSubtasks` (D120-5)**, so the web already holds the subtask data on the assignment list projection.
- **There is no `GET /assignments/:id` endpoint** — `apps/api/src/modules/assignments/assignments.controller.ts` exposes `POST /assignments`, `GET /assignments`, `PATCH /assignments/:id`, `DELETE /assignments/:id` and the subtask routes only. The focus screen therefore resolves the session's assignment by id **from the existing `GET /assignments` list** (which also carries its subtasks). This is a known limitation of EP03's surface, not an EP07 gap; no new endpoint is introduced. Note the cost: the list is the whole student's assignment set, so the focus screen fetches it once and selects the matching row.
- `apps/web/src/shared/ui/` — the EP10 primitives (`Button`, `Input`, `Select`, `Card`, `Dialog`, `Badge`, `EmptyState`) and the semantic tokens; `apps/web/src/index.css` carries the global `prefers-reduced-motion` rule that zeroes transition durations.
- `apps/web/src/features/auth/model/AuthContext.tsx` — the signed-in user (`SessionUser`), used when a session needs the student identity; the focus screen itself is principal-scoped by the API.
- `apps/web/src/shared/lib/errors` — `getErrorMessage`, the repo's helper for turning an API failure into a user-facing message.
- Web commands: `pnpm --filter web test -- <path>`, `pnpm --filter web typecheck` (`strict` + `noUnusedLocals` + `noUnusedParameters`), `pnpm --filter web lint` (`--max-warnings 0`).
- FSD: `apps/web/.eslintrc.cjs` (`import/no-restricted-paths`) — the route screen goes in `pages/focus/ui/`, the focus components in `features/focus-session/`, the client in `entities/study-session/`.

### Implementation notes (concrete)

1. **The elapsed-time anchor.** Keep the server's `elapsedSeconds` and the instant the response arrived. The displayed value is `elapsedSeconds + (now - responseInstant)`; a local interval (roughly once a second) only re-renders the display. Every server response replaces both values, so drift is corrected on each pause/resume/finish/reload. The interval is cleared when the session is paused or the page is unmounted. **The client never posts an elapsed value** — the pause/resume/finish requests carry no timing payload at all.
2. **The recovery read.** On mount, call `GET /study-sessions/current` **once**. If it returns a session, render it; if it returns `null`, render the empty state. No other request may be issued on mount — in particular no finish request (AC-E07-06). A test asserts the mock client recorded exactly one call.
3. **Status → control mapping.** `ACTIVE` → the pause control is enabled and the finish control is enabled; `PAUSED` → the resume control is enabled and the finish control is enabled; `COMPLETED` → the screen shows the completed state (the history and the completion confirm/adjust are EP07E's, so the focus screen's completed state is a simple, non-editable summary that links onward). The mapping lives in one pure function so it can be unit-tested.
4. **In-flight guard.** While a pause/resume request is in flight, the affected control is disabled and the other control is not; a second activation is ignored. A failed transition re-reads the authoritative state from the error path (or simply re-enables the control and shows the message) — the `ui-refiner` decides whether a silent re-read or a message-led recovery is presented.
5. **The assignment panel.** Fetch `GET /assignments` once when a session has an `assignmentId`; select the row with that id; render its `title` and its `subtasks`. Finished subtasks are distinguished by text/label, never by colour alone. If the assignment id no longer resolves (for example the assignment was deleted and the link was nulled by `onDelete: SetNull`), render the empty variant rather than an error.
6. **The live region.** A single `aria-live="polite"` status element carries the session state ("Focus session running", "Focus session paused"). The ticking digits are **not** in a live region — announcing every second is hostile to screen-reader users. The digits are plain text with an accessible label that names the elapsed time for assistive technology.
7. **Reduced motion and responsive.** Use the EP10 token durations only; do not add an animation library. At narrow widths the assignment/subtask panel stacks below the timer; every interactive target keeps ≥44px.

### Risks / open questions

- **The focus screen needs the assignment list.** Because there is no `GET /assignments/:id`, the screen fetches the whole cross-course list to resolve one assignment. If that feels wrong in review, the correct fix is an EP03-scoped `GET /assignments/:id` — **not** an EP07 change. Recorded here so it is not mistaken for an EP07 design choice.
- **The subtask list is read-only in focus mode.** The epic says the assignment and unfinished subtasks "remain accessible" in focus mode; this story reads that as *visible*. Making them interactive is a UX question for the `ui-refiner` and would add a mutation surface to the focus screen.
- **A paused session stays paused after a reload.** The screen does not auto-resume: the student chose to pause, and an automatic resume would silently change the recorded time. This is deliberate and matches AC-E07-06.
- **The completed state on the focus screen.** After EP07B's finish, the focus screen shows a summary and hands over to EP07E's confirm/adjust surface. The exact handover is a `ui-refiner` decision.
- **The `/focus` route's title and navigation.** Whether the focus screen keeps the standard `Layout` header or hides it for maximum distraction reduction is a `ui-refiner` decision (the route is registered inside the standard `Layout` in this story's baseline).

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is handled: the client sends no user-authored payload on this screen, and a rejected transition surfaces the server's message rather than a stale success state.
3. Academic data is scoped to the authenticated student — every call is an authenticated endpoint call; no client-supplied user id is ever sent.
4. API errors produce actionable messages — a failed pause/resume shows the repo's `getErrorMessage` output and the control returns to the session's real state.
5. Loading, empty and error states are handled: a loading state while the current session is read, an empty state when there is no session (with a way back to the assignments list), an empty variant when the session has no assignment, and an error state for a failed transition.
6. Core interactions support keyboard accessibility — native buttons, visible focus rings, a polite live region on state change, and full keyboard operation without a mouse.
7. Responsive layouts work on desktop and mobile — no horizontal scrolling at 375px, ≥44px tap targets, the panel stacking below the timer.
8. Business rules have automated tests — the component tests above, including the "a reload never completes a session" guarantee; the full web suite stays green.
9. Not applicable — no API change in this story (the API contract is EP07A/EP07B's).
10. Integrated review — the combined EP07 parent review.
11. Reviewer walkthrough — the combined EP07 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** the student has a quiet focus screen with a server-anchored timer, working pause/resume/finish controls, the current assignment and its unfinished subtasks, and a reload that restores the session exactly as it was.
- **Request/token estimate:** 2–3 requests/tokens — a new protected route and page, two focus components plus their tests, the elapsed-anchor/recovery hook with its own test, and three additions to the entity client. The elapsed-time anchoring and the "reload never completes" rule are the two places a mistake is silent, so the estimate is at the upper end of the band.
- **Model recommendation:** 4 — this is the highest-risk client logic in the epic: the timer must stay anchored to the server's recorded time across pause/resume/reload, the recovery path must not write, and the screen carries the epic's keyboard, live-region, reduced-motion and narrow-screen obligations on a new route. A frontier model is recommended for the timer/recovery design.
- **Files:**
  - `apps/web/src/app/App.tsx` (modify — add the `/focus` route inside `ProtectedRoute`);
  - `apps/web/src/pages/focus/ui/FocusPage.tsx` (new);
  - `apps/web/src/pages/focus/ui/FocusPage.test.tsx` (new);
  - `apps/web/src/features/focus-session/ui/FocusTimer.tsx` (new) + `FocusTimer.test.tsx` (new);
  - `apps/web/src/features/focus-session/ui/FocusAssignmentPanel.tsx` (new) + `FocusAssignmentPanel.test.tsx` (new);
  - `apps/web/src/features/focus-session/model/useFocusSession.ts` (new) + `useFocusSession.test.ts` (new);
  - `apps/web/src/entities/study-session/api/studySessionApi.ts` (modify — add pause/resume/current);
  - `apps/web/src/entities/study-session/model/types.ts` (modify if the projection type needs extending).
- **Start context:** this story file; the parent README's shared API/data contract (the projection shape) + decision register (D07-1, D07-5, D07-7); EP07A/EP07B/EP07C's implementation records (`./artifacts/EP07A/implementation.md`, `./artifacts/EP07B/implementation.md`, `./artifacts/EP07C/implementation.md`); `apps/web/src/app/App.tsx`; `apps/web/src/entities/assignment/api/assignmentApi.ts`; `apps/web/src/shared/ui/` (the EP10 primitives); `apps/web/src/index.css` (the reduced-motion rule). Do not read unrelated epic stories.
- **Verification:** `pnpm --filter web test -- src/pages/focus src/features/focus-session`; `pnpm --filter web typecheck`; `pnpm --filter web lint`; `pnpm --filter web test` (full suite).
- **Dependencies / exclusions:** EP07A, EP07B and EP07C implemented; `ui-refiner` pass completed. Excludes starting a session (EP07C), completion confirm/adjust and the history surface (EP07E), subtask mutation, all backend work, and EP06's surfaces.

## UI/UX gaps for the `ui-refiner` (D07-5 — not yet settled)

- **Focus-mode layout and information hierarchy.** What the screen shows and in what order: the timer, the assignment, the subtasks, the controls. Whether the standard app header/navigation stays visible (maximum distraction reduction) or the focus screen is a full-bleed surface.
- **Timer presentation.** The time format (`25:00` vs `25 min` vs `1h 05m`), the digit size and weight, whether the target/planned duration is shown alongside ("25 / 50 min"), what happens visually when the target is exceeded, and whether a progress ring or bar is used.
- **Distraction reduction.** What is deliberately hidden (nav, other assignments, deadlines, stats), whether ambient or motion effects exist at all, and how the screen signals that it is a focus mode.
- **Control placement and labelling.** Pause / resume / finish placement and labels; whether finish is a destructive-looking action; icon usage (lucide-react) and whether controls are icon + text or text only; the destructive "finish" affordance's distance from the timer.
- **Subtask visibility.** Whether the subtask list is a panel, a disclosure or a compact strip; how unfinished versus finished subtasks are distinguished (never colour alone); whether the subtask list is scrollable independently; whether subtasks are interactive (see the story's scope note) or read-only.
- **Empty states.** The "no session in progress" state (copy and the way back to the assignments list), the "session without an assignment" variant, and the loading state while the current session is read.
- **Error and recovery copy.** The wording for a failed pause/resume, and whether the student is offered a retry, a re-read, or both.
- **Announcement behaviour.** The exact live-region wording for running/paused/completed, and confirmation that the ticking digits are not announced.
- **Keyboard behaviour.** Initial focus on load, the tab order between the timer, the panel and the controls, Escape's meaning inside focus mode (close the screen? nothing?), and focus restoration when leaving the focus screen.
- **Responsive behaviour.** The 375px layout (timer size, panel stacking, control row wrapping), whether the controls become a sticky bottom bar on phones, and the no-horizontal-scroll guarantee.
- **Reduced motion.** Which transitions (if any) exist and that they use the EP10 token durations (D10-16).
