# EP17G — Plan-time pacing controls

**Story ID:** EP17G
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Frontend
**Status:** **Needs refinement** (D17-11) — preset naming, copy and the inline-write affordance are UI/UX decisions the refiner grounds.
**Dependencies:** EP17F. ▲ D17-2 decides whether a study-days control appears here at all.

## Plan at a glance

- **What this changes:** the spread levers become reachable **from the proposal**. A student who looks at a crowded week picks a named preset ("Spread out" / "Balanced" / "Packed", labels to be refined) — and optionally how many days a week they want to study — and the week re-plans in front of them. The same controls are added to the Profile preferences form, so there is one contract and two entrances.
- **Why it improves it:** today there is no path at all from a plan you dislike to the knob that would fix it; the only editing surface is Profile (`ProfilePage.tsx:221`), two navigations and a mental map away. Giving the lever to the student at the moment they notice the problem is the difference between "this app doesn't understand me" and "I fixed it" (product). Reusing the existing preset-card pattern (`StudyPreferencesForm.tsx:98-115`, EP13N D-N1) means one component, one contract, and no third spelling of the same choice (code).
- **Decisions needing you:** ▲ D17-8 (a preference write from a preview surface, with an immediate re-preview) — epic register, still Proposed. ▲ D-G1 below (whether the change is persisted or proposal-only) refines it.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Add a small, labelled pacing control group to the proposal surface that
writes the spread preference through the existing
`PUT /study-preferences` and immediately re-previews, replacing the proposal
in place. Mirror the same control(s) in `StudyPreferencesForm` so Profile and
the proposal agree. No new endpoint, no new contract — EP17A already defined
the keys and EP17D already puts the effective values on the proposal payload.

## Scope

**In:** the proposal's pacing control group, the write + re-preview flow and
its states, the `StudyPreferencesForm` additions, and the tests for both.

**Out:** any new API (the existing merge endpoint is used); changing what the
presets mean (EP17A owns the values); the proposal's composition (EP17F); the
momentum goal controls already on the form.

## Source requirement references

AC-E17-08, AC-E17-07 (the UI half), AC-E17-13; TR-E17-04 (the client half),
TR-E17-05, TR-E17-06; DoD-1, DoD-2, DoD-4, DoD-5, DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. From the proposal, a student can change the spread preset and — under
   ▲ D17-2 option (a) — the number of study days, and the proposed week is
   re-planned and re-rendered without leaving the surface and without losing
   their place in the flow. The control shows the currently effective value,
   read from the payload's `pacing` block.
2. The change is explicit about what it does: the control is labelled, its
   effect is stated in one sentence, and the result is announced once in a
   polite live region ("Replanned — spread across 4 days"). Under ▲ D-G1 (a)
   the copy also makes clear that the choice is saved for next time.
3. While the re-preview is in flight the surface shows a busy state, the
   confirm is disabled, and a failed re-preview leaves the **previous**
   proposal intact with an actionable error — a student never ends up with no
   plan on screen because a preset change failed.
4. `StudyPreferencesForm` gains the same control(s), using the existing
   preset-card pattern with the honest **Custom** option for a stored value
   that is none of the presets (EP13N D-N2), the same validation messages,
   and the same contract; saving from either surface produces the same stored
   bag.
5. Keyboard operability, visible focus, reduced motion and WCAG 2.2 AA hold;
   the preset group is a labelled radio-style group, not a set of unrelated
   buttons; no copy uses a forbidden word (D13-9).

## Tests

- choosing a preset on the proposal issues one `PUT /study-preferences` with
  only the changed key and then one re-preview; the new week renders
  (EP17G-AC1).
- the control reflects the effective value from `pacing` on first render,
  including a value that is none of the presets (EP17G-AC1, boundary).
- the busy state disables the confirm; a failed re-preview keeps the previous
  proposal and shows an actionable error with a retry (EP17G-AC3, negative).
- a failed `PUT` does not re-preview and does not change the control's
  displayed value (EP17G-AC3, negative).
- the announcement fires once per change, not per render (EP17G-AC2).
- `StudyPreferencesForm`: the new field saves, validates out-of-range input
  with the field-level message, shows **Custom** for an off-preset stored
  value, and leaves every other field untouched on save (EP17G-AC4).
- keyboard: arrow-key navigation within the preset group, focus visible,
  group has an accessible name (EP17G-AC5).
