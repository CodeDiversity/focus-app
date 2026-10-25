# SP-113 Final Walkthrough — Quick Assignment Creation

**Parent Story:** [SP-113: Quick Assignment Creation](../../SP-113-quick-assignment-creation.md)  
**Parent Delivery Home:** `docs/stories/EP03/SP-113/`  
**Review Report:** [SP-113 Review Report](./review.md)  
**Reviewed Range:** `378355c24a2270edeb453dd541773226435b878b..df670c3dd2f15ac9e2c30a9cd38078ac11506827`  
**Status:** Reviewed and Passed (Pass 2, 2026-10-24)

---

## 1. What Changed

This feature implements proposed story 1 of Epic EP03: allowing students to quickly create assignments from within a course view. The complete review unit encompasses three substories:

1. **[SP-113A](../../SP-113A-assignment-create-api.md) (Backend):**
   - Migration `20261024120000_assignment_optional_due_date` to make `Assignment.dueDate` optional (`DateTime?`).
   - New `AssignmentsModule`, `AssignmentsController`, and `AssignmentsService` providing `POST /assignments`.
   - Principal-scoped assignment creation with strict ownership checks verifying the optional `courseId` belongs to the requesting student.
   - Global validation with `FieldValidationPipe` forbidding unknown fields and rejecting client-provided lifecycle fields (`status`).
2. **[SP-113B](../../SP-113B-quick-create-assignment-ui.md) (Frontend):**
   - New `entities/assignment/api/assignmentApi.ts` client adapter.
   - Quick-create modal dialog `AssignmentForm` (title, optional date, optional estimated duration in hours, optional priority defaulting to Medium).
   - "Add assignment" primary button in the `AssignmentsSection` header and "Add your first assignment" CTA in the empty state.
   - Seamless background refetch of course details on creation without resetting or blanking the page.
   - WCAG 2.2 AA compliant "No due date" indicator and repeatable screen-reader live announcements.
3. **[SP-113C](../../SP-113C-quick-create-integration-signoff.md) (Integration):**
   - Comprehensive HTTP journey and multi-student security spec `assignments-e2e.spec.ts` running against PostgreSQL.
   - Consolidated parent implementation index and verification record.

---

## 2. How the Code Works

### Creation Flow & Ownership Enforcement
1. **User interaction:** When viewing `/courses/:id`, the student clicks "Add assignment" (or "Add your first assignment").
2. **Dialog opening:** Opening the dialog emits `onAssignmentFormOpen`, which resets the `CourseDetailPage` status message to empty (`''`), ensuring any prior announcement is cleared. The title input receives initial autofocus, and focus is trapped inside the dialog using `aria-modal="true"`.
3. **Client validation:** React Hook Form + Zod validate required non-whitespace title (≤ 200 chars) and duration bounds (`0 < h ≤ 1000`). Date input is transformed to a local-midnight ISO string.
4. **API Request:** `POST /assignments` sends `{ title, courseId, dueDate?, estimatedHours?, priority?, description? }`. The bearer token provides the student's `userId`.
5. **Backend security & validation:**
   - `FieldValidationPipe` strips non-whitelisted fields (e.g. `status` or client-supplied `userId`) and returns 400.
   - If `courseId` is provided, `AssignmentsService` verifies the course via `this.prisma.course.findFirst({ where: { id: courseId, userId } })`. If missing or belonging to another student, it immediately throws a uniform 404 (`RESOURCE_NOT_FOUND`) without disclosing whether the course exists.
   - The assignment record is inserted with `userId = principal.userId` and default `status = PENDING`.
6. **UI Refresh & Announcement:** On receiving 201 Created, the dialog closes and triggers `onAssignmentChanged`. The page issues a background `getCourse(id)` refetch and sets `statusMessage` to `"Assignment added."`. Assistive technology detects the text transition from empty to `"Assignment added."` in the persistent `role="status"` region. The section displays the new assignment in its server-sorted position (`dueDate asc nulls-last, title asc`).

### Key Changed Files

- `apps/api/prisma/schema.prisma` & migration: `dueDate DateTime?`
- `apps/api/src/modules/assignments/`: `assignments.controller.ts`, `assignments.service.ts`, `dto/create-assignment.dto.ts`
- `apps/api/src/modules/courses/courses.service.ts`: Nested assignments query scoped with `{ where: { userId } }`
- `apps/web/src/entities/assignment/api/assignmentApi.ts`: Axios API client
- `apps/web/src/features/courses/ui/AssignmentForm.tsx`: Dialog form, focus trap, and validation
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx`: Header button, empty CTA, and WCAG AA `text-secondary-500` null due date label
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx`: Dialog triggers, live region management, and background refetch

---

## 3. Why It Is Correct

- **Source AC Coverage:**
  - `AC-E03-01`: Title and course creation verified end-to-end via frontend form and backend API.
  - `AC-E03-02`: Optional due date, duration, and priority supported across API, DB, and UI (with `type` explicitly allocated to upcoming story 3).
