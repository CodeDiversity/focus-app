# SP-108 Combined Parent Review — Redux Toolkit adoption on the web frontend

**Parent story:** SP-108 (children SP-108A, SP-108B, SP-108C, SP-108D)
**Review date:** 2026-10-17
**Pass:** 1 (first combined parent review)
**Reviewed state:** working tree at `HEAD` = `02e94a3` ("docs(SP-108D): implementation record, parent index, queue advances to combined review"), plus two unrelated modified files (`docs/stories/EP01/SP-105/README.md`, `docs/stories/EP01/SP-105/artifacts/SP-105/review.md`) belonging to another contributor's open SP-105 work.
**Reviewed paths:** `docs/stories/SP-108/**` (README, parent coordination record, four child tickets, all artifacts), `apps/web/**` (`src/store/**`, `src/context/AuthContext.tsx` + test, `src/hooks/useResendVerification.ts` + test, `src/main.tsx`, `src/test/providers.tsx`, the six migrated test wrappers, `package.json`), root `README.md`, `.agents/skills/studypilot-frontend/SKILL.md`, lockfile state, and the Git history of every SP-108 commit.
**Report path:** `docs/stories/SP-108/artifacts/SP-108/review.md` (resolved from the README: Artifact root `./artifacts/`, Parent artifacts `./artifacts/SP-108/`).

## Scope and method

One combined review of the whole SP-108 parent scope after all four children and the integration/index task are implemented, per [review cadence](../../../.agents/review-cadence.md). No per-child review gates exist and none were required. Findings and AC results are attributed to child IDs.

Every implementer claim was re-checked against the actual code and Git history rather than trusted:

- **Code read directly:** `apps/web/src/store/{store.ts,hooks.ts,authSlice.ts,authSlice.thunks.ts,authSlice.selectors.ts,api.ts,api.test.ts,authSlice.test.ts,store.test.tsx}`, `apps/web/src/context/{AuthContext.tsx,AuthContext.test.tsx}`, `apps/web/src/hooks/{useResendVerification.ts,useResendVerification.test.tsx}`, `apps/web/src/main.tsx`, `apps/web/src/test/providers.tsx`, `apps/web/src/components/{ProtectedRoute.tsx,PublicRoute.tsx}`, `apps/web/src/App.tsx`, `apps/web/src/pages/Login.tsx`.
- **Git history inspected** (read-only) to confirm per-commit file scope and the pre-migration baseline code.
- **Greps run** for TanStack residue, unused exports and route-guard test coverage.

### Limitations (stated explicitly)

