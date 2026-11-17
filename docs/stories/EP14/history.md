# EP14 history (cold)

## Origin

Created 2026-11-16 from the user's rulings on [EP13R](../EP13/EP13R-follow-up-register-and-triage.md) ("ratify all of your findings on EP13R, put them in a new epic called EP13B … and make sure we have a way of tracking the backlogged items well"). Named EP14, not EP13B — see D14-1 in the [README](./README.md#decision-register).

## Quality gate (planner, 2026-11-16)

| Check (planning-checklist) | Result |
|---|---|
| Every EP13R "Do next" row has an owning child | Pass — D-R1/2 → EP14E, D-R8/14 → EP14B, D-R9–12 → EP14D, D-R13 → EP14C, D-R15 → EP14A |
| Every EP13R "Backlog" row is in the register with a concrete trigger | Pass — BL-14-01…06 (BL-14-06 dropped on its own trigger) |
| Every child has at-a-glance, numbered ACs, named tests, Decisions with Ruling, sizing | Pass — queue-lint clean |
| Story-sizing: no child under the meaningful-work gate | Pass — D-R8 folded into EP14B |
| ▲ decisions marked | Pass — D-B1, D-B4, D-E1…D-E3 |
| Plan review required? | **Yes** — EP14E adds a migration (persisted data); EP14B changes a validation invariant |
| Refiner handoff | EP14E (assignment-form UI) |

## Plan review history

| Pass | Date | Reviewed commit | Report | Verdict |
|---|---|---|---|---|
| 1 | 2026-11-16 | `5682fe8` | [plan-review-pass-1.md](./plan-review-pass-1.md) | Changes Required — R-EP14-01…03 (all should-fix, planner-owned) |
| 2 | 2026-11-16 | `966b109` | [plan-review.md](./plan-review.md) | **Plan Ready** — R-EP14-01…03 resolved (verified); R-EP14-04 open, polish only |

## Plan correction log

| ID | Date | Finding (plan review pass 1, [plan-review-pass-1.md](./plan-review-pass-1.md)) | Correction | Status |
|---|---|---|---|---|
| C-EP14-01 | 2026-11-16 | R-EP14-01: EP14A's red/green CI pair unattainable before EP14B (four pre-existing gated failures red on every run). | EP14A-AC3 redefined to deliberate-red + known-red-baseline (only the four R-EP13-03 tests); the first true-green CI link moved to EP14B-AC2/closeout; known-red window recorded in EP14A. | Fixed in plan — verified closed, plan review pass 2 ([plan-review.md](./plan-review.md), at `966b109`) |
| C-EP14-02 | 2026-11-16 | R-EP14-02: CI ran the gated suites in parallel `jest` while every zero-failure contract is `--runInBand`; parallel-mode flakes unowned; `ci.yml` JWT secret can be empty. | EP14A-AC2 pins the backend-test step to `--runInBand` and a non-empty `JWT_SECRET` fallback; the only-`on:`-block static test relaxed accordingly. | Fixed in plan — verified closed, plan review pass 2 ([plan-review.md](./plan-review.md), at `966b109`) |
| C-EP14-03 | 2026-11-16 | R-EP14-03: D-E3(a) guard undefined across dates (Mon 22:00 LOW vs Tue 09:00 NORMAL could defer light work a day). | EP14E-AC3 pins day-centric semantics (single day's gap list; day choice untouched), adds the cross-day test, aligns epic AC6 wording; stays inside the ratified option. | Fixed in plan — verified closed, plan review pass 2 ([plan-review.md](./plan-review.md), at `966b109`) |
| R-EP14-04 | 2026-11-16 | Plan review pass 2 ([plan-review.md](./plan-review.md)): three stale "red/green" summary echoes of the pre-C-EP14-01 evidence definition (README TR-E14-01 row; EP14A DoD and Sizing/Verification lines). | None yet — optional docs-only planner touch; normative texts (EP14A-AC3/Tests, EP14B-AC2) are already consistent. | Open — polish, does not block implementation |
| P-EP14-01 | 2026-11-16 | BL-14-08 (plan-page load/generate race, F-EP14C-03) — trigger "before EP14D" fired when the user asked to finish EP14. | Promoted to [EP14F](./EP14F-plan-page-load-generate-race.md) (Ready, inserted before EP14D; AC-E14-04 co-owned; TR-E14-07). | Fixed in plan |
| P-EP14-02 | 2026-11-16 | EP14E refiner pass (technical + UI/UX): D-E4 (PATCH `hard: null` = Auto), D-E5 (control row below Type/Priority), D-E6 (segmented Auto / Hard / Not hard + helper copy), D-E7 (guard anchor = earliest NORMAL gap ≥ minBlock). ▲ rows ruled by user grant ("finish EP14"). | No AC, contract or dependency changed → plan review pass 2 stands (planning-checklist: refining does not re-trigger). | Recorded |
