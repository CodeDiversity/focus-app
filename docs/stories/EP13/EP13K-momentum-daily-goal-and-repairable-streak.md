# EP13K — Momentum: Daily Goal and Repairable Streak

**Story ID:** EP13K
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend + Frontend (one cohesive outcome; split would manufacture children)
**Status:** Needs refinement (refiner pass required, D13-14)
**Dependencies:** EP07 session log (done); EP13D (dashboard placement); EP13I (the what-now card now carries the micro-start — momentum shares that surface); **EP13N implemented** (its named-choice control pattern is what the two goal preferences must use — D13-15). D13-11 provisional.
**Reviewed:** 2026-11-15 — ACs revised so this story does not re-introduce the control pattern EP13N exists to remove (see *Review note*).

## Plan at a glance

- **What this changes:** a `GET /study-sessions/momentum` aggregate (minutes today vs `dailyGoalMinutes`, study-days this week vs `weeklyGoalDays`, streak of goal-met weeks) and a dashboard momentum display with a reduced-motion-safe celebration on finishing a focus session; two new preference keys using EP13N's named-choice control.
- **Why it improves it:** showing up is rewarded and a missed day never resets anything — hard streaks punish exactly these students (product). Aggregation is one pure function over the EP07 session log; no compliance percentage exists anywhere to leak (code).
- **Decisions needing you:** none yet — this story is `Needs refinement`; the refiner pass proposes D-K rows (goal defaults, celebration form, streak semantics) for your ruling before implementation.
- **How to change this plan:** edit a Ruling cell in the Decisions table below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.


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
  controls on the preferences form, **built on EP13N's named-choice pattern**
  (D13-15), never as raw numeric inputs.
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
   zeroes history display) on a missed week — presentation per the refiner pass,
   math per D13-11.
3. Goals are editable preferences with validation and defensive-reader
   fallback; defaults are modest (60 min / 3 days). **The controls follow
   EP13N's pattern (D13-15):** the daily goal is a named choice — *Gentle*
   (30 min) / *Steady* (60 min) / *Ambitious* (120 min), plus an honest
   `Custom (n min)` option when the stored value is none of the three — and
   the weekly goal is a row of discrete day chips (1–7). Neither asks the
   student to type a number or reason about a ratio; the stored contract
   (integers, the bounds above) is unchanged.
4. The celebration respects `prefers-reduced-motion` and is announced
   accessibly; copy celebrates minutes done, never references the plan
   ("you studied 45 minutes", never "you completed 60% of your plan").
5. **No percentage of anything** appears on an EP13K surface — not plan
   compliance (D13-9) and not goal progress. Progress is shown in its own
   units ("45 of 60 min", "3 of 4 days"); a filling indicator may *depict* a
   ratio graphically, but no number ending in `%` is rendered. Asserted by
   test.
6. **Momentum never displaces initiation.** On the dashboard the what-now
   card stays the first meaningful content (D-D1, EP13E-AC1): momentum
   renders after it, and a test pins the DOM order. A student who opens the
   dashboard sees what to do before how they are doing.

## Tests (TR-E13-11)

- Aggregation: civil-date bucketing (UTC vs non-UTC profiles, DST), COMPLETED-
  only, ownership scoping.
- Streak matrix: goal met/missed weeks, mid-week state, missed-day-no-reset,
  week-boundary (Monday start).
- Preference keys: defaults/bounds/reader; the named-choice controls
  round-trip (incl. the `Custom (n min)` case EP13N defines).
- Dashboard display states (no data, goal met, in progress); celebration
  reduced-motion branch; copy assertions (no `%` anywhere); DOM-order test
  for EP13K-AC6.

## Technical notes

- **Inspected (2026-11-14):** `StudySession` fields (279–297) and the EP07
  confirmed-time aggregation precedent; `preferences.ts` extension pattern
  (full read).
- **Proposed:** momentum service method beside confirmed-time; dashboard
  `features/momentum/` (FSD); celebration hooked into the existing finish
  flow. The two preference keys ride the same bag/validator machinery as
  EP13F's keys (coordinate the shared `preferences.ts` diff in queue order).
- **UI/UX gaps for the refiner pass (D13-14):** daily indicator form (ring?
  bar?), weekly presentation, streak display and its paused-week framing,
  celebration treatment, dashboard placement **below** the what-now card
  (EP13K-AC6 fixes the constraint; the refiner chooses the exact slot).

### Review note (2026-11-15)

This story was written before EP13N existed. As drafted it would have added
**two more raw numeric preference inputs** to the very form EP13N is
correcting — the same mistake, shipped twice, then fixed twice. EP13K-AC3 now
requires EP13N's pattern and the queue runs EP13N first, so the control is
built once and reused.

The second revision is EP13K-AC6. EP13D/EP13E spent two stories making "what
now" the first thing a student sees, and EP13I just put the micro-start
beside it. A momentum ring at the top of the dashboard would quietly undo
that: the student would land on a scoreboard instead of an action. Momentum
is feedback *about* showing up — it belongs after the thing it rewards.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| — | None recorded yet; proposed at refinement. | | Proposed |

Rows are `D-K<n>`; one that refines or overrides a register row says `(refines D13-<n>)` / `(overrides D13-<n>)`. ▲ = material: the implementer stops and asks if still `Proposed`; other rows become `Ratified by default` at implementation start.

## Definition of Done

1. Functional criteria pass (AC-E13-12).
2. Preference validation. 3. Ownership scoping on the aggregate query.
4. Actionable errors. 5. States. 6. Keyboard + announcements.
7. Responsive. 8. Automated tests (TR-E13-11).
9. Endpoint + preference keys documented.
10–11. Combined EP13 parent review / its "How to verify by hand" section.

## Sizing

- **Outcome:** showing up is visibly rewarded with repairable, non-punitive momentum feedback.
- **Estimate:** 2–3 requests/tokens.
- **Model recommendation:** 3 — careful date math but settled semantics; risk contained by the streak matrix tests.
- **Production files:** study-sessions module (endpoint), `preferences.ts` (+ form), `features/momentum/*` (new), finish-dialog hook.
- **Test files:** momentum service spec, preferences spec (extend), momentum component tests.
- **Minimal start context:** this story + its refiner record, EP13 README D13-11, `preferences.ts`, EP07 aggregation precedent, EP13D dashboard layout record.
- **Verification:** `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13D (placement), EP13I, EP13N; refiner pass. Blocks nothing.
- **Exclusions:** badges/social, notifications, recap emails.

