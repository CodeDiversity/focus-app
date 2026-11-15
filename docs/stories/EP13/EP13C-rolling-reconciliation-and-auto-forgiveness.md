# EP13C — Rolling Reconciliation and Auto-Forgiveness

**Story ID:** EP13C
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend
**Status:** Implemented — awaiting parent review (2026-11-14; record `./artifacts/EP13C/implementation.md`)
**Dependencies:** EP13A + EP13B implemented. D13-2 provisional (V-13-2).
**Jira key:** Pending creation

## Summary

Missed sessions currently accumulate forever: nothing ever marks a past
`SCHEDULED` row, so the recovery summary grows into a shame ledger until the
assignment completes. This story makes forgiveness automatic and invisible: a
lazy, idempotent reconciliation flips past unstarted sessions to
`RESCHEDULED` whenever plans are read or written, their work flows forward
through EP13A's remaining-work math with no extra arithmetic, and a new
`GET /study-plans/today` endpoint returns today's reconciled sessions plus
the single recommended next session. The recovery summary becomes an
informational "plan health" payload reporting rolled-forward totals instead
of an accumulating missed list. No scheduled jobs (D13-8): reconciliation is
read-time only.

## Scope

**In scope:**
- Idempotent reconciliation (conditional `updateMany`): owned `SCHEDULED`
  rows with civil date < today and no linked completed study session →
  `RESCHEDULED`. Invoked at the start of plan read/preview/save, catch-up
  preview, recovery summary and the today read.
- `GET /study-plans/today`: today's sessions (all statuses) + `nextSession`
  (first unfinished by start time, ties by the EP06 ordering comparator) +
  the day's confirmed minutes.
- Recovery summary reshaped: `rolledForward` counts/minutes replace the
  unbounded `missedSessions` accumulation (last-7-days detail retained for
  the plan-health view); non-blaming message rule unchanged (D13-9).
- Tests (TR-E13-03).

**Out of scope:**
- UI (EP13D/EP13E). Flex-session rollover nuances (EP13G). Notifications.

## Source requirement references

- Epic AC-E13-04 (and AC-E13-05's data source). Shared DoD 1, 2, 3, 4, 8, 9.
- TR-E13-03. EP08 D08-5 (missed boundary), V-08-2 history.

## Acceptance criteria

1. After reconciliation, no owned `SCHEDULED` row has a civil date before
   today (profile zone; EP12A helpers; DST boundaries covered by tests).
   Locked past rows follow the V-13-2 ruling; until then they roll like
   others but keep `locked` (provisional).
2. Reconciliation is idempotent and concurrency-safe (conditional predicate;
   a racing second reconcile matches 0 rows) and never writes `StudySession`,
   `Assignment` or `Task`.
3. `GET /study-plans/today` returns the reconciled view and a deterministic
   `nextSession` (or null with a stated reason: nothing left today / no plan).
4. The recovery summary no longer accumulates: a session rolled forward
   yesterday does not reappear as missed today; totals are reported as
   rolled-forward work, not as a missed-session ledger.
5. A student returning after N days away gets a valid current plan from the
   normal plan read alone — no catch-up confirmation is required for the plan
   to be coherent (catch-up remains available as an optional regeneration).

## Tests (TR-E13-03)

- Rollover: past unstarted → RESCHEDULED; today/future untouched; linked-
  completed past rows untouched; locked handling pinned to the provisional
  rule; idempotence (second run = 0 writes); concurrency (conditional
  updateMany).
- History immutability: StudySession/Assignment rows byte-identical after
  reconcile.
- Civil-date boundary: profile-zone today, DST transition days, UTC vs
  non-UTC profiles.
- Today endpoint: shape, nextSession determinism, empty cases, ownership.
- Recovery summary: no re-accumulation across days; non-blaming copy intact.

## Technical notes

- **Inspected (2026-11-14):** EP08's missed-session definition (EP08 README,
  D08-5 — strictly-before-today civil boundary, reused verbatim);
  `study-plans.service.ts` recovery/catch-up methods; `civil-date.ts`
  helpers (EP12A).
- **Proposed:** one `reconcilePastSessions(userId)` service method; today
  endpoint in the study-plans controller. `RESCHEDULED` is reused — no enum
  migration (the EP06 enum anticipated it and no writer ever used it).
- The "no mandatory recovery screen" guarantee is structural: plan reads
  self-heal, so EP13E can demote the catch-up surface safely.

## Definition of Done

1. Functional criteria pass (AC-E13-04).
2. Invalid input: N/A beyond existing query validation (no new body inputs).
3. Student data scoping on every query (uniform 404 where applicable).
4. Actionable errors (today endpoint's null-reason contract).
5–7. N/A (backend only).
8. Automated tests (TR-E13-03).
9. Endpoint + reshaped recovery contract documented.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** falling behind is absorbed automatically; plans self-heal at read time.
- **Estimate:** 2–3 requests/tokens.
- **Model recommendation:** 4 — timezone boundaries, idempotence/concurrency, and the epic's forgiveness semantics live here.
- **Production files:** `apps/api/src/modules/study-plans/study-plans.service.ts`, `study-plan.controller.ts`.
- **Test files:** study-plans specs (extend); gated API spec for the today endpoint and rollover.
- **Minimal start context:** this story, EP13 README reconciliation contract, EP08 D08-5 definition, `civil-date.ts`, EP13A/B records.
- **Verification:** `pnpm --filter @studypilot/api test`, lint, typecheck.
- **Dependencies:** EP13A, EP13B. Blocks EP13D, EP13E.
- **Exclusions:** UI, flex rollover (EP13G), job-based scheduling (D13-8).

## Tracker reference

Jira key: Pending creation (no sync authorized).
