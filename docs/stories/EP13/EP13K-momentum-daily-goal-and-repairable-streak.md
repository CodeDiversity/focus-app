# EP13K — Momentum: Daily Goal and Repairable Streak

**Story ID:** EP13K
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend + Frontend (one cohesive outcome; split would manufacture children)
**Status:** Needs refinement (ui-refiner required, D13-14)
**Dependencies:** EP07 session log (done); EP13D (dashboard placement). D13-11 provisional.
**Jira key:** Pending creation

## Summary

Reward showing up, never plan compliance. A `GET /study-sessions/momentum`
endpoint aggregates the session log into: confirmed minutes today vs a modest
`dailyGoalMinutes` (default 60), study-days this Monday-start week vs
`weeklyGoalDays` (default 3), and the streak of consecutive goal-met weeks
(D13-11). The dashboard shows a filling daily-minutes indicator and the weekly
picture; finishing a focus session gets a small celebration
(reduced-motion-safe). The defining property is **repairability**: a missed
day never resets anything within the week, and streak math has no
consecutive-day concept at all — hard streaks punish exactly the users this
app serves. No surface anywhere shows a plan-compliance percentage (D13-9).

## Scope

**In scope:**
- Momentum endpoint (profile-zone civil-date aggregation over COMPLETED
  sessions; deterministic).
- `dailyGoalMinutes` (60, 5–480) and `weeklyGoalDays` (3, 1–7) additive
  preference keys (D06-4 style: defaults, bounds, defensive reader) + the two
  fields on the preferences form.
- Dashboard momentum display; finish-session celebration in the existing
  `FinishSessionDialog` flow.
- Tests (TR-E13-11); recorded manual a11y pass (TR-E13-14).

**Out of scope:**
- Badges, points, leaderboards, social anything. Notifications (D13-8).
- Weekly recap emails.

## Source requirement references

- Epic AC-E13-12. Shared DoD 1, 2, 3, 4, 5, 6, 7, 8, 9. TR-E13-11,
  TR-E13-14. D13-9, D13-11.

## Acceptance criteria

1. Momentum math is deterministic and timezone-correct: minutes today and
   study-days this week use the profile zone's civil dates (DST boundaries
   tested); only COMPLETED sessions count.
2. Repairability holds by construction: within a week, any combination of
   study days ≥ `weeklyGoalDays` meets the goal regardless of which days;
   the weekly streak increments on goal-met weeks and simply pauses (not
   zeroes history display) on a missed week — presentation per ui-refiner,
   math per D13-11.
3. Goals are editable preferences with validation and defensive-reader
   fallback; defaults are modest (60 min / 3 days).
4. The celebration respects `prefers-reduced-motion` and is announced
   accessibly; copy celebrates minutes done, never references the plan
   ("you studied 45 minutes", never "you completed 60% of your plan").
5. No compliance percentage exists on any EP13K surface (asserted by test).

## Tests (TR-E13-11)

- Aggregation: civil-date bucketing (UTC vs non-UTC profiles, DST), COMPLETED-
  only, ownership scoping.
- Streak matrix: goal met/missed weeks, mid-week state, missed-day-no-reset,
  week-boundary (Monday start).
- Preference keys: defaults/bounds/reader; form fields round-trip.
- Dashboard display states (no data, goal met, in progress); celebration
  reduced-motion branch; copy assertions.

## Technical notes

- **Inspected (2026-11-14):** `StudySession` fields (279–297) and the EP07
  confirmed-time aggregation precedent; `preferences.ts` extension pattern
  (full read).
- **Proposed:** momentum service method beside confirmed-time; dashboard
  `features/momentum/` (FSD); celebration hooked into the existing finish
  flow. The two preference keys ride the same bag/validator machinery as
  EP13F's keys (coordinate the shared `preferences.ts` diff in queue order).
- **UI/UX gaps for the ui-refiner (D13-14):** daily indicator form (ring?
  bar?), weekly presentation, streak display and its paused-week framing,
  celebration treatment, dashboard placement relative to EP13D's sections.

## Definition of Done

1. Functional criteria pass (AC-E13-12).
2. Preference validation. 3. Ownership scoping on the aggregate query.
4. Actionable errors. 5. States. 6. Keyboard + announcements.
7. Responsive. 8. Automated tests (TR-E13-11).
9. Endpoint + preference keys documented.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** showing up is visibly rewarded with repairable, non-punitive momentum feedback.
- **Estimate:** 2–3 requests/tokens.
- **Model recommendation:** 3 — careful date math but settled semantics; risk contained by the streak matrix tests.
- **Production files:** study-sessions module (endpoint), `preferences.ts` (+ form), `features/momentum/*` (new), finish-dialog hook.
- **Test files:** momentum service spec, preferences spec (extend), momentum component tests.
- **Minimal start context:** this story + ui-refiner record, EP13 README D13-11, `preferences.ts`, EP07 aggregation precedent, EP13D dashboard layout record.
- **Verification:** `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13D (placement), ui-refiner. Blocks nothing.
- **Exclusions:** badges/social, notifications, recap emails.

## Tracker reference

Jira key: Pending creation (no sync authorized).
