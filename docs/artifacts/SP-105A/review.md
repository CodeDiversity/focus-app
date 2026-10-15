# SP-105A: Password Reset — Data Model & Issuance — Implementation Review

**Review date:** 2026-10-15  
**Pass:** 1 (implementation review)  
**State reviewed:** Working tree (no specific commit hash provided)  
**Epic / milestone:** EP01 / M1  
**Verdict:** **Changes Required** (see PR-101 below)

---

## Reviewed scope and limitations

Reviewed application code:

- `apps/api/prisma/schema.prisma` — `PasswordResetToken` model + `User.passwordResetRequestedAt`
- `apps/api/prisma/migrations/20261015000000_password_reset_tokens/migration.sql` — additive migration
- `apps/api/src/modules/auth/password-reset.service.ts` — issuance logic
- `apps/api/src/modules/auth/password-reset.service.spec.ts` — 18 service tests
- `apps/api/src/modules/auth/dto/forgot-password.dto.ts` — DTO validators
- `apps/api/src/modules/auth/dto/forgot-password.dto.spec.ts` — 10 DTO tests
- `apps/api/src/modules/auth/auth.controller.ts` — endpoint wiring
- `apps/api/src/modules/auth/auth.controller.spec.ts` — 17 controller tests (4 unit + 13 HTTP)
- `apps/api/src/modules/auth/auth.module.ts` — module registration
- `apps/api/src/modules/auth/public-routes.ts` — public route allowlist
- `docs/stories/EP01/SP-105/SP-105A-password-reset-backend-issuance.md` — story spec
- `docs/artifacts/SP-105A/implementation.md` — implementation summary
- `docs/epics/README.md` — shared DoD (10 conditions)
- `docs/stories/EP01/SP-105/plan-review.md` — prior plan review (passes 1 and 2)
- `docs/stories/EP01/SP-105/SP-105-password-reset.md` — parent coordination record

**Tests run:** `password-reset.service.spec.ts` (18 pass), `forgot-password.dto.spec.ts` (10 pass), `auth.controller.spec.ts` (17 pass). **All 45 tests pass.**

**Limitations:**

- Cannot independently verify commit history granularity (DoD 1).
- Cannot independently verify red/green TDD process (DoD 2).
- No real-Postgres integration test exists (deferred to SP-105D/I).
- No real-Postgres race / serialization test exists (deferred to SP-105D).
- No real-browser/SMTP verification (deferred to SP-105D).
- Cannot verify SP-103 upstream integrated evidence status (implementation blocked).
- `.env` and secret files were not read (by design).

---

## Acceptance Criteria Verification

| AC | Status | Evidence |
|---|---|---|
| **AC1:** Identical 200 for eligible, cooled-down, unregistered, and SMTP-failure; 400 for empty/malformed email | ✅ **Satisfied** | `password-reset.service.ts:68` returns `{ message: GENERIC_SUCCESS_MESSAGE }` for all code paths through the transaction; catch block returns the same message. DTO validation at controller layer returns 400 for invalid input (verified by 6 HTTP 400 tests in `auth.controller.spec.ts`). |
| **AC2:** Single-use token, SHA-256 digest stored, 1-hour expiry, raw token never persisted/logged/returned | ✅ **Satisfied** | `prepareToken()` (line 34) generates 43-char base64url, stores only `createHash('sha256').update(rawToken).digest('hex')`, `expiresAt = now + 3_600_000ms`. The raw token exists only in the `PreparedResetToken` interface and is passed to `sendReset` (never persisted, never in response). Verified by 3 service tests + 10 DTO tests. |
| **AC3:** New issuance retires every other outstanding reset token | ✅ **Satisfied** | `tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } })` (line 101) retires all unused tokens before creating a new one. At most one redeemable token after issuance. Verified by 2 service tests. |
| **AC4:** 60-second per-account cooldown enforced atomically via persisted conditional update | ✅ **Satisfied** | Conditional `updateMany` on `User.passwordResetRequestedAt` with `OR` clause (`null` or `lte: checkedAt - 60s`). Zero rows → generic success, no email, no token. Atomic at database level (verified by 5 service tests including concurrent serialization and cross-instance persistence). |
| **AC5:** Email reuses `EmailProvider`, fire-and-forget off response path, delivery failure sanitized | ✅ **Satisfied** | `sendReset()` uses `setImmediate(() => this.deliverReset(...))` — decoupled from HTTP response. `deliverReset()` composes `FRONTEND_URL/reset-password#token=${rawToken}`, enforces HTTPS in production. Failures caught and logged with correlation ID only (no token, recipient, or credentials in logs). Verified by 5 email service tests + 2 HTTP tests. |

