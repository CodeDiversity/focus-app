# EP13K — Momentum: Daily Goal and Repairable Streak

**Story ID:** EP13K
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend + Frontend (one cohesive outcome; split would manufacture children)
**Status:** Implemented — awaiting parent review (2026-11-16). ▲ rows ratified by user 2026-11-16; D-K4/D-K11/D-K12 ratified by default. Record: [`artifacts/EP13K/implementation.md`](./artifacts/EP13K/implementation.md)
**Dependencies:** EP07 session log (done); EP13D (dashboard placement); EP13I (the what-now card now carries the micro-start — momentum shares that surface); **EP13N implemented** (its named-choice control pattern is what the two goal preferences must use — D13-15). D13-11 provisional (refined by D-K1…D-K3 below).
**Reviewed:** 2026-11-15 — ACs revised so this story does not re-introduce the control pattern EP13N exists to remove (see *Review note*).
**Refined:** 2026-11-15 (refiner)

## Plan at a glance

- **What this changes:** a new read `GET /study-sessions/momentum` (minutes today vs `dailyGoalMinutes`, study days this Monday-start week vs `weeklyGoalDays`, the run of goal-met weeks and the best run) computed by a pure domain module over the EP07 session log; two additive preference keys (`dailyGoalMinutes` 60 / 5–480, `weeklyGoalDays` 3 / 1–7) asked on the preferences form as EP13N-style named choices; a compact `MomentumCard` on the dashboard **after** the today card; and a reduced-motion-safe celebration inside the focus page's existing "Session complete" block.
- **Why it improves it:** showing up is rewarded in the student's own units ("45 of 60 min", "3 of 3 days") and a missed day never resets anything — the week only ever fills, and a quiet week pauses the run without erasing the best one (product). The math is one pure function (`domain/study-planning/momentum.ts`) with no clock and no I/O, civil-date bucketing reuses the `getToday` precedent, and no percentage exists in the payload to leak (code).
- **Decisions needing you:** none — all ▲ rows ratified by user 2026-11-16 (recommended options).
- **How to change this plan:** edit a Ruling cell in the Decisions table below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Reward showing up, never plan compliance. A `GET /study-sessions/momentum`
endpoint aggregates the session log into: confirmed minutes today vs a modest
`dailyGoalMinutes` (default 60), study days this Monday-start week vs
`weeklyGoalDays` (default 3), and the run of consecutive goal-met weeks
(D13-11). The dashboard shows a filling daily indicator and a seven-day
weekly picture; finishing a focus session gets a small celebration
(reduced-motion-safe). The defining property is **repairability**: a missed
day never resets anything within the week, and the math has no
consecutive-day concept at all — hard streaks punish exactly the users this
app serves. No surface anywhere shows a plan-compliance percentage (D13-9),
and no EP13K surface renders any `%` at all.

## Scope

**In scope:**
- Momentum endpoint: profile-zone civil-date aggregation over COMPLETED
  sessions, deterministic, ownership-scoped, pure math in the domain module.
- `dailyGoalMinutes` (60, 5–480) and `weeklyGoalDays` (3, 1–7) additive
  preference keys (D06-4 style: defaults, bounds, defensive reader, DTO) +
  the two controls on the preferences form, **built on EP13N's radio-card
  pattern** (D13-15), never as raw numeric inputs.
- Dashboard `MomentumCard` (new `features/momentum/`, FSD) after the today
  card; celebration in `FocusTimer`'s existing completed block, fed by the
  same momentum read.
- Tests (TR-E13-11); recorded manual a11y pass (TR-E13-14, collected by EP13M).
- Contract docs: `contracts.md` endpoint row gains the payload shape (DoD 9).

**Out of scope (do not drift):**
- Badges, points, levels, leaderboards, sharing, social anything.
- Notifications or reminders (D13-8); weekly recap emails.
- Consecutive-day streaks of any kind; "freeze"/"repair" tokens; a history
  or calendar view of past weeks (the payload carries only this week's days
  and two counters).
- Any change to EP07 session semantics, to `GET /study-plans/today`, or to
  the four EP06 duration fields and the two EP13F levers on the form.
- Animations beyond the single entrance fade (no confetti, no sound).

## Source requirement references

- Epic AC-E13-12 ("progress feedback rewards showing up (minutes today
  toward a modest goal, a repairable weekly streak); no surface reports a
  plan-compliance percentage; all copy remains non-blaming"). Shared DoD 1,
  2, 3, 4, 5, 6, 7, 8, 9. TR-E13-11, TR-E13-14. D13-9, D13-11, D13-15.

## Acceptance criteria

1. **Momentum read — deterministic, timezone-correct, repairable.**
   `GET /study-sessions/momentum` returns the D-K5 payload for the
   authenticated student only. Minutes today and study days this week are
   bucketed by `toCivilDate(startTime, profileZone)` (the `getToday`
   precedent); only `COMPLETED` sessions count and a session with
   `durationMinutes ≥ 1` makes its civil day a study day (D-K1). The week
   starts on Monday in the profile zone (D-K2). Repairability holds by
   construction: any ≥ `weeklyGoalDays` distinct study days in the week meet
   the goal regardless of which days; the run of goal-met weeks counts the
   current week only once it is met and is never ended by a week still in
   progress; the best run is always reported (D-K3). Same inputs → identical
   payload (no clock inside the pure module).
