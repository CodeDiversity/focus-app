# SP-119 checkpoint

Updated: 2026-10-25 (implementer, branch `main`) — **scope A complete** (incl. cold-stack flakiness fix)
Execution state: `docs/stories/EP09/README.md` — Execution queue, SP-119 row (`In progress`); Active substory SP-119
Story: `docs/stories/EP09/SP-119-e2e-dedicated-test-database.md`
Review unit: EP09 parent — `docs/stories/EP09/artifacts/EP09/implementation.md`
Role / scope: implementer; test infrastructure only (Playwright config, `apps/web/e2e/test-env.ts` + global setup/teardown, `apps/api` test-only build config + script, Vite proxy env, package devDeps/scripts, `.gitignore`, root README wording, stale fail-fast messages in `helpers.ts`/`login.spec.ts`/`auth-journeys.spec.ts`). No production code (`apps/*/src`), no spec assertion changes, no AC/decision changes.

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at last update: `e9c72d4` (scope A commit) → then the cold-stack flakiness fix commit (this closeout)
- Saved work: **all scope A code/config committed in two commits** — (1) `e9c72d4`: 4 new files (`apps/web/e2e/test-env.ts`, `apps/web/e2e/global-setup.ts`, `apps/web/e2e/global-teardown.ts`, `apps/api/tsconfig.e2e.json`) + 10 modified (`.gitignore`, `README.md`, `apps/api/package.json`, `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/playwright.config.ts`, `apps/web/e2e/helpers.ts`, `apps/web/e2e/login.spec.ts`, `apps/web/e2e/auth-journeys.spec.ts`, `pnpm-lock.yaml`); (2) the `actionTimeout: 30_000` cold-stack flakiness fix in `apps/web/playwright.config.ts` + this checkpoint. `dist-test/` build output is gitignored.
- Other work to preserve: developer stack is live (Vite :3000, API :4000, Postgres :5432, dev db `studypilot`) — never start/stop/kill it; never read/print/write `.env`/`.env.*`

## Progress

- [x] Context read: story AC1–AC5 + D119-1…5, EP09 README (env contract, queue, Decisions, plan review pass 2 + pass-1 watch items O-3/O-4/O-5/O-6, parent index), epic DoD, all target code files (`playwright.config.ts`, `vite.config.ts`, `helpers.ts`, `login.spec.ts`, `auth-journeys.spec.ts`, `semesters-courses.spec.ts`, `app.module.ts`, `prisma.config.ts`, `prisma.service.ts`, `main.ts`, `cors.ts`, `recovery-db-harness.ts`, `nest-cli.json`, `tsconfig.json`, package.jsons, `turbo.json`, root README, `.gitignore`)
- [x] Environment recon: dev stack up (web 200 / api 404-root); dev db `studypilot` at localhost:5432; node v22.23.3, pnpm 8.15.0; `pg`/`dotenv`/`postgres` resolvable from `apps/web/e2e` via root `node_modules` (leftover flat dirs) — the plan's devDep addition to `apps/web` makes resolution explicit/robust
- [x] `apps/web/e2e/test-env.ts` (dotenv load of `apps/api/.env.local`+`.env`, URL derivation, sanitized fail-fast messages, DB create/migrate/drop via pjs, mode switch)
- [x] `apps/web/e2e/global-setup.ts` + `global-teardown.ts`
- [x] `apps/web/playwright.config.ts` (baseURL 3100, webServer entries, mode-conditional)
- [x] `apps/web/vite.config.ts` (env-driven proxy target, default preserved)
- [x] `apps/api/tsconfig.e2e.json` + `start:e2e` script; `apps/web` devDeps `dotenv` + `postgres`; `.gitignore` `dist-test`
- [x] Fail-fast wording: `helpers.ts`, `login.spec.ts`, `auth-journeys.spec.ts` (mode-conditional) + auth-journeys header comment (PR-005/PC-EP09-06)
- [x] Root README `pnpm test:e2e` wording (AC4)
- [x] **Scope A closeout**: fully green `pnpm test:e2e` (14/14), cold-stack flakiness fixed (`actionTimeout`), 4 consecutive green runs, post-run isolation checks, lint/typecheck/prettier, scoped commits
- [ ] **Scope B** (separate later dispatch): 7-item verification matrix + `implementation.md` closeout docs + parent-queue reconciliation + one independent parent review

- Current step: **scope B — verification matrix + closeout docs** (scope A is complete and committed)

## Decisions and dependencies