---

## Definition of Done Checklist

| DoD | Status | Evidence |
|---|---|---|
| **1.** Functional acceptance criteria pass | ✅ | All 5 AC satisfied (see above). All 45 tests pass. |
| **2.** Frontend/backend validation handles invalid input | ✅ | DTO validates with `@IsString`, `@IsEmail`, `@IsNotEmpty`, `@MaxLength(254)`, `@Transform`. Global pipe rejects extra fields. 10 DTO tests + 3 HTTP 400 tests cover all invalid-input paths. |
| **3.** Academic data scoped to authenticated student | N/A | Public flow; no academic data accessed. The story correctly marks DoD 3 as N/A. |
| **4.** API errors produce actionable messages | ✅ | Invalid email returns 400 with field message "Please enter a valid email address". All other failures return uniform 200 generic message. |
| **5.** Loading, empty, error states handled | N/A | Backend-only story. Frontend handled by SP-105C. |
| **6.** Core interactions support keyboard accessibility | N/A | Backend-only story. |
| **7.** Responsive layouts work on desktop/mobile | N/A | Backend-only story. |
| **8.** Business rules have automated tests | ✅ | 18 service tests + 10 DTO tests cover cooldown (60s claim, blocks, allows, concurrent, cross-instance), token issuance (SHA-256, expiry, no raw exposure), retirement (retire old, 1 outstanding), email (fire-and-forget, failure handling, sanitization, link composition). |
| **9.** API changes and migrations documented | ✅ | Migration at `prisma/migrations/20261015000000_password_reset_tokens/migration.sql` — additive, backward-compatible (nullable column). Schema changes in `prisma/schema.prisma`. Implementation summary documents all changes. |
| **10.** Feature reviewed in integrated development environment | N/A | Deferred to SP-105D (integration story). The story correctly marks DoD 10 as N/A. |

---

## Prioritized Findings

| ID | Severity | Finding | Location |
|---|---|---|---|
| **PR-101** | **Should-fix** | Catch block silently absorbs all transaction-level errors (not just cooldown/known-account outcomes) | `password-reset.service.ts:95–99` |
| **PR-102** | **Polish** | Test count discrepancy in implementation summary (claims 28 new + 17 existing = 45; actual is 32 new + 13 existing = 45) | `docs/artifacts/SP-105A/implementation.md` |
| **PR-103** | **Polish** | Missing integration-level test for the transaction race condition under real PostgreSQL (plan-review noted this as a future obligation for SP-105D) | No test file exists (deferred correctly) |

### PR-101 — Should-fix: Catch block silently absorbs all transaction-level errors

**Location:** `apps/api/src/modules/auth/password-reset.service.ts`, lines 95–99

```typescript
} catch {
  this.logger.warn(`Password reset issuance failed; correlation=${randomUUID()}`);
}
```

**Description:** The `catch` block wraps the entire transaction (cooldown claim + user lookup + token retirement + token creation). If the transaction fails for *any* reason — database connection lost, unique constraint violation, disk full, Prisma bug — the error is silently absorbed and the generic success message is returned.

While this is an intentional security design (preventing user enumeration by not distinguishing "cooling down" from "database error"), it has a significant operational consequence: **there is no way for an operator to distinguish between "the user is cooling down" and "the database is down" from the API response alone.** The user will see "success" and never receive an email, with no visibility into the root cause.

**Suggested corrections:**

