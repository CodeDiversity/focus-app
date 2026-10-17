# SP-108C Implementation Record

**Story:** SP-108C (RTK Query replaces TanStack Query)
**Date:** 2026-10-16
**Status:** Implementation complete — awaiting parent review
**Delivery home:** `docs/stories/SP-108/` · **Artifacts:** `./artifacts/SP-108C/`

## Summary

Every TanStack Query usage in `apps/web/src` is replaced by an RTK Query service
built on a custom axios `baseQuery` that delegates to the shared
`src/services/api.ts` instance (RD4). The SP-105G transport — bearer token,
single-flight refresh, recovery barrier, session generations, `AUTH_PATHS` and
error sanitization — is byte-for-byte unchanged and remains the only transport.

Baseline at the start of this story: 13 files / 153 tests with **7 files / 82 tests
red** (six `AuthProvider`-rendering files without a Redux `Provider`, plus two
stale `store.test.tsx` assertions). Final state: **15 files / 166 tests, all
green**, typecheck, lint and production build clean, and zero
`@tanstack` / `QueryClient` / `useMutation` references in `apps/web/src`.

## Files produced

### Production

| File | Description |
|---|---|
| `apps/web/src/store/api.ts` **(new)** | `axiosBaseQuery` (endpoint-agnostic; delegates to the shared axios instance), `resendErrorMessage(code)` + the two message constants, `createApi({ reducerPath: 'api', keepUnusedDataFor: 300 })` with the `resendVerification` mutation, exported `useResendVerificationMutation` |
| `apps/web/src/store/store.ts` | Registers `[api.reducerPath]: api.reducer` and appends `api.middleware`; `serializableCheck.ignoredActions: [api.reducerPath]` per RTK's guidance |
| `apps/web/src/hooks/useResendVerification.ts` | Mutation plumbing swapped; public contract (`sendEmail`, `isPending`, `isSuccess`, `error`, `secondsRemaining`) unchanged |
| `apps/web/src/main.tsx` | `QueryClient`, `QueryClientProvider` and `ReactQueryDevtools` removed |
| `apps/web/src/test/providers.tsx` **(new)** | `makeTestStore()` (auth + api reducers, `api.middleware`) and `Providers` (Redux `Provider`, optional `MemoryRouter`) |
| `apps/web/src/context/AuthContext.tsx` | **Defect repair** (see below): `loginFn`/`updateProfileFn` now re-throw the thunk's sanitized rejection |

`VerifyEmail.tsx`, `EmailVerificationBanner.tsx`, `resendFeedback` and all of
`src/services/**` are unmodified.

### Tests

| File | Change |
|---|---|
| `apps/web/src/store/api.test.ts` **(new, 8 cases)** | BaseQuery request delegation, sanitized interceptor rejection → `{ message, code: '400' }`, network failure with no code, the 401-on-auth-path negative (no `/auth/refresh`, session-expired handler uncalled), `resendErrorMessage` mapping, mutation-trigger error shape |
| `apps/web/src/hooks/useResendVerification.test.tsx` **(new, 5 cases)** | Trimmed/lowercased single post + `isSuccess`, 60s cooldown blocking a second send, in-flight duplicate suppression, 400 → invalid-email message, network failure → connection message |
| `apps/web/src/store/api.test.ts` parity cases | `the endpoint error message matches authService.resendVerification for 400` / `... for a network failure` — same mocked failure through the untouched service and through the endpoint mapping |
| `src/pages/{VerifyEmail,ForgotPassword,ResetPassword}.test.tsx`, `src/components/EmailVerificationBanner.test.tsx` | Wrapper swap only (`QueryClientProvider` → `Providers`); router entries, `Layout` and `StrictMode` composition preserved |
| `src/pages/{Login,Register}.test.tsx` | Redux `Provider` added (SP-108B fallout, D7) |
| `src/store/store.test.tsx` | The two stale assertions corrected for the new `auth` + `api` reducer keys |

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | RTK Query service on the shared axios instance; status as string `code`; `resendErrorMessage` mapping | ✅ `src/store/api.ts`; failures converted after the interceptors ran; status carried as `code: String(status)` |
| 2 | Hook contract parity — `{ sendEmail, isPending, isSuccess, error, secondsRemaining }`, guard/normalization/cooldown unchanged, `isLoading` → `isPending`, `error` = `resendErrorMessage(...)` | ✅ `VerifyEmail.tsx`, `EmailVerificationBanner.tsx` and `resendFeedback` untouched; 5 new hook cases |
| 3 | Provider replacement and green suite; shared `src/test/providers.tsx`; zero TanStack references in `src` | ✅ 166/166 green; `grep -rn "@tanstack\|QueryClient\|useMutation" apps/web/src` → zero hits |
| 4 | No transport regression: `services/api.ts`, `recovery.ts`, `auth.ts` unmodified; 14 + 23 + 14 tests pass; 401-on-auth-path negative test | ✅ `git diff --stat -- apps/web/src/services` is empty; all three suites green; negative case in `store/api.test.ts` |

