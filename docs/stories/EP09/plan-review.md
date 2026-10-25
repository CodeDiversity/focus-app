# EP09 Whole-Plan Review — Pass 1

**Review date:** 2026-10-25
**Pass number:** 1 (first plan review for EP09 — no prior `plan-review.md` existed; verified absent before this pass)
**Reviewed state:** branch `main`, HEAD `5cad9c7` (`5cad9c7ed059000b7194e27c998166ef2d66acdf` — verified via `.git/refs/heads/main`). Working tree reported clean by the coordinator; the reviewer runtime has no shell access, so tree cleanliness is taken from that provenance, not re-verified.
**Mode:** Plan review (plan-only). No implementation quality review, no test execution, no user walkthrough (plan-only reviews do not create one).
**Context:** EP09 parent review unit, autopilot run 2026-10-25 (user request: plan + implement E2E data cleanup). SP-116/117/118 were implemented **before** any plan review existed; SP-119 was added by the planner this turn. Completed implementation is treated as historical scope, not as unimplemented work to repair.

## Scope and inputs

Plan under review:

- `docs/stories/EP09/README.md` — purpose, environment contract, Stories table, test inventory, Decisions, quality gate, execution queue, plan correction log, quality-gate table (SP-119 addition), final implementation review unit, Autopilot section
- `docs/stories/EP09/SP-116-playwright-login-smoke.md` (Implemented — awaiting parent review)
- `docs/stories/EP09/SP-117-auth-journeys.md` (Implemented — awaiting parent review)
- `docs/stories/EP09/SP-118-semester-course-e2e.md` (Implemented — awaiting parent review)
- `docs/stories/EP09/SP-119-e2e-dedicated-test-database.md` (Ready; decisions D119-1…D119-5)
- `docs/epics/EP09-e2e-test-automation.md` (source epic)

Supporting evidence read (grounding only, not re-audited): `artifacts/EP09/implementation.md` (parent index), `artifacts/SP-116/implementation.md`, `artifacts/SP-117/implementation.md`, `artifacts/SP-118/implementation.md`.

Policy references: `docs/epics/README.md` (shared DoD), `.agents/planning-checklist.md`, `.agents/story-sizing.md`, `.agents/review-cadence.md`, `.agents/delivery-state.md`.

Application code inspected to verify plan claims: `apps/web/playwright.config.ts`, `apps/web/vite.config.ts`, `apps/web/package.json`, `apps/web/e2e/{login,auth-journeys,semesters-courses}.spec.ts`, `apps/web/e2e/helpers.ts`, `apps/api/src/app.module.ts`, `apps/api/src/main.ts`, `apps/api/src/modules/prisma/prisma.service.ts`, `apps/api/prisma.config.ts`, `apps/api/src/modules/auth/testing/recovery-db-harness.ts`, `apps/api/src/modules/auth/auth.controller.ts` (rate-limit surface), `apps/api/nest-cli.json`, `apps/api/tsconfig.json`, `apps/api/package.json`, `turbo.json`, root `package.json`, root `README.md`, `.gitignore`, `docs/stories/EP03/README.md` (anticipated-ID note).

## Verified plan claims (independent code cross-check)

