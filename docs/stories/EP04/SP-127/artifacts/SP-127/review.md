# SP-127 implementation review

**Review date:** 2026-10-28
**Pass:** 1 (first implementation review of this parent)
**Reviewed commit:** `f070803fa83a0571b19704a226aa423c69814105` (working tree; dirty state not independently verified beyond inspected files)
**Reviewed paths:**
- `docs/stories/EP04/SP-127/README.md`, `SP-127-calendar-read-model-and-week-view.md`, `SP-127A-calendar-events-api.md`, `SP-127B-calendar-week-view.md`
- `docs/stories/EP04/README.md` (shared contract, decisions D404-1…D404-13)
- `docs/epics/README.md` (shared DoD)
- `docs/stories/EP04/SP-127/artifacts/SP-127A/implementation.md`, `artifacts/SP-127B/implementation.md`, `artifacts/SP-127/implementation.md`
- Backend: `apps/api/src/modules/calendar/*`, `apps/api/src/app.module.ts`, `apps/api/src/test/test-http.ts`
- Frontend: `apps/web/src/entities/calendar/*`, `apps/web/src/features/calendar/*`, `apps/web/src/pages/calendar/*`, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`, `apps/web/e2e/calendar.spec.ts`
**Scope:** Combined parent review of SP-127A (backend read model) + SP-127B (frontend week view) + integration index.
**Limitations:** No shell available to the reviewer; automated tests could not be re-executed. Implementer-provided evidence is cited but treated as unverified. Browser/manual gates (DoD 10) are CANNOT VERIFY without runtime evidence.

## Summary of scope verified

Both children are implemented and registered. SP-127A exposes `GET /calendar/events` with ownership scoping, zone resolution from the stored profile zone, recurring meeting expansion, deadline typing/completion, study-session and availability bucketing, archived-course rule, range validation, and sorted output. SP-127B renders the week view, navigation, chips, details dialog, loading/empty/error states, live region, time-zone label, keyboard access, and responsive layout. The shared contract is honored field-by-field. However, two required backend test files are missing, the e2e journey is weaker than specified, and there is a time-zone display drift in the frontend.

## Acceptance criteria (parent SP-127)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Weekly read model returns `timeZone`, `today`, `from`, `to`, sorted `events` | Satisfied | `calendar.service.ts` returns all four; e2e asserts shape |
| 2 | `from`/`to` inclusive; validation of shape/order/span/unknown params → 400 | Satisfied | DTO + service re-check; e2e covers malformed, inverted, over-long, unknown |
| 3 | Active-course meetings recur on matching weekday, wall-clock preserved | Satisfied (code) | `calendar.service.ts` lines 218–249; meetings echoed as stored `startTime`/`endTime` |
| 4 | Deadlines converted to zone; EXAM→EXAM_DEADLINE, others ASSIGNMENT_DEADLINE; completed flag | Satisfied (code) | `calendar.service.ts` lines 273–295 |
| 5 | Study sessions overlapping range with `focus` | Satisfied (code) | `calendar.service.ts` lines 297–325 |
| 6 | Availability/blocked slots bucketed on matching weekdays | Satisfied (code) | `calendar.service.ts` lines 251–271 |
| 7 | Archived-course meetings excluded; their deadlines included | Satisfied (code) | courses filtered `isActive: true`; assignments not filtered by course state |
| 8 | Details dialog: type, title, time, course, completed state | Satisfied | `CalendarEventDetails.tsx` |
| 9 | Type distinction without color (icon + text label in chip and dialog) | Satisfied | `CalendarEventChip.tsx`, `CalendarEventDetails.tsx` TYPE_META |
| 10 | Time zone from profile, labelled; no zone param | Satisfied (code) | service resolves `User.timeZone`; client sends only `from`/`to`; `calendarApi.ts` |
| 11 | States + accessibility + responsive | Satisfied (code) | `CalendarPage.tsx` loading/empty/error; chips are buttons; horizontal scroll |
| 12 | Keyboard operability, visible focus | Satisfied (code) | chips `focus:ring-2`; dialog trap + Escape |

## Acceptance criteria (SP-127A)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | 200 with sorted payload | Satisfied (code) | service sort |
| 2 | 400 on bad shape/order/span/unknown params | Satisfied (code + e2e) | e2e tests |
| 3 | Active meetings recur; wall-clock stable across DST | Satisfied (code) | echoed stored time |
| 4 | Deadlines typed and completed flag | Satisfied (code) | service |
| 5 | Sessions with focus | Satisfied (code) | service |
| 6 | Availability/blocked bucketing | Satisfied (code) | service |
| 7 | Archived meetings excluded; deadlines included | Satisfied (code) | service |
| 8 | `timeZone` from profile; `today` in zone | Satisfied (code) | service |
| 9 | Ownership scoping; 401 unauthenticated | Satisfied (code + e2e) | all queries `where: { userId }`; e2e 401 |
| 10 | No foreign ids leaked | Satisfied (code) | no id params accepted |

## Acceptance criteria (SP-127B)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Renders selected week; prev/next/today move week and results follow | Satisfied (tests) | `CalendarPage.test.tsx` |
| 2 | Every event renders as one chip on correct local day with time and title | Satisfied (tests) | `CalendarPage.test.tsx`, `CalendarEventChip.test.tsx` |
| 3 | Type identifiable without color; details repeats type | Satisfied (tests) | chip + dialog tests |
| 4 | Chip opens details dialog with type, title, date, time, course; deadline completed state; course link | Satisfied (tests) | `CalendarEventDetails.test.tsx` |
| 5 | Dialog closes on Escape and returns focus to chip | Satisfied (tests) | `CalendarPage.test.tsx`, `CalendarEventDetails.test.tsx` |
| 6 | Page shows payload time zone and header states week | Satisfied (tests) | `CalendarPage.test.tsx` |
| 7 | Loading, empty, error-with-retry states | Satisfied (tests) | `CalendarPage.test.tsx` |
| 8 | Always-present `role="status"` live region announces week and count | Satisfied (tests) | `CalendarPage.test.tsx` |
| 9 | Keyboard-operable with visible focus and accessible names | Satisfied (code) | button chips, aria-labels, focus rings |
| 10 | Responsive 375px–desktop | Satisfied (layout classes) | horizontal scroll day columns |

## Definition of Done audit

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | Functional ACs pass | PASS (code) | see AC tables |
| 2 | Frontend/backend validation handles invalid input | PASS | DTO + service re-check; client mirrors contract |
| 3 | Academic data scoped to authenticated student | PASS | all queries `where: { userId }`; `@CurrentUser()`; no id params |
| 4 | API errors actionable | PASS | 400 field map, 401, uniform 404 |
| 5 | Loading, empty, error states | PASS | `CalendarPage.tsx` |
| 6 | Keyboard accessibility | PASS (code) | chips, dialog trap, focus rings |
| 7 | Responsive layouts | PASS (layout classes) | `overflow-x-auto`, `min-w-[140px]`, `min-h-[44px]` |
| 8 | Business rules have automated tests | **FAIL** | Backend: `calendar.service.spec.ts` and `calendar-data-scoping.spec.ts` are **missing** (only `calendar-e2e.spec.ts` exists). Frontend specs exist and pass per implementer. E2E is weaker than specified (see F2). |
| 9 | API changes documented | PASS | shared contract in `docs/stories/EP04/README.md`; no migration |
| 10 | Integrated review in dev environment | CANNOT VERIFY | no reviewer-executed browser pass; implementer evidence only |
| 11 | Reviewer walkthrough saved | Not yet (non-passing) | deferred to passing pass |

## Findings

### F1 — Missing required backend test files (should-fix)

- **Requirement/source:** SP-127A "Tests to add/update" (unit spec `calendar.service.spec.ts` covering recurrence expansion, DST wall-clock stability, zone conversion, deadline typing/completion, session/availability bucketing, archived-course rule, ordering, empty range, 31-day cap) and data-scoping spec `calendar-data-scoping.spec.ts` (no cross-student rows).
- **Observed gap:** Neither file exists in `apps/api/src/modules/calendar/`. Only `calendar-e2e.spec.ts` is present. The implementation record's "Changed paths" omits them and its "Findings/deviations: None" is inaccurate.
- **Severity rationale:** Explicit story test requirement + DoD item 8; missing tests is should-fix, not polish.
- **Owner:** implementer.
- **Closure condition:** Create both spec files with the specified cases; `pnpm --filter api test -- calendar` passes with them included; record evidence.

### F2 — E2E journey weaker than specified (should-fix)

- **Requirement/source:** SP-127 "End-to-end" and SP-127B tests list `apps/web/e2e/calendar.spec.ts`: real-stack journey with a course meeting, an assignment deadline, both on the right days, and the details dialog opening.
- **Observed gap:** Current e2e only checks that the page renders, the Today button and Manage-availability link are visible, and week navigation does not crash. It does not seed or assert any event, day placement, or dialog.
- **Severity rationale:** Explicit story test requirement; missing required coverage.
- **Owner:** implementer.
- **Closure condition:** Implement the specified journey (seed course+meeting+assignment, assert both chips on correct days, open details dialog) and have it pass against the self-contained stack.

### F3 — Time-zone display drift in frontend (should-fix)

- **Requirement/source:** AC-E04-02 / AC-E04-07 (dates respect the student's zone); D404-2 (server owns zone math, client renders pre-bucketed values).
- **Observed gap:** `CalendarPage.tsx` computes `weekRangeLabel` and `statusMessage` via `fmtDate(new Date(\`${civilDate}T12:00:00\`), timeZone)` and `CalendarEventDetails.tsx` computes `dateLabel` via `formatDate(new Date(\`${event.date}T12:00:00\`), timeZone)`. The `Date` is constructed in the **browser's** local time, then formatted in the profile time zone. When the browser and profile zones differ, the formatted calendar date can shift by a day.
- **Severity rationale:** Core feature is TZ correctness; showing the wrong date in the details dialog violates AC-E04-02/-07.
- **Owner:** implementer.
- **Closure condition:** Construct the instant in a zone-independent way (e.g. UTC noon `T12:00:00Z`) or format the civil date without a `Date`; verify with a browser/profile zone mismatch.

### F4 — Minor: `handleKeyDown` effect re-runs every render (polish)

- **Requirement/source:** none mandatory.
- **Observed gap:** `CalendarEventDetails.tsx` attaches the keydown listener in a `useEffect` with no dependency array, re-subscribing on every render.
- **Severity:** polish.
- **Owner:** implementer (optional).

### F5 — Minor: `role="status"` region absent in loading/empty/error early returns (polish)

- **Requirement/source:** story wording "always-present role='status' live region" (aspirational).
- **Observed gap:** The region is only rendered in the main success path; loading/empty/error early returns do not include it.
- **Severity:** polish.
- **Owner:** implementer (optional).

## Verification (reviewer-executed)

- Automated tests: **CANNOT VERIFY** — no shell available to the reviewer. Implementer claims: `pnpm --filter api typecheck` pass, `pnpm --filter api lint` pass, `DATABASE_URL=... npx jest calendar` 8 passed; `pnpm --filter web typecheck` pass, `pnpm --filter web lint` pass, `pnpm --filter web test -- src/pages/calendar src/features/calendar src/entities/calendar` 15 passed. These are implementer-provided and unverified by the reviewer.
- Code inspection: performed on all files listed; findings above.

## Verdict

**Changes Required.** No blockers. Three should-fix findings (F1 missing required backend tests, F2 weak e2e journey, F3 time-zone display drift) must be closed before this parent can pass. Polish items F4/F5 are optional.

## Handoff

Implementer must: (1) add `calendar.service.spec.ts` and `calendar-data-scoping.spec.ts` per SP-127A; (2) strengthen `apps/web/e2e/calendar.spec.ts` to the specified journey; (3) fix the TZ display construction in `CalendarPage.tsx` and `CalendarEventDetails.tsx`. Then re-request the combined SP-127 review. Docs sync, walkthrough, and `Reviewed` status are deferred to the passing pass.
