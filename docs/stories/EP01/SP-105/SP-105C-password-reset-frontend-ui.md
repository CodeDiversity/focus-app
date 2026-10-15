# SP-105C: Password Reset — Recovery UI

**Story ID:** SP-105C
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Priority:** High / P0
**Layer:** Frontend (React + TypeScript + Vite)
**Dependencies:** SP-105F response contract (429/503), [SP-105A](./SP-105A-password-reset-backend-issuance.md) + [SP-105B](./SP-105B-password-reset-backend-redemption.md) (shared API contract — can **start** against the contract, **finishes** once the endpoints land)
**Jira key:** Pending creation (child of STUDY-7)
**Refined:** 2026-10-14
**Status:** Draft — corrected; awaiting independent re-review

## Summary

Build the recovery screens: a `/forgot-password` request page (reached from the Login link) and a `/reset-password` reset page (reached from the email link). The reset page reads the token from the URL fragment and strips it, both pages handle signed-in and signed-out users, and a successful reset clears the local session and navigates to login. This is the child that carries the frontend states, accessibility, and the local session-clearing behavior.

## Description

As a student, I want clear pages to request a reset link and to set a new password, so that I can recover my account from any device.

## Acceptance Criteria

1. A **request** screen at `/forgot-password` (reached from the Login "Forgot password?" link) provides a loading state, the single generic "check your inbox" success state (shown regardless of whether the account exists), and an error/empty state; it is keyboard accessible and prevents duplicate submissions. *(original SP-105 AC6, request screen)*
2. A **reset** screen at `/reset-password` (reached from the email link) reads the token from the URL fragment, strips the fragment from the displayed URL, and offers a new-password form with loading, success, and error states. *(original SP-105 AC6, reset screen)*
3. Used, expired, or invalid tokens show the backend's actionable message and offer a way to request a new one (link to `/forgot-password`). *(original SP-105 AC5, frontend half)*
4. After a successful reset, the app clears the in-memory access token + user, relies on B's response to expire the HttpOnly `refresh_token` cookie, prevents an in-flight silent session-restore (SP-102) from resurrecting the cleared session, and navigates to `/login` with a one-time "password updated" notice. *(original SP-105 AC4, frontend half)*
5. Both screens work whether the user is **signed in or signed out** (routes outside `PublicRoute`/`ProtectedRoute`) and handle missing/malformed tokens, duplicate submissions, and network failures with retry. *(decision D11 + recovery-UX robustness)*
6. Both screens support full keyboard interaction, visible focus, announced status/errors (`aria-live`), and responsive desktop/mobile layouts meeting WCAG 2.2 AA. *(original SP-105 AC6, a11y)*

