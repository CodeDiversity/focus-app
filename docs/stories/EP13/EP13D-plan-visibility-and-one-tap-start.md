# EP13D — Plan Visibility and One-Tap Start

**Story ID:** EP13D
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend
**Status:** Needs refinement (ui-refiner required, D13-14)
**Dependencies:** EP13B (from-planned API), EP13C (today API) implemented.
**Jira key:** Pending creation

## Summary

The plan is invisible where the student lives: planned sessions appear
neither on the calendar (EP06's V-05-1 was never built) nor on the dashboard,
and focus sessions can only be started from assignment rows. This story puts
planned sessions on the calendar as a `PLANNED_SESSION` event type, adds a
dashboard "Today" section fed by `GET /study-plans/today`, and gives the
dashboard one prominent "what now" card: the single recommended next session
with a one-tap "Start focus" that calls the from-planned endpoint. Starting
is the core ADHD deficit; this story makes it one tap from the landing
screen. It also fixes the focus default bug: `resolveDefaultSessionMinutes`
reads `studyDefaults.sessionMinutes`, a key EP06 never writes — the saved
`sessionLengthMinutes` preference is silently ignored (V-07-1 outcome).

## Scope

**In scope:**
- Calendar: `PLANNED_SESSION` event type (service + week/agenda rendering),
  visually distinct from actual `STUDY_SESSION` events and deadlines.
- Dashboard: "Today" section (today's planned sessions with live statuses)
  + the "what now" card (next session, one-tap start, states for
  nothing-left/no-plan with a generate-plan path).
- Start focus from any of today's planned sessions (list + card).
- Optional explicit "not today" dismissal marking a session `SKIPPED` —
  include only if the ui-refiner keeps it.
- Fix `resolveDefaultSessionMinutes` to read `sessionLengthMinutes` (bounds
  logic unchanged); update its unit tests.
- Component tests (TR-E13-04); recorded manual a11y pass (TR-E13-14).

**Out of scope:**
- Recovery/catch-up reframing and navigation (EP13E). Micro-start (EP13J).
- Momentum displays (EP13K). Flex presentation (EP13H).

## Source requirement references

- Epic AC-E13-03 (UI half), AC-E13-05, AC-E13-12 (copy rule D13-9).
- Shared DoD 1, 2, 4, 5, 6, 7, 8. TR-E13-04, TR-E13-14. Seams V-05-1, V-07-1.

## Acceptance criteria

1. Planned sessions render on the calendar week and agenda views as their own
   event type, in the profile time zone, without crowding the existing event
   types (D404-12's uncluttered-calendar rationale applies).
2. The dashboard shows today's reconciled sessions with their statuses and a
   single "what now" card; tapping "Start focus" lands the student in the
   running focus session in one interaction (navigation included).
3. The focus-session default duration honors the saved `sessionLengthMinutes`
   preference (bug fix verified by test), still clamped 5–480 with the 25-min
   fallback.
4. All states handled: loading, no plan (with a path to generate one),
   nothing left today (celebratory-neutral copy), error. No compliance
   percentages, no shaming copy (D13-9).
5. Keyboard: the card and session rows are fully operable; focus moves
   sensibly into the focus page on start.

## Tests (TR-E13-04)

- Calendar service/component: planned events mapped, typed and rendered;
  agenda fallback below 640px.
- Dashboard: today list + card rendering per state matrix; start-focus flow
  (mocked API) including 409 open-session handling (route to the running
  session).
- `resolveDefaultSessionMinutes`: reads `sessionLengthMinutes`; fallback and
  bounds cases.
- Copy assertions: no shaming terms, no percentages.
- Keyboard operability; narrow-screen snapshot.

## Technical notes

- **Inspected (2026-11-14):** `resolveDefaultSessionMinutes.ts` (the wrong
  key, full read); calendar lacks a PLANNED_SESSION type (summary-level);
  dashboard `TodayStudySessionsSection` shows actual sessions only
  (summary-level — re-verify file paths at implementation).
- **Proposed:** extend `calendar.service.ts` event union + calendar feature
  slices; new dashboard feature folder `features/today-plan/` (FSD layers per
  SP-109); RTK Query endpoints for today + from-planned.
- **UI/UX gaps for the ui-refiner (D13-14):** what-now card layout/hierarchy
  vs. the existing dashboard sections; planned-event visual treatment on the
  calendar; whether "not today" (SKIPped) exists and how it reads;
  nothing-left copy; empty/no-plan framing; responsive layout of the today
  section.

## Definition of Done

1. Functional criteria pass (AC-E13-03 UI, AC-E13-05).
2. Client-side validation mirrors API contracts (409/404 handling).
3. N/A (scoping is server-side; client sends no foreign ids).
4. API errors surfaced with actionable messages.
5. Loading/empty/error states (state matrix above).
6. Keyboard accessibility; 7. responsive layouts.
8. Automated tests (TR-E13-04).
9. N/A (no API/migration; consumes EP13B/C contracts).
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** the plan is visible on calendar + dashboard and startable in one tap; focus default honors the saved preference.
- **Estimate:** 3 requests/tokens (three surfaces + state matrices + a11y).
- **Model recommendation:** 3 — composition over existing patterns; risk is UX breadth, not algorithms.
- **Production files:** `apps/web/src/pages/calendar/*`, `apps/web/src/features/today-plan/*` (new), dashboard page wiring, `features/focus-session/model/resolveDefaultSessionMinutes.ts`, calendar service.
- **Test files:** colocated component/unit tests per feature.
- **Minimal start context:** this story + ui-refiner record, EP13 README endpoints, EP13B/C implementation records, calendar service, SP-109 FSD rules.
- **Verification:** `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13B, EP13C, ui-refiner pass. Blocks EP13J, EP13K (dashboard placement).
- **Exclusions:** nav/recovery reframing (EP13E), micro-start (EP13J), momentum (EP13K).

## Tracker reference

Jira key: Pending creation (no sync authorized).
