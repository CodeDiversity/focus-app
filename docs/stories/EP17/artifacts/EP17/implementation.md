# EP17 — parent implementation index

**Written by:** EP17H's implementer, 2026-11-19 (review-cadence: the index
the combined review starts from). **Parent review unit:** EP17A–EP17H.
**Verdict to establish:** one combined review at
[`./review.md`](./review.md) (not yet written).

> **Start here.** This index is the entry point. It does not restate any
> child's evidence — each child's `implementation.md` is the one home for its
> AC-by-AC outcome, its verification commands and its test counts.

## 1. Scope and documents

| Document | Path |
|---|---|
| Epic | [`docs/epics/EP17-adhd-friendly-pacing-and-plan-proposal.md`](../../../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md) |
| Breakdown / execution queue | [`docs/stories/EP17/README.md`](../../README.md) |
| Shared contracts (§1 baseline, §2 levers, §3 pacing, §4 study-day selection, §5 payload, §6 surface, §7 windows) | [`contracts.md`](../../contracts.md) |
| Correction log + quality gates | [`history.md`](../../history.md) |
| Plan review (required by D17-12) — **passed**, pass 2 Plan Ready | [`plan-review.md`](../../plan-review.md) |
| Efficiency log | [`../efficiency.md`](../efficiency.md) |

## 2. Child inventory

| Child | Story | Record | Layer | State |
|---|---|---|---|---|
| EP17A | [spread preferences contract](../../EP17A-spread-preferences-contract.md) | [implementation.md](../EP17A/implementation.md) | Backend (domain contract) | Implemented |
| EP17B | [engine daily pacing](../../EP17B-engine-daily-pacing.md) | [implementation.md](../EP17B/implementation.md) | Backend (pure domain) | Implemented |
| EP17C | [engine study-day selection](../../EP17C-engine-study-day-selection.md) | [implementation.md](../EP17C/implementation.md) | Backend (pure domain) | Implemented |
| EP17D | [service wiring and pacing payload](../../EP17D-service-wiring-and-pacing-payload.md) | [implementation.md](../EP17D/implementation.md) + [F-EP17C-02-resolution.md](../EP17D/F-EP17C-02-resolution.md) | Backend (module + API) | Implemented |
| EP17E | [editable week grid](../../EP17E-editable-week-grid.md) | [implementation.md](../EP17E/implementation.md) | Frontend | Implemented |
| EP17F | [proposal composition and decision](../../EP17F-proposal-composition-and-decision.md) | [implementation.md](../EP17F/implementation.md) | Frontend | Implemented |
| EP17G | [plan-time pacing controls](../../EP17G-plan-time-pacing-controls.md) | [implementation.md](../EP17G/implementation.md) | Frontend | Implemented |
| EP17H | [cross-layer e2e and parent index](../../EP17H-cross-layer-e2e-and-parent-index.md) | [implementation.md](../EP17H/implementation.md) | Integration | Implemented |

## 3. Combined Git scope and per-child diff ranges

**Baseline (last pre-EP17 code commit):** `40e1e22`
*(`docs(EP17E/F/G): refined …` — the EP17 planning commits before it are
docs-only).*
**Final commit:** EP17H's closeout commit (see [EP17H's record](../EP17H/implementation.md),
"Commit scope").

Review each range with `git show <sha>` or `git diff <from>..<to>`.

| Child | Commit(s) | Diff range | Size |
|---|---|---|---|
| EP17A | `3d10130` | `40e1e22..3d10130` | 20 files, +467 / −35 |
| EP17B | `f3cad52` (doc follow-up `110ac78`) | `3d10130..f3cad52` | 7 files, +2380 / −9 |
| EP17C | `b312e4f` (doc follow-ups `9f6b1a6`, `6fab5e1`) | `f3cad52..b312e4f` | 12 files, +813 / −25 |
| EP17D | `3e1f01c` (F-EP17C-02 correction) then `056b1bf` | `b312e4f..056b1bf` | 6 files +438/−2, then 14 files +701/−12 |
| EP17E | `6e7cdad` | `056b1bf..6e7cdad` | 18 files, +1309 / −633 |
| EP17F | `6f70779` (doc follow-up `d918046`) | `6e7cdad..6f70779` | 10 files, +746 / −124 |
| EP17G | `1f865b3` (doc follow-ups `ef44900`, `5a5f110`) | `6f70779..1f865b3` | 17 files, +1352 / −136 |
| EP17H | this child's single commit | `5a5f110..<EP17H>` | see EP17H's record |

