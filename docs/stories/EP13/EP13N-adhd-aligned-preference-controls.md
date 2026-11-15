# EP13N — ADHD-Aligned Placement Preference Controls

**Story ID:** EP13N
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend (form presentation only — the stored contract and the API are unchanged)
**Status:** Ready (design settled in this story — it exists *because of* the design finding, so the refinement is the story)
**Dependencies:** EP13F implemented (the two keys and the form fields exist).
**Re-sequenced:** 2026-11-15 (D13-17) — moved from after EP13M to **before EP13K**: EP13K adds two more goal preferences, and the named-choice control this story builds is what those must use (EP13K-AC3). Building the pattern first means it is implemented once, not shipped raw and corrected twice.
**Provenance:** User decision 2026-11-15 (D13-15), raised from the EP13F implementation review note and F-EP13F-04's broader concern: a preference lever that quietly makes the app harsher.

## Plan at a glance

- **What this changes:** the study-preferences form only: `densityPercent` becomes a three-option named choice (Relaxed 60 / Balanced 80 / Packed 100, plus an honest Custom for non-preset stored values); `breakMinutes` stays numeric with clearer copy. Stored contract, API and engine unchanged.
- **Why it improves it:** a ratio of an unmeasured quantity is an executive-function trap for the students this app serves; recognition replaces arithmetic (product). The control pattern is reused by EP13K, so the hostile input is removed once, not fixed twice (code).
- **Decisions needing you:** none — D-N1/D-N2 ratified via D13-15 (user, 2026-11-15); D-N3…D-N5 auto-ratify.
- **How to change this plan:** edit a Ruling cell in the Decisions table below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Why this story exists (the problem, documented)

EP13F shipped `densityPercent` as a numeric input labelled **"Fill up to (% of
free time)"** with bounds 50–100. For the users this epic serves, that field
is a trap dressed as a feature:

1. **It demands abstract arithmetic about an unmeasured quantity.** To answer
   "what percent of my free time should be planned?" a student must first
   estimate their free time, then reason about a ratio of it. Executive-
   function research and this epic's own framing (D13-9, EP13E) say the same
   thing: ADHD users stall on open numeric decisions and abandon surfaces
   that demand them. A stalled settings field is worse than no field — it
   adds interface cost while everyone silently keeps the default.
2. **The percent is the implementation's vocabulary, not the student's.** The
   engine thinks in budgets; the student thinks "I want breathing room" or
   "pack my day". The control should speak the second language and translate
   to the first.
3. **The same lever can quietly make the app harsher.** A low density on a
   short availability window produces "not enough time" warnings
   (F-EP13F-04). A student who typed 50 because it *sounded* gentle gets
   *more* deficit warnings, not fewer — the opposite of what the label
   promised. Named options with honest one-line descriptions make the
   trade-off legible at the moment of choice.

