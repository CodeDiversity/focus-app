# SP-105 Breakdown — Password Reset

**Epic:** [EP01](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-105](./SP-105-password-reset.md), existing Jira STUDY-7
**Milestone:** M1
**Status:** Planning baseline reviewed in pass 2 (2026-10-14); execution state below reconciled 2026-10-16. A/B/E/F/G/C implemented — awaiting the combined parent review; H still needs refinement; full feature/release not approved.

## Execution queue

**Delivery home:** `docs/stories/EP01/SP-105/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-105/` (created when parent checkpoint/index is written)

**Active substory:** [SP-105H](./SP-105H-postgres-test-harness.md) — needs refinement (next actionable)

**Next substory:** [SP-105H](./SP-105H-postgres-test-harness.md) — refine (refiner pass), then implement

**Implementation owner:** `implementer`, sequential across all layers.

**Final review:** One combined SP-105 review after every child and integration obligation is implemented; no automatic child reviews.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-105A-password-reset-backend-issuance.md) | Implemented — awaiting parent review | SP-103 integrated sign-off still a feature/release gate | Retain issuance evidence; final DB proof in I/D | [Implementation](./artifacts/SP-105A/implementation.md), [historical review](./artifacts/SP-105A/review.md) |
| [B](./SP-105B-password-reset-backend-redemption.md) | Implemented — awaiting parent review | Implemented before E; login/refresh race invariant remains incomplete until E | Preserve B; finish E, then prove cross-flow behavior in I/D | [Implementation](./artifacts/SP-105B/implementation.md), [historical review](./artifacts/SP-105B/review.md); PR-104 wording corrected in `6826ae0` |
| [E](./SP-105E-auth-session-coordination.md) | Implemented — awaiting parent review | SP-102 done; login/refresh/logout now use the shared owner-first protocol — the post-reset renewal invariant is closed at unit level | Hold for the combined SP-105 parent review; deterministic real-Postgres proof via I/H, browser via D | [Implementation](./artifacts/SP-105E/implementation.md), [checkpoint](./artifacts/SP-105E/checkpoint.md) |
| [F](./SP-105F-password-reset-ip-limits.md) | Implemented — awaiting parent review | Implemented 2026-10-15; residual: real multi-instance race (J via H) and browser sign-off (D) | Hold for the combined SP-105 parent review | [Implementation](./artifacts/SP-105F/implementation.md), [checkpoint](./artifacts/SP-105F/checkpoint.md) |
| [G](./SP-105G-recovery-session-client.md) | Implemented — awaiting parent review | Implemented 2026-10-16 (M1–M3); A/B/F contracts consumed; C consumes the documented client contract | Hold for the combined SP-105 parent review | [Implementation](./artifacts/SP-105G/implementation.md), [checkpoint](./artifacts/SP-105G/checkpoint.md) |
| [C](./SP-105C-password-reset-frontend-ui.md) | Implemented — awaiting parent review | G implemented 2026-10-16 (client contract consumed); A/B/F implemented — endpoints live | Hold for the combined SP-105 parent review | [Implementation](./artifacts/SP-105C/implementation.md), [checkpoint](./artifacts/SP-105C/checkpoint.md) |
| [H](./SP-105H-postgres-test-harness.md) | Needs refinement | SP-102; A/F migrations for suite execution | Bound harness setup; no integrated pass claimed | Artifact directory created on start |
| [I](./SP-105I-credential-race-tests.md) | Blocked | A/B implemented; E/H outstanding | Build/run credential race suite after prerequisites | Artifact directory created on start |
| [J](./SP-105J-limiter-integration-tests.md) | Blocked | F/H; A/B HTTP behavior | Build/run limiter suite after prerequisites | Artifact directory created on start |
| [D](./SP-105D-password-reset-integration.md) | Blocked | All implementation children and I/J; upstream evidence before release | Execute suites, collect browser/SMTP evidence, prepare parent index for final review | Parent final artifacts resolve to `./artifacts/SP-105/` |

This queue is the current execution record; the older plan inventory/gates below
are planning history, not proof that coding or final review is complete. `Needs
refinement` is actionable next work, not permission to code an unsized story.
The next-task choice prioritizes the known pre-E session race. A/B records and
existing commits are evidence pointers, not freshly rerun tests or independent
closure of old review findings. SP-103's missing integrated DoD 1/7/10 evidence
does not block E's SP-102-based implementation; it still blocks feature sign-off.