`b0f433c` (`docs(EP18): …`) is on the same branch but belongs to a
**concurrent planner**, not to EP17. Exclude it from the review.

## 4. Test commands per child

Each is recorded with its result in the child's own record; the counts live
only there. cwd is `apps/api` or `apps/web` as noted.

| Child | Commands |
|---|---|
| EP17A | `pnpm test -- preferences.spec momentum.spec study-plans.service.spec`; `pnpm test -- scheduler.spec identity.spec preferred.spec energy.spec catch-up.spec calibration.spec`; `pnpm typecheck` / `pnpm lint` (api + web) |
| EP17B | `npx jest scheduler.spec`; `npx jest identity.spec preferred.spec energy.spec catch-up.spec calibration.spec intervals.spec ordering.spec preferences.spec study-plans.service.spec`; `npx jest`; `pnpm typecheck` / `lint` / `format` |
| EP17C | `npx jest scheduler.spec`; `npx jest src/domain/study-planning`; `npx jest`; `pnpm typecheck` / `lint` / `format` |
| EP17D | `npx jest`; `npx jest src/modules/study-plans/study-plans-pacing.service.spec.ts`; `pnpm typecheck` / `lint` / `format` (api), `pnpm typecheck` (web) |
| EP17E | `npx vitest run src/features/plan-proposal src/features/study-plan`; `pnpm test`; `pnpm typecheck`; targeted `npx eslint` |
| EP17F | `npx vitest run src/features/plan-proposal src/shared/ui/Disclosure.test.tsx`; `pnpm test`; `pnpm typecheck`; targeted `npx eslint` |
| EP17G | `npx vitest run src/features/plan-proposal src/features/study-preferences src/shared/ui`; `pnpm test`; `pnpm typecheck`; targeted `npx eslint` / `prettier --check` |
| EP17H | `npx jest` (api, full); `pnpm test` (web, full); `pnpm lint` + `pnpm typecheck` in **both**; `npx playwright test` (full, DB-gated, ×3); the identity / determinism / pacing-baseline gates. **EP17H's record is the only place the final suite numbers live.** |

## 5. Epic AC outcomes (AC-E17-01…14)

| Epic AC | Owner | Outcome | Evidence |
|---|---|---|---|
| AC-E17-01 assignment with slack takes at most its daily pacing target | EP17B | Met | [EP17B](../EP17B/implementation.md) — rule 9, pacing battery |
| AC-E17-02 feasibility still wins; no new deadline miss | EP17B, EP17C | Met | [EP17B](../EP17B/implementation.md), [EP17C](../EP17C/implementation.md) — full-horizon fallback + critical pass fixtures |
| AC-E17-03 no minutes lost; categories unchanged | EP17B, EP17C | Met | per-category minute-sum invariant (R-EP17-02) |
| AC-E17-04 pure, deterministic; "off" byte-identical | EP17B, EP17C, **EP17H (gate)** | Met | 19/19 `pacing-baseline.snapshot.json` cases at `spreadPercent 0`, both files untouched — [EP17H](../EP17H/implementation.md) |
| AC-E17-05 at most the chosen study days; seven reproduces today | EP17C | Met | rule 9b + fixtures |
| AC-E17-06 additive spread keys; legacy bag valid | EP17A | Met | frozen legacy-bag fixture |
| AC-E17-07 `weeklyGoalDays` means one thing | EP17C, EP17A, EP17G | Met | ▲ D17-2 (a) + ▲ D17-16; EP17G's re-legend. **Read F-EP17G-01 before signing this off.** |
| AC-E17-08 levers changeable from the proposal; Profile parity | EP17G, EP17D | Met | EP17G component tests + **EP17H-AC2 journey** (preset → re-plan → confirm → Profile) |
| AC-E17-09 the week renders once, edited in place | EP17E | Met | `EditableWeek`; `PlanSessionEditor` deleted |
| AC-E17-10 human day labels; no raw ISO date | EP17E (grid), **EP17H** (non-grid call sites + V-17-4 sweep, D17-17) | Met | EP17H-AC7: four call sites moved to `dayLabel`; page-wide negative test. **D17-17 enumerated three; a fourth was found — see F-EP17H-01.** |
| AC-E17-11 one confirm, one decline, reachable | EP17F | Met | `ProposalActionBar`; V-17-5 |
| AC-E17-12 every EP16C guarantee survives | EP17E, EP17F, EP17H | Met | the EP16 lock journey (`e2e/plan-flow.spec.ts:455`) still green — EP17H |
| AC-E17-13 keyboard, focus, reduced motion, WCAG 2.2 AA, copy | EP17E, EP17F, EP17G; EP17H (axe) | Met | component axe at 1280/360 (EP17F) + **browser axe on the rebuilt proposal at 1280/360 with the controls open (EP17H-AC4)** |
| AC-E17-14 spec diffs deliberate; gates pass; no route added or removed | EP17B, EP17C, EP17D, **EP17H** | Met | TR-E17-07 spec diffs; EP17H re-ran the gates and diffed the controllers' route decorators `40e1e22..HEAD` — **identical** |

