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
| `weeklyGoalDays` | **Existing key; ▲ D17-2 Ruled (a) (user, 2026-11-19):** it becomes the number of days of the window the planner may use, and stays the momentum yardstick | Two readers (▲ D17-16): momentum default `3` (`readStudyPreferences`, the EP13K yardstick, unchanged); **planning default when the key was never stored: `7` (unconstrained)** — the planning read is `readPlanningStudyPreferences` (`preferences.ts`), and an invalid stored value (wrong type or out of bounds) is treated as *unchosen* for planning while the momentum read still repairs it to `3` | `1…7` | Proviso: the control is visibly surfaced with its instruction meaning (EP17G). The stored default stays `3` because the same key is the EP13K yardstick; only an explicitly chosen number narrows the plan (▲ D17-16). EP17A writes no code for the losing options |

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
  oneSitting(A) = min(A.remainingAtRunStart, sessionLengthMinutes)
                  with sessionLengthMinutes clamped to [minSessionMinutes, maxSessionMinutes]
  evenShare(A)  = max(oneSitting(A), ceil(A.remainingAtRunStart / |usableDays(A)|))
  paceTarget(A, D) = dayBudget(D) - (dayBudget(D) - evenShare(A)) * spreadPercent/100
  dayTake(A, D) = max(paceTarget(A, D), A.remaining - capacityAfter(A, D))
  A takes at most dayTake(A, D) minutes on D.
```

`evenShare` is a property of the assignment, not of the day: it is computed
once per run and is the same on every day of `A`'s horizon.

The `oneSitting(A)` term is the **one-sitting floor** (F-EP17B-01): the share
is never paced below a single session for `A`, so pacing spreads work across
days without shattering one sitting into sub-session slivers. Without it the
even share is unsatisfiable together with EP17B-AC5 / ▲ D17-3 — a 15-minute
assignment over a five-day horizon would get a 3-minute target, below
`minSessionMinutes`, and the "twelve small assignments" student would have
**nothing** placed. The floor is therefore what keeps rule 9 from throttling
the *number* of distinct pieces of work a day may hold; it only ever raises a
target, so it cannot defeat the spread for a large assignment (for which
`ceil(remaining / |usableDays|)` already exceeds one sitting).

The `max(…)` term is the **feasibility floor** (R-EP17-01): pacing may never
defer below what the later days can nominally still absorb, so a day's take is
raised back up whenever deferring the full pace amount would leave
`A.remaining > capacityAfter(A, D)` after the day.

The feasibility floor is **retained but currently non-binding** (F-EP17C-01,
verified by a deletion experiment: removing it left all 372
`study-planning` domain tests passing). It has not yet been separated from
rule 3's critical test, because §4 narrows `capacityAfter` for **both**
consumers deliberately — the critical test must see the narrowed estimate or
rule 3 could not notice a deadline the selection alone would miss — so on a
given day-start snapshot an item is either critical (and exempt from pacing)
or has `remaining ≤ capacityAfter`, which makes the floor's second term ≤ 0.
It is kept because it is the documented guard for the R-EP17-01 bounded
guarantee below and stops being redundant the moment a future story gives the
two consumers different capacity estimates. Nothing here weakens that
guarantee: the floor only ever raises a take, and the guarantee itself rests
on rule 3 running first.

**Amendment at epic closeout (R-EP17-10, planner, 2026-11-19).** The
statement above is confirmed against the engine as shipped in its **final
EP17C form**: the floor term `max(paceTarget, remaining − capacityAfter)`
lives in `dayTakeOf` (`scheduler.ts:529-537`), the critical test is
`remaining > capacityAfter` (`scheduler.ts:787`), and **both consumers read
the same narrowed `capacityAfter`**, so the floor is **currently inert** in
the shipped engine — proven by the EP17C deletion experiment (372/372 domain
tests indistinguishable without it) — while remaining the documented
R-EP17-01 guard. On the F-EP17C-03 denominator: `|usableDays(A)|` in
`evenShare` is, in the shipped engine, **exactly the §4 selection** —
`evenShareOf` (`scheduler.ts:504-521`) counts horizon days through the
narrowed `normalBudgetOf`, not every day with free time, pinned by the
discriminating fixture *"divides the even share over the selected days, not
every day with free time"* (`scheduler.spec.ts`, EP17C-AC1). The D-B3
"non-zero run-start budget" reading below is therefore operational shorthand
for the same set, no longer merely coincident with it.

- `usableDays(A)` = the days of `A`'s horizon that survive the study-day
  selection of §4. Operationally the engine counts the horizon days whose
  **run-start** budget is non-zero (D-B3, `scheduler.ts:393-404`), which is
  the same set once §4's narrowed budgets are in place. For an overdue
  assignment the horizon is the whole window (`scheduler.ts:306`), unchanged.
- With `spreadPercent = 0`, `paceTarget = dayBudget(D)` — the pre-EP17
  behaviour, byte for byte.
- The target is a **soft ceiling under the feasibility override**: the
  critical pass (`scheduler.ts:547-553`) ignores it entirely, so rule 3 is
  untouched, and the feasibility floor above keeps the *normal* pass from
  deferring work the remaining horizon cannot nominally hold.
- **Bounded guarantee (R-EP17-01).** `capacityAfter` (`scheduler.ts:317-332`)
  is optimistic by design: it sums `dayBudgetOf` over later horizon days,
  ignoring break buffers, gap fragmentation against `minSessionMinutes` and
  competing assignments. The guarantee pacing makes is therefore **no worse
  than the rule 3 guarantee the engine already makes** — not an absolute
  "never a new deficit". Where that residual optimism bites (a fragmented
  final day; two assignments sharing a tight final day), the adversarial
  fixtures named in EP17B's test list pin the chosen behaviour. The
  one-sitting floor does not weaken this: it only ever *raises* a day's take,
  so it defers strictly less work than the unfloored share would.
- The target never raises a day's budget; `dayBudgetOf` (rule 2) still caps
  the day as a whole.
- Minutes the target declines are reported by the existing classification
  (`scheduler.ts:584-628`) — no new category, no silent loss.
- Purity: `evenShare` — including its `oneSitting` floor — is computed from
  run-start inputs only (`remainingMinutes` as handed in, the run-start day
  budgets, the horizon and the session-length preferences), never from the
  mutating `remaining`, so it is stable within a run and independent of
  iteration order.

## 4. Study-day selection (EP17C owns the definition; gated by ▲ D17-2)

▲ D17-2 is **Ruled (a)** (user, 2026-11-19): `weeklyGoalDays` is the planning
instruction this section reads.

```text
usableDays(window) = the `weeklyGoalDays` days of the window with the most
                     baseline free minutes; ties broken by earlier date.
