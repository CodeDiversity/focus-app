# EP13F — ADHD-Aware Placement Engine v2

**Story ID:** EP13F
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend (pure domain module)
**Status:** Ready
**Dependencies:** EP13A implemented (corrected remaining-work inputs). No UI decisions.
**Jira key:** Pending creation

## Summary

Redesign placement inside EP06's pure engine. Today `schedule()` packs
fixed-length blocks back to back, lets one assignment fill a day to the cap
before the next is considered, front-loads everything, never reads
`minSessionMinutes`/`maxSessionMinutes` (D06-20), and can place sub-minimum
tail blocks. For ADHD users that produces exactly the plans they won't
follow. Placement v2 (shared-contract rules 1–5): breaks between consecutive
sessions, a per-day density cap on free time, deterministic interleaving of
assignments, and honored min/max lengths with tail merge-or-drop. The engine
stays pure and deterministic; EP08's `replan` passes through unchanged. The
dead `minSessionMinutes`/`maxSessionMinutes` preferences become live levers,
and the `studyDefaults` bag gains `breakMinutes`/`densityPercent` (D13-5)
with defensive-reader fallback.

## Scope

**In scope:**
- `scheduler.ts` placement rewrite implementing rules 1–5 of the README's
  Placement v2 contract.
- `preferences.ts`: additive `breakMinutes` (15, 0–60) and `densityPercent`
  (80, 50–100) keys — defaults, bounds, validator and defensive reader, same
  D06-4 style; preferences API/DTO and the profile form gain the two fields
  (the form extension follows the existing `StudyPreferencesForm` pattern —
  small supporting edit, not a separate story).
- Deficit reporting extended: work dropped by the density cap or tail rule is
  reported in the existing deficit categories (no silent loss).
- Unit tests (TR-E13-06).

**Out of scope:**
- Flex anchors (EP13G). Energy preferences (EP13I — it hooks into v2's
  candidate ordering). Calibration (EP13L). Any scheduling UI.

## Source requirement references

- Epic AC-E13-06, AC-E13-07, AC-E13-08, AC-E13-14. Shared DoD 1, 2, 8, 9.
- TR-E13-06. EP06 D06-20 (min/max deliberately unread — now superseded).

## Acceptance criteria

1. Consecutive placed sessions on a day are separated by ≥ `breakMinutes`;
   breaks are consumed free time, not stored rows.
2. Placed minutes per day ≤ `densityPercent`% of that day's free minutes and
   ≤ `dailyCapMinutes`; capacity lost to the cap appears in deficit warnings
   when it makes work infeasible.
3. Within a day, blocks round-robin across schedulable assignments (ordering
   comparator defines the rotation); interleaving never pushes any assignment
   past feasibility — the fallback to deadline order is tested.
4. Every placed block is within [`minSessionMinutes`, `maxSessionMinutes`];
   a sub-minimum tail merges into the previous block (≤ max) or lands in the
   deficit report — never placed.
5. Purity and determinism preserved: no clock/randomness; identical inputs →
   byte-identical output; EP08 `replan` and all existing EP06/EP08 suites
   pass against the new placement (updated expectations are part of this
   story).

## Tests (TR-E13-06)

- Each rule in isolation + combined scenarios (break+cap+interleave on one
  day); property-style determinism check (repeated runs).
- Tail merge vs drop boundaries; min=max edge; break=0 edge; density=100
  reproduces cap-only behavior.
- Feasibility-over-variety negative case (interleaving would miss a
  deadline → deadline order wins, warning emitted).
- Preferences: defaults/bounds/defensive-reader cases for the two new keys;
  bag regression (existing keys untouched, 4096-byte cap).
- Purity (no `@nestjs/*`/Prisma imports), EP08 replan pass-through.

## Technical notes

- **Inspected (2026-11-14):** `preferences.ts` (full read — keys, bounds,
  validator, reader steps); `scheduler.ts`/`intervals.ts`/`ordering.ts` per
  the EP08 README code baseline (greedy earliest-gap placement, one
  assignment at a time, D06-3 window).
- **Proposed:** placement loop becomes day-centric: for each day, alternate
  assignments (rule 3) while budget (rule 2) and gaps (rule 1) allow, blocks
  sized by rule 4. The 7-day window and ordering comparator are unchanged.
- This story intentionally changes saved-plan shapes' *contents* (not their
  schema); EP13M's E2E and the updated unit expectations are the safety net.

## Definition of Done

1. Functional criteria pass (AC-E13-06/07/08/14).
2. Invalid input: new preference keys validated at the existing API boundary.
3. N/A (pure module; scoping at service). 4. Existing error contracts.
5–7. N/A (backend; the small profile-form fields follow existing tested
   patterns and get component tests).
8. Automated tests (TR-E13-06).
9. Preference-contract doc updated (new keys, defaults, bounds).
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** generated plans have breaks, bounded density, variety and honored session-length bounds — deterministically.
- **Estimate:** 3 requests/tokens (cohesive multi-milestone: engine rewrite → preference keys → suite reconciliation), checkpointed per [checkpoint execution](../../../.agents/checkpoint-execution.md).
- **Model recommendation:** 5 — placement-algorithm redesign with determinism/feasibility invariants and a large existing test surface to reconcile.
- **Production files:** `apps/api/src/domain/study-planning/scheduler.ts`, `preferences.ts`, `types.ts`; preferences DTO/service touch; `StudyPreferencesForm.tsx` (two fields).
- **Test files:** `scheduler.spec.ts`, `preferences.spec.ts` (extend), affected EP06/EP08 specs.
- **Minimal start context:** this story, EP13 README Placement v2 + D13-5/6, `scheduler.ts`, `intervals.ts`, `ordering.ts`, `preferences.ts`, EP13A record.
- **Verification:** `pnpm --filter @studypilot/api test`, lint, typecheck; `pnpm --filter @studypilot/web test` (form fields).
- **Dependencies:** EP13A. Blocks EP13G, EP13I.
- **Exclusions:** flex anchors, energy ordering, calibration, UI beyond the two form fields.

## Tracker reference

Jira key: Pending creation (no sync authorized).
