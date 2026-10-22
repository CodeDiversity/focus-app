# SP-111C: Course Management Integration Sign-off

**Story ID:** SP-111C
**Parent:** [SP-111](./SP-111-course-management.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Integration
**Status:** Implemented — awaiting parent review (2026-10-22)
**Dependencies:** SP-111A, SP-111B implemented
**Jira key:** Pending creation

## Summary

Prove the course-management feature end to end: a real-Postgres e2e lifecycle
(create → list/filter → edit → archive → restore, plus the cross-student and
orphaned-semester cases), the manual browser sign-off (DoD 10), and the parent
implementation index. **Named integration owner for SP-111** — cross-layer
verification lives here, not in A/B.

## Description

As the delivery gate, this verifies that what A built and B consume is one
coherent, safe feature: a student's courses are theirs alone, archiving never
destroys data, and the `/courses` screen works in a real browser.

## Acceptance criteria

1. **E2E spec** (`apps/api/src/modules/courses/courses-e2e.spec.ts`, **new**;
   real Postgres via the `test-http` harness, self-skips without
   `DATABASE_URL` — mirror `semesters-e2e.spec.ts`):
   - lifecycle: create a course attached to a semester → appears in
     `GET /courses` with the semester projected → `PATCH` edits (name,
     instructor, semester re-attach) persist → archive → absent from the
     default list, present with `includeArchived`, detail still returns it →
     restore → active again. *(AC-E02-03/05, DoD 1/8)*
   - semester filter: `?semesterId=` returns only that semester's courses; a
     foreign/missing `semesterId` → uniform 404. *(AC-E02-02)*
   - cross-student matrix: student B's GET/PATCH on A's course id → uniform
     404 with A's rows byte-identical before/after; B's list never contains
     A's courses; 401 without a token on every route. *(DoD 3/8)*
   - orphaned by semester deletion (SP-110 boundary): delete a semester that
     has a course → the course survives, unaffiliated, and still lists with
     `semester: null`. *(D110-2, AC-E02-05 boundary)*
2. **Manual browser sign-off (DoD 10):** perform and record the `/courses`
   walk in a real browser against the running stack: list + states, create
   (valid + each invalid field), edit, archive, restore, show-archived,
   keyboard-only pass, mobile viewport. Record the result (performed /
   deviations) in the implementation record — the human ratification gate
   stays with the session owner, exactly as SP-110C ran it.
3. **Parent index:** write `./artifacts/SP-111/implementation.md` — the
   combined SP-111 implementation record linking A/B/C evidence, the final
   commit range, and the verification results.

## Tests

- The e2e spec above (AC 1) is this child's automated obligation.
- No new unit/component tests (A/B own theirs); this child runs the full API
  suite (`pnpm --filter @studypilot/api exec jest --runInBand`) and the full
  web suite (`pnpm --filter @studypilot/web test`) against the combined
  feature and records the results.

## Technical notes

- **Inspected (2026-10-21):** `apps/api/src/modules/semesters/semesters-e2e.spec.ts`
  (harness + two-student + transaction patterns to mirror),
  `apps/api/src/test/test-http.ts`, the SP-110C implementation record
  (`../SP-110/artifacts/SP-110C/implementation.md` — the DoD-10 walk format).
- The e2e spec reuses the harness's user-fixture pattern (two students, real
  JWTs) — no new test infrastructure.
- The browser walk needs the API + web dev servers and a local PostgreSQL
  (README "Getting Started"); the walk script is written into the
  implementation record so the session owner can execute it.

## Definition of Done

1. E2E lifecycle + matrix green on a disposable migrated PostgreSQL.
2. DoD 10 manual walk recorded (performed / deviations; ratification with the
   session owner). 3. Cross-student + orphan proofs recorded. 4–7. Verified
   through the A/B evidence + the browser walk. 8. Full suites run and
   recorded. 9. N/A — no API/migration change in this child. 10. This child
   + the combined parent review.

## Sizing

- **Outcome:** SP-111 is proven end to end — the course-management feature is
  signed off for the combined parent review.
- **Time estimate:** ~1.5–2 h — one e2e spec on an existing harness (the
  semesters e2e is the template), one recorded browser walk, one index file.
  Substantial independent work: it is the only child that exercises the
  combined stack.
- **Files:** `apps/api/src/modules/courses/courses-e2e.spec.ts` (**new**);
  artifacts `./artifacts/SP-111C/implementation.md` +
  `./artifacts/SP-111/implementation.md` (**new**).
- **Start context:** this ticket, the
  [shared API contract](./README.md#shared-api-contract),
  `semesters-e2e.spec.ts`, `test-http.ts`, the SP-110C record (walk format),
  the SP-111A/B implementation records.
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand`
  (incl. the new e2e) green on a disposable migrated PostgreSQL;
  `pnpm --filter @studypilot/web test` green; browser walk recorded.
- **Dependencies / exclusions:** A + B implemented. Excluded: any A/B defect
  fixes (route back to that child's owner as findings), SP-112, the combined
  parent review itself (reviewer-owned).
