# SP-124 parent correction checkpoint — post-review fixes

**Parent:** [SP-124](../../SP-124-assignment-list-cohesion.md)
**Queue:** [README](../../README.md#execution-queue)
**Review under correction:** [review.md](./review.md) (pass 1, Changes Required)
**Status:** Complete — all six findings corrected and verified; awaiting combined parent re-review
**Started / finished:** 2026-10-26
**Writer:** implementer (single frontend owner)

## Progress

- [x] R-124-001 latest-callback refetch + stale-response guard
- [x] R-124-002 empty-state create focus fallback
- [x] R-124-003 mobile 44 px create controls
- [x] R-124-004 expanded-id identity reset
- [x] R-124-005 list-host create-error test
- [x] R-124-006 integrated browser evidence (self-contained Playwright run)
- [x] Focused/full tests, typecheck, lint
- [x] Implementation records, parent index, queue reconcile, commit

## Findings addressed

Stable reviewer IDs retained. Full dispositions and closure evidence are in
[implementation.md](./implementation.md).

| ID | Owner | State |
|---|---|---|
| R-124-001 | implementer | Closed — latest-callback refs + monotonic request guard + regression tests |
| R-124-002 | implementer | Closed — post-refetch focus moves to the stable Add control |
| R-124-003 | implementer | Closed — scoped `max-sm:min-h-[44px]` on create entry/controls + tests + measured 44 px |
| R-124-004 | implementer | Closed — identity reset implemented; same-array retention and new-array reset tested |
| R-124-005 | implementer | Closed — list-host create-failure test added |
| R-124-006 | implementer | Closed — 4 real-stack Playwright journeys executed (Chromium/API/DB) |

## Deviations from the reviewer's suggested correction

- **R-124-004 test supersession.** The moved course-section test previously
  asserted that expanded rows survive a new `items` array. That assertion
  contradicted D124-5; it was rewritten to prove reset on a new array and
  retention on the same array. This is a test correction to the agreed contract,
  not a contract change.
- **R-124-006 environment.** The evidence uses the repo's self-contained
  Playwright mode (throwaway `studypilot_e2e_test` database, test API `:4100`,
  test Vite `:3100`) rather than a developer stack. It never reads or prints
  secrets; the spec loads API env programmatically.

## Next action

Coordinator/reviewer: request one independent combined SP-124 parent re-review
of the correction commit and the integrated evidence, retaining R-124-001…006
IDs. Implementer does not self-approve; `Reviewed` remains reviewer-owned.
