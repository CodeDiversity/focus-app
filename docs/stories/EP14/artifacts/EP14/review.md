# EP14 combined implementation review — round 2

**Date:** 2026-11-16
**Pass:** 2 (`parent_review`, re-review)
**Reviewed commit:** `5e35f2b` (clean tree, branch `hfi/754150a7-2d3e-44d5-aa03-993c68baf603/oak`)
**Scope:** the EP14 review unit — EP14A, EP14B, EP14C, EP14F, EP14D, EP14E (queue order). Round 1 is preserved verbatim at [review-round-1.md](./review-round-1.md) (reviewed `08b6bd5`). This round covers what changed since: `a06838a` (docs: BL-14-09…11, four story annotations, C-EP14-04…07), `7c8ef02` (code: R-EP14-06 fix, API only), `5e35f2b` (docs: R-EP14-05 user waiver, BL-14-12), plus cross-child behaviour at HEAD. Interleaved EP15 planning commits (`4a68cb5`…`1682ee8`) are out of scope and untouched.
**Change surface since round 1 (reviewer-checked):** `git diff --stat 08b6bd5..HEAD -- . ':!docs'` = exactly the 12 API files of `7c8ef02` (+157 −108); `apps/web`, `e2e`, `.github`, Prisma schema/migrations: **0 lines changed**. Round-1 evidence is therefore reused for the web unit suite and the CI step conclusions; everything the API change can touch was rerun.
**Reviewer:** reviewer, fresh session. Read-only except this file, `review-round-1.md` (verbatim move) and the passing sync listed in §7.

## 1. Prior findings — disposition

