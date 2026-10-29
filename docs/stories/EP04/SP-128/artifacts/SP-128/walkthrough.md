# SP-128 Walkthrough — Study Availability & Unavailable Blocks

**Deliverable:** final user-facing walkthrough of the combined SP-128 review unit (SP-128A backend CRUD + SP-128B `/availability` editor), after the review pass of 2026-10-28.
**Companion documents:** [final review report](./review.md) · [SP-128A evaluation](../SP-128A/implementation.md) · [SP-128B evaluation](../SP-128B/implementation.md) · story [SP-128](../../SP-128-availability-and-unavailable-blocks.md).
**Reviewed Git state:** feature commits `35ed47d` (API) and `a13cd31` (web); HEAD `cb6f9c1`. Scenario data below is disposable local test data only; do not use shared/production accounts.

## 1. What changed

Students can now tell StudyPilot **when they can study and when they can't**, recurring every week:

- A new **Availability** page at `/availability` (link in the authenticated header between Calendar and Profile, and already linked from the calendar page as "Manage availability"). It lists the student's recurring time slots grouped under weekday cards (Monday → Sunday, matching the calendar's week start), each row showing its time range ("Mon 09:00–10:30") plus a textual + icon kind badge ("Available" / "Blocked").
- The student can **add** an available window or a blocked time, **edit** a slot's kind, day and times, and **delete** a slot behind a confirmation dialog. Every change is announced to assistive technology through a live status line ("Available window added. Showing 2 time slots.").
- A new **API** backs it all: `GET / POST / PATCH / DELETE /availability-slots` over the existing `AvailabilitySlot` database model — no migration, no new dependency, nothing about other features touched.
- Slots already appear on the weekly calendar (SP-127's read model): an added window shows as an "Available" event, a blocked time as a "Blocked" band — the SP-128 e2e journey proves that pipe through the real UI.

## 2. How the code works

**Backend — `apps/api/src/modules/availability/`** (`availability.controller.ts`, `availability.service.ts`, two DTOs, module registered in both `app.module.ts` and `test/test-http.ts`):

- Every route takes the student's id **only from the JWT principal** (`@CurrentUser()`); the global validation pipe rejects any `userId` body field with a field-level 400. Every Prisma read and write carries that `userId` in its `where` clause, so a missing record, another student's record, or a malformed id all become the same uniform `404 Resource not found` — no 403s, no existence oracle.
- `POST` validates `dayOfWeek` (integer 0–6, Sunday = 0) and both times (`HH:mm`, hour 00–23, minute 00–59, `endTime` strictly after `startTime`, no midnight wrap) and maps the database's unique constraint on `(userId, dayOfWeek, startTime)` to a `409 "An availability slot already exists at this time."`. `isAvailable` omitted → `true` (a study window); `false` records a recurring blocked time.
- `PATCH` is a partial merge: it reads the stored row (scoped), merges the provided fields onto it, **validates the merged values**, and writes only the provided fields; an empty body is a 400, a post-merge duplicate is a 409.
- `DELETE` is a scoped `deleteMany` → `204` on success, uniform 404 on anything not owned.

**Frontend — `apps/web/src/entities/availability/`, `features/availability/ui/`, `pages/availability/ui/`**:

- A plain-axios entity client `availabilityApi.ts` speaks the API contract exactly (no transformation layer); `AvailabilityPage.tsx` is the single state owner — it shows loading, empty ("No availability yet." + add CTA + "View your week" link), and error-with-retry states and keeps no derived list state beyond the last API response, including a stale-response guard (`requestSeq`) so a slow earlier fetch can't overwrite a newer one.
- `AvailabilitySlotForm.tsx` is the add/edit dialog (kind radio pair "Available window"/"Blocked time", day select Sun–Sat defaulting to Monday, time inputs): client validation mirrors the API rules, a 400 field map shows messages under the matching inputs, a 409 renders the API's message as a form-level alert, and a uniform 404 during edit explains the slot may no longer exist and re-reads the list on cancel. `DeleteAvailabilitySlotDialog.tsx` is the confirmation (names the slot, states the effect on the list and the calendar, safe action focused first). Both dialogs trap focus, close on Escape, and return focus to the trigger.
- `slotLabel.ts` derives "Mon 09:00–10:30" as stored (no time-zone conversion — weekly recurring times) and full accessible names ("Edit Available Mon 09:00–10:30", "Delete Blocked Wed 20:00–22:00"), so rows with identical times of different kinds never collide in the accessibility tree.

## 3. Why it is correct

- **Code invariants verified by inspection** (not just claim): ownership on every query; validation before any write; merged-value validation on PATCH; P2002/P2025 mapped to the contract's 409/404; response shape exactly the 7 contract keys with ISO timestamps and no `userId`; the implemented routes/shape match the EP04 shared API contract line-by-line; the UI mirrors the same rules client-side and renders API error messages verbatim.
- **Executed automated evidence** (implementer-run, recorded in the child records at commits `35ed47d`/`a13cd31`; review runtime has no shell, so these are provenance-cited recorded results, not re-executed by the reviewer): availability API suites **42/42** (unit + data-scoping + e2e over real HTTP/Postgres) including the two-student isolation matrix and the nothing-written-on-failure asserts; web availability suites **56/56** and the full web unit suite **760/760**; typecheck and lint recorded clean on both apps; the **calendar e2e journey 4/4** runs the real browser stack (self-contained throwaway database) from login → add window → add blocked time → assert both appear on the calendar via the SP-127A read model.
- **Review closure:** both children's implementation records contain no open in-scope findings; the review's [findings section](./review.md) confirms their recorded dispositions against the final code. The two tracked items (IR-001: pre-existing course e2e test drift, EP02 scope; IR-002: a latent tsconfig exclude polish) are outside SP-128's requirements and explicitly not blockers.
- Acceptance criteria 1–8 (parent) trace one-to-one onto code and tests as tabulated in the review report; the remaining DoD items (10 integrated review, 11 this walkthrough) are satisfied as described in the report's checklist.

## 4. Manual test workflows

All steps use a throwaway local account (register a fresh user in the local dev stack). Each workflow below is listed for the user to run manually against `/availability`.

### 4.1 Add an available window and a blocked time — status: `Not executed — user test instructions`

*(Automated cover: the recorded calendar e2e journey and page tests exercise this flow end to end in a real browser; user repetition is optional confirmation.)*

1. Log in locally, open the header's **Availability** link.
2. With no slots yet, expect the empty card: "No availability yet.", the hint, **Add your first time slot**, and **View your week** → goes to the calendar.
3. Click **Add time slot** → the dialog opens focused on the "Available window" choice, heading "Add a time slot", Day default Monday.
4. Choose Start 09:00, End 10:30, click **Create time slot** → the dialog closes, a **Monday** card shows "Mon 09:00–10:30" with the "Available" badge, the status line reads "Available window added. Showing 1 time slot."
5. Click **Add time slot** again, choose "Blocked time", Day Wednesday, 20:00–22:00, create → a **Wednesday** card shows "Wed 20:00–22:00" with the "Blocked" badge.
6. Open the calendar — the same week shows an "Available … 09:00" event and a "Blocked … 20:00" band.

### 4.2 Edit and delete with confirmation — status: `Not executed — user test instructions`

1. Click **Edit** on an "Available" row → dialog heading "Edit Available Mon 09:00–10:30".
2. Switch kind to "Blocked time", change day/times, **Save changes** → the row updates under the new weekday with the "Blocked" badge, status line "Time slot updated.".
3. Click **Delete** on a row → the confirmation names the time range and states the effect on both the availability list and the calendar; **Cancel** is focused first — Escape or Cancel closes it and the row stays.
4. Delete again and click confirm → the row disappears once the API confirms; status line "Time slot deleted."; refreshing the page shows it gone permanently.

### 4.3 Validation and conflicts — status: `Not executed — user test instructions`

1. In the add dialog pick an **End time earlier or equal to Start time** → inline error "End time must be after the start time." under the End field; nothing is saved.
2. Clear a time and submit → "Start time is required"/"End time is required" next to the empty field.
3. Create a slot, then create a second one with **the same day and start time** → form-level alert with the API's message ("…already exists…"); your input is preserved.
4. (Optional, server-authority check) Editing the day select never offers invalid days — only Sunday–Saturday.

### 4.4 Loading, error, retry — status: `Not executed — user test instructions`

1. Loading appears as "Loading your availability…" on first open (brief with a local API).
2. Break the API temporarily (e.g. stop the local dev server) and reload `/availability` → the error card "We could not load your availability. Try again." with no broken list underneath; restart the server and click **Try again** → the real list renders.
3. If a background refresh fails after a successful change, a toast repeats the same message while your existing list stays on screen.

### 4.5 Ownership (27/404 behavior) — status: `Not executed — user test instructions`

 *(Automated cover: the recorded data-scoping spec proves this matrix over real HTTP; a manual repeat requires two local accounts.)*

1. Register account A, add a slot 09:00–10:30. Register account B in a different browser profile.
2. As B, try to reach A's slot by URL/curl — there is no cross-user surface in the UI by design; any direct API call from B to A's slot id (PATCH/DELETE with B's token) must return `404 {"message":"Resource not found", …}` and leave A's slot unchanged.
3. B creating the same window 09:00–10:30 must **succeed** (the uniqueness key includes the owner) — B's own duplicate starts from A's nonexistence.

### 4.6 Keyboard usage — status: `Not executed — user test instructions`

1. Tab to the page CTA and open the form; Tab order runs Kind → Day → Start → End → Cancel → Create; the kind radio pair is one tab stop with Left/Right arrows switching, focus ring visible throughout.
2. Press Escape in the form → dialog closes, focus returns to the trigger button; Tab wraps if you hold Shift+Tab at the first control.
3. Repeat for the delete confirmation — Cancel (safe action) gets focus on open.

### 4.7 Mobile layout — status: `Not executed — user test instructions`

1. Set the viewport to 375px width (device toolbar) → the header button stacks full-row, each slot row stacks label above actions, touch targets reach ≥44px, the dialog scrolls/breathes without clipping; then check desktop (≥1024px) → side-by-side time inputs, row actions right-aligned.

### 4.8 Unauthenticated access — status: `Not applicable for UI path` / API-negative covered

There is no logged-out entry: the route sits inside `ProtectedRoute`, and the API's global guard 401s direct calls (recorded in the specs). Nothing to test manually beyond 4.1's login prerequisite.

## 5. Execution-status summary

- **Executed (automated, by the implementer, recorded in the child records):** availability API suites 42/42; web availability suites 56/56; full API unit 698 passed; full web unit 760/760; calendar e2e 4/4 (real browser stack); typecheck + lint clean; the workflows' core behavior is thereby covered by evidence, not by this walkthrough's steps.
- **`Not executed — user test instructions`:** sections 4.1–4.7 are instructions, not test results. The reviewer runtime had no shell/browser, so no manual or repeat execution was performed by the review.
- **`Not applicable`:** section 4.8 (auth gate covers it; recorded 401 assertions).
- Any AC-required manual gate has recorded automated/real-browser evidence before this pass; optional user repeats are confirmations, not prerequisites.

*Manual steps are instructions only — they are not test results. Use disposable local data; do not run these against shared systems.*
