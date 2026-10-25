# SP-114 combined implementation index

**State:** Ready for one independent combined parent review, 2026-10-24.
Not reviewed/approved.

## Review unit / complete inventory

Parent: [SP-114](../../SP-114-assignment-editing-and-deletion.md).
Execution authority: [canonical queue](../../README.md#execution-queue).

| Child | Evidence | Actual implementation commit scope |
|---|---|---|
| SP-114D — API (PATCH/DELETE) | [implementation](../SP-114D/implementation.md) · [checkpoint](../SP-114D/checkpoint.md) | `286d64f` (`feat(api): implement SP-114D assignment update/delete API`) |
| SP-114E — UI (controls & dialogs) | [implementation](../SP-114E/implementation.md) · [checkpoint](../SP-114E/checkpoint.md) | `74822fd` (`feat(SP-114E): assignment edit and delete UI controls and modals`) |
| SP-114F — Integration / sign-off | [implementation](../SP-114F/implementation.md) · [checkpoint](../SP-114F/checkpoint.md) | F e2e spec plus records/status/index in the commit introducing this index; verified hash returned in implementation handoff. |

## Combined Git range

- Baseline **before the first included implementation change**:
  `0f47d72` (`refine(SP-114): D/E/F tickets against codebase + user decisions 2026-10-24`).
- Final implementation commit: **the commit introducing this index**. Resolve
  its exact hash with `git log -1 --format=%H -- docs/stories/EP03/SP-114/artifacts/SP-114/implementation.md`.
  The verified hash is returned in the F closeout handoff; it is deliberately not
  embedded into its own contents.
- Review the full `baseline..final` range:
  - D: `UpdateAssignmentDto`, `AssignmentsService.update` and `delete`, `AssignmentsController` PATCH/DELETE, service/dto unit tests, data-scoping tests.
  - E: `updateAssignment`/`deleteAssignment` API client, `AssignmentForm` edit mode & description, `DeleteAssignmentDialog`, `AssignmentsSection` row buttons, `CourseDetailPage` action-aware announcements, component tests.
  - F: `assignments-e2e.spec.ts` PATCH/DELETE flows, task orphaning survival, ownership matrix, null semantics, DoD-10 browser walkthrough, parent index.
- Unrelated pre-existing dirty paths preserved and excluded from scope: `.gitignore`, `docs/stories/EP03/SP-113/**`.

## Requirement / DoD coverage

Original requirements and decisions remain in the
[parent traceability / contract](../../README.md#source-requirements-and-test-traceability).

| Requirement | Evidence owner / result |
|---|---|
| AC-E03-01 — assignment management | D principal-scoped PATCH and DELETE endpoints, E per-row controls and modal dialogs, F real HTTP create/patch/delete and refetch journey. |
| AC-E03-02 — editable optional fields | D/E/F title, description, due date, estimated hours, and priority. Partial updates validate only present fields; explicit null retains stored value, `description: ''` clears stored description. |
| DoD 1/2/4 — behavior, validation, actionable errors | D DTO and service re-checks; E client-side form validation and field errors; F e2e invalid-input matrix and uniform 404 behavior. |
| DoD 3 — ownership scoping | D `ownedWhere(userId, id)` for PATCH and DELETE; F two-student cross-user mutation tests returning uniform 404 `Resource not found` with zero writes and untouched student data. |
| DoD 5 — loading/empty/error states | E submitting states, disabled buttons, retry toasts on 5xx/network, and section empty state transition after deletion; F automated and browser verification. |
| DoD 6/7 — keyboard & responsive | E accessible button labels, focus trapping in both modals, Escape dismissal, focus restoration to triggers, and responsive layout classes; F keyboard-only and mobile 390x844 walkthrough pass. |
| DoD 8 — automated tests | D unit and data-scoping tests, E component test suites (542 passing tests), F e2e suite (815 passing tests across API). |
| DoD 9 — API documentation | Shared API contract in parent README; no database migration required (D114-4 uses Prisma default `SetNull` on tasks relation). |
| DoD 10 — integrated review | F real headless Chrome 155.0.8059.85 walkthrough against running dev stack: course detail controls (`ev_7a48096d…`), edit flow (`ev_bd80d565…`, `ev_83a9386e…`), client validation (`ev_60464c22…`), description clearing (`ev_ed3fb6cf…`), delete cancel (`ev_79d2b82b…`), delete execution (`ev_df4560d3…`), keyboard navigation (`ev_e93c10b2…`), and mobile responsive pass (`ev_05705984…`). Combined independent review remains next. |
| DoD 11 — final walkthrough | Reviewer-owned `review.md` and `walkthrough.md` at this directory remain outstanding. |

## Final verification and limitations

Executed commands against final code:
- API Jest test suite: **41 suites / 815 tests passed, 0 failures**.
- API `typecheck`, `eslint`, and `build` passed clean.
- Frontend Vitest suite: **45 files / 542 tests passed, 0 failures**.
- Frontend `typecheck`, `lint`, and production `build` passed clean.
- No open code findings across D, E, or F.

## Independent review request

Coordinator/reviewer: review **the entire SP-114 D/E/F range** above once,
including partial PATCH semantics, D114-5 null semantics, task orphaning on deletion,
ownership scoping without existence oracles, form and dialog accessibility, and live-region
announcements. Save the report at `./review.md` and final passing user walkthrough at
`./walkthrough.md` before any `Reviewed`/complete status. This index makes no
independent verdict and does not waive that final review gate.
