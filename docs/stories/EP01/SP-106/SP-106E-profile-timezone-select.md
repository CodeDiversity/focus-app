# SP-106E: Profile Time-Zone Select (UX Improvement)

**Story ID:** SP-106E
**Parent:** [SP-106](./SP-106-profile-and-preferences.md) (Jira STUDY-11)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Frontend
**Status:** Queued
**Dependencies:** SP-106C (form wiring, `updateProfile` thunk, error contract)
**Jira key:** Pending creation

## Summary

Replace the Profile page's free-text time-zone input with a pre-loaded select dropdown that lists all supported IANA time zones, sorted by offset and region. The selected value is still submitted via `PATCH /users/me` through the existing `updateProfile` thunk; no backend change is required.

## Description

As a student, I want to pick my time zone from a pre-populated list instead of typing it, so I don't have to remember or guess the correct IANA identifier.

## Source requirement references

- **AC-106-04** (original epic): "The time zone defaults to the browser-detected zone, offered as a sensible default the student can change." — unchanged product intent; the select delivers the same outcome with better discoverability.
- **AC-106-03** (original epic): "Time zone accepts only valid IANA identifiers; invalid values rejected on both frontend and backend." — the select eliminates the possibility of sending an invalid value from the frontend, but the backend validator (SP-106B) remains as a safety net.
- **D106-8 (overridden)**: "Time-zone UI is a free-text input, not a select." — this story **explicitly overrides** this decision. The original rationale ("a select of valid zones cannot produce one") was correct for the original AC, but the user has determined that the free-text input is bad UX. The select approach is reversible (the API contract is unchanged), so overriding D106-8 is a safe, reversible product decision.
- **Shared DoD items 5, 6, 7**: loading/error/success states, keyboard accessibility, responsive layouts — all apply to the new Select component.

## Acceptance criteria

1. The Profile page renders a **select dropdown** (not a text input) for the time zone, pre-populated with all IANA time zones supported by the runtime's `Intl.DateTimeFormat`.
2. The list is **sorted** by UTC offset (ascending), then alphabetically by region name within each offset, so related zones cluster together (e.g., `Pacific/Majuro` before `Pacific/Wake`).
3. The currently stored (or browser-detected, per D106-3) zone is **selected** by default, matching the existing pre-fill behavior.
4. Selecting a zone updates the **stored-zone display line** ("Your time zone: … (currently … there)") in real time as the student changes the selection — no save required.
5. The form **submits the selected value** through the existing `PATCH /users/me` endpoint (SP-106B contract); the backend IANA validator (SP-106B) remains as a safety net but should never reject a select-provided value.
6. The select is **keyboard accessible**: Tab focuses the control, arrow keys navigate options, Escape closes the dropdown, and Enter/Space confirms. The existing `aria-invalid`/`aria-describedby` error wiring applies when the API returns a field-level 400.
7. The select **respects loading/error/success states**: disabled while submitting, shows the existing error message under the field when the API returns `errors.timeZone`, and shows the success toast on save.
8. The select **fits the existing card layout** on both desktop and mobile viewports (responsive).

## Tests

New/updated tests in `apps/web/src/pages/profile/ui/ProfilePage.test.tsx` (rewrite the time-zone-related cases from the existing SP-106C tests):

- **Select renders with all supported zones**: assert the `<select>` element exists, has the correct number of `<option>` elements, and the list is sorted by offset then region name.
- **Pre-selects the stored zone**: when the user's stored zone is `America/New_York`, the select's `value` attribute equals `America/New_York`.
- **Pre-selects the browser zone when stored is "UTC"**: matches the existing D106-3 pre-fill rule.
- **Updates the stored-zone display line in real time**: changing the select option updates the "Your time zone: …" line without a save.
- **Submits the selected value via PATCH**: clicking "Save Changes" sends `{ name, timeZone }` through `updateProfile` with the selected zone string.
- **Field-level 400 error displays under the select**: when the API returns `errors.timeZone`, the error message renders below the select (using `aria-invalid`).
- **Keyboard navigation**: Tab focuses the select, arrow keys move between options, Escape closes (if applicable), Enter/Space confirms.
- **Disabled while submitting**: the select is disabled during submission, matching existing behavior.
- **Responsive layout**: the select fits within the card on both mobile and desktop viewports (visual assertion).

## Technical notes

