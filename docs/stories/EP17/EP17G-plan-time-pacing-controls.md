# EP17G — Plan-time pacing controls

**Story ID:** EP17G
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Frontend
**Status:** **Ready for implementation** — preset naming, the inline-write affordance, the announcement and the ▲ D17-2 copy obligation are settled below. One copy question is returned to the user at D-G5, with a grounded recommendation that is safe to build.
**Dependencies:** EP17F. ▲ D17-2 is **Ruled (a)** (user, 2026-11-19) with a proviso this story owns: the study-days control **must** appear and be visibly surfaced with its new instruction meaning — its copy states that the number now steers the planner.
**Refined:** 2026-11-19

## Plan at a glance

- **What this changes:** the spread levers become reachable **from the proposal**. Under the pacing sentence sits one small toggle, **Change the pace**, holding two named-choice groups: **How your week is paced** (*As early as possible* / *A little each day* / *Evenly spread*, writing `spreadPercent` 0 / 70 / 100) and **Study days a week** (the existing `weeklyGoalDays` choices, re-labelled to say the number now steers the planner). Choosing an option saves the preference and rebuilds the week in place, announced once. The same two groups appear on the Profile preferences form, sharing one extracted `shared/ui/PresetRadioGroup` so there is one component and one contract.
- **Why it improves it:** today there is no path at all from a plan you dislike to the knob that would fix it; the only editing surface is Profile (`ProfilePage.tsx:221`), two navigations and a mental map away. Giving the lever to the student at the moment they notice the problem is the difference between "this app doesn't understand me" and "I fixed it" (product). Extracting `PresetRadioGroup` — today an in-file component at `StudyPreferencesForm.tsx:155` — means the proposal and Profile cannot spell the same choice two ways (code).
- **Decisions needing you:** none that block. **Binding obligation (▲ D17-2 proviso, user, 2026-11-19):** this story surfaces the study-days control visibly with its new meaning, on the proposal (D-G2 (a)) and on the Profile form, with copy stating that the number instructs the planner. ▲ D-G5 (the preset labels) is **Ruled (a) (user, 2026-11-19)** — "As early as possible / A little each day / Evenly spread". D-G6…D-G9 are refiner additions, `Proposed`, none material.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Add one small, labelled pacing control group to the proposal surface. It
writes the spread preference through the existing `PUT /study-preferences`
and immediately rebuilds the proposal in place. Mirror the same controls on
`StudyPreferencesForm` so Profile and the proposal agree, and change the
existing `weeklyGoalDays` group's copy so the number's new planning meaning
is visible (▲ D17-2's proviso). No new endpoint and no new contract — EP17A
already shipped `spreadPercent` end to end (including
`StudyPreferences.spreadPercent?` in
`entities/study-preferences/model/types.ts`) and EP17D puts the effective
values on the proposal payload.

## Scope

**In:** `features/plan-proposal/ui/PacingControls.tsx` (new, + test); the
extraction of `PresetRadioGroup`, `isPreset` and `withCustom` from
`StudyPreferencesForm.tsx` into `shared/ui/PresetRadioGroup.tsx` (new, +
test); the save-then-replan flow and its states; a non-destructive `replan()`
in `useProposal.ts`; the `spreadPercent` field and the re-worded
`weeklyGoalDays` group on `StudyPreferencesForm.tsx`; the tests for all of
them.

**Out:** any new API (the existing merge endpoint is reused, with no second
client); changing what the presets *mean* or their bounds (EP17A owns the
values); the proposal's composition and the `Disclosure` primitive (EP17F —
EP17G fills the slot EP17F reserved); the `dailyGoalMinutes` momentum
control (untouched); preserving in-flight session edits across a replan
(explicitly rejected, D-G4); naming specific weekdays (BL-17-02).

**Note on an earlier exclusion:** the planner's draft put "the momentum goal
controls already on the form" out of scope. That is narrowed here —
`weeklyGoalDays` is **in** scope for its copy, because ▲ D17-2's proviso
requires it; `dailyGoalMinutes` remains out.

## Source requirement references

AC-E17-07 (the UI half), AC-E17-08, AC-E17-13; TR-E17-04 (the client half),
TR-E17-05, TR-E17-06; DoD-1, DoD-2, DoD-3, DoD-4, DoD-5, DoD-6, DoD-7,
DoD-8.