| Plan claim (location) | Verification | Result |
|---|---|---|
| API `ConfigModule` uses `envFilePath: ['.env.local', '.env']` with dotenv non-override semantics (SP-119 D119-2) | `apps/api/src/app.module.ts:13-17` — exactly as claimed (`ignoreEnvFile` only under `NODE_ENV=test`) | ✓ |
| Prisma 7 reads the datasource URL from `process.env.DATABASE_URL` via `prisma.config.ts`; an explicit env var wins (D119-2) | `apps/api/prisma.config.ts:14` and `prisma.service.ts:13` both read `process.env.DATABASE_URL`; `prisma ^7.10.0` is an `apps/api` devDep | ✓ |
| `_test`-suffix disposable-DB convention (D119-2) | `recovery-db-harness.ts:8-28` enforces names ending in `_test`; `studypilot_e2e_test`-style derived names satisfy it | ✓ |
| `nest-cli.json` sets `deleteOutDir: true`, so a shared `dist/` would race the dev `nest start --watch` (D119-3) | `apps/api/nest-cli.json:6` | ✓ |
| Separate `dist-test` outDir via `tsconfig.e2e.json` is coherent with the app tsconfig (D119-3) | `apps/api/tsconfig.json:11-12` (`outDir: ./dist`, `rootDir: ./src`) — `dist-test/main.js` layout follows; fallback `nest build -p … && node dist-test/main` is coherent | ✓ |
| Installed `@playwright/test` is 1.64 (readiness probe: any HTTP status, D119-3) | `apps/web/package.json:40` — `^1.64.1` | ✓ |
| API has no `/health` route, so `GET /` (404) is a valid readiness probe (D119-3) | `apps/api/src/main.ts` — no global prefix, no health controller; no `health` match anywhere in `apps/api/src`; controllers exist only for `auth`, `users`, `onboarding`, `semesters`, `courses`, `assignments` | ✓ |
| `vite.config.ts` proxy target is hard-coded to `http://localhost:4000` (D119-4) | `apps/web/vite.config.ts:18` — plus `cookiePathRewrite`/`rewrite` that the env-driven target must preserve | ✓ |
| `E2E_BASE_URL` already in the `test:e2e` turbo task `env` list, so no `turbo.json` change (D119-5) | `turbo.json:15-22` — `test:e2e` and `test:e2e:headed` both declare `env: ["E2E_BASE_URL"]` | ✓ |
| Root README documents `pnpm test:e2e` with the stale "needs the dev stack running: pnpm dev" wording (SP-119 AC4 target) | `README.md:155,181` | ✓ |
| `.gitignore` must gain `dist-test` (SP-119 file list) | `.gitignore:5` ignores `dist/` but not `dist-test/` — the planned addition is needed and listed | ✓ |
| Current config: `baseURL` honors `E2E_BASE_URL ?? :3000`, no `webServer`, `fullyParallel`, `retries: 0` locally, HTML reporter | `apps/web/playwright.config.ts:12-29` | ✓ |
| Existing specs carry the stale "Start the dev stack with `pnpm dev`" fail-fast wording (D119-5 target) | `login.spec.ts:32-47`, `auth-journeys.spec.ts:33-44`, `helpers.ts:26-32` | ✓ |
| Rate limiting cannot affect the parallel E2E suite | `auth.controller.ts:60-72` — `RecoveryRateLimitGuard` is on `forgot-password`/`reset-password` only; no E2E spec calls those | ✓ |
| EP03 anticipated-ID note corrected to SP-120…SP-123 with EP09 consumption recorded (PC-EP09-01) | `docs/stories/EP03/README.md:32-35` | ✓ |
| Epic Stories table includes SP-119 | `docs/epics/EP09-e2e-test-automation.md:40` | ✓ |
| Queue/status: SP-116/117/118 `Implemented — awaiting parent review`, SP-119 `Ready` (queue, Stories table, story files, implementation records all agree) | README lines 29-34, 82-87; story Status lines; child implementation records | ✓ |

No planner claim was found to be false. One planner disclosure is accurate and appropriately bounded: the `nest start --path` output-dir switch is flagged as an implementation checkpoint with a recorded fallback (SP-119 D119-3, lines 110-113).

## Planning gate assessment (independent)

