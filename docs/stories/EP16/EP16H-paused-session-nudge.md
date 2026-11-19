# EP16H — Paused-Session Nudge in the Header Strip (optional)

**Story ID:** EP16H
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1) — **optional child** (D16-20): implemented only if the user accepts ▲ D-H1; reviewed with the EP16 unit if accepted.
**Layer:** Frontend
**Status:** Implemented — awaiting parent review (2026-11-18). Record: [implementation.md](./artifacts/EP16H/implementation.md).
**Dependencies:** EP16D implemented (`SessionIndicator`, `CurrentSessionProvider`). Epic decisions D16-11 (no polling), D16-12 (copy rules).
**ADHD value: 7 / 10.** Pausing is the classic ADHD exit ramp — a student pauses to answer a message and the session quietly dies. The running strip (EP16D) made a *running* session unlosable; a *paused* one still looks identical in weight and never changes. A gentle, time-aware handle back closes the most common abandonment path without any reminder infrastructure (BL-16-04).

## Plan at a glance

- **What this changes:** after a session has been paused for 15 minutes or more, the header strip's wording shifts from the neutral "Paused · 12:34 — Back to session" to a warmer invitation — "Paused a while · 12:34" with the link reading **Resume** — and the live sentence becomes "Your session has been paused for a while — ready when you are." Nothing new renders; no notification, no sound, no colour change.
- **Why it improves it:** the one moment a student is most likely to lose a session gets a soft re-entry cue exactly where they already look (product). In code it is a derived state in `SessionIndicator` from data the provider already holds — no new read, no interval beyond the existing display tick.
- **Decisions needing you:** ▲ **D-H1 — accept into EP16** (user-visible workflow). D-H2 (threshold) and D-H3 (copy) are non-▲ and ratify by default if accepted.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes.

## Summary

Reuse EP16D's strip. The provider's `StudySession.updatedAt` changes on pause, so "paused since" is already in the payload. Past a threshold the strip's copy and link verb change; the time stays static (a paused session does not tick). No blame, no countdown, no "you stopped".

## Scope

**In:** `widgets/session-indicator/ui/SessionIndicator.tsx` (derived `pausedLong` state, copy, link label) + tests; `entities/study-session/model/elapsed.ts` gains `pausedForSeconds(session, nowMs)`; copy audit.
**Out:** notifications/reminders (BL-16-04); auto-finishing or auto-resuming a paused session; any API change (D16-13); the Focus page's own paused copy (`FocusTimer`).

## Source requirement references

AC-E16-10 (indicator), AC-E16-12 (a11y, live region), D16-11, D16-12. TR-E16-01, TR-E16-05. DoD-1, 5, 6, 8.

## Acceptance criteria

1. While PAUSED for less than the threshold (D-H2), the strip is exactly EP16D's: "Paused · mm:ss" and **Back to session**; live sentence "Your focus session is paused."
2. Once `now − updatedAt ≥ threshold`, the strip reads "Paused a while · mm:ss", the link reads **Resume** (still → `/focus`), and the live sentence changes once to "Your session has been paused for a while — ready when you are." The transition happens client-side on the existing display tick (no new read, no new interval while running; one 60 s check while paused is allowed) and is announced exactly once.
3. Resuming (status back to ACTIVE on the next read) returns the strip to "Running · mm:ss"; finishing removes it. Every string passes `expectNoForbiddenWords`; no `%`, no "stopped", "abandoned", "idle".

## Tests (TR-E16-01, TR-E16-05)

- `SessionIndicator.test.tsx`: `shows the EP16D paused copy under the threshold`; `switches to "Paused a while" and Resume at the threshold`; `announces the long-pause sentence once and stays silent afterwards`; `returns to Running when the session resumes`; `passes the copy audit in the long-pause state`.
- `elapsed.test.ts`: `pausedForSeconds counts from updatedAt and never goes negative`.

## Technical notes

- **Inspected (2026-11-18, HEAD `90161c0`):** `SessionIndicator.tsx` derives `running`/`visible`/`liveText` from `useCurrentSession()`; the tick effect runs only while `running`. `StudySession.updatedAt` (`types.ts:16`) is set by the server on every transition, so it is the pause instant for a PAUSED row. `CurrentSessionProvider` re-reads on route change and visibility only (D16-11) — the long-pause flip must come from local time arithmetic, not a read.
- **Design:** `pausedForSeconds = Math.max(0, Math.floor((nowMs − Date.parse(session.updatedAt)) / 1000))`; while PAUSED, a 60 s `setInterval` updates `now` (coarser than the 1 s running tick; it is a render tick, not a request). `pausedLong = status === 'PAUSED' && pausedForSeconds ≥ PAUSE_NUDGE_SECONDS`.
- **API need:** none.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-H1 | Accept into EP16's review unit: (a) accept — implement after EP16F, review with the unit; (b) defer — register as a backlog row for a later epic | **(a)** — small (one widget, one helper), reuses shipped structure, and the paused-session gap is the strip's one blind spot | Ratified (user, 2026-11-18 — "ratify all decisions") — accepted |
| D-H2 | Threshold: (a) 15 min; (b) 5 min; (c) 30 min | **(a)** — long enough that a real break is not nagged, short enough that a forgotten session is caught within the same study block | Ratified (user, 2026-11-18 — "ratify all decisions") |
| D-H3 | Copy: (a) "Paused a while · mm:ss" + **Resume**; (b) "Still paused" + **Back to session**; (c) no copy change, icon only | **(a)** — the verb says the next step; (b) reads as a reproach; (c) is colour/shape-only meaning | Ratified (user, 2026-11-18 — "ratify all decisions") |

## Definition of Done

1, 5, 6, 8 (TR-E16-01/05). 2, 3, 4, 7, 9 N/A. 10–11 via the EP16 combined review (if accepted).

## Sizing

- **Outcome:** a paused session invites the student back after a while, without nagging.
- **Size:** about a quarter window. No split.
- **Actual at closeout:** well under a quarter window, 2026-11-18. Two source files + two test files; web 1435/0 (+6 incl. EP16H's five indicator and one elapsed case).
- **Files:** `apps/web/src/widgets/session-indicator/ui/SessionIndicator.tsx` (+ test), `apps/web/src/entities/study-session/model/elapsed.ts` (+ test).
- **Start context:** this story; EP16D's implementation record (§ AC2); `SessionIndicator.tsx`, `elapsed.ts`.
- **Verification:** `npx vitest run src/widgets/session-indicator src/entities/study-session`; tsc + eslint clean.
- **Dependencies / exclusions:** EP16D. Reminders → BL-16-04.