```

- Computed once per run from `baselineFreeMinutes` (`scheduler.ts:290-293`),
  which is already free of run state — so the selection is deterministic.
- The narrowed budget is **pass-aware** (R-EP17-03) — a single zeroing of
  `dayBudgetOf` would starve the critical pass too, because `budgetLeft` is
  seeded from it (`scheduler.ts:534-537`) and `placeBlock` returns 0 at
  `budget <= 0` (`:489-490`), on the critical path as well (`:550-551`). The
  selection applies per consumer:
  - the **normal rotation**'s `budgetLeft` seed: `0` on an unselected day;
  - the **critical pass** (rule 3): the *real* budget on every day — a
    deadline always beats a preference, and a one-day-per-week student with a
    Tuesday deadline must still get Tuesday;
  - **`capacityAfter`**: the narrowed budgets, so the feasibility estimate
    sees only the days the plan may normally use;
  - the **anchor pass**: the narrowed budgets, per ▲ D-C2 (a) — less slack
    legitimately pins more sessions `FIXED`.
- `weeklyGoalDays = 7` reproduces today's behaviour (AC-E17-05).
- **`usableDays(window)` reads the *planning* value of `weeklyGoalDays`**
  (▲ D17-16, user, 2026-11-19): the value `readPlanningStudyPreferences`
  returns, which the service hands the engine (`gatherPlanData` →
  `preview` / `catchUpPreview`). A student who has never explicitly chosen a
  study-days number is unconstrained — the whole window is usable,
  effectively `7`. Only an explicitly stored number narrows the selection.
  The *stored default* stays `3` because the same key is the EP13K momentum
  yardstick — raising it would restate every student's motivational goal as
  "study 7 days a week".
- If the selection would leave an assignment with no usable day before its
  deadline, that assignment's **normal pass** falls back to its full horizon
  rather than producing a deficit — smoothness never manufactures a miss.
  This fallback and the critical pass are the two explicit carve-outs from
  EP17C-AC1's "at most N distinct dates", each covered by its own fixture.

## 5. The pacing block in the proposal payload (EP17D owns it)

`PlanPreview` and `CatchUpPreview` gain one additive object; no route
changes, no field is removed or renamed.

```ts
pacing: {
  spreadPercent: number;      // the effective lever
  studyDays: string[];        // the §4 *selected* day set (see below)
  perDayMinutes: Record<string, number>; // date → placed minutes
}
```

`studyDays` is the **§4 selection, in date order, independent of whether any
minutes were placed on a day** (R-EP17-05) — a selected day with an empty
`perDayMinutes` entry is still listed, which is exactly the distinction ▲ D-D1
exists to carry to the client. A day used only by the rule 3 critical pass
(outside the selection, §4) appears in `perDayMinutes` but **not** in
`studyDays`.

Consumers: EP17F's summary line and EP17G's preset controls. Clients that
ignore it are unaffected.

## 6. Proposal surface contract (EP17E/EP17F own it)

- **One** rendering of the week. The grid is the editable surface (▲ D17-4).
- Per-session edits available in place: change day, change start, change
  length, pin / make flexible, delete with undo. Every edit has a keyboard
  path and an announcement, carrying over `PlanSessionEditor`'s existing
  semantics — moving or typing a start time pins a `FLEX_DAY` session
  (EP13H D-H5, `PlanSessionEditor.tsx:99`, `:194-200`); resizing does not.
- **Day labels:** weekday + day + month in the plan's time zone, from the one
  shared helper `features/study-plan/lib/dayLabel.ts` — `"2026-11-19"` →
  `"Wed, Nov 19"` (shipped by EP17E; D-E5 chose the exact string over the
  "Wed 19 Nov" shorthand this contract first illustrated). No raw ISO date is
  rendered to a student **anywhere on `/plan/proposal`** (AC-E17-10) — that
  includes the three non-grid call sites EP17H owns under D17-17:
  `WhatThisKeepsCard`'s locked-session line, `MovedSessionRow`'s date and the
  409 conflict-summary lines in `PlanProposal`. The `<time dateTime="…">`
  attribute keeps the ISO value; only the rendered text changes.
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
