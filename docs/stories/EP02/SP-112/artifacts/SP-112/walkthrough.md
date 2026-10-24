# SP-112 Final User Walkthrough — Recurring Class Meetings & Course Detail

**Review unit:** SP-112 (A + B + C) — [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18), milestone M1
**Date:** 2026-10-23
**Final reviewed state:** commit `6ce897a` on `main` (the F-112B-1 Toaster fix on top of A `080f2e9` ← B `8bbafb5` ← C `469a829`)
**Companion document:** [review.md](./review.md) — final combined parent review, pass 2 (PASS)
**Child records:** [SP-112A](../SP-112A/implementation.md) · [SP-112B](../SP-112B/implementation.md) · [SP-112C](../SP-112C/implementation.md) · [parent index](./implementation.md)

## 1. What changed

Everything in this unit lives in the course area of the app:

1. **A course detail page** (`/courses/:id`) — each course name in the Courses list is now a link. The page shows the course header (color chip, name, code, instructor, semester, credits, description with a Show more/less toggle, and a full-width **Archived** strip for archived courses) above two sections: **Meetings** and **Assignments**.
2. **Recurring class meetings** — you can **add**, **edit** and **delete** (with confirmation) weekly meeting times such as “Mon 09:00–10:30”. These are recurring times of day: a weekday plus 24-hour start/end, with no dates and no time-zone conversion.
3. **A read-only assignments section** — shows the course’s assignments (title, due date, status, priority). Creating and managing assignments arrives with EP03; until then the section shows “No assignments yet.”
4. **Feedback for everything** — each action announces its result (“Meeting added.” / “Meeting updated.” / “Meeting deleted.”); API errors appear inline (field errors under the inputs, a form-level alert for a duplicate slot, an error card for a missing course); and non-API failures (network/5xx) surface as a **toast** — which now actually renders, because the review closed F-112B-1 by mounting `<Toaster />` in the app shell (see §3).

## 2. How the code works

### Backend (SP-112A)

- **`apps/api/prisma/schema.prisma`** — the new `ClassMeeting` model: `dayOfWeek Int` (0 = Sunday … 6 = Saturday) + `startTime`/`endTime` as `HH:mm` 24-hour strings (the `AvailabilitySlot` precedent), plus `userId` and `courseId` (both cascade) and `@@unique([courseId, dayOfWeek, startTime])` — the duplicate-slot rule is enforced by the database itself. One migration: `20261023000000_class_meetings` (the new table + foreign keys, nothing else).
- **`apps/api/src/modules/courses/courses-meetings.service.ts`** — the four nested routes (`GET/POST /courses/:id/meetings`, `PATCH/DELETE /courses/:id/meetings/:meetingId`):
  - Every route first gates on **course ownership** (`findFirst({ where: { id, userId } })`); a missing course and another student’s course are indistinguishable — both return the uniform 404 `Resource not found` (no existence oracle).
  - Every meeting query is scoped to **both** `courseId` and the principal’s `userId`; `update`/`delete` additionally require the meeting to belong to the `:id` course (dual-ownership — a meeting from your *other* course is a 404, never a write).
  - Validation is backend-authoritative: DTO (class-validator) **plus** service re-checks — `dayOfWeek` integer 0–6; `HH:mm` with hour 00–23 / minute 00–59; `endTime` strictly after `startTime` on the same day (no midnight wrap).
  - `create` maps the Prisma unique violation (P2002) to **409** `A meeting already exists at this time.`; `delete` returns **204** (0 rows affected → uniform 404).
  - Responses are the 6-key projection `id, dayOfWeek, startTime, endTime, createdAt, updatedAt` — `userId`/`courseId` are never exposed.
- **`apps/api/src/modules/courses/courses.service.ts`** — `GET /courses/:id` now returns the 14-key detail: the 12-key course+semester + `meetings` (ordered `dayOfWeek` asc, `startTime` asc) + `assignments` (10-key read-only, `dueDate` then `title`). The list route is unchanged (12-key, no nested collections).

### Frontend (SP-112B)

