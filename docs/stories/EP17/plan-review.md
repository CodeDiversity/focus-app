# EP17 plan review

**Date:** 2026-11-19
**Pass:** 2 (pass 1 preserved below; findings keep their IDs)
**Reviewed commit:** pass 1 `476f970`; pass 2 `005bc78` (clean working tree)
**Overall verdict:** **Plan Ready** — all six pass-1 findings resolved at `005bc78`; see the pass-2 section.

---

## Pass 2 — re-review of the corrections (2026-11-19, commit `005bc78`)

**Scope:** the sections the planner changed in `005bc78` (verified against the
full diff `476f970..005bc78` and re-checked against the engine code), plus a
contradiction and Ruling-cell sweep.

### Per-finding verdicts

**R-EP17-01 — Resolved.** Contracts §3 adds the feasibility floor
`dayTake(A, D) = max(paceTarget(A, D), A.remaining − capacityAfter(A, D))` and
an explicit **bounded guarantee** paragraph naming `capacityAfter`'s optimism
(fragmentation, competition). EP17B-AC2 restates the claim as "no worse than
the rule 3 guarantee the engine already makes" and the test list adds the
owning adversarial fixtures (*pacing under optimistic capacity* — both pass-1
counterexamples, named concretely). The epic's AC-E17-02 and invariant-table
row 1 now carry the same counterexample, mechanism and owning test. Checked
for new contradictions: at `spreadPercent = 0` the floor is
`max(dayBudget, …)` and the retained "the target never raises a day's budget"
clause keeps `dayBudgetOf` as the hard cap, so the byte-identical-at-0
guarantee (AC-E17-04, TR-E17-02) is unaffected; the floor reads deterministic
run state only, so EP17B-AC4 is unaffected.

**R-EP17-02 — Resolved.** EP17B-AC3, its sum-invariant test bullet, and
TR-E17-01 in both the epic and the README traceability row now state the
invariant per deficit category — non-overdue:
`placed + deficit + deferred = remaining`; `OVERDUE`: `deficit = remaining`
with `placed` asserted alongside — matching `scheduler.ts:594-596` exactly.

**R-EP17-03 — Resolved.** EP17C's technical notes replace the "one-site
change" with a pass-aware budget naming all four sites (normal rotation's
`budgetLeft` seed zeroed; critical pass keeps the real budget;
`capacityAfter` narrowed; anchor pass narrowed per ▲ D-C2 (a)), citing the
exact lines that made one site impossible (`:534-537`, `:489-490`,
`:550-551`). Contracts §4 matches, and EP17C-AC1 carries the two explicit
carve-outs (critical pass, full-horizon fallback), each with its own fixture.
No contradiction with the §3 floor: `capacityAfter` narrowed to selected days
is consistent with the floor's use of it.

**R-EP17-04 — Resolved.** Reviewer-executed sweep: `grep -n
"unruled|still Proposed|awaiting your ruling"` over the epic and every EP17
story returns nothing outside the history/correction records. Epic Status
line, epic Remaining decisions, the epics README EP17 row, the breakdown
README queue rows (D-D1, D-F1/D-F2) and the EP17A/C/D/F/G at-a-glance and
header lines all state the rulings; EP17G's header and at-a-glance state the
▲ D17-2 proviso as a **binding obligation** of that story.

**R-EP17-05 — Resolved.** Contracts §5 defines `studyDays` as the §4
*selection* in date order, independent of placement, with the explicit
critical-pass note (`perDayMinutes` may carry an unselected date that
`studyDays` does not list); EP17D-AC2 matches; EP17H-AC1 and D-H1's fixture
gain the no-critical-work caveat.

**R-EP17-06 — Resolved.** EP17A's scope names both stale "four keys" comment
sites (`study-plans.controller.ts:33-48`,
`study-plans.service.ts:190-193`) as in-scope doc updates.

### Integrity checks

- **No Ruling cell altered:** the diff removes no `Ruled`/`Ratified` cell;
  the only edited decision row is D-H1, whose *Options* text gained the
  R-EP17-05 fixture caveat while its Ruling cell is preserved verbatim — an
  annotation consistent with the ruling, not a change to it.
- **No new contradiction found** between contracts §2–§5, the EP17B/EP17C/
  EP17D/EP17H ACs and the epic's AC/TR/invariant tables (checked pairwise on
  the changed sections).
