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
- [x] Parent index `../SP-111/implementation.md` (AC3) — written; DoD-10 section updated to the ratified state (PASSED with one deviation, F111C-3)
- [x] DoD-10 **human browser walk performed by the user (2026-10-22): PASSED with one deviation** — the course color field should be a color picker (F111C-3)
- [x] F111C-3 fix in `CourseForm.tsx` (B-owned file; the implementer is the single owner): the user's final design — **a row of color swatch circles** (radiogroup of 10 preset colors, visible colors, arrow-key navigation; + a `Custom` swatch for stored non-palette colors); tests 34 → 36
- [x] User visual re-check of the swatches (2026-10-22): confirmed ("looks good")
- [x] Scoped commit 1: `7ae6ad0` — `CourseForm.tsx` + `CourseForm.test.tsx` + this checkpoint (F111C-3)
- [x] DoD-10 ratification records — PASSED with one deviation (user, 2026-10-22; F111C-3 fixed in `7ae6ad0`) — in C `implementation.md` (Status/AC2/sign-off), parent index, queue "Next substory"
- [ ] Scoped commit 2: the ratification records (C `implementation.md`, parent index, queue)
- [ ] Stop dev servers (API :4000, web :3000) → hand off to the combined SP-111 parent review
- Current step: commit 2, then stop dev servers and hand off to the combined SP-111 parent review

## Decisions and dependencies
- Contract: parent README "Shared API contract" (GET/PATCH/POST + `CourseWithSemester`, 13 keys, D111-1…5) — implemented by A, consumed by B.
- Patterns mirrored: `semesters-e2e.spec.ts` (harness, two-student seeding via real register/login, journey-ordered state-dependent cases, byte-identical row proof, self-cleaning cascade), `test-http.ts` (real modules incl. `CoursesModule` — no harness change needed).
- Database: disposable `postgres:15-alpine` container on port 5433 (SP-110C precedent; image present locally) for the automated runs; the local Homebrew dev Postgres (`localhost:5432`, already migrated incl. `20261021000000_course_instructor` per F111A-1) for the dev-stack pre-flight. `.env`/`.env.local` are never read; `DATABASE_URL` is supplied via the process environment (the harness uses `ConfigModule` with `ignoreEnvFile: true`).
- Dev DB pre/post pre-flight: 5 users / 3 semesters / 1 course / 28 refresh_tokens → restored exactly after deleting the two pre-flight users (cascade).

## Findings
- **F111C-1** (fixed, test-only): first draft asserted `toEqual` between the two uniform-404 bodies (foreign vs missing `semesterId`); the error envelope's `path` (contains the semester id) and `timestamp` differ per request. The uniformity contract covers status + `message` + `error` — the assertion now compares exactly those. No product defect.
- **F111C-2** (recorded, process-level): registration lowercases the email (`preflight.a.9944B033@…` stored as `…9944b033@…`), so the pre-flight cleanup's `delete from users where email = <sent case>` matched 0 rows. Deleted by user id instead; dev DB restored exactly. No product defect (lowercasing is the intended normalization).
- **F111C-3** (fixed this session, B-owned file): the DoD-10 human browser walk (user, 2026-10-22) passed with one deviation — the course **color field is a plain hex text input**, and the user wants a **color picker**. The user then clarified the design twice: first **a simple dropdown of preset colors, no hex input at all**, then that the options must **actually show the colors** ("like a circle of the color … or something that would actually show the color somehow"). The B ticket required `#rrggbb` validation (a text input satisfied it) but did not mandate a picker, so this is a UX gap, not a ticket defect. Final fix in `CourseForm.tsx` (B's file, changed by this session per the ticket rule that A/B findings route back to their owner — the implementer is that single owner): the color field is now a **row of color swatch circles** (a `role="radiogroup"` of 10 preset colors, Tailwind 500-level; indigo `#6366f1` first — the schema default) — every color visible at a glance, click to pick, one tab stop (roving tabindex on the checked swatch) with arrow-key/Home/End navigation (WAI-ARIA radio pattern). A native `<select>` was ruled out because `<option>` elements cannot render colors; a custom popover was ruled out because the dialog scrolls (`overflow-y-auto`) and would clip it. No free-form hex input remains. Two robustness points: (1) in edit mode a stored color that isn't in the palette (e.g. typed into the old hex field) is offered as an extra `Custom #rrggbb` swatch so saving any other change never silently overwrites it; (2) the `#rrggbb` zod refine stays in the schema (mirrors the backend, DoD 2) but is unreachable through the swatches, so the two color cases in the client validation matrix are removed. The backend contract is unchanged (still accepts any `#rrggbb`). Test file: 34 → 36 tests (−2 matrix color cases, +4 swatch tests: visible swatches/default checked, click-and-submit, arrow-key movement, custom-color round-trip).
- **Product defects in A–B:** one UX finding — F111C-3 above (surfaced by the DoD-10 walk; fixed in this session). Every e2e case and every pre-flight step otherwise passed on the first (corrected) run.

## Verification
- Disposable DB: ephemeral `postgres:15-alpine` on 5433, `prisma migrate deploy` (all migrations applied, no pending), removed after the run.
- `DATABASE_URL=<disposable 5433> pnpm --filter @studypilot/api exec jest --runInBand courses-e2e` → **1 suite / 14 tests passed** (first run after the F111C-1 assertion fix).
- `DATABASE_URL=<disposable 5433> pnpm --filter @studypilot/api exec jest --runInBand` → **35/35 suites, 547/547 tests passed, 0 skipped** (baseline after SP-111A: 34/533; + this spec's 14).
- No-DB: `pnpm --filter @studypilot/api exec jest --runInBand` → 26 suites pass, 9 integration suites self-skip (162 tests incl. this spec's 14) — bare local path works.
- `pnpm --filter @studypilot/api typecheck` clean; eslint `--max-warnings 0` clean (after `--fix` formatting pass); prettier clean.
- `pnpm --filter @studypilot/web test` → **35 files / 423 tests, all pass**.
- DoD-10 wire leg: dev stack (dev Postgres 5432 + API :4000 + web :3000), 14-step pre-flight through the web proxy — all green; row-level proof; dev DB restored; both servers stopped; disposable container removed.
- **After the F111C-3 swatch fix:** `pnpm --filter @studypilot/web test` → **35 files / 425 tests, all pass** (423 − 2 removed matrix color cases + 4 swatch tests); CourseForm spec 36/36. `pnpm --filter @studypilot/web typecheck` clean; eslint `--max-warnings 0` clean; prettier clean.
- **act() warning attribution (F111C-3):** the CourseForm spec's pre-existing "not wrapped in act" warnings (baseline 74 before the change — the async zod-resolver emission pattern, present since SP-111B) are unchanged in kind after the swatch fix (86 total; per-test verbose run shows the same profile as every other typing/submitting test, incl. untouched ones — the delta is the new tests exercising the same pre-existing pattern, not the component). Warnings, not failures; the suite passes.
- Details + AC outcomes: `./implementation.md`.

## Resume next
All SP-111C closeout work is done: F111C-3 fix committed (`7ae6ad0`); DoD-10
ratification recorded (PASSED with one deviation — user, 2026-10-22; browser/
version not provided, SP-110C precedent); C `implementation.md`, parent index,
queue and this checkpoint reconciled. Next: stop the dev servers (API :4000,
web :3000), then hand off to the combined SP-111 parent review (reviewer-owned;
report + `walkthrough.md` at `../SP-111/`).
