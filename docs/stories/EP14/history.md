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
| 1 | 2026-11-16 | `08b6bd5` | [review-round-1.md](./artifacts/EP14/review-round-1.md) | Does not pass — R-EP14-05 (user: Secret scan), R-EP14-06 (implementer), R-EP14-07 (planner); R-EP14-08 polish; all code gates green |
| 2 | 2026-11-16 | `5e35f2b` | [review.md](./artifacts/EP14/review.md) | **Passes** — R-EP14-06 (`7c8ef02`), R-EP14-07 and R-EP14-08 (`a06838a`) verified closed; R-EP14-05 waived by the user (C-EP14-04 / BL-14-12, recorded as waived, not satisfied); R-EP14-09 polish (stale parent-index counts). Reviewer-executed at HEAD: gated 1630/0 (80 suites), E2E 55/0; web 1290/0 reused (unchanged). Six children → Reviewed. |

## Plan correction log

| ID | Date | Finding (plan review pass 1, [plan-review-pass-1.md](./plan-review-pass-1.md)) | Correction | Status |
|---|---|---|---|---|
| C-EP14-01 | 2026-11-16 | R-EP14-01: EP14A's red/green CI pair unattainable before EP14B (four pre-existing gated failures red on every run). | EP14A-AC3 redefined to deliberate-red + known-red-baseline (only the four R-EP13-03 tests); the first true-green CI link moved to EP14B-AC2/closeout; known-red window recorded in EP14A. | Fixed in plan — verified closed, plan review pass 2 ([plan-review.md](./plan-review.md), at `966b109`) |
| C-EP14-02 | 2026-11-16 | R-EP14-02: CI ran the gated suites in parallel `jest` while every zero-failure contract is `--runInBand`; parallel-mode flakes unowned; `ci.yml` JWT secret can be empty. | EP14A-AC2 pins the backend-test step to `--runInBand` and a non-empty `JWT_SECRET` fallback; the only-`on:`-block static test relaxed accordingly. | Fixed in plan — verified closed, plan review pass 2 ([plan-review.md](./plan-review.md), at `966b109`) |
| C-EP14-03 | 2026-11-16 | R-EP14-03: D-E3(a) guard undefined across dates (Mon 22:00 LOW vs Tue 09:00 NORMAL could defer light work a day). | EP14E-AC3 pins day-centric semantics (single day's gap list; day choice untouched), adds the cross-day test, aligns epic AC6 wording; stays inside the ratified option. | Fixed in plan — verified closed, plan review pass 2 ([plan-review.md](./plan-review.md), at `966b109`) |
| R-EP14-04 | 2026-11-16 | Plan review pass 2 ([plan-review.md](./plan-review.md)): three stale "red/green" summary echoes of the pre-C-EP14-01 evidence definition (README TR-E14-01 row; EP14A DoD and Sizing/Verification lines). | None yet — optional docs-only planner touch; normative texts (EP14A-AC3/Tests, EP14B-AC2) are already consistent. | Open — polish, does not block implementation |
| P-EP14-01 | 2026-11-16 | BL-14-08 (plan-page load/generate race, F-EP14C-03) — trigger "before EP14D" fired when the user asked to finish EP14. | Promoted to [EP14F](./EP14F-plan-page-load-generate-race.md) (Ready, inserted before EP14D; AC-E14-04 co-owned; TR-E14-07). | Fixed in plan |
| P-EP14-02 | 2026-11-16 | EP14E refiner pass (technical + UI/UX): D-E4 (PATCH `hard: null` = Auto), D-E5 (control row below Type/Priority), D-E6 (segmented Auto / Hard / Not hard + helper copy), D-E7 (guard anchor = earliest NORMAL gap ≥ minBlock). ▲ rows ruled by user grant ("finish EP14"). | No AC, contract or dependency changed → plan review pass 2 stands (planning-checklist: refining does not re-trigger). | Recorded |
| C-EP14-04 | 2026-11-16 | R-EP14-05 (combined review round 1, [review.md](./artifacts/EP14/review.md)): no fully green CI run — the "Secret scan" step is red on every proof run (44006149869 at `08b6bd5` green at steps 1–17); flagged item unconfirmed (anonymous log 403; local gitleaks blocked in-session). EP14B-AC2 / AC-E14-02 clause unmet. | **User waiver, 2026-11-16** ("Skip EP14-05 mark it as canceled for now"): the "first fully green CI run" clause of EP14B-AC2 / AC-E14-02 is waived for the EP14 sign-off; exact scope = that clause only — strict validation, the zero-failure gated run and every other gate stand. The Secret-scan item itself stays open as **BL-14-12** (owner user) with the trigger "before any release tag or merge to `main`". | Cancelled — user waiver (tracked as BL-14-12) |
| C-EP14-05 | 2026-11-16 | R-EP14-06: EP14B's named pipe-parity unit test (`test-http.ts` options ≡ `main.ts`) absent; four spec-local pipes still `enableImplicitConversion: true`. | Implementer fix `7c8ef02`: shared frozen `FIELD_VALIDATION_PIPE_OPTIONS`, both bootstrap files construct from it, 5-test pinning spec with source guard, 11 spec files aligned (incl. five `auth/dto` specs beyond the named list). | Closed — verified round 2 ([review.md](./artifacts/EP14/review.md) §1, at `5e35f2b`: spec 5/5, touched suites 381/0, gated 1630/0) |
| C-EP14-06 | 2026-11-16 | R-EP14-07: F-EP14D-03, F-EP14F-01, F-EP14F-02 deferred outside the register (AC-E14-07). | BL-14-09…11 added with triggers (`a06838a`); queue-lint clean. | Closed — verified round 2 ([review.md](./artifacts/EP14/review.md) §1: rows present with concrete triggers; lint clean, `--backlog` lists them) |
| C-EP14-07 | 2026-11-16 | R-EP14-08 (polish): EP14E "pass unmodified" vs F-EP14E-01; EP14B test-file name; EP14D-AC1 `:100`→`:101`; D-D1 premise. | Four one-line story annotations (`a06838a`; AC text itself untouched; the line-number drift is a note beside the frozen AC). | Closed — verified round 2 ([review.md](./artifacts/EP14/review.md) §1: `EP14B:42`, `EP14D:33`, `EP14D:54`, `EP14E:61`) |
| R-EP14-09 | 2026-11-16 | Round 2 ([review.md](./artifacts/EP14/review.md)), polish: parent index §2/§3/§6 and the EP14B record status line carry pre-fix-round counts and dispositions (gated 1625 → 1630; register 8 → 12 rows; F-EP14B-02 → BL-14-12; F-EP14D-03/F-EP14F-01/-02 → BL-14-09…11). Normative homes are correct. | None required — optional one-line implementer touches; the parent index status line now points at this note. | Open — polish, does not block sign-off |
