# EP13H2 — Flex Details Dialog + Calendar Suite Repair

**Story ID:** EP13H2
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend (one component conditional + one test-suite repair; no contract change)
**Status:** Implemented — awaiting parent review (2026-11-15; record `./artifacts/EP13H2/implementation.md`)
**Dependencies:** EP13H implemented.
**Provenance:** User decision 2026-11-15: close EP13H's two small open findings before EP13I, as evidence for the parent review.
**Jira key:** Pending creation

## Why this story exists

Two findings from the EP13H record, both small, both cheap now and expensive
at parent review time:

1. **F-EP13H-03** — `CalendarEventDetails` still prints a flex session's
   stored times as plain "Time: 19:00 – 20:00". The chip never shows them,
   but one click away the dialog quietly re-promises the clock slot the whole
   feature exists to remove. EP13H AC-2 ("copy never shows a missable clock
   time") should hold on *every* rendering, including the secondary one.
2. **F-EP13H-04 / F-EP13D-01** — the `CalendarPage` suite (8 tests) has been
   failing and inherited by four consecutive stories. Diagnosis (this story):
   the page derives its week from the **real clock** while the fixtures are
   frozen at 2026-10-26…11-01 — the suite was a time bomb that detonated when
   the real date rolled past the fixture week (first visible 2026-11-14,
   which is why EP13D inherited it). Not a product defect: the fix is to
   freeze `Date` in the suite, not to change the page. Repairing it restores
   page-level verification for everything the last four stories could only
   verify at chip/service level (flex ordering, "Anytime" chips, agenda).

## Acceptance criteria

1. The details dialog for a `FLEX_DAY` planned session shows **Time:
   Anytime** and the engine's slot as a separately labelled **Suggested**
   row; every other event type renders exactly as before.
2. All 12 `CalendarPage` tests pass deterministically, independent of the
   real date (Date frozen inside the suite; no page/production change for
   this item).
3. The full web suite is green — zero inherited failures remain.

## Tests

- `CalendarEventDetails.test.tsx` (extend): flex planned session → "Anytime"
  + labelled suggestion row; fixed planned session and a CLASS event
  unchanged.
- `CalendarPage.test.tsx` (repair): `vi.useFakeTimers({ toFake: ['Date'] })`
  pinned to the fixtures' week; all existing assertions unchanged — the
  repair must not weaken what the suite checks.

## Definition of Done

1. Functional criteria pass. 2–4. N/A (no new inputs/contracts/errors).
5–7. Existing dialog states/keyboard/responsive unchanged (covered by the
extended test). 8. Automated tests. 9. N/A.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** no surface re-promises a flex session's clock slot, and the calendar page's test suite verifies again.
- **Estimate:** <1 request.
- **Production files:** `features/calendar/ui/CalendarEventDetails.tsx` only.
- **Test files:** `CalendarEventDetails.test.tsx`, `CalendarPage.test.tsx`.
- **Verification:** `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13H. Blocks nothing; unblocks honest full-suite claims for every later story.

## Tracker reference

Jira key: Pending creation (no sync authorized).