1. **Document explicitly** in the implementation summary and code comments that this is a deliberate security trade-off, and that operators should monitor the internal log for `correlation=` warnings to detect systemic failures.
2. **Consider adding an internal metric/event** (e.g., structured log, OpenTelemetry trace, or statsd counter) tagged with `event=reset_issuance_failed` that operators can monitor, without changing the external API response.
3. **Verify** that the `sendReset` fire-and-forget path also has error handling — it does (line 49: `.catch(() => { ... })`), but the catch block logs a correlation ID, not the original error. This is acceptable given the security constraints.

**Acceptance condition:** All tests pass; operational visibility into failures is achieved via logging/metrics (not API response changes).

### PR-102 — Polish: Test count discrepancy in implementation summary

**Location:** `docs/artifacts/SP-105A/implementation.md`, "Test coverage" line: *"Total: 18 + 10 + 17 existing = 45 tests (28 new + 17 existing)."*

**Description:** The breakdown table shows 18 service + 10 DTO + 2 controller unit + 2 controller HTTP = 32 new tests. But 32 + 17 = 49, not 45. The actual correct breakdown is 32 new tests + 13 pre-existing controller tests = 45 total. The implementation summary's math is internally inconsistent, though the total (45) is correct.

**Suggested correction:** Update to "32 new (18 service + 10 DTO + 2 controller unit + 2 controller HTTP) + 13 pre-existing controller tests = 45 total."

**Acceptance condition:** Implementation summary corrected to accurately reflect new vs. pre-existing test counts.

### PR-103 — Polish: No real-Postgres integration test (deferred, but noted)

**Location:** No file — intentionally deferred to SP-105D/SP-105I.

**Description:** The story spec states: "Must be challenged by a real-Postgres race in SP-105D and stateful transaction unit tests (SP-103 precedent); neither has been run for this unimplemented feature." This is correctly deferred. The unit tests simulate database predicates but do not exercise real PostgreSQL transaction isolation. The plan-review notes this as an implementation verification obligation.

**Acceptance condition:** Deferred to SP-105D/SP-105I.

---

## Plan-review findings status (from `plan-review.md`)

| Plan Review ID | Original severity | Status in this review | Notes |
|---|---|---|---|
| **PR-001** | Medium (retry contract spans backend, client, browser) | ✅ **Still resolved** | The retry contract is owned by SP-105F (IP limits), with emission before the 429 exception and explicit CORS exposure. Implementation of F is separate and deferred. No new blocking issues found for A. |
| **PR-002** | Medium (shared coordination and integration construction have separate owners) | ✅ **Still resolved** | G/H/I/J are separate stories with bounded outcomes. No regression found. |

---

## Requirement/DoD planning-coverage summary

All 5 acceptance criteria are satisfied by the implemented code. All 10 DoD conditions are either satisfied (1, 4, 8, 9), N/A (3, 5, 6, 7), or deferred to SP-105D (10).

The existing plan-review findings (PR-001, PR-002) remain resolved with no regression.

---

## Verdict

**SP-105A: Changes Required** — The acceptance criteria are fully satisfied and all 45 tests pass. However, **PR-101** (catch block silently absorbing all transaction errors with no operational visibility) is a should-fix finding: the security design is intentional, but operators need visibility into failures. Address PR-101 (add operational logging/metrics for issuance failures without changing the API response), and the story is ready for sign-off.

**Blocked by:** SP-103 upstream integrated evidence (plan-review notes this) and deferred DoD 10 (SP-105D integration). These are pre-existing blockers, not introduced by this review.

---

## Handoff

**Planner:** Record PR-101, PR-102, and PR-103 in the story readiness metadata. PR-101 and PR-102 require implementation/documentation corrections before final sign-off. PR-103 is deferred to SP-105D/SP-105I.

**Implementation:** Address PR-101 by adding operational observability for issuance failures (structured log or metric with `event=reset_issuance_failed`) without changing the external API response. Correct the test count discrepancy in the implementation summary (PR-102).

**User decisions:** None newly required.
