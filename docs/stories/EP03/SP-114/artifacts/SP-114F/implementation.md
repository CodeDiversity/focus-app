# SP-114F implementation

**Status:** Implemented — awaiting combined SP-114 parent review (2026-10-24).
**Scope:** F only: e2e tests, DoD-10 manual sign-off, parent implementation index.
**Baseline:** `74822fd` (SP-114E implementation).
**Contract / story:** [shared API contract](../../README.md#shared-api-contract),
[SP-114F](../../SP-114F-assignment-edit-delete-integration.md).

## Acceptance criteria outcomes

| AC | Outcome / evidence |
|---|---|
| 1 — E2E PATCH flow | **Pass.** Extended `apps/api/src/modules/assignments/assignments-e2e.spec.ts`: `POST` creates assignment on course; `PATCH /assignments/:id` updates title, description, due date, estimated hours, and priority; returns 10-key projection; verifies DB row merged values; refetches `GET /courses/:id` and verifies updated assignment in projection. |
| 2 — E2E DELETE flow & task cascade | **Pass.** `DELETE /assignments/:id` returns 204 No Content with empty body; verifies assignment is null in DB; verifies removal from `GET /courses/:id` projection; verifies seeded child task survives deletion with `assignmentId: null` and intact `userId` (D114-4). |
| 3 — E2E ownership scoping | **Pass.** Student B attempts to PATCH and DELETE student A's assignment, as well as foreign, missing (random UUID), and malformed IDs; all return uniform 404 `Resource not found` without modifying student A's assignment or course detail projection; student B owns 0 assignments. |
| 4 — E2E validation matrix | **Pass.** Invalid inputs on PATCH (whitespace-only title, title > 200 chars, invalid date string, invalid leap year date `2026-02-30`, estimated hours `<= 0`, `> 1000`, non-numeric, invalid priority enum, description > 2000 chars, lifecycle fields `status`/`actualHours`, `courseId`, `userId`) rejected with 400 field-level errors and zero DB writes. |
| 5 — E2E null semantics (D114-5) | **Pass.** Explicit `null` for `dueDate`, `estimatedHours`, `priority` retains existing stored values; `description: ''` clears stored description; empty body `{}` and all-null body reject with 400 "At least one field must be provided". |
| 6 — DoD-10 manual sign-off | **Pass.** Executed against running dev stack using headless Google Chrome 155.0.8059.85 via REA scenario harness: course detail header & row controls (`ev_7a48096d…`), edit flow with mode-aware hints & `"Assignment updated."` live-region announcement with no toast (`ev_bd80d565…`, `ev_83a9386e…`), client validation error (`ev_60464c22…`), description clearing (`ev_ed3fb6cf…`), delete cancel flow (`ev_79d2b82b…`), delete execution with `"Assignment deleted."` announcement & empty state transition (`ev_df4560d3…`), keyboard focus and Escape trap (`ev_e93c10b2…`), and mobile 390x844 responsive pass (`ev_05705984…`). |

## Findings / deviations and final dispositions

Findings/deviations: None.

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

## Changed paths / commit scope

- `apps/api/src/modules/assignments/assignments-e2e.spec.ts` — extended with PATCH, DELETE, ownership, validation, and null-semantics e2e tests.
- `docs/stories/EP03/SP-114/artifacts/SP-114F/checkpoint.md` — child checkpoint.
- `docs/stories/EP03/SP-114/artifacts/SP-114F/implementation.md` — this child implementation record.
- `docs/stories/EP03/SP-114/artifacts/SP-114/implementation.md` — parent implementation index.
- `docs/stories/EP03/SP-114/README.md` — execution fields and queue table updated.
- `docs/stories/EP03/SP-114/SP-114F-assignment-edit-delete-integration.md` — status updated.
- Unrelated pre-existing dirty files preserved and excluded: `.gitignore`, `docs/stories/EP03/SP-113/**`.

## Remaining / review handoff

All authorized implementation work for SP-114 is finished. Request **one combined independent SP-114 parent review** of D/E/F, using the parent index at `./artifacts/SP-114/implementation.md`. Formal DoD-10/11 reviewer-owned `review.md` + `walkthrough.md` remain outstanding for the independent reviewer.
