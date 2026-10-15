# SP-104: Auth Guards and Student Data Scoping

**Story ID:** SP-104
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** High / P0
**Dependencies:** SP-102
**Jira key:** STUDY-10
**Refined:** 2026-10-14

## Summary

Turn the scaffold's per-controller JWT guard into a global, default-deny guard with a single reviewable public-route allowlist, add the `@CurrentUser()` parameter decorator, and establish the documented, leak-free ownership-scoping pattern (uniform 404) that EP02–EP08 will follow verbatim.

## Description

As a student, I want my academic data accessible only to me, so that no other student can read or modify my records.

## Acceptance Criteria

- A global JWT auth guard (registered via `APP_GUARD`) protects **every route** except an explicit public allowlist. The allowlist lives in one file and contains exactly: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/forgot-password`, `POST /auth/reset-password` (the last two are named in SP-105's AC; they are inert entries until SP-105 lands). Default-deny: any other route requires a valid access token.
- A `@CurrentUser()` parameter decorator exposes the authenticated student (the `AuthenticatedUser` object, including `id`) to controllers; `UsersController` is converted to use it as the reference usage later epics copy.
- The ownership convention is established and documented: every Prisma query for academic data includes the authenticated `userId` in the `where`, enforced by a shared helper. Access that is not owned — whether the record does not exist or belongs to another student — returns a **uniform 404** (same status, same generic message). Neither the existence nor the content of another student's record is revealed (Decision Q1 — supersedes the original "403 on mismatch" wording).
- Unauthenticated requests to protected academic data return 401: missing token, malformed token, and expired token all 401.
- A student cannot fetch or modify another student's records: with two seeded accounts, every cross-student read or write fails with the uniform 404 and leaves the other student's data untouched.
- Integration tests against a real database (real `PrismaService`, real SQL) demonstrate cross-student isolation using two accounts registered through the real `POST /auth/register` (Decision Q2).

## Technical Notes

### Decisions

- Q1 (cross-student semantics): **Uniform 404, not 403.** A single ownership-scoped query (`where: { id, userId }`) cannot distinguish "does not exist" from "belongs to someone else", and a 403 distinguishable from a 404 is itself an existence oracle. Both cases return 404 with one generic message — no oracle by construction, one round-trip, and the convention EP02–EP08 copy reduces to the simplest possible rule ("always include the authenticated `userId` in the `where`"). This matches how GitHub/Notion treat private resources. Deliberate, recorded deviation from the original AC wording "403 on mismatch"; the criterion's intent (no other student can read or modify my records, no content/existence leak) is preserved and strengthened.
- Q2 (isolation tests): **Real-Postgres integration tests**, not mocked `PrismaService`. The scoping guarantee is only as strong as the SQL, and a hand-written fake of the query layer would prove wiring, not scoping. CI already runs a `postgres:15` service container with `DATABASE_URL`; the only CI change is moving `prisma migrate deploy` before the test step (it currently runs after). DB specs self-skip when `DATABASE_URL` is unset, so a bare local `pnpm test` without Docker still works; in CI the variable is always set, so they always run.
- Q3 (allowlist): **Eight exact method+path entries, including SP-105's two reset routes now.** Inert until SP-105 implements them; removes the "SP-105 lands, its endpoints 401, someone must remember the allowlist" foot-gun. Matching is exact method+path — `GET /auth/login` is *not* public (401), so an unlisted method on a public path is never silently allowed.
- Trivia, resolved without a question, noted for implementers: the global guard is registered as `{ provide: APP_GUARD, useExisting: JwtAuthGuard }` in `AuthModule`'s providers (co-located with the guard), not via `app.useGlobalGuards` in `main.ts`; the scaffold's class-level `@UseGuards(JwtAuthGuard)` is **removed** from `UsersController` so the global registration is the single source of protection — the integration 401 tests fail loudly if the registration ever breaks; the auth module is untouched otherwise (all its routes are allowlisted); no new environment variables or secrets.

### Global guard

- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` — add a `canActivate` that checks the route before delegating to Passport: non-route handler (`!context.getHandler().isRouteHandler()`) → allow; route in the allowlist → allow; otherwise `super.canActivate(context)` (missing/malformed/expired bearer token → 401). `JwtStrategy` is unchanged (SP-102: bearer `Authorization` header, `JWT_SECRET`, `ignoreExpiration: false`, loads user or 401).
- New `apps/api/src/modules/auth/public-routes.ts` — the one config location for the allowlist: a readonly array of `{ method: string; path: string }` (the eight AC entries) plus `isPublicRoute(method, path)` doing exact comparison against `req.method`/`req.path` (no prefixes, no wildcards, no query-string matching). Any future public route requires an entry here — that is the review point.
- `apps/api/src/modules/auth/auth.module.ts` — add `{ provide: APP_GUARD, useExisting: JwtAuthGuard }` to `providers`. The guard is already a provider/export of this module. No `main.ts` change.
- `apps/api/src/app.module.ts` — no structural change (`AuthModule` import already present).

