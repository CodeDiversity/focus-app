# SP-110 parent implementation index

Updated: 2026-10-21 (DoD 10 human ratification recorded; SP-110C closeout 2026-10-20)
Prepared by: implementer (single sequential writer) as SP-110C (AC4) — the
named integration/index owner for the SP-110 review unit.
Purpose: index of every child's implementation evidence for the one combined
SP-110 parent review. The review report, when the read-only reviewer returns,
is saved at `./review.md` (this directory).

## Status

All three children — A, B, C — are implemented and are hereby handed to the
combined SP-110 parent review. No child review has been performed or asserted
and none replaces this sign-off. SP-110 covers semester management: the full
API surface (A), the `/semesters` UI (B), and integrated end-to-end
verification (C) — epic AC-E02-01's management half plus the data-preservation
boundaries AC-E02-02/05 impose on semester deletion; see the [parent
README](../../README.md) for the full traceability map.

**DoD 10 is satisfied:** the manual browser sign-off (C AC3) — the 13-step
`/semesters` walk — was performed by the user on 2026-10-21 and returned
approval with no deviations reported (ratification with provenance in
[`SP-110C/implementation.md`](../SP-110C/implementation.md) → "Manual browser
sign-off (DoD 10, AC3)"; it was recorded CANNOT VERIFY at closeout 2026-10-20
until the human leg landed — no sign-off was claimed before then). DoD 10
closes via that recorded ratification **plus** the combined parent review
below. The automated wire proof (C e2e suite + the dev-stack HTTP pre-flight
through the web proxy) and the web component tests (B) stand on their own.
Everything else in the review unit is implemented and verified.

Sequence: A → B → C, one sequential writer. C is the named cross-layer
integration owner (e2e journey suite, full-suite re-runs, DoD 10 sign-off,
this index).

## Child evidence index

| Story | Delivered | Implementation | Checkpoint | Commits |
|---|---|---|---|---|
| [A](../../SP-110A-semester-management-api.md) | Full semester management API: `GET /semesters` (list + `courseCount`, `startDate` desc / `name` asc), `GET /semesters/:id`, `PATCH` (partial merge, validation on merged values, single-active activation, D110-1), `DELETE` (courses orphaned, D110-2) — all principal-scoped, uniform-404; no schema change | [implementation](../SP-110A/implementation.md) | [checkpoint](../SP-110A/checkpoint.md) | `85d665e` |
| [B](../../SP-110B-semester-management-ui.md) | `/semesters` page (FSD): list (name, readable dates, Active badge, course count, API order), create/edit form, activate/deactivate, delete-with-confirmation (focus trap + Escape); loading/empty/error+retry, keyboard, responsive; header "Semesters" link; route inside `ProtectedRoute`; `semesterApi` covers the full contract | [implementation](../SP-110B/implementation.md) | [checkpoint](../SP-110B/checkpoint.md) | `c5e3fb5` |
| [C](../../SP-110C-semester-integration-signoff.md) | Real-Postgres e2e student-journey suite (10 tests: full lifecycle, cross-student matrix, single-active race, delete-orphan proof); full-suite re-runs; dev-stack HTTP pre-flight; DoD 10 sign-off **PASSED** (human walk ratified 2026-10-21); this parent index | [implementation](../SP-110C/implementation.md) | [checkpoint](../SP-110C/checkpoint.md) | `fed59dc` (closeout commit) |

## Per-child scope and verification

- **A** (backend, `85d665e`): `semesters` module extended to the full
  management surface — `update-semester.dto.ts` (new), service
  (`list`/`get`/`update`/`delete`, single-active transaction, delete-orphan
  transaction, uniform-404 on every miss), controller (4 routes,
  `@HttpCode(NO_CONTENT)` on DELETE — F110A-1), 42 unit + 31 data-scoping
  tests. At its commit: API **33/33 suites, 446/446 tests, 0 skipped** on a
  disposable migrated Postgres; typecheck + lint clean. Findings F110A-1/2 —
  both fixed in the committed code.
- **B** (frontend, `c5e3fb5`): `SemesterList` / `SemesterForm` /
  `DeleteSemesterDialog` (new features), `SemestersPage` (new page),
  `semesterApi` (extended to the full contract), `Header` (link + test),
  `App.tsx` (route). At its commit: web **31/31 files, 340/340 tests** (incl.
  the 61 new/extended SP-110B tests); typecheck + lint + build clean.
  Findings F110B-1…5 — fixed or recorded design decisions (F110B-1 re-fetch
  after create; F110B-2 local-date formatting — both noted below).
