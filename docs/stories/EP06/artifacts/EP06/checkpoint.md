# EP06 fix-round checkpoint — R-EP06-06 (preferences merge)

Updated: 2026-10-30
Execution state: EP06 parent review unit — fix round for R-EP06-06 (authorized by user 2026-10-30)
Story: docs/stories/EP06/README.md
Review unit: EP06 parent (artifacts/EP06)
Role / scope: implementer; `apps/api/src/modules/users/users.service.ts` (merge instead of replace) + `users-profile-integration.spec.ts` (merge behaviour). Exclusions: any other EP01 file, any EP06 file, studyDefaults shape/bounds, DTO, Jira sync, push, deployment.

## Repository state
- Workspace / branch: /Users/michaelrobert/Desktop/focus-app, main
- HEAD at last update: ba3544e (docs(EP06): record the fix round and open the EP01 preferences-merge fix dispatch)
- Saved work: none yet (this round)
- Other work to preserve: apps/api/tsconfig.json modified (unstaged) — not staged

## Progress
- [x] Create checkpoint
- [x] Implement merge in users.service.ts
- [x] Re-check 4096 cap on merged result
- [x] Update users-profile-integration.spec.ts (lines 147-160) for merge behaviour
- [x] Run users specs, whole API suite, typecheck, lint
- [ ] Write implementation.md fix-round section
- [ ] Reconcile README queue (Active/Next already None)
- [ ] Commit scoped work
- Current step: write implementation.md fix-round section + commit

## Decisions and dependencies
- Shallow merge at top level: `{ ...stored, ...provided }`.
- Stored preferences null/non-object treated as {}.
- 4096-byte cap re-checked on merged result; throw BadRequestException if exceeded.
- No DTO change; no studyDefaults shape/bounds change.

## Verification
- (pending)

## Resume next
1. Edit apps/api/src/modules/users/users.service.ts
2. Edit apps/api/src/modules/users/users-profile-integration.spec.ts
3. Run pnpm --filter api test -- users
- Read next: users.service.ts, update-user.dto.ts, validate-bounded-size.validator.ts