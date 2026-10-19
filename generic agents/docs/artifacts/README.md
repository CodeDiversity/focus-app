# Story records and legacy artifacts

Keep each feature's plan, execution queue and artifacts in one delivery folder.
Follow [delivery state](../../.agents/delivery-state.md); the parent README records
the canonical paths. This directory remains the index for unmigrated historical
records, not the default destination for new implementation artifacts.

## Canonical layout

```text
docs/stories/<epic>/<parent>/
├── README.md                         # active/next substory, execution queue
├── <parent>.md                       # coordination summary
├── <child>.md                        # one file per implementation slice
├── plan-review.md                    # latest complete-plan review
└── artifacts/
    ├── <parent-story-id>/
    │   ├── checkpoint.md
    │   ├── implementation.md         # final child/evidence index
    │   ├── review.md                 # one combined formal implementation review
    │   └── walkthrough.md            # reviewer code explanation + manual tests
    └── <child-story-id>/
        ├── checkpoint.md
        └── implementation.md
```

Use stable story IDs for new artifact folders; Jira identity stays in metadata.
Read the parent's recorded paths before creating anything. Unmigrated features
can explicitly retain `docs/artifacts/<existing-id>/` until an authorized move.
Do not duplicate records or rename directories just because a Jira key appears.

## Records and ownership

- **checkpoint.md:** implementer-owned progress and resume state. Follow
  [checkpoint execution](../../.agents/checkpoint-execution.md). Link back to the
  parent queue for task ordering; verify Git state when resuming in any agent.
- **implementation.md:** implementer-owned actual behavior, changes, commands,
  results and remaining obligations. Reuse the same file across layer changes
  and contexts. The parent record indexes every child and the combined Git scope.
- **review.md:** the independent reviewer's report, saved by the reviewer.
  Restricted runtimes use the reviewer skill's parent-persistence fallback.
  Implementers never edit it. One final review covers
  the entire parent after all children and required integration work finish;
  see [review cadence](../../.agents/review-cadence.md). Explicit interim reports
  are preserved as historical records, not required for each child.
- **plan-review.md:** reviewer-owned whole-plan report, saved beside the plan by
  the reviewer, with the same restricted-runtime fallback. Planner corrections
  go in the README log, never in this report.
  Later reviewer passes replace the latest report; committed history remains.
- **walkthrough.md:** reviewer-owned final user document saved beside the final
  implementation `review.md`, once per complete review unit. Explains the code,
  correctness evidence after all mandatory corrections, and manual test steps
  with expected results for each applicable workflow. Distinguishes executed
  evidence, unexecuted user instructions and justified non-applicable checks.
  Required before `Reviewed`/complete in both ordinary and autopilot reviews;
  plan-only reviews and static audits do not create it. The reviewer verifies
  and saves it before completion sync; the coordinator commits it and handles
  permitted verbatim fallback persistence. Regenerate for a changed final scope,
  preserving prior committed versions. See the
  [final walkthrough gate](../../.agents/skills/delivery-reviewer/SKILL.md#final-user-walkthrough).

The Jira-sync role may remove a completed story specification only under its
[prune gates](../../.agents/skills/delivery-jira-sync/SKILL.md), preserving this
folder, parent delivery READMEs, contracts, traceability and all artifacts. Its
[ledger](../jira-sync/README.md) retains identity, recovery pointers and tombstones.

Only the planner owns scope/dependency/decision changes. The implementer may
update the README execution fields/table and active child status/artifact pointers
as the narrow exception in delivery state. Refiners still write only their given
story; reviewers write only their report, final walkthrough and passing-verdict scoped sync; auditors write
nothing. Deferred persistence never grants another role broader write authority.
Record final review outcome only from actual independent reviewer evidence.
