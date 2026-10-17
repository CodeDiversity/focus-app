# SP-108C: RTK Query replaces TanStack Query

**Story ID:** SP-108C
**Epic:** Cross-cutting technical task (standalone; see [SP-108](./SP-108.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Implemented — awaiting parent review (2026-10-16; evidence in
[./artifacts/SP-108C/implementation.md](./artifacts/SP-108C/implementation.md) —
166/166 web tests green, typecheck/lint/build clean, zero TanStack references in
`apps/web/src`). Refined 2026-10-16.
**Dependencies:** SP-108A (store + typed hooks exist), SP-108B (landed: the
`authSlice` and store-backed `AuthProvider` make the Redux `Provider` mandatory in
every `AuthProvider` test). Independent of B's *scope*, sequenced after it for the
single writer.
**Jira key:** STUDY-39
**Refined:** 2026-10-16

## Summary and bounded scope

One cohesive multi-window task (~2.5–3.5h total; four bounded checkpoints in
Sizing) that replaces **every** TanStack Query usage with an RTK Query service
built on a **custom axios `baseQuery` delegating to the existing
`services/api.ts` instance** (RD4 — the SP-105G single-flight refresh, recovery
barrier, session generations and `AUTH_PATHS` handling remain the transport,
byte-for-byte unchanged). No TanStack usage survives in `apps/web/src` when this
story lands; removing the `@tanstack` **packages** and flipping the repo docs stay
with [SP-108D](./SP-108D-tanstack-removal-verification.md).

Grep-verified TanStack inventory (2026-10-16): `src/main.tsx`
(`QueryClientProvider` + `ReactQueryDevtools`), `src/hooks/useResendVerification.ts`
(`useMutation`), and four test files importing `QueryClient/QueryClientProvider`
(`ForgotPassword.test.tsx`, `VerifyEmail.test.tsx`, `ResetPassword.test.tsx`,
`EmailVerificationBanner.test.tsx`).

**Refinement baseline (measured, not asserted):** `pnpm --filter @studypilot/web test`
currently reports **7 failed files / 82 failed tests** before this story starts.
Six `AuthProvider`-rendering files lack a Redux `Provider` (added by SP-108B) —
`VerifyEmail` (18), `ForgotPassword` (16), `ResetPassword` (21),
`EmailVerificationBanner` (12), **plus `Login.test.tsx` (7) and
`Register.test.tsx` (6), which contain no TanStack code at all** — and
`src/store/store.test.tsx` has two stale SP-108A assertions that broke when B
registered the `auth` reducer. Every one of those must be green at the end; C owns
their repair (see AC3 and Decisions D7).

## Source requirements

RQ-108-03, RQ-108-05 (RD2/RD4), RQ-108-06 (regression: full web suite, typecheck
and lint green); TR-108-03, TR-108-04; shared
[DoD](../../epics/README.md#definition-of-done) items 1/2/4/8.

## Acceptance criteria

1. **RTK Query service on the shared axios instance.** `src/store/api.ts` (new)
   exports a `createApi` service whose `baseQuery` issues every request through the
   default-exported axios instance from `src/services/api.ts` — the same instance
   that owns the request/response interceptors, the SP-105G refresh single-flight,
   the recovery barrier and `AUTH_PATHS`. Failures are converted into RTK Query's
   `{ error }` result **after** the interceptors ran: the interceptor's sanitized
   `message` is carried through and the HTTP status is carried as the string
   `code` (see Technical notes — RTK drops a numeric `status`). The service defines
   one `resendVerification` mutation posting to `/auth/resend-verification`, and
   exports `resendErrorMessage(code)` mapping `'400'` → `'Please enter a valid
   email address'` and anything else → `'We could not request a verification email.
   Check your connection and try again.'` — the exact strings
   `authService.resendVerification` throws today, which two existing tests assert.
2. **Hook contract parity.** `useResendVerification` keeps its exact return
   contract — `{ sendEmail, isPending, isSuccess, error, secondsRemaining }` — with
   `sendEmail` now dispatching the generated mutation trigger. The `submitting`
   duplicate-submission guard, the `email.trim().toLowerCase()` normalization and
   the 60-second cooldown (deadline + 1s ticker) are unchanged, and the RTK Query
   `isLoading` flag is mapped onto the public `isPending` name. `error` is the
   `resendErrorMessage(...)` string, so the message a student sees is identical to
   today's. `VerifyEmail.tsx`, `EmailVerificationBanner.tsx` and the exported
   `resendFeedback` string are **not modified**.
3. **Provider replacement and green suite.** `src/main.tsx` drops
   `QueryClientProvider`, the `QueryClient` instance and `ReactQueryDevtools`;
   `src/store/store.ts` registers `[api.reducerPath]: api.reducer` and appends
   `api.middleware`. A shared helper `src/test/providers.tsx` (new) builds a fresh
   store per test (`auth` reducer + `api` reducer + `api.middleware`) and wraps
   children in `Provider` (optional `MemoryRouter`); the **six** failing test files
   use it instead of `QueryClientProvider`, and the two stale assertions in
   `src/store/store.test.tsx` are corrected for the new reducer keys. Result: the
   whole web suite, typecheck and lint are green and `apps/web/src` has zero
   `@tanstack` / `QueryClient` / `useMutation` references.
4. **No transport regression (RQ-108-05).** `src/services/api.ts`,
   `src/services/recovery.ts` and `src/services/auth.ts` are **not modified**;
   `services/api.test.ts` (14), `services/recovery.test.ts` (23) and
   `context/AuthContext.test.tsx` (14) pass unchanged, and the baseQuery's negative
   test proves a 401 on an auth path still bypasses refresh and the
   session-expired handler.

## Tests (obligations)

New test files use the repo's Vitest + Testing Library style; existing suites
change **only** in their provider wrapper.

| Area | File | Named cases |
|---|---|---|
| baseQuery | `src/store/api.test.ts` (new) | `baseQuery executes the request through the shared axios instance` (asserts `api.request` is called with the endpoint's url/method/body and that `data` is returned); `a sanitized interceptor rejection surfaces as an RTK Query error with the interceptor message and the status as code` (drives the real interceptor chain through `api.defaults.adapter`, mirroring the adapter-stubbing style in `services/api.test.ts`); `a 401 on an auth path neither refreshes nor invokes the session-expired handler` (negative, transport level: asserts no `/auth/refresh` request and that the registered `setSessionExpiredHandler` spy stays uncalled); `resendErrorMessage returns the invalid-email message for 400 and the connection message otherwise` |
| Message parity | `src/store/api.test.ts` (new) | `the endpoint error message matches authService.resendVerification for 400` and `... for a network failure` — runs the same mocked failure through `authService.resendVerification` and through the mutation trigger and asserts identical strings, so the mapping cannot drift from the untouched service |
| Mutation parity | `src/hooks/useResendVerification.test.ts` (new) | `a successful send posts the trimmed, lowercased email once and reports isSuccess`; `the sixty-second cooldown starts on success and blocks further sends`; `a second send while one is in flight is suppressed`; `a 400 failure surfaces the invalid-email message`; `a network failure surfaces the connection message` |
| Provider migration | `src/test/providers.tsx` (new, no cases of its own) + `src/pages/VerifyEmail.test.tsx`, `src/pages/ForgotPassword.test.tsx`, `src/pages/ResetPassword.test.tsx`, `src/components/EmailVerificationBanner.test.tsx`, `src/pages/Login.test.tsx`, `src/pages/Register.test.tsx` (modified) | every existing case passes unchanged; only the wrapper changes (`QueryClientProvider` → `Providers`, and a Redux `Provider` added to Login/Register) |
| Store shape | `src/store/store.test.tsx` (modified) | the two stale assertions are corrected to expect the registered reducers (`auth` + `api`); no new cases required |
| Regression (unchanged) | `src/services/api.test.ts`, `src/services/recovery.test.ts`, `src/context/AuthContext.test.tsx`, `src/store/authSlice.test.ts`, `src/utils/datetime.test.ts`, `src/components/Button.test.tsx` | pass byte-for-byte unchanged |

## Technical notes

### Inspected code (2026-10-16, `@reduxjs/toolkit@2.13.0`, RTK 2.13 ships RTK Query)

- `src/main.tsx:12-20` — the `QueryClient` config (`staleTime` 5min, `retry: 1`,
  `refetchOnWindowFocus: false`) applied to **queries only**. This story defines no
  query, so those defaults are inert here; see Decisions D5.
- `src/hooks/useResendVerification.ts` — `useMutation({ retry: false })`,
  `onSuccess` starting the 60s deadline, `submitting` ref guard, catch-swallow
  (the caller renders the error). RTK Query mutations already default to no retry,
  so `retry: false` carries over for free.
- `src/store/store.ts` — `configureStore({ reducer: { auth } })`; no middleware
  customization yet.
- `src/store/hooks.ts` — `useAppDispatch`/`useAppSelector` typed hooks (unchanged
  by this story).
- `src/services/api.ts` — the axios instance and its interceptors: the request
  interceptor attaches the bearer token and snapshots the session generation; the
  response interceptor performs refresh/retry, clears the token and calls the
  session-expired handler, and **rejects with `{ ...error, message }`**. That
  spread keeps `response.status` readable after sanitization (existing code relies
  on this in `services/auth.ts:21` and `:29`), which is how the baseQuery recovers
  the status.
- `src/services/auth.ts:28-38` — `resendVerification` is the source of the two
  user-facing messages; **read-only** for this story (AC4).
- Consumers of the hook: `src/pages/VerifyEmail.tsx` and
  `src/components/EmailVerificationBanner.tsx` — both read
  `resend.isPending`, `resend.isSuccess`, `resend.error`, `resend.secondsRemaining`
  and `resendFeedback`; none of that changes.
- Tests already assert the exact strings this story must preserve:
  `EmailVerificationBanner.test.tsx:132` (`/check your connection and try again/i`)
  and the cooldown/duplicate cases in `VerifyEmail.test.tsx:168-225`.

### RTK Query constraints verified against the installed library

- **Error serialization.** RTK's `miniSerializeError` copies only the *string*
  properties `name`, `message`, `stack`, `code`; RTK Query builds its
  mutation/query thunks with `createAsyncThunk` and no custom `serializeError`,
  so a `{ error: { status: 400 } }` from the baseQuery reaches the hook as
  `{ message }` only. Status must therefore travel as `code: String(status)`
  (`SerializedError.code` is a string) — Decisions D2.
- **`isPending` does not exist on RTK Query results.** The mutation result exposes
  `isLoading`, `isSuccess`, `error`; the public hook contract keeps the `isPending`
  name and maps to it — Decisions D3.
- **`refetchOnFocus` / `staleTime` equivalents.** RTK Query has no `staleTime`;
  cache lifetime is `keepUnusedDataFor` (default 60s). Nothing in this story reads
  a cache — Decisions D5.
- **Devtools.** RTK's `devTools` option defaults to `true`, so the Redux DevTools
  browser extension shows slice state and RTK Query state after
  `ReactQueryDevtools` is deleted; no in-app replacement component exists — D6.
- **Middleware.** RTK's documented guidance is to ignore RTK Query action paths in
  the serializability check. Register the store middleware as
  `middleware: (gdm) => gdm({ serializableCheck: { ignoredActions: [api.reducerPath] } }).concat(api.middleware)`
  to keep dev-console output clean. Not separately acceptance-tested; covered by
  typecheck/lint and the suite.

### Skeleton shape (adapt, do not paste blindly)

`src/store/api.ts` — the baseQuery stays generic and endpoint-agnostic; it never
mentions resend semantics:

```ts
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';
import api from '../services/api';
import type { VerificationResponse } from '../types';

// Only `name`/`message`/`stack`/`code` survive RTK's error serialization, so the
// HTTP status travels as a string code.
const axiosBaseQuery: BaseQueryFn<
  { url: string; method: AxiosRequestConfig['method']; body?: unknown },
  unknown,
  { message: string; code?: string }
> = async (config) => {
  try {
    const response = await api.request(config);
    return { data: response.data };
  } catch (error: unknown) {
    const failure = error as { message?: string; response?: { status?: number } };
    const status = failure.response?.status;
    return {
      error: {
        message: failure.message ?? 'An unexpected error occurred',
        code: status === undefined ? undefined : String(status),
      },
    };
  }
};

export const RESEND_INVALID_EMAIL_MESSAGE = 'Please enter a valid email address';
export const RESEND_FALLBACK_MESSAGE =
  'We could not request a verification email. Check your connection and try again.';

export function resendErrorMessage(code?: string): string {
  return code === '400' ? RESEND_INVALID_EMAIL_MESSAGE : RESEND_FALLBACK_MESSAGE;
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery,
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    resendVerification: builder.mutation<VerificationResponse, string>({
      query: (email) => ({
        url: '/auth/resend-verification',
        method: 'POST',
        body: { email },
      }),
    }),
  }),
});

export const { useResendVerificationMutation } = api;
```

`src/hooks/useResendVerification.ts` — swap only the mutation plumbing; the guard,
cooldown effect and returned names stay:

```ts
const [trigger, { isLoading, isSuccess, error }] = useResendVerificationMutation();
// sendEmail keeps: submitting ref guard, deadline check, trim + lowercase, swallow.
// error: resendErrorMessage((error as { code?: string } | undefined)?.code)
// return { sendEmail, isPending: isLoading, isSuccess, error, secondsRemaining }
```

`src/test/providers.tsx` — one helper for six files:

```tsx
export function makeTestStore() { /* configureStore: auth + api reducer, api.middleware */ }
export function Providers({ children, store = makeTestStore(), initialEntries }) { /* Provider (+ MemoryRouter when initialEntries given) */ }
```

`src/store/store.ts` — add `api.reducer`/`api.middleware` (see middleware note
above). Note this changes `RootState` keys from `{ auth }` to `{ auth, api }`,
which is exactly why the two `store.test.tsx` assertions are stale.

### Security constraints

- No new backend contract, no new user input, no new academic-data endpoint: DoD 3
  (ownership scoping) is N/A by recorded reason. The data migrated here is the
  student's own verification-email request, sent through the unchanged axios
  instance with the existing `AUTH_PATHS` guard, so `/auth/resend-verification`
  401s never trigger refresh or the session-expired handler (proved by a named
  negative test).
- The response body's generic message keeps the existing anti-enumeration posture:
  the resend endpoint never reveals whether an account exists. The two mapped
  strings must stay byte-identical to today's (parity test).
- The migration must not weaken SP-105G: `services/api.ts`, `services/recovery.ts`
  and `services/auth.ts` are read-only (AC4), and their suites are the regression
  proof.

## Decisions

Settled with the user during refinement on 2026-10-16:

| ID | Question | Decision |
|---|---|---|
| D1 | Transport | Axios `baseQuery` delegating to the shared `services/api.ts` instance (RD4 confirmed) — not `fetchBaseQuery`, which would bypass the SP-105G interceptor chain. |
| D2 | Error-message parity | BaseQuery stays generic and returns the interceptor's sanitized `message` plus the status as `code: String(status)`; `resendErrorMessage(code)` maps `'400'` → invalid-email and everything else → connection message; a parity test asserts the strings equal `authService.resendVerification`'s. `services/auth.ts` is untouched, and the duplication is test-pinned rather than silent. |
| D3 | Hook contract | Public contract unchanged. RTK Query's `isLoading` is mapped onto the existing `isPending` name inside `useResendVerification`; consumers are untouched. |
| D4 | Test providers | Shared `src/test/providers.tsx` helper (`makeTestStore()` + `Providers`) used by all six wrapper files, each keeping its own router entries / `Layout` / `StrictMode` composition. |
| D5 | `createApi` config | Minimal and deliberate: `reducerPath: 'api'`, the axios `baseQuery`, `keepUnusedDataFor: 300` (mirrors the removed `staleTime: 5min` for the first future GET endpoint). Refetch/retry defaults are left at RTK Query's values and are explicitly **not** a mirror of `refetchOnWindowFocus: false` / `retry: 1`; that tuning belongs to the story that introduces the first query. |
| D6 | Devtools | `ReactQueryDevtools` is deleted with no in-app replacement; RTK's default `devTools: true` relies on the Redux DevTools browser extension. |
| D7 | Pre-existing red tests | C repairs the six missing Redux `Provider` wrappers (including `Login`/`Register`, which are SP-108B fallout, not TanStack work) and the two stale `store.test.tsx` assertions, because C's verification is a green full suite. Recorded as a bounded repair, not new scope. |
| D8 | Sizing | Kept as one cohesive multi-window story with four checkpoints rather than split: nothing user-visible ships until the hook migrates, and the baseQuery-through-unchanged-interceptors chain is the named indivisible core protecting RQ-108-05. A split assessment was run against the 4 production + 11 test path footprint and rejected with this rationale. |

## Sizing

- **Outcome:** every fetch/mutation in the web app runs through RTK Query on top
  of the unchanged axios transport; `apps/web/src` has zero TanStack Query usage
  and the whole web suite is green.
- **Time estimate:** ~2.5–3.5h total as a justified **cohesive multi-window task**
  with four bounded checkpoints. Uncertainty: CP3's hook parity is the risk
  (message/status mapping), mitigated by D2's parity test landing in CP1.
  - **CP1 (~45–60m):** `src/store/api.ts` — axios baseQuery, `resendVerification`
    endpoint, `resendErrorMessage`, `createApi` config; `src/store/api.test.ts`
    with the four baseQuery cases and the two parity cases. Verify: focused
    `vitest run src/store/api.test.ts` green.
  - **CP2 (~30–45m):** store wiring (`src/store/store.ts` reducer + middleware +
    serializable-check ignore) and `src/test/providers.tsx`; migrate
    `Login.test.tsx` and `Register.test.tsx`; repair the two stale
    `store.test.tsx` assertions. Verify: `Login`, `Register`, `store` suites green
    (35 + 3 tests) — the 35 B-caused failures are cleared before the migration.
  - **CP3 (~45–60m):** `useResendVerification` migration + `src/hooks/useResendVerification.test.ts`.
    Verify: hook suite plus `EmailVerificationBanner` and `VerifyEmail` green.
  - **CP4 (~30–45m):** `src/main.tsx` swap (`QueryClientProvider` /
    `ReactQueryDevtools` removed) and the four remaining wrapper files
    (`VerifyEmail`, `ForgotPassword`, `ResetPassword`, `EmailVerificationBanner`).
    Verify: full suite, typecheck, lint, zero-hit grep.
  - Resume inputs: this ticket; [SP-108 README](./README.md) RD2/RD4;
    `src/services/api.ts`, `src/store/store.ts`, `src/hooks/useResendVerification.ts`,
    `src/main.tsx`, the six test wrappers; and the last incomplete checkpoint's
    outcome in `artifacts/SP-108C/checkpoint.md`.
- **Files:** production — `src/store/api.ts` (**new**),
  `src/hooks/useResendVerification.ts`, `src/main.tsx`, `src/store/store.ts`.
  Tests — `src/store/api.test.ts` (**new**), `src/hooks/useResendVerification.test.ts`
  (**new**), `src/test/providers.tsx` (**new**), `src/pages/VerifyEmail.test.tsx`,
  `src/pages/ForgotPassword.test.tsx`, `src/pages/ResetPassword.test.tsx`,
  `src/components/EmailVerificationBanner.test.tsx`, `src/pages/Login.test.tsx`,
  `src/pages/Register.test.tsx`, `src/store/store.test.tsx`.
- **Start context:** this ticket; RD2/RD4 in the
  [SP-108 README](./README.md); [SP-105G](../../stories/EP01/SP-105/SP-105G-recovery-session-client.md)
  (sanitization contract); `src/services/api.ts`, `src/store/store.ts`,
  `src/hooks/useResendVerification.ts`, `src/main.tsx`, and one wrapper test
  (`src/pages/VerifyEmail.test.tsx`) for the wrapper pattern. The Decisions table
  above is authoritative for the API shape — do not re-derive it.
- **Verification:**
  - `pnpm --filter @studypilot/web test` — all 153+ tests green (today: 82 red,
    listed in the baseline above; a *different* set of failures is a defect, not
    progress).
  - `pnpm --filter @studypilot/web typecheck` and
    `pnpm --filter @studypilot/web lint` — clean.
  - `grep -rn "@tanstack\|QueryClient\|useMutation" apps/web/src` — zero hits
    (dependency removal in `package.json` is D's).
  - Named negative proof in `src/store/api.test.ts`: a 401 on an auth path issues
    no `/auth/refresh` request and never calls the session-expired handler.
- **Dependencies / exclusions:** requires SP-108A (store, typed hooks) and builds on
  landed SP-108B. Excludes `@tanstack` package removal and root-README/doc flips
  ([SP-108D](./SP-108D-tanstack-removal-verification.md)), any change to
  `src/services/**`, any GET/query endpoint (EP02+ features keep using
  `authService` until their own migration), the removal of the store-backed
  `AuthProvider` adapter (deferred future work per RD3), and all backend work.
  Excluded requirements keep their named owners.
- **Indivisible core:** the baseQuery must execute through the unchanged axios
  interceptor chain, and the resend endpoint plus the hook's message mapping must
  land together — a transport swap or a partial migration would create two
  parallel data layers with different session-race semantics (RQ-108-05) and two
  sources of truth for the resend error message. Package removal stays separable
  in D.

## Definition of Done

DoD 1/2/4/8 apply (functional criteria, invalid-input/error parity, actionable
sanitized errors, automated baseQuery and mutation-parity tests); DoD 3/5/6/7 are
N/A (no new UI, no academic data, no new user input — existing loading/error
states must keep working, which is the regression obligation); DoD 9 (this ticket;
the repo-doc flip belongs to D); DoD 10 is owned by the combined SP-108 final
review, not this child. No passing results are claimed here.

## Out of scope

- Removing `@tanstack/react-query` / `@tanstack/react-query-devtools` from
  `package.json` and the lockfile, and the root `README.md` architecture flip —
  [SP-108D](./SP-108D-tanstack-removal-verification.md).
- Auth slice work and the `AuthProvider` adapter's removal —
  [SP-108B](./SP-108B-auth-state-slice.md) and the deferred future work named in
  RD3.
- Any change to `src/services/api.ts`, `src/services/recovery.ts`,
  `src/services/auth.ts`, their interceptors or the recovery barrier.
- Deleting now-unused `authService.resendVerification` (kept as the parity
  reference; a cleanup can follow after D).
- Defining query endpoints, cache invalidation or tag types for future EP02+
  features, and any backend work.