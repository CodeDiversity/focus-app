# SP-113C implementation

**Status:** Implemented — awaiting combined SP-113 parent review (2026-10-24),
with the session owner's temporary automated substitute for AC2 recorded below.
**Scope:** C only: API integration journey, verification and parent evidence index.
**Baseline:** `e3791566f3ef0dcc0d857660e2d766f6c443fd85`.
**Contract / story:** [shared API contract](../../README.md#shared-api-contract),
[SP-113C](../../SP-113C-quick-create-integration-signoff.md).

## Acceptance criteria outcomes

| AC | Outcome / evidence |
|---|---|
| 1 — real HTTP lifecycle, validation, security | **Pass.** New `apps/api/src/modules/assignments/assignments-e2e.spec.ts` uses the existing real-module HTTP harness and real migrated PostgreSQL. Sixteen tests prove API-created course → full-field assignment → persisted principal ownership → exact 10-key course projection; course-less create/defaults; explicit-null and omitted deadlines sorted last after chronological dated rows (including a past deadline); field-level 400/no-write matrix; lifecycle lockout; foreign/missing/malformed course uniform 404 with unchanged A data; B's own nonempty projection excludes A's assignments; unauthenticated create 401/no write. No mocked services or directly seeded academic fixtures. |
| 2 — manual browser walk / DoD10 | **Session-owner-authorized automated substitute for now; manual execution not performed.** See D113C-1 below. Full frontend component suite plus non-UTC focused tests cover the empty section, create dialog, invalid inputs, pending/error states, background refetch, nullable display, keyboard focus/trapping and responsive class assertions. Real HTTP tests cover persistence/scoping independently. These are not a live browser-to-API journey, actual mobile rendering or human visual/a11y ratification. |
| 3 — parent implementation index | **Pass.** [SP-113 implementation index](../SP-113/implementation.md) links every child, combined Git scope, AC/DoD ownership and executed integration evidence. Parent checkpoint links the single canonical queue. |

## Findings / deviations and final dispositions

| ID / source | Observation / affected paths | Disposition, owner and closure evidence |
|---|---|---|
| F113C-1 — AC1 | First e2e run passed 15/16; new spec incorrectly expected a `code` property on uniform 404. Existing exception filter emits `statusCode` and generic message. | **Fixed**, implementer. Inspected `common/filters/all-exceptions.filter.ts`; corrected test assertion to actual public contract. Final real-DB suite passed 41 suites / 731 tests, including all 16 C tests. No application behavior changed. |
| D113C-1 — AC2 / DoD10 | Original story requires real-browser execution and session-owner ratification. During this task the owner instructed: “just make sure all automated is done and it can subtitute the real browser for now”. | **Temporary exception authorized by session owner; applied by implementer.** Automated coverage substitutes for that manual obligation for this delivery. Original ACs/planning decisions remain unchanged. Manual integrated browser execution, visual/mobile checks and human keyboard/a11y ratification remain **not performed**, not implicitly passed. Independent parent reviewer must acknowledge this exception and the evidence limits; no independent approval is claimed. |

No open code/test findings in C. No product, API, schema or harness changes.

## Verification (executed)

All commands ran from repository root on `e379156` plus the new C spec, before
closeout-only documentation edits. `pnpm --filter` executes in the relevant app.
The database was a **new local disposable PostgreSQL cluster**, trust-auth,
loopback port 55441, with `DATABASE_URL` supplied through process environment.
No existing/shared database was used and no secret files were read.

| Command | Result |
|---|---|
| `initdb` / `pg_ctl` / `createdb` for new disposable cluster; `pnpm --filter @studypilot/api exec prisma migrate deploy` with disposable DATABASE_URL | Pass; all 12 migrations applied, including nullable assignment deadline. |
| `pnpm --filter @studypilot/api exec jest --runInBand assignments-e2e.spec.ts` with disposable DATABASE_URL | Initial 15/16 pass; test assertion corrected per F113C-1. Final full run below includes the entire new suite. |
| `pnpm --filter @studypilot/api exec jest --runInBand` with disposable DATABASE_URL | **41 suites, 731 tests passed, zero skipped.** Existing Jest config excludes three unrelated opt-in auth recovery integration suites; those are not claimed executed. |
| `pnpm --filter @studypilot/api typecheck` | Pass. |
| `pnpm --filter @studypilot/api exec eslint 'src/**/*.ts' --max-warnings 0` | Pass, non-mutating. Focused new-spec lint also passed. |
| `pnpm --filter @studypilot/api format` | Pass all API TypeScript. New spec formatted with repo Prettier config first. |
| `pnpm --filter @studypilot/api build` | Pass. |
| `pnpm --filter @studypilot/web test` | **44 files, 519 tests passed.** |
| `TZ=America/Los_Angeles pnpm --filter @studypilot/web test -- src/features/courses/ui/AssignmentForm.test.tsx src/features/courses/ui/AssignmentsSection.test.tsx src/entities/assignment/api/assignmentApi.test.ts src/pages/courses/ui/CourseDetailPage.test.tsx` | **4 files, 44 tests passed**, including keyboard-only component interaction, refetch, null display and local-midnight ISO conversion. |
| `pnpm --filter @studypilot/web typecheck` | Pass. |
| `pnpm --filter @studypilot/web lint` | Pass. |
| `pnpm --filter @studypilot/web build` | Pass. Existing nonfatal Vite CJS/PostCSS module-type and >500 kB chunk warnings. |
| `git diff --check` / staged diff inspection | Pass before commit; scoped files only. Commit hooks remain enabled. |

Existing frontend suite emits legacy act warnings, intentional Redux diagnostics
and React Router future warnings; no failing automated check remains. Component
tests use mocked APIs and static layout assertions, not actual browser geometry.

## Changed paths / commit scope

- New `apps/api/src/modules/assignments/assignments-e2e.spec.ts` only source change.
- C checkpoint and this implementation record; parent checkpoint/index under
  `../SP-113/`; C ticket Status/artifact pointer and parent README execution fields.
- Single C implementation/closeout commit, verified hash returned in task handoff
  rather than embedded into its own content. No A/B code or historical records changed.
- Unrelated `.gitignore` edit preserved and excluded from staging/commit.

## Remaining / review handoff

All authorized C implementation work is finished with D113C-1's explicit exception.
Request **one combined independent SP-113 review** of A/B/C, using the parent index
and acknowledging that no real-browser sign-off occurred. Formal DoD10 independent
review and DoD11 reviewer-owned `review.md` + `walkthrough.md` remain outstanding.
No child review, self-approval, tracker mutation or release claim.
