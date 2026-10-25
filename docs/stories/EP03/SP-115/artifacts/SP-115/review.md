# SP-115 Final Implementation Review — Assignment Types

**Review date:** 2026-10-25
**Reviewer:** reviewer (independent, single final parent review)
**Reviewed state:** commit `9d76950` (HEAD), working tree clean
**Review unit:** SP-115 parent — SP-115G (backend) + SP-115H (frontend); one combined review, no per-child review gate
**Report scope:** the complete combined implementation from baseline `8027671` through `9d76950`. Code commits: `77e733f` (G), `33075e2` (H); the other commits in range are docs-only closeouts/refinement.

## Verification matrix (reviewer-executed)

All commands run by this reviewer on 2026-10-25 from the repo root, cwd noted, at commit `9d76950`, exit code 0 for each:

| Gate | Command | cwd | Result |
|---|---|---|---|
| Backend unit (no DB) | `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts courses.service.spec.ts` | repo root | **194 passed** (2 suites) |
| Backend DB suites | `DATABASE_URL=<local OS-trust connection> pnpm … jest --runInBand assignments-data-scoping.spec.ts assignments-e2e.spec.ts courses-meetings-e2e.spec.ts` | repo root | **94 passed, 0 skipped** (37 + 38 + 19). Matches the recorded per-suite counts in G's implementation record — the migration `20261025000000_assignment_optional_type` was applied to the local dev DB; the suites exercised the live `type` column. |
| Web focused suites | `pnpm --filter @studypilot/web test -- <6 test files>` | repo root | **6 files, 121 tests passed** |
| Web full regression | `pnpm --filter @studypilot/web test` | repo root | **45 files, 563 tests passed** |
| Web typecheck | `pnpm --filter @studypilot/web typecheck` | repo root | pass (silent) |
| Web lint | `pnpm --filter @studypilot/web lint` (`eslint . --max-warnings 0`) | repo root | pass (silent) |
| API typecheck | `pnpm --filter @studypilot/api typecheck` | apps/api | pass (silent) |

DB note (provenance): G's F-115G-1 recorded that the stored `DATABASE_URL` credentials are rejected by the local Postgres, which uses OS-user trust. This reviewer re-verified with a locally constructed OS-trust connection string without reading any secret or `.env` file. No values are reproduced in this report.

## Combined diff scope check

`git diff --stat 8027671..9d76950 -- apps/` matches exactly the union of G's and H's changed-paths lists: seven backend production/test files + the migration + schema, five web production files + five web test files. `ownership.ts` and the validation pipe are **not** in the diff — ownership and whitelist behavior are unchanged, as claimed.

## Acceptance criteria — child by child

### SP-115G (backend)

| AC | Outcome | Evidence (files/lines) |
|---|---|---|
| 1 Persistence | **Satisfied** | `apps/api/prisma/schema.prisma:229–235` — `enum AssignmentType` exactly the five identifiers; `schema.prisma:202` — `type AssignmentType?` (nullable, no default, after `priority`). One migration `apps/api/prisma/migrations/20261025000000_assignment_optional_type/migration.sql` creates the enum then adds the column; nullable + no default so existing rows keep SQL NULL, no backfill; rollback (drop column, then drop type) documented in its head comment. Applied to the local dev DB (proven by the executed DB suites). |
| 2 Create/update | **Satisfied** | `dto/create-assignment.dto.ts:55–57` and `dto/update-assignment.dto.ts:77–79` — optional `type` with `@IsIn` five values (unknown value such as `ESSAY` → 400 field error on `type`). `assignments.service.ts:67–68` — create writes `type` only when non-null (D115-2). `assignments.service.ts:117,134,163–164` — update uses the `has()` keep-on-null rule (D115-3), includes `type` in the at-least-one check (type-only patch is non-empty), and writes only provided fields. Lifecycle fields `status`/`actualHours`/`courseId`/`userId` remain non-whitelisted (DTO doc headers; unit + e2e matrices still assert their 400s — suites passed). |
| 3 Projection | **Satisfied** | `assignments.service.ts:5–21` and `courses.service.ts:63–77` — both `toAssignmentResponse` copies return the prior ten keys plus `type` immediately after `priority`; neither includes `userId` or `courseId`; `AssignmentRow` (`courses.service.ts:43–55`) carries `type: string \| null` so an untyped seeded row projects `type: null`. No shared-helper extraction (D115-4 honored). `GET /courses/:id` ordering untouched (no order-related code in the diff). |
| 4 Ownership | **Satisfied** | No query changes: reads/writes keep `ownedWhere(userId, …)` (`assignments.service.ts:100,174`) and the cross-student path still resolves to the uniform 404 `Resource not found`. The passed scoping suite includes the new counterexample: cross-student PATCH sending `type: 'HOMEWORK'` → uniform 404 with the target row unchanged. |

### SP-115H (frontend)