| # | Gate | Planner status | Independent judgment |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | **Pass.** SP-119 is one cohesive infra outcome (~2–3 h) with a complete sizing block (Outcome/Time/Files/Start context/Verification/Dependencies-exclusions). Each sub-piece (`test-env.ts`, global setup/teardown, config, scripts, Vite env) is under 30 min and only meaningful together; the three existing specs are unchanged, so no test-suite-construction work exists to separate — consistent with the sizing policy (infra setup assessed separately from suite construction; no manufactured children). SP-116/117/118 carry one-line sizing (pre-formal-block convention) but are implemented; their actual footprint/verification is documented in the implementation records and will be verified at the final implementation review — not reopened as planning gates (see O-2). |
| 2 | Original AC/TR coverage | Pass | **Pass.** Epic AC1 (clean checkout, only documented prerequisites) → SP-119 AC1/AC3. AC2 (wired + documented) → SP-116 (implemented) + SP-119 AC4 (root README wording). AC3 (every critical journey or recorded reason) → SP-116/117/118 + backlog rows with recorded reasons in the test inventory. AC4 (deterministic, no sleeps) → SP-116 AC4 + SP-119 (fresh DB per run, order independence). The epic defines no separate TRs. |
| 3 | Applicable DoD (incl. item 10) | Pass | **Pass.** SP-119 maps items 1/4/8/10/11 and marks 2/3/5/6/7/9 N/A with reasons (test infra, no product code/UI/migration change) — each N/A is justified. Item 10 = the EP09 parent review unit; item 11 = the final reviewer walkthrough. |
| 4 | Contract consistency and integration ownership | Pass | **Pass with a precision gap (PR-002).** Ports, `*_e2e_test` naming, dotenv semantics, and the `E2E_BASE_URL` escape hatch are consistent across story/README/epic — but D119-5's blanket fail-fast rewording conflicts with SP-119 AC5's promise to preserve SP-116 AC2 semantics in external-stack mode. |
| 5 | Code paths inspected, unverified disclosed | Pass | **Pass.** Every path the planner claims to have read exists and matches the claims (table above); the single implementation checkpoint (`nest start --path`) is disclosed with a fallback. |
| 6 | Feature-specific risks and owning tests | Pass | **Pass.** Dev-`dist` race → separate `dist-test`; port collision → `--strictPort` + `reuseExistingServer: false` + actionable error; secrets → programmatic dotenv only, sanitized failure text, URL never printed; hard-killed run → namespaced `*_e2e_test` leftover only, never developer data; partial setup failure → idempotent create/migrate. |
| 7 | Dependency mapping and sequencing | Pass | **Pass.** SP-119 depends only on SP-116 (implemented). SP-117/118 keeping green is correctly labeled verification, not a code dependency. Parent review after SP-119. No cycles. |
| 8 | Material decisions resolved | Pass | **Pass.** D119-1…D119-5 resolved with alternatives weighed (runtime cleanup and throwaway-schema rejected with concrete reasons; self-contained chosen as a structural guarantee with accepted costs). |
| 9 | Correction-log completeness | Pass | **Pass.** PC-EP09-01 recorded and independently verified (EP03 note). The "no prior plan review exists" claim is verified — this is pass 1. |
| 10 | Jira identity/sync | Not applicable | **Not applicable.** No sync authorized this turn; SP-119 `Pending creation` is consistent with SP-116/117/118 (none carry a Jira key). |

## Findings

| ID | Severity | Area | Owner | Summary |
|---|---|---|---|---|
| PR-001 | Should-fix | EP09 README — final implementation review unit | Planner | The gate line's "disposes" list omits carried finding **SP-117 F2** (lost-output failure, monitored) |
| PR-002 | Should-fix | SP-119 — D119-5 vs. AC5 | Planner | Blanket fail-fast rewording ("ensure Postgres is running") conflicts with AC5's promise to preserve SP-116 AC2 semantics in `E2E_BASE_URL` external-stack mode |
| PR-003 | Polish | EP09 README — environment contract | Planner | First bullet names dev-stack ports (3000/4000) as the stack tests run against, while the SP-119 paragraph below makes 3100/4100 the default |
| PR-004 | Polish | SP-119 — AC3/AC4 wording | Planner | Fail-fast/README wording should distinguish "Postgres unreachable" from "configured dev database missing" and list the one-time setup prerequisites |

