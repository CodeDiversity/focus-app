# EP07: Focus Sessions & Time Tracking

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Dependencies:** EP03. Integrates with EP06.

## Epic Summary

Provide a distraction-reduced study experience with a configurable timer and recorded study time.

## Description

As a student, I want to focus on a single assignment and record the time I spend studying so that I can track progress and make future study plans more realistic.

## Scope

- Start study sessions
- Timer controls
- Focus-mode interface
- Actual study-time recording
- Assignment progress integration

## Acceptance Criteria

- Students can start a focus session from an assignment.
- Students can start, pause, resume, and finish a timer.
- The current assignment and unfinished subtasks remain accessible in focus mode.
- Students can confirm or adjust recorded study time.
- Recorded study time is associated with the correct assignment.
- Reloading the app does not automatically mark a session complete.
- A study session can be finished without marking the assignment complete.
- Actual study time contributes to remaining-work calculations.

## Proposed Stories

1. Implement focus-session creation and startup.
2. Implement timer controls and recovery after interruption.
3. Build the distraction-reduced focus interface.
4. Implement session completion and time logging.
5. Display study history and remaining workload.

## Technical Notes

Separate planned sessions from actual time logs. Persist confirmed elapsed time. Use timestamps rather than relying entirely on browser timer intervals.
