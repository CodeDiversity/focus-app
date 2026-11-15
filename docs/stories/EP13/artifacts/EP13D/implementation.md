# EP13D implementation record

**Story:** [EP13D — Plan Visibility and One-Tap Start](../../EP13D-plan-visibility-and-one-tap-start.md) (ui-refined 2026-11-14, commit `bd06a9e`)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-14
**Commit scope:** `apps/web/src/**` (new `features/today-plan/`, entity contracts/clients, dashboard page, calendar chip/details, focus default, store + test harness) and `apps/api/src/modules/calendar/**` (additive `PLANNED_SESSION` emission + spec). No migration.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| 1 — a "Today's plan" card above the grid with hero, rows and the day's minutes | **Done.** `TodayPlanCard` (full width, directly under the header per D-D1/D-D2) renders the server's `nextSession` as a "Next up" hero, the rest as `TodayPlanRow`s with text status badges, and a "{n} min studied today" chip when minutes > 0. | `TodayPlanCard.test.tsx` (10 tests); `DashboardPage.test.tsx` heading/region/control-order now pin the card first |
| 2 — one-tap start; 409 offers "Go to your session" | **Done.** `useStartPlannedSession` → `POST /study-sessions/from-planned/:id` → navigate `/focus`; open-session 409 → conflict state with the "Go to your session" control; stale 409/404 → the stale message plus a host refetch; one start at a time. | card tests: start→`/focus`, conflict, stale+refetch, keyboard-only start |
| 3 — planned sessions on the calendar, distinct from logged sessions | **Done.** Additive backend emission (`planned:<id>`, scoped through `studyPlan.userId`) + client `PLANNED_SESSION` type + chip/details `TYPE_META` entry (icon `CalendarClock`, label "Planned"). | `calendar.service.spec.ts` (projection + status filter + scoping); `CalendarEventChip.test.tsx` |
| 4 — focus default honours `sessionLengthMinutes` | **Done.** `resolveDefaultSessionMinutes` now reads the key EP06's contract actually writes; bounds/fallback unchanged (V-07-1 closed). | `resolveDefaultSessionMinutes.test.ts` — the preference is honoured and the legacy `sessionMinutes` key is explicitly ignored |
| 5 — all states, no compliance %, keyboard, 320px | **Done.** Loading skeletons (`motion-reduce:animate-none`), `NO_PLAN` empty state with "Generate a plan" → `/plan`, `NOTHING_LEFT_TODAY` done block, `role="alert"` errors with "Try again"; statuses are text badges; full-width stacking and `max-sm:min-h-[44px]` targets. | card tests incl. the explicit "never reports plan compliance and never blames" case |

## Verification (2026-11-14)

- `pnpm --filter @studypilot/api test`: **948 passed**, 0 failed, 471 gated-skipped (+1 new calendar test). Lint, typecheck, format clean.
- `pnpm --filter @studypilot/web test`: **1144 passed**, 8 failed — **all 8 are the pre-existing `CalendarPage.test.tsx` failures** (see F-EP13D-01), reproduced with the calendar files and the test providers restored to HEAD. Lint, typecheck, format clean.
- New tests: `features/today-plan/ui/TodayPlanCard.test.tsx` (10), `calendar.service.spec.ts` planned-session case, `CalendarEventChip.test.tsx` planned case, `resolveDefaultSessionMinutes.test.ts` key cases.

## Deviations from the plan (each with why)

1. **The story is cross-layer, not frontend-only.** Calendar events are built server-side, so AC3 needed an additive emission in `calendar.service.ts`. The ui-refiner flagged this before implementation; the backend change is additive (new event type, no payload-shape change) and ownership-scoped through the parent plan.
2. **The calendar draws only *current* planned work** — `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`. `RESCHEDULED`/`SKIPPED` rows are deliberately never drawn: painting rolled-forward ghosts across past days would rebuild exactly the accumulating "missed" ledger EP13C just removed (D13-9).
3. **Planned-session status on the calendar reuses the existing `completed` flag** instead of D-D8's "status word suffix". It needs no payload contract change and reuses the chip's already-tested Completed badge; `IN_PROGRESS` is a transient state whose live display belongs on the dashboard card, which has it.
4. **Load-error copy precedence.** The shared `getErrorMessage` never returns empty (it falls back to "An unexpected error occurred"), which would have made D-D9's settled copy unreachable. The card surfaces a real server message (DoD 4) but treats that generic sentence as "no useful message" and shows "We couldn't load today's plan." — which tells the student *which* surface failed.
5. **EP05 dashboard test churn.** The page genuinely gained a section, so its pinned heading list, named-region list and control order now include the card (and the test adapter serves `/study-plans/today`; refresh refetches three queries). The EP05 assertions' intent — a fixed, predictable page order — is preserved, not weakened.
6. **Shared harness updates.** `makeTestStore` mounts `todayPlanApi` (otherwise every page test's store type diverges from `RootState`); `StudySession` fixtures gained `plannedSessionId`; the two plan tests that `vi.mock` the whole study-plan module now expose `getTodayPlan`, which the slice imports transitively.

## Findings

| ID | Finding | Disposition |
|---|---|---|
| F-EP13D-01 | **8 pre-existing failures in `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx`** (chips/week header/agenda/error-retry/live-region cases). Proven unrelated to EP13D: with `CalendarEventChip.tsx`, `CalendarEventDetails.tsx`, `entities/calendar/model/types.ts` and `test/providers.tsx` restored to HEAD, the same 8 fail. | Reported, **not absorbed** (EP08 F-02 precedent). Needs its own triage/fix task; EP13D neither caused nor repaired them. |
| F-EP13D-02 | TR-E13-14's manual accessibility pass (screen-reader traversal, visible focus, reduced motion, 320px) is not executed — it is irreducibly human/browser work. Code-level obligations are implemented and unit-tested (keyboard start, text-not-colour statuses, `role="alert"`, `motion-reduce`, 44px targets). | Open human-evidence item for the EP13 parent review unit, like EP08's TR-E08-08. |

## Changed paths

- **New:** `apps/web/src/features/today-plan/{api/todayPlanApi.ts,model/useStartPlannedSession.ts,ui/TodayPlanCard.tsx,ui/TodayPlanRow.tsx,ui/TodayPlanCard.test.tsx}`.
- **Client contracts/clients:** `entities/calendar/model/types.ts`, `entities/study-session/model/types.ts`, `entities/study-session/api/studySessionApi.ts`, `entities/study-plan/model/types.ts`, `entities/study-plan/api/studyPlanApi.ts`.
- **Surfaces:** `pages/dashboard/ui/DashboardPage.tsx`, `features/calendar/ui/{CalendarEventChip,CalendarEventDetails}.tsx`, `features/focus-session/model/resolveDefaultSessionMinutes.ts`.
- **Harness/tests:** `app/store/store.ts` + `store.test.tsx`, `test/providers.tsx`, `pages/dashboard/ui/DashboardPage.test.tsx`, `features/calendar/ui/CalendarEventChip.test.tsx`, `features/focus-session/**` fixtures, `pages/plan/ui/PlanPage.test.tsx`, `features/study-plan/ui/RemainingWorkSection.test.tsx`.
- **Backend:** `apps/api/src/modules/calendar/calendar.service.ts` + `calendar.service.spec.ts`.
- **Docs:** this record, `checkpoint.md`, EP13 README queue row, EP13D story status.
