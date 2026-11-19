# EP16C — One Planning Flow

**Story ID:** EP16C
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend
**Status:** Reviewed — EP16 combined review passed 2026-11-18, pass 2 ([review.md](./artifacts/EP16/review.md); R-EP16-01 contrast fix `4f9ecd1` verified); record: [artifacts/EP16C/implementation.md](./artifacts/EP16C/implementation.md). D-C5…D-C10 ratified by default at implementation start; D-C11/D-C12 added by the implementer under the user's tweak grant.
**Refined:** 2026-11-18
**Dependencies:** EP16B implemented (the plan note has left `/plan`; `recoverySummaryApi` lives in `features/today`). Epic decisions D16-4 (▲, ratified (a)), D16-5 (ratified (a)), D16-9 (▲, ratified (a)), D16-10, D16-12, D16-13.

## Plan at a glance

- **What this changes:**
  - **`/plan`** shows the saved week, Remaining work and one primary action: **Plan my week**, or **Replan my week** when a saved plan exists.
  - **`/plan/proposal`** is what that action opens. It is one surface, titled "Your proposed week", with **Use this plan** and **Not now**. It shows:
    - the calibration note
    - the proposed week and the editor, with conflicts
    - **What this plan keeps** (locked and completed sessions, with the lock toggles)
    - **Moved forward into this plan**
    - workload warnings
  - Confirming lands on Today.
  - `/plan/health*` and `/catch-up*` redirect.
  - The plan-health page, the catch-up surface and `/plan`'s old preview mode are deleted.
  - Every proposal uses the catch-up preview/confirm pair. Today's **Plan my week** opens the proposal.
- **Why it improves it:** one vocabulary for one job — a student never again meets "Generate / Save" on one page and "Regenerate / Use this plan" on another (product, AC-E16-06…08). `PlanPage`'s preview mode and `CatchUpPreview` are two copies of the same composition. They become one `PlanProposal` over one `useProposal` hook, and a page with no content of its own is deleted (code).
- **Decisions needing you:** none. ▲ D16-4 and ▲ D16-9 were ratified on 2026-11-17. The new rows D-C5…D-C10 are layout, copy and test-maintenance choices (none ▲) and ratify by default at implementation start.
- **How to change this plan:** edit a Ruling cell below or in the epic register; ask the planner for AC changes. AC text freezes when implementation starts.

## Summary

Merge the two planning flows into one, and give the merged surface a home
students reach from one button. Both flows already run the same engine
(`gatherPlanData` → `schedule`) and the same selective replace (contracts
§ One planning flow). This child is a frontend consolidation with redirects,
not a behaviour change.

## Scope

**In:**
- `features/plan-proposal/` (new):
  - `model/useProposal.ts` — the `CatchUpPreview` state, lifted into a hook.
  - `ui/PlanProposal.tsx`.
  - Moved from `features/catch-up/ui/`: `WhatThisKeepsCard.tsx` (ex-`CatchUpPreservationCard`) and `CatchUpLockToggle.tsx`.
  - Moved from `features/plan-health/ui/`: `MovedForwardList.tsx` and `MovedSessionRow.tsx`.
- `features/study-plan/lib/weekLine.ts` (D-C5).
- The `pages/plan/proposal/ui/PlanProposalPage.tsx` route wrapper, and the `/plan/proposal` route.
- `PlanPage` rebuild: saved week, Remaining work, one action. Removed: preview mode, the `TodayPlanCard` mount, the generate/save controls and the `actedRef` guard (no in-page action remains — A-C2).
- Redirects per contracts § Route matrix.
- Deletions: `pages/plan-health/**`, `features/plan-health/ui/**` (after the moves; `features/plan-health/api` already left in EP16B), `features/catch-up/**` (after the moves), and `UnfinishedWorkList` (D-C3).
- `@deprecated` tags on `previewStudyPlan` / `saveStudyPlan` (D-C4).
- `PLAN_MY_WEEK_HREF` → `/plan/proposal`.
- Minimal e2e re-points across **four** specs (D-C10).
- The contracts.md § One planning flow confirmation (DoD-9; the EP16A precedent F-EP16A-02 of the implementer correcting contracts).

**Out (implementer: do not drift):**
- Engine, API and DTO changes (D16-13).
- Removing the API's `preview` / `PUT` pair (BL-16-01).
- Rendering the proposal on the EP15 grid (BL-16-02).
- Changes to `PlanWeek`, `PlanSessionEditor`, `WorkloadWarnings`, `CalibrationNote` or `RemainingWorkSection` beyond props they already accept.
- Navigation entries, including "Plan health" in `navGroups.ts:89` and `Header.test.tsx` (EP16D; known window).
- Today's regions (EP16B).
- The full e2e rewrite and new journeys (EP16F).
- Restoring the plan-health page's "N minutes studied so far" total anywhere (see A-C4).

## Source requirement references

AC-E16-06, AC-E16-07, AC-E16-08 (primary); AC-E16-12, AC-E16-13. TR-E16-01, TR-E16-02, TR-E16-05. DoD-1, 4, 5, 6, 7, 8, 9 (contracts note).

## Acceptance criteria

