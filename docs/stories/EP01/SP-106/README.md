# SP-106 Breakdown — Student Profile and Preferences

**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-106](./SP-106-profile-and-preferences.md), existing Jira STUDY-11
**Milestone:** M1
**Status:** Planned 2026-10-17 — **Plan Ready** (planning gate; no implementation
performed). 2026-10-17: breakdown complete — all four child tickets (A–D) landed
in incremental commits (`75f8eba` scaffold, `d2fab80` A, `1f69094` B, `327b50f` C,
`57d789f` D). 2026-10-17: SP-106A implementation complete — awaiting combined
parent review; next actionable is SP-106B (execution queue below is the current
record).

## Execution queue

**Delivery home:** `docs/stories/EP01/SP-106/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-106/` (created when the parent
checkpoint/index is written)

**Active substory:** None — SP-106A implementation complete 2026-10-17
(awaiting combined parent review; checkpoint
[./artifacts/SP-106A/checkpoint.md](./artifacts/SP-106A/checkpoint.md)).

**Next substory:** [SP-106B](./SP-106B-patch-profile-validation.md) — implement
(its prerequisite — A's model fields + GET shape — has landed).

**Implementation owner:** `implementer`, sequential across all layers (A → B → C → D;
backend/frontend/integration are scope labels, not concurrent writers).

**Final review:** One combined SP-106 review after every child and the integration
obligation are implemented; no automatic child reviews. Final artifact path:
`./artifacts/SP-106/review.md`; integration/index owner: SP-106D (parent index
written at `./artifacts/SP-106/implementation.md`).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-106A-profile-schema-and-get.md) | Implemented — awaiting parent review | SP-104 implemented and reviewed (STUDY-10 review PASS) | — (combined parent review after all children) | [checkpoint](./artifacts/SP-106A/checkpoint.md) · [implementation](./artifacts/SP-106A/implementation.md) · commits `fbd0ab7`, `71aff0d`, `775d4eb` (2026-10-17: 260/260 tests, typecheck, lint clean) |
| [B](./SP-106B-patch-profile-validation.md) | Ready | A implemented (fields exist on the model and GET response — `fbd0ab7`/`71aff0d`) | Implement | — (artifacts created at implementation) |
| [C](./SP-106C-profile-preferences-form.md) | Queued | B implemented (PATCH + 400 `errors` contract; GET fields) | Implement after B | — |
| [D](./SP-106D-profile-integration.md) | Queued | A, B, C implemented | Implement (round-trip suite + manual browser sign-off) | — |

The queue is the current execution record. B/C/D are fully refined and sized
(ready tickets) but not `Ready`-state because their implementation
prerequisites have not landed; `Queued` is their honest state.

## Child inventory

| ID | Layer / owner | Scope | Dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](./SP-106A-profile-schema-and-get.md) | Backend, `implementer` | `timeZone` + `preferences` on `User` (one migration); `GET /users/me` returns them, credentials excluded | SP-104 (done) | One 60–90 min session | Pending creation |
| [B](./SP-106B-patch-profile-validation.md) | Backend, `implementer` | `PATCH /users/me` (replaces PUT) with IANA + bounded-preferences validation; field-level 400 `errors` map; dead service methods removed | A | One ~90 min session (largest child; indivisible core) | Pending creation |
| [C](./SP-106C-profile-preferences-form.md) | Frontend, `implementer` | Profile page time-zone field (browser-detected default, client IANA validation, field-level API errors, form states); PATCH switch; stored-zone display via shared helper | B | One 60–90 min session | Pending creation |
| [D](./SP-106D-profile-integration.md) | Integration, `implementer` | Cross-session round-trip + cross-student + credential-exclusion proof on real Postgres; manual browser sign-off (DoD 10) | A, B, C | One ~60 min session | Pending creation |

