# EP06F implementation record

**Story:** [EP06F-study-plan-page-preview-edit-and-save.md](../../EP06F-study-plan-page-preview-edit-and-save.md)
**Implemented:** 2026-10-30 (single implementer pass; frontend only)
**Baseline HEAD before changes:** `4b1f748`
**Parent:** [EP06 breakdown](../../README.md) — one combined parent review after EP06H.
**Scope:** the `/plan` page (route, nav entry, entity client, week grid, session editor, page states, tests). Excluded: remaining-work/deficit surface (EP06G), preferences surface (EP06E, done), backend (EP06D, done), editing a saved session (FU-EP06-01), free-form creation (D06-5), calendar read model (D06-18).

## Changed paths

Production:
- `apps/web/src/entities/study-plan/model/types.ts` (new) — `PlanPreview*`, `SavedPlan*`, `ProposedSession`, `ProposedSessionInput`, `PlanConflict`, `CONFLICT_REASON_LABEL`.
- `apps/web/src/entities/study-plan/api/studyPlanApi.ts` (new) — `previewStudyPlan`, `saveStudyPlan`, `listStudyPlan` (plain axios).
- `apps/web/src/features/study-plan/ui/PlanWeek.tsx` (new) — read-only week grid + empty state.
- `apps/web/src/features/study-plan/ui/WeekGrid.tsx` (new) — re-export of `PlanWeek` (task-named path).
- `apps/web/src/features/study-plan/ui/PlanSessionEditor.tsx` (new) — editable sessions (day select, time inputs, move/resize/delete controls).
- `apps/web/src/pages/plan/ui/PlanPage.tsx` (new) — page with initial/generating/empty/error/conflict/saved/rollover states.
- `apps/web/src/app/App.tsx` (modified) — `/plan` route inside `ProtectedRoute`.
- `apps/web/src/widgets/header/ui/navGroups.ts` (modified) — `Plan` entry in the shared `Planning` group.

Tests:
- `apps/web/src/entities/study-plan/api/studyPlanApi.test.ts` (new) — 5 client tests.
- `apps/web/src/features/study-plan/ui/PlanWeek.test.tsx` (new) — 3 tests.
- `apps/web/src/features/study-plan/ui/PlanSessionEditor.test.tsx` (new) — 5 tests.
- `apps/web/src/pages/plan/ui/PlanPage.test.tsx` (new) — 7 tests.
- `apps/web/src/widgets/header/ui/Header.test.tsx` (modified) — ArrowUp-last assertion updated to `Plan` to reflect the new nav entry.

Docs:
- `docs/stories/EP06/artifacts/EP06F/checkpoint.md`
- `docs/stories/EP06/artifacts/EP06F/implementation.md` (this file)
- `docs/stories/EP06/EP06F-...md` — `**Status:**` updated
- `docs/stories/EP06/README.md` — queue row + Active/Next fields

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 `/plan` protected route in standard layout; nav entry in Planning group | PASS | `App.tsx` route inside `ProtectedRoute`; `navGroups.ts` Plan entry | 
| 2 Initial state offers generate; generating calls preview and renders 7 days + sessions + warnings/preferences | PASS | `PlanPage.handleGenerate` → `previewStudyPlan`; renders `PlanSessionEditor` with edited sessions; `PlanPage.test.tsx` "generating renders..." |
| 3 Move/resize/delete in preview; no add affordance | PASS | `PlanSessionEditor` controls; no create control | tests |
| 4 Save sends `{ from, to, sessions }` with projected four fields; shows saved week; tells student saved | PASS | `projectSessions`; `PlanPage.test.tsx` "save posts projected..." (toast success) |
| 5 409 rendered as conflict per session with reason; proposal stays; nothing saved | PASS | conflict summary + toast; mode stays preview | test |
| 6 Failed preview/save readable message; no partial plan; saved week stays visible; rollover says week rolled over + generate | PASS | `previewError`, `rolledOver` state | tests |
| 7 Mount read with no query params; renders server's days; no browser date | PASS | `listStudyPlan()` no args; `PlanPage.test.tsx` "reads saved plan on mount..." |
| 8 Keyboard operable, focus rings, 375px usable, non-pointer move/resize | PASS (automated) | native controls; manual pass recorded as TR-E06-09 evidence (not executed here) |
| 9 Tests cover generate→preview→move→resize→delete→save, saved view, conflict, loading/empty/error | PASS | 4 test files, 20 tests |

## Verification

Working directory: `/Users/michaelrobert/Desktop/focus-app` for every command.

| Command | cwd | Result | Tested state |
|---|---|---|---|
| `pnpm --filter web test` | repo root | 84 suites / 1005 tests passed, exit 0 | final |
| `pnpm --filter web test -- Plan` | repo root | 4 suites / 20 tests passed, exit 0 | EP06F tests |
| `pnpm --filter web typecheck` | repo root | exit 0, no output | `tsc --noEmit` |
| `pnpm --filter web lint` | repo root | exit 0, 0 warnings (`--max-warnings 0`) | eslint |

## Findings and deviations

- F-EP06F-01: The independent `Header.test.tsx` asserted `Availability` was the last Planning item; adding `Plan` makes `Plan` last. Updated that assertion to `Plan` (legitimate consequence of the authorized nav change). Disposition: fixed. Evidence: `Header.test.tsx` line ~201.
- F-EP06F-02: The story's "settled" technical decision mentioned an RTK Query slice at `features/study-plan/model/studyPlanApi.ts` with a `Plan` tag. The implementation instead follows the story's explicit entity-client contract (`entities/study-plan/api/studyPlanApi.ts`, plain axios), consistent with EP06E and the assignments page; no RTK slice or store registration was added. The page uses the entity client. Disposition: deviation recorded (scope decision). Evidence: `PlanPage.tsx` imports.
- Findings/deviations: otherwise None. No change to acceptance criteria, decisions, or shared contract. The pre-existing unrelated `apps/api/tsconfig.json` modification was left untouched and unstaged.

## Status

Implemented — awaiting parent review. EP06F's artifacts: [checkpoint](./checkpoint.md) · [implementation record](./implementation.md).