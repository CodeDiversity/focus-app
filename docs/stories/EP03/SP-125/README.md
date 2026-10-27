# SP-125 Breakdown — Assignment Experience

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Status:** Reviewed 2026-10-27 (pass 2). One frontend story. Implemented `b3e92db`…`ed9ec4e`; review corrections `00be8ee`. Pass 1 returned Changes Required (RV-125-001/002); both corrected and independently verified; pass 2 **passed** with two optional polish notes (RV-125-003, P-125-001). Unit complete.
**Jira key:** Pending creation

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-125/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-125/` (implementation record now written; review and walkthrough to be added by the reviewer)

**Active substory:** None.

**Next substory:** None — SP-125 complete (pass-2 review PASSED). No further action in this unit; next work belongs to other stories/epics.

**Implementation owner:** `implementer`, one frontend writer. No backend writer.

**Final review:** Combined SP-125 review passed 2026-10-27 (pass 2). Report: [./artifacts/SP-125/review.md](./artifacts/SP-125/review.md); walkthrough: [./artifacts/SP-125/walkthrough.md](./artifacts/SP-125/walkthrough.md). Reviewed commits: `b3e92db`…`ed9ec4e` (implementation) + `00be8ee` (corrections); combined scope `3cde1ad..00be8ee`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [SP-125](./SP-125-assignment-experience.md) | Reviewed | SP-124 reviewed (`63f9615`) — satisfied. Pass 1 findings RV-125-001/002 corrected in `00be8ee` and verified in pass 2; RV-125-003 (optional, planner) and P-125-001 (optional) remain as polish. | None — unit complete | [checkpoint](./artifacts/SP-125/checkpoint.md), [implementation](./artifacts/SP-125/implementation.md), [review](./artifacts/SP-125/review.md), [walkthrough](./artifacts/SP-125/walkthrough.md) |

This unit adds no new epic acceptance criterion. It is a presentation pass over behavior SP-113 through SP-124 already own.

### Why this is one story

The user asked for a better design and feel of the assignments page and its modules. The list page and the course section render the same row, checklist, and form. Splitting "page chrome" from "modules" before the visual system exists would freeze a boundary the design has not chosen, and a page-only restyle would diverge from the course host.

Re-size before implementation if `ui-refiner` introduces a new interaction (a different editor than the modal, a new grouping model with its own state, or a second row implementation). That is a split trigger. Spacing, hierarchy, labels, and component choice inside the current hosts are not.

## Code baseline (2026-10-27)

Inspected, not proposed:

- List host: `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`. Page shell is `max-w-5xl` with an `h1`, an Add button, a live region, then one `card` that holds the filter grid and a flat `divide-y` list of `AssignmentRow`.
- Course host: `apps/web/src/features/assignments/ui/AssignmentsSection.tsx`, mounted from `pages/courses/ui/CourseDetailPage.tsx`. It owns the section header, unfinished/completed grouping, and show-completed disclosure. Rows come from the shared owner.
- Shared modules: `AssignmentRow.tsx`, `SubtaskChecklist.tsx`, `AssignmentForm.tsx`, `AssignmentDialogs.tsx`, `DeleteAssignmentDialog.tsx`, `assignmentPresentation.ts`, `useAssignmentActions.ts`.
- `STATUS_STYLES` is exported from `assignmentPresentation.ts` and is not applied by `AssignmentRow`. Status on the row is a native `Select`. Priority, type, and overdue use text-plus-color pills.
- Filter date inputs (`Due from`, `Due to`) set `aria-label` only. `Input` renders a visible label only when `label` is passed. Sort direction is an icon button with an `aria-label`.
- Create and edit are the existing modal (`AssignmentForm`, `role="dialog"`). D124-11 still requires that modal. This plan does not withdraw it.
- Focus hooks in the current markup: `data-assignment-focus` (`add`, `empty-add`, `status:${id}`, `edit:${id}`) and `data-subtask-focus` on the checklist. The list page also forces `max-sm:min-h-[44px]` on buttons and selects inside the list.
- No assignments API or schema change is required. `GET /assignments` and the existing mutation routes stay as they are.
- Component tests: `AssignmentsPage.test.tsx`, `AssignmentsSection.test.tsx`, `AssignmentForm.test.tsx`, `SubtaskChecklist.test.tsx`, `useAssignmentActions.test.ts`. Browser spec: `apps/web/e2e/assignments-list.spec.ts`.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D125-1 | Presentation only. No new capability, route, filter, API field, or schema change. | User request 2026-10-27 ("better UX design and feel"). Reversible if a later request adds a capability. |
| D125-2 | Shared modules are in scope. A row, checklist, or form change lands once in `features/assignments` and shows on both the list page and the course section. Do not fork a second row onto `AssignmentsPage`. | D124-10. User said page and modules. |
| D125-3 | Existing behavior stays: search, course/status/priority/type/date filters, sort and order, create, edit, delete, status change, subtasks, overdue indication, course link or "No course", completed disclosure on the course host, refetch, and the current live-region sentences. | SP-113–SP-124. This story does not retake those acceptance criteria. |
| D125-4 | Layout, information hierarchy, component choice, empty/loading/error presentation, responsive treatment, and copy are **not** decided here. `ui-refiner` records them in the story file before implementation. | UI/UX handoff. |
| D125-5 | Create and edit stay the modal `AssignmentForm` (D124-11). Visual treatment inside that dialog may change. Replacing the modal, or making edit inline, requires an explicit withdrawal of D124-11. This plan does not withdraw it. | User confirmation 2026-10-26, still in force. |
| D125-6 | Keep `data-assignment-focus` and `data-subtask-focus` unless the settled design replaces a control and names the new focus target in the story file. | SP-124 focus restoration. A presentation pass must not drop the hooks by accident. |

## Source requirements and test traceability

No new epic acceptance criterion. EP03 AC-E03-01 through AC-E03-07 stay with SP-113, SP-115, SP-120, SP-121, SP-122, and SP-123. SP-125 must not remove those behaviors from the list page or the shared modules.

| Req | Requirement | Owner |
|---|---|---|
| — | No new epic AC or test requirement. | SP-125 owns the presentation pass only. |
| AC-E03-01 … AC-E03-07 | Existing assignment behavior, original wording in the [epic](../../../epics/EP03-assignment-and-task-management.md). | Unchanged owners. SP-125's tests must keep the surfaces those stories already proved. |

The epic defines no test requirements.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | SP-125, once the ui-refiner decisions are the criteria |
| 2 invalid-input validation | Not applicable — no new input. Existing form validation stays. |
| 3 student data scoping | Not applicable — no new read or write. |
| 4 actionable API errors | Not applicable — no new request. Existing toasts stay. |
| 5 loading, empty, and error states | SP-125. Current states exist; their presentation is a recorded gap. |
| 6 keyboard accessibility | SP-125. Preserve current operability; settle any new control with ui-refiner. |
| 7 responsive layouts | SP-125. |
| 8 automated tests | SP-125. Update incidental markup assertions; do not weaken behavior assertions. |
| 9 API/migration documentation | Not applicable — no API or migration change. |
| 10 integrated review | SP-125 browser note plus the combined review of this unit. |
| 11 reviewer walkthrough | Final reviewer, once, for this unit. |

## Security invariants and counterexamples

No new security claim. The presentation pass must not add a read or write.

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A restyle cannot widen ownership | A redesigned row calls a new endpoint or drops `userId` scoping | D125-1: no new request. Mutations stay on the existing assignment client. | Existing assignment API tests remain the proof. SP-125 does not add a client method. |
| A restyle cannot fork authorization UI | The list page grows a second edit handler that skips the shared hook | D125-2: one owner. A second mutation implementation is a plan violation. | List and course tests still drive edit/delete/status through `useAssignmentActions`. |

## Plan correction log

| ID | Date | Severity | Location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PC-125-01 | 2026-10-27 | Low | `docs/stories/EP03/README.md` status line, stories table, and the story 6–7 note | The epic index still described SP-124 as Draft with no implementation evidence, and the following note still said SP-123 children needed refinement. Committed `docs/stories/EP03/SP-124/README.md` at `5ed6f5f` records A/B/C implemented and awaiting combined re-review. SP-123's folder README records the unit reviewed. | Epic index now matches those committed folder statuses and lists SP-125. Test-obligation links include SP-123, SP-124, and SP-125. This commit does not adopt or revert the uncommitted SP-124 working-tree files (including an untracked pass-2 `review.md`). | `git show HEAD:docs/stories/EP03/SP-124/README.md` status line versus the updated epic index row. Dirty SP-124 paths were not staged. | Fixed in plan |
| PC-125-02 | 2026-10-27 | Low | SP-125 queue, quality gate, and epic index SP-124 row | After PC-125-01, `63f9615` committed the SP-124 pass-2 review and folder README. Those files record the unit complete. The SP-125 plan still said implementation was blocked on an open re-review. | Withdrew that blocker. SP-124 is cited as reviewed in `63f9615`. Remaining gate is D125-4 (ui-refiner), not SP-124. | `docs/stories/EP03/SP-124/README.md` status line and `artifacts/SP-124/review.md` verdict line, both in `63f9615`. | Fixed in plan |

## Review correction log

| ID | Date | Severity (pass 1) | Location | Original finding | Disposition / closure evidence | Status |
|---|---|---|---|---|---|---|
| RV-125-001 | 2026-10-27 | Blocker | `AssignmentRow.tsx` disclosure/checklist gates | Zero-subtask rows rendered no disclosure, so the only add-subtask field was unreachable (EP03 AC-E03-03; D125-3); e2e journey 3 failed at `spec:147`. | Corrected in `00be8ee`: the disclosure always renders and the checklist mounts when expanded; pins updated; new zero-subtask add test. Independently verified in pass 2: code inspection + scoped 274/274, full 689/689, e2e 5/5 at `00be8ee`. See [review.md](./artifacts/SP-125/review.md). | Closed in pass 2 |
| RV-125-002 | 2026-10-27 | Should-fix | `AssignmentsSection.tsx` lists | Course-host row controls were below the 44px mobile target (AC-3); the implementation record's AC-3 PASS claim was inaccurate for that host. | Corrected in `00be8ee`: both section lists carry the list host's `max-sm` 44px bumper. Verified in pass 2: class assertion + e2e journey 5 real measurements ≥44px at 375×667. See [review.md](./artifacts/SP-125/review.md). | Closed in pass 2 |
| RV-125-003 | 2026-10-27 | Should-fix → polish (reclassified in pass 2) | `SP-125-assignment-experience.md` settled decisions | Decision text describes the pre-card design; the superseding user direction is recorded only in `implementation.md`. | Not corrected. Pass-2 reclassification: no unmet AC/DoD/deliverable; the ACs are accurate and met; provenance is recorded. Optional planner cleanup. See [review.md](./artifacts/SP-125/review.md). | Open — optional (planner) |
| RV-125-004 | 2026-10-27 | Should-fix | SP-125 README status line + quality gate; EP03 index SP-125 entries | Stale "Draft / Needs refinement / No implementation evidence" claims. | Closed by the passing docs sync of pass 2 (this commit): status lines refreshed in the SP-125 README and the EP03 index. | Closed in pass 2 |
| P-125-001 | 2026-10-27 | Polish | `e2e/assignments-list.spec.ts` coverage | Residual browser scenarios (blank-title validation, 5xx save failure, dialog tab-order, ordered subtask move, desktop width) are covered by component tests only. | Optional hardening; not a gate. | Open — optional |
| F-125-03 | 2026-10-27 | Gate (open in pass 1) | e2e spec execution | The spec had not been executed at implementation closeout. | Closed: the reviewer executed the full spec at `00be8ee` — 5/5 passed on the self-contained stack (DoD-10). | Closed in pass 2 |

## Quality gate (2026-10-27)

**Superseded — the unit is reviewed.** The ui-refiner recorded the visual decisions 2026-10-27 (D125-7…10) and the user directed the card redesign during implementation (R-125-007); the story was implemented and independently reviewed (pass 2, 2026-10-27). The table below is the historical plan-gate record.

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | One frontend story. Split trigger recorded above. Sizing block in the story file. |
| 2 | Original AC/TR coverage | Pass | No new epic AC. Existing AC owners unchanged. Traceability table above. |
| 3 | Definition of Done | Pass | Table above. Items 2, 3, 4, and 9 not applicable — no new input, read, write, or migration. |
| 4 | Contract consistency | Pass | No API change. UI contract is the existing shared owner plus D125-5 and D125-6. |
| 5 | Code paths inspected | Pass | Baseline section. Unverified: pixel-level screenshots were not taken; gaps are from the component source. |
| 6 | Feature risks | Pass | Counterexample table. No new security invariant. |
| 7 | Dependencies | Pass | Shared modules exist. SP-124 review is committed in `63f9615` (PC-125-02). No upstream implementation dependency remains. |
| 8 | Material decisions | Blocked | D125-4: layout, hierarchy, components, states, responsive behavior, and copy are for `ui-refiner`. D124-11 is not reopened. |
| 9 | Correction log | Pass | PC-125-01 and PC-125-02. |
| 10 | Jira identity | Not applicable | Sync was not authorized. Key remains `Pending creation`. |

Historical note: the story became implementation-ready when the ui-refiner recorded the visual decisions (2026-10-27). SP-124 was not an execution blocker (PC-125-02). Outcome: implemented and reviewed — see the execution queue above.
