# SP-107C implementation record

**Status:** implementation complete — awaiting parent review
**Date:** 2026-10-18
**Implementer:** implementer (single writer; dispatch `SP107-implementer-C` under the SP-107 autopilot run)
**Baseline:** `2a01a87` (HEAD before the first included change)
**Scope:** frontend — `/onboarding` route (inside `ProtectedRoute`, standard `Layout`, D107-3), onboarding slice + thunks, wizard shell (step indicator, skip from step 2+, sign-out, loading/error states), step 1 preferences form (name + time zone, reuses SP-106 `updateProfile`), login-entry redirect. Excluded: step 2/3 forms (SP-107D/E), boot-time gate / header affordance (EP05), integration sign-off (SP-107F), `docs/jira-sync/`, other stories' artifacts.

## Changed paths

| Path | Change |
|---|---|
| `apps/web/src/features/onboarding/api/onboardingApi.ts` | new — `OnboardingState`/`UpdateOnboardingRequest` contract types + `onboardingService` (GET/PATCH `/onboarding` on the shared `httpClient`) |
| `apps/web/src/features/onboarding/model/onboardingSlice.ts` | new — state `{ status, step, completed, completedAt, semesterId, error }` + thunks `fetchOnboardingState`/`advanceOnboarding`/`completeOnboarding` + field-level selectors |
| `apps/web/src/features/onboarding/model/onboardingSlice.test.ts` | new — 7 tests |
| `apps/web/src/features/onboarding/ui/WizardShell.tsx` | new — step indicator (`aria-current`), step content by step (1 real, 2/3 "coming" placeholders), skip (steps 2+ only, D107-4), sign-out, loading/error states, announced status |
| `apps/web/src/features/onboarding/ui/Step1Preferences.tsx` | new — name + time zone form (D106-3 pre-fill, SP-106C hydration pattern, zod client validation, `updateProfile` → `advanceOnboarding(2)`, field-level 400 `errors` map, idempotent retry) |
| `apps/web/src/features/onboarding/ui/Step1Preferences.test.tsx` | new — 13 tests |
| `apps/web/src/pages/onboarding/ui/OnboardingPage.tsx` | new — fetch-on-mount (idle only), completed → `/dashboard` redirect, renders the shell |
| `apps/web/src/pages/onboarding/ui/OnboardingPage.test.tsx` | new — 14 tests |
| `apps/web/src/app/App.tsx` | `/onboarding` route inside the existing `ProtectedRoute` group |
| `apps/web/src/app/store/store.ts` | registers the `onboarding` reducer (auxiliary — F-107C-1) |
| `apps/web/src/app/store/store.test.tsx` | pinned reducer-key/state-size expectations updated to 3 keys incl. `onboarding` (F-107C-2) |
| `apps/web/src/test/providers.tsx` | `makeTestStore()` registers the `onboarding` reducer (auxiliary — F-107C-1) |
| `apps/web/src/pages/login/ui/LoginPage.tsx` | post-login `fetchOnboardingState` + branch (completed → `from`/`/dashboard`; not-completed **or fetch failure** → `/onboarding`) |
| `apps/web/src/pages/login/ui/LoginPage.test.tsx` | extended with 3 onboarding-branch cases; pre-existing cases preserved via a completed default in `beforeEach` |
| `docs/stories/EP01/SP-107/README.md` | execution fields + queue row C + queue summary only (planner content untouched) |
| `docs/stories/EP01/SP-107/artifacts/SP-107C/` | this record + [checkpoint](./checkpoint.md) |

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 — `/onboarding` protected (inside `ProtectedRoute`, standard `Layout`, D107-3); loads state (slice if already fetched, else `GET /onboarding`); `completed` → `/dashboard`; else render at the stored step (resume, AC-107-03) | Pass | `App.tsx` route inside the `ProtectedRoute` group; `OnboardingPage.test.tsx`: fetch-on-mount when idle, reuse of an already-fetched state (no re-fetch), completed → dashboard redirect, resume at step 2 (announced + `aria-current` indicator) and step 3 |
| 2 — Login entry: after a successful login the app fetches the onboarding state and navigates to `/onboarding` when not completed, else to `from`/`/dashboard`; registration unchanged | Pass | `LoginPage.test.tsx` (extended): not-completed → `/onboarding`; completed → `from` (`/profile` case); fetch failure → `/onboarding` (F-107C-3) with the login success toast still fired; all 7 pre-existing login cases preserved |
| 3 — Step 1: name + time zone pre-filled (D106-3: stored zone, browser zone when still the `"UTC"` default); client validation (name non-empty ≤ 100; valid IANA zone — select-by-construction + `isValidTimeZone` safety net); submit → `updateProfile` **then** `PATCH /onboarding { step: 2 }`; profile-save failure → field errors, stays on step 1; progress-save failure → actionable error + idempotent retry | Pass | `Step1Preferences.test.tsx` (13): pre-fill rules incl. the SP-106C hydration re-seed (IR-106-01) and the name-only payload rule; empty/101-char name and invalid-zone rejections (no API call); submit order proven by invocation call order (profile save strictly precedes the progress save); 400 `errors.timeZone` rendered under the select with `aria-invalid` (toast suppressed, no duplication); non-400 failure → sanitized toast; progress-save failure → slice error + step kept + resubmit retry; in-flight disabling |
| 4 — Skip visible on steps 2/3 only (D107-4); sends `PATCH /onboarding { completed: true }` and navigates to `/dashboard` | Pass | `OnboardingPage.test.tsx`: skip hidden on step 1, visible on steps 2 and 3; success → `{ completed: true }` called + dashboard redirect + terminal slice state; failure → wizard kept, actionable error shown, no redirect (the button is the retry) |
| 5 — Wizard footer offers sign-out (exit + resume path) | Pass | `OnboardingPage.test.tsx`: sign-out button in the footer calls `authService.logout`; also present on the fetch-failure screen |
| 6 — Loading (spinner), error (message + retry), success states; keyboard operable with visible focus and announced status; mobile + desktop | Pass | `OnboardingPage.test.tsx`: `role="status"` spinner on idle/loading; `role="alert"` fetch failure + "Try again" recovery; keyboard-only step-1 completion (focus → tab → tab → Enter advances to step 2); announced step line (`aria-live="polite"`) + `aria-current="step"` indicator; responsive container class contract (`max-w-2xl px-4 sm:px-6 lg:px-8`) |
| 7 — A completed or skipped student who navigates directly to `/onboarding` is redirected to `/dashboard` and never sees the wizard again | Pass | `OnboardingPage.test.tsx`: seeded `completed` state → dashboard rendered, wizard absent (same terminal-redirect mechanism as AC 1; the slice flip from a skip in the same session is covered by AC 4) |

