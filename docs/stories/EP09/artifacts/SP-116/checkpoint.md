# SP-116 checkpoint

Updated: 2026-10-25 (local, -0400)
Execution state: EP09 queue row SP-116 → `docs/stories/EP09/README.md` (`Implemented — awaiting parent review`)
Story: `docs/stories/EP09/SP-116-playwright-login-smoke.md`
Review unit: EP09 group (children SP-116/117/118); parent index will live at `docs/stories/EP09/artifacts/EP09/implementation.md` once all children finish
Role / scope: implementer; E2E infrastructure layer — `apps/web` Playwright config/spec/vitest config, root `turbo.json`, repo README, `.gitignore`; no production code changes

## Repository state

- Workspace / branch: `main` (shared workspace, single implementer)
- HEAD at last update: `8b8f4a5` (SP-116 closeout commit)
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
- [x] F10/F11 follow-up (user-requested headed run + user-reported turbo TUI error): `test:e2e:headed` scripts and turbo task added, `interactive: true` removed; headed suite green from root with no TUI flags; committed in this closeout

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
- **F10 (user-requested addition, 2026-10-25):** user wants the browser window visible in some runs → add a `test:e2e:headed` script (`playwright test --headed`) in `apps/web` + root, with a turbo task marked `interactive: true` (headed browsers need a real terminal; turbo otherwise refuses/skips). Fits SP-116's "config + README wiring" scope; no production code. `test:ui` is already used by vitest, so the headed script is named `test:e2e:headed`. Disposition: added, then corrected under F11 (the `interactive: true` flag was wrong; see below).
- **F11 (user-reported error, 2026-10-25, fixed):** running `pnpm test:e2e:headed` failed with turbo's "Cannot run interactive task `@studypilot/web#test:e2e:headed` without Terminal UI. Set `\"ui\": \"tui\"` … or set `TURBO_UI=true`". Cause: F10's turbo task was declared `"interactive": true`, but headed Playwright needs a GUI display, not an interactive TTY — the flag is for tasks that drive terminal input, and it makes turbo refuse the task entirely outside TUI mode. Fix (current working tree): removed `"interactive": true` from the `test:e2e:headed` task in `turbo.json`; README note updated from "run from a real terminal" to "requires a display; won't work on headless CI". Verification below.
- **F12 (user question, 2026-10-25, done):** user asked how to get the report from an e2e run. `reporter: 'list'` produced terminal output only, so no report existed. Added Playwright's HTML reporter alongside the list reporter in `apps/web/playwright.config.ts` (`reporter: [['list'], ['html', { open: 'on-failure' }]]`): every run writes `apps/web/playwright-report/` (already gitignored), failures auto-open the report. View any run: `cd apps/web && pnpm exec playwright show-report`. README wired with a "Reports (e2e)" note.
- **F13 (user follow-up, 2026-10-25, done):** user wants screenshots in the report. Added `screenshot: 'on'` to the `use` block of `apps/web/playwright.config.ts`: every test captures a screenshot, attached to the HTML report (and `test-results/`). Verified: 2 passed run produced one `test-finished-1.png` per test; byte-identical copies present in `playwright-report/data/` (embedded in the report). "Trace/debug captures" beyond this remain future work (F5-adjacent infra).

## Verification

- `pnpm test:e2e` (repo root, turbo → `apps/web`): **2 passed** — 13 consecutive green runs after F6 fix (happy path + wrong-password)
- `E2E_BASE_URL=http://localhost:3999 pnpm test:e2e`: both tests fail fast with the explicit "Could not reach the API … (pnpm dev)" message (AC2)
- `pnpm test` in `apps/web` (vitest): 45 files / 563 tests passed (after F7 fix)
- `pnpm lint` (root, turbo): api + web both passed; `pnpm typecheck` (web) passed; Prettier check on changed files clean
- DB probe (via the API's own Prisma client + dotenv, no credentials displayed): confirmed per-worker registration behavior and no duplicated emails after the fix

F11 verification (2026-10-25, dev stack already running):

- `pnpm test:e2e:headed` (repo root, turbo classic UI, **no** `--ui=tui` / `TURBO_UI` needed): **2 passed (2.3s)** — happy path + wrong-password; browser window visibly opened headed. The F10 "Cannot run interactive task without Terminal UI" error no longer occurs.
- Note: turbo's `env` pass-through (`E2E_BASE_URL`, F8) is unchanged on the headed task.
- Prettier check on changed files: `turbo.json`, `package.json`, `apps/web/package.json` clean. `README.md` fails — **pre-existing**: the committed HEAD version (without both F10 lines) fails the same check, so the warning predates SP-116 and is not caused by these changes; left unformatted to keep the change scoped.

## Resume next

Done — child complete. Code in `310f729` + the F10/F11 follow-up commit;
closeout and follow-up docs in this commit. Remaining: EP09 parent review
after SP-117/SP-118; F5 disposition by planner/reviewer. No further SP-116
work.