1. **EP16C-AC1:** `/plan` renders:
   - `h1` "Plan"
   - the saved week (`PlanWeek`, or the sentence "No plan yet — Plan my week to see proposed sessions" when empty)
   - `RemainingWorkSection`
   - exactly one primary action, labelled **Plan my week** when no saved session exists and **Replan my week** otherwise

   It renders no `TodayPlanCard`, no preview mode, no "Generate plan"/"Save plan" controls and no plan note. The saved-week read keeps its own loading/error states (F-EP14C-03 ordering guard preserved where still relevant).
2. **EP16C-AC2:** `/plan/proposal` renders `PlanProposal`. On entry it calls `previewCatchUp()` (▲ D16-4 (a)) and moves focus to its `h1`. It shows:
   - the window line, **Use this plan** and **Not now**
   - `PlanWeek` and `PlanSessionEditor` (with conflict marking)
   - **What this plan keeps**: locked/completed counts and per-locked-session lock toggles, only when non-empty
   - **Moved forward into this plan**, only when `missedSessions` is non-empty
   - `CalibrationNote` and `WorkloadWarnings`

   The empty proposal ("Nothing new to schedule") and `WINDOW_ROLLED_OVER` ("Create new plan") states behave as `CatchUpPreview` does today. **Not now** → `/plan`, with no request.
3. **EP16C-AC3:** **Use this plan** calls `confirmCatchUpPlan(from, to, projectSessions(edited))`.
   - On success it toasts "Plan saved." and navigates to `/today`.
   - A 409 conflict keeps the edits and marks the rows, with the summary.
   - Other errors toast the server message.
   - While in flight, the confirm button shows the busy state and is the only disabled control.
4. **EP16C-AC4:** Redirects, all with `replace`:
   - `/plan/health` → `/plan`
   - `/plan/health/catch-up` → `/plan/proposal`
   - `/catch-up` → `/plan`
   - `/catch-up/preview` → `/plan/proposal`

   `pages/plan-health`, `features/plan-health/ui` and `features/catch-up` no longer exist; their surviving components live under `features/plan-proposal`. A search for `plan-health`, `PlanHealthView` or `CatchUpPreview` finds only redirects, records under `docs/`, and e2e files pending EP16F.
5. **EP16C-AC5:** `previewStudyPlan` and `saveStudyPlan` have no caller in `apps/web/src` other than their definitions (V-16-4), and carry `@deprecated` JSDoc pointing at BL-16-01. `expectNoForbiddenWords` passes over `/plan` and `/plan/proposal` in every tested state.

AC text is unchanged from planning. Three interpretations are flagged for the planner below the Decisions table (AC4 search exceptions, the AC5 entity test, the AC1 guard). None changes an AC's substance.

## Tests (TR-E16-01, TR-E16-02, TR-E16-05)

Vitest + Testing Library. The entity client is mocked with `vi.mock('@/entities/study-plan/api/studyPlanApi')`, as `CatchUpPreview.test.tsx` and `PlanPage.test.tsx` do today. Ported cases keep their assertions and are renamed to the new surface. Fixture titles avoid forbidden words.

