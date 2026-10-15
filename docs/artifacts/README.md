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
    │   └── review.md                 # one combined formal implementation review
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
- **review.md:** the independent read-only reviewer's returned report, saved by
  the coordinating parent. Implementers never edit it. One final review covers
  the entire parent after all children and required integration work finish;
  see [review cadence](../../.agents/review-cadence.md). Explicit interim reports
  are preserved as historical records, not required for each child.
- **plan-review.md:** reviewer-owned whole-plan report, saved beside the plan by
  the parent. Planner corrections go in the README log, never in this report.
  Later reviewer passes replace the latest report; committed history remains.

Only the planner owns scope/dependency/decision changes. The implementer may
update the README execution fields/table and active child status/artifact pointers
as the narrow exception in delivery state. Refiners still write only their given
story; reviewers/auditors remain read-only. The coordinating parent records final
review outcome only from actual reviewer evidence.

## Migrated delivery homes

- [SP-105 — Password Reset](../stories/EP01/SP-105/README.md): A/B records moved to
  its `artifacts/` folder. Old A/B directories contain navigation only. Reviewer
  report bodies and historical path references remain unchanged.

Other existing directories here remain legacy records. A move preserves report
contents and repairs live links; it does not imply fresh implementation, tests,
review approval, or tracker synchronization.
