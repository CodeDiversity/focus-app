# EP05C — implementation record

**Child:** EP05C — Dashboard Quick Actions, Empty States & the EP05 Parent Index
**Parent review unit:** EP05 (Student Dashboard, Jira STUDY-19)
**Story:** [docs/stories/EP05/EP05C-quick-actions-empty-states-and-parent-index.md](../../EP05C-quick-actions-empty-states-and-parent-index.md)
**Checkpoint:** [./checkpoint.md](./checkpoint.md) (kept for resume state; the completed behaviour and the evidence live here)
**Role:** implementer — implementation only. **This child is `implementation complete — awaiting parent review`; it does not carry its own approval.**
**Date:** 2026-10-30
**Base commit:** `53ffc41` (the branch tip before this child's work — the child's own commit hashes are returned in the handoff, not written here)
**Parent index:** [../EP05/implementation.md](../EP05/implementation.md) — the combined EP05 evidence record (written by this child)

---

## 1. Acceptance criteria — outcomes

| AC | Requirement | Outcome | Evidence |
|---|---|---|---|
| **AC 1** | The quick action and one owner of the assignment state: the header's action group carries exactly one quick action — a `primary` shared `Button` labelled **"Add assignment"** with a `Plus` left icon and `data-assignment-focus="add"`, as the group's **first** control (before "View Profile"); it is **not** a card; "Create Study Plan" and "Start Focus Session" are rendered nowhere; the dashboard mounts the shared owner (`useAssignmentActions` + `AssignmentDialogs`) **exactly once**, at page level; `actions.sectionRef` is attached to the page's root `<section>`; the page exposes a page-level `onOpenDetails(row)` callback that the rows invoke and that forwards to `actions.openEdit(row)`; exactly **one** `[data-assignment-focus="add"]` and **zero** `[data-assignment-focus="empty-add"]`; the trigger is never disabled and never busy. | **PASS** | `features/dashboard/ui/DashboardQuickActions.test.tsx` (8 cases) — exactly one button named "Add assignment"; the `Plus` icon (`svg.lucide-plus`); the primary variant (`bg-accent`); `data-assignment-focus="add"`; the placeholder's three buttons absent; the handler called once by mouse and once by **Enter** and **Space**; `toBeEnabled()`, no `aria-busy`, no `disabled`, no spinner (`svg.animate-spin` absent); the class contract (`focus-visible:ring-2`, `focus-visible:ring-focus-ring`, `focus-visible:ring-offset-2`, `max-sm:min-h-[44px]`); no `animate-*` without `motion-reduce:animate-none`. `pages/dashboard/ui/DashboardPage.test.tsx` — exactly one `[data-assignment-focus="add"]` and zero `[data-assignment-focus="empty-add"]`; the control order `refresh → add → profile → see-all → rows`; "Create Study Plan" / "Start Focus Session" / "Study Stats" / "Hours Studied" / "Tasks Completed" absent; a row title opens **the same single** dialog (one `[role="dialog"]`). The page's diff shows the reserved `<div data-assignment-focus="add" />` **replaced** (not nested) and the root `<section>` carrying `ref={actions.sectionRef}`. |
| **AC 2** | The create round trip: the trigger opens the shared create form whose create mode offers the **course select** populated with the student's own courses; a student with no courses can still create a course-less assignment (D05-15); a successful create closes the dialog, **refetches** the dashboard's assignments query so the sections update without a reload, moves focus to the "Add assignment" trigger and announces "Assignment added." in the page's **single** live region; a failed create leaves the form **open with the student's input** and shows the shared actionable message — the dashboard re-words nothing, adds no error surface and does not close the dialog. | **PASS** | `pages/dashboard/ui/DashboardPage.test.tsx` — the round trip (one `[role="dialog"]`; `POST /assignments` issued once; the dialog closed; a second `GET /assignments`; the new row visible in a section); focus on the trigger + the single `role="status"` region carrying "Assignment added." (and the count summary preserved); the failed create (the shared form's field error visible, the dialog still open, the Title input still holding the student's text, no row added); the course select (`No course` + `MATH101 Calculus`) and the no-courses student (only "No course"; the create still succeeds). The **DoD-10 browser pass** confirmed the same round trip against the real stack (observations 4–7 in the parent index §6). The failure branch is the shared form's own (`AssignmentForm.tsx:234-254`) — the dashboard adds no error surface and no toast. |
| **AC 3** | The empty states: each of the four sections renders the shared `EmptyState` with its own icon and the content supplied through EP05B's `emptyState` prop — the exact title and description of Decisions #9; the two **assignment** sections offer a `primary` "Add an assignment" that opens the same shared create form; the two **calendar** sections offer an outline link to `/calendar` — "View your week" and "Open the calendar"; no empty state names a study plan, a focus session, a study-stats figure or an action the dashboard does not offer; the study-sessions empty state reads as a calm, expected state; no empty state is a live region; no empty-state control carries a `data-assignment-focus` attribute. | **PASS** | `features/dashboard/ui/dashboardEmptyStates.test.tsx` (8 cases) — the four settled copy pairs; the rendered title/description; the two assignment affordances calling the open handler and carrying the primary variant; the two calendar affordances as `<a href="/calendar">` wrapping an outline button; no "study plan" / "focus session" / "hours studied" / "tasks completed" / "study stats" in any copy; no create-session action; the study-sessions state carries no `role="alert"` and no `role="status"`; no `[data-assignment-focus]` anywhere in an empty state. `pages/dashboard/ui/DashboardPage.test.tsx` — the four sections receive the settled copy when their data is empty, the two "Add an assignment" buttons open the shared form (one dialog), and the two calendar links point at `/calendar`. **No section component was modified** (`git show --stat f93a4c4` lists no file under `features/dashboard/ui/` other than the two new modules). |
| **AC 4** | The EP05 parent index at `./artifacts/EP05/implementation.md` carries the nine required sections: the header block (base and final commits), the child implementation-record table, the **combined** base→final change scope, the AC/TR/DoD → evidence table, the verification evidence (the exact commands and their results — a planned check is never recorded as executed), the **DoD-10 manual browser pass (TR-E05-08)** — **executed**, with the environment, the date and the **observed result per step** — the known gaps, the DoD status, and an explicit statement that the file carries **no verdict**. | **PASS** | [../EP05/implementation.md](../EP05/implementation.md) — the nine sections, with the DoD-10 pass **executed** on 2026-10-30 against the self-contained stack (2 journeys, 15 recorded observations, both passing) and the full `add0f41..f93a4c4` commit list. |

