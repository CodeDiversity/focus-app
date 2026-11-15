# EP13B — Planned↔Actual Link and Session Lifecycle

**Story ID:** EP13B
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend
**Status:** Implemented — awaiting parent review (2026-11-14; record `./artifacts/EP13B/implementation.md`)
**Dependencies:** EP13A implemented. D13-3 provisional. No UI decisions.
**Jira key:** Pending creation

## Summary

Planned sessions and real focus sessions are unlinked today, and no code path
ever changes a `PlannedSession.status` — every row stays `SCHEDULED` forever.
This story adds the durable link (`StudySession.plannedSessionId`, additive
migration), a one-step "start focus from a planned session" endpoint, and the
first real lifecycle transitions: starting a linked session marks the planned
row `IN_PROGRESS`; finishing with confirmed minutes marks it `COMPLETED`
(D13-3). Unlinked focus sessions (started from an assignment, as today) keep
working unchanged and never touch planned rows.

## Scope

**In scope:**
- Additive migration: `StudySession.plannedSessionId String?` with `SetNull`
  on delete; index.
- `POST /study-sessions/from-planned/:plannedSessionId` — creates a linked
  focus session whose default `plannedMinutes` is the planned row's
  `durationMinutes`; reuses the EP07 lifecycle (pause/resume/finish) as-is.
- Lifecycle transitions on the planned row: `SCHEDULED → IN_PROGRESS` at
  linked start; `→ COMPLETED` when a linked session finishes with ≥1
  confirmed minute; abandoning (finish with 0 minutes / delete) reverts
  `IN_PROGRESS → SCHEDULED`.
- Tests (TR-E13-02).

**Out of scope:**
- Rollover of past sessions (EP13C). All UI (EP13D). Absorption (EP13J).

## Source requirement references

- Epic AC-E13-03. Shared DoD 1, 2, 3, 4, 8, 9. TR-E13-02.

## Acceptance criteria

1. Starting from a planned session creates an `ACTIVE` `StudySession` linked
   by `plannedSessionId`, carrying the planned row's `assignmentId` and
   defaulting `plannedMinutes` to its `durationMinutes`; the planned row
   becomes `IN_PROGRESS`. Both writes happen in one transaction.
2. EP07's one-open-session invariant is preserved: a second start (linked or
   not) returns the existing 409 contract; the planned row is not left
   `IN_PROGRESS` by a rejected start.
3. Finishing a linked session with ≥1 confirmed minute marks the planned row
   `COMPLETED`; finishing with 0 minutes reverts it to `SCHEDULED`. Unlinked
   sessions never change any planned row.
4. A planned session that is `COMPLETED`, `locked`-and-`IN_PROGRESS` by
   another flow, or in the past still accepts a start only while its civil
   date is today (past rows are EP13C's rollover business; 409 with an
   actionable message otherwise).
5. Ownership: all new queries are user-scoped; a foreign or missing planned
   session returns the uniform 404.

## Tests (TR-E13-02)

- Linked start happy path (transactional pair of writes; defaults).
- 409 on open session; planned row state unchanged after rejection.
- Finish ≥1 min → COMPLETED; finish 0 min → reverts; unlinked finish touches
  nothing (field-for-field assertion on planned rows).
- Non-today planned session start rejected (boundary: civil date, profile
  zone).
- Ownership scoping + uniform 404; invalid id shape → 400.
- Migration up/down documented; existing rows unaffected (null link).

## Technical notes

- **Inspected (2026-11-14):** `schema.prisma` `StudySession` (lines 279–297:
  no planned link today) and `PlannedSession`/`PlannedSessionStatus`
  (343–370); EP07 lifecycle endpoints per EP07 stories (`POST
  /study-sessions`, `/pause`, `/resume`, `/finish`, one-open-session 409).
- **Proposed:** migration + `from-planned` handler in the study-sessions
  module calling the existing create path; a small planned-session status
  helper used by finish. The status enum already contains every needed value
  — no enum migration.
- D13-3 (provisional): many actual sessions may point at one planned row;
  the **first** qualifying finish completes it; later links are allowed and
  ignored for status.

## Definition of Done

1. Functional criteria pass (AC-E13-03 backend half).
2. Invalid input validated at the new endpoint (id shape, body absent).
3. Student data scoping (uniform 404).
4. Actionable API errors (409 reasons distinguish open-session vs not-today).
5–7. N/A (backend only).
8. Automated tests (TR-E13-02).
9. Migration + endpoint documented in the implementation record.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** planned sessions and focus sessions are durably linked with real lifecycle statuses.
- **Estimate:** 2–3 requests/tokens.
- **Model recommendation:** 4 — transactional lifecycle + concurrency edges around the one-open-session guard.
- **Production files:** `apps/api/prisma/schema.prisma` + migration (new), `apps/api/src/modules/study-sessions/*` (controller/service), small status helper.
- **Test files:** study-sessions service/controller specs (extend); gated API spec.
- **Minimal start context:** this story, EP13 README lifecycle contract, `schema.prisma`, the EP07 lifecycle service, EP13A's implementation record.
- **Verification:** `pnpm --filter @studypilot/api test`, lint, typecheck, `pnpm db:generate`.
- **Dependencies:** EP13A. Blocks EP13C, EP13D, EP13J.
- **Exclusions:** rollover (EP13C), UI (EP13D), absorption endpoint (EP13J).

## Tracker reference

Jira key: Pending creation (no sync authorized).
