# EP17 planning history

Cold records for the EP17 delivery home: the quality-gate table, the
correction log, superseded decisions and plan-review history. The live plan is
[README.md](./README.md); shared contracts are [contracts.md](./contracts.md).

## Quality gate — breakdown, planner, 2026-11-19

Applied after the last dependent edit
([planning-checklist](../../../.agents/planning-checklist.md)).

| # | Check | Pass / Blocked / N/A + reference |
|---|---|---|
| 1 | Child separation and sizing | **Pass** — eight children, each one observable outcome with 4–6 criteria and a sizing block. Splitting rationale recorded in [README § Stories](./README.md#stories): EP17B/EP17C split so the open ▲ D17-2 blocks only one of them; EP17E/EP17F split per ▲ D17-4's "split if sizing demands"; EP17G separated as the only writing child. No README-only, status-only or evidence-only child. |
| 2 | Original AC/TR coverage | **Pass** — AC-E17-01…14 and TR-E17-01…07 each have a named primary owner in the [ownership](./README.md#epic-acceptance-criteria--ownership) and [traceability](./README.md#requirement-and-test-traceability) tables; no criterion is weakened or deferred. Update 2026-11-19 (in flight, after EP17F): **AC-E17-10 now has two owners** — EP17E the week grid, EP17H the three non-grid call sites (D17-17, C-F-EP17E-02 / C-F-EP17F-01). The criterion is extended, not weakened, and nothing is deferred past EP17. |
| 3 | DoD obligations | **Pass** — all eleven mapped in [README § DoD](./README.md); DoD-9 notes explicitly that there is **no migration** (▲ D17-5 (a)); DoD-10/11 belong to the EP17 parent unit. |
| 4 | Contract consistency and integration ownership | **Pass** (re-checked after corrections, 2026-11-19) — the preferences keys, the pacing rule, study-day selection, the payload block and the surface contract each live once, in [contracts.md](./contracts.md), and are cited rather than restated. The two internal contradictions plan review pass 1 found (R-EP17-01's AC-2 vs AC-3 tension; R-EP17-03's §4 vs EP17C mechanism) are corrected in C-R-EP17-01 / C-R-EP17-03. Integration ownership is EP17H, which carries real journey code and the protective gates (not a manufactured index child). |
| 5 | Code paths inspected; unverified disclosed | **Pass** — `scheduler.ts` (673 lines) read end to end; `preferences.ts` (250), `PlanProposal.tsx` (248), `PlanSessionEditor.tsx` (315) read in full; `study-plans.service.ts` read around `:180-210` and `:960-1200`; `StudyPreferencesForm.tsx` and `study-plans.controller.ts` inspected by targeted search. Unverified paths are named in each story's Technical notes and in the epic (`useProposal.ts`, `PlanWeek.tsx`, `catchUpPreview`'s full return shape, the momentum read's use of `weeklyGoalDays`, the preferences DTO decorators). |
| 6 | Feature risks/counterexamples and owning tests | **Pass** (re-checked after corrections, 2026-11-19) — six invariants with a concrete counterexample, a preventing mechanism and an owning test in the [epic's invariant table](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md#security--privacy--accessibility-invariants). Plan review pass 1 defeated the no-new-deadline-miss row (R-EP17-01) and the minute-sum wording (R-EP17-02); the row now names the feasibility-floor mechanism with its bounded claim and the adversarial owning fixture, and the sum invariant is stated per deficit category (C-R-EP17-01 / C-R-EP17-02). |
| 7 | Dependency mapping and sequence | **Pass** — one vertical sequence (contract → engine → service → frontend → integration) with the rationale and the known windows recorded; EP17C is the only `Blocked` row and its blocker is named. |
| 8 | Material (▲) decisions ruled or explicitly blocked | **Pass** — at breakdown (2026-11-19): ▲ D17-3 and ▲ D17-4 ruled; the other ▲ rows `Proposed` with recommendations filled (gate then **Needs Decision**). Update 2026-11-19 (same day): the user ratified every recommended row; ▲ D17-2 ruled (a) with a UI-visibility proviso (EP17G owns the surfacing, no new story). Update 2026-11-19 (in flight, after EP17C): three further rulings — ▲ D-G5 (spread preset labels) and ▲ D-F7 (calibration note inside the collapsed disclosure, no auto-expand) ruled as recommended, and the new ▲ D17-16 (an unset `weeklyGoalDays` means unconstrained) ruled, refining ▲ D17-2 (a). Update 2026-11-19 (in flight, after EP17F): new row **D17-17** (who closes AC-E17-10's three remaining raw-ISO-date call sites) is **not ▲** — no security, persisted-data or contract change, and the user-visible effect is one page agreeing with itself under an already-ruled criterion — so it is `Proposed` and ratifies by default when EP17H starts. No open ▲ rows. |
| 9 | Correction log complete | **Pass** (updated 2026-11-19) — plan review pass 1 findings R-EP17-01…06 logged below as C-R-EP17-01…06, each with the original wording, the correction, verification and status — closed to `Fixed in plan` at plan review pass 2 (2026-11-19, `005bc78`, Plan Ready). Implementer finding F-EP17B-01 (raised during EP17B) logged as C-F-EP17B-01 in the same format and closed `Fixed in plan` — contracts §3 amended to the shipped `evenShare` with its one-sitting floor. EP17C's findings F-EP17C-01 and F-EP17C-02 logged as `C-F-EP17C-01` / `C-F-EP17C-02` in the same format (F-EP17C-03 needed no plan change and is closed in its own record). The EP17D implementer's requested contracts wording for the ▲ D17-16 resolution logged as `C-F-EP17D-01` and applied to contracts §2/§4. The EP17E/EP17F implementer findings F-EP17E-02 and F-EP17F-01 are logged as `C-F-EP17E-02` / `C-F-EP17F-01` in the same format; both are `Fixed in plan` with the code change assigned to EP17H (D17-17, EP17H-AC7). |
| 10 | Identifier consistency and at-a-glance blocks (`queue-lint` clean) | **Pass** — every child has the at-a-glance block and a Decisions table with a Ruling column; epic decisions `D17-<n>`, story decisions `D-<suffix><n>`, epic criteria `AC-E17-<nn>`, test requirements `TR-E17-<nn>`, verification `V-17-<n>`, backlog `BL-17-<nn>`; `node tools/queue-lint.mjs docs/stories/EP17` clean. |

**Gate status:** **Plan Ready** (updated 2026-11-19 — the user ratified every
recommended ruling; originally **Needs Decision** at breakdown while the
material rows awaited rulings, ▲ D17-2 the only one blocking a child outright).
The required plan review (D17-12) is **complete**: pass 1 returned
**Changes Required**; corrections C-R-EP17-01…06 applied 2026-11-19; pass 2
(reviewed commit `005bc78`) returned **Plan Ready** — implementation may
start with EP17A.

## Plan review

**Required** (D17-12). Trigger: the study-preferences bag gains persisted
keys, which the planning-checklist counts as a new persisted-data contract.
Eight children sits at the ">8 children" threshold, not over it, so the
contract change is the operative trigger. Recommended focus: EP17A's
backward-compatibility claim for pre-EP17 bags, and EP17B/EP17C's purity,
determinism and no-silent-loss invariants.

**Pass 1 run 2026-11-19** (reviewed commit `476f970`, report at
[plan-review.md](./plan-review.md)): verdict **Changes Required** — four
should-fix (R-EP17-01…04) and two polish (R-EP17-05/06) findings, all
plan-text corrections; no re-scoping, no new child, no decision re-opened.
Planner corrections applied 2026-11-19 (correction log below,
C-R-EP17-01…06).

**Pass 2 run 2026-11-19** (reviewed commit `005bc78`, same report): all six
findings **Resolved** against the diff `476f970..005bc78`, re-verified against
the engine code; no Ruling cell altered; no new contradiction between
contracts §2–§5, the changed ACs and the epic tables; verdict **Plan Ready**.
Correction statuses below closed to `Fixed in plan`.

## Correction log

Format: `original finding → correction → verification → status`
(`Fixed in plan` / `Decision needed` / `Unresolved`; reviewer findings
additionally `Addressed — awaiting re-review`). Findings R-EP17-01…06 are from
[plan-review.md](./plan-review.md) (pass 1, 2026-11-19, reviewed commit
`476f970`, verdict **Changes Required**). Finding F-EP17B-01 is an
implementer finding from
[artifacts/EP17B/implementation.md](./artifacts/EP17B/implementation.md)
(2026-11-19); its entry is `C-F-EP17B-01`. Findings F-EP17C-01 and
F-EP17C-02 are implementer findings from
[artifacts/EP17C/implementation.md](./artifacts/EP17C/implementation.md)
(2026-11-19); their entries are `C-F-EP17C-01` and `C-F-EP17C-02`. The
EP17D implementer's contracts follow-up from
[artifacts/EP17D/F-EP17C-02-resolution.md](./artifacts/EP17D/F-EP17C-02-resolution.md)
(2026-11-19) is `C-F-EP17D-01`. Findings F-EP17E-02 and F-EP17F-01 are
implementer findings from
[artifacts/EP17E/implementation.md](./artifacts/EP17E/implementation.md) and
[artifacts/EP17F/implementation.md](./artifacts/EP17F/implementation.md)
(2026-11-19); they are two halves of one gap and their entries are
`C-F-EP17E-02` and `C-F-EP17F-01`.

### C-R-EP17-01 (from R-EP17-01, should-fix)

- **Original finding (wording preserved):** "'Pacing never produces a new
  deficit' is claimed as an invariant, but the stated mechanism (the rule 3
  critical pass) cannot prevent it" — `capacityAfter` (`scheduler.ts:317-332`)
  is optimistic (ignores fragmentation against `minSessionMinutes` and
  competing assignments), so pacing can voluntarily defer minutes onto final
  days that cannot actually host them. Counterexamples: fragmentation and
  shared capacity (plan-review.md § R-EP17-01).
- **Correction:** adopted the reviewer's option (a) + bounded restatement.
  Contracts §3 gains a **feasibility floor** — a day's take for `A` is
  `max(paceTarget(A, D), A.remaining − capacityAfter(A, D))` — and states the
  bounded guarantee explicitly: pacing is **no worse than the rule 3 guarantee
  the engine already makes**, because `capacityAfter` remains optimistic about
  fragmentation and competition. EP17B-AC2 restated to that bounded claim; the
  adversarial owning test *pacing under optimistic capacity — the fragmentation
  counterexample* added to EP17B's test list, pinning the chosen behaviour.
  Epic invariant table row 1 updated to the mechanism actually chosen.
- **Verification:** re-read `scheduler.ts:317-332` (`capacityAfter` sums
  `dayBudgetOf` over later horizon days only), `:489-490`, `:547-553` — the
  counterexamples hold against the old wording and are defeated or explicitly
  bounded by the new wording.
- **Status:** Fixed in plan (plan review pass 2, 2026-11-19, reviewed commit `005bc78`).

### C-R-EP17-02 (from R-EP17-02, should-fix)

- **Original finding (wording preserved):** "The planned minute-sum property
  test, as worded, is false for `OVERDUE` assignments in the *existing*
  engine" — an overdue assignment gets `deficitMinutes = remainingTotal`
  "whatever was placed" (`scheduler.ts:594-596`), so
  `placed + deficit > remaining` for a partially-placed overdue assignment.
- **Correction:** EP17B-AC3 and its sum-invariant test restated **per deficit
  category**: non-overdue — `placed + deficit + deferred = remaining`;
  `OVERDUE` — `deficit = remaining` with `placed` reported alongside.
  TR-E17-01's wording updated in the epic and in the README traceability row.
- **Verification:** `scheduler.ts:594-596` confirmed:
  `deficitMinutes = remainingTotal; // full remaining, whatever was placed`.
- **Status:** Fixed in plan (plan review pass 2, 2026-11-19, reviewed commit `005bc78`).

### C-R-EP17-03 (from R-EP17-03, should-fix)

- **Original finding (wording preserved):** "The proposed 'one-site change'
  (zero `dayBudgetOf` for unselected days) contradicts 'the critical pass may
  still use an unselected day'" — `budgetLeft` is seeded from `dayBudgetOf`
  (`scheduler.ts:534-537`) and `placeBlock` returns 0 at `budget <= 0`
  (`:489-490`), on the critical path too (`:550-551`), so the EP17C-AC3
  fixture cannot pass as specified. Contracts §4's full-horizon fallback also
  contradicts EP17C-AC1 without a carve-out.
- **Correction:** EP17C's mechanism note rewritten to a **pass-aware budget**
  naming the sites (the normal rotation's `budgetLeft`, the critical pass's
  budget source, `capacityAfter`, the anchor pass per ▲ D-C2 (a)); EP17C-AC1
  gains explicit carve-outs for the rule 3 critical pass and the full-horizon
  fallback, each covered by its own fixture; contracts §4 updated to match.
- **Verification:** `scheduler.ts:534-537`, `:489-490`, `:547-553` re-read —
  one `budgetLeft` map serves both passes, so a pass-aware budget is required
  and "one site" was wrong.
- **Status:** Fixed in plan (plan review pass 2, 2026-11-19, reviewed commit `005bc78`).

### C-R-EP17-04 (from R-EP17-04, should-fix)

- **Original finding (wording preserved):** "Stale decision-state text
  contradicts the 2026-11-19 rulings in several places" — epic `:4` Status
  ("Needs Decision (▲ D17-2 open …)"), epic "Remaining decisions", README
  queue rows (EP17D "▲ D-D1 unruled", EP17F "▲ D-F1, ▲ D-F2 unruled"),
  at-a-glance "Decisions needing you" blocks in EP17A/EP17D/EP17F/EP17G, and
  EP17G's header line presenting ▲ D17-2 as an open question rather than the
  obligation its proviso creates.
- **Correction:** swept every named site plus the same stale text found in
  EP17A's header/dependency lines, EP17C's dependency/sizing lines, and the
  EP17 row of `docs/epics/README.md`. All now state the rulings
  (user, 2026-11-19); EP17G's at-a-glance and header state the D17-2 proviso
  as an explicit obligation (the study-days control must be visibly surfaced
  with its instruction meaning). No ruling re-opened; no Ruling cell edited.
- **Verification:** `grep -n "unruled\|still Proposed\|awaiting your ruling\|Needs Decision" `
  over `docs/epics/EP17*.md`, `docs/epics/README.md` and
  `docs/stories/EP17/*.md` returns no live stale line.
- **Status:** Fixed in plan (plan review pass 2, 2026-11-19, reviewed commit `005bc78`).

### C-R-EP17-05 (from R-EP17-05, polish)

- **Original finding (wording preserved):** "`pacing.studyDays` ('the civil
  dates the plan **used**') is ambiguous in exactly the case ▲ D-D1 cites as
  its justification" — and EP17H-AC1's "minutes … only on the chosen study
  days" is only true for non-critical fixtures.
- **Correction:** contracts §5 defines `studyDays` as "the §4 **selection**,
  in date order, independent of whether minutes were placed"; EP17D-AC2
  wording aligned; EP17H-AC1 and D-H1's seeded fixture gain the critical-pass
  caveat.
- **Verification:** contracts §4/§5, EP17D-AC2, EP17H-AC1 and D-H1 now agree.
- **Status:** Fixed in plan (plan review pass 2, 2026-11-19, reviewed commit `005bc78`).

### C-R-EP17-06 (from R-EP17-06, polish)

- **Original finding (wording preserved):** "Stale 'four keys' doc comments
  are in EP17A's path" — `study-plans.controller.ts:33-37` and `:44-48` still
  document the endpoints as carrying "the four keys", and
  `toStudyPreferencesResponse`'s comment (`study-plans.service.ts:190-193`)
  says "exactly the four contract keys".
- **Correction:** EP17A's scope names both stale comments (the controller
  endpoint docs at `study-plans.controller.ts:33-48` and the projection
  comment at `study-plans.service.ts:190-193`) as in-scope doc updates.
- **Verification:** EP17A scope line added; no other story claims those
  comments.
- **Status:** Fixed in plan (plan review pass 2, 2026-11-19, reviewed commit `005bc78`).

### C-F-EP17B-01 (from F-EP17B-01, implementer finding, should-fix)

Raised by the EP17B implementer while implementing contracts §3 against the
frozen EP17B-AC5 (source record:
[artifacts/EP17B/implementation.md](./artifacts/EP17B/implementation.md),
§ Findings). Logged by the planner 2026-11-19; the implementer may not write
contracts.

- **Original finding (wording preserved):** "contracts §3's
  `evenShare(A, D) = ceil(A.remainingAtRunStart / |usableDays(A)|)` is
  unsatisfiable together with EP17B-AC5 — a 15-minute assignment with a
  five-day horizon gets a 3-minute target, below `minSessionMinutes`, so the
  D17-3 student's twelve small assignments would place **nothing**";
  disposition: "implemented the minimal fix (floor the share at one sitting
  for that assignment) because the AC is frozen and the formula is the
  derived artifact, and documented it in the engine's rule list; **contracts
  §3 needs a one-line amendment** which this role may not write".
- **Correction:** contracts §3's formula amended to the shipped engine —
  `oneSitting(A) = min(A.remainingAtRunStart, sessionLengthMinutes)` (the
  session length clamped to `[minSessionMinutes, maxSessionMinutes]`) and
  `evenShare(A) = max(oneSitting(A), ceil(A.remainingAtRunStart /
  |usableDays(A)|))`. §3 gains a **one-sitting floor** paragraph giving the
  D17-3 rationale, drops the spurious `D` index from `evenShare` (it is a
  per-assignment value computed once per run), states the engine's
  operational reading of `|usableDays(A)|` (horizon days with a non-zero
  run-start budget, D-B3 — the same set once §4's narrowed budgets land), and
  notes in the bounded-guarantee paragraph that the floor only ever *raises*
  a take and so cannot weaken the R-EP17-01 claim. §4 unchanged: the
  amendment is inside §3 and no §4 statement contradicts it.
- **Verification:** read against the shipped code, which is the truth here —
  `scheduler.ts:393-404` (`evenShareOf`:
  `Math.max(Math.min(atRunStart, sittingLength), share)`), `:288-292`
  (`sittingLength = max(minBlock, min(sessionLengthMinutes, maxBlock))`),
  `:412-419` (`dayTakeOf`, feasibility floor and day-budget clamp) and the
  rule 9 doc comment `:94-129`. Contracts §3 now matches the engine term for
  term. EP17B's suite is green as recorded in its `implementation.md`
  (96 tests in `scheduler.spec.ts`), including V-17-2's many-small
  counterexample. `node tools/queue-lint.mjs docs/stories/EP17` clean.
- **Status:** Fixed in plan — documentation catching up to a justified
  in-flight implementation decision; the code already matches, so nothing is
  pending for an implementer. Closure evidence for F-EP17B-01 is this entry
  plus contracts §3.

### C-F-EP17C-01 (from F-EP17C-01, implementer finding, should-fix)

Raised by the EP17C implementer after the dispatch handed off F-EP17B-02
(re-check the feasibility floor once budgets are pass-aware). Source record:
[artifacts/EP17C/implementation.md](./artifacts/EP17C/implementation.md),
§ Findings. Logged by the planner 2026-11-19; the implementer may not write
contracts.

- **Original finding (wording preserved):** "the floor
  `max(paceTarget, remaining − capacityAfter)` is **still** subsumed by rule
  3's critical test. The expectation was that pass-awareness would separate
  them, but contracts §4 narrows `capacityAfter` for *both* consumers
  (deliberately — the critical test must see the narrowed estimate or rule 3
  could not notice a deadline the selection alone would miss), so the two
  predicates remain literally the same expression on the same day-start
  snapshot: an item is either critical (and exempt from pacing) or has
  `remaining ≤ capacityAfter`, which makes the floor's second term ≤ 0";
  disposition: "**kept, not removed.** It is the belt to rule 3's braces,
  costs nothing, and is what contracts §3 specifies"; owner: "planner / live
  session (whether contracts §3 should note that the floor is currently inert
  — this role may not edit `contracts.md`)".
- **Correction:** contracts §3 gains a short paragraph directly under the
  feasibility-floor definition stating that the floor is **retained but
  currently non-binding**, with the reason (§4 narrows `capacityAfter` for
  both consumers deliberately, so the two predicates coincide), the deletion
  experiment as the evidence, and the two reasons it is kept: it is the
  documented guard for the R-EP17-01 bounded guarantee and stops being
  redundant if a future story gives the two consumers different capacity
  estimates. R-EP17-01's bounded guarantee is **not** weakened — the
  paragraph records that the floor only ever raises a take and that the
  guarantee rests on rule 3 running first. No AC, no invariant-table row and
  no Ruling cell changed; the engine is unchanged.
- **Verification:** the implementer's one-off deletion experiment (not
  committed) replaced `dayTakeOf`'s floor with `const floored = paceTarget;`
  and re-ran `npx jest src/domain/study-planning` — **372 passed, 0 failed**,
  i.e. no test distinguishes the engine with the floor from the engine
  without it; the file was restored and the suite re-run green
  (implementation.md § Verification). Contracts §3's claim is therefore
  measured, not asserted. `node tools/queue-lint.mjs docs/stories/EP17`
  clean.
- **Status:** Fixed in plan — documentation now states the floor's real
  status honestly. Nothing is pending for an implementer; the floor stays in
  the code. Closure evidence for F-EP17C-01 is this entry plus contracts §3.

### C-F-EP17C-02 (from F-EP17C-02, implementer finding, decision needed → ruled)

Raised by the EP17C implementer while tracing `schedule()`'s callers at
closeout; the `weeklyGoalDays` twin of F-EP17B-03. Source record:
[artifacts/EP17C/implementation.md](./artifacts/EP17C/implementation.md),
§ Findings. Logged by the planner 2026-11-19.

- **Original finding (wording preserved):** "the service forwards the whole
  preferences object and `readStudyPreferences` defaults `weeklyGoalDays` to
  **3**, so from this commit **real students' previews are narrowed to three
  study days**, before EP17D wires anything and before EP17G surfaces the
  control with its new meaning — which is precisely the proviso attached to
  ▲ D17-2 (a). This is the `weeklyGoalDays` twin of F-EP17B-03 and widens
  that window: a student who set the key as a *momentum yardstick* now has it
  instructing the planner."
- **Correction:** a decision, not a wording fix. New epic row **▲ D17-16**
  ("What an **unset** `weeklyGoalDays` means to the planner"), **Ruled
  (user, 2026-11-19)**: an unset key is **unconstrained** — a student who has
  never explicitly chosen a study-days number is planned across the whole
  week (effectively 7) and only an explicitly stored number narrows the plan;
  `STUDY_PREFERENCE_DEFAULTS.weeklyGoalDays` **stays 3** because the same key
  is the EP13K momentum yardstick. D17-16 **refines ▲ D17-2 (a)**, with the
  back-reference added to the D17-2 register row in this same pass
  (id-conventions rule 4). Contracts §2's `weeklyGoalDays` row and §4 state
  the unset-means-unconstrained rule; the epic's "Remaining decisions" line
  cites D17-16. The implementer is landing the code concurrently — this entry
  records the ruling, not the implementation.
- **Verification:** the finding's premise re-read against the cited record —
  `study-plans.service.ts:1129-1137` forwards the whole preferences object
  and `preferences.ts:67` defaults the key to 3, while the engine's own
  fallback is 7 (EP17C implementation.md § Deviations 1). The ruling is the
  only reading that satisfies both the ▲ D17-2 proviso and EP13K's yardstick;
  EP17C-AC5's momentum check (`momentum.ts:52,78,122`,
  `study-sessions.service.ts:695-715`, `momentum.spec.ts:42`) confirms the
  yardstick reads the key independently of the scheduler, so leaving the
  stored default at 3 keeps it intact. `node tools/queue-lint.mjs
  docs/stories/EP17` clean.
