# SP-109H: `pages/<route>/ui` and the app shell (`App.tsx`, `AppProviders`)

**Story ID:** SP-109H
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Queued (SP-109G must land first)
**Dependencies:** SP-109G (widgets exist as folders), SP-109F (`app/store`)
**Jira key:** Pending creation

## Summary and bounded scope

Finish the move: each route screen gets its own `pages/<route>/ui/` folder
beside its test file, and the top layer becomes real app wiring — `app/App.tsx`
(the router) and a new `app/providers/AppProviders.tsx` that composes
`BrowserRouter` → Redux `Provider` → `AuthProvider`, with `main.tsx` reduced to
the Vite entry that renders `<AppProviders><App /></AppProviders>`. After this
child `src/pages/` and `src/App.tsx` no longer exist.

Routes, guard placement (public vs protected), the `/verify-email` always-open
route and the catch-all redirect are unchanged — the three suites that render
the **real** `App` (`VerifyEmail`, `ForgotPassword`, `ResetPassword`) are the
proof.

Excluded: boundary enforcement proof, docs repointing and full verification (I).

## Source requirement references

RQ-109-01, RQ-109-02, RQ-109-04, RQ-109-06; RD7 in the
[breakdown README](./README.md); SP-103 route-reachability contract and SP-108E
guard contract preserved; shared
[DoD](../../epics/README.md#definition-of-done) items 1, 5, 6, 7, 8, 9.

## Acceptance criteria

1. Moves (files unchanged apart from imports):
   `src/pages/Home.tsx` → `src/pages/home/ui/HomePage.tsx`;
   `Login` → `pages/login/ui/LoginPage.tsx` (+ `LoginPage.test.tsx`);
   `Register` → `pages/register/ui/RegisterPage.tsx` (+ test);
   `Dashboard` → `pages/dashboard/ui/DashboardPage.tsx`;
   `Profile` → `pages/profile/ui/ProfilePage.tsx` (+ test);
   `VerifyEmail` → `pages/verify-email/ui/VerifyEmailPage.tsx` (+ test);
   `ForgotPassword` → `pages/forgot-password/ui/ForgotPasswordPage.tsx` (+ test);
   `ResetPassword` → `pages/reset-password/ui/ResetPasswordPage.tsx` (+ test).
   Component names are renamed to the `…Page` convention **only where the file
   name changes** (`Home` → `HomePage`); existing exports
   (`LoginPage`, `RegisterPage`, `DashboardPage`, `ProfilePage`,
   `VerifyEmailPage`, `ForgotPasswordPage`, `ResetPasswordPage`) keep their
   names. `src/pages/` contains only the 8 route folders.
2. New `src/app/providers/AppProviders.tsx` exporting `AppProviders` (children:
   `ReactNode`) that composes `BrowserRouter` → `<Provider store={store}>` →
   `<AuthProvider>` in the order `src/main.tsx` uses today
   (`BrowserRouter` outermost, `Provider` then `AuthProvider`). No new
   provider, guard or middleware is introduced.
3. `src/App.tsx` → `src/app/App.tsx` with the same route table, the same
   `PublicRoute`/`ProtectedRoute` grouping and the same `path="*"` → `/`
   redirect; its imports become aliases (`@/pages/home/ui/HomePage`,
   `@/widgets/layout/ui/Layout`, …).
4. `src/main.tsx` keeps its location (it is the Vite entry referenced by
   `index.html`) and now renders `<React.StrictMode><AppProviders><App /></AppProviders></React.StrictMode>`,
   importing `./index.css` as before. StrictMode, `ReactDOM.createRoot` and the
   `#root` element lookup are unchanged.
5. Test imports are repointed only: the six page suites, plus the suites that
   import `../App` (`VerifyEmail`, `ForgotPassword`, `ResetPassword`) and the
   ones that import `../context/AuthContext` (`../features/auth/model/AuthContext`).
   No assertion is edited.
6. `pnpm --filter @studypilot/web test` → 19 files / 193 tests green;
   `typecheck` → exit 0; `lint` → exit 0; `grep -rn "from '\.\./App'\|src/pages/[A-Z]" apps/web/src`
   → no matches.

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| Route wiring through the real router | `src/pages/verify-email/ui/VerifyEmailPage.test.tsx` (18), `src/pages/forgot-password/ui/ForgotPasswordPage.test.tsx` (16), `src/pages/reset-password/ui/ResetPasswordPage.test.tsx` (21) | unchanged and green — they render the real `App`, so they cover the router table, guard placement and catch-all redirect after the move |
| Form pages | `src/pages/login/ui/LoginPage.test.tsx` (212 lines), `register` (203), `profile` (347) | unchanged and green against relocated `@/shared/ui` and `@/features/*` imports |
| Store/guard regression | `src/app/store/store.test.tsx`, `src/widgets/protected-route/ui/ProtectedRoute.test.tsx` | unchanged and green (F and G) |

## Technical notes

### Inspected code (2026-10-17, planner)

- `src/App.tsx` (42 lines) — `Layout` wrapper, 8 routes, `PublicRoute` group
  (`/login`, `/register`), `ProtectedRoute` group (`/dashboard`, `/profile`),
  always-open `/verify-email`, `/forgot-password`, `/reset-password`, `/`, and
  `path="*"` → `<Navigate to="/" replace />`.
- `src/main.tsx` (19 lines) — `React.StrictMode` → `BrowserRouter` →
  `Provider store={store}` → `AuthProvider` → `App`, `import './index.css'`.
  The provider order is the contract AC2 preserves.
- `src/pages/` — 8 components + 8 test files; `VerifyEmail.tsx` captures the
  base64url fragment token in component memory (SP-103), so nothing in its
  module scope may change.
- Three suites import the real `App` (`VerifyEmail`, `ForgotPassword`,
  `ResetPassword` test files import `../App`), which makes them the
  route-integrity net for this child.
- `index.html` references `/src/main.tsx` — the entry file must not move.
- Pages import `@/shared/ui/{Button,Input}`, `@/features/auth/model/AuthContext`,
  `@/shared/lib/errors`, `@/shared/lib/linkToken`, `@/shared/lib/datetime`,
  `@/features/auth/api/authService` — all created by B/C/D/E.

### Proposed (not verified)

- `Home` → `HomePage` is the only export rename; `Dashboard` keeps `DashboardPage`.
  If the implementer prefers zero renames, keeping `HomePage` as `Home` inside
  `pages/home/ui/` is acceptable — record the choice in the implementation record.
- No `pages/<route>/index.ts` barrels and no route-object indirection: the
  current `Routes` table is small and explicit.

## Sizing

- **Outcome:** all 8 route screens live in `pages/<route>/ui/` beside their
  tests, and the top layer is `app/App.tsx` + `app/providers/AppProviders.tsx`.
- **Time estimate:** 60–90 min: 16 file moves, 1 new file, ~15 import rewrites,
  three verification commands. Low uncertainty; the only new code is a 15-line
  provider wrapper that reproduces an existing composition.
- **Files:** production — `src/pages/*/ui/*.tsx` (8 new paths),
  `src/app/App.tsx` (moved), `src/app/providers/AppProviders.tsx` (new),
  `src/main.tsx` (slimmed); `src/App.tsx` and `src/pages/*` deleted. Tests — 8
  page suites moved with import repointing only.
- **Start context:** this ticket; [breakdown README](./README.md) *Target
  structure*; `apps/web/src/App.tsx`, `src/main.tsx`, `src/index.html`,
  `src/pages/VerifyEmail.tsx` + its test (the suite that exercises the router).
- **Verification:** `pnpm --filter @studypilot/web test` → 19 files / 193 tests;
  `typecheck` → exit 0; `lint` → exit 0; `ls apps/web/src` shows only
  `app/ entities/ features/ pages/ shared/ test/ widgets/ main.tsx index.css`.
- **Dependencies / exclusions:** G (widgets), F (`app/store`). Excludes
  boundary proof, root README repoint and full verification (I).

## Definition of Done

DoD 1 and 8 apply. DoD 5, 6 and 7 are preserved, not changed — the moved suites
keep their loading/error, keyboard-only and responsive-class assertions, which
is the evidence. DoD 2 N/A (schemas move unchanged), DoD 3 N/A (no data-access
change), DoD 9 covered by this ticket and the breakdown. DoD 10 belongs to the
combined SP-109 review. Evidence goes to `./artifacts/SP-109H/`.

## Tracker reference

`Pending creation` (RD11).

## Out of scope

- Boundary enforcement proof, legacy-folder proof, root `README.md` repoint,
  parent implementation index — [SP-109I](./SP-109I-boundaries-docs-verification.md).
