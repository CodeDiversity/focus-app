# SP-106E Checkpoint

**Story:** SP-106E — Profile Time-Zone Select (UX Improvement)
**Parent:** SP-106 (STUDY-11)
**Layer:** Frontend
**Status:** Implemented — awaiting combined parent review (initial `4def5c2`; review pass-2 findings fixed 2026-10-18, see fix-pass section)
**Completed:** 2026-10-18 (initial implementation; fix pass verified 2026-10-18)

## Pre-implementation findings

1. **No `<Select>` UI component exists** — only `Input.tsx` and `Button.tsx` exist in `shared/ui/`. A new `Select.tsx` must be built following the Input's pattern (label, error, hint, disabled, aria-invalid, aria-describedby).
2. **`Intl.DateTimeFormat.supportedValuesOf('timeZone')`** is ES2022 — not available in Node < 16 or older browsers. A curated fallback list of ~100 common zones is needed, shipped as a constant in `datetime.ts`.
   *Superseded by review finding IR-106-11(a): the standard API is `Intl.supportedValuesOf('timeZone')` (on `Intl`, not `Intl.DateTimeFormat`); the original probe was dead on every runtime. See the fix-pass findings below.*
3. **Existing tests (355 lines)** assert on a text `<input>` via `screen.getByLabelText(/time zone/i)`. All 9 time-zone test cases in the first `describe` block (lines 117–247) need rewriting for a `<select>`.
4. **No backend change** — the API contract (`PATCH /users/me` accepting `timeZone: string`) is unchanged. The backend validator (SP-106B) remains as a safety net.
5. **`ProfilePage.tsx` lines 145–151** render a free-text `<Input>` for timeZone — this is replaced with `<Select>`.
6. **`datetime.ts`** exports `isValidTimeZone`, `getBrowserTimeZone`, `formatDate/Time/DateTime` — no `supportedValuesOf` polyfill exists yet.

## Implementation completed (initial)

- **Commit:** `4def5c2` (2026-10-18)
- **Files changed:** `datetime.ts` (add `getTimeZones()` + `sortTimeZoneList()`), `Select.tsx` (new), `ProfilePage.tsx` (replace Input → Select), `ProfilePage.test.tsx` (rewrite 14 test cases)
- **Tests:** 193/193 pass (19 test files)
- **Typecheck:** clean
- **Lint:** clean
- **Implementation record:** `./implementation.md`

## Review pass 2 findings (2026-10-18, `Changes Required` — `../../SP-106/review.md`)

Fix pass in progress. Reviewer finding IDs preserved per the implementer skill.

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| IR-106-09 | AC-106E-4, story Tests bullet 4 | `apps/web/src/pages/profile/ui/ProfilePage.tsx` | Display line read the stored AuthContext value only (`storedTimeZone ?? defaultTimeZone`); select changes never updated it without a save | fixed (this pass) | implementer | See `./implementation.md` — `watch('timeZone')` subscription + live-update test |
| IR-106-10 | Story Tests bullets 7, 9; DoD 6/7 | `apps/web/src/pages/profile/ui/ProfilePage.test.tsx` | Two story-listed tests missing: keyboard navigation, responsive layout | fixed (this pass) | implementer | See `./implementation.md` — keyboard (Tab/combobox-role/no-intercept) + responsive (card/container classes) tests |
| IR-106-11 | AC-106E-1, AC-106E-2, story Tests bullet 1 | `apps/web/src/shared/lib/datetime.ts` | (a) probe tested `Intl.DateTimeFormat.supportedValuesOf` — not a standard API; dead on every runtime; (b) offset parser matched `UTC±HH:MM` but `longOffset` emits `GMT±HH:MM` → all offsets 0 → alphabetical sort | fixed (this pass) | implementer | See `./implementation.md` — `Intl.supportedValuesOf('timeZone')` + `GMT±HH:MM` parse + falsifiable sort/count tests |
| IR-106-15 (a–c) | Story technical note; polish | `apps/web/src/shared/lib/datetime.ts`, `ProfilePage.tsx` | Fallback list local + untested; `getTimeZones()` re-sorted ~418 zones per render; stored alias absent from list silently re-resolved | fixed (this pass, ride-along) | implementer | `FALLBACK_TIME_ZONES` exported + unit-tested; module-scope memoization; option-list guard for stored aliases |
| IR-106-15 (d) | Child-inventory Jira key | `README.md:71` | E's Jira key still "Pending creation" | open — planner-owned | planner | Not implementer scope (tracker creation); no tracker mutation authorized |
| IR-106-13 | Parent records | `artifacts/SP-106/implementation.md`, `README.md` status/narration | Parent index omitted E; "all four children" sentences stale | fixed (this pass, records) | implementer | E row added to parent index; README status block + queue narration updated (records commit) |
| IR-106-14 | DoD 10 | SP-106D/E evidence | Recorded 2026-10-17 browser sign-off predates the select UI | blocked — human gate | human/coordinator | Cannot be fabricated by the implementer: one recorded browser pass on `/profile` with the select (or recorded user ratification extending the sign-off). Handed to the coordinator at closeout. |
| IR-106-02 | D106-5 bytes (polish, pass 1) | `apps/api/src/modules/users/dto/validate-bounded-size.validator.ts` | Cap measured in UTF-16 units, not bytes | fixed (this pass, ride-along) | implementer | `Buffer.byteLength(serialized, 'utf8')` + multi-byte DTO test |
| IR-106-03 | D106-6 nested DTOs (polish, pass 1) | `apps/api/src/common/pipes/validation.pipe.ts` | Custom `message` collection skipped nested-DTO subtrees | fixed (this pass, ride-along) | implementer | Reuses stock `flattenValidationErrors` + new `validation.pipe.spec.ts` |
| IR-106-06 | Validation symmetry (polish, pass 1) | `apps/api/src/modules/users/dto/update-user.dto.ts` | PATCH accepted an empty display name | fixed (this pass, ride-along) | implementer | `@IsNotEmpty()` on `name` + DTO test |
| IR-106-08 | SP-107 capture-point note (pass 1) | — | Stored zone stays `UTC` until first Profile save; SP-107 obligation | open — planner/SP-107 | planner | Out of implementer scope; noted for SP-107 planning |

## Remaining work

- **IR-106-14 (open — human gate, not implementer-fabricable):** one recorded
  browser pass on `/profile` with the shipped select (open the list, choose a
  zone, watch the display line update — the AC-106E-4 fix —, keyboard
  interaction, Save, reload), or a recorded user ratification extending the
  2026-10-17 sign-off. Handed to the coordinator at closeout.
- **IR-106-15(d) (open — planner-owned):** E's child-inventory Jira key is
  still "Pending creation"; tracker creation is outside implementer scope.
- **IR-106-08 (open — planner/SP-107):** the stored zone stays `UTC` until the
  first Profile save; SP-107 remains the intended capture point.
- Combined parent re-review at SP-106 scope (new finding IDs continue at
  IR-106-16).

## Fix-pass verification (2026-10-18, verified)

- `pnpm --filter @studypilot/web test` — **201/201 pass** (19 files; +8 tests
  vs pass 2's 193)
- `pnpm --filter @studypilot/web typecheck` — clean
- `pnpm --filter @studypilot/web lint` — clean
- API ride-along (IR-106-02/03/06): **26 suites / 292/292** on disposable
  Postgres `studypilot_sp106_fix` (created → migrated → dropped), API
  typecheck + eslint clean — see `../SP-106B/checkpoint.md` fix-pass section
- Implementation record (AC table corrected, findings dispositions):
  `./implementation.md`
