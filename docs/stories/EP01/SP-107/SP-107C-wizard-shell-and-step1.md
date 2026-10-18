# SP-107C: Wizard Shell and Step 1 (Preferences)

**Story ID:** SP-107C
**Parent:** [SP-107](./SP-107-onboarding-wizard.md) (Jira STUDY-8)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Frontend
**Status:** Queued (planned 2026-10-18; not implemented — needs SP-107A implemented)
**Dependencies:** SP-107A (onboarding state endpoints); SP-106C/E implemented in code (`PATCH /users/me` contract, `updateProfile` thunk, `Select` component, `datetime.ts` helpers)
**Jira key:** Pending creation

## Summary

Build the wizard shell — `/onboarding` route, login-entry redirect, resume at
the first incomplete step, skip from step 2, terminal redirect, loading/error
states — plus step 1, the preferences form (display name + time zone) that
reuses the existing SP-106 `PATCH /users/me` write path.

## Description

As a new student, on first login I land in a short guided wizard. Step 1 lets
me confirm my display name and time zone (pre-filled sensibly), and my progress
is saved as I go, so if I stop I can pick up where I left off.

## Acceptance Criteria

1. `/onboarding` is a protected route (inside `ProtectedRoute`, rendered within the standard `Layout` — same placement as all existing pages, D107-3). On load it loads the onboarding state (from the onboarding slice if already fetched, else `GET /onboarding`) and: `completed` → redirect to `/dashboard` (AC-107-05); else render the wizard at the stored `step` (resume at the first incomplete step, AC-107-03).
2. Login entry: after a successful login the app fetches the onboarding state and navigates to `/onboarding` when not completed, otherwise to the existing destination (`from` or `/dashboard`) (AC-107-01). Registration is unchanged (register → login → wizard).
3. Step 1 form: display name (`Input`) and time zone (`Select`, SP-106E) pre-filled from the current profile — time zone pre-fill follows D106-3 (stored value; browser-detected zone when the stored value is still the `"UTC"` default). Client validation: name non-empty ≤ 100 chars; time zone a valid IANA identifier (select-by-construction + `isValidTimeZone` safety net). Submit → existing `updateProfile` thunk (`PATCH /users/me`, name + timeZone) **then** `PATCH /onboarding { step: 2 }`; progress is saved after the step completes (AC-107-02). A profile-save failure shows field-level errors and stays on step 1; a progress-save failure shows an actionable error with retry (the step-1 data is already persisted — retrying is idempotent).
4. Skip: a "Skip for now" control is visible on steps 2 and 3 only (D107-4 — step 1 is required); it sends `PATCH /onboarding { completed: true }` and navigates to `/dashboard`, recording completion without the optional data (AC-107-04).
5. The wizard footer offers a sign-out link (the exit + resume path: signing in again re-enters the wizard at the saved step). No boot-time gate and no persistent header link in M1 (D107-3).
6. The wizard handles loading (state fetch spinner), error (fetch failure → message + retry; API failures → actionable field-level messages from the `errors` map), and success states; the whole flow is operable by keyboard with visible focus and announced status; the layout works on mobile and desktop (AC-107-08).
7. A completed or skipped student who navigates directly to `/onboarding` is redirected to `/dashboard` and never sees the wizard again (AC-107-05).

## Tests

- `apps/web/src/pages/onboarding/ui/OnboardingPage.test.tsx` (**new**): redirects to `/dashboard` when `completed`; renders at the stored step (resume: step 2 renders step 2); skip hidden on step 1, visible on steps 2/3; sign-out link present; state-fetch loading spinner; fetch-failure message + retry action; direct-URL-when-completed redirect; keyboard-only step-1 completion; mobile + desktop viewport behavior.
- `apps/web/src/features/onboarding/model/onboardingSlice.test.ts` (**new**): thunk state transitions — fetch (idle→loading→ready/error), advance (step 1→2), complete (terminal), failure keeps the previous step.
- `apps/web/src/pages/login/ui/LoginPage.test.tsx` (extend): after login with not-completed state navigates to `/onboarding`; with completed state navigates to `from`/`/dashboard` (existing cases preserved).
- `apps/web/src/features/onboarding/ui/Step1Preferences.test.tsx` (**new**): pre-fill rules (stored zone vs `"UTC"` → browser zone; D106-3); name/time-zone client validation; submit order (profile save → progress save); profile-save field errors displayed; progress-save failure retry.

## Technical Notes

