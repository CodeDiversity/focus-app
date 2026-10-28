# SP-127 Breakdown — Weekly Academic Calendar

**Epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-127](./SP-127-calendar-read-model-and-week-view.md) — coordination record (not an implementation ticket)
**Milestone:** M2
**Status:** Draft — two children; SP-127A `Ready`, SP-127B `Needs refinement` (ui-refiner handoff, D404-9).
**Jira key:** Pending creation

Covers the epic's proposed stories **1 (weekly academic calendar), 2 (course meetings), 3 (assignments and exam deadlines), and 4 (planned study sessions)**.

## Execution queue

**Delivery home:** `docs/stories/EP04/SP-127/`

**Artifact root:** `./artifacts/` — `./artifacts/SP-127/` (parent index, review, walkthrough) and `./artifacts/SP-127A/`, `./artifacts/SP-127B/` (child records).

**Active substory:** None.

**Next substory:** SP-127B — ui-refiner pass (D404-9), then implement.

**Implementation owner:** `implementer`, sequential (A → B).

**Final review:** one combined SP-127 review after both children are implemented.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-127A-calendar-events-api.md) | Implemented — awaiting parent review | EP02 + EP03 complete (satisfied). No EP04 predecessor. | Parent review (after SP-127B) | ./artifacts/SP-127A/implementation.md |
| [B](./SP-127B-calendar-week-view.md) | Needs refinement | SP-127A implemented. | `ui-refiner` pass (D404-9), then implement | — |

## Why this is two children

The read model and the week view are one contract split across a layer boundary: SP-127A owns the event semantics (recurrence expansion, local-date bucketing, zone resolution, event typing), SP-127B owns the presentation. The payload is small enough that both fit the 1–3 request/token target, and each is independently verifiable: SP-127A through API tests on the payload, SP-127B through component tests on the rendering. Splitting further (e.g. one child per event type) would fragment a single contract across five files without producing an independently shippable outcome.

**Re-size before implementation** if the `ui-refiner` pass introduces a new interaction beyond the week view — for example an editable time grid, a drag-to-reschedule event editor, or a second calendar surface (month view). That is a split trigger. Layout, density, week-start, and copy inside the existing surface are not.

## Decision register

See the [EP04 README](../README.md#decision-register) (D404-1…D404-13). The decisions that bind this parent: D404-1 (one read model), D404-2 (server-side date math), D404-3 (profile time zone), D404-4 (wall-clock recurrence), D404-7 (archived-course meetings excluded), D404-8 (completed deadlines labelled, not hidden), D404-10 (plain-axios entity client), D404-13 (`focus` flag).

## Shared contract

`GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD` — the full request/response shape is in the [EP04 README](../README.md#shared-api-contract). SP-127A implements it; SP-127B consumes it field-by-field against its ACs; the combined review verifies it end to end.

## Source requirements and test traceability

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E04-01 | Students can view academic events by week. | A (range read), B (week view) |
| AC-E04-02 | Classes and deadlines display on their correct dates. | A (expansion + bucketing), B (rendering on the day) |
| AC-E04-03 | Scheduled study sessions appear after they are created. | A (session events), B (rendering) — creation is EP06/EP07's (D404-6) |
| AC-E04-06 | Events can be opened to view details. | B (details dialog) |
| AC-E04-07 | Calendar dates respect the student's selected time zone. | A (zone resolution), B (zone label) |
| AC-E04-08 | Different event types are identifiable without relying on color alone. | B (icon + text label per type) |

Shared DoD: see the [EP04 README](../README.md#requirement-and-test-traceability). DoD items 2, 3, 4, 9 are owned by SP-127A; items 1, 5, 6, 7, 8 are shared with SP-127B; items 10 and 11 belong to the combined parent review.

## Security invariants and counterexamples

See the [EP04 README](../README.md#security-invariants-and-counterexamples) — the calendar read model is principal-scoped and accepts no identifier parameters, so the invariants that matter here are (a) no cross-student rows and (b) no client-controlled zone. Owning tests: SP-127A.

## Plan correction log

(First plan of this parent. Implementation review findings are appended here with stable IDs and are never rewritten.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|

## Quality gate (2026-10-28)

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Two children, each ~2–3 requests/tokens with an inspected file footprint; the split is a layer boundary on one contract, not a layer label alone. |
| 2 | Original AC/TR coverage | Pass | AC-E04-01, -02, -03, -06, -07, -08 owned here; AC-E04-03's creation dependency on EP06/EP07 recorded (D404-6). |
| 3 | Applicable DoD, incl. item 10 | Pass | DoD map above; item 10 by the combined parent review. |
| 4 | Contract consistency and integration ownership | Pass | One shared contract in the EP04 README; A implements, B consumes, the parent review verifies. |
| 5 | Code paths inspected | Pass | Baseline in the EP04 README (schema, ownership helpers, validation pipe, calendar-date precedent, test harness, web entity-client pattern, design references). |
| 6 | Feature-specific risks/counterexamples | Pass | Recurrence/DST (D404-4), zone resolution (D404-3), week-range boundaries and the 31-day cap (SP-127A), ownership invariants. |
| 7 | Dependencies and sequencing | Pass | SP-127A → SP-127B; no EP04 predecessor; EP02/EP03 satisfied. |
| 8 | Material decisions | Blocked | D404-9 — the week view's layout, states, and copy are for `ui-refiner`. |
| 9 | Correction log | Pass | Empty — first plan of this parent. |
| 10 | Jira identity/sync | Not applicable | No sync authorized; keys remain `Pending creation`. |

**Outcome: Draft** — SP-127A is `Ready`; SP-127B is `Needs refinement` pending the `ui-refiner` pass.

## Final implementation review unit

- **Parent:** SP-127 — `docs/stories/EP04/SP-127/`
- **In scope:** SP-127A, SP-127B
- **Integration/index owner:** SP-127B (writes `./artifacts/SP-127/implementation.md`)
- **Gate:** one combined SP-127 review after both children are implemented (`./artifacts/SP-127/review.md` + `walkthrough.md`).
