# EP13D — Plan Visibility and One-Tap Start

**Story ID:** EP13D
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend (+ one additive backend calendar event — see Technical notes / flagged for the implementer)
**Status:** Implemented — awaiting parent review (2026-11-14; record `./artifacts/EP13D/implementation.md`)
**Refined:** 2026-11-14 (ui-refiner)
**Dependencies:** EP13B (`POST /study-sessions/from-planned/:id`), EP13C (`GET /study-plans/today`) — both implemented.
**Jira key:** Pending creation

## Summary

The plan is invisible where the student lives: planned sessions appear
neither on the calendar (EP06's V-05-1 was never built) nor on the dashboard,
and focus sessions can only be started from assignment rows. This story puts
**today's plan on the dashboard with one-tap start** — one card that answers
"what now?", lists the rest of today with live statuses, and shows the
minutes already studied — and renders planned sessions on the calendar as
their own event type. It also fixes the focus default:
`resolveDefaultSessionMinutes` reads `studyDefaults.sessionMinutes`, a key
EP06 never writes (the contract key is `sessionLengthMinutes`), so the saved
preference is silently ignored and every focus session defaults to 25
minutes.

Starting is the core ADHD deficit; after this story the landing screen offers
exactly one obvious next action, one tap away from a running timer.

## Scope

**In scope:**
- A new dashboard card, **"Today's plan"** (`features/today-plan/`), fed by
  `GET /study-plans/today`: a "Next up" hero with a primary **Start focus**
  button, the rest of today's sessions as compact rows with status badges
  and their own quiet Start buttons, and a "{n} min studied today" chip.
- One-tap start from any startable row via
  `POST /study-sessions/from-planned/:plannedSessionId`, then navigate to
  `/focus`; 409/404 handled inline.
- Calendar: a `PLANNED_SESSION` event type rendered as its own chip
  ("Planned", distinct icon), in both week and agenda layouts. **Requires an
  additive backend emission** in the calendar service (see Technical notes).
- Fix `resolveDefaultSessionMinutes` to read `sessionLengthMinutes`.
- Component/accessibility/responsive tests (TR-E13-04) and a recorded manual
  a11y pass (TR-E13-14).

**Out of scope:**
- Recovery/catch-up reframing and navigation (EP13E); micro-start and
  absorption (EP13J); momentum displays (EP13K); flex presentation (EP13H).
- A "not today" dismissal (see Decision D-D5 — no endpoint exists).

## Source requirement references

- Epic AC-E13-03 (UI half), AC-E13-05, AC-E13-12 (copy rule D13-9).
- Shared DoD 1, 2, 4, 5, 6, 7, 8. TR-E13-04, TR-E13-14. Seams V-05-1, V-07-1.

## Acceptance criteria

1. The dashboard shows a **"Today's plan"** card above the existing section
   grid: a "Next up" hero (the server's `nextSession`), the remaining
   sessions with live status badges, and the day's confirmed minutes.
2. **Start focus** on the hero (or any startable row) starts that planned
   session and lands the student in the running focus session in one
   interaction; an already-open session (409) offers "Go to your session"
   instead of failing silently.
3. Planned sessions render on the calendar week and agenda views as their own
   event type, visually and textually distinct from logged study sessions.
4. The focus-session default duration honors the saved `sessionLengthMinutes`
   preference (bug fix), still clamped 5–480 with the 25-minute fallback.
5. All states are handled: loading, no plan (with "Generate a plan"), nothing
   left today (celebratory-neutral), and error (with "Try again"). No
   compliance percentages and no shaming copy (D13-9); keyboard operable with
   visible focus; usable at 320px.

## Tests (TR-E13-04)

Vitest + React Testing Library, colocated `*.test.tsx` (repo convention):

- `TodayPlanCard.test.tsx` — hero renders the server's `nextSession`; rows
  render statuses; the chip appears only when minutes > 0; loading skeleton;
  error + "Try again" calls refetch; `NO_PLAN` empty state exposes
  "Generate a plan"; `NOTHING_LEFT_TODAY` renders the done state; copy
  contains no "%" compliance string and none of the blame terms the EP08
  tests pin.
- `useStartPlannedSession.test.ts` — success calls the endpoint then
  navigates to `/focus`; 409 sets the conflict state with "Go to your
  session"; 404 shows the stale-session message and triggers a refetch;
  double-click starts once.
- `TodayPlanCard.a11y.test.tsx` (or cases inside the card test) — every
  control reachable by keyboard with a visible focus ring, status conveyed by
  text not colour alone, the card's error uses `role="alert"`.
- `CalendarEventChip.test.tsx` (extend) — a `PLANNED_SESSION` event renders
  the "Planned" label and its own icon; accessible name includes the label.
- `resolveDefaultSessionMinutes.test.ts` (extend) — reads
  `sessionLengthMinutes`; bounds and fallback cases unchanged.

## Technical notes

### Inspected code (2026-11-14, ui-refiner)

- `pages/dashboard/ui/DashboardPage.tsx` — page owns the request window, a
  **single** `role="status"` live region with the count summary, the urgency
  grid (`grid gap-6 lg:grid-cols-2`), and one shared assignment-dialog mount.
- `features/dashboard/ui/dashboardSection.ts` — `DashboardSectionStatus`,
  `DashboardSectionBaseProps` (`status`/`error`/`isFetching`/`onRetry`/
  `emptyState`), `eventTimeRange`, section caps.
- `features/dashboard/ui/TodayStudySessionsSection.tsx` — the canonical
  section shape: `card p-4 sm:p-6`, skeletons with `motion-reduce:animate-none`,
  `role="alert"` error + "Try again", `EmptyState`, `max-sm:min-h-[44px]`.
- `features/focus-session/model/useStartFocusSession.ts` — the start/409/
  navigate pattern this story mirrors.
- `features/calendar/ui/CalendarEventChip.tsx` — `TYPE_META` icon + text
  label per type, colour only as a secondary 3px border cue.
- `entities/study-plan/api/studyPlanApi.ts`, `entities/study-session/api/studySessionApi.ts`
  — plain axios entity clients; feature RTK Query slices decorate them via
  `entityBaseQuery` (`features/calendar/api/calendarApi.ts`).
- `apps/api/src/modules/calendar/calendar.service.ts` — **the calendar event
  list is built server-side**; the client cannot invent a new event type.

### Flagged for the implementer (technical, not UI/UX)

1. **AC3 needs an additive backend change**: emit `PLANNED_SESSION` events
   from the calendar service (`planned_sessions` joined through
   `studyPlan.userId`, within the requested range, `id: 'planned:<id>'`,
   `assignmentId` set, `focus: false`, `link: null`), extend the server's
   event union + the client `CalendarEventType`. The story is therefore
   cross-layer despite its Frontend label.
2. Add the client types/clients: `TodayPlan`/`TodaySession` in
   `entities/study-plan/model/types.ts`, `getTodayPlan()` in its api module,
   `startSessionFromPlanned(plannedSessionId)` in the study-session api
   module, and `plannedSessionId` on the `StudySession` type (the API has
   returned it since EP13B).
3. New feature slice `features/today-plan/api/todayPlanApi.ts` (RTK Query over
   the entity client, `keepUnusedDataFor: 60` like `calendarApi` — the payload
   embeds the server's "today").

### Decisions (ui-refiner, 2026-11-14)

| ID | Question | Decision + rationale |
|---|---|---|
| D-D1 | Where does the "what now" surface live? | **One full-width card directly under the page header/live region, above the existing 2-column grid.** The single next action must be the first thing seen (ADHD initiation); the grid keeps EP05's documented urgency order untouched below it. |
| D-D2 | One hero card plus a separate list card, or one merged card? | **One merged card** (`TodayPlanCard`): hero + rows + minutes chip. Two cards about today would double the surface area and compete for attention; merging keeps one place for "today". |
| D-D3 | What happens to EP05's "Today's study sessions" section? | **Unchanged.** It reports *logged* sessions (the calendar's `STUDY_SESSION` events); the new card reports *the plan*. Removing or renaming it would regress an EP05 AC for no gain. |
| D-D4 | Hero contents and primary action copy | "Next up" label, assignment title (`text-lg font-semibold`), `{startTime} – {endTime} · {n} min`, primary `<Button size="lg">Start focus</Button>`. No duration picker here (EP13J owns micro-start). |
| D-D5 | Does a "not today" / dismiss control ship? | **No.** No endpoint sets `SKIPPED` (EP13C only reserves the status), so shipping it would mean backend scope creep; dismissal is also lower ADHD value than starting. Revisit in EP13E/EP13J. |
| D-D6 | Can the student start a session other than the suggested one? | **Yes** — every startable row carries its own quiet `variant="outline" size="sm"` Start button. Forcing the suggestion would fight the "pick what I can face" reality. |
| D-D7 | Status presentation on rows | Text badges, never colour alone: `Planned`, `In progress`, `Done`, `Moved forward` (`RESCHEDULED`), `Set aside` (`SKIPPED`). Reuses `Badge` (`variant="accent"` for in progress, default otherwise). |
| D-D8 | Calendar treatment of planned sessions | Own `TYPE_META` entry: icon `CalendarClock`, label **"Planned"**; non-`SCHEDULED` rows append a status word (`Planned · done`). Icon + text, consistent with the existing non-colour-only rule; `link: null` (no deep link that goes nowhere). |
| D-D9 | Empty / nothing-left / error copy | `NO_PLAN` → `EmptyState` "No plan for today yet" / "Generate a plan to get a next step for today." / action **"Generate a plan"** → `/plan`. `NOTHING_LEFT_TODAY` → "Today's plan is done" + "{n} minutes studied today. Anything else is a bonus." Error → "We couldn't load today's plan." + "Try again". Loading → three pulse skeleton rows with `motion-reduce:animate-none`. |
| D-D10 | Start failures | 409 open session → inline `role="alert"` + **"Go to your session"** (navigates `/focus`); 409 not-today/not-startable and 404 → "That session isn't on today's plan any more." + automatic refetch; other errors → the server message, else "We couldn't start that session. Try again." |
| D-D11 | Minutes chip | Render "{n} min studied today" only when `confirmedMinutesToday > 0`; never a percentage of the plan (D13-9). |
| D-D12 | Responsive behaviour | Card is full-width at every breakpoint. Below `sm`: hero stacks (label, title, meta, full-width button) and row controls become full-width; all touch targets `max-sm:min-h-[44px]`. At ≥`sm` the hero is a row with the button right-aligned. |
| D-D13 | Announcements | The page already owns exactly **one** `role="status"` region; the card adds **no** second live region. Start failures are `role="alert"` inside the card (an error, not a status). |

### Component plan (Feature-Sliced Design)

| Component / module | Placement | Why |
|---|---|---|
| `TodayPlanCard` | `features/today-plan/ui/` (new) | The card itself; mirrors the dashboard section shape and props (`status`/`error`/`isFetching`/`onRetry`). |
| `TodayPlanRow` | `features/today-plan/ui/` (new) | One session row: time, title, status badge, optional Start. |
| `useStartPlannedSession` | `features/today-plan/model/` (new) | Start/409/navigate, mirroring `useStartFocusSession`. |
| `todayPlanApi` | `features/today-plan/api/` (new) | RTK Query slice over the entity client. |
| `Button`, `Badge`, `EmptyState`, `Card` styles | `shared/ui/` (reuse) | Design-system primitives already used by every dashboard section. |
| `CalendarEventChip` | `features/calendar/ui/` (extend) | One new `TYPE_META` entry — no new component. |

## Definition of Done

1. Functional criteria pass (AC-E13-03 UI, AC-E13-05).
2. Client handles the documented 400/404/409 contracts (D-D10).
3. N/A (server-side scoping; the client sends no foreign ids).
4. API errors surfaced with actionable messages.
5. Loading/empty/error states per D-D9.
6. Keyboard accessibility; 7. responsive layouts per D-D12.
8. Automated tests (TR-E13-04).
9. N/A for the frontend; the additive calendar event is documented in the
   implementation record.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** today's plan is visible on the dashboard and startable in one tap; planned sessions appear on the calendar; the focus default honours the saved preference.
- **Estimate:** 3 requests/tokens (card + hook + slice + calendar type + bug fix + tests).
- **Model recommendation:** 3 — composition over established patterns; the risk is UX breadth, not algorithms.
- **Production files:** `features/today-plan/*` (new), `entities/study-plan/{api,model}`, `entities/study-session/{api,model}`, `features/calendar/ui/CalendarEventChip.tsx`, `entities/calendar/model/types.ts`, `pages/dashboard/ui/DashboardPage.tsx`, `features/focus-session/model/resolveDefaultSessionMinutes.ts`, plus `apps/api/src/modules/calendar/calendar.service.ts` (+ spec) for the additive event.
- **Minimal start context:** this story, EP13 README endpoints, EP13B/EP13C implementation records, `DashboardPage.tsx`, `TodayStudySessionsSection.tsx`, `useStartFocusSession.ts`, `CalendarEventChip.tsx`, `calendarApi.ts`.
- **Verification:** `pnpm --filter @studypilot/web test`, `pnpm --filter @studypilot/api test`, lint, typecheck.
- **Dependencies:** EP13B, EP13C (both implemented). Blocks EP13J, EP13K.
- **Exclusions:** nav/recovery reframing (EP13E), micro-start (EP13J), momentum (EP13K).

## Tracker reference

Jira key: Pending creation (no sync authorized).
