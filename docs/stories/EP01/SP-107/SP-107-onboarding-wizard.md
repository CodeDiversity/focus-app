# SP-107: Onboarding Wizard

**Story ID:** SP-107
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** Medium / P1
**Dependencies:** SP-103, SP-106
**Jira key:** STUDY-8
**Status:** Planned — broken down 2026-10-18 into [SP-107A–F](./README.md) (this file is the parent coordination record and the source of the original requirements; it is not a second implementation ticket)

## Summary

Build the skippable, resumable first-time setup wizard: preferences, first semester, and optional first course.

## Description

As a new student, I want a short guided setup so that I can start using StudyPilot quickly, and I want to be able to stop and resume where I left off.

## Acceptance Criteria

- On first login, the student enters the wizard: Step 1 sets time zone and display name (defaults pre-filled from SP-106); Step 2 creates the first semester; Step 3 optionally adds a first course.
- Progress is saved after every completed step and survives page reloads and sign-out/in.
- An interrupted setup resumes at the first incomplete step.
- The wizard is skippable after Step 1; skipping records completion without the optional data.
- A completed or skipped wizard never re-appears for that student.
- Step 2 creates a semester with name and start/end dates, with validation (end after start).
- Step 3 is clearly optional; the student can finish without adding a course.
- The wizard handles loading, validation, and error states and is keyboard accessible.

## Technical Notes

- Persist progress on the user: `onboardingStep` and `onboardingCompletedAt` fields (or a `UserOnboardingState` model if steps grow).
- Step 2 uses a minimal `POST /semesters` endpoint scoped to the authenticated student. **EP02 must extend this endpoint's module, not create a duplicate** — flagged in the EP02 story breakdown.
- Time zone step reuses the SP-106 preferences endpoint rather than a separate write path.
- Automated tests for: step persistence and resume, skip behavior, completed wizard not re-shown, semester date validation.

## Breakdown

See [./README.md](./README.md) — execution queue, decisions (D107-1…9), shared
API contract, traceability, correction log, quality gate.