- **Inspected (2026-10-18):** `apps/web/src/pages/profile/ui/ProfilePage.tsx` (free-text `<Input>` for timeZone, lines 145–151), `apps/web/src/shared/lib/datetime.ts` (existing `isValidTimeZone`, `getBrowserTimeZone` — no `supportedValuesOf` polyfill), `apps/web/src/shared/ui/Input.tsx` (label + error + hint wiring — no Select exists), `apps/web/src/pages/profile/ui/ProfilePage.test.tsx` (355 lines, free-text input tests), `apps/web/package.json` (no time-zone library).
- **No backend change**: the API contract (`PATCH /users/me` accepting `timeZone: string`) is unchanged. The backend IANA validator (SP-106B, `validate-iana-time-zone.validator.ts`) remains as a safety net.
- **Time zone list source:** `Intl.DateTimeFormat.supportedValuesOf('timeZone')` is the ES2022 standard API for enumerating all supported IANA identifiers. If unavailable in the runtime (Node < 16, older browsers), fall back to a **curated list of ~100 most-common zones** shipped with the app. The fallback list should be a constant exported from `shared/lib/datetime.ts` and tested against `isValidTimeZone` to ensure all entries are valid.
- **Select component:** no existing `<Select>` UI component exists (only `Input` and `Button` in `shared/ui/`). Build a minimal `Select` component in `shared/ui/Select.tsx` with `label`, `error`, `disabled`, `aria-invalid`, `aria-describedby` props matching the existing `Input` pattern. This component is reusable for future form fields.
- **Sorting:** use `Intl.DateTimeFormat` to compute each zone's offset at a fixed reference date (e.g., `new Date('2026-06-15T12:00:00Z')` — Northern Hemisphere mid-year avoids DST edge cases), then sort by offset ascending, then by region name alphabetically.
- **Existing tests to rewrite:** all 9 time-zone-related test cases in `ProfilePage.test.tsx` (lines 117–247) currently assert on a text `<input>`. Rewrite these to assert on a `<select>` element: `screen.getByRole('combobox')` or `screen.getByLabelText(/time zone/i)` pointing to the `<select>`.

## Definition of Done

1. ACs pass (select renders, pre-selects, submits, displays, navigates).
2. Frontend validation: the select can only produce valid IANA identifiers (by construction from the runtime's supported list).
3. Student data scoping: N/A — the form edits only the principal's own profile; the API is self-scoped (SP-106B).
4. Field-level + sanitized errors: API 400 with `errors.timeZone` renders under the select; non-400 errors show the existing toast.
5. Loading/error/success states: select disabled during submission, spinner on button, success toast, error toast for non-400.
6. Keyboard accessibility: Tab focus, arrow key navigation, Enter/Space confirm (DoD 6).
7. Responsive layouts: fits mobile and desktop viewports (DoD 7).
8. Tests: all time-zone test cases rewritten for the select; existing non-time-zone tests (if any) unchanged.
9. API/migration documentation: N/A — no API or migration change.
10. Integrated development review: via the combined SP-106 parent review (DoD 10).

## Sizing

- **Outcome:** Profile page time-zone field changed from free-text input to pre-loaded select dropdown; reusable Select UI component; datetime helper extended with `getTimeZones()` (with fallback).
- **Time estimate:** ~2–3 hours (one new UI component, one datetime helper addition, one page change, one test rewrite — all within the existing feature).
- **Files:** `apps/web/src/shared/ui/Select.tsx` (**new**), `apps/web/src/shared/lib/datetime.ts` (add `getTimeZones`), `apps/web/src/pages/profile/ui/ProfilePage.tsx` (replace `<Input>` with `<Select>`), `apps/web/src/pages/profile/ui/ProfilePage.test.tsx` (rewrite time-zone cases).
- **Start context:** this ticket, decisions D106-3/D106-8 (overridden), the [shared API contract](./README.md#shared-api-contract), `ProfilePage.tsx`, `datetime.ts`, `Input.tsx`, `ProfilePage.test.tsx`, existing page-test wrapper pattern.
- **Verification:** `pnpm --filter @studypilot/web test` (vitest, full suite green), `pnpm --filter @studypilot/web typecheck`, `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** SP-106C (form wiring, `updateProfile` thunk, error contract). Excluded outcomes: backend (SP-106A/B), integration sign-off (SP-106D), parent review (SP-106). All mapped in the [README traceability table](./README.md#source-requirements-and-test-traceability).

## Tracker reference

- **Jira key:** Pending creation (parent epic STUDY-11, milestone M1).