### PR-001 — Final review unit omits carried finding SP-117 F2 (should-fix)

- **Requirement/source:** `.agents/review-cadence.md` — the planner identifies the review unit in the parent README, including the source AC/test mapping and the findings the final review disposes; shared severity contract — a scope record omitting an in-scope item is at least should-fix.
- **Observed gap:** `docs/stories/EP09/README.md:117` (final implementation review unit, Gate line) lists the findings the combined parent review disposes as "SP-116 F5 / SP-117 F1 / SP-117 F4 / SP-118 F2 / SP-118 F4 / SP-118 F5". The parent index (`artifacts/EP09/implementation.md:49-65`) carries five distinct open findings, including **SP-117 F2** (one lost-output e2e failure, open/monitored, 39 consecutive green runs after, HTML-report/screenshot capture in place). SP-117 F2 is absent from the README's list. (The Autopilot Resume line at README:131 lists only the two user-deferred findings — SP-117 F1 / SP-118 F2 — which is a different, correctly-scoped list; the omission is in the final review unit's full list.)
- **Consequence:** the canonical coordination record understates the final review's disposition scope; a final reviewer working from the README alone could skip recording an explicit disposition for a still-open carried finding.
- **Suggested correction:** add SP-117 F2 to the Gate line's "disposes" list, annotated as monitored (final review records the disposition — e.g., closed on 39+ green runs with report capture in place, or kept monitored).
- **Closure condition:** README Gate line enumerates all five carried findings (cleanup trio SP-116 F5 / SP-117 F4 / SP-118 F4, SP-117 F1, SP-117 F2, SP-118 F2, SP-118 F5) with their expected disposition.

### PR-002 — D119-5 fail-fast rewording vs. AC5 external-stack semantics (should-fix)

- **Requirement/source:** SP-119 AC5 (story lines 48-51): setting `E2E_BASE_URL` "preserves the existing SP-116 AC2 semantics: a dead port fails fast with the actionable message". SP-116 AC2 (story lines 30-31): "a missing API/DB produces a clear failure, not a confusing timeout cascade." Planning gate 4 (contract consistency).
- **Observed gap:** D119-5 (story lines 123-128) says the fail-fast wording in the three specs + `helpers.ts` ("Start the dev stack with `pnpm dev`") is updated to "the new prerequisite ('ensure Postgres is running')" — stated unconditionally. The current message interpolates the target URL (`helpers.ts:28`, `login.spec.ts:33`, `auth-journeys.spec.ts:34`). In external-stack mode (`E2E_BASE_URL` set), a dead **external** stack would then produce "Could not reach the API at `<external-url>` … ensure Postgres is running" — advice pointing at the wrong cause, since the self-contained Postgres lifecycle is exactly what external mode skips.
- **Consequence:** a literal implementation of D119-5 degrades the actionable-message promise that AC5 explicitly preserves for the documented escape-hatch mode (SP-116 AC2); the plan's own AC and decision contradict each other.
- **Suggested correction:** one line in D119-5 — the fail-fast tail is mode-conditional: self-contained (default) → "ensure Postgres is running"; `E2E_BASE_URL` set → keep the SP-116 semantics ("the externally provided stack at `<E2E_BASE_URL>` must be running").
- **Closure condition:** D119-5 states the message tail is mode-conditional, so both modes keep an actionable, correct-cause message.

### PR-003 — Environment contract bullet 1 names superseded ports (polish)

