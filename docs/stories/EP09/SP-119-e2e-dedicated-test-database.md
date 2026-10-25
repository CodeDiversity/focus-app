# SP-119: E2E Dedicated Test Database + Self-Contained Test Stack

**Story ID:** SP-119
**Epic:** [EP09: E2E Test Automation](../../epics/EP09-e2e-test-automation.md)
**Milestone:** Ongoing quality
**Layer:** Test infrastructure (no production code)
**Status:** Implemented — awaiting parent review (EP09)
**Dependencies:** SP-116 (met — Playwright infrastructure exists); must keep the SP-117/SP-118 journeys passing (both met)
**Jira:** Pending creation

## Summary

Make every E2E run self-contained and leave no trace: `pnpm test:e2e` creates a
dedicated throwaway Postgres database, starts a test-only API and web instance
against it, runs the whole suite, and drops the database when the run ends. The
developer's running dev stack (Vite :3000, API :4000, developer database) is
never required and never touched.

Resolves the carried findings **SP-116 F5 / SP-117 F4 / SP-118 F4** (each run
leaves `e2e-smoke-*`/`e2e-auth-*` users and `E2E Semester …`/`E2E Course …` rows
in the developer database; the suite has no cleanup) and implements the EP09
environment contract ("a dedicated test database … the suite seeds its own users
and cleans up what it creates") and epic AC1 (runs from a clean checkout with
only the documented prerequisites — Postgres running).

## Scope / acceptance criteria

1. **Self-contained run.** `pnpm test:e2e` (repo root) with **only Postgres
   running** (no `pnpm dev`) runs the entire existing suite: all SP-116/117/118
   tests pass with **unchanged assertions**, `fullyParallel` intact, no new
   fixed sleeps. Playwright starts a test-only API on port 4100 and a test-only
   Vite on port 3100 (proxying `/api` to it); the browser base URL defaults to
   `http://localhost:3100`.
2. **Developer data untouched, in both directions.** The run targets a
   dedicated `*_e2e_test` Postgres database — created fresh, migrations applied,
   **dropped in global teardown**. After a run the developer database's contents
   are unchanged and no `e2e-*` row can reach it. A hard-killed run can leave at
   most the namespaced `*_e2e_test` database (reused by the next run) — never
   developer data.
3. **Fail-fast.** With Postgres unreachable, the run fails **before the first
   test** with a clear, actionable message — not a timeout cascade. The message
   distinguishes **Postgres unreachable** ("ensure Postgres is running") from
   **configured dev database missing**: setup must connect to the configured dev
   database to `CREATE`/`DROP` the `*_e2e_test` database, so a missing dev
   database fails with its own actionable message (the `apps/api/.env.local`
   `DATABASE_URL` database does not exist — create it), never a generic one.
4. **No production code changes.** The diff is limited to test infrastructure:
   Playwright config + new global setup/teardown, `apps/web` test-only
   devDependencies, package scripts, the Vite proxy target made env-driven with
   the existing default, a test-only API build config, `.gitignore`, and root
   README wording — which lists the one-time setup prerequisites (`pnpm
   install`, `apps/api/.env.local` with a `DATABASE_URL` whose database exists,
   `pnpm db:generate`) alongside "Postgres running; no `pnpm dev` needed", so
   epic AC1's "documented prerequisites" is literally complete. Dev-stack
   behavior is unchanged (defaults preserved).
5. **`E2E_BASE_URL` escape hatch preserved.** Setting it runs the browser against
   an externally provided stack and skips the self-contained servers and DB
   lifecycle (the existing SP-116 AC2 semantics: a dead port fails fast with the
   actionable message).

Explicitly out of scope: changing the three existing specs' journeys or
assertions (only their stale "start the dev stack with `pnpm dev`" error-message
wording is updated — AC 4); CI wiring; new coverage areas (backlog); one-time
cleanup of rows already leaked into the developer database (Notes).

## Decisions

**D119-1 — Chosen approach: self-contained test stack** (dedicated `*_e2e_test`
database + own API/web instances on alternate ports via Playwright `webServer`).
Alternatives weighed:

