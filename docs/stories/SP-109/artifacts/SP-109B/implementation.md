# SP-109B Implementation Record

**Story:** SP-109B — Shared layer foundations: `shared/lib` and per-layer type homes
**Status:** Complete
**Date:** 2026-10-17

## Acceptance criteria

### AC 1: Helper modules moved to `src/shared/lib/` ✅
- `src/utils/errors.ts` → `src/shared/lib/errors.ts` (import updated: `@/shared/api/types`)
- `src/utils/linkToken.ts` → `src/shared/lib/linkToken.ts` (no import changes)
- `src/utils/datetime.ts` → `src/shared/lib/datetime.ts` (no import changes)
- `src/utils/datetime.test.ts` → `src/shared/lib/datetime.test.ts` (relative import `'./datetime'` unchanged — same directory)
- `src/utils/` directory no longer exists (deleted)

### AC 2: `src/types/index.ts` deleted, types distributed ✅
- `src/shared/api/types.ts` — `ApiError`, `ApiResponse<T>`
- `src/entities/user/model/types.ts` — `SessionUser`, `User`, `RegisteredUser`
- `src/features/auth/model/types.ts` — `AuthResponse`, `LoginCredentials`, `RegisterCredentials`, `VerificationResponse`, `ResetPasswordRequest`
- `src/shared/types/academic.ts` — `Semester`, `Course`, `Assignment`, `AssignmentStatus`, `AssignmentPriority`, `Task`, `TaskStatus`, `TaskPriority`, `StudySession`
- `src/types/index.ts` deleted (no longer exists)

### AC 3: `ResetPasswordResult` stays with `src/services/recovery.ts` ✅
- Not duplicated — confirmed recovery.ts still declares it

### AC 4: All ~24 import lines rewritten to aliased imports ✅
- `@/shared/lib/errors` — from `../utils/errors` (6 files)
- `@/shared/lib/linkToken` — from `../utils/linkToken` (2 files)
- `@/shared/lib/datetime` — from `../utils/datetime` (2 files)
- `@/shared/api/types` — from `../types` (2 files: api.ts, store/api.ts)
- `@/entities/user/model/types` — from `../types` (6 files: authSlice.ts, authSlice.thunks.ts, AuthContext.tsx, Profile.test.tsx, ProtectedRoute.test.tsx, AuthContext.registerLogout.test.tsx)
- `@/features/auth/model/types` — from `../types` (8 files: api.ts, auth.ts, recovery.ts, store/api.ts, api.test.ts, AuthContext.test.tsx, AuthContext.registerLogout.test.tsx, Profile.test.tsx)

### AC 5: All verification commands pass ✅
- `pnpm --filter @studypilot/web test` → 19 files / 193 tests green
- `typecheck` → exit 0
- `lint` → exit 0
- `grep -rn "utils/\|types/index" apps/web/src` → no matches

## Files created

| File | Source | Change |
|---|---|---|
| `src/shared/lib/errors.ts` | `src/utils/errors.ts` | Import `@/shared/api/types` (was `../types`) |
| `src/shared/lib/linkToken.ts` | `src/utils/linkToken.ts` | No import changes |
| `src/shared/lib/datetime.ts` | `src/utils/datetime.ts` | No import changes |
| `src/shared/lib/datetime.test.ts` | `src/utils/datetime.test.ts` | Relative `'./datetime'` unchanged (same dir) |
| `src/shared/api/types.ts` | `src/types/index.ts` | `ApiError`, `ApiResponse<T>` (25 lines) |
| `src/shared/types/academic.ts` | `src/types/index.ts` | 9 academic types (73 lines) |
| `src/entities/user/model/types.ts` | `src/types/index.ts` | `SessionUser`, `User`, `RegisteredUser` (21 lines) |
| `src/features/auth/model/types.ts` | `src/types/index.ts` | 5 auth types (23 lines, imports `SessionUser`) |

