# EP10G checkpoint

Updated: 2026-10-29
Execution state: EP10 README queue row EP10G — Ready → In progress → Implemented
Story: [EP10G-dashboard-and-profile-adoption.md](../../EP10G-dashboard-and-profile-adoption.md)
Review unit: EP10 combined parent review (after all children)
Role / scope: implementer; frontend only; dashboard and profile adoption + TR-E10-03 E2E verification.

## Repository state
- Workspace / branch: `main`
- Baseline HEAD before changes: `8d8e9b5` (EP10F)
- Other work to preserve: pre-existing uncommitted doc/skill edits — preserved; only owned paths staged.

## Progress
- [x] Read story, parent README, epic, prior adoption records, dashboard/profile pages, tests.
- [x] Adopt semantic tokens across DashboardPage (headings, body, spinner, cards, stat tiles).
- [x] Adopt semantic tokens across ProfilePage (heading, divider, section heading, helper text).
- [x] Run typecheck/lint/format/tests/build (223 page tests pass).
- [x] Run EP09 E2E suite (TR-E10-03): 15 failures recorded as finding F-G-2 (password-toggle aria-label collision; not caused by EP10G changes).
- [x] Update status + queue + implementation record + parent index.

## Findings
- F-G-1: Mechanical token swaps only; no functional, data-flow, or API changes. (Non-blocking.)
- F-G-2: EP09 E2E suite fails 15/24 tests with a strict-mode violation: `getByLabel('Password')` now resolves to both the password `<input>` and the Input primitive's "Show password" toggle button (aria-label "Show password"), introduced by the EP10B Input primitive. Root cause is in the EP10B Input primitive / E2E selector coupling, not in EP10G's dashboard/profile adoption (those surfaces are not E2E-covered). Recorded as a finding per AC #6; not silently ignored. Suggested follow-up: EP09/E2E selector hardening (`getByRole('textbox', { name: 'Password' })` or exact label) or Input toggle aria-label adjustment — out of EP10G scope, flagged for parent review. (Non-blocking for EP10G scope, but blocks TR-E10-03 "passes".)
- F-G-3: No DashboardPage.test.tsx exists; dashboard adoption verified by typecheck/lint/build + manual reasoning (consistent with EP10D/E/F pattern; no dashboard E2E spec exists per AC #6 caveat). (Non-blocking.)