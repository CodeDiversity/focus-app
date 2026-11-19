# EP17 efficiency log — one row per dispatch

Schema: see `.agents/context-efficiency.md`. `n/a` when the runtime does not expose usage.

| date | child | role | model | tokens in / out | tool calls | dispatches | outcome |
|---|---|---|---|---|---|---|---|
| 2026-11-19 | EP17 | planner | default | n/a / n/a | ~25 | 1 | breakdown: epic + 8 children + contracts.md + history.md; verified the front-loading baseline in `scheduler.ts` (read in full), `preferences.ts`, `PlanProposal.tsx`, `PlanSessionEditor.tsx`; D17-3/D17-4 user rulings recorded, D17-2 recommended and left ▲ Proposed; BL-16-09 promoted, BL-16-02 part-promoted, 3 new backlog rows; gate Needs Decision, plan review required (D17-12) |
| 2026-11-19 | EP17 | planner | small | n/a / n/a | ~30 | 1 | plan_correction: R-EP17-01…06 applied (C-R-EP17-01…06 in history.md); engine claims re-verified in scheduler.ts (:317-332, :489-490, :534-537, :547-553, :594-596); gate rows 4/6/9 updated; stale-decision sweep across epic, both READMEs and EP17A/C/D/F/G/H; awaiting re-review |
| 2026-11-19 | EP17 | reviewer | default | n/a / n/a | ~20 | 1 | plan_review passes 1+2: pass 1 verified every code citation at 476f970, 6 findings (4 should-fix, 2 polish) incl. two engine counterexamples; pass 2 at 005bc78 resolved all six, no Ruling cell altered, verdict Plan Ready; passing sync (history correction log → Fixed in plan, queue, epic/README status lines) |
