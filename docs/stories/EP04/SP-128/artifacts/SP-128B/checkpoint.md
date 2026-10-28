# SP-128B checkpoint

Updated: 2026-10-28 (start of implementation session)
Execution state: [SP-128 queue](../../README.md) — Active substory: SP-128B (implement).
Story: [SP-128B-availability-settings-ui.md](../../SP-128B-availability-settings-ui.md)
Review unit: SP-128 combined review after B implements; B owns the parent integration index (`./artifacts/SP-128/implementation.md`).
Role / scope: implementer; frontend (web app only: new `entities/availability`, `features/availability`, `pages/availability`, `App.tsx` route, `Header.tsx` nav entry, e2e calendar spec extension). No API/Prisma changes (D404-5, DoD 9 N/A).

## Repository state

- Workspace / branch: main, clean at session start.
- HEAD at last update: 24978c7 (SP-128B ui-refiner pass settling D404-9 via D128B-1…13).
- Saved work: SP-128A API at 35ed47d (dependency satisfied).
- Other work to preserve: none — `git status` clean.

## Progress

- [x] Queue reconciliation: story `Status: Ready` (refined, D128B-1…13) vs. queue row `Needs refinement` — queue updated to `In progress` with evidence pointers.
- [x] Entity client + types (`entities/availability/api/availabilityApi.ts`, `model/types.ts`) + test — 10/10 passing
- [x] `slotLabel.ts` (time label + kind label + full name) + test — 7/7 passing
- [x] `AvailabilitySlotForm.tsx` (kind radiogroup, day select, times, D128B-8 map) + test — 19/19 passing
- [x] `DeleteAvailabilitySlotDialog.tsx` + test — 10/10 passing
- [x] `AvailabilitySlotList.tsx` (presentational weekday groups, kind badges, a11y row names)
- [x] `AvailabilityPage.tsx`: loading/empty/error states, live region, single dialog mount
- [x] Route in `App.tsx`, header nav entry ("Availability" between Calendar and Profile, D128B-11)
- [x] `AvailabilityPage.test.tsx` — 10/10 passing (states, grouping, CRUD through dialogs, live region, 400 mapping)
- [x] e2e `calendar.spec.ts` extension — the SP-128B journey passes (4/4 calendar e2e tests)
- [x] typecheck/lint + verification battery — pass (see [implementation.md](./implementation.md)); page/slot tests re-run green after the lint/prettier pass
- Current step: implementation finished; see [implementation.md](./implementation.md) for AC outcomes and verification. Remaining in this checkpoint: the scoped commit + this record's finalization.

## Decisions and dependencies

- Binding decisions: D404-5 (weekly-only), D404-10 (plain axios entity client), D404-11, D404-12; UI settled by D128B-1…13 in the story file — follow them verbatim.
- No cross-feature imports from `features/courses`: `meetingLabel` copied as `slotLabel` (FSD lint).
- Kind vocabulary verbatim from `CalendarEventChip` (D127B-5): `CheckCircle2` "Available" / `Ban` "Blocked" — textual not color-only.
- Contract: GET/POST/PATCH/DELETE `/availability-slots` per EP04 README; 400 field map, 409 duplicate ("An availability slot already exists at this time." — service wording verified in `availability.service.ts`), 404 uniform "Resource not found".
- FSD boundary verified: no import from `features/courses`; the label/weekday helpers live in `features/availability/ui/slotLabel.ts`; the/calendar's "Manage availability" links target `/availability` (verified in `CalendarPage.tsx`) — no edit needed there.
- F-B-1 (closed — design choice within the settled decisions): the list is presentational and the page owns the single dialog mount (the `AssignmentsPage` model). D128B-2 places the primary "Add time slot" in the page header, so dialog state cannot be list-owned like `MeetingsSection` without duplicated mounts; all D128B-5/8/9 dialog requirements still hold and are tested at both levels.

## Verification

- `pnpm typecheck` (cwd `apps/web`): pass.
- `pnpm lint`: pass; prettier check on all story paths: pass (the e2e spec was prettier-fixed once).
- `pnpm vitest run src/pages/availability src/features/availability src/entities/availability`: **56/56**.
- `pnpm test` (full web suite): 760/760.
- `pnpm exec playwright test calendar`: 4/4 (self-contained stack; throwaway DB dropped).
- `pnpm exec playwright test` (full e2e): 3 course-test failures — pre-existing at HEAD, proven in a clean baseline worktree (F-B-4).
- Completed verification table: [implementation.md](./implementation.md).

## Resume next

1. Commit the scoped code + e2e + closeout docs (single SP-128B feature commit, the working tree has no unrelated edits).
2. Report the commit hash in the handoff; the combined SP-128 parent review is next (owned by the coordinator/reviewer — `./artifacts/SP-128/review.md` + `walkthrough.md`).
- Read next: nothing further for implementation; the reviewer starts from [SP-128's review unit](../../README.md#final-implementation-review-unit).

## Findings record

| ID | Source | Paths | Observed | Disposition | Closure evidence |
|---|---|---|---|---|---|
| F-B-1 | D128B-2 vs. the MeetingsSection precedent | features/availability/ui/AvailabilitySlotList.tsx, pages/availability/ui/AvailabilityPage.tsx | Dialog state could not live in the list (MeetingsSection shape) because D128B-2 puts the primary "Add time slot" in the page header; two dialog owners would duplicate mounts. | closed — design choice inside the settled decision set | Presentational list + page-owned single form mount; D128B-5/8/9 requirements verified by feature- and page-level tests. |
| F-B-2 | jsdom/user-event radio-group behavior | features/availability/ui/AvailabilitySlotForm.tsx, AvailabilitySlotForm.test.tsx | A Tab inside the native radio pair does not land on the sibling radio (a radio group is one tab stop); the checked default needed an explicit `checked` control to reflect RHF's default in the DOM. | closed | Explicit `checked={selectedKind === …}`; focus-trap suites pass; AC 8 opener/wrap order verified. |
| F-B-3 | test authoring | features/availability/ui/AvailabilitySlotForm.test.tsx | The first 400-mapping test omitted its submit click and held one contradictory assertion; fixed before any verification relied on it. | closed | Suite passes 19/19. |
| F-B-4 | pre-existing `semesters-courses.spec.ts` course-test failures | apps/web/e2e/semesters-courses.spec.ts (course tests at lines 107/145/192) | Three course e2e tests time out clicking direct `Archive ${name}`-style buttons absent from the redesigned courses list (`Actions for ${name}` menu buttons). Verified identical at the baseline commit 24978c7 in a clean throwaway worktree without this story's changes; the four semester tests and all SP-128 suites pass. | open — out of SP-128B scope, routed to the parent review | Baseline reproduction (3 failed / 4 passed twice here, same 3/4 in the worktree); owner: planner/coordinator. |
| F-B-5 | e2e fixture isolation | apps/web/e2e/calendar.spec.ts | Using `page.request` for API setup shared auth cookies with the page context and surfaced the verification banner on /login (strict-mode failure on `getByLabel('Email')`). | closed | Switched to the isolated `request` fixture like the rest of the spec; journey passes. |

## Deviations

None beyond F-B-1 (documented design choice). Scope stayed exactly the story's file list; no AC/decision/planning edits beyond implementer-authorized execution fields.
