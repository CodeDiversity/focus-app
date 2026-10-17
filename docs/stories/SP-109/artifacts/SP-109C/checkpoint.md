# SP-109C Checkpoint

**Story:** SP-109C — `shared/ui` and `shared/api` — design system, transport, recovery
**Date:** 2026-10-17
**Owner:** implementer

## Summary

Moved 8 files from `src/components/` and `src/services/` into `src/shared/ui/` and `src/shared/api/`. Repointed ~35 import lines across 24 files. Added ESLint zone exception (RD13). Deleted misplaced `src/features/shared/` skeleton.

## File moves (8)

| From | To | In-file edits |
|---|---|---|
| `src/components/Button.tsx` | `src/shared/ui/Button.tsx` | none |
| `src/components/Button.test.tsx` | `src/shared/ui/Button.test.tsx` | none (`./Button` same dir) |
| `src/components/Input.tsx` | `src/shared/ui/Input.tsx` | none |
| `src/services/api.ts` | `src/shared/api/httpClient.ts` | none |
| `src/services/api.test.ts` | `src/shared/api/httpClient.test.ts` | `./auth` → `@/services/auth`; `./api` → `./httpClient` |
| `src/services/tokenStore.ts` | `src/shared/api/tokenStore.ts` | none |
| `src/services/recovery.ts` | `src/shared/api/recovery.ts` | header comment `../types` → `@/features/auth/model/types` |
| `src/services/recovery.test.ts` | `src/shared/api/recovery.test.ts` | `./api` → `./httpClient` |

## Importer repoints (24 files)

### Production (14)

| File | Lines repointed |
|---|---|
| `src/services/auth.ts` | `./api` → `@/shared/api/httpClient`, `./tokenStore` → `@/shared/api/tokenStore`, `./recovery` → `@/shared/api/recovery` |
| `src/store/api.ts` | `../services/api` → `@/shared/api/httpClient` + doc comment (line 24) |
| `src/store/authSlice.thunks.ts` | `../services/tokenStore` → `@/shared/api/tokenStore` |
| `src/context/AuthContext.tsx` | tokenStore, api, recovery → `@/shared/api/*` (3 lines) |
| `src/components/Header.tsx` | `./Button` → `@/shared/ui/Button` |
| `src/components/EmailVerificationBanner.tsx` | `./Button` → `@/shared/ui/Button` |
| `src/pages/Home.tsx`, `src/pages/Dashboard.tsx` | Button |
| `src/pages/Login.tsx`, `src/pages/Register.tsx`, `src/pages/Profile.tsx` | Button, Input |
| `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx` | Button, Input, `../services/recovery` → `@/shared/api/recovery` |
| `src/pages/VerifyEmail.tsx` | Button, Input |

### Tests (10)

| File | Lines repointed |
|---|---|
| `src/store/api.test.ts` | api, tokenStore (auth stays) |
| `src/context/AuthContext.test.tsx` | api, tokenStore, recovery (auth stays) |
| `src/context/AuthContext.registerLogout.test.tsx` | tokenStore (auth stays) |
| `src/components/EmailVerificationBanner.test.tsx` | api, tokenStore |
| `src/hooks/useResendVerification.test.tsx` | api, tokenStore |
| `src/pages/Login.test.tsx`, `src/pages/Register.test.tsx` | tokenStore (auth stays) |
| `src/pages/VerifyEmail.test.tsx`, `src/pages/ForgotPassword.test.tsx` | api, tokenStore |
| `src/pages/ResetPassword.test.tsx` | api, tokenStore |
| `src/shared/api/httpClient.test.ts` | `./api` → `./httpClient` (local import) |
| `src/shared/api/recovery.test.ts` | `./api` → `./httpClient` (local import) |

## Config change (1)

- `apps/web/.eslintrc.cjs` — shared zone: `except: ['auth/model/types.ts']` (type-only exception per RD13), updated zone message.

## Deleted

- `src/features/shared/` (`.gitkeep`-only skeleton from SP-109A, cleaned up by C per spec).

## Verification

| Gate | Status | Evidence |
|---|---|---|
| Tests | ✅ 19 files / 193 tests green | `pnpm --filter @studypilot/web test` |
| Typecheck | ✅ exit 0 | `pnpm --filter @studypilot/web run typecheck` |
| Lint | ✅ exit 0 | `pnpm --filter @studypilot/web run lint` |
| Zero old references | ✅ grep returns 0 matches | `grep -rn "services/api\|services/recovery\|services/tokenStore\|components/Button\|components/Input" apps/web/src` |
| services/ contains only auth.ts | ✅ | `ls apps/web/src/services/` → `auth.ts` |
| components/ has no Button/Input | ✅ | `ls apps/web/src/components/` — no Button.tsx, Input.tsx, Button.test.tsx |
| features/shared/ deleted | ✅ | `ls apps/web/src/features/shared/` → No such file or directory |

## Notes

- The ESLint zone exception format that works: `except: ['auth/model/types.ts']` (relative to the `from` directory), matching the original spec RD13 wording.
- Two additional test file fixes were needed beyond the story spec: `httpClient.test.ts` and `recovery.test.ts` both had local `./api` imports that needed repointing to `./httpClient` after the move.
