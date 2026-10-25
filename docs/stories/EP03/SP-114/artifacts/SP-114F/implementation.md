# SP-114F implementation

**Status:** Reviewed 2026-10-24. User approved the parent review and human walkthroughs.
**Scope:** F only: e2e tests, DoD-10 manual sign-off, parent implementation index.
**Baseline:** `74822fd` (SP-114E implementation).
**Contract / story:** [shared API contract](../../README.md#shared-api-contract),
[SP-114F](../../SP-114F-assignment-edit-delete-integration.md).

## Acceptance criteria outcomes

| AC | Outcome / evidence |
|---|---|
| 1 — E2E PATCH flow | **Pass.** Extended `apps/api/src/modules/assignments/assignments-e2e.spec.ts`: `POST` creates assignment on course; `PATCH /assignments/:id` updates title, description, due date, estimated hours, and priority; returns 10-key projection; verifies DB row merged values; refetches `GET /courses/:id` and verifies updated assignment in projection. |
| 2 — E2E DELETE flow & task cascade | **Pass.** `DELETE /assignments/:id` returns 204 No Content with empty body; verifies assignment is null in DB; verifies removal from `GET /courses/:id` projection; verifies seeded child task survives deletion with `assignmentId: null` and intact `userId` (D114-4). |
| 3 — E2E ownership scoping | **Pass.** Student B attempts to PATCH and DELETE student A's assignment, as well as foreign, missing (random UUID), and malformed IDs; all return uniform 404 `Resource not found` without modifying student A's assignment or course detail projection. The assertion is that student B's assignment count is unchanged from its pre-test count (`beforeBCount`), not that student B owns zero assignments. An earlier test in the same file creates B's own assignment and does not clean it up per test (IR-114-05). |
| 4 — E2E validation matrix | **Pass.** Invalid inputs on PATCH (whitespace-only title, title > 200 chars, invalid date string, invalid leap year date `2026-02-30`, estimated hours `<= 0`, `> 1000`, non-numeric, invalid priority enum, description > 2000 chars, lifecycle fields `status`/`actualHours`, `courseId`, `userId`) rejected with 400 field-level errors and zero DB writes. |
| 5 — E2E null semantics (D114-5) | **Pass.** Explicit `null` for `dueDate`, `estimatedHours`, `priority` retains existing stored values; `description: ''` clears stored description; empty body `{}` and all-null body reject with 400 "At least one field must be provided". |
| 6 — DoD-10 manual sign-off | **Pass for the checks executed; prior happy-path IDs are not re-executed.** The original happy-path walk (course header, edit hints, client validation, description clearing, delete cancel, single delete, idle keyboard, mobile 390x844) remains the previously recorded Chrome 155.0.8059.85 REA session cited below and was not repeated where that code is unchanged. Review pass 1 required the missing error/retry cases plus the changed pending-delete and consecutive-announcement workflows. Those were executed 2026-10-24 21:47 EDT and are recorded in [browser-error-retry.md](./browser-error-retry.md) with screenshots and `browser-evidence/observations.json`. |

## Findings / deviations and final dispositions

Original F pass recorded none. Parent review pass 1 required these corrections:

| ID | Issue | Disposition | Closure |
|---|---|---|---|
| IR-114-03 | Network/5xx edit recovery and delete failure/retry were not in the browser record | **Fixed** | [browser-error-retry.md](./browser-error-retry.md). Edit field error, PATCH 500 + retry, PATCH network failure + retry, edit 404, DELETE 500 + retry, pending-delete keyboard, and consecutive announcements were executed in headless Chrome against the local dev stack. |
| IR-114-04 | New e2e fixture reads used only the assignment/task id | **Fixed** | `assignments-e2e.spec.ts` survival reads use `ownedWhere(studentA.id, id)`. Data-scoping reads are closed on D. Both specs re-ran: 69 tests passed. |
| IR-114-05 (F record) | AC 3 said student B owns zero assignments | **Fixed** | AC 3 now describes the unchanged pre-test count, which is what `beforeBCount` asserts. |

## Verification (executed)

All commands ran from repository root or respective package workspace against the final working tree.

| Command | Result |
|---|---|
| Disposable PostgreSQL (port 55445) `prisma migrate deploy` | Pass; all 12 migrations applied. |
| `pnpm --filter @studypilot/api exec jest --runInBand src/modules/assignments/assignments-e2e.spec.ts` (with DATABASE_URL) | **35/35 tests passed** (16 SP-113 regressions + 19 SP-114F tests). |
| `pnpm --filter @studypilot/api exec jest --runInBand src/modules/assignments/` (with DATABASE_URL) | **3 suites, 177 tests passed, 0 failures**. |
| `pnpm --filter @studypilot/api exec jest --runInBand` (with DATABASE_URL) | **41 suites, 815 tests passed, 0 failures**. |
| `pnpm --filter @studypilot/api typecheck` | Pass clean (`tsc --noEmit`). |
| `pnpm --filter @studypilot/api exec eslint src/modules/assignments/assignments-e2e.spec.ts --max-warnings 0` | Pass clean with 0 warnings. |
| `pnpm --filter @studypilot/api build` | Pass clean (`nest build`). |
| `pnpm --filter @studypilot/web test` | **45 files, 542 tests passed, 0 failures**. |
| `pnpm --filter @studypilot/web typecheck` | Pass clean (`tsc --noEmit`). |
| `pnpm --filter @studypilot/web lint` | Pass clean with 0 warnings. |
| `pnpm --filter @studypilot/web build` | Pass clean (`vite build`). |

### Review-fix verification (2026-10-24)

| Command | cwd | Result |
|---|---|---|
| `pnpm exec jest --runInBand` on the data-scoping and e2e specs, disposable database `sp114_fix_20261024` (dropped after) | `apps/api` | Pass — 2 suites, 69 tests. |
| `pnpm exec eslint` on those two specs `--max-warnings 0`; prettier check | `apps/api` | Pass. |
| Headless Chrome 155.0.8059.85 walk | local web `:3000` / API `:4000` | 12/12 observations passed. See [browser-error-retry.md](./browser-error-retry.md). |

## Changed paths / commit scope

- `apps/api/src/modules/assignments/assignments-e2e.spec.ts` — extended with PATCH, DELETE, ownership, validation, and null-semantics e2e tests.
- `docs/stories/EP03/SP-114/artifacts/SP-114F/checkpoint.md` — child checkpoint.
- `docs/stories/EP03/SP-114/artifacts/SP-114F/implementation.md` — this child implementation record.
- `docs/stories/EP03/SP-114/artifacts/SP-114/implementation.md` — parent implementation index.
- `docs/stories/EP03/SP-114/README.md` — execution fields and queue table updated.
- `docs/stories/EP03/SP-114/SP-114F-assignment-edit-delete-integration.md` — status updated.
- Unrelated pre-existing dirty files preserved and excluded: `.gitignore`, `docs/stories/EP03/SP-113/**`.

## Remaining / review handoff

Review-fix pass for IR-114-01 through IR-114-05 is implemented. Request **one combined independent SP-114 parent re-review** of D/E/F, including the fix commit after E `5b1f33b` and this F closeout commit. Formal passing `review.md` + `walkthrough.md` remain reviewer-owned. This record does not claim approval. The untracked pass-1 `review.md` is preserved and not edited.
