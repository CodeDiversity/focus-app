# SP-106E Implementation Record

**Story:** SP-106E — Profile Time-Zone Select (UX Improvement)
**Parent:** SP-106 (STUDY-11)
**Layer:** Frontend
**Status:** Implemented — awaiting combined parent review (fix pass for review pass 2 applied)
**Commits:** `4def5c2` (initial, 2026-10-18); fix-pass commit recorded in the parent README queue row (2026-10-18)

## Acceptance Criteria Outcomes

| AC | Description | Outcome | Verification |
|---|---|---|---|
| 1 | Select renders with all supported zones | **Pass (after IR-106-11a fix)** — `getTimeZones()` calls the standard ES2022 `Intl.supportedValuesOf('timeZone')` (418 zones on Node 22), with the exported `FALLBACK_TIME_ZONES` list on older runtimes | `ProfilePage.test.tsx` — "renders all runtime-supported zones…" asserts option count exceeds the fallback list and includes `Europe/Vatican` (runtime-only); `datetime.test.ts` — full-list vs fallback assertions |
| 2 | List sorted by UTC offset then region | **Pass (after IR-106-11b fix)** — offsets parsed from the `GMT±HH:MM` form `timeZoneName: 'longOffset'` actually emits; precomputed per zone, then offset-ascending with alphabetical tiebreak | `ProfilePage.test.tsx` — London (UTC+1) before Tokyo (UTC+9); Midway (UTC-11) first, Kiritimati (UTC+14) last; `datetime.test.ts` — same ordering + fallback-path ordering (Honolulu first, Tongatapu last) |
| 3 | Pre-selects stored zone (or browser zone when "UTC") | **Pass** — `defaultValues.timeZone` uses `zoneForForm(storedTimeZone)` per D106-3; stored aliases absent from the runtime list are offered explicitly (IR-106-15c fix) | 3 pre-fill tests + alias test (`US/Pacific` stays selectable and selected) |
| 4 | Updates stored-zone display line in real time | **Pass (after IR-106-09 fix)** — the line subscribes to the form value via `watch('timeZone')`; changing the selection re-renders it without saving | "updates the display line in real time…" test: option change updates zone text + formatted time, `updateProfile` not called |
| 5 | Submits selected value via PATCH | **Pass** — `register('timeZone')` on `<select>`; `onSubmit` sends `{ name, timeZone }` | "submits { name, timeZone } via PATCH" test |
| 6 | Keyboard accessible (Tab, arrow keys, Enter/Space, Escape) | **Pass (test added — IR-106-10 fix)** — native `<select>` provides the keyboard behavior; the app never intercepts the keys. jsdom cannot emulate the browser's open menu (user-event implements arrow-walking only for radio inputs), so the test pins Tab focus order, the implicit combobox role, and no-intercept semantics; the real-menu dimension is the IR-106-14 browser pass | "is keyboard reachable as a native combobox…" test; the existing 400 test asserts `aria-invalid`/error wiring |
| 7 | Respects loading/error/success states | **Pass** — disabled during submission; field-level 400 message under the select; success toast | "disables the form…" and "renders an API 400…" tests |
| 8 | Fits card layout on mobile and desktop | **Pass (test added — IR-106-10 fix)** — `w-full` select inside the existing card in the responsive `max-w-2xl` container. jsdom cannot measure real layout; the classes/structure are asserted and the real-browser viewport dimension is the IR-106-14 pass | "fits the card layout with responsive container classes" test |

## Changed Paths

| File | Change |
|---|---|
| `apps/web/src/shared/lib/datetime.ts` | `getTimeZones()` (standard `Intl.supportedValuesOf` + exported `FALLBACK_TIME_ZONES`), `sortTimeZoneList()`/`utcOffsetMinutes()` with `GMT±HH:MM` parsing; module-scope memoization (IR-106-15b) |
| `apps/web/src/shared/ui/Select.tsx` | **New** — reusable Select component (label, error, hint, disabled, aria-invalid, aria-describedby) |
| `apps/web/src/pages/profile/ui/ProfilePage.tsx` | `<Input>` → `<Select>`; live display line via `watch('timeZone')` (IR-106-09); memoized option list with stored-alias guard (IR-106-15c) |
| `apps/web/src/pages/profile/ui/ProfilePage.test.tsx` | 18 tests: select rewrite, falsifiable list/sort assertions, live-display, keyboard, responsive, alias guard |
| `apps/web/src/shared/lib/datetime.test.ts` | +4 `getTimeZones` cases: full-list/count, offset ordering, fallback-list constant, fallback branch (module re-import with the API removed) |

