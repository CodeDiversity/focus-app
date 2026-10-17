# SP-109G: `widgets/` — layout, header, verification banner, route guards

**Story ID:** SP-109G
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Queued (SP-109C, SP-109E, SP-109F must land first)
**Dependencies:** SP-109C (`shared/ui`), SP-109E (`useAuth`), SP-109F (resend hook)
**Jira key:** Pending creation

## Summary and bounded scope

Move the five composed blocks out of the flat `components/` folder into their
own widget folders — `layout`, `header`, `email-verification-banner`,
`protected-route`, `public-route` — each with a `ui/` segment, and move the
guard test suite next to the guard it drives. After this child
`src/components/` and `src/context/` are both gone: every remaining
`useAuth` consumer is a widget or (in H) a page, and each block owns its own
test file.

Excluded: pages and the router/app shell (H), boundary proof/docs (I).

## Source requirement references

RQ-109-01, RQ-109-02, RQ-109-04, RQ-109-06 in the
[breakdown README](./README.md); SP-103/EP01 widget contracts preserved
(banner dismissal lifecycle, guard loading gate); shared
[DoD](../../epics/README.md#definition-of-done) items 1, 5, 6, 7, 8, 9.

## Acceptance criteria

1. Moves (component code unchanged — imports only):
   `src/components/Layout.tsx` → `src/widgets/layout/ui/Layout.tsx`;
   `src/components/Header.tsx` → `src/widgets/header/ui/Header.tsx`;
   `src/components/EmailVerificationBanner.tsx` + `.test.tsx` →
   `src/widgets/email-verification-banner/ui/`;
   `src/components/ProtectedRoute.tsx` →
   `src/widgets/protected-route/ui/ProtectedRoute.tsx`;
   `src/components/PublicRoute.tsx` →
   `src/widgets/public-route/ui/PublicRoute.tsx`.
2. `src/context/ProtectedRoute.test.tsx` →
   `src/widgets/protected-route/ui/ProtectedRoute.test.tsx`, keeping all 4
   SP-108E cases (they drive the **real** guards through the real `AuthProvider`
   and a fresh test store) with **no assertion edited**.
3. Internal widget wiring is rewritten to aliases:
   `Layout` imports `Header` and `EmailVerificationBanner` from their widget
   folders; `Header` imports `Button` from `@/shared/ui/Button`, `useAuth` from
   `@/features/auth/model/AuthContext`; `EmailVerificationBanner` imports
   `Button`, `useAuth`, `SessionUser` from `@/entities/user/model/types` and
   `useResendVerification` from
   `@/features/email-verification/model/useResendVerification`; both guards
   import `useAuth`.
4. `src/components/` and `src/context/` no longer exist; grep finds no
   `components/`, `context/ProtectedRoute` or `context/AuthContext` specifier in
   `apps/web/src`.
5. `src/App.tsx` — which still imports `./components/Layout`,
   `./components/ProtectedRoute`, `./components/PublicRoute` — is repointed to
   the widget folders **by path only** (H owns its move and the router's
   restructuring).
6. `pnpm --filter @studypilot/web test` → 19 files / 193 tests green with no
   edited assertions; `typecheck` → exit 0; `lint` → exit 0.

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| Verification banner | `src/widgets/email-verification-banner/ui/EmailVerificationBanner.test.tsx` (moved) | 8 SP-103 cases — loaded/unverified visibility, dismissal persistence, per-account reset, resend loading/cooldown/network error, keyboard dismissal and resend, viewport classes |
| Route guards | `src/widgets/protected-route/ui/ProtectedRoute.test.tsx` (moved) | 4 SP-108E cases — `isLoading` gate first, protected redirect with saved location, public redirect, post-refresh behavior |
| Regression for header/layout | existing `src/pages/*.test.tsx`, `src/features/auth/model/AuthContext*.test.tsx` | unchanged and green — they render the relocated layout/header/banner |

## Technical notes

### Inspected code (2026-10-17, planner)

- `src/components/Layout.tsx` (17 lines) — renders `<Header />`,
  `<EmailVerificationBanner />`, `<main>{children}</main>`; STUDY-20 recorded
  that this component was fixed to render `children` rather than `<Outlet />`.
- `src/components/Header.tsx` (65 lines) — nav links, `useAuth()` for
  `isAuthenticated`/`logout`/`user`, `Button` for the sign-out control.
- `src/components/EmailVerificationBanner.tsx` (38 lines) — renders only for a
  loaded, unverified student; uses `SessionUser` and the resend hook.
- `src/components/{ProtectedRoute,PublicRoute}.tsx` (22/21 lines) — gate on
  `isLoading` first (SP-108E), then `isAuthenticated`.
- `src/context/ProtectedRoute.test.tsx` (157 lines) — imports `AuthProvider`
  from `./AuthContext`, both guards from `../components/*`, and
  `Providers`/`makeTestStore` from `../test/providers`; all 4 cases must keep
  their meaning after the move (it is the SP-108E regression net).
- `src/App.tsx:2,11-12` imports `Layout`, `ProtectedRoute`, `PublicRoute` —
  the only consumer outside the widget layer, repointed in AC5.

### Proposed (not verified)

- One folder per widget with a `ui/` segment, even for the 20-line guards, so
  EP02–EP08 widgets have an obvious home and their tests can move beside them.
- No new `index.ts` barrel files: current code imports concrete modules, and a
  barrel would blur the layer contract the ESLint rules enforce.

## Sizing

- **Outcome:** all composed UI blocks live in `widgets/<block>/ui/` with their
  tests; `src/components/` and `src/context/` are gone.
- **Time estimate:** 45–60 min: 6 file moves, ~10 import rewrites (3 of them
  widget-internal), three verification commands. Low uncertainty; the banner and
  guard suites are moved, not modified.
- **Files:** production — `src/widgets/{layout,header,email-verification-banner,protected-route,public-route}/ui/*.tsx`
  (new paths); `src/components/*`, `src/context/*` deleted; `src/App.tsx`
  (imports only). Tests —
  `src/widgets/email-verification-banner/ui/EmailVerificationBanner.test.tsx`,
  `src/widgets/protected-route/ui/ProtectedRoute.test.tsx` (moved).
- **Start context:** this ticket; [breakdown README](./README.md) *Target
  structure*; `apps/web/src/components/*.tsx` (all six files),
  `src/context/ProtectedRoute.test.tsx`, `src/App.tsx`.
- **Verification:** `pnpm --filter @studypilot/web test` → 19 files / 193 tests;
  `typecheck` → exit 0; `lint` → exit 0; `ls apps/web/src` shows no
  `components/` or `context/`.
- **Dependencies / exclusions:** C (Button), E (`useAuth`), F (resend hook).
  Excludes pages/router (H), boundary proof/docs (I).

## Definition of Done

DoD 1 and 8 apply; DoD 5 (loading/error states), 6 (keyboard) and 7
(responsive) are **preserved, not changed** — the moved banner and guard suites
keep their keyboard and viewport-class assertions, which is the evidence for
those rows. DoD 2 N/A (no validation change), DoD 3 N/A (no data-access change),
DoD 9 covered by this ticket and the breakdown. DoD 10 belongs to the combined
SP-109 review. Evidence goes to `./artifacts/SP-109G/`.

## Tracker reference

`Pending creation` (RD11).

## Out of scope

- Pages, router and provider shell — [SP-109H](./SP-109H-pages-and-app-shell.md).
- Boundary proof, root README, final verification — [SP-109I](./SP-109I-boundaries-docs-verification.md).
