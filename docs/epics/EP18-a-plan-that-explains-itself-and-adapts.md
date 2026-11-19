# EP18: A Plan That Explains Itself and Adapts

**Epic ID:** EP18
**Status:** **Proposal — not broken down, not scheduled.** Written by the
planner 2026-11-19 from five follow-ups the user approved the same day. There
is no `docs/stories/EP18/` directory, no story files, no execution queue and no
review unit, because a breakdown is a **separate planner dispatch the user has
not yet requested**. Every row in the Decision Register is `Proposed`; nothing
here is ratified-by-default, because nothing has started.
**Release:** 1.5 (proposed, D18-1)
**Priority:** High / P0
**Labels:** `studypilot`, `adhd`, `scheduling`, `planning`, `trust`
**Dependencies:** EP13 (calibration `calibration.ts`, momentum `momentum.ts`,
flex anchors), EP14 (the hard flag — the second reason worth explaining, which
is BL-14-03's own trigger), EP17 (pacing rule 9, study-day selection rule 9b,
the rebuilt proposal surface). EP13 and EP14 are closed. *Updated at the EP17
closeout (planner, 2026-11-19):* **EP17 is closed** — the combined review
passed (pass 1, `d8d226f`,
[review.md](../stories/EP17/artifacts/EP17/review.md)), so ▲ D18-2's
precondition is met; the breakdown's re-grounding pass remains required and
should start from the review's four polish findings, two of which this
proposal now carries (AC-E18-29/30, D18-11).
**Milestone:** M11 (proposed, D18-1).

## Epic Summary

EP17 made the planner decide more on the student's behalf — it now chooses the
pace of each assignment (rule 9) *and* which days of the week may be used at
all (rule 9b). It did not give the student any way to ask why. A week that
shows Tuesday with 90 minutes and Thursday empty is now the product of two
engine rules and a preference the student may never have set, and the only
thing on screen is the verdict. EP18 closes that gap from both ends: the plan
says one short, true sentence about why each day looks the way it does; it
notices when its own assumptions are not surviving contact with the student's
real weeks and **offers** — never silently applies — a change; it tells a new
student what it assumed on the first plan they ever see; it lets a student
reshape the week by pointing at it rather than by choosing among presets; and
it shows deadline pressure while there is still room to act, instead of
reporting it afterwards as a warning.

## Description

As a student with ADHD, I want to understand why my plan looks the way it does,
and to have it notice and ask when it is wrong, so that I can trust it enough
to keep using it in week ten.

### Verified current behavior (inspected 2026-11-19)

All line references are to the current working tree at `5a5f110`.

**The engine makes two placement decisions and explains neither.**
`apps/api/src/domain/study-planning/scheduler.ts` (939 lines, pure: no clock,
no randomness, no I/O) now carries rule 9 and rule 9b:

- **Rule 9 — pacing.** `evenShareOf` (`scheduler.ts:504-521`) computes a
  per-assignment even share once from run-start inputs;
  `dayTakeOf` (`scheduler.ts:529-536`) blends it with the day budget —
  `paceTarget = budget − floor((budget − share) × spreadPercent / 100)` — and
  floors it at `remaining − capacityAfter` so feasibility still wins.
- **Rule 9b — study-day selection.** `selectStudyDays` picks the
  `weeklyGoalDays` days of the window with the most free time
  (`scheduler.ts:426-432`); `normalBudgetOf` (`scheduler.ts:472-473`) hands the
  normal pass a budget of `0` on every unselected day, while the rule 3
  critical pass deliberately keeps the real `dayBudgetOf`
  (`scheduler.ts:469-470, 710-712`).
- The output carries `studyDays` (`scheduler.ts:938`) and the service projects
  a `pacing` block of `{ spreadPercent, studyDays, perDayMinutes }`
  (`study-plans.service.ts:216-238, 361-382`;
  `apps/web/src/entities/study-plan/model/types.ts:98-105`).

So the payload already says **which** days were chosen and **how many minutes**
each got. Nothing anywhere says **why** a particular day is light, empty or
heavy. The only sentence the student gets is the summary line
(`PlanProposal.tsx:58-76`): "5 sessions · about 4 h this week · spread across 3
days". `EditableWeek` renders a day column with a label and, when it has
nothing, the words "No sessions" (`EditableWeek.tsx:200-227`) — four words of
explanation for the most confusing cell on the page.

**The plan never responds to being wrong.** Two pieces of adaptive machinery
exist and neither touches the plan's shape:

- `calibration.ts` (165 lines) turns the student's own finished work into a
  per-type multiplier on *effort estimates* — median of `confirmed ÷ estimated`,
  gated at 3 samples, clamped to `[0.5, 3.0]` (`calibration.ts:30-34, 119-139`).
  It corrects **how long work takes**, never **when or whether** it was placed.
- `momentum.ts` (133 lines) reads `COMPLETED` sessions into distinct study days
  per week and a repairable weekly run (`momentum.ts:51-133`). It already knows
  that a student hit 1 of 3 goal days for four weeks running. It reports; it
  changes nothing.

