# SP-106 Breakdown — Student Profile and Preferences

**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-106](./SP-106-profile-and-preferences.md), existing Jira STUDY-11
**Milestone:** M1
**Status:** Planned 2026-10-17 — **Plan Ready** (planning gate; no implementation
performed). 2026-10-17: breakdown complete — all four child tickets (A–D) landed
in incremental commits (`75f8eba` scaffold, `d2fab80` A, `1f69094` B, `327b50f` C,
`57d789f` D). 2026-10-17: SP-106A implementation complete — awaiting combined
parent review; next actionable is SP-106B (execution queue below is the current
record). 2026-10-17: SP-106B implementation complete — awaiting combined parent
review; next actionable is SP-106C. 2026-10-17: SP-106C implementation complete —
awaiting combined parent review; next actionable is SP-106D. 2026-10-17: SP-106D
implementation complete — integration obligation discharged (round-trip suite on
a disposable real Postgres 7/7, API 288/288 zero skips, web 188/188, manual
browser sign-off approved with recorded limitations); all four children handed to
the combined SP-106 parent review, parent index at
`./artifacts/SP-106/implementation.md`. 2026-10-17: combined parent review pass
1 returned **Changes Required** (one blocking finding, IR-106-01 — the Profile
page never read the stored time zone), saved at `./artifacts/SP-106/review.md`;
the finding was fixed in `5050b82` (stored-zone hydration + re-seed, unknown-zone
PATCH guard, 5 new page tests, root README `PUT`→`PATCH`) and all four children
are handed to the combined parent re-review. 2026-10-18: SP-106E implementation
complete (D106-10 time-zone select, commit `4def5c2`) — all five children handed
to the combined parent review. 2026-10-18: combined parent review pass 2
returned **Changes Required** (findings IR-106-09…14: E's AC-1/2/4 gaps in
`getTimeZones()` and the display line, two missing E tests, stale parent
records, and the DoD-10 browser gate predating the select UI), saved at
`./artifacts/SP-106/review.md`; the implementer fixed IR-106-09/10/11/13 plus
ride-along polish IR-106-02/03/06/15(a–c) the same day (web 201/201, API
292/292 zero skips on a disposable Postgres, typechecks and lints clean).
2026-10-18: **IR-106-14 closed by coordinator ratification** — the user
confirmed the select-based `/profile` page tested and passing, extending the
2026-10-17 integrated sign-off to the select UI (the review's user-ratification
closure path; DoD 10 satisfied). All five children with all pass-2 findings
closed were handed back for the combined parent re-review, their finding IDs
intact from IR-106-16 onward. 2026-10-18: **combined parent
re-review pass 3 returned `Pass`** — all pass-2 should-fix findings
(IR-106-09/10/11/13/14) closed and independently verified at `390a510`; IR-106-14
via the review's user-ratification closure path (coordinator, 2026-10-18);
gates recorded in `./artifacts/SP-106/review.md` (web 201/201, API 26 suites /
292/292 zero skips, typechecks/lints clean; implementer-executed fix-pass gates
reused after reviewer Git reconciliation); the only new finding is polish
IR-106-16 (optional fix-pass commit-hash records cleanup). Report saved at
`./artifacts/SP-106/review.md`, children A–E marked `Reviewed`, SP-106
sign-off established.

## Execution queue

**Delivery home:** `docs/stories/EP01/SP-106/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-106/` (created when the parent
checkpoint/index is written)

**Active substory:** None — the combined SP-106 parent re-review returned **Pass**
2026-10-18 (pass 3, report at
[./artifacts/SP-106/review.md](./artifacts/SP-106/review.md)): all pass-2
should-fix findings (IR-106-09/10/11/13/14) closed and independently verified;
IR-106-14 closed by coordinator ratification 2026-10-18; children A–E marked
`Reviewed`. Checkpoints
[./artifacts/SP-106A/checkpoint.md](./artifacts/SP-106A/checkpoint.md) ·
[./artifacts/SP-106B/checkpoint.md](./artifacts/SP-106B/checkpoint.md) ·
[./artifacts/SP-106C/checkpoint.md](./artifacts/SP-106C/checkpoint.md) ·
[./artifacts/SP-106D/checkpoint.md](./artifacts/SP-106D/checkpoint.md) ·
[./artifacts/SP-106E/checkpoint.md](./artifacts/SP-106E/checkpoint.md).

