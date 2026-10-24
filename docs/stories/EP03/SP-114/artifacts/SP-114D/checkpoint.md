# SP-114D checkpoint

Updated: 2026-10-24 (implementer session — child complete)
Execution state: [SP-114 README queue](../../README.md#execution-queue) — row D `Implemented — awaiting parent review`
Story: [SP-114D-assignment-update-delete-api.md](../../SP-114D-assignment-update-delete-api.md)
Review unit: SP-114 (parent index `../../SP-114/` written by F; combined parent review)
Role / scope: implementer; backend only — `PATCH /assignments/:id` + `DELETE /assignments/:id` (DTO, service, controller, unit/data-scoping tests). Excluded: status/actualHours updates (story 5), courseId changes, tasks API (story 4), UI (E), e2e extension + DoD-10 sign-off (F).

## Completed — see [implementation.md](./implementation.md)

- [x] `dto/update-assignment.dto.ts` (new) — five optional fields, create's rules when present; lifecycle/association fields undeclared → 400
- [x] `assignments.service.ts` — `update()` (courses pattern: validateSync re-check → findFirst ownedWhere → 404; has() null semantics; at-least-one → 400; merge + merged-value validation; scoped update; P2025 → 404; 10-key projection) and `delete()` (findFirst ownedWhere → 404; scoped delete; void)
- [x] `assignments.controller.ts` — `@Patch(':id')` (200) + `@Delete(':id')` `@HttpCode(204)`
- [x] Unit tests (108 total, 62 new) + data-scoping tests (34 total, 7 new: two-student PATCH/DELETE matrices, 204, real-DB task cascade, 401s)
- [x] Verification: disposable local Postgres (127.0.0.1:55439, removed after) — full api suite 41/796 green; typecheck/lint/format green
- [x] Closeout: implementation.md written; queue/status updated; scoped commit made (hash in task handoff)

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, branch `main`
- Saved work: this child's scoped implementation/closeout commit (hash in the task handoff; not embedded in its own content)
- Other work to preserve (untouched, uncommitted): `.gitignore` (modified), `docs/stories/EP03/SP-113/README.md` (modified), `docs/stories/EP03/SP-113/SP-113-quick-assignment-creation.md` (modified), untracked `docs/stories/EP03/SP-113/artifacts/SP-113/review.md` + `walkthrough.md` — SP-113 reviewer closeout, not this child's.

## Decisions and dependencies

- D114-1…5 per ticket; pattern source `courses.service.update` + `courses.controller`; `assertDto()` helper = one rule source for both validateSync re-checks (create pattern).
- No module change (controller already registered); no schema/migration change (D114-4 `SetNull` default).
- E2E extension is SP-114F's named obligation; D ran the existing e2e as regression only.

## Verification

- Final state: all commands green — see [implementation.md](./implementation.md) for the executed table. Disposable Postgres cluster stopped and removed.

## Resume next

None — child complete. Next queue row: **SP-114E (ui-refiner pass, then implement)**; then SP-114F; then one combined SP-114 parent review.
