# EP12A — Consolidate IANA/time-zone date conversion

**Stable ID:** EP12A
**Title:** Consolidate IANA/time-zone date conversion
**Parent Epic:** [EP12: Tech Debt Cleanup](../../epics/EP12-tech-debt-cleanup.md)
**Parent Story:** [EP12](./README.md)
**Milestone:** M5
**Layer:** Backend
**Status:** Implemented — awaiting parent review (2026-10-31). Artifacts: [checkpoint](./artifacts/EP12A/checkpoint.md) · [implementation record](./artifacts/EP12A/implementation.md)
**Dependencies:** EP04/EP06 shipped (date utilities and their tests exist). No blocking dependency on other EP12 children.
**Jira:** Pending creation
**Refined:** 2026-10-31

## Summary and Bounded Scope

Consolidate the duplicated civil↔instant conversion between `calendar.service.ts` and
`study-plans.service.ts` so `apps/api/src/common/lib/civil-date.ts` is the **single seam** for
time-zone date arithmetic on the API side. Mechanical move of existing, verified code; no
behavior change, no API/migration change.

**In scope (verified duplication, all pure functions, no DB access):**
- `apps/api/src/modules/calendar/calendar.service.ts` private `isValidTimeZone` (`:38-45`),
  `zoneDateParts` (`:47-66`), `formatToday` (`:68-75`), `addDays` (`:77-81`),
  `dayOfWeekOf` (`:83-85`), `wallToInstant` (`:105-122`), `tzOffsetMs` (`:124-132`).
- `apps/api/src/modules/study-plans/study-plans.service.ts` private `addDays` (`:239-243`),
  `formatToday` (`:256-263`), `zoneParts` (`:265-280`), `tzOffsetMs` (`:282-288`),
  `wallToInstant` (`:290-301`), `dayOfWeekOf` (`:303-305`).
- Consolidation target `apps/api/src/common/lib/civil-date.ts` (exports `isValidTimeZone`,
  `resolveTimeZone`, `toCivilDate`) and its spec `civil-date.spec.ts`.

**Explicit out-of-scope list** (do not drift):
- The frontend copy `apps/web/src/shared/lib/datetime.ts` and `dashboardRange.ts` zone math
  (separate transport; a possible later story, never this one).
- `apps/api/src/modules/users/dto/validate-iana-time-zone.validator.ts` (`:22-27`) — its own
  near-identical try/catch mirror is a deliberate D106-4 decision; leave it.
- The domain module `apps/api/src/domain/study-planning/` — the scheduler keeps its own
  zone-free weekday computation (D06-17). The *comment* at `scheduler.ts:30` and
  `types.ts:76` that names the now-removed calendar private copies is the only touch there
  (comment-only).
- The e2e test-support copy of `addDays` in `apps/web/e2e/study-plan.spec.ts:17`.
- No API route, DTO, Prisma, migration, or domain-module code change.

## Source Requirement References

- Tech-debt item **TD-01** (see breakdown README): three backend copies of the
  `Intl.DateTimeFormat('en-CA', { timeZone })` instant→civil-date conversion.
