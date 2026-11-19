# EP17D — Service wiring and the `pacing` payload block — implementation record

**Implementer:** implementer session, 2026-11-19. **Branch:**
`hfi/9ae11317-13de-4365-8abb-4bf7e0e3c7f3/oak` (worktree), base `3e1f01c`
(the F-EP17C-02 correction committed immediately before this story — see
[F-EP17C-02-resolution.md](./F-EP17C-02-resolution.md)).

## Completed behavior

Both proposal payloads now state what the engine's pacing did, and the
engine's own study-day decision travels with its output instead of being
guessed at downstream.

### 1. The engine reports its selection

`SchedulerOutput` gained one additive key, `studyDays: string[]`
(`types.ts`): the rule 9b selection (contracts §4), **in date order** and
**independent of placement** — a selected day on which nothing was placed is
listed, a day the rule 3 critical pass reached from outside the selection is
not. `scheduler.ts` builds it as `days.filter((d) => studyDays.has(d))` at
the single return site, from the `studyDays` set rule 9b already computes
once per run from run-start data. No placement logic moved; the module stays
pure and deterministic.

`replan` (`catch-up.ts`) passes it straight through on `ReplanOutput`, so
the catch-up path reports the same selection as the preview path.

**Why the engine and not the service (deviation 1 below):** the service
never sees `baselineFreeMinutes`, so it cannot recompute the ranking, and
re-deriving it would have created exactly the second source of truth D-D3
rejected for the input side.

### 2. `gatherPlanData` → the engine

Verified rather than assumed (the story's technical note and F-EP17B-03 /
F-EP17C-02 both say the levers were already partly flowing): `gatherPlanData`
reads the whole preferences bag and both `preview` and `catchUpPreview`
forward it whole into `schedule({…})` / `replan({…})`, so `spreadPercent` and
`weeklyGoalDays` have reached the engine since EP17B/EP17C. **The engine-input
change for this story is therefore zero lines**, exactly as D-D3 (a)
predicted — the one real change at this seam was Part 1's planning read
(`data.planningPreferences`), committed separately at `3e1f01c`. EP17D-AC1 is
pinned by new tests rather than new wiring.

### 3. The `pacing` block (contracts §5, ▲ D-D1)

`PlanPreview` gained an additive `pacing: PlanPacing` as its **last** key;
`CatchUpPreview` inherits it. Every pre-EP17 field keeps its name, type and
position; no field removed, no route added, removed or renamed.

```ts
export type PlanPacing = {
  spreadPercent: number;                  // the effective lever
  studyDays: string[];                    // the §4 selected set, date order
  perDayMinutes: Record<string, number>;  // every window date → placed minutes
};
```

Built by one shared pure helper, `toPacing(effectiveSpreadPercent,
studyDays, days)`, called from both return sites:

- `spreadPercent` is read from `data.planningPreferences`, i.e. the value the
  **engine actually ran with**. D-D2 (a)'s deliberate duplication of
  `preferences.spreadPercent` is pinned equal by a test.
- `studyDays` is the engine's `output.studyDays` verbatim — never the days
  that happen to carry a session (R-EP17-05).
- `perDayMinutes` is derived from the **same `PlanPreviewDay[]` the response
  carries**, so EP17D-AC4 holds *by construction* rather than by a second,
  drifting computation. Every date of the window is present, `0` for an empty
  day; an empty run therefore yields a zeroed map, never `null`.

### 4. Web mirror

`apps/web/src/entities/study-plan/model/types.ts` gained `PlanPacing` and an
**optional** `pacing?: PlanPacing` on `PlanPreview` (EP17F/EP17G are the
consumers). Optional, not required, so the existing pre-EP17 fixtures keep
type-checking — the ACs do not require a web change, this is the mirror the
sizing block names.

### 5. The two frozen gates

