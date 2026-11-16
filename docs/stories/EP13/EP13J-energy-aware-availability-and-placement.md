# EP13J — Energy-Aware Availability and Placement

**Story ID:** EP13J
**Re-lettered:** 2026-11-15 (D13-16; EP13I until the user re-prioritised micro-start ahead of energy — artifacts dated earlier use the old letter)
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Backend + Frontend (one cohesive outcome; split would manufacture children)
**Status:** Implemented — awaiting parent review (2026-11-16). D-J rows proposed at implementation start and ratified (▲ rows under the user's grant). Record: [`artifacts/EP13J/implementation.md`](./artifacts/EP13J/implementation.md)
**Dependencies:** EP13F implemented (placement v2 is the insertion point); EP13G implemented (the anchor partition reads placement output, so energy must not disturb it). D13-10 provisional (V-13-5).
**Reviewed:** 2026-11-15 — ACs revised against shipped EP13F/EP13G behaviour (see *Review note*).

## Plan at a glance

- **What this changes:** an additive `AvailabilitySlot.energy` (HIGH/NORMAL/LOW, default NORMAL) migration, an energy preference inside placement v2 (demanding work → HIGH windows, light → LOW, existing tie-breaks otherwise), and the energy field in the availability dialog and calendar rendering.
- **Why it improves it:** demanding work lands when the student actually has the energy for it instead of at 23:00 Thursday (product). The heuristic is deterministic, additive and survives interval merging, so EP13G's anchor partition is undisturbed (code).
- **Decisions needing you:** none — D-J1…D-J6 ratified 2026-11-16 (▲ rows by user grant: "ratify any decisions needed"). D13-10 stays provisional at epic level pending V-13-5 field validation.
- **How to change this plan:** edit a Ruling cell in the Decisions table below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.


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
  pattern (specified here; no refiner gate — D13-14 lists this story as
  exempt).

**Out of scope:**
- Chronotype onboarding, per-day energy overrides, any learning of energy
  from history (deterministic tags only; MVP AI exclusion stands).

## Source requirement references

- Epic AC-E13-10, AC-E13-14. Shared DoD 1, 2, 3, 4, 6, 8, 9 (DoD 5 and 7 are
  inherited unchanged from the existing availability dialog — see Definition of
  Done). TR-E13-09. D13-10 (V-13-5).

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
(merge only across equal levels — EP13J-AC5's wording), or (b) carry energy as a
parallel map and re-derive each candidate gap's level by intersection. (a)
is the smaller change and keeps one interval algebra; (b) avoids touching a
helper EP06D's save-time re-check also calls — **the choice is the
implementer's, but the behaviour in EP13J-AC5 is not.**

Second interaction, from EP13F/EP13G as shipped: placement v2 scans a day's
gaps **earliest-first** and stops at the first that fits, and EP13G's pin
decision is computed *after* placement from each assignment's horizon
capacity. Energy preference reorders the scan; it must not (i) reorder the
day's *critical* work (feasibility still beats preference, EP13F rule 3),
(ii) change the per-day budget (rule 2), or (iii) change which assignments
pin. EP13J-AC3's byte-identity test covers the all-NORMAL case; the energy cases
need their own determinism assertions.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-J1 (refines D13-10) | What is *demanding* work: (a) `Assignment.type` PAPER/PROJECT/EXAM **or** input `remainingMinutes > 120`, everything else *light*; (b) type only; (c) remaining only. | **(a)** — D13-10 verbatim; read from the run's input (never the shrinking in-run remainder) so it is stable for a whole run. | Ratified (user grant, 2026-11-16) |
| D-J2 | Keeping energy through the interval algebra (EP13J-AC5): (a) energy-aware `mergeIntervals` — merge only equal levels; overlapping windows of different levels: the earlier-starting keeps its span, the later is clipped to start where it ends; (b) a parallel energy map re-derived by intersection. | **(a)** — the Review note's smaller change; one interval algebra; a window without a level is NORMAL, so every pre-EP13J caller is unchanged. | Ratified by default, 2026-11-16 |
| ▲ D-J3 | Preference order inside placement v2: (a) demanding scans HIGH → NORMAL → LOW gaps, light scans LOW → NORMAL → HIGH, earliest-first within a level; *critical* work (rule 3) ignores energy and scans earliest-first; (b) demanding-only preference, light unchanged; (c) hard constraint. | **(a)** — the AC's two preferences, never a constraint; feasibility-critical work keeps EP13F's exact behaviour; with every gap NORMAL the order is the old earliest-first, so EP13J-AC3 identity holds by construction. | Ratified (user grant, 2026-11-16) |
| D-J4 | Energy on *blocked* rows (`isAvailable: false`): (a) stored (column default) but ignored by the engine and hidden in the dialog; (b) rejected by validation. | **(a)** — no new 400 for existing clients; a blocked window has no energy meaning. | Ratified by default, 2026-11-16 |
| ▲ D-J5 | Persisted/public contract: (a) `enum EnergyLevel { HIGH NORMAL LOW }` + `AvailabilitySlot.energy @default(NORMAL)` (additive migration); `energy` optional on POST/PATCH (enum-only 400 `energy must be one of HIGH, NORMAL, LOW`), always present in the slot response; (b) free-text column. | **(a)** | Ratified (user grant, 2026-11-16) |
| D-J6 | UI: (a) an "Energy" native `<select>` (High energy / Normal / Low energy) in the availability dialog, shown for available windows only; calendar availability shows a text tag "High energy" / "Low energy" (NORMAL shows no tag — it is the default and adds noise); (b) a radio group; (c) colour only. | **(a)** — follows the dialog's existing field pattern; text, not colour (EP13J-AC4). | Ratified by default, 2026-11-16 |

Rows are `D-J<n>`; one that refines or overrides a register row says `(refines D13-<n>)` / `(overrides D13-<n>)`. ▲ = material: the implementer stops and asks if still `Proposed`; other rows become `Ratified by default` at implementation start.

## Definition of Done

1. Functional criteria pass (AC-E13-10).
2. DTO validation. 3. Ownership scoping unchanged on availability CRUD.
4. Actionable validation errors. 5. Existing dialog states suffice (tested).
6. Keyboard on the new field. 7. Existing responsive dialog behavior.
8. Automated tests (TR-E13-09). 9. Migration + contract documented.
10–11. Combined EP13 parent review / its "How to verify by hand" section.

## Sizing

- **Outcome:** demanding work lands where the student's brain is; everything else is unchanged by default.
- **Estimate:** 2 requests/tokens.
- **Actual at closeout:** as estimated plus the calendar `subtitle` tag, an availability-list tag and the D-J table; one commit.
- **Model recommendation:** 3 — one field + one deterministic ordering hook; the identity-when-NORMAL test contains the risk.
- **Production files:** `schema.prisma` + migration, availability module DTO/service, `scheduler.ts` ordering hook, availability dialog + calendar tag.
- **Test files:** scheduler/availability specs, dialog component test.
- **Minimal start context:** this story, EP13 README D13-10, EP13F record, availability feature files.
- **Verification:** `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/web test`, lint, typecheck, `pnpm db:generate`.
- **Dependencies:** EP13F. Blocks nothing.
- **Exclusions:** energy learning, per-date overrides, onboarding.

