# SP-128B Implementation Record — Availability Settings UI

**Story:** [SP-128B](../../../SP-128B-availability-settings-ui.md)
**Status:** Implementation complete — awaiting parent review
**Completed:** 2026-10-28

## Changed paths (commit scope)

New (all new):

- `apps/web/src/entities/availability/model/types.ts` — the 7-key `AvailabilitySlot` contract type
- `apps/web/src/entities/availability/api/availabilityApi.ts` — plain-axios client (D404-10): GET/POST/PATCH/DELETE `/availability-slots`
- `apps/web/src/entities/availability/api/availabilityApi.test.ts`
- `apps/web/src/features/availability/ui/slotLabel.ts` — time label ("Mon 09:00–10:30", the `meetingLabel` convention copied per the FSD boundary), kind label ("Available"/"Blocked" verbatim, D127B-5), and the full row name ("Available Mon 09:00–10:30", D128B-4)
- `apps/web/src/features/availability/ui/slotLabel.test.ts`
- `apps/web/src/features/availability/ui/AvailabilitySlotForm.tsx` — add/edit dialog (D128B-5): kind radiogroup (D128B-6), client validation mirroring the API (D128B-7), the D128B-8 failure map (400 field-level inline, 409 form alert, 404-in-edit form alert + cancel-refetch signal, otherwise toast)
- `apps/web/src/features/availability/ui/AvailabilitySlotForm.test.tsx`
- `apps/web/src/features/availability/ui/DeleteAvailabilitySlotDialog.tsx` — the `DeleteSemesterDialog` pattern (D128B-9): safe action focused first, focus trap, Escape cancels, focus returns to trigger, failed delete shows a `role="alert"` and re-enables confirm
- `apps/web/src/features/availability/ui/DeleteAvailabilitySlotDialog.test.tsx`
- `apps/web/src/features/availability/ui/AvailabilitySlotList.tsx` — presentational weekday-grouped list (Monday → Sunday groups, count per group, kind badges, row actions accessible-named with the full name)
- `apps/web/src/pages/availability/ui/AvailabilityPage.tsx` — the page (D128B-2 shell/subtitle/header CTA, D128B-10 states, D128B-12 always-present `role="status"` live region + kind-specific announcements + refetch count line, single dialog mount)
- `apps/web/src/pages/availability/ui/AvailabilityPage.test.tsx`

Modified:

- `apps/web/src/app/App.tsx` — `/availability` route inside `ProtectedRoute` (D404-12)
- `apps/web/src/widgets/header/ui/Header.tsx` — "Availability" nav link between Calendar and Profile, same current-page styling (D128B-11)
- `apps/web/e2e/calendar.spec.ts` — the SP-128B journey test (slots created on `/availability` render as an available window and a blocked band on the calendar)

No backend/API/Prisma change (DoD 9 N/A; D404-5), no new dependency, no UI library added. The calendar page's two shipped "Manage availability" links required no edit (verified — they target `/availability`).

## Acceptance criteria outcomes

| AC | Requirement (story) | Outcome | Evidence |
|---|---|---|---|
| 1 | Slots grouped under weekday headings (Monday → Sunday), "Mon 09:00–10:30" label + "Available"/"Blocked" text beside a matching icon (not color-only) | Pass | Page test `groups the API slots under weekday headings…` (Monday/Wednesday/Sunday, 1-slot counts, both kind labels; no group for empty weekdays); the badge renders `CheckCircle2`/`Ban` icons `aria-hidden` plus text (`AvailabilitySlotList.tsx`) |
| 2 | Add an available window and a blocked time through the dialog's kind control; the new slot appears from the API response, no manual reload | Pass | Page test `adds a blocked time…` / `adds an available window…` (both kinds; `Shopping from API response`; e2e journey creates both kinds through the real UI) |
| 3 | Edit a slot's kind/day/times; updated values shown after the API confirms | Pass | Feature test `submits an update against PATCH /availability-slots/:id`; page test `edits a slot…` (updated label renders from the refetch) |
| 4 | Delete asks for confirmation; slot disappears once the API confirms; a cancelled confirmation sends no request | Pass | Page test `deletes a slot after confirming…` (cancel path: `mockedDelete` not called; then confirm: 204 → re-read); feature dialog tests cover both |
| 5 | A rejected save shows the API's field-level error next to the offending field (409 → form-level alert) and keeps input; nothing written on rejection | Pass | Feature test 400 mapping (`aria-invalid` on the matching input, values preserved, `create` not called), 409 form alert test; page test confirms no refetch after a rejection |
| 6 | Empty state ("No availability yet") with working add CTA, loading state, error state with working retry | Pass | Page tests `renders the loading state…` / `renders the empty state…` (CTA opens the dialog; "View your week" → `/calendar`) / `renders the error state with a working retry…` |
| 7 | Every successful add/edit/delete announced through the always-present `role="status"` region | Pass | Page tests assert "Available window added. Showing 2 time slots." / "Blocked time added. …" / "Time slot updated. Showing 1 time slot." / "Time slot deleted. Showing 0 time slots." (the D128B-12 sentence-prefix + count-line pattern) |
| 8 | All controls keyboard-operable with visible focus and accessible row names ("Edit Available Mon 09:00–10:30"); dialog traps focus, closes on Escape, focus returns to trigger | Pass | Feature tests: focus trap walk + wrap and arrow-key radio movement (`AvailabilitySlotForm.test.tsx` dialog suite), Escape close + focus-return tests for both dialogs, "takes focus on open" on the first kind radio / the safe action respectively; row-name uniqueness test (`slotLabel.test.ts`: identical times of different kinds must not collide) |
| 9 | Layout works from 375px to desktop; consistent spacing | Pass | Built on the shipped system (`max-sm:min-h-[44px]` on interactive controls, `flex-col-reverse` header stacking, the `MeetingsSection` `flex-col` row pattern, side-by-side time inputs at `sm:`); rows stack at small widths; verified only by pattern parity + class-level assertions (visually confirmed by the e2e screenshots); the combined parent's DoD-10 browser pass owns the visual walkthrough |

