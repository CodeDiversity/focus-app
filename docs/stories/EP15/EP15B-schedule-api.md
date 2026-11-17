# EP15B — Schedule API: Day Bounds and Blocks

**Story ID:** EP15B
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Backend
**Status:** Queued
**Dependencies:** EP15A implemented (models + recurrence domain). Epic decisions D15-3, D15-5 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** a new `modules/schedule` with `GET/PUT /schedule/day-bounds`, `GET/POST/PATCH/DELETE /schedule/blocks`, `DELETE /schedule/blocks/:id?from=` and `DELETE /schedule/blocks/:id/occurrences/:date`, exactly as in contracts.md — including the server-side decision whether a weekly edit is in place or a split.
- **Why it improves it:** students can say "I work this Saturday" and "from next week my shift changes" (product, AC-E15-03/04); the client never decides split-vs-update, so the two-choice UI (D15-14) stays two choices (code).
- **Decisions needing you:** none ▲ — D-B1…D-B4 ratify by default (D15-17).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

The write surface for everything the student puts on the calendar. Every
route is student-scoped with the uniform 404; validation is declared on
DTOs for the global pipe and re-run in the service (repo precedent); the
cross-field and merged-value rules live in the service.

## Scope

**In:** the routes and rules in [contracts.md § API](./contracts.md#api-ep15b-all-routes-behind-the-global-jwt-guard-userid-from-the-principal-unknown-body-fields-400); DTOs; service; module wiring in `app.module.ts`; gated E2E + unit specs; contracts.md kept in sync.
**Out:** the calendar read model (EP15D), any UI, the old `/availability-slots` module (untouched until EP15I).

## Source requirement references

AC-E15-01 (API half), AC-E15-03, AC-E15-04, AC-E15-06 (fields), AC-E15-14; TR-E15-02; V-15-4; DoD-2, DoD-3, DoD-4, DoD-8, DoD-9.

## Acceptance criteria

1. `GET /schedule/day-bounds` returns seven entries with defaults filled and `configured`; `PUT` accepts exactly seven entries (one per weekday), validates each pair (`HH:mm`, `sleepTime` after `wakeTime`, `wakeTime < 24:00`, `sleepTime ≤ 24:00`), upserts all seven in one transaction and returns the stored set with `configured: true`; any failure writes nothing and returns field-level 400s.
2. `GET /schedule/blocks` lists the student's blocks (`weekdays` as an array) ordered `startDate`, `startTime`, `id`; `POST` creates with the field rules in contracts.md — `courseId`/`energy` rejected on `BUSY` with `applies to study blocks only`; `endDate` without `weekdays` rejected; `courseId` not owned by the student → uniform 404 and no write.
3. `PATCH /schedule/blocks/:id` validates merged values, rejects `kind` and an empty body, and applies the in-place-or-split rule: one-off, no `effectiveFrom`, or `effectiveFrom ≤ startDate` → in place; otherwise one transaction ends the original the day before, creates the successor from the merged values, moves exceptions dated `≥ effectiveFrom`, and returns the successor; `effectiveFrom` on a one-off or after `endDate` → 400.
4. `DELETE /schedule/blocks/:id` with no `from`, a one-off, or `from ≤ startDate` deletes the block (exceptions cascade); otherwise sets `endDate := from − 1` and removes exceptions `≥ from`; `DELETE …/occurrences/:date` inserts the exception idempotently on a weekly block, deletes a one-off whose `startDate === date`, and returns 400 for a date that is not an occurrence.
5. Every route carries the principal's `userId`; foreign, missing and malformed ids (block, exception target, course) all produce the uniform 404 `Resource not found` with no write; unknown body fields and wrong-typed fields are field-level 400s under the strict pipe (EP14B policy).

## Tests (TR-E15-02)

- Day bounds: defaults when no rows; PUT with 6, 8 or a duplicated weekday → 400; invalid pair on one day → 400 and no row changed (transaction); happy path round-trip incl. `24:00`.
- Blocks POST matrix: each field's bad shape; STUDY-only fields on BUSY; `weekdays` empty array / out of range / duplicate; `endDate < startDate`; `endTime ≤ startTime`; title trimmed to null; foreign course 404.
- PATCH: in-place cases; split case asserting original `endDate`, successor fields, exception move, response = successor; `effectiveFrom` after `endDate` → 400; `kind` in body → 400; empty body → 400.
- DELETE: series delete cascades exceptions; `from` mid-series truncates; `from` past `endDate` → 204 no-op; occurrence cancel idempotent; cancel on one-off deletes; non-occurrence date → 400.
- Ownership matrix across all routes (data-scoping spec like `availability-data-scoping.spec.ts`).

## Technical notes

- **Inspected:** `modules/availability/availability.service.ts` (DTO re-validation via `validateSync`, `throwFieldErrors`, P2002/P2025 mapping, scoped `findFirst`/`deleteMany` + `assertAffected`), `availability.controller.ts` (`@CurrentUser()`, plain-string `:id`), `common/ownership/ownership.ts`, `main.ts` global pipe and EP14B's strict conversion, `calendar/dto/list-calendar-events-query.dto.ts` (strict `YYYY-MM-DD` validation pattern to reuse for `startDate`/`endDate`/`effectiveFrom`/`from`/`:date`).
- **Proposed:** `modules/schedule/{schedule.module,schedule.controller,schedule.service}.ts`, `dto/{put-day-bounds,create-schedule-block,update-schedule-block}.dto.ts`; `weekdays` array ↔ bitmask helpers from `domain/schedule`; transactions via `prisma.$transaction`.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-B1 | `kind` after create: (a) immutable (400); (b) mutable with STUDY-only fields cleared on → BUSY | **(a)** — the editor hides the toggle in edit mode (D15-14); a student who picked wrong deletes and re-adds in two taps | Proposed |
| D-B2 | Who decides split vs in place: (a) the server, from `effectiveFrom` vs `startDate`; the client always sends the clicked date for weekly blocks; (b) separate `/split` endpoint the client chooses | **(a)** — the UI's two choices map 1:1 to "send `effectiveFrom`" or "cancel the occurrence" | Proposed |
| D-B3 | Topology: (a) one `/schedule/*` module for bounds and blocks; (b) two modules | **(a)** — one owner for one surface | Proposed |
| D-B4 | Day-bounds writes: (a) `PUT` replaces all seven; (b) `PATCH /schedule/day-bounds/:dayOfWeek` | **(a)** — the UI saves the whole sheet at once; one request, one transaction | Proposed |

## Definition of Done

1, 2 (DTO + service), 3 (every query scoped), 4 (field-level messages name the field and rule), 8 (TR-E15-02), 9 (contracts.md). 5/6/7 N/A (no UI). 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** the student's bounds and blocks can be created, changed from a date, trimmed and cancelled per occurrence, safely.
- **Actual at closeout:** tbd.
- **Files:** `apps/api/src/modules/schedule/**` (new), `apps/api/src/app.module.ts`, `apps/api/src/modules/schedule/{schedule.service.spec,schedule-e2e.spec,schedule-data-scoping.spec}.ts` (new), `docs/stories/EP15/contracts.md`.
- **Start context:** this story; contracts.md § API; `availability.service.ts` + its specs as the pattern; EP14B's validation policy.
- **Verification:** `pnpm --filter @studypilot/api test` (gated, `--runInBand`) green; the ownership matrix and the split transaction test pass.
- **Dependencies / exclusions:** EP15A. Read model → EP15D; UI → EP15F/EP15G.
