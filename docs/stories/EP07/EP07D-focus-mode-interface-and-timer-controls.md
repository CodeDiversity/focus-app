# EP07D: Focus-Mode Interface & Timer Controls

**Story ID:** EP07D
**Title:** Frontend — the distraction-reduced focus screen, the timer and its controls, and recovery of an in-progress session after a reload
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Frontend
**Status:** **Ready** — UI refinement captured 2026-10-30 (D07-5); technical refinement in Technical Notes.
**Dependencies:** **EP07A** (start/pause/resume/current endpoints) and **EP07B** (the projection). **EP07C** supplies the navigation into this route (the `/focus` route and page land here). `ui-refiner` pass required.
**Jira key:** Pending creation
**Refined:** 2026-10-30 (ui-refiner pass — UI/UX decisions settled; see Technical Notes → "UI/UX design" and "Decisions". Technical refinement of files/endpoints/DTOs is unchanged; status reconciliation to Ready is the planner/coordinator's.)

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
4. **In-flight guard.** While a pause/resume/finish request is in flight, the affected control uses `isLoading` (disabled + `aria-busy`) and the other control is also disabled to prevent concurrent transitions; a second activation is ignored (early-return guard). A failed transition is **message-led**: the control re-enables and an inline `role="alert"` shows `getErrorMessage(err)`; on a 409 ("session changed") the block additionally offers a "Reload session" button that re-runs the recovery read and re-anchors, rather than a silent re-read or a full page reload.
5. **The assignment panel.** Fetch `GET /assignments` once when a session has an `assignmentId`; select the row with that id; render its `title` and its `subtasks`. Finished subtasks are distinguished by text/label, never by colour alone. If the assignment id no longer resolves (for example the assignment was deleted and the link was nulled by `onDelete: SetNull`), render the empty variant rather than an error.
6. **The live region.** A single `aria-live="polite"` status element carries the session state ("Focus session running", "Focus session paused"). The ticking digits are **not** in a live region — announcing every second is hostile to screen-reader users. The digits are plain text with an accessible label that names the elapsed time for assistive technology.
7. **Reduced motion and responsive.** Use the EP10 token durations only; do not add an animation library. At narrow widths the assignment/subtask panel stacks below the timer; every interactive target keeps ≥44px.

### UI/UX design (settled 2026-10-30 by the `ui-refiner` pass)

All decisions below reuse the EP10 primitives and semantic tokens; no ad-hoc colors, spacing, or motion. Component names and placements come from the inspected codebase. The authoritative, implementation-ready detail lives here; the bottom "UI/UX decisions" section is retained for traceability against the original gap list.

**Shell and distraction reduction.**
- The route stays inside the standard `ProtectedRoute` + `Layout` (baseline). The standard app header/nav remain visible for consistency, skip-link and keyboard access; distraction reduction is achieved by *content*, not by hiding the shell: the page shows only the timer, the controls, and the linked assignment with its subtasks. No dashboard widgets, no other assignments, no deadlines, no stats, no ambient/motion effects, no sound.
- The page is a single centered column (`max-w-2xl mx-auto`) on `bg-background`, with a small "Focus session" `Badge` (variant secondary) at the top of the content as the mode cue, then the timer, then the controls, then the assignment panel. Nothing else.
- No new route shell and no full-bleed variant: the shell stays EP10's.

**Timer presentation.**
- Large elapsed display in `MM:SS` (or `H:MM:SS` once elapsed ≥ 3600s), rendered as plain text in a display-weight element (`text-display`/`text-6xl sm:text-7xl font-semibold tabular-nums text-text`). The digits are **not** in a live region; they carry `aria-label={`Elapsed time ${formatted}`}` so AT can name them on demand.
- A secondary line beneath: when `plannedMinutes` is set, `{elapsedMinutes} of {plannedMinutes} min` (e.g. "12 of 50 min"); when exceeded, the same line reads "Target reached — {elapsedMinutes} min" and switches to the `warning` color (text + wording, never color alone). When `plannedMinutes` is null, the line reads "No target set".
- A thin progress bar (`h-1.5 rounded-full bg-surface-muted` track, `bg-accent` fill, `bg-warning` when exceeded) sits below the secondary line, filled to `min(elapsed/planned, 1)` (capped at 100%); hidden entirely when `plannedMinutes` is null. Width transition uses `transition-all duration-base motion-reduce:transition-none`.
- Ticking: a `setInterval` of ~1000ms re-renders the display from the anchor (`elapsedSeconds + (now - responseInstant)`); cleared on pause, on unmount, and when the session is absent/completed. No `requestAnimationFrame` loop and no animation library.
- The anchor is replaced on every server response (pause/resume/finish/reload) — per implementation note 1.

**Controls — placement, labels, affordance.**
- Layout: a single row below the timer, centered, `flex flex-col sm:flex-row gap-3`, each button `min-w-[160px]` and ≥44px. Order: **Pause/Resume** (left/primary) then **Finish session** (right). On mobile they stack full-width.
- Pause/Resume is one button whose label and icon follow status: `ACTIVE` → `Pause` (icon `Pause`); `PAUSED` → `Resume` (icon `Play`). Variant `primary`, size `lg`.
- Finish session: variant `outline` with danger coloring (`border-danger text-danger hover:bg-danger/10`) so it reads as terminal without being a solid alarm; icon `Square` (stop). Label "Finish session".
- Disabled states: the affected control uses `isLoading` (spinner + disabled + `aria-busy`) while its request is in flight; the *other* control stays enabled per the in-flight guard, **except** Finish is also disabled while a pause/resume is in flight (and Pause/Resume disabled while Finish is in flight) to prevent concurrent transitions. A second activation is ignored (early-return guard).
- Failed transition: an inline `role="alert"` block beneath the controls shows `getErrorMessage(err)`; the control re-enables. On a 409 ("session changed"), the block additionally offers a "Reload session" button that re-runs the recovery read (`GET /study-sessions/current`) and re-anchors, rather than a full page reload. Other failures are retried by re-clicking the control.
- Completed state (after a successful finish): the controls are replaced by a non-editable summary card — "Session complete", "{durationMinutes} minutes recorded", and a "Back to assignments" `Button` (variant secondary) linking to `/assignments`. A muted note reads "You can review and adjust this session in your study history." (EP07E owns that surface; this is a forward link only, no navigation forced).

**Assignment & subtasks panel.**
- A `Card` (variant `outlined`, padding `md`) below the controls, titled "Assignment and subtasks" (`h2`). When the session has an `assignmentId`, the panel resolves the assignment from the one-time `GET /assignments` fetch and shows:
  - Assignment title (strong) + a compact meta line `Due {date} · {estimatedHours}h estimated` (estimated hours only if present; due date falls back to "No due date"; course name shown as a small muted prefix when present).
  - A subtask list: each row shows an icon (`CheckCircle2` for completed, `Circle` for pending) + `aria-hidden`, the title, and a text status ("Done" / "To do") — never color alone. Completed rows use `line-through text-text-muted`; pending rows use `text-text`.
  - A count line above the list: "Subtasks · {done} of {total} done" (or "No subtasks" when empty).
  - The list is scrollable independently when it exceeds `max-h-48` (`overflow-y-auto`) so the timer stays in view; the panel itself does not scroll the page.
- Read-only: no checkboxes, no mutation. Subtask editing stays on the assignment surfaces (EP03).
- Empty variant (no assignment / unresolvable id): inside the same card, an `EmptyState` with title "No assignment linked to this session", description "This session isn't tied to an assignment." and no action (the timer still works). No broken panel, no error.
- Loading (while the assignment list resolves): a small "Loading assignment…" line with `aria-busy="true"` inside the card; the timer and controls remain usable.

**Empty / loading / error states.**
- Loading the current session: a centered spinner + "Loading your session…" with `aria-busy="true"` on the main region; no write is issued.
- No open session: an `EmptyState` (icon `Timer` from lucide) with title "No focus session in progress", description "Start a session from an assignment to begin focusing.", and action `<Button as a Link to="/assignments">Go to assignments</Button>`.
- Transition error: as above (inline `role="alert"`).

**Live region and announcements.**
- A single `aria-live="polite"` `aria-atomic="true"` element (visually hidden via `sr-only`) carries the status text: "Focus session running" / "Focus session paused" / "Focus session complete". It is updated only when `status` changes (a `useEffect` keyed on `status`), never on a timer tick.
- The ticking digits are plain text with an `aria-label` naming the elapsed time; they are never in a live region.

**Keyboard behaviour.**
- Initial focus on load: when a session exists, focus moves to the primary control (Pause/Resume) after the recovery read resolves, so the timer is immediately operable; when no session, focus moves to the EmptyState's "Go to assignments" action. (Focus management via a ref + `useEffect` on the resolved state.)
- Tab order: "Focus session" badge (not focusable) → timer (not focusable, but its control is) → primary control → Finish → assignment panel content (read-only, no focusable elements unless a link is present) → "Back to assignments" (completed state).
- Escape: no-op in focus mode itself (no modal to close); Escape must not navigate away or end the session. (Dialogs introduced by EP07E handle their own Escape.)
- Focus restoration on leaving the screen is handled by the browser/router; no custom restoration beyond the standard.

**Responsive behaviour (375px).**
- Single column throughout; no horizontal scroll. Timer font scales `text-5xl sm:text-7xl`. Progress bar and secondary line are full width. Controls stack full-width on mobile (`flex-col sm:flex-row`) with ≥44px (Button's `max-sm:min-h-[44px]`). Assignment panel stacks below the controls; its subtask list scrolls internally (`max-h-48`) so the panel never forces page-level horizontal scroll.
- Tap targets: all buttons use size `lg` (or `md` with `max-sm:min-h-[44px]`), meeting ≥44px.

**Reduced motion.**
- Only token transitions: progress-bar width (`duration-base`), and none else. The Dialog primitive's reduced-motion overrides are inherited if a dialog is added later. The spinner uses `motion-reduce:animate-none` (already in Button). No new animations and no animation library. `prefers-reduced-motion` zeroes durations via the global rule plus the explicit `motion-reduce:` classes above.

**Copy (final).**
- Page title (document): "Focus session — StudyPilot".
- In-page heading: "Focus session" (h1).
- Mode badge: "Focus".
- Status text (live region): "Focus session running" / "Focus session paused" / "Focus session complete".
- Timer secondary: "{n} of {m} min" / "Target reached — {n} min" / "No target set".
- Subtask count: "Subtasks · {done} of {total} done" / "No subtasks".
- Subtask status text: "Done" / "To do".
- Controls: "Pause", "Resume", "Finish session".
- Transition error: `getErrorMessage(err)`; 409 adds "Your session changed. Reload to continue." with a "Reload session" button.
- Empty (no session): title "No focus session in progress", description "Start a session from an assignment to begin focusing.", action "Go to assignments".
- Empty (no assignment): title "No assignment linked to this session", description "This session isn't tied to an assignment."
- Completed summary: "Session complete", "{n} minutes recorded", note "You can review and adjust this session in your study history.", action "Back to assignments".
- Loading: "Loading your session…" / "Loading assignment…".

**Task selection.**
- Remains out of scope: this screen sends no `taskId` and offers no subtask picker; the subtask list is read-only (settled with EP07C). No mutation surface is added to focus mode.

**Tests to add / update (refined from the story's list; framework: Vitest + Testing Library, matching the EP07C pattern):**
- `apps/web/src/pages/focus/ui/FocusPage.test.tsx`:
  - an `ACTIVE` session is restored as running and the screen issues **no** write request on mount (mock client recorded only the `current` call);
  - a `PAUSED` session is restored as paused with the primary control showing "Resume";
  - no session renders the empty state with "Go to assignments", and sends no write;
  - the assignment title and its subtasks render, with completed subtasks distinguishable (icon + strikethrough + "Done");
  - a session without an assignment renders the in-panel empty variant;
  - a failed pause shows an actionable message and the control returns to the session's real state; a 409 offers "Reload session" which re-runs the recovery read;
  - the elapsed display matches the server's `elapsedSeconds` right after a response and advances afterwards;
  - the live region text is "Focus session running/paused/complete" and updates only on status change, not on a tick;
  - keyboard: initial focus lands on the primary control (session present) / the EmptyState action (no session); Tab reaches every control; Escape is a no-op.
- `apps/web/src/features/focus-session/ui/FocusTimer.test.tsx`:
  - renders the elapsed time in `MM:SS` (and `H:MM:SS` at ≥1h);
  - exposes the status in a polite live region and updates it on a state change, not on every tick;
  - the progress bar is hidden when `plannedMinutes` is null and capped at 100% when exceeded;
  - the pause/resume/finish controls are real buttons with accessible names and are disabled while a request is in flight.
- `apps/web/src/features/focus-session/ui/FocusAssignmentPanel.test.tsx`:
  - renders the assignment title, meta line and the subtask list, distinguishing unfinished from finished ones;
  - renders the empty variant when there is no assignment;
  - renders "Loading assignment…" while the list resolves.
- `apps/web/src/features/focus-session/model/useFocusSession.test.ts`:
  - the anchor/re-anchor logic (a server response replaces the local offset);
  - the recovery mapping (`ACTIVE` → running, `PAUSED` → paused);
  - the in-flight guard that prevents a double submit;
  - the tick interval is cleared on pause and on unmount.
- Responsive/reduced-motion are covered by the existing primitive tests and the manual a11y pass (TR-E07-08); no new automated assertions beyond the primitive's own.

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

## UI/UX decisions (settled 2026-10-30 — D07-5)

All gaps listed below are now settled; the authoritative, implementation-ready detail lives in Technical Notes → "UI/UX design" and "Decisions". This section is retained for traceability against the original gap list.

- **Focus-mode layout and information hierarchy.** Single centered column inside the standard `Layout`/header: mode badge → timer → controls → assignment panel. Standard shell retained; distraction reduction by content only.
- **Timer presentation.** `MM:SS`/`H:MM:SS` display; secondary "{n} of {m} min" / "Target reached" / "No target set"; thin capped progress bar (hidden when no target); 1s re-render from the server anchor.
- **Distraction reduction.** No nav hiding, no other assignments/deadlines/stats, no ambient or motion effects, no sound; "Focus" badge signals the mode.
- **Control placement and labelling.** Pause/Resume (primary, icon+text) then Finish session (outline, danger coloring) in a centered row that stacks on mobile; Finish is visually distinct and non-adjacent via spacing; icons from lucide-react.
- **Subtask visibility.** Read-only panel (`Card` outlined) with independently scrollable list (`max-h-48`); finished vs unfinished distinguished by icon + strikethrough + muted text + "Done"/"To do" text — never color alone; subtasks are read-only (no mutation).
- **Empty states.** No session: `EmptyState` + "Go to assignments"; no assignment: in-panel `EmptyState` variant; loading: spinner + "Loading your session…"/"Loading assignment…".
- **Error and recovery copy.** Failed transition: inline `role="alert"` with `getErrorMessage(err)`; 409 adds "Your session changed. Reload to continue." + "Reload session" button; other failures retried by re-clicking.
- **Announcement behaviour.** Single `aria-live="polite"` `aria-atomic` element updated only on status change ("Focus session running/paused/complete"); ticking digits are plain text with an `aria-label`, never announced.
- **Keyboard behaviour.** Initial focus moves to the primary control (session present) or the EmptyState action (no session); tab order badge→timer→primary→finish→panel→back link; Escape is a no-op in focus mode; no custom focus restoration beyond the router.
- **Responsive behaviour.** 375px single column, no horizontal scroll, timer `text-5xl sm:text-7xl`, controls stack full-width, panel subtask list scrolls internally, all targets ≥44px. No sticky bottom bar.
- **Reduced motion.** Token transitions only (progress-bar width); `motion-reduce:` overrides; spinner `motion-reduce:animate-none`; no animation library. `prefers-reduced-motion` zeroes durations via the global rule.
- **Completed state.** Non-editable summary ("Session complete", "{n} minutes recorded", history note, "Back to assignments") — EP07E owns adjust/history.
- **Task selection.** Out of scope: no `taskId` picker; subtasks read-only (settled with EP07C).
