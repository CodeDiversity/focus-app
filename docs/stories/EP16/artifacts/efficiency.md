# EP16 efficiency log — one row per dispatch

Schema: see `.agents/context-efficiency.md`. `n/a` when the runtime does not expose usage.

| date | child | role | model | tokens in / out | tool calls | dispatches | outcome |
|---|---|---|---|---|---|---|---|
| 2026-11-17 | EP16 | planner (live session) | default | n/a / n/a | ~30 | 0 | product review (3 recommendations) → epic draft with open questions → user rulings → breakdown: 6 children, contracts.md, history.md, 5 backlog rows; BL-14-07 promoted, BL-14-09/11 dropped, BL-15-09 part-absorbed; back-references in EP05/EP11/EP13/EP15 |
| 2026-11-17 | EP16A | implementer (live session) | default | n/a / n/a | ~40 | 0 | `/today` + landing redirects; dashboard page and 4 sections removed; `features/today` rename; day line; Button name while loading; web 1321/0, e2e 62/0 ×3; F-EP16A-01…03 |
| 2026-11-18 | EP16B/EP16C | refiner | default | n/a / n/a | ~53 | 1 | both Ready; D-B5…10, D-C5…10 (non-▲); EP16C multi-window (S1–S5); found 3 extra e2e specs for the EP16C known window, "Overdue" on EP03 surfaces |
| 2026-11-18 | EP16D/EP16E | refiner | default | n/a / n/a | ~51 | 1 | both Ready; D-D5…8, D-E4…7 (non-▲); BL-14-07 root cause = late `replace` redirect; ▲ security finding: no cache reset on logout → EP16G |
| 2026-11-18 | EP16 | planner (live session) | default | n/a / n/a | ~12 | 0 | verified the cache finding; EP16G added first (D16-19); EP16D-AC3/4/5 amended (A-EP16-02); contracts known windows + resolved unverifieds; BL-16-06/07 |
| 2026-11-18 | EP16G | implementer (live session) | default | n/a / n/a | ~10 | 0 | listener middleware + `PER_STUDENT_APIS` registry; shared `createAppStore()` for app and tests; `resetOnboarding`; 4 tests incl. cross-student journey; web 1325/0 |
| 2026-11-18 | EP16B | implementer (live session) | default | n/a / n/a | ~14 | 0 | plan note, momentum row, Coming up, Classes today; `recoverySummaryApi` move/rename; Past due badge; forbidden-words helper; web 1355/0; e2e 62/0 ×2 (+1 cold-start timeout); F-EP16B-01…03 |
| 2026-11-18 | EP16C | implementer (live session) | default | n/a / n/a | ~22 | 0 | `PlanProposal` + `useProposal` on the catch-up pair; `/plan` rebuilt; plan-health/catch-up retired behind 4 redirects; moves; `weekLine`; D-C11 (no 409 toast) and D-C12 (summary line) ADHD tweaks; F-EP16C-01 (pin/unpin label-in-name) fixed; e2e re-pointed (4 specs); web 1356/0; e2e 61/0+1 fixme ×2 |