- *Runtime cleanup against the dev stack* (teardown deletes `e2e-%` rows via a
  direct DB client): **rejected** — still requires `pnpm dev` (violates epic
  AC1's "only the documented prerequisites (Postgres running)"), cleanup must
  know the FK cascade order (fragile as entities are added), rows leak on a hard
  kill, and a bug in the delete could hit developer data — the exact risk the
  contract exists to remove.
- *Throwaway schema inside the developer database* (`search_path`): **rejected**
  — still shares the developer's database file, adds `search_path`/migration
  fragility, and keeps the `pnpm dev` dependency.
- *Self-contained (chosen)*: dropping the database after the run is a
  **structural** guarantee — "data created by a run does not outlive the run"
  with no cleanup code to get wrong; the dev stack is provably untouched (separate
  processes, separate database, separate ports); epic AC1 is met exactly.
  Costs (accepted): ~15–40 s extra per run (create DB + `prisma migrate deploy`
  + two server boots) and two transient processes that need ports 3100/4100 free
  (`--strictPort` / a clear "port in use" failure if occupied).

**D119-2 — Test database lifecycle (secrets-safe).** New test-only module
(`apps/web/e2e/test-env.ts`) loads `apps/api/.env.local` **programmatically**
via `dotenv` — the same file and same non-override semantics the API's
`ConfigModule` uses (`app.module.ts`: `envFilePath: ['.env.local', '.env']`) —
and derives the test `DATABASE_URL` by renaming the database to
`<name>_e2e_test` (keeps the `_test`-suffix convention of
`recovery-db-harness.ts`). **No human or agent ever opens a secret file**, and
the URL is never printed in docs, logs, or error messages (failure text is
sanitized). Global setup: create the database if missing (idempotent), then
`prisma migrate deploy` with the derived URL in the child's environment (Prisma
7 reads it from `process.env.DATABASE_URL` via `prisma.config.ts`; an explicit
env var wins over dotenv). Global teardown: terminate backends, then
`DROP DATABASE` (idempotent). If setup fails partway, the leftover database is
harmless and namespaced — the next run reuses/re-migrates it; developer data is
never at risk.

**D119-3 — Test-only API instance.** New `apps/api` script
`start:e2e: nest start --path tsconfig.e2e.json`, where `tsconfig.e2e.json`
extends the app tsconfig with `outDir: ./dist-test`. Rationale: `nest-cli.json`
sets `deleteOutDir: true`; compiling into the shared `dist/` would race the
developer's running `nest start --watch` process (shared output dir → rebuild
churn / process restart mid-run — the UX hazard this design must avoid). A
separate output dir means zero interaction with the dev API process. The test
API receives `PORT=4100` + the derived `DATABASE_URL` as explicit env vars;
dotenv never overrides existing env vars, so the API's own `.env.local` load
still supplies `JWT_SECRET` etc. Readiness probe: `GET http://localhost:4100/` —
Playwright ≥ 1.23 treats **any** HTTP status as ready (installed
`@playwright/test` is 1.64; the API has no `/health` route, so the 404 root
response is the probe). `webServer` uses `reuseExistingServer: false` so every
run gets fresh processes bound to a freshly migrated database. (Implementation
checkpoint: verify the `--path` output-dir switch on the first build; if the
Nest CLI version does not honor it, the same separate-`dist` goal is met with
`nest build -p tsconfig.e2e.json && node dist-test/main` in the script.)

**D119-4 — Test-only web instance.** Vite on port 3100 (`--strictPort`);
`vite.config.ts`'s proxy target becomes
`process.env.E2E_API_PROXY_TARGET ?? 'http://localhost:4000'` — the default
keeps dev behavior byte-identical; the test instance passes
`http://localhost:4100`. `baseURL` default moves to `http://localhost:3100`;
`E2E_BASE_URL` still overrides it and, when set, disables the `webServer`
entries and the DB lifecycle (external-stack mode).

