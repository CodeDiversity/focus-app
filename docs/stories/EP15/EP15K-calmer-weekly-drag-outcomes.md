# EP15K — Calmer Weekly-Drag Outcomes (Optional ADHD Simplification)

**Story ID:** EP15K
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** scheduled as its **own review unit after EP15's closure** (user, 2026-11-17); outside the closed EP15A–EP15J unit
**Layer:** Frontend (+ one small API addition if D-K2 is ruled (a))
**Status:** Ready — scheduled by the user 2026-11-17 ("we can schedule it on its own after EP15 is closed out") after the ▲ decisions were presented for ruling; D-K1…D-K3 ratified as recommended (rulings below). Implement on dispatch; EP15 is closed.
**Dependencies:** EP15H implemented (2026-11-17). Sources: the EP15H complexity flags the user asked to capture (implementation record Findings F-EP15H-03 and the two flags raised in review conversation, 2026-11-17); D15-14 (ADHD design ruleset); BL-15-05 (undo a cancelled occurrence).

## Plan at a glance

- **What this changes:** dragging a weekly block never interrupts with a question — every weekly drop applies to that day only, immediately, said out loud, with a one-tap "Apply to every week from here" follow-up and a 10-second Undo; the study-block resize handle moves to the zone's visible bottom edge.
- **Why it improves it:** EP15H shipped two rules a student must hold in their head — a same-day weekly drag **asks** ("Just this day / This and following") while a cross-day weekly drag silently applies "just this day". For ADHD users that asymmetry is the exact kind of inconsistent, interruption-heavy micro-decision D15-14 exists to avoid. One gesture → one predictable outcome → one calm follow-up action replaces a blocking dialog and a hidden rule (product); the pointer layer loses a whole modal flow (code).
- **Decisions needing you:** none — ▲ D-K1/D-K2 and D-K3 ratified (user, 2026-11-17); BL-15-05 promoted into this story by D-K2.
- **How to change this plan:** rule the cells below; ask the planner to schedule it (it would slot after the EP15 combined review as its own unit) or to drop it — "Dropped" is a fine ruling for an optional story.

## Summary

EP15H is correct but carries three flagged complexities. This optional story
replaces the question-after-a-gesture with "do the safe thing, say it, and
offer the bigger thing" — the pattern ADHD guidance prefers: no interruption,
no asymmetric rule to memorise, and a way back.

## The flags this story resolves (from EP15H, 2026-11-17)

| # | Flag | Today (as shipped) | Proposed |
|---|---|---|---|
| 1 | Asymmetric weekly rule | Same-day weekly drop → two-choice dialog (D-H2/D-H6); cross-day weekly drop → silent "just this day" + announcement (D-H4) | Every weekly drop behaves the same: this day only, immediately, announced — the series choice becomes a follow-up action, not a gate |
| 2 | Post-drop interruption | The dialog blocks the flow at the moment of success | No dialog on any drop; an inline **"Apply to every week from here"** action rides with the announcement (existing API: `DELETE` the one-off + `PATCH … effectiveFrom`) |
| 3 | F-EP15H-03 handle position | A tall study block's resize handle sits mid-zone (the chip's bottom, ≤ 90 px) | The handle sits at the zone's visible bottom edge |

## Acceptance criteria (draft — freeze only if scheduled)

1. Dragging a weekly `EVENT`/`STUDY_BLOCK` to any position (same day or another day) saves "just this day" immediately with no dialog; the status region announces it and an inline follow-up **"Apply to every week from here"** performs the series change in one tap (`DELETE` the created one-off, then `PATCH` the series with `effectiveFrom`); the sheet's two-choice prompt is unchanged for **form** edits (the question is fine when the student initiated an edit, not a gesture).
2. Every drag outcome (move, resize, weekly or one-off) offers **Undo** for 10 seconds in the same inline strip; Undo restores exactly the prior state. For a weekly "just this day" that requires restoring a cancelled occurrence: `DELETE /schedule/blocks/:id/occurrences/:date` gains a documented inverse (D-K2) — this promotes BL-15-05.
3. The resize handle of a study-block zone renders at the zone's bottom edge (its keyboard equivalent, the sheet's End field, is unchanged); `EVENT` chips keep the chip-bottom handle.
4. No new dialog, no new primary control, announcements stay one plain sentence (D15-14); reduced motion and the AC-E15-10 parity table still hold.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-K1 | Weekly drop behaviour: (a) act-then-offer — always "just this day", announced, with an inline "Apply to every week from here" follow-up; no dialog (overrides D-H2/D-H4's shipped shape for gestures only); (b) keep as shipped (asymmetric: ask same-day, silent cross-day); (c) always ask, cross-day too | **(a)** — one gesture, one outcome, no interruption, nothing to memorise; the sheet keeps the question for deliberate edits. (c) makes the worst moment (mid-flow) worse; (b) keeps the hidden rule | Ratified (a) (user, 2026-11-17 — scheduled the story as proposed after the ▲ rows were presented for ruling) |
| ▲ D-K2 | Undo for drops: (a) a restore-occurrence inverse (delete the exception row; uniform 404 ownership; promotes BL-15-05) enabling a faithful 10 s Undo; (b) no Undo (act-then-offer only); (c) client-side "undo" that re-creates state via existing calls where possible and hides Undo where not | **(a)** — Undo is the safety net that makes (a) of D-K1 honest; (c) is sometimes-there UI, which is its own complexity | Ratified (a) (user, 2026-11-17 — same grant; promotes BL-15-05) |
| D-K3 | Study-block handle: (a) zone-bottom; (b) keep chip-bottom | **(a)** — the grab point where the eye expects it (F-EP15H-03) | Ratified (a) (user, 2026-11-17 — same grant) |

## Definition of Done (if scheduled)

1, 5, 6, 8 (tests for the new outcomes incl. the Undo round-trip and the API inverse's ownership/404 matrix), TR-E15-11-style manual pass. Reviewed as its own unit after the EP15 combined review.

## Sizing

- **Outcome:** weekly drags never interrupt, never surprise, and can always be taken back.
- **Estimate:** ~1 window. **Files:** `pages/calendar/ui/CalendarPage.tsx` (drop resolution + follow-up strip), `features/calendar/ui/WeekGrid.tsx` (zone handle), `features/schedule-blocks/*` (follow-up/undo wiring), and if D-K2 = (a): `apps/api/src/modules/schedule/*` (one route + spec), contracts.md § API.
- **Dependencies / exclusions:** EP15H (shipped shape); does not touch the sheet's own prompt; not part of the EP15A–EP15J review unit.
