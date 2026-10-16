# SP-105C checkpoint

Updated: 2026-10-16 (M3 complete)
Status: implementation complete — awaiting parent review
Story: docs/stories/EP01/SP-105/SP-105C-password-reset-frontend-ui.md
Review unit: SP-105 parent (`docs/stories/EP01/SP-105/artifacts/SP-105/` implementation index) — child C
Role / scope: implementer; frontend only (`apps/web`). Outcome: two recovery screens consuming the implemented G contract — `/forgot-password` request screen, `/reset-password` reset screen (fragment token, form, 429 retry, a11y), one-time login notice, route wiring. Exclusions: G-owned files (`services/recovery.ts`, `services/api.ts`, `context/AuthContext.tsx`), `useResendVerification` (SP-103), all backend work, real-browser proof (D), `document.cookie` writes.

## Repository state
- Workspace / branch: focus-app, `main`
- HEAD at last update: `6dd78a8` (M3 — one-time login notice)
- Saved work: M1 (`6b97f77`) + M2 (`510e36e`) + M3 (`6dd78a8`) committed; the final `implementation.md` is queued with the queue/ticket update
- Other work to preserve: none — working tree clean apart from this child's planning artifacts

## Progress
- [x] **M1 — request screen (complete, `6b97f77`):** `pages/ForgotPassword.tsx` + `ForgotPassword.test.tsx` (16 cases: form, verbatim generic success, existence-agnostic, 400 field error, in-flight/duplicate, signed in/out, 429 readable wait + 60s fallback matrix, 503/network retry, keyboard, aria-live), `authService.requestPasswordReset(email: string)`, `/forgot-password` route in `App.tsx`
- [x] **M2 — reset screen (complete, `510e36e`):** `utils/linkToken.ts` lift + `VerifyEmail.tsx` import swap (C13), `ResetPasswordRequest` in `types/index.ts`, `authService.resetPassword` via `runRecoveryReset`, `pages/ResetPassword.tsx` + `ResetPassword.test.tsx` (21 cases), `/reset-password` route
- [x] **M3 — login notice (complete, `6dd78a8`):** `Login.tsx` one-time notice (C10) + `Login.test.tsx` cases (+3 → 7); DoD 9 client doc block in the implementation artifact; full `test`/`typecheck`/`lint` pass; ticket → Implemented; queue → `Implemented — awaiting parent review`
- **Complete.** Post-M3 `pnpm --filter @studypilot/web test` = 11 files / 142 passed, 0 unhandled errors; `typecheck` and `lint` clean (2026-10-16). Child is `implementation complete — awaiting parent review`; no child-level reviewer/auditor is triggered (review cadence: one combined SP-105 parent review).

## Decisions and dependencies
- Ticket decisions C1–C13 (refined 2026-10-16); single-story shape and the real-G-module test strategy are user-accepted (C5/C6).
- G is implemented (`ea3f078`, `cfe48ae`) — its client contract is the production source of truth; A/B/F endpoints are live.
- Page tests: `api.defaults.adapter` harness, full `App` + `MemoryRouter` + real `AuthProvider`; **do not gate submit on `isLoading`** — a hanging boot restore must not block the recovery forms (the drain barrier is the ordering mechanism).
- **`requestPasswordReset(email: string)` takes a plain string (the `resendVerification` precedent) — ticket C8's `ForgotPasswordRequest` type is dropped; only `ResetPasswordRequest` is added to `types/index.ts`** (C8 deviation — recorded in the implementation artifact's DoD 9 block).

### M2 execution notes (settled during the window)
- **Drain-bound test:** `vi.useFakeTimers()` after the real-timer typing; the submit goes through `fireEvent.submit(form)` — userEvent v14.6.7 awaits a (now fake) 0ms timer per interaction, so `user.click`/`user.type` after `useFakeTimers` hang. The drain-failure re-render is scheduled on the real scheduler (MessageChannel) once `act` resolves, so the test restores real timers **before** `findByRole` polling. The body is wrapped in try/finally that settles the boot refresh — `beginRefresh`'s `.finally` calls `setInFlightRefresh(null)`, releasing the `awaiting-drain` barrier; a stuck barrier would 409 every later case (module state persists across tests in a file).
- **`<input type="password">` has no implicit role** in this toolchain (aria-query 5.1.3 + @testing-library/dom 9.3.4) — the form is queried by label (`getByLabelText(/^new password$/i)`), the Login.test pattern.
- **`role="status"` collision:** `EmailVerificationBanner` (rendered by `Layout`) has its own `role="status"` and renders when signed in + unverified — the aria-live case stays signed-out.

## Verification
- `pnpm --filter @studypilot/web test` (repo root, 2026-10-16): 11 files, 142 passed, 0 unhandled errors — baseline was 10 files / 118 tests pre-C; +16 forgot +21 reset +3 login.
- `pnpm --filter @studypilot/web typecheck`: clean — final M3 pass.
- `pnpm --filter @studypilot/web lint`: clean — final M3 pass.
- No G-owned files, `useResendVerification`, backend files, Header/nav additions, or `document.cookie` writes touched; real-browser proof remains SP-105D.

## Resume next
- **Nothing — the child is complete.** The full M1–M3 outcome is recorded in `implementation.md` (DoD 9 block included) and the parent queue:
  - C: `Implemented — awaiting parent review` (hold for the combined SP-105 parent review).
  - Next queue task: SP-105H → `Needs refinement` (refiner pass, then implement).
- If a review finding requires a fix, this checkpoint resumes the fix in the same implementation ownership; the final implementation/review artifacts live at the parent (`artifacts/SP-105/`).
