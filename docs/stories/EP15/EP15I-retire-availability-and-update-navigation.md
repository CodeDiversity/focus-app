# EP15I — Retire the Availability Page and API; Update Navigation

**Story ID:** EP15I
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Backend + Frontend (removal, one migration, nav)
**Status:** Queued
**Dependencies:** EP15G implemented (the replacement editor exists for both kinds). Epic decisions D15-3, D15-9 (ratified 2026-11-16); amends EP11 D11-4/D11-6/D11-8 (recorded there as D11-10).

## Plan at a glance

- **What this changes:** a migration drops `availability_slots`; the `availability` API module, the `/availability` page and its entities/features are deleted; `/availability` redirects to `/calendar`; the Planning nav group becomes Calendar + Plan and the account menu loses Availability; "Manage availability" links become the calendar's own "Add"; docs updated.
- **Why it improves it:** one surface, one truth — the stale editor from the interim (D15-15) is gone (product, AC-E15-13); no dead code or dead table remains (code).
- **Decisions needing you:** none ▲ — D-I1…D-I2 ratify by default (D15-17).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Remove what EP15A–EP15G replaced. The data was copied in EP15A; this child
only drops and deletes, then updates every pointer to the old surface.

## Scope

**In:** migration `…_drop_availability_slots`; schema/relation removal; `modules/availability/**` deletion incl. tests and `app.module.ts`; web `pages/availability`, `features/availability`, `entities/availability` deletion; route redirect; `navGroups.ts` + header tests; calendar/dashboard links to `/availability`; E2E references; README schema/API lists; EP11 epic register note D11-10 (planner-owned text already recorded).
**Out:** any new behaviour.

## Source requirement references

AC-E15-13 (retire half); TR-E15-09; DoD-8, DoD-9.

## Acceptance criteria

1. The migration drops `availability_slots`; the `AvailabilitySlot` model, `EnergyLevel` usage on it and the `User.availabilitySlots` relation are removed; `db:generate`, typecheck and the full gated API suite are green.
2. `apps/api/src/modules/availability/**` is deleted and unwired; `apps/web/src/{pages/availability,features/availability,entities/availability}/**` are deleted; a repository-wide search for `availability-slots`, `AvailabilitySlot`, `availabilitySlot` and `'/availability'` finds only the redirect route, historical records under `docs/stories/**/artifacts`, and closed story/plan texts.
3. `/availability` renders `<Navigate to="/calendar" replace />`; `navGroups.ts` lists Planning = Calendar, Plan and the account menu has no Availability entry; header/drawer tests assert the new sets; every former "Manage availability" link or empty-state CTA on the calendar and dashboard points to the calendar's Add action or is removed.
4. `apps/web/e2e/*` no longer references the availability page; the root README's schema and API sections and `docs/stories/EP15/contracts.md` record the drop.

## Tests (TR-E15-09)

- API: suite green after deletion; a schema test that `availability_slots` is absent after migrations run.
- Web: route test for the redirect; `navGroups` snapshot/sets; header desktop + drawer tests for the Planning group and account menu; calendar empty-state test for the Add CTA.
- Repo: the search in EP15I-AC2 as a verification command recorded in the implementation record.

## Technical notes

- **Inspected:** `apps/api/src/modules/availability/*` (files to delete), `apps/web/src/app/App.tsx` route table (`/availability` at L65), `navGroups.ts` per EP11 (D11-4/D11-6/D11-8 — Planning group + account menu), `CalendarPage.tsx` "Manage availability" links (header button and empty state), root README schema list ("AvailabilitySlot: User availability").
- **Proposed:** keep the redirect indefinitely (D-I1); record the EP11 amendment as a register row rather than editing EP11's settled text.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-I1 | `/availability` route: (a) permanent redirect to `/calendar`; (b) remove the route (falls to the `*` → `/` redirect) | **(a)** — bookmarks and muscle memory land on the right surface; one line | Proposed |
| D-I2 | Drop timing: (a) in this child, after EP15G exists; (b) in EP15A with the copy | **(a)** — D15-15's interim keeps the old editor usable until the new one is live | Proposed |

## Definition of Done

1, 8 (TR-E15-09), 9 (migration + README/API docs). 2–7 N/A (removal). 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** the old availability surface and table are gone, and every path leads to the calendar.
- **Actual at closeout:** tbd.
- **Files:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/<ts>_drop_availability_slots/migration.sql` (new), `apps/api/src/app.module.ts`, deletions listed in Scope, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/navGroups.ts` + header tests, `apps/web/src/pages/calendar/ui/CalendarPage.tsx`, `apps/web/e2e/*.spec.ts`, `README.md`, `docs/stories/EP15/contracts.md`.
- **Start context:** this story; contracts.md § Data model (Migration 2); `navGroups.ts`; `App.tsx`.
- **Verification:** `pnpm db:generate && pnpm typecheck && pnpm lint && pnpm test` green at the root; the EP15I-AC2 search command output recorded.
- **Dependencies / exclusions:** EP15G. E2E rewrite → EP15J.