- Supersedes the recorded EP06 scoping decision **D06-18** ("EP06 does not change this
  file"/calendar private copy) and resolves findings **F-B-1** (EP06B) / **F-C-1** (EP06C).
  Provenance: *user approval 2026-10-31* — consolidating the calendar's private copies into
  the shared seam is the point of a dedicated tech-debt epic. Do not re-fold this into
  EP04/EP06 work.

## Acceptance Criteria

- [ ] **AC-12A-1 (one seam for the forward conversion).** `apps/api/src/common/lib/civil-date.ts`
  exports **one** `zoneParts(instant: Date, timeZone: string): { date: string; time: string }` —
  the existing `en-CA` `formatToParts` arithmetic, the `hour === '24' → '00'` normalization,
  the internal `resolveTimeZone` fallback, never throwing (invalid zone → UTC), returning
  `time` as two-digit `HH:mm`. This replaces calendar's `zoneDateParts` and study-plans'
  `zoneParts`/`formatToday`; today becomes `toCivilDate(new Date(), timeZone)` in both
  services, and study-plans derives minutes from `zoneParts(...).time` via its existing
  `hhmmToMinutes`.
- [ ] **AC-12A-2 (one seam for the reverse conversion).** `civil-date.ts` exports
  `wallClockToInstant(dateStr: string, timeStr: string, timeZone: string): Date` — the
  existing 3-iteration correction algorithm with its `tzOffsetMs` helper kept **private**
  inside the module. Calendar's `rangeStartInstant`/`rangeEndInstant` become thin wrappers
  over it (`wallClockToInstant(from, '00:00', tz)` and
  `wallClockToInstant(addDays(to, 1), '00:00', tz)`). Study-plans' `save()` call sites
  (`:834-835`) call it directly with the same arguments.
- [ ] **AC-12A-3 (date-string helpers move to `calendar-date.ts`).** `addDays(dateStr, n)` and
  `dayOfWeekOf(dateStr)` move to `apps/api/src/common/lib/calendar-date.ts` (the module that
  already owns `parseCalendarDate`/`formatCalendarDate` — their natural home), preserving the
  "assumes a valid `YYYY-MM-DD`" contract.
- [ ] **AC-12A-4 (private copies deleted).** `calendar.service.ts` imports the shared helpers
  and deletes `isValidTimeZone`/`zoneDateParts`/`formatToday`/`addDays`/`dayOfWeekOf`/
  `wallToInstant`/`tzOffsetMs`; the zone resolution at `calendar.service.ts:186` becomes
  `resolveTimeZone(user?.timeZone)`. `study-plans.service.ts` imports the shared helpers and
  deletes `formatToday`/`zoneParts`/`tzOffsetMs`/`wallToInstant`/`addDays`/`dayOfWeekOf` — the
  `:448`/`:542`/`:854` `resolveTimeZone(user.timeZone)` pre-resolution call sites are
  unchanged.
- [ ] **AC-12A-5 (no behavior change).** Every existing calendar and study-plans unit +
  e2e test passes **without modification**, including the calendar's zone-conversion pin
  (`calendar.service.spec.ts:103`), its DST recurrence pin (`:80`), and study-plans's
  civil-date pin (`study-plans.service.spec.ts:448`). No new lint/format warnings; API
  `lint`/`typecheck`/`build`/`format --check` clean.
- [ ] **AC-12A-6 (new module-level regression guards).** The named new cases in § Tests are
  added and pass — the civil date for the two services' surfaces **agrees** for offset
  extremes, midnight renders as `00:00` (the hour-24 quirk never escapes), and
  `zoneParts(wallClockToInstant(...))` round-trips for a DST-free zone.

## Tests

Add to `apps/api/src/common/lib/civil-date.spec.ts` (imitate the existing hand-derived,
offset-quoted-in-a-comment style — **never** assert a quoted offset in the test name/body;
see Technical Notes):

| Case | Named description | Why |
|---|---|---|
| T-12A-1 | `describe('zoneParts')` — 'returns the civil date and wall time for a New York instant (`2026-10-28T23:30:00Z` → `2026-10-28`, `19:30` EDT)' and 'for a Tokyo instant (`2026-01-15T23:30:00Z` → `2026-01-16`, `08:30`)' | Mirrors the calendar's zone-conversion data with hand-derivable instants |
| T-12A-2 | 'handles the hour-24 quirk: a midnight instant renders as `00:00`, never `24:00`' | `2026-10-31T11:00:00.000Z` in `Pacific/Auckland` (NZDT, UTC+13 in NZ summer) → `{ date: '2026-11-01', time: '00:00' }` — also confirms two-digit `HH:mm` shape |
| T-12A-3 | 'never throws for an unreadable zone (falls back to UTC via resolveTimeZone)' | same shape as existing `toCivilDate` case (`:56-58`) |
| T-12A-4 | 'agrees with toCivilDate on the civil date for the same instant' | property over the T-12A-1/2 instants — the "plan and calendar never disagree about the day" invariant, now structural |
| T-12A-5 | `describe('wallClockToInstant')` — 'round-trips through zoneParts for a DST-free zone' (`Asia/Tokyo`: `('2026-01-15','08:30')` → `zoneParts` returns the same `{date, time}`; instant is `2026-01-14T23:30:00.000Z`, +9 derived by hand) | the reverse seam; also exercises the correction loop for a plain (non-DST) zone |
| T-12A-6 | 'DST spanning behavior is pinned by the upstream services (recurrence before/after a transition)' | NOT a new helper test — the calendar's existing `:80` DST test and the study-plans `save()` flow cover wall-clock behavior through the consolidated path; assert nothing new that would tautologically re-run the same Intl call |

New spec file `apps/api/src/common/lib/calendar-date.spec.ts` (new file, matching the module):

| Case | Named description |
|---|---|
| T-12A-7 | `addDays` — 'crosses a month boundary' (`2026-01-31` +1 → `2026-02-01`), 'crosses a year boundary' (`2026-12-31` +1 → `2027-01-01`), 'zero-length day count is a no-op' |
| T-12A-8 | `dayOfWeekOf` — 'Thursday=`4` for `2026-01-01`', 'Sunday=`0` for `2026-02-01`' (hand-derived; no offset quoting) |

Verification: `pnpm --filter @studypilot/api test` (the default suite ignores the
DB-bound recovery integration specs, which this change does not touch),
`pnpm --filter @studypilot/api lint`, `pnpm --filter @studypilot/api typecheck`,
`pnpm --filter @studypilot/api build`, `pnpm --filter @studypilot/api format -- --check`.

## Technical Notes

### Verified call sites

The change swaps the private functions for the shared imports; signatures match exactly, so
no call site changes its behavior.

- `calendar.service.ts`: `:186` zone resolution via `isValidTimeZone` (→ `resolveTimeZone`),
  `:188` `formatToday(timeZone)`, `:276` deadline bucketing,
  `:299/:306` session bucketing, `:225/:229` `addDays`/`dayOfWeekOf` in the date loop,
  `:201/:202` `rangeStartInstant`/`rangeEndInstant` (→ `wallClockToInstant` wrappers).
- `study-plans.service.ts`: `:448/:542/:854` `resolveTimeZone(user.timeZone)` (unchanged),
  `:509/:521/:580/:621` `toCivilDate` call sites (unchanged — already imported from the
  shared module), `:614/:615/:919/:920` session `{date, minutes}`
  call sites (→ derive minutes from `zoneParts(...).time`), `:834/:835` wallToInstant call
  sites (→ `wallClockToInstant(s.date, s.startTime, data.timeZone)`),
  `addDays` at `:548/:707/:710/:758/:891/:895/:933`, `dayOfWeekOf` at `:764`.
  `hhmmToMinutes` (`:245`) and
  `minutesToHHmm` (`:250`) stay local (minutes↔HH:mm is study-plans-local, not a
  civil↔instant concern).
- `civil-date.ts` header comment (`:10-16`) records the now-superseded "calendar keeps its
  own private copy / D06-18" note — **stale after this story**; update it
  in the same change to reference the shared seam. Same for `domain/study-planning/
  scheduler.ts:30` and `types.ts:76` (comment-only references to the removed private
  copies).

### Implementer constraints

- **No new files besides `calendar-date.spec.ts`.** All new exports live in the two existing
  `common/lib` modules; no new `common/lib/zone-*.ts` module.
- **Keep the correction loop verbatim.** `wallClockToInstant` is the existing algorithm —
  the `tzOffsetMs` `toLocaleString` construction, the 3-iteration loop, no re-derivation.
  Do not "simplify" to instant-of-day arithmetic or a DST library (no new dependency).
- **`resolveTimeZone` inside the shared helpers** (matches `toCivilDate` today) — then a
  service that already resolved once (`:448/:542/:854`) is unchanged (idempotent) and a
  caller that does not resolve still gets the documented UTC fallback for an unreadable
  zone. Same fallback must apply inside `wallClockToInstant`.
- **Offset-verification pitfall (EP05 lesson, PC-EP05-05):** tests must never assert a
  quoted zone/offset label as the expectation. Use hand-derivable instants with the offset
  proven in a code comment (as `civil-date.spec.ts:45` does). If any doubt about an offset,
  verify by command `Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })`
  and record the output in the implementation record — do not hand-quote.
- **Module privacy:** the private `tzOffsetMs` stays unexported. Neither service used it
  outside `wallToInstant`. Do not export it for convenience.
- **No new dependency** (no `date-fns`, no `luxon`, no `temporal-polyfill`) — the API
  side has none today and the story does not add one.
- **Reducing churn:** the whole segment is one mechanical change; land it as one focused
  refactor commit.

### Decisions

| ID | Question | Decision | Provenance |
|---|---|---|---|
| D12A-1 | Is the reverse direction (`wallToInstant`/`tzOffsetMs`) plus the duplicated `addDays`/`dayOfWeekOf` inside this story's scope? | **Include.** Making `civil-date.ts` the single seam for the whole civil↔instant conversion is the point of a tech-debt story; the same two files, same duplication class, pure functions. ~30 extra minutes over the forward-only version. | User answer 2026-10-31 (option "Include reverse converters"). |
| D12A-2 | Extend `civil-date.ts` vs. a sibling `time-zone-date.ts`? | **Extend `civil-date.ts`;** move `addDays`/`dayOfWeekOf` to `calendar-date.ts` (they are date-string arithmetic, the module that already owns `parseCalendarDate`/`formatCalendarDate`). One module owns the instant↔civil-date seam, one owns `YYYY-MM-DD`-string arithmetic; both keep the small-spec-file pattern. | Refiner 2026-10-31, grounded in the existing `common/lib` layout. |
| D12A-3 | Which return shape for the consolidated zone conversion? | `{ date, time }` (the calendar's shape). Study-plans derives minutes via its existing `hhmmToMinutes`. | Refiner 2026-10-31 — `{date, time}` is the wire-friendlier shape and matches the calendar's existing typing. |
| D12A-4 | Do the shared helpers resolve the zone internally, or require callers to pre-resolve? | **Internal `resolveTimeZone`** (identical to `toCivilDate` today): never throws, invalid → `UTC`, and idempotent for callers that already resolved. | Refiner 2026-10-31 — preserves both call sites' current behavior. |
| D12A-5 | Does the users DTO validator's near-identical `Intl` try/catch fold into the shared helper too? | **No** — D106-4 mirroring is deliberate and that validator additionally guards `typeof value !== 'string'`. Leave it; do not couple a validator to a civil-date module. | Refiner 2026-10-31; D106-4 recorded in `SP-106B`. |

## Definition of Done

Shared DoD items 1, 3, 8, 10 apply. No behavior/API/migration changes. Item 3 (ownership
scoping) is unaffected — no data access changes — but the implementer must not introduce
any. Items 2, 4, 5, 6, 7, 9 are not applicable (no input, no API/UI surface, no migration).

## Tracker reference

Jira key: Pending creation.

## Sizing Block

| Field | Value |
|---|---|
| **Outcome** | One seam for the whole civil↔instant conversion (both directions + the `isValidTimeZone`/`addDays`/`dayOfWeekOf` helpers); private copies deleted from both services; new regression guards at the module level; existing tests green. |
| **Request/token estimate** | ~1–2 requests. Mechanical imports + deletions; the only judgment is preserving the correction loop verbatim and the internal resolve. |
| **Model recommendation** | 3 (was 2 pre-refinement) — two service files + two shared modules + the correction-loop/"no-re-derivation" constraint; no novel algorithm, but a wrong re-implementation would be a subtle bug. |
| **Production files** | `apps/api/src/common/lib/civil-date.ts` (add `zoneParts`, `wallClockToInstant`, private `tzOffsetMs`), `apps/api/src/common/lib/calendar-date.ts` (add `addDays`, `dayOfWeekOf`, update header comment), `apps/api/src/modules/calendar/calendar.service.ts` (delete 7 privates, swap imports, `:186` one-line change, thin wrappers), `apps/api/src/modules/study-plans/study-plans.service.ts` (delete 6 privates, swap imports, 4 `{date, minutes}` call sites derive from `{date, time}`) |
| **Test files** | `apps/api/src/common/lib/civil-date.spec.ts` (extend, T-12A-1…T-12A-6), `apps/api/src/common/lib/calendar-date.spec.ts` (new, T-12A-7/T-12A-8) |
| **Minimal start context** | `civil-date.ts` + its spec, `calendar-date.ts`, the two service files (the § In-scope line ranges), `calendar.service.spec.ts:80/:103`, `study-plans.service.spec.ts:448` |
| **Verification commands** | `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/api lint`, `pnpm --filter @studypilot/api typecheck`, `pnpm --filter @studypilot/api build`, `pnpm --filter @studypilot/api format -- --check` |
| **Dependencies** | EP04/EP06 shipped; D12A-1 settled by user answer 2026-10-31 |
| **Exclusions** | frontend copy, users DTO validator, domain module, e2e test-support copy, any API/migration change; no new dependency |
