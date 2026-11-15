# EP13H — Flexible Sessions UI

**Story ID:** EP13H
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend
**Status:** Blocked — D13-4 ruling required; then **Needs refinement (ui-refiner, D13-14)**
**Dependencies:** EP13G implemented; D13-4 resolved; ui-refiner pass.
**Jira key:** Pending creation

## Summary

Present day-anchored sessions as what they are — intentions for the day, not
appointments. The plan preview/editor, today section, and calendar distinguish
flex from fixed: flex sessions read as "today: Biology, ~60 min (morning)"
with a start-anytime affordance, never as a 9:00 slot that can be missed;
fixed sessions keep their clock presentation with a visible reason ("due
Friday"). The editor can pin a flex session to a slot (making it fixed) or
unpin a fixed one where feasibility allows.

## Scope

**In scope:**
- Plan preview/editor: flex vs fixed presentation, pin/unpin controls,
  window-hint chips (morning/afternoon/evening).
- Today section + what-now card (EP13D surfaces): flex sessions startable
  anytime; fixed sessions show their time.
- Calendar: flex sessions rendered as day-level items (not fake clock
  blocks), per the D13-4 option (b) suggested-slot model or the ruling's
  alternative.
- Component tests (TR-E13-08); recorded manual a11y pass (TR-E13-14).

**Out of scope:**
- Model/engine/API (EP13G). Momentum, micro-start (EP13K, EP13J).

## Source requirement references

- Epic AC-E13-09 (UI half), AC-E13-12 (copy rule). Shared DoD 1, 2, 4, 5, 6,
  7, 8. TR-E13-08, TR-E13-14.

## Acceptance criteria

1. Flex and fixed sessions are visually and semantically distinct on every
   surface that renders sessions (plan, today, calendar), with the pin reason
   visible for fixed sessions.
2. A flex session can be started directly from any of its renderings; its
   copy never shows a missable clock time.
3. Pinning/unpinning in the editor round-trips through the EP13G contract,
   with validation errors surfaced actionably.
4. No "overdue at 9:00"-style framing exists for flex sessions anywhere
   (copy assertions, D13-9).
5. All states, keyboard operability, and narrow-screen behavior per EP11
   patterns.

## Tests (TR-E13-08)

- Rendering matrix (flex/fixed × plan/today/calendar).
- Start-anytime flow (mocked EP13B endpoint); pin/unpin round-trip incl. 400
  handling.
- Copy assertions (no clock-missed framing, no shaming).
- Keyboard + narrow-screen.

## Technical notes

- Consumes EP13G's payload fields verbatim; no local scheduling logic.
- Builds on EP13D's today/calendar components — this story restyles and
  extends them, it does not fork them.
- **UI/UX gaps for the ui-refiner (D13-14):** flex visual language (chips?
  cards?), where pin/unpin lives, window-hint presentation, calendar
  day-level rendering, editor interaction for mixed days.

## Definition of Done

1. Functional criteria pass (AC-E13-09 UI).
2. Client validation mirrors EP13G DTO rules.
3. N/A (server-side scoping). 4. Errors actionable.
5. States. 6. Keyboard. 7. Responsive.
8. Automated tests (TR-E13-08). 9. N/A.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** day-anchored sessions read and behave as startable intentions across plan, today and calendar.
- **Estimate:** 2 requests/tokens.
- **Model recommendation:** 3 — presentation/composition over EP13D's components.
- **Production files:** plan editor components, `features/today-plan/*`, calendar components.
- **Test files:** colocated component tests.
- **Minimal start context:** this story + ui-refiner record, EP13G contract, EP13D components.
- **Verification:** `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13G; ui-refiner. Blocks nothing (EP13M journeys reference it if landed).
- **Exclusions:** engine/API semantics (EP13G).

## Tracker reference

Jira key: Pending creation (no sync authorized).
