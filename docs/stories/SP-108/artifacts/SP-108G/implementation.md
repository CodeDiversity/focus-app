# SP-108G — Implementation record: SP-108A implementation record + index repoint

**Story:** [SP-108G](../../SP-108G-store-implementation-record.md)
**Parent:** [SP-108](../../README.md) — review fix pass, closes **IR-003 (Should-fix)**
**Implementer:** `implementer`, 2026-10-17
**State:** Implementation complete — awaiting the combined SP-108 parent review.
IR-003 is closed by the reviewer/DoD auditor only; nothing here is self-approved.

## What changed

Documentation only. No application, test, config or manifest file changed.

| File | Change |
|---|---|
| `artifacts/SP-108A/implementation.md` | **New** — SP-108A's final implementation record (wiring summary, five-file changes table, AC1–AC4 status, recorded test/gate evidence, deviations, open items). Reconstructed strictly from `artifacts/SP-108A/checkpoint.md`, `git log`/`git show --stat` and the combined review's verified results. |
| `artifacts/SP-108/implementation.md` | Child-index row for A repointed from `./artifacts/SP-108A/checkpoint.md` to `./artifacts/SP-108A/implementation.md` (checkpoint kept as the progress record). Header/date, RQ-108-05 and RQ-108-06 rows refreshed to reflect the completed fix pass. |
| `artifacts/SP-108G/checkpoint.md` | **New** — this slice's progress record (the ticket's DoD note: no story-level checkpoint file was required, this satisfies it). |

`artifacts/SP-108A/checkpoint.md` was **not** modified — it remains the
historical progress record.

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|---|---|---|
| G1 | `artifacts/SP-108A/implementation.md` exists with the store/typed-hooks/Provider wiring summary, the five-file changes table, AC1–AC4 rows, the recorded verification evidence, the empty-reducer warning and the A3 deviation | PASS | The record's sections "Summary", "Files changed", "Acceptance criteria", "Verification evidence (recorded, not re-run)", "Deviations and notes" |
| G2 | The parent index's child row for A points at `implementation.md`, not the checkpoint | PASS | `artifacts/SP-108/implementation.md` child index, row A |
| G3 | Any claim the review could not verify is written as "per checkpoint; not re-run" | PASS | The record's evidence table marks the 145-test/typecheck/lint results "per checkpoint; **not re-run**", states the dev-server smoke was never performed for A (with its reason), labels later 166/178-test runs as later tree states, and marks the IR-001/IR-008 status as the reviewer's or SP-108E's to close |

## Reconstruction rules honoured

- **No new evidence invented.** Every test/gate line in A's record comes from
  `checkpoint.md` ("12 files, 145 tests … typecheck clean … lint clean"), the
  review's delegated run (166/166), or the fix-pass records (178/178), each
  attributed to its source and marked not re-run.
- **A4 is not self-certified.** The record states the wiring is confirmed, that
  the "behaves as before" clause was FAIL at review time (IR-001), that SP-108E
  addressed it, and that closure is the reviewer's.
- **IR-008 recorded, not fixed.** The A3 type-export deviation
  (`store.ts:19-20` exports the types; `hooks.ts` imports them) is written as a
  cosmetic contract deviation in the record, exactly as AC1 requires.

## Additional verified fact recorded (not a new claim of work)

`git log --diff-filter=A` shows A's `store.ts` and `store.test.tsx` were first
committed in `7439f8f` (SP-108C CP2) and A's `main.tsx` wiring in `57a8850`
(SP-108C CP4), because A's work was never committed at A's completion; `d164841`
captured the rest. This is Git-history evidence and explains the Git-scope
observation the review recorded as IR-005 (deferred polish, untouched here). The
index's "Combined Git scope" block was **not** edited — that is IR-005's scope.

## Verification

| Check | Result |
|---|---|
| Parent-index row for A resolves to the new record | ✅ confirmed in `artifacts/SP-108/implementation.md` |
| Every test/gate claim matches `checkpoint.md` or Git history | ✅ compared line by line while writing; the 145/166/178 figures each carry their source |
| Tracked files changed outside `docs/stories/SP-108/**` | ✅ none — `git status` shows only this story folder (plus another contributor's untouched `docs/stories/EP01/SP-105/**` working-tree changes) |
| Test/typecheck/lint | Not re-run: this slice changes no executable file, and its ticket forbids claiming new test evidence |

## Next

All three fix-pass children (E → F → G) are implemented. The combined SP-108
review is re-run by the independent read-only reviewer; only it closes
IR-001/IR-002/IR-003 and issues the verdict. No further implementer work is
authorized in this pass, and IR-004…IR-008 remain individually user-approved.