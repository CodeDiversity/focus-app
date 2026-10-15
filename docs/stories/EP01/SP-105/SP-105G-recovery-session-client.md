# SP-105G: Frontend Recovery Session Coordination

**Story ID:** SP-105G
**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md)
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer; backend/frontend are scope labels)
**Status:** Ready — refined and grounded 2026-10-15; implementation not started
**Dependencies:** SP-102 (complete — its client is the current `services/api.ts` + `context/AuthContext.tsx`); A/B/F contracts (implemented; verified against code 2026-10-15); C consumes this contract
**Jira key:** Pending creation
**Refined:** 2026-10-15

## Summary and bounded scope

One cohesive multi-window task (~2–4h total; three bounded checkpoints in Sizing) that gives the web client a safe recovery-operation boundary: before a password-reset POST it drains the in-flight single-flight refresh and defers new automatic refreshes; on success it advances a shared session generation that rejects stale local state writes; and it sanitizes all recovery errors and retry metadata. Independently tested with Vitest against the existing adapter-mock pattern, without any recovery pages. Exclude form/routing changes, navigation, and real-browser verification (C and D own those).

## Source requirements

AC4/AC5/AC7; session-revocation TR; [shared contract](./SP-105-password-reset.md) ("Session semantics and ordering", "Retry wire contract", "Representation and browser entry"); [shared DoD](../../../epics/README.md). All tests below are future obligations, not passing results.

## Acceptance criteria

1. **Recovery-operation boundary** (proposed `runRecoveryReset(request)` in a new `services/recovery.ts`): prevent overlapping reset operations; pause new automatic refreshes and await the existing in-flight refresh before calling the supplied reset request, using a bounded 10-second wait; if the in-flight does not settle in time, do **not** send the reset and return a sanitized retryable error. Aborting a request alone is not proof its response cookie cannot arrive: keep the operation blocked until the in-flight settles. The barrier applies only to the reset POST (R1); `forgot-password` is never drained.
2. **Shared session generation**: on reset success, advance the shared generation *before* clearing token/user, and disable automatic restore until explicit login. Every local state-mutation path checks the generation (snapshotted at request/flight start) before mutating state: the `refreshAccessToken` token-store write, queued interceptor retries, the AuthContext boot restore, profile-flight completions, and the session-expired failure callback (which must also skip its `/login` navigation). A completion that predates a successful reset is a no-op. On reset failure the barrier releases, the generation is unchanged, and the prior session is preserved subject to ordinary independently expired-session behavior. Absent a successful reset, ordinary login/logout/refresh/verification behavior is unchanged.
3. **Recovery paths and sanitized errors**: add `/auth/forgot-password` and `/auth/reset-password` to `AUTH_PATHS` in `services/api.ts` — a 401 on either must never trigger a session refresh or the global session-expired handler. Propagate only sanitized `{ status, message, fieldErrors?, retryAfterSeconds?, retryable }`: message from the global `{ statusCode, message, error, path, timestamp }` envelope, field errors from the envelope's `error` field, and `Retry-After` accepted only as a decimal integer 1–60 with a 60-second fallback when absent/malformed/out of range (PR-001 contract; F's emission is implemented and verified below). Never spread or return the raw Axios error, its config, the request body, or response headers: the reset request body carries the raw link token.
4. **Ownership boundary**: B's controller expires the HttpOnly `refresh_token` cookie server-side after commit; this operation owns local state and request ordering only and never writes `document.cookie`. C owns navigation, the one-time reset notice, URL-token lifetime, and its own typed recovery methods, which call this boundary.

## Tests (future obligations)

Vitest + jsdom via `pnpm --filter @studypilot/web test`, using the existing `api.defaults.adapter` mock pattern from `src/services/api.test.ts`; fake timers for the 10-second bound.

| Area | File | Named cases |
|---|---|---|
| Barrier | `src/services/recovery.test.ts` (new) | `delays the reset POST until the in-flight refresh settles`; `defers new automatic refreshes started while the barrier is active, then runs them after release`; `sends no reset and returns a sanitized retryable error when the in-flight does not settle within the 10s bound`; `a late refresh completion after the timeout cannot bypass the still-active drain`; `rejects a second overlapping reset operation` |
| Generation | `src/services/api.test.ts` (extend) + `src/context/AuthContext.test.tsx` (extend) | `a successful reset rejects a stale refresh token write`; `a stale interceptor retry and failure callback predating the reset perform no logout or navigation`; `a failed reset releases the barrier, preserves the prior session, and performs no logout`; `boot restore and profile-flight completions predating the reset are rejected`; `an explicit login after the reset re-establishes session operation`; `absent a successful reset, login/logout/refresh/verification behave as before` |
| Sanitization + AUTH_PATHS | `src/services/recovery.test.ts` + `src/services/api.test.ts` (extend) | `recovery 400/401/404/429/503 errors never trigger a refresh or the global session-expired handler`; `429 Retry-After is accepted only as decimal integer 1–60; absent/malformed/out-of-range falls back to 60s`; `sanitized errors exclude the Axios config, request body and response headers`; `400 validation failures surface the envelope field messages` |

