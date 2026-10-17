# SP-109F Checkpoint

**Story:** SP-109F — `features/session`, `features/email-verification`, `app/store`
**Date:** 2026-10-17
**Status:** Complete

## Files moved (production)

| Source | Destination |
|---|---|
| `src/store/authSlice.ts` | `src/features/session/model/authSlice.ts` |
| `src/store/authSlice.selectors.ts` | `src/features/session/model/authSlice.selectors.ts` |
| `src/store/authSlice.thunks.ts` | `src/features/session/model/authSlice.thunks.ts` |
| `src/store/api.ts` | `src/features/session/api/sessionApi.ts` |
| `src/store/store.ts` | `src/app/store/store.ts` |
| `src/store/hooks.ts` | `src/app/store/hooks.ts` |
| `src/hooks/useResendVerification.ts` | `src/features/email-verification/model/useResendVerification.ts` |

## Files moved (tests)

| Source | Destination |
|---|---|
| `src/store/authSlice.test.ts` | `src/features/session/model/authSlice.test.ts` |
| `src/store/authSlice.thunks.test.ts` | `src/features/session/model/authSlice.thunks.test.ts` |
| `src/store/api.test.ts` | `src/features/session/api/sessionApi.test.ts` |
| `src/store/store.test.tsx` | `src/app/store/store.test.tsx` |
| `src/hooks/useResendVerification.test.tsx` | `src/features/email-verification/model/useResendVerification.test.tsx` |

## Consumer imports rewritten

| File | Old import | New import |
|---|---|---|
| `src/main.tsx` | `./store/store` | `@/app/store/store` |
| `src/test/providers.tsx` | `../store/authSlice`, `../store/api` | `@/features/session/model/authSlice`, `@/features/session/api/sessionApi` |
| `src/features/auth/model/AuthContext.tsx` | `../../../store/*` (5 imports) | `@/features/session/model/*` + `@/app/store/hooks` |
| `src/pages/VerifyEmail.tsx` | `../hooks/useResendVerification` | `@/features/email-verification/model/useResendVerification` |
| `src/components/EmailVerificationBanner.tsx` | `../hooks/useResendVerification` | `@/features/email-verification/model/useResendVerification` |

## Test imports also updated (consumer test files)

| File | Old import | New import |
|---|---|---|
| `src/features/auth/model/AuthContext.test.tsx` | `../../../store/authSlice` | `@/features/session/model/authSlice` |
| `src/features/auth/model/AuthContext.registerLogout.test.tsx` | `../../../test/providers` | `@/test/providers` |
| `src/pages/Profile.test.tsx` | `../store/authSlice`, `../store/store` | `@/features/session/model/authSlice`, `@/app/store/store` |

## ESLint config updated

- Added `app/store` as a sanctioned exception zone for features → app imports (RD7)
- Added `eslint-disable-next-line import/no-restricted-paths` comments to 4 sanctioned import lines:
  - `AuthContext.tsx:31` — `useAppDispatch` from `@/app/store/hooks`
  - `authSlice.selectors.ts:1` — `RootState` from `@/app/store/store`
  - `authSlice.thunks.ts:8` — `AppStore` from `@/app/store/store`
  - `Profile.test.tsx:15` — `AppStore` from `@/app/store/store`

## Verification

- `pnpm --filter @studypilot/web test` → 19 files / 193 tests green
- `pnpm --filter @studypilot/web typecheck` → exit 0
- `pnpm --filter @studypilot/web lint` → exit 0
- Old directories `src/store/` and `src/hooks/` removed
- No stale imports to old paths remain

## Acceptance criteria

1. ✅ `authSlice` + thunks + selectors → `features/session/model/` (same filenames, unchanged state shape, `isLoading: true` boot default, reducer name `auth`, exported action creators, thunk names)
2. ✅ `api.ts` → `features/session/api/sessionApi.ts` (keeping `api`, `axiosBaseQuery`, `resendErrorMessage`, `RESEND_*` constants, `reducerPath: 'api'`, `keepUnusedDataFor: 300`)
3. ✅ `useResendVerification.ts` → `features/email-verification/model/` (`resendFeedback` string unchanged, `src/hooks/` gone)
4. ✅ `store.ts` + `hooks.ts` → `app/store/` (exporting `store`, `AppStore`, `RootState`, `AppDispatch`, `useAppDispatch`, `useAppSelector`; `src/store/` gone)
5. ✅ Import rewrites complete across all consumer files
6. ✅ `pnpm --filter @studypilot/web test` → 193 tests green; `typecheck` → exit 0; `lint` → exit 0