**Next substory:** None with a reason — SP-106 is complete and signed off
(only the passing combined parent review establishes sign-off; report at
`./artifacts/SP-106/review.md`). Remaining open items are planner-owned polish
that do not condition sign-off: IR-106-08 (SP-107 capture point), IR-106-15(d)
(E tracker key on an authorized push), IR-106-16 (optional records polish:
name the fix-pass commit hashes). The next actionable epic work is SP-107
(planned, planner-owned).

**Implementation owner:** `implementer`, sequential across all layers (A → B → C → D;
backend/frontend/integration are scope labels, not concurrent writers).

**Final review:** One combined SP-106 review after every child and the integration
obligation are implemented; no automatic child reviews. Final artifact path:
`./artifacts/SP-106/review.md`; integration/index owner: SP-106D (parent index
written at `./artifacts/SP-106/implementation.md`) — **executed 2026-10-18:
pass 3 returned `Pass`; SP-106 signed off** (report at `./artifacts/SP-106/review.md`).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-106A-profile-schema-and-get.md) | Reviewed | SP-104 implemented and reviewed (STUDY-10 review PASS) | — (Reviewed in the combined parent review pass 3, 2026-10-18) | [checkpoint](./artifacts/SP-106A/checkpoint.md) · [implementation](./artifacts/SP-106A/implementation.md) · commits `fbd0ab7`, `71aff0d`, `775d4eb` (2026-10-17: 260/260 tests, typecheck, lint clean) |
| [B](./SP-106B-patch-profile-validation.md) | Reviewed | A implemented (fields exist on the model and GET response — `fbd0ab7`/`71aff0d`) | — (Reviewed in the combined parent review pass 3, 2026-10-18; IR-106-02/03/06 verified closed) | [checkpoint](./artifacts/SP-106B/checkpoint.md) · 292/292 tests on disposable Postgres (fix pass; was 288), typecheck, lint clean · fix-pass section in checkpoint |
| [C](./SP-106C-profile-preferences-form.md) | Reviewed | B implemented (PATCH + 400 `errors` contract; GET fields) | — (Reviewed in the combined parent review pass 3, 2026-10-18; IR-106-01 fixed in `5050b82`) | [checkpoint](./artifacts/SP-106C/checkpoint.md) · [implementation](./artifacts/SP-106C/implementation.md) · commits `6ece311`, `5050b82` (2026-10-17: 193/193 web tests, typecheck, lint clean; error-plumb deviation recorded for the parent review; stored-zone hydration fix after review pass 1) |
| [D](./SP-106D-profile-integration.md) | Reviewed | A, B, C implemented | — (Reviewed in the combined parent review pass 3, 2026-10-18; DoD 10 sign-off extended to the select UI by ratification) | [checkpoint](./artifacts/SP-106D/checkpoint.md) · [implementation](./artifacts/SP-106D/implementation.md) · commits `426459e` (2026-10-17: integration suite 7/7 on disposable Postgres, API 288/288 zero skips, web 188/188, typecheck+lint clean; manual browser sign-off approved with recorded limitations) · [parent index](./artifacts/SP-106/implementation.md) |
| [E](./SP-106E-profile-timezone-select.md) | Reviewed | C implemented (form wiring, `updateProfile` thunk, error contract) | — (Reviewed in the combined parent review pass 3, 2026-10-18; IR-106-09/10/11/13/14 verified closed) | [checkpoint](./artifacts/SP-106E/checkpoint.md) · [implementation](./artifacts/SP-106E/implementation.md) · commits `4def5c2` + `8ecedbc` (code+tests fix pass), `759eec8`, `390a510` (records) (2026-10-18: 201/201 web tests, typecheck, lint clean; review pass-2 findings recorded in checkpoint) |

The queue is the current execution record. All five children (A–E) are
implemented — A–D on 2026-10-17, E on 2026-10-18 — and were **Reviewed** by the
combined SP-106 parent re-review (pass 3, 2026-10-18: **Pass**; report at
`./artifacts/SP-106/review.md`). Pass-2 findings IR-106-09/10/11/13/14 are
closed and verified; IR-106-14 (DoD-10 coverage of the select UI) was closed by
coordinator ratification. No child review is performed and none replaces that
sign-off.

## Child inventory

