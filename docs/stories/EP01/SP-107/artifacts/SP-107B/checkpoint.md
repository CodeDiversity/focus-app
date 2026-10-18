# SP-107B checkpoint

Updated: 2026-10-18 19:45 EDT (dispatch complete)
Execution state: [SP-107 README queue](../../README.md) — row B `Implemented — awaiting parent review`; Active substory `None`; Next substory SP-107C — implement
Story: [SP-107B-minimal-semester-course-endpoints.md](../../SP-107B-minimal-semester-course-endpoints.md)
Review unit: SP-107 (parent; index will live at `../SP-107/implementation.md`)
Role / scope: implementer; SP-107B backend child only (minimal `POST /semesters` + `POST /courses`, `@db.Date` migration). Excludes: SP-107C–F, EP02 endpoints, `docs/jira-sync/`.

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at last update: `8bc7f15` (baseline before the first included change)
- Saved work: all scoped SP-107B paths committed in one scoped commit (hash in the returned closeout; see [implementation.md](./implementation.md) → "Commit scope"). Working tree for this child's scoped paths: clean.
- Other work to preserve: the coordinator/autopilot-owned `## Autopilot` run-record section in [the SP-107 README](../../README.md) is intentionally **not** part of this commit.

## Progress

- [x] Schema: `Semester.startDate`/`endDate` → `DateTime @db.Date` (D107-7) + migration `20261018232322_semester_course_dates` (explicit `USING` cast; pre-cast row count 0/0 — no-op)
- [x] `prisma generate` (local, gitignored) + `migrate deploy` (no pending)
- [x] `common/lib/calendar-date.ts` — strict `yyyy-MM-dd` parse (UTC midnight) + format
- [x] `modules/semesters/` — module, controller, service, DTO, unit spec (16 tests), data-scoping spec (11 tests)
- [x] `modules/courses/` — module, controller, service, DTO, unit spec (21 tests), data-scoping spec (15 tests)
- [x] Registered both modules in `app.module.ts` + `test/test-http.ts`
- [x] Full suite with `dotenv -e .env.local -- npx jest --runInBand`: 32/32 suites, 390/390 tests, zero skips; typecheck exit 0; lint exit 0; prettier clean
- [x] `implementation.md` written; closeout (README queue updated, scoped commit made)

## Findings / Deviations

All five findings (F-107B-1…5: missing `USING` cast, class-validator 0.14
`exclusive` gap, null-optional 500, dead spec helper, wrong unit expectation)
are **fixed** and closed with evidence in [implementation.md](./implementation.md)
→ "Findings / Deviations". Design decisions (helper location, `semesterId`
404-not-400, exact `Course` shape, trim-on-store) are recorded there as well.
No open findings.

## Decisions and dependencies

- D107-5 / D107-6 / D107-7 / D107-9 (README decision register) — implemented as decided; module headers document the EP02 extend-don't-duplicate handoff.
- Upstream: SP-104 (global guard, `@CurrentUser()`, ownership helpers) — consumed, unchanged.

## Verification

- Full suite (cwd repo root, `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest --runInBand`): 32/32 suites, 390/390 tests, 0 skipped — both new integration specs executed (no self-skip; `DATABASE_URL` supplied).
- `pnpm --filter @studypilot/api typecheck` → exit 0; `lint` → exit 0; `format` (prettier check) → clean.
- `prisma migrate deploy` → 9 migrations, no pending.
- Details in [implementation.md](./implementation.md) → "Verification".

## Resume next

None — child complete. The queue names SP-107C — implement (a fresh dispatch;
this writer is relinquished).