`breakMinutes` ("Break between sessions (minutes)") does **not** share the
problem: it is concrete, bounded, and maps to lived experience ("15 minutes
between sessions"). It stays a number.

## Summary

Replace the `densityPercent` numeric input with a **three-option named
choice** — Relaxed / Balanced / Packed — that writes the same integer percent
the contract already stores (60 / 80 / 100). Keep `breakMinutes` as a number
with clearer copy. No API, schema, or engine change: this is purely how the
existing levers are asked.

## Scope

**In scope:**
- `StudyPreferencesForm`: the density input becomes a radio group of three
  named presets; the break input keeps its field with refreshed copy; the
  fieldset's explanatory sentence rewritten in student language.
- Non-preset stored values (set via API or before this story) surface
  honestly as a fourth, pre-selected **"Custom (n%)"** option rather than
  being snapped silently.
- Component/accessibility tests (extends the EP13F form tests).

**Out of scope:**
- Any change to `studyDefaults` keys, bounds, defaults, DTO or engine
  (`densityPercent` remains an integer 50–100 in the bag; EP13F's contract
  is untouched).
- The density-cap deficit wording (F-EP13F-04 / F-EP13F-01) — a backend
  warning-contract question routed separately to the planner.
- The other four duration fields (EP06E's, unchanged).

## Acceptance criteria

1. The density control is a **radio group** with exactly the options
   Relaxed (60), Balanced (80), Packed (100) — plus **Custom (n%)**, shown
   only while the loaded value is none of the three presets. Each named
   option carries a one-line plain-language description; no option shows a
   bare percentage as its primary label.
2. Selecting an option and saving writes the mapped integer through the
   existing `PUT /study-preferences` merge; the response round-trips back
   into the same selection. A custom value is never altered unless the
   student picks a preset.
3. The radio group is keyboard operable with visible focus (arrow keys move
   selection per native radio semantics), the group is labelled, and the
   selected state is never conveyed by colour alone.
4. The break field keeps numeric entry, bounds 0–60, and its validation
   copy; the fieldset copy explains both levers in one sentence each,
   without percentages in the prose.
5. Existing form behaviour (load/retry, save, server-error mapping, status
   announcement) is unchanged and still covered by tests.

## Design decisions (settled here, D13-15)

`D-N1`/`D-N2` refine D13-15 and were ratified by the user with it; the remaining rows auto-ratify at implementation start unless overridden.

| ID | Options considered | Recommended | Why | Ruling |
|---|---|---|---|---|
| D-N1 (refines D13-15) | (a) numeric percent input (status quo); (b) three named presets writing 60/80/100 | **(b)** — Density = radio group: **Relaxed** "Plenty of breathing room — about 60% of your free time." / **Balanced** "Steady but not crowded — about 80%." (default) / **Packed** "Use nearly all your free time — 100%." | Recognition over arithmetic: three named lifestyles replace a ratio estimate. The percent appears only inside the description, as a translation, never as the thing to choose. | **Ratified (user, 2026-11-15, D13-15)** |
| D-N2 (refines D13-15) | (a) snap non-preset values to the nearest preset on load; (b) show a pre-selected Custom (n%) radio that disappears once a preset is saved | **(b)** — Non-preset values render as a pre-selected **Custom (n%)** radio that disappears once a preset is chosen and saved. | Honesty: a stored 73 must not silently become 80 on the next unrelated save. The student sees what is set and may keep it forever. | **Ratified (user, 2026-11-15, D13-15)** |
| D-N3 | (a) presets for break length too; (b) keep numeric with clearer copy | **(b)** — `breakMinutes` stays a numeric field; label **"Break between sessions (minutes)"**, hint `0–60`. | Concrete and intuitive; a preset would remove real control without removing any cognitive load. | Proposed |
| D-N4 | (a) hide both levers behind an "Advanced" disclosure; (b) keep both visible | **(b)** — Both levers stay visible (no "Advanced" disclosure). | The disclosure idea was mooted when the hard field was the percent input; with it gone, hiding one concrete number and one three-way choice would cost discoverability for no relief. | Proposed |
| D-N5 | (a) custom card components; (b) native fieldset/legend + radio inputs styled as cards | **(b)** — Radios are a native `fieldset`/`legend` + `input[type=radio]` group styled as cards, reusing the repo's focus-ring utilities; selection is marked by border + check icon + text, not colour alone. | EP11 a11y conventions (D11-5's non-colour-only rule) with zero new primitives. | Proposed |

## Tests

- Renders the three presets; Balanced selected for the default 80; selecting
  Relaxed/Packed saves 60/100 (PUT body asserted); response reselects.
- A loaded 73 renders a checked `Custom (73%)` option; saving without
  touching the group keeps 73; picking Balanced saves 80 and the custom
  option is gone after reload with 80.
- Keyboard: the group is reachable by Tab, arrows change selection, the
  selection is announced via the native radio semantics.
- Break field: bounds errors unchanged (0–60); copy assertions — the fieldset
  prose contains no `%` and none of the D13-9 blame terms.

## Definition of Done

1. Functional criteria pass. 2. N/A (no new input values beyond the existing
   bounds). 3. N/A. 4. Server errors still mapped per field.
5. Loading/error unchanged. 6. Keyboard. 7. Responsive (cards stack under `sm`).
8. Automated tests. 9. N/A (no contract change).
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** the placement levers ask questions an ADHD student can answer in one glance, with no change to what is stored.
- **Estimate:** 1 request/tokens.
- **Model recommendation:** 3 — one component reshaped, contract untouched.
- **Production files:** `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx`.
- **Test files:** `StudyPreferencesForm.test.tsx` (extend).
- **Verification:** `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13F. **Blocks EP13K** (its goal controls reuse this pattern, D13-17); EP13M indexes it.
- **Exclusions:** warning-contract changes (F-EP13F-01/-04), API/schema.

