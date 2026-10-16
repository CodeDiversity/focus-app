# SP-105C checkpoint

Updated: 2026-10-16 (activation)
Status: in progress
Story: docs/stories/EP01/SP-105/SP-105C-password-reset-frontend-ui.md
Review unit: SP-105 parent (`docs/stories/EP01/SP-105/artifacts/SP-105/` implementation index) — child C
Role / scope: implementer; frontend only (`apps/web`). Outcome: two recovery screens consuming the implemented G contract — `/forgot-password` request screen, `/reset-password` reset screen (fragment token, form, 429 retry, a11y), one-time login notice, route wiring. Exclusions: G-owned files (`services/recovery.ts`, `services/api.ts`, `context/AuthContext.tsx`), `useResendVerification` (SP-103), all backend work, real-browser proof (D), `document.cookie` writes.

## Repository state
- Workspace / branch: focus-app, `main`
- HEAD at last update: 70e83a9 (docs: SP-105C refine/ground; queue → Ready)
- Saved work: none — working tree clean after the refine commit
- Other work to preserve: none

## Progress
- [ ] M1 — request screen: `pages/ForgotPassword.tsx` (+ `.test.tsx`), `authService.requestPasswordReset`, `/forgot-password` route (the existing Login link resolves)
- [ ] M2 — reset screen: `pages/ResetPassword.tsx` (+ `.test.tsx`), `authService.resetPassword` via `runRecoveryReset`, `ResetPasswordRequest` type, `/reset-password` route, `utils/linkToken.ts` lift + `VerifyEmail.tsx` import swap
- [ ] M3 — Login one-time notice + `Login.test.tsx` cases; DoD 9 client doc block in the implementation artifact; full `test`/`typecheck`/`lint` pass
- Current step: M1 not started — red first: `ForgotPassword.test.tsx`, then the page.

## Decisions and dependencies
- Ticket decisions C1–C13 (refined 2026-10-16); single-story shape and the real-G-module test strategy are user-accepted (C5/C6).
- G is implemented (`ea3f078`, `cfe48ae`) — its client contract is the production source of truth; A/B/F endpoints are live.
- Page tests: `api.defaults.adapter` harness (the `installPendingHarness` style from `recovery.test.ts`), full `App` + `MemoryRouter` + real `AuthProvider`; **do not gate submit on `isLoading`** — a hanging boot restore must not block the recovery forms (the drain barrier is the ordering mechanism).
- `requestPasswordReset(email: string)` takes a plain string (the `resendVerification` precedent) — ticket C8's `ForgotPasswordRequest` type is dropped; only `ResetPasswordRequest` is added to `types/index.ts`.

## Verification
- Baseline at start: `pnpm --filter @studypilot/web test` = 9 files / 102 passed (post-G); `typecheck` + `lint` clean.

## Resume next
1. M1 — write `apps/web/src/pages/ForgotPassword.test.tsx` (adapter harness; AC1 cases + 429 matrix); run `pnpm --filter @studypilot/web test` and confirm red (missing page module).
2. M1 — implement `ForgotPassword.tsx` + `authService.requestPasswordReset` + the `App.tsx` route; run the web suite + `typecheck` + `lint` to green; commit.
- Read next: ticket Sizing/Decisions; `pages/VerifyEmail.tsx` (+ test), `pages/Login.tsx`, `services/auth.ts`, `services/recovery.ts`, `test/user.ts`.