DoD (ticket): 1, 2, 4, 5, 6, 7, 8 pass as above; 3 N/A (no academic-data queries in this child — own-state endpoint only; semester/course scoping is SP-107B's, proven there); 9 N/A (no API changes — consumes the settled SP-107A/SP-106 contracts); 10 via SP-107F sign-off + the combined parent review (not this child).

## Contract consumed (unchanged)

```text
GET /onboarding           → { step, completed, completedAt, semesterId }   (SP-107A)
PATCH /onboarding         → same shape; 400 field-level · 409 terminal · 401   (SP-107A)
PUT/PATCH /users/me       → existing SP-106 contract (`updateProfile` thunk, `Select`, D106-3)
```

No contract deviation: the `onboardingService` types mirror the shared API
contract in the [breakdown README](../../README.md#shared-api-contract) field
for field; rejections are sanitized through the shared `extractApiError`/
`apiErrorMessage`/`getFieldError` helpers (the `FieldValidationPipe` message
*array* is joined, D106-6 — same pattern as the SP-106C `updateProfile` thunk).

## Verification

All commands from `apps/web` (2026-10-18, re-run in the closeout context):

| Check | Command | Result |
|---|---|---|
| Full suite | `pnpm exec vitest run` | **22/22 files, 238/238 tests passed, 0 skipped** (baseline at `2a01a87`: 19 files / 201 tests; +3 new test files — slice 7, step 1 13, page 14 — and +3 login cases = +37 tests; the re-keyed `store.test.tsx` keeps its 3) |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | exit 0 |
| Lint | `pnpm run lint` (`--max-warnings 0`) | exit 0 (after a prettier auto-fix pass over the 4 SP-107C files; re-run clean) |

Tested state: jsdom component/unit tests — `onboardingService`,
`authService` and `userService` are mocked in every new/extended spec; no real
HTTP, no database, no `.env*` read. The slice spec runs against the shared
`makeTestStore()` (F-107C-5) so the thunks' `RootState`-typed dispatch
type-checks.

## Findings / Deviations

| ID | Finding | Disposition |
|---|---|---|
| F-107C-1 | Auxiliary files beyond the ticket's file list: the slice must be registered in `app/store/store.ts` and `test/providers.tsx` `makeTestStore()` to function; the ticket lists neither. | **Fixed** — included in scope as necessary registration (mirrors how `authSlice` is registered). |
| F-107C-2 | `store.test.tsx` pins the reducer key set (`['api', 'auth']`) and the state size (`2`); adding the onboarding reducer breaks both assertions. | **Fixed** — expectations updated to 3 keys / size 3, with a comment naming SP-107C. |
| F-107C-3 | The ticket is silent on the post-login onboarding-fetch *failure* branch (AC-2 defines only the completed/not-completed branches). | **Fixed** — navigate to `/onboarding` on fetch failure: the page renders its actionable error + retry state and the standard header still offers dashboard/sign-out, so no student is stranded; keeps the wizard the single post-login entry (AC-107-01). **Flagged for parent review.** |
| F-107C-4 | Slice `status` semantics: a naive implementation would let `advanceOnboarding`/`completeOnboarding` flip `status` to `loading`, making the shell swap the form for a spinner mid-submit. | **Fixed** (design recorded in the slice header) — only `fetchOnboardingState` drives `status` (idle→loading→ready/error); the write thunks update fields on success and set `error` on failure, keeping the previous step (retry is idempotent — the step-1 data is already persisted). UI busy state is component-local (`isSubmitting`/`isSkipping`). |
| F-107C-5 | The slice test originally used a local onboarding-only store, which does not typecheck: RTK `configureStore` infers `dispatch` from the full state shape, so thunks typed against the app `RootState` reject a narrower store. | **Fixed** — the spec uses the shared `makeTestStore()` (auth + onboarding + api, same middleware as the app store); only the `onboarding` slice is exercised. Recorded retrospectively at closeout (arose during slice-test authoring). |

Design decisions (recorded in the [checkpoint](./checkpoint.md); none change
the contract):

- `onboardingApi.ts` is a plain axios service + `createAsyncThunk` (mirroring
  `entities/user/api/userService.ts` and the SP-106 `updateProfile` pattern)
  rather than RTK Query: the slice owns the wizard's state machine, and a plain
  service keeps the write path mockable exactly like the SP-106 thunks.
- `LoginPage` computes `completed` as
  `fetchOnboardingState.fulfilled.match(result) && result.payload.completed` —
  a *rejected* fetch carries the sanitized string message as its payload, so
  the `fulfilled.match` guard is required for both typing and correctness.
- The step-1 clock line is guarded: `formatDateTime` throws on a zone the
  runtime rejects, so the rendered time is `null` when `isValidTimeZone` fails;
  the raw zone value always renders (the clock is the optional part of the line).
- Test-environment notes (jsdom): `userEvent.keyboard('{SelectAll}…')` does not
  select in jsdom, so the keyboard-only test uses pre-filled valid values +
  tab + Enter; the ARIA `alert` role is name-from-author, so tests query by
  role and assert on the content; `authService.logout` returns
  `Promise<void>`, so `mockResolvedValue()` takes no argument.

**Open findings: none.** F-107C-3 is a recorded design decision flagged for the
parent review (the ticket left the branch unspecified); all others are fixed
with the evidence above. No deviations from the ticket's ACs, the shared API
contract, or the decision register (D107-3/4, D106-3).

## Commit scope

One scoped commit (hash in the returned closeout) on `main` from baseline
`2a01a87` covering exactly the "Changed paths" table above. The
coordinator-owned `## Autopilot` run-record section of the SP-107 README was
**not** modified by this child.
