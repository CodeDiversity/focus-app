# SP-109G Implementation Record

**Story:** SP-109G — `widgets/` layout, header, verification banner, route guards
**Date:** 2026-10-17
**Status:** Implementation complete — awaiting parent review
**Jira:** STUDY-51

## Summary

Moved the five composed blocks out of the flat `src/components/` folder and the
guard suite out of `src/context/` into one folder per widget with a `ui/`
segment. Every change is an **import path only** rewrite — no component code,
markup, class, assertion or behavior changed (byte-diffs below).

## Moves

| Source (deleted) | Destination |
|---|---|
| `src/components/Layout.tsx` | `src/widgets/layout/ui/Layout.tsx` |
| `src/components/Header.tsx` | `src/widgets/header/ui/Header.tsx` |
| `src/components/EmailVerificationBanner.tsx` | `src/widgets/email-verification-banner/ui/EmailVerificationBanner.tsx` |
| `src/components/EmailVerificationBanner.test.tsx` | `src/widgets/email-verification-banner/ui/EmailVerificationBanner.test.tsx` |
| `src/components/ProtectedRoute.tsx` | `src/widgets/protected-route/ui/ProtectedRoute.tsx` |
| `src/components/PublicRoute.tsx` | `src/widgets/public-route/ui/PublicRoute.tsx` |
| `src/context/ProtectedRoute.test.tsx` | `src/widgets/protected-route/ui/ProtectedRoute.test.tsx` |

`src/components/` and `src/context/` no longer exist (removed after the moves).

## Import rewrites (all of them)

| File | Change |
|---|---|
| `widgets/layout/ui/Layout.tsx` | `./Header` → `@/widgets/header/ui/Header`; `./EmailVerificationBanner` → `@/widgets/email-verification-banner/ui/EmailVerificationBanner` (widget-internal wiring now crosses widget folders, so it must be alias-based per RD2) |
| `widgets/protected-route/ui/ProtectedRoute.test.tsx` | `../components/ProtectedRoute` → `@/widgets/protected-route/ui/ProtectedRoute`; `../components/PublicRoute` → `@/widgets/public-route/ui/PublicRoute`; `../test/providers` → `@/test/providers` |
| `widgets/email-verification-banner/ui/EmailVerificationBanner.test.tsx` | `../test/user` → `@/test/user`; `../test/providers` → `@/test/providers`; `./Layout` → `@/widgets/layout/ui/Layout` |
| `src/App.tsx` | `./components/Layout` → `@/widgets/layout/ui/Layout`; `./components/ProtectedRoute` → `@/widgets/protected-route/ui/ProtectedRoute`; `./components/PublicRoute` → `@/widgets/public-route/ui/PublicRoute` — **path only**, no restructuring (SP-109H owns `App.tsx`'s move and the router) |

`Header.tsx`, `ProtectedRoute.tsx` and `PublicRoute.tsx` needed no rewrite: they
already imported `useAuth` and `Button` through aliases from SP-109E/C.

## Byte-level evidence (AC1/AC2 — code unchanged)

`diff <(git show HEAD:<old path>) <new path>` for every moved file:

- `Header.tsx`, `ProtectedRoute.tsx`, `PublicRoute.tsx` — **no differences**.
- `Layout.tsx` — 2 import lines only.
- `EmailVerificationBanner.tsx` — 1 import line only (SP-109F's
  `../hooks/…` → `@/features/email-verification/model/useResendVerification`).
- `EmailVerificationBanner.test.tsx` — 3 import lines only (8 SP-103 cases intact).
- `ProtectedRoute.test.tsx` — 3 import lines only; all 4 SP-108E cases and every
  assertion untouched (they still drive the real guards through the real
  `AuthProvider` and a fresh `makeTestStore()`).

## Acceptance criteria

1. ✅ Five widget moves as listed above (component code unchanged — imports only).
2. ✅ Guard suite moved with all 4 SP-108E cases, zero assertions edited
   (byte-diff shows only 3 import lines).
3. ✅ Widget wiring rewritten to aliases — `Layout` imports `Header` and
   `EmailVerificationBanner` from their widget folders; `Header` imports
   `Button` (`@/shared/ui/Button`) and `useAuth`
   (`@/features/auth/model/AuthContext`); the banner imports `Button`, `useAuth`,
   `SessionUser` (`@/entities/user/model/types`) and `useResendVerification`
   (`@/features/email-verification/model/useResendVerification`); both guards
   import `useAuth`.
4. ✅ `src/components/` and `src/context/` gone; grep for `components/`,
   `context/ProtectedRoute`, `context/AuthContext` under `apps/web/src` returns
   no matches; `ls apps/web/src` shows neither folder.
5. ✅ `src/App.tsx` repointed by path only (12 → 12 lines, 3 import specifiers).
6. ✅ Verification below.

## Verification

| Command | Result |
|---|---|
| `pnpm --filter @studypilot/web test` | **19 files / 193 tests passed** (baseline 19/193, no edited assertions) |
| `pnpm --filter @studypilot/web typecheck` | exit 0 |
| `pnpm --filter @studypilot/web lint` | exit 0 (no new disables: the RD7 `eslint-disable` comments in F remain the only ones) |

`import/no-restricted-paths` zones already covered `src/widgets`
(widgets may import `features`, `entities`, `shared`; not `pages`, `app`) — no
ESLint config change was needed for this child.

## Resume context / reconciliation notes

- On resume the working tree held an **uncommitted, complete SP-109F** plus a
  half-finished G (`Layout`/`Header` moved, `App.tsx` still importing the deleted
  `./components/Layout`): baseline was **4 failed / 15 passed** test files.
- SP-109F's checkpoint and implementation record had been written to the
  repo-root `artifacts/SP-109F/`; they were moved verbatim to the delivery
  home's `docs/stories/SP-109/artifacts/SP-109F/` so the queue pointer resolves.
- **Open gap for the parent (not fixed by this child):** the queue's
  `./artifacts/SP-109E/` pointer has no directory — SP-109E's only evidence is
  commit `dff638a`. No record was invented for it here.

## Out of scope (unchanged)

- Pages, router, provider shell — SP-109H.
- Boundary red/green proof, root README repoint, final verification — SP-109I.