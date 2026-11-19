# EP16 combined review — pass 2

**Date:** 2026-11-18
**Reviewer:** parent_review (fresh session, independent; same reviewer identity as pass 1)
**Reviewed commit:** `4f9ecd1` (clean working tree; worktree `oak`)
**Pass 1:** [review-round-1.md](./review-round-1.md) (moved verbatim; verdict Changes Required at `0827fe4`, committed `d9cb563`).
**Scope of this pass:** the R-EP16-01 correction commit `4f9ecd1` — EP16C's two error states plus the five sibling tinted sites and the two new test assertions — re-verified against the fix; cross-child behavior re-checked on the changed surfaces; everything pass 1 verified at `0827fe4` and `4f9ecd1` did not touch is carried forward by reference (the only code delta since pass 1 is `4f9ecd1`'s eight `apps/web` files; `d9cb563` is docs-only).

## Prior findings — disposition

| ID | Pass-1 severity | Disposition at `4f9ecd1` | Evidence (reviewer-gathered) |
|---|---|---|---|
| R-EP16-01 | Should-fix | **Resolved — closed.** `text-danger-strong` on both sites: `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx:161-163` and `apps/web/src/pages/plan/ui/PlanPage.tsx:114`; class assertions added in `PlanProposal.test.tsx:306-311` (error-card case) and `PlanPage.test.tsx:134-135` (failed-read case) — both re-run green by this reviewer. Token-level contrast check: `danger-strong` rgb(185 28 28) on the blended tint (10 % danger over `--color-surface` white → ≈ rgb(252 233 233)) computes to **≈ 5.54:1** ≥ 4.5:1; on plain white ≈ 6.47:1. Diff inspected (`git show 4f9ecd1`): the change is exactly the token swap plus tests, nothing else. | focused vitest (below); diff + computation |
| R-EP16-02 | Polish | **Resolved — folded into the fix**, per the closure option pass 1 offered. All five named sibling sites now use `danger-strong`: `TodayPlanCard.tsx:87,182`, `FocusPage.tsx:70`, `WorkloadWarnings.tsx:50`, `RemainingWorkSection.tsx:76-78` (reviewer-verified in the working tree — a repo-wide grep finds no plain `text-danger` left in any of the seven files). The *wider* pre-existing population is new finding R-EP16-05 below. | grep sweep; diff |
| R-EP16-03 | Polish | **Open — tracked, does not block** (polish). The unverified-student banner residual (AC-E16-02 at 360×640) is held by the existing backlog row **BL-16-08** (EP16 README backlog, reviewer-verified present) with the trigger "next story touching the verification banner / first-run usage check". That satisfies the closure's tracking half; the residual itself closes when BL-16-08 lands or the user re-rules. | `docs/stories/EP16/README.md` backlog table |
| R-EP16-04 | Polish | **Open — tracked, does not block** (polish). Full-suite instability under cross-session load is held by the existing row **BL-15-08** (EP15 README `:149`, reviewer-verified present: env-derived ports/DB name + the journey-5 parallel-load flake). Pass-2 runs added corroborating evidence (below) and no new mechanism. | `docs/stories/EP15/README.md:149` |

## New finding (this pass)

| ID | Severity | Requirement / source | Observed gap | Owner | Closure condition |
|---|---|---|---|---|---|
| R-EP16-05 | Polish | WCAG 2.2 AA target (epics README); outside AC-E16-12's "new or changed" scope | The same `text-danger`-on-`bg-danger/10` pair (≈ 4.14:1) remains across **pre-EP16 surfaces EP16 never changed**: page error blocks (`AssignmentsPage.tsx:285`, `CalendarPage.tsx:681`, `StudyHistoryPage.tsx:161`), dialog/form error boxes (`DeleteAssignmentDialog`, `DeleteSubtaskDialog`, `DeleteSemesterDialog`, `DeleteMeetingDialog`, `ArchiveCourseDialog`, `AssignmentForm:406`, `CourseForm:459`, `MeetingForm:227`, `StudyPreferencesForm:383`, `BlockSheet:531`, `DayBoundsSheet:218`, `StartFocusSessionDialog:133`, `FinishSessionDialog:209`, `FocusTimer:147`), and the tinted badge styles (`shared/ui/Badge.tsx:16` danger variant, `assignmentPresentation.ts:35,65`, `AssignmentRow.tsx:217`). None is an EP16 deliverable; several sit on surfaces whose axe stops never render their error state. | planner | A backlog row for an app-wide `danger-strong` sweep of tinted error/badge text (natural companion to BL-16-06's copy sweep) |

**Boundary verified as asked:** every remaining plain `text-danger` inside EP16-touched files sits on a white/card background, where rgb(220 38 38) computes to ≈ 4.83:1 ≥ 4.5:1 — `CatchUpLockToggle.tsx:80`, `PlanSessionEditor.tsx:304` (both on white cards), and the form-field error pattern (`Input.tsx:103`, `Select.tsx:68`, etc.). Leaving those as `text-danger` is correct.

## Reviewer-executed verification (pass 2)

All at `4f9ecd1`, clean tree, 2026-11-18, cwd `apps/web` unless stated.

