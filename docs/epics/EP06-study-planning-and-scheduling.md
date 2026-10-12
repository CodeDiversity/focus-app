# EP06: Study Planning & Scheduling

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Dependencies:** EP03 and EP04.

## Epic Summary

Build a deterministic scheduling system that helps students allocate study time before assignment deadlines.

## Description

As a student, I want StudyPilot to suggest study sessions based on deadlines, estimated workload, and my availability so that I can spread my work across the week.

Scheduling uses explicit rules and user-provided information. No AI services are required.

## Scope

- Configurable study-session lengths
- Remaining workload calculations
- Scheduling algorithm
- Calendar conflict detection
- Plan preview and confirmation
- Insufficient-time warnings

## Acceptance Criteria

- Students can set preferred study-session durations.
- The system calculates remaining estimated work from assignment estimates and confirmed study time.
- The scheduler places work only inside available study windows.
- Proposed sessions do not overlap classes, blocked time, or existing confirmed sessions.
- The scheduler prioritizes upcoming deadlines with deterministic tie-breaking rules.
- Students can review and edit proposed sessions before saving.
- The system reports work that cannot fit before a deadline.
- The scheduler does not change assignment due dates.
- Assignments missing necessary scheduling information are flagged rather than silently scheduled.

## Proposed Stories

1. Implement study preferences and session-duration settings.
2. Implement remaining-work calculations.
3. Build the deterministic scheduling engine.
4. Implement calendar conflict detection.
5. Build study-plan preview, editing, and confirmation.
6. Implement workload deficit warnings.

## Technical Notes

Implement the scheduling algorithm as a pure TypeScript domain module.

The NestJS scheduling service should retrieve academic data, invoke the scheduling engine, and persist confirmed results through Prisma transactions.

Keep plan generation independent of HTTP, React, and database operations.
