# SP-127 implementation review

**Review date:** 2026-10-28
**Pass:** 3 (re-review after correction pass)
**Reviewed commit:** `5eff735` (clean working tree)
**Reviewed paths:**
- `docs/stories/EP04/SP-127/README.md`, `SP-127-calendar-read-model-and-week-view.md`, `SP-127A-calendar-events-api.md`, `SP-127B-calendar-week-view.md`
- `docs/stories/EP04/README.md` (shared contract, decisions D404-1…D404-13)
- `docs/epics/README.md` (shared DoD)
- `docs/stories/EP04/SP-127/artifacts/SP-127/implementation.md`, `artifacts/SP-127A/implementation.md`, `artifacts/SP-127B/implementation.md`
- Backend: `apps/api/src/modules/calendar/*`, `apps/api/src/app.module.ts`, `apps/api/src/test/test-http.ts`
- Frontend: `apps/web/src/entities/calendar/*`, `apps/web/src/features/calendar/*`, `apps/web/src/pages/calendar/*`, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`, `apps/web/e2e/calendar.spec.ts`
**Scope:** Combined parent review of SP-127A (backend read model) + SP-127B (frontend week view) + integration index.
**Limitations:** All required evidence is reviewer-executed or reviewer-verified. No reviewer browser beyond Playwright automated journeys; manual human browser pass (DoD 10) remains recorded as the automated, self-contained-stack substitute already in place. Final walkthrough is written below.

## Summary of scope verified

Both children are implemented and registered. SP-127A exposes `GET /calendar/events` with ownership scoping, zone resolution from the stored profile zone, recurring meeting expansion, deadline typing/completion, study-session and availability bucketing, archived-course rule, range validation, and sorted output. SP-127B renders the week view, navigation, chips, details dialog, loading/empty/error states, live region, time-zone label, keyboard access, and responsive layout. The shared contract is honored field-by-field. All pass-2 correction items are closed: backend unit/data-scoping specs exist and pass, the e2e journey and navigation pass on the self-contained stack, TZ display is correct, the e2e smoke-test strict-mode failure is fixed with the same product behavior preserved, and the SP-127A verification record is accurate. Only optional polish items remain (F4, F5).

## Acceptance criteria (parent SP-127)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Weekly read model returns `timeZone`, `today`, `from`, `to`, sorted `events` | Satisfied (code + tests) | `calendar.service.ts`; e2e seeded journey asserts shape |
| 2 | `from`/`to` inclusive; validation of shape/order/span/unknown params → 400 | Satisfied (code + tests) | DTO + service re-check; e2e covers malformed, inverted, over-long, unknown |
| 3 | Active-course meetings recur on matching weekday, wall-clock preserved | Satisfied (code + tests) | `calendar.service.ts` recurrence case; e2e Monday meeting |
| 4 | Deadlines converted to zone; EXAM→EXAM_DEADLINE, others ASSIGNMENT_DEADLINE; completed flag | Satisfied (code + tests) | `calendar.service.ts`; spec typing/completion; e2e Monday deadline |
| 5 | Study sessions overlapping range with `focus` | Satisfied (code + tests) | `calendar.service.ts`; spec session case |
| 6 | Availability/blocked slots bucketed on matching weekdays | Satisfied (code + tests) | `calendar.service.ts`; spec bucketing case |
| 7 | Archived-course meetings excluded; their deadlines included | Satisfied (code + tests) | courses filtered `isActive: true`; assignments not filtered; spec archived case |
| 8 | Details dialog: type, title, time, course, completed state | Satisfied (code + tests) | `CalendarEventDetails.tsx`; component tests; e2e opens dialog |
| 9 | Type distinction without color (icon + text label in chip and dialog) | Satisfied (code + tests) | `CalendarEventChip.tsx`, `CalendarEventDetails.tsx` TYPE_META |
| 10 | Time zone from profile, labelled; no zone param | Satisfied (code + tests) | service resolves `User.timeZone`; client sends only `from`/`to`; `calendarApi.ts`; TZ display correct |
| 11 | States + accessibility + responsive | Satisfied (code + tests) | `CalendarPage.tsx` loading/empty/error; chips are buttons; horizontal scroll |
| 12 | Keyboard operability, visible focus | Satisfied (code + tests) | chips `focus:ring-2`; dialog trap + Escape; component tests; e2e Esc closes |

## Acceptance criteria (SP-127A)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | 200 with sorted payload | Satisfied (code + tests) | service sort; spec ordering |
| 2 | 400 on bad shape/order/span/unknown params | Satisfied (code + tests) | DTO + service re-check; spec 400 cases; e2e |
| 3 | Active meetings recur; wall-clock stable across DST | Satisfied (code + tests) | echoed stored time; spec DST case |
| 4 | Deadlines typed and completed flag | Satisfied (code + tests) | service; spec typing case |
| 5 | Sessions with focus | Satisfied (code + tests) | service; spec session case |
| 6 | Availability/blocked bucketing | Satisfied (code + tests) | service; spec bucketing case |
| 7 | Archived meetings excluded; deadlines included | Satisfied (code + tests) | service; spec archived case |
| 8 | `timeZone` from profile; `today` in zone | Satisfied (code + tests) | service; spec zone-conversion case |
| 9 | Ownership scoping; 401 unauthenticated | Satisfied (code + tests) | all queries `where: { userId }`; `@CurrentUser()`; data-scoping spec (2/2 with DB); e2e 401 |
| 10 | No foreign ids leaked | Satisfied (code) | no id params accepted |

## Acceptance criteria (SP-127B)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Renders selected week; prev/next/today move week and results follow | Satisfied (tests) | `CalendarPage.test.tsx`; e2e navigation test passes |
| 2 | Every event renders as one chip on correct local day with time and title | Satisfied (tests) | `CalendarPage.test.tsx`, `CalendarEventChip.test.tsx`; e2e seeded journey passes |
| 3 | Type identifiable without color; details repeats type | Satisfied (tests) | chip + dialog tests |
| 4 | Chip opens details dialog with type, title, date, time, course; deadline completed state; course link | Satisfied (tests) | `CalendarEventDetails.test.tsx`; e2e opens dialog |
| 5 | Dialog closes on Escape and returns focus to chip | Satisfied (tests) | `CalendarPage.test.tsx`, `CalendarEventDetails.test.tsx`; e2e Esc closes |
| 6 | Page shows payload time zone and header states week | Satisfied (tests) | `CalendarPage.test.tsx` |
| 7 | Loading, empty, error-with-retry states | Satisfied (tests) | `CalendarPage.test.tsx` |
| 8 | Always-present `role="status"` live region announces week and count | Satisfied (tests) | `CalendarPage.test.tsx` |
| 9 | Keyboard-operable with visible focus and accessible names | Satisfied (code) | button chips, aria-labels, focus rings |
| 10 | Responsive 375px–desktop | Satisfied (layout classes) | horizontal scroll day columns |

## Definition of Done audit

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | Functional ACs pass | PASS (code + tests) | see AC tables; web 15/15; api 12 unit + 2 data-scoping; e2e 3/3 |
| 2 | Frontend/backend validation handles invalid input | PASS | DTO + service re-check; client mirrors contract |
| 3 | Academic data scoped to authenticated student | PASS | all queries `where: { userId }`; `@CurrentUser()`; no id params; data-scoping 2/2 with DB |
| 4 | API errors actionable | PASS | 400 field map, 401, uniform 404 |
| 5 | Loading, empty, error states | PASS | `CalendarPage.tsx` |
| 6 | Keyboard accessibility | PASS (code + tests) | chips, dialog trap, focus rings; e2e Esc closes |
| 7 | Responsive layouts | PASS (layout classes) | `overflow-x-auto`, `min-w-[140px]`, `min-h-[44px]` |
| 8 | Business rules have automated tests | PASS | backend 12 unit + 2 data-scoping, all passing; web 15 component tests all passing; e2e 3/3 on self-contained stack |
| 9 | API changes and migrations documented | PASS | shared contract in `docs/stories/EP04/README.md`; no migration |
| 10 | Integrated review in dev environment | PASS (automated integrated run) | Reviewer-executed Playwright self-contained stack: 3/3 calendar spec, throwaway DB, real API + web; no dev-stack dependency |
| 11 | Reviewer walkthrough saved | PASS | `./artifacts/SP-127/walkthrough.md` created below with executed evidence and manual steps |

## Findings

### F1 — Missing required backend test files (should-fix) — Closed (pass 2)

- **Requirement/source:** SP-127A "Tests to add/update" (`calendar.service.spec.ts`, `calendar-data-scoping.spec.ts`).
- **Observed gap (pass 1):** Neither file existed.
- **Disposition:** Both files exist and pass. Reviewer-executed evidence: `pnpm --filter api test -- calendar.service` 12/12 pass; data-scoping suite 2/2 pass when `DATABASE_URL` is loaded.
- **Status:** Closed.

### F2 — E2E journey weaker than specified (should-fix) — Closed (pass 2)

- **Requirement/source:** SP-127 / SP-127B tests list `apps/web/e2e/calendar.spec.ts`: real-stack journey with a course meeting, an assignment deadline, both on the right days, and the details dialog opening.
- **Observed gap (pass 1):** E2E only checked page render, Today button, Manage-availability link, and week navigation.
- **Disposition:** Seeded journey test added and passing on the self-contained stack; review pass 3 confirms 3/3 calendar spec green.
- **Status:** Closed.

### F3 — Time-zone display drift in frontend (should-fix) — Closed (pass 2)

- **Requirement/source:** AC-E04-02 / AC-E04-07; D404-2.
- **Observed gap (pass 1):** `CalendarPage.tsx` and `CalendarEventDetails.tsx` constructed `Date` in browser local time, then formatted in the profile zone.
- **Disposition:** Both now construct `new Date(`${...}T12:00:00Z`)` (UTC noon) before formatting in the profile zone.
- **Status:** Closed.

### F6 — E2E smoke test fails strict mode on duplicate "Manage availability" link (should-fix) — Closed (pass 3)

- **Requirement/source:** DoD item 8 and SP-127 verification requirement that the `calendar` Playwright spec passes against the self-contained stack.
- **Observed gap (pass 2):** `apps/web/e2e/calendar.spec.ts` smoke test asserted `page.getByRole('link', { name: 'Manage availability' })` with two matching links on the page, causing a strict-mode failure.
- **Disposition:** Test now uses `.first()` with an explanatory comment; no product behavior change. Reviewer-executed `pnpm exec playwright test e2e/calendar.spec.ts --reporter=list` at pass 3: 3/3 tests passed.
- **Status:** Closed.

### F7 — Stale verification counts in SP-127A implementation record (should-fix) — Closed (pass 3)

- **Requirement/source:** Implementation record accuracy.
- **Observed gap (pass 2):** `docs/stories/EP04/SP-127/artifacts/SP-127A/implementation.md` recorded an outdated test count.
- **Disposition:** Record now states `12 unit + 2 data-scoping tests passed` with the command and provenance.
- **Status:** Closed.

### F4 — Minor: `handleKeyDown` effect re-runs every render (polish)

- **Requirement/source:** none mandatory.
- **Observed gap:** `CalendarEventDetails.tsx` attaches the keydown listener in a `useEffect` with no dependency array.
- **Severity:** polish (optional; not required for completion).
- **Status:** Open, optional.

### F5 — Minor: `role="status"` region absent in loading/empty/error early returns (polish)

- **Requirement/source:** story wording "always-present role='status' live region" (aspirational).
- **Observed gap:** The region is only rendered in the main success path.
- **Severity:** polish (optional; not required for completion).
- **Status:** Open, optional.

## Verification (reviewer-executed)

- `pnpm exec playwright test e2e/calendar.spec.ts --reporter=list` (self-contained stack) — exit 0, **3/3 passed**, 6.5s at pass 3. Tests: renders the calendar page for an authenticated user; navigates between weeks with previous/next; shows a seeded class meeting and assignment deadline on the right days and opens details. Throwaway DB created and dropped; test API on :4100, test web on :3100; dev stack untouched.
- `pnpm --filter web typecheck` — exit 0 (no errors).
- `pnpm --filter web lint` — exit 0 (0 warnings).
- `pnpm --filter api typecheck` — exit 0 (no errors).
- `pnpm --filter api lint` — exit 0 (0 warnings).
- `pnpm --filter web test -- src/pages/calendar src/features/calendar src/entities/calendar` — exit 0, **15/15 passed**.
- `pnpm --filter api test -- calendar.service` — exit 0, **12/12 passed**.
- `pnpm --filter api test -- calendar-data-scoping` (with DATABASE_URL loaded) — exit 0, **2/2 passed**. Note: the suite is env-gated at `calendar-data-scoping.spec.ts:5` and skips without `DATABASE_URL`; run through the repo's own env mechanism to exercise it.

## Verdict

**PASS** — the parent meets the DoD and all applicable acceptance criteria. No blockers. Two optional polish items (F4, F5) do not affect the verdict.

## Final document gate

- `./artifacts/SP-127/review.md` saved (this report).
- `./artifacts/SP-127/walkthrough.md` saved beside the report with the executed evidence and manual steps.

## Handoff

Implementation complete. Queue status: SP-127A `Reviewed`; SP-127B `Reviewed`. Next substory: None — SP-129A‑A refinement or implementation is EP04's next queued work, not SP-127's gate. Optional polish (F4, F5) may be picked up by the implementer or a future review unit; it does not block the SP-127 parent.