# EP08A implementation record

**Story:** [EP08A-missed-sessions-and-recovery-summary-read-api.md](../../EP08A-missed-sessions-and-recovery-summary-read-api.md)
**Implemented:** 2026-10-31 (single implementer pass; backend read-side + additive migration)
**Baseline HEAD before changes:** `53de89cc68b3b19d365156ddff6ad0dd81772344`
**Parent:** EP08 breakdown; combined EP08 parent review after all six children.
**Scope:** missed-session identification query, `GET /study-plans/recovery-summary`, additive `locked` migration. EP08B–EP08F were **not** started.

## Changed paths

Production:
- `apps/api/prisma/schema.prisma` — `PlannedSession.locked Boolean @default(false)` (PR-001, owned here).
- `apps/api/prisma/migrations/20261031120000_planned_session_locked/migration.sql` (**new**) — additive `locked` column, default false, rollback = drop column.
- `apps/api/src/modules/study-plans/study-plans.service.ts` — exported `MissedSession` and `RecoverySummary` types; added `getRecoverySummary(userId)` (missed-session query with civil-date bound, SCHEDULED + unfinished-assignment filter, projection including `locked`; reuses `getRemainingWork` for unfinished work and confirmed-minutes total).
- `apps/api/src/modules/study-plans/study-plan.controller.ts` — registered `GET /study-plans/recovery-summary`.

Docs:
- `docs/stories/EP08/artifacts/EP08A/checkpoint.md`
- `docs/stories/EP08/artifacts/EP08A/implementation.md` (this file)
- `docs/stories/EP08/EP08A-missed-sessions-and-recovery-summary-read-api.md` — Status → Implemented — awaiting parent review
- `docs/stories/EP08/README.md` — queue row EP08A, active/next substory, evidence links

No writes to `StudySession`, `Assignment`, `Task` or `PlannedSession` data beyond the additive migration. No UI changes.

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 `GET /study-plans/recovery-summary` returns 200 `RecoverySummary` for the authenticated student | **PASS.** Route registered; service implemented. | typecheck/build green |
| 2 Missed-session iff civil date < today bound, status SCHEDULED, assignment PENDING/IN_PROGRESS | **PASS.** Query uses `studyPlan.date: { lt: bound }` with `bound = new Date(`${toCivilDate(new Date(), timeZone)}T00:00:00.000Z`)`; status and assignment filters as specified. | service code |
| 3 Completed-assignment planned sessions never included | **PASS.** `assignment: { status: { in: ['PENDING', 'IN_PROGRESS'] } }`. | service code |
| 4 `unfinishedWork` reuses EP06 classification + ordering | **PASS.** Delegates to `getRemainingWork`, which uses `classifyAssignments` + `compareAssignments`. | service code |
| 5 `confirmedMinutes` total from session log; per-assignment stays State A (0) | **PASS.** Top-level uses `unattributedConfirmedMinutes` (sum of `StudySession.durationMinutes`); `RemainingWorkItem.confirmedMinutes` unchanged (State A). | service code |
| 6 Neutral, non-blaming `message` | **PASS.** Placeholder "Here's where your plan stands. You can create a catch-up plan whenever you're ready." contains no shaming terms. | service code |
| 7 Ownership-scoped; uniform 404 | **PASS.** User lookup with `{ id: userId }` throws `NotFoundException(RESOURCE_NOT_FOUND)`; planned-session query scoped via `studyPlan: { userId }`. | service code |
| 8 Read-only (no data writes) | **PASS.** Only `findUnique`/`findMany`; migration is the only schema/data change. | service code |
| 9 Empty result returns 200 with empty arrays and `missedCount: 0` | **PASS.** `findMany` returns `[]`; `missedCount` derived from length; `getRemainingWork` returns empty items for no assignments. | service code |

## Verification

Working directory: `/Users/michaelrobert/Desktop/focus-app`

- `npm run typecheck --workspace=apps/api` — exit 0.
- `npm run lint --workspace=apps/api` — exit 0, 0 warnings.
- `npm run test --workspace=apps/api` (study-plans service spec) — 1 suite / 27 tests passed.
- `npm run build --workspace=apps/api` — exit 0.
- Migration applied locally via `prisma migrate deploy`; `prisma generate` succeeded; DB schema up to date.

Not run: integration (DB) e2e for the new endpoint; TR-E08-01/02 data-scoping proof remains for the combined EP08 review. No browser/UI work (backend only).

## Findings and deviations

- **F-A-1 (none):** No deviations from the shared contract. `formatToday` no longer exists after EP12A consolidation; used `toCivilDate(new Date(), timeZone)` per EP06's current convention, which is the EP12A replacement and matches the contract's intent (civil date string, no zone conversion).
- **F-A-2 (migration naming):** Migration timestamp `20261031120000` chosen after the last applied migration `20261030211833`; applied successfully.
- **F-A-3 (deferred):** Per-assignment `confirmedMinutes` remains State A (always 0) until the cross-epic State-B upgrade (V-08-5); only the total is delivered, per PR-003.

## Status

Implemented — awaiting parent review.