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

## Implementation review history

| Round | Date | Reviewed commit | Report | Verdict |
|---|---|---|---|---|
| 1 | 2026-11-16 | `08b6bd5` | [review.md](./artifacts/EP14/review.md) | Does not pass — R-EP14-05 (user: Secret scan), R-EP14-06 (implementer), R-EP14-07 (planner); R-EP14-08 polish; all code gates green |

## Plan correction log

| ID | Date | Finding (plan review pass 1, [plan-review-pass-1.md](./plan-review-pass-1.md)) | Correction | Status |
|---|---|---|---|---|
| C-EP14-01 | 2026-11-16 | R-EP14-01: EP14A's red/green CI pair unattainable before EP14B (four pre-existing gated failures red on every run). | EP14A-AC3 redefined to deliberate-red + known-red-baseline (only the four R-EP13-03 tests); the first true-green CI link moved to EP14B-AC2/closeout; known-red window recorded in EP14A. | Fixed in plan — verified closed, plan review pass 2 ([plan-review.md](./plan-review.md), at `966b109`) |
| C-EP14-02 | 2026-11-16 | R-EP14-02: CI ran the gated suites in parallel `jest` while every zero-failure contract is `--runInBand`; parallel-mode flakes unowned; `ci.yml` JWT secret can be empty. | EP14A-AC2 pins the backend-test step to `--runInBand` and a non-empty `JWT_SECRET` fallback; the only-`on:`-block static test relaxed accordingly. | Fixed in plan — verified closed, plan review pass 2 ([plan-review.md](./plan-review.md), at `966b109`) |
| C-EP14-03 | 2026-11-16 | R-EP14-03: D-E3(a) guard undefined across dates (Mon 22:00 LOW vs Tue 09:00 NORMAL could defer light work a day). | EP14E-AC3 pins day-centric semantics (single day's gap list; day choice untouched), adds the cross-day test, aligns epic AC6 wording; stays inside the ratified option. | Fixed in plan — verified closed, plan review pass 2 ([plan-review.md](./plan-review.md), at `966b109`) |
| R-EP14-04 | 2026-11-16 | Plan review pass 2 ([plan-review.md](./plan-review.md)): three stale "red/green" summary echoes of the pre-C-EP14-01 evidence definition (README TR-E14-01 row; EP14A DoD and Sizing/Verification lines). | None yet — optional docs-only planner touch; normative texts (EP14A-AC3/Tests, EP14B-AC2) are already consistent. | Open — polish, does not block implementation |
| P-EP14-01 | 2026-11-16 | BL-14-08 (plan-page load/generate race, F-EP14C-03) — trigger "before EP14D" fired when the user asked to finish EP14. | Promoted to [EP14F](./EP14F-plan-page-load-generate-race.md) (Ready, inserted before EP14D; AC-E14-04 co-owned; TR-E14-07). | Fixed in plan |
| P-EP14-02 | 2026-11-16 | EP14E refiner pass (technical + UI/UX): D-E4 (PATCH `hard: null` = Auto), D-E5 (control row below Type/Priority), D-E6 (segmented Auto / Hard / Not hard + helper copy), D-E7 (guard anchor = earliest NORMAL gap ≥ minBlock). ▲ rows ruled by user grant ("finish EP14"). | No AC, contract or dependency changed → plan review pass 2 stands (planning-checklist: refining does not re-trigger). | Recorded |
| C-EP14-04 | 2026-11-16 | R-EP14-05 (combined review round 1, [review.md](./artifacts/EP14/review.md)): no fully green CI run — the "Secret scan" step is red on every proof run (44006149869 at `08b6bd5` green at steps 1–17); flagged item unconfirmed (anonymous log 403; local gitleaks blocked in-session). EP14B-AC2 / AC-E14-02 clause unmet. | None possible without the user: read the step-18 log signed in (or authorize a local `gitleaks detect --redact`), then fix a real item or add a reviewed, narrowly scoped allowlist for a confirmed placeholder; link the fully green run in `artifacts/EP14B/implementation.md`. | Decision needed — user |
| C-EP14-05 | 2026-11-16 | R-EP14-06: EP14B's named pipe-parity unit test (`test-http.ts` options ≡ `main.ts`) absent; four spec-local pipes still `enableImplicitConversion: true`. | Implementer fix dispatched (EP14B `fix`). | Addressed — awaiting re-review |
| C-EP14-06 | 2026-11-16 | R-EP14-07: F-EP14D-03, F-EP14F-01, F-EP14F-02 deferred outside the register (AC-E14-07). | BL-14-09…11 added with triggers; queue-lint clean. | Addressed — awaiting re-review |
| C-EP14-07 | 2026-11-16 | R-EP14-08 (polish): EP14E "pass unmodified" vs F-EP14E-01; EP14B test-file name; EP14D-AC1 `:100`→`:101`; D-D1 premise. | Four one-line story annotations (AC text itself untouched; the line-number drift is a note beside the frozen AC). | Addressed — awaiting re-review |
