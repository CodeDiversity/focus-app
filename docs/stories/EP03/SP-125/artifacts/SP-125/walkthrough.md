# SP-125 user walkthrough — Assignment page and module experience

**Story:** [SP-125-assignment-experience.md](../../SP-125-assignment-experience.md) (EP03 story 9, presentation only)
**Reviewed:** 2026-10-27, pass 2 — [review.md](./review.md). **Verdict: PASS.**
**Tested Git state:** implementation `b3e92db`…`ed9ec4e` plus review corrections `00be8ee` (combined scope `3cde1ad..00be8ee`).

## What changed

The assignments page and the shared assignment modules were redesigned; no capability, route, API field, or data behavior changed (D125-1, D125-3).

- **`/assignments` filter toolbar:** Search, Course, and Status are always visible. A "Filters" button opens a secondary panel (Due from, Due to, Priority, Type, Sort by, sort direction) with visible labels; the button shows how many secondary filters are active ("Filters (2)") and toggles to "Hide filters".
- **Results:** a count header ("Showing X assignments" / "No assignments match these filters.") with a live region that also announces actions ("Assignment added. …") and hosts the background-refresh spinner. A "Clear filters" action appears when filters are active.
- **Assignment rows (both the list page and the course page):** a card with a type icon, the title, an "Overdue" / "Due soon" badge, a course chip (link on the list page), a neutral meta line (due date · priority · type), a subtask disclosure ("No subtasks" or "2/4 subtasks"), a color-plus-text status selector, and a three-dot actions menu (Edit, Delete). Clicking the title opens the edit dialog.
- **Subtask panel:** expanding the disclosure opens a framed panel with a "Subtasks" header, an "X of Y complete" counter, checkboxes, reorder buttons, delete, and an inline add field. **A row with no subtasks still shows the disclosure**, so the first subtask can be added (review fix RV-125-001).
- **Create/edit dialog:** wider (`max-w-lg`), grouped fields, a divided action footer with Cancel and Submit.
- **Mobile:** row controls (status, actions menu, subtask disclosure) keep a 44px minimum height on both hosts (review fix RV-125-002).

## How the code works

- **Single owner:** `useAssignmentActions` (`features/assignments/model/`) owns status changes, dialogs, expansion, busy state, and focus restoration. Both hosts (`pages/assignments/ui/AssignmentsPage.tsx`, `features/assignments/ui/AssignmentsSection.tsx`) render the shared `AssignmentRow` and mount `AssignmentDialogs` once (D124-10, D125-2 — no forked row).
- **Row:** `AssignmentRow.tsx` composes `StatusPillSelect` (a native `<select>` wearing `STATUS_SELECT_STYLES` from `assignmentPresentation.ts` — keyboard operable, keeps `data-assignment-focus="status:${id}"`), `RowActionsMenu.tsx` (ARIA menu: trigger, arrow-key cycling, Escape/outside-click close, focus return to the trigger before a dialog opens), and `SubtaskChecklist.tsx` (the only place subtasks are created or changed).
- **Page:** `AssignmentsPage.tsx` owns the filter state, the debounced search, the request sequence guard (only the newest list request may commit), and the live-region copy.
- **Ownership/security:** no new request was added; every academic-data query still runs through the existing principal-scoped API (unchanged since SP-113–SP-124). The restyle cannot widen ownership (D125-1).
- **Focus contract:** `data-assignment-focus` hooks (`add`, `empty-add`, `status:${id}`, `edit:${id}` on the title) and `data-subtask-focus` are preserved (D125-6).

## Why it is correct (evidence)

- **Acceptance criteria:** all seven SP-125 ACs verified against code and executed tests — see the AC table in [review.md](./review.md). AC-3 and AC-4 were re-verified after the review corrections.
- **Review corrections closed:** RV-125-001 (first-subtask add restored) and RV-125-002 (course-host 44px targets) were fixed in `00be8ee` and independently re-verified by the reviewer: code inspection plus re-executed gates.
- **Automated evidence (reviewer-executed at `00be8ee`):** full web suite **689/689** (50 files), scoped assignments/courses/entities suite **274/274** (13 files), `tsc --noEmit` clean, ESLint `--max-warnings 0` clean.
- **Integrated evidence (reviewer-executed at `00be8ee`):** `playwright test e2e/assignments-list.spec.ts` — **5/5 passed** on the self-contained stack (real Chromium → API `:4100` → throwaway Postgres, created and dropped; dev stack untouched). This closes F-125-03 and DoD-10.
- **User evidence:** your manual browser pass on 2026-10-27 ("all manual tests pass") is recorded as user-provided attestation; it is consistent with the executed spec. In pass 1 the executed spec contradicted it for the course-host subtask flow; after the `00be8ee` fix that journey passes, so the attestation and the executed evidence now agree.
- **Limitations:** component tests assert classes/markup in jsdom; the real size measurements come from the executed e2e journeys 4–5. The initial-load error card is covered by component tests, not a browser journey.

## Manual test workflows

Prerequisites for every workflow: run the local dev stack (`pnpm dev`), sign in with your own test account, and use disposable assignments you create during the test. No shared system is mutated; all data is your own test student's.

