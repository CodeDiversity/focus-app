# EP15J implementation record

**Story:** [EP15J — Cross-Layer End-to-End Verification and Parent Index](../../EP15J-cross-layer-e2e-and-parent-index.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-17
**Commit scope:** new `apps/web/e2e/schedule.spec.ts` (7 tests); `apps/web/e2e/calendar.spec.ts` rewritten (5 tests); `apps/web/e2e/helpers.ts` (+ block/calendar seeding, civil-date and interval helpers); one product fix in `apps/web/src/features/calendar/ui/WeekGrid.tsx` (F-EP15J-01, owning child EP15F); the parent index `artifacts/EP15/implementation.md`; this record; story Status/ruling/sizing; README row + Active/Next; `efficiency.md`; checkpoint closed.

Decisions applied: D-J1 ratified by default 2026-11-17 at implementation start on the user's instruction (seeding through the public API only — no direct SQL anywhere in the suite).

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP15J-AC1 — `schedule.spec.ts` journeys (a)–(f) pass on the stack | **Done.** (a) bounds sheet from the first-run banner → shading captions and "Free · 07:00–21:00" follow; read model agrees on all seven days. (b) weekly Busy through the sheet (today's weekday pre-checked) → `free` = `08:00–10:00, 12:00–22:00`; Generate plan (UI) → every placed session within 08:00–22:00 and none over 10:00–12:00 on the event's weekday. (c) Study block tomorrow 09:00–11:00 tied to a course through "More" → `free` unchanged (AC-E15-07); after Generate, the first session inside the block is the tied course's and any other course's session inside the block starts after the tied work ends (preferred, not exclusive — BL-15-02). (d) Remove → "Just this day" from the details dialog → today's free interval returns; next week's occurrence and its shrunken free time remain. (e) 375 px: Add → Save (≥ 44 px, measured after the entrance animation) → agenda entry → Edit → title + end changed → "Busy updated"; no horizontal scroll. (f) `page.mouse` drag over free cells (13:00 → 14:30 at 1 px/min) shows the live preview, opens the sheet pre-filled, Save creates the block and the API shows exactly `13:00–14:30`. | `schedule.spec.ts` tests 1–6; three consecutive full runs below |
| EP15J-AC2 — `calendar.spec.ts` rewritten for the grid, date-proof; `adaptive-scheduling.spec.ts` green; axe on grid, details, bounds sheet, block sheet with no `ignore` | **Done.** Every date derives from the server's `today` (class meeting on today's weekday, deadline today — visible in any week); grid assertions use the column (`[data-day]`) and all-day cell; details for a class carry no Edit/Remove; week navigation asserted through the status line's range; keyboard-only journey chip → Enter → details → Tab to Edit → Enter → sheet (Title focused) → type → Enter saves; narrow agenda test kept. Axe gate (`schedule.spec.ts` test 7): grid with event + study block, details dialog, bounds sheet, block sheet (Busy one-off; Study weekly with "More") — zero serious/critical violations, no allowlist; it waits for the dialog to be fully opaque before scanning. `adaptive-scheduling.spec.ts` keeps its `/calendar` axe stop and passed in every run. | `calendar.spec.ts` (5), `schedule.spec.ts` test 7 |
| EP15J-AC3 — parent index with AC-E15-01…14 outcomes, child links, both migrations, V-15-1…4, TR-E15-11 collected, full-gate results and CI link | **Done.** [`artifacts/EP15/implementation.md`](../EP15/implementation.md): inventory with per-child commits and diff ranges, test commands and numbers per child, AC table with proof pointers, V-15-1…4 and the two migrations, DoD mapping, the collected TR-E15-11 table, known gaps. **No CI run link exists** — this environment has no CI; the index records local commands and results instead (EP14A-AC4 evidence form) and says so. | the index |

## Verification (2026-11-17, this worktree)

**Tested state:** `HEAD 00e5229` + the uncommitted changes that form this commit.

- **Playwright, full suite, three consecutive runs:** `E2E_BASE_URL=http://localhost:3200 npx playwright test` (cwd `apps/web`) → **62 passed / 0 failed** × 3 (17.3 s, 17.6 s, 18.3 s). The suite grew 54 → 62 (schedule 7 new; calendar 4 → 5).
- **How the stack ran (environment note, see also the index § 6):** another session's self-contained run held the fixed ports 4100/3100 for most of this window, and the API's `.env.local` exists only in the main checkout (never read). So the suite ran in Playwright's documented **external-stack mode**: my own throwaway database on local Postgres (`createdb studypilot_ep15j_e2e` → `prisma migrate deploy`), the same test-only API build (`apps/api/dist-test/main`, `PORT=4200`, shell-only placeholder `JWT_SECRET`, `FRONTEND_URL=http://localhost:3200`), `vite --port 3200` proxying to it, `E2E_BASE_URL=http://localhost:3200`. Processes stopped and the database dropped afterwards. A baseline self-contained run earlier in the window (before the ports were taken) passed 54/54, so both modes are known-good here.
- **Earlier batches, for the record:** before the three green runs, 2 + 3 + 3 full runs surfaced: the axe `target-size` defect (F-EP15J-01, fixed), two measurement artefacts in my own specs (Save height sampled mid-scale; drag points outside the viewport; axe sampled mid-fade — all fixed in the specs), one cold-reload miss of the login form on my Vite server right after a spec edit, and the pre-existing `adaptive-scheduling.spec.ts` journey 5 (`absorb-next-offer`, `page.clock`) failing twice under parallel load — not an EP15 spec; it passed in the final three runs and in 6 of 8 overall (F-EP15J-02, noted).
- **Web unit:** `npx vitest run` (cwd `apps/web`) → **124 files, 1374 passed, 0 failed** (unchanged count: the only product change is a class string on the caption button; calendar suites 127/127 after the fix).
- **Static:** `tsc --noEmit` (src) ✓; direct `tsc` pass over `e2e/**` ✓ (the folder is outside the web tsconfig); `eslint src e2e --max-warnings 0` ✓; prettier ✓.
- **API:** untouched by EP15J (gated 1778/0 at EP15I stands).

## Changed paths

- New: `apps/web/e2e/schedule.spec.ts`; `docs/stories/EP15/artifacts/EP15/implementation.md`.
- Changed: `apps/web/e2e/calendar.spec.ts` (rewrite), `apps/web/e2e/helpers.ts` (EP15J section), `apps/web/src/features/calendar/ui/WeekGrid.tsx` (F-EP15J-01).
- Docs: this record; story Status, D-J1 ruling, sizing; README row + Active/Next; `efficiency.md`; checkpoint closed.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP15J-01 | `WeekGrid.tsx` `ShadedRegion` caption button (EP15F); found by the axe gate | The "Day starts HH:mm, change" / "Day ends …" caption buttons were ~16 px tall (caption text, `px-0.5`); axe `target-size` (WCAG 2.2 2.5.8, serious) fires when a chip sits right against one, as a block starting at the wake time does. Unit tests had asserted only the class strings, never rendered size. | **Fixed** in the owning child's code: `inline-flex min-h-6 min-w-6 items-center px-1` (24 × 24 px minimum). Calendar unit suites green; axe gate green in three runs. | EP15F (fixed here) |
| F-EP15J-02 | `apps/web/e2e/adaptive-scheduling.spec.ts` journey 5 (EP13M) | Under `fullyParallel` on one stack, the `page.clock`-driven micro-start journey intermittently never shows `absorb-next-offer` within 15 s (2 of 8 full runs this window; green in the final three). | **Noted** for the planner: a pre-existing flake outside EP15's specs; candidates are serial mode for that file or a longer wait after `fastForward`. | planner / EP13M owner |
| F-EP15J-03 | `playwright.config.ts`, `e2e/test-env.ts` | Fixed ports 4100/3100 and a database name derived from the configured URL make two worktrees' self-contained runs collide; the documented external mode works around it by hand. | **Noted** for the planner: derive ports (and the throwaway DB name) from an env override or a per-worktree hash. | planner |

## Deviations

1. **Axe gate location:** the story names `adaptive-scheduling.spec.ts`; the four-surface gate lives in `schedule.spec.ts` because it needs seeded blocks and dialogs, using the same `axeViolations` helper with no `ignore`. `adaptive-scheduling.spec.ts`'s `/calendar` stop stays.
2. **Journey (c) "before any other free time"** is asserted as placement priority (tied work first inside the block; other courses only after it there), not clock order — the engine ranks the preferred block first, then fills the day's remaining free time, which may be earlier on the clock.
3. **Journey (b)** generates the plan through the UI and reads the placements from the deterministic preview endpoint (V-15-3) rather than from the saved plan, so the assertion covers every placed session regardless of anchor.
4. **No CI run link** (AC3 asks for one): there is no CI in this environment; local commands and results are recorded instead and the index says so plainly.
