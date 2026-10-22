# SP-111 parent implementation index

Updated: 2026-10-22 (SP-111C closeout)
Prepared by: implementer (single sequential writer) as SP-111C (AC3) — the
named integration/index owner for the SP-111 review unit.
Purpose: index of every child's implementation evidence for the one combined
SP-111 parent review. The review report, when the read-only reviewer returns,
is saved at `./review.md` (this directory).

## Status

All three children — A, B, C — are implemented and are hereby handed to the
combined SP-111 parent review. No child review has been performed or asserted
and none replaces this sign-off. SP-111 covers course management: the full
API surface (A), the `/courses` UI (B), and integrated end-to-end
verification (C) — epic AC-E02-03 (create/edit) and AC-E02-05 (archived
courses remain accessible) plus the AC-E02-02 ownership boundary; see the
[parent README](../../README.md) for the full traceability map.

**DoD 10 is open (CANNOT VERIFY at closeout):** the manual browser sign-off
(C AC2) — the 14-step `/courses` walk — is a **human gate** and no human
browser session was available in the implementation runtime, so it is
recorded CANNOT VERIFY with the exact steps in
[`SP-111C/implementation.md`](../SP-111C/implementation.md) → "Manual
browser sign-off (DoD 10, AC2)"; the ratification (who/when/browser) belongs
to the session owner, exactly as SP-110C ran it. The automated wire proof
(C e2e suite + the dev-stack HTTP pre-flight through the web proxy — all
green) and the web component tests (B) stand on their own. Everything else
in the review unit is implemented and verified.

Sequence: A → B → C, one sequential writer. C is the named cross-layer
integration owner (e2e journey suite, full-suite re-runs, DoD 10 sign-off
preparation, this index).

## Child evidence index

| Story | Delivered | Implementation | Checkpoint | Commits |
|---|---|---|---|---|
| [A](../../SP-111A-course-management-api.md) | Full course management API: `GET /courses` (list, name/code order, `?semesterId` + `?includeArchived` filters, uniform 404 on foreign/missing semester), `GET /courses/:id` (archive-agnostic), `PATCH /courses/:id` (partial merge, merged-value validation, archive/restore via `isActive`, 409 code collision), `POST /courses` extended with `instructor` + the 13-key `CourseWithSemester` shape; `Course.instructor` column + migration (D111-1) — all principal-scoped, uniform 404 | [implementation](../SP-111A/implementation.md) | [checkpoint](../SP-111A/checkpoint.md) | `11f501e` |
| [B](../../SP-111B-course-management-ui.md) | `/courses` page (FSD): `CourseList` (rows, show-archived `role="switch"`, Archived badge, loading/empty/error+retry), `CourseForm` dialog (RHF+Zod mirroring the backend rules, null-no-op semantics), `ArchiveCourseDialog` (reversible wording, focus trap), `CoursesPage` (page-local state, live region), `courseApi` extended to the full contract, header "Courses" link, route inside `ProtectedRoute` | [implementation](../SP-111B/implementation.md) | [checkpoint](../SP-111B/checkpoint.md) | `c0ccb7d` |
| [C](../../SP-111C-course-integration-signoff.md) | Real-Postgres e2e student-journey suite (14 tests: lifecycle create→list/filter→edit→archive→restore, semester filter, SP-110-boundary orphan, cross-student matrix, 401s); full API + web suite re-runs; dev-stack HTTP pre-flight; DoD 10 walk steps + CANNOT VERIFY record; this parent index | [implementation](../SP-111C/implementation.md) | [checkpoint](../SP-111C/checkpoint.md) | (this closeout commit — hash in the queue row + handoff) |

## Per-child scope and verification

