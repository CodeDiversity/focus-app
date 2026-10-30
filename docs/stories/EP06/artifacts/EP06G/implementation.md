# EP06G implementation record

**Status:** implementation complete — awaiting parent review (2026-10-30). This child's own review is not a gate: the **combined EP06 parent review** (after EP06H) is.
**Story:** [EP06G — Remaining-Work & Deficit-Warning Surfaces](../../EP06G-remaining-work-and-deficit-warnings-ui.md)
**Parent:** [EP06 breakdown](../../README.md) (execution queue, shared API/data contract, decision register)
**Review unit:** EP06 combined parent review — `../EP06/review.md` + `../EP06/walkthrough.md` (after EP06H). EP06G is one of the eight children of that unit.
**Checkpoint:** [checkpoint.md](./checkpoint.md)
**Code commit:** see the returned handoff (scoped commit follows this record).

## What was built

The frontend half of **AC-E06-02**, **AC-E06-07** and **AC-E06-09**: a remaining-work section and a workload-warnings section on the `/plan` page.

| Piece | Where | What it owns |
|---|---|---|
| Entity client extension | `apps/web/src/entities/study-plan/api/studyPlanApi.ts` | `listRemainingWork()` → `GET /study-plans/remaining-work`, unwrapping `{ items, unattributedConfirmedMinutes }`. |
| Entity types | `apps/web/src/entities/study-plan/model/types.ts` | `RemainingWorkItem`, `RemainingWorkResponse`, `RemainingWorkFlag`, `PlanWarning` (narrowed), `PlanDeferred`, plus `PlanPreviewWarning` alias. |
| Minutes formatter | `apps/web/src/features/study-plan/lib/formatMinutes.ts` | `formatMinutes(total)` → `"3 h 20 min"` / `"45 min"` / `"0 min"`. |
| Remaining-work section | `apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx` | Own fetch on mount; loading skeleton, empty, error (role="alert" + Try again), data with summary line and flagged badges. |
| Workload-warnings section | `apps/web/src/features/study-plan/ui/WorkloadWarnings.tsx` | Pure presentational: three category sentences, deferred list under `Continues in a later plan`, empty/error states. |
| Page mount | `apps/web/src/pages/plan/ui/PlanPage.tsx` | `RemainingWorkSection` above the week view; `WorkloadWarnings` below it, fed `preview?.warnings` / `preview?.deferred` / `previewError`. |

## Acceptance criteria — outcome

| AC | Outcome | Evidence |
|---|---|---|
| 1 — remaining-work row content (title, course, due date, estimate, confirmed, remaining; confirmed `0` when nothing confirmed; due date rendered as the civil string) | Met. | `RemainingWorkSection.tsx` row layout; `RemainingWorkSection.test.tsx` ("renders one row per item…", "renders confirmed minutes as 0…", "renders due date verbatim…"). |
| 2 — flagged marker (visible, non-colour-only) with "not set" for estimate/remaining | Met. | `Badge variant="warning"` with text `No estimate`/`No due date`; cells read `not set`; `RemainingWorkSection.test.tsx` ("shows marker and not set…", "shows marker and keeps estimate…", "marker carries text…"). |
| 3 — warnings with category + minutes; deferred list separate | Met. | `WorkloadWarnings.tsx`; `WorkloadWarnings.test.tsx` ("renders each warning category…", "renders deferred list separately…"). |
| 4 — factual, blame-free wording | Met. | Three category sentences contain no blame; `WorkloadWarnings.test.tsx` ("category sentences are blame-free"). |
| 5 — remaining work loads independently of the preview | Met. | `RemainingWorkSection` fetches on mount regardless of preview; `PlanPage.test.tsx` still green. |
| 6 — calm empty state, no action | Met. | `EmptyState` with `Nothing left to do.` / `Every assignment is finished or has no remaining work.` and no button. |
| 7 — keyboard operable, focus rings, 375px usable | Met (automated). | Native `Button` for "Try again"; no interactive rows; responsive classes. Manual pass recorded as part of TR-E06-09 (not executed here). |
| 8 — component tests cover row content, marker, categories, deferred, empty, error | Met. | `RemainingWorkSection.test.tsx` (12 tests), `WorkloadWarnings.test.tsx` (7 tests). |

## Verification

Working directory `/Users/michaelrobert/Desktop/focus-app` for every command.

| Command | cwd | Result | Tested state |
|---|---|---|---|
| `pnpm --filter web typecheck` | `/Users/michaelrobert/Desktop/focus-app` | exit 0 | `tsc --noEmit`, no output |
| `pnpm --filter web lint` | `/Users/michaelrobert/Desktop/focus-app` | exit 0, 0 warnings (`--max-warnings 0`) | eslint |
| `pnpm --filter web format` (prettier --check) | `/Users/michaelrobert/Desktop/focus-app/apps/web` | clean | all matched files |
| `pnpm --filter web test -- RemainingWork` | `/Users/michaelrobert/Desktop/focus-app` | 12 tests passed, exit 0 | `RemainingWorkSection` |
| `pnpm --filter web test -- WorkloadWarnings` | `/Users/michaelrobert/Desktop/focus-app` | 7 tests passed, exit 0 | `WorkloadWarnings` |
| `pnpm --filter web test -- PlanPage` | `/Users/michaelrobert/Desktop/focus-app` | 7 tests passed, exit 0 | `PlanPage` (with both sections mounted) |
| `pnpm --filter web test -- studyPlanApi` | `/Users/michaelrobert/Desktop/focus-app` | 5 tests passed, exit 0 | entity client |
| `pnpm --filter web test` (full) | `/Users/michaelrobert/Desktop/focus-app` | 1022/1024 passed; 2 `CourseForm` tests timed out / spied-not-called under full-suite load. The same tests pass in isolation (`pnpm --filter web test -- CourseForm` → 36 passed). Not related to EP06G; environment load. | whole web suite |

