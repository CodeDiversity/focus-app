# SP-112C: Meetings & Course Detail Integration Sign-off

**Story ID:** SP-112C
**Parent:** [SP-112](./SP-112-class-meetings-and-course-detail.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Integration
**Status:** Implemented (2026-10-23) — awaiting combined parent review (DoD 10 human ratification pending)
**Dependencies:** SP-112A, SP-112B implemented
**Jira key:** Pending creation

## Summary

Prove the meetings + course-detail feature end to end: a real-Postgres e2e
(meeting lifecycle, validation, cross-student matrix, detail projections,
archived-course access), the manual browser sign-off (DoD 10), and the parent
implementation index. **Named integration owner for SP-112** — cross-layer
verification lives here, not in A/B.

## Description

As the delivery gate, this verifies that the `ClassMeeting` model, the nested
meeting routes, and the detail page are one coherent, safe feature: a
student's meetings are theirs alone, times stay sane, and the detail screen
works in a real browser.

## Acceptance criteria

1. **E2E spec** (`apps/api/src/modules/courses/courses-meetings-e2e.spec.ts`,
   **new**; real Postgres via the `test-http` harness, self-skips without
   `DATABASE_URL` — mirror `semesters-e2e.spec.ts`):
   - lifecycle: create a course → add two meetings (Mon 09:00–10:30,
     Wed 14:00–15:30) → list returns both in dayOfWeek/startTime order →
     PATCH edits a meeting (new weekday/time) → DELETE removes it.
     *(AC-E02-04, DoD 1/8)*
   - validation over HTTP: `end == start`, `end < start`, midnight wrap,
     `25:00`, `12:60`, weekday −1/7 → 400 field-level; duplicate slot → 409.
     *(DoD 2/8)*
   - cross-student matrix: B's GET/POST/PATCH/DELETE under A's course id →
     uniform 404; A's meetings byte-identical before/after; B's detail
     projection never contains A's meetings/assignments; 401 on every route
     without a token. *(DoD 3/8)*
   - dual-ownership: A PATCHes/DELETEs a meeting of A's *other* course via
     the first course's id → uniform 404, no write. *(DoD 3/8)*
   - detail projections: `GET /courses/:id` returns `meetings` + `assignments`
     (empty arrays when none; an assignment attached to the course appears —
     seeded directly in the fixture); an **archived** course's detail still
     returns its meetings + assignments (AC-E02-05). *(AC-E02-06, DoD 1)*
2. **Manual browser sign-off (DoD 10):** perform and record the detail-page
   walk in a real browser against the running stack: open a course from the
   list, header fields, add a meeting (valid + each invalid case), edit,
   delete, assignments empty state, archived-course banner, keyboard-only
   pass, mobile viewport. Record the result (performed / deviations) in the
   implementation record — the human ratification gate stays with the session
   owner, exactly as SP-110C/SP-111C ran it.
3. **Parent index:** write `./artifacts/SP-112/implementation.md` — the
   combined SP-112 implementation record linking A/B/C evidence, the final
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
  `apps/api/src/test/test-http.ts`, the SP-110C/SP-111C implementation records
  (`../SP-110/artifacts/SP-110C/implementation.md`,
  `../SP-111/artifacts/SP-111C/implementation.md` — the DoD-10 walk format).
- The e2e spec reuses the harness's user-fixture pattern (two students, real
  JWTs); the assignment fixture is seeded via the existing `Assignment` model
  (no assignments API exists — direct DB seed in the test, which is
  acceptable for a read-only projection proof).
- The browser walk needs the API + web dev servers and a local PostgreSQL
  (README "Getting Started"); the walk script is written into the
  implementation record so the session owner can execute it.

## Definition of Done

1. E2E lifecycle + matrix + projections green on a disposable migrated
PostgreSQL. 2. DoD 10 manual walk recorded (performed / deviations;
ratification with the session owner). 3. Cross-student + dual-ownership +
archived-access proofs recorded. 4–7. Verified through the A/B evidence + the
browser walk. 8. Full suites run and recorded. 9. N/A — no API/migration
change in this child. 10. This child + the combined parent review.

## Sizing

- **Outcome:** SP-112 is proven end to end — the meetings + course-detail
  feature is signed off for the combined parent review.
- **Time estimate:** ~1.5–2 h — one e2e spec on an existing harness (the
  semesters e2e is the template), one recorded browser walk, one index file.
  Substantial independent work: it is the only child that exercises the
  combined stack.
- **Files:** `apps/api/src/modules/courses/courses-meetings-e2e.spec.ts`
  (**new**); artifacts `./artifacts/SP-112C/implementation.md` +
  `./artifacts/SP-112/implementation.md` (**new**).
- **Start context:** this ticket, the
  [shared API contract](./README.md#shared-api-contract),
  `semesters-e2e.spec.ts`, `test-http.ts`, the SP-110C/SP-111C records (walk
  format), the SP-112A/B implementation records.
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand`
  (incl. the new e2e) green on a disposable migrated PostgreSQL;
  `pnpm --filter @studypilot/web test` green; browser walk recorded.
- **Dependencies / exclusions:** A + B implemented. Excluded: any A/B defect
  fixes (route back to that child's owner as findings), the combined parent
  review itself (reviewer-owned), EP03/EP04.