### `@CurrentUser()` decorator

- New `apps/api/src/common/decorators/current-user.decorator.ts` — a `createParamDecorator` returning `req.user` typed as `AuthenticatedUser` (existing type in `apps/api/src/common/types.ts` — unchanged). It is the only sanctioned way a controller reads the authenticated principal; later epics use it instead of `@Request()`.
- `apps/api/src/modules/users/users.controller.ts` — both handlers convert to `@CurrentUser() user: AuthenticatedUser` (dropping `@Request()` / `AuthenticatedRequest`), and the class-level `@UseGuards(JwtAuthGuard)` is removed (Decision, trivia). `GET /users/me` and `PUT /users/me` behavior is unchanged.
- `AuthController` keeps `@Req()` for its httpOnly refresh cookie reads (SP-102 design); all its routes are public via the allowlist, so the decorator does not apply there.

### Ownership-scoping helper and convention

- New `apps/api/src/common/ownership/ownership.ts`:
  - `assertOwned(userId: string, record: { userId: string } | null | undefined)` — throws `NotFoundException('Resource not found')` when `record` is null/undefined **or** `record.userId !== userId`. Identical status and message for both cases (Decision Q1).
  - `ownedWhere(userId: string, id: string)` — returns `{ id, userId }` for `findUnique`/`update`/`delete` where-clauses on single-record access.
  - `assertAffected(userId: string, count: number)` — throws the same uniform `NotFoundException` when a scoped `updateMany`/`deleteMany` affected 0 rows (not-owned-or-missing).
  - The file-header comment states the convention (see Documentation).
