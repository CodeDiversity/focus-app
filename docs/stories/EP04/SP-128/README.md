# SP-128 Breakdown — Study Availability & Unavailable Blocks

**Epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-128](./SP-128-availability-and-unavailable-blocks.md) — coordination record (not an implementation ticket)
**Milestone:** M2
**Status:** SP-128 correction round open — SP-128B's kind-selector layout defect (F-B-6, user-reported, fix applied 2026-10-28) awaits verification; SP-128A unchanged `Reviewed`; SP-128B was `Reviewed` (pass 1) pending this fix.
**Jira key:** Pending creation

Covers the epic's proposed story **5 (study availability and unavailable blocks)**.

## Execution queue

**Delivery home:** `docs/stories/EP04/SP-128/`

**Artifact root:** `./artifacts/` — `./artifacts/SP-128/` (parent index, review, walkthrough) and `./artifacts/SP-128A/`, `./artifacts/SP-128B/`.

**Active substory:** None (SP-128A and SP-128B both implemented).

**Next substory:** SP-128B — resume: verify the F-B-6 fix (`pnpm vitest run src/features/availability`, visual re-check of the modal), reconcile records, then commit (fix + records + the previously deferred review/walkthrough sync). SP-128A stays `Reviewed`. (2026-10-28: F-B-6 opened by user report, fix applied but unverified — no test/browser runtime in this session.)

**Implementation owner:** `implementer`, sequential (A → B).

**Final review:** one combined SP-128 review after both children are implemented.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-128A-availability-slots-api.md) | Reviewed | EP02 + EP03 complete (satisfied). No EP04 predecessor. | None — parent complete (combined review passed 2026-10-28) | ./artifacts/SP-128A/implementation.md, ./artifacts/SP-128A/checkpoint.md, ./artifacts/SP-128/review.md (combined) |
| [B](./SP-128B-availability-settings-ui.md) | Reviewed — F-B-6 fix round open (fix applied, verification pending) | SP-128A implemented (the API it manages) — satisfied. | Resume: verify the F-B-6 fix (vitest + visual), reconcile, commit | ./artifacts/SP-128B/implementation.md, ./artifacts/SP-128B/checkpoint.md, ./artifacts/SP-128/implementation.md (parent index), ./artifacts/SP-128/review.md + walkthrough.md (combined) |

## Why this is two children

The CRUD API and its editor are one contract split across a layer boundary: SP-128A owns the slot semantics (validation, merge rules, uniqueness, ownership), SP-128B owns the editing experience. Both fit the 1–3 request/token target and each is independently verifiable.

**Re-size before implementation** if the `ui-refiner` pass introduces a materially new interaction — for example a drag-to-paint weekly grid editor, or a "copy Monday to all weekdays" bulk action that changes the API contract (it would need a bulk endpoint). That is a split trigger. Layout, wording, and control choice inside the existing CRUD surface are not.

## Decision register

