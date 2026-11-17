# EP14 combined implementation review — round 1

**Date:** 2026-11-16
**Pass:** 1 (`parent_review`)
**Reviewed commit:** `08b6bd5` (clean tree, branch `hfi/754150a7-2d3e-44d5-aa03-993c68baf603/oak`; CI proof of the same SHA on scratch branch `ep14-review-proof`, run [44006149869](https://github.com/CodeDiversity/focus-app/actions/runs/44006149869))
**Scope:** the EP14 review unit — EP14A, EP14B, EP14C, EP14F, EP14D, EP14E (queue order), per the parent index [implementation.md](./implementation.md); per-child diff ranges `de9a67a^..1eb52a3`, `8e3155c`, `be5a2ca`, `95906d5^..261cbe7`, `67e60f3`, `8e72aa5^..a75a22b`. EP15 planning commits interleaved in the span are out of scope and untouched.
**Reviewer:** reviewer, fresh session. Read-only except this file.
**Plan baseline:** [plan-review.md](../../plan-review.md) pass 2, Plan Ready at `966b109`; findings continue from R-EP14-04.

## 1. Findings

| ID | Severity | Child / paths | Requirement | Observed gap | Owner | Closure condition |
|---|---|---|---|---|---|---|
| R-EP14-05 | **Should-fix** | EP14B (`.github/workflows/ci.yml:88–92`, Secret scan); EP14B record F-EP14B-02 | EP14B-AC2: "the first fully green CI run on this branch is linked in the implementation record"; AC-E14-02 | No fully green CI run exists. Reviewer-checked at `08b6bd5` (run 44006149869): steps 1–17 success — including "Run backend tests" (gated, `--runInBand`) and "Run frontend tests" — step 18 **Secret scan: failure**, job **failure**. Same shape on `c360e2d` (run 43910951890). The flagged item is unconfirmed (job logs need a signed-in collaborator; gitleaks not run here; the location-only candidates are tracked `.env.example` templates, deliberately not opened). | **user** | A signed-in read of the Secret-scan log; then either removal/rotation of a real secret (→ escalates to Blocker and needs its own record) or a reviewed, narrowly scoped gitleaks allowlist for a confirmed placeholder; a fully green run of this branch's content linked in `artifacts/EP14B/implementation.md`. |
| R-EP14-06 | **Should-fix** | EP14B (`apps/api/src/test/test-http.ts:104–113`, `apps/api/src/main.ts:15–23`); spec-local pipe copies in `assignments.service.spec.ts:188,583,1118,1167`, `auth.controller.spec.ts:220`, `study-plans-recovery-catch-up.service.spec.ts:623,886,978` | EP14B Tests, AC1: "unit: the pipe options pinned in `test-http.ts` equal `main.ts`" | The named parity unit test does not exist (`rg enableImplicitConversion apps/api/src --glob '*.spec.ts'` finds no assertion). Both files carry `enableImplicitConversion: false` today (inspected), but nothing pins them together, so a future drift would silently make the gated strictness spec prove nothing about production. The four spec files above still build local pipes with `enableImplicitConversion: true` — a stale mirror of the pre-EP14B policy (their assertions pass because `boolean \| null` has design type `Object`, so they never exercised coercion). | implementer (EP14B) | A unit test asserting the two `FieldValidationPipe` option objects are deep-equal (or one shared constant imported by both), and the four spec-local pipe copies aligned with production (or a one-line comment why they intentionally differ). |
| R-EP14-07 | **Should-fix** | EP14 README `## Backlog`; records EP14D (F-EP14D-03), EP14F (F-EP14F-01, F-EP14F-02); parent index §3 (AC-E14-07 "Met") | AC-E14-07: "Deferred items are tracked in a register whose shape is lint-enforced and reviewed at every … sign-off"; D14-4 | Three items the records themselves defer with a "candidate backlog row" are not in the register: F-EP14D-03 (journey-5 browser-clock flake), F-EP14F-01 (turbo strips the shell `DATABASE_URL`/`JWT_SECRET`), F-EP14F-02 (hard-coded E2E ports :4100/:3100). EP14C's deferred findings became BL-14-07/-08 — the precedent this unit set. AC-E14-07 is therefore claimed Met with untracked deferred work. | planner | Three register rows (`BL-14-09…11`, each with a concrete revisit trigger) or a recorded ruling that harness-only findings live elsewhere; `node tools/queue-lint.mjs docs/stories/EP14` clean afterwards. Docs-only. |
| R-EP14-08 | Polish | EP14E story Tests (`EP14E…md:61`); EP14B Tests (`EP14B…md:49`); EP14D-AC1 (`EP14D…md:36`); EP14D Decisions D-D1 | Story text ↔ delivered evidence consistency | (a) EP14E Tests say `'light work prefers the LOW window'` "must pass unmodified" — it was re-fixtured because AC3 forbids the old verdict (F-EP14E-01; AC is the authority). (b) EP14B names `MomentumWeekStrip.test.tsx`; the coverage lives in `MomentumCard.test.tsx` (strip rendered from `week.days`) + `momentumCopy.test.ts` (no date helper exported). (c) EP14D-AC1 cites `calendar.spec.ts:100`; the test is now at `:101`. (d) D-D1's premise was wrong (F-EP14D-01) — the ruled outcome holds and the fix is in the primitive; the Decisions row carries no note. | planner | Optional one-line edits; none blocks. |

Prior finding: **R-EP14-04** (plan review pass 2, polish) — **Resolved** at `de9a67a` (EP14A): README TR-E14-01 row, EP14A DoD line and Sizing/Verification now read "deliberate-red + known-red-baseline" (`README.md` TR table; `EP14A…md:59,67`).

Implementer findings noted for this review (no new finding): F-EP14A-01 (anonymous log 403 — reviewer confirmed the step-level conclusions above; test-level composition stays on the recorded `--runInBand` parity chain), F-EP14D-01 (primitive fix, outcome holds), F-EP14E-01/-02/-03 (deviations recorded; AC text untouched; `byEnergyPreference` export is doc-commented test-only).

## 2. Evidence log

Reviewer-executed, all at `08b6bd5`, clean tree, 2026-11-16, macOS, Postgres 5432 (shell-only env; no `.env*` read or written):

| Gate | Command (cwd) | Result |
|---|---|---|
| Gated API (full, single worker) | `createdb postgres_review_oak`; `DATABASE_URL=postgresql://<os user>@localhost:5432/postgres_review_oak npx prisma migrate deploy` → "All migrations have been successfully applied" incl. `20261116130000_assignment_hard_flag`; `… npx jest --runInBand` (`apps/api`) | **79 suites, 1625 passed, 0 failed**, exit 0 (13.8 s); DB dropped afterwards |
| Domain specs, verbose | `npx jest --verbose src/domain/study-planning/{energy,momentum,remaining-work}.spec.ts` (`apps/api`) | 65/65 — every EP14E-AC2/AC3 named case present and green (effort flag ×5, identity-with-flags, guard ×9 incl. cross-day R-EP14-03, D-E7 sliver, determinism), `week.days` month-boundary case, `hard` carry case |
| Service spec, verbose | `npx jest --verbose src/modules/assignments/assignments.service.spec.ts` (`apps/api`) | green — 12-key projection, `hard` create/null/omitted, D-E4 merge, `assertDto` rejects `"yes"`/`1`/`"true"`/`[]` on update |
| Web unit (full) | `npx vitest run` (`apps/web`) | **112 files, 1290 passed, 0 failed**, exit 0 |
| Web changed files, verbose | `npx vitest run --reporter=verbose` on `PlanPage`, `EffortChoice`, `Dialog`, `Badge`, `CalendarEventChip`, `momentumCopy`, `MomentumCard` tests (`apps/web`) | 70/70 — EP14F-AC1 ×3 + AC2, EP14D StrictMode focus-return, success token, chip name order, EffortChoice ×8 |
| E2E full, self-contained stack, default parallelism | `DATABASE_URL=postgresql://<os user>@localhost:5432/postgres JWT_SECRET=$(openssl rand -hex 32) FRONTEND_URL=http://localhost:3100 pnpm --filter @studypilot/web test:e2e` (repo root; ports :4100/:3100 free) | run 1: **55 passed / 0 failed / 0 did not run (20.7 s)**, exit 0, throwaway `postgres_e2e_test` dropped; runs 2–3: see §2a |
| CI (anonymous API, step conclusions) | `curl …/actions/runs/44006149869/jobs` | steps 1–17 success, 18 Secret scan failure, job failure (R-EP14-05); runs 43908098549 / 43908087082 fail only at 16 "Run backend tests" (EP14A-AC3 as designed); 43910951890 fails only at 18 |
| Queue lint | `node tools/queue-lint.mjs docs/stories/EP14`; `--backlog docs/stories` (repo root) | clean (11 files), exit 0; backlog lists BL-14-02…05, -07 |

Implementer-provided (reused for unchanged code): the per-child counts and run tables in each record (EP14C ×3, EP14F ×6, EP14D ×5 isolated stack, EP14E ×3); EP14A's two scratch runs; EP14B's gated 1584/0 and run 43910951890.

### 2a. E2E runs 2–3

Same command, same state, back to back after run 1: run 2 **55 passed / 0 failed (20.5 s)**, run 3 **55 passed / 0 failed (21.1 s)**, both exit 0, throwaway database dropped each time. Three consecutive full parallel runs at `08b6bd5` with zero failures — EP14C-AC3's and EP14F-AC3's evidence standard, reproduced independently; journey 5 (F-EP14D-03) passed 3/3 here.

## 3. Child by child

### EP14A — CI runs the full gate (`de9a67a`, `1eb52a3`)

| AC | Disposition | Evidence |
|---|---|---|
| EP14A-AC1 | **Satisfied** | `ci.yml:5–8` `push.branches: ['**']`, `pull_request` unchanged; today's push of `08b6bd5` to `ep14-review-proof` triggered run 44006149869 |
| EP14A-AC2 | **Satisfied** | `ci.yml:35` `JWT_SECRET: ${{ secrets.JWT_SECRET \|\| 'ci-only-test-secret' }}`; `:83` `pnpm --filter @studypilot/api run test --runInBand`; CI step 16 passed 1625 gated tests single-worker (step conclusion) |
| EP14A-AC3 | **Satisfied** (test-level composition on parity, F-EP14A-01) | runs 43908098549 (deliberate red) and 43908087082 (known-red baseline) both `failure` at step 16 only — reviewer-checked; local `--runInBand` parity recorded |
| EP14A-AC4 | **Satisfied** | `.agents/skills/implementer/SKILL.md` closeout rule 6 |

Static test: `git show de9a67a -- .github/workflows/ci.yml` touches only the `on:` block, the backend-test step and the `JWT_SECRET` line (plus comments). DoD: 1 PASS, 8 PASS, 9 PASS (rule documented); others N/A.

### EP14B — API contract integrity (`8e3155c`)

| AC | Disposition | Evidence |
|---|---|---|
| EP14B-AC1 | **Satisfied** | `main.ts:23` and `test-http.ts:112` `enableImplicitConversion: false`; `validation-strictness-e2e.spec.ts` (gated, green in the 1625 run): `locked` `"yes"/1/"true"` → 400 `errors.locked`, row unchanged; `plannedMinutes: "25"` → 400; `?limit=10` 200, `?limit=abc` 400; numeric query DTOs carry explicit `@Transform` (`list-study-sessions-query.dto.ts:34–48`) |
| EP14B-AC2 | **Partially** | zero failures: reviewer gated run 1625/0 (1584/0 recorded at EP14B); the "first fully green CI run linked" clause **unmet** — R-EP14-05 |
| EP14B-AC3 | **Satisfied** | `momentum.ts:108,119` emits `days`; `types.ts:337`; `MomentumWeekStrip.tsx:21` maps `momentum.week.days`; `momentumCopy.ts:52` `studiedOnSentence` maps `week.days`; `weekDates` gone (guard test green); `contracts.md:61` documents `days[]` |

DoD: 1 PASS (AC2 CI clause open), 2 PASS, 3 PASS (scoping suites in the gated run), 4 PASS (field-level `errors`), 8 PASS with one named test missing (R-EP14-06), 9 PASS (`contracts.md`; no `apps/api/README.md` exists). F-EP14B-01 (zone-independent ProfilePage test) inspected, test-only.

### EP14C — E2E reliability (`be5a2ca`)

| AC | Disposition | Evidence |
|---|---|---|
| EP14C-AC1 | **Satisfied** | `study-plan.spec.ts` picks the first editor row whose +15-min window clears the Monday class and the 20:00 edge; all five tests use `getServerWindow` "today"; green in reviewer runs |
| EP14C-AC2 | **Satisfied** | `login.spec.ts` `registerFreshUser` per test; `auth-journeys.spec.ts` `waitForSettledShell` + retried `logoutViaMenu`; cold-start test waits on the real `/api/auth/refresh` (F-EP14C-01) |
| EP14C-AC3 | **Satisfied** | implementer: 3 runs, 0 failures from the three files; reviewer: 55/55 (run 1) + §2a |

DoD: 1 PASS, 8 PASS; test-only. Product races found were registered (BL-14-07, BL-14-08 → EP14F) — the precedent R-EP14-07 cites.

### EP14F — plan page load/generate race (`261cbe7`)

| AC | Disposition | Evidence |
|---|---|---|
| EP14F-AC1 | **Satisfied** | `PlanPage.tsx` `actedRef` set at the top of `handleGenerate`; `loadSaved({ commitMode })` sets `mode` only when `commitMode \|\| !actedRef.current`; tests "resolves after Generate leaves the preview", "before any action sets saved / initial" green |
| EP14F-AC2 | **Satisfied** | retry button passes `commitMode: true`; test "Try again … sets the mode from the retry result" green |
| EP14F-AC3 | **Satisfied** | implementer: 4 clean full runs, 0 race failures; reviewer: journey 1 and `study-plan.spec.ts` 5/5 green in 55/55 |

DoD: 1 PASS, 5 PASS (existing state tests unchanged and green), 8 PASS. D-F1 `Ratified by default` — not ▲, acceptable per core.

### EP14D — accessibility debt (`67e60f3`)

| AC | Disposition | Evidence |
|---|---|---|
| EP14D-AC1 | **Satisfied** | `Dialog.tsx:106–108` captures the restore target only when outside the dialog (StrictMode-safe); StrictMode tests at `Dialog.test.tsx`, `CalendarPage.test.tsx:185`, `AssignmentsPage.test.tsx:230` green; E2E `assignments-list.spec.ts:23` and `calendar.spec.ts:101` green in reviewer runs |
| EP14D-AC2 | **Satisfied** | `assignments-list.spec.ts:228–255` waits for `document.getAnimations()` to settle then asserts ≥ 44 px for every visible control (radios through their label, F-EP14E-03); green at 375 px in reviewer runs; no component change needed (F-EP14D-02) |
| EP14D-AC3 | **Satisfied** | `index.css:19` `--color-success-strong: 21 101 52`; `tailwind.config.js:45`; `Badge.tsx:14` `text-success-strong` (≈ 6.2:1 on the 10 % tint — arithmetic checked); `CalendarEventChip.tsx` no `aria-label`, sr-only ":" / "," in visible order; unit tests green; axe `color-contrast`/`label-content-name-mismatch` clean on every scanned surface with no `ignore` |
| EP14D-AC4 | **Satisfied** | `adaptive-scheduling.spec.ts:100–103` `axeViolations(page)` with no options; `rg ignore` finds none in the spec; journeys 7/7 in reviewer run 1 (+ §2a); F-EP14D-03 flake 1/5 in the record, 0/1 here — untracked, R-EP14-07 |

DoD: 1 PASS, 5 PASS, 6 PASS (focus return proven by unit + E2E), 7 PASS (375 px E2E), 8 PASS.

### EP14E — effort-aware placement (`a75a22b`)

| AC | Disposition | Evidence |
|---|---|---|
| EP14E-AC1 | **Satisfied** | `schema.prisma:205` `hard Boolean?`; migration `20261116130000_assignment_hard_flag` additive, nullable, no backfill, rollback noted; DTOs `@IsOptional() @IsBoolean({ message: 'hard must be true, false or null' })`; service create stores null for null/omitted, 12-key projection in `toAssignmentResponse`, list mapper and `courses.service.ts:112`; D-E4 merge `dto.hard !== undefined`; gated `assignments-e2e.spec.ts:592` matrix (`'true'`,`1`,`0`,`'yes'`,`[]` → 400), read-back-null case, `courses-e2e` `hard` present — all in the 1625/0 run |
| EP14E-AC2 | **Satisfied** | `scheduler.ts:113` `if (assignment.hard != null) return assignment.hard;` then D13-10 unchanged; carried via `gatherPlanData` select `hard: true` → facts `hard: a.hard ?? null` → `classifyAssignments` carry-when-supplied → `isDemanding`; `energy.spec.ts` effort cases + "all-NORMAL identity holds with flags set" green; `study-plans-energy.service.spec.ts` preview placement cases |
| EP14E-AC3 | **Satisfied** | `byEnergyPreference(free, demanding, minBlock)` anchors on the day's earliest NORMAL gap ≥ `minBlock`; off-part-of-day LOW → rank 1.5; `placeBlock` passes `minBlock`; `free` is one date's list (`freeFor(date, …)`) so day choice is untouched; nine guard cases incl. cross-day (R-EP14-03) and determinism green |
| EP14E-AC4 | **Satisfied** | `EffortChoice.tsx`: native `fieldset`/`legend` "How hard is this?", three `sr-only` radios, exact helper copy, `grid grid-cols-3`, `max-sm:min-h-[44px]`, `focus-within:ring-2`, check icon + `font-semibold`, server error under the group with `aria-describedby`/`aria-invalid`; form wiring (`effort` enum, create omits for Auto, edit always sends `hard`, server key `hard` → `effort`); 8 component + 9 form tests green; E2E Hard round-trip + axe green |

Ownership on every `hard` path: `AssignmentsService.update` reads with `findFirst({ where: ownedWhere(userId, id) })` (`:137`) and writes with `update({ where: ownedWhere(userId, id) })` (`:221`), P2025 → uniform 404 `Resource not found`; create scopes the course gate (`:78`); `gatherPlanData` `findMany({ where: { userId, … } })` (`:1001`); `GET /courses/:id` is the existing `findFirst({ where: { id, userId } })`. Gated `assignments-data-scoping.spec.ts:311` — student B PATCH `{ hard: true }` on A's row → 404 `Resource not found`, row unchanged — green. No 403 anywhere; `@CurrentUser()` paths unchanged.

DoD: 1 PASS, 2 PASS (zod enum + strict `IsBoolean` + `assertDto`), 3 PASS, 4 PASS, 5 PASS (local form state; server error rendered, selection kept), 6 PASS (Tab once, arrows wrap — unit; axe — E2E), 7 PASS (`grid-cols-3` at every width; 44 px at 375 px — E2E), 8 PASS, 9 PASS (`contracts.md` data model, endpoint paragraph, Energy paragraph, migration name).

## 4. Cross-child behaviour and the epic ACs

- **EP14B strict pipe × EP14E `hard`:** `validation-strictness-e2e.spec.ts` case "wrong-typed hard flag on POST/PATCH /assignments → 400, nothing written; real boolean works" — green in the gated run. The policy and its first new consumer agree.
- **EP14D axe gate × EP14E control:** `assignments-list.spec.ts:81` scans the open dialog with the group present → `[]`; green in reviewer E2E.
- **EP14F guard × EP14D-AC4 journeys:** journey 1 and all seven green in the reviewer runs; no journey tuned (specs unchanged by EP14F).
- **EP14A trigger × EP14B evidence:** the trigger works (today's run) and the gated step is green single-worker; the job is red only at Secret scan — the one open epic clause (R-EP14-05).
- **EP14C date-proofing × reviewer date:** runs executed on Monday 2026-11-16 (the historically failing day) — green.

| Epic AC | Disposition |
|---|---|
| AC-E14-01 | **Met** — trigger + red fails the job (step-level conclusions verified) |
| AC-E14-02 | **Partially** — gated run 0 failures (reviewer 1625/0; CI step 16 green); wrong-typed bodies → 400 (gated spec); "first fully green CI run" absent (R-EP14-05) |
| AC-E14-03 | **Met** |
| AC-E14-04 | **Met for the owned surfaces** — reviewer full runs green (§2, §2a); residual F-EP14D-03 and BL-14-07 outside the owned specs; F-EP14D-03 untracked (R-EP14-07) |
| AC-E14-05 | **Met** |
| AC-E14-06 | **Met** |
| AC-E14-07 | **Partially** — register + lint rule 6 + `--backlog` work; three deferred items are outside the register (R-EP14-07) |

Out-of-MVP features: none introduced. No new dependency. No secret read; a committed-secret determination is pending the user (R-EP14-05).

## 5. DoD-10 / DoD-11

- **DoD-10 (integrated environment):** reviewer-executed — the full E2E suite on the self-contained integrated stack (NestJS API + Vite web + Postgres, real browser) at `08b6bd5`, 55/55; plus the gated API suite on a freshly migrated database. The human "integrated development environment" walk is **Executed — user grant 2026-11-16** ("ratify all manual testing that is required from me"), applied only after the automated path above. **PASS.**
- **DoD-11:** this report ends with **How to verify by hand**. **PASS.**

## Verdict

**Does not pass** — open should-fix findings: R-EP14-05 (no fully green CI run; EP14B-AC2 / AC-E14-02 clause unmet; owner user), R-EP14-06 (EP14B's named pipe-parity unit test absent; owner implementer), R-EP14-07 (three deferred items outside the backlog register; AC-E14-07; owner planner). No blocker found; every other AC and DoD item is satisfied with reviewer-executed evidence. No queue state changed.

### How to verify by hand

Prerequisites for every workflow: local Postgres on 5432 (trust auth for the OS user), `pnpm install` done, no `.env*` needed (shell env only), disposable data only. Start the stack with `pnpm --filter @studypilot/web test:e2e` in mind or run API + web manually: `PORT=4100 DATABASE_URL=postgresql://<os user>@localhost:5432/<throwaway> JWT_SECRET=$(openssl rand -hex 32) FRONTEND_URL=http://localhost:3100 pnpm start:e2e` (cwd `apps/api`, after `prisma migrate deploy`) and `pnpm exec vite --port 3100` (cwd `apps/web`). Register a throwaway student at `/register`.

**W1 — Strict request bodies (EP14B-AC1, AC-E14-02).** `Executed — 2026-11-16, gated jest on postgres_review_oak, validation-strictness-e2e.spec.ts green.`
1. With a bearer token, `PATCH /study-plans/sessions/<id>/lock` body `{"locked":"yes"}`. Expected: 400, `errors.locked` present, session still unlocked. Repeat with `1` and `"true"`.
2. `POST /assignments` `{"title":"x","hard":"true"}` → 400 `errors.hard` = "hard must be true, false or null"; no row created. `{"hard":true}` → 201 with `hard: true`.
3. `GET /study-sessions?limit=10&offset=0` → 200; `?limit=abc` → 400.

**W2 — Momentum week strip from server dates (EP14B-AC3).** `Executed — 2026-11-16, gated momentum spec + MomentumCard tests + journey 6 (dashboard momentum) in E2E 55/55.`
1. `GET /study-sessions/momentum` → `week.days` has seven `YYYY-MM-DD` strings, `days[0] === week.startDate`, Monday first; try a week spanning a month boundary.
2. Dashboard momentum card shows seven Mon…Sun marks; today's mark is ringed; the sr-only sentence names full weekdays. Negative: `weekDates` no longer exists in `momentumCopy.ts`.

**W3 — Hard flag round-trip and placement (EP14E-AC1/AC2/AC4, AC-E14-06).** `Executed — 2026-11-16, E2E assignments-list.spec.ts:81 (Hard → reopen Hard → Auto → reopen Auto, axe []) in 55/55; gated DTO/scoping matrix; study-plans-energy preview cases.`
1. `/assignments` → "Add your first assignment" → Title; the group "How hard is this?" shows Auto checked and "Auto — based on the type and size." Click **Hard** → helper "Planned for your high-energy times when you have them." Create. Reopen → Hard checked. Choose Auto → Save → reopen → Auto.
2. Keyboard: Tab from Priority lands once on the checked segment; ArrowRight/ArrowLeft move and select with wrap; Tab leaves to Description. `Executed — unit EffortChoice/AssignmentForm tab-order tests; Executed — user grant 2026-11-16 ("ratify all manual testing that is required from me") for the hands-on keyboard walk.`
3. Placement: tag an availability window HIGH (18:00) and one NORMAL (09:00); a 30-min HOMEWORK marked Hard previews at 18:00; the same assignment Auto previews at 09:00; an EXAM marked Not hard previews at 09:00.
4. Ownership: with student B's token, `PATCH /assignments/<A's id>` `{"hard":true}` → 404 `Resource not found`; A's row unchanged. Missing/malformed id → the same 404 (never 403).
5. Existing rows: an assignment created before the migration returns `hard: null` and behaves as Auto.

**W4 — Light-work timing guard (EP14E-AC3).** `Executed — 2026-11-16, energy.spec.ts guard describe 9/9 (jest --verbose).`
1. Same day: NORMAL 09:00–11:00 + LOW 20:00–21:00, light work → lands 09:00 (F-EP13J-04 fixed).
2. NORMAL 09:00–10:00 + LOW 10:00–11:00 (both MORNING) → LOW 10:00 preferred.
3. Monday LOW 22:00 only + Tuesday NORMAL 09:00 → the Monday block still lands Monday 22:00 (day choice untouched).
4. Edge: a NORMAL sliver shorter than the minimum block does not anchor; a day with no NORMAL gap keeps LOW first; demanding and critical work unchanged; same input twice → identical output.

**W5 — Dialog focus return (EP14D-AC1).** `Executed — 2026-11-16, E2E assignments-list.spec.ts:23 + calendar.spec.ts:101 green (dev build, StrictMode); unit StrictMode tests green; Executed — user grant 2026-11-16 for the screen-reader pass.`
1. `/assignments` empty list → focus "Add your first assignment" → Enter → Escape. Expected: focus is back on that button (not `<body>`).
2. At 375 px on `/calendar` (agenda), activate an event chip → Escape → focus returns to the chip.

**W6 — 44 px targets, success contrast, chip names (EP14D-AC2/AC3).** `Executed — 2026-11-16, E2E 375 px walk over every dialog control (incl. the effort labels) + axe color-contrast/label-content-name-mismatch with no ignore, 55/55; Executed — user grant 2026-11-16 for the visual/zoom check.`
1. At 375 px open the assignment dialog; every input/select/textarea/button/link is ≥ 44 px tall after the entrance animation settles; no horizontal scroll.
2. A completed assignment's success badge text is the darker green (`text-success-strong`, ≈ 6.2:1 on the tint).
3. A calendar chip's accessible name reads "Class: Calculus, 09:00" (week) / "Class: 09:00, Calculus" (agenda) with no `aria-label` — voice control "click Calculus" works.

**W7 — Axe gate with no allowlist (EP14D-AC4, AC-E14-05).** `Executed — 2026-11-16, adaptive-scheduling.spec.ts seven journeys 7/7 in reviewer E2E run 1 (+ §2a); rg finds no ignore predicate.`
1. Run `pnpm --filter @studypilot/web test:e2e e2e/adaptive-scheduling.spec.ts` → 7 passed; `expectNoAxeViolations` calls `axeViolations(page)` with no options.

**W8 — Plan page: fast Generate is never undone (EP14F-AC1/AC2).** `Executed — 2026-11-16, PlanPage.test.tsx 4 EP14F cases green; journey 1 + study-plan.spec.ts green in 55/55.`
1. With a slow network throttle, open `/plan` and click "Generate plan" before the saved-plan read resolves. Expected: the preview stays; "No plan yet." never replaces it.
2. Force the saved read to fail (block `/api/study-plans`), click Generate, then unblock and click "Try again": the saved week renders and the mode follows the retry.
3. Negative: without acting, a saved plan with sessions opens in `saved`, an empty one in `initial`.

**W9 — E2E determinism on any date (EP14C, AC-E14-04).** `Executed — 2026-11-16 (a Monday, the historically failing day), full self-contained runs §2/§2a.`
1. Run the full suite three times with default parallelism; expected zero failures from `study-plan`, `login`, `auth-journeys` and zero race failures on journey 1.

**W10 — CI on a delivery branch (EP14A, EP14B-AC2 CI clause).** `Executed — 2026-11-16, anonymous Actions API: run 44006149869 steps 1–17 success, 18 Secret scan failure.` Fully green run: `Not executed — user instructions` (needs a signed-in collaborator to read the Secret-scan log and clear F-EP14B-02; the user grant does not cover CI evidence or security findings).
1. Push any branch; expected a `build-and-test` run with "Run backend tests" single-worker green.
2. After clearing the scan item, expected: all steps green; link the run in EP14B's record.

**W11 — Backlog register (AC-E14-07).** `Executed — 2026-11-16, node tools/queue-lint.mjs docs/stories/EP14 clean; --backlog lists BL-14-02…05, -07.` Gap: R-EP14-07.

**W12 — Integrated development environment walk (DoD-10).** `Executed — user grant 2026-11-16 ("ratify all manual testing that is required from me"), after the reviewer's automated integrated-stack runs above.`