**DoD:** Per [shared DoD](../../../epics/README.md), 1, 2, 4, 5, 6, 7, 8 apply. DoD 3 is N/A (no academic data; a token authorizes only its owner's change). DoD 9 is N/A (no frontend migration/API change). DoD 10 is an obligation satisfied by the integrated review in [SP-105D](./SP-105D-password-reset-integration.md).

## Technical Notes

### Routes

- `apps/web/src/App.tsx`: add `<Route path="/forgot-password" element={<ForgotPasswordPage />} />` and `<Route path="/reset-password" element={<ResetPasswordPage />} />` at the top level, **outside** both `PublicRoute` and `ProtectedRoute` — exactly like the existing unguarded `/verify-email`. **Rationale (D11):** `PublicRoute` redirects authenticated users away, which would block a signed-in user who opens their reset link; both states must work.
- `apps/web/src/pages/Login.tsx`: the existing `<Link to="/forgot-password">` currently hits the `*` catch-all (a dead link carried from SP-104/EP01); it resolves once the route exists. Add a one-time `location.state.reset` notice ("Password updated — sign in with your new password").

### API client

- `apps/web/src/services/auth.ts`: add `requestPasswordReset(email)` → `POST /auth/forgot-password` and `resetPassword({ token, password, confirmPassword })` → `POST /auth/reset-password`. Map the backend `{ message }` to the UI; use custom 400/network messages mirroring the existing `verifyEmail`/`resendVerification`. **Never** forward the raw token to analytics or storage.
- `apps/web/src/services/api.ts`: add `'/auth/forgot-password'` and `'/auth/reset-password'` to `AUTH_PATHS` so a `401` on these public routes does **not** trigger the single-flight refresh/logout (a reset error is not a session loss). `withCredentials` stays on: the browser applies B's expiry Set-Cookie; JavaScript cannot clear HttpOnly cookies. F's account-independent 429 must show actionable retry guidance on both pages without interpreting it as account existence or an invalid reset token. Sanitize propagated Axios errors so request bodies/tokens/passwords never reach console, storage or analytics.

### URL-token handling (reset screen)

- Reuse the `readLinkToken(hash)` pattern from `VerifyEmail.tsx`: `new URLSearchParams(location.hash.slice(1)).get('token')`, accepted **only** if it matches `/^[A-Za-z0-9_-]{43}$/`.
- On load and on hash change: capture the token into state, then strip the fragment via `navigate(\`${location.pathname}${location.search}\`, { replace: true, state: null })`. **Rationale:** a URL fragment avoids the initial HTTP request but *can* remain in browser history and is readable by page JavaScript — capture-once + history-replace is the control; the page does not claim fragments never reach history.
- Missing/malformed token → show the invalid/expired guidance + a "request a new link" action to `/forgot-password`; do not render a broken form.

### Success and session clearing (reset screen)

- Before submitting the reset POST, enter a recovery barrier in the API/session layer: pause new automatic refresh launches and drain the existing single-flight refresh (with a bounded timeout/abort policy). Send reset only once earlier refresh traffic has settled; this prevents its late Set-Cookie from overwriting B's expiry header. If draining cannot be established, offer retry instead of claiming clean logout. Do not submit/consume a token automatically on page entry.
- On `200`, B has committed and emitted the cookie expiry header. Increment a shared session generation **before** clearing local access-token/user state. `services/api.ts` must check the generation before writing a refreshed access token, and `AuthContext` must check it before applying a restored user. Context-only guarding is insufficient because the existing `refreshAccessToken().then(...)` writes the token first. Ignore stale request completions and keep automatic restore disabled for the cleared session until explicit login. Then navigate to `/login` with `{ reset: true }` and replace the reset entry. Consume the one-time notice so it does not reappear on later navigation.
- Failed reset/field validation: release the barrier safely; do not log the user out merely because reset failed. Keep the token for password/confirmation field errors, transport/server failures, and F's 429, and offer retry (honoring Retry-After). Clear it for the specific uniform `INVALID_RESET_MESSAGE` or success. Preserve the existing signed-in account on a failed reset.
- C never expires cookies through `document.cookie`. B owns the response header, C owns local state and request coordination, and D verifies both in a real browser (including delayed refresh responses). If another tab later resends an obsolete credential, the server must reject it; no cross-tab instantaneous access-JWT invalidation is promised.

### States and accessibility

- **Request screen:** email input → submitting (loading, disabled, in-progress indicator) → the single generic "check your inbox" success (identical whether or not the account exists — no "we couldn't find that account") → error (actionable field message). Disable while in flight to prevent duplicates.
- **Reset screen:** new-password + confirm; client-side validation mirroring the backend (min 8, must match); loading; success; invalid-token; error.
- **Keyboard/focus/announce:** full tab order, Enter submits, visible focus rings, `aria-live="polite"` for async status, `aria-invalid`/`aria-describedby` on fields, per WCAG 2.2 AA.
- **429 retry:** show the generic IP-limit message and wait guidance for either endpoint, retain valid form/token state, and retry without global logout. Test network/503 separately from token-invalid and password-field errors.
- **Responsive:** single-column mobile, comfortable desktop. Verify at real viewports in SP-105D (CSS-class assertions alone do not establish responsiveness).

### Relevant files

- `apps/web/src/App.tsx` — two top-level routes outside the wrappers.
- `apps/web/src/pages/ForgotPassword.tsx` (+ `.test.tsx`) — request screen.
- `apps/web/src/pages/ResetPassword.tsx` (+ `.test.tsx`) — reset screen (new).
- `apps/web/src/pages/Login.tsx` — the link resolves; add the `reset` one-time notice.
- `apps/web/src/services/auth.ts` — the two methods.
- `apps/web/src/services/api.ts` — `AUTH_PATHS` additions.
- `apps/web/src/context/AuthContext.tsx` — session-clear + in-flight-restore guard on reset success.
- Reuse: `VerifyEmail.tsx` (`readLinkToken`), existing `Button`/`Input`/form + toast components.

### Test cases

Frontend — Vitest, React Testing Library, `user-event`, colocated `*.test.tsx`.

| AC | file / describe | Named cases |
|---|---|---|
| 1 | `ForgotPassword.test.tsx` | `shows the email form`; `submits and shows the single generic success state`; `shows the same success for a 200 (no account-existence leak)`; `shows an actionable error for a 400 field error`; `disables submit while in flight (no duplicate)`; `is reachable while signed in and signed out` |
| 2, 3 | `ResetPassword.test.tsx` | `reads the token from the URL fragment`; `strips the token fragment from the displayed URL`; `shows guidance and a re-request link when the token is missing or malformed`; `submits and shows success`; `shows the backend invalid/expired message and offers a new request on 400`; `validates min-8 and confirm-match before submit`; `keeps the token and offers retry after a network failure` |
| 4 | `ResetPassword.test.tsx` + `AuthContext.test.tsx` | `clears the token and user on success`; `waits for existing refresh before reset and blocks new automatic refresh`; `ignores stale API token-store writes and stale AuthContext user restore`; `ignores an in-flight session restore after the session is cleared`; `navigates to /login with a one-time reset notice` |
| 5 | `Login.test.tsx` | `the forgot-password link routes to the request screen`; `shows the one-time password-updated notice after reset` |
| 6 | Both pages | `completes the flow using keyboard only`; `announces async status via aria-live`; `fits mobile and desktop viewports` |
| — | `api.test.ts` | `does not attempt session refresh for forgot/reset errors` (mirrors SP-103 public-path isolation) |

### Mechanisms and recorded decisions (2026-10-14)

- **C1:** both routes outside `PublicRoute`/`ProtectedRoute` (D11) — signed-in and signed-out both work.
- **C2:** read the token once from the fragment, then strip it via history-replace (reuses `VerifyEmail`).
- **C3:** on reset success, clear local token + user; B expires the cookie; use the recovery barrier and shared generation to guard both API writes and context restore, navigate to `/login` with a one-time notice.
- **C4:** the request screen shows **one** generic success message (no account-existence leak), mirroring the backend.

### Out of scope

- The backend endpoints ([SP-105A](./SP-105A-password-reset-backend-issuance.md) / [SP-105B](./SP-105B-password-reset-backend-redemption.md)) and integration review ([SP-105D](./SP-105D-password-reset-integration.md)).
- Email-template design beyond SP-103's provider reuse; per-IP enforcement (F; actionable 429 UI is in scope here); "active sessions" UI.
