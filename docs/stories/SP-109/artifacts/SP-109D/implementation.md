# SP-109D — Implementation record

`entities/user` types home + extracted `getProfile`/`updateProfile` user service.

## Status

Implemented 2026-10-17, sequentially by the single `implementer`, with independent
parent review deferred to the combined SP-109 review. D is the first parent
child unblocked by B (types) and C (transport alias).

See [SP-109D spec](../../SP-109D-entity-user.md) for AC, DoD mapping and trace.

## What changed

Pure structural extraction (RD10-style lift-and-shift): the two `/users/me`
profile methods move verbatim out of `services/auth.ts` into
`entities/user/api/userService.ts`, and the auth service keeps only auth/recovery
endpoints. Zero behavior change — same `api.get`/`api.patch` calls, same typing,
same bearer-token interceptor path (DoD 3 preserved by construction).

### New file

- `apps/web/src/entities/user/api/userService.ts` — exports
  `userService = { getProfile(), updateProfile(data) }` with the exact bodies and
  SP-106C/D106-2 comment block lifted from `authService`. Imports
  `httpClient` from `@/shared/api/httpClient` and `User` from
  `@/entities/user/model/types` (per AC 1).

### Production call sites updated

- `apps/web/src/context/AuthContext.tsx` — added
  `import { userService } from '@/entities/user/api/userService'`;
  `authService.getProfile()` → `userService.getProfile()` (boot-restore / profile
  reconciliation). `authService` import retained (login/register/logout/refresh).
- `apps/web/src/store/authSlice.thunks.ts` — added
  `import { userService }`; `authService.updateProfile(data)` →
  `userService.updateProfile(data)` (updateProfile thunk). `authService` import
  retained (login/register/logout thunks).

### authService trimmed

- `apps/web/src/services/auth.ts` — `getProfile` and `updateProfile` removed
  with their `// Get current user profile` / `// Update user profile ...` comment
  block; the `refreshToken` method and all other methods are untouched in body,
  order and comments (AC 2). The now-unused `User` type import was dropped
  (kept `RegisteredUser`); `RegisteredUser` is still consumed by `register`.

### Test mock split (no cases weakened — AC 4)

Each of the three suites that mocked `authService.getProfile`/`updateProfile`
gains a `vi.mock('@/entities/user/api/userService', …)` factory, the two
profile methods are dropped from the `authService` factory, and the `vi.mocked`
handles repoint to `userService`. No assertion text or expected values changed.

- `apps/web/src/pages/Profile.test.tsx` — `mockedGetProfile`/`mockedUpdateProfile`
  now backed by `userService`; 14 cases green unchanged.
- `apps/web/src/context/AuthContext.test.tsx` — all 13
  `authService.getProfile` references became `userService.getProfile`; restore /
  refresh / dedupe / generation cases green unchanged.
- `apps/web/src/context/ProtectedRoute.test.tsx` — `getProfile: vi.fn()` moved
  into the `userService` factory (defensive for the boot-refresh render path; no
  assertion referenced it). `mockedRefresh` (`authService.refreshToken`) unchanged.
- `apps/web/src/store/authSlice.thunks.test.ts` — `mockedUpdateProfile` repointed
  to `userService`; `mockedLogin` (`authService.login`) unchanged; updateProfile
  success/rejection/400 cases green unchanged.

## Verification

Run from repo root (2026-10-17):

| Gate | Command | Result |
|---|---|---|
| Tests | `pnpm --filter @studypilot/web test` | 19 files / **193 tests** green (matches baseline) |
| Typecheck | `pnpm --filter @studypilot/web typecheck` | exit 0 |
| Lint | `pnpm --filter @studypilot/web lint` | exit 0, 0 warnings |
| No stray references | `grep -rn "authService\.\(getProfile\|updateProfile\)" apps/web/src` | no matches |

## Notes / deviations

- ProtectedRoute.test imports `userService` only via `vi.mock` (the render path
  is boot-refresh driven and does not assert on the profile read), so the
  `userService` symbol is not bound in that file — `vi.mock` registration alone
  is sufficient and keeps `no-unused-vars` clean.
- One pre-existing React `act(...)` warning in `Profile.test.tsx` is unchanged by
  this move (ProfilePage state update during render); it is out of scope for D.

## Commit

Single scoped commit on the SP-109 branch; D does not close the parent (E–I remain
queued).
