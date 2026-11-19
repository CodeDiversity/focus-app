# EP17 efficiency log — one row per dispatch

Schema: see `.agents/context-efficiency.md`. `n/a` when the runtime does not expose usage.

| date | child | role | model | tokens in / out | tool calls | dispatches | outcome |
|---|---|---|---|---|---|---|---|
| 2026-11-19 | EP17 | planner | default | n/a / n/a | ~25 | 1 | breakdown: epic + 8 children + contracts.md + history.md; verified the front-loading baseline in `scheduler.ts` (read in full), `preferences.ts`, `PlanProposal.tsx`, `PlanSessionEditor.tsx`; D17-3/D17-4 user rulings recorded, D17-2 recommended and left ▲ Proposed; BL-16-09 promoted, BL-16-02 part-promoted, 3 new backlog rows; gate Needs Decision, plan review required (D17-12) |
