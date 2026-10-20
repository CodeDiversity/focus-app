# SP-110C: Semester Integration and Sign-off

**Story ID:** SP-110C
**Parent:** [SP-110](./SP-110-create-and-manage-standalone.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Integration
**Status:** Implemented — awaiting parent review (implemented 2026-10-20; record: [artifacts/SP-110C/implementation.md](./artifacts/SP-110C/implementation.md))
**Dependencies:** SP-110A, SP-110B implemented
**Jira key:** Pending creation

## Summary

Prove the semester management feature end-to-end on real Postgres (API
lifecycle, cross-student matrix, single-active race, delete-orphan), perform
the manual browser sign-off (DoD 10), and write the parent index.

## Description

As the delivery gate for SP-110, I verify that a student's semester lifecycle
works across the full stack — API and UI together — and that no cross-student
or data-loss path exists.

## Acceptance criteria

1. **e2e (real Postgres; self-skips without `DATABASE_URL`)** — the full
   lifecycle as one student through the HTTP API: `POST /semesters` (the
   SP-107B endpoint) → `GET /semesters` (order + `courseCount`) →
   `GET /semesters/:id` → `PATCH` rename + re-date → `PATCH { isActive: true }`
   (single-active proof: the student's other semesters deactivate) →
   `DELETE /semesters/:id` (204; the semester's course rows survive with
   `semesterId: null`). *(AC-E02-01, D110-1/2, DoD 8/10)*
2. **Cross-student matrix:** student B attempts GET/PATCH/DELETE on A's
   semester id → uniform 404 `Resource not found`; A's rows unchanged
   (existence oracle closed). *(AC-E01-04, DoD 3)*
3. **Manual browser sign-off (DoD 10):** a recorded walkthrough of
   `/semesters` — list/create/edit/activate/delete with loading/empty/error
   states, a keyboard pass, and a mobile viewport — with honest execution
   labels (performed vs instructed-but-unexecuted). *(DoD 10/11 boundary —
   the reviewer owns the final walkthrough; this is the implementer's
   integrated check)*
4. **Parent index** at `./artifacts/SP-110/implementation.md` linking A/B/C
   evidence (test counts, commits, the sign-off record).

## Tests

- `apps/api/src/modules/semesters/semesters-e2e.spec.ts` (**new**) — follows
  the `onboarding-e2e.spec.ts` harness precedent (real app, real Postgres,
  self-skips without `DATABASE_URL`): cases 1 + 2 above, plus the
  concurrent-activation case (two parallel PATCHes → exactly one active).

## Technical notes

- **Inspected (2026-10-20):**
  `apps/api/src/modules/onboarding/onboarding-e2e.spec.ts` (harness precedent
  — real-app HTTP against a migrated Postgres), `apps/api/src/test/test-http.ts`, the
  SP-107F implementation record (e2e + DoD-10 sign-off pattern, incl. the
  CANNOT-VERIFY human-gate convention), the SP-106D record (manual sign-off
  precedent).
- The e2e runs in the API app's jest (same as the onboarding e2e); no new
  harness, no package/CI change.
- The manual sign-off follows the SP-107F convention: the step-by-step walk is
  recorded with performed/unperformed labels; if the dev stack cannot be
  brought up in the session, record **CANNOT VERIFY** with the human closure
  path (do not fabricate).

## Definition of Done

1. ACs 1–4 pass. 2–4. N/A — no new production code (verification child; the
API contract is A's). 5. N/A — the UI states are B's; C observes them in the
browser pass. 6–7. Observed in the manual pass (recorded, not re-implemented).
8. The e2e spec above. 9. N/A — no API/migration change. 10. **This child**
(manual browser sign-off) + the combined parent review.

## Sizing

- **Outcome:** SP-110's cross-layer verification evidence: the lifecycle, the
  security matrix, and the manual sign-off are proven, and the parent index
  ties A/B/C together for the combined review.
- **Time estimate:** ~1.5–2 h — one e2e spec (~8 cases on the existing
  harness) + the manual walk + the index. A real verification outcome (the
  SP-106D/SP-107F precedent), not a status child.
- **Files:** `apps/api/src/modules/semesters/semesters-e2e.spec.ts` (**new**),
  `./artifacts/SP-110/implementation.md` (**new**),
  `./artifacts/SP-110C/implementation.md` (**new**).
- **Start context:** this ticket, the
  [shared API contract](./README.md#shared-api-contract),
  `onboarding-e2e.spec.ts` + the SP-107F record (sign-off convention), A's and
  B's implementation records, `apps/api/src/test/test-http.ts`.
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand
  semesters` green on a disposable migrated Postgres (e2e + data-scoping); the
  manual walk recorded; the index links all evidence.
- **Dependencies / exclusions:** A + B implemented. Excluded: course-side
  integration (EP02 course stories), the final reviewer walkthrough
  (reviewer-owned, DoD 11).
