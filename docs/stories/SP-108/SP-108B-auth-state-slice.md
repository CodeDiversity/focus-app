# SP-108B: Auth/session state into an RTK authSlice

**Story ID:** SP-108B
**Epic:** Cross-cutting technical task (standalone; see [SP-108](./SP-108.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Needs refinement (refine against code after SP-108A lands)
**Dependencies:** SP-108A (store + typed hooks exist)
**Jira key:** Pending creation
**Refined:** 2026-10-16

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
   `AuthContextType` (all 12 members — the original ticket's "11" is a counting
   error; the actual interface has 12: `user`, `isAuthenticated`, `isLoading`,
   `error`, `login`, `register`, `logout`, `updateProfile`, `clearError`,
   `refreshProfile`, `isVerificationBannerDismissed`, `dismissVerificationBanner`);
   all existing `AuthContext.test.tsx` cases pass **unchanged** (interface-level
   proof).
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
| Slice | `apps/web/src/store/authSlice.test.ts` (new) | `setUser with a different id advances the guard version and resets the banner`; `setUser with the same id keeps version`; `clearUser dispatches setUser(null)`; `loginPending/loading/fulfilled/rejected phases`; `login failure stores the sanitized message and rethrows`; `register pending/loading/fulfilled/rejected phases`; `logout pending/fulfilled/rejected phases` (always clears token); `updateProfile pending/fulfilled/rejected phases`; `clearError resets error`; `banner resets only when user id changes`; negative cases for malformed dispatch payloads |
| Generation regression | existing `context/AuthContext.test.tsx`, `services/recovery.test.ts`, `services/api.test.ts` | All existing cases pass unchanged, incl. `boot restore and profile-flight completions predating the reset are rejected` and the session-expired-handler skip case |
| Interface parity | `context/AuthContext.test.tsx` (unchanged) | every existing hook-consumer case proves the adapter interface (12 members) |
| Adapter wiring | `context/AuthContext.test.tsx` (new cases) | `sessionVersion ref advances on login/logout`; `banner resets on login with different user`; `sessionExpiredHandler dispatches clearUser`; `registerLocalSessionClearer dispatches clearUser`; `boot restore dispatches setUser or clears on failure`; `profileFlight deduplication works via thunk`; `stale profile completion after logout is a no-op` |

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
- `services/auth.ts` — `login`, `register`, `logout`, `getProfile`,
  `updateProfile`, `refreshToken` methods. No slice changes needed.
- `services/tokenStore.ts` — in-memory access token storage. No changes.
- `store/store.ts` (SP-108A) — `configureStore({ reducer: {} })` exists;
  `authSlice` reducer will be added to `combineReducers` or passed directly.
- `store/hooks.ts` (SP-108A) — `useAppDispatch` / `useAppSelector` typed hooks
  exist.
- `main.tsx` (SP-108A) — `<Provider store={store}>` wraps `App` inside
  `BrowserRouter`; `AuthProvider` sits inside the Provider.
- `utils/errors.ts` — `getErrorMessage` helper (11 lines).
- Consumers (grep-verified, 9): `Home`, `Login`, `Register`, `Dashboard`,
  `Profile`, `VerifyEmail` pages; `ProtectedRoute`, `PublicRoute`, `Header`,
  `EmailVerificationBanner` components; tests in `AuthContext.test.tsx`,
  `Register.test.tsx`, `EmailVerificationBanner.test.tsx`.
- `types/index.ts` — `SessionUser`, `User`, `AuthResponse`, `LoginCredentials`,
  `RegisterCredentials`, `RegisteredUser`.

### Slice shape

```typescript
// apps/web/src/store/authSlice.ts (new)

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SessionUser } from '../types';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';
import { getErrorMessage } from '../utils/errors';
import type { AppDispatch, RootState } from './hooks';

export interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  error: string | null;
  isVerificationBannerDismissed: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isVerificationBannerDismissed: false,
};

/* ---- Actions ---- */

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<SessionUser | null>) => {
      const prevId = state.user?.id;
      const nextId = action.payload?.id;
      // Banner resets only when user identity changes (same behavior as applyUser)
      if (prevId !== nextId) {
        state.isVerificationBannerDismissed = false;
      }
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // login, updateProfile handled via createAsyncThunk auto-cases
  },
});

export const { setUser, clearUser, setLoading, setError, clearError } = authSlice.actions;
export default authSlice.reducer;
```

### Thunk definitions

```typescript
// apps/web/src/store/authSlice.ts (continued)

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await authService.login(credentials);
      dispatch(setUser(response.user));
      return response.user;
    } catch (err: unknown) {
      dispatch(setError(getErrorMessage(err)));
      return rejectWithValue(getErrorMessage(err));
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: Partial<User>, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const updatedUser = await authService.updateProfile(data);
      dispatch(setUser(updatedUser));
      return updatedUser;
    } catch (err: unknown) {
      dispatch(setError(getErrorMessage(err)));
      return rejectWithValue(getErrorMessage(err));
    } finally {
      dispatch(setLoading(false));
    }
  },
);

// Plain async dispatch for register (no user set on success)
export const registerThunk = async (
  dispatch: AppDispatch,
  name: string,
  email: string,
  password: string,
) => {
  dispatch(setLoading(true));
  dispatch(setError(null));
  try {
    await authService.register({ name, email, password });
  } catch (err: unknown) {
    dispatch(setError(getErrorMessage(err)));
    throw err;
  } finally {
    dispatch(setLoading(false));
  }
};

// Plain async dispatch for logout (always clears token regardless of server response)
export const logoutThunk = async (dispatch: AppDispatch) => {
  try {
    await authService.logout();
  } catch (err: unknown) {
    console.error('Logout error:', getErrorMessage(err));
  } finally {
    tokenStore.clearToken();
    dispatch(clearUser());
  }
};
```

### Adapter re-implementation (AuthContext.tsx)

The `AuthProvider` re-implementation maps every `useState` to a `useSelector`
reading from the slice, and every callback to a `dispatch` call. The adapter
preserves the **identical** `AuthContextType` interface (12 members).

Key mappings:

| Current (React state) | Slice equivalent |
|---|---|
| `useState<SessionUser | null>(null)` | `useSelector((s) => s.auth.user)` |
| `useState<boolean>(true)` | `useSelector((s) => s.auth.isLoading)` |
| `useState<string | null>(null)` | `useSelector((s) => s.error)` |
| `useState(false)` (banner) | `useSelector((s) => s.auth.isVerificationBannerDismissed)` |
| `login` callback | `dispatch(login(credentials))` |
| `register` callback | `dispatch(registerThunk(name, email, password))` |
| `logout` callback | `dispatch(logoutThunk(dispatch))` |
| `updateProfile` callback | `dispatch(updateProfile(data))` |
| `clearError` callback | `dispatch(clearError())` |

**Local refs retained in the adapter (not in the slice):**

- `sessionVersion` — local `useRef(0)` inside the adapter provider. The
  `refreshProfile` thunk reads this ref for generation checks. The ref is
  advanced in the adapter's `login`/`logout` wrappers (same as current behavior).
- `profileFlight` — local `useRef<{ version, promise, needsFresh } | null>(null)`
  for single-flight deduplication of `refreshProfile`.
- `restoreFlight` — local `useRef<Promise<void> | null>(null)` for boot restore
  tracking.

These are coordination state, not shared client state, and are fully covered by
the existing `AuthContext.test.tsx` generation-regression tests.

**Boot restore effect (current lines 140–169):** replaces `applyUser` with
`dispatch(setUser(response.user))` on success, `dispatch(clearUser())` on
failure. The `setIsLoading(false)` moves to the thunk's `finally` (handled by
`setLoading(false)`).

**Session-expired handler (current lines 121–136):** replaces `applyUser(null)`
with `dispatch(clearUser())`. The `tokenStore.clearToken()` stays in the api
interceptor (unchanged).

**registerLocalSessionClearer (current lines 173–176):** replaces `applyUser(null)`
with `dispatch(clearUser())`.

### Store wiring (SP-108A integration)

SP-108A created `store.ts` with `configureStore({ reducer: {} })`. Post-B:

```typescript
// apps/web/src/store/store.ts (modified)
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});
```

No other store changes needed. The `RootState` / `AppDispatch` types in
`hooks.ts` automatically reflect the new `auth` key.

### Selectors (optional, for slice tests)

```typescript
// apps/web/src/store/authSelectors.ts (new, optional)
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './hooks';

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => !!state.auth.user;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectError = (state: RootState) => state.auth.error;
export const selectIsVerificationBannerDismissed = (state: RootState) =>
  state.auth.isVerificationBannerDismissed;
```

Selectors are optional — the adapter reads via `useSelector` directly. They're
useful for slice unit tests and any consumer that wants to select individual
fields rather than the full slice.

### Security constraints

- No academic data touched (DoD 3 N/A).
- `getErrorMessage` sanitization preserved verbatim for all thunk error paths.
- Uniform 404 for missing/unowned records unchanged (api layer, not slice).
- `tokenStore` remains in-memory only (no slice persistence).

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | `sessionVersion` stays as a local `useRef` in the adapter (not in the slice). | The existing 18 `AuthContext.test.tsx` tests (including 5 generation-regression tests) cover this end-to-end. A slice unit test on `sessionVersion` would be redundant. The indivisible core (AC3) is preserved either way. |
| D2 | `profileFlight` and `restoreFlight` stay as local refs in the adapter. | They are internal coordination state, not shared client state. Putting them in the slice would add complexity (serializability concerns with Promise values) without testing benefit. |
| D3 | `login` and `updateProfile` use `createAsyncThunk`; `register` and `logout` use plain async dispatch. | `login`/`updateProfile` have clear async boundaries with user-set-on-success semantics. `register` doesn't set a user; `logout` always clears the token regardless of server response — plain async dispatch matches this asymmetric behavior more cleanly. |
| D4 | Export `clearUser` as a named action (in addition to `setUser`). | Makes the recovery boundary integration cleaner: `registerLocalSessionClearer(() => dispatch(clearUser()))` is semantically distinct from `setUser(null)`. |
| D5 | `AuthContextType` has 12 members (not 11 as stated in the original ticket). | Counting the interface: `user`, `isAuthenticated`, `isLoading`, `error`, `login`, `register`, `logout`, `updateProfile`, `clearError`, `refreshProfile`, `isVerificationBannerDismissed`, `dismissVerificationBanner`. The "11" is a counting error. |
| D6 | `AuthProvider` wraps `login`/`logout` calls to advance `sessionVersion` and dispatch slice actions, preserving the current generation-check behavior. | The `sessionVersion` ref is advanced in the adapter's `login`/`logout` wrappers (same as current behavior). The slice's `setUser` reducer resets the banner only when the user id changes (same as `applyUser`). |

## Sizing

- **Outcome:** auth/session state lives in Redux; the app's auth behavior is
  indistinguishable from before (same interface, same SP-105G semantics).
- **Time estimate:** ~2–3h total as a justified **cohesive multi-window task**
  with three bounded checkpoints. The indivisible core (below) forbids a
  per-field split.
  - **CP1 (~45–60m):** `authSlice` + reducer actions (`setUser`, `clearUser`,
    `setLoading`, `setError`, `clearError`) + `createAsyncThunk` for
    `login`/`updateProfile` + plain async dispatch for `registerThunk`/`logoutThunk`
    + `authSlice.test.ts`. Verify: slice tests green; app still uses Context
    (no behavior change yet).
  - **CP2 (~60–90m):** re-implement `AuthProvider` over the store (state selectors
    + dispatching thunks + the four effects: boot restore, session-expired handler,
    `registerLocalSessionClearer`, focus-driven profile refresh); all consumers
    untouched. Verify: full `AuthContext.test.tsx` + `recovery.test.ts` +
    `api.test.ts` green unchanged.
  - **CP3 (~30–45m):** full web suite + `typecheck` + `lint`; update this
    story's artifact + queue. Verify: whole suite green (TR-108-06).
  - Resume inputs: this ticket; `AuthContext.tsx`, `recovery.ts` header
    comment, `api.ts`, the existing test files above; last incomplete
    checkpoint step.
- **Files:** production — `apps/web/src/store/authSlice.ts` (new),
  `apps/web/src/store/store.ts` (modified to include `auth` reducer),
  `apps/web/src/context/AuthContext.tsx` (rewritten as adapter).
  Tests — `apps/web/src/store/authSlice.test.ts` (new); existing suites
  unchanged. (≤ 3 production files.)
- **Start context:** this ticket; [SP-108 README](./README.md) RD1/RD3/RD4;
  [SP-105G ticket](../../stories/EP01/SP-105/SP-105G-recovery-session-client.md)
  ("Session semantics" decisions R1–R5); `context/AuthContext.tsx`,
  `context/AuthContext.test.tsx`, `services/recovery.ts`, `services/api.ts`,
  `store/store.ts`, `store/hooks.ts`.
- **Verification:** `pnpm --filter @studypilot/web test` (all green incl. new
  slice tests), `pnpm --filter @studypilot/web typecheck`,
  `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** requires SP-108A implemented. Excludes RTK
  Query (C), TanStack dependency removal (D), services/axios changes, backend
  work. Excluded requirements keep their named owners (C/D per the README
  traceability map).
- **Indivisible core:** the SP-105G generation checks span
  `applyUser` (now `setUser`/`clearUser`), boot restore, profile flights, the
  session-expired handler and the recovery-clear callback as **one** invariant
  (SP-105G AC2/CF-9: a partially guarded migration lets a stale completion
  resurrect or clobber the session). Migrating `user` without the guard paths
  yields a partially safe increment; hence one story with checkpoints, not
  nominal sub-slices.

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
- `sessionVersion`, `profileFlight`, or `restoreFlight` moved into the slice
  (decision D1/D2).
- Changing the `AuthContextType` interface (decision D5: 12 members preserved).
- Jira key creation or sync (decision RD5).
