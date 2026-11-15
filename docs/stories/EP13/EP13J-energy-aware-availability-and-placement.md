# EP13J — Energy-Aware Availability and Placement

**Story ID:** EP13J
**Re-lettered:** 2026-11-15 (D13-16; EP13I until the user re-prioritised micro-start ahead of energy — artifacts dated earlier use the old letter)
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend + Frontend (one cohesive outcome; split would manufacture children)
**Status:** Ready
**Dependencies:** EP13F implemented (placement v2 is the insertion point); EP13G implemented (the anchor partition reads placement output, so energy must not disturb it). D13-10 provisional (V-13-5).
**Reviewed:** 2026-11-15 — ACs revised against shipped EP13F/EP13G behaviour (see *Review note*).
**Jira key:** Pending creation

## Summary

ADHD energy is not uniform across the day; the scheduler currently treats
09:00 Monday and 23:00 Thursday as equal. This story lets students tag
availability windows with an energy level (`HIGH`/`NORMAL`/`LOW`, default
`NORMAL` — additive migration) and teaches placement v2 to prefer HIGH
windows for demanding work (assignment type PAPER/PROJECT/EXAM or remaining
> 120 min — D13-10 provisional) and LOW windows for light work, with the
existing deterministic tie-breaks deciding everything else. The availability
dialog gains the energy field; the calendar's availability rendering shows
the tag.

## Scope

**In scope:**
- Migration: `AvailabilitySlot.energy EnergyLevel @default(NORMAL)`.
- Engine: energy-aware candidate ordering inside placement v2 (preference,
  never a hard constraint — feasibility always wins; LOW windows are still
  used when needed).
- Availability CRUD (DTO/validation) + dialog field + calendar tag rendering.
- Tests (TR-E13-09); the small UI follows the existing availability dialog
  pattern (specified here; no ui-refiner gate — D13-14 lists this story as
  exempt).

**Out of scope:**
- Chronotype onboarding, per-day energy overrides, any learning of energy
  from history (deterministic tags only; MVP AI exclusion stands).

## Source requirement references

- Epic AC-E13-10, AC-E13-14. Shared DoD 1, 2, 3, 6, 8, 9. TR-E13-09.

## Acceptance criteria

1. Energy round-trips through availability CRUD with validation (enum only;
   default NORMAL preserves existing rows and clients).
2. Demanding work (D13-10 rule) is placed into HIGH windows when a feasible
   HIGH gap exists; light work prefers LOW; placement remains deterministic
   (stable tie-breaks) and never sacrifices feasibility or the v2 rules
   (breaks/density/min-max) to energy preference.
3. With all slots NORMAL (the default), output is byte-identical to
   pre-EP13J placement — **including every session's `anchor` and
   `windowHint`** (EP13G), not just its date/time/duration. The feature is
   strictly opt-in and the identity test is the safety net.
4. The availability dialog edits energy with keyboard support; the calendar
   availability rendering shows the level accessibly (not color-only).
5. **Energy survives the interval algebra**: a free interval never spans two
   windows of different energy levels. Touching windows of the *same* level
   still merge (today's behaviour); touching windows of *different* levels
   stay separate, so a placed block's energy is always unambiguous. Proven
   by a test with a `HIGH` 09:00–11:00 window touching a `NORMAL`
   11:00–13:00 window.

## Tests (TR-E13-09)

- Migration default; DTO validation matrix.
- Engine: demanding→HIGH preference, light→LOW preference, feasibility
  override, all-NORMAL identity, determinism across runs.
- Dialog field round-trip + keyboard; calendar tag rendering (a11y: text or
  icon, not color-only).

## Technical notes

- **Inspected (2026-11-14):** `AvailabilitySlot` schema (311–324: no energy
  field); availability feature per code baseline (dialog-based CRUD).
- **Proposed:** enum + column; energy enters the engine as window metadata on
  `freeIntervals` inputs; candidate gaps sorted (energy match, then existing
  earliest-first order). "Demanding" classification is a pure function with
  V-13-5 marking the heuristic for post-landing validation.

### Review note (2026-11-15) — the merge hazard this story must solve

`intervals.ts` → `mergeIntervals` merges **touching** intervals
(`interval.startMinute <= last.endMinute`), and `freeIntervals` runs the
student's declared windows through it before any subtraction. Two adjacent
availability windows therefore collapse into one free interval **today**:
a `HIGH` 09:00–11:00 beside a `NORMAL` 11:00–13:00 becomes a single
09:00–13:00 gap with no energy provenance left to read. Any implementation
that "attaches energy to the window" and then calls `freeIntervals`
unchanged will silently lose the tag exactly in the case the feature exists
for.

The implementer must therefore either (a) make the merge energy-aware
(merge only across equal levels — AC-5's wording), or (b) carry energy as a
parallel map and re-derive each candidate gap's level by intersection. (a)
is the smaller change and keeps one interval algebra; (b) avoids touching a
helper EP06D's save-time re-check also calls — **the choice is the
implementer's, but the behaviour in AC-5 is not.**

Second interaction, from EP13F/EP13G as shipped: placement v2 scans a day's
gaps **earliest-first** and stops at the first that fits, and EP13G's pin
decision is computed *after* placement from each assignment's horizon
capacity. Energy preference reorders the scan; it must not (i) reorder the
day's *critical* work (feasibility still beats preference, EP13F rule 3),
(ii) change the per-day budget (rule 2), or (iii) change which assignments
pin. AC-3's byte-identity test covers the all-NORMAL case; the energy cases
need their own determinism assertions.

## Definition of Done

1. Functional criteria pass (AC-E13-10).
2. DTO validation. 3. Ownership scoping unchanged on availability CRUD.
4. Actionable validation errors. 5. Existing dialog states suffice (tested).
6. Keyboard on the new field. 7. Existing responsive dialog behavior.
8. Automated tests (TR-E13-09). 9. Migration + contract documented.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** demanding work lands where the student's brain is; everything else is unchanged by default.
- **Estimate:** 2 requests/tokens.
- **Model recommendation:** 3 — one field + one deterministic ordering hook; the identity-when-NORMAL test contains the risk.
- **Production files:** `schema.prisma` + migration, availability module DTO/service, `scheduler.ts` ordering hook, availability dialog + calendar tag.
- **Test files:** scheduler/availability specs, dialog component test.
- **Minimal start context:** this story, EP13 README D13-10, EP13F record, availability feature files.
- **Verification:** `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/web test`, lint, typecheck, `pnpm db:generate`.
- **Dependencies:** EP13F. Blocks nothing.
- **Exclusions:** energy learning, per-date overrides, onboarding.

## Tracker reference

Jira key: Pending creation (no sync authorized).