## 6. TR / DoD ownership

| Req | Owner | Where verified |
|---|---|---|
| TR-E17-01 domain pacing unit tests | EP17B, EP17C | the children's records |
| TR-E17-02 determinism + byte-identical-at-off | EP17B, EP17C; EP17H re-run | [EP17H](../EP17H/implementation.md) §gates |
| TR-E17-03 preferences contract tests | EP17A | EP17A |
| TR-E17-04 API `pacing` payload + plan-time write | EP17D, EP17G | EP17D, EP17G |
| TR-E17-05 component tests | EP17E, EP17F, EP17G (+ EP17H's three AC7 component tests) | the children's records |
| TR-E17-06 Playwright journeys | **EP17H** | `apps/web/e2e/plan-pacing.spec.ts` + the updated `plan-flow.spec.ts` |
| TR-E17-07 reviewed `scheduler.spec.ts` diff | EP17B, EP17C | EP17B, EP17C |

| DoD | Owner | Status |
|---|---|---|
| 1 functional criteria | all children | Met per child |
| 2 invalid-input validation | EP17A, EP17G | Met |
| 3 student data scoping | EP17A, EP17D, EP17G | Met — no new route, every read/write stays on the `@CurrentUser()`-scoped endpoints |
| 4 actionable API errors | EP17A, EP17G, EP17F | Met |
| 5 loading/empty/error | EP17E, EP17F, EP17G | Met |
| 6 keyboard accessibility | EP17E, EP17F, EP17G | Met |
| 7 responsive layouts | EP17E, EP17F, EP17G | Met |
| 8 automated tests | all children | Met |
| 9 API/migration documentation | EP17A, EP17B/C, EP17D in `contracts.md`; **no migration** (▲ D17-5 (a)) | Met |
| 10 integrated review | this index + the combined review | **Open — the reviewer's** |
| 11 reviewer walkthrough | reviewer, inside `review.md` | **Open — the reviewer's** |

## 7. Verification tasks

| ID | Task | Owner | Outcome |
|---|---|---|---|
| V-17-1 | pacing smoke | EP17B | Done |
| V-17-2 | many-small-assignments counterexample | EP17B | Done |
| V-17-3 | byte-identical baseline | EP17B, re-run by EP17H | **Re-run: 19/19 pass, both snapshot files untouched** |
| V-17-4 | no raw ISO date rendered | EP17E (grid), EP17H (page-wide) | **Page-wide scan green after the AC7 fix; it is the test that found the fourth call site** |
| V-17-5 | the 360×640 confirm reach | EP17F, asserted by EP17H | Covered by the existing 320 px plan-flow case + EP17H's 360 px axe pass |
| V-15-3 | EP15 determinism check | EP17H (gate) | `identity.spec.ts` green, `identity.snapshot.json` untouched |

## 8. Open findings carried into the review

Fix in the owning child; re-review together here.

| ID | Owner | Summary | State |
|---|---|---|---|
| F-EP17A-01 | EP17H | 4 pre-existing `apps/web` lint errors in untouched e2e files | **Closed by EP17H** — `pnpm lint` is clean in `apps/web` |
| F-EP17B-01 | planner / live session | contracts §3's `evenShare` formula needs a one-line amendment (one-sitting floor) | **Open — a docs change this role may not write** |
| F-EP17B-02 / F-EP17C-01 | planner / live session | the feasibility floor is currently inert (subsumed by rule 3); kept deliberately | Open, informational |
| F-EP17B-03 / F-EP17C-02 | EP17D / EP17G | the levers reached real previews before the UI existed — contracts §7's known window | **Closed** by EP17D's correction + EP17G's controls |
| F-EP17C-03 | planner | `evenShare` denominator wording | Open, informational |
| F-EP17D-01 | closed in EP17D | the frozen gates compare `placementOf(output)`, not whole-output JSON, so an additive key does not tempt a snapshot regeneration | **Closed — and EP17H confirms the projection is still in place and both snapshots still pass untouched** |
| F-EP17D-02 / F-EP17D-03 | closed in EP17D | AC1 was coverage of existing wiring; `studyDays` may list selected-but-empty days per contracts §5 | Closed |
| F-EP17E-01 | closed in EP17E | `aria-controls` only while expanded | Closed |
| F-EP17E-02 | EP17H | raw ISO dates in `WhatThisKeepsCard` / `MovedSessionRow` | **Closed by EP17H-AC7** |
| F-EP17F-01 | EP17H | the 409 conflict summary's frozen ISO copy | **Closed by EP17H-AC7** |
| F-EP17G-01 | **the combined review must rule** | the day-count control displays `pacing.studyDays.length`, so a student who chose *Most days* (5) can see **"Custom (4 days)"** when availability yields fewer days. Two honest options: carry the stored `weeklyGoalDays` in the payload beside `studyDays`, or accept the "at most" copy as covering it | **Open — decision needed** |
| F-EP17G-02 | **the combined review should note** | Profile's **Save** writes the whole preferences bag, so it now also writes `spreadPercent` on a save where the student never touched it (pre-existing EP06E behaviour, newly relevant) | Open |
| F-EP17G-03 | closed by citation | two neighbouring `useMediaQuery` fallbacks differ (`false` / `true`); as specified by D-G8 | Closed |
| F-EP17H-02 | planner / BL-15-08 | a leftover test API on `:4100` aborted a flake-guard attempt — the standing env-derived-ports harness constraint | Open, informational |
| F-EP17H-03 | planner / live session | **two pre-existing e2e flakes**, both outside EP17's diff: `adaptive-scheduling.spec.ts:288` (journey 5's clock/absorption race, reproduces ~1 in 3 even at one worker) and a one-off 15 s load timeout at `today.spec.ts:151`. Four of seven full runs were 76/76; no EP17-owned spec failed in any run | **Open — reported, not fixed** |
| F-EP17H-01 | EP17H | **D17-17 named three raw-ISO call sites; there were four.** `WorkloadWarnings.tsx` (rendered only from `PlanProposal`) printed `w.dueDate` in three places. Fixed with the same `dayLabel` helper; recorded as an addition to D17-17's examples, not a new decision | **Closed by EP17H-AC7**, flagged so the reviewer sees four changed sites where the decision named three |