2. **Goals are preferences, asked as named choices.** `dailyGoalMinutes`
   (default 60, 5–480) and `weeklyGoalDays` (default 3, 1–7) ride the
   existing `studyDefaults` bag (keys, bounds, defaults, defensive reader,
   `UpdateStudyPreferencesDto`, `GET/PUT /study-preferences` merge). On the
   form they use EP13N's radio-card control (D13-15): the daily goal is
   *Gentle* 30 / *Steady* 60 / *Ambitious* 120 plus an honest
   `Custom (n min)` option when the stored value is none of these (D-K6);
   the weekly goal is *Light* 2 days / *Steady* 3 days / *Most days* 5 days
   plus `Custom (n days)` likewise (D-K7). Neither control asks the student
   to type a number; the stored contract (integers, the bounds above) is
   unchanged and the 4096-byte bag cap still holds.
3. **Dashboard momentum, after initiation.** A `MomentumCard` (heading
   "Your momentum") renders directly after `TodayPlanCard` and before the
   urgency grid (D-K9); the what-now card stays the first meaningful content
   (D-D1, EP13E) and a test pins the heading order. The card shows the daily
   indicator ("{n} of {goal} min today", filling bar) and the weekly picture
   (seven Mon–Sun day marks with text labels, "{d} of {g} days this week",
   the run line per D-K10), with loading, empty (no session ever), and error
   ("We couldn't load your momentum." + "Try again") states; the dashboard
   refresh control refetches it.
4. **Celebration on finish, reduced-motion-safe and announced.** When a
   focus session finishes with ≥ 1 confirmed minute, `FocusTimer`'s existing
   "Session complete" block becomes the celebration (D-K8): "You studied
   {n} minutes." plus, once the momentum read resolves, the daily and
   weekly lines in the student's own units; a single CSS entrance animation
   carries `motion-reduce:animate-none` and `prefers-reduced-motion` shows
   the block static. The timer's existing sr-only live region announces
   "Focus session complete — you studied {n} minutes." (one region, one
   sentence). A 0-minute finish shows the neutral D-K10 line and no
   celebration. Copy never references the plan.
5. **Nothing is graded.** No EP13K surface (card, celebration, form copy,
   payload) renders a number followed by `%` or any plan-compliance figure
   (D13-9); progress is in minutes and days only — a bar may depict a ratio
   graphically. Copy carries none of the blame terms the sibling tests already
   forbid (`missed`, `behind`, `failed`, `lazy`, `should`, `broke`, `lost`).
   Every control is keyboard-operable with the repo focus ring, touch targets
   are `max-sm:min-h-[44px]`, the card stacks under `sm`, and the manual
   a11y pass is recorded for EP13M (TR-E13-14).

## Tests (TR-E13-11; negatives folded here)

**Backend — `apps/api`**

- `src/domain/study-planning/momentum.spec.ts` (new, pure): `describe('momentum (domain, EP13K)')`
  - AC1: "buckets minutes today from the civil-day list, COMPLETED-only input assumed"; "a 0-minute session never makes a study day (D-K1)"; "any three distinct days meet a 3-day goal — Mon/Tue/Wed and Mon/Thu/Sun alike (repairability)"; "a missed day mid-week leaves the earlier days counted"; "the current week counts in the run only once met, and an unmet current week never ends the run"; "a completed week below goal ends the run at that week; best run is preserved"; "run and best run are capped at the 52-week horizon (D-K4)"; "no sessions → zeros, `hasHistory: false`"; "same input twice → deep-equal output (determinism)"; "week start is Monday: a Sunday session belongs to the week that began the previous Monday"; "goal values at the bounds (5 min / 1 day; 480 min / 7 days)".
- `src/common/lib/calendar-date.spec.ts` (extend): "`startOfMondayWeek` returns the Monday for every weekday, including Sunday"; "crosses a month and a year boundary".
- `src/modules/study-sessions/study-sessions-momentum.service.spec.ts` (new, mocked Prisma — the `study-sessions-absorb.service.spec.ts` shape): `describe('StudySessionsService EP13K momentum (unit, mocked PrismaService)')`
  - AC1: "queries only the authenticated user's COMPLETED sessions inside the horizon (where pinned)"; "a 23:30 UTC session is tomorrow in Pacific/Auckland and yesterday's 03:00 UTC is today in America/Los_Angeles (civil bucketing)"; "DST-end Sunday: a 00:30 local session on the transition day stays on that day (no wall-clock bounds)"; "an unreadable profile zone falls back to UTC via `resolveTimeZone`"; "reads goals through `readStudyPreferences` — invalid stored goals fall back to 60 / 3"; "missing user → uniform 404 `Resource not found`".
