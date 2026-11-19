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
| 4 | Contract consistency and integration ownership | **Pass** — the preferences keys, the pacing rule, study-day selection, the payload block and the surface contract each live once, in [contracts.md](./contracts.md), and are cited rather than restated. Integration ownership is EP17H, which carries real journey code and the protective gates (not a manufactured index child). |
| 5 | Code paths inspected; unverified disclosed | **Pass** — `scheduler.ts` (673 lines) read end to end; `preferences.ts` (250), `PlanProposal.tsx` (248), `PlanSessionEditor.tsx` (315) read in full; `study-plans.service.ts` read around `:180-210` and `:960-1200`; `StudyPreferencesForm.tsx` and `study-plans.controller.ts` inspected by targeted search. Unverified paths are named in each story's Technical notes and in the epic (`useProposal.ts`, `PlanWeek.tsx`, `catchUpPreview`'s full return shape, the momentum read's use of `weeklyGoalDays`, the preferences DTO decorators). |
| 6 | Feature risks/counterexamples and owning tests | **Pass** — six invariants with a concrete counterexample, a preventing mechanism and an owning test in the [epic's invariant table](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md#security--privacy--accessibility-invariants), including the user's own D17-3 counterexample (many small assignments must not be throttled), the no-silent-loss sum invariant, and the determinism/compatibility gate. |
| 7 | Dependency mapping and sequence | **Pass** — one vertical sequence (contract → engine → service → frontend → integration) with the rationale and the known windows recorded; EP17C is the only `Blocked` row and its blocker is named. |
| 8 | Material (▲) decisions ruled or explicitly blocked | **Blocked (by design)** — ▲ D17-3 and ▲ D17-4 are ruled (user, 2026-11-19). ▲ D17-2, ▲ D17-5, ▲ D17-8, ▲ D-A1, ▲ D-C2, ▲ D-D1, ▲ D-E1, ▲ D-F1, ▲ D-F2, ▲ D-G1 are `Proposed` with a recommendation filled for every row (recommend-don't-ask). ▲ D17-2 blocks EP17C; the rest block only their own child at implementation start. Gate status: **Needs Decision**. |
| 9 | Correction log complete | **Pass** — no corrections at this breakdown (see below). |
| 10 | Identifier consistency and at-a-glance blocks (`queue-lint` clean) | **Pass** — every child has the at-a-glance block and a Decisions table with a Ruling column; epic decisions `D17-<n>`, story decisions `D-<suffix><n>`, epic criteria `AC-E17-<nn>`, test requirements `TR-E17-<nn>`, verification `V-17-<n>`, backlog `BL-17-<nn>`; `node tools/queue-lint.mjs docs/stories/EP17` clean. |

**Gate status:** **Needs Decision** — a sound, complete plan whose material
rows await rulings; ▲ D17-2 is the only one that blocks a child outright.

## Plan review

**Required** (D17-12). Trigger: the study-preferences bag gains persisted
keys, which the planning-checklist counts as a new persisted-data contract.
Eight children sits at the ">8 children" threshold, not over it, so the
contract change is the operative trigger. Recommended focus: EP17A's
backward-compatibility claim for pre-EP17 bags, and EP17B/EP17C's purity,
determinism and no-silent-loss invariants. Not yet run — report will live at
`./plan-review.md`.

## Correction log

None at this breakdown. Corrections are logged here as
`original finding → correction → verification → status`
(`Fixed in plan` / `Decision needed` / `Unresolved`; reviewer findings
additionally `Addressed — awaiting re-review`).

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
