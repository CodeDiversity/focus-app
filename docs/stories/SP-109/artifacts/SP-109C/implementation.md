# SP-109C Implementation Record

**Story:** SP-109C — `shared/ui` and `shared/api` — design system, transport, recovery
**Date:** 2026-10-17
**Owner:** implementer

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | `Button.tsx` + `Button.test.tsx` → `shared/ui/`; `Input.tsx` → `shared/ui/` — export names unchanged, no markup/class/a11y edits | ✅ |
| 2 | `api.ts` → `shared/api/httpClient.ts`; `api.test.ts` → `shared/api/httpClient.test.ts`; `tokenStore.ts` → `shared/api/tokenStore.ts`; `recovery.ts` + `recovery.test.ts` → `shared/api/` — all exports preserved | ✅ |
| 3 | In-file edits are import/comment lines only: `httpClient.test.ts` (`./auth` → `@/services/auth`, `./api` → `./httpClient`), `recovery.ts` header comment, `store/api.ts` doc comment | ✅ |
| 4 | All 24 importers repointed to `@/shared/ui/*` / `@/shared/api/*` — grep returns zero old references | ✅ |
| 5 | ESLint shared zone exception `except: ['auth/model/types.ts']` — lint exit 0 | ✅ |
| 6 | `src/features/shared/` skeleton deleted | ✅ |
| 7 | `pnpm test` → 19 files / 193 tests green; `typecheck` → exit 0; `lint` → exit 0 | ✅ |

## Verification commands

```bash
# Tests: 19 files / 193 tests, all green
pnpm --filter @studypilot/web test

# Typecheck: exit 0
pnpm --filter @studypilot/web run typecheck

# Lint: exit 0
pnpm --filter @studypilot/web run lint

# Zero old references
grep -rn "services/api\|services/recovery\|services/tokenStore\|components/Button\|components/Input" apps/web/src --include="*.ts" --include="*.tsx"

# services/ contains only auth.ts
ls apps/web/src/services/

# features/shared/ deleted
ls apps/web/src/features/shared/ 2>&1
```

## Files changed

### Moved (8 files via `git mv`)
- `src/components/Button.tsx` → `src/shared/ui/Button.tsx`
- `src/components/Button.test.tsx` → `src/shared/ui/Button.test.tsx`
- `src/components/Input.tsx` → `src/shared/ui/Input.tsx`
- `src/services/api.ts` → `src/shared/api/httpClient.ts`
- `src/services/api.test.ts` → `src/shared/api/httpClient.test.ts`
- `src/services/tokenStore.ts` → `src/shared/api/tokenStore.ts`
- `src/services/recovery.ts` → `src/shared/api/recovery.ts`
- `src/services/recovery.test.ts` → `src/shared/api/recovery.test.ts`

### In-file edits (3 files)
- `src/shared/api/httpClient.test.ts` — `./auth` → `@/services/auth`; `./api` → `./httpClient`
- `src/shared/api/recovery.ts` — header comment `../types` → `@/features/auth/model/types`
- `src/store/api.ts` — `../services/api` → `@/shared/api/httpClient`; doc comment line 24

### Importer repoints (21 files, ~35 import lines)
- `src/services/auth.ts` (3 lines)
- `src/store/api.ts` (1 line)
- `src/store/authSlice.thunks.ts` (1 line)
- `src/context/AuthContext.tsx` (3 lines)
- `src/context/AuthContext.test.tsx` (3 lines)
- `src/context/AuthContext.registerLogout.test.tsx` (1 line)
- `src/components/Header.tsx` (1 line)
- `src/components/EmailVerificationBanner.tsx` (1 line)
- `src/components/EmailVerificationBanner.test.tsx` (2 lines)
- `src/hooks/useResendVerification.test.tsx` (2 lines)
- `src/pages/Home.tsx` (1 line)
- `src/pages/Dashboard.tsx` (1 line)
- `src/pages/Login.tsx` (2 lines)
- `src/pages/Login.test.tsx` (1 line)
- `src/pages/Register.tsx` (2 lines)
- `src/pages/Register.test.tsx` (1 line)
- `src/pages/Profile.tsx` (2 lines)
- `src/pages/VerifyEmail.tsx` (2 lines)
- `src/pages/VerifyEmail.test.tsx` (2 lines)
- `src/pages/ForgotPassword.tsx` (3 lines)
- `src/pages/ForgotPassword.test.tsx` (2 lines)
- `src/pages/ResetPassword.tsx` (3 lines)
- `src/pages/ResetPassword.test.tsx` (2 lines)
- `src/store/api.test.ts` (2 lines)
- `src/shared/api/recovery.test.ts` (1 line)

### Config (1 file)
- `apps/web/.eslintrc.cjs` — shared zone: `except: ['auth/model/types.ts']`, updated message

### Deleted (1 directory)
- `src/features/shared/` (`.gitkeep` + 4 subdirectories)

## ESLint zone exception (RD13)

The working format for the `except` field is `['auth/model/types.ts']` — a path relative to the `from` directory. This matches the original spec RD13 wording and allows the type-only `AuthResponse` import from `@/features/auth/model/types` in `src/shared/api/*` files to lint clean.
