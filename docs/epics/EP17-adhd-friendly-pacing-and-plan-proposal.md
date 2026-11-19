# EP17: ADHD-Friendly Pacing and a One-Surface Plan Proposal

**Epic ID:** EP17
**Status:** Breakdown complete (planner, 2026-11-19) → [docs/stories/EP17](../stories/EP17/README.md). Quality gate: **Plan Ready** — every ▲ row ruled as recommended (user, 2026-11-19); ▲ D17-2 ruled (a) with a UI-visibility proviso (EP17G owns the surfacing). Plan review (required — the preferences bag gains persisted keys): **passed** — pass 1 Changes Required, corrections applied, pass 2 **Plan Ready** (2026-11-19, `005bc78`; [plan-review.md](../stories/EP17/plan-review.md)). **Reviewed — shipped on the development branch; closed 2026-11-19.** Combined implementation review **passed** (pass 1, reviewed commit `d8d226f`; [review.md](../stories/EP17/artifacts/EP17/review.md)); no blocker or should-fix. Epic closed out by the planner 2026-11-19: the four polish findings are dispositioned — R-EP17-07/08 → EP18 (AC-E18-29/30, D18-11), R-EP17-09 → BL-17-04 (BL-15-08 cited), R-EP17-10 resolved (contracts §3). Open polish: BL-17-01…04, BL-15-08.
**Release:** 1.4 (proposed, D17-1)
**Priority:** High / P0
**Labels:** `studypilot`, `adhd`, `scheduling`, `planning`
**Dependencies:** EP06 (planning engine), EP13 (placement v2, flex anchors, calibration), EP14 (energy, hard flag), EP15 (day bounds, study blocks), EP16 (the single proposal surface at `/plan/proposal`) — all closed. One sequential writer across all layers.
**Milestone:** M10 (proposed, D17-1).

## Epic Summary

"Plan my week" currently answers "when could this fit?" by filling the
earliest days first. A student with ADHD gets Monday and Tuesday at the daily
cap and a hollow Thursday, then meets a proposal screen that renders the same
week twice and labels days `2026-11-19`. This epic changes the engine's
objective from *earliest-feasible* to *paced across the week*, collapses the
proposal into one editable surface, and makes the study preferences actually
drive the spread — reachable from the proposal, not only from Profile.

## Description

As a student with ADHD, I want my week's work spread at a pace I can keep, on
one screen I can confirm or nudge without hunting, so that the plan survives
contact with Wednesday.

### Verified current behavior (inspected 2026-11-19)

**Front-loading — `apps/api/src/domain/study-planning/scheduler.ts`** (673
lines, pure: no clock, no DB, no Prisma, no `@nestjs/*`; spec
`scheduler.spec.ts`, 1035 lines). The engine already has breaks, a density
cap, round-robin interleaving, energy matching (`byEnergyPreference`),
EP15 preferred study blocks and the `FLEX_DAY`/`FIXED` anchor pass. Nothing
in it spreads. Three mechanisms pull work earlier and none pushes it later:

1. **The day loop** (`scheduler.ts:539`) walks `days` in order and fills each
   day up to `dayBudgetOf(date)` before it looks at the next day. There is no
   global objective relating a day's load to the week's remaining work.
2. **`dayBudgetOf`** (`scheduler.ts:296`) = `min(dailyCapMinutes, floor(free *
   densityPercent / 100))`. With the defaults (240 min, 80%) a day with 8 h
   free gives `min(240, 384) = 240` — density never binds, the cap does, and
   neither value knows how much of the week is left.
