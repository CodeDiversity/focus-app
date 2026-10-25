# SP-119 checkpoint

Updated: 2026-10-25 (autopilot run, branch `main`)
Execution state: `docs/stories/EP09/README.md` — Execution queue, SP-119 row (`In progress`); Active substory SP-119
Story: `docs/stories/EP09/SP-119-e2e-dedicated-test-database.md`
Review unit: EP09 parent — `docs/stories/EP09/artifacts/EP09/implementation.md`
Role / scope: implementer; test infrastructure only (Playwright config, `apps/web/e2e/test-env.ts` + global setup/teardown, `apps/api` test-only build config + script, Vite proxy env, package devDeps/scripts, `.gitignore`, root README wording, stale fail-fast messages in `helpers.ts`/`login.spec.ts`/`auth-journeys.spec.ts`). No production code (`apps/*/src`), no spec assertion changes, no AC/decision changes.

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at last update: `3be364b` (clean tree)
- Saved work: (none yet)
- Other work to preserve: developer stack is live (Vite :3000, API :4000, Postgres :5432, dev db `studypilot`) — never start/stop/kill it; never read/print/write `.env`/`.env.*`

## Progress

- [x] Context read: story AC1–AC5 + D119-1…5, EP09 README (env contract, queue, Decisions, plan review pass 2 + pass-1 watch items O-3/O-4/O-5/O-6, parent index), epic DoD, all target code files (`playwright.config.ts`, `vite.config.ts`, `helpers.ts`, `login.spec.ts`, `auth-journeys.spec.ts`, `semesters-courses.spec.ts`, `app.module.ts`, `prisma.config.ts`, `prisma.service.ts`, `main.ts`, `cors.ts`, `recovery-db-harness.ts`, `nest-cli.json`, `tsconfig.json`, package.jsons, `turbo.json`, root README, `.gitignore`)
- [x] Environment recon: dev stack up (web 200 / api 404-root); dev db `studypilot` at localhost:5432; node v22.23.3, pnpm 8.15.0; `pg`/`dotenv`/`postgres` resolvable from `apps/web/e2e` via root `node_modules` (leftover flat dirs) — the plan's devDep addition to `apps/web` makes resolution explicit/robust
- [ ] `apps/web/e2e/test-env.ts` (dotenv load of `apps/api/.env.local`+`.env`, URL derivation, sanitized fail-fast messages, DB create/migrate/drop via pjs, mode switch)
- [ ] `apps/web/e2e/global-setup.ts` + `global-teardown.ts`
- [ ] `apps/web/playwright.config.ts` (baseURL 3100, webServer entries, mode-conditional)
- [ ] `apps/web/vite.config.ts` (env-driven proxy target, default preserved)
- [ ] `apps/api/tsconfig.e2e.json` + `start:e2e` script; `apps/web` devDeps `dotenv` + `postgres`; `.gitignore` `dist-test`
- [ ] Fail-fast wording: `helpers.ts`, `login.spec.ts`, `auth-journeys.spec.ts` (mode-conditional) + auth-journeys header comment (PR-005/PC-EP09-06)
- [ ] Root README `pnpm test:e2e` wording (AC4)
- [ ] Verification matrix (7 items) + closeout docs + commit

- Current step: writing `apps/web/e2e/test-env.ts`

## Decisions and dependencies

- D119-1…D119-5 (story) bind the design; plan review pass 2 = Plan Ready (`plan-review.md`).
- Watch items (pass 1, `9d3f546`): O-3 spawn `prisma migrate deploy` in `apps/api` workspace context (not bare `npx` from `apps/web`); O-4 no `CREATE DATABASE IF NOT EXISTS` — check `pg_database` first / catch `42P04`; O-5 drop requires zero connections — terminate test backends first, drop client connects to a *different* database.
- O-6 (verified by reviewer, no action): rate-limit guard is on forgot/reset-password only — no E2E exposure.
- Sanitization policy (D119-2): the configured and derived URLs are never printed; failure text may name the env file/variable, the database *name*, and host:port (no user/password, no full URL) — host:port/name are what make the messages actionable and are already visible to the developer in their own `.env.local`.
- `dotenv`/`postgres` versions: pin to the versions already in the pnpm store (`dotenv@16.4.5`, `postgres@3.4.7`) to avoid new lockfile entries.

## Verification

- (not yet run)

## Resume next

1. Implement `test-env.ts` / setup / teardown / config / vite / api script (see Progress).
2. First run: verify O-3 (prisma spawn context), O-4 (idempotent create), O-5 (terminate-then-drop), and the D119-3 checkpoint (`nest start --path` output-dir switch — fallback `nest build -p tsconfig.e2e.json && node dist-test/main`).
3. Full verification matrix (story Notes) with the dev stack running; then closeout.
- Read next: `apps/web/e2e/*` (current), `apps/api/prisma/migrations/` (deploy target), root `README.md:147-184`.
