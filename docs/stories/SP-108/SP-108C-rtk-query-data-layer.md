# SP-108C: RTK Query replaces TanStack Query

**Story ID:** SP-108C
**Epic:** Cross-cutting technical task (standalone; see [SP-108](./SP-108.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Needs refinement (refine against code after SP-108A lands)
**Dependencies:** SP-108A (store exists; independent of B, but ordered after it
for the single writer)
**Jira key:** Pending creation

## Summary and bounded scope

One cohesive multi-window task (~2–3h total; three bounded checkpoints in
Sizing) that replaces **every** TanStack Query usage with an RTK Query service
built on a **custom axios `baseQuery` delegating to the existing
`services/api.ts` instance** (RD4 — the SP-105G single-flight refresh, recovery
barrier, session generations and `AUTH_PATHS` handling are the transport,
unchanged). Today's complete TanStack inventory (grep-verified 2026-10-16):
`main.tsx` (`QueryClientProvider` + Devtools), `hooks/useResendVerification.ts`
(`useMutation`), and four test files wrapping `QueryClientProvider`
(`ForgotPassword.test.tsx`, `VerifyEmail.test.tsx`,
`ResetPassword.test.tsx`, `EmailVerificationBanner.test.tsx`). Exclude
removing the `@tanstack` dependencies and repo-doc changes (D owns those) and
any service/interceptor change.

## Source requirements

RQ-108-03, RQ-108-05 (RD2/RD4); TR-108-03, TR-108-04; shared
[DoD](../../epics/README.md#definition-of-done) items 1/2/4/8.

## Acceptance criteria

1. **RTK Query service (proposed `src/store/api.ts`):** a `createApi` with a
   custom `baseQuery` that executes requests through the existing axios `api`
   instance — errors are surfaced in RTK Query's `error` shape **after** the
   existing interceptor's sanitization, never bypassing it. Endpoint
   definitions exist for the migrated mutation(s).
2. **Hook contract parity:** `useResendVerification` keeps its exact return
   contract (`sendEmail`, `isPending`, `isSuccess`, `error`, `secondsRemaining`)
   with the resend mutation now executed via RTK Query; the duplicate-submission
   guard and 60s cooldown behavior are preserved; the existing page tests
   (`VerifyEmail.test.tsx` etc.) pass with updated providers.
3. **Provider replacement:** `QueryClientProvider` and `ReactQueryDevtools`
   are removed from `main.tsx` and replaced by the store `Provider`'s API
   middleware (added in A's store via `api.middleware`); test files swap the
   TanStack wrapper for a Redux wrapper (store + `api` middleware).
4. **No transport regression (RQ-108-05):** `services/api.ts`,
   `services/recovery.ts`, `services/auth.ts` are not modified; all existing
   generation/barrier suites pass unchanged.

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| baseQuery | `src/store/api.test.ts` (new) | `baseQuery executes through the axios instance`; `sanitized interceptor errors map to RTK Query error with status/message`; `a recovery-path 401 still does not trigger refresh or the session-expired handler` (negative case, transport-level proof) |
| Mutation parity | `src/hooks/useResendVerification.test.ts` (new or existing consumer tests extended) | `successful send starts the 60s cooldown and reports isSuccess`; `concurrent send while submitting is suppressed`; `failure surfaces the sanitized message` |
| Regression | existing `recovery.test.ts`, `api.test.ts`, `AuthContext.test.tsx`, page tests | all pass unchanged except the provider-wrapper swap in the four test files |

## Technical notes

### Inspected code (2026-10-16)

- `hooks/useResendVerification.ts` — `useMutation` with `retry: false`,
  `onSuccess` starting the 60s deadline; the RTK Query equivalent is
  `useResendVerificationMutation` (or a dispatched
  `api.endpoints...initiate`) with the same guard logic retained locally.
- `main.tsx` lines 4–18 — the `QueryClient` config (staleTime 5min, retry 1,
  refetchOnWindowFocus false) documents the current caching expectations; RTK
  Query equivalents (e.g. `keepUnusedDataFor`) must be set deliberately in the
  refiner pass, not silently defaulted.
- `services/api.ts` — the axios instance owns refresh single-flight and
  sanitized errors; **this is why the axios baseQuery is mandatory** (RD4).
- Test wrappers: `ForgotPassword.test.tsx`, `VerifyEmail.test.tsx`,
  `ResetPassword.test.tsx`, `EmailVerificationBanner.test.tsx` import
  `QueryClient/QueryClientProvider`.

### Proposed (not verified — refine against code)

- The RTK Query service may later define GET endpoints (dashboard, etc.) as
  EP02+ features arrive; C only migrates the current usages, not future
  features.
- DevTools: RTK Query includes Redux DevTools integration; the separate
  `@tanstack/react-query-devtools` dependency is removed in D.

## Sizing

- **Outcome:** every fetch/mutation in the app runs through RTK Query on top
  of the unchanged axios transport; TanStack Query has zero runtime usage.
- **Time estimate:** ~2–3h total as a justified **cohesive multi-window task**
  with three bounded checkpoints.
  - **CP1 (~45–60m):** `src/store/api.ts` — axios baseQuery + resend
    endpoint; `api.test.ts` baseQuery/error cases. Verify: focused tests green.
  - **CP2 (~45–60m):** `useResendVerification` migration + mutation parity
    tests; store wiring (`reducerPath`, middleware). Verify: hook/consumer
    cases green.
  - **CP3 (~45–60m):** `main.tsx` provider swap + the four test-wrapper
    updates; full suite + typecheck + lint. Verify: whole suite green,
    zero `useMutation`/`QueryClient` imports in `src`.
  - Resume inputs: this ticket; [SP-108 README](./README.md) RD2/RD4;
    `useResendVerification.ts`, `main.tsx`, `services/api.ts`, the four test
    files; last incomplete checkpoint step.
- **Files:** production — `apps/web/src/store/api.ts` (new),
  `apps/web/src/hooks/useResendVerification.ts`, `apps/web/src/main.tsx`,
  `apps/web/src/store/store.ts` (middleware registration). Tests —
  `apps/web/src/store/api.test.ts` (new) + the four wrapper updates.
- **Start context:** this ticket; RD2/RD4 in the
  [SP-108 README](./README.md); [SP-105G ticket](../../stories/EP01/SP-105/SP-105G-recovery-session-client.md)
  (sanitization contract); `services/api.ts`, `services/recovery.ts`,
  `hooks/useResendVerification.ts`, `main.tsx`.
- **Verification:** `pnpm --filter @studypilot/web test`,
  `pnpm --filter @studypilot/web typecheck`, `pnpm --filter @studypilot/web
  lint`; `grep -r "@tanstack\|useMutation\|QueryClient" apps/web/src` returns
  no runtime hits (test-wrapper removal owned here; dependency removal in D).
- **Dependencies / exclusions:** requires SP-108A. Independent of B but
  sequenced after it. Excludes `@tanstack` package removal and repo-doc flips
  (D), services/interceptor changes, backend work. Excluded requirements keep
  their named owners.
- **Indivisible core:** the baseQuery must go through the unchanged axios
  interceptor chain — swapping transports or migrating only part of the
  TanStack usage would create two parallel data layers with different
  session-race semantics. Hence one story with checkpoints; the package
  removal is still separable and belongs to D.

## Definition of Done

DoD 1/2/4/8 apply (criteria, sanitized error parity, automated
baseQuery/mutation tests); DoD 3/5/6/7 N/A (no new UI/data); DoD 9 (this
ticket + README); DoD 10 belongs to the combined SP-108 final review. No
passing results are claimed here.

## Out of scope

- Removing `@tanstack` dependencies/lockfile entries, root README flip —
  [SP-108D](./SP-108D-tanstack-removal-verification.md).
- Auth slice work — [SP-108B](./SP-108B-auth-state-slice.md).
- Any change to the axios instance, interceptors, or recovery barrier.