| ID | Round-1 severity | Disposition | Fresh evidence (reviewer-executed unless marked) |
|---|---|---|---|
| R-EP14-05 | Should-fix (EP14B-AC2 / AC-E14-02 "first fully green CI run" clause; owner user) | **Waived — user, 2026-11-16, C-EP14-04 / BL-14-12.** Not satisfied. Scope of the waiver is exactly the "first fully green CI run" clause for the EP14 sign-off; nothing else. The Secret-scan item stays open as **BL-14-12** (owner user; trigger "before any release tag or merge to `main`"). | Recorded source: `history.md` C-EP14-04 ("Skip EP14-05 mark it as canceled for now" — user, 2026-11-16, Status "Cancelled — user waiver (tracked as BL-14-12)"); README backlog row BL-14-12 present, `queue-lint --backlog` lists it. Every other gate behind the clause is verified, not waived: strict validation (gated strictness spec green in the 1630/0 run below), zero-failure gated run (reviewer 1630/0 at HEAD), CI steps 1–17 green on run 44006149869 at `08b6bd5` (round-1 evidence; `ci.yml` unchanged since). No CI run exists at HEAD (`7c8ef02` not pushed) — covered by EP14A-AC4's local-evidence rule, not by the waiver. |
| R-EP14-06 | Should-fix (EP14B-AC1 unit clause; owner implementer) | **Resolved** at `7c8ef02`. | `apps/api/src/common/pipes/validation-pipe-options.ts:21–27` exports frozen `FIELD_VALIDATION_PIPE_OPTIONS` (`whitelist`, `forbidNonWhitelisted`, `transform`, `transformOptions.enableImplicitConversion: false`, nested `Object.freeze`). `main.ts:7,18` and `test/test-http.ts:30,105` both `new FieldValidationPipe(FIELD_VALIDATION_PIPE_OPTIONS)`; no inline literal in either. `validation-pipe-options.spec.ts` (5 tests, no DB): deep-equal pin, frozen (outer + nested), pipe adopts it unchanged (`validatorOptions`, `transformOptions`, `isTransformEnabled`), and a source guard over `main.ts` and `test/test-http.ts` (imports the constant, constructs from it, no `enableImplicitConversion:` literal, no `new …ValidationPipe({`). Spec-local copies aligned: `assignments.service.spec.ts` ×4, `auth.controller.spec.ts` (stock `ValidationPipe` → `FieldValidationPipe` + constant), `study-plans-recovery-catch-up.service.spec.ts` ×6 (`plainToInstance(…, FIELD_VALIDATION_PIPE_OPTIONS.transformOptions)`, comment corrected), and the five `auth/dto/*.dto.spec.ts` whose comment claimed to mirror `main.ts` — the finding's closure condition (align or justify) is met for every named file and the extra five are in-scope by the same reasoning. `grep -rn enableImplicitConversion apps/api/src` → only the constant, its spec and one doc comment in `validation-strictness-e2e.spec.ts:10`. Executed: `npx jest --verbose src/common/pipes/validation-pipe-options.spec.ts` → 5/5; the 10 touched suites → **381 passed / 0 failed**, exit 0; full gated run below. |
| R-EP14-07 | Should-fix (AC-E14-07; owner planner) | **Resolved** at `a06838a`. | README `## Backlog` rows **BL-14-09** (journey-5 browser-clock flake, F-EP14D-03; trigger: reproduces in any full run after EP14 closes, or EP15J touches the clock helpers), **BL-14-10** (turbo strips shell `DATABASE_URL`/`JWT_SECRET`, F-EP14F-01; trigger: next edit to `turbo.json`/root `test:e2e`, or a second developer hits it), **BL-14-11** (hard-coded E2E ports, F-EP14F-02; trigger: concurrent worktree sessions routine, or EP15J touches the harness) — each with source, why-deferred, owner, last-reviewed, status. `node tools/queue-lint.mjs docs/stories/EP14` → "clean (11 files)", exit 0; `--backlog docs/stories` lists BL-14-02…05, -07, -09…12. Every deferred item named by a record is now in the register. |
| R-EP14-08 | Polish (owner planner) | **Resolved** at `a06838a`. | (a) `EP14E…md:61` now states `'light work prefers the LOW window'` was re-fixtured (F-EP14E-01; AC authority) and only `'preference, never a constraint…'` passes unmodified; (b) `EP14B…md:42` names `MomentumCard.test.tsx` as the delivery home of the strip coverage (R-EP14-08b); (c) `EP14D…md:33` carries the `:100`→`:101` line note beside the frozen AC; (d) `EP14D…md:54` implementation note under D-D1 (F-EP14D-01: premise wrong, fixed in the primitive, ruled outcome holds). AC texts themselves unchanged (checked in `git show a06838a`). |
| R-EP14-04 | Polish (plan review pass 2) | Resolved (round 1, at `de9a67a`) — unchanged. | — |

## 2. New findings

| ID | Severity | Child / paths | Requirement | Observed gap | Owner | Closure condition |
|---|---|---|---|---|---|---|
| R-EP14-09 | Polish | Parent index [implementation.md](./implementation.md) §2 (EP14E row "gated 1625"), §3 (AC-E14-02 "partially in CI", AC-E14-07 "8 rows"), §6 (F-EP14B-02 "Open", F-EP14D-03/F-EP14F-01/-02 "Open … planner"); EP14B record Status line ("awaiting re-review") | Record accuracy (core: one fact, one place) | Counts and dispositions predate the fix round and the waiver: gated is now 1630 (80 suites), the register has 12 rows with BL-14-09…12, F-EP14B-02 is tracked as BL-14-12 under the user waiver, F-EP14D-03/F-EP14F-01/-02 are BL-14-09…11. Nothing normative is wrong — the authoritative homes (EP14B record fix-round section, README backlog, `history.md`) are correct. | implementer (optional) | One-line touches to the parent index and the EP14B record status; or leave — this report is the sign-off record. Does not block. |

No blocker. No should-fix. Out-of-MVP features: none introduced since round 1. No new dependency (`package.json` unchanged). No secret read; the Secret-scan determination remains with the user (BL-14-12).

## 3. Evidence log (round 2)

Reviewer-executed at `5e35f2b`, clean tree, 2026-11-16, macOS, Postgres 5432, shell-only env (no `.env*` read or written):

