# EP05 implementation index

**Parent:** [EP05 breakdown](../README.md) — Student Dashboard (Jira STUDY-19)
**Written by:** EP05C (the final child; it owns the combined evidence record).
**Status:** All three children implemented — awaiting the combined EP05 parent review.
**Base commit (the commit before EP05's first change):** `add0f41` — EP05's first change is `1ff69d5` (the breakdown).
**Final commit:** `f93a4c4` — this child's implementation (the quick action, the empty states and the shared-owner mount). The closeout commit that adds **this** index, EP05C's record and the execution-status updates is the branch tip at handoff; its hash is returned in the handoff (a commit's own hash is never written into its own record).
**Date:** 2026-10-30

**The nine sections this index must carry** (the story's "The EP05 parent index — the required content"): the **header block** (above) → §1; the **child implementation records** → §1; the **combined base→final change scope** → §2; the **AC / TR / DoD ownership → evidence** → §3; the **verification evidence** → §4; the **DoD-10 manual browser pass (TR-E05-08)** → §5; the **known gaps** → §6; the **DoD status** → §7; **what this file is not** → §8.

---

## 1. Review scope — the parent and its complete child inventory

The review unit is **EP05** — one combined review of the whole parent scope after all three children are implemented (no per-child review gate; no child `review.md` is expected).

| Child | Implementation record | Commit | Scope summary |
|---|---|---|---|
| **EP05A** | `./../EP05A/implementation.md` | `bc5ae7a` | The dashboard data layer: two RTK Query slices (assignments, calendar), the shared base query, the store registration, the "today" derivation and the four derived sets. |
| **EP05B** | `./../EP05B/implementation.md` | `6c225d8` (+ the fix round `03665fe`) | The four dashboard sections (today's classes, upcoming deadlines, overdue assignments, today's study sessions), the dashboard-local compact row, the shared section vocabulary and the rebuilt dashboard page. |
| **EP05C** | `./../EP05C/implementation.md` | `f93a4c4` | The working "Add assignment" quick action, the per-section empty states, the single mount of the shared assignment owner on the dashboard page, the focus/announcement contract, the page integration tests and **this** parent index. |

(Paths are relative to this file's directory: `docs/stories/EP05/artifacts/EP05/`.)

**Not in EP05's scope, and not to be absorbed by the combined review:** **FU-EP04-01** (the EP04 calendar page's browser-local week range — EP04's, D05-16) and EP04's `features/calendar/ui/CalendarEventDetails.tsx:89` (the same noon-UTC construction for an *event's* civil date — EP04's reviewed surface).

---

## 2. The combined Git change scope (base → final)

`git diff --stat add0f41..f93a4c4` — **40 files changed, 6036 insertions(+), 120 deletions(-)**.

### 2.1 Every EP05 commit, in order

| Commit | Subject | Scope |
|---|---|---|
| `1ff69d5` | docs(EP05): add EP05A dashboard data layer story and EP05 breakdown | The breakdown README, the shared contract, the decision register and EP05A's story. |
| `e29bee7` | docs(EP05): add EP05B dashboard sections story | EP05B's story. |
| `35197b2` | docs(EP05): add EP05C quick actions, empty states and parent index story | EP05C's story. |
| `3b8dd83` | docs(EP05): consolidate EP05 breakdown after cross-file gate | The breakdown's consolidation. |
| `f0b17f9` | chore(EP05): record planner dispatch returned in autopilot checkpoint | The coordinator's run record. |
| `1e0ff77` | chore(EP05): open planner correction dispatch for the today-derivation fix | The coordinator's run record. |
| `3355455` | docs(EP05A): widen the dashboard request window to +/-2 days with the 26-hour IANA bound | The planner's correction (PC-EP05-01) in EP05A's story. |
| `1d967cc` | docs(EP05B,EP05C): settle the Study Stats card removal | D05-11 final. |
| `cde6f17` | docs(EP05): apply the 2026-10-29 planning correction pass (PC-EP05-01..03) | The planner's correction pass. |
| `b595e4f` | docs(EP04): record FU-EP04-01, the calendar page's browser-local week range | **Cross-epic** — EP04's README (D05-16). Touches no EP05 file. |
| `dbaf35b` | chore(EP05): record planner correction dispatch returned | The coordinator's run record. |
| `70bfb99` | docs(EP05): save the pass-1 plan review (Changes Required) and record the reviewer dispatch | The reviewer's plan-review report (pass 1). |
| `d069418` | chore(EP05): open the planner correction dispatch for the pass-1 plan findings | The coordinator's run record. |
| `2897868` | docs(EP05): name the single shared assignment owner and the row→host callback (PR-001) | D05-17 / D05-18. |
| `461a29a` | docs(EP05): verify the IANA offset bound by command and make the adversarial test assert containment (PR-002) | The planner's correction of PC-EP05-05. |
| `1aa4053` | docs(EP05): require an executed DoD-10 pass and reclassify DoD 3/4 (PR-003, PR-004) | PC-EP05-06 / PC-EP05-07 — the DoD-10 execution rule. |
| `d8df288` | docs(EP05): polish pass 1 findings PR-005..PR-009 (reduced motion, reuse inventory, citations, milestones, provenance) | The planner's correction pass. |
| `1114fe0` | docs(EP05): record the plan-review gate, the DoD-10 gate and the honest quality-gate verdict | The plan-review gate state. |
| `45807c7` | chore(EP05): open the plan re-review dispatch after the planner correction pass | The coordinator's run record. |
| `b7728c8` | docs(EP05): save the pass-2 plan review (Plan Ready) and open the EP05A implementation dispatch | The reviewer's plan-review report (pass 2 — the gate). |
| **`bc5ae7a`** | **feat(EP05A): add the dashboard data layer (RTK Query slices, store registration, "today" derivation)** | **EP05A's implementation** — 17 files (13 application files: 2 slices + 2 slice tests + the model + 2 model tests + the shared base query + the session client it moved out of + the store + its test + the test store; and 4 records). |
| `972c31d` | chore(EP05): record the EP05A implementation closeout and open the EP05B ui-refiner dispatch | The coordinator's run record. |
| `92b4a41` | docs(EP05B): settle the dashboard sections' UI/UX decisions and open the EP05C ui-refiner pass | The `ui-refiner` pass on EP05B (D05-12). |
| `0e0ec0d` | docs(EP05C): settle the quick action, empty states and parent-index UI/UX decisions | The `ui-refiner` pass on EP05C (D05-12) — the nine settled decisions. |
| **`6c225d8`** | **feat(EP05B): rebuild the dashboard page and add its four sections** | **EP05B's implementation** — 16 files (the shared vocabulary + 4 sections + 4 section tests + the compact row + the page + the page test + the child's records). |
| `7ee0f2a` | chore(EP05): record the EP05B implementation closeout and open the planner fix dispatch (F-EP05B-01) | The coordinator's run record. |
| `f1cfe68` | docs(EP05B): correct the day-line construction (F-EP05B-01) and add the zone-extreme test obligations | The planner's correction (PC-EP05-13). |
| `957f2e5` | docs(EP05): record PC-EP05-13/PC-EP05-14 and refresh the queue, contract and quality gate | The planner's correction + the second inter-commit transient. |
| `c5a1b2e` | docs(EP05): point the correction log intro at the PC-EP05-13/PC-EP05-14 subsection | The planner's correction log. |
| `4022312` | chore(EP05): open the implementer fix dispatch for the corrected day-line construction | The coordinator's run record. |
| **`03665fe`** | **fix(EP05B): render the day line's civil date verbatim and add the two zone-extreme cases (F-EP05B-01, PC-EP05-13)** | **EP05B's implementer fix round** — 6 files (the page, the page test, EP05B's records, the README's execution fields, EP05B's story status). |
| `53ffc41` | chore(EP05): record the EP05B fix round and open the EP05C implementation dispatch | The coordinator's run record. |
| **`f93a4c4`** | **feat(EP05C): add the dashboard quick action, the empty states and the shared-owner mount** | **EP05C's implementation** — 6 files (2 new modules + 2 new test files + the page + the page test). |
| *(the closeout commit)* | docs(EP05): the EP05 parent index, EP05C's record and the execution-status updates | This index, EP05C's `checkpoint.md` + `implementation.md`, EP05B's F-EP05B-02 closure, the README's narrow execution fields and EP05C's story status. Its hash is returned in the handoff. |

### 2.2 The combined application-code scope

| Area | Files | Child |
|---|---|---|
| The data layer | `features/assignments/api/assignmentsApi.ts` (+ test), `features/calendar/api/calendarApi.ts` (+ test), `features/dashboard/model/{dashboardRange,dashboardSelectors}.ts` (+ 2 tests), `shared/api/rtkBaseQuery.ts` (the base query moved out of `features/session/api/sessionApi.ts`, D05-07), `app/store/store.ts` (+ test), `test/providers.tsx` | EP05A |
| The sections | `features/dashboard/ui/{dashboardSection,TodayClassesSection,UpcomingDeadlinesSection,OverdueAssignmentsSection,TodayStudySessionsSection,DashboardAssignmentRow}.tsx` (+ 4 tests) | EP05B |
| The page and this child's surfaces | `pages/dashboard/ui/DashboardPage.tsx` (+ test), `features/dashboard/ui/{DashboardQuickActions,dashboardEmptyStates}.tsx` (+ 2 tests) | EP05B → EP05C |

**No application file under `apps/api/**` is in EP05's scope** — EP05 adds no endpoint and changes no contract (D05-3).

### 2.3 The working tree at the time of writing

**No EP05 path is uncommitted.** The only dirty path in the workspace is **`apps/api/tsconfig.json`** — **another contributor's unrelated modification**, left modified, unstaged and uncommitted, and **not** part of EP05's scope. It is listed here only so the reviewer does not mistake it for EP05 work.

---

## 3. AC / TR / DoD ownership → the collected evidence

### 3.1 The epic acceptance criteria

| Epic AC | Owning child(s) | Evidence |
|---|---|---|
| **AC-E05-01** — the dashboard displays today's class schedule | EP05A (the calendar query + the `today` selection), EP05B (the section) | `features/dashboard/model/dashboardRange.ts` + `dashboardSelectors.ts` (and their tests); `features/dashboard/ui/TodayClassesSection.tsx` + `TodayClassesSection.test.tsx` (11 cases). |
| **AC-E05-02** — incomplete assignments are ordered by upcoming deadline | EP05A (the split, the endpoint's order preserved), EP05B (the section) | `features/dashboard/model/dashboardSelectors.ts` + `dashboardSelectors.test.ts`; `features/dashboard/ui/UpcomingDeadlinesSection.tsx` + `UpcomingDeadlinesSection.test.tsx` (13 cases). |
| **AC-E05-03** — overdue assignments are clearly identified | EP05A (the shared predicate, never re-derived), EP05B (the section + the text badge) | `entities/assignment/model/status.ts` (unchanged); `features/dashboard/ui/OverdueAssignmentsSection.tsx` + `DashboardAssignmentRow.tsx` + `OverdueAssignmentsSection.test.tsx` (11 cases). |
| **AC-E05-04** — planned study sessions appear for the selected day (**display half**; creation is EP06/EP07's) | EP05A (the `STUDY_SESSION` selection), EP05B (the section) | `features/dashboard/ui/TodayStudySessionsSection.tsx` + `TodayStudySessionsSection.test.tsx` (10 cases); the empty state is EP05C's copy (below). |
| **AC-E05-05** — students can add assignments and open relevant details directly | EP05B (the row affordances), **EP05C** (the working "Add assignment" action through the shared owner, mounted **once**) | `features/dashboard/ui/DashboardQuickActions.tsx` + `DashboardQuickActions.test.tsx` (7 cases); `pages/dashboard/ui/DashboardPage.test.tsx` — the create round trip, the focus/announcement contract, the failed create, the one-mount case; `artifacts/EP05C/implementation.md` §1 (AC 1 and AC 2); the DoD-10 pass, observations 3–8 (§5 below). |
| **AC-E05-06** — empty states explain what the student can do next | EP05C | `features/dashboard/ui/dashboardEmptyStates.tsx` + `dashboardEmptyStates.test.tsx` (7 cases); `pages/dashboard/ui/DashboardPage.test.tsx` — the four sections receive the settled copy; DoD-10 observation 1 (§5). |
| **AC-E05-07** — dashboard sections have sensible limits and links to full lists | EP05B | The four section components (`dashboardSection.ts`'s limits 5/5/5/3, D05-10) + their four test files; the "See all" links to `/assignments` and `/calendar`. |

### 3.2 The test requirements

| TR | Owning child | Evidence |
|---|---|---|
| **TR-E05-01** — data-layer tests (endpoint wiring, the request window, the `today` selection, the split, the order, the limits) | EP05A | `features/dashboard/model/dashboardRange.test.ts` (the ±1-day and the **26-hour-spread** adversarial cases) + `dashboardSelectors.test.ts`; `features/assignments/api/assignmentsApi.test.ts` + `features/calendar/api/calendarApi.test.ts`. |
| **TR-E05-02** — class-section tests | EP05B | `features/dashboard/ui/TodayClassesSection.test.tsx` (11 cases). |
| **TR-E05-03** — assignment-section tests | EP05B | `features/dashboard/ui/UpcomingDeadlinesSection.test.tsx` (13) + `OverdueAssignmentsSection.test.tsx` (11). |
| **TR-E05-04** — study-session-section tests | EP05B | `features/dashboard/ui/TodayStudySessionsSection.test.tsx` (10). |
| **TR-E05-05** — quick-action tests (the shared form opens, a successful create closes it and refreshes the data, focus lands on a stable control, a failed create shows an actionable message and leaves the form open) | EP05C | `features/dashboard/ui/DashboardQuickActions.test.tsx` (7); `pages/dashboard/ui/DashboardPage.test.tsx` — the create round trip, the focus/announcement contract, the failed create. |
| **TR-E05-06** — empty-state tests (every section names the next step and offers the matching action or link) | EP05C | `features/dashboard/ui/dashboardEmptyStates.test.tsx` (7); the page test's empty-state case. |
| **TR-E05-07** — accessibility and responsive tests (keyboard operability and focus order, visible focus, overdue marked without colour alone, 375 px, reduced motion) | EP05B (reduced motion, the page's layout, the focus order), EP05C (the quick action, the empty states) | The page test's control-order, focus-treatment, class-contract and reduced-motion cases; `DashboardQuickActions.test.tsx` (the focus treatment, the 44 px tap target, the reduced-motion companion); the DoD-10 pass at 375 px (observations 13–14). |
| **TR-E05-08** — the manual browser pass (desktop + 375 px, every section's states, the add-assignment flow) | **EP05C executes it**; EP05B contributes the states it exercises | **Executed** — §5 below (the environment, the date and the observed result per step). |

### 3.3 The shared DoD (1…11)

| DoD | Where it is discharged |
|---|---|
| **1 — functional criteria** | Each child's AC table: `artifacts/EP05A/implementation.md`, `artifacts/EP05B/implementation.md` §1, `artifacts/EP05C/implementation.md` §1. |
| **2 — invalid-input validation** | Not applicable — no new input; the reused `AssignmentForm` keeps the SP-113/SP-114 rules and its tests unchanged (`features/assignments/ui/AssignmentForm.tsx` was not modified by any EP05 child). |
| **3 — student data scoping** | Satisfied by construction; **the combined review must perform the check the README names**: the dashboard's requests carry no `userId`/`courseId`/`assignmentId`/`tz` parameter, and the rendered rows are the principal's own. `GET /assignments` is principal-scoped server-side; `GET /calendar/events` takes its zone from the stored profile row and whitelists only `from`/`to`; EP05 adds no endpoint and accepts no client-supplied id (D05-3). |
| **4 — actionable API errors** | Satisfied by construction; **the combined review must perform the check the README names**: a failed query shows the actionable message and a retry action (EP05B's per-section error box), and a failed create shows the shared actionable copy without discarding the student's input (EP05C — the page test's failed-create case; DoD-10 observation 5). |
| **5 — loading, empty and error states** | EP05A (the query states), EP05B (each section's own skeleton / empty state / error box, and the two queries' independence), EP05C (the four empty states' copy and affordances, and the create's failure state). Observed in the DoD-10 pass (observations 1, 11, 12). |
| **6 — keyboard accessibility** | EP05B (the named regions, the focus order, the text overdue marker), EP05C (the trigger, the focus target after a create, the announcement). Observed in the DoD-10 pass (observations 9–10). |
| **7 — responsive layouts** | EP05B (the shell, the one-column grid, the 44 px row targets), EP05C (the action group, the trigger, the empty states). Measured at 375 px in the DoD-10 pass (observations 13–14). |
| **8 — automated tests** | All three children: EP05A (2 model suites + 2 slice suites), EP05B (4 section suites + the page suite), EP05C (2 new suites + the page suite's integration block). |
| **9 — API/migration documentation** | Not applicable — no API change and no migration; §3 above and the README's shared-contract section document what EP05 consumes. |
| **10 — integrated review** | **This index** + the executed DoD-10 pass (§5) + the **combined EP05 parent review** (the reviewer's own deliverable). |
| **11 — reviewer walkthrough** | The reviewer's `./walkthrough.md` — **not** produced by the implementation. |

---

## 4. The verification evidence

The commands below were run from the repository root `/Users/michaelrobert/Desktop/focus-app` (the `pnpm --filter web …` commands execute in `apps/web`). The tested state is the working tree of the **final** child over the base commit `53ffc41`; the final commit's own hash is returned in the handoff.

| # | Command | Result |
|---|---|---|
| 1 | `pnpm --filter web test -- src/features/dashboard src/pages/dashboard` | **PASS — 9 files, 110 tests.** (EP05A's two model suites, EP05B's five files, EP05C's two new files and the page test.) |
| 2 | `pnpm --filter web test -- src/pages/dashboard` | **PASS — 1 file, 25 tests** (EP05B's 17 + EP05C's 8 integration cases). |
| 3 | `pnpm --filter web typecheck` | **PASS** — `tsc --noEmit`, no output, exit 0. |
| 4 | `pnpm --filter web lint` | **PASS** — `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`, no output, exit 0 (it includes the repo's Prettier rule). |
| 5 | `pnpm --filter web test` (the **full** web suite) | **78 files / 962 tests — 2 failed.** Both failures are in `apps/web/src/features/courses/ui/CourseForm.test.tsx` — the **known pre-existing flake F-EP05A-03** (the courses feature / EP02's surface, reproduced at pristine `b7728c8`). The file **passes in isolation** (36/36). It was **not** chased and **not** "fixed" — it is outside EP05's scope and owned by the courses feature. (EP05B's runs recorded it as intermittent — it did not reproduce there.) |
| 6 | `pnpm --filter web exec playwright test e2e/tmp-dashboard-dod10.spec.ts --reporter=list` — the **DoD-10 manual browser pass** | **PASS — 2 journeys, both green; 15 observations recorded.** The driver was a **temporary, uncommitted** spec and was **deleted** after the pass (D05-14 forbids adding a dashboard e2e spec to the repo — EP10's PR-003). The environment and the observed result per step are in §5. |

**A planned check is never recorded as executed.** Everything in this table was run; nothing was planned only.

**Per-child verification** (the children's own commands, their results and their tested state): `artifacts/EP05A/implementation.md` §…, `artifacts/EP05B/implementation.md` §4 (and its §4.1 fix-round table), `artifacts/EP05C/implementation.md` §4.

---

## 5. The DoD-10 manual browser pass (TR-E05-08) — **EXECUTED**

**This pass was executed, not written as a checklist.** (D05-14, PC-EP05-06: an unexecuted checklist is never a pass.)

**Environment**

- **The stack:** the repository's self-contained browser stack (`apps/web/e2e/global-setup.ts`, `apps/web/playwright.config.ts`) — a throwaway **`studypilot_e2e_test`** PostgreSQL database (created, migrated with `prisma migrate deploy` and **dropped** by the tooling), a test-only API on **:4100** and a test-only web instance on **:3100** (the developer stack on :3000/:4000 and the developer database were **not** required and **not** touched).
- **The browser:** Playwright's bundled Chromium (the `chromium` project of `apps/web/playwright.config.ts`).
- **The command:** `pnpm --filter web exec playwright test e2e/tmp-dashboard-dod10.spec.ts --reporter=list` from the repository root.
- **The driver:** a **temporary, uncommitted** Playwright spec (`apps/web/e2e/tmp-dashboard-dod10.spec.ts`) that drove the dashboard through a real browser and printed one `OBS` line per step. **It was deleted immediately after the pass and was never committed** — D05-14 forbids adding a dashboard e2e spec to the repo (EP10's PR-003 makes expanding the browser suite an EP09-scope decision).
- **The data:** disposable local test data only — a throwaway account per journey, registered and logged in through the real API/UI, against the throwaway database. No shared system was mutated; no secret was read, printed or recorded.
- **Date:** **2026-10-30**.
- **Result:** **2 journeys passed** (the desktop journey and the 375 px journey).

**The observed result per step** (the driver's own `OBS` output, in order):

| # | Step | **Observed result** |
|---|---|---|
| 1 | The four sections' empty states (a fresh student) | **All four rendered their settled title and description**: "Nothing overdue." / "You're all caught up — no assignment is past its due date. Add an assignment to put the next one on your list."; "No upcoming deadlines." / "Nothing is due ahead. Add an assignment to keep track of what's next."; "No classes today." / "No classes are scheduled for today. View your week to see what's ahead."; "No study sessions today." / "Nothing is scheduled for study today. Check the calendar for your classes and deadlines." |
| 2 | The two calendar sections' affordance | Both are links to **`/calendar`** ("View your week" and "Open the calendar"). |
| 3 | The quick action | The header's **"Add assignment"** trigger is **visible and enabled**; "Create Study Plan" and "Start Focus Session" are **absent** (count 0) and there is no "Hours Studied" / "Tasks Completed" figure. |
| 4 | Opening the create dialog | **Exactly one** dialog ("Add an assignment"); the **Title** field takes focus; the **Course** select is present and empty. |
| 5 | A **failed** create (the POST answered with a 500) | The shared form's own message **"We could not save the assignment. Try again."** is shown; the dialog **stays open**; the Title input **keeps** "DoD 10 failed create"; **no row** is added to either assignment section. |
| 6 | A **successful** create | The dialog **closes**; the dashboard **refreshes** and the new row is visible; **focus lands on the "Add assignment" trigger**; the dashboard's live region announces **"Assignment added."** (the document holds three `role="status"` nodes in total — the dashboard's own region, the app shell's banner region and the shared form's toast region; see the known gaps). |
| 7 | A reload | The created row is **still there** — the dashboard shows no optimistic row (the new assignment appears only after the server confirms it). |
| 8 | The row's "open relevant details" affordance | A row title opens **the same single** shared edit dialog ("Edit assignment") — **one** dialog in the document. |
| 9 | The keyboard order | The control **after** the trigger in the tab order is **"View Profile"**. |
| 10 | The reverse tab order | **Shift+Tab** returns to **"Add assignment"**. |
| 11 | A **failing** assignments query (the GET answered with a 500) | **Two** error boxes with the actionable message "Assignments service unavailable" and a **"Try again"** action; the calendar sections still render. |
| 12 | A **slow** assignments query | The assignment sections show their **loading skeleton** (`aria-busy="true"`). |
| 13 | 375 px — the trigger's tap target | The "Add assignment" trigger is **44 px tall** (≥ 44 px). |
| 14 | 375 px — the layout | The dashboard has **no horizontal overflow** at 375 px (`scrollWidth <= innerWidth + 1`). |
| 15 | 375 px — the create round trip | The create works at 375 px: the dialog closes, the new row is visible and **focus lands on the trigger**. |

**The pass's own defect, recorded honestly:** the driver's first route glob (`**/api/assignments*`) also matched the **Vite dev server's module URL** (`/src/features/assignments/api/assignmentsApi.ts`), so the intercepted 500 broke the app bundle and the page rendered empty — a defect in the **throwaway driver**, not in the product. The exact-path glob (`**/api/assignments`) fixed it and the pass ran green (finding **F-EP05C-01** in `artifacts/EP05C/implementation.md` §5).

---

## 6. The known gaps

| Gap | Owner / status | Why it is not closed here |
|---|---|---|
| **D05-14 — no dashboard e2e coverage.** The browser suite covers `login`, `auth-journeys`, `assignments-list`, `calendar` and `semesters-courses`; there is **no** dashboard spec. | The **EP09 owner** / the user — an EP09-scope decision (EP10's PR-003). **EP05 adds no spec.** The DoD-10 evidence is the executed manual pass in §5. | Adding a spec would expand the browser suite beyond the approved scope. |
| **D05-11 (final) — the "Study Stats" card is deliberately dropped.** EP05 ships **no** study-stats surface: "Hours Studied" has no endpoint until EP07's `GET /study-sessions/confirmed-time` (D07-3) and "Tasks Completed" is deliberately not re-added. | Settled and **final** (V-05-2 reconsiders it only if a real study-time endpoint exists). | Not a gap to close — a decision. The page test asserts that no study-stats figure survives. |
| **A3 — the plain-axios course list inside an RTK Query page.** The dashboard's create dialog's course select is fed by the existing `listCourses()` (the assignments page's pattern), not by a new RTK Query slice. | Recorded, reversible trade-off (D05-1). | Creating a courses slice would be new data-layer work (EP05A's territory) and is not in EP05's scope. |
| **A6 — the shared form's 404 copy** ("Resource not found — this course may no longer exist." with a "Back to courses" link) is the **shared EP03 component's** copy. | EP03's surface — not modified by EP05. | On the dashboard a create can only 404 for a course the student deleted between the list load and the submit. |
| **FU-EP04-01 — the EP04 calendar page's browser-local week range.** | **EP04's** follow-up (its own review unit). | EP05 owns neither the calendar page nor the API contract (D05-3, D05-16). **The combined EP05 review must not absorb it** — EP05's own "today" handling is correct (it selects by the server-echoed `result.today` and never by a client-derived column key). |
| **EP04's `features/calendar/ui/CalendarEventDetails.tsx:89`** — the same noon-UTC construction for an **event's** civil date (the same exposure at UTC+12 and later). | **EP04's** reviewed surface. | Not corrected here; flagged for the EP04 owner. |
| **F-EP05A-03 — the known courses flake** (`apps/web/src/features/courses/ui/CourseForm.test.tsx`, 2 cases in the full parallel suite; the file passes in isolation). | The courses feature / EP02. | Pre-existing, intermittent, out of EP05's scope; not chased and not "fixed" (§4, row 5). |
| **F-EP05C-02 — the "single live region" claim in the integrated page.** The dashboard renders exactly **one** `role="status"` region; the **document** also holds the app shell's email-verification banner region and **react-hot-toast's** transient region (the shared form's failure toast). | Recorded — no change. | Both other regions belong to the app shell and to the shared toast, not to EP05 (EP05 adds no region and no success toast). |
| **No automated browser regression for the dashboard.** | See D05-14 above. | The component/integration tests (TR-E05-01…07) plus the executed manual pass are EP05's coverage. |

---

## 7. The DoD status

| DoD | Status |
|---|---|
| **1 — functional criteria** | **Met** — the seven epic ACs are mapped to their owning children and to the named evidence (§3.1); the children's own AC tables record the per-AC outcomes. |
| **2 — invalid-input validation** | **Not applicable** — no new input; the reused `AssignmentForm` keeps SP-113/SP-114 and its tests unchanged. |
| **3 — student data scoping** | **Met by construction**; the **check the README names for the combined review is still outstanding** (it is a review check, not an implementation task). |
| **4 — actionable API errors** | **Met by construction**; the **check the README names for the combined review is still outstanding**. |
| **5 — loading, empty and error states** | **Met** — the four sections' three states (EP05B) + the four empty states' copy and affordances (EP05C) + the create's failure state; observed in §5. |
| **6 — keyboard accessibility** | **Met** — the focus order, the focus target after a create and the announcement; observed in §5. |
| **7 — responsive layouts** | **Met** — measured at 375 px in §5 (44 px target, no horizontal overflow). |
| **8 — automated tests** | **Met** — TR-E05-01…07 all have named owning test files (§3.2). |
| **9 — API/migration documentation** | **Not applicable** — no API change, no migration. |
| **10 — integrated review** | **The DoD-10 half is DISCHARGED — the manual browser pass was EXECUTED (§5).** The remaining half is the **combined EP05 parent review**, which has not been dispatched yet. |
| **11 — reviewer walkthrough** | **Outstanding — the reviewer's deliverable** (`./walkthrough.md`), written by the reviewer after the combined review. |

---

## 8. What this file is not

- **This file carries no verdict and no approval.** It is the implementation's evidence record; the **independent review** is separate.
- **`./review.md`** — the combined EP05 parent review report — is written by the **reviewer**, not by the implementation.
- **`./walkthrough.md`** — the final user-facing walkthrough — is written by the **reviewer**.
- **`./../plan-review.md`** — the **plan** review (pass 2, `Plan Ready`, commit `b7728c8`) — a plan gate, already passed, not a code review.
- **No story is `Reviewed`.** The children are `implementation complete — awaiting parent review`; only the passing combined review establishes sign-off.
