# EP09 parent implementation index

**Parent:** [EP09: E2E Test Automation](../../../epics/EP09-e2e-test-automation.md)
**Status:** Ready for review — all children implemented (`implementation complete — awaiting parent review`)
**Baseline:** `c52ebf2` (HEAD before the first included change, SP-116's `2659504`)

## Scope

Browser E2E coverage for StudyPilot against the real stack (Vite :3000 → NestJS
API :4000 → Postgres; no API mocking): Playwright infrastructure + login smoke
(SP-116), the remaining auth journeys (SP-117), and semester/course
management journeys (SP-118). No production code changed in any child — all
changes are tests, test config, scripts/README wiring, and story artifacts.

## Children

| Story | Title | Implementation record | Commit scope | Status |
| --- | --- | --- | --- | --- |
| SP-116 | Playwright infrastructure + login smoke test | [`artifacts/SP-116/implementation.md`](../SP-116/implementation.md) | `2659504` (initial, prior session) · `310f729` (determinism/failure-clarity fixes) · `a620132` (headed runner, HTML report, screenshots) · `041c887`/`b915538` (root report script, turbo-routed) · `8b8f4a5`/`ff46bd4` (closeout docs) | Implemented — awaiting parent review |
| SP-117 | Auth journey coverage | [`artifacts/SP-117/implementation.md`](../SP-117/implementation.md) | `18b1735` (auth-journeys spec + closeout docs) | Implemented — awaiting parent review |
| SP-118 | Semester & course management E2E coverage | [`artifacts/SP-118/implementation.md`](../SP-118/implementation.md) | `f81e08d` (helpers + semesters-courses spec + closeout docs) | Implemented — awaiting parent review |

All commits on `main`; the working tree is clean (no uncommitted scoped writes).

## Combined verification (evidence per child record)

- `pnpm test:e2e` (repo root): **14 passed** — SP-118's final verification ran
  the whole suite 15 consecutive times, green; SP-117's scope had 39
  consecutive green runs under its final state.
- `pnpm test` (`apps/web`, vitest): 45 files / 563 tests passed (e2e specs
  excluded from vitest collection).
- `pnpm lint` (root): api + web pass · `pnpm typecheck` (`apps/web`): pass ·
  Prettier checks on changed files: clean.

## Coverage vs. the epic's test inventory

| Area | Flow | Covered by |
| --- | --- | --- |
| Auth | Register → login → session (register→login redirect is the deliberate SP-102 flow, SP-117 F1) | SP-117 |
| Auth | Login (valid credentials) | SP-116 |
| Auth | Login (invalid credentials: wrong password — SP-116; unknown email — SP-117) | SP-116, SP-117 |
| Auth | Session survives reload (httpOnly-cookie restore) | SP-117 |
| Auth | Logout → /login; protected route redirects | SP-117 |
| Auth | Protected route redirects unauthenticated visitor | SP-117 |
| Semesters | Create, edit, delete (confirmed) | SP-118 |
| Courses | Create, edit, archive/restore (the product's confirmed "removal" — no hard delete, SP-118 F2) | SP-118 |
| Dashboard / Profile / Tasks | Backlog — deliberately not planned | — |

## Open findings carried into the review

- **SP-116 F5 / SP-117 F4 / SP-118 F4 (open):** no data cleanup — runs leave
  `e2e-*` user/entity rows; no deletion endpoints; dedicated-test-DB + cleanup
  is a planner-scheduled infra story (repo precedent: `*_test`-suffixed
  `TEST_DATABASE_URL` in `recovery-db-harness.ts`).
- **SP-117 F1 (open):** AC1 wording ("registration → session") vs. the
  deliberate SP-102 register→login flow — reword the AC or schedule an
  auto-login product story; covered the real journey either way.
- **SP-117 F2 (open, monitored):** one lost-output e2e failure observed once
  (~run 2 of the first repeat batch, before log capture); 39 consecutive green
  runs after; HTML report + screenshots will capture any recurrence.
- **SP-118 F2 (open):** course "removal" is confirmed archive/restore (D111-2:
  no hard delete) — the AC's "deleting a course" was mapped to that product
  decision, no guard weakened.
- **SP-118 F5 (note):** helper consolidation across the three e2e specs
  (SP-116/117 keep in-file copies) left out of scope deliberately.
