# EP10 implementation index

**Parent:** [EP10 breakdown](../README.md) — UI Design System & Visual Refresh
**Written by:** EP10G (final child; owns the TR-E10-03 E2E verification record).
**Status:** All seven children implemented — awaiting combined parent review.
**Baseline HEAD before first included change:** `d3cfeaf` (plan re-review dispatch; first EP10 commit is `322c417`).
**Head at EP10G closeout:** pending commit (EP10G changes staged).

## Child implementation records

| Child | Implementation record | Commit | Scope summary |
|---|---|---|---|
| EP10A | `./../EP10A/implementation.md` | `322c417` | Design tokens & theme foundation (frontend). |
| EP10B | `./../EP10B/implementation.md` | `9a88d9c` | Shared UI primitives refresh (Button, Input, Select, Card, Dialog, Badge, EmptyState). |
| EP10C | `./../EP10C/implementation.md` | `410c343` | App shell refresh (header, layout, navigation, mobile drawer). |
| EP10D | `./../EP10D/implementation.md` | `91f1e53` | Public/auth pages adoption (home, login, register, forgot/reset password, verify-email, onboarding). |
| EP10E | `./../EP10E/implementation.md` | `f4afe6e` | Academic data pages adoption (semesters, courses, assignments, course detail). |
| EP10F | `./../EP10F/implementation.md` | `8d8e9b5` | Calendar & availability pages adoption. |
| EP10G | `./../EP10G/implementation.md` | pending | Dashboard & profile adoption + TR-E10-03 E2E verification. |

(Paths are relative to this file's directory: `docs/stories/EP10/artifacts/EP10/`.)

## TR-E10-03 — EP09 E2E verification (final)

**Owner:** EP10G.
**Command:** `pnpm test:e2e` (Playwright, self-contained stack: throwaway `studypilot_e2e_test` database created + migrated in global setup, dropped in teardown; API on :4100, Vite on :3100).
**Run date:** 2026-10-29.
**Result:** 15 failed, 1 passed, 8 did not run (24 total).

**Failure detail (single root cause):** every failing test calls `page.getByLabel('Password')` in `e2e/helpers.ts` (loginViaUi) and the auth specs. After the EP10B Input primitive refresh, the password `<Input>` renders a "Show password" toggle `<button aria-label="Show password">`. Playwright's `getByLabel('Password')` matches both the password `<input>` (labelled "Password") and that button (aria-label "Show password"), producing a strict-mode violation. The failure is therefore an E2E-selector / primitive-coupling issue originating in EP10B, **not** a regression introduced by EP10G's dashboard/profile adoption (those surfaces are not E2E-covered; the suite has no dashboard/profile spec per the AC #6 caveat).

**Scope caveat (PR-003):** the existing EP09 E2E suite (`auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`, `login`) covers auth/assignments/calendar/semesters-courses only. Dashboard/profile adoption is verified by unit tests + manual pass, not E2E. No E2E spec was added here (per AC #6, E2E expansion is an EP09-scope decision requiring approval).

**Disposition:** recorded as finding F-G-2 (EP10G) for the combined parent review. Suggested follow-up (out of EP10G scope): harden E2E selectors to `getByRole('textbox', { name: 'Password' })` or an exact label, or adjust the toggle's aria-label. TR-E10-03 "passes" is **not** met until that is resolved; recorded honestly rather than silenced.

## Verification summary (EP10G)

- `pnpm --filter web typecheck` — exit 0.
- `pnpm --filter web lint` — exit 0.
- `pnpm --filter web format` — all files use Prettier code style.
- `pnpm --filter web build` — exit 0 (1607 modules).
- `pnpm --filter web test -- src/pages` — 13 files / 223 tests, exit 0.
- `pnpm test:e2e` (TR-E10-03) — 15 failed / 1 passed / 8 did not run (see above).

## Findings (cross-child)

- F-G-2 (EP10G): EP09 E2E suite fails due to password-toggle aria-label collision (EP10B Input primitive). Blocks TR-E10-03 "passes"; flagged for parent review.
- All other child findings are non-blocking mechanical-adoption notes (F-D-1, F-E, F-F-1/2, F-G-1/3). See each child's implementation record.

## DoD (EP10 epic)

Items 10 (integrated review) and 11 (reviewer walkthrough) belong to the combined EP10 parent review (`./review.md` + `./walkthrough.md`), not yet created. Items 2/3/4/9 are Not applicable (no input/data/API/migration changes). Items 5/6/7/8 verified per child records. Item 1 (functional criteria) verified per child.