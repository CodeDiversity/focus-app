# EP10F: Calendar & Availability Pages Adoption

**Story ID:** EP10F
**Title:** Frontend — adopt the refreshed design system on calendar and availability pages
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Implemented — awaiting parent review**Dependencies:** EP10C (settled design system); EP04 frontend children implemented and parent-reviewed — SP-127 (pass 3), SP-128 (pass 1, SP-128B with the F-B-6 fix round open), SP-129 (pass 3).
**Jira key:** Pending creation
**Refined:** 2026-10-29 (planning)

## Summary

Restyle the calendar and availability surfaces — the week view, event chips/details, mobile agenda, and availability editor — to the refreshed design system, preserving the calendar contract and all interactions.

## Description & bounded scope

### In scope

1. **Pages:** `apps/web/src/pages/{calendar,availability}`.
2. **Features:** `apps/web/src/features/calendar` and `features/availability` UI (week view, chips, details dialog, agenda, editor) adopted to tokens/primitives.
3. **Adoption:** replace ad-hoc color/spacing with semantic tokens; keep data flows, navigation, dialogs, and actions identical.
4. **States:** loading/empty/error consistent with shared patterns.

### Out of scope

- Token/primitive/shell definitions (EP10A–EP10C).
- Calendar API or contract changes (EP04 owns those).
- Backend/API changes (D10-2).
- Feature logic changes.

## Source requirement references

- **Epic AC-E10-04, AC-E10-05, AC-E10-06**.
- **Shared DoD** — items 1, 5, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D10-1, D10-2, D10-4, D10-6, D10-8, D404-9 (calendar UI specifics already settled by ui-refiner in EP04).

## Acceptance criteria

1. Calendar (week view + mobile agenda) and availability pages render with the refreshed system.
2. Week navigation, event chips/details, empty/loading/error states, and the availability editor behave exactly as before.
3. Event-type identification remains non-color (icons + text labels) after restyle.
4. Keyboard operability, focus visibility, and reduced motion are preserved.
5. Existing page/feature tests pass; updated tests cover changed markup.

## Tests to add / update

- `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx`, `apps/web/src/pages/availability/*` tests, `features/calendar` component tests.
- Verification: `pnpm --filter web test -- src/pages/calendar src/pages/availability src/features/calendar src/features/availability`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- Pages: `calendar`, `availability`.
- EP04 frontend children are implemented and parent-reviewed: SP-127 (pass 3), SP-128 (pass 1, SP-128B with the F-B-6 fix round open — fix applied, verification pending), SP-129 (pass 3). Their UI specifics were settled by ui-refiner (D404-9) and recorded in SP-127B/SP-128B/SP-129A. Because SP-128B's kind-selector visual defect (F-B-6) is in the availability modal, EP10F's restyle of that modal should re-verify the F-B-6 fix alongside token adoption; no other EP04 UI changes are pending.
- Calendar UI uses event chips with type icons + text labels, course color as secondary cue.

### Proposed files

- `apps/web/src/pages/calendar/ui/*`, `availability/ui/*` (modify)
- `apps/web/src/features/calendar/*`, `availability/*` (modify)

### Unverified / for implementation

- Exact markup changes depend on the settled token/primitive output of EP10A–EP10C.
- Confirm no regressions against the EP04 calendar contract (read-only; no API changes).

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — validation rules unchanged; only presentation.
3. Not applicable — no data access changes.
4. Not applicable — no API changes.
5. Loading/empty/error states handled.
6. Keyboard accessibility + focus.
7. Responsive desktop + mobile (week view + agenda).
8. Automated tests pass.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP10 parent review.
11. Reviewer walkthrough — combined EP10 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** calendar and availability pages adopted onto the refreshed system with no functional regression.
- **Request/token estimate:** ~2–3 requests/tokens — two surfaces + feature components + tests.
- **Model recommendation:** 2 — mechanical adoption over a settled system; the calendar specifics are already settled (D404-9).
- **Files:** page + feature components across calendar/availability (modify) + tests.
- **Start context:** this story file; EP10A–EP10C output; EP04 story files (SP-127B/SP-128B/SP-129A); the page/feature directories.
- **Verification:** `pnpm --filter web test -- src/pages/calendar src/pages/availability src/features/calendar src/features/availability`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP10C implemented and EP04 frontend pages implemented and parent-reviewed (SP-128B with F-B-6 fix round open). Excludes token/primitive/shell definitions and other page groups.

## UI/UX refinement

No separate `ui-refiner` pass is expected: the calendar/availability UI specifics are already settled in EP04 (D404-9) and this story is mechanical adoption. If a story proposes layout changes beyond token application, run `ui-refiner` on EP10F before implementation.