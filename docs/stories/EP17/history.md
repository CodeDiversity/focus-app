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
| 2 | Original AC/TR coverage | **Pass** — AC-E17-01…14 and TR-E17-01…07 each have a named primary owner in the [ownership](./README.md#epic-acceptance-criteria--ownership) and [traceability](./README.md#requirement-and-test-traceability) tables; no criterion is weakened or deferred. |
| 3 | DoD obligations | **Pass** — all eleven mapped in [README § DoD](./README.md); DoD-9 notes explicitly that there is **no migration** (▲ D17-5 (a)); DoD-10/11 belong to the EP17 parent unit. |
| 4 | Contract consistency and integration ownership | **Pass** (re-checked after corrections, 2026-11-19) — the preferences keys, the pacing rule, study-day selection, the payload block and the surface contract each live once, in [contracts.md](./contracts.md), and are cited rather than restated. The two internal contradictions plan review pass 1 found (R-EP17-01's AC-2 vs AC-3 tension; R-EP17-03's §4 vs EP17C mechanism) are corrected in C-R-EP17-01 / C-R-EP17-03. Integration ownership is EP17H, which carries real journey code and the protective gates (not a manufactured index child). |
| 5 | Code paths inspected; unverified disclosed | **Pass** — `scheduler.ts` (673 lines) read end to end; `preferences.ts` (250), `PlanProposal.tsx` (248), `PlanSessionEditor.tsx` (315) read in full; `study-plans.service.ts` read around `:180-210` and `:960-1200`; `StudyPreferencesForm.tsx` and `study-plans.controller.ts` inspected by targeted search. Unverified paths are named in each story's Technical notes and in the epic (`useProposal.ts`, `PlanWeek.tsx`, `catchUpPreview`'s full return shape, the momentum read's use of `weeklyGoalDays`, the preferences DTO decorators). |
| 6 | Feature risks/counterexamples and owning tests | **Pass** (re-checked after corrections, 2026-11-19) — six invariants with a concrete counterexample, a preventing mechanism and an owning test in the [epic's invariant table](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md#security--privacy--accessibility-invariants). Plan review pass 1 defeated the no-new-deadline-miss row (R-EP17-01) and the minute-sum wording (R-EP17-02); the row now names the feasibility-floor mechanism with its bounded claim and the adversarial owning fixture, and the sum invariant is stated per deficit category (C-R-EP17-01 / C-R-EP17-02). |
| 7 | Dependency mapping and sequence | **Pass** — one vertical sequence (contract → engine → service → frontend → integration) with the rationale and the known windows recorded; EP17C is the only `Blocked` row and its blocker is named. |
| 8 | Material (▲) decisions ruled or explicitly blocked | **Pass** — at breakdown (2026-11-19): ▲ D17-3 and ▲ D17-4 ruled; the other ▲ rows `Proposed` with recommendations filled (gate then **Needs Decision**). Update 2026-11-19 (same day): the user ratified every recommended row; ▲ D17-2 ruled (a) with a UI-visibility proviso (EP17G owns the surfacing, no new story). No open ▲ rows. |
| 9 | Correction log complete | **Pass** (updated 2026-11-19) — plan review pass 1 findings R-EP17-01…06 logged below as C-R-EP17-01…06, each with the original wording, the correction, verification and status — closed to `Fixed in plan` at plan review pass 2 (2026-11-19, `005bc78`, Plan Ready). |
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
`476f970`, verdict **Changes Required**).

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

## Superseded decisions

None yet. When a story decision refines or overrides an epic decision, the
back-reference is added to the epic register row in the same planning pass
(id-conventions rule 4).

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
