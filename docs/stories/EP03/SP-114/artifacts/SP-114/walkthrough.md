# SP-114 Assignment Editing and Deletion — User Walkthrough

**Review unit:** SP-114 (parent) — covers SP-114D (API), SP-114E (UI), SP-114F (integration)
**Final review:** `review.md` (this directory)  
**Reviewed state:** `f27c671a0df0604013929939902030a42b219301`; baseline `0f47d72ccd2953f332a527c7a1b4f9ee79debdda`. User approved this walkthrough on 2026-10-24.

---

## 1. What Changed

Students can now **edit** and **delete** their own assignments from the course detail page. This extends the create-only assignment feature (SP-113) with full CRUD for the assignment resource.

**User-visible workflows**

| Workflow | Entry point | Outcome |
|---|---|---|
| Edit assignment | Click **Edit** on any assignment row → form opens pre-filled → change fields → **Save changes** | PATCH `/assignments/:id` → row updates in place → toast "Assignment updated." |
| Delete assignment | Click **Delete** on any assignment row → confirmation dialog → **Delete** | DELETE `/assignments/:id` → row removed after refetch → toast "Assignment deleted." |
| Cancel edit/delete | **Cancel** in form or dialog, press **Escape**, click backdrop | No API call; focus returns to the originating row button |
| Empty-state transition | Delete the final assignment | Section shows "No assignments yet." with **Add your first assignment** CTA |

**Scope**: SP-114D (new PATCH/DELETE endpoints, `UpdateAssignmentDto`, ownership-scoped service, real-DB tests), SP-114E (per-row Edit/Delete buttons, `AssignmentForm` edit mode, `DeleteAssignmentDialog`, keyboard focus management, live-region announcements), SP-114F (e2e specs: PATCH/DELETE proof, two-student matrix, validation matrix, null semantics, browser error/retry record, parent index).

---

## 2. How the Code Works

### API layer (SP-114D)

- **Controller** (`apps/api/src/modules/assignments/assignments.controller.ts`)
  - `@Patch(':id')` → `update(id, dto)` → returns 10-key `CourseAssignment`
  - `@Delete(':id')` → `remove(id)` → 204 No Content
  - Both guarded by global `APP_GUARD`; principal via `@CurrentUser()`

- **Service** (`assignments.service.ts`)
  - `update()`: `ownedWhere(userId, { id })` → `findFirstOrThrow` → partial update with `UpdateAssignmentDto` fields only (excludes `status`, `actualHours`, `courseId`) → returns projected assignment
  - `remove()`: `ownedWhere(userId, { id })` → `findFirstOrThrow` → `delete()` → tasks survive via Prisma default `SetNull` on optional `Task.assignmentId`

- **DTO** (`dto/update-assignment.dto.ts`): all fields optional, same validators as create (title ≤200, description ≤2000, dueDate ISO-8601/nullable, estimatedHours 0–1000, priority enum); unknown fields rejected by validation pipe.

- **Ownership**: every query uses `ownedWhere(userId, …)` from `apps/api/src/common/ownership/ownership.ts`; missing/other-student → uniform 404 "Resource not found".

- **Tests**: unit (`assignments.service.spec.ts`), data-scoping (`assignments-data-scoping.spec.ts`), e2e (`assignments-e2e.spec.ts`) — all real Postgres.

### UI layer (SP-114E)

- **`AssignmentsSection.tsx`** — renders assignment list with per-row **Edit** (outline) and **Delete** (ghost) buttons. State: `editing` (AssignmentForm), `deleting` (DeleteAssignmentDialog), `focusAfterDelete` (tracks deleted id + neighbor for post-refetch focus). On delete success: captures neighbor, fires `onAssignmentChanged('deleted')`, immediately focuses neighbor's Edit or Add button; `useLayoutEffect` re-asserts focus once refetch actually removes the row. Final-row deletion focuses empty-state "Add your first assignment".

- **`AssignmentForm.tsx`** — reused for create and edit. Edit mode activated by passing `assignment` prop: heading "Edit assignment", submit "Save changes", pre-fills all editable fields (title, dueDate as `YYYY-MM-DD`, estimatedHours, priority, description). Lifecycle fields (`status`, `actualHours`) hidden. Blank dueDate/duration → `null` (backend keeps stored); blank description → `''` (clears). 400 → field alerts; 404 → inline "Resource not found" with link to `/courses`; 5xx/network → toast + retry.

- **`DeleteAssignmentDialog.tsx`** — modal with `role="dialog"`, `aria-modal="true"`. On open: remembers trigger (row Delete button), focuses **Cancel** (safe default). Focus trap: Tab/Shift+Tab cycles within dialog even after buttons disable; Escape cancels only when not in-flight. On confirm: focuses dialog before disable, calls `deleteAssignment(id)`, on success sets `skipRestoreRef=true`, calls `onDeleted()` (section handles focus). Cancel/backdrop/Escape (not in-flight) → `onCancel()` → trigger restored.

