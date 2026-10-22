# SP-111 Final Combined Parent Implementation Review

**Review date:** 2026-10-22
**Mode:** Implementation review — one combined SP-111 parent review after all
children and the integration obligation are implemented (per
[.agents/review-cadence.md](../../../../../.agents/review-cadence.md); no
per-child review gates).
**State reviewed:** commit `d4f5c14` (`d4f5c14878c60086e2adce0a4dd665bf022865e3`),
clean working tree (re-verified post-compaction via a read-only git helper:
`git rev-parse HEAD` + `git status --porcelain`, both exit 0).
**Review unit:** SP-111 — `docs/stories/EP02/SP-111/` — children A (API),
B (UI), C (integration sign-off) + the parent index. SP-112 (meetings / course
detail) is out of scope.
**Report path:** `docs/stories/EP02/SP-111/artifacts/SP-111/review.md`
(colocated artifact root per the breakdown README). Final combined review —
verdict **PASS** with one user-waived finding (recorded below); final
walkthrough: [walkthrough.md](./walkthrough.md).

## Scope and inputs

- [Parent README](../../README.md) — execution queue, decisions D111-1…5,
  shared API contract, traceability, security invariants, quality gate,
  final review unit.
- [Parent ticket](../../SP-111-course-management.md) (coordination record),
  child tickets [A](../../SP-111A-course-management-api.md) /
  [B](../../SP-111B-course-management-ui.md) /
  [C](../../SP-111C-course-integration-signoff.md).