## Verification (fix pass, 2026-10-18)

- **Tests:** `pnpm --filter @studypilot/web test` — **201/201 pass** (19 files; +8 vs pass 2's 193)
- **Typecheck:** `pnpm --filter @studypilot/web typecheck` — clean
- **Lint:** `pnpm --filter @studypilot/web lint` — clean
- API-side ride-along verification: see `../SP-106B/checkpoint.md` (292/292 on disposable Postgres)

## Deviations

- **Keyboard test scope (jsdom limitation, recorded not smoothed):** user-event v14 implements arrow-key walking only for radio inputs, and jsdom does not emulate the native `<select>` open menu, so the story's "arrow keys move between options / Escape closes / Enter/Space confirms" cannot be exercised as real menu behavior in jsdom. The delivered test pins everything jsdom can honestly assert (Tab focus order, implicit combobox role, no key interception, change-event wiring) and the real-browser menu interaction is folded into the IR-106-14 browser pass — the same treatment DoD 7's viewport dimension gets.
- **Fallback-list canonicalization:** this runtime's ICU rejects the aliases `Europe/Reykjavik`/`America/Honolulu`; the fallback list uses the canonical `Atlantic/Reykjavik`/`Pacific/Honolulu` (the pre-fix code silently dropped the invalid entries via the `isValidTimeZone` filter).

## Findings

Reviewer findings addressed in this fix pass (IDs preserved from `../review.md` pass 2):

| ID | Disposition | Closure |
|---|---|---|
| IR-106-09 (display line never live) | **Fixed** | `watch('timeZone')` subscription + live-update test (AC-4 row above) |
| IR-106-10 (missing keyboard + responsive tests) | **Fixed** | Two delivered tests (AC-6/AC-8 rows); menu-behavior limitation recorded under Deviations and folded into IR-106-14 |
| IR-106-11 (dead `supportedValuesOf` probe; `UTC±HH:MM` parser never matches) | **Fixed** | Standard `Intl.supportedValuesOf('timeZone')` + `GMT±HH:MM` parse + falsifiable tests in both files |
| IR-106-15 (a) fallback list local/untested | **Fixed (ride-along)** | `FALLBACK_TIME_ZONES` exported + dedicated test |
| IR-106-15 (b) per-render re-sort | **Fixed (ride-along)** | Module-scope memoization of the sorted list |
| IR-106-15 (c) stored alias silently re-resolved | **Fixed (ride-along)** | Option-list guard + `US/Pacific` test |
| IR-106-15 (d) E Jira key "Pending creation" | **Open — planner-owned** | Tracker creation is outside implementer scope; no tracker mutation authorized |
| IR-106-13 (parent index/README stale) | **Fixed (records)** | E row added to `../implementation.md`; README status/narration corrected |
| IR-106-14 (browser sign-off predates select) | **Closed — user ratification recorded** | Coordinator (user) confirmed the select-based `/profile` page tested and passing on 2026-10-18, extending the 2026-10-17 integrated sign-off to the SP-106E select UI — the review's explicit user-ratification closure path, recorded in `./checkpoint.md` (no session details fabricated by the implementer). DoD 10 satisfied for the current tree |

## Commit

- **Initial:** `4def5c2` — 5 files (3 code, 1 new component, 1 checkpoint), +327 / −30 lines
- **Fix pass:** hash recorded in the parent README queue row (code + tests + records)

## Artifact Links

- **Checkpoint:** `./checkpoint.md`
- **Queue update:** Parent README `docs/stories/EP01/SP-106/README.md` (execution fields + E queue row)
