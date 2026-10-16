# SP-105G checkpoint

Updated: 2026-10-15 21:25 EDT
Status: in progress
Story: docs/stories/EP01/SP-105/SP-105G-recovery-session-client.md
Review unit: SP-105 parent (`docs/stories/EP01/SP-105/artifacts/SP-105/` implementation index) — child G
Role / scope: implementer; frontend only (`apps/web`). Outcome: shared recovery session boundary — barrier (drain + 10s bound + defer), shared session generation, sanitized recovery errors — in `services/recovery.ts`, wired into `services/api.ts` and `context/AuthContext.tsx`. Excludes: recovery pages/forms/navigation/notice (C), real-browser proof (D), all backend work (A/B/F), `document.cookie` writes.

## Repository state
- Workspace / branch: focus-app, `main`
- HEAD at last update: 75e49db (docs: SP-105G refine/ground; queue advances to Ready)
- Saved work: queue + checkpoint + ticket status committed (this file's commit)
- Other work to preserve: none — working tree was clean at start

## Progress
- [ ] M1 — `recovery.ts` (barrier, generation counter, `RecoveryError` sanitizer, `runRecoveryReset`) + the two recovery entries in `AUTH_PATHS` (`api.ts`); barrier cases in `recovery.test.ts` + AUTH_PATHS cases in `api.test.ts` green
- [ ] M2 — generation wiring through `api.ts` (token write, interceptor retry/failure) and `AuthContext.tsx` (boot restore, profile flight, session-expired handler, local-session clearer); generation cases in both test files + full web suite green
- [ ] M3 — DoD 9 client contract doc block + full `test`/`typecheck`/`lint` pass
- Current step: M1 not started. Baseline `pnpm --filter @studypilot/web test` = 8 files / 68 tests green (2026-10-15, pre-change).

## Decisions and dependencies
- SP-102 client is the inspected code (module-level single-flight in `api.ts`, `sessionVersion` in `AuthContext.tsx`); A/B/F contracts verified against code: `recovery-rate-limit.guard.ts` sets `Retry-After` (1–60) before throwing the 429; `all-exceptions.filter.ts` envelope `{ statusCode, message, error, path, timestamp }` with `message: string | string[]`; `clearRefreshCookie` after commit.
- **R4 leaf layout adopted (no recovery↔api import cycle):** `recovery.ts` imports only `../types` (type) + `./tokenStore`; `api.ts` registers the in-flight refresh via `setInFlightRefresh`; `runRecoveryReset(send)` takes the request callback C provides (AC1 "supplied reset request"), so `recovery.ts` never imports `api.ts`.
- **Sanitizer shape (R5 grounded to the implemented filter):** `message` = envelope string, or the constraint array deduped (order-preserving) and joined with `'. '` — dedupe keeps the uniform invalid-link message byte-identical for C's equality check (a malformed token trips 2–3 constraints carrying the same custom message). `fieldErrors` from the envelope `error` field only when it is a field map (the implemented filter always emits a string today, so constraint messages surface via the joined `message`). `retryAfterSeconds` only for 429: decimal integer 1–60 else 60. `status 0` = network failure (no response). `retryable`: 429/5xx/network true; 400/401/404 false.
- **Generation snapshot points:** `refreshAccessToken` at entry (so a barrier-deferred flight keeps the pre-reset generation even though it *starts* after release); request interceptor via `config._generation`; AuthContext boot-restore effect, profile flight, session-expired handler at registration. Explicit login/logout stay unguarded.
- **Barrier release policy:** reset success/failure → release; 10s drain timeout → hold (`awaiting-drain`) until `setInFlightRefresh(null)` from the settling in-flight refresh.
- Client-side 409s (drain timeout, overlapping reset): `retryable: true`, no `Retry-After` countdown (SD11 distinguishes IP-429).
- axios 1.20 applies `config.timeout` only in the xhr/http adapters — custom test adapters are timer-free, so fake-timer drain tests are deterministic.

## Verification
- `pnpm --filter @studypilot/web test` (repo root): 8 files, 68 passed — baseline, pre-change
- `typecheck` / `lint`: not yet run

## Resume next
1. `apps/web/src/services/recovery.test.ts` (new): barrier cases 1–5 + sanitizer cases (red — module missing); then implement `recovery.ts`; add the two `AUTH_PATHS` entries + `setInFlightRefresh` registration in `api.ts`; add the recovery AUTH_PATHS cases to `api.test.ts`.
2. `pnpm --filter @studypilot/web test` — expect new recovery + api cases green, existing 68 unchanged.
- Read next: ticket Sizing M1–M3; parent contract "Session semantics and ordering" + "Retry wire contract"; `apps/web/src/services/api.ts`; `apps/web/src/context/AuthContext.tsx`.
