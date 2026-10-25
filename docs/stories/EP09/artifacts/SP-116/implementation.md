# SP-116 implementation record

**Story:** [SP-116: Playwright E2E Infrastructure + Login Smoke Test](../../SP-116-playwright-login-smoke.md)
**Status:** Implemented — awaiting parent review (EP09)
**Checkpoint:** [checkpoint.md](./checkpoint.md)

## Summary

Playwright browser automation for the repo, running against the real dev stack
(Vite :3000 → NestJS API :4000 → Postgres; no API mocking). The suite registers
a fresh user through the real API, logs in through the real login UI, asserts
the authenticated destination, and covers the wrong-password failure path.
Runnable with one command from the repo root: `pnpm test:e2e` (dev stack must
be running via `pnpm dev`).

The initial code was committed in a prior session (`2659504`); this task
verified it against the acceptance criteria, fixed five defects found during
verification (F1, F2, F6, F7, F8, F9 in the checkpoint), and completed
closeout. No production code was changed.

After closeout, the user requested the visible-browser variant (F10) and then
reported turbo's "Cannot run interactive task without Terminal UI" error (F11);
both are resolved in the F10/F11 follow-up (see Findings). No production code
and no AC behavior changed — plumbing only, as in F10's own scope note.

## Acceptance criteria outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1. `@playwright/test` dev dep; `pnpm test:e2e` (repo root) runs the suite; documented in README | **Met** | `@playwright/test ^1.64.1` in `apps/web/package.json`; root script `turbo run test:e2e` now resolves (F1: added the missing `test:e2e` task to `turbo.json`); README documents it under Root and Frontend scripts with the `pnpm dev` prerequisite (F9: it was misfiled under Backend, where no such script exists) |
| 2. Missing API/DB produces a clear failure, not a timeout cascade | **Met** | `beforeAll` wraps the registration request: connection failures throw "Could not reach the API at … Start the dev stack with `pnpm dev`"; non-201 responses throw with the response body. Verified by pointing `E2E_BASE_URL` at a dead port (F8: declared in the turbo task `env` list so turbo passes it through) — both tests fail fast with the actionable message |
| 3. Smoke test registers/uses a real user via the API, logs in through the real UI, asserts an authenticated destination | **Met** | `e2e/login.spec.ts`: `POST /api/auth/register` in `beforeAll` (201 required), then the login form (`getByLabel`/`getByRole`) and `toHaveURL(/\/(onboarding|dashboard)/)` — new accounts land on onboarding |
| 4. Deterministic: no fixed sleeps; unique data per run; passes repeatedly | **Met** | No sleeps anywhere; email is `e2e-smoke-<timestamp>-<uuid8>@example.com` — unique per run and per worker (F6: a bare `Date.now()` collided across workers that load in the same millisecond, producing 409s; Web Crypto `crypto.randomUUID()` suffix removes the collision without new deps). 13 consecutive green runs after the fix |
| 5. Login failure path (wrong password) shows an error — minimal negative case | **Met** | Second test: wrong password → asserts the `Invalid email or password` error toast (the API's uniform 401 message surfaced by `LoginPage.tsx`) and that the URL stays `/login` (F2: this test was missing from the committed spec) |

## Changes

| Path | Change |
|---|---|
| `turbo.json` | Added `test:e2e` task (`cache: false`, `env: ["E2E_BASE_URL"]`) — F1, F8 |
| `apps/web/e2e/login.spec.ts` | Per-worker unique email (F6); explicit connection/non-201 failure messages (AC2); added wrong-password negative test (F2/AC5) |
| `apps/web/playwright.config.ts` | `baseURL` honors `E2E_BASE_URL` (default `http://localhost:3000`) — F8; F12: `reporter: [['list'], ['html', { open: 'on-failure' }]]` so every run writes `playwright-report/` and failures auto-open it; F13: `screenshot: 'on'` — every test's screenshot is attached to the report |
| `apps/web/vite.config.ts` | Vitest `exclude: ['e2e/**', …]` so the unit runner never collects Playwright specs (F7) |
| `README.md` | `pnpm test:e2e` documented under Root and Frontend scripts with the dev-stack prerequisite; removed from the Backend section (F9) |
| `.gitignore` | Ignore Playwright outputs `test-results/`, `playwright-report/` (was uncommitted since the prior session — F3) |
| `turbo.json` (F10/F11) | Added `test:e2e:headed` task (`cache: false`, `env: ["E2E_BASE_URL"]`); **without** `interactive: true` (F11: that flag made turbo refuse the headed run outside TUI mode) |
| `apps/web/package.json` (F10) | Added `test:e2e:headed` script: `playwright test --headed` |
| `package.json` (root, F10) | Added root script `test:e2e:headed: turbo run test:e2e:headed` |
| `README.md` (F10/F11/F12) | `pnpm test:e2e:headed` documented under Root and Frontend scripts; note says it "requires a display; won't work on headless CI"; F12: `playwright show-report` documented under Root scripts |

Baseline for the combined scope: `4a34fd4` (HEAD before this task's first
change). The prior session's `2659504` already contained the initial spec,
config, devDep, root script, README line and EP09 planning docs; this task's
diff is the six paths above.

## Verification

All commands from the repo root unless noted; dev stack (Postgres :5432, Vite
:3000, API :4000) was already running and was not started/stopped by this task.

| Command (cwd) | Result |
|---|---|
| `pnpm test:e2e` (root) | **2 passed** — 13 consecutive green runs after the F6 fix (happy path + wrong-password) |
| `pnpm test:e2e:headed` (root, F11 verification) | **2 passed (2.3s)** with turbo in classic UI — no `--ui=tui` / `TURBO_UI=true` needed |
| `pnpm test:e2e` after F12 (root) | **2 passed (1.1s)**; `apps/web/playwright-report/index.html` written; `playwright show-report` serves it (HTTP 200 verified) |
| `pnpm test:e2e` after F13 (root) | **2 passed**; per-test screenshots captured (`test-results/*/test-finished-1.png`) and embedded in the report (byte-identical `playwright-report/data/*.png`) |
| `E2E_BASE_URL=http://localhost:3999 pnpm test:e2e` (root) | Both tests fail fast with "Could not reach the API … (pnpm dev)" — AC2 |
| `pnpm test` (`apps/web`, vitest) | 45 files / 563 tests passed (after the F7 exclude fix; before it, the e2e spec broke collection) |
| `pnpm lint` (root, turbo) | api + web both passed |
| `pnpm typecheck` (`apps/web`) | passed |
| `npx prettier --check` on changed files | clean (F11 follow-up: `turbo.json`, root/`apps/web/package.json` clean; committed-baseline `README.md` already failed before SP-116, warning not introduced here) |

## Findings and deviations

Full record with evidence in [checkpoint.md](./checkpoint.md):

- **F1–F4, F6–F9: fixed** as part of this task (missing turbo task; missing
  negative test; uncommitted `.gitignore`; stale queue/status; 409 flake from
  per-worker `Date.now()` collision; vitest collecting the Playwright spec;
  turbo env-var sanitization; README misplacement).
- **F5 (open, needs planner/reviewer decision):** the EP09 README environment
  contract says runs use a dedicated test database and the suite "cleans up
  what it creates"; the implementation (per the story's own technical notes:
  "tests only need `http://localhost:3000`") runs against the running dev
  stack with per-run unique emails and no cleanup — each run leaves one or two
  `e2e-smoke-*` user rows. No user-deletion API endpoint exists, so cleanup
  would require new production code or a direct DB client with an exported DB
  URL (manual env setup, which the story scope excludes). Recorded as a
  recommended follow-up (SP-117 or an infra story); repo precedent for
  disposable DBs is the `*_test`-suffixed `TEST_DATABASE_URL` convention in
  `apps/api/src/modules/auth/testing/recovery-db-harness.ts`.
