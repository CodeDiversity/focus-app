# EP14 efficiency log — one row per dispatch

Schema: see `.agents/context-efficiency.md`. `n/a` when the runtime does not expose usage.

| date | child | role | model | tokens in / out | tool calls | dispatches | outcome |
|---|---|---|---|---|---|---|---|
| 2026-11-16 | EP14 | planner (live session) | default | n/a / n/a | ~30 | 0 | breakdown: 5 children, 6 backlog rows (BL-14-06 dropped on its own trigger), queue-lint rule 6 + `--backlog` + rule 5 revived |
| 2026-11-16 | EP14 | reviewer (plan_review pass 2) | default | n/a / n/a | ~20 | 0 | Plan Ready at `966b109`: R-EP14-01…03 verified closed; R-EP14-04 raised (polish, stale red/green echoes); passing sync + commit |
| 2026-11-16 | EP14A | implementer (live session) | default | n/a / n/a | ~15 | 0 | implemented; 4/4 ACs; CI trigger+runInBand+JWT fallback; red+baseline runs recorded; F-EP14A-01 |
