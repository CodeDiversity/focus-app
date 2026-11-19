# EP17G — Plan-time pacing controls — implementation record

**Implementer:** implementer session, 2026-11-19. **Branch:**
`hfi/9ae11317-13de-4365-8abb-4bf7e0e3c7f3/elm` (worktree), base `d918046`
(EP17F closeout). **Story:**
[EP17G](../../EP17G-plan-time-pacing-controls.md) (refined 2026-11-19, ACs
frozen).

## Completed behavior

The spread levers are reachable **from the proposal**. Under the EP17F pacing
sentence sits one `shared/ui/Disclosure` labelled **"Change the pace"**
(`defaultOpen={useMediaQuery(MD_UP_QUERY, false)}` — open at `md`+, collapsed
below, D-G8), holding the new `features/plan-proposal/ui/PacingControls.tsx`:

- **How your week is paced** — `spreadPercent` 0 / 70 / 100 as
  *As early as possible* / *A little each day* / *Evenly spread* (▲ D-G5,
  ruled), with the honest **Custom** option for an off-preset stored value
  (EP13N D-N2).
- **Study days a week** — the existing `GOAL_DAY_PRESETS` (2 / 3 / 5, *Light*
  / *Steady* / *Most days*), re-legended from "Weekly goal" and carrying one
  sentence naming both meanings: *"Your plan uses at most this many days of
  the week, and it's the number of days you're aiming to show up."* (D-G6,
  the ▲ D17-2 proviso; "at most" is ▲ D17-16's unconstrained-when-unset
  reading).
- The sentence shown **before** any change (EP17G-AC2, D-G1/D-G4), one polite
  live region written once at the end of a change, and one inline error with
  **Try again**.

Choosing an option `await putStudyPreferences({ <onlyTheChangedKey> })` — the
existing `@CurrentUser()`-scoped `PUT /study-preferences` on the shared axios
client, which merges (contracts §2 invariant 2); **no new endpoint and no
second client** — and then rebuilds the week with the new `useProposal.replan()`.
Nothing writes to the student's *plan*: **Use this plan** is still the only
control that does.

`useProposal` gained a **non-destructive** `replan()` sibling (D-G9) returning
`ReplanResult = { ok: boolean; pacing?: PlanPacing }`, plus `isReplanning`.
On failure it touches neither `preview`, `edited` nor `phase` — exactly the
outcome EP17G-AC3 forbids `load()` from producing. `load()` and all its
existing tests are untouched.

Profile parity: `StudyPreferencesForm` gained the spread group with the same
labels, descriptions, Custom behaviour and zod bounds
(`spreadPercent 0…100`, default `70`, message `Must be between 0 and 100.`,
`FIELD_NAMES` + `applyServerState` branch), and its study-days group carries
the same new legend and sentence. The "Your goals" paragraph dropped its
weekly clause, which now lives on the group itself; `dailyGoalMinutes` is
untouched.

`PresetRadioGroup` + `Preset` + `isPreset` + `CUSTOM_DESCRIPTION` +
`withCustom` moved verbatim from `StudyPreferencesForm.tsx:155` to
`shared/ui/PresetRadioGroup.tsx` (D-G7), `name` widened to `string`.

## Changed paths

**New**
- `apps/web/src/shared/ui/PresetRadioGroup.tsx` (+ `.test.tsx`)
- `apps/web/src/entities/study-preferences/model/pacingPresets.ts`
- `apps/web/src/features/plan-proposal/ui/PacingControls.tsx` (+ `.test.tsx`)
- `docs/stories/EP17/artifacts/EP17G/implementation.md` (this file)

**Modified**
- `apps/web/src/features/plan-proposal/model/useProposal.ts` (+ `.test.ts`)
- `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx` (+ `.test.tsx`)
- `apps/web/src/features/plan-proposal/ui/ProposalActionBar.tsx` (+ `.test.tsx`)
- `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx` (+ `.test.tsx`)
- `docs/stories/EP17/EP17G-plan-time-pacing-controls.md` (Status, sizing
  actual, D-G6…D-G9 ratified by default), `docs/stories/EP17/README.md`
  (queue row + Active/Next), `docs/stories/EP17/artifacts/efficiency.md`

`apps/api` is untouched (`git status` shows no path under it).

## AC-by-AC

