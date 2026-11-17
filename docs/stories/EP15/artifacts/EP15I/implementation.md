# EP15I implementation record

**Story:** [EP15I — Retire the Availability Page and API; Update Navigation](../../EP15I-retire-availability-and-update-navigation.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-17
**Commit scope:** migration `20261117200000_drop_availability_slots` + schema (model/relation removed, client regenerated); `modules/availability/**` deleted and unwired (`app.module.ts`, `test-http.ts`); EP15A's migration round-trip spec replaced by `schedule-drop.e2e.spec.ts`; web `pages/availability`, `features/availability`, `entities/availability` deleted; `EnergyLevel` moved into `entities/schedule-block/model/types.ts`; `/availability` → redirect (+ `App.test.tsx`); `navGroups.ts` + header tests; calendar interim link removed (+ empty-state CTA assertion); e2e spec edits; README + contracts; comment rewording for search hygiene; this record; story/README/efficiency; checkpoint closed.

Decisions applied: D-I1, D-I2 ratified by default 2026-11-17 at implementation start on the user's instruction. Epic D15-3, D15-9, D15-15 as written; D11-10 already recorded in EP11's register by the planner. None reopened.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP15I-AC1 — migration drops `availability_slots`; model, its `EnergyLevel` use and the `User.availabilitySlots` relation removed; `db:generate`, typecheck and the full gated API suite green | **Done.** Migration SQL carries the irreversibility stance in its header (pre-drop `pg_dump -t availability_slots`; restore-from-backup, never a reverse migration — R-EP15-05); the `EnergyLevel` enum itself stays (ScheduleBlock uses it). `prisma generate` regenerated the committed client (the `AvailabilitySlot` model files are gone). Gated suite green — see Verification. | migration.sql; `schedule-drop.e2e.spec.ts` (2: table absent + `/availability-slots` routes 404) |
| EP15I-AC2 — API module and the three web directories deleted; the repository search finds only the redirect, historical records and closed story/plan texts | **Done.** The recorded search (below) finds, outside `docs/`: the drop migration's own header, the two specs that verify the absence (`schedule-drop.e2e.spec.ts`'s route probe; EP15D's guard asserting the planner never calls `availabilitySlot.`), the redirect route and its test — the retirement machinery itself, nothing live. Comments that named the old identifiers as "precedents" were reworded (`ownership.ts`, `academic.ts`, `studyPreferencesApi.ts`, `study-plans.controller.ts`, `schedule.module.ts`, `schema.prisma`, `e2e/helpers.ts`). | search output below |
| EP15I-AC3 — `/availability` renders `<Navigate to="/calendar" replace />`; Planning = Calendar, Plan, Plan health; account menu without Availability; former links point at the calendar's Add | **Done.** Route redirect (D-I1, kept indefinitely); `navGroups.ts` lost both entries (the D11-8 duplicate pair); header desktop + drawer tests assert the exact Planning set, the account menu absence, zero Availability links anywhere and the drawer focusables down 16 → 14; the calendar toolbar's interim "Manage availability" button is gone — "Add" (EP15G) is the CTA, asserted on the empty state too. | `App.test.tsx` (1), `Header.test.tsx` (4 updated), `CalendarPage.test.tsx` empty-state |
| EP15I-AC4 — e2e no longer references the availability page; README and contracts record the drop and its irreversibility stance | **Done.** `calendar.spec.ts`: the "Manage availability" expectation now asserts the "Add" button; the SP-128B availability-page journey is deleted (EP15J's `schedule.spec.ts` owns the replacement journeys). `adaptive-scheduling.spec.ts`: the `/availability` axe stop re-targeted to `/calendar` (R-EP15-12). Root README schema list updated; contracts.md Migration 2 marked applied 2026-11-17. | spec diffs; README L333-334; contracts § Data model |

## The EP15I-AC2 search (recorded verification)

```
grep -rn "availability-slots\|AvailabilitySlot\|availabilitySlot" --exclude-dir=node_modules \
  --exclude-dir=.git --exclude-dir=dist-test --exclude-dir=generated apps packages README.md AGENTS.md \
  | grep -v "docs/stories\|docs/epics"
# → migration 20261117200000 header (2 lines), schedule-inputs.service.spec.ts:259 (the
#   "planner never touches availabilitySlot." guard), schedule-drop.e2e.spec.ts:34-35 (the
#   absence probe). Nothing else.
grep -rn "\"/availability\"\|'/availability'" … apps packages README.md
# → App.tsx:63 (the D-I1 redirect) and App.test.tsx (its test). Nothing else.
```

## Verification (2026-11-17, this worktree)

**Tested state:** `HEAD 2c080e2` + the uncommitted changes that form this commit.

- **Gated API (full, single worker):** `createdb studypilot_ep15i_gate` → `DATABASE_URL=postgres://<local user>@localhost:5432/studypilot_ep15i_gate npx prisma migrate deploy` (all migrations incl. the new drop applied cleanly; `availability_slots` absent, `schedule_blocks` present) → `DATABASE_URL=… npx jest --runInBand` (cwd `apps/api`) → **85 suites, 1778 passed, 0 failed** (−4 suites: the three availability suites + EP15A's round-trip spec; +1: the drop spec; 1823 at EP15D). Database dropped afterwards. No `.env*` file was read; `DATABASE_URL` was shell-only (EP15B precedent).
- A first run without `--runInBand` showed 6 failures in `study-plans-catch-up-e2e.spec.ts` — its whole-table count snapshots raced parallel workers sharing the database; the documented gated invocation is single-worker (EP15B/EP15D precedent). Recorded as F-EP15I-01.
- **Web unit:** `npx vitest run` (cwd `apps/web`) → **124 files, 1374 passed, 0 failed** (five availability test files deleted with their code; +1 redirect test; header/page assertions updated in place).
- **Static:** API `tsc --noEmit` ✓, `eslint --max-warnings 0` ✓, prettier ✓; web `tsc` ✓, `eslint src e2e` ✓, prettier ✓ (both apps).
- **Web E2E (Playwright):** **not run in this worktree** (no API env here — EP15G/EP15H precedent); the three edited specs are type- and lint-checked only. EP15J rewrites `calendar.spec.ts` and runs the full stack; until then this is open. Run from the main checkout: `pnpm --filter @studypilot/web test:e2e`.

## Changed paths

- API: `prisma/schema.prisma`, `prisma/migrations/20261117200000_drop_availability_slots/migration.sql` (new), `src/generated/prisma/**` (regenerated), `src/app.module.ts`, `src/test/test-http.ts`, deleted `src/modules/availability/**` and `src/modules/schedule/schedule-migration.e2e.spec.ts`, new `src/modules/schedule/schedule-drop.e2e.spec.ts`, comment rewording in `ownership.ts`, `study-plans.controller.ts`, `schedule.module.ts`.
- Web: deleted `src/{pages,features,entities}/availability/**`; `src/entities/schedule-block/model/types.ts` (EnergyLevel home), `src/app/App.tsx` (+ new `App.test.tsx`), `src/widgets/header/ui/navGroups.ts` (+ `Header.test.tsx`), `src/pages/calendar/ui/CalendarPage.tsx` (+ test), comment rewording in `shared/types/academic.ts`, `entities/study-preferences/api/studyPreferencesApi.ts`; e2e `calendar.spec.ts`, `adaptive-scheduling.spec.ts`, `helpers.ts`.
- Docs: `README.md`, `docs/stories/EP15/contracts.md`; this record; story Status/rulings/sizing; EP15 README row + Next; `efficiency.md`.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP15I-01 | `apps/api` jest config; `study-plans-catch-up-e2e.spec.ts` | The gated suite is only correct single-worker (whole-table count snapshots race parallel workers on one database), but nothing enforces it — `npx jest` with `DATABASE_URL` set runs parallel and fails spuriously. | **Noted** for the planner: set `maxWorkers: 1` (or a per-worker database) when `DATABASE_URL` gates are active, or document `--runInBand` in the package script. | planner |

## Deviations

1. **EP15A's migration round-trip spec was deleted, not kept skipped**: it seeds the dropped model through the Prisma client, so after Migration 2 it cannot compile or run by design. Its gated pass is recorded in EP15A's implementation record; the copy statement stays readable between Migration 1's markers; the new drop spec states this in its header.
2. **Comments that cited the old API as a "precedent" now cite the decision IDs instead** (D404-11) — needed for the AC2 search to come back clean without rewriting history in `docs/`.
3. **The redirect test mocks the calendar's data reads** and asserts the `/availability` entry lands on the Calendar heading — the lightest faithful assertion of `<Navigate … replace />` without booting the whole data layer.
