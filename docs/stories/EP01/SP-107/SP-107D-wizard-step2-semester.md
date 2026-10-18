# SP-107D: Wizard Step 2 — First Semester

**Story ID:** SP-107D
**Parent:** [SP-107](./SP-107-onboarding-wizard.md) (Jira STUDY-8)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Frontend
**Status:** Queued (planned 2026-10-18; not implemented — needs SP-107B + SP-107C)
**Dependencies:** SP-107B (`POST /semesters`); SP-107C (wizard shell renders steps by index)
**Jira key:** Pending creation

## Summary

Build wizard step 2: the first-semester form (name + start/end dates) that
creates the semester via `POST /semesters`, saves the progress and the created
semester id, and advances to step 3.

## Description

As a student setting up StudyPilot, I name my first semester and pick its
start and end dates, and the wizard saves it and moves on.

## Acceptance Criteria

1. Step 2 renders a form with: semester name (`Input`), start date, and end date (native `<input type="date">`, `yyyy-MM-dd`). Client validation: name non-empty after trim, ≤ 100 chars; both dates required; `end > start` (field error "End date must be after the start date."). *(AC-107-06, TR-107-04)*
2. Submit → `POST /semesters { name, startDate, endDate }` → on `201` → `PATCH /onboarding { step: 3, semesterId: <created id> }` (progress saved after the step; the semester id is persisted for step-3 resume, D107-8) → advance to step 3. *(AC-107-02)*
3. Error handling: backend `400` field-level `errors` displayed per field (incl. the end-after-start rule re-validated server-side); `409` duplicate name → actionable message on the name field ("A semester with this name already exists."); network failure → actionable message + retry, form values preserved; a progress-save failure after a successful create shows an error with retry (the semester already exists — retrying the *progress* save only is idempotent, the semester is not re-created). *(AC-107-06, AC-107-08)*
4. The step handles submitting (disabled controls, no duplicate submission) and success states; the form is fully keyboard operable with visible focus; it fits mobile and desktop within the wizard card. *(AC-107-08)*

## Tests

- `apps/web/src/features/onboarding/ui/Step2Semester.test.tsx` (**new**): client validation cases (empty name, over-long name, missing dates, `end == start`, `end < start`); valid submit issues `POST /semesters` then `PATCH /onboarding { step: 3, semesterId }` in that order; 400 field errors render per field; 409 renders on the name field; network failure preserves values + offers retry; progress-save failure retries only the progress save; keyboard-only completion; mobile/desktop viewport behavior.
- `apps/web/src/entities/semester/api/semesterApi.test.ts` (**new**): request shape (`yyyy-MM-dd` strings) and response mapping.

## Technical Notes

- **Inspected (2026-10-18):** `apps/web/src/pages/profile/ui/ProfilePage.tsx` (form pattern: `react-hook-form` + zod resolver, `Input`/`Select`, `toast`, submitting state — step 2 follows it), `apps/web/src/shared/ui/{Input,Button}.tsx`, `apps/web/src/shared/lib/errors.ts` (`extractApiError` for the `errors` map), `apps/web/src/shared/api/httpClient.ts` (base API client), `apps/web/src/shared/types/academic.ts` (existing `Semester` type — the 201 body matches it), `apps/web/src/entities/user/api/userService.ts` (entity-API pattern to mirror), `apps/web/src/shared/lib/datetime.ts` (date helpers).
- **FSD placement:** `features/onboarding/ui/Step2Semester.tsx` (**new**, rendered by the SP-107C shell at step 2); `entities/semester/{api/semesterApi.ts, api/semesterApi.test.ts}` (**new** — `createSemester` POST `/semesters`; the entity is the natural home so EP02's semester work extends the same folder).
- **Date handling:** native date inputs produce `yyyy-MM-dd`; send as-is (the API contract uses `yyyy-MM-dd` strings, D107-7). No instant/time-zone conversion on the client.
- **Contract:** the [shared API contract](./README.md#shared-api-contract) in the breakdown README; this child consumes `POST /semesters` (SP-107B) and `PATCH /onboarding` (SP-107A).
- **Out of scope:** semester list/get/edit (EP02), step 3 (SP-107E), end-to-end proof (SP-107F).

## Definition of Done

1. ACs pass. 2. Client-side validation (name, dates, end-after-start). 3. N/A — no scoping logic client-side (the endpoint is principal-scoped, SP-107B). 4. Actionable field-level errors displayed. 5. Submitting/success/error states. 6. Keyboard operable + focus. 7. Responsive. 8. Tests above. 9. N/A — no API changes. 10. Via SP-107F sign-off + the combined parent review.

## Sizing

- **Outcome:** the student can create their first semester from the wizard with validation and error recovery; progress and semester context advance to step 3.
- **Time estimate:** ~1–1.5 h (one form + one small entity API + tests, following the established ProfilePage pattern).
- **Files:** `apps/web/src/features/onboarding/ui/Step2Semester.tsx` + `Step2Semester.test.tsx` (**new**), `apps/web/src/entities/semester/{api/semesterApi.ts,api/semesterApi.test.ts}` (**new**).
- **Start context:** this ticket, decisions D107-7/D107-8, the [shared API contract](./README.md#shared-api-contract), `ProfilePage.tsx` (form pattern), `shared/ui/{Input,Button}.tsx`, `shared/lib/errors.ts`, `shared/types/academic.ts`, `entities/user/api/userService.ts` (pattern), the SP-107C shell (render point).
- **Verification:** `pnpm --filter @studypilot/web exec vitest run` all green; `pnpm --filter @studypilot/web typecheck` clean; lint clean. (API assumed present from SP-107B; tests mock the API.)
- **Dependencies / exclusions:** SP-107B + SP-107C (must be implemented first). Excluded outcomes owned elsewhere: step 3 (SP-107E), end-to-end flow + manual sign-off (SP-107F), semester management UI (EP02). Every excluded requirement has an owner in the [README traceability table](./README.md#source-requirements-and-test-traceability).
