# SP-109F: `features/session`, `features/email-verification`, `app/store`

**Story ID:** SP-109F
**Epic:** Cross-cutting technical task (standalone; see [SP-109](./SP-109.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Queued (SP-109E must land first)
**Dependencies:** SP-109E
**Jira key:** STUDY-50 (verified 2026-10-17)

## Summary and bounded scope

Put every piece of client state in the folder that owns it — the requirement
the user named explicitly ("all the components, **slices**, etc"):
`authSlice` + thunks + selectors → `features/session/model/`, the RTK Query API
→ `features/session/api/`, the resend-verification hook →
`features/email-verification/model/`, and the store + typed hooks →
`app/store/`. `src/store/` and `src/hooks/` no longer exist.

Every exported name, the slice's initial state, action names, thunk names,
`reducerPath`, `keepUnusedDataFor`, the axios `baseQuery` and the boot
`isLoading: true` default stay exactly as SP-108 left them — this is a
relocation, verified by the SP-108A–F suites running from their new paths.

Excluded: widgets (G), pages/app shell (H), boundary proof/docs (I), and
splitting the RTK Query API per feature (RD10 follow-up).

## Source requirement references

RQ-109-01, RQ-109-03, RQ-109-04, RQ-109-06; RD7, RD10 in the
[breakdown README](./README.md); SP-108 RQ-108-02/03 and its TR rows preserved
as regression; shared [DoD](../../epics/README.md#definition-of-done) items 1,
4, 5, 8, 9.

## Acceptance criteria

1. `src/store/authSlice.ts`, `authSlice.selectors.ts`, `authSlice.thunks.ts`,
   `authSlice.test.ts`, `authSlice.thunks.test.ts` →
   `src/features/session/model/` (same filenames). The slice's state shape,
   `initialState` (`isLoading: true`, SP-108E/IR-001), reducer name `auth`,
   exported action creators, `login`/`updateProfile` thunk names and their
   `rejectWithValue` payloads are unchanged.
2. `src/store/api.ts` + `src/store/api.test.ts` → `src/features/session/api/sessionApi.ts`
   + `src/features/session/api/sessionApi.test.ts`, keeping `api`,
   `axiosBaseQuery`, `AxiosBaseQueryArgs`, `AxiosBaseQueryError`,
   `resendErrorMessage`, `RESEND_INVALID_EMAIL_MESSAGE`,
   `RESEND_FALLBACK_MESSAGE` and `useResendVerificationMutation`, and the
   `reducerPath: 'api'` / `keepUnusedDataFor: 300` configuration.
3. `src/hooks/useResendVerification.ts` + its test →
   `src/features/email-verification/model/` (same filenames, `resendFeedback`
   string unchanged). `src/hooks/` no longer exists.
4. `src/store/store.ts`, `src/store/hooks.ts`, `src/store/store.test.tsx` →
   `src/app/store/` (same filenames), still exporting `store`, `AppStore`,
   `RootState`, `AppDispatch`, `useAppDispatch`, `useAppSelector`.
   `src/store/` no longer exists.
5. Import rewrites: `src/main.tsx` (`./store/store` → `@/app/store/store`);
   `src/test/providers.tsx` (`../store/authSlice` →
   `@/features/session/model/authSlice`, `../store/api` →
   `@/features/session/api/sessionApi` — RD8 keeps this file in place);
   `src/features/auth/model/AuthContext.tsx` (`../store/*` →
   `@/features/session/model/*`, `../store/hooks` → `@/app/store/hooks` per
   RD7 — the only file allowed to import upward from `app`);
   `src/pages/VerifyEmail.tsx` (`../hooks/useResendVerification` →
   `@/features/email-verification/model/useResendVerification`);
   `src/components/EmailVerificationBanner.tsx` and its test (same hook, plus
   `@/features/auth/model/AuthContext`). Any doc comment that names a moved
   path is updated.
6. `pnpm --filter @studypilot/web test` → 19 files / 193 tests green with no
   edited assertions; `typecheck` → exit 0; `lint` → exit 0.

## Tests (future obligations)

| Area | File | Named cases |
|---|---|---|
| Slice reducers | `src/features/session/model/authSlice.test.ts` (moved) | 8 reducer cases + SP-108E boot-value cases, unchanged |
| Thunks | `src/features/session/model/authSlice.thunks.test.ts` (moved) | 4 SP-108F cases — `login`/`updateProfile` phases, sanitized error, loading transitions |
| RTK Query API | `src/features/session/api/sessionApi.test.ts` (moved) | axios `baseQuery` shape, `resendErrorMessage` parity cases, mutation wiring |
| Store wiring | `src/app/store/store.test.tsx` (moved) | `useAppDispatch`/`useAppSelector` against a real store; serializability case |
| Resend hook | `src/features/email-verification/model/useResendVerification.test.tsx` (moved) | pending/cooldown/duplicate-suppression/error cases |
| Test-harness wiring | `src/test/providers.tsx` (edited imports) | every suite using `Providers`/`makeTestStore` stays green (Login, Register, Profile, VerifyEmail, ForgotPassword, ResetPassword, banner, guards) |

## Technical notes

### Inspected code (2026-10-17, planner)

- `src/store/store.ts` (19 lines) — `configureStore` with `auth` reducer, `[api.reducerPath]`
  and `api.middleware`, exporting `store` and the `AppStore`/`RootState`/
  `AppDispatch` types (SP-108A).
- `src/store/hooks.ts` (6 lines) — typed `useAppDispatch`/`useAppSelector`
  (SP-108A; review IR-008 noted the type-import direction, which is unchanged here).
- `src/store/authSlice.ts:14-19` — `initialState.isLoading = true` with the
  SP-108E contract comment; must survive the move verbatim.
- `src/store/authSlice.thunks.ts:4-7` — imports `authService`, `tokenStore`,
  `utils/errors`, `SessionUser`, the slice actions and `AppStore`; after this
  child these become `@/features/auth/api/authService`,
  `@/shared/api/tokenStore`, `@/shared/lib/errors`,
  `@/entities/user/model/types`, `./authSlice`, `@/app/store/store` (RD7).
- `src/store/api.ts:66-79` — one RTK Query API (`resendVerification`) with
  `axiosBaseQuery` delegating to `shared/api/httpClient` (SP-108 RD4). RD10:
  kept as one unit; per-feature APIs start with EP02+.
- `src/hooks/useResendVerification.ts` (42 lines) — RTK Query mutation wrapper
  with cooldown state; consumed by the page and the banner.
- `src/test/providers.tsx:5-6` — `makeTestStore` composes the auth reducer and
  the RTK API; RD8 exempts this file from layer rules, so it may import both
  `features/session` and `app/store`.
- `src/main.tsx` — imports `./store/store` today; H owns the provider
  restructuring, so this child changes the import path only.

### Proposed (not verified)

- Keep `store/` inside `app/` as `app/store/` rather than a top-level `src/store/`
  so the store is unambiguously app wiring (RD7's exception stays small).
- No rename of `api` → `sessionApi` for the exported symbol; only the filename
  changes, so `store.ts` and `providers.tsx` keep working with a one-line edit.

## Sizing

- **Outcome:** all Redux/RTK state, the resend hook and the store live in
  feature or app folders, with `src/store/` and `src/hooks/` gone.
- **Time estimate:** 60–90 min: 10 file moves, ~10 import rewrites (including
  the shared test harness), three verification commands. Low uncertainty — every
  production edit is a path change and all five suites move unchanged.
- **Files:** production — `src/features/session/model/{authSlice,authSlice.selectors,authSlice.thunks}.ts`,
  `src/features/session/api/sessionApi.ts`,
  `src/features/email-verification/model/useResendVerification.ts`,
  `src/app/store/{store,hooks}.ts` (new paths); `src/main.tsx`,
  `src/test/providers.tsx`,
  `src/features/auth/model/AuthContext.tsx`,
  `src/pages/VerifyEmail.tsx`, `src/components/EmailVerificationBanner.tsx`
  (imports); `src/store/*`, `src/hooks/*` deleted. Tests — 5 moved suites
  (`authSlice.test.ts`, `authSlice.thunks.test.ts`, `api.test.ts`,
  `store.test.tsx`, `useResendVerification.test.tsx`).
- **Start context:** this ticket; [breakdown README](./README.md) *Target
  structure*, RD7/RD8/RD10; `apps/web/src/store/*` (all files),
  `src/test/providers.tsx`, `src/main.tsx`.
- **Verification:** `pnpm --filter @studypilot/web test` → 19 files / 193 tests;
  `typecheck` → exit 0; `lint` → exit 0; `grep -rn "src/store\|store/authSlice\|hooks/useResendVerification" apps/web/src`
  → no matches outside comments.
- **Dependencies / exclusions:** E (auth feature exists as a folder). Excludes
  widgets (G), pages/app providers (H), boundary proof/docs (I), RTK API
  per-feature split (RD10 follow-up).

## Definition of Done

DoD 1 and 8 apply; DoD 5 (loading states) is proven preserved by the SP-108E
boot-value cases running from the new path; DoD 4 preserved by the unchanged
sanitized-error paths in the moved thunk/API suites. DoD 2/3/6/7 N/A (no
validation, backend data access, keyboard or responsive change). DoD 9 covered by
this ticket and the breakdown. DoD 10 belongs to the combined SP-109 review.
Evidence goes to `./artifacts/SP-109F/`.

## Tracker reference

`STUDY-50` (verified 2026-10-17; RD11 superseded — parent `STUDY-44`).

## Out of scope

- Widgets — [SP-109G](./SP-109G-widgets.md).
- Pages + `app/App.tsx` + `AppProviders` — [SP-109H](./SP-109H-pages-and-app-shell.md).
- Boundary proof, root README, final verification — [SP-109I](./SP-109I-boundaries-docs-verification.md).
