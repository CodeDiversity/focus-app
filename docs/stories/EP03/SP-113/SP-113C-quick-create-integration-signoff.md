# SP-113C: Quick-Create Integration Sign-off

**Story ID:** SP-113C
**Parent:** [SP-113](./SP-113-quick-assignment-creation.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Integration
**Status:** Queued — starts after A + B are implemented
**Dependencies:** SP-113A, SP-113B implemented
**Jira key:** Pending creation

## Summary

Prove the quick-create flow end to end (API + UI + persistence + scoping) and
sign off the unit: the integration e2e spec, the DoD-10 manual browser walk
with human ratification, and the parent implementation index. **Named
integration owner for SP-113** — cross-layer verification lives here, not in
A/B.

## Description

As the delivery gate, this verifies that a student creating an assignment
from the course detail page gets a persisted, correctly scoped, correctly
displayed row — and that no other student can see or touch it.

## Acceptance criteria

1. **E2E spec** (`apps/api/src/modules/assignments/assignments-e2e.spec.ts`,
   **new**; real Postgres via the `test-http` harness — main.ts module parity
   carries the new module automatically; self-skips without `DATABASE_URL` —
   mirror `courses-meetings-e2e.spec.ts`):
   - lifecycle: create a course → `POST /assignments` with a title + course
     → the `GET /courses/:id` projection (SP-112) returns the row → a second
     create **without** `courseId` succeeds (course-less, D113-2) → a create
     with a **null `dueDate`** sorts nulls-last in the projection (D113-1).
     *(AC-E03-01/02, DoD 1/8)*
   - validation over HTTP: whitespace/oversize title, malformed `dueDate`,
     `estimatedHours` 0/−3/100000, bad `priority`, unknown `status`/`type`
     fields → 400 field-level. *(DoD 2/8)*
   - cross-student matrix: B POSTs with A's course id → uniform 404, A's data
     unchanged; B's course-detail projection never contains A's assignments;
     401 on the route without a token. *(DoD 3/8)*
   - lifecycle lockout: `status` in the body → 400; a created row is always
     PENDING. *(DoD 2/8)*
2. **Manual browser sign-off (DoD 10):** perform and record the quick-create
   walk in a real browser against the running stack: open a course from the
   list → detail → assignments section (empty state) → create an assignment
   (valid, with each optional field; then each invalid case) → the row
   appears after the background refetch → null-due-date display →
   keyboard-only pass → mobile viewport → a second student's session never
   sees the row. Record the result (performed / deviations) in the
   implementation record — the human ratification gate stays with the session
   owner, exactly as SP-110C/SP-111C/SP-112C ran it.
3. **Parent index:** write `./artifacts/SP-113/implementation.md` — the
   combined SP-113 implementation record linking A/B/C evidence, the final
   commit range, and the verification results.

## Tests

- The e2e spec above (AC 1) — the automated cross-layer proof.
- The manual walk (AC 2) — recorded evidence, not an automated test.

## Technical notes

- **Inspected (2026-10-24):** `apps/api/src/test/test-http.ts`
  (`createIntegrationApp` — real HTTP, main.ts parity, self-skip without
  `DATABASE_URL`), `courses-meetings-e2e.spec.ts` (the SP-112C journey
  pattern: lifecycle → validation → cross-student matrix → projections),
  `courses-data-scoping.spec.ts` (the two-student fixture pattern), the
  SP-112C ticket (the DoD-10 walk format + parent-index precedent).
- **New:** `assignments-e2e.spec.ts` beside the A/B module files. No
  harness change — `app.module.ts` registration (A) is picked up by main.ts
  parity.
- The web side is verified in the manual walk (AC 2), not by a browser
  automation suite — the repo's e2e layer is the API-side `test-http`
  harness (SP-110C/SP-111C/SP-112C precedent).

## Definition of Done

1. ACs 1–3 pass. 2. N/A — no new validation (A's). 3. Cross-student proof
above. 4. N/A. 5. The manual walk covers the section's states. 6/7. The
manual walk includes the keyboard-only + mobile passes. 8. The e2e spec above.
9. N/A — the contract + migration are A's. 10. **This child is the DoD-10
manual sign-off** + the combined parent review.

## Sizing

- **Outcome:** the quick-create feature is proven end to end and signed off;
  the parent implementation index exists for the combined review.
- **Time estimate:** ~2 h — one e2e spec (the journey is short: one route +
  the existing projection), the manual browser walk, the index.
- **Files:** `apps/api/src/modules/assignments/assignments-e2e.spec.ts`
  (**new**), `./artifacts/SP-113/implementation.md` (**new**), the C
  implementation record + checkpoint under `./artifacts/SP-113C/`.
- **Start context:** this ticket, the [shared API contract](./README.md#shared-api-contract),
  the A/B implementation records, `test-http.ts`, `courses-meetings-e2e.spec.ts`,
  the SP-112C ticket (walk + index format).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand`
  against a disposable migrated PostgreSQL — all green incl. the new e2e
  spec; the manual walk recorded; the index links all evidence.
- **Dependencies / exclusions:** A + B (both implemented). Excluded: anything
  owned by later EP03 stories (edit/delete, `type`, status, lists, overdue) —
  the walk stays inside the quick-create scope.