| File (new unless noted) | Cases (names as written) | AC |
|---|---|---|
| `features/plan-proposal/model/useProposal.test.ts` (renderHook) | `load: success sets preview, edited = flattenPreview(preview), phase ready`; `load: failure sets phase error and clears preview`; `confirm: posts projectSessions(edited) with the preview window and calls onConfirmed`; `confirm: 409 conflicts keep edited and expose conflicts`; `confirm: WINDOW_ROLLED_OVER sets rolledOver and clears preview and edits`; `confirm: other errors toast the server message, or "We couldn't save this plan. Try again."`; `confirm: resolving after unmount toasts but does not navigate (D-C9)`; `onLockedChange: flips the session and adjusts lockedPreserved ±1, never below 0` | AC2, AC3 |
| `features/plan-proposal/ui/PlanProposal.test.tsx` | Ported from `CatchUpPreview.test.tsx`: `fetches previewCatchUp on mount and renders proposed sessions grouped by day`; `editing a proposed session then Use this plan posts the exact confirm body (incl. the anchor)`; `"Not now" navigates to /plan and makes no confirm call`; `a 409 conflict marks the offending rows and lists reasons; edits are preserved`; `WINDOW_ROLLED_OVER shows the banner and "Create new plan" re-runs the preview, focus returns to the h1`; `a 400 field error surfaces the server message via the toast`; `shows the week skeleton with aria-busy while loading, and only Not now in the header`; `shows "Nothing new to schedule" when no sessions are proposed`; `a failed preview shows the error card; Try again re-runs it and focus returns to the h1`; `renders locked preview sessions in "What this plan keeps", never as editor rows`; `reverts the lock toggle on failure, explains it, and keeps the plan editable`; `keeps a persisted unlock when a later confirm fails; only the new conflict shows`; `is keyboard operable — Tab/Enter reach Use this plan, Not now, editor controls and lock toggles`. Ported from `PlanPage.test.tsx`: `a calibrated proposal renders the calibration note above the week (EP13L-AC4)`; `an uncalibrated proposal renders no calibration note (EP13L-AC3)`. New: `moves focus to the h1 "Your proposed week" on entry`; `the window line has no IANA id when the profile zone matches the browser (D-C5)`; `"Moved forward into this plan" lists missedSessions and is absent when empty`; `"What this plan keeps" is absent when nothing is kept`; `section order: calibration, week, editor, conflicts, keeps, moved forward, warnings (D-C6)`; `confirm success toasts "Plan saved." and navigates to /today`; `while confirming, Use this plan is busy and disabled and Not now stays enabled`; `no h1/h2 carries a digit`; `copy audit — loading, error, empty, rolled-over, ready, conflict` | AC2, AC3, AC5 |
| `features/plan-proposal/ui/WhatThisKeepsCard.test.tsx` (moved from `CatchUpPreservationCard.test.tsx`) | the three existing cases, with the heading now asserted as "What this plan keeps" | AC2 |
| `features/plan-proposal/ui/CatchUpLockToggle.test.tsx` (moved) | the five existing cases, unchanged | AC2 |
| `features/plan-proposal/ui/MovedForwardList.test.tsx` (moved) | the three existing cases, with the heading now "Moved forward into this plan" | AC2 |
| `pages/plan/ui/PlanPage.test.tsx` (rewritten) | `EP16C-AC1: h1 "Plan", the saved week and Remaining work`; `EP16C-AC1: empty saved plan shows "No plan yet — Plan my week to see proposed sessions" and Plan my week`; `EP16C-AC1: a saved session switches the action to Replan my week`; `EP16C-AC1: the action navigates to /plan/proposal and calls no preview endpoint`; `EP16C-AC1: while the saved read loads, the week skeleton shows and no action label flips (D-C7)`; `EP16C-AC1: a failed saved read shows the error with an outline Try again and still offers Plan my week`; `EP16C-AC1: Try again re-reads the saved plan with no query parameters`; `EP16C-AC1: Remaining work renders even when the saved read fails`; `EP16C-AC1: no TodayPlanCard, no Generate plan / Save plan, no plan note (negatives)`; `EP16C-AC1: exactly one primary-variant button in every state`; `EP16C-AC1: the window line has no IANA id when the zones match (D-C5)`; `EP16C-AC5: copy audit — loading, error, empty, saved`. The EP14F guard cases are deleted (A-C2) | AC1, AC5 |
| `pages/plan/proposal/ui/PlanProposalPage.test.tsx` | `sets document.title to "Your proposed week — StudyPilot" and renders PlanProposal` | AC2 |
| `features/study-plan/lib/weekLine.test.ts` | `formats both civil dates verbatim (UTC formatting, no zone arithmetic)`; `omits the zone when profile = browser`; `appends "Times shown in <zone>" when they differ` | AC1, AC2 |
| `app/appRoutes.test.tsx` (rewritten) | `/plan/health lands on /plan`; `/plan/health/catch-up lands on /plan/proposal`; `/catch-up lands on /plan`; `/catch-up/preview lands on /plan/proposal`; `replaces history so Back does not bounce through the old path` (kept); `/plan/proposal renders the proposal surface` | AC4 |
| `features/today-plan/ui/TodayPlanCard.test.tsx:169` and `pages/today/ui/TodayPage.test.tsx:173` (existing) | the href assertion becomes `/plan/proposal` | AC-E16-07 |
| Deleted with their components | `features/catch-up/ui/CatchUpPreview.test.tsx` (cases ported above), `features/plan-health/ui/{PlanHealthView,UnfinishedWorkList}.test.tsx`, `pages/plan-health/ui/PlanHealthPage.test.tsx` | AC4 |
| `entities/study-plan/api/studyPlanApi.test.ts` (existing) | unchanged — the deprecated functions keep their contract tests while they exist | AC5 |

The V-16-4 search and the AC4 search are recorded verbatim in `artifacts/EP16C/implementation.md`.

## Technical notes

### Relevant files

**New:**
- `apps/web/src/features/plan-proposal/model/useProposal.ts` — `useProposal({ onConfirmed })` returns:
  - state: `preview`, `edited`, `phase: 'loading'|'ready'|'error'`, `conflicts`, `rolledOver`, `isConfirming`
  - actions: `load`, `confirm`, `setEdited`, `onLockedChange`

  It is `CatchUpPreview.tsx:39-116`, lifted. The success path toasts "Plan saved." and calls `onConfirmed()` only while mounted (D-C9).
- `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx` — presentational over the hook. `onConfirmed = () => navigate('/today')`; Not now = `navigate('/plan')`.
- `apps/web/src/features/study-plan/lib/weekLine.ts` — `weekLine(from, to, profileZone, browserZone)`. Same rule as `features/today/model/dayLine.ts` (D-C5).
- `apps/web/src/pages/plan/proposal/ui/PlanProposalPage.tsx` — the container (`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12`) and `document.title`. Placement follows the `pages/focus/history/ui/StudyHistoryPage.tsx` nested-route precedent (A-C1).

**Move (`git mv`, then edit):**
- `features/catch-up/ui/CatchUpPreservationCard.tsx` → `features/plan-proposal/ui/WhatThisKeepsCard.tsx`:
  - export renamed `WhatThisKeepsCard`
  - `h2` becomes "What this plan keeps"
  - `data-testid="catch-up-preservation"` is **kept** (e2e, A-C3)
