# SP-107 Breakdown — Onboarding Wizard

**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Parent:** [SP-107](./SP-107-onboarding-wizard.md), existing Jira STUDY-8
**Milestone:** M1
**Status:** Planned 2026-10-18 — breakdown complete (six children A–F); quality
gate finalized in the last commit. No implementation performed or claimed.

## Execution queue

**Delivery home:** `docs/stories/EP01/SP-107/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-107/` (created when the parent
checkpoint/index is written)

**Active substory:** None (all children implemented)

**Next substory:** None (all children implemented; the combined SP-107 parent review is next — see Final implementation review unit)

**Implementation owner:** `implementer`, sequential across all layers (A → B → C →
D → E → F; backend/frontend/integration are scope labels, not concurrent writers).

**Final review:** One combined SP-107 review after every child and the integration
obligation are implemented; no automatic child reviews. Final artifact path:
`./artifacts/SP-107/review.md`; integration/index owner: SP-107F (parent index
written at `./artifacts/SP-107/implementation.md`).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-107A-onboarding-state-backend.md) | Implemented — awaiting parent review | SP-104 implemented and reviewed (STUDY-10 review PASS); SP-106 implemented in code (upstream review state noted below) | Parent review (combined SP-107 review after all children) | `./artifacts/SP-107A/` — [implementation record](./artifacts/SP-107A/implementation.md) (2026-10-18: 28/28 suites, 327/327 tests, zero skips) |
| [B](./SP-107B-minimal-semester-course-endpoints.md) | Implemented — awaiting parent review | SP-104 implemented (global guard + ownership helpers verified in code) | Parent review (combined SP-107 review after all children) | `./artifacts/SP-107B/` — [implementation record](./artifacts/SP-107B/implementation.md) (2026-10-18: 32/32 suites, 390/390 tests, zero skips) |
| [C](./SP-107C-wizard-shell-and-step1.md) | Implemented — awaiting parent review | A implemented (onboarding state endpoints); SP-106C/E implemented in code (`PATCH /users/me` + `Select`) | Parent review (combined SP-107 review after all children) | `./artifacts/SP-107C/` — [implementation record](./artifacts/SP-107C/implementation.md) (2026-10-18: 22/22 files, 238/238 tests, zero skips) |
| [D](./SP-107D-wizard-step2-semester.md) | Implemented — awaiting parent review | B implemented (`POST /semesters`); C implemented (wizard shell) | Parent review (combined SP-107 review after all children) | `./artifacts/SP-107D/` — [implementation record](./artifacts/SP-107D/implementation.md) (2026-10-18: 24/24 files, 258/258 tests, zero skips) |
| [E](./SP-107E-wizard-step3-course.md) | Implemented — awaiting parent review | B implemented (`POST /courses`); C implemented (wizard shell) | Parent review (combined SP-107 review after all children) | `./artifacts/SP-107E/` — [implementation record](./artifacts/SP-107E/implementation.md) (2026-10-18: 26/26 files, 283/283 tests, zero skips) |
| [F](./SP-107F-wizard-integration.md) | Implemented — awaiting parent review | A–E implemented | Parent review (combined SP-107 review after all children) | `./artifacts/SP-107F/` — [implementation record](./artifacts/SP-107F/implementation.md) (2026-10-18: e2e 10/10 on real Postgres; API 33/33 suites, 400/400 tests, zero skips; web 26/26 files, 283/283 tests; DoD 10 manual sign-off CANNOT VERIFY — human closure path recorded) · closeout commit `b2662d0` |

The queue is the current execution record. All six children (SP-107A,
SP-107B, SP-107C, SP-107D, SP-107E, SP-107F) are implemented (2026-10-18,
awaiting the combined parent review); the next step is the combined SP-107
parent review (Final implementation review unit — one review after every
child and the integration obligation).

## Upstream dependency status (2026-10-18)

- **SP-103 (STUDY-12):** implemented in code (`email-verification.service.ts`,
  banner, routes all present). Its latest review still lacks integrated DoD-10
  evidence per the [EP01 README](../README.md) quality gate — a review gap on
  SP-103's own sign-off, not a missing implementation. SP-107 does not build on
  verification behavior, so this does not block SP-107 implementation
  (delivery-state: an implemented child unblocks dependent work without formal
  review).
