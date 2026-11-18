# EP16B implementation record

**Story:** [EP16B — Today's Secondary Content](../../EP16B-today-secondary-content.md)
**Status:** Implemented — awaiting parent review (EP16 combined review after EP16F)
**Date:** 2026-11-18
**Baseline:** `07541aa` (EP16G).
**Commit scope:** `features/today/ui/{PlanNote,MomentumRow,ComingUp,ClassesToday}.tsx` (+ tests); `features/today/api/recoverySummaryApi.ts` (moved from `features/plan-health/api/planHealthApi.ts`, renamed — D-B5); `features/today/model/dashboardSelectors.ts` (`selectComingUp`; `selectTodayStudySessions` removed) + test; `features/today/ui/dashboardSection.ts` (pruned; `COMING_UP_LIMIT`); `features/today/ui/DashboardAssignmentRow.tsx` (**Past due** neutral badge, divided-list row); `pages/today/ui/TodayPage.tsx` (+ tests incl. the cross-student adapter); `pages/plan/ui/PlanPage.tsx` (note removed) + test; `test/forbiddenWords.ts` (+ test); importers of the renamed slice (`createAppStore.ts`, `resetOnUserChange.ts`, `store.test.tsx`, `PlanHealthView.tsx`, a test comment); `features/momentum/ui/MomentumCard.tsx` (+ test) deleted; this record, story, queue, efficiency.

Decisions applied: D-B1…D-B4 (ratified 2026-11-17); D-B5…D-B10 ratified by default at implementation start 2026-11-18 (non-▲, recommended options). Epic D16-3, D16-8 (c), D16-12, D16-18 as written.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP16B-AC1 — plan note under the hero when work moved forward; **See your week** → `/plan`; no number; gone from `/plan` | **Done.** `PlanNote` renders only when `status === 'ready'` and `rolledForwardCount > 0` (D-B7: nothing while loading or on error). `PlanPage` lost the note, its query and import. | `PlanNote.test.tsx` (4); `TodayPage.test.tsx` region-order case; `PlanPage.test.tsx` "renders no moved-forward note" |
| EP16B-AC2 — momentum row: compact strip + `weeklyLine` (+ `runLine`) + **See history**; no bar/daily sentence/card/count heading; nothing when `!hasHistory`; one-line loading/error | **Done.** `MomentumRow` reuses `MomentumWeekStrip compact` and `momentumCopy`; the `h2` "Your momentum" is `sr-only`. `MomentumCard` deleted (D-B4 — `FocusTimer` imports only the copy and the strip). | `MomentumRow.test.tsx` (10, incl. TR-E16-06 parity) |
| EP16B-AC3 — Coming up: unfinished only, past-due first, cap 5, **All assignments**, **Past due** text badge, rows open details via the shared owner, heading without count, nothing when empty | **Done.** `selectComingUp` composes the two EP05A selectors (no re-sort); `ComingUp` applies `limitRows(…, 5)`; `DashboardAssignmentRow` now renders `Badge variant="neutral"` "Past due" (D-B6) inside a `divide-y` list; `TodayPage` passes the uncapped rows to `useAssignmentActions` and refetches on change. | `ComingUp.test.tsx` (9); `dashboardSelectors.test.ts` (2 new); `TodayPage.test.tsx` details-dialog and add-assignment cases |
| EP16B-AC4 — Classes today line; links to the course; nothing with no classes; live-region sentence covers sessions, classes and coming-up rows (uncapped) | **Done.** `ClassesToday` renders `h2` "Classes today" and `HH:mm CODE` links with `aria-label` "HH:mm CODE, Course name" (D-B10); `todaySentence` (D-B9) omits zero parts and never counts past-due work. | `ClassesToday.test.tsx` (5); `TodayPage.test.tsx` live-region case (7 assignments → "7 assignments coming up" while 5 rows render) |
| EP16B-AC5 — copy audit passes in every rendered state | **Done.** `expectNoForbiddenWords` (whole-word, case-insensitive, plus `%`, over text and `aria-label`/`title`/`alt` — D-B8) passes for Today in empty, full (with a Past due row) and error states; every region test also runs it. | `forbiddenWords.test.ts` (5); `TodayPage.test.tsx` "copy audit" |

## Verification

- `apps/web` (working tree of this commit, 2026-11-18): `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src --max-warnings=0` clean; `npx vitest run` → **126 files, 1355 passed, 0 failed** (+30 tests net of the deleted `MomentumCard` suite).
- **Playwright, full suite, external-stack mode** (fresh DB `sp_oak_ep16b_<epoch>`, API on 4200, vite on 3200; servers stopped and DB dropped afterwards): run 1 → **61 passed, 1 failed** (`semesters-courses.spec.ts:29` "create a semester", a 30 s timeout on the cold vite server; not a Today/EP16B surface, no API error logged); runs 2 and 3 → **62 passed, 0 failed** (40.8 s, 33.9 s). The adaptive-scheduling journeys that visit `/today` (1, 4, 5, 6) and the `/today` axe stop passed in all three runs.
- API unchanged (D16-13).

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP16B-01 | `DashboardAssignmentRow.tsx:63` (before) | The reused row still rendered the red "Overdue" badge, a forbidden word on Today. | **Fixed** (AC3/AC5): neutral **Past due** badge; `OVERDUE_LABEL` stays untouched on the EP03 surfaces (BL-16-06). | implementer — closed |
| F-EP16B-02 | e2e run 1 | One cold-start timeout in `semesters-courses.spec.ts:29`; green on the two following runs and unrelated to the changed surfaces. | Noted; consistent with BL-15-08's "first run compiles" behaviour. | — |
| F-EP16B-03 | contracts § Known windows (F-EP16A-03) | Today's momentum row now exists, but no e2e asserts it yet. | Open as planned — EP16F's `today.spec.ts` owns it. | EP16F |

## How to verify by hand

Not executed (no interactive browser); user instructions: as a student with one past-due and several upcoming assignments, open Today. Expected: under the next-session card, the momentum row (seven day marks and "N of 3 days this week"), then **Coming up** with the past-due row first carrying a "Past due" badge, at most five rows and **All assignments**, then "Classes today · 10:00 CODE …". With no history, no assignments and no classes, nothing shows below the card. Tab order: hero controls → See your week (when shown) → See history → row titles → All assignments → class links.
