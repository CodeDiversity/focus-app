# SP-109H Implementation Record

**Story:** SP-109H — `pages/<route>/ui` + `app/App.tsx` + `app/providers/AppProviders.tsx`
**Date:** 2026-10-17
**Status:** Implementation complete — awaiting parent review
**Jira:** STUDY-52

## Summary

Finished the FSD move: each of the 8 route screens now lives in
`pages/<route>/ui/` beside its test, the router moved to `src/app/App.tsx`,
and the provider composition was extracted from `main.tsx` into a new
`src/app/providers/AppProviders.tsx`. `src/App.tsx` is gone; `src/main.tsx`
keeps its location (the `index.html` entry) and is reduced to
`StrictMode → AppProviders → App`.

## Moves

| Source (deleted) | Destination |
|---|---|
| `src/pages/Home.tsx` | `src/pages/home/ui/HomePage.tsx` |
| `src/pages/Login.tsx` / `Login.test.tsx` | `src/pages/login/ui/LoginPage.tsx` / `.test.tsx` |
| `src/pages/Register.tsx` / `Register.test.tsx` | `src/pages/register/ui/RegisterPage.tsx` / `.test.tsx` |
| `src/pages/Dashboard.tsx` | `src/pages/dashboard/ui/DashboardPage.tsx` |
| `src/pages/Profile.tsx` / `Profile.test.tsx` | `src/pages/profile/ui/ProfilePage.tsx` / `.test.tsx` |
| `src/pages/VerifyEmail.tsx` / `VerifyEmail.test.tsx` | `src/pages/verify-email/ui/VerifyEmailPage.tsx` / `.test.tsx` |
| `src/pages/ForgotPassword.tsx` / `.test.tsx` | `src/pages/forgot-password/ui/ForgotPasswordPage.tsx` / `.test.tsx` |
| `src/pages/ResetPassword.tsx` / `.test.tsx` | `src/pages/reset-password/ui/ResetPasswordPage.tsx` / `.test.tsx` |
| `src/App.tsx` | `src/app/App.tsx` |

New: `src/app/providers/AppProviders.tsx`.
Removed: `pages/.gitkeep`, `app/.gitkeep`, `app/providers/.gitkeep` (folders
now populated), and a stray **empty** `pages/widgets/` directory left by an
earlier session (untracked, zero files — deleted; `pages/` must contain only
the 8 route folders).

## Rename decision (recorded per ticket)

`Home.tsx` already exported `HomePage` (verified at line 5), so the move to
`pages/home/ui/HomePage.tsx` required **zero export renames**; the other seven
components already carry their `…Page` export names. All 8 page components are
**byte-identical** to their HEAD versions (they were already on alias imports
from B/C/D/E).

## Import rewrites (complete list)

| File | Change |
|---|---|
| `app/App.tsx` | 8 page imports `./pages/<X>` → `@/pages/<route>/ui/<X>Page` (route table, guard grouping and catch-all unchanged) |
| `main.tsx` | `BrowserRouter`/`Provider`/`AuthProvider` composition removed → `import { AppProviders } from '@/app/providers/AppProviders'` + `import App from '@/app/App'`; `./index.css`, StrictMode, `createRoot`, `#root` unchanged |
| `app/providers/AppProviders.tsx` (new) | `BrowserRouter` → `Provider store={store}` → `AuthProvider` — the exact order `main.tsx` used (AC2); imports `@/features/auth/model/AuthContext` and `@/app/store/store` (legal: `app` may import everything below it) |
| 6 page test suites | relative imports repointed only: `../test/providers` → `@/test/providers`, `../test/user` → `@/test/user`, `./<Page>` → `@/pages/<route>/ui/<Page>Page` |
| 3 App-rendering suites (`verify-email`, `forgot-password`, `reset-password`) | `../App` → `@/app/App` with a documented test-only lint exception (see below) |

No assertion in any test was edited (byte-diffs: 8 components identical; 6
test suites differ only in import lines).

### Documented lint exception (test-only, not RD7)

The `pages` ESLint zone forbids importing `src/app` (RD6), and the 3 suites
that render the **real** `App` (TR-109-03) must import it. Each carries:

```ts
// test-only: suite renders the real App router (SP-109H)
// eslint-disable-next-line import/no-restricted-paths
import App from '@/app/App';
```

This is the test-suite analog of RD8's `src/test/` exemption (the contract's
"test/ is exempt — it composes the store and router for suites"), distinguished
by comment from the four RD7 store-import disables SP-109F added. It is a
candidate for SP-109I's boundary red/green proof to account for; the proof's
deliberate-violation case targets non-test files, so it is unaffected.

## Acceptance criteria

1. ✅ 8 components + 8 suites moved; `src/pages/` contains only the 8 route
   folders; zero renames needed (`Home` already exported `HomePage`).
2. ✅ `AppProviders` composes BrowserRouter → Provider → AuthProvider (same
   order as today's `main.tsx`); no new provider/guard/middleware.
3. ✅ `app/App.tsx` — same route table, same guard grouping, same
   `path="*"` → `/` redirect; imports are aliases.
4. ✅ `main.tsx` in place, rendering
   `<React.StrictMode><AppProviders><App /></AppProviders></React.StrictMode>`
   and `./index.css` as before.
5. ✅ Test imports repointed only; no assertion edited.
6. ✅ Verification below + grep/ls proofs.

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @studypilot/web test` | **19 files / 193 tests passed** (baseline; the three real-`App` suites — 18/16/21 tests — are the route-integrity proof) |
| `pnpm --filter @studypilot/web typecheck` | exit 0 |
| `pnpm --filter @studypilot/web lint` | exit 0 |
| `grep -rn "from '\.\./App'\|src/pages/[A-Z]" apps/web/src` | no matches |
| `ls apps/web/src` | `app entities features index.css main.tsx pages shared test widgets` — exactly the expected set |
| `ls apps/web/src/pages` | the 8 route folders only |

## Out of scope (unchanged)

- Boundary red/green proof, legacy-folder proof, root `README.md` repoint,
  parent implementation index — SP-109I.