- **Inspected (2026-10-18):** `apps/web/src/app/App.tsx` (route table — `/onboarding` goes inside the existing `ProtectedRoute` group), `apps/web/src/widgets/layout/ui/Layout.tsx` (Header + `EmailVerificationBanner` + `main` wrap every route — the wizard renders inside `main`; the banner may appear above the wizard, which is non-blocking and needs no change), `apps/web/src/widgets/protected-route/ui/ProtectedRoute.tsx`, `apps/web/src/pages/login/ui/LoginPage.tsx` (post-login `navigate(from || '/dashboard')` at lines 68–81 — the wizard branch inserts here), `apps/web/src/features/session/model/authSlice.thunks.ts` (login thunk), `apps/web/src/entities/user/api/userService.ts` + `model/types.ts` (`SessionUser` incl. `timeZone`), `apps/web/src/pages/profile/ui/ProfilePage.tsx` (form pattern: `react-hook-form` + zod, `Input`/`Select`), `apps/web/src/shared/ui/{Input,Select,Button}.tsx`, `apps/web/src/shared/lib/datetime.ts` (`getBrowserTimeZone`, `isValidTimeZone`), `apps/web/src/shared/lib/errors.ts` (`extractApiError` for the SP-106B `errors` map).
- **FSD placement:** `pages/onboarding/ui/OnboardingPage.tsx` (route screen); `features/onboarding/` — `api/onboardingApi.ts` (GET/PATCH `/onboarding`), `model/onboardingSlice.ts` (state + thunks: `fetchOnboardingState`, `advanceOnboarding`, `completeOnboarding`), `ui/WizardShell.tsx` (step indicator, skip, sign-out, states), `ui/Step1Preferences.tsx`. The slice holds `{ status, step, completed, completedAt, semesterId, error }`. Step 2/3 forms (SP-107D/E) are added into `features/onboarding/ui/` by their own stories; the shell renders them by step.
- **Step 1 write path:** reuses the existing `updateProfile` thunk (`PATCH /users/me`) — no new profile endpoint (parent ticket technical note; SP-106 contract). The time-zone `Select` and pre-fill rule come from SP-106E/D106-3 — consume, never fork.
- **Contract:** the [shared API contract](./README.md#shared-api-contract) in the breakdown README; this child consumes `GET`/`PATCH /onboarding` (SP-107A) and `PATCH /users/me` (SP-106).
- **Out of scope:** step 2/3 forms (SP-107D/E), boot-time onboarding reconciliation and a header "continue setup" affordance (possible EP05 follow-up — the M1 resume paths are sign-in and the `/onboarding` URL), semester/course UI (SP-107D/E consume SP-107B endpoints).

## Definition of Done

1. ACs pass. 2. Client-side validation on step 1 (name, time zone). 3. N/A — no academic-data queries in this child (own-state endpoint only; semester/course scoping is SP-107B's). 4. Actionable field-level errors displayed from the `errors` map. 5. Loading/error/success states per step. 6. Full keyboard flow + focus + announced status. 7. Responsive mobile/desktop. 8. Tests above. 9. N/A — no API changes (consumes the settled contracts). 10. Via SP-107F sign-off + the combined parent review.

## Sizing

- **Outcome:** a new student lands in the wizard on first login, completes step 1 with progress saved, and can resume/skip — the wizard is usable end-to-end at step 1 (steps 2/3 render as "coming" placeholders until SP-107D/E land).
- **Time estimate:** ~2–2.5 h (route + slice + shell + one form + login-redirect change + tests; the shell/state machine is the bulk). One cohesive child: shell and step 1 form one independently verifiable outcome — "enter wizard, complete step 1, progress persists" — and the combined scope fits the 1–3 h target.
- **Files:** `apps/web/src/app/App.tsx` (change), `apps/web/src/pages/login/ui/LoginPage.tsx` (change) + `LoginPage.test.tsx` (extend), `apps/web/src/pages/onboarding/ui/OnboardingPage.tsx` + `OnboardingPage.test.tsx` (**new**), `apps/web/src/features/onboarding/{api/onboardingApi.ts, model/onboardingSlice.ts, model/onboardingSlice.test.ts, ui/WizardShell.tsx, ui/Step1Preferences.tsx, ui/Step1Preferences.test.tsx}` (**new**).
- **Start context:** this ticket, decisions D107-3/D107-4 (+ D106-3 pre-fill rule), the [shared API contract](./README.md#shared-api-contract), `App.tsx`, `LoginPage.tsx`, `authSlice.thunks.ts`, `ProfilePage.tsx` (form pattern), `shared/ui/{Input,Select,Button}.tsx`, `shared/lib/datetime.ts`, `shared/lib/errors.ts`, `entities/user/{api,model}`.
- **Verification:** `pnpm --filter @studypilot/web exec vitest run` all green; `pnpm --filter @studypilot/web typecheck` clean; lint clean. (API endpoints assumed present from SP-107A; component tests mock the onboarding API.)
- **Dependencies / exclusions:** SP-107A (must be implemented first), SP-106C/E (in code). Excluded outcomes owned elsewhere: step 2 (SP-107D), step 3 (SP-107E), end-to-end flow + manual sign-off (SP-107F), boot-time reconciliation / header affordance (EP05 follow-up, out of M1). Every excluded requirement has an owner in the [README traceability table](./README.md#source-requirements-and-test-traceability).
