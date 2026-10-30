# EP07B implementation

## Scope

Backend completion, confirmed-time log and read APIs for EP07.

## Changes

- `apps/api/src/modules/study-sessions/dto/finish-study-session.dto.ts` (new): `FinishStudySessionDto` with `confirmedMinutes?` (int, 0–1440, optional).
- `apps/api/src/modules/study-sessions/dto/list-study-sessions-query.dto.ts` (new): `ListStudySessionsQueryDto` with `assignmentId?`, `from?`, `to?`, `limit?` (1–100), `offset?` (≥0).
- `apps/api/src/modules/study-sessions/study-sessions.service.ts`: added `finish`, `list`, `confirmedTime`; reused `toStudySessionResponse` and `dtoErrors`.
- `apps/api/src/modules/study-sessions/study-sessions.controller.ts`: added `POST :id/finish`, `GET confirmed-time`, `GET` (history); literal routes declared before parameterised siblings.

## Behavior

- Finish: status-guarded transition ACTIVE/PAUSED → COMPLETED; adds running segment for ACTIVE; confirmed = client value or `round(elapsedSeconds/60)`; 409 on completed/invalid; 404 uniform on missing/foreign; 400 field-level errors on invalid body. No assignment/task read or write.
- History: completed sessions only, `startTime` desc then `id` desc, filters by `assignmentId`/`from`/`to`, paging `limit`/`offset`, returns `{ items, total }`. Ownership-gates `assignmentId` first.
- Confirmed time: unfiltered groups completed sessions by `assignmentId`, sums `durationMinutes`, counts rows, sorted by `assignmentId` asc; filtered returns single entry including `0`/`0`.

## Verification

- `pnpm --filter api test -- study-sessions` — 3 suites, 32 tests passed.
- `pnpm --filter api typecheck` — passed.
- `pnpm --filter api lint` — passed.
- Manual integration checks: finish/double-finish/invalid bounds/unknown fields, active segment addition, paused no-add, list filters/paging/unknown params 400, confirmed-time aggregation and 0/0, foreign assignmentId 404, date filters.
- Pre-existing `study-plans-e2e.spec.ts` failure unrelated; not chased.

## Commit

See scoped commit hash below.