The existing auth/verification suites (`api.test.ts`, `AuthContext.test.tsx`, page tests) remain required and must pass.

## Technical notes

### Inspected code (2026-10-15)

- `apps/web/src/services/api.ts` — `AUTH_PATHS` (line 22) lists the six pre-recovery auth paths; module-level `refreshPromise` single-flight (line 43) writes `tokenStore.setToken` inside `.then` before returning; the response interceptor rejects with `{ ...error, message }` (spreads the Axios error, including its config) and invokes `sessionExpiredHandler` on refresh failure.
- `apps/web/src/context/AuthContext.tsx` — local `sessionVersion` ref (line 41) guards restore/profile; the boot-restore effect runs one silent `authService.refreshToken()`; the session-expired handler clears token + user and navigates to `/login` with `sessionExpired` state.
- `apps/web/src/services/auth.ts` — `verifyEmail`/`resendVerification` already sanitize by throwing a fresh `Error` + `statusCode` (the pattern the recovery methods follow); `refreshToken()` delegates to the api single-flight.
- `apps/web/src/services/tokenStore.ts` — memory-only token; no change needed.
- **Backend contract evidence (implemented, verified):** `modules/auth/auth.controller.ts` (`resetPassword` → `clearRefreshCookie(res)` after commit; `REFRESH_COOKIE_NAME = 'refresh_token'`); `modules/auth/public-routes.ts` (both recovery routes public); `modules/auth/recovery-rate-limit.guard.ts` (sets `Retry-After` before throwing the 429); `common/cors.ts` (`exposedHeaders: ['Retry-After']`); `common/filters/all-exceptions.filter.ts` (normalized envelope; pre-set headers preserved).
- **Test setup:** `apps/web/package.json` scripts `test` (`vitest run`), `typecheck`, `lint`; Vitest 1.x + jsdom + Testing Library; `vite.config.ts` path aliases incl. `@services`, `@context`.

### Decisions (settled 2026-10-15; all contract-derived, no new product policy)

- **R1 — Barrier scope:** drain/barrier applies only to the reset POST — the one recovery operation that mutates session state and races the refresh cookie. Source: parent "Session semantics and ordering" ("G drains existing single-flight refresh and pauses automatic refresh before the reset POST"). `forgot-password` receives AUTH_PATHS + sanitized errors but is never drained.
- **R2 — Pause = defer:** new automatic refreshes arriving while the barrier is active are held and run after release (single-flight preserved; never silently dropped). Post-reset, a deferred refresh meets the server's revoked state and fails through the generation-guarded path (R3), which is a no-op on already-cleared state. Source: AC1 + CF-9.
- **R3 — Generation advances only on reset success:** login/logout keep their local `sessionVersion`; the shared generation is a second, reset-specific counter. Failure callbacks snapshot it at request/flight start and, if it advanced, skip token/user mutation **and** navigation. "Disable automatic restore until explicit login" = generation-reject of pre-reset restore/profile completions (the boot restore otherwise runs once at mount). Source: SD10, CF-9.
- **R4 — Placement:** new `apps/web/src/services/recovery.ts` owns the barrier, the generation counter, and the sanitized error type; `api.ts` and `AuthContext.tsx` consume it. If the recovery↔api import cycle (the barrier needs in-flight refresh access) proves awkward, the generation counter may split into a leaf module — behavior unchanged, footprint ≤ 4 production files. Helper/API names remain refinable without changing the shared behavior.
- **R5 — Sanitized error shape:** `{ status, message, fieldErrors?, retryAfterSeconds?, retryable }`; message from the global envelope; `fieldErrors` from the envelope's `error` field; `Retry-After` accepted only as decimal integer 1–60 with 60s fallback (PR-001). The Axios config/body/headers never propagate — the reset body carries the raw link token.

## Sizing

