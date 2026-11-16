# EP13R — Post-EP13 Follow-Up Register and Triage

**Story ID:** EP13R
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md) (hosted here because every item's evidence comes from EP13 delivery; letter O skipped for O/0 ambiguity, P/Q taken by the process stories)
**Milestone:** unscheduled (post-M6 backlog intake)
**Layer:** Documentation / planning (this story changes no application code)
**Status:** Blocked — awaiting user rulings on the Decisions table
**Dependencies:** EP13M implemented (the findings below are its and the children's residue). Outside the EP13 application review unit, like EP13P/EP13Q (D13-18/D13-19 precedent).
**Created:** 2026-11-16 (user request: "create one more story for the optional follow-up stories").

## Plan at a glance

- **What this changes:** one place that holds every optional follow-up raised during EP13 delivery, each with evidence, a recommendation and a Ruling cell; the accepted items then get a planner breakdown into real stories (which this story does not pre-write).
- **Why it improves it:** fourteen implementation records each ended with "candidate follow-up" lines; without a register they evaporate. Triage-by-ruling keeps the backlog the user's, not the agents' (product); nothing lands in code from this story, so the EP13 review unit stays closed (code).
- **Decisions needing you:** every ▲ row below — each is "do next / backlog / drop".
- **How to change this plan:** edit a Ruling cell, or ask the planner to split/merge items. When rulings land, the planner turns each "do next" into a sized story (new parent or new EP13-style children, planner's call).

## Summary

EP13 landed with open product follow-ups (owned ideas, deliberately not
implemented) and with pre-existing defects that EP13's combined accessibility
and E2E pass surfaced but, by D-M5, did not fix. This story is the register
and the triage. Its single deliverable is the table below with every Ruling
filled; its Definition of Done is planning-record quality, not code.

## Decisions

The triage table *is* the Decisions table (`ID | Options considered | Recommended | Ruling`; options for every row are `Do next / Backlog / Drop`).

Severity column is the raising record's judgement; evidence links are the one
source — nothing is restated. Rulings: `Do next` (planner breaks it down now),
`Backlog` (kept, unscheduled), `Drop` (closed with the reason).

### A — EP13 product follow-ups

| ID | Item (source) | Recommended | Why | Ruling |
|---|---|---|---|---|
| ▲ D-R1 | **Light work can drift late**: light work now prefers a LOW-energy window even when it is much later than a free NORMAL one (F-EP13J-04). Candidate: same-part-of-day guard or a "no study after HH:mm" preference. | Do next | The one EP13J behaviour with a plausible everyday downside; small, testable engine guard. | Proposed |
| ▲ D-R2 | **Student-owned "this is hard"**: replace/augment the D13-10 demanding heuristic (PAPER/PROJECT/EXAM or >120 min, unvalidated V-13-5; calibration can flip the 120-min line, F-EP13J-02) with a per-assignment toggle. | Do next (pairs with D-R1) | The heuristic guesses what the student could just say; closes V-13-5 honestly. | Proposed |
| ▲ D-R3 | **Energy quick setup**: bulk-tag windows ("mornings are high energy") instead of slot-by-slot editing (EP13J closeout note; chronotype onboarding was excluded from EP13J). | Backlog | Real friction, but validate that students use energy tags at all first (V-13-5 field data). | Proposed |
| ▲ D-R4 | **"Drained today" one-tap override**: treat today as LOW energy without editing weekly windows (EP13J exclusion "per-day overrides"). | Backlog | Fits ADHD variability; needs its own model decision (per-date row vs transient). | Proposed |
| ▲ D-R5 | **Placement explainability**: preview annotates why a session landed where it did ("your high-energy window"), the EP13L calibration-annotation precedent. | Backlog | Nice leverage of existing annotation plumbing; no user has asked yet. | Proposed |
| ▲ D-R6 | **Fragmentation at energy boundaries**: blocks never straddle levels, so adjacent different-level windows can split sessions (F-EP13J-03). | Backlog (observe) | Needs real tagged-schedule data before an engine change is justified. | Proposed |
| ▲ D-R7 | **Momentum goal history**: goals apply retroactively — raising `weeklyGoalDays` re-scores past weeks and can shrink the run/best run (F-EP13K-03). | Backlog | Honest limitation, documented in-module; a goal-history store is real schema work. | Proposed |
| ▲ D-R8 | **`week.days[]` in the momentum payload** so the client stops deriving the seven dates (F-EP13K-01, D05-6 tension). | Do next (trivial, additive) | Removes the one recorded D05-6 deviation; additive payload field. | Proposed |

### B — pre-existing defects surfaced by EP13M (all outside EP13's change set, D-M5)

| ID | Item (source) | Recommended | Why | Ruling |
|---|---|---|---|---|
| ▲ D-R9 | **Dialog focus return**: Escape-closing the assignment-create dialog and the phone-width calendar detail does not return focus to the trigger (F-EP13M-01; fails identically at 9ffd854). | Do next | WCAG 2.4.3; two known sites, likely one shared-Dialog fix. | Proposed |
| ▲ D-R10 | **44px touch targets**: assignment-dialog controls measure 41.8px at 375px (F-EP13M-02). | Do next (same story as D-R9) | Same surface, same test file, one a11y fix story. | Proposed |
| ▲ D-R11 | **Badge success contrast**: `text-success` on `bg-success/10` ≈ 4.3:1 for caption text, app-wide token pairing (F-EP13M-04; EP13M's axe gate excludes exactly this pattern until fixed). | Do next (design-token change) | WCAG 1.4.3; fixing it also deletes an axe allowlist entry. | Proposed |
| ▲ D-R12 | **Calendar chip label-in-name**: `aria-label="{type}: {title}, {time}"` fails axe on every chip (F-EP13M-05, SP-127B construction; the other allowlist entry). | Do next (same story as D-R11) | Both close EP13M allowlist entries; small, test-pinned copy changes. | Proposed |
| ▲ D-R13 | **E2E reliability**: study-plan journey is date-dependent (class-overlap on 2026-11-16-like days), login 409 and logout timeout flake under full parallel load (F-EP13M-06). | Do next | Flaky gates erode D-M5's "zero failures" baseline; three contained test-only fixes. | Proposed |
| ▲ D-R14 | **Pre-existing gated-suite failures** (R-EP13-03, combined review): the global pipe's `enableImplicitConversion` coerces invalid boolean/number bodies (e.g. `locked: "yes"` → 200) — an app-wide validation weakness; two `seedPlannedSession` unique-constraint fixture collisions; the bag-survival spec's replace-vs-merge premise obsoleted by R-EP06-06. | Do next | One of the four is a real validation weakness, not just test debt; the review left it non-gating only by D-M5 precedent. | Proposed |
| ▲ D-R16 | **EP13Q review polish** (R-EP13Q-04/-05): the EP13Q record never quoted the EP13L/EP13N efficiency rows its Verification promised; `tools/queue-lint.mjs` rule 5 (S-vs-M checkpoint steps) is dead code — the walker never recurses `artifacts/<child>/`. | Backlog | Optional polish per the review; the lint fix is five lines when someone is in the file. | Proposed |
| ▲ D-R15 | **CI never watches delivery branches** (R-EP13-02): ci.yml triggers on `main`/`develop` only, so every "CI will run it" disposition on `hfi/*` work was unbacked. Candidate: add a workflow trigger for delivery branches or a required pre-review local gated run. | Do next (policy) | This is how eight records carried a false evidence claim for a week. | Proposed |

## Definition of Done (this story)

1. Every ▲ row carries a user Ruling.
2. Each `Do next` item has a planner-written story (or a row in a new breakdown README) with its own sizing block; each `Drop` records the reason in this table.
3. This register is linked from the EP13 queue row and goes stale-proof: future work cites the new stories, not this table.
4. No application code changes under this story ID.

## Sizing

- **Outcome:** a ruled backlog — every EP13 follow-up either scheduled, kept deliberately, or closed.
- **Model tier:** small (docs only).
- **Files:** this file; on rulings, the planner's new story files and queue rows.
- **Verification:** `node tools/queue-lint.mjs docs/stories/EP13` clean; every item's evidence link resolves.
- **Dependencies / exclusions:** none on application code; implementation of any item is explicitly out of scope here.
