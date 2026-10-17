# SP-108F: Thunk error/loading phase tests for authSlice

**Story ID:** SP-108F
**Parent:** [SP-108](./SP-108.md) (fix pass for the combined review)
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Implemented — awaiting parent review (implementer, 2026-10-17,
commit `45e3e54`) — closes review finding **IR-002 (Should-fix)** in
`artifacts/SP-108/review.md`
**Dependencies:** [SP-108E](./SP-108E-boot-loading-gate-fix.md) (sequential —
both edit `authSlice.test.ts`; one writer)
**Jira key:** STUDY-42

## Summary and bounded scope

Add the missing automated tests for SP-108B AC4's thunk error/loading paths:
`authSlice.test.ts` currently covers pure reducers only, so a refactor of
`authSlice.thunks.ts` or the `AuthContext` inline register/logout callbacks
could break user-facing error handling or the always-clear-token guarantee with
a green suite (the exact defect class SP-108C had to repair — a swallowed
rejection producing a false "Logged in successfully!" toast). Tests target the
**real production paths**; no production code changes.

Exclude: the SP-108E boot gate, IR-003, IR-006's dead-code removal
(`registerThunk`/`logoutThunk` in `authSlice.thunks.ts` are unused — see
Technical notes), and any transport/service change.

## Source requirements

SP-108B AC4 (negative cases tested), RQ-108-02/RQ-108-06; shared DoD items 2, 4,
8; TR-108-02 (the parent index marks it "Pass" — the review proves it is not
yet; the record is repointed after this fix).

## Acceptance criteria

1. **login rejection (named case):** dispatching the `login` thunk against a
   mocked `services/auth.login` rejection stores the sanitized
   `getErrorMessage` string in `state.auth.error`, is delivered as
   `rejectWithValue` payload, and sets `isLoading` back to `false` in the
   `finally`; the pending phase sets `isLoading: true` and clears `error`.
2. **updateProfile rejection:** same error/isLoading assertions for the
   `updateProfile` thunk, plus the success path sets the user.
3. **register (via the AuthContext adapter callback — the real path):** a
   rejected `authService.register` surfaces the sanitized message in
   `state.auth.error`, re-throws to the caller, and transitions
   `isLoading` true→false; the success path sets **no** user.
4. **logout (via the AuthContext adapter callback — the real path):** even when
   `authService.logout` rejects, `tokenStore.clearToken()` is called and the
   slice user is cleared (always-clear-token guarantee).
5. Full web suite, `typecheck` and `lint` stay green; the SP-108B
   implementation record cites the new tests.

## Tests (obligations)

Vitest + jsdom; `vi.mock` `services/auth`; spy `services/tokenStore`:

| Area | File | Named cases |
|---|---|---|
| Thunks (store-level) | `apps/web/src/store/authSlice.thunks.test.ts` (new) | `login rejection stores the sanitized message, clears loading, and rejects with it`; `login pending sets isLoading and clears error`; `updateProfile rejection/success transitions`; store built with only `auth` + thunks' dispatch surface |
| Adapter callbacks (context-level) | `apps/web/src/context/AuthContext.registerLogout.test.tsx` (new) — name may follow the existing test-file convention | `register rejection stores the sanitized message and rethrows (no user set)`; `register success does not authenticate`; `logout clears token and user even when the service rejects` |
| Regression | existing suites | all existing cases unchanged and green |

Negative/malformed cases the ticket originally named (`SP-108B` test table)
that were never written are covered by 1–4 above at the thunk/callback level;
do not re-roll separate `pending/fulfilled/rejected phase` suites per action
beyond what 1–4 already assert.

## Technical notes

- **Dead-export caveat (drives the test path choice):**
  `apps/web/src/context/AuthContext.tsx:228-242` (`register`) and `:244-254`
  (`logout`) inline these flows; the exported `registerThunk`
  (`authSlice.thunks.ts:48`) and `logoutThunk` (`:68`, returning a fabricated
  `{ type: '@@logout/no-op' }`) are never imported (review IR-006). Testing the
  dead exports would be vacuous; tests must go through `login`/`updateProfile`
  thunks (which are used) and the context callbacks (which are used). Removing
  the dead exports is IR-006 polish and is **out of scope** here.
- Mock style precedent: `context/AuthContext.test.tsx` (probe pattern,
  `:33-43`, `:275-287`) and `store/api.test.ts` for service-level mocking.
- The `AuthContext` render must include the Redux `Provider` (as the migrated
  wrapper already does, `AuthContext.test.tsx:27-31` / `test/providers.tsx`).
- The review's own suggested correction is the scope source for the named
  cases (`artifacts/SP-108/review.md:94-106`).

## Sizing

- **Outcome:** every auth-thunk/adapter error/loading rule in SP-108B AC4 has
  an automated negative test; DoD 8 is satisfied for those rules.
- **Time estimate:** 45–60 min: two focused test files (~8 cases), no
  production change, full-gate run. Moderate uncertainty in the render-hook
  setup reused from `AuthContext.test.tsx`.
- **Files:** production — none. Tests —
  `apps/web/src/store/authSlice.thunks.test.ts` (new),
  `apps/web/src/context/AuthContext.registerLogout.test.tsx` (new; final name
  per repo convention).
- **Start context:** this ticket; review IR-002 section
  (`artifacts/SP-108/review.md:94-106`); `authSlice.thunks.ts`,
  `authSlice.test.ts` (current 8 cases), `AuthContext.tsx:215-265`,
  `AuthContext.test.tsx` mock/probe patterns, `services/auth.ts`,
  `services/tokenStore.ts`.
- **Verification:** `pnpm --filter @studypilot/web test` (all green incl. the
  ~8 new cases; deliberately break one thunk expectation first to confirm a
  test can fail, then restore), `... typecheck`, `... lint`. Record in
  `./artifacts/SP-108F/`; update `artifacts/SP-108B/implementation.md` (AC4
  evidence + TR-108-02 citation) and the parent index row.
- **Dependencies / exclusions:** after SP-108E (same test file, one writer);
  excludes SP-108E/G and all polish findings.

## Definition of Done

DoD 1, 2, 4, 8 (AC4 rules verified); DoD 9 (records updated); DoD 10 remains
the parent re-review's. Evidence goes to `./artifacts/SP-108F/`.