- `src/domain/study-planning/preferences.spec.ts` (extend): AC2: "exposes the documented defaults … plus EP13K's 60 / 3"; "exposes the bounds … 5..480 / 1..7"; "falls back per field for an out-of-range goal (0, 481; 0, 8)"; "returns exactly the eight keys"; "a bag with the EP13F keys but no goals reads back the goal defaults (additive)".
- `src/modules/study-plans/study-plans.service.spec.ts` (extend the preferences block): AC2: "PUT merges `dailyGoalMinutes`/`weeklyGoalDays` onto the effective bag and leaves the other keys untouched"; "400 names the field for `weeklyGoalDays: 8` and `dailyGoalMinutes: 4`".
- `src/modules/study-sessions/study-sessions-data-scoping.spec.ts` (gated, extend): AC1: "GET /study-sessions/momentum is scoped: B's payload is all zeros while A has sessions"; "unauthenticated → 401".

**Frontend — `apps/web`**

- `src/features/momentum/ui/MomentumCard.test.tsx` (new): `describe('MomentumCard (EP13K)')`
  - AC3: "shows minutes today in its own units and fills the bar without rendering a percent"; "shows the seven day marks with text labels and the days-this-week line"; "goal met reads the met copy, never a grade"; "a quiet week shows the best run and the fresh-start line (D-K10)"; "run ≥ 1 reads 'Goal met {w} weeks in a row'"; "empty state before any session offers no second start control"; "renders the loading and error states with a retry"; AC5: "never renders a `%` or a blame term (D13-9)"; "the bar is `aria-hidden` and the text carries the meaning (non-colour-only)"; "stacks under `sm` and keeps 44px targets".
- `src/pages/dashboard/ui/DashboardPage.test.tsx` (extend): AC3: the heading-order test becomes `["Today's plan", 'Your momentum', 'Overdue assignments', …]`; "refetches the momentum query on refresh"; the existing "introduces no animation without its reduced-motion companion" test now also covers the card; the named-regions inventory gains the card's region.
- `src/features/focus-session/ui/FocusTimer.test.tsx` (extend): AC4: "a finished session with minutes shows the celebration with the minutes sentence"; "the celebration carries `motion-reduce:animate-none` on its animated element"; "the live region reads 'Focus session complete — you studied 25 minutes.'"; "a 0-minute finish shows the neutral line and no celebration"; AC5: "the celebration copy never references the plan or a percent".
- `src/pages/focus/ui/FocusPage.test.tsx` (extend): AC4: "finishing triggers the momentum fetch and the celebration shows the daily and weekly lines when it resolves"; "a failed momentum read leaves the celebration with the minutes sentence only (no error surface)".
- `src/features/study-preferences/ui/StudyPreferencesForm.test.tsx` (extend, new block "goal preferences (EP13K, D13-15)"): AC2: "renders the daily goal as a radio group of exactly Gentle / Steady / Ambitious for a preset value"; "renders the weekly goal as Light / Steady / Most days"; "a stored 45 shows a pre-selected 'Custom (45 min)'; a stored 4 shows 'Custom (4 days)'"; "selecting Ambitious then saving PUTs `dailyGoalMinutes: 120` as a number"; "drops the Custom option once a preset is saved"; "arrow keys move the selection in both groups"; "renders a 400 `weeklyGoalDays` error under its group"; AC5: "goal copy carries no percent and no blame term"; "there is no `input[type=number]` for either goal".
- `src/entities/study-session/api/studySessionApi.test.ts` or the existing API test pattern: "getMomentum GETs `/study-sessions/momentum`".

## Technical notes

### Inspected (2026-11-15, refiner; nothing below is guessed)