- [EP02 epic](../../../../epics/EP02-semester-and-course-management.md) and the
  [shared DoD](../../../../epics/README.md#definition-of-done) (11 items).
- Implementation records: [parent index](./implementation.md),
  [A](../SP-111A/implementation.md), [B](../SP-111B/implementation.md),
  [C](../SP-111C/implementation.md) + the three checkpoints.
- Code: `apps/api/src/modules/courses/` (service, controller, both DTOs,
  unit + data-scoping + e2e specs), `apps/api/prisma/schema.prisma` +
  migration `20261021000000_course_instructor`,
  `apps/web/src/entities/course/api/courseApi.ts`,
  `apps/web/src/features/courses/ui/` (CourseList, CourseForm,
  ArchiveCourseDialog), `pages/courses/ui/CoursesPage.tsx`,
  `shared/types/academic.ts`, `widgets/header/ui/Header.tsx`, `app/App.tsx`.
- Baseline `11bd60e` (pre-SP-111) files recovered via read-only `git show`
  (helper; exit 0).

## Combined Git scope (verified)

Range `11bd60e..HEAD` = `11f501e` (A), `c0ccb7d` (B), `36e272a` (C closeout),
`7ae6ad0` (F111C-3 swatch fix), `d4f5c14` (docs-only DoD-10 ratification).
25 files under `apps/` — the `courses` module only (API), `entities/course` +
`features/courses` + `pages/courses` + `academic.ts` + `Header` + `App.tsx`
(web), `schema.prisma` (+1 nullable column) + one new migration. No CI,
`package.json`, harness, or secret changes. The parent index's commit table
matches the actual range.

## Gate evidence (reviewer-executed via bounded helper)

Code Mode has no shell tool in this runtime; the gates were executed by a
bounded general subagent helper under the same no-mutation restrictions
(delegated, disclosed). All commands exited 0 at HEAD `d4f5c14` (clean tree,
re-verified after compaction — the tested state is unchanged, so the recorded
results are reused rather than rerun; full raw output was not preserved in the
compaction handoff, so the recorded concise results are reported):

| Gate | Command (cwd) | Recorded result |
|---|---|---|
| API full suite, with DB | `DATABASE_URL=<disposable sp111-review-pg, postgres:15-alpine:5433, prisma migrate deploy> pnpm --filter @studypilot/api exec jest --runInBand` (repo root) | 35/35 suites, 547/547 tests, 0 skipped; self-cleaning (0 users / 0 semesters / 0 courses after the run); local dev DB on 5432 untouched; container removed after use |
| API full suite, no DB | `pnpm --filter @studypilot/api exec jest --runInBand` (repo root) | 26 suites pass, 9 integration suites self-skip, 385 tests pass |
| API typecheck | `pnpm --filter @studypilot/api typecheck` | clean |
| API lint | `eslint --max-warnings 0` over the 8 changed API TS files (run without `--fix` — the package script embeds `--fix`; non-mutating equivalent) | clean |
| API format | `prettier --check` on the changed API TS files | clean (`prisma/schema.prisma` is not Prettier-checkable — `prettier-plugin-prisma` is absent from the workspace; pre-existing config gap, not an SP-111 change) |
| Web full suite | `pnpm --filter @studypilot/web test` (repo root) | 35 files / 425 tests, all pass |
| Web typecheck / lint / format | `tsc --noEmit`, `eslint --max-warnings 0`, `prettier --check` over the 15 changed web files | clean |

## Findings

| ID | Severity | Child / location | Summary |
|---|---|---|---|
| F-111R-1 | **should-fix** | A/B/C + parent index (required implementation deliverables) | The delivered `CourseWithSemester` shape has exactly **12** keys and the pre-SP-111 baseline shape had **9**, but the required implementation records claim **13** and **8** (off-by-one in both directions) |
| F-111R-2 | polish | A/B/C (code comments + test titles) | The same off-by-one labels in code comments and test titles of SP-111-changed files |
| F-111R-3 | polish | planning docs (planner-owned) | The baseline is described as "8 keys" in the breakdown README and child tickets; D111-4's prose also omits `semesterId` from the added-keys list |

### F-111R-1 — inaccurate key-count claims in the required implementation
deliverables (should-fix)

**Requirement / source:** the implementation records are required deliverables
of the review unit (C AC3 writes the parent index; each child's record and
checkpoint are its evidence). The shared API contract in the
[parent README](../../README.md#shared-api-contract) enumerates
`CourseWithSemester` as **12 keys**: `id, code, name, description, color,
credits, instructor, isActive, semesterId, semester, createdAt, updatedAt`
(README L104-107).

**Observed gap (verified against code, not record claims):**

- `courses.service.ts` `toResponse` (L392-407) returns exactly **12** keys.
- `courses-e2e.spec.ts` `COURSE_KEYS` (L68-81) asserts exactly those **12**
  keys on every route (L214/233/272/317).
- Web `CourseWithSemester` = 10-field `Course` (9 baseline + `instructor`) +
  `semesterId` + `semester` = **12** fields (`courseApi.ts` L27-30,
  `academic.ts` L13-25).
- Baseline `11bd60e` (read-only `git show`, helper, exit 0): API `toResponse`
  = **9** keys (`id, code, name, description, color, credits, isActive,
  createdAt, updatedAt` — no `semesterId`, consistent with the README's
  "deliberately no `semesterId`"); web `Course` = 9 fields; `createCourse`
  returned the 9-field `Course`.
- The binding contract enumeration (12) is correct and the code matches it;
  the numeric *labels* are wrong.

**Occurrences (all verified in the current tree):**

- `13-key` / `13 keys` (actual: 12): parent index L42, L197; A record L41,
  L45, L57 (×2), L98; A checkpoint L17, L21; B record L43, L70; B checkpoint
  L17; C record L40 (×2), L87, L90; C checkpoint L32.
- `8-key` / `8 keys` for the baseline (actual: 9): parent index L196; A record
  L96; A checkpoint L32; B record L116; B checkpoint L37.

**Consequence:** the review unit's own completion evidence misstates the
delivered API shape (13 ≠ 12) and the baseline it extended (8 ≠ 9). A reader
relying on the records would expect a 13-key wire shape that does not exist;
the off-by-one also fails the records' own arithmetic (8 + `instructor` +
`semesterId` + `semester` = 11, not 13).

**Severity rationale:** an inaccurate completion claim in a required
deliverable (documentation-only) → should-fix per the severity contract;
green tests and the correct contract enumeration cannot downgrade it.

**Owner:** implementer (single sequential writer of all seven deliverable
files).

**Closure condition (superseded):** correct every `13-key`/`13 keys` →
`12-key`/`12 keys` and every `8-key`/`8 keys` → `9-key`/`9 keys` **for the
course shape** in the seven SP-111 deliverable files, in one commit.

**Disposition (2026-10-22): closed by user waiver — no fix round.** The user
confirmed the inaccuracy is documentation-only and directed that it be
bypassed. Waiver scope (recorded per the severity contract — source: user,
2026-10-22): the descriptive key-count labels in the SP-111 implementation
records/checkpoints, code comments/test titles, and planning prose (all of
F-111R-1/2/3). Condition verified before applying: the binding contract
enumeration (12 keys), the code, and every test assertion are mutually
consistent; no functional, security, or test-assertion impact; all gates
green at `d4f5c14`. The residual labels remain in the tree as-is; no re-review
is required for this finding.

### F-111R-2 — the same off-by-one labels in code comments and test titles
(polish)

**Observed gap:** `courses.service.ts` L15, L387 ("8-key");
`courses-data-scoping.spec.ts` L12, L43 ("8 keys"); `courses-e2e.spec.ts`
L65 ("8 keys"), L197 + L311 (test titles "13-key"); `courseApi.ts` L20
("8 keys"); `courseApi.test.ts` L30, L31; `Step3Course.test.tsx` L39, L40;
`semesters-e2e.spec.ts` L60 (the `COURSE_KEYS` comment updated by A under
F111A-2 — "8 keys").

**Severity rationale:** comments/titles only — the tests assert the correct
12 keys and the binding contract enumeration is correct; no unmet obligation,
no effect on verifying the review scope → polish. (Scope note: the semester
"8-key" references in `semesters-e2e.spec.ts` L17/L188/L222,
`semesters-data-scoping.spec.ts` L27, `semesterApi.ts` L52,
`semesterApi.test.ts` L111 and `SemesterList.test.tsx` L9 describe the
8-key `SemesterWithCount` shape — correct, SP-110-reviewed, out of scope.)

**Owner:** implementer. **Closure:** same correction pass as F-111R-1
(optional; does not block a passing verdict).

**Disposition (2026-10-22): accepted as-is** under the same user decision
that waived F-111R-1 (no fix round; comments/titles only — no functional
impact).

### F-111R-3 — planning-doc baseline prose (polish)

**Observed gap:** README L54 ("`toResponse` = 8-key shape"), L56 ("the
`Course` type … has the 8 keys"), L66 (D111-4: "the existing 8-key `Course` +
`instructor` + `semester`"); A ticket L101 ("`toResponse` 8-key projection");
B ticket L86 ("`Course` 8-key type"). The baseline was 9 keys. D111-4's prose
also omits `semesterId` from the added-keys list (the shape adds three keys:
`instructor`, `semesterId`, `semester`). The binding 12-key enumeration block
(README L104-107) is correct.

**Severity rationale:** planning prose with the correct binding enumeration
elsewhere; optional wording cleanup → polish.

**Owner:** planner. **Closure:** correct the prose (may be batched with the
F-111R-1 fix pass or deferred; does not block a passing verdict).

**Disposition (2026-10-22): accepted as-is** under the same user decision
that waived F-111R-1 (no fix round; planning prose with the correct binding
enumeration elsewhere).

## Acceptance criteria (per child)

### SP-111A — Course Management API

| AC | Result | Evidence |
|---|---|---|
| 1 — `GET /courses` principal-scoped, name/code order, `?semesterId` (foreign/missing → uniform 404), `?includeArchived`, 401 | **Satisfied** | `courses.service.ts` `list` L182-207 (ownership predicate L188-194, `where: { userId, … }` L198-202, `orderBy` L204); controller L58-68; 62 unit + 51 data-scoping tests (gate: 547/547 with DB); e2e L259-309 |
| 2 — `GET /courses/:id` archive-agnostic; missing/foreign → uniform 404 | **Satisfied** | `get` L216-225 (`findFirst({ where: { id, userId } })`, no `isActive` filter); e2e L311-326 + archive case L390-395 (detail on archived course → 200) |
| 3 — `PATCH` partial merge; merged-value validation (code/name/credits/color/description/instructor); `semesterId` ownership with **no write**; 409 code collision | **Satisfied** | `update` L248-383 (ownership read L249, at-least-one-field L259-270, semester check before merge L275-283, merged validation L289-325, scoped `update({ where: { id, userId } })` L364-365, P2002→409 L372-373, P2025→uniform 404 L375-378); `update-course.dto.ts` (7 optional fields + `isActive`); e2e L328-362 |
| 4 — Archive/restore via `isActive` flip; row survives; no hard-delete route | **Satisfied** | merge L359-361; controller has exactly POST/GET/GET:ID/PATCH (L45/L58/L77/L95) — no DELETE; e2e L364-411 (row survives, default list excludes, `includeArchived` includes, detail returns, restore) |
| 5 — `POST /courses` optional `instructor` (trimmed; whitespace-only → 400; omitted → null) + extended response; other SP-107B behavior unchanged | **Satisfied** | `create` L90-168 (trim L98-99, validate L117-119, semester ownership L133-142, P2002→409 L163-164); `create-course.dto.ts` `@IsOptional @IsString @Matches(/\S/) @MaxLength(100)`; response = the 12-key shape (L392-407) |
| 6 — All routes 401 unauthenticated; `userId` never from the body | **Satisfied** | global APP_GUARD (no class-level guards, controller L18-22); global `FieldValidationPipe` `whitelist` + `forbidNonWhitelisted`; e2e L506-521 (401 on all four routes) |

DoD coverage per the README map: 1/2/3/4/8/9 as evidenced above; 5-7 N/A
(backend-only child); 10 via C + this review.

### SP-111B — Course Management UI

| AC | Result | Evidence |
|---|---|---|
| 1 — `/courses` inside `ProtectedRoute`; header "Courses" link after Semesters with active-state styling | **Satisfied** | `App.tsx` route (inside the `ProtectedRoute` block); `Header.tsx` link + `Header.test.tsx` (shown authenticated / hidden unauthenticated / active highlight) |
| 2 — List rows (chip/code/name/semester/"No semester"/credits), show-archived toggle + Archived badge, loading/empty/error + retry | **Satisfied** | `CourseList.tsx` + 10 tests; `CoursesPage.tsx` + 14 tests (single `includeArchived=true` fetch, client-side toggle per D111B-1, error + retry); web gate 425/425 |
| 3 — Create form (dialog): all fields incl. `instructor`; client rules mirror backend; 400 per-field; 409/404 form-level; success refresh | **Satisfied** | `CourseForm.tsx` (RHF + Zod; color is the F111C-3 swatch radiogroup — L24 `#6366f1` default, L454 `role="radiogroup"`, L464 `role="radio"`, roving focus L197-217) + 36 tests (34 + 2 swatch cases); `CoursesPage` create flow |
| 4 — Edit: same form pre-filled (incl. instructor + semester); `PATCH` partial merge; row refresh | **Satisfied** | `CourseForm` edit prefill tests (incl. "No semester" disabled while attached, D111B-3 null-no-op honesty); `CoursesPage` edit: PATCH + re-read + announcement |
| 5 — Archive/restore row actions + confirmation dialog (reversible wording); `PATCH { isActive }`; row updated | **Satisfied** | `ArchiveCourseDialog.tsx` + 9 tests (confirm → PATCH, cancel → nothing, focus trap + Escape return); `CoursesPage` archive/restore flows |
| 6 — Keyboard-operable rows/toggle/fields/both dialogs; focus trap + return; real switch; text badges; responsive | **Satisfied** | `role="switch"` with accessible name; text Archived badge; keyboard-only completion + focus-trap tests; `role="status"` live region (L528 `role="alert"` for errors); responsive container tests; DoD-10 walk steps 11 + 13 (user-performed, ratified) |
| 7 — Detail page + row links excluded (SP-112) | **Satisfied (by design)** | no `Link`/`href` in `CourseList`; nothing navigates to a course detail |

DoD coverage: 1/2/4/5/6/7/8 as evidenced (91 new component/API tests; 3/9 N/A
— consumes A's principal-scoped routes, no API change); 10 via C + this review.

### SP-111C — Integration Sign-off

| AC | Result | Evidence |
|---|---|---|
| 1 — E2E spec (new): lifecycle, semester filter, cross-student matrix, orphan, 401s | **Satisfied** | `courses-e2e.spec.ts` (14 tests: lifecycle 8 + filter 2 + orphan 1 + cross-student 2 + 401 1 — counts reconcile with the record's case table); reviewer-executed on a disposable migrated Postgres: 14/14, full API suite 547/547, self-cleaning 0/0/0 |
| 2 — Manual browser sign-off (DoD 10) | **Satisfied** | user-performed 14-step `/courses` walk 2026-10-22: approved with one deviation (F111C-3 color field) — fixed `7ae6ad0` (swatch radiogroup, verified in `CourseForm.tsx`) and re-confirmed by the user the same day. Provenance recorded (who/when; browser/version not provided — recorded limitation per the SP-110C precedent). The implementer's own wire leg (dev-stack HTTP pre-flight, 14 steps through the web proxy, all green) stands alongside it |
| 3 — Parent index | **Satisfied** (with finding) | `artifacts/SP-111/implementation.md` written and complete in scope/structure — but carries the F-111R-1 key-count inaccuracies (L42, L197) |

DoD coverage: 1/3/8 as evidenced; 2/10 via the ratified walk + this review;
4-7 through A/B evidence + the walk; 9 N/A (no API/migration change in C).

## DoD checklist (shared, docs/epics/README.md)

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | Functional ACs pass | **PASS** | A 6/6, B 7/7, C 3/3 (tables above) |
| 2 | Frontend + backend validation | **PASS** | backend: DTO decorators + service re-checks (create L101-127, update L296-325); frontend: RHF + Zod mirror (CourseForm) |
| 3 | Academic data scoped to the authenticated student | **PASS** | every route carries the principal in the `where` (service L135, L189, L199, L218, L249, L277, L365); uniform 404 on every miss; cross-student proofs: data-scoping spec (51 tests) + e2e (byte-identical row, wire-level list scoping) |
| 4 | Actionable API errors | **PASS** | field-level 400 `errors` map, specific 409 message, uniform 404 `Resource not found` (ownership.ts convention) |
| 5 | Loading/empty/error states | **PASS** | CourseList loading/empty+CTA/error+retry; CoursesPage flows (14 tests) |
| 6 | Keyboard accessibility | **PASS** | real switch, focus trap + return in both dialogs, swatch radiogroup with roving focus, text badges, live region; DoD-10 keyboard step ratified |
| 7 | Responsive layouts | **PASS** | responsive container tests; DoD-10 mobile-viewport step ratified |
| 8 | Automated business-rule tests | **PASS** | A: 62 unit + 51 data-scoping; B: 91 component/API; C: 14 e2e — all green (gates above) |
| 9 | API changes + migrations documented | **PASS** | contract in the breakdown README (12-key enumeration — correct); `instructor` migration created + documented in record A (hand-written SQL verified byte-equivalent to `prisma migrate diff` output, F111A-1) |
| 10 | Reviewed in an integrated development environment | **PASS** | DoD-10 human walk ratified 2026-10-22 (PASSED with one deviation, F111C-3, since fixed + re-confirmed) + this combined parent review |
| 11 | Reviewer walkthrough saved | **PASS** | [walkthrough.md](./walkthrough.md) saved beside this report (verified on disk) — the reviewer-owned final deliverable, produced on this passing final review |

## Security invariants (README) — all verified

| Invariant | Result |
|---|---|
| No cross-student course read/update (uniform 404, no existence oracle) | **PASS** — ownership predicate in every query; e2e: B's GET/PATCH → uniform 404 ×2, A's row byte-identical, B's list never carries A's ids |
| `semesterId` must be the student's own semester (404 before any write) | **PASS** — service L133-142 / L187-195 / L275-283; e2e + data-scoping |
| Archiving never destroys course data | **PASS** — flag flip; row survives in DB; detail + `includeArchived` return it; orphan case: semester deletion leaves courses with `semester: null` |
| Per-student code uniqueness (409 within a student, allowed across students) | **PASS** — `@@unique([userId, code])`; P2002 → specific 409 (service L163-164, L372-373); unit + data-scoping |

Out of scope for the MVP (AI, syllabus parsing, LMS, grades, flashcards,
native mobile): none present.

## Verdict

**PASS** — with one user-waived finding. The feature meets every acceptance
criterion (A 6/6, B 7/7, C 3/3) and all DoD conditions 1-11 (all four
security invariants hold; all gates green at `d4f5c14`; DoD 11 satisfied by
[walkthrough.md](./walkthrough.md), saved and verified beside this report).

The one should-fix finding, F-111R-1 (inaccurate key-count labels in the
required implementation records — "13-key"/"8-key" where the verified actuals
are 12/9), was **closed by user waiver on 2026-10-22** rather than a fix
round: the user confirmed the inaccuracy is documentation-only and directed
that it be bypassed. The waiver is recorded with source (user, 2026-10-22)
and precise scope (the descriptive key-count labels in F-111R-1/2/3 — records,
checkpoints, code comments/test titles, planning prose; no functional,
security, or test-assertion impact; the binding contract enumeration, code,
and tests are all consistent at 12 keys). F-111R-2 and F-111R-3 (polish) are
accepted as-is under the same decision. With the should-fix closed by waiver,
no open blocker or should-fix remains — the verdict is pass.

**Known residual (accepted):** the key-count labels remain in the seven
deliverable files, the code comments/test titles, and the planning prose as
described in F-111R-1/2/3 above.

**Docs sync performed on this passing verdict** (reviewer scoped writes):
breakdown README correction log (F-111R-1/2/3 with dispositions and waiver
provenance), execution queue (status line, all three child rows → `Reviewed`,
Active/Next sub-story, final-review links), and the parent ticket status line.
The final `walkthrough.md` and this report are saved and verified before that
sync.

**Next:** no re-review required — the SP-111 review unit is signed off.
Remaining bookkeeping is the coordinator's: commit the reviewer outputs (this
report, `walkthrough.md`, the README/parent-ticket sync edits) in a scoped
reviewer-output commit; optionally reconcile the three child ticket status
lines (still "awaiting parent review") with the queue, which is now
`Reviewed`.
