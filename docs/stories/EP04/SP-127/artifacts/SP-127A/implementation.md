# SP-127A implementation

## Summary
Implemented `GET /calendar/events` read model in a new `calendar` module.

## Changed paths
- apps/api/src/modules/calendar/calendar.module.ts
- apps/api/src/modules/calendar/calendar.controller.ts
- apps/api/src/modules/calendar/calendar.service.ts
- apps/api/src/modules/calendar/dto/list-calendar-events-query.dto.ts
- apps/api/src/modules/calendar/calendar.service.spec.ts (new, F1)
- apps/api/src/modules/calendar/calendar-data-scoping.spec.ts (new, F1)
- apps/api/src/modules/calendar/calendar-e2e.spec.ts
- apps/api/src/app.module.ts
- apps/api/src/test/test-http.ts

## AC outcomes
1. 200 with `{ timeZone, today, from, to, events }`, sorted — pass.
2. from/to inclusive; validation of shape/order/span/unknown params 400 — pass.
3. Active course meetings recur on matching weekday — pass.
4. Assignment deadlines converted to zone; typing + completed flag — pass.
5. StudySession events with focus — pass.
6. Availability/blocked slots bucketed — pass.
7. Archived course meetings excluded; deadlines included — pass.
8. timeZone from profile; today in zone — pass.
9. Ownership scoping; 401 unauthenticated — pass.
10. No foreign ids leaked — pass.

## Verification
- `pnpm --filter api typecheck` — pass
- `pnpm --filter api lint` — pass
- `DATABASE_URL=... npx jest calendar` — 12 unit + 2 data-scoping tests passed (reviewer-executed at `dbf51a0`; the combined `pnpm --filter api test -- calendar` also runs the e2e spec, which skips without `DATABASE_URL`).

## Findings/deviations
F1 (review) closed: added `calendar.service.spec.ts` (12 unit tests) and `calendar-data-scoping.spec.ts` (2 tests). Verification counts updated at pass 2.