# EP09 parent implementation index

**Parent:** [EP09: E2E Test Automation](../../../epics/EP09-e2e-test-automation.md)
**Status:** Ready for review — all four children implemented (`implementation complete — awaiting parent review`)
**Baseline:** `c52ebf2` (HEAD before the first included change, SP-116's `2659504`)

## Scope

Browser E2E coverage for StudyPilot against the real, unmocked stack:
Playwright infrastructure + login smoke (SP-116), the remaining auth journeys
(SP-117), and semester/course management journeys (SP-118). SP-119 makes every
run **self-contained**: a dedicated throwaway `studypilot_e2e_test` database
(created + migrated in global setup, dropped in global teardown) with test-only
API (:4100) and web (:3100) instances — the developer stack and developer
database are neither required nor touched. No production code changed in any
child — all changes are tests, test config, scripts/README wiring, and story
artifacts.

## Children

| Story | Title | Implementation record | Commit scope | Status |
| --- | --- | --- | --- | --- |
| SP-116 | Playwright infrastructure + login smoke test | [`artifacts/SP-116/implementation.md`](../SP-116/implementation.md) | `2659504` (initial, prior session) · `310f729` (determinism/failure-clarity fixes) · `a620132` (headed runner, HTML report, screenshots) · `041c887`/`b915538` (root report script, turbo-routed) · `8b8f4a5`/`ff46bd4` (closeout docs) | Implemented — awaiting parent review |
| SP-117 | Auth journey coverage | [`artifacts/SP-117/implementation.md`](../SP-117/implementation.md) | `18b1735` (auth-journeys spec + closeout docs) | Implemented — awaiting parent review |
| SP-118 | Semester & course management E2E coverage | [`artifacts/SP-118/implementation.md`](../SP-118/implementation.md) | `f81e08d` (helpers + semesters-courses spec + closeout docs) | Implemented — awaiting parent review |
| SP-119 | E2E dedicated test database + self-contained test stack | [`artifacts/SP-119/implementation.md`](../SP-119/implementation.md) | `e9c72d4` (self-contained stack: 4 new test-infra files + 10 modified) · `6f91fbb` (cold-stack `actionTimeout` fix) · scope B closeout commit (docs-only: implementation record, checkpoint, status reconciliation, this index — hash in the dispatch return) | Implemented — awaiting parent review |

All commits on `main`; the working tree is clean (no uncommitted scoped writes).

## Combined verification (evidence per child record)

- `pnpm test:e2e` (repo root): **14 passed** — the SP-116/117/118 journeys now
  run on the **self-contained stack** (SP-119): dedicated `studypilot_e2e_test`
  database + test-only API :4100 + test-only web :3100, database dropped after
  the run. SP-119 scope B ran the full suite **5 consecutive times, fully green**
  (8.8s / 7.2s / 6.3s / 8.8s / 6.3s) with the live dev stack running and left
  unaffected. (Historical: SP-118's final verification ran the whole suite 15
  consecutive times green against the dev stack; SP-117's scope had 39
  consecutive green runs under its final state.)
- Developer database untouched by any run: row counts identical before/after
  every SP-119 run (users 497 · semesters 75 · courses 63 · class_meetings 1 ·
  assignments 18 · leaked `e2e-%` users 478 · `E2E %` semesters 64 · `E2E %`
  courses 48); `studypilot_e2e_test` absent after every run.
- Fail-fast verified in both modes: self-contained (Postgres unreachable vs.
  configured dev DB missing — distinct messages, before the first test) and
  external-stack (`E2E_BASE_URL` against a dead port — fast, actionable
  failures, no database lifecycle).
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
| Infrastructure | Self-contained run: dedicated `*_e2e_test` DB + own API/web instances; per-run drop; dev stack untouched | SP-119 |
| Dashboard / Profile / Tasks | Backlog — deliberately not planned | — |

## Open findings carried into the review

(The cleanup trio below is recorded CLOSED by SP-119 with before/after
evidence; the final disposition is confirmed by the parent review per the
README Gate line.)

- **SP-116 F5 / SP-117 F4 / SP-118 F4 (CLOSED by SP-119):** runs previously
  left `e2e-*` user/entity rows in the developer database with no cleanup.
  SP-119's per-run database drop is a structural fix — no run can leak anymore.
  Evidence (SP-119 scope B, 5 consecutive runs + 3 simulated runs): leaked
  `e2e-%` users 478 before → 478 after, `E2E %` semesters 64 → 64, `E2E %`
  courses 48 → 48 (byte-identical — the rows are *historical* leaks from
  pre-SP-119 runs; no run added or removed any), and `studypilot_e2e_test`
  absent after every run. The 478/64/48 historical rows remain as the
  story-Notes **optional one-time manual cleanup** (`DELETE FROM users WHERE
  email LIKE 'e2e-%';` — children cascade) for the user; they are no longer a
  run-time leak.
- **SP-117 F1 (open):** AC1 wording ("registration → session") vs. the
  deliberate SP-102 register→login flow — reword the AC or schedule an
  auto-login product story; covered the real journey either way. (User
  deferred to this review.)
- **SP-117 F2 (open, monitored):** one lost-output e2e failure observed once
  (~run 2 of the first repeat batch, before log capture); 39 consecutive green
  runs after; HTML report + screenshots will capture any recurrence. (User
  deferred to this review.)
- **SP-118 F2 (open):** course "removal" is confirmed archive/restore (D111-2:
  no hard delete) — the AC's "deleting a course" was mapped to that product
  decision, no guard weakened. (User deferred to this review.)
- **SP-118 F5 (note):** helper consolidation across the three e2e specs
  (SP-116/117 keep in-file copies) left out of scope deliberately.
- **SP-119 F-119-7 (open, cosmetic):** the unreachable-Postgres fail-fast
  message renders an empty `()` detail — pjs wraps `ECONNREFUSED` in an
  `AggregateError` with an empty `message`. The message stays clear and
  actionable (host:port + "Ensure Postgres is running") and the two AC3
  branches remain distinct; surfacing the underlying detail is a one-line
  polish. (Scope A findings F-119-1…5 — Playwright 1.64 probe status range,
  `port`/`url` exclusivity, pjs `?schema=`, pnpm 8 `--` passthrough, cold-stack
  `actionTimeout` — were all fixed within scope A; see the SP-119 record.)
