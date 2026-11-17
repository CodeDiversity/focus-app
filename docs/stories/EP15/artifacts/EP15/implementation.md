# EP15 — parent implementation index (review unit EP15A–EP15J)

**Epic:** [EP15: Schedule & Availability Redesign](../../../../epics/EP15-schedule-and-availability-redesign.md) · **Breakdown:** [README](../../README.md) · **Contracts:** [contracts.md](../../contracts.md)
**Written by:** EP15J's implementer, 2026-11-17 · **Status:** ready for the one combined review (review-cadence)
**Baseline → final:** `ce87858` (EP15 Plan Ready, EP15A Ready) → the EP15J commit (the queue row's evidence link names it). EP15K is an **optional, unscheduled** story outside this unit (user order 2026-11-17).

## 1. Child inventory and Git scope

| Child | Outcome | Commit(s) | Diff range | Record |
|---|---|---|---|---|
| EP15A | Schedule model, availability copy migration, pure recurrence/day-bounds domain | `3481d0d` | `ce87858..3481d0d` | [implementation.md](../EP15A/implementation.md) |
| EP15B | `/schedule/day-bounds` + `/schedule/blocks` API (split, delete-from, occurrence cancel) | `b2fed52` | `3481d0d..b2fed52` | [implementation.md](../EP15B/implementation.md) |
| EP15C | Engine: day-bounds base, dated blocked time, preferred study blocks, course tie, identity | `57abd7b` | `b2fed52..57abd7b` | [implementation.md](../EP15C/implementation.md) |
| EP15D | One gathering seam (`ScheduleInputsService`); calendar `days[]` + EVENT/STUDY_BLOCK; planner off `availability_slots` | `5797aa1` | `57abd7b..5797aa1` | [implementation.md](../EP15D/implementation.md) |
| EP15E | Hour-axis week grid, bounds shading, free captions, study-block zones, server-derived week; user-ruled amendments | `cd36eda`, `b714f68` | `5797aa1..b714f68` | [implementation.md](../EP15E/implementation.md) |
| EP15F | Day-bounds banner + "When does your day start and end?" sheet; `Switch` primitive | `2dd361f` | `b714f68..2dd361f` | [implementation.md](../EP15F/implementation.md) |
| EP15G | One block sheet (add/edit/remove, weekly two-choice, D-G10), details actions, agenda parity | `f4c0698` | `2dd361f..f4c0698` | [implementation.md](../EP15G/implementation.md) |
| EP15H | Pointer layer: drag-select, move, resize; weekly drop prompt / cross-day just-this-day | `2c080e2` | `f4c0698..2c080e2` | [implementation.md](../EP15H/implementation.md) |
| EP15I | Drop `availability_slots`; delete module/page/entities; redirect; nav; e2e re-pointing | `643ae7c` | `2c080e2..643ae7c` | [implementation.md](../EP15I/implementation.md) |
| EP15J | `schedule.spec.ts`, `calendar.spec.ts` rewrite, axe gate on four surfaces, this index | the EP15J commit (queue row) | `00e5229..` the EP15J commit | [implementation.md](../EP15J/implementation.md) |

Docs-only commits inside the range: `00e5229` (EP15K optional story — not in this unit). Combined code scope: `git diff --stat ce87858..<final> -- apps packages README.md` with `<final>` = the EP15J commit.

## 2. Test commands run per child (all cwd-qualified; numbers as recorded in each child's record)

| Child | Commands | Result |
|---|---|---|
| EP15A | `apps/api`: `npx prisma validate && npx prisma generate`; `DATABASE_URL=<throwaway> npx jest --runInBand`; `npx jest` (ungated) | gated 82 suites 1663/0 (33 new); ungated 1178/0 |
| EP15B | `apps/api`: `createdb` → `migrate deploy` → `npx jest --runInBand`; ungated `npx jest` | gated 85 suites 1767/0 (104 new); ungated 1218/0 |
| EP15C | same | gated 87 suites 1810/0 (43 new; identity 15/15 vs the frozen EP14E snapshot); ungated 1261/0 |
| EP15D | same + `apps/web`: `pnpm test:e2e` (self-contained) | gated 88 suites 1823/0 (V-15-1 gated identity); ungated 1272/0; e2e 55/0 |
| EP15E | `apps/web`: `npx vitest run`; `pnpm test:e2e` | web 1335/0 → 1340/0 after amendments (45 new); e2e 55/0 |
| EP15F | `apps/web`: `npx vitest run`; `pnpm test:e2e` | web 1363/0 (23 new); e2e 55/0 |
| EP15G | `apps/web`: `npx vitest run`; tsc/eslint/prettier | web 1406/0 (43 new); e2e **not run in the worktree** (no API env; see § 6) |
| EP15H | `apps/web`: `npx vitest run`; tsc/eslint/prettier | web 1437/0 (31 new); e2e **not run in the worktree** |
| EP15I | `apps/api`: `createdb studypilot_ep15i_gate` → `migrate deploy` → `npx jest --runInBand`; `apps/web`: `npx vitest run`; statics both apps; EP15I-AC2 repo search | gated 85 suites 1778/0; web 1374/0; search clean (retirement machinery only) |
| EP15J | `apps/web`: `E2E_BASE_URL=http://localhost:3200 npx playwright test` × 3 against a private external stack (own throwaway DB on local Postgres, test-only API :4200, Vite :3200 — see § 6) | **62 passed / 0 failed × 3** (17.3 s, 17.6 s, 18.3 s); earlier batches surfaced F-EP15J-01 (fixed) and spec measurement artefacts (fixed) |

**Full-gate state at the final commit:** API gated `--runInBand` 85 suites 1778/0 (EP15I, unchanged by EP15J — e2e-only); web unit 1374/0 (EP15I, unchanged by EP15J); Playwright 62/0 three times consecutively (external-stack mode, § 6). **CI run link:** none — this environment has no CI; every result above is a recorded local run with its command (EP14A-AC4 evidence form).

## 3. Epic acceptance criteria — outcome and proof

| AC | Owner(s) | Outcome | Where proven |
|---|---|---|---|
| AC-E15-01 per-weekday wake/sleep, default, dismissible prompt, nothing blocked | A, B, F, J | **Met** | EP15A-AC1 (`readDayBounds` default 08:00–23:00), EP15B-AC1 (`PUT` seven entries), EP15F-AC1–3 (banner session-dismiss, sheet), EP15J-AC1(a) e2e |
| AC-E15-02 planner never outside bounds | C, D, J | **Met** | EP15C-AC1 bounds base; EP15J-AC1(b): every planned session within 08:00–22:00 on a real stack |
| AC-E15-03 add/edit/delete events, one-off or weekly | B, G, A | **Met** | EP15B-AC2/3 field rules + PATCH semantics; EP15G-AC1/2; EP15J-AC1(b)(e)(f) |
| AC-E15-04 cancel one occurrence; change from a date onward | B, G | **Met** | EP15B-AC3/4 (split, `?from=`, occurrence cancel idempotent); EP15G-AC2 two-choice wiring; EP15J-AC1(d) next week intact |
| AC-E15-05 never over events, classes, confirmed/locked sessions | C, D | **Met** | EP15C-AC2 dated blocked; EP15D seam `blocked`/`busy`; EP15J-AC1(b) no overlap with the weekly event |
| AC-E15-06 study blocks: course tie, energy, filled first, tied preferred | C, B, G | **Met** | EP15C-AC3 preferred tier + course tie + energy; EP15J-AC1(c) tied work first inside the block (preferred, not exclusive — BL-15-02) |
| AC-E15-07 study blocks never reduce free time | C, D | **Met** | EP15D `freeIntervals` excludes STUDY from `blocked`; EP15J-AC1(c) `free` = 08:00–22:00 with a block present |
| AC-E15-08 calendar shows bounds, items, free time; same function as the planner | D, E | **Met** | V-15-1 gated identity (EP15D); EP15E grid; EP15J-AC1(a)(b)(d) read-model agreement after each UI change |
| AC-E15-09 server-owned date math; profile-zone week (FU-EP04-01) | D, E | **Met** | EP15D `days[]`/`today`; EP15E D-E5 server-corrected week + 26-hour-spread case; EP15J specs derive every date from the server |
| AC-E15-10 pointer create/move/resize; keyboard + form identical results | G, H | **Met** | EP15G form path; EP15H parity (exactly `{ onCreateRange, onMove, onResize }`); EP15J-AC1(f) drag-select e2e; calendar.spec keyboard-only grid → details → sheet → save |
| AC-E15-11 agenda offers the same create/edit/delete | G | **Met** | EP15G-AC3; EP15J-AC1(e) at 375 px |
| AC-E15-12 every kind identifiable without colour; details on open | E, G | **Met** | EP15E icon + text markers, D-E8 tiers; details dialog; axe gate on grid + dialogs (EP15J-AC2) |
| AC-E15-13 migration keeps all data; old page/API retired; redirect; nav | A, I | **Met** | V-15-2 round-trip (EP15A); EP15I drop migration, deletions, `/availability` redirect, nav (EP15I-AC1–4) |
| AC-E15-14 determinism; ownership; uniform 404 | B, C, D | **Met** | V-15-3 identity + double run (EP15C); EP15B/EP15D data-scoping specs (V-15-4) |

## 4. Requirements, verification tasks, DoD

- **TR-E15-01…09:** owned and evidenced in the child records (§ 1 links); **TR-E15-10:** this child (§ 5); **TR-E15-11:** collected in § 7.
- **V-15-1** (free-time identity, DST + cancelled occurrence): EP15D `calendar-e2e.spec.ts` "V-15-1 …" (gated). **V-15-2** (migration round-trip): EP15A `schedule-migration.e2e.spec.ts` (gated; pass recorded in EP15A's record; the spec was **deleted by EP15I** because it seeds the dropped model — replaced by `schedule-drop.e2e.spec.ts`). **V-15-3** (determinism): EP15C `identity.spec.ts` (15 fixtures vs the frozen EP14E snapshot + a second identical run). **V-15-4** (ownership): EP15B `schedule-data-scoping.spec.ts`, EP15D `calendar-data-scoping.spec.ts` (uniform 404; foreign rows never in the payload).
- **Both migrations:** `20261117120000_schedule_blocks_and_day_bounds` (EP15A; copy between `-- copy:start/end`; rollback documented) and `20261117200000_drop_availability_slots` (EP15I; irreversible by design, pre-drop backup stance in the header and contracts § Data model).
- **DoD mapping:** as the breakdown README's table; DoD-2/4/5/6/7 are proven per owning child; DoD-9 by the two migrations, contracts.md and the root README; DoD-10/11 are the reviewer's.

## 5. EP15J's own evidence (TR-E15-10)

`apps/web/e2e/schedule.spec.ts` (7 tests: journeys (a)–(f) + the four-surface axe gate) and `apps/web/e2e/calendar.spec.ts` (5 tests, rewritten for the grid, server-derived dates, keyboard journey). Three consecutive full runs: 62 passed / 0 failed each. Details in [EP15J's record](../EP15J/implementation.md).

## 6. Known gaps and environment notes (for the reviewer)

1. **E2E in this worktree ran against a private external stack**, not `pnpm test:e2e`'s self-contained mode: the API's `.env.local` lives only in the main checkout (never read by the agent), and another session's run held the fixed ports 4100/3100 during EP15J. The stack was the same build (`apps/api/dist-test`, `vite`), my own throwaway database on local Postgres, a shell-only placeholder `JWT_SECRET`, and `E2E_BASE_URL=http://localhost:3200` (the config's documented external mode). A self-contained `pnpm test:e2e` from the main checkout is the reviewer's confirmation step.
2. **EP15G and EP15H had no e2e run at their own closeout**; EP15J's full runs cover their surfaces (block sheet, details actions, agenda editing, drag-select) end to end.
3. **TR-E15-11 screen-reader steps** were not executed in any child (no screen reader in the environment); each record carries VoiceOver instructions (§ 7). EP15G/EP15H visual passes were not executed either; EP15E/EP15F were.
4. **Findings noted for the planner** (none open against ACs): F-EP15F-03 (two stacked banners on an empty week), F-EP15G-03 (shared `Button` loses its name while loading), F-EP15G-04 (edit reads the whole block list — no `:id` route), F-EP15H-02 (React `act` warning baseline), F-EP15H-03 (zone-bottom resize handle), F-EP15I-01 (gated API suite races under parallel Jest workers). EP15K (optional) proposes the ADHD simplifications flagged at EP15H.
5. **F-EP15J-01 (fixed inside EP15J, owning child EP15F):** the shaded-region caption buttons were below the 24 px WCAG 2.2 target size — caught by the new axe gate, never by the class-string unit assertions; fixed in `WeekGrid.tsx`. **F-EP15J-02/-03** (pre-existing `adaptive-scheduling` journey-5 flake under parallel load; fixed e2e ports collide across worktrees) are noted for the planner.
6. **Axe gate location:** the story names `adaptive-scheduling.spec.ts`; the four-surface gate lives in `schedule.spec.ts` (same helper, no `ignore` predicate) because it needs seeded blocks; `adaptive-scheduling.spec.ts` keeps its `/calendar` stop from EP15I.

## 7. TR-E15-11 — manual accessibility evidence, collected

| Surface (child) | Executed | Not executed — user instructions |
|---|---|---|
| Week grid (EP15E) | Keyboard order (test), reduced motion (test), 375 px agenda (screenshot pass), visual pass desktop | VoiceOver read of a day column (instruction in EP15E's record) |
| Day-bounds banner + sheet (EP15F) | Keyboard (test), 44 px (test), visual pass (found/fixed F-EP15F-01) | VoiceOver through the sheet (instruction in EP15F's record) |
| Block sheet, details actions (EP15G) | Keyboard incl. prompt and focus return (test), 44 px + bottom sheet (test); EP15J e2e keyboard journey grid → details → sheet → save; axe on the sheet in both shapes | Visual pass desktop/375 px; VoiceOver (instructions in EP15G's record) |
| Pointer layer (EP15H) | Parity, Escape, threshold, announcements, reduced motion (tests); EP15J e2e drag-select | Visual pass, OS reduce-motion toggle, VoiceOver announcements (instructions in EP15H's record) |
| Cross-surface axe (EP15J) | Grid with event + study block, details dialog, bounds sheet, block sheet (Busy one-off; Study weekly with More) — zero serious/critical violations, no allowlist | — |
