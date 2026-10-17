# SP-105: Password Reset — Combined Parent Implementation Review

**Review date:** 2026-10-16 (America/New_York)
**Pass:** 2 (combined parent implementation review — re-review after the pass-1 verdict **Changes Required**)
**State reviewed:** `main` @ `8b363d4` (last commits: `cf05ebf` PR-107 fix, `8b363d4` fix record + queue update; working tree verified clean by the delegated runner)
**Epic / milestone:** EP01 / M1 — STUDY-7
**Review mode:** Implementation review (parent scope, all children)
**Verdict:** **Pass** — SP-105 meets the shared Definition of Done and the original AC1–7. PR-107 and PR-108 are closed with fresh evidence; no open blocker or should-fix finding remains. Two polish items stay open and non-blocking (PR-109 code nits; PR-111's SP-103 gate-ratification bookkeeping). This report replaces the pass-1 report at this path (preserved in Git history at commit `58b3283`).

---

## Reviewed scope and limitations

**Read and verified in this pass (read-only):**

- Parent: `README.md` (queue incl. the 2026-10-16 PR-107 entry), `SP-105-password-reset.md`, `plan-review.md`, `artifacts/SP-105/implementation.md` (parent index)
- Pass-1 report (this path at `58b3283`) and the fix record: `artifacts/SP-105A/implementation.md` §§ "Review corrections" and "Pass-1 combined parent review fix — PR-107"
- Code: `apps/api/src/modules/auth/password-reset.service.ts` (full re-read, 274 lines), `owner-lock.ts` (header), `password-reset.service.spec.ts` (double + proof tests), `dto/register.dto.ts` / `dto/reset-password.dto.ts` (PR-109 state)
- Historical finding dispositions: `artifacts/SP-105A/review.md` (PR-101–103), `artifacts/SP-105B/review.md` (PR-104–106)
- Execution: shell is blocked in this reviewer session, so automated tests were run by a delegated **read-only runner** (a `general` subagent instructed to modify nothing, read no `.env*`, and use only inline disposable credentials). Its verbatim summary outputs are quoted below and I checked the code-level claims they support directly in source.

**Limitations:**

- Test execution came via the delegated runner, not this session's own process — reported as executed-with-delegation rather than first-party shell output.
- Real-browser behavior rests on the D6 blanket approval, now **explicitly ratified by the user** as sufficient for DoD 10 (PR-108 closure path (b); provenance in the correction log).
- Jira remains untouched (no authorized sync; keys "Pending creation").

---

## PR-107 closure — independently verified in source

**Claim:** issuance stamps every timestamp from a fresh post-lock database wall clock, not the application clock (refined ticket line 63; shared contract SD5).

**Verified at `cf05ebf` (`password-reset.service.ts`):**

| Check | Evidence |
|---|---|
| `prepareToken()` is clock-free | Interface `{ rawToken, tokenHash }` (`:20-23`); constructor generates only the token + SHA-256 digest, no `Date` reads (`:47-59`, with a PR-107 rationale comment) |
| Discovery precedes any lock/write; unknown email → generic success | `tx.user.findUnique({ where: { email } })` + early `return false` (`:113-117`) — no enumeration regression |
| Explicit owner lock before any credential write | `lockOwner(tx, user.id)`, false → `return false` (`:122`) — matches the shared SP-105 order used by B (`:236`) and E |
| Fresh post-lock wall clock | `const checkedAt = await databaseNow(tx)` **after** the lock (`:127`) |
| Cooldown claim from the DB clock, scoped to the owner | `updateMany` where `{ id: user.id, OR: [null, { lte: checkedAt - 60s }] }`, set to `checkedAt` (`:131-145`) |
| Retirement + expiry from the DB clock | retire `usedAt: checkedAt` (`:148-151`); create `expiresAt = checkedAt + RESET_TOKEN_TTL_MS` (`:154-160`) |
| No app-clock reads remain in the issuance path | The only `new Date(...)` calls under `forgotPassword` are arithmetic over `checkedAt`; `sendReset`/`deliverReset` stamp nothing. Grep for bare `new Date()` in the issuance transaction: none |

**Unit proof (spec, re-read in source):** the issuance double now implements the redemption double's `$queryRaw` contract — `FOR UPDATE` (advancing fake timers by `state.lockWaitMs`) and `clock_timestamp()` returning an injectable `state.dbNow` (spec `:47-59`). New cases assert, with the DB clock skewed **+5 min** ahead of the Node clock, that the claim marker and `expiresAt` follow the DB clock (spec `:342-351`); with a simulated 5 s lock wait that the claim lands at the post-wait time and that the `FOR UPDATE` call is ordered before the claim via `invocationCallOrder` (`:354-365`; the wait-and-expire analogue for redemption exists since pass 1 at `:691`). `prepareToken` test trimmed to shape + digest + exact key set (`:290-301`).

**Integration proof (re-executed on the fixed code):** the disposable-PostgreSQL suite I (`password-reset.integration.spec.ts`) — which exercises this exact issuance path end to end on real PostgreSQL 15 — passed 15/15 in this pass's run (26/26 across H/I/J, see Execution evidence). The disposable-DB re-run that pass 1's handoff requested was thus performed here; the documented "deferred by user decision" in the fix record predates it.

**Conclusion: PR-107 closed.** The pass-1 residual ("PR-107 clock-skew exposure" in the security assessment) is removed: TTL and cooldown are now stamped and enforced in the same clock.

---

## PR-108 closure — user ratification (path b)

Pass 1 offered two closure paths: (a) a targeted per-step browser-matrix re-run, or (b) explicit user ratification that the D6 blanket approval is sufficient for DoD 10. **On 2026-10-16 the user chose (b): "Ratify D6 blanket approval."**

Disposition recorded in the parent README correction log with date and substance (decision provenance). D's artifact continues to honestly record the granularity limits (no per-step return, browser/version unspecified, Mailpit pre-cleared for re-inspection); the ratification accepts that granularity for DoD 10. No new verification is fabricated: the ratification is the closing evidence, as pass 1's fix menu prescribed.

**Conclusion: PR-108 closed.** DoD 5/6/7 "real browser CANNOT VERIFY" caveats and DoD 7's CANNOT VERIFY row from pass 1 are thereby covered by a recorded user decision for the purposes of this story's sign-off.

---

## Prior findings status (IDs preserved from pass 1)

| ID | Pass-1 severity | Status in pass 2 | Fresh evidence |
|---|---|---|---|
| PR-107 | Should-fix | **Resolved** | Source + unit + integration verification above |
| PR-108 | Should-fix | **Resolved** | User ratification 2026-10-16 (correction log entry) |
| PR-109 | Polish | **Open (non-blocking)** | Placeholder comment-only test still at `password-reset.service.spec.ts:314-317`; `@IsString` message drift still at `reset-password.dto.ts:57` vs `register.dto.ts:15` (default message) |
| PR-110 | Polish | **Resolved** | Back-filled correction-log entries for PR-101–106 added in this pass's passing-review docs sync (verified from the A/B historical reports) |
| PR-111 | Polish | **Partially resolved; remainder open (non-blocking)** | Parent status line refreshed in this pass's sync (`SP-105-password-reset.md:9`). The SP-103 gate-reinterpretation record-level ratification still has not been obtained from the user; it is recorded below as an open process item, not silently absorbed |

No new findings were raised in pass 2 — no new PR IDs are assigned, so no ID is reused.

---

## Acceptance coverage (original SP-105 AC1–7, pass-2 state)

Unchanged from pass 1 except where noted; all mechanisms were re-verified in source during pass 1 and the changed path is re-verified above.

| AC | Verdict | Pass-2 note |
|---|---|---|
| AC1 generic forgot response | Pass | Unconditional claim now also holds for a vanished owner row (`lockOwner` false → generic success) where pass 1's code threw internally |
| AC2 single-use, SHA-256 at rest, 1-h TTL | Pass | TTL now stamped and enforced in the same (DB) clock; redemption reference implementation unchanged |
| AC3 valid-token update, registration policy | Pass | Unchanged (`argon2id` + `ARGON2_OPTIONS` before the transaction) |
| AC4 revoke refresh families, re-login | Pass | Unchanged |
| AC5 uniform used/expired rejection + re-request | Pass | Unchanged |
| AC6 screens, states, keyboard | Pass | Automated suites re-executed green (web 142); real-browser dimension covered by the ratified D6 approval (PR-108) |
| AC7 per-account AND per-IP limits | Pass | Claim marker/boundary now single-clock; limiter path untouched and re-executed green (suite J) |

Ownership scoping is unchanged: no academic-data queries introduced; every credential write is owner-scoped; unknown email/missing owner/unknown token collapse to the same generic 200 / uniform 400 (no existence oracle).

---

## Shared Definition of Done audit (pass 2)

| DoD | Status | Evidence |
|---|---|---|
| 1 Functional criteria | **Pass** | AC table above; integration suites re-executed on the fixed code |
| 2 Invalid input validation | **Pass** | Unchanged from pass 1 (DTOs, guard, fail-closed store) |
| 3 Academic data scope | **Pass (N/A, justified)** | No academic data accessed; verified again on the changed file |
| 4 Actionable errors | **Pass** | Unchanged (uniform 400, 429 + integer `Retry-After`, sanitized 503) |
| 5 States | **Pass** | Automated green (web 142); real-browser covered by ratified D6 |
| 6 Keyboard | **Pass** | Automated green; real-browser covered by ratified D6 |
| 7 Responsive | **Pass** | Responsive classes in source; viewport coverage accepted via the ratified D6 blanket approval (was CANNOT VERIFY in pass 1 — upgrade through PR-108's recorded user decision, not a new measurement) |
| 8 Automated business-rule tests | **Pass (re-executed)** | All suites executed this pass (below); counts reconcile with the recorded baselines |
| 9 API/migration documentation | **Pass** | Records complete; six migrations deploy cleanly to a fresh DB (re-executed `migrate deploy` this pass); PR-107 fix note added to A's record (`8b363d4`) |
| 10 Integrated development review | **Pass** | D performed it (recorded at `db0218f`); the blanket-approval granularity concern (PR-108) is resolved by the user's 2026-10-16 ratification |

---

## Security assessment

All six pass-1 invariants re-verified in source (single-use conditional claim under the owner lock; owner-first ordering across A/B/E; full refresh-family revocation; no enumeration; token never persisted/logged/returned; fail-closed limiter). The issuance path now shares the exact lock order with redemption and session mutations, and PR-105's `owner-lock.ts` header is updated to say so (`owner-lock.ts:22`).

**Residual, disclosed:** bounded ~15-min access-JWT window (SD7, user-approved); residual database-path timing differences (AC6 sample, no constant-time claim — SD9). **Removed:** the pass-1 clock-skew residual. **Open, non-security:** PR-109 polish; SP-103 gate bookkeeping (PR-111).

---

## Execution evidence (delegated runner, 2026-10-16, at `main @ 8b363d4`)

| Step | Command (via runner) | Result |
|---|---|---|
| Git state | `git log --oneline -5`; `git status --short` | `8b363d4` ← `cf05ebf` ← `58b3283` ← `db0218f`; working tree clean |
| API unit | `pnpm --filter @studypilot/api run test --runInBand` | 20 suites passed, 2 skipped; **239 passed, 18 skipped** (skips are the declared pre-conditions; was 237 + 2 new PR-107 cases) |
| API typecheck | `pnpm --filter @studypilot/api typecheck` | clean |
| Web unit | `pnpm --filter @studypilot/web run test` | 11 files / **142 passed** |
| Web typecheck | `pnpm --filter @studypilot/web typecheck` | clean |
| Migrations | `DATABASE_URL=<disposable> prisma migrate deploy` | All six migrations applied (`20261011000000_init` … `20261015060000_recovery_rate_limit_buckets`) |
| Integration H/I/J | `TEST_DATABASE_URL=<disposable> pnpm --filter @studypilot/api run test:integration --runInBand` | 3 suites / **26 passed, 0 skipped** on ephemeral `postgres:15-alpine` (diagnosed container removed after the run) |

Runner compliance: no repository file modified; no `.env*` read; the disposable `TEST_DATABASE_URL`/`DATABASE_URL` (invented password, `_test`-suffixed database per H's invocation contract) existed only in the process environment.

---

## Open items (non-blocking) and gates

1. **PR-109 (polish, code):** delete or assert the placeholder test (`password-reset.service.spec.ts:314-317`) and align the `@IsString` message (`reset-password.dto.ts:57` vs `register.dto.ts:15`). No urgency; requires the coordinator to authorize an implementation write.
2. **SP-103 integrated evidence (unchanged upstream release gate):** SP-103's (STUDY-12) integrated DoD 1/7/10 remain CANNOT VERIFY there. This gates the **EP01 feature release**, not this sign-off, and is recorded as such in D's artifact and here. The queue's reinterpretation of the old "Implementation Blocked" execution status ("blocks feature sign-off, not implementation") remains planner-recorded without user ratification (PR-111 remainder) — recorded as an open bookkeeping item, not overridden by this review.
3. **Jira:** no sync authorized; child keys remain "Pending creation".

## Handoff

**Coordinator/user:** PR-109 remains available to authorize as a follow-up write; the SP-103 release gate is the next substantive EP01 work item if desired.
**Planner:** the correction-log and queue sync has been performed by this review per policy; no further correction is required for sign-off.
**Reviewer (no further pass required):** SP-105 is signed off at pass 2; any future change to the reset path reopens review through the normal cadence.

## Verdict

**Pass — SP-105 meets the Definition of Done and all original acceptance criteria (AC1–7) at `main @ 8b363d4`:** every security mechanism, the shared contract, and all automated suites verified, with PR-107 fixed and re-proven on real PostgreSQL and PR-108 closed by explicit user ratification. Open items are polish/gate bookkeeping only and do not condition this sign-off.
