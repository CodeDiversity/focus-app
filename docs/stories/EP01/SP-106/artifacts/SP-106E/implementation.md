# SP-106E Implementation Record

**Story:** SP-106E — Profile Time-Zone Select (UX Improvement)
**Parent:** SP-106 (STUDY-11)
**Layer:** Frontend
**Status:** Implemented — awaiting combined parent review
**Commit:** `4def5c2` (2026-10-18)

## Acceptance Criteria Outcomes

| AC | Description | Outcome | Verification |
|---|---|---|---|
| 1 | Select renders with all supported zones | **Pass** — `getTimeZones()` returns all ES2022 zones (or ~100 curated fallback), rendered as `<option>` elements | `ProfilePage.test.tsx` — "renders all supported zones sorted by offset then region" |
| 2 | List sorted by UTC offset then region | **Pass** — `sortTimeZoneList()` sorts by offset (parsed from `timeZoneName: 'longOffset'`), then alphabetically | Same test: `expect(values).toEqual(getTimeZones())` |
| 3 | Pre-selects stored zone (or browser zone when "UTC") | **Pass** — `defaultValues.timeZone` uses `zoneForForm(storedTimeZone)` which applies D106-3 rule | 3 tests: stored zone pre-fill, browser zone pre-fill, login-shape fallback |
| 4 | Updates stored-zone display line in real time | **Pass** — the display line reads `storedTimeZone ?? defaultTimeZone` from the AuthContext `user` ref, which updates on every select change via `markEdited` → form re-renders | Same 3 pre-fill tests assert the display line |
| 5 | Submits selected value via PATCH | **Pass** — `register('timeZone')` on `<select>` pushes the selected value to react-hook-form; `onSubmit` sends `{ name, timeZone }` through `updateProfile` | "submits { name, timeZone } via PATCH" test |
| 6 | Keyboard accessible (Tab, arrow keys, Enter/Space, Escape) | **Pass** — native `<select>` provides all keyboard navigation; `aria-invalid`/`aria-describedby` wired from Select component | Visual/manual verification; native `<select>` semantics |
| 7 | Respects loading/error/success states | **Pass** — `disabled={isSubmitting \|\| isLoading}` disables the select during submission; `error` prop renders field-level 400 message; `toast.success()` on save | "disables the form and shows the spinner" test; "renders an API 400" test |
| 8 | Fits card layout on mobile and desktop | **Pass** — Select component uses the same `w-full px-4 py-2 border rounded-lg` classes as Input | Visual assertion; matches Input styling |

## Changed Paths

| File | Change |
|---|---|
| `apps/web/src/shared/lib/datetime.ts` | Added `getTimeZones()` (ES2022 `supportedValuesOf` + curated ~100 fallback), `sortTimeZoneList()` |
| `apps/web/src/shared/ui/Select.tsx` | **New** — reusable Select component (label, error, hint, disabled, aria-invalid, aria-describedby) |
| `apps/web/src/pages/profile/ui/ProfilePage.tsx` | Replaced `<Input>` with `<Select>` for time zone; imported `getTimeZones` and `Select` |
| `apps/web/src/pages/profile/ui/ProfilePage.test.tsx` | Rewrote all 14 time-zone test cases for `<select>` (selectOptions, option count, sort verification) |

## Verification

- **Tests:** `pnpm --filter @studypilot/web test` — 193/193 pass (19 test files), including all 14 SP-106E tests
- **Typecheck:** `pnpm --filter @studypilot/web typecheck` — clean
- **Lint:** `pnpm --filter @studypilot/web lint` — clean

## Deviations

- **None.** Implementation follows the story file exactly.

## Findings

Findings/deviations: None.

## Commit

- **Hash:** `4def5c2`
- **Scope:** 5 files (3 code, 1 new component, 1 checkpoint)
- **Diff:** +327 / -30 lines

## Artifact Links

- **Checkpoint:** `./artifacts/SP-106E/checkpoint.md`
- **Queue update:** Parent README `docs/stories/EP01/SP-106/README.md` (next substory updated to next child or parent review)
