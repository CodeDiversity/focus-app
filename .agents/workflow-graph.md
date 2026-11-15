# Delivery playbook

The lifecycle as an ordered edge table. The live session walks it from the top
after every returned task and takes the **first** row whose check is true.
Checks are deterministic — queue state, file existence, `queue-lint` — and are
run inline by the session, never by a dispatched agent. One specialist at a
time, fresh context each, one bounded assignment.

| # | Check (deterministic) | Who acts | Assignment |
| --- | --- | --- | --- |
| 1 | Another implementation session is live or ownership is unknown | nobody — wait or obtain a handoff | — |
| 2 | A recorded ▲ decision, permission or human-evidence blocker is unanswered | user | answer the one recorded question |
| 3 | Breakdown README missing, or `queue-lint` fails on structure (states, links, IDs, at-a-glance blocks) | planner | `plan_correction` |
| 4 | Plan review **required** by [planning-checklist](planning-checklist.md#when-a-plan-review-is-required) and `plan-review.md` is absent, stale, or non-passing with corrections recorded | reviewer | `plan_review` |
| 5 | Plan review non-passing and corrections not yet recorded | planner | `plan_correction` |
| 6 | A child row is `In progress` or has an open `checkpoint.md` | implementer | `resume_checkpoint` |
| 7 | First eligible child (dependencies met, in queue order) is `Blocked` | user | the row's recorded question |
| 8 | First eligible child is `Needs refinement` or `Queued` | refiner | `refine` (up to 3 siblings sharing a surface) |
| 9 | First eligible child is `Ready` and its ▲ decisions are ruled | implementer | `complete_child` (may continue into the next Ready child) |
| 10 | First eligible child is `Ready` with a ▲ row still `Proposed` | user | rule the row |
| 11 | All children `Implemented…` and the parent `implementation.md` index is missing or omits a child | implementer | `integration` / index |
| 12 | Open mandatory review findings owned by implementer | implementer | `fix` |
| 13 | Open mandatory review findings owned by planner (scope/AC gaps) | planner | `fix` |
| 14 | Index complete and `review.md` absent, stale (HEAD moved on reviewed paths) or non-passing with fixes recorded | reviewer | `parent_review` |
| 15 | `review.md` passing (includes **How to verify by hand**) and queue rows not yet `Reviewed` | reviewer (passing sync) or session | sync + commit |
| 16 | Everything above false | — | **complete** |

Stop rules: after two correction + re-review cycles with the same mandatory
findings and no new evidence, stop and report rather than loop. Never relabel a
gate to escape it.

Non-edges: no parallel writers; no automatic per-child reviews or audits; an
implemented child never goes back to the refiner; nothing advances into the
next parent or epic without the user.

A read-only **static audit** (reviewer skill, `dod-auditor` mode) may run on
explicit user request at any point; it writes nothing and changes no state.
