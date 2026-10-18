# SP-106E Checkpoint

**Story:** SP-106E — Profile Time-Zone Select (UX Improvement)
**Parent:** SP-106 (STUDY-11)
**Layer:** Frontend
**Status:** In progress — implementation started 2026-10-18

## Pre-implementation findings

1. **No `<Select>` UI component exists** — only `Input.tsx` and `Button.tsx` exist in `shared/ui/`. A new `Select.tsx` must be built following the Input's pattern (label, error, hint, disabled, aria-invalid, aria-describedby).
2. **`Intl.DateTimeFormat.supportedValuesOf('timeZone')`** is ES2022 — not available in Node < 16 or older browsers. A curated fallback list of ~100 common zones is needed, shipped as a constant in `datetime.ts`.
3. **Existing tests (355 lines)** assert on a text `<input>` via `screen.getByLabelText(/time zone/i)`. All 9 time-zone test cases in the first `describe` block (lines 117–247) need rewriting for a `<select>`.
4. **No backend change** — the API contract (`PATCH /users/me` accepting `timeZone: string`) is unchanged. The backend validator (SP-106B) remains as a safety net.
5. **`ProfilePage.tsx` lines 145–151** render a free-text `<Input>` for timeZone — this is replaced with `<Select>`.
6. **`datetime.ts`** exports `isValidTimeZone`, `getBrowserTimeZone`, `formatDate/Time/DateTime` — no `supportedValuesOf` polyfill exists yet.

## Implementation plan

1. Add `getTimeZones()` to `shared/lib/datetime.ts` — uses `Intl.DateTimeFormat.supportedValuesOf('timeZone')` when available, falls back to a curated list of ~100 common IANA zones. Exports the list and a `sortTimeZoneList()` helper.
2. Create `shared/ui/Select.tsx` — follows `Input.tsx` pattern (label, error, hint, disabled, aria-invalid, aria-describedby, id/useId).
3. Replace `<Input>` with `<Select>` in `ProfilePage.tsx` (lines 145–151).
4. Rewrite time-zone test cases in `ProfilePage.test.tsx` — change `getByLabelText(/time zone/i)` to `getByRole('combobox')` or `getByLabelText(/time zone/i)` pointing to `<select>`.

## Commit plan

- Commit 1: `datetime.ts` add `getTimeZones()` + curated fallback list
- Commit 2: `Select.tsx` new component
- Commit 3: `ProfilePage.tsx` replace Input → Select + update tests
- Commit 4: `ProfilePage.test.tsx` rewrite time-zone cases