Sequence: A → B → C → D, one sequential writer. D is the named integration
owner for cross-layer verification.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D106-1 | **Preferences persistence:** `timeZone String @default("UTC")` as a first-class `User` column (later epics depend on it directly) plus a nullable `preferences Json?` bag for future minimal prefs (EP06 study defaults). One additive migration; no new model. | User-approved 2026-10-17 (recommended option; the story offered "JSON field or related `UserPreference` model"). |
| D106-2 | **Update endpoint converges to `PATCH /users/me`.** The scaffold's `PUT` is removed with no alias: the only consumer is our own web app (SP-106C switches `api.put` → `api.patch` in the same parent scope), and SP-107's wizard consumes PATCH. Partial-update semantics match the AC ("updates name, time zone, and preference fields"). | Story AC-106-02 specifies PATCH; the scaffold delta is recorded in the parent ticket. |
| D106-3 | **Frontend pre-fill rule:** the time-zone field pre-fills with the stored value; when the stored value is still the schema default (`"UTC"`), it pre-fills with `getBrowserTimeZone()` instead. The student can change it and save. This makes the browser-detected zone "a sensible default the student can change" (AC-106-04) without auto-writing on registration. | Planner 2026-10-17, grounded in AC-106-04 + the story technical note (display uses the *stored* zone). |
| D106-4 | **IANA validation mechanism:** `Intl.DateTimeFormat` construction try/catch on both layers — a custom class-validator on the backend DTO, the existing `isValidTimeZone` in `apps/web/src/utils/datetime.ts` (TECH-01 stub) on the frontend. Deterministic, no new dependencies (Node ≥ 13 ships full ICU). | Planner 2026-10-17, grounded in the existing web helper + Node ICU. |
| D106-5 | **`preferences` payload bounds:** must be a plain JSON object (no top-level array/string/number) with serialized size ≤ 4096 bytes, enforced on both layers. Prevents storage abuse through an open-ended JSON column. | Planner 2026-10-17 (security guard for D106-1's JSON bag). |
| D106-6 | **400 error contract gains an additive `errors` field map.** A custom `ValidationPipe` subclass (`exceptionFactory`) emits `{ statusCode, message: string[], error, errors: { <field>: string[] }, path, timestamp }`; the existing `message` array is preserved verbatim so no other endpoint's contract changes. The web `ApiError` type already anticipates `errors?: Record<string, string[]>`. | Planner 2026-10-17, grounded in `all-exceptions.filter.ts` inspection (it passes `message` arrays through but drops field names) and the web `ApiError` type. |
| D106-7 | **Dead, unscoped `UsersService.findAll`/`remove` are deleted** (SP-104 flagged them for SP-106). The users module is self-scoped `/users/me` only; unrouted unscoped user lookups are a latent enumeration hazard. Folded into B (same service file) rather than a separate child — a few minutes of work with no independent outcome. | SP-104 ticket "Out of scope" note; planner 2026-10-17. |
| D106-8 | **Time-zone UI is a free-text input, not a select.** AC-106-03 requires the frontend to *reject* invalid values; a select of valid zones cannot produce one. Free text + `isValidTimeZone` refinement is the grounded reading. | Planner 2026-10-17, grounded in AC-106-03 wording. Reversible. |
| D106-9 | **M1 form edits `name` + `timeZone` only.** The `preferences` JSON bag is accepted by the API (B) but not surfaced in the M1 UI — no raw JSON editor; EP06 surfaces concrete study defaults. The form omits `preferences` from the PATCH body (partial update leaves it untouched — no data loss). | Planner 2026-10-17, grounded in the story note "keep preference fields minimal (study defaults can defer to EP06)". |

## Shared API contract

The fixed cross-child contract. A creates the read side, B the write side, C
consumes both, D verifies end-to-end.

```text
GET /users/me            (authenticated — global guard; no id parameter)
  200 → {
    id, email, name, emailVerifiedAt,
    timeZone: string,            // IANA identifier; "UTC" for new students
    preferences: object | null,  // plain JSON object; null until first set
    createdAt, updatedAt
  }
  Never includes: passwordHash, emailVerificationTokens, passwordResetTokens,
  refreshTokens, or any other student's data.

PATCH /users/me          (authenticated; replaces the scaffold's PUT — no alias)
  body: { name?: string, timeZone?: string, preferences?: object }   // partial
  200 → same shape as GET (updated row)
  400 → { statusCode: 400, message: string[], error: "Bad Request",
           errors: { <field>: string[] }, path, timestamp }
        (message array preserved for compatibility; errors map is additive — D106-6)
  401 → unauthenticated (global default-deny guard, SP-104)
  404 → not possible: the target id is derived from the JWT principal only.

PUT /users/me            removed (D106-2); a tokened PUT now 404s at the router.
```

Validation rules (both layers, D106-4/D106-5): `timeZone` — valid IANA
identifier only; `preferences` — plain object, serialized ≤ 4096 bytes;
unknown fields — 400 (existing global `forbidNonWhitelisted`).

**Downstream consumers:** SP-107 (onboarding wizard step 1 reuses this
endpoint for time zone + display name — the EP01 README flags it) and EP04/EP05
consume the stored `timeZone` via the shared `apps/web/src/utils/datetime.ts`
helpers, never re-implementing zone logic.

## Source requirements and test traceability

The parent ticket's six acceptance criteria (original wording preserved in
[SP-106](./SP-106-profile-and-preferences.md)) and three test requirements
from its technical notes, assigned stable IDs:

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-106-01 | `GET /users/me` returns the current student's profile and preferences, excluding credential fields. | A (shape), B (PATCH response shape), D (wire proof) |
| AC-106-02 | `PATCH /users/me` updates name, time zone, and preference fields. | B (endpoint), C (form submits), D (round-trip) |
| AC-106-03 | Time zone accepts only valid IANA identifiers; invalid values rejected on both frontend and backend. | B (backend 400), C (frontend refinement) |
| AC-106-04 | The time zone defaults to the browser-detected zone, offered as a sensible default the student can change. | C (pre-fill rule D106-3) |
| AC-106-05 | All changes persist between sessions. | B (DB persistence), D (new-login proof) |
| AC-106-06 | Invalid input produces actionable field-level messages; the settings form handles loading, error, and success states. | B (`errors` map), C (field display + states) |

