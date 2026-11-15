# Story records and legacy artifacts

Each feature keeps plan, queue and records in one delivery home; see
[delivery state](../../.agents/delivery-state.md) for the layout. This
directory is the index for unmigrated historical records only.

## Records and ownership

- **implementation.md** (implementer): completed behavior, AC-by-AC outcome, verification, findings. The only home for test counts. The parent record is the review index: inventory, per-child diff ranges, test commands, AC/TR/DoD ownership.
- **checkpoint.md** (implementer): only for multi-window or handed-off tasks; closed to a pointer at completion. See [checkpoint execution](../../.agents/checkpoint-execution.md).
- **review.md** (reviewer): one combined report per parent review unit, ending with **How to verify by hand**. Earlier passes live verbatim in `review-round-<n>.md`. See [review cadence](../../.agents/review-cadence.md).
- **plan-review.md** (reviewer): whole-plan report, only when a plan review was required.
- **history.md** (planner): correction log, quality-gate table, superseded decisions.
- **efficiency.md**: one row per dispatch ([measurement](../../.agents/context-efficiency.md)).

Historical `walkthrough.md` files (pre-2026-11-15) remain where they are; new
reviews put that content inside `review.md`. Labels follow
[ID conventions](../../.agents/id-conventions.md). `docs/jira-sync/` is a
read-only historical ledger.

## Migrated delivery homes

- [SP-105 — Password Reset](../stories/EP01/SP-105/README.md): A/B records moved to its `artifacts/` folder; old directories hold navigation only.

Other directories here are legacy records; a move preserves report contents
and repairs live links and implies no new verification or approval.
