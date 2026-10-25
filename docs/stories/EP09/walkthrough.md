# EP09 Final User Walkthrough — the self-contained E2E suite

**Date:** 2026-10-25 · Companion to `review.md` (DoD item 11, saved beside the final report).
**Provenance label (applies to every step below):** the reviewer runtime has no shell, so **no step was executed by the reviewer**. All execution results quoted here are **recorded evidence** from the implementer's SP-119 scope-B verification (2026-10-25, developer stack live throughout and left unaffected). The code explanations are reviewer-executed file reads of the current text.

## What changed (code explanation)

One new core file plus thin wiring — no production code, no migrations, no spec assertion changes:

1. **`apps/web/e2e/test-env.ts` (new)** — the heart of the self-contained run. It loads the API's own env files (`apps/api/.env.local` over `.env`, shell variables win — the exact non-override semantics of the API's `ConfigModule`), so no human or agent ever opens a secret file. From the configured `DATABASE_URL` it derives a throwaway database name `<dev-db>_e2e_test` (the repo's existing `_test`-suffix convention from `recovery-db-harness.ts`) keeping host/port/credentials. It owns the database lifecycle: global setup connects to the *configured* database first (this is what distinguishes "Postgres unreachable" from "configured dev database missing" via SQLSTATE `3D000`), creates the throwaway database idempotently (handling the `42P04` race), and applies the migrations by spawning the workspace Prisma binary with the derived URL as an explicit variable; global teardown terminates any backends still attached to the throwaway database, then drops it (best-effort — a leftover is namespaced and reused by the next run, never developer data). Every failure message is sanitized: host:port and database *name* only, never credentials or a full URL.
2. **`apps/web/e2e/global-setup.ts` / `global-teardown.ts` (new)** — Playwright lifecycle hooks that call the above. In `E2E_BASE_URL` external-stack mode they are no-ops that print a banner — the caller owns the stack and its database (SP-116 AC2 semantics preserved).
3. **`apps/web/playwright.config.ts` (changed)** — resolves the env once at config load (so a broken setup fails **before the first test** with an actionable message). In self-contained mode it starts two test-only servers: the API on **:4100** (`pnpm start:e2e` → `nest start --path tsconfig.e2e.json`, building into a separate `dist-test/` so your running `nest --watch` output `dist/` is untouched; the derived test `DATABASE_URL` is passed explicitly — dotenv never overrides it, so `JWT_SECRET` etc. still come from `.env.local`) and Vite on **:3100** (`pnpm exec vite --port 3100 --strictPort`, proxying `/api` to :4100 via a new env-driven target whose default keeps dev behavior byte-identical). The browser base URL is `http://localhost:3100`. `actionTimeout: 30_000` gives the cold-started stack's silent session-restore round-trip room to settle (a wait bound, not a sleep; `fullyParallel` untouched).
4. **`apps/api/tsconfig.e2e.json` (new)** — the `dist-test` outDir for the test API build.
5. **Wiring (changed)** — `apps/api/package.json` `start:e2e` script; `apps/web/package.json` devDeps `dotenv` + `postgres` (pinned to versions already in the pnpm store); the three specs + `helpers.ts` get the mode-conditional fail-fast wording (self-contained → "ensure Postgres is running"; external → "the externally provided stack must be running"); root `README.md` documents the one-time setup; `.gitignore` adds `dist-test/`.

**Net effect:** `pnpm test:e2e` needs only **Postgres running**. It creates a throwaway database, migrates it, boots its own API + web, runs all 14 tests against them, and drops the database — your stack and your data are neither required nor touched.

## Correctness evidence (recorded — implementer scope B, 2026-10-25)

- **5 consecutive fully-green runs** of `pnpm test:e2e` from the repo root — 14/14 each (8.8s / 7.2s / 6.3s / 8.8s / 6.3s) — with the live dev stack up throughout: dev ports 3000/4000 answered 200/404 at every per-second probe; test ports 3100/4100 were up t=3–6s and released by t=7s.
- **Developer database byte-identical** before and after every run and simulation: users 497 · semesters 75 · courses 63 · class_meetings 1 · assignments 18 · leaked `e2e-%` users 478 · `E2E %` semesters 64 · `E2E %` courses 48 (the 478/64/48 are *historical* rows from pre-SP-119 runs — no run added or removed any).
- **`studypilot_e2e_test` absent after every run** — `pg_database` read after each: `postgres, studypilot, template0, template1`.
- **Fail-fast verified in both causes** (exit 1, no test executed, distinct messages — quoted in `review.md`), and **external-stack mode** verified against a dead port (14 fast failures in 1.65s, no database created or touched).
- **Static gates clean:** `pnpm lint` (api + web), `pnpm --filter @studypilot/web typecheck`, Prettier on all 10 changed code files; vitest 45 files / 563 tests (e2e excluded from collection).
- The one flakiness found (F-119-5: cold-stack `fill()` timeout under 9 parallel workers) was fixed with the `actionTimeout` bound and never recurred — 4 consecutive greens in scope A + 5 in scope B.

## Manual walkthrough

Every step below is an **instruction for you** (the user); the "Expected" results are the **recorded** outcomes from the verification above, not reviewer-executed runs.

### a. The default run — self-contained
1. Ensure **Postgres is running** (e.g. your usual `docker compose up -d` or service). Do **not** start `pnpm dev` — it is not needed.
2. From the repo root: `pnpm test:e2e`
3. **Expected (recorded):** the console prints `E2E: self-contained mode — preparing throwaway database "studypilot_e2e_test" …`, then `… throwaway database ready — test API on :4100, test web on :3100 (dev stack untouched)`, then 14 passing tests (roughly 6–9s), then `E2E: throwaway database "studypilot_e2e_test" dropped.` Your dev stack (if running) keeps answering normally the whole time.
4. **First run on a fresh clone** also needs the one-time setup: `pnpm install`, an `apps/api/.env.local` with a `DATABASE_URL` whose database exists, and `pnpm db:generate` (documented in the root README).

### b. External-stack mode (the escape hatch)
1. Start your dev stack (`pnpm dev`) and point the suite at it: `E2E_BASE_URL='http://localhost:3000' pnpm test:e2e`
2. **Expected (recorded semantics):** banner `E2E: external-stack mode (E2E_BASE_URL set) — skipping self-contained servers and database lifecycle.`; no test servers, no database lifecycle; tests run against your stack. (Recorded: against a *dead* port the 14 tests fail fast in ~1.7s with "Could not reach the API at … must be running" and no database is created or touched.)

### c. Fail-fast: Postgres unreachable
1. Simulate it without touching your real Postgres: `cd apps/web && DATABASE_URL='postgres://someuser:dummy@localhost:59999/studypilot' pnpm exec playwright test` (nothing listening on 59999; your real `.env.local` is untouched).
2. **Expected (recorded):** exit 1 **before the first test**: `E2E setup failed: Postgres is unreachable at localhost:59999 (). Ensure Postgres is running, then re-run \`pnpm test:e2e\`.` (The empty `()` is the known cosmetic F-119-7 — the message stays actionable.)

### d. Fail-fast: configured dev database missing
1. Point `DATABASE_URL` (same override mechanism) at a real Postgres with a **non-existent database name** — e.g. the probe the verification used (`sp119_missing_db_probe` on your real host:port, existing role, dummy password — the password is irrelevant because Postgres checks the database before authentication).
2. **Expected (recorded):** exit 1 before the first test with the *distinct* message: `E2E setup failed: the configured dev database "…" does not exist at localhost:5432. Create it (e.g. \`createdb …\`) or fix DATABASE_URL in apps/api/.env.local, then re-run \`pnpm test:e2e\`.`

### e. Watch the browser
1. `pnpm test:e2e:headed` from the repo root (requires a display; won't work on headless CI).
2. **Expected (recorded):** the same suite with the Chromium window visible — 14 passed (2.3s in the SP-116-era recorded run; the current suite takes a few seconds longer).

### f. Read the report
1. After any run: `pnpm test:e2e:report` (serves `http://localhost:9323` in your browser).
2. **Expected:** the HTML report of the last run — every test with its screenshot attached; failures auto-open it (`open: 'on-failure'`). This is also the safety net for the one-off lost-output failure (SP-117 F2): any future recurrence is captured here automatically.

### g. Verify your data is untouched (the guarantee behind SP-119)
1. Run the suite (`pnpm test:e2e`), then in your Postgres check: `SELECT datname FROM pg_database;` and, in your dev database, `SELECT count(*) FROM users WHERE email LIKE 'e2e-%';`
2. **Expected (recorded):** `studypilot_e2e_test` is **not** in the list (it was dropped), and your `e2e-%` count is unchanged from before the run (478 in the verification — historical rows only; no run grows it).

### h. Optional one-time cleanup of historical leaks (yours to decide)
Pre-SP-119 runs left `e2e-*` users (and their `E2E %` semesters/courses) in your dev database. No run grows them anymore, but if you'd like them gone: in your dev database, `DELETE FROM users WHERE email LIKE 'e2e-%';` — the children (semesters, courses, …) cascade with the user. **Not executed by the reviewer or the verification; purely optional.**
