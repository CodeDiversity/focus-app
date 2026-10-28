# SP-127B implementation

## Summary
Implemented the `/calendar` week view consuming `GET /calendar/events`, with week
navigation, event chips, details dialog, loading/empty/error states, live region,
time-zone label, keyboard accessibility, and responsive layout.

## Changed paths
- apps/web/src/entities/calendar/model/types.ts (new)
- apps/web/src/entities/calendar/api/calendarApi.ts (new)
- apps/web/src/entities/calendar/api/calendarApi.test.ts (new)
- apps/web/src/features/calendar/ui/CalendarEventChip.tsx (new)
- apps/web/src/features/calendar/ui/CalendarEventChip.test.tsx (new)
- apps/web/src/features/calendar/ui/CalendarEventDetails.tsx (new)
- apps/web/src/features/calendar/ui/CalendarEventDetails.test.tsx (new)
- apps/web/src/features/calendar/ui/WeekView.tsx (new)
- apps/web/src/pages/calendar/ui/CalendarPage.tsx (new)
- apps/web/src/pages/calendar/ui/CalendarPage.test.tsx (new)
- apps/web/src/app/App.tsx
- apps/web/src/widgets/header/ui/Header.tsx
- apps/web/e2e/calendar.spec.ts (new)

## AC outcomes
1. Renders selected week; prev/next/today move week and results follow — pass (tests).
2. Every event renders as one chip on correct local day with time and title — pass.
3. Each type identifiable without color (icon + text label); details repeats type — pass.
4. Chip opens details dialog with type, title, date, time, course; deadline shows completed state; course link to /courses/:id — pass.
5. Dialog closes on Escape and returns focus to chip — pass.
6. Page shows payload time zone and header states week displayed — pass.
7. Loading, empty, error-with-retry states — pass.
8. Always-present role="status" live region announces week and count — pass.
9. Keyboard-operable week nav, chips, dialog with visible focus and accessible names — pass.
10. Responsive 375px–desktop (horizontal scroll day columns) — pass (layout classes).

## Verification
- `pnpm --filter web typecheck` — pass
- `pnpm --filter web lint` — pass
- `pnpm --filter web test -- src/pages/calendar src/features/calendar src/entities/calendar` — 15 passed

## Findings/deviations
None.