- `apps/api/src/modules/study-sessions/study-sessions.service.ts` — `finish()` writes `durationMinutes` = confirmed minutes and `status: COMPLETED`; `confirmedTime()` is the aggregation precedent; `absorbNext()`/`startFromPlanned()` show the `user.timeZone` → `resolveTimeZone` → `toCivilDate` pattern. Controller `study-sessions.controller.ts` has literal-segment GETs (`current`, `confirmed-time`) declared before `@Get()`.
- `apps/api/src/modules/study-plans/study-plans.service.ts:850–967` — `getToday()` computes `confirmedMinutesToday` by over-fetching ±1 day around UTC midnight and filtering on `toCivilDate` (comment explains why wall-clock bounds are wrong on DST days). Lines 507–603: `GET/PUT /study-preferences` merge via `readStudyPreferences` + `validateStudyPreferences`.
- `apps/api/src/domain/study-planning/preferences.ts` — `STUDY_PREFERENCE_KEYS`, `_DEFAULTS`, `_BOUNDS`, `readStudyPreferences` (step 1 only for independent keys), `validateStudyPreferences`; `types.ts` `StudyPreferences`. `calibration.ts` is the pure-module precedent for EP13K's `momentum.ts`.
- `apps/api/src/common/lib/civil-date.ts` (`resolveTimeZone`, `toCivilDate`, `zoneParts`) and `calendar-date.ts` (`addDays`, `dayOfWeekOf` — `YYYY-MM-DD` string arithmetic, DST-free).
- `apps/api/src/modules/study-plans/dto/update-study-preferences.dto.ts` — per-key `@IsInt/@Min/@Max` with contract messages.
- `apps/api/prisma/schema.prisma:279–304` `StudySession` (`durationMinutes`, `status`, `startTime`), `User.timeZone` (line 29). **No migration** — the goals live in the JSON bag.
- `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` — the EP13N radio-card: `DENSITY_PRESETS`, `isDensityPreset`, `customDensity` derived from server state in `applyServerState`, nested `fieldset`/`legend`, `aria-labelledby`/`aria-describedby` per radio, controlled via `watch`/`setValue`, `focus-within:ring-2 focus-within:ring-focus-ring`, "Selected" cue; its test file's EP13N block.
- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` — `TodayPlanCard` under the header, then the `grid gap-6 lg:grid-cols-2`; `handleRefresh` refetches three queries; `DashboardPage.test.tsx:349` pins the `h2` order, `:590` pins `animate-*` ↔ `motion-reduce:animate-none`.
- `apps/web/src/features/today-plan/{api/todayPlanApi.ts,ui/TodayPlanCard.tsx}` — RTK Query slice over an entity client (`entityBaseQuery`, `keepUnusedDataFor: 60`), card as `<section aria-labelledby>` with skeleton/`role="alert"`/`EmptyState`, `Badge`, 44px targets; `app/store/store.ts` and `test/providers.tsx` mount every slice.
- `apps/web/src/features/focus-session/ui/FocusTimer.tsx` — the sr-only `aria-live="polite"` status region and the `session.status === 'COMPLETED'` block ("Session complete", "{n} minutes recorded"); `pages/focus/ui/FocusPage.tsx` applies the finished session via `applySession` from `FinishSessionDialog.onFinished`. `index.css:121` globally collapses animation durations under `prefers-reduced-motion`.
- `apps/web/src/entities/study-session/{api/studySessionApi.ts,model/types.ts}` — plain-axios entity client and `StudySession` type; `entities/study-preferences/model/types.ts` `StudyPreferences`.

### Files to change / create (proposed)

| Path | Change | Why |
|---|---|---|
| `apps/api/src/common/lib/calendar-date.ts` (+ spec) | add `startOfMondayWeek(dateStr)` = `addDays(dateStr, -((dayOfWeekOf(dateStr) + 6) % 7))` | Monday-start week on civil strings, DST-free (D-K2) |
| `apps/api/src/domain/study-planning/momentum.ts` **new** (+ `momentum.spec.ts`) | `computeMomentum({ today, sessions: {civilDate, minutes}[], dailyGoalMinutes, weeklyGoalDays, horizonWeeks })` → payload sans `timeZone` | pure, clock-free math (D06-17 boundary; D-K12) |
| `apps/api/src/domain/study-planning/types.ts` | `StudyPreferences` gains `dailyGoalMinutes`, `weeklyGoalDays`; add `MomentumSummary` type | contract types in one place |
| `apps/api/src/domain/study-planning/preferences.ts` (+ spec) | keys, defaults 60/3, bounds 5–480/1–7, step-1 reader lines | AC2 (D06-4 style, additive) |
| `apps/api/src/modules/study-plans/dto/update-study-preferences.dto.ts` | two optional `@IsInt/@Min/@Max` fields with contract messages | AC2 validation at the API boundary (DoD 2) |
| `apps/api/src/modules/study-plans/study-plans.service.ts` | `providedValues()` copies the two keys; `toStudyPreferencesResponse` includes them | PUT merge / GET echo |
| `apps/api/src/modules/study-sessions/study-sessions.service.ts` | `momentum(userId)`: user `{timeZone, preferences}` → 404 if missing; over-fetch `COMPLETED` sessions `startTime ≥ (startOfMondayWeek(today) − 52 weeks − 1 day)` (UTC), select `startTime, durationMinutes`; map to civil dates; `computeMomentum`; attach `timeZone` | I/O shell around the pure module |
| `apps/api/src/modules/study-sessions/study-sessions.controller.ts` | `@Get('momentum')` before `@Get()` (beside `current`/`confirmed-time`) | AC1 route |
| `apps/api/src/modules/study-sessions/study-sessions-momentum.service.spec.ts` **new**; `study-sessions-data-scoping.spec.ts` (gated) | unit + scoping cases listed above | TR-E13-11, DoD 3 |
| `docs/stories/EP13/contracts.md` | the endpoint row gains the D-K5 payload; preferences line unchanged | DoD 9 |
| `apps/web/src/entities/study-session/model/types.ts`, `api/studySessionApi.ts` | `MomentumSummary` type; `getMomentum()` GET `/study-sessions/momentum` | entity owns URL + type (D12C-1) |
| `apps/web/src/entities/study-preferences/model/types.ts` | two keys on `StudyPreferences` | form type |
| `apps/web/src/features/momentum/api/momentumApi.ts` **new** | RTK Query slice `momentumApi` (`reducerPath: 'momentumApi'`, `keepUnusedDataFor: 60`) over `getMomentum`; `useMomentumQuery`, `useLazyMomentumQuery` | D-K11; mirrors `todayPlanApi` |
| `apps/web/src/features/momentum/ui/MomentumCard.tsx` **new** (+ test); `MomentumWeekStrip.tsx` **new** (the seven day marks, also reused inside the celebration) | the dashboard card | AC3 |
| `apps/web/src/features/momentum/model/momentumCopy.ts` **new** (+ test) | pure copy functions (`dailyLine`, `weeklyLine`, `runLine`) shared by card and celebration | one source for D-K10 copy; testable without DOM |
| `apps/web/src/app/store/store.ts`, `test/providers.tsx` | mount `momentumApi` (reducer, middleware, serializable ignore) | every page test's store matches `RootState` |
| `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (+ test) | `useMomentumQuery()`; `<MomentumCard>` after `<TodayPlanCard>`; `handleRefresh` refetches it | AC3 |
| `apps/web/src/features/focus-session/ui/FocusTimer.tsx` (+ test) | completed block → celebration; props `momentum?: MomentumSummary`; live-region sentence | AC4 |
| `apps/web/src/pages/focus/ui/FocusPage.tsx` (+ test) | `useLazyMomentumQuery`; trigger in `onFinished` after `applySession`; pass data to `FocusTimer` | AC4 |
| `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` (+ test) | zod fields; `GOAL_MINUTE_PRESETS`, `GOAL_DAY_PRESETS`; two radio-card fieldsets reusing the density markup (extract a local `PresetRadioGroup` inside the file if the three groups make it unwieldy — no new shared primitive, D-N5) | AC2 |

