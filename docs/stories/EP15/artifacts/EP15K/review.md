# EP15K review — Calmer Weekly-Drag Outcomes (own review unit)

**Date:** 2026-11-17
**Pass:** 2 (re-review). Pass 1 is preserved verbatim at [review-round-1.md](./review-round-1.md).
**Mode:** `parent_review` (standalone unit EP15K)
**Reviewed commit:** `816bffa` (clean tree). Changed scope: `git diff bd4a155 816bffa` (`CalendarPage.tsx`, `CalendarPage.drag.test.tsx`, `schedule-e2e.spec.ts`, implementation.md "Fix round 1", and the pass-1 report). Cross-cutting behaviour is re-checked below.
**Implementer account:** [implementation.md § Fix round 1](./implementation.md#fix-round-1-review-pass-1-2026-11-17), used as a map only. Each closure below cites evidence the reviewer executed.

## Verdict

**Changes Required — only because R-EP15K-02 is still open.** R-EP15K-02 is a Should-fix: the TR-E15-11-style manual pass has not been executed and there is no recorded user confirmation. **Every other finding (R-EP15K-01, -03, -04, -05) is closed** against `816bffa`. No code change is outstanding. Once the user records a confirmation (or executed evidence) for the manual pass, this unit has no open blocker or should-fix. That is the same closure path R-EP15-19 used.

## Findings

| ID | Severity | Status (pass 2) | Issue (pass 1) | File:line (now) | Closure evidence / remaining condition | Owner |
|---|---|---|---|---|---|---|
| R-EP15K-01 | Should-fix | **Closed** | Cross-day Apply left the dropped-on day empty at a series' first or last date | `apps/web/src/pages/calendar/ui/CalendarPage.tsx:540-550` | The body now adds `startDate: effectiveFrom` when `effectiveFrom < series.startDate`, and `endDate: next.date` when `next.date > series.endDate`. I re-ran the reviewer's reproduction with these bodies against a throwaway DB, and both cases now occupy the dropped-on day (details below). New DB-backed tests `schedule-e2e.spec.ts:298-353` (`describe` at `:300`) and page tests "R-EP15K-01 …" (exact bodies) pass. | implementer — done |
| R-EP15K-02 | Should-fix | **Open** | The story's TR-E15-11-style manual pass was not executed and has no user confirmation | story § Definition of Done; § How to verify by hand below | Run the steps below with recorded evidence, or have the user record a dated confirmation (substance and scope) in EP15 `history.md`, as for R-EP15-19. Neither the implementer nor the reviewer had an interactive browser. | user |
| R-EP15K-03 | Polish | **Closed** (one residual, unverified) | The strip shifted the grid | `CalendarPage.tsx:750-812` (grid banner now `:814`) | The status line and the strip now share one always-present row, `min-h-9` (36 px). A `sm` button (`py-1.5` + `text-body-sm`) fits in it, so the common case no longer moves the grid; page test "R-EP15K-03 …" passes. **Residual:** the row is `flex-wrap`. At narrow desktop widths, a long sentence plus both buttons can wrap onto a second line. Without a browser I can't confirm or rule this out, so it is covered by manual step 7. It doesn't block, being Polish. | implementer — done |
| R-EP15K-04 | Polish | **Closed** | Multi-weekday Apply retimed the other days without saying so | `CalendarPage.tsx:520-524`, `:555-557` | Apply now reads the series for same-day drops too. When the resulting series has more than one weekday, the sentence ends ", on all its days", and it is still one sentence. Tests: updated same-day move and resize sentences; the new single-weekday test keeps the plain sentence. | implementer — done |
| R-EP15K-05 | Polish | **Closed** | The failure copy and the record's claim were too broad | `CalendarPage.tsx:127-148`, `:488`, `:552-554`; implementation.md F-EP15K-01 | Each step now has its own failure sentence (`APPLY_FAIL_BY_STEP`), and each one matches the actual state after that step fails. A failed read or restore means nothing changed. A failed delete after a successful restore shows the day twice. A failed PATCH after the restore and delete puts the day back where it was. `FollowUpFailure` extends `Error` under TS target ES2020, so `instanceof` holds. Page test "R-EP15K-05 … per step" covers all three steps. The record's claim was narrowed in Fix round 1. | implementer — done |

No new findings.

### R-EP15K-01 — independent re-verification

I re-ran the same scratch Jest spec as pass 1 (outside the repo, throwaway DB `studypilot_ep15k_review2`, dropped afterwards). It replays POST one-off → DELETE occurrence → PUT restore → DELETE one-off → PATCH. This time the PATCH body is built with the client's new edge rule, and the spec reads `/calendar/events` for 2026-11-16…29:

- **Case 1:** the first occurrence of a Wed series (2026-11-18) is dragged to Tue 11-17 and applied. Body: `{ weekdays:[2], startTime, endTime, effectiveFrom:"2026-11-17", startDate:"2026-11-17" }` → 200. This is the in-place path, and the row is now `startDate 2026-11-17, weekdays [2]`. Events: **2026-11-17**, 2026-11-24.
- **Case 2:** the last occurrence of a Wed series (2026-11-04…2026-11-18) is dragged to Thu 11-19 and applied. Body: `{ weekdays:[4], …, effectiveFrom:"2026-11-18", endDate:"2026-11-19" }` → 200. Rows: `[11-04…11-17, Wed]` + `[11-18…11-19, Thu]`. Events: **2026-11-19**.

Rule check against `schedule.service.ts` (`updateBlock`, split only when `effectiveFrom > startDate`):

- **Case 1:** only `effectiveFrom ≤ startDate` reaches this branch, which is the in-place path, so the merged `startDate` is the dropped-on date.
- **Case 2:** the extended `endDate` lands on the successor of the split, or on the in-place row for a single-occurrence series. In both cases the target date is included.
- **Effect on the original series:** the original row's end is still `effectiveFrom − 1` (case 2 shows `11-17`), so earlier weeks are unaffected.
- **Validation:** the merged values pass `validateBlockValues`: `endDate ≥ startDate`, and the weekdays are valid.
- **Interaction with the restore order:** the F-EP15K-01 restore-before-PATCH order is unchanged (`:552-554`), so neither edge body brings back the stale exception.

## Cross-cutting behaviour (changed scope)

- **Same-day Apply now issues a GET first.** If the read fails, nothing has changed and the copy says the move still stands. The order restore → delete → PATCH is unchanged, and test `:314` still asserts it.
- **Live region unchanged.** The `role="status"` element is still a separate node. The strip (`role="group"`, "Last change") sits beside it in the same row, outside the live region. Test "R-EP15K-03 …" asserts both are in the row. The AC4 containment and parity tests still pass.
- **No other drop paths touched.** One-off drops, Undo chains, the timer, and the API restore endpoint are byte-identical to `bd4a155`, so the pass-1 dispositions for AC2, AC3 and the ownership matrix carry over without re-execution, apart from the suite re-runs below.

## AC table

| AC | Disposition | Evidence |
|---|---|---|
| EP15K-AC1 | **Satisfied** (was Partially) | R-EP15K-01 closed; tests listed above; reviewer reproduction |
| EP15K-AC2 | **Satisfied** (unchanged) | pass-1 evidence; suites re-run green |
| EP15K-AC3 | **Satisfied** (visual position CANNOT VERIFY outside jsdom → R-EP15K-02) | pass-1 evidence; unchanged files |
| EP15K-AC4 | **Satisfied** | Still one sentence per announcement (R-EP15K-04 suffix included); no new dialog or primary control; the reserved row adds no animation |

## DoD table (story DoD: 1, 5, 6, 8 + manual pass)

| Item | Disposition | Evidence |
|---|---|---|
| 1 — functional ACs | **PASS** | AC table above |
| 5 — loading / error states | **PASS** | Step-specific failure copy, buttons disabled while busy, refetch on failure; test "R-EP15K-05 …" |
| 6 — keyboard | **PASS** (inspection + jsdom) | Unchanged from pass 1; screen-reader behaviour → R-EP15K-02 |
| 8 — business rules tested | **PASS** | The pass-1 gap is closed: series-edge Apply is covered in both the DB-backed e2e and the page tests |
| Security / ownership | **PASS** | No API source change in this round; the scoping suite re-ran green |
| TR-E15-11-style manual pass | **CANNOT VERIFY** | R-EP15K-02 open |

## Verification (reviewer-executed, 2026-11-17, tested state `816bffa`, clean tree)

| Command | cwd | Result |
|---|---|---|
| `createdb studypilot_ep15k_review2`; `DATABASE_URL=postgres://<local user>@localhost:5432/studypilot_ep15k_review2 npx prisma migrate deploy` | `apps/api` | all migrations applied |
| scratch reproduction (outside repo), `npx jest --runInBand -c <scratch>/jest.config.json` | `apps/api` | 2/2 executed; both edge cases now produce an occurrence on the dropped-on day (see above) |
| `npx tsc --noEmit -p tsconfig.json` | `apps/api` | exit 0 |
| `DATABASE_URL=… npx jest --runInBand` | `apps/api` | **85 suites, 1785 passed, 0 failed** (pass 1: 1783 + the 2 new edge tests) |
| `DATABASE_URL=… npx jest --runInBand --verbose src/modules/schedule/schedule-e2e.spec.ts` | `apps/api` | 60/0; both "cross-day Apply at series edges (R-EP15K-01)" tests are listed as passed, so the gated suite ran live |
| `dropdb studypilot_ep15k_review2` | — | dropped; `psql -l` shows no `ep15k` database |
| `npx tsc --noEmit -p tsconfig.json` | `apps/web` | exit 0 |
| `npx vitest run` | `apps/web` | **124 files, 1387 passed, 0 failed** |
| Playwright | — | Not run (optional). No spec drags a chip, and the only DOM change is the reserved row wrapper. |

`DATABASE_URL` was set only in the shell, and no `.env*` file was read.

## Prior findings (pass 1 → pass 2)

R-EP15K-01 is resolved, R-EP15K-02 is still open, and R-EP15K-03, -04 and -05 are resolved. The evidence for each is in the findings table above.

## How to verify by hand

Prerequisites: a local stack against a disposable database and a throwaway student account. Desktop width ≥ 640 px. Create one weekly BUSY event (Mon/Wed/Fri 09:00–10:00, starting at least two weeks ago), one one-off event, and one weekly study block 09:00–12:00.

1. **Weekly same-day move.** Drag the Wed occurrence 1 h down. Expected: no dialog; the status reads "Moved to Wed 10:00–11:00 for this day"; **Apply to every week from here** and **Undo** appear beside it in the same row, and the grid does not move. — *Not executed — user instructions*
2. **Apply (same day).** Tap Apply within 10 s. Expected: "Moved to Wed 10:00–11:00 for this and following weeks, on all its days"; this Wed shows once at 10:00; next week's Mon/Wed/Fri show 10:00; the strip closes. — *Not executed — user instructions*
3. **Cross-day + Undo.** Drag Wed to Thu, then tap **Undo**. Expected: "Undone — back to Wed 09:00–10:00"; Wed shows again and the Thu copy is gone. — *Not executed — user instructions*
4. **Cross-day Apply.** Drag Wed to Thu and tap Apply. Expected: the series runs Mon/Thu/Fri at the dropped time from this week. Then drag Wed to Fri and tap Apply. Expected: "This already repeats on Fri — change it from its details", and Undo stays. — *Not executed — user instructions*
5. **Series edges (R-EP15K-01).** (a) Create a Wed-only event starting this Wednesday, drag it to Tuesday, and tap Apply. Expected: Tuesday shows it this week and every week. (b) Create a Wed-only event that ends this Wednesday, drag it to Thursday, and tap Apply. Expected: Thursday shows it. — *Not executed in a browser — user instructions; API-level reproduction executed 2026-11-17 (both pass, see R-EP15K-01)*
6. **One-off Undo and timer.** Drag the one-off and wait 10 s. Expected: the strip disappears. Drag it again, Tab into the strip and wait more than 10 s. Expected: the strip stays while focused and closes 10 s after focus leaves. Repeat with the mouse hovering over the strip. — *Not executed — user instructions*
7. **No layout shift (R-EP15K-03 residual).** At about 700 px and at about 1280 px width, drop a weekly item on a multi-weekday series. Expected: the grid's top edge does not move when the strip appears or when it closes. — *Not executed — user instructions*
8. **Zone-edge handle (AC3).** Hover the 09:00–12:00 study block. Expected: the grip shows at the zone's 12:00 edge. Drag it 1 h down and expect "Resized to 09:00–13:00"; Undo restores 12:00. An EVENT chip still shows its handle at the chip's bottom. — *Not executed — user instructions*
9. **Screen reader (VoiceOver).** Each drop and each Apply announces exactly one sentence; the strip's buttons are not read as status; the strip is announced as the group "Last change". — *Not executed — user instructions*
10. **Reduced motion.** With *Reduce motion* on, drop, Apply, and Undo. Expected: no animation on the strip or the grid. — *Not executed — user instructions*
11. **Failure copy (R-EP15K-05).** With the API stopped after a drop, tap Apply. Expected: "We couldn't change every week — your move for this day still stands." — *Not executed in a browser — user instructions; covered by jsdom test "R-EP15K-05 … per step"*
12. **Negative / ownership.** As student B, `PUT /schedule/blocks/<A's block id>/occurrences/<date>` → 404 `Resource not found`, and A's cancellation survives; a malformed date → 400; no token → 401. — *Executed — 2026-11-17, gated API suite in throwaway DB `studypilot_ep15k_review2` (`schedule-data-scoping.spec.ts`, `schedule-e2e.spec.ts` green)*
13. **Narrow viewport.** Below 640 px the agenda has no drag surface and no strip. — *Not executed in a browser — user instructions; covered by jsdom test `CalendarPage.drag.test.tsx` "below sm"*

## Addendum — R-EP15K-02 closed by the user (2026-11-18, recorded by the live session)

The user confirmed in chat on 2026-11-18: "Yes, EP15k walk through pass." That covers the **How to verify by hand** steps above (the drag and Apply flows, Undo and the 10 s window, the zone-edge resize grip, the reserved strip row at narrow desktop widths, and screen-reader announcements). It is the same closure path as R-EP15-19. With R-EP15K-02 closed, no blocker or should-fix remains, so the unit **passes**: pass 2's findings at `816bffa` plus this confirmation. This addendum records the confirmation; it does not change the report body.

