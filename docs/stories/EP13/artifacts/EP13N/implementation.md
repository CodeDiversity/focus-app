# EP13N implementation record

**Story:** [EP13N — ADHD-Aligned Placement Preference Controls](../../EP13N-adhd-aligned-preference-controls.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-15
**Commit scope:** `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` (+ its test), EP13N docs/queue updates. Frontend only — no API, schema, engine or stored-contract change (`densityPercent` stays an integer 50–100, `breakMinutes` 0–60, in `preferences.studyDefaults`).

Decisions applied: D-N1, D-N2 (user-ratified with D13-15); D-N3, D-N4, D-N5 ratified by default at implementation start (cells written in the story). Implemented options: break stays numeric with the stated label/hint; both levers visible; native `fieldset`/`legend` + `input[type=radio]` cards using the repo's focus-ring utilities; selection cue = border + check icon + "Selected" text + the native radio dot.

## AC-by-AC outcome

| AC | Outcome | Evidence (`StudyPreferencesForm.test.tsx`, "placement levers" block) |
|---|---|---|
| EP13N-AC1 — radio group with exactly Relaxed (60) / Balanced (80) / Packed (100), plus Custom (n%) only for a non-preset loaded value; one-line descriptions; no bare percentage as a primary label | **Done.** `DENSITY_PRESETS` carries the D-N1 copy verbatim; the group is a nested `fieldset` with legend **Fill level**. Each radio's accessible name is the option name (`aria-labelledby`) and its description the D-N1 sentence (`aria-describedby`), so the percent is a translation, not the choice. `customDensity` state is derived from the last server payload (load or save), yielding a fourth `Custom (n%)` option only when the stored value is not 60/80/100. | "renders the density lever as a labelled radio group…", "gives every named option a plain-language description…" (asserts primary labels match neither `%` nor a digit), "renders a stored non-preset value as a pre-selected Custom (70%)…" |
| EP13N-AC2 — selecting + saving writes the mapped integer through the existing PUT merge; response round-trips to the same selection; custom never altered unless a preset is picked | **Done.** Radios are controlled (`watch`/`setValue` on the existing `densityPercent` field), so the PUT body carries a `number` (asserted) and the unchanged zod bounds still apply. Saving with the Custom option still checked sends the stored value untouched; after a preset is saved, `applyServerState` clears `customDensity` and the Custom option disappears (D-N2). Before saving, the Custom option stays available so the student can return to it. | `it.each` Relaxed/Balanced/Packed → 60/80/100 + reselect; "sends the break field with the chosen preset"; "…keeps it when saving untouched" (PUT body 70); "drops the Custom option once a preset is saved" |
| EP13N-AC3 — keyboard operable, visible focus, labelled group, selected state never colour alone | **Done.** Native radios share `name="densityPercent"`: one tab stop lands on the checked radio, arrow keys move selection (native semantics, exercised via user-event). The card carries `focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2` (the repo's focus-ring utilities; the global `:focus-visible` rule also rings the input). Selection is shown by `border-accent` + `CheckCircle2` icon (`aria-hidden`, `data-icon="selected"`) + the word "Selected" + the native checked dot; screen readers get the native checked state. | "is keyboard operable: Tab reaches the checked radio and arrow keys move the selection"; "marks the selected card by border, check icon and text…"; group located via `getByRole('group', { name: 'Fill level' })` |
| EP13N-AC4 — break field numeric, 0–60, validation copy kept; fieldset prose explains both levers, one sentence each, no percentages | **Done.** Break input unchanged (`type=number`, `min 0`, `max 60`, label "Break between sessions (minutes)", hint `0–60`, message "Must be between 0 and 60."). Fieldset prose: "A break is the gap the plan leaves between one study session and the next. The fill level decides how much of your free time gets planned and how much stays open." | "keeps the break field numeric with the 0–60 bounds message" (61 blocked, 0 accepted); "explains both levers in prose that carries no percentages and no blame terms" (regex `missed|behind|failed|fail|lazy|wrong|should|%` on the fieldset's own `<p>` prose) |
| EP13N-AC5 — load/retry, save, server-error mapping, status announcement unchanged and covered | **Done.** Loading/error cards, `role="status"` announcement, 400 field mapping and generic toast paths are untouched; `densityPercent` server errors now render under the radio group (`aria-describedby` on the group fieldset). The 18 pre-existing tests still pass unchanged. | existing loading/pre-fill/validation/save/a11y blocks (18 tests); new "renders a 400 densityPercent error under the radio group" |

## Verification (2026-11-15)

- `apps/web`: `npx vitest run src/features/study-preferences/ui/StudyPreferencesForm.test.tsx` → **30 passed, 0 failed** (20 before; the two EP13F tests that typed into the numeric density input were replaced, 12 EP13N tests added — net +10).
- `apps/web`: `npx vitest run` → **1220 passed, 0 failed** (107 files). `pnpm lint` (`--max-warnings 0`), `pnpm typecheck`, `pnpm format` (prettier `--check`): clean.
- Red first: the 12 new tests were run against the EP13F form and failed (12 failed / 18 passed) before the component change.
- Tested state: component level with the API module mocked (jsdom, user-event 14 incl. radio arrow walking). No browser run; the manual a11y/visual pass (TR-E13-14: real focus ring, card stacking under `sm`, screen-reader announcement) is **deferred to EP13M**, as the sibling UI stories recorded.

## Deviations (each with why)

1. **Controlled radios instead of `register(...)` on the radio inputs.** react-hook-form compares a radio's string `value` to the field value when resetting; the field is a number here. Driving the cards with `watch('densityPercent')`/`setValue` keeps the field numeric end to end and the schema unchanged, with no custom primitive (D-N5 intent). The break field keeps `register`.
2. **Custom option carries a short description** ("What is saved right now. Pick a named option to change it.") so it matches the card shape of the presets; the story only names the label `Custom (n%)`. The label itself is the story's own copy and is excluded from the "no percent in the primary label" assertion only for this option.
3. **"Selected" text added as the third cue** (D-N5 says "border + check icon + text"). I read "text" as an explicit state word rather than the option label alone; the word is visual-only (the input's accessible name/description come from `aria-labelledby`/`aria-describedby`, and the native checked state is what AT announces).
4. **Break input constrained to `sm:max-w-xs`** rather than the former two-column grid, since the density cards now take a full-width three-column row (stacking to one column under `sm`, DoD-7). Copy/bounds unchanged (D-N3).

## Findings

Findings/deviations: no open findings. The manual a11y evidence (TR-E13-14) is deferred to EP13M per the parent's instruction.

## Changed paths

- `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` — density presets, Custom derivation, radio-card fieldset, lever prose; break input kept.
- `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.test.tsx` — EP13N block (12 tests) replacing the two numeric-density EP13F tests.
- Docs: this record, the EP13N story (Status, D-N3/4/5 rulings, sizing actual), the EP13 README queue (EP13N row, Next substory, EP13K next action), `artifacts/efficiency.md`.