- `node tools/queue-lint.mjs docs/stories/EP17` → clean.
- Cosmetic only, no action required: the §4 heading still reads "gated by
  ▲ D17-2" — kept, correctly, so the stories' section anchors stay valid; the
  body opens with the ruling.
- `history.md` carries C-R-EP17-01…06 with original wording preserved and
  gate rows 4/6/9 re-checked.

### Pass-2 verdict

**Plan Ready.** All four should-fix and both polish findings are resolved; no
finding remains open; no ▲ decision was re-opened. Passing sync performed per
the reviewer skill (correction-log statuses, queue state, epic/README status
lines).

---

# Pass 1 (2026-11-19, commit `476f970`) — preserved verbatim
**Mode:** `plan_review` (required by D17-12 — the preferences bag gains persisted keys)
**Scope:** epic `EP17-adhd-friendly-pacing-and-plan-proposal.md`, breakdown
`README.md`, `contracts.md`, `history.md`, children EP17A–EP17H, verified
against the cited code at `476f970`.

## Code verification performed (reviewer-executed)

- `scheduler.ts` (673 lines) read in the cited regions: `baselineFreeMinutes`
  `:290-293`, `dayBudgetOf` `:296-299`, `capacityAfter` `:324-332`,
  `desiredFor` `:410`, `commitBlock` `:437-469`, `placeBlock` `:482-529`, day
  loop `:539-579`, critical pass `:547-553`, deficit classification
  `:584-628`, anchor pass `:647+`. **All anchors match.**
- `preferences.ts` (250 lines) read in full: keys `:19`, `CROSS_FIELD_KEYS`
  `:39`, defaults `:51`, the "gate nothing" comment `:58-59`, bounds `:70`,
  `PREFERENCES_BAG_MAX_BYTES` `:82`, `isValueInBounds` `:95`, validator
  `:121`, reader `:196`, per-key fallback `:201-230`. **All anchors match**;
  the reader is per-key with per-key defaults, so the EP17A
  backward-compatibility mechanism is real.
- `study-plans.service.ts`: `toStudyPreferencesResponse` `:194-207` (literal
  projection), `gatherPlanData` `:990` (7-day window built at `:998-1001`),
  `preview` `:1123`, `schedule({…})` input `:1125-1134`, `targetMinutes`
  `:1153-1157`, `preferences: toStudyPreferencesResponse(...)` `:1178`,
  `catchUpPreview` `:1186`. **Match** (minor one-line drift on two anchors,
  within tolerance).
- `study-plans.controller.ts:27-58`: `GET`/`PUT /study-preferences`, PUT
  documented as a merge, `@CurrentUser()` scoping. **Match.**
- `PlanProposal.tsx` (248 lines): header actions, `proposalSummary` `:40-47`,
  duplicate `PlanWeek` + `PlanSessionEditor` rendering `:182-202`. **Match.**
- `PlanSessionEditor.tsx` (315 lines): ISO `dayOptions` `:48`, `clampTime`
  `:33`, `moveBy` pins a `FLEX_DAY` session, `resizeBy` does not. **Match.**
- `StudyPreferencesForm.tsx`: `DENSITY_PRESETS` `:103-110`, `isPreset`,
  `withCustom` (honest Custom), `GOAL_DAY_PRESETS` for `weeklyGoalDays`;
  mounted at `ProfilePage.tsx:221`. **Match** — the EP17G plan to reuse the
  preset-field pattern and re-copy the existing study-days field is grounded.
- `docs/stories/EP16/EP16K-phone-first-proposal.md` exists; baseline commit
  `075fec9` exists; `node tools/queue-lint.mjs docs/stories/EP17` → clean.

No citation mismatches were found. The findings below are about claimed
invariants and internal consistency, not about the code baseline.

## Findings

