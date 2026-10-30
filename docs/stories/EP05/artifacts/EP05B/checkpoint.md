# EP05B checkpoint

Updated: 2026-10-30 (America/New_York)
Execution state: [docs/stories/EP05/README.md → Execution queue](../../../README.md#execution-queue) — EP05B row, `Implemented — awaiting parent review`
Story: [docs/stories/EP05/EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md](../../../EP05B-dashboard-sections-classes-deadlines-overdue-sessions.md)
Review unit: EP05 (Student Dashboard, Jira STUDY-19) — the combined parent review follows EP05C; this child has no review gate of its own
Role / scope: implementer — the dashboard page shell, the four sections, the dashboard-local compact row and their component tests. **EP05C is excluded** (the working "Add assignment", the empty-state copy, the shared-owner mount, the EP05 parent index).

## Repository state

- Workspace / branch: `/Users/michaelrobert/Desktop/focus-app`, branch `main`
- HEAD at last update: `0e0ec0d` (the base of this child's commit — the hash is returned in the handoff, not written here)
- Saved work: EP05A is committed at `bc5ae7a` (the data layer this child renders). EP05B's own work is committed in this child's scoped closeout commit.
- Other work to preserve: `apps/api/tsconfig.json` — another contributor's unrelated modification. It is **not** mine: left modified, unstaged and uncommitted; never staged.

## Progress

- [x] Read the repo rules, the implementer role, the shared implementer/frontend skills, the checkpoint + closeout contracts, the delivery state, the EP05 parent README (contract, decision register, invariants, DoD map), the EP05B story in full and the EP05A implementation record §9.
- [x] Inspected the real code the child touches or reuses: `DashboardPage.tsx` (the placeholder), the EP05A model/API surface, `shared/ui/{Card,Badge,EmptyState,Button}`, `shared/lib/{datetime,errors}`, `features/assignments/ui/{assignmentPresentation,AssignmentRow,AssignmentsSection}`, `features/calendar/ui/{CalendarEventChip,CalendarEventDetails}`, `pages/assignments/ui/AssignmentsPage`, `pages/calendar/ui/CalendarPage`, `test/providers.tsx`, `index.css`, `tailwind.config.js`, `.eslintrc.cjs`.
- [x] **Milestone 1** — the shared section module + the two calendar sections and their tests. Verification: `pnpm --filter web test -- src/features/dashboard/ui/TodayClassesSection.test.tsx src/features/dashboard/ui/TodayStudySessionsSection.test.tsx` → **2 files, 21 tests, all passing**.
- [x] **Milestone 2** — the two assignment sections + the compact row and their tests. Verification: `pnpm --filter web test -- src/features/dashboard/ui/UpcomingDeadlinesSection.test.tsx src/features/dashboard/ui/OverdueAssignmentsSection.test.tsx` → **2 files, 24 tests, all passing**.
- [x] **Milestone 3** — the page shell + the a11y/responsive obligations + the page test. Verification: `pnpm --filter web test -- src/pages/dashboard` → **1 file, 15 tests, all passing**.
- [x] Closeout — `implementation.md` written, the narrow README/EP05B status updates applied, the scoped commit made.
- Current step: none — the child is `implementation complete — awaiting parent review`. The next action belongs to **EP05C** (see the handoff in `./implementation.md` §8).

## Decisions and dependencies

- The **UI/UX decisions were settled** (EP05B's `ui-refiner` pass, Decisions #1–#14) and were **not re-opened**; the implementation follows them literally.
- **Seam for EP05C (D05-17):** the sections receive `onOpenDetails(row: AssignmentListItem): void` as a prop; the page owns the callback and exposes it as the optional prop `DashboardPageProps.onOpenDetails` (default: a documented no-op). EP05C wires `actions.openEdit(row)` **without touching a section component**.
- **Seam for EP05C (Decisions #14):** each section takes `emptyState?: { title, description?, action? }`; the page passes provisional titles; EP05C replaces the content **through the same prop**.
- **The quick-action slot:** the page renders exactly one element carrying `data-assignment-focus="add"` — an **empty reserved slot** — in the header's action group, and **zero** `data-assignment-focus="empty-add"` controls. EP05C **replaces** the slot element (it must not nest a control inside it).
- **One page-level `role="status"` live region** (the count summary); the sections have none. The page's root `<section>` is where EP05C attaches `actions.sectionRef`.
- **The request window is page state** — `useState(() => dashboardTodayRange())` — never a `useMemo` over `new Date()`.
- **No client-side profile-zone arithmetic:** the day line and every due date use the payload's `today`/`timeZone`; the browser zone is only the degraded fallback when the calendar query has no payload (A7).
- **The mocking trap (recorded by EP05C's pass):** the RTK Query slices call `httpClient` directly, so the page test intercepts at the axios-adapter level, as in EP05A's slice tests.

## Findings

Recorded as they were discovered; the final dispositions and the closure evidence live in [./implementation.md](./implementation.md) §5.

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| **F-EP05B-01** | EP05B → Decisions #2 (the noon-UTC day-line construction) | `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` | The noon-UTC construction shifts the displayed civil date for every profile zone at **UTC+12 or later** (`Pacific/Kiritimati` +14 → "Today, Oct 31, 2026" for `today = 2026-10-30`). | **Open — implemented exactly as settled; referred to the combined EP05 review / the planner** (a settled UI decision, not an implementation defect). | The combined EP05 parent review / the planner | `DashboardPage.test.tsx` (the settled construction for `America/New_York`); the boundary case is recorded, not tested. |
| **F-EP05B-02** | AC-E05-05's details half / D05-17 | `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` | The page's `onOpenDetails` default is a no-op, so an assignment row's title is inert until EP05C wires the shared owner — a **second** accepted inter-commit transient (the README records only the missing add action). | **Open — bounded to EP05C**; the callback is already exposed as an optional page prop. | EP05C | `DashboardPage.test.tsx` (the spy is called once with the row; no dialog opens). |
| **F-EP05B-03** | Decision #7 (each section's own error state) | `apps/web/src/features/dashboard/ui/*.tsx` | A failed **background** refetch replaces the section's rows with the error box (the already-loaded rows are not shown alongside the error). | **Closed — implemented deliberately**; the alternative is not one of the three settled states. | implementer | `DashboardPage.test.tsx` (the partial-failure cases). |
| **F-EP05B-04** | Decision #11 (the live region's counts) | `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` | When one query has failed, its pair of counts reads `0` (no payload) while its sections show the error; the live region does not announce the failure. | **Closed — implemented as settled** (the sections' `role="alert"` boxes carry the failure; no second live region). | implementer | `DashboardPage.test.tsx` (the partial-failure cases). |

**Deviations:** D-1 (the reserved add slot is an empty element carrying `data-assignment-focus="add"`), D-2 (the per-section state markup is repeated because the shared module is fixed as a `.ts` vocabulary file), D-3 (the page derives the four sets itself for the uncapped counts, with the same pure selectors). All three are recorded in [./implementation.md](./implementation.md) §5.

## Verification

- `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` → **7 files, 84 tests passed** (the story's required command).
- `pnpm --filter web typecheck` → **PASS** (`tsc --noEmit`, exit 0).
- `pnpm --filter web lint` → **PASS** (eslint + the repo's Prettier rule, exit 0).
- `pnpm --filter web test` (the **full** web suite) → **76 files, 936 tests passed**, 0 failed. The known courses flake (F-EP05A-03, `apps/web/src/features/courses/ui/CourseForm.test.tsx`) **did not reproduce** in this run; it is intermittent, out of EP05's scope, and was neither chased nor fixed.
- The tested state is the working tree before this child's commit; the commit's own hash is returned in the handoff.

## Resume next

1. **EP05C** implements next (not this child): the quick action, the empty states, the shared-owner mount and the EP05 parent index. The seams are listed in [./implementation.md](./implementation.md) §8 — read that section first.
2. `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` → expect all green (EP05C adds its own cases to `DashboardPage.test.tsx`).
- Read next: [./implementation.md](./implementation.md) §8 (the EP05C handoff); the EP05C story file; the parent README's execution queue.
