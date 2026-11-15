# EP13I — Micro-Start and Hyperfocus Absorption

**Story ID:** EP13I
**Re-lettered:** 2026-11-15 (D13-16; EP13J until the user re-prioritised micro-start ahead of energy — F-EP13H-02 is the rationale: flex sessions need an initiation counterweight before the plan gets smarter about placement)
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend (+ one small API endpoint, one optional request field)
**Status:** Implemented — awaiting parent review (2026-11-15; record `./artifacts/EP13I/implementation.md`)
**Refined:** 2026-11-15 (ui-refiner)
**Dependencies:** EP13B + EP13D implemented (start paths); EP13H implemented (flex sessions are the initiation gap this closes, F-EP13H-02). D13-13 provisional (V-13-6).
**Jira key:** Pending creation

## Summary

Honor the two ends of ADHD session reality. **Micro-start:** the hardest
minute is the first one, so the two highest-traffic start surfaces offer
**"Just 10 min"** beside the full start — one tap, a 10-minute target, a
normal EP07 session whose minutes land in confirmed time and shrink the plan
(EP13A). **Hyperfocus absorption:** when a running session passes its target
and the student keeps going, the focus page offers to fold in the next
planned session of the same assignment today (`POST
/study-sessions/:id/absorb-next`) — the target grows in place, the absorbed
row completes, and hyperfocus becomes a plan asset instead of an overrun
warning. The timer's target-reached state stops being styled as a warning at
all (D13-9): running long is working, not failing.

## Scope