- **A** (backend, `11f501e`): `courses` module extended to the full
  management surface — `update-course.dto.ts` (new), `create-course.dto.ts`
  (+`instructor`), service (`list`/`get`/`update` + extended `create`,
  `toResponse` → `CourseWithSemester`, uniform 404 on every miss, 409 on
  P2002), controller (3 new routes), schema `Course.instructor String?` +
  migration `20261021000000_course_instructor` (the only migration in this
  parent), 62 unit + 51 data-scoping tests, plus the `semesters-e2e.spec.ts`
  `COURSE_KEYS` constant update (F111A-2 — a direct consequence of the
  parent-approved D111-4 shape, test-only). At its commit: API **34/34
  suites, 533/533 tests, 0 skipped** on the local dev Postgres; typecheck +
  lint + format clean. Findings F111A-1/2 — F111A-1 (pre-existing local
  migration checksum drift) worked around without touching the committed
  files; F111A-2 fixed in the committed code.
- **B** (frontend, `c0ccb7d`): `courseApi` (rewritten — `CourseWithSemester`,
  `listCourses`/`getCourse`/`updateCourse`), `features/courses/` (3 new
  components + tests: `CourseList` 10, `CourseForm` 34,
  `ArchiveCourseDialog` 9), `pages/courses/ui/CoursesPage` (+14 tests),
  `shared/types/academic.ts` (`instructor`), `Header` (link + test),
  `App.tsx` (route), `Step3Course.test.tsx` fixture (F111B-3). At its
  commit: web **35/35 files, 423/423 tests**; typecheck + lint + build
  clean. Findings F111B-1…6 — fixed or recorded design decisions (F111B-1
  null-no-op semantics → D111B-3; F111B-4/5 test-only; F111B-6
  formatting).
- **C** (integration, this closeout commit): `courses-e2e.spec.ts` (new —
  14 tests on real Postgres, self-cleaning); **no production, schema,
  migration, harness, `package.json` or CI change** (the `test-http` harness
  already carries the courses + semesters modules — no wiring needed).
  Re-verified at closeout: API **35/35 suites, 547/547 tests, 0 skipped** on
  a disposable migrated Postgres; 9 suites self-skip (385 pass) without a
  database; typecheck + lint + format clean; web **35/35 files, 423/423
  tests**; dev-stack HTTP pre-flight through the web proxy all green (14
  steps); dev DB restored to its exact pre-run state; disposable container
  removed; **DoD 10 human browser walk CANNOT VERIFY** (human gate — steps
  recorded, ratification with the session owner). Findings F111C-1/2 —
  both test/process-level, fixed this session. **Product defects in A–B:
  none** — every e2e case and pre-flight step passed on the first (corrected)
  run.

## Combined Git scope for the review

Baseline: `11bd60e` (the SP-111 sequencing-judgment docs commit, before the
first SP-111 change).

| Commit | Content |
|---|---|
| `11f501e` | SP-111A — 13 files: `schema.prisma` (+1), migration (new), `create-course.dto.ts`, `update-course.dto.ts` (new), `courses.service.ts` (+306), `courses.controller.ts` (+85), `courses.service.spec.ts` (+598), `courses-data-scoping.spec.ts` (+579), `semesters-e2e.spec.ts` (COURSE_KEYS, F111A-2), README execution fields, `artifacts/SP-111A/` |
| `c0ccb7d` | SP-111B — 19 files: `courseApi` (+ test), `CourseList`/`CourseForm`/`ArchiveCourseDialog` (+ tests), `CoursesPage` (+ test), `academic.ts`, `Header` (+ test), `App.tsx`, `Step3Course.test.tsx` (F111B-3), README execution fields, `artifacts/SP-111B/` |
| (this commit) | SP-111C — `courses-e2e.spec.ts` (new, 14 tests), README execution fields, `SP-111C` status line, `artifacts/SP-111C/` (checkpoint + implementation record), `artifacts/SP-111/implementation.md` (this index) |

No non-SP-111 commit lies inside the range `11bd60e..c0ccb7d`. Working-tree
paths committed by C's closeout commit (baseline `c0ccb7d`):
`apps/api/src/modules/courses/courses-e2e.spec.ts` (new),
`docs/stories/EP02/SP-111/artifacts/SP-111C/` (checkpoint + implementation
record), `docs/stories/EP02/SP-111/artifacts/SP-111/implementation.md` (this
index), `docs/stories/EP02/SP-111/README.md` (execution fields only),
`docs/stories/EP02/SP-111/SP-111C-course-integration-signoff.md` (status
line only).