- **Requirement/source:** EP09 README "Environment contract" (lines 11-25).
- **Observed gap:** bullet 1 (lines 13-14) says tests run against "Vite dev server (port 3000 …), NestJS API (port 4000)"; the SP-119 paragraph (lines 20-25) then makes web :3100 / API :4100 the default and 3000/4000 the external-stack target. Read literally, the two bullets describe different stacks.
- **Consequence:** apparent self-contradiction in the shared contract; a newcomer may believe the default run needs the dev stack on 3000/4000.
- **Suggested correction:** make bullet 1 port-agnostic ("the real, unmocked stack — Vite dev server proxying `/api` to the NestJS API, Postgres") or annotate 3000/4000 as the external-stack (`E2E_BASE_URL`) targets.
- **Closure condition:** the contract's first bullet cannot be read as requiring the dev stack for a default run.

### PR-004 — Fail-fast and README wording should name the real prerequisite chain (polish)

- **Requirement/source:** Epic AC1 (epic lines 44-45): "runs … from a clean checkout with only the documented prerequisites (Postgres running)"; SP-119 AC1/AC3.
- **Observed gap:** the self-contained run's true prerequisite chain is: `pnpm install` + `apps/api/.env.local` (with a `DATABASE_URL` whose database exists) + `pnpm db:generate` (the generated client is gitignored — `.gitignore:51`) + Postgres running. `test-env.ts` must connect to the configured dev **database** to `CREATE`/`DROP` the `*_e2e_test` database, so a missing dev database is a distinct failure from a stopped Postgres. SP-119 AC3 names only "Postgres must be running", and AC4's root-README wording is unspecified.
- **Consequence:** if the README wording keeps "(Postgres running)" as the only prerequisite, epic AC1's "documented prerequisites" is literally incomplete; a user whose dev database was never created gets a less precise message.
- **Suggested correction:** in SP-119 (AC3/AC4 or Notes) state that the fail-fast message distinguishes Postgres-unreachable from configured-dev-DB-missing, and that the root README wording lists the one-time setup steps (install, `.env.local`, `db:generate`) alongside "Postgres running; no `pnpm dev` needed".
- **Closure condition:** the planned README/message wording covers the full prerequisite chain.

## Observations and implementation obligations (non-gating for the plan)