### 1. Filter and find assignments
1. Open `/assignments`. Expect the toolbar: Search, Course, Status, and a "Filters" button.
2. Type in Search; after a short pause the list narrows and the count header updates.
3. Click "Filters". Expect the secondary panel with labeled Due from, Due to, Priority, Type, Sort by, and a sort-direction button.
4. Pick a Priority and a Type. Expect the "Filters" button to read "Filters (2)" while the panel is collapsed.
5. Pick a Course and a Status. Expect the list to narrow; the count header reads "Showing X assignments."
6. Set a search that matches nothing. Expect "No assignments match these filters." with a "Clear filters" button; click it and expect the full list back.
**Execution status:** Executed — reviewer e2e journey 2 (filter prefill, no-match state) and component tests, at `00be8ee`. Steps above are your optional repeat.

### 2. Create, edit, and delete from a row
1. Click "Add assignment", fill Title, choose a Course, click "Create assignment". Expect "Assignment added. Showing 1 assignment." and focus back on "Add assignment".
2. Click the row's title. Expect the "Edit assignment" dialog with the title prefilled and no Course select.
3. Change Priority to Urgent, click "Save changes". Expect "Assignment updated. …" and "Urgent" in the row's meta line.
4. Click the three-dot "Actions for {title}" button. Expect a menu with "Edit {title}" and "Delete {title}".
5. Click "Delete {title}", confirm in the dialog. Expect "Assignment deleted." and the empty state "No assignments yet."
**Execution status:** Executed — reviewer e2e journey 1, at `00be8ee`.

### 3. Change status from the row
1. On a row, use the status selector (a pill showing the current status, e.g. "Pending").
2. Choose "Completed". Expect "Assignment marked as completed. …", the pill turns green with the text "Completed", and the row leaves the unfinished list on the course page (reappear under "Show completed (1)").
**Execution status:** Executed — reviewer e2e journeys 1 and 3 plus the palette component test (all five statuses), at `00be8ee`.

### 4. Add the first subtask (review fix RV-125-001)
1. Create an assignment with no subtasks. Expect a "No subtasks" disclosure under the meta line.
2. Click it. Expect the framed panel with a "Subtasks" header, a "0 of 0 complete" counter, "No subtasks yet.", and a "Subtask title" field.
3. Type a title, click "Add subtask to {title}". Expect "Subtask added." and the disclosure to read "0/1 subtasks" (accessible name "1 subtask"). The panel collapses on the background refresh (D124-5) — click the disclosure again to reopen it.
4. Check the subtask checkbox. Expect "Subtask completed." and "1 of 1 complete" in the panel header.
**Execution status:** Executed — reviewer e2e journey 3 (course host, previously failing in pass 1) and new component tests on both hosts, at `00be8ee`.

### 5. Course page parity
1. Open a course with assignments. Expect the same card rows, status pill, actions menu, and subtask panel.
2. Click "Show completed (N)". Expect finished rows with the same controls.
**Execution status:** Executed — reviewer e2e journey 3, at `00be8ee`.

### 6. Empty, no-match, loading, and error states
1. A fresh account: expect "No assignments yet." with "Add your first assignment" and "Browse courses".
2. With filters active and no matches: expect the no-match card (covered in workflow 1).
3. Initial load failure (stop the API, reload): expect a red alert card "We could not load your assignments." with a "Try again" button; restart the API and click it — the list loads.
**Execution status:** Executed at component level (reviewer suite, `00be8ee`); the empty→create and no-match paths also ran in e2e journeys 1–2. The initial-error path has no dedicated browser journey — optional user repeat.

### 7. Keyboard operation
1. Tab through a row: title → course chip → subtask disclosure → status selector → actions menu.
2. Open the actions menu with Enter, move with Arrow keys, choose with Enter; expect focus to return to the menu trigger, then the dialog opens and Escape closes it, returning focus to the trigger.
3. Open the edit dialog with Enter on a title; press Escape — focus returns to the title.
**Execution status:** Executed — component tab-order/menu/Escape tests (reviewer suite, `00be8ee`) and e2e journey 1's Escape/focus checks.

### 8. Mobile layout (375px)
1. Resize to 375px wide. Expect: search full-width, Course/Status stacked, the toolbar wraps without horizontal overflow, rows stack title/metadata above the status + actions row.
2. Measure (or eyeball) the status selector, actions button, and subtask disclosure: each at least 44px tall on both `/assignments` and the course page.
**Execution status:** Executed — reviewer e2e journeys 4 and 5 measure real heights (≥44px) and no horizontal overflow, at `00be8ee`.

## Execution-status summary

| Workflow | Status | Evidence / provenance |
|---|---|---|
| 1 Filters | Executed | Reviewer e2e journey 2 + component tests, `00be8ee` |
| 2 Create/edit/delete | Executed | Reviewer e2e journey 1, `00be8ee` |
| 3 Status pill | Executed | Reviewer e2e journeys 1/3 + palette test, `00be8ee` |
| 4 First subtask (RV-125-001) | Executed | Reviewer e2e journey 3 + component tests, `00be8ee` |
| 5 Course parity | Executed | Reviewer e2e journey 3, `00be8ee` |
| 6 States | Executed (component level; error card optional browser repeat) | Reviewer suite, `00be8ee` |
| 7 Keyboard | Executed | Reviewer suite + e2e journey 1, `00be8ee` |
| 8 Mobile 375px | Executed (real measurements) | Reviewer e2e journeys 4–5, `00be8ee` |
| User browser pass | Executed — user-attested 2026-10-27 | Consistent with the executed spec after `00be8ee` |
| API/migration manual checks | Not applicable | No API or schema change (D125-1); ownership scoping unchanged and covered by the existing API tests |
