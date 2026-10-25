# SP-118 checkpoint

Updated: 2026-10-25 (local, -0400)
Execution state: EP09 queue row SP-118 → `docs/stories/EP09/README.md` (`In progress`, active substory)
Story: `docs/stories/EP09/SP-118-semester-course-e2e.md`
Review unit: EP09 group (children SP-116/117/118); parent index at `docs/stories/EP09/artifacts/EP09/implementation.md` once all children finish
Role / scope: implementer; E2E test layer only — new `apps/web/e2e/semesters-courses.spec.ts` (+ `e2e/helpers.ts`); **tests only, no production code**

## Repository state

- Workspace / branch: `main` (shared workspace, single implementer), clean tree at `18b1735` (SP-117 closeout commit)
- HEAD at last update: `18b1735`
- Saved work: none yet
- Dev stack already running (Postgres :5432, Vite :3000, API :4000); not started/stopped by this task

## Progress

- [x] Shared `e2e/helpers.ts` (register/login via API + authed setup calls + UI login)
- [x] AC1: create semester via UI → appears in list
- [x] AC2: create course via UI → appears in list
- [x] AC3: edit semester + course persist and render updated values
- [x] AC4: delete semester (confirmed dialog) + archive/restore course (the UI's confirmed removal — no hard delete exists)
- [x] AC5: unique names per run (no cleanup — same F4/F5 disposition as SP-116/117)
- [x] One negative validation case (story Notes): empty semester form → inline required errors
- [x] Full verification: `pnpm test:e2e` (14 passed × 15 consecutive runs), web vitest, lint, typecheck, Prettier — all green
- [x] Closeout: implementation.md written; queue/status reconciled; scoped commit (hash in the task handoff)

## Decisions and dependencies

- **F1 (design, verified in code):** the API guard accepts **bearer tokens only**
  (`ExtractJwt.fromAuthHeaderAsBearerToken()`, `jwt.strategy.ts`) — the httpOnly
  cookie is only the refresh token. So authenticated **API setup calls** use
  `POST /api/auth/login`'s `{ accessToken }` (service `AuthResponse`) in an
  `Authorization: Bearer` header via the per-test `request` fixture; the token
  stays in a local test variable (never logged/persisted). This makes edit/delete
  tests independent of the create journeys (setup via the real API, mutation via
  the real UI — the story's "API in a setup step" pattern).
- **F2 (AC4 note, recorded for reviewer):** courses have **no hard delete** in
  the product (D111-2: "nothing is ever deleted"). The course "removal" journey
  is **archive/restore with its confirmation dialog** — covered as the AC4
  course path without weakening any guard; noted so the reviewer can weigh the
  AC wording vs. the product decision.
- UI selectors verified in code (`SemestersPage`, `SemesterForm`/`List`,
  `DeleteSemesterDialog`, `CoursesPage`, `CourseForm`/`List`,
  `ArchiveCourseDialog`): labels (`Semester name`, `Start date`, `End date`,
  `Course code`, `Course name`, `Semester`, `Instructor`, `Credits`), row action
  aria-labels (`Edit/Delete ${name}`, `Edit/Archive/Restore ${name}`), dialog
  headings (`Delete ${name}?`, `Archive/Restore ${name}?`), submit buttons
  (`Create semester`, `Save changes`, `Create course`), `role="status"` success
  lines (`${name} created./updated./deleted.…`, `${name} archived.…/restored.`),
  the `role="switch"` "Show archived" toggle, and the "Archived" text badge.
  Duplicate accessible names row-vs-dialog (e.g. both `Delete ${name}`) are
  disambiguated by scoping to `page.getByRole('dialog')`.
- Data isolation: per-test user + per-test entity names; semester/course names
  only need per-student uniqueness (409 is student-scoped), so worker
  parallelism cannot collide; emails remain globally unique (SP-116 F6 pattern).
- Created semesters default `isActive: false` (schema default, verified in the
  API's dto/data-scoping specs) — the semester picker option label has no
  "(active)" suffix; the course form selects the semester by its id value
  (captured from the setup response), not by label.
- Helper consolidation: `login.spec.ts` (SP-116) and `auth-journeys.spec.ts`
  (SP-117) keep their in-file helpers — this task adds `e2e/helpers.ts` for the
  new spec without touching already-verified sibling evidence; consolidation is
  a note for the parent review.
- **F3 (fixed during verification):** the first full run failed — the course
  edit test asserted the instructor in the **list row**, but `CourseList` does
  not render instructors (row shows code/name/semester/credits only). Fixed by
  asserting instructor persistence through the reopened, prefilled edit dialog
  (`toHaveValue('Grace Hopper')`) — a user-visible outcome per the story notes.
  15 consecutive green runs after the fix.

## Verification

- `pnpm test:e2e` (root): 14 passed (7 SP-118 + 5 SP-117 + 2 SP-116) — 15 consecutive green runs
- `pnpm test` (`apps/web`): 45 files / 563 tests passed
- `pnpm lint` (root): passed; typecheck (web): passed; Prettier on the new files: clean
- Full evidence table in [implementation.md](./implementation.md)

## Resume next

Done — child complete. Verification and AC outcomes in [implementation.md](./implementation.md);
findings F2 (course "removal" = archive, no hard delete) and the F4 cleanup
carry-over are recorded for the EP09 parent review. All EP09 children are now
implemented → the EP09 parent implementation index is next, then the single
independent parent review.