3. **`capacityAfter`** (`scheduler.ts:324`) exists only to pull *critical*
   work **earlier** (rule 3's feasibility override, `scheduler.ts:547-553`).
   It has no counterpart that defers work with slack.
4. Minor: `commitBlock` (`scheduler.ts:437-469`) always starts a block at
   `interval.startMinute`, so blocks hug the top of the earliest gap.

The deficit/deferred classification (`scheduler.ts:584-628`) reports every
minute the rules declined to place — `OVERDUE`, `NO_AVAILABLE_TIME`,
`INSUFFICIENT_TIME_BEFORE_DEADLINE`, `deferredMinutes` for work due after the
window. That "no silent loss" guarantee is load-bearing for this epic.

**The proposal surface —
`apps/web/src/features/plan-proposal/ui/PlanProposal.tsx`** (248 lines, the
EP16C surface at `/plan/proposal`) stacks seven regions: `CalibrationNote` →
`PlanWeek` → `PlanSessionEditor` → conflict summary → `WhatThisKeepsCard` →
`MovedForwardList` → `WorkloadWarnings`.

- The week renders **twice**: `PlanWeek` is a read-only 7-column grid
  (`PlanProposal.tsx:182-195`) and `PlanSessionEditor`
  (`features/study-plan/ui/PlanSessionEditor.tsx`, 315 lines) immediately
  below re-lists every session as a form row
  (`PlanProposal.tsx:196-202`). Moving one session means scrolling past the
  grid to find its row in a second list.
- The editor's day dropdown labels days with raw ISO dates —
  `const dayOptions = days.map((d) => ({ value: d, label: d }))`
  (`PlanSessionEditor.tsx:48`), e.g. "2026-11-19".
- **Use this plan** / **Not now** live in the header
  (`PlanProposal.tsx:110-128`), far above the editing area a student is
  actually looking at when they decide.
- Each row carries five buttons (Move earlier / Move later / Shorten /
  Lengthen / Delete) plus a pin toggle and three fields — rich, but only
  reachable in the duplicate list.

**Preferences are wired, but none of them spreads.**
`readStudyPreferences` (`apps/api/src/domain/study-planning/preferences.ts:196`)
→ `gatherPlanData` (`study-plans.service.ts:990`) → the engine input
(`study-plans.service.ts:1125-1134`). Eight keys
(`preferences.ts:19-28`): `sessionLengthMinutes` 60, `minSessionMinutes` 15,
`maxSessionMinutes` 120, `dailyCapMinutes` 240, `breakMinutes` 15,
`densityPercent` 80, `dailyGoalMinutes` 60, `weeklyGoalDays` 3.

- Every lever is **session shape** or **per-day volume**. None of them
  expresses *across how many days* or *at what pace*.
- `weeklyGoalDays` **gates nothing**: `preferences.ts:58-59` documents it as
  "only the yardstick the momentum read reports progress against", yet its
  label ("study 3 days a week") reads like an instruction to the planner.
- The only editing surface is Profile
  (`apps/web/src/pages/profile/ui/ProfilePage.tsx:221` → `StudyPreferencesForm`,
  539 lines). There is no path from a disliked proposal to the knob that
  would fix it. The form already uses named preset cards
  (Relaxed / Balanced / Packed for density,
  `StudyPreferencesForm.tsx:98-115`, EP13N D-N1) — the pattern to reuse.

### The tension this epic has to name

"Study 3 days a week" and "spread work across the week" pull in opposite
directions. A plan cannot both honour a three-day week and use all seven days.
EP17 resolves it explicitly in ▲ D17-2 rather than letting two controls
quietly fight: the student chooses **how many days** the planner may use, and
the spread happens **within those chosen days**.

## Scope

- **(A) The engine spreads.** A per-assignment, per-day **pacing target**
  derived from its remaining minutes over the days of its horizon becomes a
  soft ceiling in the day loop, so a day takes its share rather than its fill.
  The existing feasibility override still wins, so deadlines are never traded
  for smoothness, and the deficit/deferred categories are unchanged (no silent
  loss of minutes). The engine stays pure and deterministic.
- **(A2) The planner picks study days.** `weeklyGoalDays` becomes a planning
  instruction (▲ D17-2): the engine selects that many days from the window by
  availability and spreads inside them, instead of touching all seven.
- **(B) One proposal surface.** The week grid itself becomes editable; the
  duplicate read-only grid and the separate editor list collapse into one
  region; days read as "Wed 19 Nov", not `2026-11-19`; the confirm and
  decline controls sit with the content they decide on.
- **(C) Preferences drive the spread and are reachable at plan time.** New
  spread levers join the preferences bag additively, are asked as named
  presets (the EP13N pattern), and can be changed **from the proposal** with
  an immediate re-preview — not only from Profile.

## Out of scope

- **A maximum-sessions-per-day ceiling.** Explicitly rejected by the user
  (D17-3): a student with many small assignments would be throttled unfairly.
  The spread lever is minute-based only.
- Changing the ordering comparator (`ordering.ts`), the free-interval helper
  (`intervals.ts`), the anchor partition (EP13G), the energy rules (EP14E) or
  the study-block tiers (EP15C).
- Intra-gap placement (centring a block inside its gap instead of hugging
  `interval.startMinute`) — D17-9, backlog row.
- Explaining *why* a session landed on a given day in the UI
  (BL-14-03 stays deferred).
- Merging the proposal into the EP15 calendar grid — BL-16-02 is **absorbed**
  as "the grid is editable", not as "render on the calendar grid"; the
  calendar merge stays deferred.
- Reminders/notifications, focus-session changes, quick capture.
- AI, syllabus parsing, LMS integrations, grade calculations, flashcards,
  native mobile.

## Acceptance Criteria (draft — stable IDs AC-E17-01…14 assigned at breakdown)

**Engine and pacing**

1. For an assignment whose remaining work fits comfortably inside its
   horizon, the engine places **no more than its daily pacing target** on any
   one day, where the target is derived from its remaining minutes divided
   over the days of its horizon that the plan may use. Work is therefore
   distributed across the horizon rather than packed into its earliest days.
2. Feasibility still wins: an assignment that cannot otherwise meet its
   deadline is served first and ignores its pacing target, exactly as rule 3
   does today, and the normal pass never defers below the feasibility floor
   (contracts §3). Bounded claim (R-EP17-01): pacing introduces no deadline
   miss beyond the rule 3 guarantee the engine already makes — `capacityAfter`
   stays optimistic about fragmentation and competition, and those residual
   cases are pinned by EP17B's adversarial fixtures.
3. No minutes are lost: every minute the rules decline to place is still
   reported through the existing `deficitMinutes` / `deferredMinutes` fields
   and the existing categories (`OVERDUE`, `NO_AVAILABLE_TIME`,
   `INSUFFICIENT_TIME_BEFORE_DEADLINE`). No new category is introduced.
4. The engine stays a pure, deterministic function: no clock, no randomness,
   no I/O, every iteration over a sorted structure, byte-identical output for
   identical input. With pacing disabled the output is byte-identical to the
   pre-EP17 engine for the same input.
5. The planner uses at most the student's chosen number of study days inside
   the window, selected deterministically from the days that have free time,
   and spreads work within them (▲ D17-2). A student who chooses seven gets
   today's seven-day behaviour.

**Preferences**

6. The preferences bag gains its new spread key(s) **additively**: a bag
   written before EP17 still reads back valid with every pre-EP17 key
   unchanged, the new key falling back to its default; `STUDY_PREFERENCE_KEYS`,
   `STUDY_PREFERENCE_BOUNDS`, the validator, the defensive reader and the
   response projection all cover it; `PUT /study-preferences` still merges any
   subset.
7. `weeklyGoalDays` means one thing in the product: whatever ▲ D17-2 rules, no
   control claims to instruct the planner while gating nothing, and the
   momentum read's behaviour either keeps its current meaning or is updated
   with it in the same change.
8. A student can change the spread levers **from the proposal** — without
   losing the proposal — and sees the re-planned week immediately; the same
   levers remain on Profile and the two surfaces write the same contract.

**Proposal surface**

9. The proposed week renders **once**. Each session is edited in place on the
   grid: change day, change start, change length, pin/unpin, delete with undo.
   The separate read-only grid + editor-list pair no longer exists.
10. Days are labelled in human form (weekday + day + month) everywhere in the
    proposal; no raw ISO date is shown to a student. "Everywhere" means the
    whole page, not only the week grid: the locked-session lines in
    `WhatThisKeepsCard`, the "moved forward" rows in `MovedSessionRow` and
    the 409 conflict-summary lines in `PlanProposal` read the same label as
    the grid, from the one shared `dayLabel` helper. **EP17E** owns the week
    grid (shipped); **EP17H** owns those three secondary call sites and the
    V-17-4 sweep that proves the page is clean (D17-17).
11. **Use this plan** and **Not now** are reachable from the editing area
    without scrolling back to the page header, on desktop and on a 360×640
    phone; exactly one confirm and one decline exist.
12. Every EP16C guarantee survives: conflicts are marked per session and
    summarised, workload warnings, calibration note, "what this plan keeps"
    (locked/completed) and "moved forward" are all still shown; confirming
    still replaces only `SCHEDULED && !locked` rows; the lock toggle still
    works.

**Quality (shared)**

13. Keyboard operability (every in-place edit has a keyboard path and an
    announced result), visible focus, reduced motion and WCAG 2.2 AA hold on
    the rebuilt proposal; no copy uses "behind", "missed", "overdue" or
    "failed" (D13-9, EP16 copy rules).
14. The engine's existing specs are updated **deliberately**, case by case,
    with the reason recorded; the EP13J identity test and the EP15
    determinism check (V-15-3) still pass; no API route is added or removed.

### Test requirements (draft — TR-E17-01…07 assigned at breakdown)

- **TR-E17-01** Domain unit tests for pacing: an assignment with slack is
  spread; a tight-deadline assignment is not; a week of many small
  assignments is **not** throttled (the D17-3 counterexample); the minute-sum
  invariant holds **per deficit category** (R-EP17-02): for non-overdue work,
  placed + deficit + deferred minutes equal the input remainder; for
  `OVERDUE`, deficit equals the input remainder (`scheduler.ts:594-596`) and
  placed is asserted alongside.
- **TR-E17-02** Determinism and compatibility: identical input → identical
  output over a fixture battery; with pacing off, output is byte-identical to
  the recorded pre-EP17 baseline.
- **TR-E17-03** Preferences contract tests: a pre-EP17 bag reads back
  unchanged; bounds, cross-field rules and the PUT merge cover the new
  key(s); the response projection exposes exactly the contract keys.
- **TR-E17-04** API tests for the preview payload's pacing block and for the
  plan-time preference write + re-preview path, each with ownership scoping.
- **TR-E17-05** Component tests for the editable grid: each in-place edit
  (day, start, length, pin, delete+undo) by keyboard and by pointer, with the
  announcement asserted; conflict marking; empty, loading and error states.
- **TR-E17-06** Playwright: plan → spread looks even across the chosen days →
  nudge one session in place → Use this plan → Today shows it; change a
  spread preset from the proposal and see the week change; a locked session
  survives a replan; axe stops on the rebuilt proposal.
- **TR-E17-07** The recorded, reviewed diff of `scheduler.spec.ts`: every
  changed expectation names which rule changed it and why
  (AC-E17-14's audit trail).

## Proposed Stories

Sequenced vertically for the single implementer (contract → engine → service
→ frontend → integration). Letters are stable IDs.

| ID | Title | Outcome | Depends on | Size |
|---|---|---|---|---|
| **EP17A** | Spread preferences contract | The new spread key(s) exist end to end in the preferences contract: domain defaults/bounds/validator/reader, the response projection and the PUT merge; backward-compatible with every pre-EP17 bag | — | ~1 window |
| **EP17B** | Engine: per-assignment daily pacing | The day loop honours a per-assignment pacing target; feasibility override and deficit categories unchanged; a documented, reviewed spec update | EP17A | ~1.5 windows |
| **EP17C** | Engine: study-day selection | The engine uses at most the chosen number of days, picked deterministically from availability, and spreads inside them (▲ D17-2) | EP17B | ~1 window |
| **EP17D** | Service wiring and the pacing block in the proposal payload | The service feeds the new levers to the engine and the preview/catch-up payloads carry a small pacing block the UI can read | EP17C | ~0.5–1 window |
| **EP17E** | Editable week grid | The grid hosts in-place editing; `PlanWeek` + `PlanSessionEditor` collapse into one region; human day labels | EP17D | ~1.5 windows |
| **EP17F** | Proposal composition and decision affordances | Seven regions become a short, scannable surface; confirm/decline sit with the content; phone-first (absorbs BL-16-09) | EP17E | ~1 window |
| **EP17G** | Plan-time pacing controls | Spread presets reachable from the proposal with an immediate re-preview; Profile parity | EP17F | ~1 window |
| **EP17H** | Cross-layer e2e, determinism gate and parent index | TR-E17-06, the determinism/identity gates, the parent index | EP17A–EP17G | ~1 window |

Review unit: one combined review after EP17H. **Plan review: required** —
the preferences bag gains persisted keys (planning-checklist rule: "a new
migration or persisted-data contract").

## Technical Notes (inspected baseline, 2026-11-19)

- **Engine:** `apps/api/src/domain/study-planning/scheduler.ts` — day loop
  `:539`, `dayBudgetOf` `:296`, `capacityAfter` `:324`, `placeBlock` `:482`,
  `commitBlock` `:437`, deficit classification `:584`, anchor pass `:647`.
  Spec `scheduler.spec.ts` (1035 lines) pins current placement; changing
  placement **will** require deliberate expectation updates (AC-E17-14,
  TR-E17-07) — this is planned work, not a surprise.
- **Preferences:** `apps/api/src/domain/study-planning/preferences.ts` —
  `STUDY_PREFERENCE_KEYS` `:19`, `STUDY_PREFERENCE_DEFAULTS` `:51`,
  `STUDY_PREFERENCE_BOUNDS` `:70`, `validateStudyPreferences` `:121`,
  `readStudyPreferences` `:196`, `PREFERENCES_BAG_MAX_BYTES` `:82`.
  Projection `toStudyPreferencesResponse` (`study-plans.service.ts:194`);
  routes `GET`/`PUT /study-preferences` (`study-plans.controller.ts:27-44`).
- **Service:** `gatherPlanData` (`study-plans.service.ts:990`) →
  `preview` (`:1123`) and `catchUpPreview` (`:1185`); both call `schedule`
  with the same input shape (`:1125-1134`). EP16C D16-4: the web client uses
  the catch-up pair for every proposal.
- **Frontend:** `features/plan-proposal/ui/PlanProposal.tsx`,
  `features/plan-proposal/model/useProposal.ts`,
  `features/study-plan/ui/PlanWeek.tsx`,
  `features/study-plan/ui/PlanSessionEditor.tsx`,
  `features/plan-proposal/ui/WhatThisKeepsCard.tsx`, `MovedForwardList.tsx`,
  `features/study-plan/ui/WorkloadWarnings.tsx`, `CalibrationNote.tsx`;
  preferences form `features/study-preferences/ui/StudyPreferencesForm.tsx`
  (presets `:98-115`), mounted at `pages/profile/ui/ProfilePage.tsx:221`.
- **Unverified / for the refiner:** the exact in-place interaction (drag vs.
  keyboard-first controls vs. a per-session popover) — EP17E is
  `Needs refinement` and this is deliberately not invented here; the visual
  density of an editable 7-column grid below `md`; whether the pacing block
  belongs in the payload or is recomputed client-side (EP17D D-D2);
  `useProposal.ts` and `PlanWeek.tsx` were not read end to end.

## Decision Register

`Ruling` is yours. ▲ rows are material (security, persisted data, public
contract or user-visible workflow). Rows without ▲ ratify by default at
implementation start.

| ID | Decision | Options considered | Recommended | Ruling |
|---|---|---|---|---|
| D17-1 | Milestone and release | (a) new **M10**, release 1.4 — cross-layer (engine + API + web), its own review unit; (b) fold into M9 as "1.3 polish" | **(a)** — this changes what the planner optimises for, which is a product claim, not polish | Ratified (user, 2026-11-19) |
| ▲ D17-2 | What `weeklyGoalDays` means | (a) **it becomes a planning instruction**: the planner uses at most that many days of the window, chosen deterministically from the days with the most free time (ties by date), and the pacing of D17-4 spreads work *within* those days; the momentum yardstick keeps reading the same key, so one number means one thing; (b) keep it a pure motivational goal and add a **separate** `studyDaysPerWeek` planning key, so a student can want 5 and plan 3; (c) leave it decorative and spread across all seven days | **(a)** — the control already reads like an instruction ("study 3 days a week"); honouring it removes the contradiction instead of adding a second number to reconcile, and "spread inside my chosen days" is the only reading under which spreading and a 3-day week coexist. (b) is the right answer only if you want goal and plan to disagree on purpose. Names the tension in the epic description | **Ruled (a) (user, 2026-11-19)** — with one proviso: the control must be clearly **visible in the UI** with its new meaning (the student can see that their study-days number now steers the planner). No new story: EP17G already owns the study-days control on the proposal (D-G2 option a) and on the Profile form; its copy must state the instruction meaning. **Refined by ▲ D17-16** (what an *unset* `weeklyGoalDays` means) |
| D17-3 | The spread lever is minute-based | (a) a per-assignment **per-day pacing target** in minutes, derived from remaining minutes over the usable days of its horizon, applied as a soft ceiling under the existing feasibility override; (b) a maximum number of sessions per day | **(a)** | **Ruled (a) (user, 2026-11-19)** — (b) is rejected: "a student with many small assignments would be unfairly throttled". No session-count ceiling is to be reintroduced |
| ▲ D17-4 | In-place editing on the week grid | (a) the week grid itself becomes the editable surface; the read-only `PlanWeek` + separate `PlanSessionEditor` list are replaced by one region; (b) keep the two regions and only improve the labels and button placement | **(a)** | **Ruled (a) (user, 2026-11-19)** — "In place editing may make it feel much better." Expected to be the largest slice; split if sizing demands; `Needs refinement` where the interaction design is genuinely unsettled |
| ▲ D17-5 | How the new spread levers are stored | (a) additive keys in the existing `preferences.studyDefaults` JSON bag, with bounds, validator, reader and projection extended — no migration, pre-EP17 bags read back unchanged; (b) new Prisma columns | **(a)** — the bag is explicitly additive (EP13F and EP13K both appended this way, `preferences.ts:13-18`), it is under the 4 KB cap, and a column change would be a migration for two integers | Ratified (user, 2026-11-19) |
| D17-6 | How the engine is told to pace | (a) pacing is **on by default** with a named intensity derived from the preference presets, and the engine accepts a value that reproduces the pre-EP17 behaviour exactly (AC-E17-04's compatibility clause); (b) pacing always on with no off switch; (c) pacing behind a per-request flag | **(a)** — an exactly-reproducible "off" value is what makes the byte-identical regression test (TR-E17-02) possible and keeps the 1035-line spec's untouched cases meaningful | Ratified (user, 2026-11-19) |
| D17-7 | Spec update strategy for `scheduler.spec.ts` | (a) update expectations case by case, each with a comment naming the rule that changed it, and add the new pacing cases alongside; keep a frozen pre-EP17 baseline fixture for TR-E17-02; (b) rewrite the spec around the new behaviour; (c) freeze the old spec and write a parallel one | **(a)** — the spec is the only record of why each placement is correct; a rewrite would discard EP06/EP13/EP14/EP15 reasoning that still holds | Ratified (user, 2026-11-19) |
| ▲ D17-8 | Changing a spread preset from the proposal | (a) the proposal offers the spread presets inline; choosing one writes `PUT /study-preferences` and immediately re-previews, replacing the proposal in place (a visible, reversible change — the old proposal was never saved); (b) link out to Profile and come back; (c) a proposal-only override that is not persisted | **(a)** — (b) is the "no path from a disliked proposal to the knob" defect this epic exists to remove; (c) hides the lever that would fix next week too. Note it is a write from a preview surface: it must be explicit, labelled and announced | Ratified (user, 2026-11-19) |
| D17-9 | Intra-gap placement (`commitBlock` hugs the gap start) | (a) leave it — a block still starts at `interval.startMinute`; record "centre or distribute blocks inside a gap" as a backlog row; (b) change it in this epic | **(a)** — it is cosmetic next to the day-level objective and would perturb a large share of the 1035-line spec for little student-visible gain | Ratified (user, 2026-11-19) |
| D17-10 | Backlog absorption at this breakdown | BL-16-02 (proposal on the week grid) is **partly absorbed**: EP17E makes the proposal's own grid editable; the "render on the EP15 calendar grid" half stays deferred. BL-16-09 (phone-first proposal, spec in EP16K) is **absorbed into EP17F**. BL-14-03 (placement explainability) stays deferred — its trigger has not fired, though pacing makes it more valuable | — | Ratified (user, 2026-11-19) |
| D17-11 | Refiner gate | EP17E (in-place interaction), EP17F (composition, phone-first) and EP17G (preset copy and the inline write affordance) are `Needs refinement`; EP17A–EP17D and EP17H are specified in-story | — | Ratified (user, 2026-11-19) |
| ▲ D17-16 | What an **unset** `weeklyGoalDays` means to the planner (refines ▲ D17-2 (a)) | (a) **an unset key means unconstrained**: a student who has never explicitly chosen a study-days number is planned across the **whole week** (effectively 7), and only an explicitly stored number narrows the plan; `STUDY_PREFERENCE_DEFAULTS.weeklyGoalDays` **stays 3**, because the same key is the EP13K momentum yardstick; (b) let the stored default (3) instruct the planner for everyone, so every student's preview narrows to three days from EP17C onward; (c) raise `STUDY_PREFERENCE_DEFAULTS.weeklyGoalDays` to 7 so planner and yardstick share one default | **(a)** — (b) silently narrows the plans of students who set the key as a *motivational goal*, before EP17G ships the control that explains the new meaning; that is exactly what ▲ D17-2's visibility proviso exists to prevent. (c) fixes the planner by breaking the yardstick: it would turn every student's momentum goal into "study 7 days a week" (EP13K). (a) keeps one key with one stored meaning and makes the *absence* of a choice, not the default value, the unconstrained case. Driver: implementer findings F-EP17C-02 and F-EP17B-03 — the engine began constraining real previews before the control existed. ▲ — persisted-preference semantics and user-visible workflow | **Ruled (user, 2026-11-19)** |
| D17-17 | Who closes the remaining raw-ISO-date gap on the proposal (implementer findings F-EP17E-02 and F-EP17F-01): three secondary surfaces — `WhatThisKeepsCard.tsx:80`, `MovedSessionRow.tsx:23` and the 409 conflict-summary list in `PlanProposal.tsx:223-226` — still render `2026-11-19` beside a grid that now reads "Thu, Nov 19" | (a) **extend AC-E17-10 to name the three call sites and give them to EP17H**, which is unimplemented (nothing frozen), already owns the V-17-4 sweep's evidence and already owns updating the journeys the rebuild touched — including `plan-flow.spec.ts:781`, the 409 assertion that pins the ISO string; (b) a new child **EP17I** for the three call sites; (c) a backlog row deferred past EP17 | **(a)** — the work is three `dayLabel(...)` call sites plus two component tests and one e2e assertion, far under a child's worth of outcome, so (b) would be a story invented to carry a one-line change and would push the review unit out by a window. (c) leaves the exact inconsistency this epic exists to remove visible on the page it rebuilt — one surface speaking two date languages is the ADHD-and-simplicity friction of the standing user standard (2026-11-19). Neither EP17E's nor EP17F's frozen AC text is reopened: both stay met as written and as implemented; AC-E17-10 is the **epic** criterion, and it gains a second owner rather than a changed promise. Not ▲: no security, persisted-data or contract change, and the user-visible change is making one page agree with itself under an already-ruled criterion | Proposed |

## Security / privacy / accessibility invariants

No new credential or tenancy surface; no new route. Every read and write this
epic touches already scopes by the authenticated `userId`.

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| Pacing introduces no deadline miss beyond the rule 3 guarantee the engine already makes (bounded claim, R-EP17-01) | Pacing defers minutes onto a final day whose nominal budget is fragmented below `minSessionMinutes`, or shared with a competing assignment — `capacityAfter` (`scheduler.ts:317-332`) is optimistic and never sees either | The rule 3 feasibility override runs **before** pacing and ignores the pacing target (`scheduler.ts:547-553`); the normal pass floors each day's take at `max(paceTarget, remaining − capacityAfter)` (contracts §3's feasibility floor), so pacing never defers below nominal feasibility; the residual optimism is pinned by the adversarial fixtures | TR-E17-01, EP17B-AC2, EP17B's *pacing under optimistic capacity* fixtures |
| No minute is silently dropped | Pacing declines to place work and nobody reports it | The existing deficit/deferred classification already reports "everything the rules declined to place" (`scheduler.ts:612-618`); EP17B adds a sum invariant test | TR-E17-01, EP17B-AC3 |
| The engine stays pure and deterministic | A pacing heuristic iterates a `Map` in insertion order that depends on input order | Every iteration is over `days` or the comparator-sorted `progress`; the identity fixture battery runs the same input twice and compares bytes | TR-E17-02, EP17B-AC4 |
| A pre-EP17 preferences bag never breaks a student's plan | A bag with eight keys hits a reader expecting nine and throws or returns `NaN` | `readStudyPreferences` is per-key with per-key defaults (`preferences.ts:201-230`); EP17A adds the legacy-bag test | TR-E17-03, EP17A-AC2 |
| A preference write from the proposal only ever writes the acting student's own bag | A crafted request changes another student's spread | `PUT /study-preferences` already resolves the bag from `@CurrentUser()`; EP17G adds no new endpoint | TR-E17-04 |
| The proposal still protects locked and completed work | Replanning after the rebuild removes a locked session | `catch-up/confirm` replaces only `SCHEDULED && !locked` (EP13A) — unchanged and relied upon | TR-E17-06 |

## Verification tasks

- **V-17-1:** pacing smoke — a fixture week with one large assignment due
  Friday shows minutes on every usable day, not only the first two.
- **V-17-2:** the many-small-assignments counterexample (D17-3) places the
  same total minutes as the pre-EP17 engine, with no session throttled away.
- **V-17-3:** byte-identical baseline run with pacing at its "off" value.
- **V-17-4:** `grep` the proposal surface for raw ISO date rendering —
  AC-E17-10 leaves none. Scoped to the **whole** `/plan/proposal` page, not
  the week grid alone (D17-17): EP17E cleared the grid; EP17H clears
  `WhatThisKeepsCard`, `MovedSessionRow` and the 409 summary and records the
  final sweep.
- **V-17-5:** 360×640 — the confirm control is reachable from the editing
  area without scrolling to the page header (AC-E17-11).

## Remaining decisions

No ▲ row is open. One non-material row is `Proposed` and ratifies by default
when EP17H starts: **D17-17** (AC-E17-10's three remaining raw-ISO-date call
sites go to EP17H, not to a new child and not to the backlog) — raised by
implementer findings F-EP17E-02 / F-EP17F-01, logged as C-F-EP17E-02 and
C-F-EP17F-01 in [history.md](../stories/EP17/history.md). Every ▲ row is
ruled (user, 2026-11-19). ▲ D17-2 is ruled (a) with the
proviso that the study-days control is visibly surfaced with its instruction
meaning (EP17G owns it; no new story), refined by ▲ D17-16 (an unset
`weeklyGoalDays` means unconstrained). The two story rows the refiners
returned for a look are also ruled as recommended (user, 2026-11-19):
▲ D-G5 (spread preset labels) and ▲ D-F7 (the calibration note may sit inside
the collapsed disclosure). Breakdown:
[docs/stories/EP17](../stories/EP17/README.md).
