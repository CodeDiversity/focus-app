# STUDY-10 (SP-104) Implementation Summary

## Task: Auth Guards and Student Data Scoping

**Story:** [SP-104](../../stories/EP01/SP-104-auth-guards-data-scoping.md) — Epic EP01, Milestone M1, Priority High/P0

**Status:** Implemented in working tree (not committed)

**Date:** 2026-10-14

---

## Implementation Overview

Default-deny authentication as a global guard with a single eight-entry
public allowlist, a `@CurrentUser()` principal decorator, and the
documented leak-free ownership-scoping convention (uniform 404 via shared
helpers) that EP02–EP08 will follow verbatim. Pinned by unit tests and a
real-Postgres integration suite.

## Backend

### Global, default-deny guard

- `apps/api/src/modules/auth/public-routes.ts` (new) — `PUBLIC_ROUTES`, the
  one config location: exactly the eight AC entries (six existing auth
  routes plus SP-105's `forgot-password`/`reset-password`, inert until they
  land). `isPublicRoute(method, path)` compares exact method + path — no
  prefixes, wildcards, or query matching.
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` — `canActivate`:
  skip only handlers that *positively* identify as non-route handlers
  (`typeof handler.isRouteHandler === 'function' && !handler.isRouteHandler()`
  — fail closed; see Defects, D1), allow allowlisted routes, otherwise
  `super.canActivate(context)`. The base Passport `AuthGuard('jwt')` 401s on
  a missing/malformed/expired bearer token and on a token whose user no
  longer exists (verified in the installed `passport`/`passport-jwt`
  sources: token failures take the `fail` path → plain
  `UnauthorizedException`), and attaches the student to `req.user` on
  success. `JwtStrategy` itself is unchanged.
- `apps/api/src/modules/auth/auth.module.ts` — `{ provide: APP_GUARD,
  useExisting: JwtAuthGuard }` in providers. No `main.ts` change; the
  scaffold's class-level `@UseGuards(JwtAuthGuard)` is removed from
  `UsersController` so the global registration is the single source of
  protection.

### `@CurrentUser()` decorator

- `apps/api/src/common/decorators/current-user.decorator.ts` (new) —
  `createParamDecorator` returning `req.user` typed
  `AuthenticatedUser` (existing `common/types.ts`, unchanged).
- `apps/api/src/modules/users/users.controller.ts` — both handlers converted
  to `@CurrentUser() user: AuthenticatedUser`; behavior unchanged.
  `AuthController` keeps `@Req()` for its httpOnly refresh-cookie reads.

### Ownership-scoping helper and convention

- `apps/api/src/common/ownership/ownership.ts` (new) — `ownedWhere(userId,
  id)`, `assertOwned(userId, record)` (uniform 404 for missing **or**
  not-owned), `assertAffected(userId, count)` (uniform 404 on 0-row scoped
  mutation), `RESOURCE_NOT_FOUND` constant, and the full convention in the
  header comment (the canonical in-code copy: every academic query carries
  the authenticated `userId`; `ScheduledTask` scopes through its parents;
  the only unscoped user lookups are internal auth flows).
- `AGENTS.md` (repo root) — new "Ownership scoping" section stating the
  convention in a few lines and linking the helper file.
- No Prisma schema or migration changes: every academic model already
  carries `userId` (`onDelete: Cascade`) from the scaffold.

### Integration test harness and spec

- `apps/api/src/test/test-http.ts` (new; helper, not a spec) —
  `createIntegrationApp()`: the real module graph (`AuthModule`,
  `UsersModule`, `PrismaModule` + process-env `ConfigModule`), the real
  `PrismaService`, `EMAIL_PROVIDER` overridden with a no-op, `main.ts`
  parity (cookie-parser, global `ValidationPipe`, `AllExceptionsFilter`),
  `JWT_SECRET` test fallback, and a fail-fast actionable error when
  `DATABASE_URL` is unset.
- `apps/api/package.json` — `supertest` + `@types/supertest` devDeps;
  `pnpm-lock.yaml` updated (additive only — no existing version bumped).
- `apps/api/src/modules/users/users-data-scoping.spec.ts` (new) — 13 tests,
  real database, two students through the real `POST /auth/register` +
  `POST /auth/login`, per-run unique emails, user deletion in `afterAll`
  (cascade cleans semesters/tokens); self-skips via
  `process.env.DATABASE_URL ? describe : describe.skip`:
  - Guard layer (real HTTP): no token → 401; malformed token → 401; expired
    token (signed in-test, past `exp`) → 401; both students → 200 with their
    own profile; `POST /auth/register` public (409 on a re-register, not
    401); `GET /auth/login` → 404, never a success (see Reconciliation R2).
  - Ownership layer (real SQL): student A cannot read/update/delete student
    B's semester (uniform 404; B's row verified intact via the test's own
    unscoped read); student A can read/update/delete their own; a missing id
    and another student's id produce the identical 404 status **and** message
    over real SQL (no existence oracle).

### CI

- `.github/workflows/ci.yml` — the "Apply database migrations" step
  (`prisma migrate deploy`) moved to **before** "Run backend tests"
  (Decision Q2 prerequisite); job env unchanged.

## Tests added (backend, Jest)

- `modules/auth/guards/jwt-auth.guard.spec.ts` (new) — the eight-entry
  allowlist pinned exactly; each public route allowed without a token;
  `GET /auth/login` (non-allowlisted method) → 401 at guard level; unlisted
  `GET /users/me` → 401; valid hand-rolled HS256 token → real Passport
  strategy accepts and attaches `req.user`; malformed and expired tokens →
  401; non-route handlers skipped.
- `common/ownership/ownership.spec.ts` (new) — all three helpers, including
  identical status+message for missing vs not-owned (no oracle).
- `common/decorators/current-user.decorator.spec.ts` (new) — the stored
  route-args factory returns `req.user` from a synthetic execution context.
- `app.module.spec.ts` (extended) — global guard wiring asserted through
  `ApplicationConfig.getGlobalGuards()` (see Defects, D2).
- `modules/users/users-data-scoping.spec.ts` (new) — the 13 integration
  tests above.

## Verification (executed, 2026-10-14)

| Check | Command | Result |
|---|---|---|
| Backend typecheck | `pnpm --filter @studypilot/api typecheck` | OK |
| Backend lint | `pnpm --filter @studypilot/api lint` | 0 errors (1 pre-existing `no-console` warning in `main.ts`) |
| Unit-only suite (no `DATABASE_URL`) | `pnpm --filter @studypilot/api test` | 15 suites / 117 tests passed, integration suite self-skipped (11 tests) |
| Full suite incl. integration | same, with a local `DATABASE_URL` | **16 suites / 128 tests passed** |
| Migration apply | `prisma migrate deploy` against the local database | All existing migrations applied (none new) |
| Backend build | `pnpm --filter @studypilot/api build` | OK (`dist/main.js`; the test helper compiles too) |

Local database note: this machine has no Docker and no system Postgres, so
the integration run used an ephemeral embedded PostgreSQL (scratch
installation outside the repo, temp data directory, port 55432) which was
removed afterwards. In CI the `postgres:15` service container + the
reordered `migrate deploy` step provide the database, where the suite always
runs.

## Defects caught while implementing

- **D1 — `isRouteHandler` does not exist in Nest v10.** The ticket's guard
  sketch called `context.getHandler().isRouteHandler()`; Nest v10 attaches
  no such marker to route handlers (verified: zero references anywhere in
  `@nestjs`). As written it would have thrown on every protected request.
  Implemented fail-closed: skip only when the handler *positively* reports
  `isRouteHandler() === false`; an unmarked (v10) handler is still
  authenticated. Unit-tested both branches.
- **D2 — `moduleRef.get(APP_GUARD)` cannot work.** The scanner rewrites
  `APP_GUARD` providers to a unique internal token
  (`"APP_GUARD (UUID: …)"`) when registering them, so the bare token never
  exists in any module's provider map. The wiring regression test therefore
  asserts `ApplicationConfig.getGlobalGuards()` (populated by the scanner
  from `APP_GUARD` providers): exactly one global guard, instanceof
  `JwtAuthGuard`.
- **D3 — supertest default import resolves to `undefined` at runtime**
  (no `esModuleInterop` in this tsconfig; the same defect class SP-102
  caught with the cookie-parser import). `test-http.ts` uses
  `import request = require('supertest')`, callable and typechecking under
  both interop settings.

## Reconciliations with the refined ticket

- **R1 — integration spec filename/shape** as specified
  (`*.spec.ts`; `describe` self-skip; `test-http.ts` helper under `src/test`).
- **R2 — `GET /auth/login` over HTTP is 404, not 401.** Express routing is
  method-filtered (`router.route(path).get/post/…`) and Nest mounts only
  registered method+path pairs, so a `GET` on a `POST`-only path matches no
  route and Nest's not-found handler answers 404 before any guard runs.
  The integration test therefore asserts "never a success response" (404);
  the guard-level rule for that method+path pair (not allowlisted → token
  required → 401) is pinned in `jwt-auth.guard.spec.ts`. The ticket's
  intent — a non-allowlisted method on a public path is never served — is
  fully covered.

## Definition of Done

1. ACs pass — verified by the suite above.
2. Frontend/backend validation of invalid input — N/A (no new DTOs;
   existing `RegisterDto`/`LoginDto` validation untouched and exercised by
   the allowlist tests).
3. Academic data scoped to the authenticated student — the core of this
   story (helper + convention + integration proof).
4. Actionable API errors — uniform 404 message; generic 401s preserved.
5–7. Loading/empty/error states, a11y, responsive — N/A (backend-only).
8. Business rules have automated tests — yes (unit + real-SQL integration).
9. API changes and migrations documented — here and in the ticket; no
   schema/migration changes; no new env vars or secrets.
10. Reviewed in an integrated environment — the integration spec runs the
   real app (module graph + passport + Prisma + filters) over HTTP.

## Review follow-up (2026-10-14)

- Fixed the direct-mutation contract gap: `AllExceptionsFilter` now maps
  Prisma P2025 to the shared `Resource not found` message. This applies to
  all P2025 responses, including missing/foreign-owned targets of scoped
  `update` and `delete`; status and error remain 404 / `Not Found`.
  No endpoints, schema changes, migrations, or environment variables added.
- Extended the filter test to pin status, message, and error. Before the
  fix, the regression failed with expected `Resource not found`, received
  `The requested record was not found.`; after the fix it passed.
- Added real-SQL direct-update and direct-delete cases: both missing and
  foreign-owned IDs must yield identical normalized 404 bodies through
  the production filter, and the foreign student's record stays unchanged.
  Successful own-record access now exercises direct update and delete.
- Added ordinary Nest-handler guard coverage without `isRouteHandler`:
  no token returns 401; a valid token authenticates and attaches the student.
  No guard behavior change was required.
- Fresh verification: focused filter/guard tests **15 passed**; backend
  typecheck passed; full source ESLint **0 errors**, one existing
  `main.ts` `no-console` warning; `git diff --check` passed.
- Full backend command `pnpm --filter @studypilot/api test -- --runInBand`
  passed with **15 suites / 119 tests**, **13 database tests skipped** while
  `DATABASE_URL` was unset. Socket binding requires sandbox escalation;
  the initial sandbox attempt failed with `listen EPERM` in the existing
  auth HTTP and SMTP integration suites, and the escalated rerun passed.
- Real-SQL red/green verified independently on a temporary PostgreSQL
  **15.18** instance (loopback port 55432, isolated `sp104` database; no
  credential files). All four existing migrations were applied by the
  parent session before execution. With the old P2025 mapping temporarily
  restored, both direct update/delete regression tests failed on the
  expected message mismatch. Restoring the fix and running the full
  backend suite with process-environment `DATABASE_URL` produced exit 0:

  ```text
  pnpm --filter @studypilot/api test -- --runInBand
  Test Suites: 16 passed, 16 total
  Tests:       132 passed, 132 total
  Snapshots:   0 total
  Time:        2.119 s
  ```

  **No tests skipped.** This supersedes the older 128-test record above.
  Prisma logs expected P2025 errors from the four denied direct mutations;
  the filter's existing unknown-error test also logs its synthetic error.
  Neither indicates a failing test. The temporary database is managed by
  the parent session outside this repository; no shared database was used.

## Open items

- No academic routes exist yet (EP02+); when EP02 lands its semester routes
  they inherit the helper pattern and should add route-level
  cross-student-404 equivalents (the reviewer must not flag their absence
  in this story — see the ticket's reviewer note).
- `ScheduledTask` has no `userId` column; scope through `studyPlan.userId` /
  `task.userId` — flagged for the EP06 implementer (recorded in the helper
  header).
- Dead, unscoped `UsersService.findAll`/`remove` left untouched — flagged
  for SP-106 (unrouted, hence unreachable over HTTP).
- Rate limiting remains deferred per SP-102 Decision Q8.
- Frontend unchanged — SP-102's interceptor already handles 401s with
  single-flight refresh → one retry → session-expired redirect.
- Jira sync: no Jira tooling was available in this session; the story file
  and this artifact remain the source of truth for STUDY-10.
