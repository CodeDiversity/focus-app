# Delivery state

Every feature has one delivery home. Read its README's **Execution queue**
before choosing work or resolving artifact paths; verify claims against code
and Git on resume.

```text
docs/stories/<epic>/<parent>/
  README.md        # at-a-glance, execution queue, AC/TR ownership, live decisions  (≤ 3,500 words)
  contracts.md     # shared data/API contracts, invariants, inspected code baseline (large epics)
  history.md       # plan correction log, quality-gate table, superseded decisions, plan-review history
  <child>.md       # one file per story
  plan-review.md   # latest plan review, when one was required
  artifacts/
    efficiency.md              # one row per dispatch
    <parent-id>/implementation.md, review.md, review-round-<n>.md
    <child-id>/implementation.md  (+ checkpoint.md only for multi-window tasks)
```

Use stable story IDs for directories. Older features may record a legacy
artifact root; reuse it, never duplicate.

## Execution queue contract

The README records **Delivery home**, **Artifact root**, **Active substory**
(at most one), **Next substory** (exactly one ID + action, or `None` + reason),
and one row per child in intended order:

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|

States: `Queued`, `Needs refinement`, `Ready`, `In progress`, `Blocked`,
`Implemented — awaiting parent review`, `Reviewed`.

- `Ready` = refined, sized, ▲ decisions ruled, prerequisites evidenced.
- Dependencies must actually be met; an implemented child can unblock another without review.
- Evidence cell = artifact links + one-line verdict (`green 2026-11-15; open: F-EP13I-01`). Nothing else.
- Code/artifacts disagreeing with the queue → reconcile and record before proceeding. Missing evidence is unverified, not done.
- A request for one child does not authorize siblings; a parent request lets the implementer take eligible rows in order.

## Who updates what

- **Planner:** layout, queue initialization/order/dependencies, contracts, decisions, `history.md`.
- **Refiner:** only its story file; returns readiness for the planner/session to record.
- **Implementer:** execution fields, its row, the active child's Status/artifact pointers; never ACs, dependencies or decisions.
- **Reviewer:** on a passing verdict only — `Reviewed` states, status line, `history.md` correction entries, report links; then commits. Non-passing: saves the report, nothing else.
- **Live session:** commits refiner output; reconciles deferred edits; runs `queue-lint`.