| ID | Severity | Target | Summary |
|---|---|---|---|
| R-EP17-01 | Should-fix | EP17B AC-2/AC-3, contracts §3, epic invariant table row 1 | "Pacing never produces a new deficit" is claimed as an invariant, but the stated mechanism (the rule 3 critical pass) cannot prevent it — concrete counterexamples below |
| R-EP17-02 | Should-fix | EP17B AC-3 / TR-E17-01 (epic + README) | The planned minute-sum property test, as worded, is false for `OVERDUE` assignments in the *existing* engine |
| R-EP17-03 | Should-fix | EP17C (technical notes, AC-1/AC-3), contracts §4 | The proposed "one-site change" (zero `dayBudgetOf` for unselected days) contradicts "the critical pass may still use an unselected day"; AC-1 and the full-horizon fallback also conflict |
| R-EP17-04 | Should-fix | Epic status line + Remaining decisions; README queue rows; EP17A/EP17D/EP17F/EP17G at-a-glance | Stale decision-state text contradicts the 2026-11-19 rulings in several places |
| R-EP17-05 | Polish | contracts §5, EP17D AC-2, EP17H AC-1 | `pacing.studyDays` ("the dates the plan used") is ambiguous in exactly the case ▲ D-D1 cites as its justification |
| R-EP17-06 | Polish | EP17A scope | Stale "four keys" doc comments in the touched files should be named as in-scope doc updates |

### R-EP17-01 — the no-new-deficit claim has no preventing mechanism (Should-fix)

**Claim** (EP17B-AC2, AC-E17-02, epic invariant table row 1, contracts §3):
"pacing never produces a new deficit or a new
`INSUFFICIENT_TIME_BEFORE_DEADLINE`"; mechanism: "the rule 3 feasibility
override runs before pacing and ignores the pacing target."

**Why the mechanism is insufficient.** The override fires only when
`item.remaining > capacityAfter(item, date)` (`scheduler.ts:547`), and
`capacityAfter` is **optimistic by design** (`scheduler.ts:317-323`): it sums
`dayBudgetOf` over later horizon days, ignoring breaks, gap fragmentation
against `minSessionMinutes`, and competing assignments. The pre-EP17 engine
never *voluntarily* defers minutes, so this optimism is harmless today.
Pacing introduces voluntary deferral, and deferred minutes can land on days
whose nominal budget cannot actually be placed.

**Counterexample 1 (fragmentation).** Assignment A, 100 min remaining, due
Tue. Mon has one 100-min gap; Tue has 140 free minutes split into 10-min gaps
(`minSessionMinutes = 15`), so `dayBudgetOf(Tue) = 112`. Pre-EP17: all 100
min placed Monday. With `spreadPercent = 100`: `evenShare = 50`; Monday takes
50; A is not critical on Monday (50 ≤ 112). On Tuesday A is critical
(`capacityAfter = 0`) and ignores pacing — but no gap can host a legal block.
Result: a 50-minute `INSUFFICIENT_TIME_BEFORE_DEADLINE` deficit the pre-EP17
engine did not have.

**Counterexample 2 (shared capacity).** A and B, 60 min each, both due Tue.
Mon budget 240, Tue budget 100. Pre-EP17: all 120 min placed Monday. With
pacing at 100: Monday takes 30 + 30; on Tuesday both are critical and need
120 against a 100-min budget → a 20-min deficit. `capacityAfter` never sees
the competitor (optimistic on purpose), so neither assignment was critical on
Monday.