- D119-1…D119-5 (story) bind the design; plan review pass 2 = Plan Ready (`plan-review.md`).
- **D119-3 (verified, no fallback needed):** `nest start --path tsconfig.e2e.json` compiles to `dist-test/` (the developer's `nest --watch` output `dist/` is untouched); the API webServer boots from it on :4100. The fallback (`nest build -p tsconfig.e2e.json && node dist-test/main`) was not needed.
- **O-3 (verified):** `prisma migrate deploy` is spawned with `cwd: apps/api` + the workspace `prisma` binary (`apps/api/node_modules/prisma/build/index.js`) + the derived `DATABASE_URL` in the child env — it migrates the throwaway DB, never the dev DB.
- **O-4 (verified):** idempotent create — `SELECT 1 FROM pg_database WHERE datname = …` first, then `CREATE DATABASE`, catching `42P04` for the concurrent-create race.
- **O-5 (verified):** teardown runs `pg_terminate_backend` on the throwaway DB's backends, then `DROP DATABASE IF EXISTS`; the drop client connects to the *configured* (different) database, so the target has zero connections.
- O-6 (verified by reviewer, no action): rate-limit guard is on forgot/reset-password only — no E2E exposure.
- Sanitization policy (D119-2): the configured and derived URLs are never printed; failure text may name the env file/variable, the database *name*, and host:port (no user/password, no full URL) — host:port/name are what make the messages actionable and are already visible to the developer in their own `.env.local`.
- `dotenv`/`postgres` versions: pinned to the versions already in the pnpm store (`dotenv@16.4.5`, `postgres@3.4.7`) to avoid new lockfile entries — `pnpm-lock.yaml` diff is exactly 6 lines (the two importer entries for `@studypilot/web`).
- **Playwright 1.64 `isURLAvailable` (implementation finding):** the webServer URL probe requires an HTTP status of **200–403** (not "any response" as the story assumed). The API root returns 404, so the readiness probe targets a protected route `/semesters` (global APP_GUARD → 401 once the app is fully booted); the web probe targets `/` (Vite → 200).
- **Playwright 1.64 `webServer` (implementation finding):** `port` and `url` are mutually exclusive — the config uses `url` only (the URL-status probe) and omits `port`.
- **pjs `?schema=` param (implementation finding):** `postgres(url)` forwards unknown URL params as server startup options and the server rejects `schema`; the lifecycle connections strip it. The derived URL handed to the API retains it (Prisma's `@prisma/adapter-pg` consumes it).
- **`@nestjs/config` v3 dotenv semantics (mirrored in `test-env.ts`):** every configured file is parsed and merged (`.env.local` wins over `.env`), and only keys absent from `process.env` are applied — an explicit shell variable always wins, exactly as the API.
- **Vite webServer port binding (implementation finding — the run blocker this session):** `pnpm dev -- --port 3100 --strictPort` does **not** work — pnpm 8 forwards the `--` separator as a *literal* argument, so vite never sees the flags and falls back to the config port 3000 (occupied by the live dev server → `--strictPort` exits / it picks 3001). Fixed to `pnpm exec vite --port 3100 --strictPort`, which binds :3100 correctly.
- **Login-flow flakiness under the cold stack (implementation finding → fixed):** the first committed run was green, but a re-run showed 2 intermittent failures in `loginViaUi` at the `Email` `fill()` (not an assertion). Root cause: the login inputs are `disabled` while the auth `isLoading` flag is true (it starts `true` in `authSlice` and clears only after the silent `refreshToken()` session-restore round-trip on mount). The self-contained stack is **cold-started** by Playwright (unlike the warm dev stack it replaces), so under `fullyParallel` (one worker per CPU, 9 here) that round-trip can exceed Playwright's default 5s `actionTimeout` and `fill()` times out while the input is still disabled. **Fix:** `actionTimeout: 30_000` in the config `use` block — a wait bound, not a fixed sleep, not an assertion change, `fullyParallel` untouched (all within AC1/AC4). After the fix: **4 consecutive fully-green runs** (14/14, ~6s each), satisfying the DoD's "two consecutive self-contained runs green."

## Verification

- **Green run (scope A gate):** `pnpm test:e2e` from the repo root → **14/14 passed (6.5s, 9 workers)** against the self-contained stack (throwaway `studypilot_e2e_test` DB, test API :4100, test web :3100). Global setup created + migrated the throwaway DB; global teardown dropped it.
- **Reliability (DoD: two consecutive green runs):** the first committed run was green, but a re-run exposed 2 intermittent `loginViaUi` `fill()` timeouts (cold-stack flakiness — see Decisions). After the `actionTimeout: 30_000` fix, **4 consecutive fully-green runs** (14/14, ~6s each).
- **Post-run isolation checks (dev stack untouched):** web :3000 → 200, API :4000 → 404 (unchanged); test ports :3100/:4100 released. Dev DB `studypilot` row counts **identical to the pre-run baseline** across all runs — users 497, semesters 75, courses 63, class_meetings 1, assignments 18, leaked `e2e-%` users 478; `studypilot_e2e_test` **absent** after every teardown.
- **Static gates:** root `pnpm lint` passes (api + web); `pnpm --filter @studypilot/web typecheck` passes; Prettier clean on every changed code file. `README.md` has pre-existing Prettier style drift (present at HEAD, outside the format scope) — left untouched to keep the diff scoped.
- **Scope (AC4):** diff is test infrastructure only — no `apps/*/src` production code, no spec assertion changes.

## Resume next (scope B — separate dispatch)

1. Build the 7-item verification matrix (story Notes) as `docs/stories/EP09/artifacts/SP-119/implementation.md`: each item with command/observation, expected, actual, and pass/fail — re-run the green `pnpm test:e2e` and the isolation checks above as evidence.
2. Record final dispositions, AC outcomes (AC1–AC5), and the implementation findings (Playwright 1.64 probe + port, pjs `?schema=`, dotenv semantics, Vite port binding) in `implementation.md`.
3. Reconcile the SP-119 row in `docs/stories/EP09/README.md` (Execution queue) and the EP09 parent `implementation.md`; request one independent parent review.
- Read next: `docs/stories/EP09/SP-119-e2e-dedicated-test-database.md` (Notes: verification matrix), `docs/stories/EP09/README.md` (queue + Decisions), `docs/stories/EP09/artifacts/EP09/implementation.md` (parent review unit).