- `features/catch-up/ui/CatchUpLockToggle.tsx` → `features/plan-proposal/ui/CatchUpLockToggle.tsx`, unchanged.
- `features/plan-health/ui/MovedForwardList.tsx` and `MovedSessionRow.tsx` → `features/plan-proposal/ui/`:
  - heading becomes "Moved forward into this plan"
  - heading id becomes `proposal-moved-heading`
  - the description "These sessions were rescheduled for you. Nothing was lost." is kept

Each component's test moves with it.

**Change:**
- `apps/web/src/pages/plan/ui/PlanPage.tsx` — rewritten, about 120 lines down from 383:
  - **reads:** `listStudyPlan` via the existing `loadSaved`, minus `commitMode` and `actedRef`
  - **renders:** header (`h1`, `weekLine`, one action), then `WeekSkeleton` or the error card or `PlanWeek` (`emptyMessage` per AC1), then `RemainingWorkSection`, rendered unconditionally with its own read
  - **removed imports:** `previewStudyPlan`, `saveStudyPlan`, `PlanSessionEditor`, `WorkloadWarnings`, `CalibrationNote`, `TodayPlanCard`, `useTodayPlanQuery`, `flattenPreview`/`projectSessions`, `CONFLICT_REASON_LABEL`, `toast`
- `apps/web/src/app/App.tsx:14-16,64-82`:
  - remove the three imports and the nested `/plan/health` route
  - add `<Route path="/plan/proposal" element={<PlanProposalPage />} />`
  - add four flat `Navigate … replace` routes that point directly at their final target (no redirect chains)
- `apps/web/src/features/today-plan/ui/TodayPlanCard.tsx:31` — `PLAN_MY_WEEK_HREF = '/plan/proposal'`, and update the D-A3 comment.
- `apps/web/src/entities/study-plan/api/studyPlanApi.ts:37-58` — JSDoc `@deprecated` on `previewStudyPlan` and `saveStudyPlan`: "Unused by the web client since EP16C (D16-4): every proposal uses previewCatchUp/confirmCatchUpPlan. Removal: BL-16-01."
- `apps/web/e2e/{catch-up,adaptive-scheduling,schedule,study-plan}.spec.ts` — the minimal re-points in D-C10's table (test-only).
- `docs/stories/EP16/contracts.md` § One planning flow — confirm it against the shipped code, and replace the composition sentence with D-C6's order. § Known windows — add the three extra specs (D-C10).

**Delete:**
- `apps/web/src/pages/plan-health/**`
- `apps/web/src/features/plan-health/**` (the `ui/` remainder: `PlanHealthView`, `UnfinishedWorkList` and their tests)
- `apps/web/src/features/catch-up/**` (the `CatchUpPreview` remainder and its test)

### Grounding (inspected 2026-11-18 at `d35970a`)

- `CatchUpPreview` (the payload type, `entities/study-plan/model/types.ts:217`) extends `PlanPreview`, so it carries `calibration`. The server returns it (`apps/api/src/modules/study-plans/study-plans.service.ts:1285`), so the proposal can show `CalibrationNote` with no API change.
- `missedSessions` in the catch-up preview are the last-7-days `RESCHEDULED` rows whose assignment is still unfinished (`study-plans.service.ts:1186-1222`). That is the same set as the recovery summary's `rolledForward`, so it is the correct source for "Moved forward into this plan".
- The lock toggles act on `missedSessions.filter(m => m.locked)` — the only per-session lock data the payload carries (`CatchUpPreservationCard.tsx:11`). This is unchanged.
- `PlanWeek` renders `role="status"` regions of its own, and each `CatchUpLockToggle` has an sr-only `role="status"`. The single-live-region rule (AC-E16-12) binds Today only, so these stay as they are.
- `PlanWeek` day headings are `h3` "Mon 2026-11-16". They carry dates, not counts, so the no-digit heading checks cover `h1`/`h2` only.
- `WorkloadWarnings` copy contains "later" ("Continues in a later plan") and `PlanSessionEditor` contains "Move later". These pass only with D-B8's whole-word matching.
- E2E callers of the old `/plan` flow: `adaptive-scheduling.spec.ts:128-133`, `schedule.spec.ts:183-185, 259-261` and `study-plan.spec.ts:78-131, 165-168`. contracts § Known windows names only `catch-up.spec.ts`, so this is flagged to the planner (D-C10).

### Security

No new endpoint, input or persistence. `previewCatchUp`, `confirmCatchUpPlan` and `setPlannedSessionLock` go through the authenticated `httpClient`, and the server scopes every row by `userId`. The confirm replaces only `SCHEDULED && !locked` rows (`:1427-1444`). That is unchanged and relied on, and EP16F's journey "Replan preserves a locked session" verifies it. Edit validation is `PlanSessionEditor`'s existing validation (DoD-2 N/A).

### Checkpoint steps (multi-window)

