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

Pass 1 plan review ([plan-review.md](./plan-review.md), 2026-11-16): **Changes Required**, R-EP14-01…09. Corrections by the planner (live session), same day:

| Correction | Finding | Original claim | Correction | Status |
|---|---|---|---|---|
| C-EP14-01 | R-EP14-01 | EP14A proves CI "red then green" on a scratch branch, sequenced before EP14B | The baseline already has 4 red gated tests; EP14A now repairs the three test defects and records a red run with **exactly one** named gated failure (the lock 400-case, a validation defect); EP14B owns the green run. EP14B's D-B2/D-B3 move to EP14A as D-A3/D-A4 with their rulings. | Addressed — awaiting re-review |
| C-EP14-02 | R-EP14-02 | EP14A is a substantive child | With the three gated test repairs and the CI-failure diagnosis it carries real work (kept as its own ID so the user's ordered request and push authorization stay literal) | Addressed — awaiting re-review |
| C-EP14-03 | R-EP14-03 | Parity guard = `test-http.ts` options equal `main.ts` | One shared `VALIDATION_PIPE_OPTIONS` used by production, `test-http.ts` and every spec-local copy (listed); grep guard against `enableImplicitConversion: true` (EP14B-AC2) | Addressed — awaiting re-review |
| C-EP14-04 | R-EP14-04 | D-B1 targets "query DTOs that need conversion" | None do; the exposure is ~25 body fields in 14 DTOs (inventoried in EP14B); `{ locked: "false" }` case added; Playwright journeys added to verification (EP14B-AC3). The ratified choice stands; its rationale is corrected | Addressed — awaiting re-review |
| C-EP14-05 | R-EP14-05 | `validation-strictness.e2e-spec.ts` | Renamed `validation-strictness-e2e.spec.ts` (matches Jest `testRegex`), gated via `describeIntegration` | Addressed — awaiting re-review |
| C-EP14-06 | R-EP14-06 | Fixing the `Badge` success variant fixes success contrast | EP14D-AC3 covers all five `bg-success/10` + `text-success` sites plus a guard test | Addressed — awaiting re-review |
| C-EP14-07 | R-EP14-07 | Epic AC6 "never moves to a LOW window later than a free NORMAL window in the same part of the day" | Epic AC6 now states EP14E-AC3's rule; AC3 defines the usable-gap reference and the no-NORMAL-gap case, each with a test | Addressed — awaiting re-review |
| C-EP14-08 | R-EP14-08 | "The per-worker random suffix still collided" | Contradicted by `login.spec.ts:16–20` / `auth.service.ts:141–145`; EP14C-AC2 now requires a traced root cause first; D-C2 (ratified) applies if the cause is shared-user state, a product-side duplicate POST is returned as a finding | Addressed — awaiting re-review |
| C-EP14-09 | R-EP14-09 (polish) | various | `momentumCopy.ts:65` + test and `gatherPlanData` added to Files; AC-E14-07 verifier = EP14 parent review; BL-14-01/-04/-05 triggers rewritten as the reviewer suggested; duplicate PR-branch runs noted under D-A1 | Addressed — awaiting re-review |