## Files updated (import rewrites only)

| File | Old import | New import |
|---|---|---|
| `src/services/api.ts` | `../types` | `@/shared/api/types` + `@/features/auth/model/types` |
| `src/services/auth.ts` | `../types` | `@/features/auth/model/types` + `@/entities/user/model/types` |
| `src/services/recovery.ts` | `../types` | `@/features/auth/model/types` |
| `src/store/api.ts` | `../types` | `@/features/auth/model/types` |
| `src/store/authSlice.ts` | `../types` | `@/entities/user/model/types` |
| `src/store/authSlice.thunks.ts` | `../types` + `../utils/errors` | `@/entities/user/model/types` + `@/shared/lib/errors` |
| `src/context/AuthContext.tsx` | `../types` + `../utils/errors` | `@/entities/user/model/types` + `@/shared/lib/errors` |
| `src/components/EmailVerificationBanner.tsx` | `../types` | `@/entities/user/model/types` |
| `src/pages/Profile.tsx` | `../utils/*` | `@/shared/lib/*` |
| `src/pages/Login.tsx` | `../utils/errors` | `@/shared/lib/errors` |
| `src/pages/Register.tsx` | `../utils/errors` | `@/shared/lib/errors` |
| `src/pages/ForgotPassword.tsx` | `../utils/errors` | `@/shared/lib/errors` |
| `src/pages/ResetPassword.tsx` | `../utils/*` | `@/shared/lib/*` |
| `src/pages/VerifyEmail.tsx` | `../utils/linkToken` | `@/shared/lib/linkToken` |
| `src/store/authSlice.thunks.test.ts` | `../types` | `@/features/auth/model/types` + `@/entities/user/model/types` |
| `src/services/api.test.ts` | `../types` | `@/features/auth/model/types` |
| `src/context/AuthContext.test.tsx` | `../types` | `@/features/auth/model/types` |
| `src/context/ProtectedRoute.test.tsx` | `../types` | `@/features/auth/model/types` |
| `src/context/AuthContext.registerLogout.test.tsx` | `../types` | `@/features/auth/model/types` + `@/entities/user/model/types` |
| `src/pages/Profile.test.tsx` | `../utils/datetime` + `../types` | `@/shared/lib/datetime` + `@/entities/user/model/types` |

## Files deleted

| File | Reason |
|---|---|
| `src/utils/errors.ts` | Moved to `src/shared/lib/errors.ts` |
| `src/utils/linkToken.ts` | Moved to `src/shared/lib/linkToken.ts` |
| `src/utils/datetime.ts` | Moved to `src/shared/lib/datetime.ts` |
| `src/utils/datetime.test.ts` | Moved to `src/shared/lib/datetime.test.ts` |
| `src/types/index.ts` | Types distributed to per-layer homes |

## Deviation from plan

- **Path convention:** SP-109A created `src/features/shared/` (with `ui/`, `api/`, `lib/`, `types/` subdirectories). SP-109B's story specification calls for `src/shared/` (without `features` prefix). The story specification was followed, creating `src/shared/` as a top-level layer folder. The `src/features/shared/` directories from SP-109A remain as `.gitkeep` placeholders and will be addressed by SP-109C (which creates `shared/ui` and `shared/api` content).
- **`SessionUser` import in `features/auth/model/types.ts`:** `AuthResponse` references `SessionUser` from `@/entities/user/model/types`. This is a cross-layer import from feature to entity, which is permitted by FSD (features can import from entities).

## Verification

- `pnpm --filter @studypilot/web test` → 19 files / 193 tests ✅
- `pnpm --filter @studypilot/web typecheck` → exit 0 ✅
- `pnpm --filter @studypilot/web lint` → exit 0 ✅
- `grep -rn "utils/\|types/index" apps/web/src` → no matches ✅
- `src/utils/` directory deleted ✅
- `src/types/index.ts` deleted ✅
