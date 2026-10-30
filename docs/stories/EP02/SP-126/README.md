# SP-126 Breakdown — Course Page Experience

**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Status:** Reviewed — SP-126 implementation complete and approved (final parent review pass 2, 2026-10-30). Code commit `97803b4`, docs commit `baa859d`; tests 162/162, typecheck/lint green, e2e 7/7. User request 2026-10-27: redesign the Courses page to match the recently redesigned Assignments page.
**Jira key:** Pending creation

## Execution queue

**Delivery home:** `docs/stories/EP02/SP-126/`

**Artifact root:** `./artifacts/` (stable story ID)

**Parent artifacts:** `./artifacts/SP-126/` (implementation record, review, and walkthrough to be written by the implementer/reviewer)

**Active substory:** None.

**Next substory:** None — SP-126 final parent review passed (pass 2, 2026-10-30); unit complete. No further implementation work.

**Implementation owner:** `implementer`, one frontend writer. No backend writer.

**Final review:** one combined SP-126 review after implementation (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [SP-126](./SP-126-course-experience.md) | Reviewed | SP-125 reviewed (`9dce1c4`) — the design reference is in code; no implementation dependency. | Complete — final parent review passed (pass 2) | code `97803b4`, docs `baa859d`; tests 162/162; e2e 7/7; report `artifacts/SP-126/review.md`; walkthrough `artifacts/SP-126/walkthrough.md` |

This unit adds no new epic acceptance criterion. It is a presentation pass over
behavior SP-111 and SP-112 already own.

### Why this is one story

The user asked for a redesign of one page: the `/courses` list. The page shell
(header, toolbar, states) and the list (rows → cards) render one visual system,
and the card plus its three-dot menu are a single interaction unit. Splitting
"page chrome" from "cards" before the visual system exists would freeze a
boundary the design has not chosen.

Re-size before implementation if `ui-refiner` introduces a new interaction (a
different editor than the modal, a new view mode with its own state, a second
list implementation, or a detail-page redesign). That is a split trigger.
Spacing, hierarchy, labels, and component choice inside the current hosts are
not.

## Code baseline (2026-10-27)

Inspected, not proposed:

- Page host: `apps/web/src/pages/courses/ui/CoursesPage.tsx` (161 lines). `max-w-3xl` shell with an `h1` "Courses", a "New course" button (rendered only when the list is non-empty), an always-present `role="status"` live region, and one `card` holding `CourseList`. State is page-local (the SemestersPage precedent; no RTK slice — the entity API is the data home).
- List: `apps/web/src/features/courses/ui/CourseList.tsx` (252 lines) — a flat `divide-y` list of rows: color dot, monospace `code`, name `Link` to `/courses/:id` (D112B-6: the non-interactive row area navigates on mouse click; the action buttons `stopPropagation`), a text **Archived** badge, the semester name (or a muted "No semester"), and the credits; row buttons **Edit** + **Archive/Restore** with per-course `aria-label`s; a `role="switch"` "Show archived" (client-side filter over the `includeArchived: true` fetch, D111B-1); a loading spinner, a "No courses yet" + "Add your first course" empty state, a "No active courses" state, and an error + retry.
- Dialogs: `CourseForm.tsx` (552 lines — create/edit modal, `role="dialog"`, react-hook-form + zod, color swatches, `Create course`/`Save changes` submit) and `ArchiveCourseDialog.tsx` (163 lines — focus-trapped confirmation; Escape cancels; focus returns to the trigger; states the operation is reversible, D111-2).
- Data: `listCourses({ includeArchived: true })` → `CourseWithSemester[]` (code, name, description?, color, credits?, instructor?, isActive, timestamps, `semesterId`, `semester: { id, name } | null`) — **no assignment data** (the list route stays light, D112-3). `listSemesters()` → `SemesterWithCount[]` is already fetched for the form's semester picker.
- Design reference (SP-125, reviewed `9dce1c4`): `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — `max-w-5xl` shell, `h1` + upper-right CTA, a toolbar outside the results card (magnifier search + clear `X`, compact `Select`s, `h-[42px]`, `max-sm:min-h-[44px]`), a results card with a `role="status"` count header, distinct empty/no-match/error states, and `rounded-xl border border-secondary-200 bg-white p-4 shadow-sm` card rows. `apps/web/src/features/assignments/ui/RowActionsMenu.tsx` — the three-dot `role="menu"` model: open focuses the first item, Escape closes and restores the trigger, arrow keys cycle, an action re-focuses the trigger before the callback.
- Tokens: `apps/web/src/index.css` — `primary`/`secondary` Tailwind palettes, `.card` (`bg-white rounded-xl shadow-md p-6`), base `:focus-visible` ring.
- Tests: `CoursesPage.test.tsx` (420 lines: list/create/edit/archive/a11y/responsive) and `CourseList.test.tsx` (240 lines: rows/switch/states/actions/navigation). E2E: `apps/web/e2e/semesters-courses.spec.ts` (SP-118) — pins the "No courses yet" + "Add your first course" empty state, the `li` row, the `Edit/Archive/Restore ${name}` buttons, the dialog headings, and the live-region sentences.
- No course API or schema change is required (D126-1).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D126-1 | Presentation only. No new capability, route, API field, or schema change. In particular: **no pending-assignment count** on the cards — the list route returns no assignment data (D112-3), so the user's "when supported by existing data" condition is not met. | User request 2026-10-27 + user confirmation 2026-10-27 (skip the count). Reversible if a later request adds the projection. |
| D126-2 | The card's three-dot menu offers **Edit + Archive/Restore** — no hard delete (there is no `DELETE /courses/:id` in the MVP; archive-first design, D111-2; archived courses remain accessible, AC-E02-05). A course-specific menu in `features/courses/ui/` mirroring the `RowActionsMenu` keyboard/focus model; no refactor of the reviewed assignments module. | User decision 2026-10-27 (menu = Edit + Archive/Restore). |
| D126-3 | Search and semester filtering are **client-side** over the already-fetched list (the page already fetches `includeArchived: true`, D111B-1; a student's course list is small; the semester options come from the already-fetched `listSemesters()`). No new `q`/filter API parameters; the "Show archived" switch composes with them. | Planner-recorded, grounded in D111B-1 + the Assignments toolbar precedent; reversible. |
| D126-4 | The page shell matches the redesigned Assignments page: `max-w-5xl` width, `py-12`, "My Courses" `h1` + a subtle subtitle, "Add Course" primary button upper-right; the search + semester toolbar sits outside the results area with the Assignments toolbar styling (magnifier search + clear, compact `Select`, `h-[42px]`, `max-sm:min-h-[44px]`). | User request 2026-10-27 (items 1–2). |
| D126-5 | The card's internal layout, the color-indicator treatment, the three-dot menu placement, the grid breakpoints, the empty-state art, the filter-reset affordance, the archived-toggle placement, the hover/focus details, and the user-facing copy are **not** decided here. `ui-refiner` records them in the story file before implementation. | UI/UX handoff. |
| D126-6 | Existing behavior stays: create/edit (`CourseForm` modal), archive/restore (`ArchiveCourseDialog` + the live-region sentences), show-archived switch, list re-read after every mutation, name→detail navigation (D112B-6). Visual polish inside the two dialogs is in scope; replacing either requires an explicit withdrawal. | SP-111/SP-112. This story does not re-take those acceptance criteria. |
| D126-7 | The e2e spec `semesters-courses.spec.ts` (SP-118) keeps passing with at most pin updates: the accessible names (`Edit/Archive/Restore ${name}`), the live-region sentences, the empty-state CTA, and the dialog headings are preserved, or the spec is updated in the same change without weakening behavior assertions. | SP-118 + the SP-125 precedent (update incidental markup assertions; do not weaken behavior assertions). |

## Source requirements and test traceability

No new epic acceptance criterion. EP02 AC-E02-01…AC-E02-06 keep their existing
owners (SP-110, SP-111, SP-112). SP-126 must not remove those behaviors from the
`/courses` page.

| Req | Requirement | Owner |
|---|---|---|
| AC-E02-02 | Courses belong to a valid semester owned by the student. | SP-111 (unchanged). SP-126's semester filter is client-side; the relation is untouched. |
| AC-E02-03 | Students can create and edit course information. | SP-111 (unchanged). SP-126 keeps the create/edit affordances (header button + card menu) and the `CourseForm` modal (D126-6). |
| AC-E02-05 | Archived courses remain accessible with historical data. | SP-111 (unchanged). SP-126 keeps the show-archived switch, the text Archived indicator, and the archive/restore menu (D126-2). |
| AC-E02-06 | Course details display related assignments and class meetings. | SP-112 (unchanged). SP-126's card click navigates to the detail page (D112B-6). |
| AC-E02-01 / AC-E02-04 | Semester management; recurring class meetings. | Not affected — the Semesters page and the Course detail page are out of scope. |

The epic defines no test requirements. Story-level test obligations are owned in
the [SP-126 story file](./SP-126-course-experience.md#tests-to-add--update).

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | SP-126, once the ui-refiner decisions are the criteria |
| 2 invalid-input validation | Not applicable — no new input (search is a free-text filter; the form is unchanged). |
| 3 student data scoping | Not applicable — no new read or write; the existing principal-scoped `listCourses` remains the only list read. |
| 4 actionable API errors | Not applicable — no new request; the existing list error state and the dialog toasts stay. |
| 5 loading, empty, and error states | SP-126 (empty / no-match / loading / error presentation). |
| 6 keyboard accessibility | SP-126 (menu keyboard model, card focus, switch, visible focus). |
| 7 responsive layouts | SP-126 (grid: 1 / 2 / 2–3 columns). |
| 8 automated tests | SP-126 (update incidental markup assertions in `CoursesPage.test.tsx` / `CourseList.test.tsx`; keep behavior assertions; e2e pin updates, D126-7). |
| 9 API/migration documentation | Not applicable — no API or migration change. |
| 10 integrated review | SP-126 browser note plus the combined review of this unit. |
| 11 reviewer walkthrough | Final reviewer, once, for this unit. |

## Security invariants and counterexamples

No new security claim. The presentation pass must not add a read or write.

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A restyle cannot widen ownership | A redesigned card fires a per-course detail fetch (N+1) or a new search endpoint | D126-1/D126-3: the single principal-scoped `listCourses({ includeArchived: true })` remains the only list read; the filters run client-side over the already-fetched own list. | `CoursesPage.test.tsx` (fetches once with `includeArchived`); the existing `courses-data-scoping.spec.ts` is unchanged. |
| A restyle cannot fork the mutation path | The card menu calls a new update path or skips the confirmation dialog | D126-2/D126-6: Edit → `CourseForm`, Archive/Restore → `ArchiveCourseDialog`, on the existing `courseApi` functions. | `CoursesPage.test.tsx` create/edit/archive/restore tests keep driving the same handlers. |

## Plan correction log

(First plan of this parent. Implementation review findings are appended here
with stable IDs and are never rewritten.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| RV-126-001 | 2026-10-30 | should-fix | DoD 8; story "Tests to add / update" | Missing required automated tests for extracted `CourseCard`/`CourseActionsMenu` and search/filter/no-results paths. | Added `CourseCard.test.tsx` (8) and `CourseActionsMenu.test.tsx` (8); expanded `CoursesPage.test.tsx` (+8) and `CourseList.test.tsx` (+11) with search/filter/no-results/semester-filter and card-content assertions. | Focused suite recorded 11 files / 162 tests passing (implementer evidence); reviewer inspected test files. | Closed — pass 2 |
| RV-126-002 | 2026-10-30 | should-fix | Review cadence final-review gate | Missing parent implementation index (`artifacts/SP-126/implementation.md`). | Created `artifacts/SP-126/implementation.md` with review scope, combined Git scope (base `914a5d2`, correction `97803b4`), AC/DoD ownership, commands/results, deviations. | File present and inspected by reviewer. | Closed — pass 2 |
| RV-126-003 | 2026-10-30 | should-fix (gate) | DoD 10; README "integrated review in a development environment verified" | No recorded browser/IDE or e2e verification for SP-126. | Ran self-contained stack e2e `pnpm test:e2e -- e2e/semesters-courses.spec.ts`; recorded date/environment/command/exit code; no pin updates needed (D126-7). | Recorded exit 0, 7/7 passed (2026-10-30); reviewer inspected e2e spec (selectors still match redesigned markup). | Closed — pass 2 |
| RV-126-004 | 2026-10-30 | polish | D126-14 / D126-15 settled tokens | Empty-state icons used `text-text-muted`; archived pill used `bg-surface-muted`/`text-text-muted` instead of settled `text-secondary-300` / `bg-secondary-100`/`text-secondary-600`. | Aligned tokens: empty/no-match icons `text-secondary-300`; archived pill `bg-secondary-100`/`text-secondary-600`. | Code inspection (`CourseCard.tsx:29`, `CourseList.tsx:110,125`). | Applied — pass 2 |

## Quality gate (2026-10-27)

**Verdict: Draft** — the plan is complete and verified; the story is
`Needs refinement` on D126-5 (ui-refiner pass precedes implementation). The two
material product decisions are user-confirmed (D126-1 skip the count; D126-2
menu actions). No implementation blocker other than the refinement pass. No Jira
sync was authorized; the SP-126 key is `Pending creation`.

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | One frontend story. Split trigger recorded above. Sizing block in the story file. |
| 2 | Original AC/TR coverage | Pass | No new epic AC. Existing AC owners unchanged. Traceability table above. |
| 3 | Definition of Done | Pass | Table above. Items 2, 3, 4, and 9 not applicable — no new input, read, write, or migration. |
| 4 | Contract consistency | Pass | No API change. UI contract is the existing `CourseForm`/`ArchiveCourseDialog`/`courseApi` plus D126-2/D126-3. |
| 5 | Code paths inspected | Pass | Baseline section. Unverified: pixel-level screenshots were not taken; the gaps are from the component source. |
| 6 | Feature risks | Pass | Counterexample table. No new security invariant. |
| 7 | Dependencies | Pass | SP-125 reviewed (`9dce1c4`) — the design reference is in code. No upstream implementation dependency remains. |
| 8 | Material decisions | Blocked | D126-5: card layout, indicator, menu placement, grid, states, responsive behavior, and copy are for `ui-refiner`. D126-1/D126-2 are user-confirmed. |
| 9 | Correction log | Pass | No entries (first plan of this parent). |
| 10 | Jira identity | Not applicable | Sync was not authorized. The key remains `Pending creation`. |
