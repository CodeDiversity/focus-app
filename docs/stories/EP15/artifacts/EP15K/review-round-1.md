# EP15K review — Calmer Weekly-Drag Outcomes (own review unit)

**Date:** 2026-11-17
**Pass:** 1
**Mode:** `parent_review` (standalone unit EP15K)
**Reviewed commit:** `bd4a155` (clean tree); baseline `2751504`; scope `git diff 2751504 bd4a155` (20 files, +665 / −147)
**Story:** [EP15K](../../EP15K-calmer-weekly-drag-outcomes.md) — ▲ D-K1 (a), ▲ D-K2 (a), D-K3 (a) ratified (user, 2026-11-17)
**Implementer record:** [implementation.md](./implementation.md) — used as a map only; every disposition below was re-derived from code, tests and executed reproductions.

## Verdict

**Changes Required** — R-EP15K-01 (Should-fix: cross-day "Apply to every week" silently loses the dropped day when the target falls outside the series' date range) and R-EP15K-02 (Should-fix: the story's TR-E15-11-style manual pass is unexecuted and has no recorded user confirmation) are open.

## Findings

| ID | Severity | Issue | File:line | Closure condition | Owner |
|---|---|---|---|---|---|
| R-EP15K-01 | Should-fix | Cross-day Apply builds `{ weekdays (swapped), startTime, endTime, effectiveFrom: earlier date }` without regard to the series' `startDate`/`endDate`. Target before `startDate` → PATCH goes in-place and keeps `startDate`, so the dropped-on day is empty this week; later date after `endDate` → the successor has zero occurrences and the source day is gone too. Both return 200 and announce "… for this and following weeks". Reproduced (below). | `apps/web/src/pages/calendar/ui/CalendarPage.tsx:489-521` (body at 511-516) | Apply produces an occurrence on the dropped-on date in both edge cases (for example send `startDate: next.date` when `next.date < series.startDate`, and extend `endDate` to cover the later date, or decline with one plain sentence as the "already repeats" branch does), and `CalendarPage.drag.test.tsx` gains a test for each edge case that asserts the PATCH body | implementer |
| R-EP15K-02 | Should-fix | The story's DoD requires a TR-E15-11-style manual pass. Nobody has run it (the implementer and this reviewer had no interactive browser), and there's no recorded user confirmation. Zone-edge handle visibility, the strip's hover pause, and screen-reader output have only jsdom evidence. | `docs/stories/EP15/EP15K-calmer-weekly-drag-outcomes.md` § Definition of Done; this report § How to verify by hand | The steps in § How to verify by hand get run and recorded with evidence, or the user records a confirmation (date + substance), as was done for R-EP15-19 | user (execution/confirmation); implementer (records) |
| R-EP15K-03 | Polish | The follow-up strip is inserted in normal flow above the day-bounds banner and grid (`mb-3`). Its appearance after a drop and its disappearance 10 s later shift the whole grid vertically under the pointer, which works against D15-14's calm-UI goal. | `CalendarPage.tsx:727-769` (strip) vs `:771`/`:788` (banner/grid) | The strip occupies reserved space or an overlay slot so the grid does not move; or the user accepts the shift as it is | implementer |
| R-EP15K-04 | Polish | On a multi-weekday series, Apply also retimes every other weekday from `effectiveFrom` (inherent: a series has one time). The sentence "Moved to Thu 14:00–15:00 for this and following weeks" doesn't say that Mon/Fri move too. | `CalendarPage.tsx:515-521`, `dropAnnouncement` `:82-94` | The announcement (or the button label) names the series-wide time change when `series.weekdays.length > 1`; or the user accepts the current copy | implementer / planner (copy) |
| R-EP15K-05 | Polish | If the final PATCH fails after restore and delete succeed, the week returns to its pre-drop state, so the student's "just this day" move is also undone. The toast only says "We couldn't change every week". The record's claim that a mid-chain failure at worst shows the day twice covers the restore→delete step only. | `CalendarPage.tsx:455-470`, `:518-520`; `implementation.md` F-EP15K-01 | The failure copy says the day went back, or the record's claim is narrowed to match | implementer |

