# SP-106C: Profile and Preferences Form (Frontend)

**Story ID:** SP-106C
**Parent:** [SP-106](./SP-106-profile-and-preferences.md) (Jira STUDY-11)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Frontend
**Status:** Ready (planned 2026-10-17); implementation after SP-106B lands
**Dependencies:** SP-106B (PATCH + 400 `errors` contract; `GET` fields)
**Jira key:** Pending creation

## Summary

The Profile page gains a time-zone field — pre-filled with the browser-detected zone when the stored value is still the default — with client-side IANA validation, field-level API errors, and full loading/error/success states; the page displays the stored zone via the shared date/time helper; saving goes through `PATCH /users/me`.

## Description

As a student, I can see and change my time zone on my profile page, get clear feedback when a value is invalid, and trust that dates will display in my zone.

## Acceptance Criteria

1. The form has a **Time zone** text input pre-filled per D106-3: the stored value when it is not the schema default (`"UTC"`), otherwise `getBrowserTimeZone()`; the student can change it. *(AC-106-04, D106-3, D106-8)*
2. Client-side validation (zod `refine` on `isValidTimeZone` from `utils/datetime.ts`) rejects invalid IANA identifiers with a field-level message **before** any request is sent. *(AC-106-03, TR-106-01, D106-4)*
3. On save, the form submits `{ name, timeZone }` via the existing `updateProfile` thunk, whose `authService.updateProfile` switches from `api.put` to `api.patch` (D106-2). `preferences` is omitted from the M1 form body (D106-9 — partial update leaves the stored bag untouched). *(AC-106-02)*
4. A 400 response carrying the `errors` map displays field-level messages under the matching input (new `getFieldError` helper in `utils/errors.ts`); any other failure shows the existing sanitized error toast. *(AC-106-06, D106-6)*
5. Loading (submit disabled + button spinner, fields disabled), success (toast + updated user state), and error (field-level and/or toast) states are all handled. *(AC-106-06)*
6. The page displays the stored time zone via the shared helper — e.g. a line under the field: "Your time zone: `America/New_York` (currently 2:30 PM there)" using `formatDateTime(new Date(), user.timeZone)` — imported from `utils/datetime.ts`, never re-implemented. *(Story technical note)*
7. Keyboard accessible (the `Input` component's existing `aria-invalid`/`aria-describedby` wiring covers the new field) and responsive within the existing card layout. *(DoD 6, DoD 7)*

## Tests

New `apps/web/src/pages/Profile.test.tsx` (**new** — no Profile test exists today; follow the existing page-test wrapper pattern, e.g. `Register.test.tsx`):

- pre-fills the time-zone input from the stored value when non-default; falls back to the browser-detected zone when the stored value is `"UTC"` (mock `Intl.DateTimeFormat().resolvedOptions()`)
- invalid time zone (e.g. `Mars/Olympus`) → field-level error, **no** PATCH request sent
- valid submit → `PATCH /users/me` with `{ name, timeZone }` → success toast and the slice user updated
- API 400 with `errors.timeZone` → message rendered under the time-zone input
- submit disabled while loading; sanitized error toast on a non-400 failure
- the stored-zone display line renders via the shared helper (assert on the formatted output for a fixed instant + zone)

## Technical Notes

- **Inspected (2026-10-17):** `apps/web/src/pages/Profile.tsx` (zod `profileSchema`, `useAuth` adapter, `isSubmitting` states, no time-zone field), `apps/web/src/context/AuthContext.tsx` (adapter `updateProfile` dispatches the thunk, line 256 — unchanged), `apps/web/src/store/authSlice.thunks.ts` (`updateProfile` thunk is generic over `Partial<SessionUser>` — unchanged), `apps/web/src/services/auth.ts` (`updateProfile` uses `api.put` — the one-line switch), `apps/web/src/types/index.ts` (`SessionUser`/`User` lack the new fields), `apps/web/src/components/Input.tsx` (label + `aria-invalid`/`aria-describedby` error wiring verified), `apps/web/src/utils/datetime.ts` + `datetime.test.ts` (TECH-01 stub — `isValidTimeZone`, `getBrowserTimeZone`, `formatDateTime` exist), `apps/web/src/utils/errors.ts` (`getErrorMessage` handles string messages only).
- **Types:** `SessionUser` gains `timeZone: string` and `preferences: Record<string, unknown> | null`; `User` inherits. The login/register/boot responses gain these fields from SP-106A/B, so the types are additive and non-breaking.
- **Form:** extend `profileSchema` with `timeZone: z.string().refine(isValidTimeZone, 'Enter a valid IANA time zone, e.g. America/New_York')`; `defaultValues.timeZone` per the D106-3 pre-fill rule.
- **Errors:** `utils/errors.ts` gains `getFieldError(error: unknown, field: string): string | null` reading the `ApiError.errors` map (the type already declares `errors?: Record<string, string[]>`); the first message for the field is shown via the `Input` `error` prop. `getErrorMessage` is unchanged.
- **Display:** the stored-zone line uses `formatDateTime` from `utils/datetime.ts` with the **stored** `user.timeZone` (the story's technical note; the helper file's header says extend, don't fork).
- **No auth-slice changes:** the thunk/adapter already round-trip `Partial<User>`; only `services/auth.ts`'s verb changes.

## Definition of Done

1. ACs pass. 2. Frontend validation (this child). 3. N/A — the form displays/edits only the principal's own profile; the API is self-scoped (B). 4. Field-level + sanitized errors. 5. Loading/error/success states. 6. Keyboard (Input a11y wiring). 7. Responsive (existing card). 8. `Profile.test.tsx` above. 9. N/A — no API/migration change in this child (B documents the API change; A the migration). 10. Via the combined SP-106 parent review.

## Sizing

- **Outcome:** the Profile page edits and displays the time zone with validation, field-level API errors, full form states, and saves via `PATCH`.
- **Time estimate:** ~60–90 minutes (four small production files + one new test file; the form and helper wiring are straightforward given the verified components).
- **Files:** `apps/web/src/pages/Profile.tsx` (change), `apps/web/src/pages/Profile.test.tsx` (**new**), `apps/web/src/services/auth.ts` (PUT→PATCH), `apps/web/src/types/index.ts` (two fields), `apps/web/src/utils/errors.ts` (`getFieldError`).
- **Start context:** this ticket, decisions D106-2/D106-3/D106-4/D106-6/D106-8/D106-9, the [shared API contract](./README.md#shared-api-contract), `Profile.tsx`, `services/auth.ts`, `Input.tsx`, `utils/datetime.ts`, `utils/errors.ts`, one existing page test (e.g. `Register.test.tsx`) for the wrapper pattern, SP-106B's implementation record (exact 400 shape).
- **Verification:** `pnpm --filter @studypilot/web test` (vitest, full suite green), `pnpm --filter @studypilot/web typecheck`, `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** SP-106B. Excluded outcomes owned elsewhere: backend (SP-106A/B), round-trip + manual sign-off (SP-106D). All mapped in the [README traceability table](./README.md#source-requirements-and-test-traceability).
