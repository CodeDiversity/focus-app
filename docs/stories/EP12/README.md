# EP12 Story Breakdown — Tech Debt Cleanup

**Epic:** [EP12: Tech Debt Cleanup](../../epics/EP12-tech-debt-cleanup.md) (Jira key: Pending creation)
**Milestone:** M5 (cross-cutting polish)
**Epic dependency:** Cross-cutting. EP12A depends on the shipped EP04/EP06 date utilities; EP12B depends on EP10B (shared `Dialog` primitive, reviewed); EP12C depends on the EP04/EP05 pages that consume the calendar/assignment endpoints. No new product behavior.
**Status:** EP12A, EP12B and EP12C implemented (2026-10-31); all children awaiting combined EP12 parent review.
**Jira keys:** Pending creation (no sync authorized for this planning task).

## Execution queue

**Delivery home:** `docs/stories/EP12/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per child: `./artifacts/EP12A/`, `./artifacts/EP12B/`, `./artifacts/EP12C/`.

**Active substory:** None

**Next substory:** None — all EP12 children implemented; combined EP12 parent review next.

**Implementation owner:** `implementer`, one sequential writer across all layers.

**Final review:** one combined review for the EP12 parent review unit after all three children are implemented.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP12A](./EP12A-consolidate-timezone-date-conversion.md) | Implemented — awaiting parent review | EP04/EP06 shipped (date utilities exist). D12A-1 settled (user approval): forward + reverse converters in scope. | None — combined EP12 parent review after EP12B/EP12C | [checkpoint](./artifacts/EP12A/checkpoint.md), [implementation](./artifacts/EP12A/implementation.md) |
| [EP12B](./EP12B-adopt-shared-dialog-primitive.md) | Implemented — awaiting parent review | EP10B shared `Dialog` primitive (reviewed). D12B-1/D12B-2 settled (user approval): `busy` prop approved; passive deltas accepted. | None — combined EP12 parent review after EP12C | [checkpoint](./artifacts/EP12B/checkpoint.md), [implementation](./artifacts/EP12B/implementation.md) |
| [EP12C](./EP12C-unify-web-api-clients.md) | Implemented — awaiting parent review | EP04/EP05 pages exist. D12C-1 settled (user approval): entity owns fetch, RTK delegates. | None — combined EP12 parent review after all children | [checkpoint](./artifacts/EP12C/checkpoint.md), [implementation](./artifacts/EP12C/implementation.md) |

Sequence: independent (backend EP12A can run in parallel in planning terms; implementation is sequential under one writer). Suggested order: EP12A → EP12B → EP12C.

## Stories

| Story | Epic proposed story | Layer | Jira |
|---|---|---|---|
| [EP12A](./EP12A-consolidate-timezone-date-conversion.md) | 1. Consolidate IANA/time-zone date conversion | Backend | Pending creation |
| [EP12B](./EP12B-adopt-shared-dialog-primitive.md) | 2. Adopt shared `Dialog` primitive across hand-rolled modals | Frontend | Pending creation |
| [EP12C](./EP12C-unify-web-api-clients.md) | 3. Unify web API clients per domain | Frontend | Pending creation |

## Requirement and test traceability

This epic has no upstream `AC-*`/`TR-*` IDs; the items below are the tech-debt candidates from the planning analysis.

| Item | Description | Owning child |
|---|---|---|
| TD-01 | Duplicated IANA time-zone date conversion in `calendar.service.ts` and `study-plans.service.ts` (forward + reverse directions, 2026-10-31 user-approved scope), consolidating into `apps/api/src/common/lib/civil-date.ts` / `calendar-date.ts`. | EP12A |
| TD-02 | 11 hand-rolled modal dialogs duplicating focus-trap/scroll-lock/Escape logic instead of using `shared/ui/Dialog` (refined from the planning estimate "~22"; the grep-verified in-scope count is 11, plus out-of-scope drawer/menus). | EP12B |
| TD-03 | Parallel `entities/` (axios) and `features/` (RTK Query) clients per domain duplicating endpoint contracts (verified for `GET /calendar/events` and `GET /assignments`). | EP12C |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Applicability |
|---|---|
| 1 functional criteria | All children (no behavior change) |
| 2 invalid-input validation | Not applicable — no new input |
| 3 student data scoping | EP12A (unchanged) |
| 4 actionable API errors | EP12C (unchanged) |
| 5 loading, empty, error states | EP12B (unchanged) |
| 6 keyboard accessibility | EP12B |
| 7 responsive layouts | Not applicable |
| 8 automated tests | All children (existing suite must stay green) |
| 9 API/migration documentation | Not applicable (no API/migration changes) |
| 10 integrated review | EP12 parent review unit (all three children) |
| 11 reviewer walkthrough | Reviewer, once for the EP12 parent review unit |

## UI/UX refinement callouts

- EP12A: backend-only → no ui-refiner pass.
- EP12B: refined 2026-10-31 — primitive adoption refactor only; no layout/copy changes beyond the approved EP10-alignment passive deltas (D12B-2: scroll-lock, close animation, `text-h3` title). No ui-refiner pass.
- EP12C: frontend, no UI changes (transport only) → no ui-refiner pass.

## Autopilot

```yaml
version: 1
execution:
  mode: step
  awaiting_continue: false
scope:
  parent: EP12
  descendants: [EP12A, EP12B, EP12C]
  entry: EP12C
  limits: enclosing parent review unit
stage: integration
coordinator:
  workspace: /Users/michaelrobert/Desktop/focus-app
  branch: main
  baseline: 6b28649
  head: f04ac4b
active_dispatch:
  name: EP12
  role: implementer
  status: returned
  pointer: docs/stories/EP12/README.md
  session: ""
  assignment: "Integration: prepare EP12 parent implementation index linking EP12A/B/C"
last_result:
  evidence: "EP12C implemented (2fd6264, f04ac4b). 1092 web tests pass; lint/typecheck/build clean. entityBaseQuery added; two slices delegate. All EP12 children implemented."
  findings: ""
  scope_note: "Step mode: one task per continuation. EP12C complete; combined parent review next."
  cycles: 0
  same_findings: unknown
gates:
  breakdown: true
  plan: pass
  ui: true
  refinement: true
  child_unfinished: false
  eligible_child_state: none
  closeout: false
  integration: true
  all_descendants_implemented: true
  review: unknown
  findings_owner: none
  open_findings: false
  walkthrough: unknown
  judged_at_head: "f04ac4b"
  queue_hash: ""
writer: none
session_live: unknown
blocker:
  kind: none
  owner: ""
  question: ""
  answer: ""
resume: "All children implemented; next step is combined EP12 parent review (parent_reviewer)."
judgment_attempts: 0
```