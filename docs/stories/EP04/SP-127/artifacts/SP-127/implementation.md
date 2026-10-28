# SP-127 implementation

## Summary
Parent index for the Weekly Academic Calendar. Both children are implemented:
- SP-127A (backend read model): `docs/stories/EP04/SP-127/artifacts/SP-127A/implementation.md`
- SP-127B (frontend week view): `docs/stories/EP04/SP-127/artifacts/SP-127B/implementation.md`

## Integration
SP-127B consumes the `GET /calendar/events` contract implemented by SP-127A
via the plain-axios `entities/calendar/api/calendarApi.ts` client (D404-10). The
shared contract (timeZone, today, from, to, events with CalendarEvent shape) is
honored field-by-field.

## Findings/deviations
None.