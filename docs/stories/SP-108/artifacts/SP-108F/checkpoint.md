# SP-108F checkpoint — thunk error/loading phase tests

**Story:** [SP-108F](../../SP-108F-thunk-phase-tests.md) (fix pass, review IR-002)
**Owner:** `implementer` (single writer, continuing from SP-108E)
**Started:** 2026-10-17
**Scope:** tests only — two new test files, **no production change**. IR-003
(SP-108G) and all polish items (IR-004…IR-008) stay out.

## Resumed state

- `HEAD` = `f059534` ("docs(SP-108E): checkpoint + implementation record; queue
  advances to SP-108F"). SP-108E is complete: commit `b3533a8` (slice boots
  `isLoading: true` + 4 real-guard tests), gate 16 files / 170 tests green.
- Working tree carries only other contributors' files (EP01 SP-105 README and
  review, plus the untracked reviewer-owned
  `artifacts/SP-108/review.md`) — untouched.
- Code re-verified for F:
  - `authSlice.thunks.ts:11-45` — `login` / `updateProfile` createAsyncThunks with
    `setLoading(true)` + `setError(null)` up front, `setError(getErrorMessage(err))`
    + `rejectWithValue` on failure, `setLoading(false)` in `finally`.
  - `AuthContext.tsx:218-224` / `:256-261` — the adapter re-throws a rejected
    thunk's sanitized payload (the SP-105C repair).
  - `AuthContext.tsx:228-242` (`register`) and `:244-254` (`logout`) are the
    **real** paths; `registerThunk`/`logoutThunk` are dead exports (IR-006) and
    are not tested.
  - `getErrorMessage` returns `error.message` verbatim (`utils/errors.ts:1-11`),
    so the sanitized-message assertions pin the exact user-facing string.
  - `tokenStore.clearToken()` is the always-clear guarantee (`logout`'s `finally`).

## Plan

1. New `src/store/authSlice.thunks.test.ts` — store-level `login` /
   `updateProfile` pending + rejection + success assertions against a mocked
   `services/auth`.
2. New `src/context/AuthContext.registerLogout.test.tsx` — adapter-callback
   register/logout cases through a rendered `useAuth` probe.
3. Sensitivity check (the ticket's verification rule): temporarily break one
   production expectation, confirm the new test fails, restore exactly.
4. Full gate (`test`, `typecheck`, `lint`), record `implementation.md`, update
   `artifacts/SP-108B/implementation.md`'s AC4 evidence + TR-108-02 citation and
   the parent index's TR-108-02 row, then hand off to SP-108G.

## Progress log

1. **Baseline** — 16 files / 170 tests green at `f059534` (SP-108E complete).
2. **New tests** — `store/authSlice.thunks.test.ts` (4) and
   `context/AuthContext.registerLogout.test.tsx` (4), both against a mocked
   `services/auth`. One authoring bug found and fixed mid-pass: a helper created
   its own store while the test asserted on a second one, so the register cases
   first failed on `isLoading` never clearing — a test-harness defect, not a
   product one; the helper now returns the store it renders.
3. **Sensitivity check** — mutated the `login` thunk (dropped `setError` /
   `setLoading(false)`) and the `logout` callback (dropped
   `tokenStore.clearToken()`): **4 of 8 new cases failed**; restored with
   `git checkout --`, tree clean afterwards.
4. **Gate** — `test` **18 files / 178 tests passed**, `typecheck` clean,
   `lint` clean.
5. **Commit** — `45e3e54` (tests only; `git show --stat` touches two new files).
6. **Records** — `implementation.md` written; `artifacts/SP-108B/implementation.md`
   AC4 + test evidence updated; parent index TR-108-02 row repointed and the
   fix-pass child rows E/F added.

## Status

Implementation complete — awaiting the combined SP-108 parent review. Next:
**SP-108G** (docs-only, independent of this change).