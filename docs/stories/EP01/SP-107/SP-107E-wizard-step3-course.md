# SP-107E: Wizard Step 3 — Optional First Course

**Story ID:** SP-107E
**Parent:** [SP-107](./SP-107-onboarding-wizard.md) (Jira STUDY-8)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Frontend
**Status:** Queued (planned 2026-10-18; not implemented — needs SP-107B + SP-107C)
**Dependencies:** SP-107B (`POST /courses`); SP-107C (wizard shell)
**Jira key:** Pending creation

## Summary

Build wizard step 3: the clearly-optional first-course step — add a course
(code + name) attached to the onboarding semester, or finish without one.
Either way the onboarding is recorded complete and the wizard never returns.

## Description

As a student, I can add one course to get a head start, or skip straight to
the app — my choice, and either way my setup is marked done.

## Acceptance Criteria

1. Step 3 is clearly optional: a visible "This step is optional" label and a "Finish without a course" button that completes onboarding (`PATCH /onboarding { completed: true }`) **without** creating any course, then navigates to `/dashboard`. *(AC-107-07)*
2. The course form collects code (`Input`) and name (`Input`); client validation: code non-empty, ≤ 20 chars; name non-empty, ≤ 100 chars. The onboarding semester (from the onboarding state, D107-8) is shown as the attachment context, read-only ("Adding to your first semester"); no semester picker in M1. *(AC-107-07)*
3. "Add course" → `POST /courses { code, name, semesterId? }` → on `201` → `PATCH /onboarding { completed: true }` → `/dashboard`. If the onboarding state's `semesterId` is `null` (edge: the semester no longer exists), the course is created without a semester and the context line says so. *(AC-107-02, AC-107-05, D107-8)*
4. Error handling: `400` field-level errors per field; `409` duplicate code → actionable message on the code field; `404` (semester vanished between load and submit) → actionable message offering "Finish without a course"; network failure → retry with values preserved. *(AC-107-07, AC-107-08)*
5. After completion (either path) the wizard is terminal for the student: the shell navigates to `/dashboard`, and a later visit to `/onboarding` redirects (AC-107-05; the redirect itself is SP-107C's, verified here on the completion flow). The step handles submitting states, is keyboard operable, and fits mobile and desktop. *(AC-107-08)*

## Tests

- `apps/web/src/features/onboarding/ui/Step3Course.test.tsx` (**new**): optional label + finish-without-course issues only `PATCH /onboarding { completed: true }` (no `POST /courses`) and navigates; add-course issues `POST /courses` then the completion PATCH in order; client validation cases; 400/409/404 display cases; `semesterId: null` edge creates the course without a semester and adjusts the context line; retry preserves values; keyboard-only completion of both paths; mobile/desktop viewport behavior.
- `apps/web/src/entities/course/api/courseApi.test.ts` (**new**): request shape (optional `semesterId` omitted when null) and response mapping against the existing `Course` type.

## Technical Notes

- **Inspected (2026-10-18):** `apps/web/src/pages/profile/ui/ProfilePage.tsx` (form pattern), `apps/web/src/shared/ui/{Input,Button}.tsx`, `apps/web/src/shared/lib/errors.ts`, `apps/web/src/shared/types/academic.ts` (existing `Course` type — the 201 body matches it), `apps/web/src/entities/user/api/userService.ts` (entity-API pattern), the SP-107C `onboardingSlice` (state source for `semesterId`).
- **FSD placement:** `features/onboarding/ui/Step3Course.tsx` (**new**, rendered by the shell at step 3); `entities/course/{api/courseApi.ts, api/courseApi.test.ts}` (**new** — `createCourse` POST `/courses`; EP02's course work extends the same folder).
- **Contract:** the [shared API contract](./README.md#shared-api-contract) in the breakdown README; this child consumes `POST /courses` (SP-107B) and `PATCH /onboarding` (SP-107A).
- **Out of scope:** course edit/archive/color-picker/credits UI (EP02), end-to-end proof (SP-107F).

## Definition of Done

1. ACs pass. 2. Client-side validation (code, name). 3. N/A — no scoping logic client-side (the endpoint is principal-scoped, SP-107B). 4. Actionable field-level + 404 messages displayed. 5. Submitting/success/error states. 6. Keyboard operable + focus. 7. Responsive. 8. Tests above. 9. N/A — no API changes. 10. Via SP-107F sign-off + the combined parent review.

## Sizing

- **Outcome:** the student finishes onboarding — with or without a first course — and the wizard is done for good.
- **Time estimate:** ~1–1.5 h (one form with two exit paths + one small entity API + tests, following the established pattern).
- **Files:** `apps/web/src/features/onboarding/ui/Step3Course.tsx` + `Step3Course.test.tsx` (**new**), `apps/web/src/entities/course/{api/courseApi.ts,api/courseApi.test.ts}` (**new**).
- **Start context:** this ticket, decisions D107-8, the [shared API contract](./README.md#shared-api-contract), `ProfilePage.tsx` (form pattern), `shared/ui/{Input,Button}.tsx`, `shared/lib/errors.ts`, `shared/types/academic.ts`, the SP-107C shell + `onboardingSlice`.
- **Verification:** `pnpm --filter @studypilot/web exec vitest run` all green; `pnpm --filter @studypilot/web typecheck` clean; lint clean. (API assumed present from SP-107B; tests mock the API.)
- **Dependencies / exclusions:** SP-107B + SP-107C (must be implemented first). Excluded outcomes owned elsewhere: end-to-end flow + manual sign-off (SP-107F), course management UI (EP02). Every excluded requirement has an owner in the [README traceability table](./README.md#source-requirements-and-test-traceability).
