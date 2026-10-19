# <parent-id> — <feature>

Source epic: <actual epic path>
Status: Draft
Delivery home: <actual folder>
Artifact root: <delivery-home>/artifacts
Parent artifacts: <artifact-root>/<parent-id>
Active substory: None — initialization
Next substory: <exact ID and action, or None with reason>

## Execution queue

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
| --- | --- | --- | --- | --- |
| <ID and story path> | Queued | <prerequisite evidence> | <one action> | <resolved paths> |

Allowed states: Queued, Needs refinement, Ready, In progress, Blocked,
Implemented — awaiting parent review, Reviewed. At most one active child; exactly
one next actionable ID/action or None with a reason. Follow dependencies and
actual evidence, not ID order alone. A missing record is unverified.

## Breakdown and sizing

| Child / layer | Observable outcome | Estimate / footprint | Order / dependencies | Tracker |
| --- | --- | --- | --- | --- |
| <ID / applicable layer> | <substantive independent outcome> | <inspected scope> | <verified prerequisites> | <verified key or Not configured> |

<Explain each split's concrete complexity/risk/context reason. Keep routine tests,
README/status/evidence and ordinary integration verification with their owner.>

## Original requirement and test traceability

| Original AC/TR | Source wording / reference | Owning child | Test / evidence obligation |
| --- | --- | --- | --- |
| <stable ID> | <preserved original requirement> | <child IDs> | <specific obligation> |

## Shared contracts

<Canonical interface/data/error/authorization contracts with stable section
headings. Distinguish verified existing behavior from proposals.>

## Decisions

| Date | Question | Decision / provenance | Affected scope |
| --- | --- | --- | --- |
| <date> | <material question> | <actual settled answer/source> | <IDs> |

## Plan correction log

| Finding ID / date / severity | Original claim, location and consequence | Correction / paths | Verification / disposition |
| --- | --- | --- | --- |
| <stable finding ID> | <preserved original finding> | <actual correction> | <evidence; awaiting re-review where applicable> |

<Preserve history. Planner fixes do not close independent reviewer findings.>

## Quality gate

| Check | Pass / Blocked / Not applicable | Evidence / reason |
| --- | --- | --- |
| Meaningful child sizing and atomic invariants | <state> | <paths/sections> |
| Original AC/TR coverage | <state> | <mapping> |
| Applicable DoD coverage | <state> | <obligations, not invented results> |
| Contract consistency and integration ownership | <state> | <references> |
| Actual code inspection | <state> | <verified and unverified paths> |
| Applicable risks/counterexamples and tests | <state> | <mechanisms and owners> |
| Dependency sequencing | <state> | <evidence> |
| Material decisions | <state> | <settled or blocked> |
| Correction history and verification | <state> | <log/report> |
| Jira identity/sync, only when configured | <state> | <ledger or concrete N/A reason> |

Planning judgment: <Draft / Needs Decision / Plan Ready; separate implementation
blockers. A planner's assessment is not independent approval.>

## Final review unit

- Parent and all descendants: <complete inventory>
- Integration/index owner: <named substantive child and obligations>
- Combined Git scope: <baseline before first included change, all child commits,
  final commit or explicit working-tree paths; implementation index owns detail>
- Gate: every child and integration obligation implemented, required evidence
  saved, closeout/status/commits reconciled; then independent whole-parent review.
- Final records: <resolved implementation.md, review.md and walkthrough.md paths>
- Completion: passing final review plus both saved/verified final documents;
  mandatory CANNOT VERIFY conditions remain blockers.

## Autopilot

<Initialize only during an explicit autopilot request; this links to the queue
and evidence, never a second execution queue.>

- Scope and entry: <authorized parent/descendants, entry hint and explicit limits>
- Coordinator: <workspace/branch, run identity and original Git baseline>
- Stage: <reconcile / plan / plan review / refine / implement / integration /
  parent review / fix / walkthrough / blocked / complete>
- Active dispatch: <unique task, role, bounded assignment, pending/running/
  returned/not started and evidence pointer, or None>
- Last result / retry state: <evidence, finding IDs, actual progress and consecutive
  correction cycles without progress>
- Resume: <exact next action/blocker, required input and owner>
