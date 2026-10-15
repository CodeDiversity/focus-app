# SP-105E checkpoint
Updated: 2026-10-15 12:20 EDT
Status: implementation complete — awaiting parent review
Story: docs/stories/EP01/SP-105/SP-105E-auth-session-coordination.md
Review unit: SP-105 parent (docs/stories/EP01/SP-105/artifacts/SP-105/ implementation index) — child E
Role / scope: implementer; backend only. Apply the SP-105 owner-first locking protocol to `AuthService.login` / `refresh` / `logout` (close the login/refresh-vs-reset races). Exclude: new endpoints, cookie/header changes (already in B), per-IP limits (F), frontend (C/G), real-Postgres race suites (H/I).

## Repository state
- Workspace / branch: focus-app / `main`
- HEAD at last update: post-move commit (E impl `74fa577`, B lint fix `f0391fa`, docs `72e3da1`, then this relocation)
- Saved work: `apps/api/src/modules/auth/auth.service.{ts,spec.ts}` (E) + `password-reset.service.spec.ts` (drive-by lint); artifacts relocated to `docs/stories/EP01/SP-105/artifacts/SP-105E/`
- Other work to preserve: concurrent planner commit `1461e65` (delivery-state + colocated-artifacts convention; moved A/B into `artifacts/`) — untouched, E commits sit on top

## Progress
- [x] Resumed state: A + B implemented and committed; B artifact confirms E is the outstanding prerequisite and `owner-lock.ts` (`lockOwner`, `databaseNow`) is ready to reuse.
- [x] Confirmed SP-102 (STUDY-9) complete & reviewed; SP-103 (STUDY-12) release gate is about email-verification integrated evidence, out of E's scope (login/refresh/logout only).
- [x] Login: `authenticate` snapshot before tx → `lockOwner` → re-read under lock → require `passwordHash` unchanged → create refresh → sign JWT under lock. (AC1/AC2/AC4/AC5)
- [x] Refresh: advisory owner discovery → `lockOwner` before any token write → `databaseNow` fresh clock → re-read under lock → conditional claim/rotation/reuse (commit-then-throw) → successor + sign under lock. (AC3/AC5/AC6)
- [x] Logout: owner-first (probe → lock → revoke one family with fresh timestamp) in one tx; idempotent. (AC1/AC6)
- [x] 3 new stateful protocol tests (login hash-mismatch, login missing-owner, refresh fresh-clock); preserved race/reuse/logout suite.
- Current step: done. Full API typecheck + 202 tests + lint(0 err) green; artifact + checkpoint written.

Drive-by: removed pre-existing unused `where` destructure in `password-reset.service.spec.ts` (B file) that was failing the package lint gate at HEAD.

## Decisions and dependencies
- Reuse `owner-lock.ts` (`lockOwner`, `databaseNow`) — parameterized `SELECT ... FOR UPDATE` on `users`, `clock_timestamp()` after the lock.
- Unknown credential / missing owner / hash mismatch all map to the existing generic `UnauthorizedException('Invalid email or password')` — no existence oracle, no client-supplied owner id (AC1).
- Access-JWT window stays SD7-bounded (no denylist, no immediate invalidation); the protocol only blocks *post-reset renewal* via those credentials.
- Lost/reuse refresh claims must COMMIT family revocation (return invalid → throw after commit), never throw inside the tx.
- `validateUser` shape unchanged (LocalStrategy + tests depend on it); snapshot compare uses the hash it already verified.
- Real deterministic race/expiry proof is SP-105I (real Postgres via H); unit tests here are the contract-level red/green.

## Verification
- `pnpm --filter @studypilot/api typecheck` → clean.
- `pnpm --filter @studypilot/api test` → 18 suites, **202 passed**, 13 pre-existing DB skips, 1 pre-existing skipped suite.
- `pnpm --filter @studypilot/api test auth.service.spec` → 23 passed (was 20).
- `pnpm --filter @studypilot/api lint` → 0 errors (1 pre-existing `no-console` warning in main.ts, out of scope).

## Resume next
- E is implemented and committed. For a **fresh window**: nothing to do on E except hold for the SP-105 parent review (DoD 10, real-Postgres proof is SP-105I/H, browser is SP-105D). Next dependency-ready children for the parent: F (per-IP limits, start against A/B contracts), then G→C (frontend), H→I/J (integration), then D (sign-off).
- Hand off the combined SP-105 scope to the independent reviewer once all children + integration land; do not self-approve.
