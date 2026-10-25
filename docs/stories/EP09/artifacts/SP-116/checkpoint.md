# SP-116 checkpoint

Updated: 2026-10-25 (local, -0400)
Execution state: EP09 queue row SP-116 → `docs/stories/EP09/README.md` (`Implemented — awaiting parent review`)
Story: `docs/stories/EP09/SP-116-playwright-login-smoke.md`
Review unit: EP09 group (children SP-116/117/118); parent index will live at `docs/stories/EP09/artifacts/EP09/implementation.md` once all children finish
Role / scope: implementer; E2E infrastructure layer — `apps/web` Playwright config/spec/vitest config, root `turbo.json`, repo README, `.gitignore`; no production code changes

## Repository state

- Workspace / branch: `main` (shared workspace, single implementer)
- HEAD at last update: `4a34fd4` (guard hook; unrelated to SP-116)
- Saved work: `2659504` (prior session: initial SP-116 code — spec, config, devDep, root script, README doc, EP09 planning docs) + `310f729` (this task: determinism/failure-clarity/negative-test fixes, turbo task, vitest exclude, README wiring, `.gitignore`)
- Dev stack was running locally (Postgres :5432, Vite :3000, API :4000) and was used for all verification; no service was started or stopped by this task

## Progress

- [x] AC1: `@playwright/test` devDep + config + root `pnpm test:e2e` (fixed F1 turbo task) + README wiring (fixed F9 placement)
- [x] AC2: API/DB-down failure is explicit — connection errors and non-201 responses (with body) throw actionable messages; verified via `E2E_BASE_URL` pointed at a dead port (F8 turbo env pass-through)
- [x] AC3: register real user via API → login UI → authenticated destination
- [x] AC4: no fixed sleeps; per-run + per-worker unique email (F6 flake fixed); 13 consecutive green runs
- [x] AC5: wrong-password negative test asserts error toast + stays on `/login`
- [x] `pnpm test:e2e` (root), web `pnpm test` (vitest), web `pnpm lint`, root `pnpm lint`, web `pnpm typecheck`, Prettier check — all green
- [x] Closeout: code committed `310f729`; `implementation.md` written; queue/status reconciled; docs commit pending in this closeout

## Decisions and dependencies

- Findings (all fixed unless noted):
  - **F1 (fixed):** `turbo.json` had no `test:e2e` task → root `pnpm test:e2e` failed with "Could not find task". Added `"test:e2e": { "cache": false, "env": ["E2E_BASE_URL"] }`.
  - **F2 (fixed):** AC5 negative case absent from the committed spec. Added wrong-password test (asserts `Invalid email or password` toast — the API's uniform 401 message surfaced by `LoginPage.tsx` — and URL stays `/login`).
  - **F3 (fixed):** `.gitignore` entries `test-results/`, `playwright-report/` uncommitted since the prior session; committed with the code.
  - **F4 (fixed):** EP09 queue row and story status were stale (`Ready`/`Queued`) although code was committed in 2659504; no artifact records existed. Reconciled at closeout (queue row `Implemented — awaiting parent review`, story status matched, artifact records created).
  - **F5 (open, recorded for reviewer/planner):** EP09 README environment contract says "dedicated test database … suite seeds its own users and cleans up what it creates", but the implementation runs against the running dev stack (story technical notes: "tests only need `http://localhost:3000`") with per-run unique emails and no cleanup. No user-deletion API endpoint exists (checked `auth.controller.ts`), so cleanup would need new production code (out of scope) or a direct DB client + exported DB URL (manual env setup, which the story scope says to avoid). Implemented per the ACs; recommend the planner schedule dedicated-test-DB + cleanup as follow-up (SP-117 or an infra story). Repo precedent for disposable DBs: `TEST_DATABASE_URL` must be `*_test`-suffixed (`apps/api/src/modules/auth/testing/recovery-db-harness.ts`).
  - **F6 (fixed):** Flaky 409 — with `fullyParallel`, Playwright splits the file's tests across workers; each worker loads the module and runs the file's `beforeAll` (verified in DB: pairs of registrations 1–3 ms apart per run). A module-level `Date.now()` email collided across same-millisecond workers → duplicate email → 409 (3 of 5 early runs failed). Fix: per-worker unique email `e2e-smoke-<ts>-<uuid8>@example.com` using global Web Crypto (`crypto.randomUUID()`, typed via DOM lib, no `@types/node` needed). 13 consecutive green runs after the fix.
  - **F7 (fixed):** Committed spec broke web unit tests — vitest collected `e2e/login.spec.ts` (matches `*.spec.ts`) and failed on Playwright's `test.beforeAll` ("did not expect test.beforeAll() to be called here"). Added `exclude: ['e2e/**', ...]` to the vitest config in `apps/web/vite.config.ts`.
  - **F8 (fixed):** Turbo sanitizes undeclared env vars — `E2E_BASE_URL` set at the root did not reach the Playwright process. Declared in the turbo task `env` list; dead-port run now fails with the clear "Could not reach the API … Start the dev stack with `pnpm dev`" message.
  - **F9 (fixed):** README listed `pnpm test:e2e` under **Backend (apps/api)** where no such script exists; moved to Frontend (apps/web) and added to the Root scripts with the `pnpm dev` prerequisite.
- Login failure contract verified in code: API 401 body message `Invalid email or password` (`apps/api/src/modules/auth/auth.service.ts`), interceptor rejects auth-path 401s with the response message, `LoginPage.tsx` catch → `toast.error(getErrorMessage(err))`.
- `worker`/`workerIndex` are not named fixtures for `beforeAll` in Playwright 1.64 (verified in package source) — the random-suffix design avoids needing them.

## Verification

- `pnpm test:e2e` (repo root, turbo → `apps/web`): **2 passed** — 13 consecutive green runs after F6 fix (happy path + wrong-password)
- `E2E_BASE_URL=http://localhost:3999 pnpm test:e2e`: both tests fail fast with the explicit "Could not reach the API … (pnpm dev)" message (AC2)
- `pnpm test` in `apps/web` (vitest): 45 files / 563 tests passed (after F7 fix)
- `pnpm lint` (root, turbo): api + web both passed; `pnpm typecheck` (web) passed; Prettier check on changed files clean
- DB probe (via the API's own Prisma client + dotenv, no credentials displayed): confirmed per-worker registration behavior and no duplicated emails after the fix

## Resume next

Done — child complete. Code in `310f729`; closeout docs (this checkpoint,
`implementation.md`, EP09 queue, story status) in the follow-up docs commit.
Remaining: EP09 parent review after SP-117/SP-118; F5 disposition by
planner/reviewer. No further SP-116 work.