## DoD (story items)

- 1 functional — pass (AC table above). 2 validation mirror + inline API errors — pass. 3 N/A (reads/writes only the principal-scoped availability API, no new surface). 4 actionable errors — pass (400/409/404-in-edit/other; delete dialog alert). 5 states — pass. 6 keyboard/a11y — pass. 7 responsive — pass (system classes; visual walkthrough owned by the combined review). 8 component tests + e2e journey — pass (56 unit/component tests in the three availability paths + the calendar e2e suite 4/4). 9 N/A — no API change. 10–11 — combined SP-128 parent review + walkthrough (not this child's).

## Verification

| Command (cwd `apps/web` unless noted) | Result |
|---|---|
| `pnpm vitest run src/pages/availability src/features/availability src/entities/availability` | 5 suites, **56/56 passed, zero skips** (entity 10 + slotLabel 7 + form 19 + delete dialog 10 + page 10; re-run after each milestone) |
| `pnpm test` (full web unit suite, regression check) | 59 suites, 760/760 passed |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass (0 warnings) |
| `pnpm exec playwright test calendar` (both standalone runs, before and after the e2e formatting pass) | **4/4 passed**, including the new SP-128B journey (self-contained stack: throwaway `studypilot_e2e_test` database created and dropped by the configured global setup) |
| `pnpm exec playwright test` (full e2e suite) | 20 passed, 3 failed — **pre-existing at the baseline commit 24978c7**, verified in a clean throwaway worktree without this story's changes (see F-B-4) |
| `pnpm exec prettier --check` on all new/changed paths | pass (fixed `e2e/calendar.spec.ts` formatting before the final commit check) |

## Findings / deviations

- **F-B-1 (closed — design choice within the settled decision set):** the slot list is presentational and the page owns the single dialog mount (the `AssignmentsPage` model) instead of the list owning dialog state like `MeetingsSection`. D128B-2 places the primary "Add time slot" in the page header; two dialog owners would duplicate mounts. All D128B-5/8/9 dialog requirements are unchanged and are tested at both the feature and page levels. Recorded in the checkpoint at discovery time.
- **F-B-2 (closed — test-only):** a Tab inside the native radio pair does not land on the sibling radio (a radio group is one tab stop in browsers/jsdom); the focus-trap test walks Arrow keys within the group and asserts Tab jumps to the Day select. The radio pair gained an explicit `checked={selectedKind === option.value}` control so RHF's default reflects in the DOM (also fixes the create-mode checked state). No behavioral regression; the AC 8 tab order and wrap are verified by the remaining walk.
- **F-B-3 (closed — test authoring):** the first 400-mapping test initially lacked its submit click and contained one contradictory assertion; fixed before any verification relied on it. Suites re-run green.
- **F-B-4 (open — out of this story's scope; pointer for the parent review):** `apps/web/e2e/semesters-courses.spec.ts`'s three course tests (`create a course…`, `editing a course…`, `archiving hides a course…`) time out clicking direct `Archive ${name}`-style buttons that no longer exist — the redesigned courses list renders per-row `Actions for ${name}` menu buttons instead. **Verified pre-existing at HEAD (24978c7) without this story's changes** by running the same spec in a clean baseline worktree from the baseline commit (identical 3 failures both times; semester tests pass). Not an SP-128B regression: the availability e2e and all SP-128B suites pass; the courses feature is EP02/SP-126 scope. Disposition: open, owner planner/coordinator (spec refresh or story to re-align the courses spec with the SP-126 redesign). Flagged with location and failing selector only; nothing was reworked in this story to keep the scope unchanged.
- **F-B-5 (closed — environmental, test isolation):** the first e2e attempt used `page.request` for API setup instead of the isolated `request` fixture, which shared auth cookies with the page context and surfaced the email-verification banner on the login page (strict-mode failure on `getByLabel('Email')`). Fixed by using the same fixture pattern as the rest of the spec. No app code change.

No open findings owned by SP-128B itself (F-B-4 is cross-feature, reported for the parent review). No scope changes, no AC edits, no planning-document changes beyond the implementer-authorized execution fields.

**Correction round (2026-10-28, post-review):** F-B-6 opened by user report — the modal's kind radio cards render broken in the real browser (global `input { w-full … }` base rule vs. the app's first radio inputs; details and fix in the F-B-6 rows of the [checkpoint](./checkpoint.md)). Full visual verification is pending a test/browser run; until it closes, SP-128B's visual state is **fix applied — unverified**.

## Documentation

No new in-repo documentation beyond this record, the checkpoint, and the queue updates: the story's contract links (EP04 shared API contract) already cover the consumed API, and the code comments carry the D128B decision references. No migration, no API doc change.
