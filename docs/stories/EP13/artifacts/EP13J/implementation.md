# EP13J implementation record

**Story:** [EP13J — Energy-Aware Availability and Placement](../../EP13J-energy-aware-availability-and-placement.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-16
**Commit scope:** one commit — additive migration (`EnergyLevel` enum + `AvailabilitySlot.energy`), energy-aware interval algebra, placement preference hook, availability DTO/service, plan-service wiring, calendar `subtitle` tag, availability dialog field + list tag + chip tag, tests, `contracts.md`, EP13J story (Status, D-J rows, sizing), EP13 README queue, this record, `efficiency.md`.

Decisions: the story had no D-J rows (planned "at refinement"; D13-14 exempts EP13J from a refiner pass). Proposed and ratified at implementation start, 2026-11-16 — ▲ D-J1, D-J3, D-J5 under the user's explicit grant ("ratify any decisions needed"); D-J2, D-J4, D-J6 by default. All are the recommended options in the story table.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP13J-AC1 — energy round-trips through CRUD with enum-only validation; default NORMAL preserves rows and clients | **Done.** Migration adds `energy "EnergyLevel" NOT NULL DEFAULT 'NORMAL'`. DTOs accept optional `energy` (`@IsIn`, message `energy must be one of HIGH, NORMAL, LOW`); create omits it when absent (schema default), PATCH writes it alone (an energy-only body is valid); the response always carries it. Blocked rows keep the default and the engine ignores them (D-J4). | `availability.service.spec.ts` (+4: explicit write/echo, omitted → NORMAL, enum 400 for `MEDIUM`/`high`/`3`, energy-only PATCH); slot key inventories in the unit and gated specs |
| EP13J-AC2 — demanding → HIGH, light → LOW, deterministic, never at the cost of feasibility or v2 rules | **Done.** `isDemanding` (D-J1). `placeBlock` reorders the day's free gaps by level rank (D-J3), stable earliest-first within a level; critical work (rule 3) calls it with energy off. Budgets/density/pinning read no energy. | `energy.spec.ts`: demanding→HIGH, light→LOW, light prefers NORMAL over HIGH, LOW-only still placed, critical ignores energy, same `results` and pinned set as the untagged run with blocks within [min,max], determinism incl. reversed input; `study-plans-energy.service.spec.ts`: a PAPER lands at 18:00 HIGH through the real service |
| EP13J-AC3 — all-NORMAL is byte-identical incl. `anchor`/`windowHint` | **Done.** Untagged and NORMAL windows are the same level; the stable sort is the identity on an all-NORMAL day; the plan service attaches `energy` only for non-NORMAL available rows, so the engine input itself is unchanged. | `energy.spec.ts` identity case (`JSON.stringify` equal, fixture includes FLEX_DAY with hints, FIXED pins, overdue and beyond-window work, touching windows); service-level preview equality with a tagged blocked row present; the whole pre-existing scheduler/intervals suite passes unchanged |
| EP13J-AC4 — dialog edits energy with keyboard; calendar shows the level accessibly | **Done.** Native `<select>` "Energy" (High energy / Normal / Low energy) with a hint as accessible description, shown for available windows only, in the dialog's tab order after the times. Calendar: `AVAILABILITY` events carry `subtitle` "High energy"/"Low energy"; the chip renders it as a text tag and appends it to the accessible name. The availability list shows the same text tag. | `AvailabilitySlotForm.test.tsx` (+5 incl. keyboard selection, edit pre-fill, blocked hides/omits, 400 under field; tab-trap order updated), `CalendarEventChip.test.tsx` (+2), `AvailabilitySlotList.test.tsx` (new, 1), `slotLabel.test.ts` (+1) |
| EP13J-AC5 — energy survives the interval algebra | **Done** with option (a) (D-J2): `mergeIntervals` merges only equal levels; overlapping different levels are clipped (earlier keeps its span); `subtractIntervals` keeps each remainder's level; untagged intervals keep their exact pre-EP13J object shape. | `energy.spec.ts`: HIGH 09:00–11:00 touching NORMAL 11:00–13:00 stays two intervals; same-level merge; untagged ≡ NORMAL; overlap clipping; subtraction keeps energy |

## Verification (2026-11-16, worktree branch `hfi/…/elm`, uncommitted state before the commit)

- `apps/api`: `pnpm db:generate` (repo root) OK; `npx jest` → **1104 passed, 0 failed**, 476 skipped (27 DATABASE_URL-gated suites; was 1084). Lint, `tsc --noEmit`, prettier: clean.
- `apps/web`: `pnpm test` → **1264 passed, 0 failed** (111 files; was 1255). Lint, typecheck, `format:write`: clean.
- Not run locally: the migration against a database and the gated suites (availability e2e/data-scoping key lists were updated) — CI-executed.
- Tested state: unit + component (mocked Prisma; jsdom). No browser run; the manual a11y pass for the new field/tag rides with EP13M's collection (TR-E13-14 lists EP13J under DoD 6 only).

## Deviations

1. **Calendar tag via the existing `subtitle` field** instead of a new event key: `subtitle` was already in the contract and rendered nowhere; using it for AVAILABILITY only keeps every pre-EP13J payload identical (NORMAL → null). The chip shows it only for `AVAILABILITY`.
2. **Availability list also shows the tag** — the page where students manage windows; not named by the story but the natural place to see the level.
3. **Gap scan, not slot choice, carries the preference**: a block never straddles two levels, so a run with touching windows of different levels can produce more, shorter blocks than the untagged run (minutes, deficits and pins are identical — asserted). See F-EP13J-03.
4. **D-J rows authored by the implementer** (the story deferred them "to refinement", but D13-14 exempts EP13J from a refiner pass); ratified under the user's grant.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP13J-01 | migration `20261116120000_availability_slot_energy`; gated availability specs | Migration and gated suites not executed locally (no `DATABASE_URL`). | Open — CI, same standing as F-EP13A-03 | CI / reviewer |
| F-EP13J-02 | `scheduler.ts` `isDemanding` | V-13-5 remains unvalidated. `remainingMinutes` is the EP13L-*calibrated* remainder, so calibration can move an assignment across the 120-minute line. Deterministic, but worth a product look. | Accepted as specified (D13-10); validate after landing | Planner (V-13-5) |
| F-EP13J-03 | `intervals.ts`, `scheduler.ts` | Touching windows of different levels split free time, so tagged schedules may be more fragmented (more, shorter blocks). | Accepted (AC5 requires the split); reviewer to judge on real data | Reviewer |
| F-EP13J-04 | `scheduler.ts` | Light work now prefers a LOW window even when it is later in the day than a NORMAL one (e.g. a 22:00 LOW slot over 09:00 NORMAL). That is the AC's preference, but it can push easy work late. | Accepted; a candidate follow-up (see README) | Planner |

## Changed paths

- API: `prisma/schema.prisma`, `prisma/migrations/20261116120000_availability_slot_energy/migration.sql` (new), `src/domain/study-planning/{types.ts, intervals.ts, scheduler.ts, remaining-work.ts, energy.spec.ts (new)}`, `src/modules/availability/{availability.service.ts, dto/create-availability-slot.dto.ts, dto/update-availability-slot.dto.ts, availability.service.spec.ts, availability-e2e.spec.ts, availability-data-scoping.spec.ts}`, `src/modules/calendar/calendar.service.ts`, `src/modules/study-plans/{study-plans.service.ts, study-plans-energy.service.spec.ts (new)}`.
- Web: `src/entities/availability/{model/types.ts, api/availabilityApi.ts}`, `src/features/availability/ui/{AvailabilitySlotForm.tsx, AvailabilitySlotForm.test.tsx, AvailabilitySlotList.tsx, AvailabilitySlotList.test.tsx (new), slotLabel.ts, slotLabel.test.ts}`, `src/features/calendar/ui/{CalendarEventChip.tsx, CalendarEventChip.test.tsx}`, `src/pages/availability/ui/AvailabilityPage.test.tsx`.
- Docs: `docs/stories/EP13/contracts.md`, the EP13J story, `docs/stories/EP13/README.md`, this record, `artifacts/efficiency.md`.

## Correction (2026-11-16, R-EP13-02)

This record dispositioned its unexecuted `DATABASE_URL`-gated suites as
CI-executed. That claim was wrong: `.github/workflows/ci.yml` triggers only on
`main`/`develop`, which never ran for this delivery chain. The suites were
first executed by the combined EP13 review at `210f76c` (red — R-EP13-01) and
are green after the R-EP13-01 fix commit, except the four pre-existing
failures dispositioned as R-EP13-03. Evidence: `artifacts/EP13/review.md` and
the fix commit's record in `history.md`.