**In scope:**
- Micro-start on the **today-card hero** ("Just 10 min" beside "Start
  focus") and in the **start dialog** ("Just 10 minutes" immediate action) —
  the assignment rows and course pages reach the dialog, so every start path
  has a micro affordance within one step (D-I3 records why per-row buttons
  were cut).
- One optional request field: `POST /study-sessions/from-planned/:id` accepts
  `{ plannedMinutes?: 5..480 }` so a linked micro-start keeps the planned-row
  lifecycle (deviation from the original "no backend change", D-I4).
- Absorption: the `absorb-next` endpoint (transactional, race-safe), the
  inline focus-page offer (gated on target-reached × ACTIVE × candidate),
  decline = local only, never re-offered for the same candidate in-session.
- Target-reached restyle: warning → positive on the timer (D-I7).
- Tests (TR-E13-10); recorded manual a11y pass (TR-E13-14).

**Out of scope:**
- Sounds/alerts and reminders (D13-8). Momentum displays (EP13K). Changing
  EP07 timer mechanics. Energy placement (EP13J).

## Source requirement references

- Epic AC-E13-11, AC-E13-12 (copy). Shared DoD 1, 2, 3, 4, 5, 6, 7, 8, 9.
- TR-E13-10, TR-E13-14. F-EP13H-02 (the initiation gap). V-13-6 (resolved
  here, D-I8).

## Acceptance criteria

1. The hero's "Just 10 min" starts the recommended planned session with a
   10-minute target in one interaction (linked: the planned row moves
   IN_PROGRESS as usual); the dialog's "Just 10 minutes" starts an
   assignment session the same way. Finishing at ~10 minutes records
   confirmed minutes that reduce remaining work (EP13A math — asserted at
   the service level).
2. When a running session has reached its target, is ACTIVE, and a
   qualifying candidate exists (same assignment, same civil day,
   `SCHEDULED`), the focus page shows the inline offer; accepting grows the
   target in place without interrupting the timer; declining changes nothing
   and the same candidate is not re-offered in-session.
3. `POST /study-sessions/:id/absorb-next` is transactional and user-scoped
   (uniform 404); 409s name the reason ("not running" / "no upcoming session
   of this assignment today"); a race on the candidate cannot double-absorb.
4. Copy frames both features positively; the timer's target-reached state
   carries no warning styling or overrun language anywhere (D13-9).
5. All states, keyboard operability, narrow screens; the offer is announced
   via `role="status"` and respects reduced motion.

## Tests (TR-E13-10)

- api: `from-planned` body matrix (omitted → planned duration; 10 → 10;
  out-of-bounds/non-integer → 400); absorb transaction effects (candidate
  COMPLETED + `plannedMinutes` grown atomically), candidate pick
  determinism (earliest startTime, then id), 409 matrix (not ACTIVE, no
  assignment, no candidate), uniform 404, race (conditional update count 0 →
  409, nothing written), civil-day boundary (profile zone).
- web: hero/dialog micro buttons (one interaction, correct payloads); offer
  gating matrix (target × ACTIVE × candidate × declined); accept updates the
  displayed target without remount; decline makes no call and the offer
  stays away; copy assertions (no "exceeded"/"overrun"/"over target", no
  warning class on target-reached); keyboard; `role="status"`.

## Technical notes

### Inspected code (2026-11-15, ui-refiner)

- `FocusTimer.tsx` — target-reached exists (`exceeded`) but styles the meta
  line and progress bar `warning` (the "overrun flag" AC-E13-11 removes);
  one sr-only live region for session status.
- `useFocusSession.ts` — owns the session state and exposes `applySession`,
  so an absorb response can update the target in place without remount.
- `useStartPlannedSession.ts` / `useStartFocusSession.ts` — the two start
  hooks; `startSessionFromPlanned(id)` currently posts no body.
- `StartFocusSessionDialog.tsx` — presets [25, 50, 90] + custom input; the
  assignment/course start surfaces all route through it.
- `study-sessions.service.ts` — `startFromPlanned` defaults `plannedMinutes`
  to the planned row's duration; EP13B's one-open-session transaction;
  EP13G's flex fix-up lives in the same conditional write.
- `todayPlanApi` (EP13D) — already provides today's sessions with
  `assignmentId`/`status` ordered by startTime: the offer's candidate check
  needs **no new read endpoint**.

### Decisions (ui-refiner, 2026-11-15)

| ID | Question | Decision + rationale |
|---|---|---|
| D-I1 | The micro value | **Fixed 10 minutes, not configurable.** A knob would repeat the EP13F mistake EP13N exists to fix; 10 is small enough to feel free and large enough to count. Label everywhere: **"Just 10 min"** (dialog long form: "Just 10 minutes"). |
| D-I2 | Hero affordance | A quiet `variant="outline"` **"Just 10 min"** beside the primary "Start focus" on the today-card hero — the single highest-traffic initiation point (D-D1). Same link semantics: the planned row goes IN_PROGRESS, the timer target is 10. |
| D-I3 | Per-row micro buttons? | **No.** A second button on every row doubles the control count, and on mobile every row would stack two full-width buttons (D-D12's 44px targets). The hero carries the affordance for the recommended session; any other session's row Start opens a 10-minute-sized commitment anyway once flex framing removed the slot. Revisit only with evidence. |
| D-I4 | How does a linked micro-start work? | `from-planned` gains an **optional** `plannedMinutes` body field (5..480), validated like EP07's. Deviation from the story's original "no backend change" — recorded: without it, hero micro-starts would have to use the unlinked create path and the planned row would sit `SCHEDULED` while its work happened. **Documented consequence (D13-3, by design):** finishing a linked 10-minute session completes the planned row; the remaining work re-plans from estimate − confirmed at the next generation. That is auto-forgiveness, not loss. |
| D-I5 | Dialog affordance | A **"Just 10 minutes"** secondary button in the dialog footer area that starts immediately (bypasses the duration form). The presets stay as they are; micro-start is an exit from deciding, so it must not be one more preset to weigh. |
| D-I6 | Offer presentation | **Inline card under the timer**, never a toast (toasts vanish; executive function needs persistence). Gated: target reached × ACTIVE × candidate exists (from the `todayPlanApi` cache — the server stays authoritative on accept). Copy: **"Still going — fold in the next {title} session?"** with **"Keep going (+{n} min)"** / **"No thanks"**. Decline is component state keyed by candidate id: no API call, no re-offer for that candidate this session. Accept on a lost race (409) quietly dismisses and refetches today — never an error wall. |
| D-I7 | Target-reached styling | **Warning → positive everywhere** (meta line and progress bar `success`, copy stays "Target reached — {n} min"). Applies to all sessions, candidate or not: AC-E13-11 says absorption *instead of* overrun flags, and a yellow bar is an overrun flag. |
| D-I8 | Absorption semantics (resolves V-13-6) | Candidate = the **earliest** (`startTime`, then `id`) `SCHEDULED` planned session of the running session's assignment on the running session's civil day (profile zone), excluding its own linked row (which is IN_PROGRESS anyway). Effect, one transaction: candidate → `COMPLETED`; running session `plannedMinutes += candidate.durationMinutes`. **No row-level link to the absorbed row** — `StudySession.plannedSessionId` is single-valued, so D13-13's "linked" cannot be expressed without a migration; the COMPLETED flip inside the same transaction is the audit trail, EP13C ignores COMPLETED rows, and the confirmed-time math (EP13A) is unaffected. Flagged for the planner as the V-13-6 resolution. |
| D-I9 | Announcement | The offer container is `role="status"` (polite). The timer's existing sr-only live region keeps announcing only session status — two regions, two concerns, no interleaving. No animation, so reduced motion is trivially respected. |

## Definition of Done

1. Functional criteria pass (AC-E13-11).
2. Endpoint validation (`plannedMinutes` bounds; id shape; state preconditions).
3. Ownership scoping (uniform 404 on both endpoints).
4. Actionable 409 reasons. 5. States. 6. Keyboard + `role="status"`.
7. Responsive. 8. Automated tests (TR-E13-10). 9. Both endpoint changes documented.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** starting costs ten minutes of commitment; running long absorbs the next session instead of flagging an overrun.
- **Estimate:** 2–3 requests/tokens.
- **Model recommendation:** 3 — one transactional endpoint + one optional field + focused UI; semantics settled by D-I8.
- **Production files:** `study-sessions` module (controller/service/DTO + specs), `FocusTimer.tsx`, new `features/focus-session/ui/AbsorbNextOffer.tsx` (+ model hook), `TodayPlanCard.tsx`, `StartFocusSessionDialog.tsx`, `useStartPlannedSession.ts`, `entities/study-session/api`.
- **Test files:** study-sessions specs (extend), focus/today-plan component tests.
- **Verification:** `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13B, EP13D, EP13H. Blocks nothing.
- **Exclusions:** reminders/sounds, momentum, timer mechanics, energy.

## Tracker reference

Jira key: Pending creation (no sync authorized).
