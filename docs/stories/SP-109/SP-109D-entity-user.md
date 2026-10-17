# SP-109D: `entities/user` — user types and the extracted user API

**Story ID:** SP-109D
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Queued (SP-109B and SP-109C must land first)
**Dependencies:** SP-109B (types), SP-109C (`shared/api/httpClient`)
**Jira key:** Pending creation

## Summary and bounded scope

Give the domain concept *user* a home: `entities/user/model/types.ts` (landed
in B) plus the two profile endpoints extracted out of `authService` into
`entities/user/api/userService.ts`. This is the parent's only structural
extraction — it exists so `/users/me` calls do not live inside an auth feature
folder, which is where EP05/EP06 profile work would otherwise look for them.

The extraction must be a **lift-and-shift**: the same `api.get`/`api.patch`
calls, the same response typing, the same call sites and the same test mocks,
only with `authService.getProfile/updateProfile` renamed to
`userService.getProfile/updateProfile`.

Excluded: moving `authService` itself or the auth context (E), the slice
(F), everything else (G–I).

## Source requirement references

RQ-109-01, RQ-109-04, RQ-109-06; RD4 (transport stays `shared`),
RD12/EP05 convention note in the [breakdown README](./README.md); shared
[DoD](../../epics/README.md#definition-of-done) items 1, 3, 8, 9.

## Acceptance criteria

1. New `src/entities/user/api/userService.ts` exporting
   `export const userService = { async getProfile(): Promise<User>, async updateProfile(data: Partial<User>): Promise<User> }`,
   with the bodies copied from `authService.getProfile`
   (`api.get<User>('/users/me')`) and `authService.updateProfile`
   (`api.patch<User>('/users/me', data)`, SP-106B/D106-2), importing
   `httpClient` from `@/shared/api/httpClient` and `User` from
   `@/entities/user/model/types`.
2. `authService` loses exactly those two methods; its remaining methods
   (`verifyEmail`, `resendVerification`, `requestPasswordReset`,
   `resetPassword`, `login`, `register`, `logout`, `refreshToken`) keep their
   bodies, order and comments. No method body is otherwise edited.
3. Every call site is updated to `userService`: `src/context/AuthContext.tsx`
   (`getProfile` in restore/profile reconciliation), and
   `src/store/authSlice.thunks.ts` (`updateProfile` thunk). Grep proves zero
   remaining `authService.getProfile` / `authService.updateProfile`
   references.
4. Test mocks follow the split without weakening assertions:
   `src/context/AuthContext.test.tsx`, `src/context/ProtectedRoute.test.tsx`
   and `src/pages/Profile.test.tsx` mock `userService` for the profile calls
   (adding the module to their existing `vi.mock` factories), and any test that
   asserted on `authService.updateProfile`'s resolved value still asserts the
   same value. **No test case is deleted, renamed or weakened.**
5. `pnpm --filter @studypilot/web test` → 19 files / 193 tests green;
   `typecheck` → exit 0; `lint` → exit 0.

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| Profile read/update through the extracted service | existing `src/pages/Profile.test.tsx` (14 cases) | unchanged and green — timezone/preferences save, validation and error paths now run against `userService` |
| Session reconciliation still reads the profile | existing `src/context/AuthContext.test.tsx` (restore/refresh/dedupe cases) and `src/context/ProtectedRoute.test.tsx` | unchanged and green |
| Thunk path | existing `src/store/authSlice.thunks.test.ts` | `updateProfile` cases green via `userService` |

If a mock split turns out to require editing an **assertion** (not just the
mock target), stop and record it as a deviation in
`./artifacts/SP-109D/implementation.md` rather than silently loosening the case.

## Technical notes

### Inspected code (2026-10-17, planner)

- `src/services/auth.ts:84-92` — `getProfile` (`GET /users/me`) and
  `updateProfile` (`PATCH /users/me`, partial; the comment records SP-106C and
  D106-2: PUT was removed server-side and a tokened PUT now 404s). Both move
  with that comment intact.
- `src/context/AuthContext.tsx:12` imports `authService` and calls
  `authService.getProfile()` in the boot-restore/profile-refresh paths;
  `src/store/authSlice.thunks.ts:4` imports `authService` for
  `updateProfile`.
- `src/pages/Profile.test.tsx:9` imports `authService` from
  `../services/auth` and its `vi.mock` factory supplies `updateProfile`; the
  suite has 14 cases including the save-failure path.
- `User`/`SessionUser` land in `src/entities/user/model/types.ts` in B with
  their SP-106A/B optionality comments — this child consumes them, never edits
  them.
- Ownership (DoD 3): the profile endpoints are the same authenticated
  `/users/me` calls with the same bearer token from the same interceptor; no
  request, header or scoping logic changes, so the backend contract is
  untouched.

### Proposed (not verified)

- Export as an object literal named `userService` (matching the existing
  `authService` style and its `vi.mock` factories). Named-function exports are
  acceptable if the mocks stay one-to-one.
- Do **not** introduce an RTK Query endpoint for the profile in this child —
  SP-108C kept `updateProfile` as a thunk on purpose; adding a query endpoint
  would be a behavior/architecture change outside RQ-109-06.

## Sizing

- **Outcome:** profile read/update live in `entities/user/api/userService.ts`
  with unchanged behavior, and the auth service holds only auth/recovery calls.
- **Time estimate:** 60–90 min: one new module, two method deletions, 2
  production call sites, 3 test mock updates, three verification commands.
  Uncertainty is moderate only in the mock updates across three suites; the
  production change is a 20-line move.
- **Files:** production — `src/entities/user/api/userService.ts` (new),
  `src/services/auth.ts` (still at its pre-E path; two methods removed),
  `src/context/AuthContext.tsx`, `src/store/authSlice.thunks.ts` (import +
  call site). Tests — `src/context/AuthContext.test.tsx`,
  `src/context/ProtectedRoute.test.tsx`, `src/pages/Profile.test.tsx` (mock
  targets only).
- **Start context:** this ticket; [breakdown README](./README.md) *Target
  structure*; `src/services/auth.ts:84-92`; `src/context/AuthContext.tsx:11-22`;
  `src/pages/Profile.test.tsx` (mock factory + cases).
- **Verification:** `pnpm --filter @studypilot/web test` → 19 files / 193 tests;
  `typecheck` → exit 0; `lint` → exit 0; `grep -rn "authService.getProfile\|authService.updateProfile" apps/web/src`
  → no matches.
- **Dependencies / exclusions:** B (types), C (httpClient). Excludes the
  `features/auth` move (E), slice/store (F), widgets (G), pages/app (H),
  verification/docs (I).

## Definition of Done

DoD 1 and 8 apply (criteria pass; the profile and session suites run unchanged
against the extracted service). DoD 3 is preserved by construction — identical
requests to the owner-scoped `/users/me` endpoint through the same interceptor;
recorded as N/A-for-change in the README DoD map with this evidence. DoD 2/5/6/7
N/A (no validation, UI, keyboard or responsive change). DoD 9 covered by this
ticket and the breakdown. DoD 10 belongs to the combined SP-109 review. Evidence
goes to `./artifacts/SP-109D/`.

## Tracker reference

`Pending creation` (RD11).

## Out of scope

- `features/auth` service + context move — [SP-109E](./SP-109E-feature-auth.md).
- Slice/thunk/RTK API/store moves — [SP-109F](./SP-109F-feature-session-store.md).
