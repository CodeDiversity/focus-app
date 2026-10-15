# STUDY-10 / SP-104 Review

Date: 2026-10-14  
State reviewed: working tree based on `20c72634d0e60c6fb10c2beae8fdd0f49fc31c4a`, subsequently committed without implementation changes as `7355f70`.

Reviewed the story, EP01, shared Definition of Done, implementation summary, actual implementation/tests, and CI. Unrelated skill/role changes excluded. Only this report was modified by the review.

## Findings

Blockers: none. Should-fix: none. Optional polish: none identified within scope.

Prior gaps are resolved: P2025 uses the shared `Resource not found` message (`apps/api/src/common/filters/all-exceptions.filter.ts:87`; response assertions in its spec :62). Real SQL regressions cover missing/foreign direct update/delete, equivalent normalized responses, and unchanged foreign data (`apps/api/src/modules/users/users-data-scoping.spec.ts:213`). Ordinary Nest handlers now have missing-token and valid-token regression coverage (`apps/api/src/modules/auth/guards/jwt-auth.guard.spec.ts:131`).

## Acceptance criteria

Abbreviated source paths below are relative to apps/api/src/.

| Criterion | Result | Evidence |
|---|---|---|
| 1. Global default-deny JWT guard; exactly eight public entries | Satisfied | modules/auth/auth.module.ts:40; modules/auth/public-routes.ts:18; modules/auth/guards/jwt-auth.guard.ts:16; guard spec :75; app.module.spec.ts:36. Tests pin allowlist, exact method matching, authentication, and global wiring. |
| 2. CurrentUser principal decorator and controller conversion | Satisfied | common/decorators/current-user.decorator.ts:16 and spec :24; modules/users/users.controller.ts:16; real profile response tests in modules/users/users-data-scoping.spec.ts:120. |
| 3. Documented scoped queries and uniform ownership 404 | Satisfied | common/ownership/ownership.ts:3 and spec :14; repository AGENTS.md:22; common/filters/all-exceptions.filter.ts:87; SQL equivalent-response tests in integration spec :213, :289. |
| 4. Missing/malformed/expired authentication returns 401 | Satisfied | modules/auth/guards/jwt-auth.guard.ts:26; modules/auth/strategies/jwt.strategy.ts:25; real HTTP integration spec :100. |
| 5. Cross-student reads/writes fail; foreign data unchanged | Satisfied | Integration spec :158 scoped reads, :184 bulk mutations, :213 direct mutations, :266 successful owner operations. |
| 6. Real SQL and two accounts registered through API | Satisfied | test/test-http.ts:64 real module graph and Prisma; integration spec :48 registration/login setup. Fresh PostgreSQL-backed run passed all132 tests, no skips. |

GET /auth/login has no handler and returns router-level404. The guard unit test independently pins exact-method authentication. The implementation summary documents this framework reconciliation at line162; no public route is exposed.

No production academic endpoints exist in this story. Helper-level real-SQL isolation matches the story reviewer note (docs/stories/EP01/SP-104-auth-guards-data-scoping.md:127). Existing profile handlers derive target IDs from the authenticated principal.

## Definition of Done

Checklist: docs/epics/README.md:28. UI exclusions: story line149.

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | Acceptance criteria pass | PASS | All6 criteria above;132 automated tests passed without skips. |
| 2 | Invalid-input validation | PASS for applicable backend scope | Real HTTP invalid-token tests at integration spec :100; validation configured at test/test-http.ts:80; existing registration DTO invalid/forbidden-field tests at modules/auth/dto/register.dto.spec.ts:56. No new frontend/DTO behavior. |
| 3 | Student data scoping | PASS | Ownership convention at common/ownership/ownership.ts:8; SQL isolation at integration spec :158; authenticated IDs at modules/users/users.controller.ts:16. |
| 4 | Actionable API errors | PASS | Shared ownership404 at helper :33; filter P2025 :87; filter response spec :62; SQL response equivalence integration spec :213. |
| 5 | Loading/empty/error states | CANNOT VERIFY — not applicable | No UI changes; explicit backend-only scope at story :149. API errors verified under4. |
| 6 | Keyboard accessibility | CANNOT VERIFY — not applicable | No UI interactions changed; story :149. |
| 7 | Responsive layouts | CANNOT VERIFY — not applicable | No layouts changed; story :149. |
| 8 | Automated business-rule tests | PASS | Guard spec :75, ownership spec :14, SQL isolation/mutation integration spec :179. All executed successfully. |
| 9 | API/migration documentation | PASS | docs/artifacts/STUDY-10/implementation.md:23 documents auth/principal, :55 ownership/no schema changes, :188 follow-up and regression evidence. Contract tests cited above. CI migrations precede tests at .github/workflows/ci.yml:69. |
| 10 | Integrated-environment review | PASS | Actual Nest/Passport/Prisma/validation/filter harness at test/test-http.ts:64; fresh PostgreSQL15.18 execution after all4 existing migrations. |

## Actual verification

Isolated PostgreSQL15.18 on loopback55432; all four existing migrations applied successfully. Configuration supplied through process environment. No credential files read. Temporary database stopped after verification.

Command:

```text
pnpm --filter @studypilot/api exec jest --runInBand --no-cache
```

Actual output:

```text
Test Suites: 16 passed, 16 total
Tests:       132 passed, 132 total
Snapshots:   0 total
Time:        2.412 s
Ran all test suites.
```

Exit0; no skipped tests. Expected Prisma P2025 logs come from deliberately denied mutations. git diff --check also passed. The reviewing subagent independently inspected source/tests; parent review session performed fresh execution, rather than relying on implementer claims.

## Scope and limits

No excluded MVP features introduced. Future academic endpoints must adopt ownership scoping and add route-level isolation tests. ScheduledTask parent scoping is documented at ownership.ts:25. Unrouted UsersService.findAll/remove remain explicitly deferred to SP-106 (story :137, :147).

**Verdict: SP-104 meets all six acceptance criteria and all applicable Definition of Done conditions.**