| AC | Outcome | Evidence (files/lines) |
|---|---|---|
| 1 Set/omit/keep | **Satisfied** | `shared/types/academic.ts:50,62` — `AssignmentType` union; `Assignment.type: AssignmentType \| null`. `assignmentApi.ts:22` — create copies only a truthy `type` (unset omits the key → stored null); update forwards the payload and injects nothing (`assignmentApi.ts:33–46`), matching D115-3. `AssignmentForm.tsx:168–169,179` — both submit branches send `type` via conditional spread (`data.type ? { type } : {}`), so `''` never becomes `type: null`. The control never claims blank clears: "No type" is only offered on create and on null-stored edit (`AssignmentForm.tsx:281–288`), and the edit hint is "Pick a different value to change the type." Exact-object tests confirm key present vs absent in `AssignmentForm.test.tsx` (five-value `it.each`, create-omit, edit-keep, null-stored-omit, null→typed) and `assignmentApi.test.ts`. |
| 2 Row truth | **Satisfied** | `AssignmentsSection.tsx:72–80` — one neutral `TYPE_STYLE` (`bg-slate-100 text-slate-700`, the existing PENDING/LOW pairing) and title-cased `TYPE_LABELS`; `AssignmentsSection.tsx:212–214` — badge rendered after the priority badge, conditional on `assignment.type`, so null renders no badge and no category text. Component tests assert the typed pill and that no five-value label appears on a null row. |
| 3 Errors/in-flight | **Satisfied** | `'type'` added to `FIELDS` (`AssignmentForm.tsx:64`), so a server 400 field error maps via `setError` to the control; tests assert `aria-invalid` + accessible description on create and edit. In-flight lock, duplicate-submit guard, uniform 404 alert, and network/5xx retry behavior are outside the diff and their existing tests pass (full web suite green). |
| 4 Keyboard/narrow | **Satisfied** | Type and Priority share one `sm:grid-cols-2` row placed after the schedule grid (`AssignmentForm.tsx:240,269`), so tab order follows DOM: title → due date → duration → **type** → priority → description → buttons; the focus trap's `FOCUSABLE` selector (`AssignmentForm.tsx:75`) already includes `select` and needs no change — trap cycle tests pass with the control present, and the in-flight disabled-labels loop includes Type. The row's badge joins the existing `flex flex-wrap gap-2` cluster inside the same list item as Edit/Delete, so it cannot displace them; jsdom asserts presence/palette and the dialog relies on the existing `max-h-[90vh]` + `overflow-y-auto` scroll. |

## Definition of Done checklist (docs/epics/README.md)

| # | Condition | Verdict | Evidence |
|---|---|---|---|
| 1 | Functional criteria pass | **PASS** | See AC tables above; all C/AC-backed suites executed green (reviewer-run). |
| 2 | Invalid input handled | **PASS** | Invalid enum / wrong JSON type on create and update → 400 field error on `type` with no write (DTO `@IsIn`, service re-check asserted by unit, scoping, and e2e tests — reviewer-executed). Frontend mirrors the five-value enum in the zod schema and renders server field errors on the control. |
| 3 | Student data scoping | **PASS** | Ownership module untouched; `ownedWhere` on read/update; scoping suite (37 tests incl. the new cross-student-type counterexample) passed reviewer-executed. |
| 4 | Actionable API errors | **PASS** | Field-level messages for `type` map to the control; pre-existing error plumbing unchanged and covered by passing form tests. |
| 5 | Loading/empty/error states | **PASS** | No state behavior changed by the diff; full web suite passes. A null type renders no badge or filler category. |
| 6 | Keyboard accessibility | **PASS** | Control is a labeled native `Select` inside the unchanged trap; tab-order and trap-cycle tests pass. |
| 7 | Responsive layouts | **PASS** | Badge joins the existing wrap cluster; dialog uses the existing scroll handling; component tests + the DoD-10 manual pass below. |
| 8 | Business-rule automated tests | **PASS** | 194 unit + 94 DB-backed + 563 full web, reviewer-executed at `9d76950`. |
| 9 | API/migration documentation | **PASS** | Migration with documented rollback; the shared contract, D115-1…4, and the security-invariant table live in the SP-115 README and are implemented as written. |
| 10 | Integrated development review | **PASS** | The required manual browser pass was **executed by the user on 2026-10-25 and passed** (reported in the review handoff as "manual walkthrough passed"), closing the open handoff finding F-115H-1. Details, steps, and honest provenance in [walkthrough.md](./walkthrough.md). |
| 11 | Reviewer walkthrough | **PASS** | [walkthrough.md](./walkthrough.md) written and verified this pass — final deliverable of this review unit. |

## Findings

| ID | Severity | Finding | Suggested correction | Disposition |
|---|---|---|---|---|
| FR-115-1 | Polish | Dev-only default DB credentials exist as committed docker-compose config (localhost-only dev stack). No secret content is reproduced here and no `.env` file was read. | No action for this story. If the compose stack is ever used beyond localhost, rotate and move the credentials to local-only configuration. | Noted — no unmet mandatory obligation for SP-115; does not affect the verdict. |

No blocker or should-fix findings. Prior handoff item **F-115H-1** (DoD-10 manual browser pass) is **closed**: the user executed the pass on 2026-10-25 and it passed. G's F-115G-1 (local DB credentials) remains resolved as documented in G's record (OS-trust connection used for verification; alignment of stored local config stays a user decision outside this story).

## Verdict

**PASS.** SP-115 (G + H) meets the shared DoD and both children's acceptance criteria, with no open blocker or should-fix finding. Final documents: this report and the verified [walkthrough.md](./walkthrough.md); queue/status sync follows in the SP-115 README.