- copy audit over every new string (EP17G-AC5).

## Technical notes

- Inspected: `StudyPreferencesForm.tsx` — `DENSITY_PRESETS` `:104-110`
  (Relaxed / Balanced / Packed with descriptions), `isPreset` `:114`,
  `withCustom` `:133-141` (EP13N D-N2's honest Custom), `PresetField`
  `:155`, the field wiring at `:480-516`, and the zod schema `:54-66`. The
  spread preset is a fourth `PresetField` of the same shape; the study-days
  control, under ▲ D17-2 (a), is the **existing** `weeklyGoalDays` preset
  field with changed copy, not a new control.
- Inspected: `ProfilePage.tsx:221` mounts the form — unchanged.
- Inspected: `PlanProposal.tsx` keeps its proposal in `useProposal` with a
  `load()` re-preview already exposed (`:62`, used by the rolled-over banner
  `:136` and the error card `:164`) — the re-preview path exists; this story
  reuses it rather than adding one.
- **Proposed:** the write uses the existing RTK Query preferences mutation if
  one exists in `features/study-preferences/api/`; otherwise the form's
  existing client. The implementer confirms and does **not** add a second
  client.
- Caution: this is a **write from a preview surface**. Nothing is saved to
  the student's *plan*, but something is saved to their *preferences* — the
  copy must not blur the two, and the confirm must stay the only thing that
  changes the plan.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-G1 | Persistence of a plan-time change (refines ▲ D17-8): (a) it **saves** the preference and re-previews — one lever, one meaning, and next week is better too; (b) it applies to this proposal only and is discarded on leaving; (c) it saves but asks first | **(a)** — (b) means the student fixes the same week every week and the Profile value silently disagrees with what they keep choosing; (c) adds a confirmation dialog to a reversible change. The copy must say it is saved (EP17G-AC2), and Profile remains the place to change it back. ▲ — persisted data and user-visible workflow | Proposed |
| D-G2 | Which controls appear on the proposal: (a) the spread preset **and** the study-days count; (b) the spread preset only, with a link to Profile for the rest | **(a)** under ▲ D17-2 (a) — the two together are the week's shape, and showing one without the other invites "why is it still only using 3 days?". Collapses to (b) automatically if ▲ D17-2 rules (c) | Proposed |
| D-G3 | Placement on the surface: (a) inside EP17F's summary region, directly under the pacing sentence that describes the problem; (b) in the demoted disclosure; (c) a separate card at the bottom | **(a)** — the sentence states the symptom and the control is the cure; separating them re-creates the "no path from the plan to the knob" defect at a smaller scale | Proposed |
| D-G4 | Re-preview scope: (a) re-run the whole proposal through the existing `load()`, discarding in-flight session edits, and **say so** before the change; (b) try to preserve edits across a re-plan | **(a)** — the engine is free to place sessions anywhere, so "preserving" edits would silently reapply them to different sessions. One honest sentence beats a plausible-looking wrong merge | Proposed |

## Definition of Done

DoD-1, DoD-2 (bounds enforced client-side and server-side), DoD-4
(actionable error on a failed write or re-preview), DoD-5, DoD-6, DoD-7,
DoD-8. DoD-3 — the write is the existing `@CurrentUser()`-scoped endpoint, no
new read. DoD-9 N/A (no API change). DoD-10/11 at the parent review.

## Sizing

- **Outcome:** a student who dislikes the proposed week can change its shape
  where they are standing, and the change sticks.
- **Actual at closeout:** tbd.
- **Files:**
  `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx`, a **new**
  pacing-controls component + test in the same folder,
  `features/plan-proposal/model/useProposal.ts`,
  `features/study-preferences/ui/StudyPreferencesForm.tsx` and its test,
  `features/study-preferences/api/*` (reuse only).
- **Start context:** this story,
  [contracts.md §2 and §5](./contracts.md#2-the-spread-preference-levers-ep17a-owns-the-definition),
  `StudyPreferencesForm.tsx:90-160` and `:470-520`, `PlanProposal.tsx`,
  `useProposal.ts`.
- **Verification:**
  `pnpm --filter @studypilot/web test -- plan-proposal study-preferences`
  green; a manual pass of the write + re-preview flow recorded.
- **Dependencies / exclusions:** needs EP17F's composition for its slot and
  EP17A/EP17D for the contract and the effective values. E2E coverage is
  EP17H.