Code scope summary across the unit (baseline `11bd60e`): `apps/api` —
`courses` module only (1 new DTO, service + controller extended, 2 spec
files extended, +1 new e2e spec) + `prisma/schema.prisma` (1 nullable
column) + 1 new migration + the `semesters-e2e` constant update. API suite
totals with a database: 456 (after SP-110C) → **533** (A: unit +
data-scoping extensions) → **547** (C: +14 e2e). `apps/web` —
`entities/course/api` rewritten, `features/courses/` (3 new components),
`pages/courses/` (new page), `academic.ts`, `Header` (+ test), `App.tsx`.
Web suite totals: 340 (after SP-110B) → **423** (B).
No schema change beyond the user-confirmed `instructor` column (D111-1); no
migration, CI, `package.json` or secret changes anywhere in the unit.

## AC / DoD coverage

Per the [README traceability tables](../../README.md#source-requirements-and-test-traceability):

| Req | Owning children | Evidence |
|---|---|---|
| AC-E02-02 (courses belong to a valid semester owned by the student) | A (ownership check on create/patch; read routes principal-scoped), B (semester picker offers only the student's semesters), C (cross-student proof) | A unit + data-scoping; B form tests; C e2e (filter foreign/missing → uniform 404; B's list never carries A's ids; byte-identical row) + pre-flight |
| AC-E02-03 (students can create and edit course information) | A (API), B (UI), C (integrated proof) | A 62 unit + 51 data-scoping; B 91 component/API tests; C e2e lifecycle (create → list → edit → archive → restore, real rows) + pre-flight |
| AC-E02-05 (archived courses remain accessible with historical data) | A (detail + `includeArchived` list), B (show-archived toggle, archived badge), C (proof) | C e2e (archive → absent from default list, present with `includeArchived`, detail still returns it; the SP-110-boundary orphan case: courses survive semester deletion with `semester: null`) + pre-flight; B toggle/badge tests |

DoD map (per the README): 1 A/B/C; 2 A (DTO + service re-checks) + B (form);
3 A (every route principal-scoped, uniform 404) + C (cross-student proof);
4 A (field-level 400, specific 409, uniform 404) + B (display); 5 B (page +
form states) + C (integrated); 6 B (list, form, toggle, dialogs); 7 B
(mobile + desktop); 8 A (unit + data-scoping) + B (component) + C (e2e);
9 A (contract in the README; `instructor` migration, D111-1); 10 C (manual
browser sign-off — **CANNOT VERIFY, human gate open**) + the combined parent
review.

## Security invariants and owning proofs

Per the [README invariants table](../../README.md#security-invariants-and-counterexamples):

| Claim | Owning proof |
|---|---|
| No cross-student course read/update | A (service unit + data-scoping: principal `where` on every route; miss → uniform 404); C e2e AC2 + pre-flight (B's GET/PATCH → uniform 404 ×2; A's row byte-identical; B's list never carries A's ids) |
| `semesterId` must be the student's own semester | A (unit + data-scoping: ownership predicate in the query; miss → uniform 404 before anything is written); C e2e (filter + create/patch foreign/missing → 404) + pre-flight |
| Archiving never destroys course data | A (unit + data-scoping: flag flip, row survives); C e2e (archive → row in DB, detail returns it, `includeArchived` lists it, restore returns it; the orphan case: semester deletion leaves the courses, unaffiliated) + pre-flight dev-DB row proof |
| Per-student code uniqueness | A (unit + data-scoping: `@@unique([userId, code])` → 409 within one student, allowed across students) |

## DoD-10 item (AC2 manual sign-off) — CANNOT VERIFY (human gate open)

- **Status: CANNOT VERIFY** at closeout (2026-10-22) — the 14-step
  `/courses` walk is a **human gate** (SP-105D/SP-106D/SP-107F/SP-110C
  precedent) and no human browser session was available in the implementation
  runtime; per the ticket's own rule it is recorded CANNOT VERIFY with the
  reason rather than claimed, and no sign-off is claimed or implied until
  the session owner's ratification.
- **Standing on its own regardless:** the dev-stack bring-up + the full HTTP
  pre-flight through the web proxy (register/login, create ×3, list,
  semester filter, get, patch name+instructor, re-attach, archive,
  includeArchived, detail-on-archived, restore, cross-student 404 ×2,
  unauthenticated 401, SPA shell) and the row-level dev-DB proof (the full
  journey on CS101; B's `Hacked by B` never wrote).
- **Exact walk steps** (14 steps: register/login → header link → empty state
  → create with each invalid field → create valid → second course → edit
  pre-fill → archive dialog (focus trap, Escape, reversible wording) →
  show-archived toggle + badge → restore → keyboard pass → error state +
  retry → mobile viewport → return approval):
  [`SP-111C/implementation.md`](../SP-111C/implementation.md) → "Manual
  browser sign-off (DoD 10, AC2)".
- **Closure:** DoD 10 closes via the recorded ratification **plus** the
  combined SP-111 parent review (this review).

## Cross-child notes for the reviewer

- **F111A-1 (A, local-only, residual for the user):** `prisma migrate dev`
  refused the local dev DB due to a pre-existing checksum drift on an older
  migration; the new migration was hand-written (verified byte-equivalent to
  Prisma's generated SQL via `migrate diff`) and applied + registered
  directly. Fresh CI/`migrate deploy` databases are unaffected; clearing the
  local drift needs a `prisma migrate reset` (user approval — recorded, not a
  story blocker).
- **F111A-2 (A, fixed):** `semesters-e2e.spec.ts` pinned the old 8-key
  `POST /courses` shape; D111-4 extends it to the 13-key
  `CourseWithSemester` — the constant + one comment updated (test-only).
- **F111B-1 (B, design decision):** the backend treats an explicit `null` as
  omitted on `PATCH` — `instructor`/`credits`/`semesterId` cannot be
  **cleared** through the API (while `description` can, via `''`); the form
  implements D111B-3 so it never lies about a no-op ("leave blank to keep…"
  hint). **Reviewer attention:** if clearing these fields is desired, it is a
  contract change for a future story, not an A defect.
- **F111B-2 (B, minor ticket deviation):** `CreateCourseRequest` gains all
  five optional fields (AC 3's field list) rather than only `instructor` —
  the backend DTO already accepted them, so the API surface is unchanged.
- **F111B-3 (B, fixed):** `createCourse`'s return type moved to
  `CourseWithSemester` (D111-4); two pre-existing fixtures updated
  (`courseApi.test.ts`, `Step3Course.test.tsx` — no behavior change).
- **F111B-4/5 (B, test-only):** two latent test bugs in the new suites
  surfaced on first run (queryAllByRole; a missing `onRetry` spy; an
  over-strict row-count expectation) — fixed in the tests, no component
  change.
- **F111C-1 (C, fixed, test-only):** the uniform-404 comparison now asserts
  status + `message` + `error` (the envelope's `path`/`timestamp` are
  request-specific).
- **F111C-2 (C, process-level):** registration lowercases emails — the
  pre-flight cleanup deleted by id; dev DB restored exactly.
- **Product defects in A–B: none.** Every e2e case and pre-flight step passed
  on the first (corrected) run; no finding was raised against the owning
  children and no fix was needed in C (ticket rule: any A/B defect routes
  back to that child's owner as a finding — none occurred).

## Reviewer inputs

- Shared contract, traceability, decisions and gate:
  [SP-111 parent README](../../README.md) (Shared API contract; AC/DoD maps;
  decision register D111-1…5; quality gate; Final implementation review unit).
- Suite entry points: `apps/api` — `pnpm --filter @studypilot/api exec
  jest --runInBand` with `DATABASE_URL` set (the Postgres-backed specs
  self-skip when it is unset; they execute against the migrated local dev DB
  when it is set) or a disposable `postgres:15-alpine` + `prisma migrate
  deploy`; `apps/web` — `pnpm --filter @studypilot/web test`.
- Where this parent's verdict is recorded: `./review.md`.
