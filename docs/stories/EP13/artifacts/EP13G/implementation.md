# EP13G implementation record

**Story:** [EP13G — Flexible Day-Anchored Sessions (Model + Engine + API)](../../EP13G-flexible-day-anchored-sessions-api.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-15
**Commit scope:** `apps/api/prisma/` (schema + one additive migration), `apps/api/src/domain/study-planning/` (types, scheduler rule 6, conflicts + two specs), `apps/api/src/modules/study-plans/` (payload types, projections, save/confirm persistence, DTO, lock invariant + four specs incl. one gated), `apps/api/src/modules/study-sessions/` (start-fixes-time + spec), EP13G docs/queue updates. **Backend only** — no web change (presentation is EP13H).

## D13-4 ruling (the decision this story was blocked on)

**Option (b), per the planner's recorded recommendation — user instruction, 2026-11-15** ("Continue and implement 13G"). `startTime`/`endTime` stay **non-nullable** and become the *suggested* slot for a flex session; `anchor` (`FIXED`|`FLEX_DAY`) carries the semantics and `windowHint` (`MORNING`|`AFTERNOON`|`EVENING`) is an optional, flex-only hint. Smaller migration, no null-handling in any existing consumer, calendar keeps rendering a suggestion, and "missed-ness" keys off the anchor rather than the clock.

**The EP13 README's decision register still shows D13-4 as "Needs user decision" — planner-owned content this role may not edit. Routed as F-EP13G-01.**

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| 1 — deterministic FLEX_DAY/FIXED partition | **Done.** Rule 6 in `schedule(...)`: blocks are emitted `FLEX_DAY`; a post-pass pins every block of an assignment whose remaining work leaves **less than one `minSessionMinutes` of slack** in its own horizon capacity, or which ends with an `INSUFFICIENT_TIME_BEFORE_DEADLINE` deficit. Computed only from inputs, so identical inputs give identical partitions. | `scheduler.spec.ts` §15 (default flex, no-slack pin, the slack boundary either side, deficit pin, per-assignment partitioning, byte-identical repeat runs) |
| 2 — flex never conflicts on the clock but still counts in budgets | **Done.** `findConflicts` skips flex sessions entirely and excludes them from the `placed` set other sessions are checked against; an omitted anchor still means `FIXED`, so every pre-EP13G caller is unchanged. Budget accounting is untouched — the engine places flex blocks in real slots and charges them to the day's density/cap budget. | `conflicts.spec.ts` EP13G block (7 cases: flex×class/blocked/confirmed/flex/fixed, fixed×fixed unchanged, omitted anchor); `scheduler.spec.ts` "flex minutes still count towards the day budget"; service-level "a flex session is exempt from the clock-overlap check but a fixed one is not" |
| 3 — starting fixes the time; rollover needs no new code path | **Done.** `startFromPlanned` selects the anchor and, for a flex row, writes `anchor: FIXED` plus `startTime: now` / `endTime: now + durationMinutes` in the **same** conditional update as the status move — one write, one transaction. Rollover: the reconciliation predicate is asserted to carry **no** anchor key, and the gated journey seeds a past flex row and verifies it becomes `RESCHEDULED` with its anchor and hint intact. | `study-sessions-planned-link.service.spec.ts` (3 new cases); `study-plans-reconciliation.service.spec.ts` "rolls day-anchored sessions with everything else — no anchor filter"; gated `study-plans-rollover-e2e.spec.ts` (2 new journeys) |
| 4 — hints are honest suggestions, never constraints | **Done.** `windowHintOf` reads the hint off the slot the engine suggested (<12:00 MORNING, <17:00 AFTERNOON, else EVENING). A flex session with or without a hint is valid; a hint never enters the conflict math. | `scheduler.spec.ts` (hint derivation + the 12:00/17:00 boundaries); service "a flex session without a hint is legal" |
| 5 — payloads and DTOs round-trip with validation; ownership unchanged | **Done.** `PlanPreviewSession`, `SavedPlanSession` and `TodaySession` carry `anchor`/`windowHint`; preview, catch-up preview, the saved-plan read and the today read all project them; save and catch-up confirm persist them. The DTO validates both enums, and the service rejects a hint on a fixed session naming `sessions.<i>.windowHint`. Every query keeps its existing ownership scoping and uniform 404. Locking a session now also fixes it (`locked ⇒ FIXED`). | `study-plans-recovery-catch-up.service.spec.ts` EP13G block (6 cases); `study-plans-reality.service.spec.ts` (preview partition + pinning); `study-plans-reconciliation.service.spec.ts` (today projection); `study-plans.service.spec.ts` (lock writes `anchor: FIXED`; unlock leaves it alone) |

## Verification (2026-11-15)

- `apps/api`: `pnpm jest` → **1012 passed**, 473 skipped (gated live-DB suites, CI-executed), 0 failed. `pnpm typecheck`, `pnpm lint`, `pnpm format` clean. `pnpm db:generate` regenerated the client for the two new enums.
- `apps/web`: `pnpm vitest run` → 1160 passed, 8 failed — the pre-existing `CalendarPage` suite (F-EP13D-01/F-EP13E-02/F-EP13F-…), untouched here.
- Manual engine check (throwaway spec, not committed): a week of open evenings with three assignments (due +1, +4 and +6 days) produced **9 flex blocks out of 9** — nothing pinned, because nothing was tight. Tight work pins: covered by unit tests.
- New/changed tests: `scheduler.spec.ts` (+12, 57 total), `conflicts.spec.ts` (+7, 15 total), `study-plans-recovery-catch-up.service.spec.ts` (+6, 27 total), `study-plans-reality.service.spec.ts` (+2, 9 total), `study-plans-reconciliation.service.spec.ts` (+2 and one projection widened, 13 total), `study-plans.service.spec.ts` (+1, lock assertion updated, 35 total), `study-sessions-planned-link.service.spec.ts` (+3, 14 total), gated `study-plans-rollover-e2e.spec.ts` (+2 journeys).

## Migration

`20261115120000_planned_session_flex_anchor` — creates `PlannedSessionAnchor` and `PartOfDay`, adds `anchor` (`NOT NULL DEFAULT 'FIXED'`) and `windowHint` (nullable) to `planned_sessions`. Additive and backward-compatible: every pre-existing row backfills to `FIXED`, i.e. exactly the EP06/EP08 clock-commitment semantics, and no existing consumer gains a null check because the times stay non-nullable. Rollback: drop the two columns, then the two enum types.

## Deviations from the plan (each with why)

1. **Overdue work is never pinned.** The story's rule was "deficit-adjacent placements pin", which would include `OVERDUE`. Pinning overdue work re-creates precisely the "scheduled opportunity to fail" this story exists to remove, and there is no deadline left for the pin to protect. Work due **beyond** the window is likewise never pinned — its unplaced minutes are *deferred*, not a deficit, so the week carries no deadline pressure for it. Both exclusions are tested.
2. **`locked ⇒ FIXED` is enforced by the write, not rejected as invalid.** The story called for a validation rule. A lock is the student saying "keep this one exactly here", so `PATCH .../lock` with `locked: true` now also writes `anchor: FIXED` — strictly stronger than a 400, and it cannot leave an inconsistent row behind. Unlocking deliberately leaves the anchor alone.
3. **The "flex moved to a clock slot becomes FIXED" rule is client-driven.** Save deletes and recreates rows, so the API never sees the *previous* time of an edited session and cannot detect a move. The API honours whatever anchor the client submits (omitted = FIXED); the editor rule belongs to EP13H and is recorded there.
4. **`windowHint` is derived, not chosen.** The engine reads it off the suggested slot rather than taking it as a new preference. One fewer knob, and the hint cannot disagree with the suggestion it describes.
5. **No web change.** The story is backend-only; the client types and presentation are EP13H's. The new payload fields are additive, so the shipped client ignores them.

## Findings

| ID | Finding | Disposition |
|---|---|---|
| F-EP13G-01 | The EP13 README's decision register still records D13-4 as **"Needs user decision (V-13-3)"**, and V-13-3 is still listed as an open verification task. The ruling (option b, user instruction 2026-11-15) is recorded here and in the queue row's evidence column, but the register is planner-owned. | Routed to the planner for the register/verification-task update. Non-blocking — the contract is implemented and documented in code and in this record. |
| F-EP13G-02 | Two flex sessions may now be saved onto the same clock slot (neither suffers nor causes a clock conflict). That is the intended AC-2 semantics — their times are suggestions — but it means the saved plan can contain visually overlapping chips until EP13H presents flex work as a day list rather than clock blocks. | Open, routed to EP13H as a presentation requirement. The engine itself never *generates* overlapping flex blocks; only a manual edit can. |
| F-EP13G-03 | Gated suites (`study-plans-rollover-e2e.spec.ts` incl. the two new flex journeys) were **not executed locally** — no `DATABASE_URL`. The migration itself has not been applied to any database from this workspace. | Open evidence item for the EP13 parent review unit; CI executes migrations and the gated suites on every push. Same disposition as F-EP13A-03/F-EP13B-02/F-EP13C-02/F-EP13F-02. |
| F-EP13G-04 | `GET /study-plans/today` now returns `anchor`/`windowHint`, but the shipped EP13D card still renders a clock time for every session, so a flex session currently *looks* like a clock commitment to the student. The ADHD benefit of this story is not realised until EP13H lands. | Open, expected sequencing (the story is explicitly the backend half). Surfaced so the gap is not mistaken for a defect at parent review. |

## Changed paths

- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261115120000_planned_session_flex_anchor/migration.sql` — the two enums and two columns.
- `apps/api/src/domain/study-planning/types.ts` — `PlannedSessionAnchorValue`, `PartOfDayValue`, the two new fields on `PlannedSessionProposal`.
- `apps/api/src/domain/study-planning/scheduler.ts` — rule 6: the partition post-pass and `windowHintOf`.
- `apps/api/src/domain/study-planning/conflicts.ts` — the anchor on `SubmittedSession`; flex skipped as subject and as obstacle.
- `apps/api/src/modules/study-plans/study-plans.service.ts` — payload types, four projections, both persistence sites, both conflict inputs, the flex-only hint validation, the lock invariant.
- `apps/api/src/modules/study-plans/dto/save-study-plan.dto.ts` — `anchor` and `windowHint` with their enums.
- `apps/api/src/modules/study-sessions/study-sessions.service.ts` — starting a flex session fixes it at the real time.
- Specs: `scheduler.spec.ts`, `conflicts.spec.ts`, `study-plans-recovery-catch-up.service.spec.ts`, `study-plans-reality.service.spec.ts`, `study-plans-reconciliation.service.spec.ts`, `study-plans.service.spec.ts`, `study-sessions-planned-link.service.spec.ts`, `study-plans-rollover-e2e.spec.ts` (gated).
- Docs: this record, `checkpoint.md`, the EP13 README queue row, the EP13G story status.