| Step | Work | Done when |
|---|---|---|
| S1 | `useProposal`, `PlanProposal`, moves, `weekLine`, `PlanProposalPage` and the `/plan/proposal` route (old surfaces still present) | new and moved unit tests green |
| S2 | `PlanPage` rebuild; `PLAN_MY_WEEK_HREF` | `PlanPage.test.tsx`, `TodayPlanCard.test.tsx` and `TodayPage.test.tsx` green |
| S3 | redirects, deletions, `appRoutes.test.tsx`, `@deprecated`; AC4 and V-16-4 searches recorded | web tsc, eslint and vitest green |
| S4 | e2e re-points (D-C10); full Playwright run | suite green except the one `test.fixme` |
| S5 | contracts confirmation; implementation record | records written |

### Assumptions (harmless, reversible)

- **A-C1:** The route wrapper lives at `pages/plan/proposal/ui/PlanProposalPage.tsx`, following the `pages/focus/history` nested-route precedent. Planning named `pages/plan/ui/PlanProposalPage.tsx`; either placement satisfies FSD.
- **A-C2:** `actedRef` / F-EP14C-03 is not "still relevant". The guard protected an in-page Generate click from a late mount-time read, and `/plan` no longer has an in-page action (it navigates away), so the guard and its EP14F tests are deleted. This is how AC1's "where still relevant" clause is read here.
- **A-C3:** Test ids `catch-up-preservation`, `plan-week`, `plan-session-editor` and `conflict-summary` are kept. E2E depends on them, and EP16F may rename them.
- **A-C4:** The plan-health page's total "N minutes studied so far" line (`UnfinishedWorkList`) is not reproduced. `RemainingWorkSection` shows each assignment's "Confirmed" minutes, and Study history shows totals. D-C3 (ratified) deletes the list. The one e2e journey that asserts the total (`catch-up.spec.ts:616`) is `test.fixme`'d naming EP16F (D-C10).
- **A-C5:** An empty proposal keeps **Use this plan** enabled, as `CatchUpPreview` does today (AC2 "behave as today"). Confirming it replaces the unlocked scheduled rows of the window with none, which is the existing EP08 behaviour, unchanged.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-C1 | Proposal location: (a) its own route `/plan/proposal` (deep-linkable, Back returns to `/plan`, focus-to-`h1` on entry as EP08E did); (b) page state on `/plan` | **(a)** — the redirects from `/plan/health/catch-up` and `/catch-up/preview` need a target, and Back behaviour is predictable | Ratified (user, 2026-11-17 — "ratify all") |
| D-C2 | Post-confirm landing: (a) `/today` + toast; (b) stay on `/plan` showing the saved week | **(a)** — D16-5; the next action is on Today | Ratified (user, 2026-11-17 — "ratify all") |
| D-C3 | `UnfinishedWorkList`: (a) delete — `RemainingWorkSection` on `/plan` shows the same items with more detail; (b) move into the proposal | **(a)** — one list per question (see A-C4 for the one total it drops) | Ratified (user, 2026-11-17 — "ratify all") |
| D-C4 | Deprecated entity functions: (a) keep with `@deprecated` + a BL-16-01 pointer; (b) delete now | **(a)** — the API still exists; deleting the client first would make BL-16-01's grep trivial but hide the dependency | Ratified (user, 2026-11-17 — "ratify all") |
| D-C5 | Window line on `/plan` and `/plan/proposal`: (a) a new `weekLine(from, to, profileZone, browserZone)` → "`<from>` – `<to>`", both formatted with `formatDate(new Date('<civil>T00:00:00Z'), 'UTC')`, plus " · Times shown in `<zone>`" only when the zones differ; (b) keep today's raw "`2026-11-16 – 2026-11-22 · America/New_York`" | **(a)** — the same rule D16-10 gave Today's day line, so the student never meets a raw IANA id on the plan surfaces either. No zone arithmetic (D05-6). Refines D16-10 (extends its display rule to the plan surfaces) | Ratified by default, 2026-11-18 (implementation start) |
| D-C6 | Proposal composition and headings: (a) the order below — the `CalibrationNote` sits **above** the week, as `PlanPage` placed it (EP13L D-L4: explain the longer figures before they are read); `h1` "Your proposed week"; section `h2`s "What this plan keeps" and "Moved forward into this plan"; (b) contracts' listed order, with `CalibrationNote` after "Moved forward" | **(a)** — it keeps EP13L-AC4's shipped placement and its test. The proposal itself (week, editor) stays above the context sections. Refines contracts § One planning flow (composition sentence); EP16C updates that sentence. Order: header (`h1`, window line, **Use this plan**, **Not now**) → rolled-over banner → `CalibrationNote` → `PlanWeek` → `PlanSessionEditor` → conflict summary → What this plan keeps → Moved forward into this plan → `WorkloadWarnings` | Ratified by default, 2026-11-18 (implementation start) |
| D-C7 | `/plan` action element and load behaviour: (a) a `Button` (primary, `w-full sm:w-auto max-sm:min-h-[44px]`) with `onClick={() => navigate('/plan/proposal')}`. While the saved read is loading, a button-sized skeleton holds its place, so the label never flips between Plan and Replan under a screen reader. On a saved-read error it renders **Plan my week** (the proposal does not depend on that read). The error card's Try again becomes `outline`; (b) render **Plan my week** immediately and relabel when the read resolves; (c) `Link` wrapping `Button` (the `TodayPlanCard` pattern) | **(a)** — it keeps exactly one primary on screen in every state (D16-12 (8)) and avoids a button nested in a link. Today's `Plan my week` link is EP16A's and stays as it is | Ratified by default, 2026-11-18 (implementation start) |
| D-C8 | Secondary buttons inside the proposal's empty and error states (today "Back to plan health" → `/plan/health`): (a) drop them — the header's **Not now** is always rendered and does the same thing; error card = "We couldn't build a plan proposal. Try again." + **Try again**; rolled-over banner = "This proposal's week has ended. Create a new plan for this week." + **Create new plan**; (b) relabel them "Back to your week" → `/plan` | **(a)** — the old target is retired, and a second "go back" control duplicates Not now on the same screen (D15-14). The new copy drops "plan health" and "generate" | Ratified by default, 2026-11-18 (implementation start) |
| D-C9 | **Not now** while a confirm is in flight: (a) Not now stays enabled (AC3: the confirm is the only disabled control). If the student leaves, a confirm that later succeeds still toasts "Plan saved." but does **not** navigate (the hook ignores `onConfirmed` after unmount); a late failure is dropped silently; (b) disable Not now while confirming | **(a)** — it honours AC3 as written. A student who chose to leave is never pulled to Today against their last action, and the toast still tells them the save happened | Ratified by default, 2026-11-18 (implementation start) |
| D-C10 | E2E maintenance in the window before EP16F: (a) **re-point** every journey whose asserted content has a direct new home, and `test.fixme` (naming EP16F) only where it has none — see the table below; (b) `test.fixme` every journey that reads plan-health headings (contracts' wording) | **(a)** — it keeps the lock-preservation, decline and edit-confirm journeys running in the window (the security invariant "never deletes locked sessions" stays covered), at a small test-only cost (F-EP16A-02 precedent). Refines contracts § Known windows (after EP16C) and D16-17; the planner should add the three extra specs to that row | Ratified by default, 2026-11-18 (implementation start) |

| D-C11 | 409 conflict feedback: (a) the inline conflict summary (`role="alert"`, rows marked) is the one message — no toast; (b) summary + toast, as EP08E shipped | **(a)** — one message in one place; two simultaneous announcements of the same problem is the kind of noise D15-14 excludes. Implementer decision 2026-11-18 under the user's grant ("feel free to do it now as part of this story"). Removes the UI/UX table's 409 toast | Ratified (user grant, 2026-11-18) |
| D-C12 | A one-line summary under the proposal's heading — "5 sessions · about 4 h this week": (a) add it (a paragraph, never a heading; hidden for an empty proposal); (b) none | **(a)** — a student can judge the proposal before reading a seven-column grid; initiation is the hard part. Implementer decision 2026-11-18 under the user's grant | Ratified (user grant, 2026-11-18) |

**D-C10 re-point table** (the minimal edits; selectors are unchanged unless named):

| Spec : line | Today | After EP16C |
|---|---|---|
| `catch-up.spec.ts:306-317` | `goto('/plan/health')`; headings "Plan health" and "Moved forward"; click "Regenerate my week"; URL `/plan/health/catch-up` | `goto('/plan/proposal')`; heading "Your proposed week"; heading "Moved forward into this plan"; title and date visible; URL `/plan/proposal` |
| `catch-up.spec.ts:348-350` | toast "Catch-up plan saved."; URL `/plan/health$` | toast "Plan saved."; URL `/today$` (then the existing `goto('/plan')` reload check) |
| `catch-up.spec.ts:417-430` | `/plan/health` → Regenerate → Not now → `/plan/health$`; heading "Moved forward" | `goto('/plan')` → click `/^(Plan\|Replan) my week$/` → Not now → URL `/plan$`; heading `h1` "Plan" |
| `catch-up.spec.ts:476-487`, `:538` | `goto('/plan/health/catch-up')`; heading "Catch-up plan"; toast "Catch-up plan saved." | `goto('/plan/proposal')`; heading "Your proposed week"; toast "Plan saved." |
| `catch-up.spec.ts:610-613` | `/plan/health` "Moved forward" list | `/plan/proposal` "Moved forward into this plan" list |
| `catch-up.spec.ts:616-652` | "45 minutes studied so far" on `/plan/health` | `test.fixme` — "EP16F: the total moved off plan health (A-C4); assert Remaining work's Confirmed minutes instead" |
| `catch-up.spec.ts:677-678` | heading "Plan health" | `goto('/plan')`; heading "Plan" |
| `catch-up.spec.ts:706-732` | `/plan/health`; entry "Regenerate my week" (44 px, Tab path, Enter → `/plan/health/catch-up`) | `/plan`; entry `/^(Plan\|Replan) my week$/` (same 44 px, Tab and Enter checks) → `/plan/proposal` |
| `catch-up.spec.ts:763` | `goto('/plan/health/catch-up')` | `goto('/plan/proposal')` |
| `adaptive-scheduling.spec.ts:128-133` | `/plan` → "generate plan" → editor shows the essay | `/plan` → `/^(Plan\|Replan) my week$/` → `plan-week` and editor show the essay |
| `adaptive-scheduling.spec.ts:179-185` | `/plan/health`: "Moved forward"; no digit in any heading; axe `/plan/health` | `/plan/proposal`: "Moved forward into this plan"; no digit in `h1`/`h2`; axe `/plan/proposal` |
| `adaptive-scheduling.spec.ts:409-412` | URL `/plan/health$`, `/plan/health/catch-up$` | URL `/plan$`, `/plan/proposal$` |
| `schedule.spec.ts:184-185`, `:260-261` | "Generate plan" → "Save plan" visible | `/^(Plan\|Replan) my week$/` → "Use this plan" visible |
| `study-plan.spec.ts:81`, `:120-125`, `:166` | "generate plan"; "save plan" → "Plan saved." → `plan-week` on `/plan` | `/^(Plan\|Replan) my week$/`; "Use this plan" → "Plan saved." → URL `/today` → `goto('/plan')` → `plan-week` |

**Flags for the planner (AC text kept):**
- **AC4 search exceptions.** The entity payload type `CatchUpPreview` (`entities/study-plan/model/types.ts:217`, re-exported in `studyPlanApi.ts:8,32`) mirrors the API and stays. The nav entry `id: 'plan-health'` (`navGroups.ts:89`) and `Header.test.tsx:90,110,504` stay until EP16D (known window). The implementer records these hits as expected exceptions; the planner may want AC4's exception list to name them.
- **AC5 entity test.** `entities/study-plan/api/studyPlanApi.test.ts` calls both deprecated functions. It is their contract test, not a caller, so the V-16-4 search excludes it.
- **contracts § Known windows (after EP16C).** It names only `catch-up.spec.ts`. `adaptive-scheduling.spec.ts`, `schedule.spec.ts` and `study-plan.spec.ts` also drive the retired flow (D-C10).

## UI/UX

**Element decisions:**

| Element | Reuse / new | Where | Reason |
|---|---|---|---|
| `PlanProposal` + `useProposal` | new, `features/plan-proposal` | `/plan/proposal` | one surface replaces two (D16-4) |
| `PlanWeek`, `PlanSessionEditor`, `WorkloadWarnings`, `CalibrationNote` | reuse, unchanged | proposal; `PlanWeek` also on `/plan` | AC-E16-06 keeps them |
| `WhatThisKeepsCard`, `CatchUpLockToggle` | moved and renamed (heading only) | proposal | "what it keeps" (AC-E16-06) |
| `MovedForwardList`, `MovedSessionRow` | moved (heading only) | proposal | the plan-health list's new home (AC-E16-08) |
| `RemainingWorkSection` | reuse, unchanged | `/plan` | the unfinished-work list's home (D16-5) |
| `EmptyState`, `Card`, `Button` | reuse | both | existing tokens |
| `weekLine` | new, `features/study-plan/lib` | both window lines | D-C5 |

**Layout and hierarchy:**

**`/plan`:**
- **Header:** `h1` "Plan", with the window line under it in `text-sm text-text-muted`. The one primary action sits to the right on `sm+`; at 360 px it sits below the heading, full width.
- **Saved week:** `PlanWeek`, or its empty sentence.
- **Remaining work:** `RemainingWorkSection` (`mt-6`).

Nothing else renders: no note, no hero, no warnings.

**`/plan/proposal`:**
- **Header:** `h1` "Your proposed week" with the window line. **Use this plan** (primary) and **Not now** (ghost) sit to the right on `sm+`. At 360 px they stack full width, Use this plan first, in DOM and Tab order.
- **Body:** then the D-C6 order. The student sees the week and the decision first; context sections follow the editor.

**States:**

| Surface | Loading | Empty | Error | Other |
|---|---|---|---|---|
| `/plan` saved week | `WeekSkeleton` (`aria-busy`), with a button-sized skeleton in place of the action (D-C7) | `PlanWeek` `emptyMessage`: "No plan yet — Plan my week to see proposed sessions" + **Plan my week** | "We could not load your saved plan. Try again." (or the server message) + outline **Try again**; the action shows **Plan my week** | — |
| `/plan` Remaining work | its own (unchanged) | "Nothing left to do." (unchanged) | its own retry (unchanged) | — |
| `/plan/proposal` | week skeleton (`aria-busy`); header shows `h1` + **Not now** only | `EmptyState` "Nothing new to schedule" / "Your unfinished work didn't need any new sessions this week. Check the workload warnings below."; **Use this plan** stays (A-C5) | `Card role="alert"`: "We couldn't build a plan proposal. Try again." + **Try again** (primary — Use this plan is absent in this state) | rolled-over (`role="alert"`, warning): "This proposal's week has ended. Create a new plan for this week." + **Create new plan**; 409: the editor marks the rows, plus the `conflict-summary` alert "Some sessions clash with your calendar. Adjust them and try again:" and its list; confirm in flight: Use this plan busy (`aria-busy`, keeps its name) |

**Toasts:**
- Success: "Plan saved."
- 409: "Some sessions clash with your calendar: `<date time — reason; …>`"
- Other: the server message, else "We couldn't save this plan. Try again."

**Keyboard and focus:**
- On entering `/plan/proposal`, focus moves to the `h1` (`tabIndex={-1}`, EP08E decision 20). After **Try again** or **Create new plan** re-runs the preview, focus returns to the `h1`, because the control that had focus disappears.
- Tab order: Use this plan → Not now → editor controls (Move earlier/later, delete, time inputs) → lock toggles.
- After a 409, focus stays on Use this plan, and the conflict alert announces.
- **Not now** and **Use this plan** are native buttons. Enter and Space work, and both show the shared `focus-visible` ring.
- On `/plan`, the action is the first focusable control after the header nav.

**Accessibility (WCAG 2.2 AA):**
- The lock toggle state is `aria-pressed` plus visible "Keep "X" locked" text, and a "Locked" text badge with an icon (never colour only).
- Conflicts are text reasons (`CONFLICT_REASON_LABEL`), not colour alone.
- Headings: `h1` → `h2` sections (Workload warnings, What this plan keeps, Moved forward into this plan, Remaining work) → `h3` day labels. No `h1`/`h2` carries a count.
- The busy confirm keeps its accessible name (EP16A-AC5).
- Reduced motion: skeletons are `motion-reduce:animate-none`, and nothing new animates.
- Page titles: "Plan — StudyPilot" and "Your proposed week — StudyPilot" (2.4.2).

**Responsive:**
- **360 px header:** both headers stack, and every button is `max-sm:min-h-[44px]`.
- **Week grid:** `PlanWeek` keeps its own horizontal scroll inside the grid (`overflow-x-auto`, `min-w-[140px]` columns; BL-16-02 is the future fix). The **page** has no horizontal overflow at 320/360 px — the existing e2e at `catch-up.spec.ts:686/735` asserts this and moves to the new URLs.
- **Lock toggles:** keep their ≥ 44 px height (asserted by the e2e at `:785-789`).
- **Desktop:** content width is `max-w-5xl`, as today.

**Copy (exact):**

| Item | Text |
|---|---|
| `/plan` | **Plan my week** / **Replan my week**; empty sentence as AC1; window line per D-C5 |
| Proposal header | "Your proposed week"; **Use this plan**; **Not now** |
| What this plan keeps | heading "What this plan keeps"; count lines and "Locked sessions are never moved or replaced." unchanged |
| Moved forward | heading "Moved forward into this plan"; "These sessions were rescheduled for you. Nothing was lost." |
| States | as in the States table; toasts as above |

Forbidden words never appear; "later" in existing copy is a whole word other than "late" (D-B8).

## Definition of Done

1, 4 (409 / rolled-over / server-message copy), 5, 6, 7, 8 (TR-E16-01/02/05), 9 (contracts § One planning flow confirmed and its composition sentence updated). 2, 3 N/A. 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** planning is one button, one proposal, one confirm, and the plan-health page is gone without losing any of the lists or sentences that matter (A-C4 records the one total line dropped).
- **Actual at closeout:** one window, one commit, 2026-11-18 (no checkpoint needed — S1–S5 completed in one session); files as planned plus `PlanSessionEditor.tsx` (+ test) for F-EP16C-01; web 1356/0; Playwright 61/0 + 1 planned `fixme` on two consecutive full runs. Row in [efficiency.md](./artifacts/efficiency.md).
- **Files:**
  - New: `apps/web/src/features/plan-proposal/model/useProposal.ts` (+ test), `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx` (+ test), `apps/web/src/features/study-plan/lib/weekLine.ts` (+ test), `apps/web/src/pages/plan/proposal/ui/PlanProposalPage.tsx` (+ test).
  - Moved (+ tests): `apps/web/src/features/plan-proposal/ui/{WhatThisKeepsCard,CatchUpLockToggle,MovedForwardList,MovedSessionRow}.tsx`.
  - Changed: `apps/web/src/pages/plan/ui/PlanPage.tsx` (+ test), `apps/web/src/app/App.tsx` (+ `appRoutes.test.tsx`), `apps/web/src/entities/study-plan/api/studyPlanApi.ts` (JSDoc), `apps/web/src/features/today-plan/ui/TodayPlanCard.tsx` (+ test), `apps/web/src/pages/today/ui/TodayPage.test.tsx` (href), `apps/web/e2e/{catch-up,adaptive-scheduling,schedule,study-plan}.spec.ts`, `docs/stories/EP16/contracts.md`.
  - Deleted: `apps/web/src/pages/plan-health/**`, `apps/web/src/features/plan-health/**`, `apps/web/src/features/catch-up/**`.
- **Start context:** this story; contracts.md § Route matrix, § One planning flow, § Known windows; `CatchUpPreview.tsx`, `PlanPage.tsx`, `App.tsx:64-82`, `CatchUpPreview.test.tsx`.
- **Verification:**
  - Web gates (cwd `apps/web`): `npx tsc --noEmit -p tsconfig.json`, `npx eslint src --max-warnings=0` and `npx vitest run`, all green.
  - AC4 and V-16-4 search output recorded.
  - Full Playwright suite (external-stack mode, EP16A procedure) green, apart from the one `test.fixme`.
  - Manual: no plan → Plan my week → Use this plan → lands on Today with a next session. Lock a session → Replan my week → the locked session is listed under "What this plan keeps" and survives confirm.
- **Dependencies / exclusions:** EP16B. E2E rewrite → EP16F; API removal → BL-16-01; proposal on the grid → BL-16-02; nav entries → EP16D.
