# EP14 parent index — Adaptive Scheduling Follow-ups (implementation, for the combined review)

**Parent:** [EP14 README](../../README.md) · **Epic:** [EP14](../../../../epics/EP14-adaptive-scheduling-follow-ups.md) · **Plan baseline:** Plan Ready at `966b109` (pass 2, docs commit `08a07aa`)
**Written by:** EP14E's implementer, 2026-11-16, per [review-cadence](../../../../../.agents/review-cadence.md). Every child is `Implemented — awaiting parent review`; nothing here is self-approved.
**Review unit:** EP14A, EP14B, EP14C, EP14F, EP14D, EP14E (queue order). Report goes to `./review.md`.

## 1. Child inventory and Git scope

Combined scope: `08a07aa` (plan baseline, exclusive) → `a75a22b` (EP14E, inclusive). EP15 planning commits (`f4fc48c`, `75a4e56`…`d0bee11`) are interleaved in the same range and are **not** part of this unit — review the per-child ranges, not the whole span.

| # | Child | State | Record | Per-child diff range | Files / +/- | What it delivers |
|---|---|---|---|---|---|---|
| 1 | [EP14A](../../EP14A-ci-runs-the-full-gate-on-delivery-branches.md) | Implemented — awaiting parent review | [EP14A/implementation.md](../EP14A/implementation.md) | `de9a67a^..1eb52a3` (`de9a67a` code; `1eb52a3` closeout fields) | 6 / +45 −12 | CI triggers on every branch, backend gate `--runInBand`, non-empty `JWT_SECRET` fallback; implementer evidence rule (skill closeout 6); deliberate-red + known-red-baseline runs recorded |
| 2 | [EP14B](../../EP14B-api-contract-integrity.md) | Implemented — awaiting parent review (one AC clause open) | [EP14B/implementation.md](../EP14B/implementation.md) | `8e3155c^..8e3155c` | 24 / +292 −47 | `enableImplicitConversion: false` (D-B1a) + strictness spec; zero-failure gated baseline (seeders, bag-survival); momentum `week.days` server-owned; F-EP14B-01 fix |
| 3 | [EP14C](../../EP14C-e2e-reliability.md) | Implemented — awaiting parent review | [EP14C/implementation.md](../EP14C/implementation.md) | `be5a2ca^..be5a2ca` | 7 / +159 −51 | Date-proof study-plan journey, per-test login users, settled-shell logout (test code only); registered BL-14-07/-08 |
| 4 | [EP14F](../../EP14F-plan-page-load-generate-race.md) | Implemented — awaiting parent review | [EP14F/implementation.md](../EP14F/implementation.md) | `95906d5^..261cbe7` (`95906d5` promotion docs; `261cbe7` code) | 8 / +242 −12 | `PlanPage` `actedRef` guard (D-F1a): a late saved-plan read never overrides Generate |
| 5 | [EP14D](../../EP14D-accessibility-debt-from-the-ep13-pass.md) | Implemented — awaiting parent review | [EP14D/implementation.md](../EP14D/implementation.md) | `67e60f3^..67e60f3` | 20 / +257 −64 | `Dialog` focus-restore under StrictMode, `success-strong` token, chip names from content, axe gate with **no** allowlist, 44 px measurement on the settled layout |
| 6 | [EP14E](../../EP14E-effort-aware-placement.md) | Implemented — awaiting parent review | [EP14E/implementation.md](../EP14E/implementation.md) | `8e72aa5^..a75a22b` (`8e72aa5` refiner docs; `a75a22b` code) | 46 / +1376 −45 | `Assignment.hard` (migration `20261116130000_assignment_hard_flag`), 12-key projection, D-E4 PATCH null = Auto, `isDemanding` override, day-centric light-work guard, `EffortChoice` form group |

