# EP15K implementation record

**Story:** [EP15K — Calmer Weekly-Drag Outcomes](../../EP15K-calmer-weekly-drag-outcomes.md)
**Status:** Implemented — awaiting review (its own review unit, outside the closed EP15A–EP15J unit)
**Date:** 2026-11-17
**Baseline:** `2751504` (EP16 ratification commit; EP15 closed at `c9b6ef2`).
**Commit scope:** API `PUT /schedule/blocks/:id/occurrences/:date` (service + controller) and its unit, gated e2e and ownership-matrix tests; web `restoreOccurrence` client (+ test); `CalendarPage` drop flow (dialog removed, follow-up strip with Undo and "Apply to every week from here"); `WeekGrid` zone-edge resize handle and `CalendarEventChip.showResizeHandle`; `gridModel.weekdayNumberOf` (+ test); page and grid drag tests; EP15 contracts § API; EP15H decision back-references; this record; story Status/sizing; EP15 queue row; efficiency row.

Decisions applied: ▲ D-K1 (a), ▲ D-K2 (a), D-K3 (a) — ratified by the user 2026-11-17 (story table). D-K1 overrides EP15H D-H2/D-H6 for gestures and refines D-H4; back-references appended to those EP15H rows. The sheet's own two-choice prompt for form edits is untouched (EP15K-AC1's exception).

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP15K-AC1 — every weekly drop (same day or another day) saves "just this day" immediately, no dialog; announced; an inline "Apply to every week from here" performs the series change in one tap; the sheet's prompt unchanged for form edits | **Done, with F-EP15K-01 and F-EP15K-02.** `resolveDrop` no longer opens a Dialog for any drop: weekly → POST the one-off, cancel the occurrence (EP15G order), announce (`… for this day` same-day; the D-H4 sentence cross-day). Apply: same day → `PUT restore` → `DELETE one-off` → `PATCH { startTime?, endTime, effectiveFrom: date }`; cross day → read the series (`GET /schedule/blocks`), swap the source weekday for the target's, `PATCH { weekdays, startTime, endTime, effectiveFrom: earlier date }` after the same restore → delete; a target weekday already in the series changes nothing and says "This already repeats on Fri — change it from its details" (Undo stays). `BlockSheet` and `WeeklyChoicePrompt` are unchanged and still used by the sheet. | `CalendarPage.drag.test.tsx`: same-day move, Apply order, same-day resize, cross-day swap, cross-day conflict (5 new) |
| EP15K-AC2 — every drag outcome offers Undo for 10 s in the same strip; Undo restores exactly the prior state; the occurrence cancel gains a documented inverse (promotes BL-15-05) | **Done.** One-off move/resize → Undo PATCHes the same fields back ("Undone — back to Thu 13:00–14:00"); weekly "just this day" → Undo restores the occurrence, then deletes the one-off. The inverse is `PUT /schedule/blocks/:id/occurrences/:date` (idempotent 204; 400 for a malformed date before the lookup or a non-occurrence; uniform 404 for missing/foreign/malformed ids; a one-off's own date is a no-op), documented in contracts § API. The strip closes after `FOLLOW_UP_MS` (10 000); the countdown waits while focus or the pointer is inside it and restarts in full on leave (F-EP15K-03). A failed Undo stops at the first failed step, toasts, closes the strip and re-reads the week. | API: `schedule.service.spec.ts` (3 new), `schedule-e2e.spec.ts` (restore round-trip + 401), `schedule-data-scoping.spec.ts` (B → A restore 404, exception survives; malformed/unknown ids on PUT); web: Undo (one-off + weekly), failed Undo, countdown/focus-pause, `scheduleBlockApi.test.ts` (1 new) |
| EP15K-AC3 — a study-block zone's resize handle renders at the zone's bottom edge; the sheet's End field unchanged; EVENT chips keep the chip-bottom handle | **Done.** The zone container (`data-kind="STUDY_BLOCK"`) now owns an `aria-hidden`, `tabIndex -1` strip at `bottom-0` (shown on hover/focus-within, `group` on the zone); the zone's chip passes `showResizeHandle={false}`; EVENT chips are unchanged. A 09:00–12:00 block resizes from its 12:00 edge, past the 90 px chip. | `WeekGrid.drag.test.tsx` (1 updated, 1 new) |
| EP15K-AC4 — no new dialog, no new primary control, one plain sentence per announcement; reduced motion and the AC-E15-10 parity table hold | **Done.** The drop Dialog is removed (net −1 dialog); the strip's two controls are `outline`/`ghost` size `sm`, outside the `role="status"` region (asserted), in a `role="group"` labelled "Last change"; every announcement is one sentence; the strip adds no animation; the parity test still pins exactly `onCreateRange`/`onMove`/`onResize`. | `CalendarPage.drag.test.tsx` (status-region containment, parity test), `WeekGrid` reduced-motion test unchanged and green |

## Verification

All commands run on the working tree of this commit, 2026-11-17.

- **API typecheck / lint:** `npx tsc --noEmit -p tsconfig.json` and `npx eslint src/modules/schedule --max-warnings=0` (cwd `apps/api`) → clean.
- **API gated suite (full, single worker):** `createdb studypilot_ep15k_gate` → `DATABASE_URL=postgres://<local user>@localhost:5432/studypilot_ep15k_gate npx prisma migrate deploy` → `DATABASE_URL=… npx jest --runInBand` (cwd `apps/api`) → **85 suites, 1783 passed, 0 failed** (EP15I's 1778 + 5 new). Database dropped afterwards. `DATABASE_URL` was shell-only; no `.env*` file was read.
- **Web:** `npx tsc --noEmit -p tsconfig.json`, `npx eslint src --max-warnings=0`, `npx vitest run` (cwd `apps/web`) → typecheck/lint clean; **124 files, 1382 passed, 0 failed**.
- **Playwright, full suite, three consecutive runs (external-stack mode, EP15J precedent):** throwaway DB `studypilot_ep15k_e2e` (migrated), `pnpm start:e2e` (cwd `apps/api`, `PORT=4200`, shell-only placeholder `JWT_SECRET`, `FRONTEND_URL=http://localhost:3200`), `pnpm exec vite --port 3200 --strictPort` with `E2E_API_PROXY_TARGET=http://localhost:4200`, then `E2E_BASE_URL=http://localhost:3200 npx playwright test` (cwd `apps/web`) → **62 passed / 0 failed** × 3 (20.7 s, 19.4 s, 19.6 s). No spec drags a chip (EP15J covers drag-select only), so no e2e change was needed. Servers stopped and the database dropped afterwards.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP15K-01 | EP15K-AC1 wiring; `schedule.service.ts` `updateBlock` split | The story's Apply sequence ("`DELETE` the one-off, then `PATCH` the series with `effectiveFrom`") would leave the dragged day cancelled in **every** following week: a split moves exception rows dated `≥ effectiveFrom` to the new series, and the drop had just cancelled `effectiveFrom` itself. | **Fixed in this child:** Apply runs `PUT restore` → `DELETE one-off` → `PATCH`. The order also bounds partial failure to "the day shows twice" (visible, removable), never "the day is gone". Ordering note added to contracts § API. Test: "Apply (same-day move) … (F-EP15K-01 order)". | implementer — closed |
| F-EP15K-02 | EP15K-AC1 | The AC says Apply works for drops "to any position (same day or another day)" but its wiring names only a time PATCH; a cross-day series change needs a weekday rule the story does not define. | **Implemented (flag for the reviewer):** cross-day Apply swaps the source weekday for the target's in the series' `weekdays`, from the earlier of the two dates, keeping the dropped times; when the target weekday is already in the series nothing changes and one sentence says why. The client reads `GET /schedule/blocks` at tap time (no `GET /schedule/blocks/:id` exists — F-EP15G-04 / BL-15-09). | reviewer to confirm the rule |
| F-EP15K-03 | EP15K-AC2; WCAG 2.2.1 | A fixed 10 s window on a control is a time limit. | **Implemented:** the countdown pauses while focus or the pointer is inside the strip and restarts in full on leave; closing only removes the shortcut — every outcome stays reachable through the block's details and sheet. Apply itself has no Undo (AC2 covers drag outcomes); an applied series change is edited back through the sheet. | reviewer to confirm |

Deviations: none beyond the findings. Files outside the story's list: `gridModel.ts` (+ test) for `weekdayNumberOf`, `CalendarEventChip.tsx` for `showResizeHandle`, `scheduleBlockApi.ts` (+ test) for the client.

## How to verify by hand (for the reviewer's DoD-11 section)

Not executed in this session — no interactive browser; user instructions:

1. On `/calendar` (desktop width), drag a **weekly** event 1 h down on its own day. Expected: no dialog; the status line reads "Moved to <Day> HH:MM–HH:MM for this day"; a strip shows **Apply to every week from here** and **Undo**.
2. Tap **Apply to every week from here**. Expected: next week's occurrence shows the new time; this week's day shows once; the strip closes.
3. Drag a weekly event to **another day**, then tap **Undo** within 10 s. Expected: "Undone — back to …"; the original day shows again and the moved copy is gone.
4. Drag a one-off event; wait 10 s without touching the strip. Expected: the strip disappears. Repeat and Tab into the strip: it stays while focused.
5. On a study block taller than 1.5 h, hover the zone: the resize grip shows at the zone's bottom edge; drag it to extend the block.
6. With a screen reader: each drop announces one sentence; the strip's buttons are not read as status.

## Fix round 1 (review pass 1, 2026-11-17)

Review: [review.md](./review.md) — Changes Required (R-EP15K-01, -02 Should-fix; -03…-05 Polish).

| Finding | Fix | Evidence |
|---|---|---|
| R-EP15K-01 — cross-day Apply at a series' first/last date left the dropped-on day empty | The PATCH body now also carries `startDate: effectiveFrom` when the target precedes the series start (in-place update), and `endDate: next.date` when the target follows the series end (split successor). | Page tests "R-EP15K-01 … moves the series start" / "… extends the series end" (exact bodies); DB-backed `schedule-e2e.spec.ts` "cross-day Apply at series edges" proves both bodies yield an occurrence on the dropped-on day via `GET /calendar/events`. |
| R-EP15K-02 — manual pass not executed | **Open — user-owned.** No interactive browser in this session; the steps are in review.md § How to verify by hand. | — |
| R-EP15K-03 — the strip shifted the grid | The status line and the strip share one reserved row (`min-h-9`), present whether or not the strip shows. | Page test "R-EP15K-03 … always reserved". |
| R-EP15K-04 — multi-weekday Apply silently retimes the other days | Apply reads the series for same-day drops too; when the resulting series has more than one weekday the sentence ends ", on all its days". | Page tests (updated same-day move/resize sentences; new single-weekday test keeps the plain sentence). |
| R-EP15K-05 — failure copy and the record's claim too broad | Step-specific failure sentences (`APPLY_FAIL_BY_STEP`); the F-EP15K-01 disposition above narrowed. | Page test "R-EP15K-05 … per step" (three steps). |

Verification after the fix (working tree before commit, 2026-11-17): `npx jest --runInBand` (cwd `apps/api`, throwaway DB `studypilot_ep15k_fix`, dropped) → **85 suites, 1785/0**; `apps/web` `npx tsc --noEmit`, `npx eslint src --max-warnings=0` clean, `npx vitest run` → **124 files, 1387/0**. Playwright not re-run: no spec drags a chip; the row change adds no e2e-visible behaviour beyond the calendar spec's existing locators, which the reviewer may re-run.
