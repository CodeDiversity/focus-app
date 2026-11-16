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

## Plan correction log

| ID | Date | Finding (plan review pass 1, [plan-review.md](./plan-review.md)) | Correction | Status |
|---|---|---|---|---|
| C-EP14-01 | 2026-11-16 | R-EP14-01: EP14A's red/green CI pair unattainable before EP14B (four pre-existing gated failures red on every run). | EP14A-AC3 redefined to deliberate-red + known-red-baseline (only the four R-EP13-03 tests); the first true-green CI link moved to EP14B-AC2/closeout; known-red window recorded in EP14A. | Fixed in plan |
| C-EP14-02 | 2026-11-16 | R-EP14-02: CI ran the gated suites in parallel `jest` while every zero-failure contract is `--runInBand`; parallel-mode flakes unowned; `ci.yml` JWT secret can be empty. | EP14A-AC2 pins the backend-test step to `--runInBand` and a non-empty `JWT_SECRET` fallback; the only-`on:`-block static test relaxed accordingly. | Fixed in plan |
| C-EP14-03 | 2026-11-16 | R-EP14-03: D-E3(a) guard undefined across dates (Mon 22:00 LOW vs Tue 09:00 NORMAL could defer light work a day). | EP14E-AC3 pins day-centric semantics (single day's gap list; day choice untouched), adds the cross-day test, aligns epic AC6 wording; stays inside the ratified option. | Fixed in plan |