### R-EP15K-01 — details and reproduction

**Rule check (F-EP15K-02, which asked the reviewer to confirm).** I agree with the swap rule (replace the source weekday with the target weekday, from the earlier of the two dates, keep the dropped times, decline when the target weekday is already in the series) for the normal case. In that case it gives "the dropped-on day, every week from here". The rule fails only at the series' date bounds, because `updateBlock` (`apps/api/src/modules/schedule/schedule.service.ts:504-505`) splits only when `effectiveFrom > startDate`. Otherwise it updates in place and keeps `startDate`. The successor also keeps the original `endDate`, and validation (`:207-258`) does not reject a weekly row that has no occurrences.

**Reviewer reproduction.** This was a scratch Jest spec outside the repo, run against the throwaway DB `studypilot_ep15k_review` (dropped afterwards). It replays the client's exact chain: POST one-off → DELETE occurrence → PUT restore → DELETE one-off → PATCH.

- Case 1: Wed series starting `2026-11-18` (its first occurrence) dragged to Tue `2026-11-17` and applied. PATCH 200. The resulting row is `startDate 2026-11-18, weekdays [2]`, so its first occurrence is Tue 11-24 and **11-17 shows nothing**.
- Case 2: Wed series `2026-11-04…2026-11-18` with its last occurrence dragged to Thu `2026-11-19` and applied. PATCH 200. The rows are `[11-04…11-17, Wed]` + `[11-18…11-18, Thu]`. The successor has **zero occurrences**, so neither 11-18 nor 11-19 shows the block.

Apply has no Undo (F-EP15K-03, AC2 covers drag outcomes only), so the student loses the move they just made while being told it was applied. This doesn't reach Blocker: no other data is affected, the grid shows the result, and the sheet can recover it. It is an incorrect EP15K-AC1 outcome ("performs the series change"), so it is Should-fix.

### Restore-before-PATCH ordering (F-EP15K-01) — confirmed

Against contracts § API *PATCH semantics* and `schedule.service.ts:530-552`: a split moves exception rows dated `≥ effectiveFrom` to the successor. The drop has just cancelled `effectiveFrom` itself (same-day) or the source date (cross-day, ≥ the earlier date). With the story's literal order (DELETE one-off → PATCH), that exception would move to the new series and the day would stay cancelled in the new series. In the in-place case (`effectiveFrom ≤ startDate`) it would stay cancelled this week. Restoring first is therefore required, and `CalendarPage.tsx:518-520` does it. The deviation from the AC's wording is justified and recorded in contracts.md.

## AC table