- **Outcome:** the web client can safely execute a password reset while a live session exists — no stale refresh can resurrect or clobber the cleared session, and recovery errors/retry metadata are sanitized end to end.
- **Time estimate:** ~2–4h total as a justified **cohesive multi-window task** (indivisible core below; accepted 2026-10-15), executed as three bounded checkpoints:
  - **M1 (~45–60m):** `recovery.ts` — barrier (drain + 10s bound + defer), generation counter, `RecoveryError` sanitizer, `runRecoveryReset`; `AUTH_PATHS` + the two recovery entries in `api.ts`. Verify: barrier cases in `recovery.test.ts` + AUTH_PATHS cases in `api.test.ts` green.
  - **M2 (~60–90m):** wire the generation through `api.ts` (token write, interceptor retry, failure callback) and `AuthContext.tsx` (boot restore, profile-flight, session-expired handler). Verify: generation cases in both test files + full web suite green.
  - **M3 (~30–45m):** contract doc block (DoD 9) + full verification pass. Verify: full `test`, `typecheck`, `lint` green.
  - Resume inputs for a fresh window: this ticket, the parent contract's "Session semantics and ordering" + "Retry wire contract" sections, `api.ts`, `AuthContext.tsx`, `auth.ts`, `recovery.ts` (once created), and the last incomplete checkpoint step with its focused verification command.
- **Files:** production — `apps/web/src/services/recovery.ts` (new), `apps/web/src/services/api.ts`, `apps/web/src/context/AuthContext.tsx`. Tests — `apps/web/src/services/recovery.test.ts` (new), `apps/web/src/services/api.test.ts` (extend), `apps/web/src/context/AuthContext.test.tsx` (extend).
- **Start context:** this ticket; [shared contract](./SP-105-password-reset.md#shared-api-contract-all-children-must-agree) (session semantics, retry wire, representation); [shared DoD](../../../epics/README.md); `apps/web/src/services/api.ts`, `auth.ts`, `tokenStore.ts`, `apps/web/src/context/AuthContext.tsx`, `apps/web/src/services/api.test.ts`, `apps/web/src/context/AuthContext.test.tsx`. Dependency contracts are implemented — no sibling story reading required to start.
- **Verification:** `pnpm --filter @studypilot/web test` (new + existing suites green), `pnpm --filter @studypilot/web typecheck`, `pnpm --filter @studypilot/web lint`. No database or browser infrastructure needed; D owns real-browser proof.
- **Dependencies / exclusions:** Requires SP-102 complete (evidence: its client is the inspected code above) and A/B/F implemented (evidence: verified backend paths above). Excluded — recovery pages/routing/forms/one-time notice (C), real-browser cookie/viewport/timing proof (D), all backend work (A/B/F), `document.cookie` writes (B), and H/I/J. Every excluded source requirement keeps its named owner.
- **Indivisible core:** the generation check spans `api.ts` token writes, queued interceptor retries, and the AuthContext restore/profile/failure paths as **one** invariant — CF-9 established that a partially guarded state lets a stale completion resurrect or clobber the session (JavaScript cannot clear the HttpOnly cookie; B's expiry response must not be overwritten by a stale refresh). Splitting the barrier from the generation, or guarding only one of the two files, would yield a partially safe increment — hence one story with checkpoints rather than a nominal session label.

## Definition of Done

Shared DoD 1/2/4/8/9 apply: meet local criteria, exercise invalid/failure paths, sanitize errors, automate the assigned rules, and document the client contract (DoD 9: the contract doc block plus this ticket; the backend endpoints are documented by A/B/F). DoD 3 is N/A: no academic data is accessed; a token authorizes only its stored owner's change. UI states/keyboard/responsiveness (DoD 5–7) belong to C and D — no new screen here. Item 10 remains required through [SP-105D](./SP-105D-password-reset-integration.md); local completion alone is not release approval. Record evidence under this child's actual Jira key after assignment; no fabricated key or test result.

## Out of scope

- Recovery pages, routes, forms, URL-token capture, navigation and the one-time reset notice — [SP-105C](./SP-105C-password-reset-frontend-ui.md).
- Real-browser cookie expiry ordering, multi-tab behavior, viewport/keyboard proof, SMTP/DB integration — [SP-105D](./SP-105D-password-reset-integration.md).
- All backend behavior (issuance, redemption, cookie expiry, per-IP limits) — A/B/F, already implemented.
- `document.cookie` writes of any kind (B owns the HttpOnly cookie); access-JWT invalidation (approved residual window); immediate cross-tab logout promises.
