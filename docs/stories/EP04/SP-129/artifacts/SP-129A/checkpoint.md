# SP-129A checkpoint

Updated: 2026-10-28 (Europe/Stockholm local, system time)
Execution state: [SP-129 README execution queue](../../README.md) — SP-129A `In progress`
Story: [SP-129A-mobile-agenda-view.md](../../SP-129A-mobile-agenda-view.md)
Review unit: parent SP-129 — final implementation index at `docs/stories/EP04/SP-129/artifacts/SP-129/implementation.md` (written after this child completes)
Role / scope: implementer; frontend only — `CalendarAgenda` component, CalendarPage viewport switch, component tests, e2e extension. No backend, no new contracts, no filters/per-day indexes.

## Repository state

- Workspace / branch: `master` (single shared workspace; no other writers active)
- HEAD at last update: `89df8f2` (docs(AGENTS): shell is a direct top-level tool)
- Saved work: ui-refiner's finished story spec found **uncommitted** in the working tree (`docs/stories/EP04/SP-129/SP-129A-mobile-agenda-view.md`, diff = Needs-refinement → Ready + decisions D129A-01…D129A-08). Preserved verbatim; queued for its own scoped commit mirroring the SP-128B pattern (`24978c7`, refiner-output commit) before implementation edits.
- Other work to preserve: none observed (`git status` shows only the story file modified).

## Progress

- [x] Read delivery state, parent queue, story spec, shared DoD pointer; SP-127B calendar code inspected (WeekView, CalendarEventChip, CalendarEventDetails, CalendarPage + tests, e2e calendar.spec.ts).
- [ ] Queue reconciliation: story file is Ready (ui-refined) while queue row said `Needs refinement` — reconcile to Ready → In progress with evidence.
- [ ] `CalendarAgenda.tsx` (day-grouped vertical agenda, decisions D129A-02/03/04/06/07/08).
- [ ] `CalendarAgenda.test.tsx` (grouping/order, exactly-once render, empty days omitted, type label, dialog open + focus return).
- [ ] `CalendarPage.tsx` viewport switch via `matchMedia('(max-width: 639px)')` (D129A-01), loading/empty/error states unchanged (D129A-05).
- [ ] `CalendarPage.test.tsx` narrow/wide viewport tests.
- [ ] `e2e/calendar.spec.ts` phone-viewport agenda journey.
- [ ] Verification: vitest focused, typecheck, lint, e2e calendar spec.
- [ ] Closeout: implementation.md, queue/status update, commits.

Current step: commit the preserved ui-refiner spec + queue reconciliation, then write `CalendarAgenda.tsx` with failing component tests first.

## Decisions and dependencies

- Bound by the story's ui-refined decisions D129A-01…08 (breakpoint 640px, civil-noon day headers, time-above-title entry, non-color type labels, page-owned empty state, 44px tap targets, WeekView-shaped props, chip reuse).
- jsdom has no `matchMedia` — mock per the `main.test.tsx` stub pattern in the page test.
- WeekView has no dedicated test file (covered through CalendarPage tests); the week-view return-path assertion in CalendarPage tests uses `role="list"` absence/presence.

## Verification

- Not yet run. Planned: `pnpm --filter web test -- src/features/calendar src/pages/calendar` (cwd repo root), `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm test:e2e -- calendar` (self-contained stack).

## Resume next

1. Commit ui-refiner spec + queue/status reconciliation; then create `apps/web/src/features/calendar/ui/CalendarAgenda.tsx` and `CalendarAgenda.test.tsx` per D129A decisions.
2. Extend `CalendarPage.tsx` + `CalendarPage.test.tsx`, then `e2e/calendar.spec.ts`; run focused vitest → typecheck → lint → calendar e2e.
- Read next: `apps/web/src/features/calendar/ui/WeekView.tsx`, `CalendarEventChip.tsx`, `apps/web/src/pages/calendar/ui/CalendarPage.tsx`.
