# EP16C implementation record

**Story:** [EP16C — One Planning Flow](../../EP16C-one-planning-flow.md)
**Status:** Implemented — awaiting parent review (EP16 combined review after EP16F)
**Date:** 2026-11-18
**Baseline:** `e272a6e` (EP16B).
**Commit scope:** `features/plan-proposal/` (new: `model/useProposal.ts`, `ui/PlanProposal.tsx`, + tests; moved `WhatThisKeepsCard` (ex `CatchUpPreservationCard`), `CatchUpLockToggle`, `MovedForwardList`, `MovedSessionRow` with their tests); `features/study-plan/lib/weekLine.ts` (+ test); `pages/plan/proposal/ui/PlanProposalPage.tsx` (+ test); `pages/plan/ui/PlanPage.tsx` rewritten (+ test rewritten); `app/App.tsx` routes and `appRoutes.test.tsx` rewritten; `features/today-plan/ui/TodayPlanCard.tsx` (`PLAN_MY_WEEK_HREF = '/plan/proposal'`) + tests; `entities/study-plan/api/studyPlanApi.ts` (`@deprecated` JSDoc); `features/study-plan/ui/PlanSessionEditor.tsx` (+ test) for F-EP16C-01; `features/today/api/recoverySummaryApi.ts` (comment); deletions `pages/plan-health/**`, `features/plan-health/**`, `features/catch-up/**`; e2e re-points in `catch-up`, `adaptive-scheduling`, `schedule`, `study-plan` specs; contracts § One planning flow; this record, story, queue, efficiency.

