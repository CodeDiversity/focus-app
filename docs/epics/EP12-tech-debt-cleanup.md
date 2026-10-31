# EP12: Tech Debt Cleanup

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** Medium / P1
**Labels:** `studypilot`, `mvp`, `tech-debt`
**Dependencies:** Cross-cutting. EP12A touches backend date utilities already shipped in EP04/EP06; EP12B depends on EP10B (shared `Dialog` primitive, reviewed); EP12C depends on the EP04/EP05 pages that consume the calendar/assignment endpoints. No new product behavior.

## Epic Summary

Reduce three known, acknowledged sources of maintenance and correctness risk in the existing codebase without changing product behavior: duplicated IANA time-zone date conversion, hand-rolled modal dialogs that bypass the shared `Dialog` primitive, and parallel web API clients per domain that duplicate endpoint contracts.

## Description

As a maintainer, I want the codebase to have a single source of truth for time-zone date conversion, a single shared modal primitive, and one client per backend endpoint, so that fixes and contract changes propagate once instead of across copies.

The work is refactor-only: no new features, no API contract changes, no schema changes. Each child is independently testable and must leave existing tests green.

## Scope

- Consolidate the three backend copies of the `Intl.DateTimeFormat('en-CA', { timeZone })` conversion into one shared helper under `apps/api/src/common/lib/`.
- Migrate hand-rolled modal dialogs (`role="dialog" aria-modal="true"`) to the shared `shared/ui/Dialog` primitive.
- Unify the parallel `entities/` (axios) and `features/` (RTK Query) API clients per domain behind a single contract.

## Acceptance Criteria

- Time-zone date conversion has a single implementation; calendar and study-plans services import it instead of keeping private copies; all existing date tests pass.
- All modal dialogs in `apps/web/src` use `shared/ui/Dialog` (or document a justified exception); focus-trap/scroll-lock/Escape behavior is identical across dialogs.
- Each backend endpoint consumed by the dashboard has a single client module; no duplicated URL/params/type contract remains; existing page and dashboard tests pass.

## Proposed Stories

1. EP12A — Consolidate IANA/time-zone date conversion (backend).
2. EP12B — Adopt the shared `Dialog` primitive across hand-rolled modals (frontend).
3. EP12C — Unify web API clients per domain (frontend).

## Technical Notes

- **Not a feature epic.** No AC/TR IDs exist upstream; stable IDs are assigned in the breakdown README if needed. This epic adds no Jira implementation ticket beyond its own Epic.
- **Out of scope:** new product features, API contract changes, schema migrations, dark mode, visual redesign (EP10), navigation (EP11).
- **Milestone:** M5 (cross-cutting polish), alongside EP10/EP11.

## Definition of Done

Shared DoD applies (see `docs/epics/README.md`). Refactor stories must additionally keep the full existing test suite green and add no new lint warnings.