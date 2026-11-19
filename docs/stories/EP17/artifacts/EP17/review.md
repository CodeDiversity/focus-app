# EP17 — combined parent review (EP17A–EP17H)

**Reviewer:** reviewer session, 2026-11-19. **Pass:** 1 (first combined
review). **Reviewed commit:** `d8d226f` (branch
`hfi/9ae11317-13de-4365-8abb-4bf7e0e3c7f3/oak`), working tree clean at start
and at close apart from this report.
**Scope:** the whole EP17 unit as delivered — epic ACs AC-E17-01…14,
TR-E17-01…07, the shared DoD (11 items), the engine invariants, the
persisted-preference contract, security/ownership, accessibility, and the
ruled decisions D17-1…D17-17.
**Entry point:** [`artifacts/EP17/implementation.md`](./artifacts/EP17/implementation.md)
(the parent index), then each child's record.
**Baseline for the code diff:** `40e1e22..d8d226f` — 55 files, +6872 / −893,
excluding `b0f433c` (`docs(EP18)`, a concurrent planner's commit).

> **Verdict: Pass.** No blocker and no should-fix is open. Four polish
> findings (R-EP17-07…10) are recorded below with owners and closure
> conditions; none of them blocks sign-off. EP17 is approved.

---

## 1. Prioritized findings

| ID | Severity | Target | Summary | Owner |
|---|---|---|---|---|
| R-EP17-07 | Polish | `apps/web/src/features/plan-proposal/ui/PacingControls.tsx:64`; `apps/web/src/entities/study-preferences/model/pacingPresets.ts:52` | **Ruling on F-EP17G-01.** The filed mechanism is **not reachable** — `selectStudyDays` always returns exactly `min(weeklyGoalDays, 7)` days, so "Custom (4 days)" after choosing 5 cannot occur. A *different*, reachable divergence exists on the same line: for a student who never stored `weeklyGoalDays`, the proposal shows **"Custom (7 days)"** while Profile shows **"Steady — 3 days a week"**, and the control's second copy clause ("…it's the number of days you're aiming to show up") is then false. | EP17G (copy / display source) |
| R-EP17-08 | Polish | `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx:239` | **Ruling on F-EP17G-02.** Confirmed, and broader than filed: Profile's whole-bag `putStudyPreferences(data)` promotes an **unset** `weeklyGoalDays` to a stored `3`, which under ▲ D17-16 converts an unconstrained (7-day) planner into a 3-day one after a save the student made for an unrelated field. Not an AC breach — EP17G renders the study-days group with its instruction copy on the same form, so the value is visible and explained at the moment of saving — but it is a plan-shaping side effect of an unrelated save. | planner (follow-up story; EP18 candidate) |
| R-EP17-09 | Polish | `apps/web/e2e/today.spec.ts:151` | **Ruling on F-EP17H-03.** Neither flake masks anything EP17 touched, and the pass evidence is adequate (76/76 on four of seven full runs; no EP17-owned spec failed in any run). One correction to the record: `today.spec.ts:151` waits on `editable-week`, an **EP17E-owned** selector, so calling it "outside EP17's diff" is imprecise — the assertion is EP17's even though the timing failure is a cold-stack page-load one (5 of 6 passes; the API suite runs in 10 s, so no pacing-induced slowness is indicated). `adaptive-scheduling.spec.ts:288` is genuinely untouched (`git diff 056b1bf..HEAD` on that spec is 3 insertions / 4 deletions, all in journey 1). | planner / live session (backlog row alongside BL-15-08) |
| R-EP17-10 | Polish | `docs/stories/EP17/contracts.md` §3 | F-EP17B-01's one-line `evenShare` amendment (the one-sitting floor) and F-EP17C-03's denominator wording are still unwritten; `contracts.md` §3 already *describes* the floor in prose, so this is a tidy-up, not a contract gap. No implementer may write it; the reviewer may not either. | planner |

### Findings ruled closed with no action

- **EP17F's "What else changed" deviation** — the disclosure renders only
  when it has content. **Accepted.** EP17F-AC4's criterion is region order
  and rank (`EP17F-…md:207`); rendering an empty disclosure on a clean week
  would be a worse empty state and would work against DoD-5. The region
  exists and is tested in order whenever it has content.
- **EP17G's deviations** — `replan()` returning `{ ok, pacing? }` with the
  message in `PacingControls`, and preset copy in
  `entities/study-preferences/model/pacingPresets.ts`. **Accepted.** The
  shared copy module is what makes the Profile/proposal parity of AC-E17-08
  a single source rather than two wordings (verified: both surfaces import
  `GOAL_DAY_PRESETS` / `SPREAD_PRESETS` / `STUDY_DAYS_DESCRIPTION`), and the
  `{ ok, pacing? }` shape is what lets the announcement name the real new day
  count. Both sit inside frozen ACs.
- **F-EP17H-01** (a fourth raw-ISO call site where D17-17 named three).
  **Correctly handled.** `WorkloadWarnings.tsx` is rendered only from
  `PlanProposal`, so it is inside AC-E17-10's "anywhere on `/plan/proposal`"
  and outside every other frozen AC. Recording it as an addition to D17-17's
  *examples* rather than as a new decision is the right call.
- **F-EP17D-01.** Verified independently: `identity.spec.ts:38-40` and
  `scheduler.spec.ts:1275` both compare `placementOf(...)`, and neither
  snapshot file was touched (see §3).

---

## 2. Epic acceptance criteria

Verified by inspection of code and tests, not from the records.

| AC | Outcome | Evidence observed by this review |
|---|---|---|
| **AC-E17-01** pacing target bounds a day's take | **Satisfied** | `scheduler.ts:529-537` `dayTakeOf` = `min(budget, max(paceTarget, remaining − capacityAfter))`, seeded per day at `:787-795` and consumed in `placeBlock` at `:719-721` (`budget = min(dayBudget, paceLeftOf(item))`). `evenShareOf` (`:504-521`) is computed once from run-start inputs only. |
| **AC-E17-02** feasibility still wins | **Satisfied** | Rule 3's critical set (`scheduler.ts:783`) is built from `remaining > capacityAfter`, is **excluded from `paceLeft` entirely** (`:789-794`), and runs before the rotation (`:802-807`). `placeBlock` skips the rule-9b narrowing on the critical path (`:713-717`, `preferEnergy === false`), and `budgetLeft` is seeded from the **real** `dayBudgetOf` for every day (`:771-773`) — so the critical pass genuinely keeps real budgets. The bounded R-EP17-01 claim is stated as "no worse than rule 3", not "never a new deficit", in both `contracts.md` §3 and `scheduler.spec.ts:1181`/`:1204`, and the two adversarial fixtures assert exactly that. |
| **AC-E17-03** no minutes lost, categories unchanged | **Satisfied** | Classification at `scheduler.ts:836-880` is the pre-EP17 code path with the same four category values. `scheduler.spec.ts:1218-1254` asserts the per-category invariant across the whole battery at `spreadPercent` 0 / 70 / 100 — non-overdue `placed+deficit+deferred = remaining`, `OVERDUE` `deficit = remaining` with `placed` asserted alongside and `deferred = 0`, plus a closed category set. R-EP17-02 is met exactly as specified. |
| **AC-E17-04** pure, deterministic, byte-identical at "off" | **Satisfied** | No clock, randomness or I/O in `scheduler.ts` (only `new Date(\`${date}T00:00:00Z\`)` at `:181`, a pure parse of an argument, pre-existing). Selection is sorted on a unique `(free, index)` key (`:286-289`). **19/19** baseline fixtures byte-identical at `spreadPercent 0` and a two-run determinism check at 70/100 (`scheduler.spec.ts:1262-1292`); re-executed green by this review. |
| **AC-E17-05** at most the chosen study days; 7 reproduces today | **Satisfied** | `selectStudyDays` (`:280-290`), `normalBudgetOf` (`:472-473`), the full-horizon fallback (`:458-464`) and the two documented carve-outs. `count >= days.length` short-circuits to the whole window. Independently probed: the selection size is `min(count, 7)` even when six of seven days have zero free time. |
| **AC-E17-06** additive bag keys, legacy bags unchanged | **Satisfied** | `preferences.ts` — key list `:29`, defaults `:69`, bounds `:91`, validator, reader `:211`, projection `study-plans.service.ts:210`. No Prisma migration in the diff; 4 KB cap untouched. `preferences.spec.ts` green in the full run. |
| **AC-E17-07** `weeklyGoalDays` means one thing | **Satisfied** (see R-EP17-07 for a polish-level copy gap) | ▲ D17-16 implemented as two readers: `readPlanningStudyPreferences` (`preferences.ts:317-322`) used **only** by `gatherPlanData` (`study-plans.service.ts:1061`); the momentum read is `readStudyPreferences` at `study-sessions.service.ts:695` and is **verifiably unaffected** — default stays 3 (`preferences.ts:69`), and no other call site changed. The control now gates, and EP17G surfaces it with instruction copy on both surfaces (▲ D17-2's proviso met). |
| **AC-E17-08** levers changeable from the proposal; Profile parity | **Satisfied** | `PacingControls.tsx:96` writes only the changed key through the existing `PUT /study-preferences`, then `replan()` rebuilds in place; failure paths at `:97-102` / `:82-85` leave the proposal standing. Both surfaces import the same preset module. |
| **AC-E17-09** the week renders once, edited in place | **Satisfied** | `PlanSessionEditor.tsx` and its spec are **deleted** in the diff; `EditableWeek` / `EditableSessionCard` are the single rendering, with per-session day / start / end selects and move / shorten / lengthen / delete controls, each with an `aria-label`. |
| **AC-E17-10** human day labels, no raw ISO | **Satisfied** | One shared `features/study-plan/lib/dayLabel.ts`; four call sites converted (three named by D17-17 plus `WorkloadWarnings`); `<time dateTime>` keeps the ISO. V-17-4 is a real **page-wide negative test** (`PlanProposal.test.tsx:1006`) over `renderedStrings` (text + `aria-label`/`title`/`alt`), not a grep. |
| **AC-E17-11** one confirm, one decline, reachable | **Satisfied** | `ProposalActionBar.tsx` — exactly one **Use this plan** and one **Not now**, `fixed` with `z-20`, `bottom-[calc(3.5rem+env(safe-area-inset-bottom))]` below `md` and `md:bottom-0` above. Cross-checked against `widgets/tab-bar/ui/TabBar.tsx:17` (`bottom-0 z-30`, `pb-[env(safe-area-inset-bottom)]`) and `:28` (`min-h-14` = 3.5 rem): the offset is correct, and the bar sits **under** the tab bar's z-index so navigation wins. `PlanProposal.tsx:137` reserves `pb-24`. |
| **AC-E17-12** every EP16C guarantee survives | **Satisfied** | Conflict marking + the 409 summary (`PlanProposal.tsx:252`), `WorkloadWarnings`, `CalibrationNote`, `WhatThisKeepsCard` with its lock toggle, `MovedForwardList`, loading/error states (`:207-225`) all present. The lock journey (`e2e/plan-flow.spec.ts:455`) re-run green — inherited evidence. |
| **AC-E17-13** keyboard, focus, reduced motion, WCAG 2.2 AA, copy | **Satisfied** | Disclosure-button pattern with `Escape` returning focus (`EditableSessionCard.tsx:121-138`); every control labelled; `role="status" aria-live="polite" aria-atomic` announcements in `PacingControls.tsx:173-180`. `src/test/forbiddenWords.ts` forbids "behind / missed / overdue / failed / late" **and** `%` across text and `aria-label`/`title`/`alt`; `PlanProposal.test.tsx:8` applies it to the rebuilt surface, and `pacingPresets.ts` is `%`-free by construction. Browser axe at 1280 and 360 with the controls open — inherited (EP17H-AC4). |
| **AC-E17-14** deliberate spec diffs, gates pass, no route added or removed | **Satisfied** | `scheduler.spec.ts` carries 42 EP17/rule-9 annotations naming the rule behind each change (TR-E17-07). **Independently verified: `git diff 40e1e22..HEAD -- 'apps/api/src/**/*.controller.ts'` is empty** — no controller changed at all, so no route was added or removed. |

**Verdict on epic ACs: 14 / 14 satisfied.**

### Test requirements

| TR | Outcome | Evidence |
|---|---|---|
| TR-E17-01 | **Met** | `scheduler.spec.ts` — spread with slack, tight-deadline exemption, the D17-3 many-small counterexample, and the per-category invariant at three spread values. |
| TR-E17-02 | **Met** | 19/19 byte-identical at `spreadPercent 0` + two-run determinism at 70/100; no-input-mutation test. |
| TR-E17-03 | **Met** | `preferences.spec.ts` incl. the frozen legacy-bag fixture; green in my run. |
| TR-E17-04 | **Met** | `study-plans-pacing.service.spec.ts` (new) + `study-plans.service.spec.ts`; `toPacing` derives `perDayMinutes` from the same projected days, so EP17D-AC4 holds by construction. |
| TR-E17-05 | **Met** | `EditableWeek`, `EditableSessionCard`, `PacingControls`, `ProposalActionBar`, `Disclosure`, `PresetRadioGroup` test files, all green. |
| TR-E17-06 | **Met — inherited evidence** | `e2e/plan-pacing.spec.ts` (3 journeys) + updated `plan-flow.spec.ts`. Executed by EP17H's implementer, not by this review (see §4). |
| TR-E17-07 | **Met** | The annotated `scheduler.spec.ts` diff, recorded in EP17B's and EP17C's records. |

---

## 3. Engine invariants — the riskiest thing EP17 changed

| Invariant | Status |
|---|---|
| Purity and determinism of `scheduler.ts` | **Holds.** No clock, no randomness, no I/O, no `@nestjs/*`; all iteration over `days` or the comparator-sorted `progress`; the one `new Date` is a pure parse of a date argument. |
| Per-deficit-category minute sum | **Holds**, asserted across the whole battery at three spread values (`scheduler.spec.ts:1218`). |
| No silent loss of minutes | **Holds.** Classification unchanged; minutes a pacing target declines land in `INSUFFICIENT_TIME_BEFORE_DEADLINE` (`scheduler.spec.ts:1255`). |
| Deadlines beat pacing (rule 9) | **Holds.** Critical items are absent from `paceLeft`, so `paceLeftOf` returns `+Infinity` for them — uncapped on the critical pass *and* in the rotation that follows. |
| Deadlines beat study-day selection (rule 9b) | **Holds, and the critical pass genuinely keeps real budgets.** `budgetLeft` is seeded from `dayBudgetOf` for **every** day (`:771-773`); the narrowing is applied only in `placeBlock`'s `preferEnergy` branch (`:713-717`) and in `normalBudgetOf`. A one-day-a-week student with a Tuesday deadline still gets Tuesday. |
| Bounded R-EP17-01 guarantee | **Correctly scoped.** `capacityAfter` is still optimistic (sums narrowed `dayBudgetOf` over later horizon days, ignoring breaks, fragmentation and competition) and the claim is stated as "no worse than rule 3" everywhere I checked — contracts §3, the epic's invariant table, `scheduler.spec.ts:1181` and `:1204`. No record overclaims it. |
| `pacing-baseline.snapshot.json` frozen | **Real and unregenerated.** `git log` on the file shows exactly one commit, `f3cad52` (EP17B, its creation); 19 fixtures; gate green in my run. |
| EP15C `identity.snapshot.json` frozen | **Real and unregenerated.** Last touched at `57abd7b` (EP15C) — no EP17 commit modified it. |
| EP17D's `placementOf()` projection | **In place.** `identity.spec.ts:38-40` and `scheduler.spec.ts:1275` both project, so EP17D's additive `studyDays` key did not tempt a regeneration. |

**Persisted-preference contract:** additive only (no Prisma migration
anywhere in the diff), the PUT merge is untouched, bags stay under the 4 KB
cap, and the pre-EP17 legacy-bag fixture passes. **The ▲ D17-16 two-reader
split is genuinely safe:** `readPlanningStudyPreferences` has exactly one
production caller (`gatherPlanData`), and the momentum read is a different
function at a different call site with the unchanged default of 3.

**Security / ownership:** verified, not assumed. The EP17 diff adds **no
Prisma query at all** (`git diff` over `study-plans.service.ts` shows no
added `prisma.` / `findMany` / `findUnique` / `update` / `delete` line), no
controller file changed, `study-plans.controller.ts` still uses
`@CurrentUser()` and never `@Req()`, `gatherPlanData` still throws the
uniform `RESOURCE_NOT_FOUND`, and access tokens are untouched. **EP17's
"no new route" claim is true.** No `.env*` was read during this review.

---

## 4. Gates executed by this review

cwd as noted; tested state = `d8d226f`, working tree clean.

| Command | cwd | Result | Who ran it |
|---|---|---|---|
| `npx jest` (full) | `apps/api` | **PASS — 57 suites passed / 29 skipped; 1368 passed / 533 skipped / 0 failed**, 10.3 s | **reviewer** |
| `pnpm test` (full) | `apps/web` | **PASS — 140 files / 1516 tests / 0 failed**, 40.6 s | **reviewer** |
| `pnpm typecheck` | `apps/api` | PASS | **reviewer** |
| `pnpm typecheck` | `apps/web` | PASS | **reviewer** |
| `pnpm lint` | `apps/api` | PASS (`--max-warnings 0`) | **reviewer** |
| `pnpm lint` | `apps/web` | **PASS — 0 errors, 0 warnings** (F-EP17A-01's 4 errors are gone) | **reviewer** |
| `node tools/queue-lint.mjs docs/stories/EP17` | repo root | **clean (13 files)** | **reviewer** |
| `npx jest __rev.spec` (throwaway probe of `selectStudyDays` cardinality, deleted after the run) | `apps/api` | PASS — selection size is `min(count, 7)` even with six zero-free days | **reviewer** |
| `npx playwright test` (full e2e, ×7) | `apps/web` | 76/76 on four runs; two pre-existing flakes; one port-contaminated run | **inherited — EP17H's implementer, not re-run here** (needs a local Postgres; optional per the assignment) |

Both claimed counts reproduce **exactly** (API 57/1368/533; web 140/1516),
and `apps/web` lint is clean as claimed. `git status` is clean after the
runs — the API's `eslint --fix` changed nothing.

---

## 5. DoD map (shared DoD, `docs/epics/README.md`)

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | **PASS** | 14/14 epic ACs satisfied (§2); all child ACs met per the children's records, spot-verified in code. |
| 2 | Front- and back-end validation handle invalid input | **PASS** | `validateStudyPreferences` bounds/cross-field rules extended for `spreadPercent`; the engine reads both levers defensively (`safeInt`, clamps at `scheduler.ts:354` / `:365`); the planning reader treats an out-of-bounds stored value as *unchosen*; `PresetRadioGroup` admits only preset values plus a read-back Custom. |
| 3 | Academic data scoped to the authenticated student | **PASS** | No new query, no new route, no controller change; `@CurrentUser()` throughout; uniform 404. Verified by diff, not by claim. |
| 4 | API errors produce actionable messages | **PASS** | `WRITE_ERROR` / `REBUILD_ERROR` in `PacingControls.tsx:19-21` with a scoped **Try again** that retries the write or only the rebuild; EP16C's confirm errors preserved. |
| 5 | Loading, empty and error states handled | **PASS** | `PlanProposal.tsx:207-225` (error card, `EmptyState`), the loading skeleton, and the `confirmDisabled`/`aria-busy` rebuild state. |
| 6 | Keyboard accessibility | **PASS** | Disclosure-button cards with `Escape`-to-restore-focus, labelled selects and buttons, radio-group presets, announced outcomes; component tests exercise each edit by keyboard. |
| 7 | Responsive desktop + mobile | **PASS** | `md`-boundary action bar with safe-area insets verified against the tab bar; `max-sm:min-h-[44px]` touch targets; axe at 1280 **and** 360 (browser pass inherited). |
| 8 | Business rules have automated tests | **PASS** | The pacing battery, the per-category invariant, the two frozen gates, the adversarial fixtures, and the component/e2e layers — all executed green by me except the e2e. |
| 9 | API changes and migrations documented | **PASS** | `contracts.md` §2–§5 document the levers, rule 9, rule 9b and the `pacing` payload block; **no migration** (▲ D17-5 (a)) and none in the diff. R-EP17-10's §3 tidy-up is cosmetic. |
| 10 | Reviewed in an integrated development environment | **PASS — part inherited** | Reviewer-executed: both full unit suites, both typechecks, both lints, queue-lint, the two frozen gates, and direct inspection of the integrated wiring (reader → service → payload → surface). Integrated **browser** evidence is inherited from EP17H's seven full-stack Playwright runs against a real Postgres, with browser axe at two widths and a complete flake table including the non-green runs; I did not run a browser myself and do not claim to have. |
| 11 | `review.md` ends with **How to verify by hand** | **PASS** | §7 below, every workflow labelled. |

---

## 6. Ruled decisions carried through

| Decision | Carried through? |
|---|---|
| ▲ **D17-2 (a)** + visibility proviso | **Yes.** `weeklyGoalDays` instructs the planner (rule 9b), and EP17G surfaces the control on **both** the proposal and Profile with `STUDY_DAYS_DESCRIPTION` stating the instruction meaning. The F-EP17B-03 / F-EP17C-02 window — the engine constraining real plans before anything explained it — is genuinely closed, by EP17D's correction (the planning reader) *and* EP17G's controls. |
| D17-3 | **Yes.** Minute-based only; no session-count ceiling exists in the engine, and the one-sitting floor (`scheduler.ts:520`) is what keeps the many-small-assignments student unthrottled. |
| ▲ **D17-4** | **Yes.** `PlanSessionEditor.tsx` is deleted; one editable `EditableWeek`. |
| ▲ D17-5 | **Yes.** Additive bag keys, no migration. |
| D17-6, D17-7, D17-9 | **Yes.** `spreadPercent 0` reproduces the pre-EP17 engine byte-for-byte; the spec was amended case by case with reasons; `commitBlock` still hugs `interval.startMinute` (BL-17-01 open). |
| ▲ **D17-8** | **Yes.** Inline presets write and re-preview in place, explicitly labelled and announced, with the pre-change warning sentence (`SPREAD_CHANGE_SENTENCE`). |
| ▲ **D17-16** | **Yes, and the momentum read is verifiably unaffected** (§3). |
| **D17-17** | **Yes**, plus a fourth call site found by the mandated test and handled correctly (F-EP17H-01). |

---

## 7. How to verify by hand

Prerequisites for the browser steps: a local Postgres, `pnpm install`, the
API and web dev servers, and a **disposable** local student account. Use
throwaway data only; no shared system is touched by any step below.

### A. Deterministic gates — *Executed — 2026-11-19, this worktree at `d8d226f`, clean tree*

1. `cd apps/api && npx jest` → **57 suites passed, 1368 passed / 533 skipped / 0 failed.**
2. `cd apps/web && pnpm test` → **140 files, 1516 tests, 0 failed.**
3. `pnpm typecheck` and `pnpm lint` in **both** apps → all four PASS; `apps/web` lint reports **0 errors, 0 warnings**.
4. `node tools/queue-lint.mjs docs/stories/EP17` → **clean (13 files)**.
5. `git log --oneline -- apps/api/src/domain/study-planning/identity.snapshot.json apps/api/src/domain/study-planning/pacing-baseline.snapshot.json` → exactly two commits (`57abd7b`, `f3cad52`): **neither snapshot was regenerated during EP17**.
6. `git diff 40e1e22..HEAD -- 'apps/api/src/**/*.controller.ts'` → **empty**: no route added, removed or changed.

### B. The engine really spreads, and deadlines still win — *Executed — 2026-11-19, same state*

1. `cd apps/api && npx jest src/domain/study-planning/scheduler.spec.ts -t "pre-EP17 baseline"` → expect **19/19** byte-identical at `spreadPercent 0`. **Observed: pass**, inside the full-suite run.
2. `npx jest src/domain/study-planning/identity.spec.ts` → expect the EP13J identity + V-15-3 determinism cases green with `identity.snapshot.json` unmodified. **Observed: pass.**
3. Re-run the per-category invariant: `npx jest src/domain/study-planning/scheduler.spec.ts -t "accounts for every minute"` → expect green at `spreadPercent` 0, 70 and 100. **Observed: pass.**
4. Negative/edge case: temporarily set a fixture's `weeklyGoalDays` to `1` with a deadline on an unselected day and confirm rule 3 still places it. **Observed by code inspection + the EP17C carve-out fixtures**, and independently by the `selectStudyDays` cardinality probe; not re-run as a bespoke fixture.

### C. Plan → paced week → in-place edit → confirm — *Not executed — user instructions*

1. Sign in as a disposable student; create 1 assignment of ~6 h remaining, due at the end of the 7-day window; set availability on all seven days.
2. Profile → **Study days a week** → *Steady* (3); **How your week is paced** → *Evenly spread*. Save.
3. **Plan my week** → `/plan/proposal`. **Expect:** work on more than two distinct days, all of them inside the chosen study days; roughly equal minutes per day; **no `2026-…`-style date anywhere on the page** — days read "Wed, Nov 19".
4. Open one session's card (Enter on its title button), change **Day** to another study day, press `Escape`. **Expect:** focus returns to the card's button; the session is drawn on the new day; the change is announced.
5. Scroll anywhere. **Expect: Use this plan** and **Not now** stay visible at the bottom, exactly one of each, never hidden behind the tab bar.
6. **Use this plan** → *Plan saved.* → `/today` shows the session under **Next up**.

### D. Change the pace from the proposal — *Not executed — user instructions*

1. On `/plan/proposal`, open **Change the pace**.
2. Choose **As early as possible**. **Expect:** both groups disable while in flight; the week rebuilds in place without leaving the page; the live region says "New week ready — as early as possible, across N days."; the week is now front-loaded.
3. Go to `/profile`. **Expect:** **As early as possible** is the checked radio — the two surfaces agree.
4. Negative case: stop the API, choose another preset. **Expect:** "We couldn't save that choice. Try again." in an alert, the previous selection still shown, the proposal still rendered and editable, and a **Try again** button that retries the write.
5. Negative case (rebuild only): allow the write, fail the preview. **Expect:** "We saved your choice but couldn't rebuild the week. Your current plan is still here." and the old proposal untouched.

### E. Ownership and the uniform 404 — *Not executed — user instructions*

1. With student A's token, `PUT /study-preferences {"spreadPercent": 100}` → 200; `GET /study-preferences` as **student B** → B's own bag, unchanged.
2. Request any `/study-plans/...` resource owned by B with A's token → **404 `Resource not found`** (never 403).
3. Confirm the access token is never written to `localStorage`/`sessionStorage` (DevTools → Application).
   *Reviewer note: the EP17 diff adds no query and no route, so these are regression checks on unchanged code rather than new surface.*

### F. Accessibility and responsiveness — *Partly executed (inherited)*

- Browser axe on the rebuilt proposal at **1280×800** and **360×640** with the pacing controls and the "What else changed" disclosure open:
  **Executed — 2026-11-19 by EP17H's implementer** (`e2e/plan-pacing.spec.ts`, repo axe gate, no allowlist, real browser so `color-contrast` is live). **Inherited evidence — not re-run by this reviewer.**
- Keyboard-only walkthrough of every in-place edit (day, start, length, pin, delete + undo) with a screen reader confirming each announcement: **Not executed — user instructions.** Expect every edit reachable by Tab/Enter/Escape, visible focus throughout, and exactly one polite announcement per change.
- 360×640 confirm reach (V-17-5): **Not executed — user instructions.** Expect the action bar fixed above the tab bar, with the last day of the week never covered.

### G. Playwright journeys — *Executed by the implementer; inherited*

`cd apps/web && npx playwright test` with a local Postgres. **Inherited
result:** 76/76 on four of seven full runs, 0 EP17-owned failures in any run;
two runs hit the pre-existing flakes of R-EP17-09 and one was contaminated by
a leftover `:4100` server (BL-15-08). **Not re-run by this reviewer** —
labelled inherited, not claimed as my own observation.

### H. Not applicable

- **Migration verification** — *Not applicable:* ▲ D17-5 (a); EP17 adds no
  Prisma migration and the diff contains none.
- **New-endpoint contract testing** — *Not applicable:* no route was added,
  removed or changed (verified in A.6).

---

## 8. Closeout

```text
Status: reviewed — Pass
Records: docs/stories/EP17/review.md; docs/stories/EP17/artifacts/efficiency.md (one row)
Commits: see the review commit on hfi/9ae11317-13de-4365-8abb-4bf7e0e3c7f3/oak
Verification: see §4 — every deterministic gate re-executed by the reviewer at d8d226f and green; e2e inherited
Remaining: R-EP17-07/08 (polish, EP17G copy + a planner follow-up), R-EP17-09 (flake backlog), R-EP17-10 (contracts §3 wording) — all non-blocking
```