### Shared DoD items that apply to this child

| DoD | Outcome |
|---|---|
| **1 — functional acceptance criteria** | Met (the four ACs above). |
| **2 — invalid-input validation** | Not applicable — no new input. The reused `AssignmentForm` keeps the SP-113/SP-114 validation and its tests unchanged (`features/assignments/ui/AssignmentForm.tsx` was **not** modified). |
| **3 — student data scoping** | Not weakened. This child adds **no** request of its own beyond the existing plain-axios `GET /courses` (the student's own courses, principal-scoped server-side); the create goes through the shared `POST /assignments`. The dashboard still sends no `userId`/`courseId`/`assignmentId`/`tz` parameter. **The combined EP05 review must check** the DoD map's row 3. |
| **4 — actionable API errors** | Met for this child's half: a failed create shows the **shared** actionable message and keeps the form open with the student's input; the dashboard adds no error surface and no second failure announcement (the page test's failed-create case + DoD-10 observation 5). **The combined EP05 review must check** the DoD map's row 4. |
| **5 — loading, empty and error states** | Met for this child's half: the four empty states name the next step and offer the matching action or link; the create failure keeps the form open with an actionable message; the sections' loading/empty/error states are EP05B's (unchanged) and were exercised in the DoD-10 pass (observations 1, 11, 12). |
| **6 — keyboard accessibility** | Met: the trigger is a native button operable with Enter and Space, carries the EP10 focus ring, and the focus order is `refresh → Add assignment → View Profile → sections` (the page test's control-order case; DoD-10 observations 9–10). The dialog's focus trap, Escape handling and focus restoration come from the shared form (unchanged). |
| **7 — responsive layouts** | Met: the action group wraps (`flex-wrap`), the trigger keeps the shared `max-sm:min-h-[44px]` tap target, and the empty states are the shared `EmptyState` — measured at 375 px in the DoD-10 pass (observations 13–14: 44 px tall, no horizontal overflow). |
| **8 — automated tests (TR-E05-05, TR-E05-06, TR-E05-07)** | Met — **24 new test cases** in three files (8 quick-action + 8 empty-state + 8 page-integration). |
| **9 — API/migration documentation** | Not applicable — no API change and no migration. |
| **10 — integrated review** | The **DoD-10 manual browser pass was EXECUTED** (see §4 and the parent index §6). The combined EP05 parent review is the remaining half. |
| **11 — reviewer walkthrough** | The reviewer's (`../EP05/walkthrough.md`) — **not** this child's output. |

---

## 2. What was built

### 2.1 `apps/web/src/features/dashboard/ui/DashboardQuickActions.tsx` (new)

The page's single quick action: a `primary` shared `Button` labelled **"Add assignment"** with a `Plus` (16 px, `aria-hidden`) left icon, carrying `data-assignment-focus="add"`. It is a **pure trigger** (Decisions #5): never `isLoading`, never `disabled`, no `aria-busy`, no spinner — the request's busy state belongs to the shared form's submit button, and a disabled activator would break the shared form's focus restoration (`AssignmentForm.tsx:149-155`).

### 2.2 `apps/web/src/features/dashboard/ui/dashboardEmptyStates.tsx` (new)

The four settled empty states (Decisions #8–#10) as `DashboardEmptyState` content objects: `DASHBOARD_EMPTY_STATE_COPY` holds the four title/description pairs; `overdueAssignmentsEmptyState(onAdd)` / `upcomingDeadlinesEmptyState(onAdd)` build the two assignment affordances (a `primary` "Add an assignment" that opens the shared create form); `todayClassesEmptyState()` / `todayStudySessionsEmptyState()` build the two calendar affordances (an outline link-button to `/calendar` — "View your week" / "Open the calendar", the house "a `Button` inside a `Link`" treatment). The content is supplied **only** through EP05B's `emptyState` prop — **no section component was modified**.

### 2.3 `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (modified)

- **The shared owner, mounted once (D05-17):** `useAssignmentActions` + `AssignmentDialogs` on the page; `actions.sectionRef` on the root `<section>`; the page-level `onOpenDetails` now defaults to `actions.openEdit(row)` (EP05B's documented no-op default is gone — the affordance is live).
- **The cache hand-off:** `onChanged` → the assignments query's `refetch()` + the action sentence; `onSubtaskChanged` / `onSubtaskRefresh` → `refetch()`. The slice defines no tags, so there is no tag invalidation to use; the new row appears only after the server confirms it (no optimistic insert).
- **The course select:** the existing plain-axios `listCourses()` in a non-fatal effect (Decision #7, A3) — the assignments page's pattern. A failed load leaves the select with only "No course" and a course-less assignment is still creatable (D05-15).
- **The announcement:** the action sentence is **prepended** to EP05B's count summary in the page's **single** `role="status"` region, separated by " · ", and cleared on `onFormOpen` so a repeated action announces again (Decision #14). No second live region and no success toast.
- **The quick action** replaces EP05B's reserved slot element in the header's action group, as the group's first control.

**Not touched:** the day line (final — PC-EP05-13), the section components, the refresh control, the section order, the limits, the live region's structure, the four derived sets' derivation timing, `apps/web/src/features/assignments/ui/**` (EP03's shared components), `apps/web/src/features/dashboard/model/**` (EP05A's), `apps/api/**`.

---

## 3. Changed paths

**New (4):**

- `apps/web/src/features/dashboard/ui/DashboardQuickActions.tsx`
- `apps/web/src/features/dashboard/ui/DashboardQuickActions.test.tsx`
- `apps/web/src/features/dashboard/ui/dashboardEmptyStates.tsx`
- `apps/web/src/features/dashboard/ui/dashboardEmptyStates.test.tsx`

**Modified (2):**

- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` — the quick action, the shared-owner mount, the course list, the cache hand-off, the announcement, the four empty-state props
- `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` — the adapter now answers `POST /assignments`, `GET /courses` and a mutable `GET /assignments`; the control-order expectation gained the `add` entry; the reserved-slot case became the working-control case; **the EP05C integration block** (8 new cases)

**Artifacts (2):**

- `docs/stories/EP05/artifacts/EP05C/checkpoint.md` + `implementation.md` (new)
- `docs/stories/EP05/artifacts/EP05/implementation.md` (new — the parent index)

**Documentation status updates (3):**

- `docs/stories/EP05/README.md` — the narrow execution fields only (`Active substory`, `Next substory`, the EP05C queue row, the `## Implementation review log` paragraph)
- `docs/stories/EP05/EP05C-quick-actions-empty-states-and-parent-index.md` — the `Status` line and the artifact pointers only
- `docs/stories/EP05/artifacts/EP05B/implementation.md` — the **F-EP05B-02** row's disposition only (the row already listed the finding as bounded to EP05C)
- `docs/stories/EP05/artifacts/EP05B/checkpoint.md` — the same finding's disposition row only (so the resume-state artifact does not keep a closed finding as actionable)

**Not touched:** `apps/api/**` (including the other contributor's dirty `apps/api/tsconfig.json`), `apps/web/src/features/assignments/ui/**`, `apps/web/src/features/dashboard/ui/**` other than the two new modules, `apps/web/src/features/dashboard/model/**`, `apps/web/src/pages/calendar/**`, `apps/web/src/pages/assignments/**`, `apps/web/e2e/**` (the DoD-10 driver was temporary and was **deleted**), the README's planning content (decision register, correction log, invariants table, shared contract, quality gate, the `**Status:**` line) and the README's `## Autopilot` section (the coordinator's run record).

---

## 4. Verification

All commands were run from the repository root `/Users/michaelrobert/Desktop/focus-app` (the `pnpm --filter web …` commands execute in `apps/web`). The tested state is the working tree of this child **before** its commits — the commits' own hashes are returned in the handoff rather than written into this record.

| # | Command | Result |
|---|---|---|
| V1 | `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` (the story's required command) | **PASS** — **9 files, 110 tests** passed (EP05A's two model suites + EP05B's five files + this child's two new files + the page test). |
| V2 | `pnpm --filter web test -- src/pages/dashboard` (milestone 1) | **PASS** — 1 file, **25 tests** passed (EP05B's 17 + this child's 8 integration cases). |
| V3 | `pnpm --filter web typecheck` | **PASS** — `tsc --noEmit`, no output, exit 0. |
| V4 | `pnpm --filter web lint` | **PASS** — `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`, no output, exit 0 (it includes the repo's Prettier rule). |
| V5 | `pnpm --filter web test` (the **full** web suite) | **78 files / 962 tests — 2 failed.** Both failures are in `apps/web/src/features/courses/ui/CourseForm.test.tsx` ("rejects a description over 2000 characters client-side and never calls the API" and "selects a color swatch and submits it (F111C-3)") — the **known pre-existing flake** **F-EP05A-03** (the courses feature / EP02's surface, reproduced at pristine `b7728c8`). The file **passes in isolation** (`pnpm --filter web test -- src/features/courses/ui/CourseForm.test.tsx` → 36/36). It was **not** chased and **not** "fixed" — it is outside EP05's scope. Reproduced in 2 of 2 full-suite runs of this child; EP05B's and EP05A's runs recorded it as intermittent. |
| V6 | `pnpm --filter web exec playwright test e2e/tmp-dashboard-dod10.spec.ts --reporter=list` — the **DoD-10 manual browser pass** (the driver was a **temporary, uncommitted** spec, **deleted** after the pass; D05-14 forbids adding a dashboard e2e spec to the repo) | **PASS — 2 journeys, both green; 15 observations recorded.** Environment: the repo's self-contained stack — the throwaway `studypilot_e2e_test` database (created + migrated in the global setup, dropped in the teardown), the test API on **:4100**, the test web instance on **:3100** (the developer stack untouched), Playwright's Chromium; date **2026-10-30**. The observed result per step is in the parent index §6. |
| V7 | `pnpm --filter web test -- src/features/courses/ui/CourseForm.test.tsx` (the flake's isolation check) | **PASS** — 1 file, 36 tests passed — the flake is a parallel-suite artefact, not a regression from this child. |
| V8 | `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` (re-run after the commit's lint-staged hook) | **PASS** — 9 files, 110 tests; `typecheck` and `lint` re-run after the hook: both exit 0. |

**The tested commit:** the working tree of this child over the base commit `53ffc41`. The child's own commit hashes are returned in the handoff.

---

## 5. Findings and deviations

### Findings

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| **F-EP05C-01** | The DoD-10 pass's own driver (the throwaway spec) | `apps/web/e2e/tmp-dashboard-dod10.spec.ts` (**deleted**, never committed) | The driver's route glob `**/api/assignments*` also matched the **Vite dev server's module URL** `/src/features/assignments/api/assignmentsApi.ts`; the intercepted 500 broke the app bundle, so the page rendered empty and the error-state step failed — which looked like a product defect. | **Closed — a defect in the throwaway driver, not in the product.** The exact-path glob `**/api/assignments` does not match the module URL; with it the pass ran green. **No application code was changed for this.** | implementer | The pass log (2 journeys, 15 observations, both passing) in the parent index §6; the driver file was deleted after the run. |
| **F-EP05C-02** | AC #2 / Decisions #14 — "the page's **single** `role="status"` region" | `apps/web/src/pages/dashboard/ui/DashboardPage.tsx`; `apps/web/src/widgets/email-verification-banner/ui/EmailVerificationBanner.tsx` (the app shell's, **not** EP05's); `react-hot-toast` (the shared form's toast, **not** EP05's) | In the **integrated** page the document holds **three** `role="status"` nodes: the dashboard's own region, the **app shell's** email-verification banner (`aria-label="Banner resend status"`) and **react-hot-toast's** transient live region (the shared form's failure toast). The dashboard itself renders exactly one. | **Closed — recorded, no change.** The claim is about the dashboard's own markup (the page test asserts exactly one region **in the page component**). The shell's banner and the shared toast are outside EP05's scope; EP05C adds **no** region and **no** success toast. | implementer | The DoD-10 observation 6 (the count of 3, each named) in the parent index §6; the page test's "announces the loaded state and the four counts through one live region" case (one region in the page). |
| **F-EP05C-03** | The page test's `act(...)` hygiene | `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx` | The plain-axios `listCourses()` resolution updates the page's state outside React's `act(...)`, so the page test prints "An update to DashboardPage inside a test was not wrapped in act(...)" warnings. | **Closed — a pre-existing house pattern, not chased.** The assignments page's own test (the same plain-axios course read) emits **116** such warnings; the warning is not a failure and no behaviour changes. | implementer | `pnpm --filter web test -- src/pages/assignments` → 116 "not wrapped in act" warnings from the same source; EP05's own suite passes (V1/V2). |

**Findings/deviations summary:** 3 findings — **all closed**, none open; none required an application-code change. **F-EP05C-01** was a defect in the throwaway DoD-10 driver; **F-EP05C-02** qualifies the "single live region" claim for the integrated page (the dashboard's own region is the only one it renders); **F-EP05C-03** is a pre-existing test-hygiene warning shared with the assignments page.

### Correction rounds after the combined parent review

**These are not implementation-phase findings** (the three above are) — they are the review findings this child owns, raised by the **combined EP05 parent review** and closed after it. The reviewer's finding IDs are kept unchanged, and the review report itself was not edited.

| ID | Raised by | Disposition | Closure evidence |
|---|---|---|---|
| **R-EP05-01** (**polish**) | The combined EP05 parent review (`../EP05/review.md` §2.1) — the **parent index's** two test counts and its A6 quote. | **Closed — a docs-only correction to the parent index** (`../EP05/implementation.md` §3.1, §3.2, §6 and its §4.2 correction-round record). **This child's own counts were the correct ones** (8 per file — §1 and §4); the parent index recorded 7. | The `it(...)` blocks were counted in the two files themselves — `DashboardQuickActions.test.tsx:22, 36, 44, 53, 61, 74, 86, 96` and `dashboardEmptyStates.test.tsx:36, 57, 90, 106, 121, 134, 146, 153` — giving **8** each; the parent index's per-file counts were corrected and the quoted total (**9 files / 110 tests**) was re-checked and left unchanged. The A6 quote was corrected to the shipped copy ("Resource not found — this course or assignment may no longer exist." — `apps/web/src/features/assignments/ui/AssignmentForm.tsx:249`). **No application code, test, configuration or CI file was changed**, and no application gate needed re-running for a documentation-only correction. |
| **R-EP05-02** (**polish**) | The combined EP05 parent review (`../EP05/review.md` §2.1) — the house "`Button` inside a `Link`" treatment giving one visual control two tab stops. | **Open — deliberately not fixed in EP05.** The owner is the **shared/house UI owner** (EP10's `shared/ui` and the existing host pages); the treatment is inherited from the prescribed pattern, not introduced by EP05, and the review states that **no EP05 change is required**. | No change was made anywhere in EP05's scope. Recorded here only so the ID's ownership is not mistaken for an EP05 defect. |

### Deviations from the story's file list / plan text

| ID | Deviation | Why | Impact |
|---|---|---|---|
| **D-1** | The page keeps `DashboardPageProps.onOpenDetails` as an **optional prop**; its default is now `actions.openEdit(row)` instead of EP05B's documented no-op. | EP05B's handoff offered both shapes ("`onOpenDetails ?? ((row) => actions.openEdit(row))`" or dropping the prop). Keeping the prop preserves EP05B's own page-test case (a spy that observes the row callback) and leaves the documented seam in place, while the **default** is now live — which is what closes **F-EP05B-02**. | None behaviourally: with no prop supplied (production) the row's title opens the shared edit dialog; with a prop supplied the host's callback wins. The page test asserts both paths. |
| **D-2** | The hook's `items` array is memoized **on the payload** (`assignments`), while the page's four derived sets stay computed on every render (EP05B's timing — the shared overdue predicate reads the clock). | The story's A4 asks for a memoized `items` so the hook's items-identity effect does not run per render; the page's *counts* must not drift from the sections' rows (EP05B's D-3), and the sections recompute their own sets on every render. | The hook's `items` membership is payload-determined (a row moves between the two lists, it never leaves their union), so the memoization cannot change what the hook sees. No user-visible difference. |

### Closure of the two inter-commit transients (EP05C's boundary)

| Transient | Recorded in | Closed by | Evidence |
|---|---|---|---|
| **F-EP05B-02** — the assignment row's "open relevant details" affordance was inert between EP05B and EP05C (the page's default `onOpenDetails` was a documented no-op). | `artifacts/EP05B/implementation.md` §5 (the row's disposition was "Open — by design, bounded to EP05C"); the EP05 README's "Two accepted inter-commit transients" paragraph (planner-owned). | **EP05C** — the page's default `onOpenDetails` is `actions.openEdit(row)`; the shared owner is mounted once. | The page test's "mounts the shared owner exactly once and opens the same single dialog from a row" case (one `[role="dialog"]`, named "Edit assignment"); DoD-10 observation 8. The row's F-EP05B-02 entry in EP05B's record is updated to **Closed** with this evidence. |
| **The first inter-commit transient** — after EP05B the dashboard had no working "Add assignment" action (the placeholder's three inert quick-action buttons were removed with the old page). | The EP05 README's "Two accepted inter-commit transients" paragraph (planner-owned). | **EP05C** — the working "Add assignment" trigger. | The quick-action test file (8 cases) and the page test's create round trip; DoD-10 observations 3–7. |

Neither transient is a release state, and neither is absorbed as a defect by the combined review.

---

## 6. The EP05C → parent handoff — what the combined EP05 review must check

The parent index is [../EP05/implementation.md](../EP05/implementation.md). The combined review is the **only** sign-off; this child does not dispatch it and does not create `review.md` / `walkthrough.md`.

1. **The whole parent scope**, not this child alone: EP05A's data layer (`bc5ae7a`), EP05B's sections and page (`6c225d8`) **and its fix round** (`03665fe` — the corrected day-line construction and the two required zone-extreme cases, the independent verification of **F-EP05B-01** / **PC-EP05-13**), and this child's quick action, empty states and shared-owner mount (`f93a4c4`).
2. **The DoD map's rows 3 and 4** — the named checks the README requires of the combined review: the dashboard's requests carry no `userId`/`courseId`/`assignmentId`/`tz` parameter, and the rendered rows are the principal's own; a failed query shows the actionable message plus a retry, and a failed create shows the shared actionable copy without discarding the student's input.
3. **The corrected day line** (F-EP05B-01) and its two required boundary-case tests, as the README's "Final implementation review unit" section names.
4. **DoD 10** — the executed manual browser pass recorded in the parent index §6: verify the environment, the date and the observed result per step, and the honest scope of the temporary driver (deleted, never committed — D05-14 / EP10's PR-003).
5. **The two closed transients** (F-EP05B-02 and the missing quick action) — verify that the wiring, not a test-only path, closes them.
6. **The known gaps** the parent index lists: D05-14's missing dashboard e2e coverage (an EP09-scope decision), the deliberately dropped "Study Stats" card (D05-11, final), the plain-axios course list inside an RTK Query page (A3), the shared form's 404 copy (A6), and **FU-EP04-01** — which is **EP04's** and must **not** be absorbed by the combined EP05 review (D05-16).
7. **F-EP05C-02** — the "single live region" claim in the **integrated** page: the dashboard renders exactly one; the app shell's banner and the shared toast own the other two.
8. **The known courses flake** (**F-EP05A-03**) — recorded as observed, not chased; the reviewer should note it as out of EP05's scope rather than as an EP05 regression.