## 9. Deviations the reviewer should know about

- **EP17F:** the "What else changed" disclosure renders only when it has
  content (no empty disclosure on a clean week). Recorded in
  [EP17F's record](../EP17F/implementation.md); EP17H's e2e tolerates its
  absence rather than asserting it unconditionally.
- **EP17G:** `onChanged` returns `{ ok, pacing? }`; `PresetRadioGroup` gained
  an optional `description`; preset copy lives in
  `entities/study-preferences/model/pacingPresets.ts`. All inside frozen ACs
  — see EP17G's deviation table.
- **EP17H:** the fourth AC7 call site (F-EP17H-01), and the
  `WhatThisKeepsCard` **`aria-label`** — which also carried the ISO date and
  which `renderedStrings` (text + `aria-label`/`title`/`alt`) therefore
  includes in the V-17-4 scan.

## 10. Known gaps

1. **DoD-10 / DoD-11** are the reviewer's and are the reason this index
   exists.
2. **EP17G's browser manual pass** of the write + rebuild failure paths was
   never performed by a human; the automated page-level equivalents and
   EP17H's `plan-pacing.spec.ts` cover it. Recorded honestly in EP17G's
   record.
3. **F-EP17B-01's contracts §3 amendment** has not been written — no
   implementer may edit `contracts.md`.
4. **BL-15-08** (env-derived ports / throwaway DB name) remains the standing
   e2e harness constraint; see EP17H's record for how this session supplied
   `DATABASE_URL` and a throwaway `JWT_SECRET` to run the suite.
