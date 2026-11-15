# EP13 Story Breakdown — Adaptive Scheduling for ADHD

**Epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6 (release 1.1; user-approved 2026-11-14, D13-12)
**Epic dependency:** EP06, EP07, EP08 (all complete and parent-reviewed). EP13 extends the EP06 engine in place — no second scheduler, no AI (D13-1). Uses EP12A's civil-date helpers (`apps/api/src/common/lib/civil-date.ts`).
**Status:** Breakdown complete (planner, 2026-11-14). Quality gate: **Plan Ready**. D13-4 (flex-session model) ruled option (b) 2026-11-15 and implemented by EP13G/EP13H; D13-8 keeps reminders/notifications out of scope pending a capability decision. Plan review: not yet run. Plan correction pass 2026-11-15 (EP13P-AC4; see Plan correction log). No tracker sync (user decision 2026-11-15).

## Execution queue

**Delivery home:** `docs/stories/EP13/`

**Artifact root:** `./artifacts/` — one directory per child (`./artifacts/EP13A/`, …, `./artifacts/EP13M/`), plus `./artifacts/EP13/` for the parent implementation index, combined review and walkthrough.

**Active substory:** None.

**Next substory:** EP13Q — implement (process story, D13-19; then EP13L — Ready, calibration; first of the remaining children under D13-17's order: L → N → K → J → M). EP13K still needs its `refiner` pass (D13-14) before its turn; that pass can run in parallel with EP13L/EP13N implementation. EP13A–EP13D landed 2026-11-14; EP13E–EP13I (incl. EP13H2) landed 2026-11-15. Open evidence items riding to the parent review: the gated live-DB suites and the EP13B migration are CI-executed, not run locally (F-EP13A-03, F-EP13B-02, F-EP13C-02); the `wallClockToInstant` DST-midnight observation is on the planner/EP12 roster (F-EP13C-01).

**Implementation owner:** `implementer`, one sequential writer across all layers (layer labels are scope, not concurrent roles).

**Final review:** one combined review for the EP13 parent review unit — every application child in the queue (EP13A–EP13N incl. EP13H2; EP13P is outside the unit, D13-18) — after EP13M is implemented. Reviewer artifacts: `./artifacts/EP13/review.md` + `./artifacts/EP13/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP13A](./EP13A-plan-generation-counts-reality.md) | Implemented — awaiting parent review | EP06/EP07 complete. No UI decisions. | None (unblocks EP13B/C/F/L) | `./artifacts/EP13A/implementation.md`, `./artifacts/EP13A/checkpoint.md`; green 2026-11-14; open: F-EP13A-03 |
| [EP13B](./EP13B-planned-actual-link-and-lifecycle.md) | Implemented — awaiting parent review | EP13A implemented. D13-3 provisional (implemented as specified). | None (unblocks EP13C, EP13D, EP13I) | `./artifacts/EP13B/implementation.md`, `./artifacts/EP13B/checkpoint.md`; green 2026-11-14; open: F-EP13B-02 |
| [EP13C](./EP13C-rolling-reconciliation-and-auto-forgiveness.md) | Implemented — awaiting parent review | EP13A + EP13B implemented. D13-2 provisional (V-13-2 open: locked past rows roll, keep `locked`). | None (unblocks EP13D, EP13E) | `./artifacts/EP13C/implementation.md`, `./artifacts/EP13C/checkpoint.md`; green 2026-11-14; open: F-EP13C-01, F-EP13C-02 |
| [EP13D](./EP13D-plan-visibility-and-one-tap-start.md) | Implemented — awaiting parent review | EP13B + EP13C implemented. UI/UX settled (D-D1…D-D13, commit bd06a9e). | None (unblocks EP13I, EP13K) | `./artifacts/EP13D/implementation.md`, `./artifacts/EP13D/checkpoint.md`; green 2026-11-14; open: F-EP13D-02 (F-EP13D-01 fixed by EP13H2) |
| [EP13E](./EP13E-fresh-start-reframing-and-navigation.md) | Implemented — awaiting parent review | EP13C + EP13D implemented. UI/UX settled (D-E1…D-E15, commit ec3d17e). | None | `./artifacts/EP13E/implementation.md`, `./artifacts/EP13E/checkpoint.md`; green 2026-11-15; open: F-EP13E-01, F-EP13E-03 (F-EP13E-02 fixed by EP13H2) |
| [EP13F](./EP13F-adhd-aware-placement-engine-v2.md) | Implemented — awaiting parent review | EP13A implemented (remaining-work semantics). No UI decisions. | None (unblocked EP13G, EP13J) | `./artifacts/EP13F/implementation.md`, `./artifacts/EP13F/checkpoint.md`; green 2026-11-15; open: F-EP13F-01, F-EP13F-02, F-EP13F-03, F-EP13F-04 |
| [EP13G](./EP13G-flexible-day-anchored-sessions-api.md) | Implemented — awaiting parent review | EP13F implemented. **D13-4 ruled option (b)** — user instruction 2026-11-15 (planner's recommendation). | None (unblocked EP13H) | `./artifacts/EP13G/implementation.md`, `./artifacts/EP13G/checkpoint.md`; green 2026-11-15; open: F-EP13G-02, F-EP13G-03, F-EP13G-04 (F-EP13G-01 fixed in plan, C-EP13-04) |
| [EP13H](./EP13H-flexible-sessions-ui.md) | Implemented — awaiting parent review | EP13G implemented; D13-4 ruled option (b). UI/UX settled (D-H1…D-H12, commit e272f4d). | None | `./artifacts/EP13H/implementation.md`, `./artifacts/EP13H/checkpoint.md`; green 2026-11-15; open: F-EP13H-01, F-EP13H-02 (F-EP13H-03/-04 fixed by EP13H2) |
| [EP13H2](./EP13H2-flex-details-and-calendar-suite-repair.md) | Implemented — awaiting parent review | EP13H implemented. Fix story (user decision 2026-11-15): F-EP13H-03 + the CalendarPage suite. | None | `./artifacts/EP13H2/implementation.md`; green 2026-11-15 (web 0 failed); fixes F-EP13D-01, F-EP13E-02, F-EP13H-03, F-EP13H-04 |
| [EP13I](./EP13I-micro-start-and-hyperfocus-absorption.md) | Implemented — awaiting parent review | EP13B + EP13D + EP13H implemented. UI/UX settled (D-I1…D-I9, commit 06ee759); V-13-6 resolved as D-I8. | None | `./artifacts/EP13I/implementation.md`, `./artifacts/EP13I/checkpoint.md`; green 2026-11-15; open: F-EP13I-01, F-EP13I-02, F-EP13I-03; V-13-6 resolved (D-I8) |
| [EP13L](./EP13L-deterministic-estimate-calibration.md) | Ready | EP13A + EP13F + EP13G implemented. D13-7 provisional. EP13L-AC5 added 2026-11-15 (calibrated work drives the EP13G anchor partition). | **Implement next** (1st of the remaining five) | — |
| [EP13N](./EP13N-adhd-aligned-preference-controls.md) | Ready | EP13F implemented. Design settled in-story (D13-15). **Moved ahead of EP13K 2026-11-15 (D13-17)** so the named-choice control exists before EP13K adds two more goal preferences. | Implement after EP13L | — |
| [EP13K](./EP13K-momentum-daily-goal-and-repairable-streak.md) | Needs refinement | EP07 session log (done); EP13D + EP13I (shared dashboard surface); **EP13N implemented** (control pattern, D13-15). D13-11 provisional. **refiner pass required** (D13-14). | refiner pass, then implement (after EP13N) | — |
| [EP13J](./EP13J-energy-aware-availability-and-placement.md) | Ready | EP13F + EP13G implemented. D13-10 provisional (V-13-5). EP13J-AC3/EP13J-AC5 revised 2026-11-15 (anchor-inclusive identity; energy must survive interval merging). | Implement after EP13K — last feature child (D13-17) | — |
| [EP13M](./EP13M-cross-layer-e2e-and-parent-index.md) | Queued | EP13A–EP13N implemented. D13-4 resolved, so the flex journeys are unconditional. | Implement last; **performs the combined manual a11y pass** (TR-E13-14 for EP13D/E/H/I/K) | — |
| [EP13P](./EP13P-agent-lifecycle-and-record-clarity.md) | Implemented — awaiting review | None on application children (docs/process only; outside the EP13 application review unit, D13-18). | Plan-style review of the edited documents (its own sign-off, D13-18) | `./artifacts/EP13P/implementation.md` (EP13P-AC1–AC3, AC5–AC6, a9afe4d); EP13P-AC4 done by planner pass 50b8477 + 904a496 + closeout commit (C-EP13-01…09 below) |
| [EP13Q](./EP13Q-lifecycle-efficiency.md) | Ready | EP13P implemented. Docs/process only; outside the EP13 application review unit (D13-19). Rulings recorded 2026-11-15 (D-Q3/5/6 ratified, D-Q11 → retire autopilot). Writes outside `docs/` user-granted. | **Implement next, before EP13L** (EP13Q-AC8/11/13 first so EP13L starts under the new contract) | — |

Sequence (one writer): EP13A → EP13B → EP13C → EP13D → EP13E → EP13F → EP13G → EP13H → EP13H2 → EP13I → **EP13L → EP13N → EP13K → EP13J → EP13M** (I/J re-lettered 2026-11-15, D13-16; the remaining five re-sequenced 2026-11-15, D13-17 — letters are stable IDs, the queue row order is the execution order).

Why this order: A/B/C are the backend spine — the plan cannot "react to reality" until confirmed time counts (A), planned and actual sessions are linked (B), and unstarted work rolls forward (C). D/E make that spine visible and are the first user-facing payoff. F is the placement redesign and deliberately lands after the spine so its tests run against the corrected remaining-work semantics. G/H (flex sessions) build on F's placement and carried the flex-model decision (D13-4, ruled (b) before they ran). I, L, N, K and J are independent experience layers; D13-17 fixes their order. M verifies the whole stack.

**Do not start EP13K before its `refiner` pass** (D13-14; the EP13D/E/H/I passes are done — their D-D/D-E/D-H/D-I tables): momentum displays, their copy (non-blaming, D13-9), empty/loading/error states, keyboard behavior and responsive behavior are deliberately undecided. EP13A, EP13B, EP13C, EP13F, EP13G, EP13J, EP13L and EP13M carry no refiner-gated UI decisions (EP13J's and EP13L's small UI touches follow existing patterns and are specified in their stories); EP13N's design is settled in-story (D13-15).

## Stories

| Story | Epic proposed story | Layer |
|---|---|---|
| [EP13A](./EP13A-plan-generation-counts-reality.md) | 1. Make plan generation count reality | Backend |
| [EP13B](./EP13B-planned-actual-link-and-lifecycle.md) | 2. Link planned sessions to focus sessions | Backend |
| [EP13C](./EP13C-rolling-reconciliation-and-auto-forgiveness.md) | 3. Roll unfinished past sessions forward | Backend |
| [EP13D](./EP13D-plan-visibility-and-one-tap-start.md) | 4. Surface the plan: calendar, dashboard, one-tap start | Frontend |
| [EP13E](./EP13E-fresh-start-reframing-and-navigation.md) | 3./4. frontend half: fresh-start framing, recovery demotion, navigation | Frontend |
| [EP13F](./EP13F-adhd-aware-placement-engine-v2.md) | 5. Placement rework: breaks, density, interleaving, min/max | Backend (pure domain) |
| [EP13G](./EP13G-flexible-day-anchored-sessions-api.md) | 6. Flexible day-anchored sessions (model + engine + API) | Backend |
| [EP13H](./EP13H-flexible-sessions-ui.md) | 6. Flexible day-anchored sessions (UI) | Frontend |
| [EP13I](./EP13I-micro-start-and-hyperfocus-absorption.md) | 8. Micro-start and hyperfocus absorption (re-lettered from EP13J, D13-16) | Frontend (+ small API) |
| [EP13J](./EP13J-energy-aware-availability-and-placement.md) | 7. Energy-tagged availability and placement (re-lettered from EP13I, D13-16) | Backend + Frontend |
| [EP13K](./EP13K-momentum-daily-goal-and-repairable-streak.md) | 9. Momentum feedback | Backend + Frontend |
| [EP13L](./EP13L-deterministic-estimate-calibration.md) | 10. Deterministic estimate calibration | Backend (+ small frontend annotation) |
| [EP13M](./EP13M-cross-layer-e2e-and-parent-index.md) | 11. Cross-layer end-to-end verification + parent index | Integration |
| [EP13N](./EP13N-adhd-aligned-preference-controls.md) | — (correction story, user decision 2026-11-15: reshape EP13F's two preference fields for ADHD users; see D13-15) | Frontend |
| [EP13P](./EP13P-agent-lifecycle-and-record-clarity.md) | — (process story, user decision 2026-11-15: agent-lifecycle audit and record/label clarity plan; see D13-18. Letter O skipped to avoid O/0 ambiguity) | Documentation / process |
| [EP13Q](./EP13Q-lifecycle-efficiency.md) | — (process story, user decision 2026-11-15: lifecycle efficiency review — twenty questions answered in-story, tiered reads, inline deterministic gates, walkthrough folded into review, measurement log; see D13-19) | Documentation / process |

**Why EP13F is its own pure-domain child** (like EP06C/EP08B): breaks, density cap, interleaving and min/max enforcement are placement-algorithm invariants that must be unit-tested deterministically without HTTP or persistence; folding them into a service story would bury the determinism/purity contract.

**Why EP13J/EP13K keep both layers in one story**: each layer's share is below the meaningful-work gate on its own (a one-field migration + a heuristic hook; an aggregate endpoint + a card), while together they form one coherent, independently verifiable outcome. One sequential implementer owns all layers, so a split would manufacture children.

**Why a separate integration child exists**: EP13M adds a new Playwright suite (`apps/web/e2e/adaptive-scheduling.spec.ts`) covering multi-day journeys the unit level cannot (do work → plan shrinks; miss a day → plan rolls forward; start focus from the plan; momentum updates), plus the parent implementation index — real integration implementation per the EP08F precedent.

## Epic acceptance criteria — ownership

Original wording from [EP13](../../epics/EP13-adaptive-scheduling-for-adhd.md#acceptance-criteria); stable IDs assigned here.

| Epic AC (abbreviated) | Stable ID | Owner |
|---|---|---|
| Plans subtract confirmed study time; done work never rescheduled | AC-E13-01 | **EP13A**, EP13M |
| Save preserves locked/completed sessions; locked minutes reduce remaining work | AC-E13-02 | **EP13A**, EP13M |
| Start focus from a planned session; finishing completes it | AC-E13-03 | **EP13B** (API/lifecycle), **EP13D** (UI), EP13M |
| Unstarted past sessions roll forward automatically; no mandatory recovery screen; rolled sessions stop being "missed" | AC-E13-04 | **EP13C**, **EP13E** (framing), EP13M |
| Planned sessions on calendar + dashboard; single recommended next session, one-tap start | AC-E13-05 | **EP13D** (consumes EP13C's today API), EP13M |
| Breaks between sessions; day-density cap | AC-E13-06 | **EP13F** |
| Interleaving of assignments within a day | AC-E13-07 | **EP13F** |
| Min/max session lengths honored | AC-E13-08 | **EP13F** |
| Day-anchored flexible sessions; no clock time to miss; deadline-critical may stay pinned | AC-E13-09 | **EP13G** (model/engine/API), **EP13H** (UI), EP13M (D13-4 ruled (b)) |
| Energy-tagged availability attracts demanding work | AC-E13-10 | **EP13J** |
| Micro-start; hyperfocus absorption instead of overrun flags | AC-E13-11 | **EP13I**, EP13M |
| Showing-up rewards; no compliance percentages; non-blaming copy | AC-E13-12 | **EP13K** (momentum), **EP13E** (framing/copy), all UI children (copy rule D13-9) |
| Calibrated estimates, multiplier visible and explainable | AC-E13-13 | **EP13L** |
| Deterministic throughout; no AI, no randomness | AC-E13-14 | **EP13F**, **EP13G**, **EP13J**, **EP13L** (each proves determinism for its own rules); EP13M |

## Requirement and test traceability

The epic defines no TR IDs; stable TR IDs are assigned here.

| Req | Requirement | Owning children |
|---|---|---|
| TR-E13-01 | Confirmed-time plan math: COMPLETED-only attribution, remaining = max(0, estimate − confirmed), locked-future subtraction, save preserving locked/completed, unattributed total unchanged | EP13A |
| TR-E13-02 | Link/lifecycle: start-from-planned creates linked session + IN_PROGRESS; finish → COMPLETED; ownership scoping; uniform 404; one-open-session 409 preserved; unlinked sessions leave planned rows untouched | EP13B |
| TR-E13-03 | Reconciliation: past `SCHEDULED` rollover (status flip, idempotence, civil-date boundary incl. DST), never touches `StudySession`/`Assignment`, today read API shape, missed list excludes rolled sessions | EP13C |
| TR-E13-04 | Plan-surface UI: calendar PLANNED_SESSION events, dashboard today + next-session card, one-tap focus start, default minutes from `sessionLengthMinutes`, loading/empty/error, keyboard, narrow screen | EP13D |
| TR-E13-05 | Reframing UI: today-first plan view, plan-health view informational (never gates plan access), nav updates, non-blaming copy assertions, no compliance % | EP13E |
| TR-E13-06 | Placement v2 unit tests: break insertion, density cap, interleaving rotation, min/max honored (tail merge/drop), determinism, purity, deadline feasibility never sacrificed to variety | EP13F |
| TR-E13-07 | Flex sessions: anchor persistence/validation, flex excluded from clock-overlap conflicts but counted in daily budget, deadline-pinning rule, day-end rollover of unstarted flex | EP13G |
| TR-E13-08 | Flex UI: day-anchored presentation, start-anytime affordance, pinned-vs-flex distinction, states, keyboard, narrow screen | EP13H |
| TR-E13-09 | Energy: migration default NORMAL, deterministic energy-aware placement (demanding→HIGH preference with stable tie-breaks), availability UI tag round-trip | EP13J |
| TR-E13-10 | Micro-start/absorption: 10-minute start records confirmed minutes and shrinks remaining work; absorption offer at target with student still active; decline changes nothing; absorbed session semantics per D13-13 | EP13I |
| TR-E13-11 | Momentum: daily-minutes aggregate, repairable weekly streak math (missed day never resets the week), goal defaults, no compliance %, celebration respects reduced motion | EP13K |
| TR-E13-12 | Calibration: median ratio per assignment type, ≥3 samples else 1.0, clamp [0.5, 3.0], determinism, preview annotation present/explainable, no write to assignments | EP13L |
| TR-E13-13 | Cross-layer E2E: do-work→plan-shrinks, miss-a-day→rolls-forward, start-focus-from-plan, flex journey (D13-4 ruled (b)), momentum display; existing suites stay green | EP13M |
| TR-E13-14 | Manual accessibility pass recorded for every new surface (keyboard, focus visibility, screen-reader path, reduced motion, narrow screen) | EP13D, EP13E, EP13H, EP13I, EP13K (recorded); EP13M (collected) |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | EP13B, EP13C, EP13F (preference keys), EP13G, EP13I, EP13J, EP13K (API boundaries); EP13D, EP13H, EP13I (client mirror); N/A for EP13A, EP13E, EP13L, EP13N (no new inputs) |
| 3 student data scoping | EP13A, EP13B, EP13C, EP13G, EP13I, EP13J, EP13K, EP13L, EP13M (every owned or changed query) |
| 4 actionable API errors | EP13B, EP13C, EP13G, EP13I, EP13J, EP13K (owned or changed endpoints); EP13D, EP13E, EP13H, EP13N surface those messages client-side (claimed in-story as DoD 4, no endpoint owned) |
| 5 loading/empty/error states | EP13D, EP13E, EP13H, EP13I, EP13K, EP13N |
| 6 keyboard accessibility | EP13D, EP13E, EP13H, EP13I, EP13K, EP13N; EP13J (new availability field) |
| 7 responsive layouts | EP13D, EP13E, EP13H, EP13I, EP13K, EP13N |
| 8 automated tests | All children (TR-E13-01…13); TR-E13-14 is a recorded manual pass |
| 9 API/migration documentation | EP13B (link migration), EP13G (anchor migration), EP13J (energy migration), EP13A/EP13C/EP13I/EP13K/EP13L (contract docs), EP13M (parent index) |
| 10 integrated review | EP13 parent review unit (all children) |
| 11 reviewer walkthrough | Reviewer, once for the EP13 parent unit |

## Shared contracts

Field names and semantics below are the stable seam; presentation belongs to the `refiner` pass (D13-14). All date work uses EP12A's civil-date helpers; the engine stays in "civil date + minute of day".

### Data model (additive migrations; owner in parentheses)

```prisma
// (EP13B) StudySession gains an optional link to the planned session it executes.
model StudySession {
  // ... existing fields ...
  plannedSessionId String?
  plannedSession   PlannedSession? @relation(fields: [plannedSessionId], references: [id], onDelete: SetNull)
}

// (EP13G — D13-4 ruled (b), implemented) PlannedSession gains a day-anchor. Option (b):
// keep startTime/endTime non-nullable as the *suggested* slot; anchor controls semantics.
model PlannedSession {
  // ... existing fields ...
  anchor     PlannedSessionAnchor @default(FIXED)   // FIXED | FLEX_DAY
  windowHint PartOfDay?                              // MORNING | AFTERNOON | EVENING (flex only)
}

// (EP13J) AvailabilitySlot gains an energy level.
model AvailabilitySlot {
  // ... existing fields ...
  energy EnergyLevel @default(NORMAL)   // HIGH | NORMAL | LOW
}
```

Preferences bag (`preferences.studyDefaults`, EP06 contract in `domain/study-planning/preferences.ts`) gains additive keys with defensive-reader defaults (EP13F; same bounds style as D06-4): `breakMinutes` (default 15, bounds 0–60), `densityPercent` (default 80, bounds 50–100), and (EP13K) `dailyGoalMinutes` (default 60, bounds 5–480), `weeklyGoalDays` (default 3, bounds 1–7). Existing keys and the 4096-byte bag cap are unchanged.

### Status lifecycle (EP13B + EP13C; uses the existing `PlannedSessionStatus` enum — no enum migration)

- `SCHEDULED` → `IN_PROGRESS`: a linked focus session starts from the planned session.
- `IN_PROGRESS`/`SCHEDULED` → `COMPLETED`: a linked focus session finishes with ≥1 confirmed minute (D13-3 provisional).
- `SCHEDULED` → `RESCHEDULED`: the daily reconciliation rolls an unstarted past session forward (D13-2 provisional; the row is preserved — history is never deleted).
- `SKIPPED`: reserved for an explicit student dismissal (the EP13D "not doing this one" affordance was not shipped — D-D5).
- Reconciliation and lifecycle transitions never write `StudySession`, `Assignment` or `Task` (extends AC-E08-03).

### Reconciliation (EP13C)

Runs lazily and idempotently at the start of every plan read/preview/save and the today read (no scheduled jobs — D13-8 keeps job infrastructure out of scope): every owned `PlannedSession` with `status === 'SCHEDULED'`, civil date strictly before today (EP08's missed boundary, D08-5), and no linked completed `StudySession` flips to `RESCHEDULED`. No minute arithmetic happens here — remaining work already flows from estimate − confirmed (EP13A), so rolling forward is purely a status/reporting change. Locked past rows follow V-13-2. `GET /study-plans/recovery-summary` remains for the informational plan-health view but reports rolled-forward totals instead of an accumulating missed list.

### Endpoints (additive)

| Method & path | Owner | Purpose | Success | Errors |
|---|---|---|---|---|
| `POST /study-sessions/from-planned/:plannedSessionId` | EP13B | Start a focus session linked to a planned session (duration defaults to the planned duration) | 201 → ActiveSession | 401; 404 uniform; 409 open-session |
| `GET /study-plans/today` | EP13C | Today's reconciled sessions + the single recommended next session (first unfinished by start time, then ordering comparator) | 200 | 401 |
| `POST /study-sessions/:id/absorb-next` | EP13I | Absorb the next planned session of the same assignment into the running session (D13-13) | 200 | 401; 404 uniform; 409 no-candidate |
| `GET /study-sessions/momentum` | EP13K | Minutes today, daily goal, week's study-day count, weekly goal, streak of goal-met weeks | 200 | 401 |

Existing endpoints keep their shapes; `POST /study-plans/preview` and the saved-plan read gain `calibration` annotations (EP13L: `{ assignmentType, multiplier, samples }[]`) and per-session `anchor`/`windowHint` fields (EP13G).

### Placement v2 (EP13F — engine rules, all deterministic)

1. **Breaks:** consecutive placed sessions on a day are separated by ≥ `breakMinutes` (treated as consumed free time, not stored rows).
2. **Density cap:** per day, placed minutes ≤ `densityPercent`% of that day's free minutes (after classes/blocked/busy), and never above `dailyCapMinutes`.
3. **Interleaving:** within a day, after placing a block for one assignment, prefer a different schedulable assignment for the next block (round-robin over the EP06 ordering comparator). Deadline feasibility overrides variety: if interleaving would push an assignment past its due date, fall back to deadline order (TR-E13-06 negative case).
4. **Min/max honored:** every placed block is ≥ `minSessionMinutes` and ≤ `maxSessionMinutes`; a tail shorter than min merges into the previous block (up to max) or is dropped into the deficit report — never placed.
5. Purity and tie-break totality preserved; `schedule()`'s signature grows, EP08's `replan` passes through unchanged semantics.

### Decision register

| ID | Decision | Status / provenance |
|---|---|---|
| D13-1 | Extend the EP06 engine in place; pure, deterministic, no AI, no second scheduler. | Settled (epic Technical Notes). |
| D13-2 | Rollover semantics: past unstarted `SCHEDULED` rows flip to `RESCHEDULED` at reconcile; rows preserved. | Provisional (V-13-2: locked past rows). |
| D13-3 | Link = `StudySession.plannedSessionId` (nullable, SetNull); many actual sessions may serve one planned session; first finished linked session with ≥1 confirmed minute completes it. | Provisional. |
| D13-4 | **Flex-session model.** Options: (a) nullable `startTime`/`endTime` for flex rows; (b) keep non-nullable times as the *suggested* slot + `anchor` enum + optional `windowHint`. **Ruled (b)** — smaller migration, calendar can still render a suggestion, missed-ness keys off `anchor`. | **User decision 2026-11-15** (ratified the planner's recommendation; V-13-3 closed). Implemented by EP13G. |
| D13-5 | Placement defaults: `breakMinutes` 15 (0–60), `densityPercent` 80 (50–100), stored in `studyDefaults` with defensive-reader fallback. | Provisional. |
| D13-6 | Interleaving = deterministic round-robin over the ordering comparator; feasibility beats variety. | Provisional. |
| D13-7 | Calibration: ratio = confirmed/estimated over finished assignments (COMPLETED/SUBMITTED/GRADED, both values > 0), median per `Assignment.type` (fallback: overall), ≥3 samples else 1.0, clamp [0.5, 3.0]; applied to remaining-work classification; always annotated in previews. | Provisional. |
| D13-8 | Reminders/notifications (email/push/web-push/scheduled jobs) stay **out of EP13**; revisit as a separate epic if the capability is approved. Reconciliation is therefore lazy (read-time), not job-driven. | **Needs user decision to ever add; recorded as out of scope now.** |
| D13-9 | Non-blaming copy (EP08 D08-8) binds every EP13 surface; additionally **no plan-compliance percentage anywhere**. | Settled (epic AC). |
| D13-10 | `AvailabilitySlot.energy` HIGH/NORMAL/LOW, default NORMAL; "demanding" = type PAPER/PROJECT/EXAM or remaining > 120 min. | Provisional (V-13-5 for the heuristic). |
| D13-11 | Streak = study days per Monday-start week vs `weeklyGoalDays` (default 3); a missed day never resets within-week progress; the long streak counts consecutive goal-met weeks. No consecutive-day streaks. | Provisional. |
| D13-12 | EP13 approved as post-MVP milestone M6, release 1.1; large changes to EP06 scheduling behavior authorized. | User decision 2026-11-14 (this request). |
| D13-13 | Absorption: the next `SCHEDULED` planned session of the same assignment on the same civil day is marked `COMPLETED` and linked to the running session; the running session's `plannedMinutes` grows by its duration. | Provisional (V-13-6). **Refined by D-I8** (EP13I, 2026-11-15): no row-level link to the absorbed row — `plannedSessionId` is single-valued — the COMPLETED flip in the same transaction is the audit trail. V-13-6 resolved. |
| D13-14 | EP13D, EP13E, EP13H, EP13I, EP13K are `Needs refinement` until their `refiner` pass (UI/UX section) settles layout, copy, affordances, states, keyboard and responsive behavior. | Planner skill UI/UX handoff rule. EP13D/E/H/I passes done (D-D1…13, D-E1…15, D-H1…12, D-I1…9); EP13K pending. |
| D13-15 | **EP13N added** (initially after EP13M; re-sequenced before EP13K by D13-17): EP13F's `densityPercent` numeric input is replaced by three named choices (Relaxed 60 / Balanced 80 / Packed 100, plus an honest Custom for non-preset values); `breakMinutes` stays numeric. Stored contract unchanged. Rationale documented in the story: a ratio of an unmeasured quantity is an executive-function trap, and the percent is the engine's vocabulary, not the student's. | **User decision 2026-11-15** (raised from the EP13F implementation note). Refined by D-N1/D-N2 (EP13N). |
| D13-16 | **EP13I ⇄ EP13J re-letter**: micro-start/hyperfocus absorption is now EP13I and energy-aware placement is EP13J, so the queue's letters match the new priority — F-EP13H-02's finding that day-anchored (flex) sessions remove the clock as an initiation cue, so the counterweight (micro-start) must land before placement gets smarter. Artifacts and story text dated before 2026-11-15 use the old lettering; historical records are preserved verbatim. | **User decision 2026-11-15.** |
| D13-17 | **Remaining five re-sequenced: EP13L → EP13N → EP13K → EP13J → EP13M** (letters unchanged — they are stable IDs now referenced by commits and artifact paths; the queue row order carries execution order per the delivery-state contract). Why: EP13N's named-choice control must exist **before** EP13K adds two more goal preferences, or the same ADHD-hostile numeric input ships twice and is fixed twice; EP13L completes the "plans count reality" spine (A→F→L) and is purely additive; EP13J (energy) is the most speculative child (V-13-5 heuristic unvalidated) so it runs last among the feature children, where a descope would cost least. | **User-requested review, 2026-11-15.** |
| D13-18 | **EP13P added** (process story): agent-lifecycle audit and record/label clarity plan, hosted in EP13 because its evidence comes from EP13 delivery. It is **outside the EP13 final implementation review unit**; its sign-off is a plan-style review of the edited documents. Letter O skipped (O/0 ambiguity). | **User-requested review, 2026-11-15.** |
| D13-19 | **EP13Q added** (process story): lifecycle efficiency review and revisions — tiered protocol reads, deterministic gates inline, conditional plan review, checkpoint only for multi-window tasks, walkthrough as a `review.md` section, per-dispatch measurement log; **autopilot retired** (D-Q11 overridden by user, 2026-11-15), the live session is the coordinator; every story carries a "Plan at a glance" block and a Decisions table with user-owned Rulings (D-Q5/D-Q6). Outside the EP13 application review unit; sign-off is a plan-style review. | **User-requested review, 2026-11-15.** |

### Verification tasks

- **V-13-1:** Confirm task-only sessions (`assignmentId` null, `taskId` set) stay in the unattributed total and never reduce an assignment's remaining work (EP13A).
- **V-13-2:** Locked past unstarted rows: rolled like others, or held visible until explicitly resolved? (D13-2; EP13C.)
- **V-13-3:** ~~D13-4 flex model — user decision. Blocks EP13G/EP13H.~~ Closed 2026-11-15: ruled option (b) (user decision); implemented by EP13G.
- **V-13-4:** D13-8 notifications capability — user decision for any future reminder epic; nothing in EP13 depends on it.
- **V-13-5:** "Demanding work" heuristic for energy placement (D13-10; EP13J).
- **V-13-6:** ~~Absorption status semantics (D13-13; EP13I).~~ Resolved 2026-11-15 by D-I8 (refines D13-13; see register).

### Code baseline (inspected 2026-11-14, not proposed)

- `apps/api/prisma/schema.prisma`: `PlannedSession` (status enum SCHEDULED/IN_PROGRESS/COMPLETED/SKIPPED/RESCHEDULED, `locked`), `StudySession` (`assignmentId?`, `taskId?`, `durationMinutes`, `plannedMinutes?`, no planned-session link), `AvailabilitySlot` (no energy field), `StudyPlan`.
- `apps/api/src/modules/study-plans/study-plans.service.ts`: the State-A empty confirmed-time maps at lines 492–494 and 652–653 (in-code comments mark the seam); `gatherPlanData`, `preview`, `save`, `getRemainingWork`, EP08 recovery/catch-up methods.
- `apps/api/src/domain/study-planning/`: `preferences.ts` (the four `studyDefaults` keys, bounds, defensive reader — read 2026-11-14), `scheduler.ts`, `intervals.ts`, `ordering.ts`, `remaining-work.ts`, `conflicts.ts`, `catch-up.ts` (per EP08 baseline).
- `apps/web/src/features/focus-session/model/resolveDefaultSessionMinutes.ts`: reads `studyDefaults.sessionMinutes` — a key EP06 never writes (contract key is `sessionLengthMinutes`), so the saved preference is ignored (V-07-1 re-check outcome; fixed by EP13D).
- `apps/web/src/pages/calendar/` + `calendar.service.ts`: no PLANNED_SESSION event type (EP06's V-05-1 still open; EP13D closes it).
- `apps/web/src/widgets/header/ui/navGroups.ts`: no nav entry for `/focus` or `/catch-up` (EP13E).
- Unverified (disclosed): exact RTK Query slice layout for study plans/dashboard (explored at summary level, not line level); the EP13K refiner outcome (D13-14); browser rendering (no screenshots).

### Security / privacy / accessibility invariants

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A student cannot start/absorb/read sessions against another student's plan rows | Student B posts `from-planned/:id` with A's planned-session id | `ownedWhere`/`assertOwned` on every new query; uniform 404 `Resource not found` | TR-E13-02, TR-E13-10 |
| Reconciliation never mutates history | A rollover edits a `StudySession` or flips an `Assignment` | Reconciliation writes only `PlannedSession.status`; `StudySession`/`Assignment`/`Task` untouched; test asserts rows unchanged field-for-field | TR-E13-03 |
| Concurrent start-from-planned cannot open two sessions | Two simultaneous `from-planned` posts | EP07's existing one-open-session guard (409) retained around the linked create, in one transaction | TR-E13-02 |
| Rollover is idempotent under concurrent reads | Two simultaneous plan reads both reconcile | Status flip is a conditional `updateMany` (`status: SCHEDULED`, date < today); second writer matches 0 rows | TR-E13-03 |
| Calibration cannot inflate or corrupt estimates | A 10× outlier ratio or 1-sample history | Median + clamp [0.5, 3.0] + ≥3-sample gate; assignments never written | TR-E13-12 |
| Determinism holds across every new rule | Same inputs, different plan across runs | No clock/randomness in the engine; round-robin and energy preferences use the existing total-order tie-breaks | TR-E13-06, TR-E13-09, TR-E13-12 |
| No shaming or compliance framing | A surface shows "you completed 40% of your plan" or "you missed 11 sessions" | D13-9: copy reviewed per surface; tests assert absence of compliance % and shaming terms | TR-E13-04, TR-E13-05, TR-E13-11 |

### Final implementation review unit

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [EP13](./README.md) | EP13A–EP13N incl. EP13H2 (EP13P excluded, D13-18) | `./artifacts/EP13/` | EP13M (writes `./artifacts/EP13/implementation.md` incl. E2E evidence) | One combined EP13 review after all children |

Child implementation completion unblocks dependents; only the passing combined review establishes sign-off.

### Quality gate (planner)

**Verdict: Plan Ready** — D13-4 ruled (b) 2026-11-15 (EP13G/EP13H implemented); EP13K remains gated on its `refiner` pass (D13-14). No plan-review pass has run yet; a reviewer pass is the recommended next planning gate.

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Every child in the queue (EP13A–EP13N incl. EP13H2, plus the process story EP13P) is a substantive outcome; split reasons recorded (Stories section); EP13J/EP13K deliberately kept single cross-layer stories to avoid manufactured children; no README-only/status-only child. |
| 2 | Original AC/TR coverage | Pass | All 14 epic ACs mapped (ownership table); TR-E13-01…14 each have a named owner. |
| 3 | Definition of Done | Pass | DoD map above; items 10/11 belong to the combined parent review. |
| 4 | Contract consistency | Pass | One shared-contracts section (migrations, lifecycle, reconciliation, endpoints, placement rules); implementers EP13A–L, consumers EP13D/E/H/J/K, verifier EP13M. |
| 5 | Code paths inspected | Pass | Code-baseline section; State-A seam, preference keys, focus-default bug and schema fields verified by direct read 2026-11-14; disclosed unverified items. |
| 6 | Feature-specific risks/counterexamples | Pass | Invariants table: ownership, history immutability, concurrency (double-start, double-reconcile), calibration bounds, determinism, copy rules. Scheduling/time checklist: civil-date + DST boundary tests owned by TR-E13-03. |
| 7 | Dependency mapping | Pass | Queue order + per-row dependencies (D13-17); D13-4 ruled and implemented; the remaining refiner gate (EP13K) named. |
| 8 | Material decisions | Pass (one standing out-of-scope item) | D13-4 ruled (b) 2026-11-15; D13-8 (notifications capability) recorded as out of scope, a decision is needed only to ever add it. All other decisions settled or provisional with verification tasks. |
| 9 | Correction log | Pass | C-EP13-01…09 recorded below with preserved originals (planner pass 2026-11-15, EP13P-AC4). |
| 10 | Identifier consistency | Pass | Per `.agents/id-conventions.md` (2026-11-15): qualified child ACs in queue cells and the unimplemented stories (EP13J/K/L/M/N), register in numeric order with override back-references (D13-13 ← D-I8, D13-15 ← D-N1/D-N2), no typed counts. No tracker keys (no sync, user decision 2026-11-15). |

### Plan correction log

(Initialized 2026-11-14. Planner corrections use `C-EP13-<nn>`; reviewer findings from a plan-review pass keep their own `R-EP13-<nn>` IDs and are recorded here with preserved originals when that pass runs.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| C-EP13-01 | 2026-11-15 | Medium | EP13B.md:37,107–108; EP13D.md:48,143–144,186–187; EP13F.md:41,111; EP13G.md:43,111; artifacts/EP13F/checkpoint.md:6,42; artifacts/EP13H/checkpoint.md:6,35 (EP13P §D) | Live specs used pre-D13-16 letters: EP13B/EP13D "Absorption (EP13J)", "Blocks EP13C, EP13D, EP13J", "EP13J owns micro-start"; EP13F/EP13G "Energy preferences (EP13I …)", "Blocks EP13G, EP13I", "energy (EP13I)"; EP13F checkpoint linked `../../EP13I-energy-aware-availability-and-placement.md` (file no longer exists). | Absorption/micro-start → EP13I, energy → EP13J in all listed lines; checkpoint link now `EP13J-energy-aware-…md` (commit 50b8477). | `grep -rn "EP13I-energy" docs/stories/EP13` → 0 hits; every `EP13I`/`EP13J` mention in EP13B/D/F/G re-read against the story titles. | Fixed in plan |
| C-EP13-02 | 2026-11-15 | Medium | README.md:16,20,251,261 (EP13P §D) | "all thirteen children" / "Thirteen children" vs 15 story files; review-unit row "EP13A–EP13M" omitted EP13N and EP13H2; line 16 "EP13N follows EP13M" contradicted D13-17 (L → N → K → J → M). | Counts replaced by listed IDs; review unit = "EP13A–EP13N incl. EP13H2 (EP13P excluded, D13-18)"; Next-substory text follows D13-17; EP13F/H/I checkpoint "resume next" pointers updated to the same order (50b8477). | `grep -rn thirteen docs/stories/EP13` → 0 hits; review-unit row compared with the queue rows and `ls docs/stories/EP13/EP13*.md`. | Fixed in plan |
| C-EP13-03 | 2026-11-15 | Medium | README.md:120–127 (DoD map); EP13J.md:43 (EP13P §D) | DoD-4 row "EP13B, EP13C, EP13G, EP13K" omitted EP13E/EP13I/EP13J which claim DoD 4 in-story; DoD-3 row omitted EP13I (owns `absorb-next`) and EP13L (history query); DoD-2 row called EP13F N/A though it validates its own preference keys; DoD-9 omitted EP13I/EP13L; EP13J source refs "Shared DoD 1, 2, 3, 6, 8, 9" vs its DoD section claiming items 4, 5, 7. | Rows 2/3/4/5/6/7/9 rebuilt from the endpoints and queries each story owns; DoD-4 distinguishes endpoint owners from client-side surfacing (EP13D/E/H/N); EP13J source refs now "1, 2, 3, 4, 6, 8, 9" with 5/7 inherited from the existing dialog (50b8477). | Each story's `Source requirement references` and `Definition of Done` sections read and compared row-by-row with the README map (EP13A–EP13N). | Fixed in plan |
| C-EP13-04 | 2026-11-15 | Low | README.md:6,43,87,112,145,183,257,267,268; queue rows EP13F/EP13G (EP13P §D; F-EP13G-01) | "D13-4 (flex-session model) blocks EP13G/EP13H only", "*blocked on D13-4*", "(if D13-4 lands)", "(EP13G — blocked on D13-4)", "with D13-4 explicitly blocking EP13G/EP13H (Needs Decision …)", "Needs Decision (two)" — D13-4 was ruled (b) 2026-11-15 and implemented by EP13G/EP13H. | Every stale blocking phrase replaced with the ruling; gate row 8 → Pass with D13-8 as the one standing out-of-scope item (50b8477). F-EP13G-01 thereby fixed in plan. | `grep -n "D13-4" README.md` — all remaining mentions state the ruling or are the register/V-13-3 rows. | Fixed in plan |
| C-EP13-05 | 2026-11-15 | Low | README.md:209–214 (decision register), V-13-6 (EP13P §C.4, §D) | Register rows ordered D13-14, D13-17, D13-16, D13-18, D13-15; D13-13 carried no back-reference to D-I8 (EP13I), which refines it (no row-level link to the absorbed row); D13-15 carried none to D-N1/D-N2; V-13-6 still open though resolved by D-I8. | Rows re-ordered numerically; D13-13 "Refined by D-I8", D13-15 "Refined by D-N1/D-N2" and "(initially after EP13M; re-sequenced before EP13K by D13-17)"; EP13N rows D-N1/D-N2 marked `(refines D13-15)`; V-13-6 struck through as resolved (50b8477, 904a496). | `grep -n "^| D13-" README.md` shows 1…18 in order; EP13I D-I8 and EP13N D-N1/D-N2 re-read. | Fixed in plan |
| C-EP13-06 | 2026-11-15 | Low | README.md:3,6,49–65,270; every EP13*.md story header (`**Jira key:** Pending creation`) and `## Tracker reference` section | "(Jira: Pending creation)", "Jira keys: Pending creation (no sync authorized).", Stories-table `Jira` column of "Pending creation", gate row "10 | Jira identity | Not applicable", 15 story `Jira key` lines and 15 `Tracker reference` sections. | All removed (user decision 2026-11-15: no Jira sync, role deleted); gate row 10 repurposed to identifier consistency per `.agents/id-conventions.md` (904a496). Historical implementation records untouched. | `grep -rn Jira docs/stories/EP13 | grep -v implementation.md` → only EP13P's audit text ("No Jira mutation" exclusion, jira-sync audit row). | Fixed in plan |
| C-EP13-07 | 2026-11-15 | Low | README.md:16,36,45,133,167,210,233,257,267; EP13K.md:7,55,99,134,136; EP13J.md:34; checkpoints A/C/D/G/H/I resume pointers | "`ui-refiner` pass", "ui-refiner, then implement", "presentation belongs to the `ui-refiner`", "Needs refinement (ui-refiner required, D13-14)" — the ui-refiner role was merged into `refiner` (EP13P-AC3, a9afe4d). | Wording replaced by "refiner pass" in the README, EP13K, EP13J and the checkpoint resume pointers (904a496). Dated role attributions in implemented stories ("Refined: … (ui-refiner)", Decisions headers) and commit references stay as history. | `grep -rn ui-refiner docs/stories/EP13 | grep -v implementation.md` → only dated attributions in EP13D/E/H/I, their checkpoints' commit lines, and EP13P's audit text. | Fixed in plan |
| C-EP13-08 | 2026-11-15 | Low | README.md queue rows EP13A–EP13I (Evidence / artifacts cells) | Cells duplicated implementation.md content, e.g. EP13I: "`./artifacts/EP13I/implementation.md`, `./artifacts/EP13I/checkpoint.md`; api 1028 passed + **web 1200 passed, 0 failed**, lint/typecheck/format clean 2026-11-15; gated journeys CI-executed (F-EP13I-03); manual a11y pass open (F-EP13I-01, fourth instance); absorbed rows COMPLETED without a row link — schema limit, planner to ratify V-13-6 (D-I8)". | Cells reduced to artifact links + one-line verdict (`green <date>; open: F-…`) for EP13A–EP13I per the delivery-state evidence rule (EP13P-AC5); test counts, deviations and finding prose live only in each `implementation.md`. Finding IDs preserved; no evidence moved or invented. | Each trimmed cell checked against the finding IDs listed in that child's `implementation.md`/checkpoint; EP13H2's fixed-finding list retained. | Fixed in plan |
| C-EP13-09 | 2026-11-15 | Low | README.md:34,37,39; EP13L.md:80,106; EP13N.md:9; EP13K.md:74,88,102,108,112; EP13J.md:96,100,108; EP13M.md:90; EP13P.md:127,135,143–148 (EP13P §C.3) | Bare child-AC citations: "AC-5 added 2026-11-15", "AC-3/AC-5 revised", "ACs 1–3 need user-granted writes", "EP13K AC-3", "EP13E AC-1", "for AC-6", "AC-5's wording", "AC-4 no longer offers an N/A escape", "AC 3", "AC 4". | Qualified as `EP13L-AC5`, `EP13J-AC3`/`EP13J-AC5`, `EP13K-AC3`/`EP13K-AC6`, `EP13E-AC1`, `EP13M-AC4`, `EP13P-AC<n>`; Decisions stubs added to EP13J/K/L/M naming the `D-<L><n>` + `(refines D13-<n>)` form; EP13M source refs/DoD aligned with EP13M-AC3 (904a496). Implemented children (EP13A–EP13I) not rewritten. | `grep -nE "\bAC[- ]?[0-9]\b" README.md EP13J/K/L/M/N/P.md` → 0 bare hits outside each story's own AC list. | Fixed in plan |
