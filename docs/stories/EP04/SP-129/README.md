# SP-129 Breakdown — Mobile Agenda View

**Epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-129](./SP-129-mobile-agenda-view.md) — coordination record (not an implementation ticket)
**Milestone:** M2
**Status:** Implemented — SP-129A reviewed and passed (2026-10-29); parent DoD 10–11 satisfied.
**Jira key:** Pending creation

Covers the epic's proposed story **6 (build the mobile agenda view)**.

## Execution queue

**Delivery home:** `docs/stories/EP04/SP-129/`

**Artifact root:** `./artifacts/` — `./artifacts/SP-129/` (parent index, review, walkthrough) and `./artifacts/SP-129A/`.

**Active substory:** None.

**Next substory:** None — SP-129A fix pass complete and the combined SP-129 parent review passed (2026-10-29); DoD 10–11 satisfied. No child is auto-started. Downstream EP05 work is planner-owned.

**Implementation owner:** `implementer`.

**Final review:** one combined SP-129 review after the child is implemented (first pass: Changes Required 2026-10-28 → fix pass 2026-10-29 → re-review).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-129A-mobile-agenda-view.md) | Reviewed (2026-10-29) | SP-127B implemented (the event data and shared event components it reuses). | None — parent review passed; no further action on this child. | [checkpoint](./artifacts/SP-129A/checkpoint.md) · [implementation record](./artifacts/SP-129A/implementation.md) · [fix-pass details](./artifacts/SP-129A/implementation.md#fix-pass-2026-10-29--sp-129-parent-review-findings) · code `afd48ec` + fix `91ba4dc` · [review (pass 2, Pass)](./artifacts/SP-129/review.md) · [walkthrough](./artifacts/SP-129/walkthrough.md) |

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
| R129-001 | 2026-10-28 (pass 1) | Should-fix | `SP-129A-mobile-agenda-view.md` D129A-03 (time-above-title) + `artifacts/SP-129A/checkpoint.md:20,32` | Agenda entries rendered the time below the title even though D129A-03 places it above; the checkpoint claimed compliance. | `CalendarEventChip` gained `layout?: 'week' \| 'agenda'` (default `'week'`); `CalendarAgenda` passes `layout="agenda"` so the time line renders above the title; week layout unchanged. | Inspection: `CalendarEventChip.tsx:12,49,75–79`, `CalendarAgenda.tsx:40–44`; order-assertion tests in `CalendarAgenda.test.tsx`. Recorded gates: scoped vitest 26/26, full suite 773/773. | Resolved — 2026-10-29 (`91ba4dc`) |
| R129-002 | 2026-10-28 (pass 1) | Should-fix | `SP-129A-mobile-agenda-view.md` tests-to-add + AC 7 + DoD 8 | No test covered the wholly-empty agenda case (component test only omitted empty days). | Added empty-map `CalendarAgenda` test and a narrow-viewport empty-payload page test (D129A-05 behaviour). | Inspection: `CalendarAgenda.test.tsx` "an entirely empty payload…"; `CalendarPage.test.tsx` "an empty week at a narrow viewport…". Recorded gates: scoped vitest 26/26. | Resolved — 2026-10-29 (`91ba4dc`) |
| R129-003 | 2026-10-28 (pass 1) | Should-fix (verification gate) | DoD 6/7/10; `SP-129A` DoD 7; `calendar.spec.ts` phone test | Required integrated/keyboard/responsive evidence incomplete; tablet/desktop only mocked. | Extended the 375×667 e2e: real `boundingBox()` height ≥ 44px, Enter-open + Escape + focus return, live 768×1024→1280×720 resize to the week grid; desktop `Week view` assertion in the seeded test. | Recorded: Playwright `calendar.spec.ts` 5/5 (7.3s), self-contained throwaway DB; unit tests for live resize. Reviewer did not independently execute (no shell/browser tool). | Resolved — 2026-10-29 (`91ba4dc`) |
| R129-004 | 2026-10-28 (pass 1) | Should-fix | `SP-129A-mobile-agenda-view.md:9` Status line | Completed child ticket still said "Ready — ui-refined … Ready to implement." | Scoped status edit to `Implemented — awaiting the SP-129 parent review (2026-10-29 fix pass…)`. | Inspection: story file :9; queue row reconciled. | Resolved — 2026-10-29 (`291f892`) |
| R129-005 | 2026-10-28 (pass 1) | Polish | `CalendarPage.test.tsx:23–28` matchMedia mock | Mock stored the event type instead of the listener, so post-mount resize could not be tested. | Mock signature now `(type, callback)`; added an `act`-wrapped live-resize page test. | Inspection: `CalendarPage.test.tsx:23–28` + new test. Recorded: scoped vitest 26/26. | Resolved — 2026-10-29 (`91ba4dc`) |
| R129-006 | 2026-10-29 (pass 3) | Should-fix (docs) | `SP-129A-mobile-agenda-view.md:9` child status line | After the passing final parent review (pass 2) the child ticket still read `Implemented — awaiting the SP-129 parent review`, a stale completion status; queue row had already advanced to `Reviewed`. | Scoped status edit to `Reviewed (2026-10-29) — combined SP-129 parent review passed (pass 3…)`. No AC/decision/plan content changed. | Inspection: story file :9; queue row reconciled (`Reviewed`). | Resolved — 2026-10-29 (this pass) |

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