`identity.snapshot.json` (EP15C-AC4) and `pacing-baseline.snapshot.json`
(EP17B-AC4 / TR-E17-02) were generated from engines whose output was exactly
`{ sessions, results }`, and both specs compare `JSON.stringify(output)`.
Rather than regenerate a frozen file for an additive reporting key, a new
exported helper `placementOf(output)` (`identity-fixtures.ts`) projects the
output to `{ sessions, results }` and both gates compare that. **Neither
snapshot file was touched** (`git diff` on both: empty), and both gates still
pin every placed minute, date, start, anchor and deficit.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| **EP17D-AC1** — `gatherPlanData` returns the spread levers and both previews pass them into `schedule({…})`; a stored preference changes the proposed week; no stored preference → the `readStudyPreferences` default | **Met.** Verified the levers already flow via the whole-bag forward (zero-line change, D-D3 (a)); `spreadPercent: 0` packs the week into strictly fewer dates than `spreadPercent: 100` on the same fixture, with an identical minute total; an unset bag yields `70` | `study-plans-pacing.service.spec.ts` — "a student's stored `spreadPercent` changes the week they are proposed", "…gets the default lever (70)", "the catch-up preview reads the same lever" |
| **EP17D-AC2** — both payloads carry the §5 block; `studyDays` is the **selected** set in date order including empty selected days; every pre-EP17 field keeps name, type and order; no route changes | **Met.** Key-set snapshots on both payloads (pre-EP17D set + exactly `pacing`); day and session shapes pinned; the selected-but-empty case and the critical-pass exclusion each have a fixture; no controller or route file touched | same spec, the AC2 and R-EP17-05 blocks; `study-plans-recovery-catch-up.service.spec.ts` key list (updated, one added key); `git diff --stat` shows no controller change |
| **EP17D-AC3** — both reads stay scoped to the authenticated student; `pacing` derives only from that student's run; missing/not-owned → uniform 404 | **Met.** `user.findUnique({ where: { id: userId } })`, `assignment.findMany({ where: { userId … } })` and `plannedSession.findMany({ where: { studyPlan: { userId } } })` asserted on the call; a two-student run shows B's block zeroed while A's is full; both endpoints throw `NotFoundException` with `Resource not found` for a missing user. The scoped `gatherPlanData` path is unchanged — `pacing` adds no query | same spec, the AC3 block (3 tests) |
| **EP17D-AC4** — `perDayMinutes` agrees with the sessions in the same payload, for every date, with no rounding allowance | **Met.** Recomputed from `days[].sessions` and compared with `toEqual` on a fixture that provably contains both an empty day and a multi-session day, on both payloads; also asserted equal to the day's existing `targetMinutes`, and key-order-equal to `days[]` | same spec, the AC4 block (3 tests) |

### The story's test list

| Required test | Where |
|---|---|
| non-default spread → a different week | AC1 block, test 1 |
| no stored preference → the default lever | AC1 block, test 2 |
| both response shapes: pre-EP17 keys + `pacing`, with a frozen pre-EP17 key-set snapshot | AC2 block, tests 1–2 (`PRE_EP17D_PREVIEW_KEYS`) |
| `perDayMinutes` recomputed, with an empty day and a multi-session day | AC4 block, test 1 |
| ownership: B never sees A's `pacing` or sessions; missing → uniform 404 | AC3 block, tests 2–3 |
| an engine run that places nothing returns a well-formed block, not `null` | "the empty run still returns a well-formed block", 2 tests |

## Changed paths

| Path | Change |
|---|---|
| `apps/api/src/domain/study-planning/types.ts` | `SchedulerOutput.studyDays` (additive) |
| `apps/api/src/domain/study-planning/scheduler.ts` | emit the selection at the single return site (3 lines + comment) |
| `apps/api/src/domain/study-planning/catch-up.ts` | `ReplanOutput.studyDays`, passed through |
| `apps/api/src/domain/study-planning/identity-fixtures.ts` | new exported `placementOf(output)` |
| `apps/api/src/domain/study-planning/identity.spec.ts`, `scheduler.spec.ts` | the two frozen gates compare `placementOf(...)`; **snapshots untouched** |
| `apps/api/src/modules/study-plans/study-plans.service.ts` | `PlanPacing`, `PlanPreview.pacing`, the `toPacing` helper, both return sites |
| `apps/api/src/modules/study-plans/study-plans-pacing.service.spec.ts` | +18 EP17D tests (the file was created by the Part 1 correction with 5) |
| `apps/api/src/modules/study-plans/study-plans-recovery-catch-up.service.spec.ts` | the catch-up key list gains `pacing` |
| `apps/web/src/entities/study-plan/model/types.ts` | `PlanPacing`, optional `PlanPreview.pacing` |
| `docs/stories/EP17/artifacts/EP17D/*`, the EP17D story Status/sizing, the README queue row, `artifacts/efficiency.md` | records |

No migration (none is possible — nothing is persisted). No controller, DTO or
route change.

## Verification

| Command | cwd | Result | Tested state |
|---|---|---|---|
| `npx jest` | `apps/api` | **57 suites, 1368 passed, 533 skipped, 0 failed** | working tree at closeout |
| `npx jest src/modules/study-plans/study-plans-pacing.service.spec.ts` | `apps/api` | 23 passed | the EP17D + F-EP17C-02 spec |
| `pnpm typecheck` | `apps/api` | clean | " |
| `pnpm lint` | `apps/api` | clean, `--max-warnings 0` | " |
| `pnpm format` | `apps/api` | "All matched files use Prettier code style!" | " |
| `pnpm typecheck` | `apps/web` | clean | " |

**Test counts (the only home).** Baseline at `9f6b1a6`: 56 suites, 1338
passed, 533 skipped, 0 failed. After the Part 1 correction (`3e1f01c`): 57
suites, 1350 passed (+1 suite, +12 tests). After EP17D: 57 suites, **1368
passed** (+18 tests, all new; no suite removed, no test deleted or relabelled).

**Protective gates.** `pacing-baseline.snapshot.json` 19/19 byte-identical at
`spreadPercent 0` and `identity.snapshot.json` 15/15 byte-identical — both
re-pass inside the run above, and `git diff` on both snapshot files is empty.
`apps/web` lint still has the 4 known pre-existing e2e failures (F-EP17A-01);
not re-run as part of this story, and not this story's.

