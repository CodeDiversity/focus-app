# EP04: Academic Calendar & Availability

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Dependencies:** EP02 and EP03. Study-session display integrates with EP06.

## Epic Summary

Implement a unified calendar for classes, assignments, study sessions, and available study time.

## Description

As a student, I want to see academic commitments on a calendar and specify when I can study so that I can make realistic decisions about my workload.

## Scope

- Weekly calendar
- Mobile agenda view
- Course meeting events
- Assignment and exam deadlines
- Planned study-session events
- Recurring study availability
- Unavailable time blocks

## Acceptance Criteria

- Students can view academic events by week.
- Classes and deadlines display on their correct dates.
- Scheduled study sessions appear after they are created.
- Students can configure recurring study availability.
- Students can block unavailable times.
- Events can be opened to view details.
- Calendar dates respect the student's selected time zone.
- Different event types are identifiable without relying on color alone.

## Proposed Stories

1. Build the weekly academic calendar.
2. Display course meetings.
3. Display assignments and exam deadlines.
4. Display planned study sessions.
5. Implement study availability and unavailable blocks.
6. Build the mobile agenda view.

## Technical Notes

Create a normalized calendar-event representation for the frontend. Keep recurring availability separate from actual planned study sessions. Handle time zones and daylight saving transitions.
