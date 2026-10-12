# SP-106: Student Profile and Preferences

**Story ID:** SP-106
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** Medium / P1
**Dependencies:** SP-104
**Jira key:** STUDY-11

## Summary

Let the student view and edit their profile and preferences, including the time zone that all calendar and deadline logic in later epics depends on.

## Description

As a student, I want to set my time zone and update my details so that dates and times display correctly and my settings persist across sessions.

## Acceptance Criteria

- `GET /users/me` returns the current student's profile and preferences, excluding credential fields.
- `PATCH /users/me` updates name, time zone, and preference fields.
- Time zone accepts only valid IANA identifiers (e.g. `America/New_York`); invalid values are rejected on both frontend and backend.
- The time zone defaults to the browser-detected zone, offered as a sensible default the student can change.
- All changes persist between sessions.
- Invalid input produces actionable field-level messages; the settings form handles loading, error, and success states.

## Technical Notes

- Prisma: `User` gains `timeZone` (default `UTC`) and a `preferences` JSON field or a related `UserPreference` model; keep preference fields minimal (time zone plus study defaults can defer to EP06).
- The frontend uses the stored time zone for display in this story only via a shared date/time formatting helper; EP04 calendar and EP05 dashboard consume the same helper rather than re-implementing it.
- Automated tests for: invalid time zone rejection, profile persistence, no cross-student access.

## Existing scaffold code (from STUDY-20)

- `GET /users/me` and `PUT /users/me` (name fields only) in `apps/api/src/modules/users/`; `apps/web/src/pages/Profile.tsx` form with loading/error/success states.

Deltas this story must resolve against the acceptance criteria:

- The update endpoint is `PUT`; the story specifies `PATCH /users/me`.
- No `timeZone` or `preferences` on the `User` model yet, no IANA validation, and no shared date/time formatting helper (TECH-01/STUDY-20 also calls for that helper stub).
- The form has no time-zone field or browser-detected default yet.
