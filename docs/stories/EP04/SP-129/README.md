# SP-129 Breakdown — Mobile Agenda View

**Epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-129](./SP-129-mobile-agenda-view.md) — coordination record (not an implementation ticket)
**Milestone:** M2
**Status:** Implemented — SP-129A done, awaiting the combined SP-129 parent review.
**Jira key:** Pending creation

Covers the epic's proposed story **6 (build the mobile agenda view)**.

## Execution queue

**Delivery home:** `docs/stories/EP04/SP-129/`

**Artifact root:** `./artifacts/` — `./artifacts/SP-129/` (parent index, review, walkthrough) and `./artifacts/SP-129A/`.

**Active substory:** None.

**Next substory:** None — the parent's only child is implemented; the next unit is the combined SP-129 parent review (`artifacts/SP-129/implementation.md` prepared; reviewer writes `review.md` + `walkthrough.md`).

**Implementation owner:** `implementer`.

**Final review:** one combined SP-129 review after the child is implemented.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-129A-mobile-agenda-view.md) | Implemented — awaiting parent review | SP-127B implemented (the event data and shared event components it reuses). | Combined SP-129 parent review (`review.md` + `walkthrough.md`) | [checkpoint](./artifacts/SP-129A/checkpoint.md) · [implementation record](./artifacts/SP-129A/implementation.md) · code `afd48ec` |

## Why this is one child

The agenda view is a presentation of the calendar payload that SP-127B already produces and renders: the same events, the same week navigation, the same details dialog, re-laid-out as a vertical agenda. It has no separate contract, no backend work, and no data of its own. Splitting the payload work from the rendering would separate a child from the only data source it has. It stays one child.

**Re-size before implementation** if the `ui-refiner` pass reveals that the agenda needs its own filtering (e.g. "only classes today") or a per-day jump index — those would be new behavior with new contract questions, and a split trigger.

## Decision register

See the [EP04 README](../README.md#decision-register). The decisions that bind this parent: D404-2 (the server pre-buckets — no zone arithmetic in the client), D404-9 (the agenda's presentation is deliberately undecided), D404-10 (plain-axios entity client).

## Source requirements and test traceability

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E04-01 | Students can view academic events by week. | SP-129A (the agenda is a week view on a narrow screen) |
| AC-E04-08 | Different event types are identifiable without relying on color alone. | SP-129A (the agenda's type label) |

The other ACs are owned by SP-127 and SP-128; the agenda renders the same normalized events, so it inherits their data semantics and adds only presentation.

Shared DoD: see the [EP04 README](../README.md#requirement-and-test-traceability). Items 1, 5, 6, 7, 8 apply here; items 10–11 belong to the combined parent review.

## Security invariants and counterexamples

None new — the agenda reads the same principal-scoped payload as SP-127B and adds no request of its own.

## Plan correction log

(First plan of this parent. Implementation review findings are appended here with stable IDs and are never rewritten.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|

## Quality gate (2026-10-28)

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | One child (~1–2 requests/tokens): a presentation of an existing contract with no backend work and no data of its own. |
| 2 | Original AC/TR coverage | Pass | AC-E04-01 and AC-E04-08 owned here; the epic's other ACs stay with SP-127/SP-128; no TRs in the epic. |
| 3 | Applicable DoD, incl. item 10 | Pass | DoD map above; item 10 by the combined parent review. |
| 4 | Contract consistency and integration ownership | Pass | No new contract — SP-129A consumes SP-127A's payload through SP-127B's client. |
| 5 | Code paths inspected | Pass | Baseline in the EP04 README (web FSD layout, the Assignments/Courses design references, the entity-client pattern). |
| 6 | Feature-specific risks/counterexamples | Pass | Narrow-screen risks — horizontal overflow, tap-target size, and the day-grouping order — are owned by SP-129A's component and responsive tests. |
| 7 | Dependencies and sequencing | Pass | SP-127B implemented (satisfied by sequence); no EP04 predecessor beyond it. |
| 8 | Material decisions | Blocked | D404-9 — the agenda's presentation, grouping, and copy are for `ui-refiner`. |
| 9 | Correction log | Pass | Empty — first plan of this parent. |
| 10 | Jira identity/sync | Not applicable | No sync authorized; keys remain `Pending creation`. |

**Outcome: Draft** — SP-129A is `Needs refinement` pending the `ui-refiner` pass.

## Final implementation review unit

- **Parent:** SP-129 — `docs/stories/EP04/SP-129/`
- **In scope:** SP-129A
- **Integration/index owner:** SP-129A (writes `./artifacts/SP-129/implementation.md`)
- **Gate:** one combined SP-129 review after the child is implemented (`./artifacts/SP-129/review.md` + `walkthrough.md`).
