# EP13 Story Breakdown — Adaptive Scheduling for ADHD

**Epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6 (release 1.1; user-approved 2026-11-14, D13-12)
**Epic dependency:** EP06, EP07, EP08 (all complete and parent-reviewed). EP13 extends the EP06 engine in place — no second scheduler, no AI (D13-1). Uses EP12A's civil-date helpers (`apps/api/src/common/lib/civil-date.ts`).
**Status:** Breakdown complete (planner, 2026-11-14). Quality gate: **Plan Ready**. D13-4 (flex-session model) ruled option (b) 2026-11-15 and implemented by EP13G/EP13H; D13-8 keeps reminders/notifications out of scope pending a capability decision. Plan review: not yet run. Plan correction pass (see [history.md](./history.md)) 2026-11-15 (EP13P-AC4; see Plan correction log). No tracker sync (user decision 2026-11-15).

## Plan at a glance

- **What this changes:** the EP06 scheduler and its surfaces learn to react to reality — confirmed work shrinks plans, missed work rolls forward without blame, sessions can be day-anchored, placement respects breaks/density/energy, estimates calibrate from history, and momentum is rewarded.
- **Why it improves it:** ADHD students stop being punished by their own plan (product); the engine stays pure, deterministic and single (code). Remaining children: none (combined review next).
- **Decisions needing you:** none ▲ open; see each story's Decisions table. Register below holds epic-level decisions.
- **How to change this plan:** edit a Ruling cell in a story, or ask the planner for AC/queue changes. Corrections and the quality gate live in [history.md](./history.md).

## Execution queue

**Delivery home:** `docs/stories/EP13/`

**Artifact root:** `./artifacts/` — one directory per child (`./artifacts/EP13A/`, …, `./artifacts/EP13M/`), plus `./artifacts/EP13/` for the parent implementation index, combined review and walkthrough.

**Active substory:** None.

**Next substory:** None to implement. **Combined review round 1 (2026-11-16, `./artifacts/EP13/review.md`): does not pass** — R-EP13-01 (gated suites; fixed, see below) , R-EP13-02 (record corrections; applied), R-EP13-05 (user-run TR-E13-14 checklist, open). Next actions: the user signs the checklist in `./artifacts/EP13/implementation.md`, then review round 2; EP13P/EP13Q document reviews; EP13R triage rulings.

**Implementation owner:** `implementer`, one sequential writer across all layers (layer labels are scope, not concurrent roles).

