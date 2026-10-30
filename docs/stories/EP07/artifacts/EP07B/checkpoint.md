# EP07B checkpoint

Status: Implemented — awaiting parent review.

- Finish endpoint: `POST /study-sessions/:id/finish` (200) with optional `confirmedMinutes`.
- History: `GET /study-sessions` (completed only, filters, paging).
- Confirmed time: `GET /study-sessions/confirmed-time` (per-assignment aggregation).
- No schema change; reuses EP07A migration.
- Finish writes only `StudySession` fields (no assignment/task read or write).
- Tests: unit (16 existing + extended coverage via integration), data-scoping, e2e; typecheck and lint pass.