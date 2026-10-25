# SP-117 checkpoint

Updated: 2026-10-25 (local, -0400)
Execution state: EP09 queue row SP-117 → `docs/stories/EP09/README.md` (`In progress`)
Story: `docs/stories/EP09/SP-117-auth-journeys.md`
Review unit: EP09 group (children SP-116/117/118); parent index will live at `docs/stories/EP09/artifacts/EP09/implementation.md` once all children finish
Role / scope: implementer; E2E test layer only — new `apps/web/e2e/auth-journeys.spec.ts` (+ docs if needed); **tests only, no production code** (story sizing)

## Repository state

- Workspace / branch: `main` (shared workspace, single implementer), clean tree at task start
- HEAD at last update: `ff46bd4` (SP-116 docs correction)
- Saved work: new `apps/web/e2e/auth-journeys.spec.ts` + `docs/stories/EP09/artifacts/SP-117/` (uncommitted at this update; committed in the closeout — hash in the task handoff)
- Dev stack already running (Postgres :5432, Vite :3000, API :4000); not started/stopped by this task

## Progress

- [x] New spec `apps/web/e2e/auth-journeys.spec.ts` with 5 independent tests + per-test unique emails
- [x] AC1 (register journey) — Met with deviation F1 (actual flow: register → login → authenticated app)
- [x] AC2: session survives reload
- [x] AC3: logout → /login; protected route then redirects
- [x] AC4: unauthenticated visit to protected route → /login
- [x] AC5: unknown-email path added (wrong-password already covered by SP-116)
- [x] Full verification: `pnpm test:e2e` (39 consecutive green), web vitest, lint, typecheck, Prettier — all green
- [x] Closeout: `implementation.md` written; queue/status reconciled; scoped commit (hash in the queue/README row's commit note if present — see implementation.md)

## Decisions and dependencies

- **F1 (open, AC conflict — needs planner/reviewer disposition):** AC1 says "Registering a new account
  through the UI lands the user in the authenticated app (registration → session)", but the product
  deliberately does **not** auto-login after registration: `AuthContext.register()` "issues no token and
  signs nobody in — the student is redirected to login (SP-102's flow)" (`apps/web/src/features/auth/model/AuthContext.tsx`
  comment), and `RegisterPage.tsx` navigates to `/login` after success. A tests-only story cannot change
  this product behavior, and changing it would rewrite SP-102's flow decision (out of scope). Plan: cover
  the actual flow end-to-end (register via UI → success toast → lands on `/login` → login with the new
  credentials → authenticated app), record AC1 as `Met with deviation` in implementation.md, and flag the
  AC wording vs. SP-102 flow decision for reviewer/planner (reword AC, or schedule an auto-login product
  story). No AC rewording done by implementer (planner-owned).
- Reuses SP-116 infra unchanged: config (`fullyParallel`, chromium, `E2E_BASE_URL`), vitest `e2e/**` exclude,
  gitignored outputs. No new config.
- Per-test data isolation: each test registers its own user (unique `e2e-auth-<ts>-<uuid8>@example.com`);
  no shared beforeAll state; worker collisions impossible (SP-116 F6 lesson).
- Verified app behavior in code before writing tests:
  - Login success routes new users to `/onboarding` (onboarding incomplete) or `from`/`/dashboard`;
    success toast "Logged in successfully!" (`LoginPage.tsx`).
  - Register success toast "Account created successfully!" then `navigate('/login')` (`RegisterPage.tsx`).
  - Session restore on boot: silent `refreshToken()` via httpOnly cookie (`AuthContext.tsx` initializeAuth)
    — reload persistence is cookie-backed.
  - Logout: Header `Logout` button → `authService.logout()` + `clearUser()`; on a protected route
    `ProtectedRoute` then `<Navigate to="/login" state={{ from }}>`; on public pages no navigation.
    So the logout test must start from a protected route.
  - Uniform 401 message `Invalid email or password` for both wrong password and unknown email.
- Cleanup still not implemented (SP-116 F5, infra story candidate): runs create `e2e-auth-*` users; no
  user-deletion endpoint exists; out of tests-only scope again. Recorded, disposition stays with
  reviewer/planner.

## Verification

- `pnpm test:e2e` (root): 7 passed — 39 consecutive green runs; one earlier lost-output failure (F2, not reproduced)
- `pnpm test` (`apps/web`): 45 files / 563 tests passed
- `pnpm lint` (root): passed (after F3 prettier fix); typecheck (web): passed; Prettier check on the spec: clean
- Full evidence table in [implementation.md](./implementation.md)

## Resume next

Done — child complete. Verification and AC outcomes in [implementation.md](./implementation.md);
findings F1 (AC1 wording vs. SP-102 flow), F2 (one lost-output failure, monitored)
and F4 (cleanup, carried SP-116 F5) recorded for the EP09 parent review.
Remaining: SP-118 (next eligible row, needs its own authorization) and the
EP09 parent review.
