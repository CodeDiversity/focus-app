# EP17 shared contracts

The one home for the contracts more than one EP17 child touches. Cite a
section; never restate it in a story. Baseline inspected 2026-11-19 at
`075fec9`.

## 1. Code baseline (inspected)

| Concern | Path | Anchors |
|---|---|---|
| Scheduling engine (pure) | `apps/api/src/domain/study-planning/scheduler.ts` | day loop `:539`, `dayBudgetOf` `:296`, `capacityAfter` `:324`, `placeBlock` `:482`, `commitBlock` `:437`, `desiredFor` `:410`, deficit classification `:584`, anchor pass `:647` |
| Engine spec | `apps/api/src/domain/study-planning/scheduler.spec.ts` | 1035 lines; pins current placement |
| Preferences contract | `apps/api/src/domain/study-planning/preferences.ts` | keys `:19`, defaults `:51`, bounds `:70`, bag cap `:82`, validator `:121`, reader `:196` |
| Response projection | `apps/api/src/modules/study-plans/study-plans.service.ts` | `toStudyPreferencesResponse` `:194` |
| Engine input assembly | `apps/api/src/modules/study-plans/study-plans.service.ts` | `gatherPlanData` `:990`, `preview` `:1123`, `catchUpPreview` `:1185`, `schedule({…})` `:1125-1134` |
| Preferences routes | `apps/api/src/modules/study-plans/study-plans.controller.ts` | `@Controller('study-preferences')` `:27`, `GET` `:32`, `PUT` (merge) `:44` |
| Proposal surface | `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx` | seven regions; `PlanWeek` `:182`, `PlanSessionEditor` `:196`, header actions `:110-128` |
| Session editor | `apps/web/src/features/study-plan/ui/PlanSessionEditor.tsx` | ISO day labels `:48`, `moveBy` `:87`, `resizeBy` `:110`, pin toggle `:270` |
| Preferences form | `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` | preset cards `:98-115` (EP13N D-N1), mounted at `pages/profile/ui/ProfilePage.tsx:221` |

## 2. The spread preference levers (EP17A owns the definition)

Additive keys in the existing `preferences.studyDefaults` JSON bag
(▲ D17-5). Every pre-EP17 bag reads back unchanged; a missing key falls back
to its default exactly like `breakMinutes` and `densityPercent` did when
EP13F appended them.

| Key | Meaning | Default | Bounds | Notes |
|---|---|---|---|---|
| `spreadPercent` | How strongly the pacing target binds. `100` = pace fully (an assignment takes its even share of its horizon); `0` = reproduce the pre-EP17 engine exactly | `70` | `0…100` | The "off" value `0` is what TR-E17-02's byte-identical baseline run uses (D17-6) |
| `weeklyGoalDays` | **Existing key, semantics decided by ▲ D17-2.** Under option (a) it becomes the number of days of the window the planner may use | `3` | `1…7` | Under option (b) a new `studyDaysPerWeek` key is added instead and `weeklyGoalDays` stays a goal. EP17A does not write code for the losing option |

Asked in the UI as named presets (the EP13N pattern), not as a raw number —
exact labels are EP17G's refiner call.

Invariants:

1. `STUDY_PREFERENCE_KEYS`, `STUDY_PREFERENCE_BOUNDS`,
   `STUDY_PREFERENCE_DEFAULTS`, `validateStudyPreferences`,
   `readStudyPreferences` and `toStudyPreferencesResponse` list the same key
   set, in the same order.
2. `PUT /study-preferences` stays a merge of any subset.
3. The serialized bag stays under `PREFERENCES_BAG_MAX_BYTES` (4096).
4. No Prisma migration.

## 3. The pacing rule (EP17B owns the definition)

Added to the engine's documented rule list as **rule 9**, after EP15C's rule
8. It changes *how much* a day may take for one assignment; it changes
nothing about ordering, gap choice, energy, study blocks, breaks, min/max
block length or the anchor partition.

```text
For each assignment A and each day D of A's horizon that the plan may use:
  evenShare(A, D) = ceil(A.remainingAtRunStart / |usableDays(A)|)
  paceTarget(A, D) = dayBudget(D) - (dayBudget(D) - evenShare(A, D)) * spreadPercent/100
  A takes at most paceTarget(A, D) minutes on D.
```

