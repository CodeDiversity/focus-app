# SP-117 implementation record

**Story:** [SP-117: Auth Journey Coverage](../../SP-117-auth-journeys.md)
**Status:** Implemented — awaiting parent review (EP09)
**Checkpoint:** [checkpoint.md](./checkpoint.md)

## Summary

Extended the Playwright suite with the remaining auth journeys, all against the
real stack (Vite :3000 → API :4000 → Postgres; no mocking): registration
through the UI, session persistence across reload, logout (with the
protected-route redirect afterwards), the unauthenticated protected-route
redirect, and the unknown-email negative login path. Five new independent
tests in `apps/web/e2e/auth-journeys.spec.ts`; no production code changed; the
SP-116 config is reused unchanged.

## Acceptance criteria outcomes

| AC                                                                                          | Outcome              | Evidence                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Registering through the UI lands the user in the authenticated app (registration → session) | **Met with deviation (F1)** | The product deliberately does **not** auto-login after registration (SP-102's flow: `AuthContext.register()` "issues no token and signs nobody in"; `RegisterPage.tsx` navigates to `/login`). The test covers the actual journey end-to-end: register via UI → `Account created successfully!` toast → lands on `/login` → login with the new credentials → authenticated app (`onboarding`/`dashboard`) with the header `Logout` button visible. The AC's "lands in the authenticated app" wording conflicts with the SP-102 flow decision; flagged for planner/reviewer (reword AC or schedule an auto-login product story — both out of a tests-only scope) |
| 2. A logged-in session survives a page reload (token/cookie persistence)                    | **Met**              | Register via API + login via UI → `page.reload()` → still on the protected route (`onboarding`/`dashboard`), header `Logout` visible. Boot restore is the httpOnly-cookie silent refresh (`AuthContext.tsx` `initializeAuth`), so this exercises cookie persistence — not a token in localStorage |
| 3. Logging out returns to the login page; the protected route then redirects to login       | **Met**              | From a protected route, header `Logout` click → URL becomes `/login`; then `page.goto('/dashboard')` while logged out → redirected to `/login` again (ProtectedRoute `<Navigate to="/login" state={{ from }}>`)                                                              |
| 4. Visiting a protected route while logged out redirects appropriately                       | **Met**              | Fresh context (no cookie): `page.goto('/dashboard')` → `/login` (boot restore fails silently → user null → ProtectedRoute redirect)                                                                                                                                          |
| 5. Invalid login shows an actionable error (extend only if SP-116 kept it minimal)           | **Met**              | SP-116's wrong-password test already covers the 401 path; extended with the **unknown-email** path asserting the same uniform `Invalid email or password` message and no navigation — verifies there is no account-existence oracle                                          |

## Changes

| Path                                  | Change                                                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/e2e/auth-journeys.spec.ts`  | New: 5 independent tests + `registerUserViaApi` (fail-fast actionable errors, same contract as SP-116) and `loginViaUi` helpers; per-test unique emails (`e2e-auth-<ts>-<uuid8>@example.com`) |
| `docs/stories/EP09/SP-117-auth-journeys.md` | Story `Status` → Implemented — awaiting parent review (execution status only)                                                                                            |
| `docs/stories/EP09/README.md`         | Queue row + test-inventory Status fields for SP-117 (execution status only)                                                                                                    |
| `docs/stories/EP09/artifacts/SP-117/` | Checkpoint + this implementation record                                                                                                                                       |

No production code, config, or dependency changes (reused SP-116 infrastructure verbatim).

## Verification

All commands from the repo root unless noted; dev stack (Postgres :5432, Vite
:3000, API :4000) was already running and was not started/stopped by this task.

| Command (cwd)                                          | Result                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `pnpm test:e2e` (root)                                 | **7 passed** (5 SP-117 + 2 SP-116) — **39 consecutive green runs** after an initial lost-output failure (F2) |
| `pnpm test` (`apps/web`, vitest)                       | 45 files / 563 tests passed (the new e2e spec is excluded from collection by the existing `e2e/**` exclude) |
| `pnpm lint` (root, turbo)                              | api + web passed (after F3 prettier fix)                                                             |
| `pnpm --filter @studypilot/web typecheck` (root)       | passed                                                                                               |
| `npx prettier --check apps/web/e2e/auth-journeys.spec.ts` | clean (F3)                                                                                        |

## Findings and deviations

Full record with evidence in [checkpoint.md](./checkpoint.md):

- **F1 (open, AC wording vs. product flow — planner/reviewer disposition):** AC1
  as written ("registration → session", auto-login) conflicts with the product's
  deliberate SP-102 register→login flow. Covered the real journey (register →
  login → authenticated app); the AC outcome is recorded as *Met with
  deviation*. No AC rewording or product change made — both are outside this
  story's tests-only scope.
- **F2 (open, monitored):** in the very first repeat batch (before log capture
  was added), one `pnpm test:e2e` run failed and its output was not captured;
  the immediately following and all subsequent runs (38 in a row) passed. Root
  cause unknown — not reproduced in 39 runs total. The runner has `retries: 0`
  locally by design; if it recurs, the HTML report/screenshot (SP-116 F12/F13)
  will capture the failing step automatically.
- **F3 (fixed):** first lint run failed on Prettier formatting in the new spec
  (multi-line arrow function); reformatted with `prettier --write`, all checks
  green.
- **F4 (carried over from SP-116 F5, still open):** no data cleanup — each run
  leaves 1–2 `e2e-auth-*` user rows (no user-deletion endpoint; direct-DB
  cleanup needs env wiring outside a tests-only scope). Same disposition as
  SP-116 F5: dedicated-test-DB + cleanup infra story for planner.

## Remaining work

- EP09 parent review after SP-118 is implemented; F1/F2/F4 dispositions there.
- SP-118 (semester/course E2E coverage) is unblocked and is the next eligible
  queue row — needs its own authorization.
