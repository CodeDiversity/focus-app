# EP08: Catch-Up & Recovery

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Dependencies:** EP06 and EP07.

## Epic Summary

Help students recover from missed study sessions and reorganize unfinished work without manually rebuilding their schedules.

## Description

As a student, I want to replan unfinished coursework when I fall behind so that I can recover from missed sessions and understand which deadlines remain achievable.

The feature must provide useful feedback without blame or punitive messaging.

## Scope

- Missed-session detection
- Unfinished-work summary
- Replanning algorithm
- Proposed schedule changes
- Deadline feasibility warnings

## Acceptance Criteria

- Missed planned study sessions can be identified without treating a completed assignment as unfinished.
- Students can initiate replanning manually.
- Completed work and historical study logs remain unchanged.
- Replacement sessions respect current availability and existing commitments.
- Students can preview changes before confirming them.
- Manually locked sessions are preserved during replanning.
- The app reports any work that cannot be accommodated before its deadline.
- Replanning never silently extends assignment deadlines.
- Students can decline proposed schedule changes.

## Proposed Stories

1. Implement missed-session identification.
2. Build an unfinished-work recovery summary.
3. Implement deterministic workload rescheduling.
4. Build catch-up plan preview and confirmation.
5. Implement deadline feasibility and conflict warnings.

## Technical Notes

Reuse the EP06 scheduling engine instead of creating a separate scheduling algorithm.

Treat replanning as a proposed change set. Persist accepted changes transactionally and preserve completed sessions.
