# SP-105G: Frontend Recovery Session Boundary — Implementation Record

**Story:** [SP-105G](../../SP-105G-recovery-session-client.md)
**Epic:** EP01 — Authentication & Onboarding
**Parent:** SP-105 (STUDY-7)
**Layer:** Frontend (React + TypeScript + Vite)
**Status:** Implemented (2026-10-16) — awaiting parent review

## Summary

Implemented the shared **recovery-session boundary** for the web client: a new leaf
module `apps/web/src/services/recovery.ts` that, before a password-reset POST, drains
the in-flight single-flight refresh under a 10-second bound and defers new automatic
refreshes; on success advances a **shared session generation** that turns every
pre-reset local state mutation into a no-op; and sanitizes all recovery failures into
a UI-safe `RecoveryError`. Wired into `services/api.ts` (AUTH_PATHS, token write,
interceptor retry/failure, deferred single-flight) and `context/AuthContext.tsx`
(boot restore, profile flights, session-expired handler, local-session clearer).
Excludes by ticket: recovery pages/forms/navigation/notice (C), real-browser proof (D),
all backend work (A/B/F), `document.cookie` writes.

## What was built

### `services/recovery.ts` (new, M1 — commit `ea3f078`)

Leaf module importing only `../types` (type) and `./tokenStore` — no import cycle
(decision R4): `api.ts` registers its single-flight refresh via `setInFlightRefresh`,
and SP-105C supplies the reset request to `runRecoveryReset(send)`.

- **Barrier** — `idle | active | awaiting-drain`. `runRecoveryReset` rejects a second
  overlapping reset (sanitized 409, retryable), drains the in-flight refresh by
  *settlement* (resolve or reject) under `RECOVERY_DRAIN_TIMEOUT_MS = 10_000` — abort
  alone is not proof the response cookie cannot arrive. On the bound expiring first the
  reset is **not** sent and the barrier *holds* (`awaiting-drain`) until the in-flight
  actually settles (`setInFlightRefresh(null)` releases). Success/failure release.