- **Status:** Fixed in plan (decision taken) — F-EP17C-02's own closure
  evidence stays with EP17G (surface the control) and EP17H (journey), per
  the finding's named owners. Closure evidence for the *planning* half is
  this entry plus ▲ D17-16 and contracts §2/§4.

### C-F-EP17D-01 (from the EP17D implementer's F-EP17C-02 resolution, contracts follow-up)

Raised by the EP17D implementer on resolving F-EP17C-02 in code (the commit
immediately preceding EP17D's implementation). Source record:
[artifacts/EP17D/F-EP17C-02-resolution.md](./artifacts/EP17D/F-EP17C-02-resolution.md),
§ "Contracts follow-up". Logged by the planner 2026-11-19; the implementer
may not write contracts.

- **Original request (wording preserved):** "**§2**, the `weeklyGoalDays`
  row — the `Default` cell should distinguish the two readers: momentum
  default `3`; **planning default when the key was never stored: `7`
  (unconstrained)**. A note that the planning read is
  `readPlanningStudyPreferences` and that an invalid stored value is treated
  as unchosen for planning (while the momentum read still repairs it to `3`).
  **§4** — `usableDays(window)` reads the **planning** value of
  `weeklyGoalDays`; a student who never chose one has the whole window
  usable." Until it lands, "this note is the contract of record for the
  behaviour."
- **Correction:** contracts §2's `weeklyGoalDays` Default cell now names the
  two readers — momentum default `3` (`readStudyPreferences`, the EP13K
  yardstick, unchanged) and the planning default `7` (unconstrained) when the
  key was never stored, via `readPlanningStudyPreferences`, with
  wrong-typed / out-of-bounds stored values treated as unchosen for planning
  while the momentum read still repairs them to `3`. Contracts §4's
  unset-unconstrained bullet restated as: `usableDays(window)` reads the
  **planning** value (`readPlanningStudyPreferences`, handed to the engine by
  `gatherPlanData` → `preview` / `catchUpPreview`), citing ▲ D17-16.
  Documentation catching up to shipped, ruled code — no new design, no AC, no
  Ruling cell changed.
- **Verification:** read against the shipped code —
  `apps/api/src/domain/study-planning/preferences.ts`
  (`UNSET_PLANNING_WEEKLY_GOAL_DAYS = 7` at `:276`;
  `hasStoredWeeklyGoalDays` at `:286`, bounds-checked so absent / wrong-typed
  / out-of-bounds all count as not chosen; `readPlanningStudyPreferences` at
  `:317`, identical to `readStudyPreferences` in every other key) and
  `apps/api/src/modules/study-plans/study-plans.service.ts`
  (`readPlanningStudyPreferences(user.preferences)` at `:1061`; both
  `preview` and `catchUpPreview` hand `data.planningPreferences` to the
  engine at `:1205` / `:1310`). Contracts §2/§4 now match the code term for
  term. `node tools/queue-lint.mjs docs/stories/EP17` clean.
- **Status:** Fixed in plan — the resolution record's "contract of record"
  interim note is discharged; nothing is pending for an implementer.

### C-F-EP17E-02 (from F-EP17E-02, implementer finding, should-fix)

Raised by the EP17E implementer during the V-17-4 sweep, against frozen
EP17E-AC5 and EP17E/EP17F scope text. Source record:
[artifacts/EP17E/implementation.md](./artifacts/EP17E/implementation.md),
§ Findings. Logged by the planner 2026-11-19; the implementer may not write
the epic or another child's ACs.

- **Original finding (wording preserved):** "source: V-17-4 sweep; paths:
  `apps/web/src/features/plan-proposal/ui/WhatThisKeepsCard.tsx:80`,
  `MovedSessionRow.tsx:23`; issue: both EP13/EP16 cards still render raw ISO
  dates (`<time>{s.date}</time>`) on the proposal page; EP17E-AC5's frozen
  text enumerates the week surfaces (headings, section names, day select),
  and both EP17E's and EP17F's Scope sections place these components out of
  scope ('change placement only, not source'); disposition: reported for the
  combined EP17 review / a follow-up story, not fixed here; owner: planner;
  closure evidence: pending."
- **Correction:** a scope decision, not a wording fix. New epic row **D17-17**
  (non-material, `Proposed`, ratifies by default at EP17H's start) assigns the
  gap to **EP17H**, which is unimplemented — so nothing is unfrozen and no new
  child is invented for three `dayLabel(...)` call sites. Epic **AC-E17-10**
  now states that "everywhere in the proposal" means the whole page and names
  the call sites and the two owners (EP17E the grid, EP17H the rest);
  contracts §6's day-label bullet names the shipped helper
  `features/study-plan/lib/dayLabel.ts`, the three non-grid sites, and that
  the `<time dateTime=…>` attribute keeps its ISO value; **V-17-4** is scoped
  page-wide with EP17H recording the final sweep. **EP17H-AC7** is new and
  names the three call sites with file and line; EP17H's Tests gain the two
  component tests, the page-wide negative `/\d{4}-\d{2}-\d{2}/` test (the one
  that would have caught both findings) and the required update to
  `e2e/plan-flow.spec.ts:781`. **No EP17E or EP17F AC text was touched**:
  EP17E-AC5 remains met as written against the week grid, and EP17E's Scope
  "Out" gains only a pointer to the new owner.
- **Verification:** both paths re-read at HEAD `d918046` —
  `WhatThisKeepsCard.tsx:80` renders `<time dateTime={s.date}>{s.date}</time>`
  and `MovedSessionRow.tsx:23` the same shape for `session.date`, so the
  finding holds exactly as worded. `dayLabel.ts` confirmed to be a pure
  `(date: string) => string` formatted in `UTC` from the civil date, taking
  precisely the values both sites hold, so the fix needs no new helper, no
  prop and no time-zone plumbing. `MovedSessionRow` has no test file of its
  own (it renders only from `MovedForwardList`, which has one) — EP17H's test
  list reflects that. `node tools/queue-lint.mjs docs/stories/EP17` clean.
- **Status:** Fixed in plan (decision taken and owner assigned) — the code
  change itself is **pending for EP17H**; closure evidence for F-EP17E-02 is
  this entry plus EP17H-AC7 and, at EP17H's closeout, its record.

### C-F-EP17F-01 (from F-EP17F-01, implementer finding, should-fix)

The 409 half of the same gap, raised by the EP17F implementer against frozen
EP17F-AC5. Source record:
[artifacts/EP17F/implementation.md](./artifacts/EP17F/implementation.md),
§ Findings. Logged by the planner 2026-11-19.

- **Original finding (wording preserved):** "source: AC-E17-10 sweep while
  recomposing; path: `PlanProposal.tsx` conflict-summary list
  (`{c.date} {c.startTime} — …`); issue: the 409 summary prints the raw ISO
  date; EP17F-AC5 freezes this copy ('the confirm's 409 handling … unchanged
  in behaviour and in copy') and the e2e 409 test asserts the ISO string, so
  changing it here would contradict a frozen AC; joins F-EP17E-02
  (WhatThisKeepsCard / MovedSessionRow ISO dates) as the one remaining
  AC-E17-10 gap on the page; disposition: reported for the combined review /
  a follow-up story; owner: planner; closure evidence: pending."
- **Correction:** covered by the same D17-17 and the same EP17H-AC7, as its
  third call site (`PlanProposal.tsx:223-226`). EP17H-AC7 records the reading
  that makes this consistent rather than contradictory: EP17F-AC5's frozen
  promise is about the *message* — its wording, its `role="alert"`, its
  `data-testid` and the confirm behaviour around it, all of which stay
  unchanged — while D17-17 changes only how its date reads, under the epic
  criterion (AC-E17-10) that was always meant to cover the page. EP17F's
  story file is **not** edited; the finding's own record keeps its
  disposition and this entry carries the resolution.
- **Verification:** `PlanProposal.tsx:223-226` re-read — the line
  interpolates `{c.date}` into a plain `<li>` with no `<time>` element, so
  `dayLabel(c.date)` replaces it outright. The frozen e2e assertion is
  `apps/web/e2e/plan-flow.spec.ts:781`,
  `await expect(summary).toContainText(target.date)`; it is named in EP17H's
  test list as an update, not a deletion, consistent with EP17H's standing
  rule that a journey the rebuild breaks is updated. The surrounding
  assertions (the lead sentence, `[data-conflicted]` count, nothing saved,
  the axe stop) are unaffected. `node tools/queue-lint.mjs docs/stories/EP17`
  clean.
- **Status:** Fixed in plan (decision taken and owner assigned) — the code
  change is **pending for EP17H**; closure evidence for F-EP17F-01 is this
  entry plus EP17H-AC7 and, at EP17H's closeout, its record.

## Combined implementation review — EP17A–EP17H, reviewer, 2026-11-19

**Verdict: Pass** (pass 1, reviewed commit `d8d226f`). Report:
[artifacts/EP17/review.md](./artifacts/EP17/review.md). No blocker and no
should-fix. 14/14 epic ACs satisfied, 7/7 TRs met, all 11 DoD items PASS
(DoD-10 part-inherited, DoD-11 inside the report). Four polish findings
(R-EP17-07…10) carried below. Reviewer-executed gates at `d8d226f`: API jest
57 suites / 1368 passed / 533 skipped / 0 failed; web `pnpm test` 140 files /
1516 tests / 0 failed; `pnpm typecheck` + `pnpm lint` green in both apps
(`apps/web` lint 0 errors, closing F-EP17A-01); `queue-lint` clean. Both
frozen snapshots verified unregenerated by `git log`; the Playwright suite is
inherited evidence from EP17H, not re-run.

### C-R-EP17-07 (from R-EP17-07, polish — rules on F-EP17G-01)

- **Original claim** (F-EP17G-01, EP17G's record `:130`): the study-days
  control can display "Custom (4 days)" after a reload when availability
  yields fewer days than the stored `weeklyGoalDays`.
- **Consequence:** none as filed. The review disproved the mechanism:
  `selectStudyDays` (`apps/api/src/domain/study-planning/scheduler.ts:280-290`)
  ranks days by free minutes and slices, so it returns **exactly**
  `min(weeklyGoalDays, 7)` days even when every other day has zero free time
  (verified by a throwaway reviewer probe). `pacing.studyDays.length`
  therefore always equals the effective planning value.
- **Disposition:** the finding is **closed as not reproducible**, and a
  narrower, reachable residue is recorded in its place: for a student who
  never stored `weeklyGoalDays`, the proposal shows "Custom (7 days)" (the
  unconstrained planning read, ▲ D17-16) while Profile shows "Steady — 3 days
  a week" (the momentum default), and `STUDY_DAYS_DESCRIPTION`'s second
  clause is then untrue for that student. Polish; owner EP17G/copy or a
  follow-up story. No AC is unmet: both numbers are true of their own reader,
  which is exactly the two-reader design ▲ D17-16 ruled.
- **Report reference:** review.md §1 R-EP17-07, §2 AC-E17-07.

### C-R-EP17-08 (from R-EP17-08, polish — rules on F-EP17G-02)

- **Original claim** (F-EP17G-02): Profile's **Save** writes the whole
  preferences bag, so it rewrites `spreadPercent` even when untouched.
- **Consequence:** confirmed and **broader than filed**. The same whole-bag
  write (`StudyPreferencesForm.tsx:239`) promotes an **unset**
  `weeklyGoalDays` to a stored `3`, which under ▲ D17-16 turns an
  unconstrained 7-day planner into a 3-day one after a save made for an
  unrelated field.
- **Disposition:** **polish, not a should-fix.** No AC or ruling forbids it,
  and ▲ D17-2's visibility proviso is satisfied at the moment it happens:
  EP17G renders the study-days preset group with its instruction copy on the
  same form, so the value being saved is visible and explained. Recommended
  follow-up (planner): a dirty-field write on the Profile form, or carrying
  the stored value beside `studyDays` in the payload. Not fixed in EP17.
- **Report reference:** review.md §1 R-EP17-08.

### C-R-EP17-09 (from R-EP17-09, polish — rules on F-EP17H-03)

- **Original claim** (F-EP17H-03): two pre-existing e2e flakes, both
  "outside EP17's diff".
- **Consequence:** the ruling is that **neither masks anything EP17
  touched**, and the pass evidence is adequate (76/76 on four of seven full
  runs; no EP17-owned spec failed in any run). One correction to the record:
  `apps/web/e2e/today.spec.ts:151` waits on `editable-week`, an
  **EP17E-owned** selector, so "outside EP17's diff" is imprecise — the
  assertion is EP17's, though the failure is a cold-stack load timeout (5 of
  6 passes, and the API suite runs in 10 s, so no pacing-induced slowness is
  indicated). `adaptive-scheduling.spec.ts:288` is genuinely untouched
  (`git diff 056b1bf..HEAD` on that spec: 3 insertions / 4 deletions, all in
  journey 1).
- **Disposition:** carried as a backlog candidate alongside BL-15-08; owner
  planner / live session. Not fixed in EP17.
- **Report reference:** review.md §1 R-EP17-09, §7 G.

### C-R-EP17-10 (from R-EP17-10, polish)

- **Original claim:** F-EP17B-01 and F-EP17C-03 ask for a one-line
  `evenShare` amendment and a denominator-wording fix in
  [contracts.md](./contracts.md) §3.
- **Consequence:** cosmetic. §3 already describes the one-sitting floor in
  prose and the implemented formula matches `scheduler.ts:504-521`, so no
  reader is misled about behaviour.
- **Disposition:** open, owner **planner**; no role in this review unit may
  write `contracts.md`. Does not block the pass.
- **Report reference:** review.md §1 R-EP17-10, DoD-9.

### Findings closed by this review with no action

`F-EP17A-01` (web lint, verified clean), `F-EP17D-01` (the `placementOf`
projection is still the comparison in both frozen gates), `F-EP17E-02` /
`F-EP17F-01` (closed by EP17H-AC7), `F-EP17H-01` (the fourth raw-ISO call
site, correctly handled as an addition to D17-17's examples), and EP17F's
"What else changed" + EP17G's `{ ok, pacing? }` / preset-module deviations —
all accepted with reasons in review.md §1.

## Superseded decisions

No decision is superseded. One **refinement** is on record: ▲ D17-16 (an
unset `weeklyGoalDays` means unconstrained, user, 2026-11-19) refines
▲ D17-2 (a); the back-reference was added to the epic's D17-2 register row in
the same planning pass (id-conventions rule 4). When a story decision refines
or overrides an epic decision, the back-reference is added the same way.

## Backlog review, 2026-11-19

`node tools/queue-lint.mjs --backlog docs/stories` listed 24 open rows.
Triggers fired and acted on (D17-13):

- **BL-16-02** ("render the plan proposal on the EP15 week grid and retire
  `PlanWeek`"; trigger "…or the next Plan-page story") — **partly promoted**
  to EP17E: the proposal's own grid becomes editable, which is the student-
  visible half. The "render on the EP15 calendar grid" half remains deferred
  and the row stays open.
- **BL-16-09** ("phone-first proposal", full spec in EP16K; trigger "the next
  Plan-page story") — **promoted** to EP17F.

Reviewed and left open (trigger not fired): BL-14-02, BL-14-03, BL-14-04,
BL-14-05, BL-14-10, BL-14-12, BL-15-01…BL-15-04, BL-15-06…BL-15-09,
BL-16-01, BL-16-03…BL-16-08, BL-16-10. BL-14-03 (placement explainability) is
noted as *more* valuable after EP17 and is mirrored forward as BL-17-03, but
its own trigger (EP14E ships) has not fired, so the EP16/EP14 row is not
promoted. `Last reviewed` stamped 2026-11-19 on every row examined, in its own
home's register.
