# EP14 efficiency log — one row per dispatch

Schema: see `.agents/context-efficiency.md`. `n/a` when the runtime does not expose usage.

| date | child | role | model | tokens in / out | tool calls | dispatches | outcome |
|---|---|---|---|---|---|---|---|
| 2026-11-16 | EP14 | planner (live session) | default | n/a / n/a | ~30 | 0 | breakdown: 5 children, 6 backlog rows (BL-14-06 dropped on its own trigger), queue-lint rule 6 + `--backlog` + rule 5 revived |
| 2026-11-16 | EP14 | reviewer (plan_review pass 2) | default | n/a / n/a | ~20 | 0 | Plan Ready at `966b109`: R-EP14-01…03 verified closed; R-EP14-04 raised (polish, stale red/green echoes); passing sync + commit |
| 2026-11-16 | EP14A | implementer (live session) | default | n/a / n/a | ~15 | 0 | implemented; 4/4 ACs; CI trigger+runInBand+JWT fallback; red+baseline runs recorded; F-EP14A-01 |
| 2026-11-16 | EP14B | implementer (live session) | default | n/a / n/a | ~45 | 0 | implemented; EP14B-AC1/EP14B-AC3 done, EP14B-AC2 partial (gated 1584/0 local + CI backend/frontend green; Secret scan red, F-EP14B-02); F-EP14B-01 fixed |
| 2026-11-16 | EP14C | implementer (live session) | default | n/a / n/a | ~40 | 0 | implemented; 3/3 ACs; 3 full runs 0 failures from its files; logout race reproduced + fixed; 2 product races registered (BL-14-07/-08) |
| 2026-11-16 | EP14F | implementer (dispatched) | default | n/a / n/a | ~45 | 0 | implemented; 3/3 ACs; `actedRef` guard (D-F1a); 4 clean full E2E runs 0 race failures (2 more aborted by cross-session port contention); F-EP14F-01/-02 (harness) |
| 2026-11-16 | EP14D | implementer (dispatched; same session as EP14F) | default | n/a / n/a | ~55 | 0 | implemented; 4/4 ACs; root causes found (Dialog restore capture under StrictMode; 44 px read mid-animation), `success-strong` token, chip name from content, allowlist removed; isolated-stack E2E 3× fully green (54/0); F-EP14D-01…03 |
| 2026-11-16 | EP14E | implementer (dispatched) | default | n/a / n/a | ~95 | 0 | implemented; 4/4 ACs; migration + 12-key projection + D-E4 null-as-value PATCH, `isDemanding` override + day-centric guard (D-E3/D-E7), `EffortChoice` segmented group; gated 1625/0, web 1290/0, E2E 55/0; F-EP14E-01…03 (recorded deviations) |
| 2026-11-16 | EP14 | implementer (integration — parent index; same dispatch as EP14E) | default | n/a / n/a | ~12 | 0 | parent index written: six-child inventory with per-child diff ranges, test commands + last results, AC-E14-01…07 / TR-E14-01…07 / DoD map, gaps (F-EP14B-02 Secret scan → no fully green CI run yet; F-EP14D-03; F-EP14F-01/-02; BL-14-07); `ready for review` |
| 2026-11-16 | EP14B | implementer (fix R-EP14-06, dispatched) | default | n/a / n/a | ~20 | 0 | fixed — awaiting re-review; shared `FIELD_VALIDATION_PIPE_OPTIONS` (main.ts ≡ test-http.ts by construction) + 5-test pinning spec incl. source guard; 12 spec-local copies aligned (3 named files + 5 auth/dto); ungated 1146/0, gated 80 suites, 1630 passed, 0 failed (1625 at EP14E + 5 new) |