- **`CourseDetailPage.tsx`** — wires `handleAssignmentChanged(action)` announcing "Assignment added/updated/deleted." via live region. Opening Delete calls `onAssignmentFormOpen()` which clears the live region so a second identical "Assignment deleted." is a new announcement.

- **API client** (`apps/web/src/entities/assignment/api/assignmentApi.ts`) — `updateAssignment(id, data)` → PATCH; `deleteAssignment(id)` → DELETE.

### Integration (SP-114F)

- New e2e spec `assignments-e2e.spec.ts` extends SP-113A suite: PATCH refetch proof, DELETE/task survival refetch, two-student ownership matrix, validation matrix (forbidden fields, empty title, etc.), null/clear semantics. Browser evidence: headless Chrome walk covering field error, PATCH 500/retry, network failure/retry, edit 404, DELETE 500/retry, keyboard/announcement workflows; screenshot `03-edit-500.png` shows toast, preserved title, enabled Save.

---

## 3. Why It Is Correct

| Requirement | Evidence |
|---|---|
| **AC-E03-01** (create + edit/delete same resource) | D: PATCH/DELETE on `/assignments/:id`; E: Edit/Delete UI on same rows; F: e2e refetch proofs |
| **AC-E03-02** (optional fields: dueDate, estimatedHours, priority) | D: `UpdateAssignmentDto` validates all editable optional fields; E: form exposes all; F: validation matrix |
| **DoD 1** Functional ACs | E8 post-delete focus corrected (IR-114-06); human walkthrough approved |
| **DoD 2** Validation | DTO + service re-check (D), form client-side (E), HTTP invalid-field matrix (F), browser cases |
| **DoD 3** Data scoping | `@CurrentUser()` + `ownedWhere` in every query (D); corrected fixture predicates; F two-student matrix |
| **DoD 4** Actionable errors | Field-level 400, uniform 404, retry toast + preserved inputs (D/E), delete inline retry (F browser) |
| **DoD 5** Loading/empty/error | Pending containment fixed (IR-114-01), empty state (E10), error recovery (browser evidence) |
| **DoD 6** Keyboard accessibility | Focus trap + Escape handling (IR-114-01), post-delete focus to surviving control (IR-114-06 fix), live-region announcements (IR-114-02 fix) |
| **DoD 7** Responsive | `sm:flex-row sm:items-center sm:justify-between`, `flex-wrap gap-2` on rows/actions; historical 390×844 check |
| **DoD 8** Automated business-rule tests | D/E/F suites recorded green. Focused web tests and typecheck re-run against `f27c671` on 2026-10-24, exit 0 (3 files / 47 tests). API suites not re-run; that commit does not change API code. |
| **DoD 9** API docs | Parent README contract (PATCH/DELETE); D114-5 notes no migration (SetNull default) |
| **DoD 10** Integrated review | Browser error/retry evidence supplied. User approved the human walkthroughs on 2026-10-24. |
| **DoD 11** Reviewer walkthrough | This document. User approved it on 2026-10-24. |

**Mandatory findings closed**
- IR-114-01: pending DELETE focus trap fixed (E)
- IR-114-02: live-region re-arm on Delete open fixed (E/F)
- IR-114-03: integrated error/retry browser record persisted (F)
- IR-114-04: fixture predicates corrected to `ownedWhere` (D/F)
- IR-114-05: baseline/count claims corrected (E/F records)
- IR-114-06: **post-delete focus management implemented + regression tests + human approval**

**Closed**: IR-114-07 — focused web tests and typecheck re-run against `f27c671` on 2026-10-24, exit 0. API suites were not re-run because that commit does not change API code. User approved the parent review.

---

## 4. Manual Test Workflows

### 4.1 Edit an assignment (happy path)

**Prerequisites**: logged-in student; course with ≥1 assignment owned by that student; dev server + API running locally.

| Step | Action | Expected result |
|---|---|---|
| 1 | Navigate to `/courses/:courseId` | Course detail page loads; Assignments section shows rows with Edit/Delete buttons |
| 2 | Click **Edit** on an assignment row | `AssignmentForm` opens in edit mode: heading "Edit assignment", submit "Save changes", fields pre-filled |
| 3 | Change title, due date, priority, description | All fields accept input; description shows "Leave blank to clear." hint |
| 4 | Click **Save changes** | Form closes; row updates with new values; toast "Assignment updated." appears; live region announces |
| 5 | Refresh page | Changes persist |

**Edge cases**: blank due date → sends `null` (keeps original); blank description → clears; 400 validation → field alerts; 404 → inline "Resource not found" with link; 5xx → toast + retry enabled.

**Execution status**: **Not executed — user test instructions** (no reviewer browser execution in this session; implementer browser evidence covers error/retry paths)

