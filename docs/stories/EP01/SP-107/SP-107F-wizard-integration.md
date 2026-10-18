# SP-107F: Onboarding Wizard — Integration Verification

**Story ID:** SP-107F
**Parent:** [SP-107](./SP-107-onboarding-wizard.md) (Jira STUDY-8)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Integration
**Status:** Queued (planned 2026-10-18; not implemented — needs SP-107A–E)
**Dependencies:** SP-107A, SP-107B, SP-107C, SP-107D, SP-107E (all implemented)
**Jira key:** Pending creation

## Summary

Prove the whole wizard end-to-end on a real database — complete, resume,
skip, terminal, and cross-student isolation — perform the manual browser
sign-off (DoD 10), and write the parent implementation index. This is the
named integration owner for the SP-107 review unit.

## Description

As the delivery gate for onboarding, the full flow is verified the way the
product uses it: a student registers, logs in, walks the wizard (or skips it),
and the system behaves exactly as the acceptance criteria promise — including
across sessions and across students.

## Acceptance Criteria

1. **Complete flow (API-level e2e, real Postgres):** register → login → `GET /onboarding` (`step 1, completed false`) → `PATCH /users/me` + `PATCH /onboarding { step: 2 }` → `POST /semesters` + `PATCH /onboarding { step: 3, semesterId }` → `POST /courses` + `PATCH /onboarding { completed: true }` → `GET /onboarding` (`completed true`). The semester and course rows exist, are owned by the student, and the course is attached to the onboarding semester. *(AC-107-01, AC-107-06, AC-107-07, AC-E01-06)*
2. **Resume:** after any completed step, a fresh `GET /onboarding` (simulating page reload) and a fresh login (simulating sign-out/in) both report the saved step; the stored state survives both. *(AC-107-02, AC-107-03, TR-107-01)*
3. **Skip:** from step 2, `PATCH /onboarding { completed: true }` completes onboarding with **no** semester or course rows created; the student then lands on the app (wizard terminal). *(AC-107-04, TR-107-02)*
4. **Terminal:** once completed, any further `PATCH /onboarding` → 409; the onboarding entry points (login redirect target, `/onboarding` route) resolve to the app, never the wizard. *(AC-107-05, TR-107-03)*
5. **Cross-student isolation (two students, real SQL):** student A cannot read or modify student B's onboarding state (no id in the routes; B's state byte-identical after A's writes); A's `POST /courses` with B's semester id → uniform 404 `Resource not found`, no course row, B's semester untouched; A and B may each create a semester with the *same* name (the `@@unique([userId, name])` constraint is per-student), while A creating a duplicate of *A's own* name is a 409. *(AC-E01-03, AC-E01-04, TR-107-01…04)*
6. **Backfill:** rows that existed before the onboarding migration have `onboardingCompletedAt` set (wizard never offered); a registration created after the migration starts at step 1. Recorded from the disposable DB after `migrate deploy`. *(D107-2)*
7. **Manual browser sign-off (human, per the SP-105D/SP-106D precedent):** with the dev stack (API + web + disposable Postgres), register, log in, walk the wizard on desktop and mobile viewports with keyboard only — confirm step-1 pre-fill, save, reload-resume, sign-out/in-resume, skip, and never-reappears; confirm the email-verification banner (if the account is unverified) coexists without blocking the wizard. Return approval with recorded limitations (browser/version); if the smoke cannot be performed, record **CANNOT VERIFY** with the reason rather than claiming it. *(DoD 10, AC-107-08)*
8. **Parent index:** write `./artifacts/SP-107/implementation.md` linking every child's checkpoint/implementation record, the verification commands + results, and this sign-off, for the combined parent review.

## Tests

- `apps/api/src/modules/onboarding/onboarding-e2e.spec.ts` (**new**; real Postgres via the `test-http` harness, self-skips without `DATABASE_URL`): the complete flow, resume (reload + sign-out/in), skip, terminal (409 + entry-point resolution), and the two-student isolation cases above — one suite, ordered as a narrative of the student journey, each case asserting on real rows via the harness `prisma` handle.
- `apps/api/src/test/test-http.ts` (extend): the harness app gains `OnboardingModule`, `SemestersModule`, and `CoursesModule` (the only change needed — the existing auth/users/email wiring is untouched); existing specs re-run green to prove no regression.

## Technical Notes

- **Inspected (2026-10-18):** `apps/api/src/test/test-http.ts` (harness — real app graph, `main.ts` parity, no-op email provider, self-skip/fail-fast on `DATABASE_URL`), `apps/api/src/modules/users/users-data-scoping.spec.ts` (two-student pattern), `apps/api/src/modules/users/users-profile-integration.spec.ts` (SP-106D round-trip pattern), the SP-106D ticket (disposable-Postgres + manual sign-off precedent), `docker-compose.yml` (existing `db` service).
- **Infrastructure:** a disposable migrated PostgreSQL 15 via the existing compose `db` service + `prisma migrate deploy` (never the dev `studypilot` database); the web side is verified by the manual browser sign-off, not by an automated browser harness (SP-106D precedent — web component tests already cover the per-step behavior in SP-107C–E).
- **Contract:** the [shared API contract](./README.md#shared-api-contract) in the breakdown README is what this child verifies on the wire.
- **Out of scope:** any product behavior change — if a case fails, the defect is a finding against the owning child (A–E), not a fix inside this child, unless it is a harness wiring defect (then fixed here).

## Definition of Done

1. ACs pass. 2. N/A — no new input validation (verifies A/B's). 3. Cross-student proof (AC 5). 4. N/A — no new error paths. 5. N/A — no UI. 6–7. Manual sign-off covers keyboard/responsive on real viewports. 8. The e2e suite + the re-run of existing API/web suites. 9. N/A — no API changes. 10. This child **is** the integrated development review (manual sign-off) feeding the combined parent review.

## Sizing

- **Outcome:** the onboarding wizard is proven end-to-end on real infrastructure with human sign-off, and the parent has its implementation index — the SP-107 review unit is complete and ready for the combined parent review.
- **Time estimate:** ~1.5–2 h (one e2e suite + a small harness extension + full-suite re-runs + manual sign-off + index writing).
- **Files:** `apps/api/src/modules/onboarding/onboarding-e2e.spec.ts` (**new**), `apps/api/src/test/test-http.ts` (change — three module imports), `docs/stories/EP01/SP-107/artifacts/SP-107/implementation.md` (**new** — parent index), `docs/stories/EP01/SP-107/artifacts/SP-107F/implementation.md` (**new** — this child's record incl. sign-off return).
- **Start context:** this ticket, the [shared API contract](./README.md#shared-api-contract), `test/test-http.ts`, `users-data-scoping.spec.ts`, `users-profile-integration.spec.ts`, the SP-106D ticket (sign-off precedent), `docker-compose.yml`, all six SP-107 tickets (what to verify).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand` against the disposable migrated PostgreSQL — all green, zero skips; `pnpm --filter @studypilot/web exec vitest run` green; `typecheck` + `lint` clean in both apps; manual sign-off return recorded (or CANNOT VERIFY with reason); backfill count recorded.
- **Dependencies / exclusions:** SP-107A–E (all implemented). Excluded: EP02 semester/course management, EP05 dashboard follow-ups (boot-time reconciliation, header affordance). Every excluded requirement has an owner in the [README traceability table](./README.md#source-requirements-and-test-traceability).