- **F10 (user-requested addition, 2026-10-25):** `test:e2e:headed` scripts +
  turbo task + README wiring as the user asked for a visible-browser variant.
- **F11 (user-reported error, fixed in the follow-up):** F10's turbo task was
  initially declared `"interactive": true`, so `pnpm test:e2e:headed` failed
  with turbo's "Cannot run interactive task … without Terminal UI" error
  outside TUI mode. Headed Playwright needs a GUI display, not an interactive
  TTY, so the flag was wrong; it was removed and the README note reworded to
  "requires a display; won't work on headless CI". Verified: headed suite
  passes from the repo root without any TUI flag (2 passed in 2.3s).
- **F12 (user question, done):** how to get the report from an e2e run — the
  config had `reporter: 'list'` only, so no report was produced. Added the
  HTML reporter next to it (`[['list'], ['html', { open: 'on-failure' }]]`);
  every run now writes `apps/web/playwright-report/`, failures auto-open it,
  and any run is viewable via `cd apps/web && pnpm exec playwright
  show-report` (serves http://localhost:9323 — verified 200). The directory
  is already gitignored (F3).
- **F13 (user follow-up, done):** screenshots in the report — `screenshot:
  'on'` in `apps/web/playwright.config.ts`; each test captures a screenshot
  that the HTML report attaches. Verified on a 2-passed run: one
  `test-finished-1.png` per test, byte-identical copies embedded in
  `playwright-report/data/`.

## Remaining work

- Parent (EP09) review after all children are implemented; F5 disposition is
  a reviewer/planner decision.
- SP-117 and SP-118 are unblocked (both depend only on SP-116).