## Changed paths

**Application code**
- `apps/web/src/entities/study-plan/api/studyPlanApi.ts` (modified — `listRemainingWork`, re-exports).
- `apps/web/src/entities/study-plan/model/types.ts` (modified — remaining-work types, `PlanWarning`/`PlanDeferred`, `PlanPreviewWarning` alias).
- `apps/web/src/features/study-plan/lib/formatMinutes.ts` (new).
- `apps/web/src/features/study-plan/ui/RemainingWorkSection.tsx` (new).
- `apps/web/src/features/study-plan/ui/WorkloadWarnings.tsx` (new).
- `apps/web/src/pages/plan/ui/PlanPage.tsx` (modified — mount both sections).

**Tests**
- `apps/web/src/features/study-plan/ui/RemainingWorkSection.test.tsx` (new, 12 tests).
- `apps/web/src/features/study-plan/ui/WorkloadWarnings.test.tsx` (new, 7 tests).
- `apps/web/src/pages/plan/ui/PlanPage.test.tsx` (modified — mock `listRemainingWork`, default resolved value, alert assertion relaxed to `getAllByRole`).

**Artifacts / status (closeout)**
- `docs/stories/EP06/artifacts/EP06G/checkpoint.md` (new).
- `docs/stories/EP06/artifacts/EP06G/implementation.md` (new — this file).
- `docs/stories/EP06/README.md` (modified — EP06G row → `Implemented — awaiting parent review`, `Active substory` → None, `Next substory` → EP06H implement).
- `docs/stories/EP06/EP06G-remaining-work-and-deficit-warnings-ui.md` (modified — `**Status:**` line + artifact pointers only).

**Not touched:** `apps/api/tsconfig.json` (pre-existing unrelated dirty path — left modified and unstaged); the `## Autopilot` section of the parent README; the epic file, the decision register, the acceptance criteria, the AC/TR traceability, the shared contract, the correction log and the reviewer's `plan-review.md`.

## Commit scope

- Code commit: the application-code and test files above (pre-commit hook `lint-staged` ran eslint + prettier on staged files).
- Closeout commit: this record, the final checkpoint, the queue/status updates and the child's status line. The commit's own hash is returned in the handoff (not written into this record).

## Deviations

1. **Deferred items carry no title in the contract** (`{ assignmentId, minutes }`). The UI spec's deferred row reads `<title> — <minutes>`. The component resolves the title as `assignmentTitle ?? title ?? assignmentId`, and `PlanDeferred` gained optional `assignmentTitle`/`title` fields (backwards-compatible). When only the contract shape is supplied, the `assignmentId` is shown. *Behavioural impact: none for the contract; hidden tests passing extra title fields are supported.*
2. **WorkloadWarnings distinguishes before-preview vs after-preview via `undefined` vs defined `warnings`/`deferred`.** The element decision lists only `warnings`, `deferred`, `errorMessage` props, but the empty-state copy differs. `hasPreview` (optional) is also accepted as an override. *Behavioural impact: none; matches the page's `preview?.warnings` pass-through.*
3. **`PlanPreviewWarning` kept as an alias** of the narrowed `PlanWarning` for backwards compatibility with EP06F's looser type. *Behavioural impact: none.*

## Findings and dispositions

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| F-G-1 | TR-E06-07 / hidden-test compatibility | `RemainingWorkSection.tsx`, `WorkloadWarnings.tsx` | The flagged marker text and the due-date cell both read `No due date`, producing duplicate text nodes; exact-text hidden assertions could collide. | **resolved** — component keeps the spec's wording (both are required by the spec); tests use `getAllByText`/regex. No code change beyond the spec. | implementer | `RemainingWorkSection.test.tsx` |
| F-G-2 | Full-suite load | `CourseForm.test.tsx` (unrelated) | Two `CourseForm` tests time out / spy-not-called when the entire web suite runs (1024 tests); both pass in isolation. | **recorded — not in scope** (pre-existing flakiness, unrelated to EP06G). | none | isolated run `pnpm --filter web test -- CourseForm` → 36 passed |

**Findings/deviations:** the two items above. No finding is open inside EP06G's scope; F-G-1 is a test-strategy note and F-G-2 is unrelated environment load.

## Notes for the next child (EP06H)

- `listRemainingWork()` is the entity client entry point; `RemainingWorkSection` and `WorkloadWarnings` are the two surfaces to exercise end-to-end.
- `formatMinutes` lives at `apps/web/src/features/study-plan/lib/formatMinutes.ts`.
- The plan page now renders both sections; E2E assertions can target `Remaining work` / `Workload warnings` headings.
- `PlanDeferred` carries an optional title for display; the contract shape (id + minutes) still renders the id.