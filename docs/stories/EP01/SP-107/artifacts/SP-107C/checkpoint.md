# SP-107C checkpoint

Updated: 2026-10-18 20:57 EDT (dispatch complete)
Execution state: [SP-107 README queue](../../README.md) — row C `Implemented — awaiting parent review`; Active substory `None`; Next substory SP-107D — implement
Story: [SP-107C-wizard-shell-and-step1.md](../../SP-107C-wizard-shell-and-step1.md)
Review unit: SP-107 (parent; index will live at `../SP-107/implementation.md`, written by SP-107F)
Role / scope: implementer; frontend — `/onboarding` route + wizard shell + step 1 preferences form + login-entry redirect. Excluded: step 2/3 forms (SP-107D/E), boot-time gate / header affordance (EP05), integration sign-off (SP-107F), `docs/jira-sync/`, other stories' artifacts.

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at last update: `2a01a87` (baseline before the first included change; autopilot dispatch — SP-107B code at `03a412a`, SP-107A at `9885601`)
- Saved work: all scoped SP-107C paths committed in one scoped commit (hash in the returned closeout; see [implementation.md](./implementation.md) → "Commit scope"). Working tree for this child's scoped paths: clean.
- Other work to preserve: the coordinator/autopilot-owned `## Autopilot` run-record section in [the SP-107 README](../../README.md) is intentionally **not** part of this commit.

## Progress

- [x] `features/onboarding/api/onboardingApi.ts` — GET/PATCH `/onboarding` service + contract types (plain axios service + `createAsyncThunk`, mirroring `userService`/SP-106 — not RTK Query)
- [x] `features/onboarding/model/onboardingSlice.ts` — state `{ status, step, completed, completedAt, semesterId, error }` + thunks `fetchOnboardingState` / `advanceOnboarding` / `completeOnboarding` + field-level selectors
- [x] `features/onboarding/model/onboardingSlice.test.ts` — 7 tests (fetch idle→loading→ready/error; advance 1→2; complete terminal; failures keep the previous step; FieldValidationPipe array join)
- [x] `features/onboarding/ui/WizardShell.tsx` — step indicator (`aria-current`), skip (steps 2+ only, D107-4), sign-out, loading/error states, renders step content by step (2/3 "coming" placeholders until D/E)
- [x] `features/onboarding/ui/Step1Preferences.tsx` — name + time zone form (D106-3 pre-fill + SP-106C hydration pattern; `updateProfile` → `advanceOnboarding(2)`; field-level 400 `errors` map; idempotent retry)
- [x] `features/onboarding/ui/Step1Preferences.test.tsx` — 13 tests (pre-fill rules, client validation, submit order, 400 field errors, non-400 toast, progress-save failure retry, in-flight disabling)
- [x] `pages/onboarding/ui/OnboardingPage.tsx` — fetch-on-mount (idle only), completed → `/dashboard`, renders shell
- [x] `pages/onboarding/ui/OnboardingPage.test.tsx` — 14 tests (fetch/reuse/retry, terminal redirect, resume at stored step, skip hidden on step 1 / visible on 2+3, skip success + failure, sign-out, keyboard-only step 1, responsive container)
- [x] `app/App.tsx` — `/onboarding` inside the `ProtectedRoute` group (D107-3)
- [x] `pages/login/ui/LoginPage.tsx` — post-login onboarding fetch + branch (completed → `from`; not-completed or fetch failure → `/onboarding`)
- [x] `pages/login/ui/LoginPage.test.tsx` — extended with 3 onboarding-branch cases (not-completed → `/onboarding`; completed → `from`; fetch failure → `/onboarding`); pre-existing cases preserved via a completed default in `beforeEach`
- [x] Store registration: `app/store/store.ts` + `test/providers.tsx` (auxiliary, F-107C-1) + `store.test.tsx` key expectations (F-107C-2: 3 keys)
- [x] Full verification: 238/238 tests (22 files), typecheck clean, lint clean (2026-10-18, re-run in the closeout context)
- [x] Closeout: `implementation.md` written, README queue row C + active/next fields + queue summary updated, scoped commit made

## Findings / Deviations

All findings are recorded with dispositions in [implementation.md](./implementation.md) → "Findings / Deviations":

- **F-107C-1** (auxiliary files beyond the ticket's file list: `store.ts` + `test/providers.tsx` registration) — fixed (included in scope as necessary registration).
- **F-107C-2** (`store.test.tsx` pins the reducer key set) — fixed (expectations updated to 3 keys incl. `onboarding`).
- **F-107C-3** (ticket silent on the post-login onboarding-fetch *failure* branch) — fixed (navigate to `/onboarding`; the page shows its actionable error + retry, so no student is stranded) — **flagged for parent review**.
- **F-107C-4** (slice `status` semantics: only the fetch thunk drives it; write thunks keep the previous step on failure) — fixed (design recorded in the slice header + implementation.md).
- **F-107C-5** (slice test uses the shared `makeTestStore()` — a local onboarding-only store would not typecheck the thunks, which are typed against the app `RootState`) — fixed (test uses the shared test store). Recorded retrospectively at closeout (it arose during slice-test authoring, before the checkpoint's last mid-run update).

No open findings.

## Decisions and dependencies

- D107-3 (standard `Layout`/`ProtectedRoute` placement), D107-4 (skip from step 2+), D106-3 (time-zone pre-fill), SP-106C IR-106-01 (profile hydration + payload rule) — all consumed, not forked.
- Contract: SP-107 README "Shared API contract" (GET/PATCH `/onboarding` shapes verified against `apps/api/src/modules/onboarding/onboarding.{controller,service}.ts` from `9885601`).

## Verification

Re-run in the closeout context (2026-10-18, cwd `apps/web`):

- `pnpm exec vitest run` → **22/22 files, 238/238 tests passed** (baseline before this child: 19 files / 201 tests; +3 new test files — slice 7, step 1 13, page 14 — and +3 login cases, +37 tests total; the re-keyed `store.test.tsx` keeps its 3 tests; zero skips)
- `pnpm run typecheck` → exit 0
- `pnpm run lint` (`--max-warnings 0`) → exit 0 (after a prettier auto-fix pass over the 4 SP-107C files)

Details in [implementation.md](./implementation.md) → "Verification".

## Resume next

None — child complete. The queue names SP-107D — implement (a fresh dispatch;
this writer is relinquished).