| Test requirement (original) | Owning tests |
|---|---|
| TR-106-01 — invalid time zone rejection | B (DTO/validator unit + integration 400), C (form refinement case) |
| TR-106-02 — profile persistence | B (same-session GET-after-PATCH), D (cross-session new-login) |
| TR-106-03 — no cross-student access | B (row-unchanged under A's PATCH), D (two-student HTTP proof) |

Epic acceptance criteria (EP01, original wording; stable IDs assigned here):

| Epic AC (original) | Stable ID | Owner |
|---|---|---|
| Students can register, authenticate, and sign out. | AC-E01-01 | SP-101/SP-102 (out of scope here) |
| Password reset is available. | AC-E01-02 | SP-105 (out of scope here) |
| Unauthenticated requests cannot access protected academic data. | AC-E01-03 | SP-104 (done); A/B keep the `/users/me` 401 regression |
| Students cannot access or modify another student's records. | AC-E01-04 | B, D |
| Students can complete or resume initial setup. | AC-E01-05 | SP-107 (downstream consumer of this contract) |
| Account and academic settings persist between sessions. | AC-E01-06 | A, B, D |

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A, B, C; D verifies integrated behavior |
| 2 invalid-input validation | B (backend), C (frontend) |
| 3 student data scoping | A, B — routes self-scoped via the JWT principal; no id parameter exists; cross-student impossible by construction, proven in B/D |
| 4 actionable API errors | B (field-level 400), C (display) |
| 5 loading/empty/error states | C (form states) |
| 6 keyboard accessibility | C (Input `aria-invalid`/`aria-describedby` wiring) |
| 7 responsive layouts | C (existing card layout; new field follows it) |
| 8 automated business-rule tests | A, B, C, D |
| 9 API/migration documentation | A (migration), B (API contract change — this README) |
| 10 integrated development review | D (manual browser sign-off) + the combined parent review |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| No cross-student profile/preference access | Student A, authenticated, attempts to read or modify student B's profile | The controller derives the target id from the JWT principal only (`@CurrentUser()`); no id in the request body or path; the service queries by that id. A cannot name B at all — the losing request cannot be constructed. | B (row-unchanged under real SQL), D (two-student HTTP proof) |
| Credential fields never exposed | A malicious client inspects every `GET`/`PATCH /users/me` body | Explicit Prisma `select` lists the seven safe fields; `passwordHash` and token relations are never selected. | A (unit select assertion), D (wire assertion: no `passwordHash`/token keys) |
| Invalid or oversized preferences cannot be stored | Client sends a top-level array, a 10 MB JSON blob, or a non-object | DTO validators (plain-object check + 4096-byte serialized cap) + the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`) → 400 before the service runs. | B (DTO unit + integration 400) |
| Only IANA time zones are accepted | Client sends `Mars/Olympus`, `UTC+5`, `""`, or a non-string | `Intl.DateTimeFormat` try/catch on both layers (D106-4); invalid → 400 backend / field error frontend, nothing written. | B (validator unit + integration), C (form refinement) |

## Plan correction log

### CF-106-01 — Stale claim: the shared date/time helper "does not exist"

- **Discovery:** 2026-10-17, during planning, in the moved parent ticket
  `docs/stories/EP01/SP-106-profile-and-preferences.md` (then
  `docs/stories/EP01/SP-106-profile-and-preferences.md`), Technical Notes delta:
  "no shared date/time formatting helper (TECH-01/STUDY-20 also calls for that
  helper stub)".
- **Original finding (preserved):** the delta listed the helper stub among
  missing pieces, implying SP-106 must create it.
- **Consequence:** an implementer would have re-created or forked a module that
  already exists and is pinned by tests, violating the stub's own header
  ("Extend this module — do not fork it").
- **Correction:** verified `apps/web/src/utils/datetime.ts` +
  `apps/web/src/utils/datetime.test.ts` exist (TECH-01 delivered the stub:
  `isValidTimeZone`, `getBrowserTimeZone`, `formatDate/Time/DateTime`); the
  parent ticket's delta section now records the helper as **existing** and
  SP-106C consumes it (display + client validation).
- **Verification:** file read 2026-10-17 (32 lines + 41-line test, all
  functions present); SP-106C technical notes cite it as inspected, not
  proposed.
- **Status:** `Fixed in plan`.

## Quality gate (2026-10-17)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Four children, each with a full sizing block grounded in inspected code. Independently verifiable outcomes separated: schema/GET (A) ≠ PATCH/validation (B) ≠ form (C) ≠ integration sign-off (D). The shared pipe/filter change is folded into B (its field-error contract is untestable without the DTO); the dead-method deletion is folded into B (same file, no independent outcome) — both rationale-recorded in the tickets. B is the largest child (~90 min, indivisible endpoint+validation core). |
| 2. Original AC/TR coverage | Pass | AC-106-01…06 and TR-106-01…03 all mapped above; no requirement owned only in prose; epic ACs 3/4/6 mapped, 1/2/5 owned by sibling stories. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above; items 5/6/7 owned by C, item 10 by D + the combined parent review; no N/A rows without a reason. |
| 4. Contract consistency and integration ownership | Pass | One shared contract section; PUT→PATCH switch consistent across B and C; D is the named cross-layer integration owner with explicit dependencies. |
| 5. Code paths inspected | Pass | `schema.prisma` (User), `users.controller/service/dto`, `main.ts` (ValidationPipe), `all-exceptions.filter.ts` + spec, `test/test-http.ts`, `users-data-scoping.spec.ts`, `Profile.tsx`, `AuthContext.tsx` (adapter), `authSlice.thunks.ts`, `services/auth.ts`, `types/index.ts`, `Input.tsx`, `errors.ts`, `utils/datetime.ts` + test, SP-104/SP-108 review artifacts. Unverified: none material — the one assumption (Node full-ICU for `Intl`) is standard since Node 13 and is pinned by a test in B. |
| 6. Feature-specific risks/counterexamples | Pass | Four invariants with concrete counterexamples, mechanisms, and owning tests above (data-ownership + scheduling-adjacent time-zone checks; no single-use credentials in this scope). |
| 7. Dependency mapping and sequencing | Pass | A → B → C → D, one sequential writer; upstream SP-104 (implemented/reviewed) and SP-108 (implemented/reviewed) verified in code; downstream SP-107/EP04/EP05 consumption noted in the contract section. |
| 8. Material decisions | Pass | D106-1 user-approved 2026-10-17; D106-2…9 grounded in the story's own ACs/notes or inspected code; no open material question. |
| 9. Correction log | Pass | CF-106-01 fixed in plan, verification recorded. |
| 10. Jira identity/sync | Not applicable | No sync authorized for this task. Parent keeps existing STUDY-11; children A–D are `Pending creation`; no duplicate keys. |

**Outcome:** **Plan Ready** — all applicable planning gate rows pass; no
unresolved material planning findings. Implementation is **not blocked**:
upstream SP-104 (guards/scoping) and SP-108 (web store) are implemented and
reviewed. No implementation or passing tests are claimed; the plan approves
planning obligations only.

## Final implementation review unit

- **Parent:** SP-106 (STUDY-11) — `docs/stories/EP01/SP-106/`
- **In scope:** SP-106A, SP-106B, SP-106C, SP-106D (all children + integration)
- **Integration/index owner:** SP-106D (writes the parent index at
  `./artifacts/SP-106/implementation.md`)
- **Gate:** one combined SP-106 review after every child is implemented
  (`./artifacts/SP-106/review.md`); child implementation completion unblocks
  dependent work, but only the passing combined review establishes sign-off.