- **SP-106 (STUDY-11):** all five children implemented in code (commits on
  `main` through `f064ad7`). Combined parent review **pass 2 (2026-10-18)
  returned Changes Required** with open findings IR-106-09…15 (report at
  `../SP-106/artifacts/SP-106/review.md`; uncommitted at planning time). SP-107C
  consumes SP-106's `PATCH /users/me` contract and `Select` component, both
  implemented and reviewed in pass 1 (IR-106-01 fixed in `5050b82`). The open
  pass-2 findings concern SP-106E's own ACs and sign-off; they are SP-106's
  re-review cycle, not SP-107 implementation blockers.

## Child inventory

| ID | Layer / owner | Scope | Dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](./SP-107A-onboarding-state-backend.md) | Backend, `implementer` | Onboarding state: three additive `User` columns (one migration, existing users backfilled **completed** — D107-2); `GET /onboarding` + `PATCH /onboarding` (monotonic step, terminal completion) | SP-104 (done) | One 1.5–2 h session | Pending creation |
| [B](./SP-107B-minimal-semester-course-endpoints.md) | Backend, `implementer` | Minimal `POST /semesters` + `POST /courses` (student-scoped; `@db.Date` date fields; 409 duplicates; uniform-404 foreign-semester ownership check); EP02-extend flag | SP-104 (done) | One 2 h session | Pending creation |
| [C](./SP-107C-wizard-shell-and-step1.md) | Frontend, `implementer` | Wizard shell: `/onboarding` route, login-entry redirect, resume, skip (step 2+), terminal redirect (standard `Layout`, D107-3); step 1 preferences form (name + time-zone `Select`, reuses SP-106 `PATCH /users/me`) | A; SP-106C/E (in code) | One 2–2.5 h session | Pending creation |
| [D](./SP-107D-wizard-step2-semester.md) | Frontend, `implementer` | Step 2 first-semester form (name + start/end dates, end-after-start client validation, 409 duplicate-name handling) | B, C | One 1–1.5 h session | Pending creation |
| [E](./SP-107E-wizard-step3-course.md) | Frontend, `implementer` | Step 3 optional first-course form (code + name, pre-selected semester from onboarding state, finish-without-course) | B, C | One 1–1.5 h session | Pending creation |
| [F](./SP-107F-wizard-integration.md) | Integration, `implementer` | Full wizard flow on real Postgres (complete, resume, skip, terminal, cross-student); manual browser sign-off (DoD 10); parent index | A–E | One 1.5–2 h session | Pending creation |

