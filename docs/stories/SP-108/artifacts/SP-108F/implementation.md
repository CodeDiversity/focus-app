# SP-108F — Implementation record: auth thunk error/loading phase tests

**Story:** [SP-108F](../../SP-108F-thunk-phase-tests.md)
**Parent:** [SP-108](../../README.md) — review fix pass, closes **IR-002 (Should-fix)**
**Implementer:** `implementer` (single writer), 2026-10-17
**Commit:** `45e3e54` — "test(web): add auth thunk and adapter error/loading phase tests (SP-108F, review IR-002)"
**State:** Implementation complete — awaiting the combined SP-108 parent review.
IR-002 is closed by the reviewer only; nothing here is self-approved.

## What changed

Tests only. **No production file changed** in `45e3e54` — verified with
`git show --stat` (two new test files only).

| File | Change |
|---|---|
| `apps/web/src/store/authSlice.thunks.test.ts` | **New** — 4 store-level cases driving the real `login` and `updateProfile` thunks against a mocked `services/auth`. |
| `apps/web/src/context/AuthContext.registerLogout.test.tsx` | **New** — 4 cases driving the real `AuthContext` `register` and `logout` adapter callbacks through a rendered `useAuth` probe. |

## Approach

The ticket's decisive technical note is honoured: `registerThunk`
(`authSlice.thunks.ts:48`) and `logoutThunk` (`:68`) are **dead exports**
(review IR-006) — `AuthContext.tsx:228-254` inlines both flows — so testing them
would be vacuous. Tests therefore go through the paths real users hit:

- the `login` / `updateProfile` `createAsyncThunk`s, and
- the `register` / `logout` context callbacks.

The dead exports were **not** removed (IR-006 polish, out of scope). Removing
them is also not needed for these tests to be non-vacuous.

## Tests added (8)

### `store/authSlice.thunks.test.ts`

| Case | Pins |
|---|---|
| `login pending sets isLoading and clears error` | With a deferred `authService.login`, the pending phase raises `isLoading` and clears a pre-seeded stale error (`authSlice.thunks.ts:14-15`) |
| `login rejection stores the sanitized message, clears loading, and rejects with it` | `rejectWithValue` payload equals the sanitized `getErrorMessage` string, `state.auth.error` holds it, `isLoading` is `false` via the `finally` (`:20-25`), no user is set |
| `updateProfile success sets the updated user and clears loading` | Fulfilled path stores the returned user, loading cleared, no error |
| `updateProfile rejection stores the sanitized message, clears loading, and keeps the session` | Same error/loading rules plus the user survives a failed profile save |

### `context/AuthContext.registerLogout.test.tsx`

| Case | Pins |
|---|---|
| `register rejection stores the sanitized message and rethrows (no user set)` | Sanitized message in `state.auth.error` and in the UI, the promise **rethrows** to the caller (`AuthContext.tsx:234-237`) so `RegisterPage` cannot treat it as success, `isLoading` true→false, no token written |
| `register success does not authenticate and clears loading` | Registration issues no token and sets no user (SP-102's flow) |
| `logout clears token and user even when the service rejects` | The always-clear-token guarantee: `tokenStore.clearToken()` is called and the slice user is cleared despite the service rejection (`AuthContext.tsx:244-254`) |
| `logout clears token and user when the service resolves` | The success path of the same guarantee |

## Test sensitivity (the ticket's verification rule)

Because the production behaviour already existed, the new tests were validated by
deliberate mutation rather than by a red-first cycle:

1. Removed `dispatch(setError(...))` and `dispatch(setLoading(false))` from the
   `login` thunk's catch/finally.
2. Removed `tokenStore.clearToken()` from the `logout` callback's `finally`.
3. Ran the two new files: **4 failed / 8** —
   `login pending sets isLoading and clears error`,
   `login rejection stores the sanitized message, clears loading, and rejects with it`,
   `logout clears token and user even when the service rejects`,
   `logout clears token and user when the service resolves`.
4. Restored both production files with `git checkout --`; `git status` confirmed
   only the two new untracked test files remained, and the full gate re-ran green.

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|---|---|---|
| F1 | `login` rejection stores the sanitized message, delivers it as the `rejectWithValue` payload and clears `isLoading` in the `finally`; pending raises `isLoading` and clears `error` | PASS | `authSlice.thunks.test.ts` — the two `login` cases (mutation-proven to fail when the dispatches are removed) |
| F2 | `updateProfile` rejection/success transitions | PASS | `authSlice.thunks.test.ts` — the two `updateProfile` cases |
| F3 | `register` rejection surfaces the sanitized message, rethrows, transitions loading, and success sets **no** user | PASS | `AuthContext.registerLogout.test.tsx` — the two `register` cases, through a rendered `useAuth` probe |
| F4 | `logout` clears token and user even when the service rejects | PASS | `AuthContext.registerLogout.test.tsx` — both `logout` cases (mutation-proven) |
| F5 | Full suite, typecheck and lint green; the SP-108B record cites the new tests | PASS | 18 files / 178 tests, typecheck clean, lint clean; `artifacts/SP-108B/implementation.md` AC4 + test-evidence updated and the parent index's TR-108-02 row repointed |

## Gate evidence (executed 2026-10-17)

| Check | Command | Result |
|---|---|---|
| Web suite | `pnpm --filter @studypilot/web test` | **Test Files 18 passed (18), Tests 178 passed (178)** — 170 after SP-108E + 8 new |
| Typecheck | `pnpm --filter @studypilot/web typecheck` | clean (`tsc --noEmit`, no output) |
| Lint | `pnpm --filter @studypilot/web lint` | clean (`eslint . --max-warnings 0`, no output) |

## Deviations

- The register/logout tests use a `useAuth` probe that captures the live context
  value (the pattern already used by `AuthContext.test.tsx:33-43`) rather than
  rendering `RegisterPage`. That is the ticket's "real path" requirement: the
  callbacks under test are `AuthContext`'s, and the probe avoids coupling these
  tests to page-level markup.
- No other deviation; no production change was needed or made.

## Not in scope (unchanged, still open)

- **IR-003** — SP-108A's missing implementation record → SP-108G.
- **IR-006** — the dead `registerThunk`/`logoutThunk`/`selectIsAuthenticated`
  exports remain; only the consequence (which path to test) was handled.
- **IR-004/IR-005/IR-007/IR-008** — untouched polish.
- DoD 10 remains the combined parent review's; this record does not sign off
  SP-108.