| AC | Outcome |
|---|---|
| EP17G-AC1 | **Met.** `PacingControls.test.tsx`: both groups read the effective values from the `pacing` block (`spreadPercent`, `studyDays.length`); choosing a spread PUTs exactly `{ spreadPercent: 100 }` then calls `onChanged` once; choosing days PUTs exactly `{ weeklyGoalDays: 5 }`. `PlanProposal.test.tsx` proves the end-to-end re-render in place (the rebuilt week's title appears, `navigate` never called). Boundaries: an off-preset spread shows **Custom** pre-selected; an off-preset day count shows **Custom (4 days)**. |
| EP17G-AC2 | **Met.** The D-G4 sentence renders before any change (asserted with `putStudyPreferences` never called). The announcement is built from the **returned** pacing block — `"New week ready — evenly spread, across 3 days."` — and a boundary case covers `"across 1 day"`. "Once per change, not once per render" is asserted by re-rendering with the settled payload and seeing no change. The live region is written only at the end, so one message per change. |
| EP17G-AC3 | **Met.** In flight: both groups disabled (`PacingControls.test.tsx`), the proposal `<section>` is `aria-busy` and **Use this plan** is disabled (`PlanProposal.test.tsx`, new `confirmDisabled` prop on `ProposalActionBar`). Failed `PUT`: no re-preview, the previous selection still checked, actionable inline error + **Try again** that retries the whole change. Failed rebuild: the previous proposal is still rendered **and still editable** (the test nudges a session afterwards), phase still `ready`, the reassuring message plus a **Try again** that retries only the rebuild (one `PUT` total). `useProposal.test.ts` covers `replan()` directly, including the `load()` contrast. |
| EP17G-AC4 | **Met.** `StudyPreferencesForm.test.tsx`: the three ruled labels in order with no `%`; the DENSITY_PRESETS collision explicitly negated; a pre-EP17 response with no `spreadPercent` shows the default; Custom for an off-preset stored spread; saving sends the whole bag with the chosen preset and **no other field changed**; a 400 `spreadPercent` message renders inside its group; the study-days group states the planning meaning and there is no second planning control. |
| EP17G-AC5 | **Met.** `PresetRadioGroup.test.tsx`: native `fieldset`/`legend` group name, arrow keys move the selection (both directions), the "Selected" text cue + icon alongside the accent border (never colour alone), `max-sm:min-h-[44px]` and `focus-within:ring-focus-ring` on every card, whole-group `disabled`. Copy audit (`expectNoForbiddenWords`, which forbids `%` outright) passes on `PacingControls` incl. the Custom + announcement states, and on the whole proposal with the disclosure **closed and open**. |

## Verification

cwd `apps/web`, state: EP17G complete on top of `d918046`.

| Command | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `npx vitest run src/features/plan-proposal src/features/study-preferences src/shared/ui` | PASS — 20 files, **223 tests** |
| `pnpm test` (full web unit suite) | PASS — **140 files, 1512 tests** (baseline 137 / 1472 — +3 files, +40 tests, 0 regressions) |
| `npx eslint src/shared/ui/PresetRadioGroup.{tsx,test.tsx} src/entities/study-preferences/model/pacingPresets.ts src/features/plan-proposal/ui src/features/plan-proposal/model src/features/study-preferences/ui` | PASS — 0 errors, 0 warnings |
| `npx prettier --check` on the same paths | PASS |

Test counts (this record is the only home): new
`PresetRadioGroup.test.tsx` **8**, new `PacingControls.test.tsx` **14**;
`useProposal.test.ts` 8 → **12**, `PlanProposal.test.tsx` 28 → **34**,
`ProposalActionBar.test.tsx` 5 → **6**, `StudyPreferencesForm.test.tsx`
39 → **46** (1 existing case re-pointed at the new legend). Full suite
1512 / 0 failed.

**Playwright:** no e2e spec required a change — a repo-wide search for
`Weekly goal` / `weekly goal` across `apps/web/e2e` found no hit (the only
production matches are EP13K's momentum sentence in
`features/momentum/model/momentumCopy.ts`, which EP17G does not touch), and no
existing spec drives the proposal's pacing controls. DB-gated e2e was **not
run locally**; EP17H owns that run (TR-E17-06 covers "preset change re-plans").

**Manual pass (not run):** the story's sizing block asks for a recorded manual
pass of the write + rebuild flow including both failure paths. It is covered
here by the automated equivalents above (both failure paths asserted at the
page level) and by EP17H's e2e; a browser pass was not performed in this
session — recorded honestly as open, owner EP17H / the combined review.

## Deviations from the refined story (all within frozen ACs)

| # | Deviation | Why |
|---|---|---|
| 1 | `onChanged` is `() => Promise<ReplanResult>` (`{ ok, pacing? }`), not `() => Promise<void>`, and the hook does **not** expose `replanError` / `clearReplanError`. | The story's own component description gives `PacingControls` "its inline error". Keeping an error string in the hook as well would be two homes for one fact, and dead state in `PlanProposal`. Returning `{ ok, pacing }` also makes the EP17G-AC2 announcement read the **new** pacing block deterministically instead of racing a prop update. D-G9's substance — `load()` untouched, nothing discarded on failure — is unchanged. |
| 2 | `PresetRadioGroup` gained one optional `description?: string` prop (rendered under the legend, wired into the group's `aria-describedby`). | D-G6 requires a sentence under the legend on **both** surfaces; without the prop the two surfaces would spell it two ways, which is the duplication D-G7 exists to prevent. The existing three Profile groups pass no `description` and render byte-identically. |
| 3 | The preset **copy** (labels, descriptions, legends, the two sentences, the announcement builder) lives in a new `entities/study-preferences/model/pacingPresets.ts`, not in `shared/ui`. | `shared/ui` is UI primitives; the copy is domain. Both features may import `entities/` under the FSD zones, so there is still exactly one spelling. `GOAL_DAY_PRESETS` moved there too, since the proposal needs it. |
| 4 | `ProposalActionBar` gained `confirmDisabled?: boolean`. | EP17G-AC3 requires the confirm disabled during a rebuild without the confirm spinner that `isConfirming` implies. |
| 5 | The announcement omits the spread clause when the stored spread is none of the three presets (`"New week ready — across 3 days."`). | Reading the word "custom" back at the student says nothing; and the Custom label cannot carry the number, since it is a percentage and `%` is forbidden. |

## Findings

| ID | Source | Issue | Disposition / owner | Closure evidence |
|---|---|---|---|---|
| F-EP17G-01 | `PacingControls.tsx`, contracts §5 | The study-days group's *displayed* value is `pacing.studyDays.length` (what EP17G-AC1 mandates), which is the **selected** day set, not the stored `weeklyGoalDays`. When availability leaves fewer days than the student chose (rule 9b's selection can return fewer), the control will show a smaller number than what is stored — e.g. choose *Most days* (5), get a 4-day week, and the group re-renders on "Custom (4 days)". The local `chosen` override keeps the student's own click stable for the session, but a reload shows the derived number. | **Reported, not fixed** — AC1 freezes the display source, and the honest alternative (reading `weeklyGoalDays` from `GET /study-preferences`) is a second read this story's scope excludes. For the combined EP17 review to rule on: either the payload carries the stored `weeklyGoalDays` beside `studyDays` (EP17D's block), or the copy ("at most") is accepted as covering it. | Open |
| F-EP17G-02 | `StudyPreferencesForm.tsx` | Profile's **Save** writes the whole bag (`putStudyPreferences(data)`, pre-existing EP06E behaviour), so it now also writes `spreadPercent` on every save, including a save where the student never touched it. The value written is the one that was read back, so nothing changes in practice; but it means a Profile save is no longer a no-op for a key the student never chose — relevant to ▲ D17-16's "unset means unconstrained" only for `weeklyGoalDays`, which already behaved this way before EP17G. | **Reported, not fixed** — changing Profile's write to a dirty-field diff is an EP06E behaviour change outside EP17G's scope and would touch six existing assertions. | Open |
| F-EP17G-03 | `PlanProposal.tsx` | The pacing disclosure uses `useMediaQuery(MD_UP_QUERY, false)` while the EP17F "What else changed" disclosure next to it uses `fallback: true`. The fallback only applies where `matchMedia` is absent (jsdom), so real browsers agree; but two neighbouring calls with different fallbacks read oddly. | **As specified** by the story's technical notes (D-G8 names `false` explicitly); kept so new tests exercise the collapsed phone path. Flagged for the reviewer. | Closed by citation |

No security-relevant change: the one write reuses the existing
`@CurrentUser()`-scoped endpoint, no `.env*` was read or written, and no new
read of academic data was added (DoD-3).