2026-10-16: SP-105C implemented (M1–M3; commits `6b97f77`, `510e36e`,
`6dd78a8`): `/forgot-password` request screen (verbatim generic success, 429
wait + explicit retry, keyboard/aria-live) and `/reset-password` reset screen
(fragment token capture/strip via the shared `utils/linkToken.ts`, form through
G's `runRecoveryReset`, token lifetime per C11) plus the one-time login notice;
40 new cases, web suite 11 files / 142 tests green, typecheck and lint clean.
Queue: C implemented — awaiting the combined parent review; next actionable is
H (needs refinement). No product policy, requirement or contract was changed.

2026-10-16: SP-105C refined and grounded (refiner pass) against the implemented
G client contract and the implemented A/B/F endpoint strings; the ticket now
carries the required sizing block (cohesive ~2–3.5h multi-window task, three
bounded checkpoints, decisions C1–C13 — single-story shape and the real-G-module
test strategy both user-accepted) and the queue records it as Ready. No product
policy, requirement or contract was changed.

2026-10-16: SP-105G implemented (M1–M3; commits `ea3f078`, `cfe48ae`): shared
recovery-session boundary in `apps/web/src/services/recovery.ts` (drain barrier
with 10s bound, shared session generation, sanitized `RecoveryError`,
`runRecoveryReset`) wired into `services/api.ts` and `context/AuthContext.tsx`;
web suite 102/102 green, typecheck and lint clean. Queue: G implemented —
awaiting the combined parent review; C moves to Needs refinement (its 2026-10-14
draft predates the implemented G contract and lacks the sizing block). No
product policy, requirement or contract was changed.

2026-10-15: SP-105G refined and grounded (refiner pass) against the implemented
A/B/F contracts and the SP-102 client; the ticket now carries the required sizing
block (cohesive ~2–4h multi-window task, three bounded checkpoints, decisions
R1–R5) and the queue records it as Ready. No product policy, requirement or
contract was changed. The SP-103 integrated-evidence gap remains a feature
sign-off/release gate only; it does not block G's SP-102-based implementation.

Records moved from `docs/artifacts/SP-105A/` and `SP-105B/` into this home's
`artifacts/` on 2026-10-15. Old directories provide navigation. Reviewer reports
are unchanged; paths quoted inside them refer to the historical reviewed state.
No application code, tests, tracker state or prior review verdict was changed.

## Planning inventory and sequencing (execution state is above)

| ID | Layer / owner | Scope | Implementation dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](./SP-105A-password-reset-backend-issuance.md) | Backend, assignee TBD | Model + token issuance + account cooldown | SP-102/103 | One focused session | Pending creation |
| [E](./SP-105E-auth-session-coordination.md) | Backend, assignee TBD | Shared login/refresh/logout coordination | SP-102 | One focused session | Pending creation |
| [B](./SP-105B-password-reset-backend-redemption.md) | Backend, assignee TBD | Atomic redemption + response-cookie expiry | A, E | One focused session | Pending creation |
| [F](./SP-105F-password-reset-ip-limits.md) | Backend, assignee TBD | Shared per-IP limits, both recovery endpoints | A/B contracts; can start against contract | One focused session | Pending creation |
| [C](./SP-105C-password-reset-frontend-ui.md) | Frontend, assignee TBD | Recovery forms + retry presentation; consumes G | G plus A/B/F contracts; finishes after endpoints/limiter | One 2–4 hour session; existing form patterns reused | Pending creation |
| [D](./SP-105D-password-reset-integration.md) | Integration, assignee TBD | Execute suites + manual browser/SMTP sign-off, DoD 10 | A, B, C, E, F, G, H, I, J | One 2–4 hour sign-off after prerequisite suites pass | Pending creation |

| [G](./SP-105G-recovery-session-client.md) | Frontend, assignee TBD | Shared recovery session boundary and sanitization | SP-102; A/B/F contracts; prerequisite to C | One 2–4 hour session | Pending creation |
| [H](./SP-105H-postgres-test-harness.md) | Integration infrastructure, assignee TBD | Real-DB connections, fixtures, deterministic barriers | SP-102; A/F migrations for suite execution | One 1–3 hour session | Pending creation |
| [I](./SP-105I-credential-race-tests.md) | Integration tests, assignee TBD | Credential race/expiry/rollback suite | A, B, E, H | One 2–4 hour session | Pending creation |
| [J](./SP-105J-limiter-integration-tests.md) | Integration tests, assignee TBD | Shared-limiter race/failure suite | F, H; A/B HTTP checks | One 1–3 hour session | Pending creation |

