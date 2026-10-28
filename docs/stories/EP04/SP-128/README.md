# SP-128 Breakdown — Study Availability & Unavailable Blocks

**Epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-128](./SP-128-availability-and-unavailable-blocks.md) — coordination record (not an implementation ticket)
**Milestone:** M2
**Status:** Draft — two children; SP-128A `Ready`, SP-128B `Needs refinement` (ui-refiner handoff, D404-9).
**Jira key:** Pending creation

Covers the epic's proposed story **5 (study availability and unavailable blocks)**.

## Execution queue

**Delivery home:** `docs/stories/EP04/SP-128/`

**Artifact root:** `./artifacts/` — `./artifacts/SP-128/` (parent index, review, walkthrough) and `./artifacts/SP-128A/`, `./artifacts/SP-128B/`.

**Active substory:** None.

**Next substory:** SP-128A — implement (backend): the availability-slots CRUD API.

**Implementation owner:** `implementer`, sequential (A → B).

**Final review:** one combined SP-128 review after both children are implemented.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-128A-availability-slots-api.md) | Ready | EP02 + EP03 complete (satisfied). No EP04 predecessor. | Implement (backend) | — |
| [B](./SP-128B-availability-settings-ui.md) | Needs refinement | SP-128A implemented (the API it manages). | `ui-refiner` pass (D404-9), then implement | — |

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

**Outcome: Draft** — SP-128A is `Ready`; SP-128B is `Needs refinement` pending the `ui-refiner` pass.

## Final implementation review unit

- **Parent:** SP-128 — `docs/stories/EP04/SP-128/`
- **In scope:** SP-128A, SP-128B
- **Integration/index owner:** SP-128B (writes `./artifacts/SP-128/implementation.md`)
- **Gate:** one combined SP-128 review after both children are implemented (`./artifacts/SP-128/review.md` + `walkthrough.md`).