- **O-1 (implementer, SP-119 closeout):** the parent index status line (`artifacts/EP09/implementation.md:4` — "Ready for review — all children implemented") is stale once SP-119 is in the review unit and unimplemented. The plan already assigns the refresh (README:116: "must be refreshed to include SP-119 after implementation"). This is an implementation-phase obligation, verified at the final parent review — it is not a planning gate and does not block SP-119 dispatch.
- **O-2:** SP-116/117/118 story files carry one-line sizing blocks (no formal Files/Start-context/Verification fields) — they predate the current sizing-block convention and are implemented. Per the task authorization, completed implementation is not reopened to repair a planning gate; the implementation records document the actual footprint and the final implementation review verifies it against code.
- **O-3 (implementer watch item):** `prisma` is a devDependency of `apps/api` only; `apps/web/e2e/test-env.ts` must spawn `prisma migrate deploy` in the `apps/api` workspace context (workspace binary or `pnpm --filter @studypilot/api exec`) — under pnpm's strict `node_modules`, a bare `npx prisma` from `apps/web` would be wrong. Verify on the first run, analogous to the disclosed `nest start --path` checkpoint.
- **O-4 (implementer watch item):** PostgreSQL has no `CREATE DATABASE IF NOT EXISTS`; the "idempotent create" in D119-2 must check `pg_database` first or catch the `42P04` already-exists error.
- **O-5 (implementer watch item):** `DROP DATABASE` requires zero active connections to the target database — teardown must terminate the test backends before dropping (the plan's order is correct), and the drop client must connect to a *different* database.
- **O-6 (verified, no action):** the recovery rate-limit guard applies only to `forgot-password`/`reset-password`; no E2E spec calls those, so the fully-parallel suite against a single fresh database has no rate-limit exposure.

## Requirement / DoD planning-coverage summary

- **Epic AC1** (clean checkout, documented prerequisites, Postgres running) → owned by SP-119 AC1/AC3 (+ AC4 README wording). Mechanism is a sound planned guarantee (dedicated `*_e2e_test` DB, own processes/ports, per-run drop) with a concrete verification matrix (two consecutive green runs; dev-DB row counts identical before/after; `*_e2e_test` absent after; Postgres-stopped run fails fast; dev stack unaffected). This is a **future test obligation, not a proven guarantee** — it will be verified at implementation and the final parent review.
- **Epic AC2** (wired into workflow, documented) → SP-116 (implemented: root README + turbo task) + SP-119 AC4 (wording refresh).
- **Epic AC3** (every critical journey or recorded reason) → SP-116/117/118 implemented; Dashboard/Profile/Tasks deliberately backlog with recorded reasons in the test inventory.
- **Epic AC4** (deterministic, no sleeps) → SP-116 AC4 (implemented: unique per-run/per-worker data, no sleeps) + SP-119 (fresh migrated DB per run; order independence preserved, `fullyParallel` intact).
- **Environment contract** (dedicated test DB, no developer-data destruction, no order dependence) → implemented by SP-119 as a structural guarantee (separate DB + separate processes + per-run drop); challenged against hard-kill, partial-setup, and secret-leakage interleavings — sound (see gate 6).
- **Shared DoD** → SP-119 maps 1/4/8/10/11; 2/3/5/6/7/9 N/A with reasons (no product code/UI/migration change). Item 10 is this parent review unit; item 11 is the final reviewer walkthrough (created at the final implementation review, not now).
- **Carried findings reconciliation:** SP-119 structurally resolves SP-116 F5 / SP-117 F4 / SP-118 F4 (data cleanup) — the summary says so and the mechanism (per-run DB drop) makes cleanup code unnecessary. SP-117 F1 (AC1 wording vs. SP-102 register→login) and SP-118 F2 (course removal = archive, D111-2) were explicitly deferred by the user to the final parent review (README:121). SP-117 F2 (monitored) and SP-118 F5 (helper consolidation) also need final-review dispositions — SP-117 F2 is the one missing from the README's list (PR-001).
- **One sequential implementer:** no concurrent writers required anywhere in the plan; SP-119 is a single story with one owner. ✓
- **Implementation dependency blockers:** none — SP-119's only dependency (SP-116) is implemented.

## Verdict

**Changes Required.**

The breakdown, sizing, contracts, dependencies, AC coverage, and decision quality are sound: all planner code claims verified true, all ten planning gates independently assessed, the self-contained-stack design is a structurally correct resolution of the carried data-cleanup findings, and no implementation dependency blocks SP-119. Two should-fix planning findings remain, both small documentation corrections owned by the planner:

1. **PR-001** — add SP-117 F2 to the final implementation review unit's "disposes" list (README:117).
2. **PR-002** — make D119-5's fail-fast rewording mode-conditional so `E2E_BASE_URL` external-stack mode keeps the SP-116 AC2 semantics AC5 promises (SP-119 story, lines 123-128).

PR-003/PR-004 are optional polish; they may be fixed in the same turn or deferred. No user decision is needed — nothing here is a `Needs Decision` item.

## Handoff

- **Planner must (blocks re-review):** PR-001, PR-002 (both one-line documentation edits: EP09 README Gate line; SP-119 D119-5).
- **Planner may (optional):** PR-003, PR-004.
- **No user decisions required.**
- **After planner corrections:** fresh focused re-review (pass 2) of the corrected lines only; on `Plan Ready`, dispatch SP-119 implementation (fresh implementer) → parent index refresh (O-1) → final combined EP09 parent review (fresh reviewer; disposes all five carried findings per the corrected Gate line).
- **Not part of this review:** implementation quality of SP-116/117/118 (final implementation review), user walkthrough (final implementation review only), Jira sync (not authorized).

*Reviewer runtime limitation: no shell access — Git branch/HEAD verified via `.git` refs; tree cleanliness and all test-suite results cited in this report are implementer/coordinator-provided evidence, not reviewer-executed. No tests were run (plan-only review).*