| # | Command | Result | Exit |
|---|---|---|---|
| 1 | `npx vitest run src/features/plan-proposal src/pages/plan src/features/today-plan src/pages/focus src/features/study-plan` (every `4f9ecd1`-changed source area, incl. both new class assertions) | **133 passed / 0 failed** | 0 |
| 2 | `npx tsc --noEmit -p tsconfig.json` | clean | 0 |
| 3 | `npx eslint src --max-warnings=0` | clean (read-only) | 0 |
| 4 | `npx vitest run` (full, three attempts under cross-session load ≈ 13–19) | attempt 1: 1436/1440; attempts 2–3: 1437/1440 — every failure a Testing-Library `waitFor` timeout in `CourseForm.test.tsx` (EP02) and/or `CalendarPage.test.tsx` (EP15G), **files `4f9ecd1` does not touch** (verified against the diff) that passed **213/213 in an isolated run** and passed in this reviewer's pass-1 full run at `0827fe4` (1440/0). Load-induced; same family EP16D's record disclosed ("CourseForm timeout under full-suite load, passed in isolation"). | — |
| 5 | `npx playwright test plan-flow.spec.ts today.spec.ts navigation.spec.ts` (self-contained, throwaway DB `sp_rev_ep16_p2_1795050500` created and dropped by the reviewer; ports :4100/:3100 verified clear) | **20 passed / 0 failed** (23.3 s) — all EP16 journeys incl. every axe stop, the lock-preservation journey, the redirect matrix, and the 320 px pair | 0 |
| 6 | `grep` sweep for plain `text-danger` on tinted blocks in the seven R-EP16-01/02 files | none left | 0 |

**Implementer-provided (cited as such):** full vitest **134 files / 1440 passed** at `4f9ecd1`; tsc and eslint clean (commit message of `4f9ecd1`). Consistent with items 1–4: the three flaky tests are outside the fix and pass in isolation; this reviewer's own full-green run of the identical suites at `0827fe4` plus item 1's focused green over the whole delta covers DoD-8 end to end.

**Unchanged-code evidence carried from pass 1 at `0827fe4`** (no code touching them has changed since): API gate 12 suites / 291 passed; `git diff --stat 8d69995..HEAD -- apps/api` still empty at `4f9ecd1` (the two new commits touch `apps/web` and `docs/` only — verified from their stat lists); full e2e aggregate (every one of the 73 journeys green across reviewer runs); EP16G security tests on the real store; all per-child AC code inspections.

## AC / DoD deltas against pass 1

- **Per-child ACs:** unchanged — all satisfied as in [review-round-1.md](./review-round-1.md) § Per-child AC outcomes. The `4f9ecd1` delta touched no AC-bearing behavior (token classes + tests only); EP16C-AC1/AC2 re-confirmed by items 1 and 5 above.
- **DoD-1:** pass-1's single FAIL item (AC-E16-12 contrast on EP16C error states) is **closed** → **PASS**. All other DoD rows unchanged from pass 1 (2 N/A; 3–11 PASS).
- **Epic AC coverage:** AC-E16-12 moves from "partially satisfied" to **satisfied** (keyboard, live regions, reduced motion, labels verified in pass 1; the contrast defect fixed and reviewer-verified; the remaining tinted pair lives only on pre-EP16 surfaces — R-EP16-05, outside this epic's obligation). AC-E16-02 stays "satisfied with recorded residual" (BL-16-08, user-accepted — R-EP16-03). All other epic ACs as in pass 1: satisfied.
- **Docs accuracy:** the parent index § 6 item 3 no longer claims the EP16C sites were "pre-existing" (corrected in `4f9ecd1`); history.md carries the round-1 correction entry. Pass-1's inaccuracy note is thereby closed.

## Verdict

**Pass — the EP16 review unit (EP16A, EP16G, EP16B, EP16C, EP16D, EP16E, EP16F, EP16H, EP16I) passes at `4f9ecd1`: R-EP16-01 and R-EP16-02 are closed against verified, committed corrections; the only open findings are Polish (R-EP16-03 → BL-16-08, R-EP16-04 → BL-15-08, R-EP16-05 → planner backlog), and no blocker or should-fix remains.**

Passing-sync applied per `.agents/skills/reviewer/passing-sync.md` (queue rows → Reviewed, story status lines, history entries, parent-index status line, this report's links); see the sync commit.

## How to verify by hand

Pass-1's section ([review-round-1.md](./review-round-1.md) § How to verify by hand) remains the unit's full walkthrough; its labels stand. Pass-2 additions:

1. **Fixed contrast (R-EP16-01/02)** — **Executed — 2026-11-18, this environment, `4f9ecd1`**: diff inspection (token swap only), token computation (`danger-strong` ≈ 5.54:1 on the tint), the two new class assertions re-run green, and a grep proving no tinted `text-danger` remains in the seven files. Browser spot check: Not executed — user instructions: stop the API, open `/plan` and `/plan/proposal` — the error text is now the darker red on the pink tint; compare any EP03 dialog error (still the lighter red, R-EP16-05's pre-existing population).
2. **EP16 journeys at the fix commit** — **Executed — 2026-11-18, self-contained stack, throwaway DB**: `today.spec.ts`, `navigation.spec.ts`, `plan-flow.spec.ts` → 20/20 incl. all axe stops.
3. **Full suites** — **Executed** as itemized above (focused 133/0; full runs green except two load-flaky, EP16-untouched suites that pass 213/213 in isolation; implementer-provided 1440/0 at the same commit).