Existing A–D IDs and layer boundaries are preserved. E separates session coordination from redemption; F retains original per-IP scope as requested. A/E can start independently; G/F can start against the shared contract; C consumes G but cannot certify integrated behavior until counterparts land. No new Jira mutation was requested or performed.

## Shared contract and decisions

The single [shared API/session contract](./SP-105-password-reset.md#shared-api-contract-all-children-must-agree) defines request/response fields, token representation, owner-first transaction order, rate-limit 429/503 behavior and cookie/session ownership. Children repeat their applicable obligations; changes must remain consistent.

| ID | Decision and provenance |
|---|---|
| D6/D7/D9–D11 | Existing EP01 baseline: unverified accounts may recover; fragment links; separate 60s account issuance cooldown; registration password policy; routes work signed in/out. No new approval is fabricated. |
| SD1/SD2 | Preserve parent + A–D; add separately tracked E/F. Existing STUDY-7 stays parent; child keys remain Pending creation. Documentation structure only; no Jira sync implied. |
| SD3/SD4 | 43-character base64url raw token, server SHA-256 hex at rest, one-hour TTL. |
| SD5/SD6 | Owner-first locking before token writes, fresh post-wait expiry, retire outstanding tokens and revoke all refresh families in one transaction; E coordinates session issuance/rotation. Proposed mechanism, not a proven test result. |
| SD7 | **Approved 2026-10-14 conversation:** user replied “your suggestion” to the explicit choice to retain existing JWT expiry (default ~15 minutes) while fixing session races. No immediate JWT invalidation promise. |
| SD8 | **Approved 2026-10-14 conversation:** user “approve as sep” retains per-IP protection in a separate child; “yes” accepts 10 forgot requests / 30 reset submissions per IP per minute and account-independent 429s. F owns shared rolling-window enforcement; A's account cooldown is separate. No per-IP deferral. |
| SD9 | Same status/body for known/unknown/cooled-down/SMTP failure when IP admission permits; SMTP is off-path. Residual database timing must be measured/reviewed; constant time is not claimed. |
| SD10 | B expires HttpOnly cookie after commit; G coordinates refresh traffic and local state using a shared generation; C consumes G; D verifies real browser/HTTP behavior. |
| SD11 | Uniform actionable token-failure 400; distinguish password-field, network/503 and IP-429 errors for retry. |

## Original requirement and test traceability

These preserve the original SP-105 criteria rather than renumbering them to fit a revised scope. Epic scope is [EP01](../../../epics/EP01-authentication-and-onboarding.md): this capability owns “Password reset is available” and preserves account/session security; other EP01 capabilities remain with SP-101–104/106–107.

| Original AC | Owning children and acceptance/test obligations |
|---|---|
| AC1 — generic forgot response, registered or unknown | A (identical non-IP-limited 200, async SMTP), C (generic feedback), F (account-independent admission/429), D (HTTP parity/SMTP and timing review) |
| AC2 — single-use, hashed at rest, expires in 1 hour | A (hash/TTL/issuance), B (post-lock claim/retirement), D (same/distinct token races, wait-past-expiry/rollback) |
| AC3 — valid-token password update, registration policy | B (argon2id and field validation), C (matching validation), D (new password succeeds) |
| AC4 — revoke every refresh family, require re-login | B (all-owner refresh rows + cookie header), E (login/refresh interleavings), G (local state/barrier), C (boundary integration), D (both lock orders and remaining JWT window) |
| AC5 — actionable used/expired rejection, new request | B (uniform 400), C (new-link action; keep token for other error types), D (real negative cases) |
| AC6 — request/reset screens, loading/empty/error, keyboard | C (all states, focus/announcements/responsiveness), D (real viewports/keyboard and retry) |
| AC7 — rate limiting per account AND per IP | A (persisted account cooldown), F (shared 10/30 per-IP windows), C (429 retry), D (multi-instance races/admission/no mutation) |

| Original TR | Owning tests |
|---|---|
| Token single-use and expiry | A unit + B stateful/DTO + D real PostgreSQL (same/distinct token, post-wait expiry) |
| Session revocation on reset | B/E unit + D deterministic DB login/refresh barriers + G API/context generation tests and D browser cookie check |
| Generic response for unknown email | A HTTP/provider tests + F account-independent 429 + D HTTP parity/SMTP/timing assessment |
| Rate limiting | A account-boundary/service-instance tests + F shared-store/window/cleanup tests + D real multi-instance test |

### Added-child traceability (PR-002)

Original AC/TR wording above is unchanged. G owns AC4 session clearing and AC5/AC7 public error isolation; its deferred-promise API/context tests own the client session-revocation TR portion previously in C. C retains UI token/retry and navigation tests. H owns database infrastructure for AC2/AC4/AC7 and their TRs. I owns real-DB single-use/expiry, password update and revocation proofs (AC2–4); J owns AC1/AC7 generic admission/rate-limit proofs. D remains responsible for executing those suites and real-browser/SMTP/DoD 10 evidence across AC1–7. No original criterion or test is deferred.

| Shared DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A, B, C, E, F, G, H, I, J; D verifies integrated behavior |
| 2 invalid input validation | A email, B password/token, C forms, G boundary/error handling, H/I/J invalid fixtures/failures, E existing auth compatibility, F admission/proxy inputs |
| 3 academic data scope | N/A: no academic data accessed; credential isolation remains explicit in A/B/E/F |
| 4 actionable errors | A/B/C/E/F/G, verified in D |
| 5 states, 6 keyboard, 7 responsive | C obligations, D real-browser verification |
| 8 automated business-rule tests | A/B/C/E/F/G unit/component; H harness, I/J real database; D executes suites and manual E2E |
| 9 API/migration documentation | A/B/E/F; C documents browser/client behavior; G documents client contract; H/I/J document invocation/fixtures; D records integration evidence |
| 10 integrated development review | Required for every child; D performs and records it |

## Correction log

The 2026-10-14 refinement of SP-105 (in the working tree) was re-checked against the required breakdown structure and the plan quality gate. Each finding retains the original claim alongside the fix. "Original" refers to the pre-split `docs/stories/EP01/SP-105-password-reset.md` and the uncommitted `docs/stories/EP01/README.md` "Quality Gate (SP-105 refinement)" section.

### CF-1 — combined story declared ready (Blocker)
- **Date:** 2026-10-14
- **Original:** `EP01/README.md` → "Quality Gate (SP-105 refinement — 2026-10-14)"; `SP-105-password-reset.md`.
- **Original claim:** *"All 7 original acceptance criteria from SP-105 are mapped to concrete technical sections … Status: Plan ready for implementation."* — one combined backend+frontend story with requirements mapped to its own sections.
- **Consequence:** violates the required breakdown structure — separate backend/frontend children each with their own tracker issue, and requirement/test mapping to **child IDs**, not sections of one combined file. A single combined ticket cannot be implemented/reviewed independently by the backend and frontend agents, and cross-layer integration has no owner.
- **Correction:** split into parent + A/B/C/D; created this breakdown README with the per-AC / per-test / per-DoD → child maps; corrected the EP01 README.
- **Verification:** every original AC, all 4 test requirements, and every DoD item is assigned to a named child above; each child has a distinct tracker key (or "Pending creation"); the EP01 README no longer maps requirements to one combined story.
- **Status:** Fixed in plan.

### CF-2 — DoD 10 unowned (Major)
- **Original claim:** DoD 1–9 were allocated to the combined story's "backend"/"frontend" halves; **DoD 10 (integrated development review) was never assigned to an owner.**
- **Consequence:** the cross-layer integrated review had no owner; a combined story cannot express a distinct cross-layer verification.
- **Correction:** DoD 10 allocated to SP-105D (performs the integrated review); A/B/C carry the obligation.
- **Verification:** the DoD map lists item 10 → SP-105D; SP-105D's AC4 requires performing the review and recording evidence.
- **Status:** Fixed in plan.

### CF-3 — AC7 per-IP silently reduced (Major / security)
- **Original claim:** D12 reduced the original "per account **and per IP**" requirement to "per-account cooldown only." A deferral is a scope change; inheriting SP-102 Q8's *login* deferral is not approval for the reset endpoints.
- **Consequence:** the per-IP requirement would be silently dropped, weakening abuse protection on `forgot-password` (the email-flooding vector).
- **Correction:** recorded a **specific** decision (SD8): per-account 60s cooldown now; per-IP deferred to the epic API-wide rate-limiting task with a named follow-up; the original per-IP requirement is **preserved** as that follow-up. Residual risk stated: the cooldown bounds flooding to ~1/min/account; per-IP would bound cross-account flooding.
- **Verification:** the AC7 row maps per-account → SP-105A and per-IP → tracked deferral (SD8); it is **not** marked fully covered.
- **Status:** Fixed in plan (deferral auto-approved by the user, 2026-10-14).

### CF-4 — concurrency mechanism unnamed (Major / security)
- **Original claim:** the technical notes name the single-use and revocation *outcomes* but not the **mechanism** that prevents (a) two concurrent redemptions of one token or (b) two distinct valid tokens both succeeding. A read-then-unconditional-write does not establish single-use.
- **Consequence:** the security invariant was asserted, not established; a naive implementation would race.
- **Correction:** SP-105B specifies the all-or-nothing transaction (user-row `FOR UPDATE` lock + conditional claim + account-wide retirement + refresh revocation + password update; `READ COMMITTED`) with a counterexample → mechanism → falsifying-test table.
- **Verification:** SP-105B's table names the predicate/lock for each race and its owning test; SP-105D proves both races against real Postgres.
- **Status:** Fixed in plan.

### CF-5 — session-state / access-JWT gap (Minor / decision)
- **Original claim:** AC4 "revokes every refresh token family" implies full immediate logout, but stateless access JWTs (15-min) survive, and revoking refresh rows does not clear the React auth state.
- **Consequence:** the plan over-claimed (immediate logout) and under-specified the frontend (local token/user + in-flight restore).
- **Correction:** SD7 documents the bounded ~15-min access-JWT window as an accepted decision (no denylist); SP-105C (C3) specifies clearing local token/user/cookie + guarding the in-flight silent restore.
- **Verification:** the parent "session-revocation semantics," SP-105B "access-JWT window," and SP-105C AC4/C3 all state the same bounded behavior.
- **Status:** Fixed in plan.

### CF-6 — abuse-control endpoint mismatch (Minor / security)
- **Original claim:** the per-account cooldown was framed as protecting "the reset flow" generally, but a per-account cooldown does **not** throttle guessing at the *redemption* endpoint.
- **Consequence:** an unaddressed impression that the cooldown protects token-guessing.
- **Correction:** SD8/CF-6 clarify redemption is protected by 256-bit single-use 1-hour tokens (entropy), not by the issuance cooldown; the issuance cooldown bounds email flooding only.
- **Verification:** SP-105A (cooldown on issuance) and SP-105B (token entropy on redemption) each state the correct protection for their own endpoint.
- **Status:** Fixed in plan.

## Review corrections — 2026-10-14

The CF-1–CF-6 entries above preserve the previous agent's original claims and dispositions; they are historical, not fresh verification. In particular, CF-3 and CF-5's approval claims are not substantiated by this session. The following entries supersede their readiness/approval conclusions; actual user decisions recorded in SD7/SD8 now resolve the policy questions. No independent `plan-review.md` exists yet; these findings come from the parent assistant's review in this conversation. Corrections remain subject to independent re-review.

### CF-7 — inconsistent lock order (Blocker)
- **Original finding:** SP-105B, “Persistence and concurrency,” steps 1–2 claimed a token before locking its owner, while the parent required owner-first. Two distinct token claims can block account-wide retirement and form a deadlock; the prose incorrectly said the claim already held the user lock.
- **Correction:** B now specifies advisory owner discovery, owner-first serialization shared with A/E, conditional claim after the lock, fresh post-wait expiry, rollback, and controller-owned cookie expiration.
- **Verification:** Traced same-token and different-token losers through the new owner-first B steps; neither holds a token lock while waiting for the owner. Remaining cross-file synchronization is tracked below; actual PostgreSQL evidence belongs to D.
- **Status:** Fixed in plan; addressed — awaiting independent re-review.

### CF-8 — login/refresh races asserted away (Blocker)
- **Original finding:** SP-105B, “Session revocation,” said old-password verification fails after replacement and left login unchanged. Login can verify before reset and persist a new session after reset; refresh can similarly create a successor outside reset's snapshot.
- **Correction:** Added E as B's prerequisite: shared owner-first locking, login password-snapshot recheck, locked refresh re-read and signing, and both race orderings. B now points to this protocol.
- **Verification:** Compared current login (verify then uncoordinated insert) and refresh (token-first claim) with E's required order; traced reset-first failure and session-first later revocation. D must prove both on PostgreSQL.
- **Status:** Fixed in plan; addressed — awaiting independent re-review.

### CF-9 — HttpOnly cookie assigned to frontend (Major)
- **Original finding:** SP-105C AC4 and success handling assigned cookie clearing to the SPA; JavaScript cannot clear the HttpOnly refresh cookie. No reset-controller response owned the action.
- **Correction:** B owns the post-commit expiry header with existing attributes. C now drains/pauses refresh before reset and guards API token writes plus AuthContext restore with a shared session generation; D will verify real cookie behavior.
- **Verification:** Compared B with the existing cookie helper. Traced `services/api.ts` writing a token before `AuthContext` applies a user: both now have explicit C generation checks; C also prevents a delayed pre-reset refresh cookie from following the reset response. Actual browser proof belongs to D.
- **Status:** Fixed in plan; addressed — awaiting independent re-review.

### CF-10 — unsupported policy approvals (Major)
- **Original finding:** README SD7/SD8 and CF-3/CF-5 labeled the access-JWT window and per-IP deferral “auto-approved.” This conversation contains no such approval; the alleged follow-up has no specific ID/owner.
- **Correction:** SD7/SD8 now cite actual answers from this session: accept the configured JWT-expiry window and retain per-IP protection in F at the approved limits. Earlier unsupported approval assertions are retained only as historical findings. Original AC7 stays in scope.
- **Verification:** Matched SD7 to the explicit JWT question and “your suggestion”; matched SD8 to “approve as sep” and the numeric-limit question answered “yes.” Neither relies on SP-102's separate login decision.
- **Status:** Fixed in plan; actual user decisions recorded — awaiting independent re-review.

### CF-11 — response timing overclaimed (Major)
- **Original finding:** SP-105A “Security” promised identical timing because SMTP is async, despite eligible accounts doing additional database writes.
- **Correction:** A retains identical status/body and SMTP-independent response, discloses residual database-path timing, and assigns measurement/security review to A/D before sign-off. Its transform now follows the actual class-transformer callback shape.
- **Verification:** Compared eligible write paths with unknown/cooldown paths; no constant-time claim remains in A. A/D own unresolved-SMTP response and timing measurement obligations; no measured result is claimed.
- **Status:** Fixed in plan; addressed — awaiting independent re-review.

### CF-12 — broken links and readiness overclaim (Major)
- **Original finding:** All moved child epic links used `../../epics/`, resolving into `docs/stories/epics/`; readiness rows passed despite policy and concurrency gaps. SP-103's latest review still has unverified integrated DoD obligations.
- **Correction:** All moved epic/DoD links now use the correct three-level relative path. Parent and EP01 README point to six separate children and distinguish corrected planning from upstream integrated verification and independent approval.
- **Verification:** Local Markdown file-link resolution passed for every SP-105 document. Final cross-file comparison checked all six children against the parent contract and AC/TR/DoD maps; no application tests were run for these docs-only edits.
- **Status:** Fixed in plan; addressed — awaiting independent re-review.

### PR-001 — Retry wire contract and browser access (Medium)
- **Discovery:** 2026-10-14, reviewer pass 1; parent lines 34/42, F AC3, C retry behavior; API CORS exposes no retry header and exception filter drops extra body fields.
- **Original finding:** Retry guidance lacks a settled wire contract and browser accessibility ownership. A header-only implementation can be unreadable cross-origin; a body extension can be removed by normalization.
- **Consequence:** C cannot implement promised retry behavior consistently.
- **Correction:** Parent settles integer-second Retry-After calculation/range; F owns emission and CORS exposure; C/G parse safe retry metadata with 60-second fallback; D owns actual separate-origin JavaScript readability/account parity and token/session preservation.
- **Verification:** Compared parent retry section, F AC3/HTTP tests, C retry behavior/tests and D browser-origin steps; header survives existing filter without body extension. No implementation is claimed.
- **Status:** Fixed in plan; **Addressed — awaiting re-review**.

### PR-002 — Frontend/integration scope and prerequisite ownership (Medium)
- **Discovery:** 2026-10-14, reviewer pass 1; README inventory lines 16–17/161, C lines 42–55, D lines 43–64.
- **Original finding:** Frontend and integration children still combine independently testable outcomes without grounded session sizing. C includes shared session infrastructure; D assumes an absent reusable browser/database harness while constructing substantial suites.
- **Consequence:** Claimed focused-session sizing depends on unowned prerequisites.
- **Correction:** Preserved A–F; G owns shared frontend boundary, H minimal Postgres harness, I credential race suite, J limiter suite. C owns pages consuming G; D only executes prerequisites and performs manual browser/SMTP sign-off. No missing browser runner is assumed.
- **Verification:** Compared ten-child inventory, parent dependencies, C/G ownership, H→I/J→D graph and original AC/TR/DoD allocation. CI migration/Postgres and existing Vitest/JSDOM capabilities are identified; each new outcome has a bounded session and local tests.
- **Status:** Fixed in plan; **Addressed — awaiting re-review**.

### Independent closure — reviewer pass 2 (2026-10-14)

The [pass-2 reviewer report](./plan-review.md#prioritized-findings-and-closure) independently verifies **PR-001** and **PR-002 resolved in plan**, with no new blocking findings. The earlier “Addressed — awaiting re-review” entries above preserve the original planner disposition; this entry records subsequent reviewer closure. Verdict: **Plan Ready**; execution remains **Implementation Blocked** for SP-103 integrated evidence. Planned behavior and future tests are not implementation verification.

## Current readiness and verification (2026-10-14)

| Gate | Status | Evidence / limitation |
|---|---|---|
| Child separation and sizing | Pass for planning | Ten-child inventory gives bounded scopes: C pages, G shared session, H harness, I/J distinct suites, D sign-off; no unowned harness setup remains. |
| Original AC/TR coverage | Pass for planning | All seven ACs and four TRs mapped above; F explicitly retains per-IP AC7. No scope deferral is claimed. |
| API/data consistency | Pass for planning | Parent shared contract and A/B/C/F agree on token shape, server hashing, success and uniform token-400 messages, field errors, per-IP 429/503 and retry. B owns response-cookie expiry. |
| Security counterexamples | Pass for proposed mechanism | B owner-first token claim; A issuance order; E locked login snapshot/refresh re-read; G pre-reset drain and API/context generations; F atomic shared admission. I owns real credential proof, J limiter races; D executes and records integrated evidence. None is claimed implemented. |
| Applicable DoD, including 10 | Pass for planning | Shared map and every child allocate obligations; D performs real integrated verification. N/A only for genuinely absent academic/UI concerns. |
| Material decisions | Pass | SD7/SD8 cite explicit answers in this conversation (JWT expiry window, separate IP limits and numeric thresholds). |
| References/code evidence | Pass for planning | Relative Markdown file links checked; actual source paths inspected: auth controller/service/strategy, schema, API single-flight and AuthContext restore. Proposed reset/limiter modules are labeled new. |
| Correction completeness | Pass | CF-1–CF-12 and original PR-001/002 entries retained; reviewer pass 2 independently verifies both PR findings resolved, recorded in the closure entry above. |
| Dependency mapping and sequencing | Pass | Inventory and parent identify G→C, H→I/J→D; upstream completion blocks execution only. |
| Upstream implementation readiness | Blocked / not independently complete | SP-103 latest `docs/artifacts/STUDY-12/review.md` still cannot verify integrated DoD 1/7/10. Recheck new evidence before execution sign-off; source implementation alone is not approval. |
| Independent plan review | Pass | [Reviewer pass 2](./plan-review.md) returns Plan Ready and independently resolves PR-001/002; no new blocking planning findings. |
| Jira sync | Not applicable to this request | No sync authorized/performed; child keys remain Pending creation, parent STUDY-7 retained. |

**Outcome:** **Plan Ready**, independently verified by reviewer pass 2; **Implementation Blocked** pending SP-103 integrated evidence; no material user decision remains open in this correction pass. Application implementation and integrated tests are future work. A/D's database-timing measurement is a security sign-off obligation, not a constant-time result. No application source, migration, test or tracker was modified. Scoped commits require parent Git escalation: sandbox rejected index.lock; no commit by planner. Unrelated instruction changes remain untouched.
