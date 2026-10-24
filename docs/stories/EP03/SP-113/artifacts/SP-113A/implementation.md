# SP-113A implementation

**Status:** Implemented — awaiting combined SP-113 parent review.
**Date:** 2026-10-24
**Scope:** SP-113A only; baseline `378355c24a2270edeb453dd541773226435b878b`.
**Contract:** [parent shared API contract and D113-1…6](../../README.md#shared-api-contract).

## Acceptance criteria outcomes

| AC | Outcome / evidence |
|---|---|
| 1 — nullable schema | Pass. Only schema change is `Assignment.dueDate: DateTime?`. Migration `20261024120000_assignment_optional_due_date` drops NOT NULL without rewriting existing deadlines. All 12 migrations applied successfully to a newly initialized disposable PostgreSQL database; Prisma client regenerated. |
| 2 — create, principal, 201/401 | Pass. Registered `AssignmentsModule` in app and HTTP harness; `POST /assignments` uses `@CurrentUser()` and the global auth guard. Explicit 10-key response omits ownership/course data and serializes timestamps/deadline (or null). Service tests plus real HTTP test verify full fields, defaults, principal persistence, course-less create and unauthenticated 401. |
| 3 — validation | Pass. DTO validates raw field types, title presence/non-whitespace/200, strict persistable ISO datetime, positive finite duration ≤1000, priority enum, description ≤2000. Service repeats the same rules via `validateSync`, without coercion, before any query/write. Pipe/service/HTTP matrices cover invalid fields, exact upper bounds, past dates and offset normalization. All errors include field-level maps. |
| 4 — course ownership | Pass. Optional null/omitted course skips gate. Any present string (including empty/malformed) is looked up with `ownedWhere(userId, courseId)`; foreign/missing → identical 404 `Resource not found`, no write. Two-student HTTP matrix proves both directions and unchanged existing data. |
| 5 — lifecycle and unknown fields | Pass. Global pipe rejects status/type/userId; service whitelist recheck also rejects unknown fields. Create writes no lifecycle status; real database applies PENDING and omitted priority MEDIUM. |
| 6 — scoped queries | Pass. New course lookup includes principal userId via helper. Existing course-detail nested assignment read now explicitly includes `where.userId`. HTTP tests prove B's projection excludes A's assignments and B cannot read A's course. |

## Changed paths / commit scope

- `apps/api/prisma/schema.prisma` and `prisma/migrations/20261024120000_assignment_optional_due_date/migration.sql` (relative to `apps/api/`).
- `apps/api/src/modules/assignments/`: module, controller, service, create DTO, unit/pipe spec and real HTTP data-scoping spec.
- `apps/api/src/app.module.ts`, `apps/api/src/test/test-http.ts`: production/test module parity.
- `apps/api/src/modules/courses/courses.service.ts` and `.spec.ts`: nullable projection compatibility, explicit nested ownership, regression coverage.
- This child's checkpoint/implementation record, child's Status/artifact pointer, and parent README execution fields/table only.
- Unrelated `.gitignore` modification preserved and excluded from commit. Generated Prisma client is ignored, not committed.
- One scoped implementation/closeout commit; its verified hash is returned in the task handoff (not embedded in its own content).

## Findings / deviations and final dispositions

| ID / source | Observed issue / affected paths | Disposition / closure evidence |
|---|---|---|
| F113A-1 — AC 1/2 | Existing `courses.service.ts` projection assumed required dueDate and would throw on new undated rows. | **Fixed**, implementer. Nullable type + null-safe serialization. Course unit regression and real HTTP nulls-last/title ordering tests pass. Necessary compatibility work outside initially listed new-module footprint; no new course behavior beyond nullable contract. |
| F113A-2 — AC 3 | Global implicit conversion could accept a numeric title as a string. | **Fixed**, implementer. Preserve raw title during transformation; optional union metadata preserves raw scalar types. Numeric title/numeric duration string rejected by pipe, service and HTTP regression tests. |
| F113A-3 — AC 6 / repo ownership | Existing nested assignment include relied solely on parent-course ownership rather than an explicit assignment userId predicate. | **Fixed**, implementer. Added nested `where.userId`, updated two query-shape assertions after their initial expected failures, and verified full existing course suite. |
| F113A-4 — AC 3 | ISO validator accepts formats not representable by JS Date/Prisma. | **Fixed**, implementer. Finite Date.parse guard plus week-date/leap-second negative cases at service, pipe and HTTP levels. Final full suite passes. |
| F113A-5 — delivery-state reconciliation | Initial closeout repeated stale parent queue claim that B needed UI refinement. | **Fixed**, implementer, following user correction. B's Status and D113B-1…6 show refinement completed in baseline commit `378355c24a2270edeb453dd541773226435b878b`. A completion satisfies its remaining dependency; queue now marks B Ready, next action implement. Docs-only correction; tested API code unchanged. |

Documentation path correction: ticket references `common/validation.pipe.ts`; actual pipe is `common/pipes/validation.pipe.ts`. No AC/contract changes. Service defense-in-depth reuses DTO validation rules rather than duplicating each predicate manually; non-HTTP callers receive the same field-level 400s.

## Verification (executed)

All commands run from repository root against the final implementation working tree before closeout docs/commit. `pnpm --filter` runs commands in `apps/api`. No secret/environment files read. DATABASE_URL supplied only for a newly created local, trust-auth PostgreSQL instance on port 55439, never a shared database.

| Command | Result |
|---|---|
| `pnpm --filter @studypilot/api exec prisma generate` | Pass; Prisma 7.10 client regenerated. |
| `pnpm --filter @studypilot/api exec prisma migrate deploy` with disposable DATABASE_URL | Pass; all 12 migrations applied. Initial URL without local role failed P1010; corrected role and retried successfully, no schema changes on failure. |
| `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts` | Initial red: missing implementation modules; then 46 passed before additional date edge tests. |
| `pnpm --filter @studypilot/api exec jest --runInBand assignments courses.service.spec.ts` with disposable DATABASE_URL | 3 suites / 135 tests passed before final date edge cases. Earlier course-query assertions failed after adding explicit nested scope; expectations corrected. |
| `pnpm --filter @studypilot/api exec jest --runInBand` with disposable DATABASE_URL | **40 suites / 715 tests passed, zero skipped** on final code. Default suite excludes the three opt-in auth recovery integration files by existing Jest configuration; no claim those opt-in suites ran. |
| `pnpm --filter @studypilot/api typecheck` | Pass on final code. |
| `pnpm --filter @studypilot/api exec eslint 'src/**/*.ts' --max-warnings 0` | Pass, non-mutating, final code. |
| `pnpm --filter @studypilot/api format` | Pass all API TypeScript; after final date guard, scoped assignment Prettier check also passed. |
| `git diff --check` | Pass before closeout; repeated on final staged scope. |

## DoD and remaining work

Applicable backend DoD 1–4, 8–9 satisfied by the above implementation/tests and documented contract/migration. UI DoD 5–7 belongs to B. Integrated browser sign-off and combined independent review/walkthrough (DoD 10–11) remain C/parent-review obligations, not child approval.

No open findings or implementation blockers in SP-113A. Next: **SP-113B implementation** (separate authorization); its UI refinement already completed in `378355c`. SP-113C and final combined review remain unstarted. No child reviewer dispatched.