- `usableDays(A)` = the days of `A`'s horizon that survive the study-day
  selection of §4. For an overdue assignment the horizon is the whole window
  (`scheduler.ts:306`), unchanged.
- With `spreadPercent = 0`, `paceTarget = dayBudget(D)` — the pre-EP17
  behaviour, byte for byte.
- The target is a **soft ceiling under the feasibility override**: the
  critical pass (`scheduler.ts:547-553`) ignores it entirely, so rule 3 is
  untouched and no deadline is traded for smoothness.
- The target never raises a day's budget; `dayBudgetOf` (rule 2) still caps
  the day as a whole.
- Minutes the target declines are reported by the existing classification
  (`scheduler.ts:584-628`) — no new category, no silent loss.
- Purity: `evenShare` is computed from run-start inputs only, so it is stable
  within a run and independent of iteration order.

## 4. Study-day selection (EP17C owns the definition; gated by ▲ D17-2)

Under ▲ D17-2 option (a):

```text
usableDays(window) = the `weeklyGoalDays` days of the window with the most
                     baseline free minutes; ties broken by earlier date.
```

- Computed once per run from `baselineFreeMinutes` (`scheduler.ts:290-293`),
  which is already free of run state — so the selection is deterministic.
- A day outside the selection gets `dayBudget = 0` for the normal pass. The
  **critical** pass (rule 3) may still use it: a deadline always beats a
  preference, and a one-day-per-week student with a Tuesday deadline must
  still get Tuesday.
- `weeklyGoalDays = 7` reproduces today's behaviour (AC-E17-05).
- If the selection would leave an assignment with no usable day before its
  deadline, that assignment's horizon falls back to its full horizon rather
  than producing a deficit — smoothness never manufactures a miss.

Under ▲ D17-2 option (b) the same algorithm reads a new `studyDaysPerWeek`
key and `weeklyGoalDays` is untouched. Under option (c) EP17C is dropped and
its ACs are withdrawn with a recorded ruling.

## 5. The pacing block in the proposal payload (EP17D owns it)

`PlanPreview` and `CatchUpPreview` gain one additive object; no route
changes, no field is removed or renamed.

```ts
pacing: {
  spreadPercent: number;      // the effective lever
  studyDays: string[];        // the civil dates the plan used (§4)
  perDayMinutes: Record<string, number>; // date → placed minutes
}
```

Consumers: EP17F's summary line and EP17G's preset controls. Clients that
ignore it are unaffected.

## 6. Proposal surface contract (EP17E/EP17F own it)

- **One** rendering of the week. The grid is the editable surface (▲ D17-4).
- Per-session edits available in place: change day, change start, change
  length, pin / make flexible, delete with undo. Every edit has a keyboard
  path and an announcement, carrying over `PlanSessionEditor`'s existing
  semantics — moving or typing a start time pins a `FLEX_DAY` session
  (EP13H D-H5, `PlanSessionEditor.tsx:99`, `:194-200`); resizing does not.
- **Day labels:** weekday + day + month in the plan's time zone (e.g.
  "Wed 19 Nov"). No raw ISO date is rendered to a student (AC-E17-10).
- **Decision controls:** exactly one confirm (**Use this plan**) and one
  decline (**Not now**), reachable from the editing area without scrolling to
  the page header (AC-E17-11).
- Preserved from EP16C: conflict marking per session + the conflict summary,
  `WorkloadWarnings`, `CalibrationNote`, `WhatThisKeepsCard` (incl. the lock
  toggle), `MovedForwardList`, the rolled-over banner, the loading skeleton,
  the error card and the heading focus behaviour.
- Copy rules: EP16's forbidden-word list (no "behind", "missed", "overdue",
  "failed"; D13-9) applies to every new string.

## 7. Known windows between sequential children

| Window | Opens | Closes |
|---|---|---|
| The spread keys exist but nothing reads them | EP17A | EP17B / EP17C |
| The engine paces but no student can change the lever | EP17B | EP17G |
| The payload carries `pacing` but nothing renders it | EP17D | EP17F |
| The grid is editable but the page still stacks seven regions | EP17E | EP17F |

Acceptable on the development branch because EP17 ships as one review unit
(EP16 D16-17 precedent).