**Final review:** one combined review for the EP13 parent review unit — every application child in the queue (EP13A–EP13N incl. EP13H2; EP13P is outside the unit, D13-18) — after EP13M is implemented. Reviewer artifacts: `./artifacts/EP13/review.md` (walkthrough + DoD-11 section inside it, D13-19).

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
| [EP13L](./EP13L-deterministic-estimate-calibration.md) | Implemented — awaiting parent review | EP13A + EP13F + EP13G implemented. D13-7 provisional (implemented as specified). | None | `./artifacts/EP13L/implementation.md`; green 2026-11-15; open: F-EP13L-01 (contracts wording), F-EP13L-02 (gated suites not run locally) |
| [EP13N](./EP13N-adhd-aligned-preference-controls.md) | Implemented — awaiting parent review | EP13F implemented. Design settled in-story (D13-15); D-N3…D-N5 ratified by default 2026-11-15. **Moved ahead of EP13K 2026-11-15 (D13-17)** so the named-choice control exists before EP13K adds two more goal preferences. | None (unblocks EP13K) | `./artifacts/EP13N/implementation.md`; green 2026-11-15 (web 1220 / 0 failed); 5/5 ACs; a11y manual evidence deferred to EP13M (TR-E13-14) |
| [EP13K](./EP13K-momentum-daily-goal-and-repairable-streak.md) | Implemented — awaiting parent review | EP13D + EP13I + EP13N implemented. Refiner pass fc220cd; ▲ D-K rows ratified by user 2026-11-16. | None (unblocks EP13J) | `./artifacts/EP13K/implementation.md`; green 2026-11-16 (api 1084 / web 1255, 0 failed); 5/5 ACs; open: F-EP13K-01…04; a11y manual evidence deferred to EP13M |
| [EP13J](./EP13J-energy-aware-availability-and-placement.md) | Implemented — awaiting parent review | EP13F + EP13G implemented. D-J1…D-J6 ratified 2026-11-16 (▲ by user grant); V-13-5 still open. | None (unblocks EP13M) | `./artifacts/EP13J/implementation.md`; green 2026-11-16 (api 1104 / web 1264, 0 failed); 5/5 ACs; open: F-EP13J-01…04 |
| [EP13M](./EP13M-cross-layer-e2e-and-parent-index.md) | Implemented — awaiting parent review | EP13A–EP13N implemented. D-M1…D-M6 ratified (user, 2026-11-15). | None — the unit is ready for the combined review | `./artifacts/EP13M/implementation.md`, parent index `./artifacts/EP13/implementation.md`; 7/7 journeys green; web 1264/0; TR-E13-14 automated half executed, user checklist pending; open: F-EP13M-01…07 |
| [EP13P](./EP13P-agent-lifecycle-and-record-clarity.md) | Reviewed | None on application children (docs/process only; outside the EP13 application review unit, D13-18). | None | `./artifacts/EP13P/implementation.md`; `./artifacts/EP13P/review.md` — passes 2026-11-16 (round 1); open: R-EP13P-01 (polish) |
| [EP13Q](./EP13Q-lifecycle-efficiency.md) | Implemented — awaiting review | EP13P implemented. Docs/process only; outside the EP13 application review unit (D13-19). | Plan-style review of the protocol edits (its own sign-off) | `./artifacts/EP13Q/implementation.md`; queue-lint clean; corpus 22,585 → see record |
| [EP13R](./EP13R-follow-up-register-and-triage.md) | Blocked | EP13M implemented (register of its and the children's residue). Docs-only; outside the review unit (EP13P/Q precedent); blocked on user rulings. | User rules D-R1…D-R15 (do next / backlog / drop), then planner breakdown | — |

Sequence (one writer): EP13A → EP13B → EP13C → EP13D → EP13E → EP13F → EP13G → EP13H → EP13H2 → EP13I → **EP13L → EP13N → EP13K → EP13J → EP13M** (I/J re-lettered 2026-11-15, D13-16; the remaining five re-sequenced 2026-11-15, D13-17 — letters are stable IDs, the queue row order is the execution order).

Why this order: see [history.md](./history.md#sequencing-rationale).

**Refiner gate (D13-14):** closed — all five gated stories had their pass (D-D/D-E/D-H/D-I/D-K tables); EP13N settled in-story (D13-15); the rest carry no gated UI decisions.

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
| [EP13R](./EP13R-follow-up-register-and-triage.md) | — (planning story, user request 2026-11-16: register + triage of every optional EP13 follow-up; no code) | Documentation / planning |

**Why EP13F is its own pure-domain child** (EP06C/EP08B precedent): placement invariants need deterministic unit tests without HTTP or persistence.

**Why EP13J/EP13K keep both layers in one story**: each layer alone is below the meaningful-work gate; together they are one verifiable outcome (one sequential implementer, so a split manufactures children).

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

## Shared contracts, invariants and code baseline

Moved to [contracts.md](./contracts.md) (data model, lifecycle, reconciliation, endpoints, placement v2 rules, security/privacy/accessibility invariants, inspected code baseline). Implementers read the sections their story names.

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
| D13-11 | Streak = study days per Monday-start week vs `weeklyGoalDays` (default 3); a missed day never resets within-week progress; the long streak counts consecutive goal-met weeks. No consecutive-day streaks. | Provisional. Refined by D-K1/D-K2/D-K3 (EP13K, 2026-11-15). |
| D13-12 | EP13 approved as post-MVP milestone M6, release 1.1; large changes to EP06 scheduling behavior authorized. | User decision 2026-11-14 (this request). |
| D13-13 | Absorption: the next `SCHEDULED` planned session of the same assignment on the same civil day is marked `COMPLETED` and linked to the running session; the running session's `plannedMinutes` grows by its duration. | Provisional (V-13-6). **Refined by D-I8** (EP13I, 2026-11-15): no row-level link to the absorbed row — `plannedSessionId` is single-valued — the COMPLETED flip in the same transaction is the audit trail. V-13-6 resolved. |
| D13-14 | EP13D, EP13E, EP13H, EP13I, EP13K are `Needs refinement` until their `refiner` pass (UI/UX section) settles layout, copy, affordances, states, keyboard and responsive behavior. | Planner skill UI/UX handoff rule. EP13D/E/H/I passes done (D-D1…13, D-E1…15, D-H1…12, D-I1…9); EP13K pending. |
| D13-15 | **EP13N added** (initially after EP13M; re-sequenced before EP13K by D13-17): EP13F's `densityPercent` numeric input is replaced by three named choices (Relaxed 60 / Balanced 80 / Packed 100, plus an honest Custom for non-preset values); `breakMinutes` stays numeric. Stored contract unchanged. Rationale documented in the story: a ratio of an unmeasured quantity is an executive-function trap, and the percent is the engine's vocabulary, not the student's. | **User decision 2026-11-15** (raised from the EP13F implementation note). Refined by D-N1/D-N2 (EP13N). |
| D13-16 | **EP13I ⇄ EP13J re-letter**: micro-start/hyperfocus absorption is now EP13I and energy-aware placement is EP13J, so the queue's letters match the new priority — F-EP13H-02's finding that day-anchored (flex) sessions remove the clock as an initiation cue, so the counterweight (micro-start) must land before placement gets smarter. Artifacts and story text dated before 2026-11-15 use the old lettering; historical records are preserved verbatim. | **User decision 2026-11-15.** |
| D13-17 | **Remaining five re-sequenced: EP13L → EP13N → EP13K → EP13J → EP13M** (letters unchanged — they are stable IDs now referenced by commits and artifact paths; the queue row order carries execution order per the delivery-state contract). Why: EP13N's named-choice control must exist **before** EP13K adds two more goal preferences, or the same ADHD-hostile numeric input ships twice and is fixed twice; EP13L completes the "plans count reality" spine (A→F→L) and is purely additive; EP13J (energy) is the most speculative child (V-13-5 heuristic unvalidated) so it runs last among the feature children, where a descope would cost least. | **User-requested review, 2026-11-15.** |
| D13-18 | **EP13P added** (process story): agent-lifecycle audit and record/label clarity plan, hosted in EP13 because its evidence comes from EP13 delivery. It is **outside the EP13 final implementation review unit**; its sign-off is a plan-style review of the edited documents. Letter O skipped (O/0 ambiguity). | **User-requested review, 2026-11-15.** |
| D13-19 | **EP13Q added** (process story): lifecycle efficiency review and revisions — tiered protocol reads, deterministic gates inline, conditional plan review, checkpoint only for multi-window tasks, walkthrough as a `review.md` section, per-dispatch measurement log; **autopilot retired** (D-Q11 overridden by user, 2026-11-15), the live session is the coordinator; every story carries a "Plan at a glance" block and a Decisions table with user-owned Rulings (D-Q5/D-Q6). Outside the EP13 application review unit; sign-off is a plan-style review. | **User-requested review, 2026-11-15.** |

### Verification tasks

- **V-13-1:** task-only sessions stay unattributed, never reduce assignment work (EP13A).
- **V-13-2:** Locked past unstarted rows: rolled like others, or held visible until explicitly resolved? (D13-2; EP13C.)
- **V-13-3:** closed 2026-11-15 — D13-4 ruled (b); implemented by EP13G.
- **V-13-4:** D13-8 notifications capability — user decision for any future reminder epic; nothing in EP13 depends on it.
- **V-13-5:** "Demanding work" heuristic for energy placement (D13-10; EP13J).
- **V-13-6:** closed 2026-11-15 by D-I8 (refines D13-13).

### Final implementation review unit

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [EP13](./README.md) | EP13A–EP13N incl. EP13H2 (EP13P excluded, D13-18) | `./artifacts/EP13/` | EP13M (writes `./artifacts/EP13/implementation.md` incl. E2E evidence) | One combined EP13 review after all children |

Child implementation completion unblocks dependents; only the passing combined review establishes sign-off.