| Gate | Command (cwd) | Result |
|---|---|---|
| Change surface | `git diff --stat 08b6bd5..HEAD -- . ':!docs'`; `git diff 08b6bd5..HEAD -- apps/web \| wc -l` (repo root) | 12 API files only; web/e2e 0 lines |
| Gated API (full, single worker) | `createdb postgres_review2_oak_5cc5`; `DATABASE_URL=postgresql://<os user>@localhost:5432/postgres_review2_oak_5cc5 npx prisma migrate deploy` → "All migrations have been successfully applied" (incl. `20261116130000_assignment_hard_flag`); `… npx jest --runInBand` (`apps/api`) | **80 suites, 1630 passed, 0 failed**, exit 0 (13.8 s); DB dropped afterwards. (A first attempt on `postgres_review2_oak` hung: the database vanished mid-run — a sibling worktree session on the same cluster evidently ran the same throwaway-DB name and dropped it; environment, not code. Rerun under a session-unique name.) |
| Pipe-parity spec, verbose | `npx jest --verbose src/common/pipes/validation-pipe-options.spec.ts` (`apps/api`) | 5/5: pins strict policy; frozen; adopted unchanged; `main.ts` and `test/test-http.ts` build from the constant |
| Touched suites | `npx jest src/common/pipes src/modules/assignments/assignments.service.spec.ts src/modules/auth/auth.controller.spec.ts src/modules/auth/dto src/modules/study-plans/study-plans-recovery-catch-up.service.spec.ts` (`apps/api`) | 10 suites, **381 passed / 0 failed**, exit 0 |
| Literal sweep | `grep -rn enableImplicitConversion apps/api/src` | only `validation-pipe-options{,.spec}.ts` and a doc comment (`validation-strictness-e2e.spec.ts:10`) |
| E2E full, self-contained stack, default parallelism | `DATABASE_URL=postgresql://<os user>@localhost:5432/postgres JWT_SECRET=$(openssl rand -hex 32) FRONTEND_URL=http://localhost:3100 pnpm --filter @studypilot/web test:e2e` (repo root; ports :4100/:3100 free) | **55 passed / 0 failed / 0 did not run (21.0 s)**, exit 0; throwaway `postgres_e2e_test` dropped by the harness; journey 5 (BL-14-09) passed |
| Queue lint / backlog | `node tools/queue-lint.mjs docs/stories/EP14`; `node tools/queue-lint.mjs --backlog docs/stories` (repo root) | clean (11 files), exit 0; backlog lists BL-14-02…05, -07, -09…12 (+ EP15's BL-15-01…06) |
| Story annotations | `grep -n R-EP14-08 docs/stories/EP14/EP14{B,D,E}-*.md` | four hits at `EP14B:42`, `EP14D:33`, `EP14D:54`, `EP14E:61` |

Reused from round 1 (code unchanged, per the skill's evidence discipline): web unit **112 files, 1290 passed / 0 failed** (`npx vitest run`, `apps/web`, at `08b6bd5` — `apps/web` byte-identical at HEAD); the 70/70 verbose changed-file web run; CI step conclusions for runs 44006149869 / 43908098549 / 43908087082 / 43910951890 (`.github` unchanged); round-1 E2E runs 2–3 (§2a there) — this round adds a fourth consecutive clean full run at HEAD.

Implementer-provided (consistent with the reviewer's numbers): EP14B fix-round record — touched 381/0, ungated 1146/0, gated 1630/0 on `postgres_fix_oak`, prettier/eslint/tsc clean (the lint/type checks were not rerun here; they are not AC-bearing).

## 4. Child by child (delta from round 1; unchanged children carry forward)

### EP14B — API contract integrity (`8e3155c` + fix `7c8ef02`)

| AC | Disposition | Evidence |
|---|---|---|
| EP14B-AC1 | **Satisfied** (now including the unit clause) | strictness spec green in the 1630/0 run; parity unit test present and green (R-EP14-06 resolved, §1) |
| EP14B-AC2 | **Satisfied except the waived clause** — zero-failure gated run verified (1630/0 at HEAD); "first fully green CI run linked" **waived — user, 2026-11-16, C-EP14-04 / BL-14-12** (not satisfied) | §1 R-EP14-05 |
| EP14B-AC3 | **Satisfied** (unchanged since round 1; web untouched) | round 1 §3 |

DoD for EP14B: 1 PASS (AC2 clause waived by the user, recorded), 2 PASS, 3 PASS, 4 PASS, 8 **PASS** (the one missing named test now exists), 9 PASS.

### EP14A, EP14C, EP14F, EP14D, EP14E — unchanged

No code, test, migration or workflow change since `08b6bd5` (change-surface check above). Round-1 AC and DoD tables stand ([review-round-1.md](./review-round-1.md) §3). Re-executed at HEAD anyway because the API bootstrap changed under them: the gated suites they depend on (EP14E's DTO matrix, scoping, engine specs; EP14B's seeders) — green in the 1630/0 run; the full E2E suite (EP14C's three specs, EP14F's journey 1 + `study-plan.spec.ts`, EP14D's three a11y tests + seven axe journeys, EP14E's Hard round-trip + axe) — 55/55. Story-text polish from R-EP14-08 confirmed present; the AC texts are unchanged.

## 5. Cross-child behaviour and the epic ACs (at HEAD)

- **EP14B shared pipe options × every gated consumer:** the one constant now feeds production, the integration harness and the spec-local pipes; the full gated run is green with it — so the strictness EP14E's `hard` matrix relies on is the same object production uses, by construction.
- **EP14B strict pipe × EP14E `hard`:** `validation-strictness-e2e.spec.ts` `hard` POST/PATCH cases green (1630/0 run).
- **EP14D axe gate × EP14E control; EP14F guard × EP14D-AC4 journeys; EP14C date-proofing:** all in the 55/55 run at HEAD (a Monday).
- **EP14A trigger × EP14B evidence:** unchanged workflow; the gated step was green single-worker at `08b6bd5`; no run at HEAD (not pushed) — local evidence recorded per EP14A-AC4.

| Epic AC | Disposition |
|---|---|
| AC-E14-01 | **Met** (round 1 evidence; `.github` unchanged) |
| AC-E14-02 | **Met except the waived clause** — gated 1630/0 at HEAD, wrong-typed bodies → 400 (gated spec); "first fully green CI run" waived — user, 2026-11-16, C-EP14-04 / BL-14-12 |
| AC-E14-03 | **Met** |
| AC-E14-04 | **Met for the owned surfaces** — fourth consecutive clean full run; residuals BL-14-07 and BL-14-09 are registered |
| AC-E14-05 | **Met** |
| AC-E14-06 | **Met** |
| AC-E14-07 | **Met** — register has 12 rows (BL-14-09…12 added), lint rule 6 clean, `--backlog` lists them; every deferred item named in a record is registered |

## 6. DoD-10 / DoD-11

- **DoD-10 (integrated environment):** reviewer-executed at `5e35f2b` — full E2E suite on the self-contained integrated stack (NestJS API + Vite web + Postgres, real Chromium) 55/55, and the gated API suite on a freshly migrated database 1630/0. The human IDE walk: **Executed — user grant 2026-11-16** ("ratify all manual testing that is required from me"), applied after the automated path above; the grant does not extend to CI or security (BL-14-12 stays with the user). **PASS.**
- **DoD-11:** this report ends with **How to verify by hand**. **PASS.**

## Verdict

**Passes** — no blocker or should-fix remains open. R-EP14-06, R-EP14-07 and R-EP14-08 are resolved against persisted commits (`7c8ef02`, `a06838a`) with reviewer-executed evidence at `5e35f2b`; R-EP14-05 is **waived by the user (2026-11-16, C-EP14-04 / BL-14-12)** for exactly the "first fully green CI run" clause and is recorded as waived, not satisfied; the Secret-scan item remains open with the user as BL-14-12 (trigger: before any release tag or merge to `main`). R-EP14-09 is polish. Passing sync performed (§7).

## 7. Passing sync (what this review wrote)

`review.md` (this file), `review-round-1.md` (verbatim move of round 1), README execution queue (six rows → `Reviewed`, Active/Next, Final-review line, Status line), the six story `**Status:**` lines, the parent index status line, `history.md` (implementation-review round 2 row; round-1 link → `review-round-1.md`; correction-log closures C-EP14-05…07 and R-EP14-09), `artifacts/efficiency.md` (one row). No code, test, migration, AC text or EP15 file touched.

### How to verify by hand

Prerequisites and workflows W1–W12 are unchanged from [review-round-1.md](./review-round-1.md#how-to-verify-by-hand); the labels below are refreshed for this round. Use disposable local data; shell env only; no secrets.

**W1 — Strict request bodies (EP14B-AC1, AC-E14-02).** `Executed — 2026-11-16, gated jest at 5e35f2b on postgres_review2_oak_5cc5: validation-strictness-e2e.spec.ts green; validation-pipe-options.spec.ts 5/5.`
1. Steps as round 1 (`locked: "yes"/1/"true"` → 400 `errors.locked`; `hard: "true"` → 400; `?limit=abc` → 400, `?limit=10` → 200).
2. New: open `apps/api/src/main.ts` and `apps/api/src/test/test-http.ts` — both construct `new FieldValidationPipe(FIELD_VALIDATION_PIPE_OPTIONS)`; try re-inlining `{ transformOptions: { enableImplicitConversion: true } }` in either and run `npx jest src/common/pipes` — expected: the source-guard test fails.

**W2 — Momentum week strip (EP14B-AC3).** `Executed — reused round 1 (web unchanged) + journey 6 in the 55/55 run at 5e35f2b.`

**W3 — Hard flag round-trip and placement (EP14E).** `Executed — 2026-11-16, E2E assignments-list.spec.ts Hard round-trip + axe in 55/55 at 5e35f2b; gated DTO/scoping matrix in 1630/0; keyboard walk Executed — user grant 2026-11-16.`

**W4 — Light-work timing guard (EP14E-AC3).** `Executed — energy.spec.ts in the 1630/0 gated run at 5e35f2b (9/9 guard cases per round 1 verbose run).`

**W5 — Dialog focus return (EP14D-AC1).** `Executed — E2E assignments-list.spec.ts:23 + calendar.spec.ts:101 green in 55/55 at 5e35f2b; screen-reader pass Executed — user grant 2026-11-16.`

**W6 — 44 px targets, success contrast, chip names (EP14D-AC2/AC3).** `Executed — 375 px E2E walk + axe with no ignore in 55/55 at 5e35f2b; visual/zoom check Executed — user grant 2026-11-16.`

**W7 — Axe gate with no allowlist (EP14D-AC4).** `Executed — seven journeys 7/7 in the 55/55 run at 5e35f2b (fourth consecutive clean full run across rounds).`

**W8 — Plan page fast Generate (EP14F).** `Executed — journey 1 + study-plan.spec.ts green in 55/55 at 5e35f2b; PlanPage unit cases reused from round 1 (web unchanged).`

**W9 — E2E determinism on any date (EP14C).** `Executed — 2026-11-16 (Monday), full self-contained run 55/0 at 5e35f2b; plus round 1's three runs at 08b6bd5.`

**W10 — CI on a delivery branch (EP14A; EP14B-AC2 CI clause).** `Executed — round 1 anonymous Actions API evidence (steps 1–17 green, Secret scan red on 44006149869); .github unchanged since.` Fully green run: `Not executed — waived by the user for the EP14 sign-off (C-EP14-04); tracked as BL-14-12, owner user — before any release tag or merge to main, read the step-18 log signed in (or run gitleaks detect --redact locally), fix a real item or add a reviewed, narrowly scoped allowlist, then link the fully green run in artifacts/EP14B/implementation.md.`

**W11 — Backlog register (AC-E14-07).** `Executed — node tools/queue-lint.mjs docs/stories/EP14 clean; --backlog lists BL-14-09…12.`

**W12 — Integrated development environment walk (DoD-10).** `Executed — user grant 2026-11-16, after the reviewer's automated integrated-stack runs at 5e35f2b.`