| ID | Layer / owner | Scope | Dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](./SP-106A-profile-schema-and-get.md) | Backend, `implementer` | `timeZone` + `preferences` on `User` (one migration); `GET /users/me` returns them, credentials excluded | SP-104 (done) | One 60–90 min session | STUDY-32 |
| [B](./SP-106B-patch-profile-validation.md) | Backend, `implementer` | `PATCH /users/me` (replaces PUT) with IANA + bounded-preferences validation; field-level 400 `errors` map; dead service methods removed | A | One ~90 min session (largest child; indivisible core) | STUDY-33 |
| [C](./SP-106C-profile-preferences-form.md) | Frontend, `implementer` | Profile page time-zone field (browser-detected default, client IANA validation, field-level API errors, form states); PATCH switch; stored-zone display via shared helper | B | One 60–90 min session | STUDY-34 |
| [D](./SP-106D-profile-integration.md) | Integration, `implementer` | Cross-session round-trip + cross-student + credential-exclusion proof on real Postgres; manual browser sign-off (DoD 10) | A, B, C | One ~60 min session | STUDY-35 |
| [E](./SP-106E-profile-timezone-select.md) | Frontend, `implementer` | Replace free-text time-zone input with pre-loaded select dropdown; reusable `Select` UI component; `getTimeZones()` helper with fallback | C | One 2–3 hour session | Pending creation |

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
| D106-10 | **Time-zone UI is a select dropdown, not free text.** (Overrides D106-8.) The free-text input requires the student to know or guess the correct IANA identifier, which is a poor UX. A select pre-loaded with all supported IANA zones eliminates invalid input by construction, is keyboard accessible, and matches the existing form pattern. The backend IANA validator (SP-106B) remains as a safety net. The override is reversible (the API contract is unchanged). | User decision 2026-10-18 — the free-text input was reported as bad UX. |
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
| AC-106-03 | Time zone accepts only valid IANA identifiers; invalid values rejected on both frontend and backend. | B (backend 400), E (frontend select — by construction, no invalid value can be sent; backend validator remains as safety net) |
| AC-106-04 | The time zone defaults to the browser-detected zone, offered as a sensible default the student can change. | E (pre-select rule D106-3 — same logic, select instead of text input) |
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
| 6 keyboard accessibility | C (Input `aria-invalid`/`aria-describedby` wiring); E (Select keyboard navigation — arrow keys, Enter/Space, Escape) |
| 7 responsive layouts | C (existing card layout; new field follows it); E (select fits within card on mobile and desktop) |
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

### CF-106-02 — D106-8 decision overridden: free-text input replaced by select

- **Discovery:** 2026-10-18, during story planning for the profile time-zone UX
  improvement. The existing Profile page uses a free-text `<Input>` for the
  time zone (SP-106C), validated client-side by `isValidTimeZone`. The user
  reported this as bad UX — students must know or guess the correct IANA
  identifier.
- **Original finding (preserved):** Decision D106-8 in the breakdown README
  states: "Time-zone UI is a free-text input, not a select. AC-106-03 requires
  the frontend to *reject* invalid values; a select of valid zones cannot
  produce one. Free text + `isValidTimeZone` refinement is the grounded
  reading." This was a planner decision grounded in the original AC wording,
  not a user requirement.
- **Consequence:** without an override, an implementer would continue with the
  free-text input. The user's UX feedback makes this an incorrect product
  direction.
- **Correction:** added SP-106E story (this change) which overrides D106-8 via
  a new decision D106-10. The override is explicitly marked as **reversible**
  (the API contract is unchanged). Frontend ownership of AC-106-03 and
  AC-106-04 moves from C to E. The existing SP-106C story remains in the
  queue (its other ACs — name editing, form states, error handling — are
  unaffected).
- **Verification:** inspected `ProfilePage.tsx` (lines 145–151: free-text
  `<Input>`), `datetime.ts` (no `supportedValuesOf` polyfill — needs fallback),
  `Input.tsx` (no Select component exists — needs building),
  `ProfilePage.test.tsx` (355 lines of free-text tests — need rewriting).
  All evidence confirmed in the SP-106E story file.
- **Status:** `Fixed in plan` (SP-106E created; D106-8 overridden by D106-10).

## Implementation review correction log (pass 3, 2026-10-18)

Recorded by the reviewer on the passing parent re-review (report at
[`./artifacts/SP-106/review.md`](./artifacts/SP-106/review.md)). Passes 1–2
entries are back-filled dispositions (marked); pass-3 entries record this pass's
verification. User-decision provenance is recorded inline (IR-106-14).

