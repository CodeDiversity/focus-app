# EP13H2 implementation record

**Story:** [EP13H2 — Flex Details Dialog + Calendar Suite Repair](../../EP13H2-flex-details-and-calendar-suite-repair.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-15
**Commit scope:** `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx` (+ test), `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx` (test-only repair), EP13H2 docs/queue updates.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| 1 — flex dialog: "Time: Anytime" + labelled Suggested row; everything else unchanged | **Done.** One conditional in `CalendarEventDetails`: `FLEX_DAY` → Time reads "Anytime" and the engine's slot moves to its own "Suggested" row. FIXED planned sessions and anchor-less types render byte-identically. Closes F-EP13H-03. | `CalendarEventDetails.test.tsx` (+2 cases: flex row pair; fixed + no-anchor negative) |
| 2 — the 8 CalendarPage tests pass deterministically | **Done.** Root cause diagnosed, not papered over: the page derives its week from the real clock, the fixtures are frozen at 2026-10-26…11-01, so the suite broke the day the real date left that week (first seen 2026-11-14 — exactly when EP13D "inherited" it). The repair freezes **only `Date`** (`vi.useFakeTimers({ toFake: ['Date'] })`, timers real so userEvent/waitFor are unaffected) to the fixtures' Wednesday. **No production change for this item; no assertion weakened.** Closes F-EP13D-01/F-EP13E-02/F-EP13F (inherited)/F-EP13H-04. | all 12 `CalendarPage.test.tsx` green |
| 3 — full web suite green | **Done.** `pnpm vitest run` → **1189 passed, 0 failed** (104 files) — the first fully green web run since 2026-11-14. typecheck/lint/format clean. | this record |

## Deviations: none. Findings: none new.

The four stories that reported "8 pre-existing CalendarPage failures, not absorbed" (EP13D/E/F/H) now have page-level verification restored for the surfaces they could only test at chip/service level (PLANNED_SESSION chips, flex "Anytime" rendering, agenda layout). Their records stay as written — the failures were real at their dates; the cause is recorded here.

## Changed paths

- `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx` (+ test) — the flex conditional.
- `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx` — Date frozen to the fixture week (test-only).
- Docs: this record, the EP13 README queue row, the EP13H2 story status.
