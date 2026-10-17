# SP-109E: `features/auth` — auth API service, auth types, `useAuth` context

**Story ID:** SP-109E
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Queued (SP-109C and SP-109D must land first)
**Dependencies:** SP-109C (transport), SP-109D (`userService` extraction, so
`authService` no longer owns the profile methods)
**Jira key:** STUDY-49 (verified 2026-10-17)

## Summary and bounded scope

Move the authentication feature — its HTTP service, its types and its React
context — into one folder: `src/features/auth/{api,model}`. After this child
`src/services/` and `src/context/AuthContext.tsx` no longer exist, and the nine
`useAuth` consumers (H/G's widgets and H's pages) point at a single import.

The public contract is frozen by SP-108 RD3: `AuthContextType`, `AuthProvider`,
`useAuth`, `resendFeedback`-independent session behavior, the boot-loading gate,
the session-expired navigation and the SP-105G generation handling are unchanged
— only the module's location changes.

Excluded: slice/thunk/selector/RTK Query API/store moves (F), widgets (G),
pages and app shell (H), verification/docs (I).

## Source requirement references

RQ-109-01, RQ-109-03, RQ-109-04, RQ-109-06; RD7 (the single `features → app`
exception), RD10 in the [breakdown README](./README.md); SP-108 RD3/RD4
preserved contracts; shared
[DoD](../../epics/README.md#definition-of-done) items 1, 4, 5, 8, 9.

## Acceptance criteria

1. `src/services/auth.ts` (post-D content) → `src/features/auth/api/authService.ts`;
   `src/features/auth/model/types.ts` (landed in B) is its type source. The
   `vi.mock('../services/auth')` targets in the page tests and
   `src/hooks/useResendVerification.test.tsx` are repointed to
   `'@/features/auth/api/authService'` **without changing any mocked function
   body**. `src/services/` no longer exists.
2. `src/context/AuthContext.tsx` → `src/features/auth/model/AuthContext.tsx`,
   together with `AuthContext.test.tsx` and
   `AuthContext.registerLogout.test.tsx`. `AuthContextType`, `AuthProvider`,
   `useAuth` keep their names, shapes and behavior — including `isLoading`
   initial `true` (SP-108E/IR-001), the single silent `refreshToken()` boot
   restore, `registerLocalSessionClearer`, `setSessionExpiredHandler` wiring and
   the `sessionExpired` navigation state.
3. `src/context/ProtectedRoute.test.tsx` (which drives the **real** guards plus
   `AuthProvider`, per SP-108E) keeps its assertions and follows the new import
   paths; it is **not** moved in this child (G moves it to
   `widgets/protected-route/ui/`).
4. All `useAuth` importers are repointed to
   `@/features/auth/model/AuthContext` and all `authService` importers to
   `@/features/auth/api/authService`: `store/authSlice.thunks.ts`,
   `store/authSlice.thunks.test.ts`, `hooks/useResendVerification.ts` (no —
   it imports the RTK API, F; not a caller here), `components/{Header,
   ProtectedRoute,PublicRoute,EmailVerificationBanner}.tsx`,
   `components/EmailVerificationBanner.test.tsx`, and
   `pages/{Home,Login,Register,Profile,Dashboard,VerifyEmail,ForgotPassword,ResetPassword}.tsx`
   plus `pages/{Login,Register,Profile,VerifyEmail,ForgotPassword,ResetPassword}.test.tsx`.
   `src/context/` no longer exists except `ProtectedRoute.test.tsx` (G).
5. `pnpm --filter @studypilot/web test` → 19 files / 193 tests green with no
   edited assertions; `typecheck` → exit 0; `lint` → exit 0.

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| Session context behavior | `src/features/auth/model/AuthContext.test.tsx` (moved, unchanged) | all existing cases — boot restore, single-flight refresh, profile reconciliation/dedupe, late-response guards, banner dismissal lifecycle, logout on expiry |
| Adapter register/logout paths | `src/features/auth/model/AuthContext.registerLogout.test.tsx` (moved, unchanged) | 4 SP-108F cases — sanitized error in slice `error`, loading transitions, always-clear-token |
| Real route guards | `src/context/ProtectedRoute.test.tsx` (still here; moves in G) | 4 SP-108E cases green against the relocated provider |
| Service consumers | `src/pages/{Login,Register,Profile,ForgotPassword,ResetPassword,VerifyEmail}.test.tsx` | unchanged and green with repointed `vi.mock` targets |

## Technical notes

### Inspected code (2026-10-17, planner)

- `src/context/AuthContext.tsx` (314 lines) — imports at lines 9–22: types,
  `authService`, `tokenStore`, `setSessionExpiredHandler`,
  `registerLocalSessionClearer`/`snapshotSessionGeneration` (recovery),
  `store/authSlice` actions, `store/authSlice.thunks` (`login`, `updateProfile`),
  `utils/errors`, `store/authSlice.selectors`, `store/hooks` (`useAppDispatch`).
  Post-C/D/B those become `@/shared/api/*`, `@/shared/lib/errors`,
  `@/entities/user/api/userService`, `@/features/session/model/*` (F's paths,
  valid to import ahead of F because the specifiers resolve only after F — see
  sequencing note below) and `@/app/store/hooks` (RD7).
- `src/services/auth.ts:14-58` — the six auth/recovery methods with their
  sanitized-error comments; the profile methods are gone after D.
- Consumers: 9 `useAuth` call sites across components and pages (grep-verified),
  plus `authService` in `store/authSlice.thunks.ts:3` and eight test files.
- `src/hooks/useResendVerification.ts` imports `store/api`, not `authService` —
  it belongs to F (`features/email-verification`), not this child.

### Sequencing note (dependency honesty)

AC2's import list includes `@/features/session/model/*`, which F creates. If E
lands before F, `AuthContext.tsx` must keep importing the slice through its
**current** path (`@/store/authSlice` etc.) and only F rewrites it. E's stated
dependency is therefore C + D (met), and F's rewrite of this file is F's own
responsibility — E must not create the `features/session` folder.

## Sizing

- **Outcome:** `features/auth` holds the auth service, auth types and the
  `useAuth` context; `src/services/` and `src/context/AuthContext*` are gone.
- **Time estimate:** 60–90 min: 4 file moves, ~20 import rewrites (including 8
  `vi.mock` targets), three verification commands. Low–moderate uncertainty;
  every edit is a path change, but the `vi.mock` targets must match exactly.
- **Files:** production — `src/features/auth/api/authService.ts`,
  `src/features/auth/model/AuthContext.tsx` (new paths);
  `src/services/auth.ts` and `src/context/AuthContext.tsx` deleted;
  `components/{Header,ProtectedRoute,PublicRoute,EmailVerificationBanner}.tsx`
  and 9 pages rewritten imports. Tests —
  `src/features/auth/model/{AuthContext,AuthContext.registerLogout}.test.tsx`
  (moved), `src/context/ProtectedRoute.test.tsx` (import paths only),
  6 page test files (`vi.mock` targets only).
- **Start context:** this ticket; [breakdown README](./README.md) *Import-direction
  contract* + RD7; `apps/web/src/context/AuthContext.tsx` (full),
  `src/services/auth.ts`, one representative consumer
  (`src/pages/Login.tsx` + its test).
- **Verification:** `pnpm --filter @studypilot/web test` → 19 files / 193 tests;
  `typecheck` → exit 0; `lint` → exit 0; `grep -rn "context/AuthContext\|services/auth" apps/web/src`
  → no matches.
- **Dependencies / exclusions:** C (transport), D (extraction). Excludes the
  slice/store move (F), widgets (G), pages/app (H), verification/docs (I).

## Definition of Done

DoD 1 and 8 apply; DoD 4 (actionable errors) and DoD 5 (loading/error states) are
preserved verbatim by the moved context suites — the SP-108E boot-loading gate
and SP-108F error/loading cases run unchanged. DoD 2 N/A (no validation change),
DoD 3 N/A for change (same authenticated endpoints through the same transport),
DoD 6/7 N/A (no markup change). DoD 9 covered by this ticket and the breakdown;
DoD 10 belongs to the combined SP-109 review. Evidence goes to
`./artifacts/SP-109E/`.

## Tracker reference

`STUDY-49` (verified 2026-10-17; RD11 superseded — parent `STUDY-44`).

## Out of scope

- Slice, thunks, selectors, RTK Query API, store and the resend hook —
  [SP-109F](./SP-109F-feature-session-store.md).
- Widgets (G), pages/app shell (H), boundary proof and docs (I).