| ID | Discovered | Original claim / consequence | Disposition and closure evidence |
|---|---|---|---|
| IR-106-01 (should-fix, pass 1 — back-filled) | 2026-10-17 | SP-106C: the SPA never read the stored time zone — display showed the browser zone; a name-only save silently overwrote the stored zone. | Closed, verified pass 2: fix commit `5050b82` (hydration + re-seed + unknown-zone PATCH guard, 5 tests); re-verified at `390a510` (`ProfilePage.test.tsx` hydration block, 5 cases in the 201-run tree). |
| IR-106-02 (polish, pass 1 — fixed pass 3 ride-along) | 2026-10-17 | Preferences cap measured in UTF-16 code units; D106-5 says ≤ 4096 **bytes**. | Closed, verified pass 3: `Buffer.byteLength(serialized, 'utf8')` (`validate-bounded-size.validator.ts:23`) + falsifiable multi-byte test (`update-user.dto.spec.ts` "measures the cap in UTF-8 bytes…"). |
| IR-106-03 (polish, pass 1 — fixed pass 3 ride-along) | 2026-10-17 | Custom `exceptionFactory` dropped nested-DTO constraint subtrees from the `message` array. | Closed, verified pass 3: Nest's own `flattenValidationErrors` (`validation.pipe.ts:50`) + new `validation.pipe.spec.ts` (flat + nested cases). |
| IR-106-04 (polish, pass 1) | 2026-10-17 | Root README documented `PUT /users/me`. | Closed, verified pass 2: root README documents `PATCH /users/me`; fixed in `5050b82`. |
| IR-106-05 (polish, pass 1) | 2026-10-17 | Child-inventory Jira column said "Pending creation" for A–D. | Closed, verified pass 2: STUDY-32…35 recorded (authorized bootstrap sync). |
| IR-106-06 (polish, pass 1 — fixed pass 3 ride-along) | 2026-10-17 | PATCH accepted an empty display name. | Closed, verified pass 3: `@IsNotEmpty()` on `UpdateUserDto.name` + DTO test. |
| IR-106-07 (observation, pass 1) | 2026-10-17 | 404 message echo concern. | No defect — no id parameter on `/users/me`; no existence oracle. Standing observation. |
| IR-106-08 (recording, pass 1 — **open, planner-owned**) | 2026-10-17 | Stored zone stays `UTC` until the first Profile save; SP-107 must state it persists the browser-detected zone or record approval of the status quo. | Open — SP-107 refinement obligation; does not condition SP-106 sign-off (confirmed pass 3). |
| IR-106-09 (should-fix, pass 2) | 2026-10-18 | AC-106E-4 not implemented: the display line read the stored value only; E record's AC-4 claim inaccurate. | Closed, verified pass 3: `watch('timeZone')` (`ProfilePage.tsx:76-80`) + story-listed live-update test (`ProfilePage.test.tsx:198-218`, falsifiable); AC-4 record corrected. |
| IR-106-10 (should-fix, pass 2) | 2026-10-18 | Story-listed keyboard + responsive tests missing. | Closed, verified pass 3: both tests delivered (`ProfilePage.test.tsx:220-247`, `:249-264`) on the structure/classes the component renders per pass-2's closure condition; jsdom limitations recorded as deviations; real-browser dimension under IR-106-14. |
| IR-106-11 (should-fix, pass 2) | 2026-10-18 | `getTimeZones()` dead `Intl.DateTimeFormat.supportedValuesOf` probe + `UTC±HH:MM` parser that never matched → ~115-zone alphabetical list; tautological tests. AC-106E-1/2 unmet. | Closed, verified pass 3: standard `Intl.supportedValuesOf` + `GMT±HH:MM` parsing with precomputed offsets (`datetime.ts`); falsifiable count/order tests in `datetime.test.ts` + the page suite (fallback list exceeded; Midway first/Kiritimati last; London<Tokyo; Majuro<Kiritimati). |
| IR-106-12 (pass 2) | 2026-10-18 | *Not assigned in pass 2 — the pass-2 report jumped from IR-106-11 to IR-106-13; logged here to keep the record contiguous.* | N/A — gap intentionally left by pass 2; no finding was suppressed. |
| IR-106-13 (should-fix, pass 2) | 2026-10-18 | Parent index omitted SP-106E; "all four children" status/narration stale. | Closed, verified pass 3: E row in the parent index; "all five children" status + queue narration; residual "all four children" strings are dated historical narration, not status claims. |
| IR-106-14 (should-fix, pass 2 — **closed by user decision 2026-10-18**) | 2026-10-18 | DoD-10 browser sign-off (2026-10-17) predates the select UI. | Closed 2026-10-18 by **coordinator ratification**: the user confirmed the select-based `/profile` page tested and passing, extending the 2026-10-17 integrated sign-off to the SP-106E select UI — the pass-2 report's explicit user-ratification closure path; recorded with provenance in `SP-106E/checkpoint.md`, committed `390a510`; no browser-session details fabricated. Limitation carried: no per-step browser session details (D precedent). Verified pass 3. |
| IR-106-15 (polish, pass 2 — (a)–(c) closed pass 3; (d) **open, planner-owned**) | 2026-10-18 | (a) fallback list local/untested; (b) per-render re-sort; (c) stored alias silently re-resolved; (d) E Jira key "Pending creation". | (a)–(c) closed, verified pass 3 (exported/tested fallback, module-scope memoization, alias option guard + `US/Pacific` test). (d) open: create/record E's tracker key on an authorized push; does not condition sign-off. |
| IR-106-16 (polish, pass 3 — **open, optional**) | 2026-10-18 | Fix-pass commits cited only by unresolvable pointers ("see README queue row"); hashes `8ecedbc`/`759eec8`/`390a510` named nowhere in the records (spine recorded in the pass-3 report). | Open — optional implementer records cleanup; non-blocking. |

