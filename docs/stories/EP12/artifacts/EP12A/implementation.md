# EP12A implementation record

**Status:** implementation complete — awaiting parent review (2026-10-31). This child's own review is not a gate: the **combined EP12 parent review** (after EP12B/EP12C) is.
**Story:** [EP12A — Consolidate IANA/time-zone date conversion](../../EP12A-consolidate-timezone-date-conversion.md)
**Parent:** [EP12 — Tech Debt Cleanup](../../README.md)
**Review unit:** EP12 combined parent review — `../EP12/review.md` + `../EP12/walkthrough.md` (after EP12B/EP12C). EP12A is one of the three children of that unit.
**Checkpoint:** [checkpoint.md](./checkpoint.md)
**Commit:** (this closeout commit; hash returned in the handoff)

## What was built

One seam for the whole civil↔instant conversion on the API side, plus the
`YYYY-MM-DD` string arithmetic, with the six private copies deleted from the
two services.

| Piece | Where | What it owns |
|---|---|---|
| `zoneParts(instant, timeZone)` and `wallClockToInstant(dateStr, timeStr, timeZone)` | `apps/api/src/common/lib/civil-date.ts` | the `en-CA` `formatToParts` arithmetic (hour-24 normalized to `00`, two-digit `HH:mm`), internal `resolveTimeZone` (never throws, invalid → UTC), and the 3-iteration correction loop with its private `tzOffsetMs`. `toCivilDate` now delegates to `zoneParts(...).date`. |
| `addDays(dateStr, n)` and `dayOfWeekOf(dateStr)` | `apps/api/src/common/lib/calendar-date.ts` | the `YYYY-MM-DD` string arithmetic, next to `parseCalendarDate` / `formatCalendarDate`. |
| Calendar service | `apps/api/src/modules/calendar/calendar.service.ts` | deletes `isValidTimeZone` / `zoneDateParts` / `formatToday` / `addDays` / `dayOfWeekOf` / `wallToInstant` / `tzOffsetMs`; `:186` uses `resolveTimeZone(user?.timeZone)`; `rangeStartInstant` / `rangeEndInstant` become thin wrappers (`wallClockToInstant(from, '00:00', tz)` and `wallClockToInstant(addDays(to, 1), '00:00', tz)`). |
| Study-plans service | `apps/api/src/modules/study-plans/study-plans.service.ts` | deletes `formatToday` / `zoneParts` / `tzOffsetMs` / `wallToInstant` / `addDays` / `dayOfWeekOf`; `:509/:521/:580/:621` still use `toCivilDate`; `:614/:615/:919/:920` derive minutes via `hhmmToMinutes(zoneParts(...).time)`; `:834/:835` call `wallClockToInstant` directly; `:545/:893` use `toCivilDate(new Date(), timeZone)`. |
| Comments | `domain/study-planning/scheduler.ts:30`, `domain/study-planning/types.ts:76`, `common/lib/civil-date.ts` header | point at the shared seam instead of the removed private copies. |

## Acceptance criteria — outcome

| AC | Outcome | Evidence |
|---|---|---|
| **AC-12A-1** — one `zoneParts` seam (forward) | **Met.** Single export in `civil-date.ts`; both services import it; `toCivilDate` delegates to it so the civil date cannot diverge from the wall time. | `civil-date.ts`; `calendar.service.ts` (deadline/session bucketing `zoneParts`); `study-plans.service.ts` (`:614/:615/:919/:920`). |
| **AC-12A-2** — one `wallClockToInstant` seam (reverse), `tzOffsetMs` private | **Met.** Exported; calendar wrappers and study-plans `:834/:835` call it; `tzOffsetMs` is module-private. | `civil-date.ts:tzOffsetMs` (not exported); grep shows no other caller. |
| **AC-12A-3** — `addDays` / `dayOfWeekOf` in `calendar-date.ts` | **Met.** Exports moved; both services import from `calendar-date`. | `calendar-date.ts`; service imports. |
| **AC-12A-4** — private copies deleted | **Met.** Grep for the private function declarations in both services returns none. | `grep -R "function (isValidTimeZone\|zoneDateParts\|zoneParts\|formatToday\|wallToInstant\|tzOffsetMs)"` → none in the two services. |
| **AC-12A-5** — no behavior change | **Met.** All existing calendar + study-plans unit tests pass without modification, including the calendar zone-conversion pin (`calendar.service.spec.ts:103`), the DST recurrence pin (`:80`) and the study-plans civil-date pin (`study-plans.service.spec.ts:448`). | verification below. |
| **AC-12A-6** — new module-level guards | **Met.** T-12A-1…T-12A-5 in `civil-date.spec.ts`; T-12A-7/T-12A-8 in `calendar-date.spec.ts`. T-12A-6 (DST spanning) is intentionally **not** a new helper test — it is pinned by the unmodified `calendar.service.spec.ts:80` recurrence case through the consolidated path. | new spec cases; test run. |

