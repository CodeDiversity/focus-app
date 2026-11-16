# EP14 Story Breakdown — Adaptive Scheduling Follow-ups

**Epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** proposed M7 — release 1.1.x hardening (D14-2)
**Origin:** user rulings on [EP13R](../EP13/EP13R-follow-up-register-and-triage.md), 2026-11-16 — every recommendation ratified: eight "Do next" items became the five children below, six "Backlog" items are tracked in the [Backlog register](#backlog).
**Status:** Breakdown complete (planner, 2026-11-16). Quality gate: see [history.md](./history.md). **Plan review:** pass 1 ([plan-review-pass-1.md](./plan-review-pass-1.md)) Changes Required — R-EP14-01…03 corrected (C-EP14-01…03 in [history.md](./history.md)); pass 2 ([plan-review.md](./plan-review.md)) **Plan Ready** (reviewer, 2026-11-16, at `966b109` — prior findings resolved; R-EP14-04 polish only).

## Plan at a glance

- **What this changes:** CI that runs the live-database gate on delivery branches (EP14A); strict request validation, a zero-failure gated baseline and server-owned week dates (EP14B); deterministic E2E (EP14C); the four EP13 accessibility defects fixed and the axe allowlist removed (EP14D); a student-owned "hard" flag plus a light-work timing guard (EP14E).
- **Why it improves it:** EP13's review proved the gates could be green without having run, and left a validation hole and an a11y truce behind (code); students get an honest say in what counts as hard, and easy work stops drifting late (product).
- **Decisions needing you:** none — every story decision and register row ratified by the user 2026-11-16 (recommended options).
- **How to change this plan:** edit a Ruling cell in a story or in the register below; ask the planner for AC or queue changes.

## Execution queue

**Delivery home:** `docs/stories/EP14/`

**Artifact root:** `./artifacts/` — one directory per child, plus `./artifacts/EP14/` for the parent index and review.

**Active substory:** None.

**Next substory:** EP14A — implement (plan review pass 2 returned Plan Ready, 2026-11-16, [plan-review.md](./plan-review.md)). Push authorization for EP14A's scratch-branch proof granted (user, 2026-11-16).

**Implementation owner:** `implementer`, one sequential writer across all layers.

**Final review:** one combined review for the EP14 unit (EP14A–EP14E) after EP14E; report at `./artifacts/EP14/review.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP14A](./EP14A-ci-runs-the-full-gate-on-delivery-branches.md) | Ready | None. Needs push authorization for the scratch-branch proof at implementation time. | Implement (plan review passed 2026-11-16) | — |
| [EP14B](./EP14B-api-contract-integrity.md) | Ready | ▲ D-B1, ▲ D-B4 ratified (user, 2026-11-16); EP14A first | Implement after EP14A | — |
| [EP14C](./EP14C-e2e-reliability.md) | Ready | None | Implement after EP14B | — |
| [EP14D](./EP14D-accessibility-debt-from-the-ep13-pass.md) | Ready | None | Implement after EP14C | — |
| [EP14E](./EP14E-effort-aware-placement.md) | Needs refinement | EP14B; ▲ D-E1…D-E3 ratified (user, 2026-11-16); refiner pass still required (assignment-form UI) | Refine, then implement last | — |

Sequence (one writer): EP14A → EP14B → EP14C → EP14D → EP14E. Why: the CI trigger first makes every later child's gated evidence a real run; EP14B makes the baseline zero-failure before anything else lands on it; EP14E adds a migration and new body field, so it follows the validation policy it depends on.

## Stories

| Story | EP13R source | Layer |
|---|---|---|
| [EP14A](./EP14A-ci-runs-the-full-gate-on-delivery-branches.md) | D-R15 | Integration (CI) |
| [EP14B](./EP14B-api-contract-integrity.md) | D-R14, D-R8 | Backend (+ small frontend) |
| [EP14C](./EP14C-e2e-reliability.md) | D-R13 | Integration (E2E) |
| [EP14D](./EP14D-accessibility-debt-from-the-ep13-pass.md) | D-R9, D-R10, D-R11, D-R12 | Frontend |
| [EP14E](./EP14E-effort-aware-placement.md) | D-R1, D-R2 | Backend + Frontend |

**Why five, not eight:** under story-sizing, D-R8 (the `week.days` field) is under the 30-minute meaningful-work gate on its own and rides in EP14B's API-contract outcome; D-R9…D-R12 share one outcome (the EP13 axe gate with no exclusions); D-R1 and D-R2 both change how placement decides effort.

## Epic acceptance criteria — ownership

| Epic AC (abbreviated) | Stable ID | Owner |
|---|---|---|
| Delivery-branch pushes run the gated suites; red fails the job | AC-E14-01 | **EP14A** |
| Gated run zero failures; wrong-typed bodies → 400 | AC-E14-02 | **EP14B** |
| Momentum carries its week dates; no client date math | AC-E14-03 | **EP14B** |
| E2E deterministic under parallel load on any date | AC-E14-04 | **EP14C** |
| Four a11y defects fixed; axe gate with no allowlist | AC-E14-05 | **EP14D** |
| Student-owned hard flag; light-work timing guard | AC-E14-06 | **EP14E** |
| Deferred items tracked, lint-enforced, reviewed | AC-E14-07 | this breakdown (register below + `tools/queue-lint.mjs` rule 6 and `--backlog`) |

## Requirement and test traceability

| Req | Requirement | Owner |
|---|---|---|
| TR-E14-01 | Scratch-branch red/green CI run pair recorded | EP14A |
| TR-E14-02 | Strictness E2E (bodies 400, query numbers parse) + full gated run 0 failed | EP14B |
| TR-E14-03 | `week.days` shape tests + week strip renders without date math | EP14B |
| TR-E14-04 | Three consecutive full parallel E2E runs, zero failures from the three specs | EP14C |
| TR-E14-05 | The three a11y E2E tests + seven journeys green with no `ignore` predicate | EP14D |
| TR-E14-06 | Flag DTO/migration matrix, engine override + guard + identity, form tests | EP14E |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)): DoD-2/3/4 apply to EP14B and EP14E; DoD-5/6/7 to EP14D and EP14E; DoD-8 to all; DoD-9 to EP14A (rule), EP14B (`contracts.md`), EP14E (migration); DoD-10/11 the EP14 parent review.

## Decision register

| ID | Decision | Status / provenance |
|---|---|---|
| D14-1 | **Epic ID.** Requested as "EP13B"; created as **EP14** because `EP13B` is a stable EP13 child ID (commit `f524310`, `artifacts/EP13B/`, F-EP13B-02) and `EP<nn><L>` is the child-story form in [id-conventions](../../../.agents/id-conventions.md). Separation from closed EP13 is preserved. | Ratified (user, 2026-11-16 — accepted by proceeding with EP14). |
| D14-2 | Milestone: a new **M7 — release 1.1.x hardening** for EP14 (M6 = EP13, closed). | Ratified (user, 2026-11-16). |
| D14-3 | Scope = the EP13R rulings verbatim: "Do next" → children, "Backlog" → register. | User decision 2026-11-16 ("ratify all of your findings on EP13R"). |
| D14-4 | Backlog tracking: the `## Backlog` register below, `BL-<nn>-<nn>` IDs, queue-lint rule 6 (row shape), `queue-lint --backlog` (cross-epic listing), and the review ritual in [delivery-state](../../../.agents/delivery-state.md#backlog-register) + planner skill step 0. | User request 2026-11-16 ("make sure we have a way of tracking the backlogged items well"); landed with this breakdown. |

## Backlog

Reviewed at every epic breakdown and every parent sign-off; list all open rows across epics with `node tools/queue-lint.mjs --backlog docs/stories`. Status forms and field rules: [delivery-state](../../../.agents/delivery-state.md#backlog-register).

| ID | Item | Source | Why deferred | Revisit when | Owner | Last reviewed | Status |
|---|---|---|---|---|---|---|---|
| BL-14-01 | **Energy quick setup** — bulk-tag windows ("my mornings are high energy") | EP13R D-R3; EP13J closeout | Unvalidated that students tag energy at all (V-13-5 data) | EP14E has shipped and a usage check (share of students with ≥ 1 non-NORMAL window) has been run on real data | planner | 2026-11-16 | Backlog |
| BL-14-02 | **"Drained today" override** — one tap treats today as LOW energy | EP13R D-R4; EP13J exclusion | Needs its own model decision (per-date row vs transient flag) | BL-14-01 is promoted, or a user asks for it | planner | 2026-11-16 | Backlog |
| BL-14-03 | **Placement explainability** — preview says why a session landed there | EP13R D-R5 | No user has asked; EP13L's annotation plumbing makes it cheap later | EP14E ships (the hard flag gives a second reason worth explaining), or a user asks "why is this here?" | planner | 2026-11-16 | Backlog |
| BL-14-04 | **Fragmentation at energy boundaries** — sessions never straddle levels | EP13R D-R6; F-EP13J-03 | Needs real tagged-schedule data first | The BL-14-01 usage check shows tagged students' median placed block is shorter than untagged students' | planner | 2026-11-16 | Backlog |
| BL-14-05 | **Momentum goal history** — goal changes re-score past weeks | EP13R D-R7; F-EP13K-03 | Real schema work; honest limitation already documented in-module | A user reports a shrunk run after changing goals, or any migration touches `User.preferences` | planner | 2026-11-16 | Backlog |
| BL-14-06 | **EP13Q review polish** — record never quoted the efficiency rows; queue-lint rule 5 dead | EP13R D-R16; R-EP13Q-04/-05 | Optional polish | The next edit to `tools/queue-lint.mjs` (fired 2026-11-16, this breakdown) | planner | 2026-11-16 | Dropped — trigger fired during this breakdown: rule 5 fixed (now lints in-flight checkpoints only; closed EP13 history is legacy by id-conventions); the record-quote half is historical and not worth a record edit |

## Final implementation review unit

| Parent | In-scope children | Artifact paths | Index owner | Gate |
|---|---|---|---|---|
| [EP14](./README.md) | EP14A–EP14E | `./artifacts/EP14/` | EP14E's implementer writes the parent index | One combined EP14 review after all children |