## Deviations from the ticket skeleton (adaptations, recorded)

1. **`body` → axios `data`.** The skeleton passed the endpoint's `body` straight
   into `axios.request`, which ignores an unknown `body` key and would send an
   empty payload. The baseQuery maps `body` → `data`; the named delegation test
   asserts the axios config (`url`, `method`, `data`).
2. **Import naming.** The shared axios instance is imported as `httpClient`
   because `src/store/api.ts` also exports the RTK service as `api` (the ticket
   skeleton imported both as `api`).
3. **`.tsx` test file.** `src/hooks/useResendVerification.test.tsx` (not `.ts`)
   because its wrapper renders the JSX `Providers` helper.
4. **Cooldown start moved.** With RTK Query there is no `onSuccess` callback, so
   the 60s deadline is set after the awaited `trigger(...).unwrap()` resolves —
   same observable behavior (a failed send does not start the cooldown, asserted).

## Defect found and repaired (SP-108B fallout)

`AuthContext.loginFn` and `updateProfileFn` dispatched their thunks **without
awaiting them**, so `await login(...)` resolved even when `authService.login`
rejected. `LoginPage.onSubmit` therefore ran its success branch: it toasted
"Logged in successfully!" and navigated to `/dashboard` on a 401 invalid
credentials, and the sanitized error toast never rendered.

Evidence: `src/pages/Login.test.tsx > shows an actionable error on 401 invalid
credentials` — the DOM contained the dashboard route with `toast.error` never
called. This is B's adapter surface, not C's scope, but AC3 makes a green web
suite C's verification, so the repair is recorded here for the parent review:
both callbacks now `await dispatch(thunk(...))` and re-throw the thunk's
sanitized `payload` message (`rejectWithValue(getErrorMessage(err))`), restoring
the pre-B contract. `src/context/AuthContext.test.tsx` (14 cases) is unaffected.

## Test evidence

| Suite | Result |
|---|---|
| `pnpm --filter @studypilot/web test` | **15 files / 166 tests passed, 0 failed** (baseline 7 files / 82 tests failed) |
| `src/store/api.test.ts` (new) | 8/8 |
| `src/hooks/useResendVerification.test.tsx` (new) | 5/5 (red against the pre-migration hook: `No QueryClient set`) |
| `src/services/api.test.ts` | 14/14 unchanged |
| `src/services/recovery.test.ts` | 23/23 unchanged |
| `src/context/AuthContext.test.tsx` | 14/14 unchanged |
| `pnpm --filter @studypilot/web typecheck` | clean |
| `pnpm --filter @studypilot/web lint` | clean |
| `pnpm --filter @studypilot/web build` | ✓ built (1554 modules) |
| `grep -rn "@tanstack\|QueryClient\|useMutation" apps/web/src` | zero hits |

Commits: `5308efa` (CP1), `7439f8f` (CP2), `5cce85e` (CP3), `57a8850` (CP4).

## Security notes

- No new backend contract, endpoint or user input; DoD 3 (academic-data
  ownership scoping) remains N/A by recorded reason.
- The link-token cache assertion in `VerifyEmail.test.tsx` was ported, not
  dropped: the raw token must not appear in the RTK Query mutation state either.
- Tokens remain in-memory only (no new persistence introduced).

## Out of scope (still owned elsewhere)

- Removing `@tanstack/react-query` / `@tanstack/react-query-devtools` from
  `package.json` and the lockfile, and the root README architecture flip —
  `[SP-108D](../../SP-108D-tanstack-removal-verification.md)`.
- Deleting the now-unused `authService.resendVerification` (kept as the parity
  reference), the store-backed `AuthProvider` adapter's removal (RD3), any GET
  endpoint, and all backend work.
- The combined SP-108 review — one final parent review after SP-108D.