---

### 4.2 Delete an assignment (happy path, middle row)

**Prerequisites**: same as above; course with ≥2 assignments.

| Step | Action | Expected result |
|---|---|---|
| 1 | Navigate to `/courses/:courseId` | Assignments list visible |
| 2 | Click **Delete** on the first assignment | Dialog opens: "Delete \<title>?", body explains subtasks remain; **Cancel** focused |
| 3 | Press **Tab** | Focus cycles to **Delete** button |
| 4 | Press **Shift+Tab** | Focus cycles back to **Cancel** |
| 5 | Press **Escape** | Dialog closes; focus returns to row's Delete button |
| 6 | Click **Delete** again, then **Delete** in dialog | Dialog closes; row remains briefly; refetch completes; row removed; **next row's Edit button** receives focus; toast "Assignment deleted."; live region announces |
| 7 | Refresh page | Assignment gone; tasks (if any) survive unassigned |

**Execution status**: **Not executed — user test instructions** (Vitest/jsdom regression tests pass; implementer browser walk covered error/retry)

---

### 4.3 Delete the final assignment (empty-state transition)

**Prerequisites**: course with exactly 1 assignment.

| Step | Action | Expected result |
|---|---|---|
| 1–5 | Same as 4.2 steps 2–5 | Dialog opens/closes with focus restoration |
| 6 | Confirm deletion | Row removed; refetch returns empty list; section shows "No assignments yet." with **Add your first assignment** button **focused**; toast "Assignment deleted." |
| 7 | Click **Add your first assignment** | Create form opens |

**Execution status**: **Not executed — user test instructions** (Vitest regression test covers this)

---

### 4.4 Cross-student ownership (security)

**Prerequisites**: two student accounts (A, B); assignment owned by A.

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in as B; navigate to A's course/assignment (or call API directly) | 404 "Resource not found" — no distinction between missing and other-student |
| 2 | Attempt PATCH/DELETE via API | 404; nothing updated/deleted |

**Execution status**: **Not executed — user test instructions** (F two-student e2e matrix implemented; independent execution CANNOT VERIFY)

---

### 4.5 Keyboard-only edit→delete sequence

**Prerequisites**: course with ≥2 assignments.

| Step | Action | Expected result |
|---|---|---|
| 1 | Tab to first assignment's **Edit** → Enter | Edit form opens; focus in title field |
| 2 | Tab through fields → Enter on **Save changes** | Form closes; focus returns to row's Edit button; announcement "Assignment updated." |
| 3 | Tab to same row's **Delete** → Enter | Dialog opens; **Cancel** focused |
| 4 | Tab → Enter on **Delete** | Dialog closes; focus moves to **next row's Edit** (or Add if final); announcement "Assignment deleted." |
| 5 | Repeat for remaining rows | Each deletion focuses a surviving control; never `document.body` |

**Execution status**: **Not executed — user test instructions** (Vitest/jsdom regression tests cover focus assertions; no reviewer browser execution)

---

### 4.6 Error recovery (network failure on delete)

**Prerequisites**: simulate network failure (dev tools offline or API down).

| Step | Action | Expected result |
|---|---|---|
| 1 | Open Delete dialog, confirm | Inline alert "We could not delete the assignment. Try again."; **Delete** button re-enabled |
| 2 | Restore network, click **Delete** again | Succeeds; row removed; focus managed per 4.2/4.3 |

**Execution status**: **Not executed — user test instructions** (implementer browser evidence: `observations.json` rows 14–23, screenshot `03-edit-500.png`)

---

## 5. Execution Status Summary

| Workflow | Status | Provenance |
|---|---|---|
| Edit assignment (happy path) | Not executed — user test instructions | Implementer unit/component tests pass; browser evidence covers error paths |
| Delete assignment (middle row) | Not executed — user test instructions | Vitest regression tests pass (focus assertions); implementer browser evidence |
| Delete final assignment (empty state) | Not executed — user test instructions | Vitest regression test passes |
| Cross-student ownership | Not executed — user test instructions | F e2e two-student matrix implemented; independent execution CANNOT VERIFY |
| Keyboard-only sequence | Not executed — user test instructions | Vitest/jsdom focus regression tests pass |
| Error recovery (network failure) | Not executed — user test instructions | Implementer browser evidence (observations + screenshot) |
| **Focused web test execution** | **Executed** 2026-10-24 23:22 EDT, `apps/web`, commit `f27c671` | `pnpm test -- run AssignmentsSection.test.tsx DeleteAssignmentDialog.test.tsx CourseDetailPage.test.tsx` exit 0 (3 files / 47 tests); `pnpm typecheck` exit 0 |

---

## 6. Closeout

This walkthrough matches `f27c671` and the user's 2026-10-24 approval of the parent review and human walkthroughs. The focused web gates were executed in this session and passed. No further SP-114 implementation is open.