- **`apps/web/src/app/App.tsx`** — the `/courses/:id` route, inside `ProtectedRoute`, beside `/courses`; **`CourseList.tsx`** — the course name is a `Link` to the detail page.
- **`CourseDetailPage.tsx`** — one `getCourse` fetch drives the page. States: loading spinner → content; **404** → fixed copy “We couldn’t find this course. It may no longer exist.” + **Back to courses** (deliberately no retry — a 404 does not self-heal); any other fetch failure → alert + **Try again**; a *background* re-fetch failure (after a mutation) keeps the last known detail and toasts. An always-present `role="status"` live region announces mutations.
- **`MeetingsSection.tsx`** — rows in API order via `formatMeetingLabel` (`meetingLabel.ts`: short weekday + en dash + `HH:mm`, e.g. “Mon 09:00–10:30”); empty state “No meetings yet” + **Add your first meeting**.
- **`MeetingForm.tsx`** — the add/edit dialog: React Hook Form + a zod schema mirroring the backend rules; focus is trapped, Escape closes, focus returns to the trigger. Error branches: **400** → per-field inline errors; **409** → form-level alert carrying the server message; **404** → alert + Back to courses; **other** (network/5xx) → `toast.error`, form values preserved (resubmit is the retry).
- **`DeleteMeetingDialog.tsx`** — Cancel first, danger-styled Delete; an API failure shows the error *inside* the dialog, which stays open.
- **`AssignmentsSection.tsx`** — read-only rows; status/priority pills pair **text with color** (never color alone); empty state “No assignments yet.” with no call-to-action (management is EP03).
- **App shell — `apps/web/src/main.tsx`** — `<Toaster />` from `react-hot-toast` is mounted once in the app shell (inside `AppProviders`, beside `<App />` — the review fix, F-112B-1). This makes every `toast.*` call in the app (11 production files, 21 call sites) actually render — including the meeting form’s failure branch and the detail page’s background re-fetch notice.

### Integration (SP-112C)

- **`apps/api/src/modules/courses/courses-meetings-e2e.spec.ts`** — 19 tests over **real HTTP against a real PostgreSQL** database (self-skips without `DATABASE_URL`, self-cleaning): the meeting lifecycle, the 400 validation matrix, the 409 rule, the cross-student and dual-ownership matrices, the 14-key detail projections (including a seeded assignment and an archived course), and 401 on every route.
- The dev-stack bring-up + HTTP pre-flight through the web proxy, and the 8-step browser walk (DoD 10, §4 below).

## 3. Why it is correct

Three evidence tiers, kept distinct: **(a)** automated tests executed on the tested tree, **(b)** the recorded integrated browser walk, **(c)** this review’s independent code inspection.

- **AC-E02-04** (add recurring meetings with start and end times): A’s four routes — 34 unit + 36 two-student data-scoping tests (implementer-recorded, green on a disposable Postgres); B’s form — 14 component tests; C’s e2e lifecycle over real HTTP (19/19, implementer-recorded) + walk W2/W3/W6 below (executed, 2026-10-23).
- **AC-E02-06** (details display assignments and meetings): A’s 14-key projection — the e2e asserts the exact key set, including the seeded-assignment and archived-course cases; B’s sections — component tests; walk W1/W7 (executed).
- **Security invariants** (README table): every query carries the principal’s `userId` (reviewer code inspection); the cross-student and dual-ownership matrices over real HTTP (implementer-recorded: uniform 404s, byte-identical rows, no existence oracle); the `@@unique` slot rule (409 recorded); time validation (11-case 400 matrix recorded, unit + real HTTP).
- **DoD 4 (actionable API errors):** 400/409/404 render as inline actionable messages (code inspection + component tests + walk W3). The 5xx/network branches toast — and after the F-112B-1 fix those toasts render: the mount is verified in `main.tsx` (reviewer inspection of the fix diff), a render test proves a toast reaches the DOM, and the web gates re-ran green on the fix commit `6ce897a` (web suite 42/42 files / 496/496 tests, typecheck and lint exit 0 — reviewer-executed via a disclosed bounded helper, matching the implementer’s recorded results).
- **DoD 6/7 (keyboard + responsive):** focus trap / Escape / focus return (component tests) + walk W6/W7 (executed; the mobile DOM was byte-identical to the desktop capture at 390×844).
- **F-112B-1 closure across review rounds:** pass 1 of the parent review flagged the unmounted `<Toaster />` (DoD 4 unmet for the 5xx/network class — 21 call sites in 11 files were silent no-ops in the built app). The fix commit `6ce897a` mounts it in the app shell and adds a render test; the SP-112B record now carries the fixed status with the gate results.
- **DoD 10 (integrated development review):** the 8-step walk below — all PASS, no product deviations (the one assertion mismatch, F112C-5, was a scenario-script error, re-verified via DOM + DB). The session owner **ratified** the recorded walk on 2026-10-23 (verbatim: “yes, do what you think is best. approved.”), and this review is the combined parent review.
- **Recorded limitations (kept honest):** the AX capture does not expose focus state (a harness limitation — dialog open/close + zero page errors are the observed proof, with the focus trap covered by component tests); two of the 15 evidence records carry 0 events (static DOM re-captures, consistent with the recorded byte-identical DOMs); the HTTP pre-flight was 23/25, the 2 “failures” being the script’s 201-era login expectation while the API returns 200 by design.

## 4. Manual test workflows