### Endpoint and payload (D-K5, proposed)

`GET /study-sessions/momentum` → 200:

```json
{
  "date": "2026-11-15",
  "timeZone": "Europe/London",
  "today": { "confirmedMinutes": 45, "goalMinutes": 60, "goalMet": false },
  "week": {
    "startDate": "2026-11-09",
    "studyDays": ["2026-11-09", "2026-11-11", "2026-11-15"],
    "studyDayCount": 3,
    "goalDays": 3,
    "goalMet": true
  },
  "run": { "currentWeeks": 2, "bestWeeks": 4, "currentWeekCounted": true },
  "hasHistory": true
}
```

Errors: 401 (global guard); 404 uniform only when the user row is missing.
No percentage field exists; clients derive the bar width from
`confirmedMinutes / goalMinutes` for the graphic only. Preferences:
`GET/PUT /study-preferences` gain `dailyGoalMinutes`, `weeklyGoalDays`
(partial PUT merge as today; 400 field-level `errors` map).

### Service wiring and security

- `StudySessionsService.momentum` (module unchanged: `StudySessionsModule`
  already provides the service and `PrismaService`). Every query carries
  `userId`; the user read uses `findUnique({ where: { id: userId } })` as
  `absorbNext` does; missing user → `RESOURCE_NOT_FOUND`. No writes.
- Determinism: the service passes `today` (computed once) into the pure
  module; the module reads no clock. The over-fetch window is a safe superset
  (civil "today" lies within ±1 day of its UTC midnight — `getToday`'s
  argument); exact filtering is on `toCivilDate`.
- Reads goals via `readStudyPreferences(user.preferences)` so a corrupt bag
  can never fail the read (defaults apply).
- Frontend performs no date arithmetic (D05-6): the week strip is drawn from
  `week.startDate` + `studyDays` as civil strings; day labels are the fixed
  Mon…Sun sequence.

### UI/UX (frontend half; settled here per D13-14)

**Components.** Reuse: `Card`/`.card` section pattern, `Badge` (`variant="success"` for met goals), `Button` (`variant="outline" size="sm"` retry), `EmptyState`; `lucide-react` `TrendingUp` for the heading, `CheckCircle2` for met marks and `Sparkles` in the celebration (all already in the bundle). Create: `MomentumCard`, `MomentumWeekStrip`, `momentumCopy.ts` under `features/momentum/`. No new shared primitive; the preferences form keeps EP13N's in-file radio-card markup (D-N5).

**Dashboard hierarchy (D-K9).** Header → page live region → `TodayPlanCard` → **`MomentumCard`** → urgency grid. The card is full width, visually quieter than the today card (no accent border, `p-4 sm:p-6`), heading `h2` "Your momentum" with `aria-labelledby`. Content on ≥`sm`: a two-column row — left: daily line + bar (`h-1.5` like `FocusTimer`'s bar, `aria-hidden`); right: week strip (seven cells `Mon…Sun`, a filled check mark on study days, today's cell outlined, text label under each; `aria-hidden` strip with an adjacent sr-only sentence "Studied on Monday, Wednesday and Sunday") + weekly line + run line. Under `sm` the two columns stack; cells stay ≥ 44px tall.

