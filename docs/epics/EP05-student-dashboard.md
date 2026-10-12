# EP05: Student Dashboard

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Dependencies:** EP02–EP04. Study-session functionality integrates with EP06.

## Epic Summary

Create a student home dashboard summarizing academic responsibilities and upcoming work.

## Description

As a student, I want to open StudyPilot and immediately understand my schedule and assignments so that I can decide what needs attention without manually checking every course.

The dashboard should prioritize clarity and avoid overwhelming the user.

## Scope

- Today's classes
- Upcoming deadlines
- Overdue assignments
- Today's study sessions
- Quick actions

## Acceptance Criteria

- The dashboard displays today's class schedule.
- Incomplete assignments are ordered by upcoming deadline.
- Overdue assignments are clearly identified.
- Planned study sessions appear for the selected day.
- Students can add assignments and open relevant details directly.
- Empty states explain what the student can do next.
- Dashboard sections have sensible limits and links to full lists.

## Proposed Stories

1. Implement today's schedule widget.
2. Implement upcoming assignment widget.
3. Implement overdue assignment widget.
4. Implement today's study sessions widget.
5. Implement dashboard quick actions and empty states.

## Technical Notes

Use TanStack Query to retrieve dashboard data. Prefer composing domain-specific queries over creating a large service that owns unrelated business rules.
