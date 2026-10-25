# SP-114 combined implementation index

**State:** Implementation complete. User approved the parent review and human walkthroughs on 2026-10-24. Focused web re-verification against `f27c671` passed. See [review](./review.md) and [walkthrough](./walkthrough.md).

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
- Original final implementation commit: `fb95e06`.
- Review-fix commits: E keyboard/announcement fix `5b1f33b`, then
  `b2c1c6e` (fixture-query scoping, browser error/retry evidence, and record
  corrections), then IR-114-06 focus handoff `f27c671`
  (`fix(SP-114E): move focus to a surviving control after assignment deletion`).
- Review the full `baseline..final` range:
  - D: `UpdateAssignmentDto`, `AssignmentsService.update` and `delete`, `AssignmentsController` PATCH/DELETE, service/dto unit tests, data-scoping tests.
  - E: `updateAssignment`/`deleteAssignment` API client, `AssignmentForm` edit mode & description, `DeleteAssignmentDialog`, `AssignmentsSection` row buttons and post-delete focus handoff, `CourseDetailPage` action-aware announcements, component tests.
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
| DoD 6/7 — keyboard & responsive | E accessible button labels, focus trapping in both modals, Escape dismissal, cancel/edit trigger restoration, and post-delete focus on a surviving row action or the empty-state add control (IR-114-06). F's earlier keyboard-only and mobile 390x844 walk remains historical; the new focus journey was executed in Vitest, not a new browser walk. |
| DoD 8 — automated tests | D unit and data-scoping tests, E component test suites (542 passing tests), F e2e suite (815 passing tests across API). |
| DoD 9 — API documentation | Shared API contract in parent README; no database migration required (D114-4 uses Prisma default `SetNull` on tasks relation). |
| DoD 10 — integrated review | Previously recorded happy-path walk remains historical. The missing error/retry cases and the changed pending-delete and consecutive-announcement workflows were executed 2026-10-24 and recorded in [F's browser evidence](../SP-114F/browser-error-retry.md). User approved the human walkthroughs. |
| DoD 11 — final walkthrough | Saved at [review.md](./review.md) and [walkthrough.md](./walkthrough.md). User approved both on 2026-10-24. |

## Final verification and limitations

Earlier full-suite results, not re-executed against the IR-114-06 focus fix:
- API Jest test suite: **41 suites / 815 tests passed, 0 failures**.
- API `typecheck`, `eslint`, and `build` passed clean.
- Frontend Vitest suite: **45 files / 542 tests passed, 0 failures**.
- Frontend `typecheck`, `lint`, and production `build` passed clean.

IR-114-06 was verified with the focused web tests, eslint, and typecheck recorded in [E's implementation](../SP-114E/implementation.md). On 2026-10-24 23:22 EDT those focused tests and `pnpm typecheck` were re-run from `apps/web` against `f27c671` (exit 0; 3 files / 47 tests). API suites were not re-run: `f27c671` changes only web focus code and SP-114 docs. No new browser walk was run. The user approved the parent review and human walkthroughs.
