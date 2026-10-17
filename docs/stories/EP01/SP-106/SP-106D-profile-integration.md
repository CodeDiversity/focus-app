# SP-106D: Profile and Preferences Integration Verification

**Story ID:** SP-106D
**Parent:** [SP-106](./SP-106-profile-and-preferences.md) (Jira STUDY-11)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Integration
**Status:** Implemented — awaiting combined parent review (2026-10-17; commit `426459e`; [implementation record](./artifacts/SP-106D/implementation.md), [checkpoint](./artifacts/SP-106D/checkpoint.md))
**Dependencies:** SP-106A, SP-106B, SP-106C implemented
**Jira key:** STUDY-35

## Summary

Prove the complete profile/preferences round-trip on the real stack — register → login → `GET` defaults → `PATCH` → new session → `GET` persisted values — plus cross-student isolation and credential exclusion over the wire, then a manual browser sign-off supporting DoD 10. This child is the named cross-layer integration owner for SP-106.

## Description

As a student, my profile and time-zone changes survive sign-out/sign-in and are visible only to me, verified end to end.

## Acceptance Criteria

1. **Cross-session persistence:** after student A `PATCH`es (timeZone + preferences), A logs out and logs back in (new session); `GET /users/me` returns the saved values — the full write→read round-trip of the profile fields. *(AC-106-02, AC-106-05, TR-106-02)*
2. **Cross-student isolation over HTTP:** with two students seeded through the real API, student A's `GET`/`PATCH` never returns or modifies student B's data; B's row is verified unchanged via the test's unscoped read. *(TR-106-03, AC-E01-04)*
3. **Credential exclusion over the wire:** no `GET`/`PATCH /users/me` response body contains `passwordHash` or any token/verification field. *(AC-106-01)*
4. **Field-level 400 over the wire:** an invalid `timeZone` `PATCH` returns 400 with the `errors.timeZone` map present in the real HTTP body (pipe + filter parity, D106-6). *(AC-106-06)*
5. **Manual browser sign-off (human, per the SP-105D precedent):** with the dev stack (API + web + a disposable Postgres), register/log in, open Profile, confirm the time-zone pre-fill, change it, save, refresh the page (new session), and confirm persistence + the stored-zone display line; return approval (limitations — browser/version — recorded in the artifact). *(DoD 10)*

## Tests

- `apps/api/src/modules/users/users-profile-integration.spec.ts` (**new**; real Postgres via the `test-http` harness; self-skips when `DATABASE_URL` is unset; two students registered through the real `POST /auth/register` + `POST /auth/login` — the SP-104/SP-105 harness pattern): AC1–AC4 above.
- **Web:** no new web tests — SP-106C's component tests (form behavior) and SP-106B's API tests bracket the contract; D re-runs both full suites green as part of the sign-off.

## Technical Notes

- **Inspected (2026-10-17):** `apps/api/src/test/test-http.ts` (real-app harness with `main.ts` parity), `apps/api/src/modules/users/users-data-scoping.spec.ts` (two-student seeding + cleanup pattern), `docs/stories/EP01/SP-105/artifacts/SP-105D/` (manual browser/SMTP smoke + DoD 10 precedent), `docs/stories/SP-108/README.md` (gate-evidence discipline: `build`/frozen-lockfile/dev-server smoke recorded as CANNOT VERIFY where not performed).
- The manual sign-off needs the dev stack running against a disposable database; the human performs it and returns approval, exactly as SP-105D did. If the runtime smoke cannot be performed, record **CANNOT VERIFY** with the reason rather than claiming it (SP-108 precedent).
- The parent index is written by this child at `./artifacts/SP-106/implementation.md` (all four children + this one).

## Definition of Done

1. ACs pass. 2. N/A — no new validation (bracketed by B/C). 3. Cross-student isolation (AC2). 4. N/A — error contract bracketed by B (wire presence asserted in AC4). 5. N/A — no new UI (bracketed by C). 6–7. N/A — no UI in this child. 8. Integration suite + both full suites executed green. 9. Implementation record + parent index. 10. This child's manual sign-off + the combined SP-106 parent review.

## Sizing

- **Outcome:** the profile/preferences round-trip is proven end to end with executed evidence and human browser sign-off.
- **Time estimate:** ~60 minutes (one new integration spec ~30–40 min + manual smoke + record/index).
- **Files:** `apps/api/src/modules/users/users-profile-integration.spec.ts` (**new**).
- **Start context:** this ticket, the [shared API contract](./README.md#shared-api-contract), `test/test-http.ts`, `users-data-scoping.spec.ts` (pattern), SP-106A/B/C implementation records, the SP-105D artifact (sign-off precedent).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand` against a disposable migrated PostgreSQL 15 (integration green, zero skips); `pnpm --filter @studypilot/web test` green; `typecheck` + `lint` clean in both apps; manual smoke return recorded in the implementation record.
- **Dependencies / exclusions:** SP-106A/B/C. Nothing excluded — D is the final child; the combined parent review follows.
