# EP05C checkpoint

Updated: 2026-10-30 (America/New_York) — EP05C opened
Execution state: [docs/stories/EP05/README.md → Execution queue](../../../README.md#execution-queue) — the EP05C row, `In progress` (it was `Ready`); EP05A and EP05B are `Implemented — awaiting parent review`
Story: [docs/stories/EP05/EP05C-quick-actions-empty-states-and-parent-index.md](../../../EP05C-quick-actions-empty-states-and-parent-index.md)
Review unit: EP05 (Student Dashboard, Jira STUDY-19) — this is the **last child**; it owns the parent implementation index. The combined EP05 parent review follows this child; this child has no review gate of its own.
Role / scope: implementer — the dashboard's quick action, the shared-owner mount, the per-section empty-state content, the page's announcement and focus contract, the page integration tests, and the **EP05 parent implementation index**. **Excluded:** the four section components (EP05B's), the day line (final), the shared EP03 assignment components, any backend change, the reviewer's `review.md` / `walkthrough.md`, and the parent's planning content.

## Repository state

- Workspace / branch: `/Users/michaelrobert/Desktop/focus-app`, branch `main`
- HEAD at last update: `53ffc41` (the tip before this child's work — the commit's own hash is returned in the handoff, not written here)
- Saved work: EP05A `bc5ae7a` (the data layer), EP05B `6c225d8` (the page + sections) and EP05B's fix round `03665fe` (the corrected day line). The planning and `ui-refiner` passes are `972c31d`, `92b4a41`, `0e0ec0d`; the plan-review commits are `70bfb99`…`b7728c8`.
- Other work to preserve: `apps/api/tsconfig.json` — another contributor's unrelated modification. It is **not** mine: left modified, unstaged and uncommitted; never staged.

## Progress

- [x] Read the repo rules (`AGENTS.md`), the implementer role, the implementer + frontend skills, the checkpoint / closeout / review-cadence contracts, the delivery state, the EP05 parent README (execution queue, shared contract, decision register D05-2/5/11/14/15/17/18, invariants, DoD map, DoD-10 gate), the EP05C story in full, EP05B's `implementation.md` §8 (the EP05C handoff) and EP05B's `checkpoint.md` → *Resume next*.
- [x] Inspected the real code this child touches or reuses: `pages/dashboard/ui/DashboardPage.tsx` + its test, `features/dashboard/ui/dashboardSection.ts` and the four sections, `features/assignments/model/useAssignmentActions.ts` + `model/types.ts`, `features/assignments/ui/{AssignmentForm,AssignmentDialogs,AssignmentsSection}`, `pages/assignments/ui/AssignmentsPage.tsx` (the reference host), `entities/assignment/api/assignmentApi.ts`, `entities/course/api/courseApi.ts`, `entities/assignment/model/status.ts`, `features/dashboard/model/dashboardSelectors.ts`, `shared/ui/{Button,EmptyState}`, `shared/api/httpClient.ts`, `features/assignments/api/assignmentsApi.ts`, `test/providers.tsx`, `.eslintrc.cjs`, the shared Prettier config, `lucide-react@0.312.0`'s icon markup, `apps/web/e2e/*` (the self-contained stack), and the EP10 parent-index precedent.
- [x] **Milestone 1** — the quick action + the shared-owner mount + the dialog wiring. `features/dashboard/ui/DashboardQuickActions.tsx` (new), the page's `useAssignmentActions` mount, `sectionRef` on the root `<section>`, `onOpenDetails` → `actions.openEdit(row)`, the `AssignmentDialogs` mount, the `listCourses()` read and the `refetch()` hand-off. Verification: `pnpm --filter web test -- src/pages/dashboard` → **1 file, 25 tests, all passing**.
- [x] **Milestone 2** — the empty-state content + the page's announcement. `features/dashboard/ui/dashboardEmptyStates.tsx` (new) with the four settled copy pairs and the affordance factories; the four `emptyState` props; the action sentence prepended to EP05B's live region and cleared on `onFormOpen`. Verification: `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` → **9 files, 110 tests, all passing**.
- [x] **Milestone 3** — the page's integration tests, the parent index and the DoD-10 pass. **The DoD-10 manual browser pass was EXECUTED** against the self-contained stack (2026-10-30, 2 Playwright journeys, 15 recorded observations, both passing) — see §6 of the parent index.
- [x] Closeout — `implementation.md` (this child) and the EP05 parent index written; the narrow README/EP05C status updates applied; the scoped commits made.
- Current step: none — the child is `implementation complete — awaiting parent review`. The next action belongs to the **combined EP05 parent review** (the reviewer).

## Decisions and dependencies

- **The story's nine decisions are settled** (the `ui-refiner` pass, 2026-10-30, D05-12) and are **not re-opened**: the quick-action layout/label/icon/variant/busy state, the shared dialog presentation and the course select, the empty-state mechanism/copy/affordances/focus targets, the error presentation, the focus and announcement contract, the parent index, and the 375px / keyboard / reduced-motion behaviour.
- **One owner, one mount (D05-17):** the **page** mounts `useAssignmentActions` + `AssignmentDialogs` exactly once. The sections are untouched — the empty-state content is supplied **only** through the `emptyState` prop.
- **The reserved slot is replaced, not filled:** EP05B's empty `<div data-assignment-focus="add" />` is removed and the shared `Button` carrying the same attribute takes its place (EP05B's deviation D-1). The page renders exactly **one** `[data-assignment-focus="add"]` and **zero** `[data-assignment-focus="empty-add"]`.
- **The day line is FINAL** (EP05B → Decisions #2 as corrected by PC-EP05-13): the payload's civil date is rendered verbatim. This child did **not** touch its construction, wording, zone id or absence rule (the diff shows the day-line expression untouched).
- **The page's derivation timing is EP05B's:** the four derived sets stay computed on every render (the shared overdue predicate reads the clock). Only the hook's `items` array is memoized — on the payload — so the hook's items-identity effect does not run per render; its membership is payload-determined, so the live region's counts and the sections' rows cannot drift apart.
- **The mocking trap:** the RTK Query slices call `httpClient` directly, so the page test intercepts at the **axios-adapter** level (EP05A's precedent); the create and the course list go through the same client and are intercepted there too.
- **The course list is a plain-axios read** (`listCourses()`) — the assignments page's pattern (A3). A failed load is non-fatal: the select then offers only "No course" (D05-15).
- **The DoD-10 pass drove the real stack** with a **temporary, uncommitted** Playwright spec (`apps/web/e2e/tmp-dashboard-dod10.spec.ts`), which was **deleted** after the pass — D05-14 forbids adding a dashboard e2e spec to the repo (EP10's PR-003).

## Findings

Recorded as they were discovered; the final dispositions and the closure evidence live in [./implementation.md](./implementation.md).

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| **F-EP05C-01** | The DoD-10 pass's own driver (the throwaway spec) | `apps/web/e2e/tmp-dashboard-dod10.spec.ts` (**deleted**, never committed) | The driver's route glob `**/api/assignments*` also matched the **Vite dev server's module URL** `/src/features/assignments/api/assignmentsApi.ts`; the intercepted 500 broke the app bundle and the page rendered empty, which looked like a product defect. | **Closed — a defect in the throwaway driver, not in the product.** The exact-path glob `**/api/assignments` does not match the module URL; with it the pass ran green. No application code was changed. | implementer | The pass log (2 journeys, 15 observations, both passing) in the parent index §6; the driver file was deleted. |
| **F-EP05C-02** | AC #2 / Decision #14 — "the page's **single** `role="status"` region" | `apps/web/src/pages/dashboard/ui/DashboardPage.tsx`, `apps/web/src/widgets/email-verification-banner/ui/EmailVerificationBanner.tsx` (not EP05's), `react-hot-toast` (not EP05's) | In the **integrated** page the document holds **three** `role="status"` nodes: the dashboard's own region, the **app shell's** email-verification banner (`aria-label="Banner resend status"`) and **react-hot-toast's** transient live region (the shared form's failure toast). The dashboard itself renders exactly one; the other two belong to the shell and to the shared toast. | **Closed — recorded, no change.** The claim is about the dashboard's own markup (the page test asserts exactly one region in the page component). The shell's banner and the shared toast are outside EP05's scope; EP05C adds no region and no success toast. | implementer | The DoD-10 observation 6 (the count of 3, named) in the parent index §6; the page test's "announces … through one live region" case. |
| **F-EP05C-03** | The page test's `act(...)` hygiene | `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` | The plain-axios `listCourses()` resolution updates the page's state outside React's `act(...)`, so the page test prints "An update to DashboardPage inside a test was not wrapped in act(...)" warnings. | **Closed — pre-existing house pattern, not chased.** The assignments page's own test (the same plain-axios course read) emits 116 such warnings; the warning is not a failure and the behaviour is unchanged. | implementer | `pnpm --filter web test -- src/pages/assignments` → 116 "not wrapped in act" warnings (the same source); EP05's own suite passes. |

## Verification

- `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` → **9 files, 110 tests passed** (the story's required command).
- `pnpm --filter web typecheck` → **PASS** (`tsc --noEmit`, exit 0).
- `pnpm --filter web lint` → **PASS** (eslint + the repo's Prettier rule, exit 0).
- `pnpm --filter web test` (the **full** web suite) → **78 files, 962 tests; 2 failed** — both in `apps/web/src/features/courses/ui/CourseForm.test.tsx`, the **known pre-existing flake** (F-EP05A-03, courses/EP02's surface, reproduced at pristine `b7728c8`). The file passes in isolation (`36/36`). Not chased, not fixed.
- **DoD-10 manual browser pass (TR-E05-08)** → **EXECUTED** on 2026-10-30 against the self-contained stack (throwaway `studypilot_e2e_test` database, test API on :4100, test web on :3100): **2 Playwright journeys passed, 15 observations recorded** (desktop empty states / quick action / create round trip / failed create / focus / announcement / details dialog / tab order / error state / loading state, and 375px: 44 px target, no horizontal overflow, working create). The driver was a **temporary, uncommitted** spec, deleted after the pass.
- The tested state is the working tree of this child **before** its commits; the commits' own hashes are returned in the handoff.

## Resume next

1. **The combined EP05 parent review** is next (the reviewer) — it owns `./artifacts/EP05/review.md` and `./artifacts/EP05/walkthrough.md`. This child does not dispatch it.
2. `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` → expect all green (the same tree the parent index records).
- Read next: [./implementation.md](./implementation.md) (this child's AC outcomes, verification, findings and the parent handoff) and the parent index [../EP05/implementation.md](../EP05/implementation.md).

