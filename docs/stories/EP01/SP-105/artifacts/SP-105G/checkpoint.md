# SP-105G checkpoint

Updated: 2026-10-16 (M3 complete)
Status: implementation complete — awaiting parent review
Story: docs/stories/EP01/SP-105/SP-105G-recovery-session-client.md
Review unit: SP-105 parent (`docs/stories/EP01/SP-105/artifacts/SP-105/` implementation index) — child G
Role / scope: implementer; frontend only (`apps/web`). Outcome: shared recovery session boundary — barrier (drain + 10s bound + defer), shared session generation, sanitized recovery errors — in `services/recovery.ts`, wired into `services/api.ts` and `context/AuthContext.tsx`. Excludes: recovery pages/forms/navigation/notice (C), real-browser proof (D), all backend work (A/B/F), `document.cookie` writes.

## Repository state
- Workspace / branch: focus-app, `main`
- HEAD at last update: cfe48ae (feat: SP-105G M2 — shared session generation guards)
- Saved work: M1 (`ea3f078`) + M2 (`cfe48ae`) committed; M3 is this checkpoint + `implementation.md` (queued with the queue update)
- Other work to preserve: none — working tree clean apart from this child's planning artifacts

## Progress
- [x] M1 — `recovery.ts` (barrier, generation counter, `RecoveryError` sanitizer, `runRecoveryReset`) + the two recovery entries in `AUTH_PATHS` (`api.ts`); barrier cases in `recovery.test.ts` + AUTH_PATHS cases in `api.test.ts` green. Committed `ea3f078`.
- [x] M2 — generation wiring through `api.ts` (token write, interceptor retry/failure, `_generation` dispatch stamp, deferred single-flight) and `AuthContext.tsx` (boot restore, profile flight, session-expired handler, local-session clearer); generation cases in both test files + full web suite green. Committed `cfe48ae`.
- [x] M3 — DoD 9 client contract doc block (`implementation.md` "Client contract (DoD 9)") + full `test`/`typecheck`/`lint` pass.
- **Complete.** Post-M3 `pnpm --filter @studypilot/web test` = 9 files / 102 passed, 0 unhandled errors; `typecheck` and `lint` clean (2026-10-16). Child is `implementation complete — awaiting parent review`; no child-level reviewer/auditor is triggered (review cadence: one combined SP-105 parent review).

## Decisions and dependencies
- SP-102 client is the inspected code (module-level single-flight in `api.ts`, `sessionVersion` in `AuthContext.tsx`); A/B/F contracts verified against code: `recovery-rate-limit.guard.ts` sets `Retry-After` (1–60) before throwing the 429; `all-exceptions.filter.ts` envelope `{ statusCode, message, error, path, timestamp }` with `message: string | string[]`; `clearRefreshCookie` after commit.
- **R4 leaf layout adopted (no recovery↔api import cycle):** `recovery.ts` imports only `../types` (type) + `./tokenStore`; `api.ts` registers the in-flight refresh via `setInFlightRefresh`; `runRecoveryReset(send)` takes the request callback C provides (AC1 "supplied reset request"), so `recovery.ts` never imports `api.ts`.
- **Sanitizer shape (R5 grounded to the implemented filter):** `message` = envelope string, or the constraint array deduped (order-preserving) and joined with `'. '` — dedupe keeps the uniform invalid-link message byte-identical for C's equality check (a malformed token trips 2–3 constraints carrying the same custom message). `fieldErrors` from the envelope `error` field only when it is a field map (the implemented filter always emits a string today, so constraint messages surface via the joined `message`). `retryAfterSeconds` only for 429: decimal integer 1–60 else 60. `status 0` = network failure (no response). `retryable`: 429/5xx/network true; 400/401/404 false.
- **Generation snapshot points:** `refreshAccessToken` at entry (so a barrier-deferred flight keeps the pre-reset generation even though it *starts* after release); request interceptor via `config._generation`; AuthContext boot-restore effect, profile flight, session-expired handler at registration. Explicit login/logout stay unguarded.
- **Barrier release policy:** reset success/failure → release; 10s drain timeout → hold (`awaiting-drain`) until `setInFlightRefresh(null)` from the settling in-flight refresh.
- Client-side 409s (drain timeout, overlapping reset): `retryable: true`, no `Retry-After` countdown (SD11 distinguishes IP-429).
- axios 1.20 applies `config.timeout` only in the xhr/http adapters — custom test adapters are timer-free, so fake-timer drain tests are deterministic.

## Decisions (added during M1 execution)
- `refreshAccessToken` snapshots the generation at entry, *before* the barrier-defer decision; a deferred flight runs `beginRefresh(generation)` with the pre-reset snapshot even though it dispatches after release (R2/R3).
- Deferred single-flight: while the barrier is active, at most one deferred rotation is shared (`deferredRefresh` promise), preserving the single-flight invariant (R2); on release it adopts an already-started refresh instead of dispatching a duplicate.

## Verification
- `pnpm --filter @studypilot/web test` (repo root): 9 files, 102 passed, 0 unhandled errors — final M3 pass (2026-10-16); baseline was 8 files / 68 tests pre-change; 95 after M1
- `pnpm --filter @studypilot/web typecheck`: clean — final M3 pass
- `pnpm --filter @studypilot/web lint`: clean — final M3 pass
- Note (fixed in ea3f078): the two fake-timer drain tests attached their rejection handlers after `advanceTimersByTimeAsync` — an unhandled-rejection hazard that fails the suite; handlers are now attached before the timer advance.
- No database, migration, or browser infrastructure touched; real-browser proof remains SP-105D.

## Resume next
- **Nothing — the child is complete.** The full M1–M3 outcome is recorded in `implementation.md` (client contract included for C) and the parent queue:
  - G: `Implemented — awaiting parent review` (hold for the combined SP-105 parent review).
  - Next queue task: SP-105C → `Needs refinement` (refiner grounds its 2026-10-14 draft against the implemented G contract; then implementer resumes).
- If a review finding requires a fix, this checkpoint resumes the fix in the same implementation ownership; the final implementation/review artifacts live at the parent (`artifacts/SP-105/`).