- **C** (integration, this closeout commit): `semesters-e2e.spec.ts` (new —
  10 tests on real Postgres, self-cleaning); **no production, schema,
  migration, harness, `package.json` or CI change** (the `test-http` harness
  already carries the semesters + courses modules — no wiring needed).
  Re-verified at closeout: API **34/34 suites, 456/456 tests, 0 skipped** on
  a disposable migrated Postgres; 8 suites self-skip (344 pass) without a
  database; typecheck + lint + format clean; dev-stack HTTP pre-flight through
  the web proxy all green; dev DB restored to its pre-run state; **DoD 10
  human browser walk ratified 2026-10-21** (user approval, no deviations
  reported — browser/version not provided, recorded limitation). Findings
  F110C-1/2 — recorded, no action (expected P2025 log; pre-flight script
  bug, re-run corrected). **Product defects in A–B: none** — every e2e case
  and pre-flight step passed on the first (corrected) run.

## Combined Git scope for the review

Baseline: `37db4b0` (the plan commit, before the first SP-110 change).

| Commit | Content |
|---|---|
| `85d665e` | SP-110A — 10 files: `update-semester.dto.ts` (new), `semesters.service.ts` + spec (+427 lines) + `semesters-data-scoping.spec.ts` (+398) + controller + module header, README execution fields, `artifacts/SP-110A/` |
| `c5e3fb5` | SP-110B — 17 files: `semesterApi` (+ test), `SemesterList`/`SemesterForm`/`DeleteSemesterDialog` (+ tests), `SemestersPage` (+ test), `Header` (+ new test), `App.tsx`, README execution fields, `artifacts/SP-110B/` |
| `fed59dc` | SP-110C — 6 files: `semesters-e2e.spec.ts` (new, 10 tests), README execution fields, `SP-110C` status line, `artifacts/SP-110C/` (checkpoint + implementation record), `artifacts/SP-110/implementation.md` (this index) |

No non-SP-110 commit lies inside the range `37db4b0..c5e3fb5`. Working-tree
paths committed by C's closeout commit (baseline `c5e3fb5`):
`apps/api/src/modules/semesters/semesters-e2e.spec.ts` (new),
`docs/stories/EP02/SP-110/artifacts/SP-110C/` (checkpoint + implementation
record), `docs/stories/EP02/SP-110/artifacts/SP-110/implementation.md` (this
index), `docs/stories/EP02/SP-110/README.md` (execution fields only),
`docs/stories/EP02/SP-110/SP-110C-semester-integration-signoff.md` (status
line only).

Code scope summary across the unit (baseline `37db4b0`): `apps/api` —
`semesters` module only (1 new DTO, service + controller extended, 2 spec
files extended, +1 new e2e spec). API suite totals with a database: 400
(after SP-107F) → **446** (A: unit + data-scoping extensions) → **456** (C:
+10 e2e). `apps/web` — `entities/semester/api` extended,
`features/semesters/` (3 new components), `pages/semesters/` (new page),
`Header` (+ new test), `App.tsx`. Web suite totals: 283 (after SP-107E) →
**340** (B: 61 new/extended tests). No schema, migration, CI, `package.json`
or secret changes anywhere in the unit.

## AC / DoD coverage

