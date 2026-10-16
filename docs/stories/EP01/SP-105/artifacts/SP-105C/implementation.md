# SP-105C: Password Reset — Recovery UI — Implementation Record

**Story:** [SP-105C](../../SP-105C-password-reset-frontend-ui.md)
**Epic:** EP01 — Authentication & Onboarding
**Parent:** SP-105 (STUDY-7)
**Layer:** Frontend (React + TypeScript + Vite)
**Status:** Implemented (2026-10-16) — awaiting parent review

## Summary

Implemented the two recovery screens on top of the **implemented** SP-105G client
contract: a `/forgot-password` request screen (the Login "Forgot password?" link
previously dead-ended into the `*` catch-all) and a `/reset-password` reset screen
(the email link's destination), plus the one-time "password updated" notice on
Login. Both screens are top-level routes outside `PublicRoute`/`ProtectedRoute`
(C1) so they work signed in or signed out, render failures from G's sanitized
`RecoveryError`, implement the shared 429 retry contract (monotonic-clock
countdown, explicit retry only), and are keyboard-operable with `aria-live`
status. Excludes by ticket: real-browser/viewport/SMTP proof + DoD 10 (D), I/J,
Header/nav additions, cross-tab claims, all backend work, `document.cookie`
writes.

## What was built

### M1 — request screen (commit `6b97f77`, 4 files / 452 insertions)

- `pages/ForgotPassword.tsx` (new) — RHF + zod email form mirroring the backend
  `ForgotPasswordDto` (trim / 254 max / email, same messages). The `200` body's
  message is rendered **verbatim** as the single generic success state (C4 —
  account-independent by contract; the UI cannot and does not branch on account
  existence). Failures render the sanitized `RecoveryError` message as a
  form-level `role="alert"` (C7); a 429 runs a monotonic-clock countdown
  (`performance.now()` deadline + 1s tick, `Retry-After` 1–60 else 60s fallback)
  that re-enables only an **explicit** retry, keeping the typed email (C9).
  `submitting` ref + `isSubmitting` state make duplicate submission impossible;
  `role="status"` `aria-live` region announces async state; no `useAuth` —
  submit is not gated on boot state (a hanging boot refresh must not block the
  recovery forms; the boundary's drain barrier is the ordering mechanism).
- `services/auth.ts` — `requestPasswordReset(email: string): Promise<VerificationResponse>`
  thin forwarder over `POST /auth/forgot-password` (the C8 deviation, below).
- `App.tsx` — `/forgot-password` top-level route next to `/verify-email` (C1).
- `pages/ForgotPassword.test.tsx` (new, 16 cases) — form; verbatim generic
  success; existence-agnostic 200; 400 field-error alert; in-flight/duplicate
  (dblClick → exactly one call); signed in/out; 429 wait + explicit retry;
  60s-fallback matrix (absent/malformed/zero/61); 503/network retry without
  countdown; keyboard-only; aria-live.

### M2 — reset screen (commit `510e36e`, 7 files / 659 insertions)

- `utils/linkToken.ts` (new, C13) — `readLinkToken(hash)`: the 43-char base64url
  pattern (`/^[A-Za-z0-9_-]{43}$/`) read from `URLSearchParams(hash.slice(1))`,
  `null` when absent/malformed. The security-relevant representation lives in one
  shared copy; `pages/VerifyEmail.tsx` swaps its inline copy for the import
  (behavior-identical — its 18-case suite guards).
- `types/index.ts` — `ResetPasswordRequest { token, password, confirmPassword }`
  (C8).
- `services/auth.ts` — `resetPassword(request): Promise<ResetPasswordResult>`
  returns `runRecoveryReset(() => api.post('/auth/reset-password', request).then(r => r.data))`
  — no try/catch (G re-sanitizes inside the boundary; the raw token never
  escapes).
- `pages/ResetPassword.tsx` (new) — token captured once from the fragment
  (`useState(() => readLinkToken(location.hash))` — pure init survives
  StrictMode) and stripped via `navigate(pathname + search, { replace: true,
  state: null })` (C2). zod: min-8 + confirm-match, **no trim, no max** (backend
  parity — the password is taken exactly as sent). No `useAuth`. Success
  (C3/C12): `navigate('/login', { replace: true, state: { reset: true } })` — no
  rendered success state (G already cleared token/user; the Login notice is the
  success representation; the page unmounts in the same tick). C11 token
  lifetime: cleared only on success or on the **byte-exact** uniform
  invalid-link message (local `INVALID_RESET_MESSAGE`, byte-identical to
  SP-105B's; G's dedup keeps it stable across the DTO-array and
  service-exception paths) → invalid state (uniform message + guidance +
  re-request link, form gone); field errors, 429, 503, network and drain-timeout
  failures keep the token + form. 429 countdown identical to M1 (C9).
- `App.tsx` — `/reset-password` top-level route (C1).
- `pages/ResetPassword.test.tsx` (new, 21 cases) — token read/strip; missing/
  malformed guidance (no broken form); submit handoff `{ token, password,
  confirmPassword }`; uniform invalid 400 (string + repeated array — dedup
  byte-identical) → token/form gone; 400 field errors keep token + form +
  values, resubmit carries the token; 503/network retry without countdown;
  **drain bound** (fake timers; reset never sent; form + token retained; the
  test settles the boot refresh in a `finally` so the held barrier cannot leak
  into later cases); signed-in 429 preserves the session; readable + 60s-
  fallback countdown matrix; signed-in success (token null, user gone);
  keyboard-only; aria-live (signed-out — `role="status"` collides with
  `EmailVerificationBanner` when signed in + unverified).

### M3 — one-time login notice (commit `6dd78a8`, 2 files / 83 insertions)

- `pages/Login.tsx` — C10: `location.state.reset === true` →
  `toast.success('Password updated — sign in with your new password.')`,
  consumed once per mount via a ref (mirrors the existing `sessionExpired`
  pattern) so re-renders never re-fire it.
- `pages/Login.test.tsx` (+3 → 7) — the `vi.mock('../services/auth')` factory
  gains `requestPasswordReset`/`resetPassword`; routes gain `/forgot-password` +
  `/reset-password`; cases: the forgot link routes to the request screen; no
  notice on an ordinary visit; the notice fires once after the real reset-page
  handoff and is consumed on re-render.

## Tests

| File | Cases | Note |
|---|---|---|
| `pages/ForgotPassword.test.tsx` (new) | 16 | drives the real G module via `api.defaults.adapter` (C6 — no `vi.mock` of `recovery.ts`/`api.ts`) |
| `pages/ResetPassword.test.tsx` (new) | 21 | same harness; drain case uses fake timers + `fireEvent.submit` (userEvent v14.6.7 awaits a 0ms timer per interaction under fake timers) |
| `pages/Login.test.tsx` (extended) | +3 (now 7) | mock-factory + routes + the three C10/routing cases |
| `pages/VerifyEmail.test.tsx` (unchanged) | 18 | guards the C13 import swap |

All pre-existing suites unchanged and passing.

## Client contract (DoD 9)

### Browser token handling

- **Representation (SD3/SD4):** the 43-character base64url token travels only in
  the URL fragment (`/reset-password#token=<raw>`) — never in the path or query,
  never in a cookie, never in storage. The single shared reader is
  `readLinkToken` in `apps/web/src/utils/linkToken.ts` (C13), used by both the
  verification and reset screens so the security-relevant pattern cannot drift.
- **Capture-once + strip (C2):** the page captures the token in a pure
  initializer (`useState(() => readLinkToken(location.hash))` — survives
  StrictMode double-invocation) and an effect strips the fragment via
  `navigate(pathname + search, { replace: true, state: null })` — the token
  never sits in the displayed URL or in history.
- **In-memory lifetime (C11):** the token is held only in React state. It is
  cleared exactly on (a) a successful reset (G's boundary commits the
  `tokenStore` clear; the page unmounts with the navigation) or (b) a 400 whose
  sanitized message equals the byte-exact uniform invalid-link message
  `'This reset link is invalid or has expired. Please request a new one.'`
  (SP-105B's `INVALID_RESET_MESSAGE`; G's dedup keeps it byte-stable across the
  DTO-validation and service-exception paths). Field errors, 429, 503, network
  and drain-timeout failures keep the token and the form for the retry.
- **Egress:** the token is sent only in the `POST /auth/reset-password` body. It
  is never logged, never persisted, and never written to `document.cookie` —
  the HttpOnly `refresh_token` cookie is expired server-side by SP-105B.

### Retry representation (C9)

- **429:** deadline = `performance.now() + retryAfterSeconds * 1000` on the
  monotonic clock, ticking down once a second; the button and inputs disable
  during the wait; at zero the form re-enables an **explicit** retry — never an
  automatic resubmission; form values and token are retained.
  `retryAfterSeconds` comes from G's sanitizer (decimal integer 1–60, else the
  60s fallback — PR-001).
- **503 / network** (G: `retryable`, no `retryAfterSeconds`): form-level
  `role="alert"` with the sanitized message; retry by re-clicking; no countdown.
- **Drain timeout** (G's 10s bound; sanitized retryable 409): same retention, no
  countdown — the reset was never sent, so the form is simply usable again once
  the user retries.
- **In-flight guard:** a `submitting` ref plus `isSubmitting` state makes
  duplicate submission impossible on both screens (double-click → exactly one
  request).

### G contract reference

The production source of truth is `apps/web/src/services/recovery.ts`
(SP-105G, `ea3f078`/`cfe48ae`); the full contract is documented in the SP-105G
implementation record ([`artifacts/SP-105G/implementation.md`](../SP-105G/implementation.md),
"Client contract (DoD 9)"). C consumes: `runRecoveryReset(send)` (drain, send,
commit-on-success, sanitize), `RecoveryError` + `isRecoveryError` (render
`message`, map `fieldErrors`, honor `retryAfterSeconds`), the AUTH_PATHS
isolation (recovery 401s are inert — no special handling needed in C's
methods), and the session generation (C never calls it directly — the boundary
advances it on success; C's explicit login is unguarded and re-establishes
normal operation). C itself never clears token/user, never navigates on
failure, and never writes `document.cookie`.

### C8 deviation (recorded)

`requestPasswordReset(email: string)` takes a **plain string** — the
`resendVerification(email)` precedent in `services/auth.ts` — rather than the
ticket's `ForgotPasswordRequest` type; only `ResetPasswordRequest` was added to
`types/index.ts`. The reset method returns G's `ResetPasswordResult` (single
source of truth — no duplicated shape); the forgot method returns the existing
`VerificationResponse { message }` (identical to the backend's success body).

## Verification

- `pnpm --filter @studypilot/web test` (repo root, 2026-10-16): **11 files,
  142 passed, 0 unhandled errors** — baseline was 10 files / 118 tests pre-C;
  +16 forgot +21 reset +3 login. Includes all pre-existing suites
  (`VerifyEmail` 18, `recovery` 23, `api` 14, `AuthContext` 14, `Login` 7,
  `Register` 6, `EmailVerificationBanner` 12, `Button` 4, `datetime` 7).
- `pnpm --filter @studypilot/web typecheck`: clean.
- `pnpm --filter @studypilot/web lint`: clean (`--max-warnings 0`).
- No G-owned files (`services/recovery.ts`, `services/api.ts`,
  `context/AuthContext.tsx`), no `useResendVerification` (SP-103), no backend
  files, no Header/nav additions, no `document.cookie` writes, no
  database/migration/browser infrastructure touched.

## DoD checklist

| DoD | Status |
|---|---|
| 1 functional criteria | ✅ both screens + notice implemented with tests (AC1–AC6) |
| 2 invalid input | ✅ absent/malformed/short/wrong-charset tokens → guidance state; field errors; absent/malformed/out-of-range `Retry-After` → 60s fallback |
| 3 academic data scope | N/A — no academic data accessed (ticket: DoD 3 does not apply) |
| 4 actionable errors | ✅ sanitized `RecoveryError` messages, form-level alerts, field-map mapping, byte-exact invalid-link state |
| 5 states / 6 keyboard / 7 responsive | ✅ asserted in the component tests (states, keyboard-only, `aria-live`); real-viewport/real-browser proof is D's |
| 8 automated business-rule tests | ✅ 40 new cases (16 + 21 + 3); full web suite 11 files / 142 passed |
| 9 API/client documentation | ✅ this block — browser token handling, retry representation, G contract reference, C8 deviation |
| 10 integrated development review | D obligation — one combined SP-105 parent review after all children |

## Open items / handoff notes

- Real-browser cookie-expiry ordering, viewport/keyboard proof, SMTP evidence
  and integrated DoD 10 remain SP-105D.
- Jira key: Pending creation — no tracker writes performed.
- Residuals owned elsewhere: real multi-instance/race proof (I/J via H); the
  combined SP-105 parent review covers C along with A/B/E/F/G.

## Commits

| Commit | Scope |
|---|---|
| `70e83a9` | docs: ticket refine/ground against the implemented G contract (refiner pass) — pre-implementation |
| `cae56ea` | docs: queue activation + checkpoint — pre-implementation |
| `6b97f77` | M1 — forgot-password request screen (4 files, 452 insertions) |
| `945e1d7` | docs: checkpoint — M1 complete |
| `510e36e` | M2 — reset-password screen on the G recovery boundary (7 files, 659 insertions) |
| `6dd78a8` | M3 — one-time login notice after the reset handoff (2 files, 83 insertions) |