**Setup (once):** a local dev stack (Postgres + API + web) and a student account whose course has at least one meeting — e.g. the walk’s seed data (user `walk-a`, course **CS101**). All checks use disposable local data; no shared system is touched; no special permission is needed.

### W1 — Open the course detail page from the list

1. Sign in. 2. Go to **Courses**. 3. Click a course **name**.

**Expected:** the detail page loads — color chip + name + code, instructor/semester/credits, the description; a **Meetings** section (rows in day/time order, or “No meetings yet” + *Add your first meeting*); an **Assignments** section (rows, or “No assignments yet.”).

**Executed** — 2026-10-23, headless Chrome 155.0.8059.85, local dev stack (walk S1 — 10 DOM checks; evidence `ev_42a7dbd0…`).

### W2 — Add a meeting (valid)

1. Open the detail page. 2. Click **Add meeting**. 3. Pick a weekday, a start time, a later end time. 4. Submit.

**Expected:** the dialog closes; “Meeting added.” is announced; the new row appears in the correct (day, then time) order. (HTTP: POST 201.)

**Executed** — walk S2 (`ev_6a9834b2…`).

### W3 — Add a meeting (invalid / duplicate slot)

1. In the dialog, set **end = start** and submit. 2. Then submit the same day + start time as an existing row.

**Expected:** (1) a field-level inline error appears and **no API call is made** (client-side validation); (2) a form-level alert reads “A meeting already exists at this time.” and the section still shows a single row for that slot.

**Executed** — walk S3 (`ev_af4130af…`) and S4 (`ev_c7413aac…`).

### W4 — Edit and delete a meeting

1. Open a row’s **Edit**, change the day or times, save. 2. Open **Delete** on a row, confirm.

**Expected:** the row updates in place (“Meeting updated.”; HTTP PATCH 200); the confirmation dialog closes the row on confirm (“Meeting deleted.”; HTTP DELETE 204).

**Executed** — walk S5 (`ev_083e5b0f…`).

### W5 — Archived course banner

1. From the course list, **Archive** the course. 2. Open its detail page.

**Expected:** a full-width **Archived** strip above the header; the rest of the page renders normally. (The walk restored the course afterwards.)

**Executed** — walk S6 (`ev_1cf43d3c…`).

### W6 — Keyboard-only

1. Tab to **Add meeting**, press Enter. 2. Tab through the fields (the focus wraps inside the dialog). 3. Escape.

**Expected:** the whole dialog is operable by keyboard; focus returns to the trigger on close; 0 page errors.

**Executed** — walk S7a (`ev_4ac68969…`) + keyboard create S7b (`ev_51b8783e…`). *Limitation:* the AX capture does not expose focus state (harness) — dialog open/close + zero errors are the observed proof; the focus trap itself is covered by the component tests.

### W7 — Mobile viewport

1. Open the detail page at a **390×844** viewport.

**Expected:** single-column layout, stacked header, all rows and both sections render; 0 page errors.

**Executed** — walk S8 (`ev_71947b4b…`; the DOM was byte-identical to the desktop capture — the responsive behavior is CSS-driven).

### W8 — Failure feedback (toast) — new behavior after the review fix

1. Open the detail page. 2. Stop the API process (or block the network). 3. **Add meeting** and submit.

**Expected:** an error toast **“We could not save the meeting. Try again.”** appears; the form keeps its values; resubmitting is the retry. *(Before the F-112B-1 fix this branch was silent — the toast had nowhere to render.)*

**Not executed — user test instructions.** The DoD-10 walk predates the Toaster mount; the rendered toast is covered by the automated render test (`apps/web/src/main.test.tsx`) and the web suite re-run on the fix commit. The feature flows are unchanged by the one-line mount, so a full walk repeat is optional for you.

### W9 — Another student’s course (ownership)

1. Sign in as a **second** student. 2. Open the first student’s course detail URL.

**Expected:** the uniform not-found card — “We couldn’t find this course. It may no longer exist.” + **Back to courses** — identical to a genuinely missing course (no hint that the course exists for someone else).

**Not executed in the browser — user test instructions.** The automated proof is the e2e cross-student matrix over real HTTP (implementer-recorded, 19/19): uniform 404s on all five routes, byte-identical rows, no existence oracle.

## 5. Execution status summary

| Workflow | Status |
|---|---|
| W1–W7 | **Executed** 2026-10-23 — headless Chrome 155.0.8059.85 (REA scenario harness) against the local dev stack; 15-record evidence bundle; **ratified by the session owner 2026-10-23**. |
| W8 (toast) | **Not executed — user test instructions** (the rendered toast is covered by the automated render test + web suite on the fix commit; the walk predates the mount). |
| W9 (ownership) | **Not executed in the browser — user test instructions** (covered by the recorded real-HTTP e2e cross-student matrix). |