| AC | Disposition | Evidence |
|---|---|---|
| EP15K-AC1 — weekly drops save "just this day" with no dialog; announced; one-tap "Apply to every week from here"; the sheet's prompt unchanged | **Partially satisfied** (R-EP15K-01) | Dialog and `WeeklyChoicePrompt` import removed from the page (`CalendarPage.tsx` diff); `resolveDrop` `:532-586` routes every weekly drop through `thisDayDrop` (`:422-449`); Apply `:489-521`; `BlockSheet`/`WeeklyChoicePrompt` untouched in the diff. Tests `CalendarPage.drag.test.tsx:287,314,337,357,390` pass. Edge cases at the series bounds fail (repro above). |
| EP15K-AC2 — Undo for 10 s on every drag outcome, restores exactly; documented inverse of the occurrence cancel | **Satisfied** | One-off undo body mirrors the drop body field-for-field (`:548-558`); weekly undo = restore → delete one-off (`:474-478`); timer `:209-213`, paused by focus/hover (`:735-745`). API `restoreOccurrence` `schedule.service.ts:650-676` (date check before lookup, `where: { id, userId }`, uniform 404, idempotent `deleteMany`); route `schedule.controller.ts:94-106` with `@CurrentUser()`; contracts.md row + semantics paragraph. Tests: service spec (3), e2e round-trip + 401, scoping matrix (B→A 404 with A's exception intact; malformed/unknown ids), web `:406,436,447`, `scheduleBlockApi.test.ts`. |
| EP15K-AC3 — study-block zone handle on the zone's bottom edge; End field unchanged; EVENT chips keep the chip handle | **Satisfied** (visual position CANNOT VERIFY outside jsdom → R-EP15K-02) | `WeekGrid.tsx:622` (`group` on zone), `:646` (`showResizeHandle={false}`), `:653-663` (zone strip, `bottom-0`, `aria-hidden`, `tabIndex -1`, `stopPropagation` via `onHandlePointerDown` `:347-348`); `CalendarEventChip.tsx:214`. Tests `WeekGrid.drag.test.tsx` (handle placement; 09:00–12:00 block resized from its 12:00 edge). |
| EP15K-AC4 — no new dialog, no new primary control, one plain sentence, reduced motion + AC-E15-10 parity hold | **Satisfied** (with Polish R-EP15K-03/-04) | Net −1 dialog; strip buttons `outline`/`ghost` `sm` (`:747-767`) in `role="group"` outside `role="status"`; no transition classes added; parity test `:519` and the WeekGrid reduced-motion test pass. |

## DoD table (story DoD: 1, 5, 6, 8 + manual pass)

| Item | Disposition | Evidence |
|---|---|---|
| 1 — functional ACs pass | **FAIL** | AC1 partially satisfied (R-EP15K-01) |
| 5 — loading / empty / error states | **PASS** | Buttons disabled while busy (`followUpBusy`); timer stops while busy; Undo/Apply failures toast, close the strip, and re-read the week (`:455-470`); test `:436`. R-EP15K-05 is about copy only. |
| 6 — keyboard accessibility | **PASS** (inspection + jsdom) | Strip buttons are native, Tab-reachable, and pause the timer on focus (test `:447`). Drag stays pointer-only, with the sheet as its keyboard equivalent (D-H3/D-H7, parity test). Screen-reader behaviour → R-EP15K-02. |
| 8 — business rules have automated tests | **PASS with gap** | Restore inverse fully covered (unit + gated e2e + ownership/404 matrix); Undo round-trip covered. No test for the cross-day series-bounds cases (closure folded into R-EP15K-01). |
| 9 (touched; not in story DoD) — API documented | **PASS** | contracts.md § API row + *Occurrence restore* + client ordering note |
| Security / ownership (core.md) | **PASS** | `findFirst({ where: { id, userId } })`, then the exception delete is reachable only through that block. Foreign, missing and malformed ids return the uniform 404 `Resource not found` (scoping spec run green). No secrets touched. |
| TR-E15-11-style manual pass | **CANNOT VERIFY** | Not executed by implementer or reviewer → R-EP15K-02 |

## Verification (reviewer-executed, 2026-11-17, tested state `bd4a155`, clean tree)

| Command | cwd | Result |
|---|---|---|
| `createdb studypilot_ep15k_review`; `DATABASE_URL=postgres://<local user>@localhost:5432/studypilot_ep15k_review npx prisma migrate deploy` | `apps/api` | all migrations applied |
| `npx tsc --noEmit -p tsconfig.json` | `apps/api` | exit 0 |
| `DATABASE_URL=… npx jest --runInBand` | `apps/api` | **85 suites, 1783 passed, 0 failed**, exit 0 (gated suites live, not skipped: verbose rerun of `schedule-e2e.spec.ts` + `schedule-data-scoping.spec.ts` → 66/0, both new restore tests listed as passed) |
| scratch repro spec (outside repo), `npx jest --runInBand -c <scratch>/jest.config.json` | `apps/api` | 2 cases executed; both show the R-EP15K-01 outcome (PATCH 200, dropped-on day without an occurrence) |
| `dropdb studypilot_ep15k_review` | — | dropped; confirmed absent from `psql -l` |
| `npx vitest run` | `apps/web` | **124 files, 1382 passed, 0 failed**, exit 0 |
| `npx tsc --noEmit -p tsconfig.json` | `apps/web` | exit 0 |
| Playwright | — | Not run by the reviewer (optional). The implementer recorded 62/0 ×3 in external-stack mode. No spec drags a chip, so it adds no EP15K evidence. |

`DATABASE_URL` was set only in the shell, and no `.env*` file was read.

## Prior findings

None: this is pass 1. Implementer findings: F-EP15K-01 is confirmed correct. For F-EP15K-02, the rule is confirmed for in-range dates and the bounds defect is R-EP15K-01. For F-EP15K-03, the pause-on-hover/focus design satisfies WCAG 2.2.1's "extend" intent (closing the strip removes only a shortcut, and every outcome stays reachable via the sheet); confirmed.

## How to verify by hand

Prerequisites: a local stack against a disposable database and a throwaway student account. Desktop width ≥ 640 px. Create one weekly BUSY event (Mon/Wed/Fri 09:00–10:00, starting at least two weeks ago), one one-off event, and one weekly study block 09:00–12:00.

1. **Weekly same-day move.** Drag the Wed occurrence 1 h down. Expected: no dialog; the status line reads "Moved to Wed 10:00–11:00 for this day"; a strip shows **Apply to every week from here** and **Undo**. — *Not executed — user instructions*
2. **Apply (same day).** Tap Apply within 10 s. Expected: "… for this and following weeks"; this Wed shows once at 10:00 and next week's Mon/Wed/Fri show 10:00; the strip closes. — *Not executed — user instructions*
3. **Weekly cross-day + Undo.** Drag Wed to Thu, then tap **Undo**. Expected: "Undone — back to Wed 09:00–10:00"; Wed shows again; the Thu copy is gone. — *Not executed — user instructions*
4. **Cross-day Apply (normal).** Drag Wed to Thu and tap Apply. Expected: from this week the series runs Mon/Thu/Fri at the dropped time. **Already repeats:** drag Wed to Fri and tap Apply. Expected: "This already repeats on Fri — change it from its details"; Undo stays. — *Not executed — user instructions*
5. **Edge (R-EP15K-01).** Create a weekly Wed event starting this Wednesday, drag it to Tuesday, and tap Apply. Expected after the fix: Tuesday shows the event this week and every week. Current behaviour: Tuesday is empty this week (reproduced at API level). — *Not executed in a browser — user instructions; API-level reproduction executed 2026-11-17 (see R-EP15K-01)*
6. **One-off Undo + timer.** Drag the one-off event and wait 10 s without touching the strip. Expected: the strip disappears. Repeat the drag, Tab into the strip, and wait more than 10 s. Expected: the strip stays while focused and closes 10 s after focus leaves. Repeat with the mouse hovering over the strip. — *Not executed — user instructions*
7. **Zone-edge handle (AC3).** Hover the 09:00–12:00 study block. Expected: the grip shows at the zone's 12:00 edge, not under the chip. Drag it down 1 h and expect "Resized to 09:00–13:00"; Undo restores 12:00. An EVENT chip still shows its handle at the chip's bottom. — *Not executed — user instructions*
8. **Screen reader (VoiceOver).** Each drop announces exactly one sentence; the strip's buttons are not read as part of the status; the strip is announced as the group "Last change". — *Not executed — user instructions*
9. **Reduced motion.** With *Reduce motion* on, drop and undo. Expected: no animation on the strip or the grid. — *Not executed — user instructions*
10. **Negative / ownership.** As student B, `PUT /schedule/blocks/<A's block id>/occurrences/<date>` → 404 `Resource not found`, and A's cancellation survives; a malformed date → 400; no token → 401. — *Executed — 2026-11-17, gated API suite in throwaway DB `studypilot_ep15k_review` (`schedule-data-scoping.spec.ts`, `schedule-e2e.spec.ts` green)*
11. **Narrow viewport.** Below 640 px the agenda has no drag surface and no strip. — *Not executed in a browser — user instructions; covered by jsdom test `CalendarPage.drag.test.tsx:535`*
