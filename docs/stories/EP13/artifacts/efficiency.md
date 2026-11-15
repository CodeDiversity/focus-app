# EP13 efficiency log — one row per dispatch

Schema: see `.agents/context-efficiency.md`. `n/a` when the runtime does not expose usage.

| date | child | role | model | tokens in / out | tool calls | dispatches | outcome |
|---|---|---|---|---|---|---|---|
| 2026-11-15 | EP13P | planner (subagent) | default | n/a / n/a | 29 | 1 | EP13P-AC4 done, 3 commits |
| 2026-11-15 | EP13Q | live session (user-granted protocol edit) | default | n/a / n/a | ~45 | 0 | implemented; 13/13 ACs; 5 recorded deviations |
| 2026-11-15 | EP13L | implementer | default | n/a / n/a | ~40 | 1 | implemented; 5/5 ACs; api 1056 / web 1210 green; 2 findings (F-EP13L-01 contracts wording, F-EP13L-02 gated suites) |
