# Delivery queue and colocated artifacts

All roles use the parent story folder as the delivery home. Read its README's
**Execution queue** before choosing work or resolving artifact paths. This is
the current execution record; old planning gates and historical reviews are not
the queue. Verify claims against code, Git and implementation evidence on resume.

## One home per feature

```text
docs/stories/<epic>/<parent>/
  README.md                  # execution queue, decisions, traceability
  <parent>.md                # parent coordination summary
  <child>.md                 # one file per substory
  plan-review.md             # latest whole-plan review
  artifacts/
    <parent-story-id>/        # parent checkpoint, final implementation index/review
    <child-story-id>/         # child checkpoint and implementation record
```

Use stable story IDs for new artifact subdirectories; keep Jira keys in metadata,
not as a reason to rename files. The README records **Delivery home**, **Artifact
root**, **Parent artifacts**, **Active substory**, **Next substory**, and the queue.
Use actual paths from that record, not hardcoded `docs/artifacts/` paths. A
standalone story gets its own story folder with the same convention.

Existing unmigrated features may explicitly record a legacy artifact root. Reuse
that location until an authorized migration; never create a duplicate new record.
When migrating, move records, repair live links, and leave a legacy directory
README pointing to the new home. Preserve reviewer report contents and historical
claims verbatim; old paths quoted as evidence remain historical. Do not invent
new implementation/review evidence as part of organization.

If an older group has no queue/path record, hand initialization to the planner
before choosing its next task. Reconstruct progress from evidence; absence of
a new-format README never means all existing work should be started over.

## Execution queue contract

The README has one row per child, in intended sequential order:

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|

States: `Queued`, `Needs refinement`, `Ready`, `In progress`, `Blocked`,
`Implemented — awaiting parent review`, `Reviewed`.

- `Ready` means the story is refined/sized, decisions/contracts are settled and
  implementation prerequisites have evidence. Tests required to complete the
  story remain its responsibility; no child reviewer approval is required.
- `Needs refinement` can be the next actionable story, but is not ready to code.
- Set **Active substory** to at most one ID. **Next substory** names exactly one
  actionable ID and action (refine, implement, resume, or fix), or `None` with a
  reason (all blocked, complete, or final parent review next). If a task is active,
  name that task for resume rather than silently starting another writer.
- Dependencies must be met, not merely earlier alphabetically. An implemented
  child can unblock another without formal review. Keep feature-level release
  blockers distinct from blockers on the next child's actual implementation.
- Parent/group authorization lets the implementer select the first eligible row
  in documented order. A request for one child does not authorize every sibling.
  If the requested child is blocked, explain its blocker and the suggested next
  action rather than skipping the dependency or starting unauthorized work.
- If code/artifacts disagree with the queue, reconcile and record the evidence
  before proceeding. Missing evidence is unverified, not done. No new mandatory
  user approval is introduced for routine status reconciliation.

## Role-specific updates

- **Planner:** owns folder layout, queue initialization/order/dependencies, story
  breakdown and refinement readiness. Uses implementation evidence to reconcile
  existing progress; does not fabricate tests/reviewer sign-off.
- **Implementer:** owns code and artifacts. Narrow exception to its planning-doc
  restriction: update only the README's execution fields/table and active child's
  `Status`/artifact pointers at start, checkpoint handoff, completion, or blocker.
  Record evidence, recompute the next actionable row, and link to the checkpoint
  for unfinished progress. Do not change ACs, dependencies, decisions or planning
  review logs.
  Parent checkpoint task fields link back to this queue instead of becoming
  a competing task list. Coordinate handoff before transferring the single writer.
- **Jira sync:** owns sync identity, baselines, pending operations and tombstones
  in `docs/jira-sync/`. May reconcile scoped specifications/tracker metadata and
  repair navigation under its skill; cannot invent readiness, review or execution
  state. Explicit prune removes only eligible specifications after verified Jira
  preservation and the passing final review; retain delivery READMEs, queue rows,
  traceability, contracts and artifacts. Reopened imports return as drafts to the
  planner, never automatically as active implementation.
- **Refiner:** reads the queue, writes only the given unimplemented story, and
  returns its readiness/dependency result for planner/coordinator reconciliation.
  It cannot edit README, create artifacts or mark other stories ready.
- **Reviewer:** reads the queue and colocated evidence independently; never
  moves files. The review is read-only and its only own writes are the saved
  report plus, on a passing verdict, the reviewer skill's passing-review docs
  sync: finding/correction-log entries, verdict-dependent queue fields
  (including `Reviewed` after the passing final parent review) and a stale
  parent status line. Non-passing verdicts save the report only and defer
  those edits. One final combined parent review after every child and
  integration task is implemented; gaps are findings, not status edits.
- **DoD auditor:** reads queue and evidence and returns the audit; writes
  nothing.
- **Coordinating parent:** the reviewer saves its own report at the resolved
  path, using its skill's restricted-runtime fallback when needed; the parent
  reconciles queue/status edits the reviewer deferred on a
  non-passing verdict. Only a passing final parent review allows `Reviewed`;
  child self-checks never do.