Decisions applied: ▲ D16-4 (a), D16-5 (a), ▲ D16-9 (a), D-C1…D-C4 (ratified 2026-11-17); D-C5…D-C10 ratified by default at implementation start; **D-C11** and **D-C12** added by the implementer under the user's grant ("is there anything you'd tweak … feel free to do it now as part of this story"): a 409 is reported once (inline summary, no duplicate toast), and the proposal carries a one-line summary ("N sessions · about X this week"). Checkpoint: not needed — S1–S5 completed in one session.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP16C-AC1 — `/plan`: h1, saved week (or the empty sentence), Remaining work, one primary action Plan/Replan my week; no hero, no preview mode, no Generate/Save, no note | **Done.** `PlanPage` is ~140 lines (was 383): one read (`listStudyPlan`), a button-sized placeholder while loading (D-C7), **Plan my week** on a failed read, outline Try again, `weekLine` window (D-C5), title "Plan — StudyPilot". A-C2: the EP14F `actedRef` guard and its tests are gone with the in-page action. | `PlanPage.test.tsx` (9) |
| EP16C-AC2 — `/plan/proposal`: `previewCatchUp` on entry, focus to h1, window line, Use this plan / Not now, week + editor + conflicts, What this plan keeps (when non-empty), Moved forward into this plan (when non-empty), calibration note, warnings; empty and rolled-over states; Not now → `/plan` with no request | **Done.** `useProposal` is `CatchUpPreview`'s state lifted; `PlanProposal` renders D-C6's order (calibration above the week, EP13L-AC4 kept). Focus returns to the h1 after Try again / Create new plan because the effect keys on the phase. D-C8: the "Back to plan health" buttons are gone; Not now is always in the header. | `PlanProposal.test.tsx` (20: 13 ported + 7 new), `useProposal.test.ts` (8), `PlanProposalPage.test.tsx` (1) |
| EP16C-AC3 — Use this plan → `confirmCatchUpPlan(from, to, projectSessions(edited))`; success toasts "Plan saved." and lands on `/today`; 409 keeps edits and marks rows; other errors toast; confirm busy and the only disabled control | **Done.** D-C9: a confirm resolving after unmount toasts but never navigates. D-C11: the 409 path renders the inline summary only (the EP08E toast is removed). | hook tests (confirm ×5), surface tests (409, rolled-over, 400, busy/Not now enabled, success → `/today`) |
| EP16C-AC4 — four `replace` redirects; plan-health and catch-up folders gone; search finds only redirects, docs and e2e pending EP16F | **Done, with the expected exceptions.** Search (below): the `CatchUpPreview` payload type in `entities/study-plan` and `useProposal` (mirrors the API — refiner flag 1), the `plan-health` nav entry + header tests (EP16D's known window), and comments naming the history. | `appRoutes.test.tsx` (6); search below |
| EP16C-AC5 — `previewStudyPlan`/`saveStudyPlan` have no caller; `@deprecated` with BL-16-01; copy audit on `/plan` and `/plan/proposal` | **Done.** V-16-4 (below): only the entity client, its contract test (refiner flag 2) and `PlanPage.test.tsx`'s *negative* assertion that the action does not call `previewStudyPlan`. Copy audit passes in loading/error/empty/saved and ready/conflict/rolled-over/empty/error. | `PlanPage.test.tsx` "copy audit", `PlanProposal.test.tsx` "copy audit" |

## Searches (recorded)

```
grep -rn "plan-health\|PlanHealthView\|CatchUpPreview" apps/web/src | grep -v "^apps/web/src/entities/study-plan"
# → appRoutes.test.tsx (test names), store.test.tsx:75 (history comment), PlanProposal.test.tsx:114 (describe name),
#   useProposal.ts (the `CatchUpPreview` payload type), recoverySummaryApi.ts (comment),
#   navGroups.ts:87-89 (the Plan health nav entry — removed by EP16D, known window). Nothing live.
grep -rn "previewStudyPlan\|saveStudyPlan" apps/web/src | grep -v "studyPlanApi.ts\|studyPlanApi.test.ts"
# → PlanPage.test.tsx (mock entries + `expect(previewStudyPlan).not.toHaveBeenCalled()`). No caller.
```

## Verification

- `apps/web` (working tree of this commit, 2026-11-18): `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src --max-warnings=0` clean; `npx vitest run` → **126 files, 1356 passed, 0 failed**.
- **Playwright, full suite, external-stack mode** (fresh DB `sp_elm_ep16c_<epoch>`; API 4200, vite 3200; servers stopped and DB dropped afterwards). Before F-EP16C-01: 55 passed / 1 failed (axe on `/plan/proposal`) ×3 — the failure stopped the rest of the serial adaptive-scheduling file. After the fix: run 1 → 59 passed, 1 failed (journey 6, see F-EP16C-02), 1 skipped; runs 2 and 3 → **61 passed, 0 failed, 1 skipped** (the planned `test.fixme`, D-C10). Journey 6 then passed 3/3 alone.
- API unchanged (D16-13).

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP16C-01 | `PlanSessionEditor.tsx` pin/unpin buttons; axe `label-content-name-mismatch` (serious) | Pre-existing (EP13H): the accessible names "Pin Essay to 09:00" / "Make Essay flexible" did not contain the visible text "Pin to this time" / "Make flexible" (WCAG 2.5.3). Exposed because axe now runs on `/plan/proposal`. | **Fixed here:** names now start with the visible text ("Pin to this time: Essay, 09:00"; "Make flexible: Essay"); unit test regexes updated. | implementer — closed |
| F-EP16C-02 | e2e run 1 after the fix | Journey 6 (`adaptive-scheduling.spec.ts:347`, Today's minutes badge after a finish) failed once under full parallel load, then passed 3/3 alone and 2/2 in full runs. | Noted as load flake (BL-15-08 family); the step asserts Today's "25 min studied today" badge, which depends on the momentum read settling. | — |
| F-EP16C-03 | A-C4 | The plan-health total "N minutes studied so far" is not reproduced anywhere; `catch-up.spec.ts:621` is `test.fixme` naming EP16F. | Open as planned (EP16F re-homes the journey on Remaining work's Confirmed minutes). | EP16F |

## Future ADHD tweaks considered (reported, not done — see the chat report)

- Collapse the per-session editor behind one "Adjust sessions" disclosure so the proposal opens as a week plus two buttons (moderate: the e2e journeys drive the editor directly). Related to BL-16-02 (render the proposal on the EP15 grid).
- On `/plan`, a saved plan's "Replan my week" could warn in one sentence when locked sessions exist ("Your locked sessions stay put") before the proposal loads — small, but new copy; left for the refiner.

## How to verify by hand

Not executed (no interactive browser); user instructions: with no plan, open Plan → **Plan my week** → the proposal shows "Your proposed week", the summary line and the week → **Use this plan** → you land on Today with a next session. Lock a session, then Plan → **Replan my week** → "What this plan keeps" lists it with a lock toggle → **Use this plan** → the locked session survives. Visit `/plan/health` and `/catch-up/preview` → they land on `/plan` and `/plan/proposal`. In the proposal, press Tab from the heading: Use this plan → Not now → editor controls.
