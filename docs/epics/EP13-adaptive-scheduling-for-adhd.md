# EP13: Adaptive Scheduling for ADHD

**Issue Type:** Epic
**Release:** 1.1 (post-MVP)
**Priority:** High / P0
**Labels:** `studypilot`, `adhd`
**Dependencies:** EP06, EP07, EP08 (all parent-reviewed). Builds on EP12A's civil-date helpers.

## Epic Summary

Turn the static weekly plan into a living schedule that reacts to what the
student actually does, so falling behind is absorbed automatically instead of
accumulating as visible failure. Designed explicitly for ADHD: low-friction
starting, forgiving recovery, variety, energy awareness, and rewards for
showing up — never for plan compliance.

## Description

As a student with ADHD, I want my study plan to adapt to what I really did
today — without shame, backlogs, or manual replanning — so that opening the
app always gives me one doable next step instead of a record of everything I
missed.

The current scheduler (EP06) assumes plans get followed: it ignores time
already studied, pins every session to a clock time, packs blocks back to
back, front-loads work, and keeps missed sessions in a recovery list until
the assignment is finished. Each of those behaviors punishes exactly the
users this product is for. This epic makes the plan reflect reality, makes
starting cheap, and makes progress feel rewarding.

Scheduling remains **deterministic** — explicit rules, no AI, no randomness.
Identical inputs must keep producing identical plans.

## Scope

- Plan generation that subtracts confirmed study time and locked commitments
- A durable link between planned sessions and actual focus sessions, with
  lifecycle statuses that really change
- Automatic rolling reconciliation: unstarted past sessions flow forward;
  the recovery screen becomes informational, never mandatory
- Planned sessions on the calendar and dashboard, with a single recommended
  "next session" and one-tap focus start
- ADHD-aware placement: breaks between sessions, a day-density cap,
  interleaving of assignments, and honoring min/max session lengths
- Flexible day-anchored sessions that cannot be "missed" at a clock time
- Energy-tagged availability windows that attract demanding work
- Micro-starts ("just 10 minutes") and hyperfocus absorption of the next
  planned session
- Momentum feedback: minutes today toward a modest goal, a repairable weekly
  streak, a completion celebration — no compliance percentages
- Deterministic estimate calibration from the student's own history, shown
  transparently in previews

## Out of scope

- Reminders and notifications (email, push, web-push, scheduled jobs): a
  separate capability decision; revisit as its own epic if approved.
- AI/ML of any kind, syllabus parsing, LMS integrations (MVP exclusions stand).
- Social features, body-doubling rooms, shared schedules.

## Acceptance Criteria

- Generated and previewed plans subtract confirmed study time from each
  assignment's estimate; work already done is never scheduled again.
- Saving a plan preserves locked and completed planned sessions, and the
  minutes held by locked future sessions reduce the remaining work the
  planner places (no double counting).
- A focus session can be started from a planned session in one step;
  finishing it marks that planned session completed.
- Past planned sessions that never happened are rolled forward automatically;
  the student never has to visit a recovery screen to obtain a valid current
  plan, and rolled-forward sessions stop being reported as missed.
- Planned sessions are visible on the calendar and dashboard; the dashboard
  presents a single recommended next session with a one-tap focus start.
- Generated plans include a break between consecutive sessions and never fill
  more than a configured share of a day's free time.
- Generated plans interleave different assignments within a day when more
  than one assignment has remaining work.
- Session placement honors the student's minimum and maximum session lengths.
- A session can be day-anchored (flexible) instead of clock-pinned; a
  flexible session has no clock time to miss and rolls forward at day end if
  unstarted. Deadline-critical sessions may remain pinned.
- Availability windows can carry an energy level; more demanding work is
  placed into higher-energy windows when possible.
- Any session can be started as a short micro-start; when a focus session
  reaches its target and the student keeps working, the app offers to absorb
  the next planned session instead of flagging an overrun.
- Progress feedback rewards showing up (minutes today toward a modest goal, a
  repairable weekly streak); no surface reports a plan-compliance percentage;
  all copy remains non-blaming (extends EP08's D08-8).
- Plan previews show calibrated estimates when enough history exists, with
  the applied multiplier visible and explainable.
- All scheduling remains deterministic: identical inputs produce identical
  plans; no AI, no randomness.

## Proposed Stories

1. Make plan generation count reality (confirmed time, locked commitments,
   lock-preserving save).
2. Link planned sessions to focus sessions with real lifecycle statuses.
3. Roll unfinished past sessions forward automatically; demote recovery to an
   informational view.
4. Surface the plan where the student lives: calendar, dashboard "what now",
   one-tap focus start.
5. Rework placement: breaks, density cap, interleaving, min/max lengths.
6. Introduce flexible day-anchored sessions (model, API, UI).
7. Energy-tagged availability and energy-aware placement.
8. Micro-start and hyperfocus absorption.
9. Momentum feedback (daily goal, repairable streak, celebration).
10. Deterministic estimate calibration with transparent multipliers.
11. Cross-layer end-to-end verification.

## Technical Notes

Extend the EP06 engine (`apps/api/src/domain/study-planning/`) in place; it
stays pure (no clock, no I/O, no randomness) and remains the only scheduler —
EP08's `replan` continues to wrap it. Known defects absorbed by this epic:
the State-A empty confirmed-time map (`study-plans.service.ts:492–494`, `:652`
— seams V-07-3/V-08-5), the EP06 save path deleting locked sessions, the
locked-minutes double count, and the focus default reading the never-written
`studyDefaults.sessionMinutes` key instead of `sessionLengthMinutes` (V-07-1).

Non-blaming copy (EP08 D08-8) is a hard requirement on every new surface.