**States.** Loading: two skeleton bars with `animate-pulse motion-reduce:animate-none`, section `aria-busy`. Empty (`hasHistory: false`): `EmptyState` title "No sessions yet" / "Your first focus session starts your momentum. Today's plan above is the place to begin." — **no button** (the today card owns initiation; a second start control would break D-I3's control budget). Error: `role="alert"` "We couldn't load your momentum." + "Try again" (server message precedence as in `TodayPlanCard`). The card adds no live region (D-D13).

**Celebration (D-K8).** In `FocusTimer`'s completed block: icon `Sparkles` + headline "You studied {n} minutes." (n = `session.durationMinutes`), then — when `momentum` prop is present — the daily line, the weekly line (with the compact week strip) and the run line; the existing "View study history" / "Back to assignments" buttons stay. Entrance: one opacity/translate keyframe `@keyframes momentum-in` defined in `index.css` next to the reduced-motion block (no animation library exists in the repo), applied as an `animate-` class with `motion-reduce:animate-none`; no confetti, no sound, no auto-dismiss. If the momentum read is still loading or fails, the block shows the headline alone — a celebration never shows a spinner or an error. 0 minutes: "Nothing recorded this time. Your work is still in your plan." with no animation or icon.

**Preferences form (D-K6/D-K7).** A new `fieldset` "Your goals" after "How your days are filled", prose: "A daily goal is the minutes you'd like to reach on a study day. A weekly goal is how many days you'd like to show up. Small goals you actually hit beat big ones you dread." Two nested radio-card groups: legend "Daily goal" (Gentle — "About 30 minutes. One short session counts." / Steady — "About an hour — the default." / Ambitious — "About two hours, for heavier weeks.") and legend "Weekly goal" (Light — "2 days a week." / Steady — "3 days a week — the default." / Most days — "5 days a week."). Custom options read `Custom (45 min)` / `Custom (4 days)` with EP13N's "What is saved right now. Pick a named option to change it." Same keyboard semantics, focus ring, "Selected" cue and 400-under-group mapping as the density group.

**Copy (D-K10) — concrete.** Daily: `0 of 60 min today — any session counts.`, `45 of 60 min today`, `Daily goal met — 75 min today`. Weekly: `1 of 3 days this week`, `Weekly goal met — 4 days`. Run: `currentWeeks ≥ 1` → `Goal met {w} week(s) in a row`; `currentWeeks = 0 && bestWeeks ≥ 1` → `Best run so far: {b} weeks. This week is a fresh start.`; both 0 → no run line. Never a `%`, never "streak lost/broken", never a count of missed days.

**Accessibility.** Radio groups: native inputs, arrow-key selection, `focus-within` ring, "Selected" text. Card: text carries all meaning (bars/strips `aria-hidden` with sr-only sentences); met state uses icon + text + colour. Celebration announced through the one existing live region. Reduced motion: `motion-reduce:animate-none` on every `animate-*` element (the `DashboardPage` test enforces it; add the same sweep to `FocusPage.test.tsx`).

**Responsive.** Card full width at every breakpoint; columns stack under `sm`; preset grids `grid-cols-1 sm:grid-cols-3` like density; week strip is a 7-column grid at all widths with abbreviated labels (`M T W T F S S` would be ambiguous for a screen reader, so visible labels are `Mon…Sun` with `text-xs` and the sr-only sentence names full weekdays).

### Review note (2026-11-15)

This story was written before EP13N existed. As drafted it would have added
**two more raw numeric preference inputs** to the very form EP13N is
correcting — the same mistake, shipped twice, then fixed twice. EP13K-AC2 now
requires EP13N's pattern and the queue runs EP13N first, so the control is
built once and reused.

The second revision (now folded into EP13K-AC3) is placement. EP13D/EP13E
spent two stories making "what now" the first thing a student sees, and
EP13I just put the micro-start beside it. A momentum ring at the top of the
dashboard would quietly undo that: the student would land on a scoreboard
instead of an action. Momentum is feedback *about* showing up — it belongs
after the thing it rewards.

### Decisions

| ID | Options considered | Recommended | Why | Ruling |
|---|---|---|---|---|
| ▲ D-K1 (refines D13-11) | What makes a civil day a *study day*: (a) any `COMPLETED` session; (b) a `COMPLETED` session with `durationMinutes ≥ 1`; (c) a day whose minutes reach `dailyGoalMinutes`. | **(b)** | Showing up is the reward: one confirmed minute counts (the micro-start's whole premise, D-I1). (a) would count a 0-minute finish, which `finish()` itself treats as "nothing confirmed" (hands the planned row back). (c) makes the weekly goal a compliance gate — exactly what D13-9 forbids. | Ratified (user, 2026-11-16) |
| ▲ D-K2 (refines D13-11) | Week and zone: (a) Monday-start, days bucketed by `toCivilDate(startTime, profileZone)`, week start via `startOfMondayWeek` string arithmetic; (b) Sunday-start; (c) bucket by `endTime`. | **(a)** | D13-11 fixes Monday; `startTime` is what `getToday` already uses for `confirmedMinutesToday`, so the dashboard's two numbers can never disagree; string arithmetic on civil dates is DST-proof (the `getToday` comment documents the wall-clock trap). | Ratified (user, 2026-11-16) |
| ▲ D-K3 (refines D13-11) | Run semantics: (a) consecutive goal-met weeks counted back from the current week — current counts once met, an unmet current week never ends the run, a completed week below goal does; always report `bestWeeks`; (b) same but with one "grace" week; (c) count only completed weeks. | **(a)** | Repairable within the week by construction; the run pauses rather than punishing mid-week; `bestWeeks` means a quiet week never erases history on screen (the AC's "pauses, not zeroes"). (b) adds a hidden rule students must model; (c) makes a met week invisible until Monday. | Ratified (user, 2026-11-16) |
| D-K4 | Aggregation horizon: (a) 52 weeks + the current week, run/best capped at 52 and displayed as "52+" when capped; (b) unbounded (all history). | **(a)** | Bounds the read to one indexed range query; a year of consecutive goal-met weeks is already a lifetime signal. Cap is internal; the payload carries plain integers plus `capped: true` only when hit. | Ratified by default, 2026-11-16 |
| ▲ D-K5 | Endpoint: (a) standalone `GET /study-sessions/momentum` with the payload above; (b) fold into `GET /study-plans/today`. | **(a)** | `contracts.md` already names it; the today read reconciles the plan (a write) and is `NO_PLAN` for a student with no plan, while momentum must work with no plan at all; the focus page needs momentum after a finish without re-reading the plan. Payload has no `%` field by construction. | Ratified (user, 2026-11-16) |
| ▲ D-K6 (applies D13-15) | Daily presets: (a) Gentle 30 / Steady 60 / Ambitious 120 + `Custom (n min)`; (b) 30 / 60 / 90; (c) 15 / 30 / 60. | **(a)** | Keeps the reviewed AC's ladder and the default in the middle; 120 is a genuine stretch, not a trap, because the goal gates nothing (D-K1). Custom follows EP13N's honest-display rule (D-N2). | Ratified (user, 2026-11-16) |
| ▲ D-K7 (applies D13-15) | Weekly presets: (a) Light 2 / Steady 3 / Most days 5 + `Custom (n days)`; (b) seven day chips 1–7; (c) numeric input. | **(a)** | Reuses the EP13N control verbatim (one pattern, one test shape); three cards fit `sm:grid-cols-3` like density, where seven chips stack to seven rows on mobile; (c) is the pattern EP13N removed. Values 1/4/6/7 remain reachable via API and display honestly as Custom. | Ratified (user, 2026-11-16) |
| ▲ D-K8 | Celebration: (a) enrich `FocusTimer`'s completed block — headline + momentum lines, one CSS entrance, `motion-reduce:animate-none`, announced via the existing live region; (b) a toast; (c) a modal; (d) confetti canvas. | **(a)** | Persistent (toasts vanish — D-I6's reasoning), no new focus trap (c), no new dependency or motion risk (d). One live region, one sentence (D-I9). A failed momentum read degrades to the headline alone — never a spinner or an error inside a celebration. | Ratified (user, 2026-11-16) |
| ▲ D-K9 | Dashboard slot: (a) full-width `MomentumCard` directly after `TodayPlanCard`, before the grid; (b) a cell inside the 2-column grid; (c) a one-line strip inside the today card. | **(a)** | Satisfies "after initiation" with a pinned heading order; (b) buries it under urgency sections it is unrelated to; (c) adds a second concern to a card that EP13D/EP13I deliberately kept to one job. | Ratified (user, 2026-11-16) **Superseded by EP16 D16-8 (2026-11-17):** the card becomes one compact row on Today (EP16B). |
| ▲ D-K10 | Copy: the concrete strings in the UI/UX section (own units; met lines; "Best run so far… fresh start"; 0-minute neutral line; empty state without a button). | **As written** | D13-9: no `%`, no blame; the plan is never the subject; a quiet week is framed as a fresh start (EP13E's vocabulary). Tested by regex per AC5. | Ratified (user, 2026-11-16) **Refined by EP16 D16-8 (2026-11-17):** the daily sentence is not rendered on Today; weekly/run sentences unchanged (EP16B). |
| D-K11 | Client data: (a) RTK Query slice `features/momentum/api/momentumApi.ts` over an entity client, mounted in store + test providers, refetched by the dashboard refresh and after a finish; (b) plain axios in each component. | **(a)** | Mirrors `todayPlanApi`/`planHealthApi` (D05-1/D05-8); one cache shared by dashboard and focus page. | Ratified by default, 2026-11-16 |
| D-K12 | Where the math lives: (a) pure `domain/study-planning/momentum.ts` + I/O shell in `StudySessionsService`; (b) inline in the service. | **(a)** | `calibration.ts` precedent; the streak matrix is tested without Prisma mocks; determinism is a property of a function with no clock. | Ratified by default, 2026-11-16 |

Rows are `D-K<n>`; one that refines or overrides a register row says `(refines D13-<n>)` / `(overrides D13-<n>)`. ▲ = material: the implementer stops and asks if still `Proposed`; other rows become `Ratified by default` at implementation start. Planner back-reference requested: D13-11 ← D-K1, D-K2, D-K3.

## Definition of Done

1. Functional criteria pass (AC-E13-12).
2. Preference validation at both layers (DTO + zod). 3. Ownership scoping on the aggregate query (`userId` in every `where`; uniform 404).
4. Actionable errors (field-level 400s; card error copy). 5. Loading/empty/error states on the card; graceful degradation in the celebration.
6. Keyboard + one announcement. 7. Responsive (card stacks under `sm`; 44px targets).
8. Automated tests (TR-E13-11, named above). 9. Endpoint payload + preference keys documented in `contracts.md`.
10–11. Combined EP13 parent review / its "How to verify by hand" section; manual a11y pass recorded for EP13M (TR-E13-14).

## Sizing

- **Outcome:** showing up is visibly rewarded with repairable, non-punitive momentum feedback — one endpoint, two preferences, one card, one celebration.
- **Actual at closeout:** as planned plus `MomentumWeekStrip` reuse in the celebration, an in-file `PresetRadioGroup`, and mechanical test-fixture/mocks updates (store inventory, entity mocks, gated key lists); one commit. No migration.
- **Model tier:** default.
- **Files:** production — `apps/api/src/common/lib/calendar-date.ts`, `apps/api/src/domain/study-planning/{momentum.ts (new), types.ts, preferences.ts}`, `apps/api/src/modules/study-plans/{dto/update-study-preferences.dto.ts, study-plans.service.ts}`, `apps/api/src/modules/study-sessions/{study-sessions.service.ts, study-sessions.controller.ts}`, `apps/web/src/entities/study-session/{model/types.ts, api/studySessionApi.ts}`, `apps/web/src/entities/study-preferences/model/types.ts`, `apps/web/src/features/momentum/{api/momentumApi.ts, model/momentumCopy.ts, ui/MomentumCard.tsx, ui/MomentumWeekStrip.tsx} (new)`, `apps/web/src/app/store/store.ts`, `apps/web/src/test/providers.tsx`, `apps/web/src/pages/dashboard/ui/DashboardPage.tsx`, `apps/web/src/features/focus-session/ui/FocusTimer.tsx`, `apps/web/src/pages/focus/ui/FocusPage.tsx`, `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx`, `apps/web/src/index.css`, `docs/stories/EP13/contracts.md`. Tests — `momentum.spec.ts` (new), `calendar-date.spec.ts`, `preferences.spec.ts`, `study-plans.service.spec.ts`, `study-sessions-momentum.service.spec.ts` (new), `study-sessions-data-scoping.spec.ts` (gated), `MomentumCard.test.tsx` (new), `momentumCopy.test.ts` (new), `DashboardPage.test.tsx`, `FocusTimer.test.tsx`, `FocusPage.test.tsx`, `StudyPreferencesForm.test.tsx`.
- **Start context:** this story; `contracts.md` → Preferences bag + Endpoints rows; EP13 README D13-9/D13-11/D13-15; `study-plans.service.ts:850–967` (`getToday`), `study-sessions.service.ts` (`confirmedTime`, `absorbNext` zone pattern), `preferences.ts`, `calendar-date.ts`; `StudyPreferencesForm.tsx` (EP13N block), `TodayPlanCard.tsx`/`todayPlanApi.ts`, `FocusTimer.tsx`/`FocusPage.tsx`, `DashboardPage.tsx` + its test's heading-order and reduced-motion cases.
- **Verification:** `cd apps/api && pnpm jest src/domain/study-planning/momentum.spec.ts src/modules/study-sessions src/domain/study-planning/preferences.spec.ts src/modules/study-plans/study-plans.service.spec.ts` (all green; gated suites self-skip without `DATABASE_URL` — CI-executed, same standing as F-EP13A-03); `cd apps/web && pnpm vitest run src/features/momentum src/pages/dashboard src/pages/focus src/features/focus-session src/features/study-preferences` (green; the heading-order test lists "Your momentum" second); then full `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/web test`, `pnpm lint`, `pnpm typecheck`, `pnpm format` in both apps. Observable: `GET /study-sessions/momentum` 200 with the D-K5 shape and no `%` field; dashboard renders the card after the today card; finishing a 25-minute session shows "You studied 25 minutes."; preferences form shows the two radio groups and no number input for goals.
- **Dependencies / exclusions:** EP13D, EP13I, EP13N implemented (yes); user rulings on ▲ rows. Excluded outcomes with owners: non-blaming copy on other surfaces → EP13E/D13-9; manual a11y evidence collection → EP13M; energy-aware placement → EP13J; notifications → out of epic (D13-8).