The levers that *do* shape the plan — `spreadPercent` (default 70),
`weeklyGoalDays` (default 3), `densityPercent`, `dailyCapMinutes` — are
set-and-forget values in the `studyDefaults` bag
(`preferences.ts:22-31, 56-74`). Nothing in the codebase reads completion
history and compares it against them. A student who misses every morning
session for a month gets the identical plan in week five.

**A new student's first plan is week fifty's plan.** The onboarding wizard has
exactly three steps — display name + time zone, semester, first course
(`apps/web/src/features/onboarding/ui/WizardShell.tsx:16-21`,
`Step1Preferences.tsx`). It never mentions study preferences, pace or study
days. The plan page offers "Plan my week" with no first-run differences
(`apps/web/src/pages/plan/ui/PlanPage.tsx:23, 76`), and `/plan/proposal`
renders the same four regions for every student
(`PlanProposal.tsx:131-298`). Meanwhile ▲ D17-16 (ruled 2026-11-19) made an
*unset* `weeklyGoalDays` mean "unconstrained": `gatherPlanData` reads a second,
planning-only projection (`study-plans.service.ts:1056-1061`,
`readPlanningStudyPreferences`) that substitutes 7. That is the right call for
safety, and it is invisible: the first plan a new student sees is governed by a
number they have never chosen, under a rule nobody has told them about.

**The pace is adjusted by preset, not by pointing.** EP17G shipped two preset
groups on both the proposal and Profile, from one shared source
(`apps/web/src/entities/study-preferences/model/pacingPresets.ts`):
`SPREAD_PRESETS` has **three** options (As early as possible / A little each
day / Evenly spread, values 0 / 70 / 100) and `GOAL_DAY_PRESETS` has **three**
(Light 2 / Steady 3 / Most days 5). That is **nine** named combinations, not
twelve (a correction to the brief; the twelfth would only appear if the density
group on Profile, `DENSITY_PRESETS` at `StudyPreferencesForm.tsx:123`, is
counted as a third plan-shaping group — on the proposal itself there are two
groups and nine combinations, plus the Custom affordances at
`PacingControls.tsx:66-75`). The count does not weaken the point: nothing on
the screen connects any of the nine to the week in front of the student, and
`SPREAD_CHANGE_SENTENCE` has to warn that choosing one "builds this week again
from scratch — any tweaks you've made here start over". The student is asked to
predict the output of rule 9 and rule 9b from three adjectives.

**Deadline pressure is reported, not previewed.** The engine computes
criticality on every day of every run:
`const critical = candidates.filter((item) => item.remaining > capacityAfter(item, date))`
(`scheduler.ts:787`). That boolean is the engine's own answer to "is this one
tight?" — and it is consumed internally and discarded. What reaches the student
is `WorkloadWarnings` (`apps/web/src/features/study-plan/ui/WorkloadWarnings.tsx`),
which speaks only in the past tense of failure: `NO_AVAILABLE_TIME`,
`INSUFFICIENT_TIME_BEFORE_DEADLINE`, `OVERDUE`
(`WorkloadWarnings.tsx:14-26`). An assignment that *did* fit, but only because
the feasibility override spent every remaining day on it, produces no signal at
all. The student finds out it was tight by having nothing left.

### The tension this epic has to name

Items 1 and 2 pull against the engine's defining property. `scheduler.ts` is
pure and deterministic by standing decision (D06-17), and EP17's AC-E17-04 and
the EP13J identity test pin byte-identical output for identical input. An
explanation is a *second* output of the same run, and an adaptive suggestion is
a *reading of history* that must not become a hidden input to placement. EP18
resolves this explicitly: explanations are **derived from the run, inside the
run, as data** (never recomputed in the UI, never guessed), and the adaptation
signal lives **outside the engine entirely**, as a separate read over completed
sessions that produces a *suggestion object*, never a mutated preference. The
engine's input remains exactly the stored preferences bag. See ▲ D18-3 and
▲ D18-5.

## Scope

