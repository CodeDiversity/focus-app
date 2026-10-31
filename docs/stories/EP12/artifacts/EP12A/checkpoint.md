# EP12A checkpoint
Updated: 2026-10-31 09:55 EDT
Execution state: [EP12 queue](../../README.md) — EP12A row, Implemented — awaiting parent review
Story: [EP12A](../../EP12A-consolidate-timezone-date-conversion.md)
Review unit: EP12 parent review after EP12B and EP12C — not this child's gate
Role / scope: implementer; backend only. One seam for civil↔instant conversion in `civil-date.ts` / `calendar-date.ts`. Excludes frontend copies, the users DTO validator, the domain scheduler (comment-only), the e2e `addDays` helper, and any API/migration change.

## Repository state
- Workspace / branch: `/Users/michaelrobert/Desktop/focus-app` / `main`
- HEAD at last update: `d3fb887` (docs(EP12): add Tech Debt Cleanup epic)
- Saved work: pending closeout commit (code + tests + status + artifacts)
- Other work to preserve: untracked `docs/stories/EP08/plan-review.md` — do not stage

## Progress
- [x] AC-12A-1 — `zoneParts` seam; both services import it
- [x] AC-12A-2 — `wallClockToInstant` seam; `tzOffsetMs` private
- [x] AC-12A-3 — `addDays` / `dayOfWeekOf` in `calendar-date.ts`
- [x] AC-12A-4 — private copies deleted from both services
- [x] AC-12A-5 — existing suite green, no test modified
- [x] AC-12A-6 — new module guards added (T-12A-6 by design via unmodified calendar spec)
- Current step: none — implementation complete

## Decisions and dependencies
- D12A-1…D12A-5 stand. Correction loop kept verbatim; `resolveTimeZone` internal and idempotent.

## Verification
- `pnpm --filter @studypilot/api test` — 40 suites, 883 passed, 436 skipped (2026-10-31).
- `pnpm --filter @studypilot/api lint` — clean.
- `pnpm --filter @studypilot/api typecheck` — clean (after removing local duplicate files under gitignored `dist-test`).
- `pnpm --filter @studypilot/api build` — success.
- `pnpm --filter @studypilot/api format -- --check` — clean.
- Intl offset output recorded in `implementation.md`.

## Resume next
- No further work for EP12A. Combined EP12 parent review after EP12B/EP12C.
- Read next: [implementation.md](./implementation.md)