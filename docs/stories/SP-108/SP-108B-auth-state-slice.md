# SP-108B: Auth/session state into an RTK authSlice

**Story ID:** SP-108B
**Epic:** Cross-cutting technical task (standalone; see [SP-108](./SP-108.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Needs refinement (refine against code after SP-108A lands)
**Dependencies:** SP-108A (store + typed hooks exist)
**Jira key:** Pending creation

## Summary and bounded scope

One cohesive multi-window task (~2–3h total; three bounded checkpoints in
Sizing) that moves **all** auth/session client state out of React state into an
RTK `authSlice`: `user`, `isLoading`, `error`,
`isVerificationBannerDismissed` (the verified `AuthContext` state surface).
Auth/session **actions** (login, register, logout, updateProfile, refreshProfile,
boot restore, session-expired handling) become dispatching thunks/callbacks.
`AuthProvider` is re-implemented as a **store-backed adapter with the identical
public `AuthContextType` interface** (RD3), so the 9 `useAuth` consumers and
their tests are untouched. Exclude RTK Query (C), TanStack removal (D), and any
backend/service change (`services/api.ts`, `auth.ts`, `recovery.ts`,
`tokenStore.ts` keep their roles).

## Source requirements

RQ-108-02, RQ-108-05 (RD1/RD3); TR-108-02, TR-108-03; shared
[DoD](../../epics/README.md#definition-of-done) items 1/2/4/8.

## Acceptance criteria

1. **State ownership (RD3):** every auth/session field of `AuthContextType`
   (`user`, `isAuthenticated`, `isLoading`, `error`,
   `isVerificationBannerDismissed`) is stored in and read from the RTK
   `authSlice`; React `useState`/refs no longer own any of it.
2. **Adapter interface preservation:** `AuthProvider` exposes the same
   `AuthContextType` (all 11 members, verified signatures below); all existing
   `AuthContext.test.tsx` cases pass **unchanged** (interface-level proof).
3. **SP-105G semantics preserved exactly (RQ-108-05):** the
   session-generation checks, single-flight profile/restore guards, banner
   reset on user identity change, `setSessionExpiredHandler` wiring with its
   generation snapshot, and `registerLocalSessionClearer` callback keep their
   current behavior — now dispatching to the slice instead of setting React
   state. A stale completion that predates a successful reset remains a no-op.
4. **Thunk error/loading paths:** login/register/updateProfile surface
   sanitized errors via `getErrorMessage` into the slice `error` state;
   loading flags transition as before; clearError resets it. Negative cases
   are tested.

## Tests (future obligations)

Vitest + jsdom via the existing adapter-mock patterns:

| Area | File | Named cases |
|---|---|---|
| Slice | `src/store/authSlice.test.ts` (new) | `applyUser with a different id advances the guard version and resets the banner`; `applyUser with the same id keeps it`; `login failure stores the sanitized message and rethrows`; `register/logout/loading transitions`; `clearError resets error`; negative cases for malformed dispatch payloads |
| Generation regression | existing `context/AuthContext.test.tsx`, `services/recovery.test.ts`, `services/api.test.ts` | All existing cases pass unchanged, incl. `boot restore and profile-flight completions predating the reset are rejected` and the session-expired-handler skip case |
| Interface parity | `context/AuthContext.test.tsx` (unchanged) | every existing hook-consumer case proves the adapter interface |

## Technical notes

### Inspected code (2026-10-16)

- `context/AuthContext.tsx` (271 lines) — state surface: `user` (line 40),
  `userRef`, `sessionVersion` ref (line 42), `profileFlight` (43),
  `restoreFlight` (44), `isVerificationBannerDismissed` (45), `isLoading`,
  `error`; `applyUser` (51) resets the banner only when the user **id**
  changes; session-expired handler (121–136) snapshots
  `snapshotSessionGeneration()` at registration; boot restore (140–169);
  `registerLocalSessionClearer` (173–176); thunks currently live as
  `login`/`register`/`logout`/`updateProfile` callbacks.
- `services/recovery.ts` — generation counter + drain barrier; a leaf module;
  the reset-success flow calls `advanceSessionGeneration()` **before** the
  local-clear callback — the slice's `clearUser` must stay callable through
  that same registered callback, not a reordered direct dispatch.
- `services/api.ts` — `setSessionExpiredHandler` contract unchanged.
- Consumers (grep-verified, 9): `Home`, `Login`, `Register`, `Dashboard`,
  `Profile`, `VerifyEmail` pages; `ProtectedRoute`, `PublicRoute`, `Header`,
  `EmailVerificationBanner` components; tests in `AuthContext.test.tsx`,
  `Register.test.tsx`, `EmailVerificationBanner.test.tsx`.

### Proposed (not verified — refine against code)

- The `sessionVersion`/flight refs may remain local to the adapter provider
  (they are coordination, not shared state) — but the refiner must decide
  whether `sessionVersion` belongs in the slice to keep generation checks
  testable. Behavior, not placement, is fixed by AC3.
- Thunk composition: services are called directly from thunks
  (`createAsyncThunk` or plain async dispatches); no axios change.

## Sizing

- **Outcome:** auth/session state lives in Redux; the app's auth behavior is
  indistinguishable from before (same interface, same SP-105G semantics).
- **Time estimate:** ~2–3h total as a justified **cohesive multi-window task**
  with three bounded checkpoints. The indivisible core (below) forbids a
  per-field split.
  - **CP1 (~45–60m):** `authSlice` + reducer actions + `authSlice.test.ts`.
    Verify: slice tests green; app still uses Context (no behavior change yet).
  - **CP2 (~60–90m):** re-implement `AuthProvider` over the store
    (state + thunks + the four effects); all consumers untouched. Verify:
    full `AuthContext.test.tsx` + `recovery.test.ts` + `api.test.ts` green
    unchanged.
  - **CP3 (~30–45m):** full web suite + `typecheck` + `lint`; update this
    story's artifact + queue. Verify: whole suite green (TR-108-06).
  - Resume inputs: this ticket; `AuthContext.tsx`, `recovery.ts` header
    comment, `api.ts`, the existing test files above; last incomplete
    checkpoint step.
- **Files:** production — `apps/web/src/store/authSlice.ts` (new),
  `apps/web/src/context/AuthContext.tsx` (rewritten as adapter).
  Tests — `apps/web/src/store/authSlice.test.ts` (new); existing suites
  unchanged. (≤ 3 production files.)
- **Start context:** this ticket; [SP-108 README](./README.md) RD1/RD3/RD4;
  [SP-105G ticket](../../stories/EP01/SP-105/SP-105G-recovery-session-client.md)
  ("Session semantics" decisions R1–R5); `context/AuthContext.tsx`,
  `context/AuthContext.test.tsx`, `services/recovery.ts`, `services/api.ts`.
- **Verification:** `pnpm --filter @studypilot/web test` (all green incl. new
  slice tests), `pnpm --filter @studypilot/web typecheck`,
  `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** requires SP-108A implemented. Excludes RTK
  Query (C), TanStack dependency removal (D), services/axios changes, backend
  work. Excluded requirements keep their named owners (C/D per the README
  traceability map).
- **Indivisible core:** the SP-105G generation checks span
  `applyUser`, boot restore, profile flights, the session-expired handler and
  the recovery-clear callback as **one** invariant (SP-105G AC2/CF-9: a
  partially guarded migration lets a stale completion resurrect or clobber the
  session). Migrating `user` without the guard paths yields a partially safe
  increment; hence one story with checkpoints, not nominal sub-slices.

## Definition of Done

DoD 1/2/4/8 apply (criteria, error paths, sanitized messages, automated
slice + regression tests); DoD 3/5/6/7 N/A (no new UI or data access; existing
states covered by regression); DoD 9 (this ticket + README); DoD 10 belongs to
the combined SP-108 final review. Future test obligations only — no passing
results are claimed here.

## Out of scope

- RTK Query data layer and the `useResendVerification` migration —
  [SP-108C](./SP-108C-rtk-query-data-layer.md).
- TanStack dependency removal, repo docs flip, final verification —
  [SP-108D](./SP-108D-tanstack-removal-verification.md).
- Removing the adapter context entirely (optional future work, RD3).
- Any change to `services/api.ts`, `services/recovery.ts`, `services/auth.ts`,
  `services/tokenStore.ts`.