**D119-5 — No spec changes beyond stale messages.** The specs that carry the
stale fail-fast wording (`login.spec.ts`, `auth-journeys.spec.ts`) +
`helpers.ts` keep their journeys, unique-per-run data, and assertions; only the
fail-fast wording ("Start the dev stack with `pnpm dev`") is updated — and the
new tail is **mode-conditional**: self-contained (default) mode → "ensure
Postgres is running"; `E2E_BASE_URL` set (external-stack mode) → keep the
SP-116 AC2 semantics ("the externally provided stack at `<E2E_BASE_URL>` must
be running"), so AC5's actionable-message promise holds in both modes.
`turbo.json` needs no change (`E2E_BASE_URL` is already in the `test:e2e` task's
`env` list; the harness derives everything else internally).

## Notes

- **One-time historical cleanup (manual, not part of this story's tests):** rows
  already leaked into the developer database by earlier runs (`e2e-smoke-%` /
  `e2e-auth-%` users and their semesters/courses) can be removed once by the
  user, e.g. `DELETE FROM users WHERE email LIKE 'e2e-%';` (children cascade via
  FK). Optional — after SP-119 no run can add more.
- `dotenv` and `postgres` (pjs driver) are added as **devDependencies of
  `apps/web` only** — test-side, never bundled into the app.
- `apps/api/dist-test` is gitignored (test-only build output).
- Verification must include: two consecutive full runs green; developer-database
  row counts identical before/after; the `*_e2e_test` database absent after the
  run; a run with Postgres stopped failing fast with the clear message; a run
  with the configured dev database missing failing fast with the distinct
  message; the dev stack (`pnpm dev`) left running throughout and unaffected.

## Sizing

- **Outcome:** `pnpm test:e2e` runs the whole suite against a dedicated
  throwaway database + test-only API/web instances and leaves the developer
  stack and developer database untouched — no run data outlives the run.
- **Time estimate:** ~2–3 hours — new `test-env.ts` + global setup/teardown
  (~1 h), config + scripts + devDeps + Vite env + gitignore wiring (~0.5 h),
  verification matrix above including two full runs (~1 h).
- **Files:** new `apps/web/e2e/test-env.ts`, `apps/web/e2e/global-setup.ts`,
  `apps/web/e2e/global-teardown.ts`, `apps/api/tsconfig.e2e.json`; changed
  `apps/web/playwright.config.ts`, `apps/web/vite.config.ts`,
  `apps/web/package.json` (devDeps `dotenv`, `postgres`),
  `apps/api/package.json` (`start:e2e`), `README.md`, `.gitignore`; test-only
  message wording in `apps/web/e2e/helpers.ts` + `login.spec.ts` +
  `auth-journeys.spec.ts`. No `apps/*/src` production files.
- **Start context:** this story; EP09 README environment contract + Decisions;
  `apps/web/playwright.config.ts` and `apps/web/e2e/*` (current state);
  `apps/api/src/app.module.ts` (dotenv `envFilePath`),
  `apps/api/src/modules/prisma/prisma.service.ts` and
  `apps/api/prisma.config.ts` (runtime URL),
  `apps/api/src/modules/auth/testing/recovery-db-harness.ts` (`_test`
  convention), root `package.json` / `turbo.json` scripts.
- **Verification:** `pnpm test:e2e` (repo root) twice, consecutive green, with
  the dev stack running and the developer database unchanged; database-level
  check that the `*_e2e_test` database is dropped after the run; a
  Postgres-stopped run fails fast; a missing-dev-database run fails fast with
  the distinct message; `pnpm lint` (root) / `pnpm typecheck` (`apps/web`) /
  Prettier on changed files.
- **Dependencies / exclusions:** depends on SP-116 (met). Excludes: spec journey
  changes (SP-116/117/118, implemented — untouched), CI wiring, new coverage
  areas (backlog), one-time historical data cleanup (Notes).

## Definition of Done (applicable)

1. ACs pass (two consecutive self-contained runs green). 4. Fail-fast errors
are actionable. 8. The suite itself is the automated verification, plus the
verification matrix above. 10. Reviewed in the EP09 integrated parent review
unit. 11. Final reviewer walkthrough covers the self-contained run and the
developer-DB-untouched check. Items 2/3/5/6/7 (product validation, ownership
scoping, UI states, a11y, responsive) N/A — no product code or UI change.
Item 9 N/A — no production API or migration change (the test-DB lifecycle is
documented here and in the README).