- **(A) Placement explainability — promotes BL-14-03.** Each day of the
  proposal carries one short, true reason for its shape ("lighter — you have
  class until 6", "not a study day this week", "front-loaded — due Thursday").
  The reason is produced by the engine or the service from facts of the run it
  already has, not invented in the client. Absorbs BL-17-03 (the pacing-specific
  wording) as the rule 9/9b cases of the same vocabulary.
- **(B) Adaptive response when the plan is wrong.** A read over completed and
  missed sessions detects a small, closed set of persistent mismatches between
  the stored preferences and the student's actual weeks, and surfaces **one**
  offer at a time: "Mornings haven't been working. Shall I stop planning before
  10?" Accepting writes the preference through the existing
  `PUT /study-preferences`; declining is remembered so the same offer does not
  return next week. **Nothing is ever applied without an explicit accept.**
- **(C) First-plan onboarding moment.** The first "Plan my week" of a student's
  life states what the planner assumed and offers to change it before the
  proposal is judged — including the one assumption ▲ D17-16 made invisible
  (an unset `weeklyGoalDays` plans across the whole week).
- **(D) Lighter-touch pace adjustment — refines, does not replace, EP17G.**
  Direct manipulation of the week in front of the student ("too packed?",
  "spread this out more", "not this day") that writes the *same* underlying
  `spreadPercent` / `weeklyGoalDays` preferences and re-previews. The EP17G
  preset groups remain the explicit, nameable form of the same choice.
- **(E) Deadline pressure made visible before it bites.** The criticality the
  engine already computes (`scheduler.ts:787`) is surfaced as a calm, forward
  signal on the assignment and on its sessions ("this one's tight — it needs
  every day left"), distinct from the existing after-the-fact warnings.

## Out of scope

- **AI of any kind.** Item (B) is a small set of **named, deterministic,
  testable rules** over counts of completed sessions — the same arithmetic
  shape as `calibration.ts` and `momentum.ts`. No model, no inference, no
  natural-language generation, no ranking learned from data. This is the
  boundary most at risk of drift in this epic and ▲ D18-5 pins it.
- **Silent self-adjustment.** An offer the student did not accept never changes
  a stored preference. There is no "learning mode", no auto-apply, no
  "we adjusted your plan for you" after the fact (▲ D18-4).
- Syllabus parsing, LMS integrations, grade calculations, flashcards, social
  collaboration, native mobile apps (the standing MVP exclusions).
- Reminders and notifications (BL-16-04 — awaiting the user's approval of the
  capability, D13-8). An offer in (B) is shown when the student is already on a
  StudyPilot surface; it is never pushed.
- Changing rule 9's or rule 9b's *placement* behaviour. EP18 explains and
  re-steers what EP17 built; it does not re-open the pacing arithmetic. A
  placement change found necessary here is a finding against EP17, not a story
  here.
- Intra-gap placement (BL-17-01) and naming specific weekdays (BL-17-02) — both
  stay deferred in their own register; (D) may make BL-17-02's trigger more
  likely to fire, which is noted, not pre-empted.
- Rendering the proposal on the EP15 calendar grid (BL-16-02's remaining half).
- Goal history for momentum (BL-14-05) — item (B) reads *sessions*, not goal
  changes, precisely so it does not need that schema work.

## Proposed outcomes and acceptance criteria

IDs are stable from this proposal onward: a breakdown assigns owners, it does
not renumber. Numbering follows the five approved items in the recommended
delivery order (D18-9), which differs from the brief's ranking; the brief's
item numbers are given in each heading.

### Outcome 1 — Placement explainability (brief item 1; promotes BL-14-03)

1. **AC-E18-01** Every day column of the proposal that a student could
   reasonably question — an empty day inside the window, a day carrying
   noticeably more or less than its neighbours, and a day excluded by rule 9b —
   shows **one** short sentence giving the reason for its shape. A day with
   nothing to explain shows no sentence; no day shows two.
2. **AC-E18-02** Every reason is **true of the run that produced this
   proposal**: it is derived from facts the scheduler or the service already
   holds for that run (the selected day set, each day's free minutes and
   budget, the rule that declined to place more — pacing target reached, day
   budget exhausted, outside the study-day selection, served early by the rule 3
   feasibility override, no free time at all). No reason is inferred in the
   browser and no reason is a guess.
3. **AC-E18-03** The reasons are a **closed, enumerated vocabulary** with one
   case per declining rule, so a new engine rule cannot ship a silent "no
   reason" day: an unexplained shape is a test failure, not an empty string.
4. **AC-E18-04** The engine stays pure and deterministic. If a reason is
   computed inside `scheduler.ts`, it is an additive output field derived from
   the same sorted iteration; identical input still yields byte-identical
   output; the EP13J identity test and the EP17 determinism gate (V-17-3) still
   pass.
5. **AC-E18-05** Reasons are additive on the wire: a client that ignores the
   new field renders exactly as it does today, and a payload without the field
   renders without reasons rather than breaking.

### Outcome 2 — Deadline pressure made visible before it bites (brief item 5)

6. **AC-E18-06** An assignment the engine treated as **critical** on any day of
   the run (`remaining > capacityAfter`, `scheduler.ts:787`) is identifiable to
   the student from the proposal, in forward-looking language, while the week is
   still editable.
7. **AC-E18-07** The signal is distinct from the existing deficit warnings and
   does not replace them: `NO_AVAILABLE_TIME`,
   `INSUFFICIENT_TIME_BEFORE_DEADLINE`, `OVERDUE` and `deferredMinutes` keep
   their current meanings, categories and copy, and the no-silent-loss guarantee
   is untouched.
8. **AC-E18-08** The signal survives an edit: moving a tight assignment's
   session later does not quietly clear the signal unless the re-preview says
   it is no longer tight.
9. **AC-E18-09** The copy obeys the standing rules — no "behind", "missed",
   "overdue" or "failed" (D13-9, EP16 copy rules) — and reads as information,
   not alarm.

### Outcome 3 — First-plan onboarding moment (brief item 3)

10. **AC-E18-10** A student who has never confirmed a plan sees, on their first
    "Plan my week", a short statement of what the planner assumed — at minimum
    the study-days assumption, the pace, and the day bounds it planned
    inside — before they are asked to judge the proposed week.
11. **AC-E18-11** The ▲ D17-16 case is stated in plain language: a student who
    has not chosen a study-days number is told the plan used the whole week,
    and can choose a number from that moment without leaving the flow.
12. **AC-E18-12** The moment is **shown once and is dismissible**, is reachable
    again on demand, and never blocks a returning student. "First" is derived
    from a durable, student-scoped fact, not from a session flag that a new
    browser resets (▲ D18-7).
13. **AC-E18-13** Accepting or changing an assumption here writes through the
    existing `PUT /study-preferences` and re-previews; no new persisted
    contract is introduced for the framing itself beyond whatever ▲ D18-7
    rules.

#### Post-EP17-review additions to Outcome 3 (user-approved capture, 2026-11-19)

Two polish findings from the passing EP17 combined review
([review.md](../stories/EP17/artifacts/EP17/review.md) §1) are carried here as
named early items of this outcome, because both live on the same ▲ D17-16
seam — the unset `weeklyGoalDays` state — that Outcome 3 exists to make
visible. They are **additions to this proposal**, numbered after the existing
stable IDs; a breakdown assigns owners, it does not renumber. See D18-11.

29. **AC-E18-29** *(from R-EP17-07)* For a student who has never stored
    `weeklyGoalDays`, the proposal's study-days control and Profile's never
    disagree without explanation: today the proposal shows "Custom (7 days)"
    (the unconstrained planning read) while Profile shows "Steady — 3 days a
    week" (the momentum default), and `STUDY_DAYS_DESCRIPTION`'s second clause
    ("…it's the number of days you're aiming to show up") is then untrue.
    After this item, either the two surfaces show one agreed presentation of
    the unset state or each states which reader it reflects, and every copy
    clause is true in the unset state. Both numbers remain true of their own
    reader — the ▲ D17-16 two-reader design is not reopened.
30. **AC-E18-30** *(from R-EP17-08; named early item — the live session's
    recommendation, 2026-11-19)* Saving the Profile preferences form never
    promotes an **unset** `weeklyGoalDays` to a stored value as a side effect
    of a save made for an unrelated field: today the whole-bag
    `putStudyPreferences(data)` (`StudyPreferencesForm.tsx:239`) stores `3`,
    silently converting an unconstrained (7-day) planner into a 3-day one.
    After this item, only an explicit student choice of a study-days preset
    stores the key (dirty-field write, or carrying the unset state in the
    payload — the mechanism is a breakdown/refiner call), closing the side
    door on the invisible-constraint defect ▲ D17-16 exists to prevent.

### Outcome 4 — Adaptive response when the plan is wrong (brief item 2)

14. **AC-E18-14** The product detects a small, **named and enumerated** set of
    persistent mismatches between the stored plan-shaping preferences and the
    student's completed sessions over a defined look-back window. The initial
    set is proposed in ▲ D18-6; each member names its own evidence threshold and
    its own single remedy.
15. **AC-E18-15** Detection is a **pure, deterministic function** of completed
    and missed session facts plus the stored preferences — no clock inside it,
    no I/O, no randomness — in the same shape as `calibration.ts` and
    `momentum.ts`, and unit-testable from fixtures alone.
16. **AC-E18-16** **The product offers; it never applies.** A detected mismatch
    produces a suggestion the student can accept or decline. Accepting writes
    the named preference through the existing `@CurrentUser()`-scoped
    `PUT /study-preferences` and says exactly what changed. Declining changes
    nothing. **No code path writes a plan-shaping preference without an explicit
    accept.** This is a governing constraint of the epic, not a nicety: an ADHD
    app that changes itself without asking destroys the trust it exists to
    build.
17. **AC-E18-17** A declined suggestion does not return on the next plan: a
    decline is remembered, and the same suggestion is only raised again under a
    stated re-raise rule (▲ D18-6).
18. **AC-E18-18** At most **one** suggestion is shown at a time, chosen by a
    deterministic, documented priority; a student with three mismatches is never
    handed three offers.
19. **AC-E18-19** Every suggestion states the evidence in the student's own
    terms ("you've finished 2 of the last 12 morning sessions"), with no
    language that grades or blames the student (D13-9), and is never framed as
    the app having learned something about them.
20. **AC-E18-20** A student with little or no history gets **no** suggestions:
    below the evidence threshold the feature is silent, exactly as
    `calibration.ts` emits nothing under `CALIBRATION_MIN_SAMPLES`.

### Outcome 5 — Lighter-touch pace adjustment (brief item 4)

21. **AC-E18-21** From the proposed week itself, a student can express a
    reshaping intent in the terms the week is shown in — at minimum "too
    packed / spread this out more" and "not this day" — and sees the week
    rebuilt accordingly.
22. **AC-E18-22** Each such gesture writes the **same** underlying stored
    preferences as the EP17G presets (`spreadPercent`, `weeklyGoalDays`) through
    the same `PUT /study-preferences`; there is no second storage model and no
    proposal-only override.
23. **AC-E18-23** The EP17G preset groups remain available and in agreement:
    after a gesture, the preset groups show the value the gesture produced, and
    the two surfaces never disagree about the current choice.
24. **AC-E18-24** The destructive consequence EP17G already discloses stays
    disclosed: a gesture that rebuilds the week from scratch says so before it
    runs, as `SPREAD_CHANGE_SENTENCE` does today
    (`pacingPresets.ts`), and the write + rebuild failure behaviour of
    `PacingControls` (separate write-failure and rebuild-failure messages, a
    single polite announcement, `aria-busy` during the rebuild) is preserved.
25. **AC-E18-25** A gesture whose intent cannot be honoured says so rather than
    silently doing nothing.

### Quality (shared across all five)

26. **AC-E18-26** Keyboard operability with an announced result for every new
    control (offer accept/decline, gestures, first-run dismissal), visible
    focus, reduced motion, and WCAG 2.2 AA on every surface this epic touches.
27. **AC-E18-27** No new route is added without a recorded ▲ decision; every
    new read and write is scoped to the authenticated `userId` through the
    existing ownership helpers, and a not-owned or missing resource returns the
    uniform 404 `Resource not found`.
28. **AC-E18-28** Reasons, suggestions and pressure signals add **no** new
    silent failure mode: when the data for one is unavailable, the surface
    renders without it rather than erroring, and the plan itself is never
    blocked by an explanation.

### Test requirements

- **TR-E18-01** Domain unit tests for the reason vocabulary: one fixture per
  enumerated case (pacing target reached, day budget exhausted, outside the
  rule 9b selection, served early by rule 3, no free time), each asserting the
  exact case and that the day's placed minutes agree with it; plus an
  exhaustiveness test that every declining path yields a case.
- **TR-E18-02** Determinism and additivity: the identity fixture battery
  (`identity-fixtures.ts`, `identity.spec.ts`) still passes with reasons on;
  V-17-3's byte-identical baseline at `spreadPercent 0` still holds; a payload
  with the reason field absent deserialises and renders.
- **TR-E18-03** Domain unit tests for the mismatch detector: one fixture per
  named mismatch at, just under and just over its threshold; the
  below-threshold silence case; determinism over shuffled input; the priority
  function with several simultaneous mismatches.
- **TR-E18-04** API tests proving the offer path writes **only** on an explicit
  accept and **only** the acting student's own bag; a declined offer writes
  nothing; ownership scoping on every new read; a negative test asserting no
  code path mutates a plan-shaping preference from a detection alone
  (AC-E18-16's guard).
- **TR-E18-05** Component tests for the day reasons, the pressure signal, the
  first-run framing (shown once, dismissible, re-reachable) and the gestures —
  each by keyboard and by pointer, with the announcement asserted, plus empty,
  loading and error states.
- **TR-E18-06** Copy tests: the forbidden-words list (`src/test/forbiddenWords.ts`)
  covers every new string, and the suggestion copy is asserted against the
  blame-free rules.
- **TR-E18-07** Playwright: plan → a day's reason is visible and matches the
  week → a tight assignment is flagged before confirming → a reshaping gesture
  changes the week and the EP17G presets agree → an offer is declined and does
  not return on the next plan; axe stops on each changed surface.
- **TR-E18-08** A first-run journey from a newly registered account: the
  assumptions are stated, the study-days assumption can be set in place, and a
  second plan does not show the framing again.

## Dependencies and sequencing notes

- **EP17 is closed** *(updated at the EP17 closeout, planner, 2026-11-19;
  this bullet originally read "EP17 is not reviewed")*: the combined review
  passed (pass 1, `d8d226f`,
  [review.md](../stories/EP17/artifacts/EP17/review.md)) with four polish
  findings, two of which this proposal now carries (AC-E18-29/30, D18-11).
  ▲ D18-2's recommended handling — plan now, implement after the review
  passes — has its precondition met; the breakdown's re-grounding pass is
  still required.
- EP13 supplies the two precedents EP18's new domain modules should follow
  (`calibration.ts`, `momentum.ts`): pure arithmetic, an explicit sample gate,
  an honest `null` below it.
- EP14 supplies the hard flag that is BL-14-03's own stated trigger.
- No EP18 work should begin while an EP17 implementer is still writing; the
  one-writer rule in `.agents/core.md` is unchanged.

## Technical notes (inspected baseline, 2026-11-19)

- **Engine:** `apps/api/src/domain/study-planning/scheduler.ts` — rule 9
  `evenShareOf` `:504`, `dayTakeOf` `:529`, rule 9b `normalBudgetOf` `:472`,
  `capacityAfter` `:487`, the criticality filter `:787`, the output's
  `studyDays` `:938`. Spec `scheduler.spec.ts` (1751 lines) now pins rule 9/9b
  behaviour; an explainability field that is additive need not perturb it, which
  is a reason to prefer the additive shape (▲ D18-3).
- **Determinism harness:** `identity-fixtures.ts` (218 lines),
  `identity.spec.ts`, `pacing-fixtures.ts` (174 lines) — the existing gates any
  engine change must clear.
- **Adaptive precedents:** `calibration.ts` (`CALIBRATION_MIN_SAMPLES = 3`,
  the `[0.5, 3.0]` clamp, the `null` below the gate) and `momentum.ts`
  (`computeMomentum`, the Monday-start week, the repairable run).
- **Service:** `study-plans.service.ts` — `toPacing` `:216-238`, the payload
  types `:361-408`, `gatherPlanData` `:1046`, the ▲ D17-16 planning projection
  `:1056-1061`, the two `pacing:` call sites `:1256` and `:1361`.
- **Preferences:** `preferences.ts` — `STUDY_PREFERENCE_KEYS` `:22-31`
  (nine keys including EP17A's `spreadPercent`), defaults `:56-74`, bounds
  `:84-95`, `PREFERENCES_BAG_MAX_BYTES` 4096. Any new persisted key for EP18
  should follow ▲ D17-5's additive pattern.
- **Frontend:** `features/plan-proposal/ui/PlanProposal.tsx` (302 lines, four
  regions), `EditableWeek.tsx` (264 lines — the day column at `:200-227` is
  where a reason line belongs), `EditableSessionCard.tsx` (309 lines),
  `PacingControls.tsx` (185 lines), `ProposalActionBar.tsx`,
  `WhatThisKeepsCard.tsx`, `MovedForwardList.tsx`;
  `features/study-plan/ui/WorkloadWarnings.tsx` (the after-the-fact warnings);
  `entities/study-preferences/model/pacingPresets.ts` (the shared preset copy);
  `features/study-preferences/ui/StudyPreferencesForm.tsx` (471 lines);
  `features/onboarding/ui/WizardShell.tsx` (the three-step wizard);
  `pages/plan/ui/PlanPage.tsx` (the "Plan my week" entry).
- **Unverified / for a breakdown and a refiner:** whether the reason is
  computed in the engine or in the service (▲ D18-3 recommends, a breakdown
  must confirm against `scheduler.ts`'s internals); the interaction shape of the
  item-(D) gestures (genuinely unsettled — a refiner question, not something to
  invent here); where the first-run framing lives (a step in the proposal, a
  pre-plan screen, or an onboarding step — ▲ D18-8); the durable "has planned
  before" fact (▲ D18-7); whether the decline memory needs a persisted key or
  can be derived (▲ D18-6). `useProposal.ts`, `EditableSessionCard.tsx` and
  `StudyPreferencesForm.tsx` were read only in part.

## Decision Register

`Ruling` is yours. ▲ rows are material (security, persisted data, public
contract or user-visible workflow). **Every row below is `Proposed`** — this
epic has not been broken down and nothing ratifies by default until a child
starts — **except D18-11**, which records a capture the user approved at the
EP17 closeout (2026-11-19) and changes nothing about the proposal's status.

| ID | Decision | Options considered | Recommended | Ruling |
|---|---|---|---|---|
| D18-1 | Milestone and release | (a) a new **M11**, release 1.5, with its own review unit; (b) fold into M10 as "1.4 polish"; (c) split — explainability into M10, the rest into M11 | **(a)** — four of the five items add product claims ("it tells you why", "it notices and asks"), and one adds a new persisted signal. That is not polish, and (c) would attach new work to a review unit that has not yet run | Proposed |
| ▲ D18-2 | Starting EP18 against an unreviewed EP17 | (a) **plan now, implement after the EP17 combined review passes** — the proposal is written against today's code, with a re-grounding pass at breakdown time; (b) wait for the review before planning at all; (c) start implementing in parallel with EP17H | **(a)** — (c) violates the one-writer rule and would build on code a reviewer may change; (b) wastes the window in which the user's five items are fresh and the EP17 code is fully in context. (a) costs one re-grounding pass against whatever the EP17 review changes. ▲ — it governs when user-visible work starts | Proposed |
| ▲ D18-3 | Where a placement reason is computed | (a) **in the engine, as an additive per-day output field** — the scheduler is the only place that knows which rule declined to place more, and it can record the case as it declines; (b) in the service, reconstructed from the engine's output + the day budgets; (c) in the client, inferred from `perDayMinutes` and `studyDays` | **(a)** — (c) is guessing and would violate AC-E18-02 outright; (b) can distinguish "outside the selection" and "no free time" but cannot tell "pacing target reached" from "day budget exhausted" without re-deriving rule 9's arithmetic, which is exactly the duplication that drifts. (a) keeps the reason next to the rule, and an additive output field preserves purity and leaves `scheduler.spec.ts`'s existing expectations intact. ▲ — new public payload contract | Proposed |
| ▲ D18-4 | Offer versus apply for adaptive changes | (a) **offer only** — a detected mismatch always produces a suggestion the student accepts or declines; no detection ever writes; (b) auto-apply with an undo and an after-the-fact notice; (c) a student-set "let the app adjust for me" mode | **(a)** — this is the epic's governing constraint. (b) and (c) both create a state in which the plan changed and the student did not change it; for an ADHD student the whole value of the planner is that it is predictable between Monday and Wednesday. (c) is (b) with consent collected once, far from the moment it matters, and it doubles the behaviours every later story must reason about. ▲ — persisted data and user-visible workflow | Proposed |
| ▲ D18-5 | The MVP AI boundary for item (B) | (a) **a closed set of named, hand-written, deterministic rules** over counted session facts, each with a stated threshold, in the shape of `calibration.ts`; (b) a scoring model or learned ranking over the student's history; (c) natural-language suggestion text generated at runtime | **(a)** — (b) and (c) are both the excluded AI capability, and (c) additionally makes the copy untestable against the blame-free rules. The product already proves (a) is enough: `calibration.ts` corrects systematically optimistic estimates with a gated median and nothing else. ▲ — it fixes the MVP boundary this epic is most likely to drift across | Proposed |
| ▲ D18-6 | The initial mismatch set, thresholds and the decline memory | (a) **start with three**, each with a single remedy: *time-of-day mismatch* (sessions in a recurring part of the day are consistently not completed → offer to stop planning there), *pace mismatch — too much* (the weekly plan is persistently under-completed → offer a gentler spread or fewer study days), *pace mismatch — too little* (study days are consistently exceeded → offer more days or a fuller week); gate each at a `CALIBRATION_MIN_SAMPLES`-style minimum, remember a decline, and re-raise only after a stated further run of the same evidence; (b) ship one mismatch first and add more later; (c) a general rules engine | **(a)**, with (b) as the fallback if a breakdown sizes (a) over two windows — the three cases share one detector shape and one offer surface, so a single mismatch would build the whole machine for a third of the value. (c) is over-engineering for three rules. The exact thresholds, look-back window and re-raise rule are deliberately left to the breakdown, which must state them as testable numbers. ▲ — persisted decline state and user-visible workflow | Proposed |
| ▲ D18-7 | How "this is your first plan" is known | (a) **derive it from durable, student-scoped data already stored** — whether the student has ever confirmed a plan — so a new browser or device cannot replay the moment; (b) a `localStorage` flag; (c) a new persisted preference key for "has seen the first-plan framing" | **(a)** where the derivation is honest, falling back to **(c)** as an additive key under ▲ D17-5's pattern if it is not. (b) is rejected: it shows the first-run moment again on every new device and hides it after a cache clear, which is the opposite of both intentions. ▲ — persisted data | Proposed |
| D18-8 | Where the first-plan framing lives | (a) **inside the proposal, as a first-time region above the week**, dismissible; (b) a separate pre-plan screen before the proposal; (c) a fourth onboarding wizard step | **(a)** — (b) adds a screen between the student and the thing they asked for, which is the friction EP16 removed; (c) asks for pace decisions before the student has ever seen a plan, which is when they are least able to answer. (a) states the assumptions beside the week they produced. The exact composition is a refiner question | Proposed |
| D18-9 | Delivery sequence for the five items | (a) the brief's ranking: explainability → adaptive response → onboarding → pace gestures → deadline pressure; (b) **explainability → deadline pressure → first-plan framing → adaptive response → pace gestures**; (c) by independent shippability alone | **(b)** — a considered challenge to the brief's order, agreeing on #1 first and disagreeing about second place. Deadline pressure is the cheapest item in the epic (the engine already computes criticality at `scheduler.ts:787`; the work is carrying one boolean out and saying it calmly) and it rides the *same* payload extension as the reasons, so doing it second costs a fraction of a window and halves the contract churn. Adaptive response is the largest item — a new domain module, a new persisted decline state, a new offer surface — and it reads better *after* the reason vocabulary exists, because an offer's evidence sentence and a day's reason sentence want the same words. Pace gestures go last because they are the item most likely to change shape once students have used explainability | Proposed |
| D18-11 | **Post-EP17-review capture (planner, epic closeout 2026-11-19):** where the EP17 review's two D17-16-seam polish findings land | (a) **carry both into Outcome 3 as named additions** — AC-E18-29 (R-EP17-07: the unset-state display disagreement between the proposal's "Custom (7 days)" and Profile's "Steady — 3 days", with the then-untrue copy clause) and AC-E18-30 (R-EP17-08: Profile's whole-bag save promoting an unset `weeklyGoalDays` to a stored `3`); (b) backlog rows `BL-17-<nn>` in the EP17 register; (c) a sixth outcome | **(a)** — both findings are squarely Outcome 3's "first plan / unset state" territory and touch the same ▲ D17-16 seam its AC-E18-10…13 already work; a backlog row would orphan them from the outcome that will inevitably reread the same code, and a sixth outcome is too large a home for two sharply-scoped items. R-EP17-08 is carried as its own AC (the smallest honest home) per the live session's recommendation (coordinator, 2026-11-19) rather than left a loose finding. The proposal stays a proposal: no story, no owner, no schedule | Approved (user-approved capture, 2026-11-19) |
| D18-10 | Backlog rows cited rather than duplicated | **BL-14-03** (placement explainability, EP14 register) — **recommended for promotion into Outcome 1**: its stated trigger ("EP14E ships … or a user asks") has **fired on both limbs** (EP14E shipped; the user asked on 2026-11-19), which supersedes EP17 D17-10's "its trigger has not fired". **BL-17-03** (placement explainability for pacing, EP17 register) — **absorbed into Outcome 1** as its rule 9/9b cases; it should not be promoted separately. **BL-17-02** (name the weekdays you study) stays deferred, but Outcome 5 may fire its trigger and a breakdown must re-check it. **BL-16-02** (proposal on the EP15 calendar grid), **BL-17-01** (intra-gap placement), **BL-16-04** (reminders), **BL-14-05** (momentum goal history), **BL-14-02** ("drained today") all stay deferred and are **cited, not duplicated**; no EP18 outcome restates them. No backlog row is edited by this proposal — promotion is a breakdown action, and this is not a breakdown | Proposed |

## Security / privacy / accessibility invariants

No new credential surface is proposed. Every new read and write is expected to
reuse the existing `@CurrentUser()`-scoped routes; a new route would need its
own ▲ row.

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| No plan-shaping preference is ever written without an explicit accept | A detection path writes `spreadPercent` as a side effect of building the proposal | ▲ D18-4 (a): detection returns a suggestion object and has no write capability; the only writer stays `PUT /study-preferences` behind an accept action | TR-E18-04 (incl. the negative guard), AC-E18-16 |
| A suggestion or an accept only ever touches the acting student's own data | A crafted accept applies a suggestion to another student's bag | `PUT /study-preferences` resolves the bag from `@CurrentUser()` (unchanged); any new read uses the `ownership.ts` helpers and returns the uniform 404 | TR-E18-04, AC-E18-27 |
| Explaining a plan reveals nothing the student cannot already see | A reason sentence quotes another student's data, or a course the student cannot read | Reasons are derived only from the run's own inputs, all of which are already the student's own scoped data | TR-E18-01, AC-E18-02 |
| The engine stays pure and deterministic with reasons on | A reason is built from a `Map` iterated in input-insertion order | Reasons are recorded during the existing sorted iterations; the identity fixture battery runs the same input twice and compares bytes | TR-E18-02, AC-E18-04 |
| No minute is silently dropped and no warning weakens | The pressure signal replaces a deficit warning and a real shortfall stops being reported | The deficit/deferred classification is untouched by this epic; the pressure signal is additive and separately tested | TR-E18-01, AC-E18-07 |
| A low-history student is not told things about themselves that the data cannot support | Two missed sessions produce "mornings don't work for you" | The evidence gate (▲ D18-6), in the shape of `CALIBRATION_MIN_SAMPLES` — below it the feature is silent | TR-E18-03, AC-E18-20 |
| No copy grades or blames the student | A suggestion says "you've been falling behind" | D13-9 and the EP16 copy rules, enforced by `src/test/forbiddenWords.ts` extended to the new strings | TR-E18-06, AC-E18-09, AC-E18-19 |
| Every new control is operable by keyboard with an announced result | An offer can only be accepted by pointer | The EP17G pattern (`PacingControls`: disabled-while-busy, `aria-busy`, one polite announcement at the end) is the model to reuse | TR-E18-05, AC-E18-26 |

## Verification tasks (proposed)

- **V-18-1:** a fixture week in which one day is empty for each enumerated
  reason — every day carries the right sentence, and no day carries none.
- **V-18-2:** the EP17 determinism gates (V-17-3 and the EP13J identity test)
  re-run with reasons enabled.
- **V-18-3:** a tight assignment is visible as tight on the proposal **before**
  confirming, and the existing deficit warnings are unchanged beside it.
- **V-18-4:** a freshly registered account's first plan states its assumptions;
  the second plan does not.
- **V-18-5:** a declined suggestion is still absent on the next two plans, and
  no stored preference changed.
- **V-18-6:** a reshaping gesture and the EP17G presets agree on the stored
  values after each is used.

## What this proposal deliberately does not do

- It does **not** break the work into stories. There is no `docs/stories/EP18/`
  directory, no `EP18A…`, no execution queue, no delivery home, no review unit
  and no sizing. A breakdown is a **separate planner dispatch the user has not
  yet requested**, and it should start by re-grounding this file against
  whatever the EP17 combined review changes (▲ D18-2).
- It does **not** promote, edit or stamp any backlog row. D18-10 records which
  rows the outcomes above correspond to and recommends BL-14-03's promotion;
  the row itself stays exactly as it is in the EP14 register until a breakdown
  promotes it.
- It does **not** reopen any EP17 decision, AC or story. D17-10's assessment
  that BL-14-03's trigger had not fired is noted as superseded by events, not
  rewritten.

## Independently shippable

Outcomes 1, 2 and 3 are each independently shippable and each delivers student
value alone. Outcome 4 is independently shippable but is the largest and reads
best after Outcome 1. Outcome 5 refines EP17G and is shippable alone, but is
the one most likely to change shape once Outcome 1 is in students' hands —
which is why D18-9 puts it last. Outcomes 1 and 2 share one payload extension
and should be delivered together or back to back.