## Quality gate (2026-10-17)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Four children, each with a full sizing block grounded in inspected code. Independently verifiable outcomes separated: schema/GET (A) ≠ PATCH/validation (B) ≠ form (C) ≠ integration sign-off (D). The shared pipe/filter change is folded into B (its field-error contract is untestable without the DTO); the dead-method deletion is folded into B (same file, no independent outcome) — both rationale-recorded in the tickets. B is the largest child (~90 min, indivisible endpoint+validation core). |
| 2. Original AC/TR coverage | Pass | AC-106-01…06 and TR-106-01…03 all mapped above; no requirement owned only in prose; epic ACs 3/4/6 mapped, 1/2/5 owned by sibling stories. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above; items 5/6/7 owned by C (name field) and E (time-zone select); item 10 by D + the combined parent review; no N/A rows without a reason. |
| 4. Contract consistency and integration ownership | Pass | One shared contract section; PUT→PATCH switch consistent across B and C; D is the named cross-layer integration owner with explicit dependencies. |
| 5. Code paths inspected | Pass | `schema.prisma` (User), `users.controller/service/dto`, `main.ts` (ValidationPipe), `all-exceptions.filter.ts` + spec, `test/test-http.ts`, `users-data-scoping.spec.ts`, `ProfilePage.tsx` (lines 145–151: free-text input), `datetime.ts` (no `supportedValuesOf` polyfill — needs fallback), `Input.tsx` (no Select component — needs building), `ProfilePage.test.tsx` (355 lines — needs rewriting), `AuthContext.tsx` (adapter), `authSlice.thunks.ts`, `services/auth.ts`, `types/index.ts`, `errors.ts`, SP-104/SP-108 review artifacts. Unverified: none material — the one assumption (Node full-ICU for `Intl`) is standard since Node 13 and is pinned by a test in B. |
| 6. Feature-specific risks/counterexamples | Pass | Four invariants with concrete counterexamples, mechanisms, and owning tests above (data-ownership + scheduling-adjacent time-zone checks; no single-use credentials in this scope). |
| 7. Dependency mapping and sequencing | Pass | A → B → C → D, one sequential writer; upstream SP-104 (implemented/reviewed) and SP-108 (implemented/reviewed) verified in code; downstream SP-107/EP04/EP05 consumption noted in the contract section. |
| 8. Material decisions | Pass | D106-1 user-approved 2026-10-17; D106-2…9 grounded in the story's own ACs/notes or inspected code; D106-10 (select override) grounded in user UX feedback 2026-10-18; no open material question. |
| 9. Correction log | Pass | CF-106-01 fixed in plan, verification recorded; CF-106-02 (D106-8 override) fixed in plan, verification recorded. |
| 10. Jira identity/sync | Not applicable | No sync was authorized for that planning task. Children A–D are now **STUDY-32–STUDY-35**, verified 2026-10-17 by the authorized bootstrap sync, which resolves reviewer finding **IR-106-05** (the inventory column was the reported defect). Parent keeps existing STUDY-11; no duplicate keys. |

**Outcome:** **Plan Ready** — all applicable planning gate rows pass; no
unresolved material planning findings. Implementation is **not blocked**:
upstream SP-104 (guards/scoping) and SP-108 (web store) are implemented and
reviewed. No implementation or passing tests are claimed; the plan approves
planning obligations only.

## Final implementation review unit

- **Parent:** SP-106 (STUDY-11) — `docs/stories/EP01/SP-106/`
- **In scope:** SP-106A, SP-106B, SP-106C, SP-106D, SP-106E (all children + integration)
- **Integration/index owner:** SP-106D (writes the parent index at
  `./artifacts/SP-106/implementation.md`)
- **Gate:** one combined SP-106 review after every child is implemented
  (`./artifacts/SP-106/review.md`); child implementation completion unblocks
  dependent work, but only the passing combined review establishes sign-off.
