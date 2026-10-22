# SP-111C checkpoint
Updated: 2026-10-22 (implementer session, local time)
Execution state: parent queue row C — `docs/stories/EP02/SP-111/README.md` (In progress; Active → SP-111C)
Story: `docs/stories/EP02/SP-111/SP-111C-course-integration-signoff.md`
Review unit: SP-111 — parent index `docs/stories/EP02/SP-111/artifacts/SP-111/implementation.md` (this child writes it, AC3)
Role / scope: implementer; integration/verification only (new courses e2e spec, full-suite runs, DoD-10 pre-flight + walk record, parent index). Excluded: any A/B product fix (route back to that child as a finding), SP-112, the combined parent review itself (reviewer-owned).

## Repository state
- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at start: `c0ccb7d` (SP-111B: course management UI) — clean tree
- Other work to preserve: none — tree was clean at start
- Dependencies satisfied: SP-111A (`11f501e`) + SP-111B (`c0ccb7d`) both implemented, records in `../SP-111A/` + `../SP-111B/`

## Progress
- [x] E2E spec `apps/api/src/modules/courses/courses-e2e.spec.ts` (new; mirror `semesters-e2e.spec.ts`) — 14 tests
- [x] Full API suite green on a disposable migrated PostgreSQL (35/35 suites, 547/547, 0 skipped)
- [x] Full API suite no-DB path (9 suites self-skip, 26 pass; this spec self-skips 14/14)
- [x] Full web suite green (35 files / 423 tests)
- [x] DoD 10: dev-stack bring-up + HTTP pre-flight through the web proxy — all 14 steps green first run
- [x] DoD 10: browser walk steps written into the implementation record; human gate recorded **CANNOT VERIFY** (no human browser session in the implementation runtime — SP-110C precedent; ratification stays with the session owner)
- [ ] Parent index `../SP-111/implementation.md` (AC3) — writing now
- [ ] Closeout: implementation.md, queue reconciliation, commit
- Current step: records + closeout

## Decisions and dependencies
- Contract: parent README "Shared API contract" (GET/PATCH/POST + `CourseWithSemester`, 13 keys, D111-1…5) — implemented by A, consumed by B.
- Patterns mirrored: `semesters-e2e.spec.ts` (harness, two-student seeding via real register/login, journey-ordered state-dependent cases, byte-identical row proof, self-cleaning cascade), `test-http.ts` (real modules incl. `CoursesModule` — no harness change needed).
- Database: disposable `postgres:15-alpine` container on port 5433 (SP-110C precedent; image present locally) for the automated runs; the local Homebrew dev Postgres (`localhost:5432`, already migrated incl. `20261021000000_course_instructor` per F111A-1) for the dev-stack pre-flight. `.env`/`.env.local` are never read; `DATABASE_URL` is supplied via the process environment (the harness uses `ConfigModule` with `ignoreEnvFile: true`).
- Dev DB pre/post pre-flight: 5 users / 3 semesters / 1 course / 28 refresh_tokens → restored exactly after deleting the two pre-flight users (cascade).

## Findings
- **F111C-1** (fixed, test-only): first draft asserted `toEqual` between the two uniform-404 bodies (foreign vs missing `semesterId`); the error envelope's `path` (contains the semester id) and `timestamp` differ per request. The uniformity contract covers status + `message` + `error` — the assertion now compares exactly those. No product defect.
- **F111C-2** (recorded, process-level): registration lowercases the email (`preflight.a.9944B033@…` stored as `…9944b033@…`), so the pre-flight cleanup's `delete from users where email = <sent case>` matched 0 rows. Deleted by user id instead; dev DB restored exactly. No product defect (lowercasing is the intended normalization).
- **Product defects in A–B: none.** Every e2e case and every pre-flight step passed on the first (corrected) run; no finding was raised against the owning children (ticket rule: A/B defects route back to that child's owner as findings — none occurred).

## Verification
- Disposable DB: ephemeral `postgres:15-alpine` on 5433, `prisma migrate deploy` (all migrations applied, no pending), removed after the run.
- `DATABASE_URL=<disposable 5433> pnpm --filter @studypilot/api exec jest --runInBand courses-e2e` → **1 suite / 14 tests passed** (first run after the F111C-1 assertion fix).
- `DATABASE_URL=<disposable 5433> pnpm --filter @studypilot/api exec jest --runInBand` → **35/35 suites, 547/547 tests passed, 0 skipped** (baseline after SP-111A: 34/533; + this spec's 14).
- No-DB: `pnpm --filter @studypilot/api exec jest --runInBand` → 26 suites pass, 9 integration suites self-skip (162 tests incl. this spec's 14) — bare local path works.
- `pnpm --filter @studypilot/api typecheck` clean; eslint `--max-warnings 0` clean (after `--fix` formatting pass); prettier clean.
- `pnpm --filter @studypilot/web test` → **35 files / 423 tests, all pass**.
- DoD-10 wire leg: dev stack (dev Postgres 5432 + API :4000 + web :3000), 14-step pre-flight through the web proxy — all green; row-level proof; dev DB restored; both servers stopped; disposable container removed.
- Details + AC outcomes: `./implementation.md`.

## Resume next
Write the parent index (`../SP-111/implementation.md`), then closeout: queue reconciliation + commit. The DoD-10 human browser-walk ratification stays with the session owner (recorded CANNOT VERIFY in `./implementation.md` with the exact steps).
