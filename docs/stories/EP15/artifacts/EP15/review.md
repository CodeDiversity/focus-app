# EP15 combined implementation review (review unit EP15A–EP15J)

**Date:** 2026-11-17 · **Pass:** 1 · **Reviewer assignment:** `parent_review`
**Reviewed commit:** `c3f0892` (branch `hfi/a6f89af4-474e-41d4-beb0-f09520711d90/elm`, working tree clean; unit baseline `ce87858`)
**Scope:** the ten children EP15A–EP15J per the [execution queue](../../README.md) and the [parent index](./implementation.md). EP15K is optional, user-ordered outside this unit, and was **not** reviewed. Inputs: the epic, [contracts.md](../../contracts.md), the ten story files, the ten child records, the shared DoD ([docs/epics/README.md](../../../../epics/README.md#definition-of-done)).
**Commit inventory verified:** `git log ce87858..c3f0892` shows exactly the per-child commits the parent index lists (`3481d0d`, `b2fed52`, `57abd7b`, `5797aa1`, `cd36eda`+`b714f68`, `2dd361f`, `f4c0698`, `2c080e2`, `643ae7c`, `c3f0892`) plus the docs-only `00e5229` (EP15K story, outside the unit). 135 files changed, +15112/−4967 across `apps`, `README.md`.

## Verdict

**Pass — no blocker or should-fix findings; polish findings R-EP15-19…R-EP15-21 remain open (optional), reviewed at commit `c3f0892`.**

## Reviewer-executed verification (all at `c3f0892`, clean tree, 2026-11-17)

| # | Gate | Command (cwd) | Result |
|---|---|---|---|
| 1 | Gated API, single worker | `createdb studypilot_ep15_review_gate` → `DATABASE_URL=postgres://<local user>@localhost:5432/studypilot_ep15_review_gate npx prisma migrate deploy` → same `DATABASE_URL` `npx jest --runInBand` (cwd `apps/api`) | Both migrations (incl. `20261117120000_…` and `20261117200000_…`) applied cleanly; **85 suites, 1778 passed, 0 failed** (81.4 s), exit 0 — matches EP15I/parent-index numbers. Database dropped afterwards. No `.env*` read; `DATABASE_URL` shell-only. |
| 2 | Web unit | `npx vitest run` (cwd `apps/web`) | Run 1 (concurrent with gate 1 on the same machine): 2 of 1374 tests timed out at 5 s (`CourseForm.test.tsx`, `CalendarPage.test.tsx`) — both files pass **69/69 in isolation**; clean full rerun: **124 files, 1374 passed, 0 failed** (exit 0) — matches the recorded numbers. The load sensitivity is the known F-EP15F-02/F-EP15H-02 environment pattern, not a product defect. |
| 3 | Playwright e2e, **self-contained mode** (the confirmation step parent index § 6.1 asks of the reviewer; ports 4100/3100 verified free first via `lsof`) | `JWT_SECRET=<shell-only placeholder> DATABASE_URL=postgres://<local user>@localhost:5432/postgres npx playwright test` (cwd `apps/web`) | **62 passed, 0 failed (26.0 s)**, exit 0; throwaway `postgres_e2e_test` dropped by the harness. This closes the disclosed gap that EP15J's three 62/0 runs used the external-stack mode only. |
| 4 | Web statics | `npx tsc --noEmit -p tsconfig.json`; `npx eslint src e2e --max-warnings 0`; `npx prettier --check src e2e` (cwd `apps/web`) | All exit 0. |
| 5 | API statics | `npx tsc --noEmit -p tsconfig.json`; `npx eslint "src/**/*.ts" --max-warnings 0`; `npx prettier --check "src/**/*.ts"` (cwd `apps/api`) | All exit 0. |
| 6 | EP15I-AC2 retirement search | the two recorded `grep -rn` commands re-run verbatim (cwd repo root) | Identical to the recorded output: outside `docs/`, only the drop migration's header, the two absence-probing specs (`schedule-drop.e2e.spec.ts:34-37`, `schedule-inputs.service.spec.ts:259`) and the redirect (`App.tsx:63` + its test). |

No CI exists in this environment (recorded in the parent index § 2); every result above is a reviewer-executed local run in the EP14A-AC4 evidence form. Implementer-provided evidence reused for unchanged code is marked below.

## Findings

Numbering continues after the plan review's R-EP15-01…18.

| ID | Severity | Owner | Finding |
|---|---|---|---|
| R-EP15-19 | Polish | user / planner | TR-E15-11's screen-reader steps were executed on **no** surface (no screen reader in this environment), and the EP15G/EP15H desktop visual passes and the OS-level reduce-motion toggle were not executed either. Every child record carries exact VoiceOver/visual instructions, and DoD-11's labelled form ("Not executed — user instructions") is the sanctioned disposition, applied in the walkthrough section below — so no mandatory obligation is unmet in form. **Closure:** a user-executed VoiceOver pass over the grid, bounds sheet, block sheet and drag announcements (scripts in the EP15E/F/G/H records), recorded in those records — or a recorded user waiver. |
| R-EP15-20 | Polish | planner | (= F-EP15I-01, verified as described.) The gated API suite is only correct single-worker — `npx jest` with `DATABASE_URL` set runs parallel workers against one database and fails spuriously (whole-table count snapshots race) — but nothing enforces `--runInBand`. **Closure:** `maxWorkers: 1` when the gate env is present, or a package script that encodes `--runInBand`, committed and recorded. |
| R-EP15-21 | Polish | planner | (= F-EP15J-02/-03, verified as described.) E2E harness robustness: fixed ports 4100/3100 and the config-derived throwaway DB name make two worktrees' self-contained runs collide (the reason EP15J had to use the documented external-stack mode); separately, the pre-existing `adaptive-scheduling.spec.ts` journey 5 (`page.clock`) flakes under parallel machine load (green in my run and in EP15J's final three). **Closure:** env-derived ports/DB name (or a per-worktree hash), and a serialization or longer post-`fastForward` wait for journey 5, committed and recorded. |

No blocker and no should-fix. Specifically checked and clear: no secret was committed or read (no `.env*` in the worktree; both e2e modes used shell-only placeholders); no ownership gap (below); no unmet AC.

**Advisory items disclosed by the implementer, verified as recorded, already owned in the child records — not re-raised as findings:** F-EP15F-03 (two stacked banners on an empty week — refiner), F-EP15G-03 (`shared/ui/Button` drops its accessible name while loading — worked around with `aria-label` on every EP15 surface; design-system owner), F-EP15G-04 (edit reads the whole block list — no `GET /schedule/blocks/:id`; planner), F-EP15H-03 (resize handle sits at the chip's bottom, not the zone's, on long study blocks — refiner; EP15K proposes the fix), F-EP15C-03 (a story test sentence describes an unobservable case — planner wording), F-EP15A-03 (the schema list lives in the root `README.md:333-335`, no `apps/api/README.md` exists — verified, correct home). F-EP15E-02/-03 were closed by the user rulings D-E11/D-E10 (verified in `CalendarEventChip.tsx`/story Decisions).

## Child-by-child AC dispositions

Evidence form: **[R]** = reviewer-executed (gates 1–6 above, or the cited inspection); **[I]** = implementer-recorded, accepted for unchanged code.

### EP15A — model, copy migration, recurrence domain (`3481d0d`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15A-AC1 | Satisfied | Models verbatim per contracts (`apps/api/prisma/schema.prisma`); migration `20261117120000_schedule_blocks_and_day_bounds/migration.sql` header documents the rollback (`DROP TABLE …; DROP TYPE "ScheduleBlockKind"`) **[R, read]**; `migrate deploy` + full gated suite green at the final commit **[R, gate 1]**. |
| EP15A-AC2 | Satisfied | Copy is one `INSERT … SELECT` between `-- copy:start` (L98) / `-- copy:end` (L115) **[R]**; V-15-2 round-trip passed gated at EP15A (`schedule-migration.e2e.spec.ts`, 1663/0 recorded) **[I]** — the spec was later deleted by EP15I because it seeds the dropped model (replaced by `schedule-drop.e2e.spec.ts`, which ran green in gate 1 **[R]**). Accepted: the recorded pass stands as the evidence; the copy statement remains readable in the migration. |
| EP15A-AC3 / AC4 | Satisfied | `domain/schedule/recurrence.ts` pure (civil-date helpers, no clock); `recurrence.spec.ts` 32 cases incl. DST, `24:00`, defaults, purity grep — all in the 1778 **[R, gate 1]**. |

### EP15B — schedule API (`b2fed52`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15B-AC1…AC4 | Satisfied | Route set and semantics per contracts § API incl. the *As implemented* notes (split, weekly→one-off with required `effectiveFrom` + explicit `endDate: null`, exception move/drop, idempotent cancel, `?from=` no-op) — `schedule.service.ts:520-640` inspected **[R]**; 104 tests (unit + e2e + scoping) in the 1778 **[R, gate 1]**. |
| EP15B-AC5 | Satisfied | `schedule.controller.ts:34-92`: every route `@CurrentUser()`, no `@Req()` **[R]**. Every Prisma access scoped: `findFirst({ id, userId })` (`:448-452`, `:577-581`, `:615-619`), scoped `update`/`updateMany` + `assertAffected` (`:522-535`, `:594-598`, `:625-626`), exceptions reached only through an owned block inside the same transaction (`:542-549`, `:599-601`, `:634-638`), course via scoped `findFirst` (`:644-649`); misses throw `RESOURCE_NOT_FOUND` = `'Resource not found'` (`common/ownership/ownership.ts:34`) **[R]**. `schedule-data-scoping.spec.ts` (7 cases) green **[R, gate 1]**. F-EP15B-01 (latent `parseCalendarDate` 500, an EP12A helper) verified fixed with 4 unit cases. |

### EP15C — engine (`57abd7b`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15C-AC1 | Satisfied | `SchedulerInput` per contracts; `conflicts.ts` untouched (`git diff b2fed52..57abd7b -- …/conflicts.ts` empty) **[R]**; purity grep in `preferred.spec.ts` **[R, gate 1]**. |
| EP15C-AC2 / AC3 | Satisfied | Bounds base, dated blocked, two-tier ranking, course tie, D-J2 overlap, free-minutes invariance — `preferred.spec.ts` (23) + `intervals.spec.ts` (+3) green **[R, gate 1]**. F-EP15C-02 (same-start tie by `blockId`, a real contract defect) verified fixed. |
| EP15C-AC4 | Satisfied | `identity.snapshot.json` present (15 fixtures, frozen from the EP14E engine at `b2fed52`); `identity.spec.ts` 17 cases incl. the double run (V-15-3) green **[R, gate 1]**. The adapter deviation (windows also carried as `preferred` — F-EP15C-01) is interim-only; EP15D deleted it (verified: `legacy-windows` imported by no file under `src/modules` **[R, grep]**). |

### EP15D — gathering seam + calendar read model (`5797aa1`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15D-AC1 | Satisfied | `ScheduleInputsService.scheduleInputs` is the one derivation; `calendar.service.ts:142` and `study-plans.service.ts:1022` both call it **[R]**; no `availabilitySlot` read anywhere live (gate 6) **[R]**; planning suites green **[R, gate 1]**. F-EP15D-01 (preserved rows read for every date — TR-E08-04 counts) verified as the recorded deviation. |
| EP15D-AC2 | Satisfied | `days[]` + `EVENT`/`STUDY_BLOCK` with `blockId`/`recurring`/`energy`, `NO_BLOCK` nulls on other types, old types gone (`calendar.service.ts:25-26, 77, 242-278`) **[R]**; calendar unit/e2e specs green **[R, gate 1]**. |
| EP15D-AC3 | Satisfied | V-15-1 gated identity: `calendar-e2e.spec.ts:276` ("the calendar's free time equals freeIntervals over the planner's seam inputs, minute for minute", DST week + cancelled occurrence + one-off + `24:00` fixture) green **[R, gate 1]**. |
| EP15D-AC4 | Satisfied | Every seam read scoped (`schedule-inputs.service.ts:71-123`: `userId` direct on bounds/blocks/courses/sessions, `studyPlan: { userId }` on planned rows; exceptions/courses ride the owned block query) **[R]**; `calendar-data-scoping.spec.ts` green **[R, gate 1]**. |

### EP15E — week grid (`cd36eda`, `b714f68`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15E-AC1…AC4 | Satisfied | 45 new/rewritten tests (gridModel, WeekGrid, chip, details, agenda, page incl. FU-EP04-01 a–d and the no-local-Date greps) green **[R, gate 2]**; e2e grid journeys green **[R, gate 3]**. User-ruled amendments (D-E7 override + D-E9…D-E12) verified in code: `FREE_LABEL_MIN = 60` (`gridModel.ts:18`), now marker, agenda ranges — rulings recorded in the story Decisions table **[R]**. Visual pass desktop + 375 px executed at EP15E **[I]**; VoiceOver step → R-EP15-19. |

### EP15F — day-bounds UI (`2dd361f`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15F-AC1…AC3 | Satisfied | Banner (session dismiss, never modal), sheet (Switch primitive, seven-entry PUT, `00:00`↔`24:00` mapping with validation after mapping, field-mapped 400s), save flow (close, focus return, announcement, refetch) — 23 tests green **[R, gate 2]**; e2e journey (a) exercises banner → sheet → shading/free relabel on a real stack **[R, gate 3]**. Deviation ("Same every day" opens **off** when stored bounds differ by weekday) accepted: with differing bounds the AC's "one pair pre-filled from the current values" has no faithful value and the literal reading would silently discard per-day data on save; recorded in the child record. F-EP15J-01 (caption buttons under the 24 px WCAG 2.2 target size — EP15F-owned code) verified fixed (`WeekGrid.tsx:799` `min-h-6 min-w-6`) and held by the axe gate **[R, gate 3]**. |

### EP15G — block sheet (`f4c0698`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15G-AC1…AC4 | Satisfied | 43 tests (sheet, prompt, chips, details actions, page wiring, announcement matrix, partial-failure sentence) green **[R, gate 2]**; the e2e journeys (b), (d), (e) and the keyboard-only grid → details → sheet → save journey exercise create/edit/remove, the two-choice prompt and agenda parity on a real stack — the e2e coverage EP15G lacked at its own closeout **[R, gate 3]**. D-G10 (▲, user-granted 2026-11-16) wiring verified against contracts § PATCH semantics. Visual + VoiceOver steps → R-EP15-19. |

### EP15H — direct manipulation (`2c080e2`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15H-AC1…AC3 | Satisfied | 31 tests (dragModel pure cases, grid pointer layer, page resolveDrop incl. weekly same-day prompt, cross-day just-this-day, parity assertion on exactly `{ onCreateRange, onMove, onResize }`, reduced-motion scan) green **[R, gate 2]**; e2e journey (f) drag-select → pre-filled sheet → created block on a real stack **[R, gate 3]**. Visual/OS-reduce-motion/VoiceOver steps → R-EP15-19; zone-handle position → advisory F-EP15H-03. |

### EP15I — retirement (`643ae7c`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15I-AC1 | Satisfied | `20261117200000_drop_availability_slots` applied in gate 1; header carries the irreversibility stance (pre-drop `pg_dump`, restore-from-backup) **[R, read]**; `schedule-drop.e2e.spec.ts` (table absent, old routes 404) green **[R, gate 1]**. |
| EP15I-AC2 | Satisfied | Search re-run, identical clean result (gate 6) **[R]**. |
| EP15I-AC3 | Satisfied | `App.tsx:63` `<Navigate to="/calendar" replace />`; `navGroups.ts:84-88` Planning = Calendar, Plan, Plan health **[R, read]**; header/drawer/redirect/empty-state tests green **[R, gate 2]**. |
| EP15I-AC4 | Satisfied | e2e specs hold no availability reference (gate 6); root `README.md:333-335` and contracts § Data model record the drop + stance **[R, read]**. |

### EP15J — cross-layer e2e + parent index (`c3f0892`)

| AC | Disposition | Evidence |
|---|---|---|
| EP15J-AC1 | Satisfied | `schedule.spec.ts` holds exactly the six journeys (a)–(f) (`e2e/schedule.spec.ts:92-430`) **[R, read]**; all green in my self-contained run **[R, gate 3]** and in EP15J's three recorded external-stack runs **[I]**. |
| EP15J-AC2 | Satisfied | `calendar.spec.ts` rewritten, 5 date-proof tests incl. the keyboard journey (`e2e/calendar.spec.ts:57-175`); the four-surface axe gate (`schedule.spec.ts:437`) calls `axeViolations(page)` with **no** `ignore` predicate; `adaptive-scheduling.spec.ts` green **[R, gates 3 + read]**. Deviation (gate lives in `schedule.spec.ts`, not `adaptive-scheduling.spec.ts`) accepted — the AC names the surfaces, not the file, and the gate needs seeded blocks. |
| EP15J-AC3 | Satisfied | Parent index complete (inventory with verified commits, per-child commands/numbers, AC table, migrations, V-15-1…4, TR-E15-11 collection, known gaps). "CI run link": **not applicable** — no CI exists; the index says so plainly and records local commands instead (EP14A-AC4 form, consistent with every prior unit). |

## Epic acceptance criteria (AC-E15-01…14)

| AC | Outcome | Reviewer basis |
|---|---|---|
| AC-E15-01 default + prompt, nothing blocked | **Met** | Gates 1–3: `readDayBounds` defaults, PUT seven entries, banner/sheet tests, journey (a). |
| AC-E15-02 never outside bounds | **Met** | EP15C bounds-base tests (gate 1); journey (b) asserts every placed session within 08:00–22:00 on a real stack (gate 3). |
| AC-E15-03 events one-off/weekly CRUD | **Met** | EP15B matrices (gate 1); EP15G tests (gate 2); journeys (b)(e)(f) (gate 3). |
| AC-E15-04 cancel one / change from a date | **Met** | Split + `?from=` + idempotent cancel specs (gate 1); two-choice wiring tests (gate 2); journey (d) — next week intact (gate 3). |
| AC-E15-05 never over events/classes/sessions | **Met** | EP15C dated-blocked tests, seam `blocked`/`busy` (gate 1); journey (b) no-overlap (gate 3). |
| AC-E15-06 study blocks filled first, course tie, energy | **Met** | Two-tier + course-tie + energy tests (gate 1); journey (c): tied work first inside the block, preferred not exclusive (gate 3). |
| AC-E15-07 blocks never reduce free time | **Met** | `baselineFreeMinutes` invariance test (gate 1); journey (c): `free` unchanged with a block present (gate 3). |
| AC-E15-08 calendar = planner, one function | **Met by construction + pinned** | One seam, both call sites inspected; V-15-1 gated identity (gate 1); journeys re-read the model after each UI change (gate 3). |
| AC-E15-09 server-owned date math, profile-zone week | **Met** | FU-EP04-01 a–d tests + no-local-getter greps (gate 2); e2e specs derive every date from server `today` (gate 3, read). |
| AC-E15-10 pointer + keyboard/form, identical results | **Met** | Parity type-pin + drag tests (gate 2); journey (f) + the keyboard-only calendar journey (gate 3). |
| AC-E15-11 agenda same capabilities | **Met** | Journey (e) at 375 px (gate 3); page AC3 test (gate 2). |
| AC-E15-12 identifiable without colour; details | **Met** | Icon/text marker + density-tier tests (gate 2); four-surface axe gate, zero serious/critical, no allowlist (gate 3). |
| AC-E15-13 migration keeps data; retirement; redirect; nav | **Met** | V-15-2 recorded pass [I] + copy statement read [R]; gate 6 search; redirect/nav inspected + tested (gates 1, 2). |
| AC-E15-14 determinism; ownership; uniform 404 | **Met** | V-15-3 double-run identity (gate 1); ownership inspection above; V-15-4 scoping specs (gate 1). |

## Definition of Done

| DoD | Disposition | Evidence |
|---|---|---|
| 1 functional criteria | **PASS** | Per-child AC tables above; gates 1–3. |
| 2 invalid-input validation | **PASS** | EP15B 23-row POST matrix + PATCH/PUT matrices (gate 1); EP15F/EP15G client mirrors incl. the midnight mapping (gate 2). |
| 3 student data scoping | **PASS** | Code inspection (EP15B/EP15D sections) + `schedule-data-scoping` / `calendar-data-scoping` specs + the e2e ownership journeys (gates 1, 3). Uniform 404 `Resource not found` everywhere; parameter-shape 400s precede the lookup only where they leak nothing (recorded EP15B deviation, accepted). |
| 4 actionable API errors | **PASS** | Field-keyed `errors` maps (`days[<i>].<field>`, block fields) asserted in gate 1; surfaced per-field in EP15F/EP15G (gate 2). |
| 5 loading/empty/error states | **PASS** | EP15E skeleton/empty/error tests, EP15F/G sheet states, EP15H pending/revert states (gate 2). |
| 6 keyboard accessibility | **PASS** | Dialog trap/Escape/focus-return, chips group, grid tab order tests (gate 2); keyboard-only e2e journey (gate 3). |
| 7 responsive layouts | **PASS** | Agenda + bottom-sheet + 44 px tests (gate 2); journey (e) at 375 px incl. no horizontal scroll (gate 3). EP15H pointer-only ≥ `sm` by design (story DoD note). |
| 8 automated tests | **PASS** | TR-E15-01…10 all evidenced in reviewer-executed runs (gates 1–3): API 1778/0, web 1374/0, e2e 62/0. |
| 9 API/migration documentation | **PASS** | Both migration headers (rollback / irreversibility stance), contracts.md §§ API/read model/engine *As implemented*, root `README.md` schema list, parent index — all read **[R]**. |
| 10 integrated review | **PASS** | This review: all three suites executed against the integrated stack at `c3f0892`, incl. the self-contained e2e stack (API + Vite + Postgres). |
| 11 reviewer walkthrough | **PASS** | The **How to verify by hand** section below. |

**TR-E15-11** (manual accessibility pass): recorded in every owning child with executed/not-executed labels; the unexecuted screen-reader and EP15G/H visual steps are R-EP15-19 (polish) and appear below as user instructions — the labelled form DoD-11 prescribes.

## Cross-child behaviour and out-of-MVP check

- The epic's central invariant (calendar free time = planner free time) holds **by construction** (one `scheduleInputs` + one `freeIntervals`, both call sites inspected) and is **pinned** (V-15-1 gated; journeys (a)–(d) re-read the model after each UI change).
- The D15-15 interim window closed correctly: after EP15I nothing live references the old surface (gate 6), and the EP15D→EP15J test-seeding re-point (R-EP15-12) left no journey planning against vanished windows (all 62 e2e green).
- The EP13J/EP14E engine behaviour is unchanged where EP15 promised it (identity snapshot + 342 pre-existing cases; `conflicts.ts` diff-empty).
- No out-of-MVP feature shipped: no new recurrence kinds, no exclusivity toggle, no external sync, no third prompt answer; EP15K (the one proposal beyond scope) is a separate, blocked, optional story.

---

## How to verify by hand (DoD-11)

Use a disposable local account and database; no secrets, no shared-system mutations. The executed evidence below is from this review's runs at `c3f0892` on 2026-11-17 (local macOS, Postgres 14.21, Chromium via Playwright) unless marked otherwise.

### 1. Set your day's start and end (AC-E15-01)

1. Log in as a fresh user and open `/calendar`. Expect the banner "Your days run 08:00–23:00 for now. When does your day usually start and end? Set it" above the grid — never a modal, the page fully usable.
2. Press "Set it". In the sheet, "Same every day" is on with one pre-filled pair. Set 07:00 / 21:00 and Save.
3. Expect: sheet closes, focus returns to the trigger, status region announces "Day start and end saved.", the shaded regions move, free captions read "Free · 07:00–21:00", banner gone for good.
4. Negative: enter an end at or before the start → field error, nothing saved; an end of `00:00` means midnight (hint appears) and is accepted.

`Executed — 2026-11-17, self-contained Playwright stack, schedule.spec.ts journey (a) + EP15F unit suites (gates 2–3).`

### 2. Weekly busy event and the plan respecting it (AC-E15-02/03/05)

1. Add → Busy, 10:00–12:00, "Repeats weekly" on (today's weekday pre-checked), Save. Expect "Busy added", the chip on today and the free interval split around it.
2. Generate a plan from the Plan page. Expect: no planned session overlaps 10:00–12:00 on that weekday and none lies outside your bounds on any day.

`Executed — 2026-11-17, journey (b): every placed session verified within 08:00–22:00 and clear of the event (gate 3).`

### 3. Study block filled first, free time unchanged (AC-E15-06/07)

1. Add → Study, tomorrow 09:00–11:00, "More" → tie a course, Save. Expect the dashed zone; the day's free labels **unchanged** (a study block is free time with a preference).
2. Generate a plan. Expect the tied course's work placed inside the block before other work there; other free time still used.

`Executed — 2026-11-17, journey (c) (gate 3).`

### 4. Cancel one occurrence; change from a date (AC-E15-04)

1. Open the weekly event's details → Remove → "Just this day". Expect "Removed for this day", today's free time restored, next week's occurrence (navigate →) still present with its shrunken free time.
2. Edit the event's time → the prompt "This repeats weekly. Apply your change to:" with exactly two answers; "This and following" changes this and later weeks only.
3. Negative: Back/Escape on the prompt returns to the form with values intact, no request.

`Executed — 2026-11-17, journey (d) + EP15G prompt/wiring unit suites (gates 2–3).`

### 5. Drag on the grid (AC-E15-10 pointer half)

1. With a mouse, drag across free cells (e.g. 13:00 → 14:30). Expect a dashed live preview snapping in 15-minute steps with the times; release opens the sheet pre-filled; Save creates exactly that block.
2. Drag a Busy chip down an hour → it saves via PATCH and announces "Moved to …"; drag its bottom handle → "Resized to …". A weekly chip asks the two-choice question first (same-day) or announces the just-this-day move (cross-day).
3. Negative: Escape mid-drag cancels with nothing persisted; a plain click opens details, never a move.

`Executed — 2026-11-17, journey (f) (drag-create, real browser) + EP15H unit suites for move/resize/Escape/threshold (gates 2–3). The desktop visual polish pass (ghost/preview appearance) was not re-run: Not executed — user instructions in the EP15H record.`

### 6. Agenda on a phone (AC-E15-11)

1. At 375 px width, expect the agenda listing all seven days with bounds and free lines; the same "Add" button (≥ 44 px) opens the sheet as a bottom sheet with Save lowest.
2. Edit an entry via its details → change title and end → "Busy updated"; no horizontal scroll anywhere.

`Executed — 2026-11-17, journey (e) at 375 px (gate 3).`

### 7. Keyboard-only path (AC-E15-10 keyboard half)

1. Tab to a chip (time order within a day, all-day first) → Enter opens details → Tab to Edit → Enter opens the sheet with Title focused → type → Enter saves; focus returns to the trigger.

`Executed — 2026-11-17, calendar.spec.ts keyboard journey (gate 3) + Dialog/grid order unit tests (gate 2).`

### 8. Accessibility — automated gate, screen reader, reduced motion (AC-E15-12, TR-E15-11)

1. Axe on the grid (with an event + study block), the details dialog, the bounds sheet and the block sheet (both shapes): zero serious/critical violations, no allowlist.
   `Executed — 2026-11-17, schedule.spec.ts test 7 (gate 3).`
2. VoiceOver read-through of a day column, the bounds sheet, the block sheet and the drag announcements — expected utterances are scripted verbatim in the EP15E/F/G/H records (§ Manual accessibility pass).
   `Not executed — user instructions (no screen reader in this environment; R-EP15-19).`
3. OS-level Reduce Motion on: nothing eases during a drag; previews move in discrete steps.
   `Not executed — user instructions (EP15H record); the equivalent DOM-level guarantee (no animation without its motion-reduce companion) is Executed by test (gate 2).`
4. EP15G/EP15H desktop and 375 px visual passes (bottom-sheet placement, chip/handle appearance).
   `Not executed — user instructions (EP15G/H records; R-EP15-19). The 44 px and layout rules themselves are Executed by test (gate 2) and journey (e) (gate 3).`

### 9. Migration and retirement (AC-E15-13)

1. On a database with old availability slots, after `prisma migrate deploy`: every slot has exactly one `schedule_blocks` successor (same weekday, times, kind, energy); later the `availability_slots` table is gone.
   `Executed — migrations applied on a fresh throwaway DB in gate 1 (2026-11-17); the seeded round-trip itself (V-15-2) was executed and recorded at EP15A on 2026-11-17 (implementer evidence; its spec is deleted by design now the table is dropped).`
2. Visit `/availability` → lands on `/calendar` (replace). Navigation shows Planning = Calendar, Plan, Plan health; no Availability anywhere, including the account menu.
   `Executed — 2026-11-17, App.test.tsx redirect + header suites (gate 2) and code inspection (App.tsx:63, navGroups.ts:84-88).`

### 10. Ownership (AC-E15-14)

1. With two accounts: student B PATCH/DELETE/occurrence-cancel on A's block ids and B creating a block tied to A's course → always 404 "Resource not found", nothing written, A's data byte-identical; B's calendar never contains A's rows.

`Executed — 2026-11-17, schedule-data-scoping.spec.ts + calendar-data-scoping.spec.ts in gate 1, plus the e2e isolation journeys (gate 3).`

---

**Verdict (restated):** Pass — no blocker or should-fix findings; polish findings R-EP15-19…R-EP15-21 remain open (optional), reviewed at commit `c3f0892`.
