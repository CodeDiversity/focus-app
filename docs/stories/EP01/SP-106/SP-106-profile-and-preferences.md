# SP-106: Student Profile and Preferences

**Story ID:** SP-106
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** Medium / P1
**Dependencies:** SP-104
**Jira key:** STUDY-11
**Status:** Planned — broken down 2026-10-17 into [SP-106A–D](./README.md) (this file is the parent coordination record and the source of the original requirements; it is not a second implementation ticket)

## Summary

Let the student view and edit their profile and preferences, including the time zone that all calendar and deadline logic in later epics depends on.

## Description

As a student, I want to set my time zone and update my details so that dates and times display correctly and my settings persist across sessions.

## Acceptance Criteria

- `GET /users/me` returns the current student's profile and preferences, excluding credential fields. *(AC-106-01)*
- `PATCH /users/me` updates name, time zone, and preference fields. *(AC-106-02)*
- Time zone accepts only valid IANA identifiers (e.g. `America/New_York`); invalid values are rejected on both frontend and backend. *(AC-106-03)*
- The time zone defaults to the browser-detected zone, offered as a sensible default the student can change. *(AC-106-04)*
- All changes persist between sessions. *(AC-106-05)*
- Invalid input produces actionable field-level messages; the settings form handles loading, error, and success states. *(AC-106-06)*

Stable IDs and the full traceability table live in the [breakdown README](./README.md#source-requirements-and-test-traceability).

## Technical Notes

- Prisma: `User` gains `timeZone` (default `UTC`) and a `preferences` JSON field or a related `UserPreference` model; keep preference fields minimal (time zone plus study defaults can defer to EP06). **Resolved 2026-10-17 as D106-1 (user-approved): `timeZone` column + nullable `preferences Json?` bag — no new model.**
- The frontend uses the stored time zone for display in this story only via a shared date/time formatting helper; EP04 calendar and EP05 dashboard consume the same helper rather than re-implementing it.
- Automated tests for: invalid time zone rejection, profile persistence, no cross-student access. *(TR-106-01…03)*

## Existing scaffold code (from STUDY-20)

- `GET /users/me` and `PUT /users/me` (name fields only) in `apps/api/src/modules/users/`; `apps/web/src/pages/Profile.tsx` form with loading/error/success states. *(Re-verified 2026-10-17 — both still true.)*

Deltas this story must resolve against the acceptance criteria:

- The update endpoint is `PUT`; the story specifies `PATCH /users/me`. **Resolved 2026-10-17 as D106-2: converge to `PATCH`, remove `PUT` with no alias (the only consumer is our own web app, which switches in SP-106C).**
- No `timeZone` or `preferences` on the `User` model yet, no IANA validation. *(Still true 2026-10-17 — owned by SP-106A/B.)* The shared date/time formatting helper **does exist**: `apps/web/src/utils/datetime.ts` (TECH-01 stub — `isValidTimeZone`, `getBrowserTimeZone`, `formatDate/Time/DateTime`, pinned by `datetime.test.ts`); SP-106C consumes it, never forks it. *(The earlier "no helper yet" claim was stale — correction CF-106-01 in the [breakdown README](./README.md#plan-correction-log).)*
- The form has no time-zone field or browser-detected default yet. *(Still true 2026-10-17 — owned by SP-106C.)*

## Breakdown

See [./README.md](./README.md) — execution queue, decisions (D106-1…9), shared API contract, traceability, correction log, quality gate.
