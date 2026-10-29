# EP10G implementation record

**Story:** [EP10G-dashboard-and-profile-adoption.md](../../EP10G-dashboard-and-profile-adoption.md)
**Implemented:** 2026-10-29 (single implementer pass; frontend only; dashboard and profile adoption + TR-E10-03 E2E verification)
**Baseline HEAD before changes:** `8d8e9b5` (EP10F)
**Parent:** EP10 breakdown; combined EP10 parent review after all seven children.

## Changed paths

Production:
- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` — tokenized heading/body text (`text-text`/`text-text-muted`), loading spinner (`border-accent` + `motion-reduce:animate-none`), card headings, empty-state text, stat tiles (`bg-surface-muted`, `text-accent`).
- `apps/web/src/pages/profile/ui/ProfilePage.tsx` — tokenized page heading (`text-text`), divider (`border-border`), section heading (`text-text`), helper text (`text-text-muted`).

Tests: none changed (all existing page tests pass unchanged). No DashboardPage.test.tsx exists; dashboard adoption verified by typecheck/lint/build + manual reasoning (no dashboard E2E spec exists per AC #6 caveat).

Docs:
- `docs/stories/EP10/artifacts/EP10G/checkpoint.md`
- `docs/stories/EP10/artifacts/EP10G/implementation.md` (this file)
- `docs/stories/EP10/EP10G-dashboard-and-profile-adoption.md` (Status → Implemented)
- `docs/stories/EP10/README.md` (queue row EP10G → Implemented)
- `docs/stories/EP10/artifacts/EP10/implementation.md` (parent index, including TR-E10-03 E2E verification — see below)

No backend/API changes. No dashboard/profile logic or data-flow changes. No new primitives.

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Dashboard and profile render with the refreshed system | **PASS.** Both surfaces now reference semantic tokens (`background`, `surface`, `surface-muted`, `text`, `text-muted`, `accent`, `border`, `focus-ring`) instead of ad-hoc `primary`/`secondary` palette. | Changed files; grep for raw palette returns none. |
| 2 Dashboard widgets and profile forms/settings behave exactly as before | **PASS.** No logic or data-flow changes; only class-name token swaps. 223 page tests green. | Test run. |
| 3 Loading/empty/error states visually consistent | **PASS.** Dashboard loading spinner uses `border-accent` + `motion-reduce:animate-none`; empty states use `text-text-muted`; profile helper text uses `text-text-muted`. | Component files. |
| 4 Keyboard operability, focus visibility, reduced motion preserved | **PASS.** No interactive element changes; primitives retain focus rings; reduced-motion guard on spinner. | Component files. |
| 5 Existing page tests pass; updated tests cover changed markup | **PASS.** 13 files / 223 tests green; no test edits needed. ProfilePage.test.tsx still asserts `.card` / `.max-w-2xl` containers (unchanged). | Test run. |
| 6 EP09 E2E suite passes against refreshed app (or failure recorded) | **PARTIAL — failure recorded.** Suite run (TR-E10-03): 15/24 tests fail with a strict-mode violation in `getByLabel('Password')`, which now resolves to both the password `<input>` and the EP10B Input primitive's "Show password" toggle button (aria-label "Show password"). Root cause is the EP10B Input primitive / E2E selector coupling, not EP10G's adoption (dashboard/profile are not E2E-covered). Recorded as finding F-G-2; not silently ignored. 1 test passed, 8 did not run. | E2E run output; finding F-G-2. |

## Verification

- `pnpm --filter web typecheck` — exit 0.
- `pnpm --filter web lint` — exit 0.
- `pnpm --filter web format` — all files use Prettier code style.
- `pnpm --filter web build` — exit 0 (1607 modules).
- `pnpm --filter web test -- src/pages` — 13 files / 223 tests, exit 0.
- `pnpm test:e2e` (TR-E10-03) — 15 failed, 1 passed, 8 did not run (see F-G-2). Database lifecycle completed (created + dropped `studypilot_e2e_test`).

## DoD mapping

1 Functional criteria — pass (AC #1–#5); AC #6 partial with recorded finding. 2 — n/a (no new input; validation unchanged). 3 — n/a (no data access changes). 4 — n/a (no API changes). 5 Loading/empty/error states — pass. 6 Keyboard a11y + focus — pass. 7 Responsive desktop + mobile — pass (class contracts preserved: `max-w-7xl`/`max-w-2xl`, `px-4`/`sm:px-6`/`lg:px-8`, `md:grid-cols-2`/`lg:grid-cols-3`, `min-h-screen`). 8 Automated tests — pass (unit); E2E partial with recorded finding. 9 — n/a. 10/11 — combined EP10 parent review.

## Findings and deviations

- F-G-1: Mechanical token swaps only; no functional or data-flow changes. (Non-blocking.)
- F-G-2: EP09 E2E suite fails 15/24 tests due to `getByLabel('Password')` strict-mode collision with the EP10B Input primitive's "Show password" toggle (aria-label "Show password"). Not caused by EP10G; dashboard/profile are not E2E-covered. Suggested follow-up (out of EP10G scope, flagged for parent review): harden E2E selectors to `getByRole('textbox', { name: 'Password' })` / exact label, or adjust the toggle's aria-label. (Blocks TR-E10-03 "passes".)
- F-G-3: No DashboardPage.test.tsx exists; dashboard adoption verified by typecheck/lint/build + manual reasoning (consistent with prior adoption stories; no dashboard E2E spec exists per AC #6 caveat). (Non-blocking.)
- Findings/deviations otherwise: None.

## Status

Implemented — awaiting parent review.