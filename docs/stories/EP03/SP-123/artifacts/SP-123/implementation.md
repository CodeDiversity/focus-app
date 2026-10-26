# SP-123 implementation index

**Parent:** [SP-123 — Overdue & Completed Assignment Views](../SP-123-overdue-and-completed-assignment-views.md)
**Role:** implementer (integration/index owner). **Date:** 2026-10-26.
**Baseline before first included change:** `3c48619`.
**Status:** implementation complete — awaiting parent review.

## Children

| Child | Status | Record | Checkpoint |
|---|---|---|---|
| SP-123A | Implemented — awaiting parent review | `../SP-123A/implementation.md` | `../SP-123A/checkpoint.md` |
| SP-123B | Implemented — awaiting parent review | `../SP-123B/implementation.md` | `../SP-123B/checkpoint.md` |

## Combined scope

- **SP-123A:** shared `isOverdueAssignment` predicate; red "Overdue" pill on the
  due-date line in `AssignmentsSection` and `AssignmentsPage`; shared
  `OVERDUE_STYLE` / `OVERDUE_LABEL`.
- **SP-123B:** show-completed disclosure on the course page; finished-row
  rendering; empty-state variants; identity-reset of `showCompleted`.

## Verification (latest)

- `pnpm --filter @studypilot/web typecheck` — exit 0 (last run at `97c5746`)
- `pnpm --filter @studypilot/web lint` — exit 0 (last run at `97c5746`)
- `pnpm --filter @studypilot/web test` — 49 files, 630/630 passed (last run at `97c5746`)
- Correction session (IR-001/002/003): component tests added; typecheck/lint/test not re-run in this session because no shell was available. Code changes are test-only plus doc links.

## DoD-10

Documented exception recorded in both child records (SP-123A inherited the
parent-level note; SP-123B records D123B-DoD10). Manual browser execution
remains not performed.

## Findings/deviations

Findings/deviations: IR-001 residual coverage closed (finished past-due + neutral
color assertions added on the list page); IR-002 closed; IR-003 corrected (counts
restated as 62 = 8 + 38 + 16). Execution of the new tests remains CANNOT VERIFY
(no shell in this session). IR-004 (optional) not addressed.

## Commit scope

Implementation commits: `6bb825fc235754a1a6eddca297883458a8391c21` (A) and the
B commit reported in closeout. Closeout doc commits follow. No unrelated files
staged; hooks not bypassed.