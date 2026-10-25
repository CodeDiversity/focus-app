# SP-119 implementation record — E2E Dedicated Test Database + Self-Contained Test Stack

**Story:** [`SP-119-e2e-dedicated-test-database.md`](../../SP-119-e2e-dedicated-test-database.md)
**Epic:** EP09: E2E Test Automation · **Review unit:** EP09 parent (`artifacts/EP09/implementation.md`)
**Implemented:** 2026-10-25, branch `main` — scope A (code/config) in `e9c72d4` + `6f91fbb`; scope B (this verification + closeout) in the docs-only closeout commit (hash in the dispatch return)
**Status:** Implemented — awaiting parent review (EP09)

## Scope as implemented

`pnpm test:e2e` (repo root) is now **self-contained**: global setup creates a
dedicated throwaway `studypilot_e2e_test` Postgres database (idempotent) and
applies the migrations to it; Playwright starts a test-only API on :4100
(`nest start --path tsconfig.e2e.json` → `dist-test/`, built from a separate
tsconfig so the developer's `nest --watch` output `dist/` is untouched) and a
test-only Vite on :3100 (proxying `/api` to :4100 via an env-driven target,
default preserved); the browser base URL is `http://localhost:3100`. Global
teardown terminates the throwaway database's backends and drops it. The
developer stack (Vite :3000, API :4000, dev database) is neither required nor
touched. `E2E_BASE_URL` set → external-stack mode: no servers, no database
lifecycle (SP-116 AC2 semantics, mode-conditional fail-fast wording).

Changed paths (15 files, all test infrastructure — no `apps/*/src` production
code, no spec assertion changes):

- New: `apps/web/e2e/test-env.ts`, `apps/web/e2e/global-setup.ts`,
  `apps/web/e2e/global-teardown.ts`, `apps/api/tsconfig.e2e.json`
- Changed: `apps/web/playwright.config.ts`, `apps/web/vite.config.ts`,
  `apps/web/package.json` (devDeps `dotenv@16.4.5` + `postgres@3.4.7`, pinned to
  versions already in the pnpm store), `apps/api/package.json` (`start:e2e`),
  `apps/web/e2e/helpers.ts` + `login.spec.ts` + `auth-journeys.spec.ts`
  (stale fail-fast wording only, mode-conditional), `README.md` (prerequisite
  wording), `.gitignore` (`dist-test/`), `pnpm-lock.yaml` (6 lines: the two
  `@studypilot/web` importer entries)

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| AC1 — self-contained run | **Pass** | 5 consecutive fully-green `pnpm test:e2e` runs from the repo root (14/14 each; 8.8s / 7.2s / 6.3s / 8.8s / 6.3s). The live dev stack was up throughout (the verification constraint) but is **never a dependency** of the run: in self-contained mode nothing targets the dev ports — baseURL is :3100, the readiness probes target :4100/:3100, and the only shared resource is Postgres (running), so "only Postgres running" holds structurally; empirically, the dev DB row counts stayed byte-identical (matrix item 2) while every run created its users/semesters/courses — they could only have landed in the throwaway DB. All SP-116/117/118 tests pass with unchanged assertions, `fullyParallel` intact, no new fixed sleeps (the `actionTimeout: 30_000` in the config `use` block is a wait bound, not a sleep). Ports 3100/4100 observed up during the run (t=3–6s) and released after (t=7s). |
| AC2 — developer data untouched, both directions | **Pass** | The run targets the dedicated `studypilot_e2e_test` database (created fresh, migrated, dropped in global teardown). Dev DB counts identical before/after every run (matrix item 2); `studypilot_e2e_test` absent after every run (matrix item 3). A hard-killed run can leave at most the namespaced `*_e2e_test` database (teardown is best-effort by design — a leftover is namespaced, reused by the next run, and never developer data); the teardown warning path was exercised by the fail-fast simulations (matrix items 4/5) and printed the sanitized, namespaced message. |
| AC3 — fail-fast, two distinct messages | **Pass** | Matrix items 4/5: both cases fail **before the first test** (global setup throws; no test executes) with distinct, actionable, sanitized messages — "Postgres is unreachable at host:port … Ensure Postgres is running" vs. "the configured dev database "…" does not exist at host:port. Create it (e.g. `createdb …`) or fix DATABASE_URL in apps/api/.env.local". No timeout cascade; exit code 1. (The real "Postgres stopped" case is code-identical to the unreachable-port simulation — both surface a non-`3D000` setup error; the developer's Postgres was not stopped, per the task constraint.) |
| AC4 — no production code changes; README prerequisites | **Pass** | Scope A diff verified: no `apps/*/src` files, no assertion changes — test infrastructure + wiring only (file list above). Root `README.md` lists the one-time setup prerequisites (`pnpm install`, `apps/api/.env.local` with a `DATABASE_URL` whose database exists, `pnpm db:generate`) alongside "Postgres running; no `pnpm dev` needed". Dev-stack behavior unchanged (Vite proxy default `http://localhost:4000` preserved). |
| AC5 — `E2E_BASE_URL` escape hatch preserved | **Pass** | `E2E_BASE_URL='http://localhost:3999' pnpm test:e2e` (dead port, via the root command — Turbo passes `E2E_BASE_URL` through its `env` allowlist) → `E2E: external-stack mode (E2E_BASE_URL set) — skipping self-contained servers and database lifecycle.` + `… skipping database teardown.`; 14 fast failures in 1.65s (immediate `ERR_CONNECTION_REFUSED`, no timeout cascade) each with the actionable external-mode message (`Could not reach the API at http://localhost:3999/api …` — SP-116 AC2 semantics); exit 1; no database created or touched; dev stack unaffected. |

## Verification — 7-item matrix (story Notes)

All checks ran 2026-10-25 with the developer stack live throughout (Vite :3000,
API :4000, dev Postgres :5432, dev db `studypilot`) and left it completely
unaffected. Row-count queries used a `node -e`-style helper that loads dotenv
at runtime and prints **counts/DB names only** (the URL is never printed).

| # | Check | Command / mechanism | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | Two consecutive fully-green runs, self-contained stack up + torn down | `pnpm test:e2e` from repo root, run twice (five total) | 14/14 green; throwaway DB created + dropped; test servers started + released | 5 consecutive 14/14 runs; setup → ready → dropped messages each run; per-second timeline of the final run: dev 3000/4000 = 200/404 at t=1–6s, test 3100/4100 up t=3–6s, released by t=7s, exit 0 | **Pass** |
| 2 | Developer-database row counts identical before/after | node helper (dotenv at runtime; counts + DB names only) | Identical | users 497 · semesters 75 · courses 63 · class_meetings 1 · assignments 18 · leaked `e2e-%` users 478 · `E2E %` semesters 64 · `E2E %` courses 48 — identical before and after every run and simulation | **Pass** |
| 3 | `studypilot_e2e_test` absent after the run | `pg_database` names only | Absent | `postgres, studypilot, template0, template1` after every run and simulation — never present | **Pass** |
| 4 | Fail-fast: Postgres unreachable | `cd apps/web && DATABASE_URL='postgres://e2e-verify:dummy@localhost:59999/studypilot' pnpm exec playwright test` (env override consumed by `test-env.ts`; nothing listening on 59999; real `.env.local` unmodified) | Fails before the first test with the "ensure Postgres is running" message | Exit 1, no test ran: `E2E setup failed: Postgres is unreachable at localhost:59999 (). Ensure Postgres is running, then re-run \`pnpm test:e2e\`.` | **Pass** |
| 5 | Fail-fast: configured dev database missing | In-process env override constructed from the API's own env files (same role, dummy password, non-existent database name `sp119_missing_db_probe` on the real host:port) → `pnpm exec playwright test` (real `.env.local` unmodified; URL never printed) | Fails before the first test with the **distinct** "create it" message | Exit 1, no test ran: `E2E setup failed: the configured dev database "sp119_missing_db_probe" does not exist at localhost:5432. Create it (e.g. \`createdb sp119_missing_db_probe\`) or fix DATABASE_URL in apps/api/.env.local, then re-run \`pnpm test:e2e\`.` | **Pass** |
| 6 | Static gates | `pnpm lint` (root) · `pnpm --filter @studypilot/web typecheck` · Prettier `--check` on the 10 changed code files | All pass | lint 2/2 tasks (turbo-cached — inputs unchanged since scope A's verified green lint); `tsc --noEmit` clean; Prettier: "All matched files use Prettier code style" (all 10) | **Pass** |
| 7 | Dev stack responsive before, during, after | `curl` 3000/4000 at each phase | 200 / 404 | 200/404 at every probe — before (recon), during (per-second timeline, incl. while the self-contained stack served the tests), after (post-run + post-simulation). One transient `--max-time 1` probe timeout at t=3s (dev API busy under 9 parallel Chromium workers) recovered on the next probe | **Pass** |

Additional check (AC5): external-stack mode against a dead port — see AC5 row
above. Both fail-fast simulations and the external-mode run left the dev DB
byte-identical and created no database (verified via `pg_database` + counts).

## Findings / deviations

Scope A (recorded in the checkpoint as discovered; all fixed within scope A):

- **F-119-1 (fixed):** Playwright 1.64's `webServer` URL probe (`isURLAvailable`)
  requires an HTTP status of **200–403**, not "any response" as the story
  assumed. The API root returns 404 (and serves an `/index.html` fallback), so
  the readiness probe targets a protected route `/semesters` — the global
  `APP_GUARD` answers 401 only once the app has fully booted (module init incl.
  the DB connection completes before the server listens).
- **F-119-2 (fixed):** Playwright 1.64 `webServer` `port` and `url` are mutually
  exclusive — the config uses `url` only.
- **F-119-3 (fixed):** the pjs driver (`postgres`) forwards unknown URL params as
  server startup options and the server rejects `?schema=` — the lifecycle
  connections strip it; the derived URL handed to the API retains it
  (`@prisma/adapter-pg` consumes it).
- **F-119-4 (fixed — the run blocker of scope A):** `pnpm dev -- --port 3100
  --strictPort` does not work — pnpm 8 forwards the `--` separator as a literal
  argument, so Vite never sees the flags and falls back to config port 3000
  (occupied by the live dev server). Fixed to `pnpm exec vite --port 3100
  --strictPort`.
- **F-119-5 (fixed):** login-flow flakiness under the cold stack — the login
  inputs are `disabled` while the auth `isLoading` flag is true (silent
  `refreshToken()` round-trip on mount); under `fullyParallel` (9 workers) that
  round-trip intermittently exceeded Playwright's default 5s `actionTimeout`,
  timing out `fill()` (not an assertion). Fixed with `actionTimeout: 30_000`
  (a wait bound, not a sleep; `fullyParallel` untouched) — after the fix,
  4 consecutive fully-green runs in scope A and 5 in scope B.

Scope B (new):

- **F-119-6 (recorded — by design, no action):** Turbo's `test:e2e` task
  declares only `E2E_BASE_URL` in its `env` allowlist, so a shell-level
  `DATABASE_URL` set on `pnpm test:e2e` is **not** passed through to the
  Playwright process (verified empirically: a run with a fake `DATABASE_URL`
  went green against the real dev Postgres — the variable never reached the
  process; `pnpm` itself passes variables through, so Turbo is the stripper).
  This is consistent with D119-5 ("the harness derives everything else
  internally"; `turbo.json` needs no change): the harness derives from
  `apps/api/.env.local`, exactly as the API's `ConfigModule` does. Consequence
  for verification: the fail-fast simulations (matrix items 4/5) ran the same
  `playwright test` entrypoint directly from `apps/web` with the override in
  the process environment — the identical code path (config load →
  `resolveTestEnv` → global setup), bypassing only the Turbo runner layer.
- **F-119-7 (open — cosmetic, for parent review):** on a refused connection the
  pjs driver throws an `AggregateError` with an **empty** `message` (code
  `ECONNREFUSED`), so the unreachable fail-fast message renders an empty
  `()` detail: `…Postgres is unreachable at localhost:59999 (). Ensure
  Postgres is running…`. The message remains clear and actionable (host:port +
  the fix) and the two AC3 branches stay distinct, so AC3 is functionally met;
  surfacing the underlying detail (e.g. from the `AggregateError` code) is a
  one-line polish left for the parent review to disposition.

Deviations:

- Matrix items 4/5 used the task-endorsed "env override consumed by
  `test-env.ts`" mechanism via the direct `playwright test` entrypoint (see
  F-119-6) rather than the root `pnpm test:e2e` command.
- Item 5's override needed a **role that exists** (PostgreSQL checks the role
  before the database — a fake role surfaces `28000` invalid_role_name, which
  the harness reports as "unreachable", not the distinct missing-DB message).
  The override was constructed in-process from the API's own env files (same
  role, dummy password, non-existent database name) — PostgreSQL checks the
  database (`3D000`) before password authentication, so the dummy password is
  irrelevant; the real URL/credentials were never printed.
- The story Notes' "Postgres stopped" case was simulated with an unreachable
  port (the developer's Postgres must not be stopped); the two are code-identical
  (any non-`3D000` setup error → the unreachable branch).
- One planned simulation (item 4 via the root command) accidentally executed a
  normal green run (F-119-6) — harmless: self-contained, dropped on teardown,
  dev DB verified identical; it counts as the 3rd of the 5 consecutive greens.

## Commit scope

- `e9c72d4` — scope A: 4 new files + 10 modified (test infrastructure only)
- `6f91fbb` — scope A closeout: `actionTimeout: 30_000` cold-stack flakiness fix + checkpoint
- scope B closeout commit (docs-only): this record, the checkpoint, the story
  `Status`, the EP09 README execution fields, and the EP09 parent index refresh
  (hash recorded in the dispatch return — not amendable into its own record)

## DoD mapping (story)

1. ACs pass (two consecutive self-contained runs green) — 5 consecutive.
4. Fail-fast errors actionable — both branches verified.
8. Suite is the automated verification + the matrix above — all 7 items pass.
10. Reviewed in the EP09 integrated parent review unit — next step.
11. Final reviewer walkthrough covers the self-contained run and the
developer-DB-untouched check — the matrix evidence above is the walkthrough
input. Items 2/3/5/6/7 (product validation, ownership scoping, UI states, a11y,
responsive) N/A — no product code or UI change. Item 9 N/A — no production API
or migration change.