Per the [README traceability tables](../../README.md#source-requirements-and-test-traceability):

| Req | Owning children | Evidence |
|---|---|---|
| AC-E02-01 (create semesters with start/end dates — management half) | A (API), B (UI), C (wire proof) | A unit + data-scoping; B component tests; C e2e AC1 (full lifecycle, real rows) + pre-flight |
| AC-E02-02 boundary (courses belong to a valid semester; courses survive deletion) | A (delete-orphan transaction), C (proof) | A data-scoping; C e2e (two courses survive with `semesterId: null`) + pre-flight row proof |
| AC-E02-05 boundary (no course data destroyed by semester deletion) | A, C | as above — the explicit `updateMany` setNull, not the schema's implicit default |
| DoD 1 (functional criteria) | A, B, C (integrated) | per-child AC tables; C e2e + pre-flight |
| DoD 2 (invalid-input validation) | A (DTO + service re-check on merged values), B (form client rules) | A 400 matrix; B form validation tests |
| DoD 3 (student data scoping) | A (every route principal-scoped, uniform 404), C (cross-student proof) | A data-scoping matrix; C e2e AC2 + pre-flight (byte-identical row) |
| DoD 4 (actionable API errors) | A (field-level 400, specific 409, uniform 404), B (display) | A + B tests; C pre-flight |
| DoD 5 (loading/empty/error states) | B, C (integrated) | B page state tests; C pre-flight (the human leg covers the rendered states — ratified 2026-10-21) |
| DoD 6 (keyboard accessibility) | B | B a11y tests (focus order, dialog trap, Escape, `aria-live`) |
| DoD 7 (responsive layouts) | B | B mobile-viewport tests |
| DoD 8 (automated business-rule tests) | A (unit + data-scoping), B (component), C (e2e) | as above — 83 API + 64 web + 10 e2e new tests |
| DoD 9 (API/migration documentation) | A (contract in the README; **no migration — no schema change**) | README Shared API contract |
| DoD 10 (integrated development review) | C (manual browser sign-off) + the combined parent review | **satisfied** — human walk ratified 2026-10-21; closes via the combined parent review (below) |

## Security invariants and owning proofs

Per the [README invariants table](../../README.md#security-invariants-and-counterexamples):

| Claim | Owning proof |
|---|---|
| No cross-student semester read/update/delete | A (service unit + data-scoping: principal `where` on every route; `userId` in the body → 400, never honored; miss → uniform 404); C e2e AC2 + pre-flight (B's GET/PATCH/DELETE → uniform 404 ×3; A's row byte-identical; B's list never carries A's ids) |
| At most one active semester per student (D110-1) | A (unit + data-scoping race: one transaction, both writes `userId`-scoped); C e2e race (two parallel activations → both 200, exactly one active afterwards, last-write-wins) + pre-flight (wire shows exactly one active) |
| Semester deletion never destroys course history | A (data-scoping: one transaction setNull + scoped delete); C e2e (two courses survive with `semesterId: null`) + pre-flight dev-DB row proof |
| Calendar dates stay calendar dates (D107-7) | A (strict `yyyy-MM-dd` parse + end-after-start on merged values → 400); B (form refinement + local-date rendering, F110B-2); C e2e (dates round-trip `yyyy-MM-dd` on the wire) |

## DoD-10 item (AC3 manual sign-off) — ratified 2026-10-21

- **Status: PASSED.** The 13-step `/semesters` browser walk was performed by
  the user on 2026-10-21 and returned approval with **no deviations
  reported**. Provenance: who — the user (session owner); when — 2026-10-21;
  browser/version — **not provided** (recorded limitation: the approval is
  at the feature level); per-step observations — none reported.
- **History:** recorded **CANNOT VERIFY** at closeout (2026-10-20) — the
  walk is a human gate (SP-105D/SP-106D/SP-107F precedent) and no human
  browser session was available in the implementation runtime; no sign-off
  was claimed until the ratification above.
- **Standing on its own regardless:** the dev-stack bring-up + the full HTTP
  pre-flight through the web proxy (register/login, create, list, get,
  patch, activate, attach courses, delete, re-list, cross-student 404 ×3,
  unauthenticated 401, SPA shell) and the row-level dev-DB proof (orphaned
  courses, untouched active semester).
- **Exact walk steps** (13 steps: register/login → header link → empty
  state → create with validation → second semester → edit pre-fill →
  activate/deactivate (single-active badge) → course count → delete dialog
  (focus trap, Escape, D110-2 warning) → keyboard pass → error state + retry
  → mobile viewport → return approval):
  [`SP-110C/implementation.md`](../SP-110C/implementation.md) → "Manual
  browser sign-off (DoD 10, AC3)".
- **Closure:** DoD 10 closes via the recorded ratification **plus** the
  combined SP-110 parent review (this review).

## Cross-child notes for the reviewer

- **F110A-1 (A, fixed):** Nest 10.4 returns 200, not 204, for a void DELETE
  handler — explicit `@HttpCode(HttpStatus.NO_CONTENT)` on
  `SemestersController.remove` supplies the contract's 204.
- **F110B-1 (B, design decision):** `POST /semesters` returns the 7-key
  `Semester` (SP-107B contract, unchanged — the onboarding consumer keeps it);
  the page therefore **re-fetches the list after a successful create**
  instead of appending, keeping the 8-key shape + API order uniform across
  all mutations.
- **F110B-2 (B, design decision):** readable dates never round-trip
  `yyyy-MM-dd` through an instant (D107-7) — `formatCalendarDate` builds a
  local date from the components and renders `dateStyle: 'medium'`.
- **F110B-4 (B, tooling):** the dialog's Escape/Tab trap is attached
  **imperatively** (a `keydown` listener on the dialog element) because
  `jsx-a11y` forbids JSX `onKeyDown` on `role="dialog"` — behavior unchanged,
  tests green.
- **F110C-1 (C, recorded):** `prisma:error` P2025 log lines from the scoped
  `semester.delete()` on the uniform-404 delete path are Prisma's internal
  logging, not a defect — the service converts to uniform 404 and rolls back;
  behavior pinned by A's specs + this e2e.
- **Product defects in A–B: none.** Every e2e case and pre-flight step passed
  on the first (corrected) run; no finding was raised against the owning
  children and no fix was needed in C (ticket rule: only a harness-wiring
  defect would be fixed there — none occurred).

## Reviewer inputs

- Shared contract, traceability, decisions and gate:
  [SP-110 parent README](../../README.md) (Shared API contract; AC/DoD maps;
  decision register D110-1…6; quality gate; Final implementation review unit).
- Suite entry points: `apps/api` — `pnpm --filter @studypilot/api exec
  dotenv -e .env.local -- npx jest --runInBand` (the Postgres-backed specs
  self-skip when `DATABASE_URL` is unset; they execute against the migrated
  local dev DB when it is set) or a disposable `postgres:15-alpine` +
  `prisma migrate deploy`; `apps/web` — `pnpm --filter @studypilot/web exec
  vitest run`.
- Where this parent's verdict is recorded: `./review.md`.