## Acceptance criteria

1. From the proposal, under the pacing sentence, a student can change the
   spread preset **and** the number of study days, and the proposed week is
   rebuilt and re-rendered without leaving the surface. Both groups show the
   currently effective value read from the payload's `pacing` block
   (`spreadPercent`, and `studyDays.length` for the day count), and show an
   honest **Custom** option when a stored value is none of the presets
   (EP13N D-N2).
2. The controls are explicit about what they do **before** the change: the
   group is labelled, one sentence under it states that choosing an option
   saves it and rebuilds this week from scratch (D-G1, D-G4), and the result
   is announced once in a polite live region — "New week ready — a little
   each day, across 3 days."
3. While the save and rebuild are in flight the controls are disabled, the
   proposal region is `aria-busy`, and the confirm is disabled. A failed
   `PUT` does not rebuild, restores the previously selected option and shows
   an actionable inline error with a **Try again** control. A failed rebuild
   leaves the **previous** proposal intact and editable with the same
   actionable error — a student never ends up with no plan on screen because
   a preset change failed.
4. `StudyPreferencesForm` gains the spread group with the same labels and
   descriptions as the proposal, the honest **Custom** option, field-level
   validation messages for an out-of-range stored value, and the same
   contract; and its existing `weeklyGoalDays` group states the planning
   meaning (▲ D17-2 proviso). Saving from either surface produces the same
   stored bag, and no other preference field is changed by either write.
5. Keyboard operability, visible focus, reduced motion and WCAG 2.2 AA hold:
   each group is a native `fieldset`/`legend` with radios, arrow keys move
   the selection, the selected card carries the "Selected" text cue (never
   colour alone), targets are 44 px below `sm`, and every new string passes
   the copy audit — which forbids the `%` character outright
   (`src/test/forbiddenWords.ts`), so no preset description translates the
   lever into a percentage on the proposal.

## Tests

New `apps/web/src/features/plan-proposal/ui/PacingControls.test.tsx` and
`apps/web/src/shared/ui/PresetRadioGroup.test.tsx`; updates to
`StudyPreferencesForm.test.tsx`, `PlanProposal.test.tsx` and
`useProposal.test.ts`.

- `choosing a spread preset issues one PUT /study-preferences carrying only
  spreadPercent and then one re-preview; the new week renders` (EP17G-AC1).
- `choosing a study-days option issues one PUT carrying only weeklyGoalDays`
  (EP17G-AC1).
- `both groups reflect the effective values from the pacing block on first
  render` (EP17G-AC1), boundary `an off-preset stored spread renders the
  Custom option pre-selected` (EP13N D-N2).
- `the explanatory sentence is present before any change is made`
  (EP17G-AC2).
- `the announcement fires once per change, not once per render` (EP17G-AC2).
- Negative: `a failed PUT does not re-preview, keeps the previous selection
  and shows an actionable error with Try again` (EP17G-AC3).
- Negative: `a failed rebuild keeps the previous proposal rendered and
  editable, with phase still ready` (EP17G-AC3) — `useProposal.test.ts`
  covers `replan()` directly.
- `while in flight the groups are disabled, the region is aria-busy and Use
  this plan is disabled` (EP17G-AC3).
- `StudyPreferencesForm`: `saves the spread preset and leaves every other
  field untouched`; `shows Custom for an off-preset stored spread`;
  `surfaces the field-level message for an out-of-range value`; `the study
  days group states that the number steers the planner` (EP17G-AC4,
  AC-E17-07).
- `PresetRadioGroup.test.tsx`: `arrow keys move the selection`; `the group
  has an accessible name from its legend`; `the selected card carries a text
  cue as well as a colour`; `renders a 44px target below sm`; `is disabled as
  a whole when disabled` (EP17G-AC5).
- `the copy audit passes over the proposal with the controls open and
  closed`, including the `%` check (EP17G-AC5, TR-E17-05).

## Technical notes

**Inspected (2026-11-19, HEAD `3d10130`).**

### Copy — the concrete strings