## Tests added

- `apps/api/src/common/lib/civil-date.spec.ts` — `zoneParts` (New York `2026-10-28T23:30:00Z` → `{date:'2026-10-28', time:'19:30'}`; Tokyo `2026-01-15T23:30:00Z` → `{date:'2026-01-16', time:'08:30'}`; Auckland midnight `2026-10-31T11:00:00.000Z` → `{date:'2026-11-01', time:'00:00'}`; unreadable zone falls back to UTC; agreement with `toCivilDate`), and `wallClockToInstant` round-trip through `zoneParts` for `Asia/Tokyo` (`2026-01-15 08:30` → `2026-01-14T23:30:00.000Z`).
- `apps/api/src/common/lib/calendar-date.spec.ts` (new file) — `addDays` (month boundary, year boundary, zero count) and `dayOfWeekOf` (`2026-01-01` → 4, `2026-02-01` → 0).

## Verification

- `pnpm --filter @studypilot/api test` (cwd `apps/api`) — **40 suites, 883 passed, 436 skipped** (2026-10-31). All date-related suites green; no existing test modified.
- `pnpm --filter @studypilot/api lint` — clean (`--max-warnings 0`).
- `pnpm --filter @studypilot/api typecheck` — clean.
- `pnpm --filter @studypilot/api build` — success.
- `pnpm --filter @studypilot/api format -- --check` — clean.

Intl offset verification (recorded, not quoted as a test expectation):
- `2026-10-28T23:30:00Z` in `America/New_York` → date `2026-10-28`, hour `19`, minute `30` (longOffset `GMT-04:00`).
- `2026-01-15T23:30:00Z` in `Asia/Tokyo` → date `2026-01-16`, hour `08`, minute `30` (longOffset `GMT+09:00`).
- `2026-10-31T11:00:00.000Z` in `Pacific/Auckland` → date `2026-11-01`, hour `00`, minute `00` (longOffset `GMT+13:00`). On this Node the engine already returns `00`; the helper still normalizes `24` → `00` so the quirk cannot escape.
- `2026-01-15 08:30` in `Asia/Tokyo` → `2026-01-14T23:30:00.000Z`, round-trips through `zoneParts`.

## Changed paths

- `apps/api/src/common/lib/civil-date.ts` (added `zoneParts`, `wallClockToInstant`, private `tzOffsetMs`; `toCivilDate` delegates to `zoneParts`)
- `apps/api/src/common/lib/calendar-date.ts` (added `addDays`, `dayOfWeekOf`)
- `apps/api/src/common/lib/civil-date.spec.ts` (extended, T-12A-1…T-12A-5)
- `apps/api/src/common/lib/calendar-date.spec.ts` (new, T-12A-7/T-12A-8)
- `apps/api/src/modules/calendar/calendar.service.ts`
- `apps/api/src/modules/study-plans/study-plans.service.ts`
- `apps/api/src/domain/study-planning/scheduler.ts` (comment only)
- `apps/api/src/domain/study-planning/types.ts` (comment only)
- `docs/stories/EP12/EP12A-consolidate-timezone-date-conversion.md` (status)
- `docs/stories/EP12/README.md` (queue row, active/next)
- `docs/stories/EP12/artifacts/EP12A/checkpoint.md`, `implementation.md`

## Deviations / findings

| ID | Item | Disposition |
|---|---|---|
| F-12A-1 | Pre-existing local environment: macOS duplicate `* 2.*` files under the gitignored `apps/api/dist-test` made `tsc` fail with TS6059. Removed those local artifacts; no repository change. | fixed (environment) |
| F-12A-2 | `toCivilDate` now delegates to `zoneParts(...).date` rather than keeping a separate `formatToParts` block, so the civil date is structurally the wall time's date. All existing `toCivilDate` tests pass unchanged. | fixed |
| F-12A-3 | Saved-plan display sites emit `start.time` / `end.time` directly instead of `minutesToHHmm(hhmmToMinutes(...))`. `zoneParts` already returns two-digit `HH:mm`, so this is equivalent and avoids the round trip; the busy-interval sites still derive minutes via `hhmmToMinutes`. | fixed |
| F-12A-4 | Test names omit offset abbreviations (e.g. `EDT`, `UTC+13`) and record the Intl output above, per the offset-verification pitfall (EP05 PC-EP05-05). | fixed |
| F-12A-5 | T-12A-6 is not a new helper test; DST spanning remains pinned by the unmodified `calendar.service.spec.ts:80` recurrence case through the consolidated path. | closed (by design) |

## Findings/deviations: resolved (see table above); none remain open.