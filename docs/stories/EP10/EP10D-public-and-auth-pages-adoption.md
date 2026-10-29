# EP10D: Public & Auth Pages Adoption

**Story ID:** EP10D
**Title:** Frontend — adopt the refreshed design system on public/auth pages (home, login, register, forgot/reset password, verify email, onboarding)
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Queued
**Dependencies:** EP10C (settled design system).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (planning)

## Summary

Restyle the public and authentication surfaces — home, login, register, forgot/reset password, verify email, onboarding — to the refreshed design system, preserving all auth flows, validation, and routing.

## Description & bounded scope

### In scope

1. **Pages:** `apps/web/src/pages/{home,login,register,forgot-password,reset-password,verify-email,onboarding}`.
2. **Adoption:** replace ad-hoc color/spacing with semantic tokens and primitives; keep forms, validation, and submit flows identical.
3. **States:** loading/error/empty states follow the shared patterns.
4. **Accessibility:** keyboard, focus, labels, reduced motion.

### Out of scope

- Token/primitive/shell definitions (EP10A–EP10C).
- Academic data, calendar, dashboard, profile pages (EP10E–EP10G).
- Backend/API changes (D10-2).
- Auth logic changes.

## Source requirement references

- **Epic AC-E10-04, AC-E10-05, AC-E10-06**.
- **Shared DoD** — items 1, 5, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D10-1, D10-2, D10-4, D10-6, D10-8.

## Acceptance criteria

1. All six public/auth surfaces render with the refreshed system.
2. Forms, validation messages, and submit flows behave exactly as before (no functional regression).
3. Loading/error states are visually consistent with the shared patterns.
4. Keyboard operability, focus visibility, and reduced motion are preserved.
5. Existing page tests pass; new/updated tests cover the refreshed states where changed.

## Tests to add / update

- Page tests under `apps/web/src/pages/{login,register,...}` updated for any changed markup/queries.
- Verification: `pnpm --filter web test -- src/pages`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- Pages exist: `home, login, register, forgot-password, reset-password, verify-email, onboarding`.
- Auth forms use `Input`/`Button` primitives and Tailwind utility classes.

### Proposed files

- `apps/web/src/pages/home/ui/*`, `login/ui/*`, `register/ui/*`, `forgot-password/ui/*`, `reset-password/ui/*`, `verify-email/ui/*`, `onboarding/ui/*` (modify)

### Unverified / for implementation

- Exact markup changes depend on the settled token/primitive output of EP10A–EP10C.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — validation rules unchanged; only presentation.
3. Not applicable — no data access changes.
4. Not applicable — no API changes.
5. Loading/error states handled.
6. Keyboard accessibility + focus.
7. Responsive desktop + mobile.
8. Automated page tests pass.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP10 parent review.
11. Reviewer walkthrough — combined EP10 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** public/auth pages adopted onto the refreshed system with no functional regression.
- **Request/token estimate:** ~2–3 requests/tokens — six surfaces, tests.
- **Model recommendation:** 2 — mechanical adoption over a settled system; low risk.
- **Files:** public/auth page components (modify) + tests.
- **Start context:** this story file; EP10A–EP10C output; the six page directories.
- **Verification:** `pnpm --filter web test -- src/pages`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP10C implemented. Excludes token/primitive/shell definitions and other page groups.

## UI/UX refinement

No separate `ui-refiner` pass is expected: this is mechanical adoption of the settled system from EP10A–EP10C. If a story proposes layout changes beyond token application, run `ui-refiner` on EP10D before implementation.