- This reviewer session has no direct shell. Every command result below was produced by a delegated read-only helper that ran the commands and returned their raw output verbatim; it was instructed not to modify, create or delete any file, not to run Git write commands, not to install anything, and never to read `.env` or any secret file. No result below is assumed.
- The delegated run reported: `pnpm --filter @studypilot/web test` → **Test Files 15 passed (15), Tests 166 passed (166)**, duration 5.27s (non-failure noise only: `act(...)` warnings in `MemoryRouter`/`RegisterPage` tests); `typecheck` → clean (`tsc --noEmit`, no output); `lint` → clean (`eslint . --max-warnings 0`, no output); `git log --oneline -10` → `02e94a3`, `37b9eb3`, `32e5dd5`, `d164841`, `dcc9705`, `607917d`, `57a8850`, `5cce85e`, `7439f8f`, `5308efa`; `git diff --stat d164841..HEAD` → 10 files (incl. `package-lock.json` −18181, `pnpm-lock.yaml` −314); scoped TanStack grep → no matches, exit 1.
- **Not run by the reviewer:** `pnpm --filter @studypilot/web build`, `pnpm install --frozen-lockfile`, and the backend suites. The build and frozen-lockfile results are therefore the implementer's recorded results, not independently reproduced. Backend suites are out of scope for this parent (no backend file changed — see the AC3/DoD 3 result).
- **Dev-server smoke:** not performed by the implementer (no registered test-account credential; obtaining one would require reading secret files or writing into the user's local dev database). This reviewer did not attempt it either. The one AC4 element that was never exercised at runtime is recorded as such, not as verified.
- No secrets, `.env` files or credential stores were read at any point.

## Verdict

**FAIL — changes required.** SP-108 is not signed off. One blocker (a lost boot-session loading gate on guarded routes, with no test covering it) and two should-fix findings must be closed, then the combined review is re-run.

---

## Findings

### Blockers

| ID | Severity | Finding |
|---|---|---|
| IR-001 | Blocker | The boot "session restoring" loading gate on guarded routes was lost: `isLoading` now starts `false` and nothing sets it `true` during boot restore, so a refreshing student on `/dashboard` or `/profile` is redirected to `/login`. |
| IR-002 | Should-fix | SP-108B AC4's thunk error/loading paths have **no** automated test: `authSlice.test.ts` covers pure reducers only, and the ticket's own named cases (`loginPending/loading/fulfilled/rejected`, "login failure stores the sanitized message and rethrows", register/logout paths) were never written. DoD 8 FAIL for those business rules. |
| IR-003 | Should-fix | SP-108A has no `implementation.md` — only a `checkpoint.md`. The implementation summary the reviewer and DoD auditor read is missing for a child that changed the web manifest and added the app-wide store. |

### Optional polish

| ID | Severity | Finding |
|---|---|---|
| IR-004 | Polish | `SP-108B-auth-state-slice.md:7` still reads `**Status:** Needs refinement` although the queue row, the checkpoints and `artifacts/SP-108B/implementation.md` all record it implemented and reviewed-refined. B also has checkpoints cp1/cp2 only, while its sizing block defines a CP3 verification checkpoint. |
| IR-005 | Polish | The parent index's "Combined Git scope" block (`git log --oneline 55aa794..37b9eb3`) omits `02e94a3`, the commit that actually carries the artifacts and the queue advance, and SP-108D's diff-containment claim lists only its own files while `d164841..HEAD` also contains `docs/stories/SP-108/README.md` and `SP-108D-…md` (queue/ticket status updates, which are the implementer's permitted narrow exception). |
| IR-006 | Polish | Dead exports in the new store code: `registerThunk` (`authSlice.thunks.ts:48`), `logoutThunk` (`:68`) and `selectIsAuthenticated` (`authSlice.selectors.ts:4`) are never imported — `AuthContext.tsx:228-254` inlines register/logout. `logoutThunk` additionally returns a fabricated no-op action object `{ type: '@@logout/no-op' }`, which is misleading dead code. |
| IR-007 | Polish | `authSlice.test.ts:39-45` ("setUser with the same id keeps banner state") never sets a dismissed banner first, so it asserts `false === false` and does not actually cover the "same id keeps dismissal" rule. |
| IR-008 | Polish | SP-108A AC3 asked for `RootState` / `AppDispatch` exported from `src/store/hooks.ts`; they are exported from `src/store/store.ts:19-20` and `hooks.ts` only imports them. Cosmetic contract deviation, no consumer impact. |

---

### IR-001 — Blocker: the boot-session loading gate on guarded routes is gone

**Original claim.** SP-108B AC3 and the README quality gate assert the SP-105G/boot semantics are preserved "exactly", and the README gate row states "Routing/guards unchanged (RD3 adapter keeps `isAuthenticated`/`isLoading` semantics)" (`docs/stories/SP-108/README.md:118`). SP-108B's own mapping table records the pre-migration value as `useState<boolean>(true)` → `useSelector((s) => s.auth.isLoading)` (`SP-108B-auth-state-slice.md:247`).

**Gap.** The slice initialises the flag to `false` and the boot restore never raises it:

- `apps/web/src/store/authSlice.ts:14-19` — `initialState.isLoading: false`.
- `apps/web/src/context/AuthContext.tsx:175-206` — the boot-restore effect dispatches only `setLoading(false)` in its `finally` (`:195`). There is no `setLoading(true)` before `authService.refreshToken()` (`:186`).
- The only `setLoading(true)` dispatches are inside the `login` and `updateProfile` thunks (`authSlice.thunks.ts:14`, `:33`) and the inlined `register` callback (`AuthContext.tsx:230`).

**Primary evidence of the regression.** Pre-migration code (read from Git, `git show 262b8fa:apps/web/src/context/AuthContext.tsx`):

```text
35:  const [user, setUser] = useState<User | null>(null);
36:  const [isLoading, setIsLoading] = useState<boolean>(true);
37:  const [error, setError] = useState<string | null>(null);
```

The documented contract is explicit and was carried by earlier stories: `docs/stories/EP01/SP-102-login-logout-sessions.md:76` — "they already gate on `isLoading`/`isAuthenticated`, so boot refresh must hold `isLoading=true` until the silent refresh settles" — and `docs/artifacts/STUDY-9/implementation.md:99-100` — "session restore on mount is one silent `POST /auth/refresh` holding `isLoading=true` until it settles".

**Concrete counterexample.** A student with a live httpOnly refresh cookie hard-refreshes `/dashboard`:

1. First render: Redux `auth` state is `{ user: null, isLoading: false }`. `ProtectedRoute` (`components/ProtectedRoute.tsx:5-19`) reads `isLoading === false` and `isAuthenticated === false`, skips the spinner branch and returns `<Navigate to="/login" state={{ from: location }} replace />` — while the boot `POST /auth/refresh` is still in flight.
2. `PublicRoute` renders the login form (it also sees `isLoading === false`).
3. The refresh resolves, `applyUser(response.user)` runs (`AuthContext.tsx:187`), and `PublicRoute` redirects back to `/dashboard` (`PublicRoute.tsx:16-18`).

Net observable effects: a `/dashboard` → `/login` → `/dashboard` URL bounce and a flashed login form on every refresh of a protected page, and — because the bounce's `Navigate` carries no `state.from` — `Login.tsx:35-37` falls back to `/dashboard`, so a deep link such as `/profile` loses its post-login destination. Pre-migration behaviour was a spinner until the silent refresh settled, with no route change at all.

**Why 166/166 green does not cover it.** No test file references `ProtectedRoute` or `PublicRoute` (grep over `apps/web/src`: the only hits are `App.tsx:11-12,24,30` and the two component files themselves). `AuthContext.test.tsx` renders its own `Probe` components (`:33-43`, `:275-287`) instead of the real guards, and the one case that renders at `/dashboard` (`:120-133`) renders a static `<div>Dashboard page</div>` route. `Dashboard.tsx:6-8` has the same `isLoading` gate and is likewise untested.

**Suggested correction (implementer, in a fix pass — not applied by this reviewer).**

- Restore the flag before the restore request is issued: either initialise `isLoading: true` in `authSlice` (matching the pre-migration `useState(true)`, and the ticket's own mapping table), or `dispatch(setLoading(true))` at the top of the boot-restore effect before awaiting `authService.refreshToken()`. Initialising the slice to `true` is closer to the original contract and also keeps `isLoading` correct for a direct `App` mount.
- Add a regression test that exercises the real guard, not a stand-in probe: render `AuthProvider` + `PublicRoute`/`ProtectedRoute` inside a `Providers` wrapper at `/dashboard` with `authService.refreshToken` left pending, and assert the spinner renders and the location stays `/dashboard`; then resolve the refresh and assert the dashboard content renders. `AuthContext.test.tsx` (or a new `ProtectedRoute.test.tsx`) is the natural home.
- Update `authSlice.test.ts`'s "initial state has correct defaults" case (`:89-96`) to the corrected initial value.

**Acceptance condition for closure.** The guard test above is green with a pending boot refresh (no redirect, spinner shown) and green after the refresh resolves; the slice's initial `isLoading` matches the pre-migration value; the README gate row at `docs/stories/SP-108/README.md:118` is restated to match verified behavior; the full web suite, typecheck and lint stay green.

### IR-002 — Should-fix: SP-108B AC4 (thunk error/loading paths) has no automated test

**Original claim.** SP-108B AC4: "login/register/updateProfile surface sanitized errors via `getErrorMessage` into the slice `error` state; loading flags transition as before; clearError resets it. **Negative cases are tested.**" The ticket's test table (`:61`) names `loginPending/loading/fulfilled/rejected phases`, `login failure stores the sanitized message and rethrows`, `register pending/loading/fulfilled/rejected phases`, `logout pending/fulfilled/rejected phases (always clears token)` and `updateProfile pending/fulfilled/rejected phases`. The parent index marks TR-108-02 "Pass" citing `authSlice.test.ts (8)` plus `AuthContext.test.tsx (14)`.

**Gap.** `apps/web/src/store/authSlice.test.ts` (97 lines) contains eight pure-reducer cases only: `setUser` id-change / same-id / `null`, `clearUser`, `setLoading`, `setError`+`clearError`, `clearError`, initial state. No test dispatches the `login` / `updateProfile` `createAsyncThunk`s or the register path, so none of the named thunk cases exist. `artifacts/SP-108B/implementation.md:37` marks AC4 "✅ Done" and `:37`/`:41-42` cite only "AuthContext: 14/14" and "Slice: 8/8"; `artifacts/SP-108B/checkpoint-cp2.md:14` likewise marks AC4 done with no test evidence attached.

The only executed coverage of a rejected thunk is indirect: SP-108C's repair of the un-awaited dispatch was caught by `Login.test.tsx > shows an actionable error on 401 invalid credentials` (`artifacts/SP-108C/implementation.md:75-87`). `register`'s and `updateProfile`'s sanitized-error and loading-transition paths, and `logout`'s always-clears-token path, have no automated coverage at all.

**Consequence.** DoD 8 ("Business rules have automated tests") is not satisfied for AC4's error/loading rules: a future refactor of `authSlice.thunks.ts` or the `AuthContext` inline register/logout callbacks could break user-facing error handling or the always-clear-token guarantee with a green suite. The very defect C had to repair (a swallowed rejection producing a false "Logged in successfully!" toast) is the class of bug this coverage exists to catch.

**Suggested correction.** Add thunk-level tests (e.g. in `authSlice.test.ts` or a new `authSlice.thunks.test.ts`) against a mocked `services/auth`: assert `login` rejection stores the sanitized `getErrorMessage` string in `state.auth.error`, sets `isLoading` false in the `finally`, and that `updateProfile` rejection does the same; assert `register`'s rejection surfaces the sanitized message while its success path sets no user; assert `logout` clears the token and `user` even when `authService.logout` rejects. Include the negative cases the ticket names.

**Acceptance condition for closure.** Named tests exist for each of login/updateProfile/register/logout rejection paths asserting the slice `error`, the `isLoading` transition and the logout token clear; all green; the full web suite, typecheck and lint remain clean; the SP-108B implementation record cites them.

### IR-003 — Should-fix: SP-108A has no implementation record

**Original claim / expectation.** The reviewer skill treats a missing implementation summary as a documentation gap, and the frontend skill requires a story record at `<artifact-root>/<story-id>/implementation.md` that "the reviewer and DoD auditor read". `docs/artifacts/README.md` and the delivery-state convention expect both a `checkpoint.md` (progress) and a final implementation record. `artifacts/SP-108/implementation.md:45` indexes SP-108A's record as `./artifacts/SP-108A/checkpoint.md`.

**Gap.** `docs/stories/SP-108/artifacts/SP-108A/` contains only `checkpoint.md`. There is no `implementation.md` for SP-108A. The checkpoint itself is good evidence (four AC rows, 12 files/145 tests green, typecheck/lint clean, the files changed table) and it does record the RTK/RDX versions and the harmless empty-reducer warning, but a checkpoint is explicitly not a substitute for the final record (`.agents/checkpoint-execution.md`, frontend skill line 45). B, C and D each have one; A is the outlier.

**Consequence.** DoD 9's documentation element is partially unmet for SP-108A (dependency-manifest change plus the app-wide store/provider wiring), and the parent index's evidence pointer for A resolves to a progress artifact rather than a completed implementation summary.

**Suggested correction.** Write `docs/stories/SP-108/artifacts/SP-108A/implementation.md` (components/store wiring, files, AC results, test and gate evidence, deviations, open items) and repoint the parent index's child table row for A at it. The checkpoint may remain as the historical progress record.

**Acceptance condition for closure.** `artifacts/SP-108A/implementation.md` exists with AC-by-AC status and the recorded test/gate evidence, and the parent index references it.

---

## Acceptance criteria, by child

Result key: **PASS** = verified in code/tests or by delegated command output; **PARTIAL** = substantially met with a gap recorded above; **FAIL** = not met; **UNVERIFIED** = cannot be established from available evidence.

### SP-108A — store foundation (`docs/stories/SP-108/SP-108A-store-foundation.md`)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| A1 | `@reduxjs/toolkit` and `react-redux` installed in `apps/web` | PASS | `apps/web/package.json:19,29` — `"@reduxjs/toolkit": "^2.13.0"`, `"react-redux": "^9.3.0"` (d164841) |
| A2 | `src/store/store.ts` with `configureStore` + default middleware (serializability/immutability active) | PASS | `store/store.ts:5-16` — `configureStore` with `getDefaultMiddleware` (customised for RTK Query in C) |
| A3 | Typed hooks `useAppDispatch`/`useAppSelector` + `RootState`/`AppDispatch` in `src/store/hooks.ts` | PARTIAL | `hooks.ts:1-6` exports both typed hooks via `withTypes<>`; the `RootState`/`AppDispatch` types are exported from `store.ts:19-20` and only imported by `hooks.ts` (IR-008, cosmetic) |
| A4 | `main.tsx` wraps `App` in `<Provider store={store}>` inside `BrowserRouter`; app behaves as before | FAIL (as delivered, jointly with IR-001) | `main.tsx:11-19` — `StrictMode > BrowserRouter > Provider > AuthProvider > App`, TanStack provider removed by C. The "behaves exactly as before" clause is broken by the `isLoading` initial-value change introduced in B and never re-verified as a group (IR-001) |
| — | TR-108-01 store tests | PASS | `store.test.tsx:8-70` — 3 cases: middleware present (`['api','auth']` reducer keys), non-serializable payload dispatched without throwing, typed hooks render/dispatch against a `Provider` |
| — | Record completeness | FAIL | No `implementation.md` (IR-003) |

### SP-108B — auth/session state into `authSlice` (`SP-108B-auth-state-slice.md`)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| B1 | Every auth/session field in and read from the `authSlice`; no React `useState`/ref ownership | PASS | `authSlice.ts:7-19` holds `user`, `isLoading`, `error`, `isVerificationBannerDismissed`; `AuthContext.tsx:61-64` reads all four via selectors; no auth `useState` remains in the provider (coordination refs at `:69-72` are the ticket's documented D1/D2 exceptions) |
| B2 | `AuthProvider` exposes the identical 12-member `AuthContextType`; existing `AuthContext.test.tsx` cases pass | PASS | `AuthContext.tsx:32-45` (12 members, unchanged names/types) and `:267-280` value object; `AuthContext.test.tsx` modified only to add a Redux `Provider` (`:27-31`, `:118-121`) — the delegated run reports the suite green inside the 166 |
| B3 | SP-105G generation checks, single-flight guards, banner reset, session-expired handler, local session clearer preserved exactly; stale completion is a no-op | PASS | `AuthContext.tsx:83-91` (`applyUser` → `setUser` + `sessionVersion` bump), `:94-137` (flight dedup + generation/version/id triple guard), `:156-171` (generation snapshot at registration), `:175-206` (`isStale()` on boot restore), `:210-213` (`registerLocalSessionClearer` → `applyUser(null)`); regression cases green in `AuthContext.test.tsx:244-264, 312-443` |
| B4 | Thunk error/loading paths: sanitized `getErrorMessage` into slice `error`, loading transitions, `clearError`, **negative cases tested** | FAIL | Implementation present (`authSlice.thunks.ts:11-45`, `AuthContext.tsx:228-254`, `:263-265`), but **no test** exercises any thunk rejection/loading transition — see IR-002. Sanitized-error *rendering* is incidentally covered through `Login.test.tsx`; register/updateProfile/logout paths are untested |
| — | SP-105G transport untouched | PASS | `git log --all -- apps/web/src/services` shows no SP-108 commit (last touched by `510e36e`, SP-105C); `git diff --stat 5cce85e~4..d164841 -- apps/web/src/services apps/api` is empty |
| — | Record completeness | PASS | `artifacts/SP-108B/implementation.md` + `checkpoint-cp1.md` + `checkpoint-cp2.md` present (IR-004 notes the missing CP3 file and the stale ticket status line) |

### SP-108C — RTK Query replaces TanStack Query (`SP-108C-rtk-query-data-layer.md`)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| C1 | `src/store/api.ts` `createApi` whose `baseQuery` issues every request through the default-exported `services/api.ts` instance; interceptor message carried through; status as string `code`; `resendVerification` mutation; `resendErrorMessage` mapping | PASS | `store/api.ts:29-51` (delegates to `httpClient.request({ url, method, data: body })`), `:62-64` mapping, `:66-79` service; proven by `api.test.ts:67-95` (real interceptor chain via `httpClient.defaults.adapter`), `:108-125` (401 on an auth path: no `/auth/refresh`, session-expired handler uncalled) |
| C2 | `useResendVerification` contract parity (`sendEmail, isPending, isSuccess, error, secondsRemaining`); guard, trim/lowercase, 60s cooldown unchanged; `VerifyEmail.tsx`, `EmailVerificationBanner.tsx`, `resendFeedback` unmodified | PASS | `hooks/useResendVerification.ts:21-42` (`submitting` ref guard, `Date.now() < deadline`, `email.trim().toLowerCase()`, `isPending: isLoading`, `resendErrorMessage(error.code)`); `resendFeedback` unchanged at `:4`; `VerifyEmail.tsx`/`EmailVerificationBanner.tsx` absent from every SP-108 commit's file list; tests `useResendVerification.test.tsx:62-145` (trim/lowercase + single post, cooldown blocks, in-flight suppression, 400 message, network message, failed send does not start the cooldown) |
| C3 | `main.tsx` drops `QueryClientProvider`/`QueryClient`/`ReactQueryDevtools`; store registers the api reducer + middleware; shared `src/test/providers.tsx`; six wrappers migrated; two stale `store.test.tsx` assertions corrected; whole suite green; zero TanStack refs in `src` | PASS | `main.tsx:1-20` (no TanStack imports); `store/store.ts:8,14-15`; `test/providers.tsx:13-37`; wrapper migration visible in commits `7439f8f` (`Login`, `Register`) and `57a8850` (`VerifyEmail`, `ForgotPassword`, `ResetPassword`, `EmailVerificationBanner`); delegated grep exit 1 (zero matches) and delegated suite 166/166 |
| C4 | No transport regression: `services/api.ts`, `recovery.ts`, `auth.ts` unmodified; `api.test.ts` (14), `recovery.test.ts` (23), `AuthContext.test.tsx` (14) pass; 401-on-auth-path negative test | PASS | Empty Git diff for `apps/web/src/services` (delegated); the three suites are green within the delegated 166/166 run; negative test at `store/api.test.ts:108-125` |
| — | Message parity with `authService.resendVerification` | PASS | `store/api.test.ts:134-177` drives the same mocked failure through the untouched service and through `resendErrorMessage` and asserts string equality for 400 and for a network/500 failure |
| — | Out-of-scope defect found and repaired (un-awaited thunk dispatch in `AuthContext.loginFn`/`updateProfileFn`) | PASS (transparency noted) | `AuthContext.tsx:218-224, 256-261` now `await dispatch(...)` and re-throw the sanitized `payload`; documented in `artifacts/SP-108C/implementation.md:73-87`; caught by `Login.test.tsx`, which is what made the suite green |

### SP-108D — TanStack removal, doc flip, verification (`SP-108D-tanstack-removal-verification.md`)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| D1 | TanStack packages removed from `apps/web/package.json`; `pnpm-lock.yaml` regenerated with no `@tanstack`; `package-lock.json` deleted; `pnpm install --frozen-lockfile` succeeds | PASS (frozen-lockfile install = implementer-recorded, UNVERIFIED by reviewer) | `apps/web/package.json` has no `@tanstack` (grep); `package-lock.json` absent from the working tree and deleted in `32e5dd5` (`git diff --stat d164841..HEAD` shows `package-lock.json | 18181 -------`); `pnpm-lock.yaml` −314 lines; delegated grep over `pnpm-lock.yaml` → no matches |
| D2 | Scoped grep returns no matches | PASS | Delegated `grep -rniE "tanstack\|queryclient\|usemutation\|reactquerydevtools" apps/web/src apps/web/package.json pnpm-lock.yaml README.md .agents/skills/studypilot-frontend/SKILL.md` → no output, exit 1. Independent repo-wide grep shows remaining "tanstack" mentions only under `docs/` (historical records of RD2/RD4 and past stories), which the ticket explicitly scopes out |
| D3 | Docs flip: `README.md:33` Redux Toolkit + RTK Query line; frontend skill's description, stack and data-fetching guidance no longer direct implementers to TanStack; no `docs/` edit | PASS | `README.md:33` reads "**State Management**: Redux Toolkit + RTK Query (auth state in an RTK slice; server data via RTK Query over the shared axios transport in `apps/web/src/services/api.ts`)"; `.agents/skills/studypilot-frontend/SKILL.md:3` ("RTK Query data flows"), `:12` ("Redux Toolkit + RTK Query for data fetching"), `:41` ("Compose domain-specific RTK Query endpoints/services"); `docs/epics/EP05-student-dashboard.md:47` already names RTK Query and was not edited by SP-108 |
| D4 | Child record + parent index written with the web suite at the current baseline, typecheck, lint, build, frozen-lockfile and grep results | PARTIAL | `artifacts/SP-108D/implementation.md` and `artifacts/SP-108/implementation.md` both exist; suite/typecheck/lint independently reproduced (166/166, clean, clean). `build` and `pnpm install --frozen-lockfile` are recorded but not independently reproduced by this review. Dev-server smoke recorded as **not performed** with a stated reason (no registered test-account credential; obtaining one would require reading secret files or writing to the user's dev DB) — the one AC4 element never exercised at runtime. The Git-scope block omits the artifacts commit `02e94a3` (IR-005) |
| — | No application source or test file changed by D | PASS | `git show --stat 32e5dd5` / `37b9eb3` / `02e94a3` touch `apps/web/package.json`, `pnpm-lock.yaml`, `package-lock.json`, `README.md`, the frontend SKILL and docs only |

### Parent-level requirements (README traceability)

| Req | Result | Evidence |
|---|---|---|
| RQ-108-01 Install RTK and wire the store | PASS | A1–A3 (A4 partially blocked by IR-001) |
| RQ-108-02 All auth/session client state in Redux | PASS | `authSlice.ts` + `AuthContext.tsx:61-64`; coordination refs documented as D1/D2 exceptions |
| RQ-108-03 RTK Query replaces TanStack for every fetch/mutation | PASS | `store/api.ts`, `hooks/useResendVerification.ts`, `main.tsx`, zero-hit grep |
| RQ-108-04 No TanStack dependency remains in the web app | PASS | `package.json`, lockfiles, zero-hit grep |
| RQ-108-05 SP-105G session-generation/barrier semantics preserved **exactly** | PARTIAL | Generation/barrier logic verified line-by-line in `AuthContext.tsx` and its 8 regression tests (B3/C4) — **except** the boot-loading contract of the same session-restore surface, which regressed (IR-001) |
| RQ-108-06 All web suites, typecheck and lint stay green | PASS | Delegated run: 166/166, typecheck clean, lint clean |

---

## Definition of Done audit (`docs/epics/README.md:26-41`)

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | The functional acceptance criteria pass | **FAIL** | A4/B1–B3, C1–C4 and D1–D3 verified; B4 has no tests (IR-002) and the boot-session behaviour regressed against its documented contract (IR-001) |
| 2 | Frontend and backend validation handle invalid input | PASS | No new inputs; the zod schemas in `Login.tsx:13-18` and the other forms are untouched by every SP-108 commit; C's 400/network message paths are tested (`useResendVerification.test.tsx:116-145`) |
| 3 | Academic data is scoped to the authenticated student | PASS (N/A by recorded reason, independently confirmed) | SP-108 changed no backend file and no academic-data query: empty diff for `apps/api` and `apps/web/src/services` across the A/B and C commits; the only endpoint touched is the pre-existing `/auth/resend-verification`, sent through the unchanged axios instance with `AUTH_PATHS` handling, proven by `store/api.test.ts:108-125`. The 404/403 anti-existence-oracle convention in `AGENTS.md` is unaffected |
| 4 | API errors produce actionable messages | PASS | `authSlice.thunks.ts:21,40` and `AuthContext.tsx:235` use `getErrorMessage`; `store/api.ts:53-64` reproduces the two existing user-facing strings byte-for-byte, pinned by the parity tests at `store/api.test.ts:164-177` |
| 5 | Loading, empty and error states are handled | **FAIL** | The route guards' and `Dashboard`'s boot **loading** state no longer engages during session restore (IR-001); empty/error states are otherwise unchanged and covered by existing suites |
| 6 | Core interactions support keyboard accessibility | PASS (N/A by recorded reason) | No component markup, focus management or ARIA attribute changed — `App.tsx`, `ProtectedRoute.tsx`, `PublicRoute.tsx` and the form pages appear in no SP-108 source commit |
| 7 | Responsive layouts work on desktop and mobile | PASS (N/A by recorded reason) | No layout or styling file changed; `src/index.css` untouched |
| 8 | Business rules have automated tests | **FAIL** | Strong coverage for the RTK Query layer (`store/api.test.ts` 8 cases, `useResendVerification.test.tsx` 5 cases) and the SP-105G generation rules (`AuthContext.test.tsx` 14 cases), but AC4's thunk error/loading rules have no test (IR-002) and the route-guard boot rule has no test at all (IR-001) |
| 9 | API changes and migrations are documented | PASS with a gap | No API, Prisma model, migration, DTO or env change; the architecture change is documented in `README.md:33` and the frontend SKILL (D3), and the parent index exists — but SP-108A has no implementation record (IR-003) and the parent index's Git scope is incomplete (IR-005) |
| 10 | The feature has been reviewed in an integrated development environment | **FAIL** (this review; not signed off) | Combined review performed; verdict FAIL on IR-001 (blocker) and IR-002/IR-003 (should-fix) |

---

## Out-of-scope check

- No AI features, syllabus parsing, LMS integration, grade calculation, flashcard or native-mobile work was introduced. PASS.
- No backend, Prisma, migration or endpoint change. PASS (empty diff, delegated).
- Token handling unchanged: still in-memory through `services/api.ts`; the RTK Query mutation stores only the e-mail argument, never a link token (the `VerifyEmail.test.tsx` mutation-state assertion was ported rather than dropped, per `artifacts/SP-108C/implementation.md:110-111`).
- Uniform 404 anti-enumeration posture untouched.
- No secret was read, written, or committed. Nothing in the diff resembles a credential.

## Handoff

1. **IR-001 (blocker)** — fix pass by the `implementer` on SP-108B's surface: restore `isLoading: true` at boot (or dispatch `setLoading(true)` before the silent refresh) and add a real route-guard regression test. This is the only blocking condition.
2. **IR-002 (should-fix)** — add the named thunk error/loading tests and cite them in the SP-108B record.
3. **IR-003 (should-fix)** — write `artifacts/SP-108A/implementation.md` and repoint the parent index.
4. **IR-004…IR-008 (polish)** — optional; the stale SP-108B status line, the incomplete Git-scope block, the dead `registerThunk`/`logoutThunk`/`selectIsAuthenticated` exports, the vacuous same-id banner case and A's `hooks.ts` type-export deviation.
5. No decisions require the user. The dev-server smoke gap stays recorded as not performed with its stated reason unless the user supplies a registered test account.

**Verdict: SP-108 does not meet the Definition of Done.** Failing conditions: DoD 1, DoD 5, DoD 8 and DoD 10, driven by IR-001, IR-002 and IR-003.