Spread group, `spreadPercent` (bounds `0…100`, default `70`,
[contracts §2](./contracts.md#2-the-spread-preference-levers-ep17a-owns-the-definition)):

| Value | Label | Description |
|---|---|---|
| `0` | **As early as possible** | Fit everything into the first days that have room. |
| `70` | **A little each day** | Share each piece of work across the days you have. The default. |
| `100` | **Evenly spread** | Give every study day about the same amount. |

Legend: **How your week is paced**. Group sentence (shown before any
change, EP17G-AC2 / D-G4): *"Choosing one saves it for next time and builds
this week again from scratch — any tweaks you've made here start over."*

Study-days group, `weeklyGoalDays` (bounds `1…7`, default `3`) — the
existing `GOAL_DAY_PRESETS` values (2 / 3 / 5) and labels (*Light* /
*Steady* / *Most days*) are kept; only the framing changes, which is the
smallest change satisfying the ▲ D17-2 proviso:

- Legend: **"Weekly goal"** → **"Study days a week"**.
- New description under the legend, on **both** surfaces: *"Your plan uses
  at most this many days of the week, and it's the number of days you're
  aiming to show up."*
- On Profile, the "Your goals" paragraph (`StudyPreferencesForm.tsx`'s
  momentum fieldset) drops its weekly clause, which now lives on the group
  itself; `dailyGoalMinutes` keeps its own copy unchanged.

Announcement (EP17G-AC2), built after the rebuild settles from the new
`pacing` block: `New week ready — ${label.toLowerCase()}, across
${pacing.studyDays.length} ${days}.` → *"New week ready — a little each day,
across 3 days."* One day reads *"across 1 day"*.

Errors (DoD-4, no forbidden word, actionable): failed write →
*"We couldn't save that choice. Try again."*; failed rebuild →
*"We saved your choice but couldn't rebuild the week. Your current plan is
still here."* plus a **Try again** button calling `replan()`.

No string contains `%`, "missed", "behind", "overdue", "failed" or "late".

### Component extraction and placement

- `StudyPreferencesForm.tsx` inspected: `DENSITY_PRESETS` `:104-110`,
  `isPreset` `:113-114`, `GOAL_MINUTE_PRESETS` `:118`, `GOAL_DAY_PRESETS`
  `:123`, `CUSTOM_DESCRIPTION` `:128`, `withCustom` `:131-141`, `FIELD_NAMES`
  `:143`, the in-file `PresetRadioGroup` `:155-241` (native
  `fieldset`/`legend`, radio cards, `focus-within` ring, the "Selected" text
  cue, the explicit radio size reset against the global `input` base rule),
  the field wiring `:480-516`, and the zod schema `:25-82`.
- `PresetRadioGroup`, `Preset`, `isPreset`, `CUSTOM_DESCRIPTION` and
  `withCustom` move verbatim to **`apps/web/src/shared/ui/PresetRadioGroup.tsx`**
  (D-G7). One signature change: `name` widens from the local
  `PresetField` union to `string`, since the proposal's groups are not form
  fields. `StudyPreferencesForm` imports them and otherwise behaves
  identically — its existing tests are the regression guard. `shared/` may
  not import from `features/` (`apps/web/.eslintrc.cjs:56-62`), and the
  moved code imports only `clsx` and `lucide-react`, so the move is legal
  as-is. A sibling-feature import from `plan-proposal` into
  `study-preferences` is avoided entirely by the move.
- `PacingControls.tsx` (new, `features/plan-proposal/ui/`) renders the two
  `PresetRadioGroup`s, the explanatory sentence, its own polite live region
  and its inline error. Props:
  `{ pacing: PlanPacing; onChanged: () => Promise<void>; disabled?: boolean }`.
- Placement (D-G3 (a), presentation refined by D-G8): the component renders
  inside EP17F's heading region, directly under the pacing sentence, wrapped
  in EP17F's `shared/ui/Disclosure` labelled **"Change the pace"** —
  `defaultOpen={useMediaQuery(MD_UP_QUERY, false)}`, i.e. open at `md`+ and
  collapsed below. Same location as ruled; one tap of progressive disclosure
  so a phone still shows summary → week → decide.
- The spread group's zod field on the form:
  `spreadPercent: z.number().int(INTEGER_MSG).min(0, SPREAD_MSG).max(100,
  SPREAD_MSG)` with `SPREAD_MSG = 'Must be between 0 and 100.'`, matching the
  existing message style; `spreadPercent: 70` joins `DEFAULTS` and
  `FIELD_NAMES`, and `applyServerState` gains a `customSpread` branch beside
  the three existing ones.

### The write and the rebuild

- The client already exists: `entities/study-preferences/api/studyPreferencesApi.ts`
  exports `putStudyPreferences(payload: Partial<StudyPreferences>)` over the
  shared axios transport (D404-10 — no RTK Query here). `PacingControls`
  calls it directly with **only** the changed key; the server merges
  (contracts §2 invariant 2). **No second client is added.** DoD-3 is
  satisfied by reuse: the endpoint is the existing `@CurrentUser()`-scoped
  `PUT /study-preferences`.
- **A real gap in the existing hook.** `useProposal.load()`
  (`useProposal.ts:48-64`) sets `phase: 'loading'` and, on failure, runs
  `setPreview(null); setEdited([]); setPhase('error')`. Reusing it for the
  rebuild would **violate EP17G-AC3** — a failed rebuild would wipe the
  proposal off the screen, which is precisely the outcome that AC forbids.
  EP17G therefore adds a sibling to the hook:

  ```ts
  replan(): Promise<void>   // sets isReplanning, keeps preview/edited on failure,
                            // sets replanError, leaves phase 'ready'
  ```

  returning `{ ..., replan, isReplanning, replanError, clearReplanError }`.
  `load()` is unchanged, so the mount path, **Try again** and **Create new
  plan** keep today's behaviour and today's tests.
- Flow on selection: optimistic UI is **not** used — set `isReplanning`,
  disable the groups and the confirm, `await putStudyPreferences({ key })`,
  then `await replan()`, then announce once. The live region is written only
  at the end; the in-flight state is carried by `aria-busy` and the disabled
  controls, so a screen reader hears one message per change, not two
  (EP17G-AC2).
- This is **a write from a preview surface.** Nothing is saved to the
  student's *plan*; something is saved to their *preferences*. The copy above
  keeps the two apart, and **Use this plan** remains the only control that
  changes the plan.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-G1 | Persistence of a plan-time change (refines ▲ D17-8): (a) it **saves** the preference and re-previews; (b) it applies to this proposal only; (c) it saves but asks first | **(a)** — (b) means the student fixes the same week every week while the Profile value silently disagrees; (c) adds a confirmation dialog to a reversible change. The copy says it is saved (EP17G-AC2) and Profile remains the place to change it back. ▲ — persisted data and user-visible workflow | Ratified (user, 2026-11-19) |
| D-G2 | Which controls appear on the proposal: (a) the spread preset **and** the study-days count; (b) the spread preset only, with a link to Profile | **(a)** under ▲ D17-2 (a) — the two together are the week's shape, and showing one without the other invites "why is it still only using 3 days?" | Ratified (user, 2026-11-19) |
| D-G3 | Placement on the surface: (a) inside EP17F's summary region, directly under the pacing sentence; (b) in the demoted disclosure; (c) a separate card at the bottom | **(a)** — the sentence states the symptom and the control is the cure | Ratified (user, 2026-11-19) |
| D-G4 | Re-preview scope: (a) rebuild the whole proposal, discarding in-flight session edits, and **say so** before the change; (b) try to preserve edits across a re-plan | **(a)** — the engine is free to place sessions anywhere, so "preserving" edits would silently reapply them to different sessions | Ratified (user, 2026-11-19) |
| ▲ D-G5 | Spread preset labels, replacing the placeholders "Spread out / Balanced / Packed": (a) **As early as possible (0) / A little each day (70) / Evenly spread (100)**; (b) Relaxed / Balanced / Packed, mirroring `DENSITY_PRESETS`; (c) Front-loaded / Paced / Level | **(a)** — (b) is the decisive objection: `DENSITY_PRESETS` already uses *Relaxed / Balanced / Packed* for `densityPercent` on the very same Profile form, and two different levers wearing the same three words is the "third spelling of the same choice" this story exists to avoid. (c) is jargon. (a) names the *shape of the week*, which is what the lever changes, and the `0` option honestly describes the pre-EP17 behaviour instead of calling it "packed". **Worth a glance** — these are student-facing names. ▲ — student-facing copy on a user-visible workflow | **Ruled (a) (user, 2026-11-19)** — the labels are **"As early as possible" / "A little each day" / "Evenly spread"**, writing `spreadPercent` 0 / 70 / 100. (b) is rejected on the stated collision with `DENSITY_PRESETS` (Relaxed / Balanced / Packed) on the same Profile form |
| D-G6 | Satisfying the ▲ D17-2 proviso on `weeklyGoalDays`: (a) **keep the existing group in place, re-legend it "Study days a week" and add one sentence stating that the plan uses at most that many days**; (b) move it out of "Your goals" into a new planning fieldset; (c) add a separate planning control beside the goal | **(a)** — ▲ D17-2 (a)'s whole point is that one number means one thing; (b) and (c) re-split what the ruling joined. The sentence names both meanings in one breath, which is exactly the proviso's "visibly surfaced with its new meaning". Refines ▲ D17-2's proviso; does not change it | Proposed |
| D-G7 | Sharing the preset control: (a) **extract `PresetRadioGroup` + `isPreset` + `withCustom` to `shared/ui/PresetRadioGroup.tsx`**; (b) `features/plan-proposal` imports it from `features/study-preferences`; (c) duplicate it in the proposal | **(a)** — (b) is a sibling-feature import that the FSD layering exists to discourage even though the lint zones do not catch it; (c) is the duplication EP17 is removing. The extraction is a move, not a rewrite, with the existing form tests as the guard | Proposed |
| D-G8 | Presentation of the control group at its ruled location (refines D-G3 (a), does not move it): (a) **behind one `aria-expanded` toggle, "Change the pace", open at `md`+ and collapsed below**; (b) always expanded, both groups visible; (c) always collapsed | **(a)** — (b) puts six radio cards between the summary and the week on a 360 px phone, which is the density the epic's ADHD standard rejects; (c) hides the lever from desktop users who have the room. (a) keeps the control exactly where D-G3 ruled it and costs one tap on the viewport that needs the space | Proposed |
| D-G9 | Non-destructive rebuild: (a) **add `replan()` to `useProposal`**, keeping `preview`/`edited` and `phase: 'ready'` on failure; (b) reuse `load()`; (c) catch the error in `PacingControls` and re-request | **(a)** — (b) demonstrably breaks EP17G-AC3 (`useProposal.ts:58-63` nulls the preview on failure); (c) cannot undo a state change the hook has already made. (a) leaves `load()` and its tests untouched | Proposed |

## Definition of Done

DoD-1, DoD-2 (bounds enforced client-side by the zod schema and server-side
by the existing validator), DoD-4 (actionable error on a failed write and on
a failed rebuild), DoD-5, DoD-6, DoD-7, DoD-8. DoD-3 — the write is the
existing `@CurrentUser()`-scoped `PUT /study-preferences`; no new read or
write is introduced. DoD-9 N/A — no API or migration change
([contracts §2](./contracts.md#2-the-spread-preference-levers-ep17a-owns-the-definition)
already documents the keys, EP17A). DoD-10/11 at the parent review.

## Sizing

- **Outcome:** a student who dislikes the proposed week can change its shape
  where they are standing, and the change sticks.
- **Actual at closeout:** tbd.
- **Files:** **new** `apps/web/src/shared/ui/PresetRadioGroup.tsx` + test;
  **new** `features/plan-proposal/ui/PacingControls.tsx` + test;
  `features/plan-proposal/ui/PlanProposal.tsx` and its test;
  `features/plan-proposal/model/useProposal.ts` and its test;
  `features/study-preferences/ui/StudyPreferencesForm.tsx` and its test;
  `entities/study-preferences/api/studyPreferencesApi.ts` (reuse only, no
  change). `pages/profile/ui/ProfilePage.tsx:221` is unchanged.
- **Start context:** this story,
  [contracts.md §2 and §5](./contracts.md#2-the-spread-preference-levers-ep17a-owns-the-definition),
  `StudyPreferencesForm.tsx:100-241` and `:460-520`, `PlanProposal.tsx`,
  `useProposal.ts`, `entities/study-preferences/model/types.ts`,
  EP17F's heading region and `shared/ui/Disclosure.tsx`.
- **Verification:**
  `pnpm --filter @studypilot/web test -- plan-proposal study-preferences shared/ui`
  green; a manual pass of the write + rebuild flow, including both failure
  paths, recorded.
- **Dependencies / exclusions:** needs EP17F for its slot and its
  `Disclosure`, and EP17A/EP17D for the contract and the effective values.
  E2E coverage (preset change re-plans) is EP17H.