**Consequence.** AC-E17-02 / EP17B-AC2 state an absolute invariant the
planned mechanism cannot guarantee; the planned test ("no fixture gains a
deficit category at 100") only proves it for the chosen fixtures. Under the
planning checklist, a claimed invariant needs a mechanism that defeats the
counterexample, and these counterexamples survive the stated mechanism.

**Suggested correction** (planner's choice, either closes it):
(a) add a per-day pacing floor so pacing may never defer below feasibility —
e.g. the day's take for `A` is
`max(paceTarget(A, D), A.remaining − capacityAfter(A, D))` — **and**
acknowledge in EP17B that the residual optimism of `capacityAfter`
(fragmentation, competition) means the guarantee is "no *worse* than the
rule 3 guarantee the engine already makes", with an adversarial fixture
(one of the counterexamples above) as an owning test pinning the chosen
behaviour; or (b) weaken AC-E17-02/EP17B-AC2 to that bounded claim
explicitly. The epic invariant table row must be updated to the mechanism
actually chosen.

**Closure:** EP17B AC text, contracts §3 and the epic invariant row state a
mechanism that defeats both counterexamples (or a deliberately bounded
claim), with the owning test named.

### R-EP17-02 — the minute-sum invariant is false for OVERDUE today (Should-fix)

TR-E17-01 (epic and README) and EP17B's test list require a "property-style
sum assertion": `placedMinutes + deficitMinutes + deferredMinutes` accounts
for the input `remainingMinutes`. In the existing classification an overdue
assignment gets `deficitMinutes = remainingTotal` **"whatever was placed"**
(`scheduler.ts:594-596`), so for a partially-placed overdue assignment
`placed + deficit > remaining`. EP17 explicitly does not change the
categories (AC-E17-03), so the test as worded would fail against intended
behaviour — or worse, push the implementer into silently changing the
OVERDUE semantics to make the property pass.

**Suggested correction:** restate the invariant per category — e.g. for
non-overdue work `placed + deficit + deferred = remaining`; for `OVERDUE`,
`deficit = remaining` and `placed` is reported alongside — in EP17B's test
list and in TR-E17-01's wording (epic + README traceability row).

**Closure:** the sum invariant's wording matches the existing
classification's actual arithmetic.

### R-EP17-03 — EP17C's mechanism contradicts its own AC-3 (Should-fix)

EP17C's technical notes claim "zeroing an unselected day is a one-site
change" in `dayBudgetOf`, and that this "automatically and correctly narrows
the feasibility estimate". Contracts §4 and EP17C-AC3 simultaneously require
that "the critical pass (rule 3) may still use" an unselected day.

These cannot both hold with a one-site change: the day loop seeds
`budgetLeft` from `dayBudgetOf` (`scheduler.ts:534-537`) and `placeBlock`
returns 0 whenever `budget <= 0` (`scheduler.ts:489-490`) — on the *critical*
path too (`:550-551`). Zeroing `dayBudgetOf` for an unselected day therefore
blocks the critical pass from it, and the AC-3 fixture ("an assignment due on
a day the selection dropped is still met") cannot pass as specified. It also
zeroes that day inside `capacityAfter`, which is the narrowing the story
wants — so the budget must be **pass-aware** (zero for the normal rotation,
real for the critical pass and, per ▲ D-C2 (a), narrowed or not for the
anchor pass as that ruling specifies), which is more than one site and needs
to be said.

Secondary inconsistency in the same section: contracts §4's fallback ("an
assignment with no usable day before its deadline falls back to its full
horizon") lets the *normal* pass place on unselected days, which contradicts
EP17C-AC1's "the normal placement pass places sessions on at most N distinct
dates" unless AC-1 carves out the fallback (and the critical pass)
explicitly.

**Suggested correction:** rewrite EP17C's mechanism note to a pass-aware
budget (name the sites: the normal rotation's `budgetLeft`, the critical
pass's budget source, `capacityAfter`, and the anchor pass per ▲ D-C2), and
add the explicit carve-outs to EP17C-AC1 ("…except days used by the rule 3
critical pass or by the full-horizon fallback, each covered by its own
fixture"). Contracts §4 updated to match.

**Closure:** EP17C's steps, ACs and contracts §4 describe one implementable
mechanism with no internal contradiction.

### R-EP17-04 — stale decision-state text contradicts the rulings (Should-fix)

All ▲ rows were ruled on 2026-11-19 (per the epic register's Ruling cells,
history.md and the README status line), but several places still present them
as open:

- **Epic `:4` (Status):** still says "Quality gate: **Needs Decision**
  (▲ D17-2 open …)". History.md and the README say Plan Ready.
- **Epic "Remaining decisions" section:** still says "▲ D17-5 and ▲ D17-8
  are recommended and awaiting your ruling".
- **README queue rows:** EP17D row says "▲ D-D1 unruled"; EP17F row says
  "▲ D-F1, ▲ D-F2 unruled" — the stories' own Decisions tables show all three
  `Ratified (user, 2026-11-19)`.
- **At-a-glance "Decisions needing you" blocks:** EP17A (lists ▲ D17-2 /
  ▲ D17-5 / ▲ D-A1 as needing the user), EP17D (▲ D-D1), EP17F (▲ D-F1,
  ▲ D-F2), EP17G ("▲ D17-8 — epic register, still Proposed") — all ruled.
- **EP17G header dependency line:** "▲ D17-2 decides whether a study-days
  control appears here at all" — D17-2 is ruled (a) with the proviso that
  EP17G *must* surface the control; the line should state the obligation, not
  the open question.

One stale cell is cosmetic; this many means the next implementer cannot tell
plan state from a story alone, and the D17-2 proviso (a binding obligation on
EP17G) is presented as an open question in the story that owns it. One
planner sweep fixes all of it.

**Closure:** no story, queue row or epic field presents a ruled decision as
open; EP17G's at-a-glance names the D17-2 proviso as an obligation.

### R-EP17-05 — `pacing.studyDays` is ambiguous where D-D1 needs it precise (Polish)

Contracts §5 defines `studyDays` as "the civil dates the plan **used**", but
▲ D-D1's entire justification is that the client cannot distinguish "a
selected day on which nothing was placed" from an unselected day — which
requires `studyDays` to be the §4 **selected** set, including selected-but-
empty days. "Used" reads as "placed on". Also, the critical pass may
legitimately place on an unselected day (contracts §4), so EP17H-AC1's
assertion "minutes … only on the chosen study days" is only true for
non-critical fixtures — D-H1's seeded fixture should say so. Define
`studyDays` as "the §4 selection, in date order, independent of whether
minutes were placed" and note the critical-pass exception where the e2e
asserts it.

### R-EP17-06 — stale "four keys" doc comments are in EP17A's path (Polish)

`study-plans.controller.ts:33-37` and `:44-48` still document the endpoints
as carrying "the four keys", and `toStudyPreferencesResponse`'s comment
(`study-plans.service.ts:190-193`) says "exactly the four contract keys" —
both already stale (eight keys) and about to be touched by EP17A. Naming them
as in-scope doc updates in EP17A's scope costs one line and prevents a third
generation of the same stale comment.

## Coverage summary (checklist baseline)

- **AC/TR ownership:** complete — AC-E17-01…14 and TR-E17-01…07 each have a
  named primary owner; no criterion weakened. Pass.
- **DoD mapping:** all eleven mapped, DoD-10/11 to the parent unit, DoD-9's
  "no migration" consistent with ▲ D17-5 (a). Pass.
- **Contract consistency:** contracts.md is the single home and stories cite
  it; two internal contradictions found (R-EP17-01's AC-2 vs AC-3 tension,
  R-EP17-03's §4 vs EP17C mechanism).
- **Dependency sequence / sizing:** one sequential writer, rationale sound,
  per-story sizing blocks present, EP17B/C and EP17E/F splits justified. Pass.
- **Inspected vs proposed citations:** every checked citation matches the
  code at `476f970`; unverified paths (`useProposal.ts`, `PlanWeek.tsx`,
  `catchUpPreview` tail, momentum read, DTO decorators) are honestly
  disclosed. Pass.
- **Invariants with counterexample + mechanism + owning test:** four of six
  epic invariant rows hold up (legacy bag — verified against the per-key
  reader; purity/determinism; ownership of the preference write; locked-row
  protection). The no-new-deadline-miss row fails (R-EP17-01) and the
  minute-sum test wording fails against existing behaviour (R-EP17-02).
- **D17-12 focus areas:** EP17A's backward-compatibility claim is **sound** —
  `readStudyPreferences` is per-key with per-key defaults (`preferences.ts:
  201-230`), the new key joins no cross-field rule, the frozen legacy-bag
  fixture and 4 KB cap test are specified. TR-E17-02's byte-identical-at-0
  design (D17-6 exact-off value, frozen baseline fixture) is sound. The
  no-silent-loss rule is structurally preserved (categories untouched,
  declined minutes flow through `scheduler.ts:612-618`) but its test wording
  needs R-EP17-02's fix and its "no new deficit" companion needs R-EP17-01's.

## Verdict

**Changes Required.** No blocker; four should-fix findings, all plan-text
corrections — no re-scoping, no new child, no decision re-opened.

**Affected stories and required planner changes:**

- **EP17B** (+ epic invariant table, contracts §3, TR-E17-01 wording in epic
  and README): R-EP17-01, R-EP17-02.
- **EP17C** (+ contracts §4): R-EP17-03.
- **Epic status/Remaining-decisions, README queue rows, EP17A/EP17D/EP17F/
  EP17G at-a-glance blocks:** R-EP17-04.
- **Contracts §5 / EP17D / EP17H** (polish): R-EP17-05. **EP17A** (polish):
  R-EP17-06.

**Handoff — for the user:** nothing; every ▲ decision is ruled and this
review re-opens none. **For the planner:** the four should-fix corrections
above, then re-review of the changed sections only (findings keep their IDs).

## How to verify by hand

Not applicable — plan review; no implementation exists. The counterexamples
in R-EP17-01 are arithmetic over the inspected code paths
(`scheduler.ts:296-299`, `:324-332`, `:489-490`, `:547-553`), reproducible by
reading those lines; no code was executed or modified.