Sequence: A → B → C → D → E → F, one sequential writer. F is the named
integration owner for cross-layer verification.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D107-1 | **Onboarding state shape:** three additive `User` columns — `onboardingStep Int @default(1)` (first incomplete step, 1–3), `onboardingCompletedAt DateTime?` (set on complete *or* skip; `completed` is derived from it), `onboardingSemesterId String?` (semester created in step 2, for step-3 resume). One additive migration; no `UserOnboardingState` model (the ticket's first option — three steps do not justify a new model). | Planner 2026-10-18, grounded in the parent ticket's technical note. Reversible. |
| D107-2 | **Existing-user backfill: marked completed.** The migration sets `onboardingCompletedAt = now()` for all pre-existing rows; the wizard appears only for brand-new registrations. | **User decision 2026-10-18** (recommended "wizard once" was offered and declined). |
| D107-3 | **Entry points:** login success → `GET /onboarding` → not completed → `/onboarding`, else the existing redirect (`from` or `/dashboard`). The `/onboarding` route (inside `ProtectedRoute`, rendered within the standard `Layout` — every existing page, including login/register, renders under the app header): completed → redirect `/dashboard`; else render at the stored step. No boot-time gate and no persistent header link in M1; the M1 resume paths are sign-in (the wizard footer offers sign-out) and the `/onboarding` URL. | Planner 2026-10-18, grounded in AC-107-01/03/05 + locked EP01 D4 ("skippable wizard") + `Layout.tsx` inspection. Reversible; boot-time reconciliation and a header "continue setup" affordance are possible EP05 follow-ups, not M1 scope. |
| D107-4 | **Skip is offered from step 2 onward** (not on step 1): "skippable after Step 1" reads as step 1 required, steps 2–3 skippable. Skip = `PATCH /onboarding { completed: true }`, terminal, records completion without optional data. | Planner 2026-10-18, grounded in AC-107-04 wording. Reversible. |
| D107-5 | **Semester endpoint is minimal:** `POST /semesters` only — `name` + `startDate`/`endDate`; no `isActive` input (schema default `false`; EP02 owns activation semantics); no list/get/update/delete. Duplicate name for the same student → 409. | Planner 2026-10-18, grounded in the parent ticket + EP02 scope ("Create and manage semesters" is EP02's proposed story 1). |
| D107-6 | **Course endpoint is minimal:** `POST /courses` only — `code` + `name` required; `semesterId` optional with an ownership check (missing **or another student's** → uniform 404 `Resource not found` per the repo ownership convention); `description`/`credits`/`color` optional with bounds. Duplicate code for the same student → 409. No edit/archive. | Planner 2026-10-18, grounded in the parent ticket + EP02 scope + `apps/api/src/common/ownership/ownership.ts` convention. |
| D107-7 | **Date representation:** `Semester.startDate`/`endDate` become `DateTime @db.Date` (follows the existing `StudyPlan.date @db.Date` precedent) and the API serializes them as `yyyy-MM-dd` strings. Calendar dates have no instant/time-zone ambiguity this way; the scaffold's plain `DateTime` columns would force a midnight-in-some-zone convention. The migration casts existing (none in practice — no semesters module exists) rows. | Planner 2026-10-18, grounded in `schema.prisma` (`StudyPlan.date`) + the planning checklist's scheduling/time-zone check. |
| D107-8 | **Step-3 semester context:** the wizard persists the created semester's id in the onboarding state (D107-1 `onboardingSemesterId`) when step 2 completes, so a reload at step 3 can re-attach the course. On resume with `semesterId: null` (edge: the semester was later deleted), the course is created without a semester (schema-nullable) or the student finishes without one. No extra `GET /semesters` endpoint is added for M1. | Planner 2026-10-18. Reversible. |
| D107-9 | **EP02 handoff:** SP-107B creates the minimal `semesters` and `courses` modules; EP02 **extends these modules** (list/get/update/delete, activation, meetings, views) and must not create duplicate endpoints. Flagged in both breakdowns. | Parent ticket technical note (semester) + EP01 README dependency-flow note; extended here to the course endpoint. |

## Shared API contract

Fixed cross-child contract. A owns the onboarding state endpoints, B the
academic-structure endpoints, C/D/E consume them, F verifies end-to-end.

```text
GET /onboarding           (authenticated — global guard; no id parameter)
  200 → {
    step: 1 | 2 | 3,             // first incomplete step (meaningless when completed)
    completed: boolean,          // true iff completedAt is set (completed or skipped)
    completedAt: string | null,  // ISO timestamp
    semesterId: string | null    // semester created in step 2; null until then,
                                 // and null again if that semester no longer exists
  }
  401 → unauthenticated (global default-deny guard, SP-104)

PATCH /onboarding         (authenticated; partial body)
  body: { step?: 1|2|3, completed?: boolean, semesterId?: string }
  200 → same shape as GET (updated state)
  400 → { statusCode: 400, message: string[], error, errors: { <field>: string[] }, ... }
         — step outside 1..3, malformed semesterId, or a step regression
         (new step < current step)
  404 → semesterId provided but missing or owned by another student
         (uniform "Resource not found")
  409 → onboarding already completed (any write to a terminal state)
  401 → unauthenticated

POST /semesters           (authenticated; userId derived from the JWT principal)
  body: { name: string, startDate: string, endDate: string }   // dates: yyyy-MM-dd
  201 → { id, name, startDate, endDate, isActive, createdAt, updatedAt }
        (startDate/endDate serialized yyyy-MM-dd; isActive = schema default false)
  400 → field-level errors: name (non-empty, ≤ 100 chars), startDate/endDate
        (valid calendar dates), endDate must be after startDate
  409 → duplicate name for this student (schema @@unique([userId, name]))
  401 → unauthenticated

POST /courses             (authenticated; userId derived from the JWT principal)
  body: { code: string, name: string, semesterId?: string,
          description?: string, credits?: number, color?: string }
  201 → created Course (matches the existing frontend Course type shape)
  400 → field-level errors: code (non-empty, ≤ 20 chars), name (non-empty,
        ≤ 100 chars), credits (0 < c ≤ 30 when present), color (#rrggbb)
  404 → semesterId provided but missing or owned by another student
        (uniform "Resource not found")
  409 → duplicate code for this student (schema @@unique([userId, code]))
  401 → unauthenticated
```

Validation rules: both layers enforce the same field rules (backend
`ValidationPipe` with the SP-106B field-level `errors` map; frontend form
refinements). Unknown fields → 400 via the global `forbidNonWhitelisted`.
`PUT`/`PATCH /users/me` (SP-106) is unchanged and consumed by wizard step 1.

**Downstream consumers:** EP02 extends the `semesters`/`courses` modules
(D107-9); EP04/EP05 consume the stored `timeZone` via the shared datetime
helpers as before; the wizard's step-1 write path is the existing SP-106
`PATCH /users/me`.

## Source requirements and test traceability

The parent ticket's eight acceptance criteria (original wording preserved in
[SP-107](./SP-107-onboarding-wizard.md)) and four test requirements from its
technical notes, assigned stable IDs:

| Req | Requirement (original wording, abridged) | Owning children |
|---|---|---|
| AC-107-01 | On first login the student enters the wizard: step 1 sets time zone + display name (defaults pre-filled from SP-106); step 2 creates the first semester; step 3 optionally adds a first course. | C (entry + step 1), D (step 2), E (step 3), F (wire proof) |
| AC-107-02 | Progress is saved after every completed step and survives page reloads and sign-out/in. | A (persistence), C (save after step 1), D (save after step 2), E (save on completion), F (reload + sign-out/in proof) |
| AC-107-03 | An interrupted setup resumes at the first incomplete step. | C (resume logic), F (proof) |
| AC-107-04 | The wizard is skippable after Step 1; skipping records completion without the optional data. | A (terminal completion), C (skip UI from step 2, D107-4), F (proof) |
| AC-107-05 | A completed or skipped wizard never re-appears for that student. | A (terminal state), C (login redirect + route redirect), F (proof) |
| AC-107-06 | Step 2 creates a semester with name and start/end dates, with validation (end after start). | B (endpoint validation), D (form validation), F (proof) |
| AC-107-07 | Step 3 is clearly optional; the student can finish without adding a course. | E (finish-without-course), F (proof) |
| AC-107-08 | The wizard handles loading, validation, and error states and is keyboard accessible. | C, D, E (states + a11y per step), F (integrated check) |

| Test requirement (original) | Stable ID | Owning tests |
|---|---|---|
| Step persistence and resume | TR-107-01 | A (unit + API), F (e2e reload/sign-out/in) |
| Skip behavior | TR-107-02 | A (terminal state), C (skip UI), F (e2e) |
| Completed wizard not re-shown | TR-107-03 | C (redirect tests), F (e2e) |
| Semester date validation | TR-107-04 | B (DTO/service + 400/409), D (form cases) |

Epic acceptance criteria (EP01, original wording; stable IDs per the EP01
breakdown convention):

| Epic AC (original) | Stable ID | Owner |
|---|---|---|
| Students can register, authenticate, and sign out. | AC-E01-01 | SP-101/SP-102 (out of scope here) |
| Password reset is available. | AC-E01-02 | SP-105 (out of scope here) |
| Unauthenticated requests cannot access protected academic data. | AC-E01-03 | A, B (401 regression on the new routes) |
| Students cannot access or modify another student's records. | AC-E01-04 | A (self-scoped state), B (semesterId ownership), F (two-student proof) |
| Students can complete or resume initial setup. | AC-E01-05 | A–F (this breakdown) |
| Account and academic settings persist between sessions. | AC-E01-06 | A, F (onboarding + semester/course rows persist) |

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | C, D, E (per step); F verifies integrated behavior |
| 2 invalid-input validation | A, B (backend DTOs), C, D, E (client-side) |
| 3 student data scoping | A, B — routes self-scoped via the JWT principal; `semesterId` ownership-checked; cross-student impossible by construction, proven in B/F |
| 4 actionable API errors | A, B (field-level 400 `errors` map), C, D, E (display) |
| 5 loading/empty/error states | C, D, E (per-step form states) |
| 6 keyboard accessibility | C, D, E (full keyboard flow per step, incl. the `Select`) |
| 7 responsive layouts | C, D, E (wizard fits mobile + desktop within the standard layout) |
| 8 automated business-rule tests | A, B, C, D, E, F |
| 9 API/migration documentation | A (User migration), B (Semester `@db.Date` migration + API contract — this README) |
| 10 integrated development review | F (manual browser sign-off) + the combined parent review |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| No cross-student onboarding-state access | Student A attempts to read or modify student B's onboarding state | Controller derives the target from the JWT principal only (`@CurrentUser()`); no id in path or body; global `forbidNonWhitelisted` rejects a `userId` field → 400 | A (unit + API) |
| No cross-student semester/course creation | Student A posts a course referencing student B's semester id | `userId` from the principal; `semesterId` verified against the principal via the ownership helpers; missing or foreign → uniform 404 `Resource not found`; no row written, B's semester existence never revealed | B (service + API), F (two-student HTTP proof) |
| Onboarding completion is terminal | A malicious client tries to reset a completed student's step or re-open the wizard | `completed` derived from `onboardingCompletedAt`; any write to a completed state → 409; step pointer only moves forward (regression → 400) | A (unit + API) |
| Semester dates are calendar dates, not instants | Client sends `end == start`, `end < start`, or a non-date string | `@db.Date` columns + `yyyy-MM-dd` parsing + end-after-start rule on both layers → 400 backend / field error frontend, nothing written | B (validator + 400), D (form refinement) |

## Plan correction log

### CF-107-01 — D107-3 claimed a presentation pattern the app does not have

- **Discovery:** 2026-10-18, during SP-107C authoring, in the breakdown
  README decision D107-3 (scaffold commit `07ab678`).
- **Original finding (preserved):** D107-3 stated the wizard renders
  "`/onboarding` (full-screen, no app header — same presentation pattern as
  login/register)".
- **Consequence:** an implementer would have rendered the wizard outside the
  app `Layout`, contradicting the actual code: `apps/web/src/widgets/layout/ui/Layout.tsx`
  wraps **every** route (Header + `EmailVerificationBanner` + `main`), and the
  login/register pages render *inside* it (their `min-h-screen` is within
  `main`). The claim "same presentation pattern as login/register" was false.
- **Correction:** D107-3 rewritten — the wizard renders inside the standard
  `Layout`/`ProtectedRoute` like all existing pages; the resume-path wording
  (sign-in + `/onboarding` URL; no boot gate, no header link in M1) is
  unchanged. SP-107C's AC 1 and technical notes state the same.
- **Verification:** `Layout.tsx` (17 lines — unconditional Header + banner +
  main) and `App.tsx` route table re-read; `LoginPage.tsx`/`RegisterPage.tsx`
  confirmed to render within `main`. Grep for "full-screen"/"no app header"
  across the breakdown found two further stale spots — the child-inventory row
  for C and DoD row 7 — both rewritten in the same correction; the only
  remaining occurrences are inside this preserved finding.
- **Status:** `Fixed in plan`.

### CF-107-02 — EP01 README undercounts SP-106's children

- **Discovery:** 2026-10-18, during the SP-107 final cross-file gate (quality
  gate row 9), while re-verifying the EP01 stories table against each
  breakdown's child inventory.
- **Original finding (preserved):** the SP-106 row in
  `docs/stories/EP01/README.md` read "Student profile and preferences — split
  into [4 children](./SP-106/README.md)", but the SP-106 breakdown lists five
  children (A–E; SP-106E was added 2026-10-17, commit `ee7b825`).
- **Consequence:** the EP01 index understates SP-106's scope by one child; a
  reader following the table would expect a four-child breakdown and find five.
- **Correction:** the SP-106 row in `docs/stories/EP01/README.md` rewritten to
  "split into [5 children](./SP-106/README.md)". No other EP01 table row
  affected (the SP-107 row already reads 6).
- **Verification:** re-read the corrected row and the SP-106 breakdown's child
  inventory (A–E, all implemented per its queue).
- **Status:** `Fixed in plan`.

## Quality gate (2026-10-18)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Six children, each with a full sizing block grounded in inspected code. Concrete split rationale per child: A owns the `User` migration + the terminal/monotonic state invariant (one atomic core); B owns two near-identical create endpoints that share the EP02-handoff concern and fit one 2 h session (splitting them would manufacture near-duplicate children); C combines shell + step 1 as one verifiable vertical slice (~2–2.5 h, within target) — shell alone has no user-visible outcome, step 1 alone has no home; D/E are separate forms with separate API contracts (`POST /semesters` vs `POST /courses`) and separate upstream dependencies; F is the integration sign-off + parent index (SP-106D precedent — a real verification outcome, not a status child). No README-only/status-only children. |
| 2. Original AC/TR coverage | Pass | AC-107-01…08 and TR-107-01…04 all mapped in the traceability table; no requirement owned only in prose; epic ACs 3/4/5/6 mapped, 1/2 owned by sibling stories (SP-101/102, SP-105). |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above: items 1–8 owned by the relevant children, 9 by A/B (migrations + contracts), 10 by F (manual sign-off) + the combined parent review; every N/A row carries a reason in its child ticket. |
| 4. Contract consistency and integration ownership | Pass | One shared contract section; A/B implement the four endpoints, C/D/E consume them (re-verified field-by-field against each child's ACs), F is the named cross-layer integration owner with explicit dependencies on A–E. |
| 5. Code paths inspected | Pass | `schema.prisma` (User, Semester, Course, StudyPlan.date precedent), `users.{controller,service,module}` + DTOs, `app.module.ts`, `prisma.module.ts` (`@Global`), `common/ownership/ownership.ts`, `common/pipes/validation.pipe.ts`, `common/filters/all-exceptions.filter.ts` (P2002/P2025 mapping), `test/test-http.ts`, `prisma/migrations/` (seven migrations), `Layout.tsx`, `ProtectedRoute.tsx`, `App.tsx`, `LoginPage.tsx`, `authSlice.thunks.ts`, `entities/user/{api,model}`, `ProfilePage.tsx`, `shared/ui/{Input,Select,Button}.tsx`, `shared/lib/{datetime,errors}.ts`, `shared/types/academic.ts`, `docker-compose.yml` reference via SP-106D. Unverified: none material. |
| 6. Feature-specific risks/counterexamples | Pass | Four invariants with concrete counterexamples, mechanisms, and owning tests (data-ownership CRUD + scheduling/date + terminal single-use completion + frontend flow); activated checklists: data CRUD/ownership, scheduling/time calculations (`@db.Date`, D107-7), concurrent single-use (terminal completion, conditional update), frontend flows, cross-layer API. |
| 7. Dependency mapping and sequencing | Pass | A → B → C → D → E → F, one sequential writer; upstream SP-103/SP-106 implemented in code (SP-106 pass-2 review open — recorded, not a blocker per delivery-state), SP-104 implemented + reviewed; downstream EP02 extend-don't-duplicate flagged (D107-9). |
| 8. Material decisions | Pass | D107-2 user-approved 2026-10-18 (existing users backfilled completed); D107-1/3/4/5/6/7/8/9 planner decisions, each grounded in the ticket, inspected code, or the locked EP01 decisions, each marked reversible where applicable. No open material question. |
| 9. Correction log | Pass | CF-107-01 (D107-3 presentation claim) fixed with verification; CF-107-02 (stale EP01 README child count) fixed with verification. History preserved. |
| 10. Jira identity/sync | Not applicable | No sync authorized for this planning task. Parent keeps existing STUDY-8; children A–F are `Pending creation`; no duplicate keys, no tracker mutation. |

**Outcome:** **Plan Ready** — all applicable planning gate rows pass; no
unresolved material planning findings. Implementation is **not blocked**:
upstream SP-103/SP-106 are implemented in code and SP-104 is implemented and
reviewed. No implementation or passing tests are claimed; the plan approves
planning obligations only. Next actionable: **SP-107A** (execution queue).

## Autopilot

- **Scope and entry:** Full SP-107 parent (children A–F + combined parent review). Entry: SP-107A (first child).
- **Coordinator:** workspace `/Users/michael/Documents/GitHub/focus-app`, branch `main`, HEAD `8abb20f`.
- **Stage:** Implementing SP-107F (sixth child — integration + DoD 10 + parent index).
- **Active dispatch:** `SP107-implementer-F` — implementer — SP-107F wizard integration verification + sign-off + parent index.
- **Last result / retry state:** `SP107-implementer-E` returned: SP-107E complete — commit `14e7a25` (Step3Course + courseApi entity, both completion paths, shell swap; F-107E-1…4 closed); web suite **26/26 files, 283/283 tests, 0 skipped**; typecheck/lint clean; tree clean. (Prior: D `687a876` 24/258; C `5863b44` 22/238; B `03a412a` 32/390; A `9885601` 28/327.)
- **Resume:** Dispatched fresh isolated implementer `SP107-implementer-F` for SP-107F (queue row F eligible: A–E implemented).

## Final implementation review unit

- **Parent:** SP-107 (STUDY-8) — `docs/stories/EP01/SP-107/`
- **In scope:** SP-107A, SP-107B, SP-107C, SP-107D, SP-107E, SP-107F (all
  children + integration)
- **Integration/index owner:** SP-107F (writes the parent index at
  `./artifacts/SP-107/implementation.md`)
- **Gate:** one combined SP-107 review after every child is implemented
  (`./artifacts/SP-107/review.md`); child implementation completion unblocks
  dependent work, but only the passing combined review establishes sign-off.