## Deviations

1. **`studyDays` is emitted by the engine, not recomputed in the service.**
   The story's scope says "the engine itself (EP17A–EP17C)" is out. The
   addition is a **reporting-only output key** that changes no placement, and
   it is the only correct option: the service never sees
   `baselineFreeMinutes`, so it cannot reproduce the ranking, and a
   service-side re-derivation would be the second source of truth D-D3 (a)
   rejected. Isolated behind `placementOf` so both frozen gates are unaffected.
2. **The two frozen gates were taught to compare the placement projection**
   rather than the whole output object. No snapshot file changed; the
   assertions still cover every field they covered before.
3. **The web `pacing` is optional, not required.** The ACs require no web
   change; making it required would have broken existing pre-EP17 fixtures
   for no gain. EP17F/EP17G may tighten it when they consume it.
4. **`spreadPercent` on the block comes from the planning read**
   (`data.planningPreferences`), i.e. the value the engine ran with. It is
   identical to `data.preferences.spreadPercent` — Part 1's planning read
   differs only in `weeklyGoalDays` — but reading it from the engine's own
   input is what makes the block honest if a future lever ever diverges.

## Findings

- **F-EP17D-01** — source: running the suite after adding
  `SchedulerOutput.studyDays`; paths:
  `apps/api/src/domain/study-planning/identity.spec.ts:36-38`,
  `scheduler.spec.ts:1272-1276`; issue: both protective gates compare
  `JSON.stringify(scheduleOutput)` against a **frozen** snapshot file, so
  *any* additive output key — even one that provably changes no placement —
  fails 35 assertions and invites regenerating a file whose whole purpose is
  to be frozen; disposition: **fixed** by projecting through the new
  `placementOf(output)` helper (`identity-fixtures.ts`), so the gates pin the
  placement contract they were written for and stay additive-tolerant. The
  snapshot files are unchanged (`git diff` empty). Owner: closed here;
  closure evidence: `npx jest` → 1368 passed / 0 failed with both snapshot
  files untouched. **Note for EP17H:** the same trap is waiting for any
  future additive output key — re-running the gate is not enough, the
  projection must be kept.
- **F-EP17D-02** — source: verifying EP17D-AC1 rather than assuming it;
  paths: `study-plans.service.ts` `gatherPlanData` / `preview` /
  `catchUpPreview`; issue: the story's AC1 describes wiring that was already
  in place — the whole preferences bag has been forwarded to the engine since
  before EP17, so EP17B's and EP17C's levers reached real students the moment
  those stories landed (F-EP17B-03, F-EP17C-02). EP17D adds **zero** lines of
  engine input; disposition: expected (D-D3 (a) predicted it, and the
  technical notes called it "zero lines — which is the recommendation"), so
  AC1 is delivered as **executable coverage** of behaviour that was
  previously untested rather than as new wiring. No scope change. Owner:
  closed here; closure evidence: the three AC1 tests, which fail if either
  preview path stops forwarding the bag.
- **F-EP17D-03** — source: writing the R-EP17-05 fixtures; paths:
  contracts §5, `scheduler.ts` rule 9b; issue: contracts §5 says `studyDays`
  is "the §4 selection", and §4 says the selection is
  `min(weeklyGoalDays, |window|)` days chosen by baseline free minutes —
  **including days with zero free minutes**. So a student with a one-day
  week and a fully blocked window still gets a non-empty `studyDays` whose
  `perDayMinutes` are all `0`. That is correct and intended (the block exists
  precisely to carry selected-but-empty days), but the story's "error path"
  test wording — "empty `studyDays`, zeroed `perDayMinutes`" — anticipated an
  empty array; disposition: implemented per **contracts §5**, which is the
  binding definition, and the test asserts "well-formed and never `null`"
  plus zeroed minutes instead of an empty array. No doc change requested —
  §5 is already right; the story's test-list phrasing is the loose one.
  Owner: note it at the parent review. Closure evidence: the two
  "empty run" tests.

### Inherited findings

- **F-EP17C-02** — **closed** for the silent-narrowing half by the commit
  preceding this story; see
  [F-EP17C-02-resolution.md](./F-EP17C-02-resolution.md), which also records
  the `contracts.md` §2/§4 wording change requested of the planner (the
  implementer does not edit `contracts.md`). The ▲ D17-2 proviso half
  (visibly surfacing the control) stays open and owned by **EP17G**.
- **F-EP17B-03** — the `spreadPercent` half of the same window. Now
  **observable** rather than silent: `pacing.spreadPercent` is on every
  proposal payload. The window closes when EP17G ships the control.

## Remaining

Nothing open for EP17D. Next in the queue: **EP17E** (`Needs refinement` —
dispatch the refiner). The `pacing` block is rendered by nothing until EP17F
/ EP17G, which is the known window contracts §7 records.