- The convention (documented per AC): **every Prisma query for academic data — `Semester`, `Course`, `Assignment`, `Task`, `StudySession`, `StudyPlan`, `AvailabilitySlot`, `ScheduledTask`, and any model carrying a `userId` relation — includes the authenticated `userId` in the `where`** (via `ownedWhere` or an equivalent scoped where), results pass through `assertOwned`, and mutations assert the affected count. The only legitimate unscoped user lookups are the internal auth flows (login's email lookup); user-facing routes are self-scoped `/users/me` only.
  - `ScheduledTask` has no `userId` column of its own (it hangs off `studyPlanId`/`taskId`): scope through its parent (`studyPlan.userId` / `task.userId`) — flagged for the EP06 implementer.
- Documentation: add a short "Ownership scoping" section to the root `AGENTS.md` (every role's instructions point there; it is the enforceable contract for EP02–EP08 agents) stating the convention in a few lines and linking the helper file, with the helper header comment as the canonical in-code copy. One description, cross-referenced.

### Schema and migration

- **No Prisma model changes, no new migration.** Every academic model in `apps/api/prisma/schema.prisma` already carries `userId` (`onDelete: Cascade`) from the scaffold; scoping lives entirely in the query layer. EPs add their own indexes as their routes land. Do not denormalize ownership or restructure relations in this story.

### Current state (scaffold STUDY-20 + SP-101/102/103)

- `JwtAuthGuard` exists as a bare `AuthGuard('jwt')` subclass with no allowlist logic; applied only via class-level `@UseGuards` on `UsersController` — no `APP_GUARD` anywhere (verified by search).
- `AuthController` exposes the six public routes; they are public today only because no guard is applied to them — after this story they are public *by allowlist entry* instead.
- `common/types.ts` defines `AuthenticatedUser` / `AuthenticatedRequest`; no parameter decorators exist anywhere in `src` yet.
- `UsersService`: `findById`/`update` take a caller-supplied id but the controller passes the token's id (self-scoped in practice); the unrouted `findAll()`/`remove()` carry no ownership logic (see Out of scope).
- Tests: jest (config inline in `apps/api/package.json`, `rootDir: src`, `testRegex: .*\.spec\.ts$`, environment `node`); all existing specs mock `PrismaService` — none touch a database. `app.module.spec.ts` already sets a `JWT_SECRET` fallback, the pattern the integration helper reuses.

### Relevant files

Existing files to change:

- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` — allowlist check before delegating to the Passport strategy.
- `apps/api/src/modules/auth/public-routes.ts` — **new**: the allowlist (one config location, eight entries).
- `apps/api/src/modules/auth/auth.module.ts` — `APP_GUARD` provider registration.
- `apps/api/src/common/decorators/current-user.decorator.ts` — **new**: `@CurrentUser()`.
- `apps/api/src/common/ownership/ownership.ts` — **new**: `assertOwned` / `ownedWhere` / `assertAffected` + convention comment.
- `apps/api/src/modules/users/users.controller.ts` — `@CurrentUser()` usage; remove `@UseGuards(JwtAuthGuard)`.
- `apps/api/src/test/test-http.ts` — **new** helper (not a spec): builds the real HTTP app for integration specs — `Test.createTestingModule` importing `AuthModule`, `UsersModule`, `PrismaModule`, with `EMAIL_PROVIDER` (the symbol from `apps/api/src/modules/email/email-provider.ts`) overridden by a no-op `{ send: async () => {} }` so seeded registrations never touch SMTP, and `main.ts` parity (cookie-parser, global `ValidationPipe`, `AllExceptionsFilter`). Sets the `JWT_SECRET` test fallback. Fails fast with an actionable error if `DATABASE_URL` is unset.
- `apps/api/package.json` — add `supertest` and `@types/supertest` to devDependencies (for the HTTP-level integration spec).
- `.github/workflows/ci.yml` — move the "Apply database migrations" step (`prisma migrate deploy`) to **before** "Run backend tests" (currently after); job env unchanged.
- `AGENTS.md` (repo root) — short "Ownership scoping" section per the convention above.
- `apps/api/src/app.module.spec.ts` — add the wiring assertion that `APP_GUARD` resolves to `JwtAuthGuard`.

### Test cases to add

Unit (colocated `*.spec.ts`, no database):

- `apps/api/src/modules/auth/guards/jwt-auth.guard.spec.ts` (new):
  - `allows each of the eight allowlisted public routes without a token`
  - `does not allow a non-allowlisted method on a public path (GET /auth/login → 401)`
  - `protects unlisted routes (GET /users/me without token → 401)`
  - `delegates to the JWT strategy for protected routes (valid token passes, invalid → 401)`
  - `skips non-route handlers`
- `apps/api/src/common/ownership/ownership.spec.ts` (new):
  - `assertOwned passes for the owning user`
  - `assertOwned throws 404 for another user's record`
  - `assertOwned throws the identical 404 status and message for a missing record (no existence oracle)`
  - `assertAffected throws 404 on a 0-row scoped mutation and passes on 1`
  - `ownedWhere embeds both id and userId`
- `apps/api/src/common/decorators/current-user.decorator.spec.ts` (new): returns `req.user` from a synthetic execution context.
- `apps/api/src/app.module.spec.ts` (extend): `resolves the global guard` — `moduleRef.get(APP_GUARD)` is a `JwtAuthGuard`.

Integration — `apps/api/src/modules/users/users-data-scoping.spec.ts` (new; real DB; self-skips via `describe.skip` when `DATABASE_URL` is unset; two students seeded through `POST /auth/register` with per-run unique emails, cleanup by user id in `afterAll` so `onDelete: Cascade` removes their rows; supertest against the compiled app from the `test-http.ts` helper):

Guard layer, real HTTP:

- `GET /users/me with no Authorization header returns 401`
- `GET /users/me with a malformed bearer token returns 401`
- `GET /users/me with an expired token returns 401` (signed in-test with the same `JWT_SECRET`, past `exp`)
- `each of the two students receives 200 with their own profile on /users/me` (own-record access for both)
- `POST /auth/register remains public without a token` (allowlist regression)
- `GET /auth/login returns 401` (method+path exactness regression)

Ownership layer, real SQL (semesters seeded directly through the test's `PrismaService`; access asserted through the ownership helper — EP02+ adds the routes):

- `student A cannot read student B's semester (uniform 404, zero content returned)`
- `student A cannot update student B's semester (404, 0 rows affected, B's fields verified intact via the test's unscoped read)`
- `student A cannot delete student B's semester (404, row still exists)`
- `student A can read, update, and delete their own semester`
- `a missing id and another student's id produce the identical 404 status and body` (oracle check over real SQL)

Reviewer note: there is deliberately **no** route-level cross-student 404 test for academic data — no academic routes exist until EP02+. When EP02 lands its semester routes, they inherit the helper pattern and write route-level equivalents; do not flag their absence here.

### Environment variables

- **No new variables, no new secrets.** By name only: `JWT_SECRET` (strategy fails fast if unset; tests set a placeholder), `DATABASE_URL` (integration specs; locally via `docker compose up db`), `JWT_EXPIRES_IN` (unchanged, 15m default).

### Security

- Default-deny authentication: the global guard protects every route, present and future, unless explicitly allowlisted. A forgotten allowlist entry fails safe (a would-be-public route 401s) rather than exposing data.
- Academic data is scoped to the authenticated student everywhere (DoD item 3); the documented convention plus helper makes it reviewable, and the tests above pin the guarantee in real SQL.
- No user-enumeration leaks: the users module exposes only self-scoped `/users/me` routes; the unrouted, unscoped `UsersService.findAll`/`remove` are unreachable over HTTP (flagged for SP-106); login/refresh/logout keep SP-102's generic 401s.
- The uniform 404 (Decision Q1) removes any record-existence oracle from the documented pattern, and helper error messages never echo record content (generic `Resource not found`).
- The refresh-token model (SP-102) is untouched: rotation, reuse detection, and cookie handling are unchanged.

### Out of scope

- Academic-data routes (semesters, courses, assignments, …) — EP02–EP08 build on the pattern; this story creates no academic endpoints (SP-107's minimal semester-create remains SP-107's).
- Any Prisma schema or migration change — none is needed; EPs add their own indexes.
- Rate limiting / brute-force throttling (deferred per SP-102 Decision Q8; later API-wide work).
- The password-reset endpoints themselves (SP-105) — only its two allowlist entries land here.
- The dead, unscoped `UsersService.findAll`/`remove` — flagged for deletion or scoping in SP-106; untouched here (unrouted, hence unreachable).
- Prisma `$extends` middleware / automatic query scoping — considered and rejected: explicit per-query scoping keeps ownership visible in review; middleware hides it and is easy to bypass.
- Frontend changes — none. SP-102's interceptor already turns 401s on protected routes into a single-flight refresh → one retry → session-expired redirect, with the auth endpoints excluded from that flow. DoD items 2, 5, 6, and 7 (frontend validation, UX states, a11y, responsive) are not applicable to this backend-only story; items 3, 4, 8, and 9 are covered above.
- "Log out everywhere" / active-session device management (SP-102 out of scope, unchanged).
- AI features, syllabus parsing, LMS integrations, grade calculations, flashcards, and native mobile apps — excluded from the MVP.
