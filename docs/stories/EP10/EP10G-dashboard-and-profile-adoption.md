# EP10G: Dashboard & Profile Adoption

**Story ID:** EP10G
**Title:** Frontend — adopt the refreshed design system on dashboard and profile pages
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Queued
**Dependencies:** EP10C (settled design system); the pages it restyles must exist.
**Jira key:** Pending creation
**Refined:** 2026-10-29 (planning)

## Summary

Restyle the dashboard and profile surfaces to the refreshed design system, preserving widgets, settings, and profile flows. This story also owns the final cross-epic verification (TR-E10-03): re-running the EP09 E2E journeys after the refresh.

## Description & bounded scope

### In scope

1. **Pages:** `apps/web/src/pages/{dashboard,profile}`.
2. **Adoption:** replace ad-hoc color/spacing with semantic tokens and primitives; keep widgets, forms, and flows identical.
3. **States:** loading/empty/error consistent with shared patterns.
4. **Final verification:** run the EP09 E2E suite against the refreshed app and record the result (TR-E10-03).

### Out of scope

- Token/primitive/shell definitions (EP10A–EP10C).
- Dashboard feature logic or new widgets.
- Backend/API changes (D10-2).

## Source requirement references

- **Epic AC-E10-04, AC-E10-05, AC-E10-06**.
- **Shared DoD** — items 1, 5, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D10-1, D10-2, D10-4, D10-6, D10-8.

## Acceptance criteria

1. Dashboard and profile render with the refreshed system.
2. Dashboard widgets and profile forms/settings behave exactly as before.
3. Loading/empty/error states are visually consistent with the shared patterns.
4. Keyboard operability, focus visibility, and reduced motion are preserved.
5. Existing page tests pass; updated tests cover changed markup.
6. The EP09 E2E suite passes against the refreshed app (or any failure is recorded as a finding, not silently ignored).

## Tests to add / update

- `apps/web/src/pages/dashboard/ui/DashboardPage.test.tsx`, `apps/web/src/pages/profile/ui/ProfilePage.test.tsx` if present.
- EP09 E2E: `pnpm test:e2e` (recorded result in the parent implementation index).
- Verification: `pnpm --filter web test -- src/pages`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- Pages: `dashboard`, `profile`.
- EP09 E2E suite exists (SP-116–SP-119, all Reviewed) and runs against the real stack.

### Proposed files

- `apps/web/src/pages/dashboard/ui/*`, `profile/ui/*` (modify)
- `docs/stories/EP10/artifacts/EP10/implementation.md` (EP10G writes the final verification record)

### Unverified / for implementation

- Exact markup changes depend on the settled token/primitive output of EP10A–EP10C.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — validation rules unchanged; only presentation.
3. Not applicable — no data access changes.
4. Not applicable — no API changes.
5. Loading/empty/error states handled.
6. Keyboard accessibility + focus.
7. Responsive desktop + mobile.
8. Automated tests + E2E verification pass.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP10 parent review.
11. Reviewer walkthrough — combined EP10 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** dashboard and profile adopted onto the refreshed system, with final E2E verification recorded.
- **Request/token estimate:** ~2–3 requests/tokens — two surfaces + tests + E2E run/record.
- **Model recommendation:** 2 — mechanical adoption over a settled system; E2E run is verification, not new code.
- **Files:** page components across dashboard/profile (modify) + tests + parent implementation index.
- **Start context:** this story file; EP10A–EP10C output; the page directories; EP09 README (E2E contract).
- **Verification:** `pnpm --filter web test -- src/pages`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm test:e2e`.
- **Dependencies / exclusions:** EP10C implemented. Excludes token/primitive/shell definitions and other page groups.

## UI/UX refinement

No separate `ui-refiner` pass is expected: this is mechanical adoption of the settled system from EP10A–EP10C. If a story proposes layout changes beyond token application, run `ui-refiner` on EP10G before implementation.