- **Shared session generation** — `snapshotSessionGeneration()` /
  `advanceSessionGeneration()`; a successful reset advances it **before** clearing the
  in-memory token, then clears the token and invokes the registered local-session
  clearer (the AuthContext user half; navigation is C's).
- **`RecoveryError` sanitizer** — `{ status, message, fieldErrors?, retryAfterSeconds?,
  retryable }`. Message from the global envelope (constraint arrays deduped
  order-preserving and joined with `". "`, keeping the uniform invalid-link message
  byte-identical for C's clear-on-invalid-link check); `fieldErrors` only when the
  envelope `error` is a field map; `Retry-After` accepted only as decimal integer 1–60
  with a 60s fallback (PR-001; 429 only — network/503 retry manually, no countdown);
  `retryable` true for 429/5xx/network, false for 400/401/404; `status 0` = network
  failure. The raw Axios error, its config, the request body (which carries the raw
  link token) and response headers never propagate; already-sanitized values pass
  through unchanged.

### `services/api.ts` (M1 + M2 — `ea3f078`, `cfe48ae`)

- `AUTH_PATHS` gains `/auth/forgot-password` + `/auth/reset-password` (`RECOVERY_PATHS`):
  a 401 on either never triggers a session refresh or the global session-expired
  handler; recovery-path failures reject with the sanitized `RecoveryError` (the
  pre-existing spread-error shape is retained for all non-recovery paths).
- `refreshAccessToken()` snapshots the generation **at entry** (before the barrier
  decision) and rotates via `beginRefresh(generation)`: the token-store write applies
  only if the generation is unchanged, so a rotation predating a successful reset can
  never resurrect the cleared token. Rotations requested while the barrier is active
  are deferred (never dropped) as **one shared** promise — single-flight preserved —
  and keep the pre-reset snapshot even though they dispatch after release.
- Request interceptor stamps `config._generation` at dispatch; retries reuse the
  config, so a retried 401 is checked against the **original** dispatch.
- Response interceptor: a 401 whose request predates a successful reset refreshes
  nothing, retries nothing, and fires no session-expired handler; the refresh-failure
  and `_retry`-401 branches re-check the generation (a deferred rotation runs after
  release and observes an advanced generation) before clearing the token or invoking
  the handler.

### `context/AuthContext.tsx` (M2 — `cfe48ae`)

- Boot-restore effect: generation snapshot at effect run; a completion that predates a
  successful reset applies no user and clears no token (the `isLoading` flip still
  resolves).
- Profile flights (`refreshProfile`): generation snapshot at flight start; completion
  and the `needsFresh` re-run are no-ops if the generation advanced.
- Session-expired handler: registration-time generation snapshot; if advanced, skips
  the token clear, the user clear **and** the `/login` navigation.
- Registers `registerLocalSessionClearer(() => applyUser(null))` (unregistered on
  unmount) — the user half of the reset commit; the token is cleared first by
  `runRecoveryReset`.
- Explicit login/logout intentionally unguarded (R3).

### Tests

| File | New cases (M1/M2) |
|---|---|
| `services/recovery.test.ts` (new, 23) | 5 barrier cases (delay until settle; defer-then-run; 10s bound → no reset + sanitized retryable 409 + held barrier; late completion cannot bypass the drain; overlapping reset rejected) + 8 sanitizer areas (Retry-After matrix, no config/body/header leak, field messages, deduped uniform message, field-map errors, network 503-free countdown, pass-through) |
| `services/api.test.ts` (14) | recovery AUTH_PATHS never refresh/expire for 400/401/404/429/503; sanitized rejection without raw token; non-recovery spread shape unchanged; **M2:** successful reset rejects a stale refresh token write (deferred single-flight preserved), stale 401 predating the reset refreshes nothing + no handler, failed reset preserves the session and releases the barrier |
| `context/AuthContext.test.tsx` (14) | **M2:** boot-restore and profile-flight completions predating a successful reset rejected (no resurrection, no navigation); explicit login after the reset re-establishes; failed reset preserves the session and ordinary expiry still navigates |

All pre-existing suites unchanged and passing.

## Client contract (DoD 9)

The contract SP-105C consumes (production source of truth: `apps/web/src/services/recovery.ts`):

- **`runRecoveryReset(send)`** — `send: () => Promise<ResetPasswordResult>` is the
  actual `POST /auth/reset-password` through the shared api instance (C's typed
  method; body `{ token, password, confirmPassword }` with the raw 43-char link
  token). Resolves `ResetPasswordResult { message: 'Password updated. Please sign in.' }`
  on success. On failure rejects with a sanitized `RecoveryError`; the prior session is
  preserved; the barrier releases. On success C then navigates to `/login` with the
  one-time notice — this boundary never navigates and never writes `document.cookie`
  (B expires the HttpOnly cookie server-side).
- **`RecoveryError`** — `{ status, message, fieldErrors?, retryAfterSeconds?,
  retryable }`. C: render `message` (actionable; the uniform invalid-link message is
  byte-stable), map `fieldErrors` onto fields, honor `retryAfterSeconds` with a
  monotonic wait + explicit retry (never auto-resubmit), and treat `retryable` as the
  show-retry control. Token retention is C's rule: keep for field/network/429 errors,
  clear only on success or the specific invalid-link message.
- **`isRecoveryError(value)`** — type guard for values that may already be sanitized.
- **AUTH_PATHS isolation** — recovery 401s are inert with respect to session
  refresh/expiration; C needs no special handling in its methods.
- **Generation** — C needs no direct calls: the boundary advances it on success, and
  every local mutation path is already guarded. C's explicit login is unguarded and
  re-establishes normal operation.

## Verification

- `pnpm --filter @studypilot/web test` (repo root): **9 files, 102 passed, 0 unhandled
  errors** (baseline was 8 files / 68 tests pre-change) — includes all pre-existing
  auth/verification/page suites.
- `pnpm --filter @studypilot/web typecheck`: clean.
- `pnpm --filter @studypilot/web lint`: clean.
- No database, migration, or browser infrastructure touched; real-browser
  cookie/viewport/timing proof remains SP-105D.

## DoD checklist

| DoD | Status |
|---|---|
| 1 functional criteria | ✅ barrier / generation / sanitization / ownership (AC1–AC4) implemented with tests |
| 2 invalid input | ✅ malformed `Retry-After`, absent headers, non-envelope errors, constraint arrays — sanitized (recovery.test.ts) |
| 3 academic data scope | N/A — no academic data accessed; credential isolation explicit (boundary owns local state/ordering only) |
| 4 actionable errors | ✅ status-specific messages, field errors, `retryable`/`retryAfterSeconds` |
| 5 states / 6 keyboard / 7 responsive | C + D obligations — no new screen in this child |
| 8 automated business-rule tests | ✅ 23 + 14 + 14 cases in the three files; full web suite green |
| 9 API/client documentation | ✅ this client-contract block + the ticket; backend endpoints documented by A/B/F |
| 10 integrated development review | D obligation — combined SP-105 parent review after all children |

## Open items / handoff notes

- C consumes `runRecoveryReset(send)`, `RecoveryError` (+ `isRecoveryError`), and the
  AUTH_PATHS isolation as documented above; C refines its draft ticket against this
  implemented contract (queue: `Needs refinement`).
- Jira key: Pending creation — no tracker writes performed.
- Residuals owned elsewhere: real multi-instance/race proof (I/J via H), browser
  cookie-expiry ordering + viewport/keyboard proof + integrated DoD 10 (D).

## Commits

| Commit | Scope |
|---|---|
| `75e49db` | docs: ticket refine/ground (refiner pass) — pre-implementation |
| `eb4a0d2` | docs: queue activation + checkpoint — pre-implementation |
| `ea3f078` | M1 — recovery.ts, AUTH_PATHS, sanitization, barrier tests |
| `cfe48ae` | M2 — generation wiring (api.ts, AuthContext.tsx) + generation tests |
