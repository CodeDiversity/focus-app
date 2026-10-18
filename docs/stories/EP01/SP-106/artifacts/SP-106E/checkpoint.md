# SP-106E Checkpoint

**Story:** SP-106E — Profile Time-Zone Select (UX Improvement)
**Parent:** SP-106 (STUDY-11)
**Layer:** Frontend
**Status:** Implemented — awaiting combined parent review (commit `4def5c2`)
**Completed:** 2026-10-18

## Pre-implementation findings

1. **No `<Select>` UI component exists** — only `Input.tsx` and `Button.tsx` exist in `shared/ui/`. A new `Select.tsx` must be built following the Input's pattern (label, error, hint, disabled, aria-invalid, aria-describedby).
2. **`Intl.DateTimeFormat.supportedValuesOf('timeZone')`** is ES2022 — not available in Node < 16 or older browsers. A curated fallback list of ~100 common zones is needed, shipped as a constant in `datetime.ts`.
3. **Existing tests (355 lines)** assert on a text `<input>` via `screen.getByLabelText(/time zone/i)`. All 9 time-zone test cases in the first `describe` block (lines 117–247) need rewriting for a `<select>`.
4. **No backend change** — the API contract (`PATCH /users/me` accepting `timeZone: string`) is unchanged. The backend validator (SP-106B) remains as a safety net.
5. **`ProfilePage.tsx` lines 145–151** render a free-text `<Input>` for timeZone — this is replaced with `<Select>`.
6. **`datetime.ts`** exports `isValidTimeZone`, `getBrowserTimeZone`, `formatDate/Time/DateTime` — no `supportedValuesOf` polyfill exists yet.

## Implementation completed

- **Commit:** `4def5c2` (2026-10-18)
- **Files changed:** `datetime.ts` (add `getTimeZones()` + `sortTimeZoneList()`), `Select.tsx` (new), `ProfilePage.tsx` (replace Input → Select), `ProfilePage.test.tsx` (rewrite 14 test cases)
- **Tests:** 193/193 pass (19 test files)
- **Typecheck:** clean
- **Lint:** clean
- **Implementation record:** `./artifacts/SP-106E/implementation.md`

## AC verification

All 8 acceptance criteria verified (see implementation.md AC table).

## Remaining work

None — awaiting combined SP-106 parent review.