Decisions: every story decision was ruled by the user or by user grant on 2026-11-16 (see each story's Decisions table); EP14F's D-F1 is `Ratified by default`. No ▲ row is open. One ruled premise did not survive evidence — EP14D's D-D1 (see F-EP14D-01; the ruled *outcome* holds).

## 2. Test commands and last results (per child, as recorded)

All runs 2026-11-16 on this branch. "Gated" = the real-database API suites (`describeIntegration`), which need `DATABASE_URL` (shell-only in these worktrees; no `.env*` file exists) and `--runInBand`.

| Child | Command (cwd) | Last result |
|---|---|---|
| EP14A | CI: scratch pushes `c8fecc5` (deliberate red) and `5bd86c9` (known-red baseline) | runs [43908098549](https://github.com/CodeDiversity/focus-app/actions/runs/43908098549) and [43908087082](https://github.com/CodeDiversity/focus-app/actions/runs/43908087082) — both **failure at "Run backend tests"** as designed (the four R-EP13-03 tests; composition proven by local `--runInBand` parity, F-EP14A-01) |
| EP14B | `npx jest --runInBand` with `DATABASE_URL` (apps/api) · `npx jest` (apps/api) · `pnpm test` + `TZ=UTC pnpm test` (apps/web) · CI proof `c360e2d` | gated **1584/0** (79 suites) · ungated 1105/0 · web 1264/0 both zones · CI run [43910951890](https://github.com/CodeDiversity/focus-app/actions/runs/43910951890): backend ✔ frontend ✔ lint/migrations/recovery ✔ **Secret scan ✘** (F-EP14B-02) |
| EP14C | `pnpm --filter @studypilot/web test:e2e` (repo root, self-contained) ×3 | 47/2/5, 40/3/11, 47/2/5 (passed/failed/did-not-run) — **0 failures from EP14C's three files**; the rest were EP14D's F-EP13M-01 pair and once the EP14F race |
| EP14F | `pnpm exec vitest run src/pages/plan/ui/PlanPage.test.tsx` and full `vitest run` (apps/web) · `pnpm --filter @studypilot/web test:e2e` ×6 | 18/0 · **1268/0** · four clean runs 47/2/5 with **0 race-attributable failures** (runs 3 and 6 aborted by cross-session port contention, F-EP14F-02) |
| EP14D | `pnpm exec vitest run` (apps/web) · `E2E_BASE_URL=http://localhost:3200 pnpm --filter @studypilot/web test:e2e` against an isolated stack (DB `postgres_e2e_oak`, API :4200, Vite :3200) ×5 | **1273/0** · D2/D4/D5 **54/0/0** (first fully green full runs), D1 52/1/1 (locator, fixed), D3 51/1/2 (journey 5 clock flake, F-EP14D-03); journeys 7/7 ×4 |
| EP14E | `DATABASE_URL=… npx prisma migrate deploy` + `npx jest --runInBand` (apps/api, throwaway DB `postgres_gate_oak`) · `npx jest` (apps/api) · `npx vitest run` (apps/web) · `pnpm --filter @studypilot/web test:e2e` (repo root, self-contained) ×3 | gated **1625/0** (79 suites; runs 2 and 3) · ungated 1141/0 · web **1290/0** (112 files) · E2E run 3 **55/0/0** (runs 1–2 failed on test-side issues, fixed: locator substring match; 1 px `sr-only` radio measured instead of its label) |

Per-child counts are authoritative in each record; the final numbers of the unit are the EP14E row (gated 1625, web 1290, E2E 55).

## 3. Epic acceptance criteria — owner and outcome

| ID | Epic AC (abbreviated) | Owner | Outcome |
|---|---|---|---|
| AC-E14-01 | Delivery-branch pushes run the gated suites; red fails the job | EP14A | **Met** — two scratch runs prove trigger + red = failure; `--runInBand` and JWT fallback in `ci.yml` |
| AC-E14-02 | Gated run zero failures; wrong-typed bodies → 400 | EP14B | **Met locally (1584/0, now 1625/0), partially in CI** — backend + frontend steps green on run 43910951890, but the job's Secret scan step is red, so the "first fully green CI run" clause is open (F-EP14B-02, user) |
| AC-E14-03 | Momentum carries its week dates; no client date math | EP14B | **Met** — `week.days` emitted server-side; `weekDates` removed from the client |
| AC-E14-04 | E2E deterministic under parallel load on any date | EP14C (specs); EP14F (the product race) | **Met for the owned surfaces** — 0 failures from EP14C's files over 3 runs; 0 race failures over EP14F's clean runs; EP14D's and EP14E's fully green full runs (54/0, 55/0) confirm. Residual: journey 5 clock flake 1/5 (F-EP14D-03) and the account-menu race (BL-14-07) — neither in the owned specs |
| AC-E14-05 | Four a11y defects fixed; axe gate with no allowlist | EP14D | **Met** — no `ignore` predicate; three fully green full runs; root causes documented (Dialog StrictMode capture, mid-animation 44 px read); D-D1's premise corrected in the primitive (F-EP14D-01) |
| AC-E14-06 | Student-owned hard flag; light-work timing guard | EP14E | **Met** — 4/4 ACs; identity (EP13J-AC3) holds with flags; cross-day test present (R-EP14-03); three recorded deviations (F-EP14E-01…03) |
| AC-E14-07 | Deferred items tracked, lint-enforced, reviewed | breakdown (register + `queue-lint` rule 6 / `--backlog`) | **Met** — register has 8 rows (BL-14-01 dropped → EP15, BL-14-06 dropped on trigger, BL-14-08 promoted → EP14F; BL-14-02…05, -07 open); `queue-lint` clean; `--backlog` lists them |

## 4. Requirement / test traceability — owner and outcome

| Req | Requirement | Owner | Outcome / evidence |
|---|---|---|---|
| TR-E14-01 | Scratch-branch deliberate-red + known-red-baseline CI runs recorded | EP14A | Done — run links in the record; composition via local parity (F-EP14A-01) |
| TR-E14-02 | Strictness E2E (bodies 400, query numbers parse) + full gated run 0 failed | EP14B (+ EP14E extends) | Done — `validation-strictness-e2e.spec.ts` (EP14E added the `hard` boolean cases on POST/PATCH `/assignments`); gated 1584/0 → 1625/0 |
| TR-E14-03 | `week.days` shape tests + week strip renders without date math | EP14B | Done — API domain/types specs, `MomentumWeekStrip` tests |
| TR-E14-04 | Three consecutive full parallel E2E runs, zero failures from the three specs | EP14C | Done — 3 runs, 0 from the three files |
| TR-E14-05 | The three a11y E2E tests + seven journeys green with no `ignore` predicate | EP14D | Done — D2/D4/D5 54/0; journeys 7/7 in D1/D2/D4/D5 (D3: journey 5 flake) |
| TR-E14-06 | Flag DTO/migration matrix, engine override + guard + identity, form tests | EP14E | Done — DTO matrix (e2e + service + pipe), migration read-back case, `energy.spec.ts` effort + guard describes incl. identity-with-flags and cross-day, `EffortChoice.test.tsx` + form round-trips, E2E Hard round-trip + axe |
| TR-E14-07 | Plan-page late-read guard component tests; three full parallel E2E runs with no race failure | EP14F | Done — 4 new `PlanPage` cases; 4 clean full runs, 0 race failures |

## 5. Shared DoD map (as assigned by the README)

| DoD | Applies to | Outcome |
|---|---|---|
| 1 Functional ACs pass | all | Met per records; EP14B-AC2's CI clause open (F-EP14B-02) |
| 2 Validation handles invalid input | EP14B, EP14E | Met — strict pipe (D-B1a); `hard` strict boolean both layers (zod enum on the form, `IsBoolean` + `assertDto` on the API) |
| 3 Academic data scoped to the student | EP14B, EP14E | Met — EP14E: foreign PATCH `{ hard: true }` → uniform 404, row unchanged; plan-data select is `where: { userId }` |
| 4 Actionable API errors | EP14B, EP14E | Met — `hard must be true, false or null` field-level; strictness errors name the field |
| 5 Loading / empty / error states | EP14D, EP14E | Met — EP14E's control is local form state (no loading/empty); the server error renders under the group with the selection kept; EP14D fixes focus/contrast on existing states |
| 6 Keyboard accessibility | EP14D, EP14E | Met — Dialog focus return; `EffortChoice` native radio group (Tab once, arrows wrap), visible focus ring |
| 7 Responsive desktop + mobile | EP14D, EP14E | Met — 44 px at 375 px measured on the settled layout for every control (radios via their labels, F-EP14E-03); `grid-cols-3` at every width |
| 8 Business rules have automated tests | all | Met — see §2 |
| 9 API changes and migrations documented | EP14A (rule), EP14B (`contracts.md`), EP14E (migration) | Met — skill closeout rule 6; `contracts.md` momentum row (EP14B) and data model / endpoint / Energy paragraphs + migration name (EP14E) |
| 10 Reviewed in an integrated environment | parent review | **Open — this review** |
| 11 `review.md` ends with "How to verify by hand" | parent review | **Open — this review** |

## 6. Gaps and open items (honest list)

| Item | Where | Status | Owner |
|---|---|---|---|
| **F-EP14B-02** — CI "Secret scan" (`gitleaks detect --redact`) step red on every proof run (`c360e2d`, run 43910951890) | EP14B record; `.github/workflows/ci.yml` | **Open.** The flagged item is **unconfirmed** (anonymous log access 403; gitleaks could not be run in-session). Consequence: **the first fully green CI run does not exist yet**; AC-E14-02's "fully green" clause and EP14B-AC2 stay partial until the user reads the step log and either removes a false positive or rotates/removes a real one. Location-only candidates named in the record (`.env.example`, `apps/api/.env.example` — tracked templates). | user |
| **F-EP14D-03** — journey 5 (`adaptive-scheduling.spec.ts` ≈331–333) absorption offer not rendered within 15 s after `page.clock.fastForward('11:00')` | EP14D record | **Open, 1/5 isolated-stack runs** (0/3 in EP14E's self-contained runs; never in EP14F's six). Browser-clock vs the running-target tick, not accessibility. Candidate fix recorded (two-step fast-forward or wait for the elapsed label). | planner |
| **F-EP14F-01** — `pnpm test:e2e` (turbo) strips a shell `DATABASE_URL`/`JWT_SECRET`, so a worktree without `.env.local` fails with a misleading message | EP14F record; `turbo.json`, `e2e/test-env.ts` | **Open (harness).** Workaround used by EP14F/EP14D/EP14E: `pnpm --filter @studypilot/web test:e2e` from the repo root. | planner |
| **F-EP14F-02** — self-contained E2E ports :4100/:3100 hard-coded → cross-session collisions (two EP14F runs aborted) | EP14F record; `e2e/test-env.ts` | **Open (harness).** EP14D used an isolated external stack (:4200/:3200, DB `postgres_e2e_oak`, `E2E_BASE_URL`); EP14E found the ports free. | planner |
| **BL-14-07** — account menu unmounted after login (late post-login re-render) | README Backlog; F-EP14C-02 | **Backlog** (not in any owned spec; root cause not isolated). | planner |
| F-EP14A-01 — CI job logs need a signed-in collaborator (403 anonymously) | EP14A record | Recorded; verify at the run links during this review. | reviewer |
| F-EP14D-01 — D-D1's premise wrong; fixed in the `Dialog` primitive, Ruling cell not edited | EP14D record | Recorded for this review to note. | reviewer |
| F-EP14E-01 — one existing engine test's fixture changed (the story said "unmodified"; AC3 is the authority) | EP14E record | Recorded for this review to note. | reviewer |
| F-EP14E-02 — `byEnergyPreference` exported so the D-E7 rank order could be pinned | EP14E record | Recorded for this review to note. | reviewer |
| F-EP14E-03 — EP14D's 44 px E2E walk now measures a radio through its label | EP14E record | Recorded (EP14D-AC2's meaning preserved). | reviewer |
| Open backlog rows BL-14-02…05 | README Backlog | Backlog, each with a revisit trigger; listed by `node tools/queue-lint.mjs --backlog docs/stories`. | planner |

Not pushed: this worktree's commits (`a75a22b` and the index commit) have not been pushed in this dispatch, so no CI run exists for EP14D/EP14E/EP14F content yet — the gated and E2E evidence above is local, recorded per EP14A-AC4 (command + result).

## 7. How to start the review

1. Read the six records in queue order (§1), then verify each child's commands in §2 independently.
2. Gated API: `createdb <db>`; `DATABASE_URL=postgresql://<user>@localhost:5432/<db> npx prisma migrate deploy` and `… npx jest --runInBand` (cwd `apps/api`). Web: `npx vitest run` (cwd `apps/web`). E2E: `DATABASE_URL=postgresql://<user>@localhost:5432/postgres JWT_SECRET=$(openssl rand -hex 32) FRONTEND_URL=http://localhost:3100 pnpm --filter @studypilot/web test:e2e` (repo root; ports :4100/:3100 must be free).
3. Cross-child behaviour worth a look: EP14B's strict pipe × EP14E's `hard` field; EP14D's axe gate × EP14E's new control (scanned in `assignments-list.spec.ts:81`); EP14F's guard × EP14D-AC4's journeys.
4. Save the report at `./review.md` ending with **How to verify by hand**.