See the [EP04 README](../README.md#decision-register). The decisions that bind this parent: D404-5 (the existing `AvailabilitySlot` model, weekly-recurring only, no migration), D404-11 (a top-level `/availability-slots` resource), D404-12 (its own `/availability` page), D404-9 (the editor's interaction model is for `ui-refiner`).

## Shared contract

`GET / POST / PATCH / DELETE /availability-slots` — the full request/response shape is in the [EP04 README](../README.md#shared-api-contract). SP-128A implements it; SP-128B consumes it; the combined review verifies it end to end.

## Source requirements and test traceability

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E04-04 | Students can configure recurring study availability. | A (CRUD), B (editor) |
| AC-E04-05 | Students can block unavailable times. | A (CRUD, `isAvailable: false`), B (editor) |

The calendar's consumption of these slots (they appear as `AVAILABILITY` / `BLOCKED_TIME` events) is SP-127A's read model, verified in the SP-127 review.

Shared DoD: see the [EP04 README](../README.md#requirement-and-test-traceability). DoD items 2, 3, 4, 8, 9 are owned by SP-128A; items 1, 5, 6, 7, 8 with SP-128B; items 10–11 belong to the combined parent review.

## Security invariants and counterexamples

See the [EP04 README](../README.md#security-invariants-and-counterexamples) — the availability invariants are ownership on every write, validation of the time fields, and the uniqueness conflict. Owning tests: SP-128A.

## Plan correction log

(First plan of this parent. Implementation review findings are appended here with stable IDs and are never rewritten.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| IR-001 | 2026-10-28 | Routed should-fix (outside SP-128; not verdict-affecting) | Combined review — SP-128B finding F-B-4, `apps/web/e2e/semesters-courses.spec.ts` (~lines 107/145/192) | Three course e2e tests time out clicking direct `Archive ${name}`-style buttons removed by the SP-126 redesign (`Actions for ${name}` menus) — test drift, not an app defect; the implementer reproduced identical 3 failures at baseline `24978c7` in a clean worktree, so not an SP-128 regression | Refresh the courses spec to the menu-button hierarchy or a small story; owner planner/coordinator (EP02 scope) | Reviewer-verified pre-existing via the implementer's baseline worktree evidence (SP-128B checkpoint F-B-4); open outside this parent | Open (routed) |
| IR-002 | 2026-10-28 | Polish (optional) | Combined review — SP-128A finding F-A-3 residual, `apps/api/tsconfig.json` | Base tsconfig excludes `dist/` but not `dist-test/`; a stale gitignored `dist-test/` build output can break `pnpm --filter api typecheck` (nothing committed; F-A-3 already dispositioned in-story) | Add `dist-test` to the base `exclude` next time API build config is touched; owner planner/implementer | Latent, environment-only; no verification obligation for this parent | Open (optional) |

## Quality gate (2026-10-28)

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Two children, each ~2–2.5 requests/tokens with an inspected footprint; a layer boundary on one contract. |
| 2 | Original AC/TR coverage | Pass | AC-E04-04 and AC-E04-05 owned here; no TRs in the epic. |
| 3 | Applicable DoD, incl. item 10 | Pass | DoD map above; item 10 by the combined parent review; item 9 = the shared contract, no migration. |
| 4 | Contract consistency and integration ownership | Pass | One shared contract in the EP04 README; A implements, B consumes, the parent review verifies. |
| 5 | Code paths inspected | Pass | Baseline in the EP04 README (the `AvailabilitySlot` model, ownership helpers, validation pipe, the meetings DTO precedent, the test harness, the web client pattern). |
| 6 | Feature-specific risks/counterexamples | Pass | Overlap and ordering between slots, the uniqueness conflict (409), the ownership invariant, and the time-field validation matrix. |
| 7 | Dependencies and sequencing | Pass | SP-128A → SP-128B; EP02/EP03 satisfied; independent of SP-127. |
| 8 | Material decisions | Blocked | D404-9 — the editor's interaction model, layout, and copy are for `ui-refiner`. |
| 9 | Correction log | Pass | Empty — first plan of this parent. |
| 10 | Jira identity/sync | Not applicable | No sync authorized; keys remain `Pending creation`. |

**Outcome: Draft** — SP-128A is `Ready`; SP-128B is `Needs refinement` pending the `ui-refiner` pass. (Historical planning-gate record, superseded by implementation: SP-128B's ui-refiner pass completed at `24978c7`; the parent is `Reviewed` per the review unit below.)

## Final implementation review unit

- **Parent:** SP-128 — `docs/stories/EP04/SP-128/`
- **In scope:** SP-128A, SP-128B
- **Integration/index owner:** SP-128B (writes `./artifacts/SP-128/implementation.md`)
- **Gate:** one combined SP-128 review after both children are implemented (`./artifacts/SP-128/review.md` + `walkthrough.md`).

**Outcome: Reviewed (pass 1, 2026-10-28)** — the combined SP-128 review **passed** at HEAD `cb6f9c1` (feature commits SP-128A `35ed47d`, SP-128B `a13cd31`): parent ACs 1–8 satisfied and the applicable DoD items pass ([report](./artifacts/SP-128/review.md), [walkthrough](./artifacts/SP-128/walkthrough.md)); SP-128A and SP-128B are `Reviewed`. Open routed items live in the correction log (IR-001: pre-existing `semesters-courses.spec.ts` test drift, EP02 owner; IR-002: optional `dist-test` tsconfig exclude). Remaining EP04 work: SP-129A.
