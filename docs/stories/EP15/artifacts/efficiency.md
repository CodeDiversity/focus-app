# EP15 efficiency log — one row per dispatch

Schema: see `.agents/context-efficiency.md`. `n/a` when the runtime does not expose usage.

| date | child | role | model | tokens in / out | tool calls | dispatches | outcome |
|---|---|---|---|---|---|---|---|
| 2026-11-16 | EP15 | planner (live session) | default | n/a / n/a | ~25 | 0 | review of EP04/EP06/EP13/EP14 + code baseline; ACs agreed in chat before any story; epic + breakdown: 10 children, contracts.md, 6 backlog rows; BL-14-01 dropped, BL-14-02 re-pointed; EP11 D11-10 back-reference |
| 2026-11-16 | EP15 | reviewer (plan_review pass 1) | default | n/a / n/a | ~28 | 0 | Changes Required: R-EP15-01…06 should-fix, 07…09 polish (stale EP14E hook, known windows, create-then-cancel, overlap rule, rollback, Plan health) |
| 2026-11-16 | EP15E/G/H | refiner (one dispatch, shared surface) | default | n/a / n/a | ~29 | 0 | three stories Ready; D-E5…D-E8, D-G6…D-G11, D-H5…D-H8; ACs unchanged |
| 2026-11-16 | EP15 | reviewer (plan_review pass 2) | default | n/a / n/a | ~35 | 0 | Changes Required: R-EP15-01…09 closed; R-EP15-10…12 should-fix, 13…16 polish |
| 2026-11-16 | EP15 | reviewer (plan_review pass 3) | default | n/a / n/a | ~24 | 0 | **Plan Ready** at `8a29fbc`; R-EP15-10…16 closed; polish R-EP15-17/18 + R-EP15-14 residue |
| 2026-11-16 | EP15 | planner (live session, corrections) | default | n/a / n/a | ~12 | 0 | C-EP15-01…16 applied across two correction commits (`960fb60`, `8a29fbc`) |
| 2026-11-17 | EP15A | implementer (live session) | default | n/a / n/a | ~32 | 0 | implemented: schema + migration (copy verified by a rolled-back gated round-trip), pure `domain/schedule`; D-A2/D-A3 ratified by default; gated 1663/0; 0 open findings |
| 2026-11-17 | EP15B | implementer (live session) | default | n/a / n/a | ~30 | 0 | implemented: `/schedule/*` module (bounds PUT in one batch; PATCH in-place-or-split; delete-from; occurrence cancel), 104 new tests, gated 1767/0; D-B3/D-B4 ratified by default; F-EP15B-01 (`parseCalendarDate` throw → null) fixed; throwaway-db name collision worked around (F-EP15B-03) |
| 2026-11-17 | EP15C | implementer (live session) | default | n/a / n/a | ~24 | 0 | implemented: bounds base, dated blocked, preferred tier + course tie, D-J2 key tie; identity 15/15 vs frozen EP14E snapshot; 43 new tests, gated 1810/0; D-C1…D-C3 ratified by default; F-EP15C-01 (adapter carries window energy), -02 (same-start tie by key) |
