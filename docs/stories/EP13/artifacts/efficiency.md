# EP13 efficiency log — one row per dispatch

Schema: see `.agents/context-efficiency.md`. `n/a` when the runtime does not expose usage.

| date | child | role | model | tokens in / out | tool calls | dispatches | outcome |
|---|---|---|---|---|---|---|---|
| 2026-11-15 | EP13P | planner (subagent) | default | n/a / n/a | 29 | 1 | EP13P-AC4 done, 3 commits |
| 2026-11-15 | EP13Q | live session (user-granted protocol edit) | default | n/a / n/a | ~45 | 0 | implemented; 13/13 ACs; 5 recorded deviations |
| 2026-11-15 | EP13L | implementer | default | n/a / n/a | ~40 | 1 | implemented; 5/5 ACs; api 1056 / web 1210 green; 2 findings (F-EP13L-01 contracts wording, F-EP13L-02 gated suites) |
| 2026-11-15 | EP13N | implementer | default | n/a / n/a | ~16 | 1 | implemented; 5/5 ACs; web 1220 green (+10 form tests); 4 deviations recorded, no open findings |
| 2026-11-16 | EP13K | implementer (live session) | default | n/a / n/a | ~75 | 0 | implemented; 5/5 ACs; ▲ rulings asked then ratified by user; api 1084 / web 1255 green; 4 findings (F-EP13K-01…04), 6 deviations |
| 2026-11-16 | EP13J | implementer (live session) | default | n/a / n/a | ~65 | 0 | implemented; 5/5 ACs; D-J1…D-J6 authored + ratified (▲ by user grant); api 1104 / web 1264 green; 4 findings, 4 deviations |
| 2026-11-16 | EP13M | implementer (live session) | default | n/a / n/a | ~110 | 0 | implemented; 4/4 ACs; 7 journeys green; 4 EP13 E2E regressions repaired (8 never-run catch-up tests recovered); 1 a11y fix; 7 findings; parent index written |
| 2026-11-16 | EP13 | reviewer (subagent, parent_review round 1) | default | ~206k / n/a | 91 | 1 | does not pass — R-EP13-01…05; gated suites executed first time (8 red); 7/7 journeys green |
| 2026-11-16 | EP13 | implementer (live session, R-EP13-01/02/04 fixes) | default | n/a / n/a | ~25 | 0 | gated suites green but 4 pre-existing (R-EP13-03); 1 code fix (missed-query guard), 3 test fixes, 10 record corrections, EP13R register |
| 2026-11-16 | EP13P | reviewer (subagent, document review round 1) | default | n/a / n/a | ~14 | 1 | passes; 1 polish finding (R-EP13P-01); queue row synced to Reviewed |
| 2026-11-16 | EP13Q | reviewer (same dispatch, document review round 1) | default | n/a / n/a | ~14 | 0 | does not pass — R-EP13Q-01…03 should-fix, R-EP13Q-04/05 polish; report saved, no sync |