- **Security & Data Isolation:**
  - Foreign course references return uniform 404 with no existence leak (proven in unit tests and 2-student E2E matrix).
  - Unscoped queries are completely prevented; every database query restricts rows to `userId`.
- **Review Corrections Verified (Pass 2):**
  - **F113-001 (Contrast):** Text color changed from `secondary-400` to `secondary-500` (`#64748b`), achieving a 4.759:1 contrast ratio against the white background, exceeding WCAG 2.2 AA (4.5:1).
  - **F113-002 (Repeat Announcements):** Status region clears upon dialog opening and updates upon creation, providing reliable announcements for multiple back-to-back creates.
- **Automated Verification:**
  - 521 frontend unit/component tests, typecheck, and lint pass.
  - 731 API tests (including 50 unit and 16 integration HTTP tests) pass on PostgreSQL.

---

## 4. Manual Test Workflows

### Prerequisites & Setup
1. Start backend API and ensure migrations are applied (`pnpm --filter @studypilot/api exec prisma migrate deploy`).
2. Start frontend dev server (`pnpm --filter @studypilot/web dev`).
3. Log in as a student user and navigate to an active course at `/courses/<courseId>`.

### Workflow 1: Quick Assignment Creation from Header
1. **Action:** Click the "Add assignment" button in the "Assignments" section header.
2. **Expected Result:** Dialog opens titled "Add an assignment". Initial focus lands on the "Title" field. The background page is inert.
3. **Action:** Enter Title "CS Homework 1", leave Due Date blank, set Estimated duration to "2.5", select Priority "High", and click "Create assignment".
4. **Expected Result:** The dialog closes immediately. Submit button briefly shows loading spinner. Live region announces "Assignment added." The list displays "CS Homework 1" with a muted "No due date" label in dark slate (`#64748b`) and an orange "High" badge.

### Workflow 2: Empty State Call-to-Action
1. **Action:** Navigate to a course that has no assignments.
2. **Expected Result:** Assignments section displays "No assignments yet." and a secondary CTA button "Add your first assignment".
3. **Action:** Click "Add your first assignment".
4. **Expected Result:** "Add an assignment" dialog opens with initial focus on Title.
5. **Action:** Submit with Title "First Essay" and Due Date set to a future date.
6. **Expected Result:** Dialog closes. "No assignments yet." disappears, and the new assignment row is displayed.

### Workflow 3: Consecutive Creations (Live Region Announcement)
1. **Action:** Complete Workflow 1. Live region contains "Assignment added."
2. **Action:** Immediately click "Add assignment" again.
3. **Expected Result:** Status message clears to empty.
4. **Action:** Enter Title "CS Homework 2" and click "Create assignment".
5. **Expected Result:** Live region updates from empty to "Assignment added." Screen readers announce the second consecutive creation. Both assignments appear in the section.

### Workflow 4: Validation & Error Handling
1. **Action:** Click "Add assignment".
2. **Action:** Leave Title empty and type `-5` in Estimated duration. Click "Create assignment".
3. **Expected Result:** Submission is blocked client-side. Field error "Title is required" appears under Title. "Estimated duration must be greater than 0 and at most 1000 hours" appears under Duration.
4. **Action:** Enter a valid Title and duration `2`. Press Escape.
5. **Expected Result:** Dialog closes without saving. Focus returns to the "Add assignment" button.

### Workflow 5: Keyboard Accessibility Navigation
1. **Action:** Press Tab to focus the "Add assignment" button and press `Enter`.
2. **Expected Result:** Dialog opens; focus is on the Title input.
3. **Action:** Press Tab repeatedly.
4. **Expected Result:** Focus cycles: Title → Due Date → Estimated Duration → Priority → Cancel → Create assignment → Title (focus trap is active).
5. **Action:** Press `Escape`.
6. **Expected Result:** Dialog closes and focus returns to the "Add assignment" button.

---

## 5. Execution Status

| Workflow | Status | Provenance / Evidence |
|---|---|---|
| Workflow 1: Header Creation | **Not executed — user test instructions** | Automated counterpart executed in `CourseDetailPage.test.tsx` and `assignments-e2e.spec.ts`. Live browser testing accepted under D113C-1. |
| Workflow 2: Empty State CTA | **Not executed — user test instructions** | Automated counterpart executed in `AssignmentsSection.test.tsx`. |
| Workflow 3: Consecutive Creations | **Not executed — user test instructions** | Automated counterpart executed in `CourseDetailPage.test.tsx:156–182` (parameterized for both CTAs). |
| Workflow 4: Validation & Esc | **Not executed — user test instructions** | Automated counterpart executed in `AssignmentForm.test.tsx`. |
| Workflow 5: Keyboard Trap | **Not executed — user test instructions** | Automated counterpart executed in `AssignmentForm.test.tsx` focus-trap assertions. |
