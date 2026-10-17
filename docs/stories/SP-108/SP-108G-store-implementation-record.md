# SP-108G: SP-108A implementation record + parent-index repoint

**Story ID:** SP-108G
**Parent:** [SP-108](./SP-108.md) (fix pass for the combined review)
**Milestone:** M1
**Layer / owner:** Documentation/artifacts, `implementer` (single writer —
implementation records are implementer-owned artifacts)
**Status:** Implemented — awaiting parent review (implementer, 2026-10-17) —
closes review finding **IR-003 (Should-fix)** in `artifacts/SP-108/review.md`
**Dependencies:** None (independent of SP-108E/F; placed last in the queue)
**Jira key:** Pending creation

## Summary and bounded scope

SP-108A (the app-wide store foundation) has only a progress `checkpoint.md`;
the reviewer and DoD auditor read `implementation.md`, and the parent index
currently resolves A's evidence to a progress artifact. Write
`docs/stories/SP-108/artifacts/SP-108A/implementation.md` (components/store
wiring summary, files changed, AC-by-AC status, test and gate evidence,
deviations, open items) and repoint the parent index child table row for A at
it. **Reconstruction only — strictly no new implementation evidence may be
invented**: every claim must come from the existing `checkpoint.md`, the git
history (commit `d164841` carries A's code), or the review's verified results.

Exclude: any application change, any change to `checkpoint.md` (it remains the
historical progress record), the review verdict itself, and IR-001/IR-002.

## Source requirements

Shared DoD item 9 ("API changes and migrations are documented" — here: the
manifest change + app-wide store wiring must have a final implementation
record); delivery-state artifact convention
(`<delivery-home>/artifacts/<story-id>/implementation.md`); review closure
condition for IR-003 (`artifacts/SP-108/review.md:108-118`: record exists with
AC-by-AC status and recorded test/gate evidence, and the parent index
references it).

## Acceptance criteria

1. `artifacts/SP-108A/implementation.md` exists with: store/typed-hooks/Provider
   wiring summary, the five-file changes table, AC1–AC4 status rows, the
   recorded verification evidence (145 tests / typecheck / lint — as recorded,
   explicitly not re-run), the harmless empty-reducer warning noted, and the
   A3 deviation (types exported from `store.ts`, imported by `hooks.ts` —
   review IR-008) recorded as a cosmetic contract deviation.
2. `artifacts/SP-108/implementation.md`'s child-inventory/table row for A points
   at `implementation.md` (not the checkpoint).
3. Any claim in the record that the review could not verify (e.g. the
   dev-server smoke skipped by reviewers/admin) is written as "per checkpoint;
   not re-run", never presented as fresh verification.

## Tests (obligations)

None — documentation-only. No test result may be newly claimed; the record
reproduces recorded evidence verbatim with attribution.

## Technical notes

- Evidence sources (inspected 2026-10-17): `artifacts/SP-108A/checkpoint.md`
  (AC table, 145-test/typecheck/lint evidence, files-changed table — that
  checkpoint is good evidence and becomes the record's source of truth),
  `git show --stat d164841`, and the review's SP-108A AC results
  (`artifacts/SP-108/review.md:126-135`).
- The parent index lives at `artifacts/SP-108/implementation.md`
  (`:45` currently cites `./artifacts/SP-108A/checkpoint.md`).
- Do not adjust the parent index's Git-scope block or D's diff-containment claim
  — those are IR-005 polish, deferred.

## Sizing

- **Outcome:** SP-108A has a final implementation record re-derivable from
  history, and the parent index points at it.
- **Time estimate:** 20–30 min (docs-only, single file + one index row edit;
  intentionally below the 30-min code-slice floor because it is pure
  reconstruction from existing evidence — flagged as such rather than padded).
- **Files:** `docs/stories/SP-108/artifacts/SP-108A/implementation.md` (new),
  `docs/stories/SP-108/artifacts/SP-108/implementation.md` (one row).
- **Start context:** this ticket; review IR-003 section
  (`artifacts/SP-108/review.md:108-118`);
  `artifacts/SP-108A/checkpoint.md`; `artifacts/SP-108/implementation.md`;
  the frontend skill's implementation-record expectations.
- **Verification:** parent-index row resolves to the new record; the record's
  every test/gate claim matches `checkpoint.md` or git history line for line;
  no tracked file outside `docs/stories/SP-108/artifacts/**` changes.
- **Dependencies / exclusions:** independent; excludes all code findings and
  polish items.

## Definition of Done

DoD 9 (documentation completeness for A); DoD 10 remains the parent re-review's
(the reviewer/AoD auditor re-reads the record). Evidence is the record itself;
no story-level checkpoint needed for a docs-only slice — note the write in the
queue's evidence cell.
