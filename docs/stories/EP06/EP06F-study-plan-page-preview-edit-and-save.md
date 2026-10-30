# EP06F: Study-Plan Page — Generate, Preview, Edit and Save

**Story ID:** EP06F
**Title:** Frontend — the `/plan` page: generate a week, review the proposal, move/resize/delete a session and save the plan
**Parent epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Parent:** [EP06 breakdown](./README.md)
**Milestone:** M3
**Layer:** Frontend
**Status:** Needs refinement — a `ui-refiner` pass is required before implementation (D06-15).
**Dependencies:** EP06D implemented (the preview, the save and the read endpoints). EP06A implemented (the preferences the preview echoes).
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

## Summary

This is the epic's student-facing centre: the page where a student asks for a plan, reviews the proposed week, moves, resizes or deletes a proposed session, and saves the result. The proposal lives in the client until the save (D06-19), the save is atomic and re-checks every conflict on the server (D06-05), and the saved week is then shown.

## Description & bounded scope

### In scope

1. **The route** `/plan`, inside the `ProtectedRoute` block of `apps/web/src/app/App.tsx`, rendered within the standard `Layout` like every other page.
2. **The navigation entry** — one item in the shared `Planning` group of `apps/web/src/widgets/header/ui/navGroups.ts` (the shared nav contract, EP11's file, edited additively — the desktop header and the mobile drawer both read it, so there is no drift).
3. **The entity client** `apps/web/src/entities/study-plan/api/studyPlanApi.ts` (and its types in `apps/web/src/entities/study-plan/model/types.ts`) — `previewStudyPlan()`, `saveStudyPlan(sessions)` and `listStudyPlan(from, to)`, over the shared axios transport.
4. **The page** `apps/web/src/pages/plan/ui/PlanPage.tsx` and its feature components under `apps/web/src/features/study-plan/ui/`:
   - **the week view** — the seven days of the window with their proposed sessions;
   - **the generate action** — calls `POST /study-plans/preview` and shows the proposal (including the effective preferences the plan was built with);
   - **the editing interactions** — move a proposed session to another slot, resize it, and delete it, all **in the preview** (D06-05). **There is no free-form "add a session" affordance** (the epic does not require it);
   - **the save action** — sends the edited session list to `POST /study-plans` and then shows the saved week (or the conflict it was rejected with);
   - **the saved-plan view** — `GET /study-plans` renders the persisted week, so a reload shows what was saved.
5. **The states** — the initial (no plan generated yet), the generating, the empty week (no schedulable work), the error (the preview or the save failed), the conflict (the save was rejected with per-session reasons) and the saved confirmation.
6. **Tests** — the page and component tests (TR-E06-06).

### Out of scope

- The remaining-work list and the deficit warnings — **EP06G** (they are sections on this page, added by a later child).
- The preferences surface — **EP06E**.
- The engine, the persistence and the endpoints — **EP06D**.
- **Editing a session after it is saved** — out of EP06's scope per D06-05; regenerating the week is the way to change a saved plan (recorded as **FU-EP06-01**).
- Adding a session that the engine did not propose (no create affordance).
- The calendar read model and the dashboard widget — **not EP06's** (D06-18, seam V-05-1).
- Any navigation or information-architecture redesign (EP11's).

## Source requirement references

- **Epic AC-E06-06** ("Students can review and edit proposed sessions before saving") — the frontend half.
- **Epic AC-E06-03 / AC-E06-04 / AC-E06-05 / AC-E06-07** — the student-facing half of what the preview shows (the windows the plan respects, the conflicts it avoided, the deadline order, the warnings).
- **TR-E06-06** (this child's test obligations) and **TR-E06-09** (the recorded manual accessibility pass).
- **Shared DoD** — items 1, 2, 4, 5, 6, 7, 8 apply; items 10/11 belong to the combined EP06 parent review.
- **Decisions:** D06-3 (the 7-day window the page shows), D06-5 (the editing model), D06-11 (the structured warnings the page renders), D06-12 (the advisory availability window and daily cap for a manual edit), D06-13 (the replace semantics the save performs), D06-15 (this story's `Needs refinement` status), D06-19 (the client-held proposal); and the parent README's **Shared API/data contract** → *Endpoints*, *The save, the edits and the conflict re-check* and the `PlanPreview`/`SavedPlan` payloads.

## Acceptance criteria

1. `/plan` is a protected route rendered inside the standard layout, and it appears once in the shared navigation (the Planning group) so the desktop header and the mobile drawer show the same entry.
2. The page's initial state offers a way to generate a plan; generating calls `POST /study-plans/preview` and renders the seven days of the window with their proposed sessions, the effective preferences the plan was built with, and any warnings the preview returned.
3. A proposed session can be **moved** to another slot, **resized** to another length, and **deleted** — all inside the preview, before saving. There is no control that adds a session the engine did not propose.
4. The save sends the edited session list to `POST /study-plans`; on success the page shows the **saved** week (the server's response) and the student is told the plan was saved.
5. A save rejected with a 409 is presented as a conflict: each offending session is identified (its day and time) with the reason, the proposal stays on screen so the student can fix it, and **nothing** was saved.
6. A failed preview or save shows a readable, actionable message; the page never shows a partially applied plan, and the previously saved week stays visible.
7. The page reads the saved plan on mount, so a reload shows the saved week; when no plan is saved the page says so plainly rather than showing an empty week that looks like a failure.
8. Every control is reachable and operable with the keyboard, has a visible focus ring and an accessible name; the page is usable at a 375px viewport; the moving and resizing interactions have a non-pointer path.
9. The page tests cover the generate → preview → move → resize → delete → save journey, the saved-plan view, the conflict presentation and the loading/empty/error states.

## Tests to add / update

- `apps/web/src/features/study-plan/ui/PlanWeek.test.tsx` (new) — the week view:
  - the seven days render in order with their sessions;
  - a session shows its assignment, its time range and its length;
  - the empty week renders the empty state, not a blank grid;
  - the day and the session are identified for assistive technology (the accessible name of each session control).
- `apps/web/src/features/study-plan/ui/PlanSessionEditor.test.tsx` (new) — the editing controls:
  - moving a session to another slot produces the updated session list;
  - resizing a session produces the updated length;
  - deleting a session removes it from the list;
  - the controls are operable with the keyboard;
  - a session is never moved or resized outside the limits the control enforces.
- `apps/web/src/pages/plan/ui/PlanPage.test.tsx` (new) — the page:
  - the initial state offers the generate action;
  - generating renders the preview's days and sessions;
  - the save posts the edited list and renders the saved week;
  - a 409 is rendered as a conflict with the offending session and the reason, and the proposal stays;
  - a failed preview renders a readable error;
  - the saved plan is read on mount.
- `apps/web/src/entities/study-plan/api/studyPlanApi.test.ts` (new) — the client calls the right method and path and unwraps the payloads.

## Technical notes

### Verified baseline (inspected 2026-10-30 at HEAD `9b1ec19`)

- `apps/web/src/app/App.tsx:37-60` — the `ProtectedRoute` block; every page route is inside it and rendered within the standard `Layout` (`:22-66`).
- `apps/web/src/widgets/header/ui/navGroups.ts:74-84` — the `Planning` group (`Calendar`, `Availability`); the account menu (`:95-106`) is the secondary surface. The file is the shared nav contract: the desktop header (`:433`) and the mobile drawer both call `getNavGroups`, so one entry reaches both.
- `apps/web/src/pages/calendar/ui/CalendarPage.tsx` and `apps/web/src/features/calendar/ui/WeekView.tsx` — the closest existing week-shaped surface in the codebase, and the reference for how a week is rendered in this app (including EP04's open follow-up **FU-EP04-01**, which is about the calendar page's browser-local week range — the plan page must not repeat that mistake: the plan's week comes from the **server's** `from`/`to` and its `timeZone`, never from the browser's date).
- `apps/web/src/features/availability/ui/AvailabilitySlotForm.tsx`, `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx` (a focus-trapped dialog with Escape and focus restoration — the reusable details-dialog pattern) and `apps/web/src/shared/ui/Dialog.tsx` — the interaction and dialog precedents.
- `apps/web/src/shared/ui/` — the EP10 primitives (`Button`, `Input`, `Select`, `Card`, `Dialog`, `Badge`, `EmptyState`); the semantic tokens are in `apps/web/tailwind.config.js` + `apps/web/src/index.css`; tap targets are ≥ 44px; focus rings are visible; reduced motion comes from the token durations.
- `apps/web/src/shared/lib/errors.ts` — `getFieldError` / `getErrorMessage`, the shared error helpers; `apps/web/src/shared/api/httpClient.ts` — the shared transport (base URL `/api`).
- `apps/web/src/features/dashboard/ui/TodayStudySessionsSection.tsx` (EP05) and `apps/web/src/features/calendar/ui/CalendarEventChip.tsx:26-31` — the type-icon + label convention and the "no session row is a dead link" convention.
- `apps/web/.eslintrc.cjs` — the FSD layer rules; the `@/` alias points at `apps/web/src`.

### Implementation notes (concrete)

1. **The client.** `previewStudyPlan(): Promise<PlanPreview>` → `POST /study-plans/preview`; `saveStudyPlan(sessions: ProposedSessionInput[]): Promise<SavedPlan>` → `POST /study-plans`; `listStudyPlan(from: string, to: string): Promise<SavedPlan>` → `GET /study-plans?from&to`. The types mirror the API contract exactly — the client's `PlanPreview`/`SavedPlan` shapes are the server's payloads, unchanged.
2. **The proposal lives in the client (D06-19).** The page holds the preview's sessions in component state and edits them there. Nothing is persisted until the save. The page must not keep a second copy of the saved week that can drift from the server's — the saved view is rendered from the server's response.
3. **The move and resize interactions.** The exact interaction model (drag-and-drop, a slot picker, a form with day and time inputs, or a combination) is **undecided and is the `ui-refiner`'s to settle** (see the gaps below). Whatever is chosen must have a **keyboard-operable path** (DoD 6) — a drag-only interaction would not satisfy it.
4. **The window is the server's.** The page renders the seven days of the `from`/`to` the server returned and labels them with the server's `timeZone`. It never computes "today" from the browser's clock (the FU-EP04-01 lesson).
5. **The conflict presentation.** A 409's `conflicts` array is rendered per session (the day, the time range and the reason). The reason codes (`OVERLAPS_CLASS`, `OVERLAPS_BLOCKED_TIME`, `OVERLAPS_CONFIRMED_SESSION`, `OVERLAPS_PLANNED_SESSION`) are mapped to student-facing wording by the page — the copy is part of the `ui-refiner` pass.
6. **The states.** The initial state (no plan yet), the generating state (the generate control is in flight), the empty week (the engine proposed nothing — the empty state explains why and points at the next step), the error state (the preview failed) and the saved confirmation. The empty state must not read as a failure.
7. **`ui-refiner` pass.** This story's layout, the week grid's structure, the session card's content, the move/resize/delete interaction model, the conflict presentation, the empty/loading/error copy, the responsive behaviour and the keyboard behaviour are settled by the `ui-refiner` **before** implementation, and this file is amended in place by that pass.

### Risks / open questions (none blocking)

- **The move/resize interaction is the hard part of this story.** A week grid invites drag-and-drop, which is inaccessible by default and hard to test. The `ui-refiner` must settle a model with a first-class keyboard path (a slot picker or an explicit day/time control), and the tests must drive that path.
- **A regeneration loses the manual edits (FU-EP06-01).** After a save, the only way to change the plan is to generate a new proposal, which is computed from the current remaining work and therefore does not carry the previous manual edits. The page must not imply that the saved plan can be edited in place.
- **The page's week is the server's, not the browser's.** The student may be in a different zone from the browser; the server's `from`/`to`/`timeZone` are the truth (and the label of each day must state the zone).
- **The preview is recomputed on every generate.** Two generates with unchanged inputs produce the same proposal (the engine is deterministic), so a student who generates twice sees the same week — that is a feature, and the page must not imply randomness.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is handled — the editing controls enforce the limits they expose (a valid time range, a length inside the session bounds, a slot inside the window) before the request, and the server remains authoritative.
3. Academic data is scoped to the authenticated student — the endpoints are scoped server-side (EP06D); the client sends no user id and no owner field.
4. API errors produce actionable messages — a 409 is presented per session with its reason, a 400 with its field errors, and any other failure with a readable message.
5. Loading, empty and error states are handled — the initial, generating, empty-week, error, conflict and saved states.
6. Core interactions support keyboard accessibility — every control is a native element with a visible focus ring and an accessible name; moving and resizing have a keyboard path.
7. Responsive layouts work on desktop and mobile — the week view is usable at 375px and at desktop widths.
8. Business rules have automated tests — the week view, the editor, the page and the client tests (TR-E06-06).
9. API changes are documented — not applicable in this story (no API change); the payloads are EP06D's and live in the parent README.
10. Integrated review — the combined EP06 parent review.
11. Reviewer walkthrough — the combined EP06 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** the student can generate a week, read the proposal, move, resize and delete a proposed session, and save the plan — with the server's conflicts surfaced and the saved week persisted and re-readable.

- **Request/token estimate:** 2–3 requests/tokens — a route, a nav entry, an entity client, the week view, the session editor (with a keyboard path), the page with its states, and four test files. The upper end of the band is warranted because the editing interaction is the part most likely to need more than one pass: a week grid plus three editing gestures plus the conflict presentation is a substantial surface.
- **Model recommendation:** 4 — the difficulty is not the data flow but the editing interaction on a week grid: it must be deterministic, keyboard-operable, testable and responsive at the same time, and a plausible-looking implementation that fails the keyboard or the narrow-screen requirement is the expected failure mode. A frontier model is recommended for the editor's interaction design and its tests.
- **Files:**
  - `apps/web/src/entities/study-plan/model/types.ts` (new);
  - `apps/web/src/entities/study-plan/api/studyPlanApi.ts` (new);
  - `apps/web/src/entities/study-plan/api/studyPlanApi.test.ts` (new);
  - `apps/web/src/features/study-plan/ui/PlanWeek.tsx` (new);
  - `apps/web/src/features/study-plan/ui/PlanWeek.test.tsx` (new);
  - `apps/web/src/features/study-plan/ui/PlanSessionEditor.tsx` (new);
  - `apps/web/src/features/study-plan/ui/PlanSessionEditor.test.tsx` (new);
  - `apps/web/src/pages/plan/ui/PlanPage.tsx` (new);
  - `apps/web/src/pages/plan/ui/PlanPage.test.tsx` (new);
  - `apps/web/src/app/App.tsx` (modify — the route);
  - `apps/web/src/widgets/header/ui/navGroups.ts` (modify — the nav entry).
- **Start context:** this story file; the parent README's shared API/data contract → *Endpoints*, *The save, the edits and the conflict re-check*, the `PlanPreview`/`SavedPlan` payloads, and the decision register (D06-3, D06-5, D06-11, D06-12, D06-13, D06-15, D06-19); EP06D's story file (the three endpoints and their exact payloads); `apps/web/src/app/App.tsx`; `apps/web/src/widgets/header/ui/navGroups.ts`; `apps/web/src/features/calendar/ui/` (the week-shaped precedent); `apps/web/src/shared/ui/` (the EP10 primitives); `apps/web/src/shared/lib/errors.ts`. Do not read unrelated epic stories.
- **Verification:** `pnpm --filter web test -- Plan` (the page, the week view and the editor tests); `pnpm --filter web test` (the whole web suite — the nav and route changes must not break the dashboard or the calendar); `pnpm --filter web typecheck`; `pnpm --filter web lint`; a manual browser pass at a 375px viewport and with the keyboard only (recorded as part of TR-E06-09's evidence).
- **Dependencies / exclusions:** EP06D implemented (EP06A too, for the preferences the preview echoes). Excludes the remaining-work and deficit sections (EP06G), the preferences surface (EP06E), editing a saved session (FU-EP06-01), adding a session that was not proposed, the calendar read model (D06-18), and any navigation redesign.

## UI/UX gaps for the `ui-refiner`

**This story needs a `ui-refiner` pass before implementation (D06-15).** The gaps, recorded here so the pass can settle them:

1. **The move interaction.** How a proposed session is moved: drag-and-drop on the week grid, a "move to…" slot picker, explicit day and time inputs, or a combination. Whichever is chosen needs a first-class keyboard path — a drag-only model cannot satisfy DoD 6.
2. **The resize interaction.** How a session is resized: dragging an edge, a length select, or explicit start/end inputs; whether the length is constrained to the session-length bounds the student's preferences define, and what happens when the resized session no longer fits its slot.
3. **The delete interaction.** Whether deleting is immediate or needs a confirmation, and whether the deletion is undoable (and, if so, how the undo is exposed to a screen reader).
4. **The week grid's structure.** Seven columns versus a list of seven day sections; the row height; what a session looks like (the assignment title, the time range, the length, the course); how a day with no sessions looks; how the days are labelled (the date, the weekday, the zone).
5. **The information hierarchy.** What the page leads with — the generate action, the saved week, or the warnings; where the effective preferences are shown; how the "no plan yet" state differs from the "nothing to schedule" state.
6. **The conflict presentation.** How the per-session conflict reasons are worded and where they appear (inline under the session, in a summary above the week, or both); whether the offending session is highlighted in the grid.
7. **The empty, loading and error copy.** The exact wording for the initial state, the empty week, the failed preview and the saved confirmation — calm and factual, following EP05's empty-state convention (no state may read as a broken feature).
8. **The responsive behaviour.** The grid at 375px (a vertical day list is the likely answer), the editing controls' layout on a narrow screen, and the touch-target sizes.
9. **The keyboard behaviour.** The tab order across the week, the focus movement after a move/resize/delete, the focus behaviour after the save, and the live-region announcements for the edit actions.
