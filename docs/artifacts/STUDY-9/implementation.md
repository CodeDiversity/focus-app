# STUDY-9 (SP-102) Implementation Summary

## Task: Login, Logout, and Session Management

**Story:** [SP-102](../../stories/EP01/SP-102-login-logout-sessions.md) — Epic EP01, Milestone M1, Priority High/P0

**Status:** Implemented in working tree (not committed)

**Date:** 2026-10-13

---

## Implementation Overview

JWT access tokens (15 minutes) with opaque refresh tokens delivered as an
httpOnly cookie, rotating on every refresh, with strict reuse detection that
revokes the whole token family, and per-device (per-family) logout.

## Backend

### Endpoints (`apps/api/src/modules/auth/auth.controller.ts`)

- `POST /auth/login` — `200 { accessToken, user: { id, name, email } }` plus
  `Set-Cookie: refresh_token`; wrong credentials (unknown email or bad
  password) return `401 Invalid email or password` with no enumeration hint.
  Email is normalized (trim + lowercase) before lookup.
- `POST /auth/refresh` — no `JwtAuthGuard` (an expired access token must not
  block refresh). Reads the cookie, rotates, sets the new cookie, returns the
  same `{ accessToken, user }` shape as login. Failures clear the cookie and
  return a generic `401 Invalid or expired session`.
- `POST /auth/logout` — no `JwtAuthGuard`; authorized by the refresh cookie.
  Revokes only that cookie's token family, clears the cookie
  (`refresh_token` empty, `Max-Age=0`, `Path=/auth`), returns
  `200 { message: 'Logged out successfully' }`. Idempotent: missing, unknown,
  or already-revoked cookies still clear and return 200.
- The raw refresh token never appears in a response body: `AuthService`
  returns it in an internal `AuthResult.refreshToken` field and the controller
  strips it after setting the cookie (covered by `auth.controller.spec.ts`).

### Refresh tokens (`apps/api/src/modules/auth/auth.service.ts`)

- Raw token: `crypto.randomBytes(32)` base64url; only its SHA-256 hash is
  stored in `RefreshToken.tokenHash`. Raw/hashed tokens are never logged.
- `login` creates a new `familyId` per login/device with a 30-day expiry.
- `refresh(rawToken)`: unknown or expired → generic 401; already
  rotated/revoked (`revokedAt` or `replacedByTokenId` set) → reuse detected,
  the entire family is revoked (`updateMany` on `familyId`) and a generic 401
  is returned; otherwise a successor row is created in the same family with a
  fresh 30-day expiry and the presented row is marked
  `replacedByTokenId`/`revokedAt`. No grace window (Decision Q4).
- `logout(rawToken)` revokes only the presented token's family; other
  families (devices) of the same student stay active.
- Deleted `createSession`/`validateSession` and the old
  `refresh(user)`/`logout(userId)` signatures (Decision Q6).
- Login does not gate on `emailVerifiedAt` (SP-103, Decision Q5).

### Cookie and plumbing

- Cookie: `refresh_token`, `HttpOnly; Path=/auth; SameSite=Lax;
  Max-Age=2592000`, plus `Secure` only when `NODE_ENV=production`
  (Decision Q2: `/auth` is the narrowest path that reaches both refresh and
  logout).
- `cookie-parser` (+ `@types/cookie-parser` dev) added to
  `apps/api/package.json`; registered with `app.use(cookieParser())` in
  `apps/api/src/main.ts`. Cookies are set via `@Res({ passthrough: true })`.
- Access-token lifetime default changed `1d` → `15m` in
  `auth.module.ts` (`JWT_EXPIRES_IN`) and both `.env.example` files
  (`.env.local` untouched). `JwtStrategy`/`JwtAuthGuard` unchanged, so
  protected endpoints still return 401 for missing/invalid access tokens.

### Prisma model and migration

- `apps/api/prisma/schema.prisma`: dropped `Session` / `User.sessions`;
  added `RefreshToken` (`id`, `userId` FK `onDelete: Cascade`, `familyId`,
  `tokenHash @unique`, `expiresAt`, `revokedAt?`, `replacedByTokenId?`,
  `createdAt`, `@@index([familyId])`, `@@map("refresh_tokens")`) and
  `User.refreshTokens`.
- New migration
  `apps/api/prisma/migrations/20261013000000_refresh_tokens_drop_sessions/migration.sql`:
  drops `sessions`, creates `refresh_tokens` with the unique hash index and
  family index. Prior migrations were not edited.

## Frontend

- `apps/web/src/services/api.ts` — axios instance now sends
  `withCredentials: true`. The old "401 → clear → `window.location`" handler
  is replaced with a 401 → single-flight refresh → retry-once interceptor:
  concurrent 401s share one in-flight `POST /auth/refresh`, the retried
  request is never retried again, auth endpoints
  (`/auth/login|refresh|logout|register`) never trigger a refresh, and on
  refresh failure (or a second 401) the token is cleared and a registered
  session-expired handler runs. Exported `refreshAccessToken()` is the
  single-flight primitive and `setSessionExpiredHandler()` is how
  `AuthContext` registers the redirect (no hard reload, SPA state and the
  saved `from` location are preserved).
- `apps/web/src/services/auth.ts` — `refreshToken()` returns and stores
  `{ accessToken, user }`; `logout()` posts to `/auth/logout` (cookie is the
  credential) and always clears the in-memory token in `finally`.
- `apps/web/src/context/AuthContext.tsx` — session restore on mount is one
  silent `POST /auth/refresh` holding `isLoading=true` until it settles; on
  success the user/token are set, on failure the app stays logged out with no
  redirect or toast. Registers the session-expired handler, which clears
  user/token and navigates to `/login` with
  `state: { from: location, sessionExpired: true }`. `logout` clears local
  state regardless of the API result.
- `apps/web/src/pages/Login.tsx` — arriving with session-expired state shows
  `toast.error('Your session has expired. Please sign in again.')` once, and
  successful re-login navigates to the saved `from` (default `/dashboard`).
- Access tokens remain in memory only (`tokenStore` unchanged); the refresh
  cookie is httpOnly and never touched by JavaScript.

## Tests added

Backend (Jest, 38 passed):

- `auth.service.spec.ts` — extended: login generic-401 parity (unknown email
  vs wrong password), email normalization, new refresh family storing only
  the hash; refresh rotation invalidating the old row, reuse revoking the
  whole family, expired and unknown token rejection; logout revoking only
  the current family and idempotent missing/unknown handling. The Prisma mock
  moved from `session.*` to `refreshToken.*`.
- `auth.controller.spec.ts` (new) — login/refresh set the httpOnly
  `Path=/auth` cookie and strip the raw token from the body; logout clears
  the cookie with `Max-Age=0`.

Frontend (Vitest + Testing Library, 26 passed):

- `pages/Login.test.tsx` (new) — 401 shows the generic message without
  navigating; session-expired state toasts the expired message and re-login
  returns to the attempted page.
- `context/AuthContext.test.tsx` (new) — silent refresh restores the session
  on reload; a failed silent refresh stays logged out without redirecting;
  logout clears local state even when the API call fails.
- `services/api.test.ts` (new) — 401 refreshes once and retries with the new
  token, concurrent 401s share one refresh, refresh failure invokes the
  session-expired handler and clears the token, and auth endpoints never
  trigger a refresh.

## Verification (executed)

| Check | Command | Result |
|---|---|---|
| Prisma validate | `prisma validate` (dummy `DATABASE_URL`) | Valid |
| Prisma generate | `prisma generate` | OK |
| Backend typecheck | `pnpm --filter @studypilot/api typecheck` | OK |
| Backend tests | `pnpm --filter @studypilot/api test` | 7 suites, 38 passed |
| Backend build | `pnpm --filter @studypilot/api build` | OK (`dist/main.js` present) |
| Frontend typecheck | `pnpm --filter @studypilot/web typecheck` | OK |
| Frontend tests | `pnpm --filter @studypilot/web test` | 6 files, 26 passed |
| Frontend build | `pnpm --filter @studypilot/web build` | OK |
| Lint | `pnpm lint` | OK (0 errors; pre-existing `no-console` warning in `apps/api/src/main.ts`) |
| Migration apply | `prisma migrate deploy` against an ephemeral PostgreSQL 15 (Homebrew binaries, temp cluster on port 5433; Docker unavailable on this Mac) | OK — all 3 migrations applied; `refresh_tokens` present, `sessions` gone |
| Live smoke test | Built API (`apps/api/dist/main.js`, port 4100) driven by `/tmp/sp102_live.py` | ALL PASS — see below |

Live smoke test detail (2026-10-13, ephemeral DB, since removed): register
201; wrong-password and unknown-email logins both 401
`Invalid email or password`; valid login 200 with
`Set-Cookie: refresh_token=…; Max-Age=2592000; Path=/auth; HttpOnly;
SameSite=Lax` and no raw token in the body; decoded access token lifetime
`exp - iat = 900s` (15 minutes); `GET /users/me` 200 with the token and 401
without; refresh rotated to a distinct cookie and the refreshed access token
worked; reusing the rotated cookie returned 401 and the successor cookie
then also returned 401 (whole family revoked, confirmed in the database:
family row count 2, both revoked, `tokenHash` length 64); a second login
created a new family, logout returned 200 with a cleared
`Max-Age=0; Path=/auth` cookie, refresh after logout returned 401, and a
cookieless logout still returned 200.

This live run caught one defect the unit tests and typecheck had missed:
`import cookieParser from 'cookie-parser'` in `apps/api/src/main.ts`
compiled to a `.default` access under the API's tsconfig (no
`esModuleInterop`) and crashed the built server at bootstrap. Fixed to
`import * as cookieParser from 'cookie-parser'`, rebuilt, and the full live
run above passes on the rebuilt artifact.

## Review fix pass (2026-10-13, responding to `review.md`)

- **SF1 — transactional rotation:** `AuthService.refresh` now runs in
  `prisma.$transaction` and atomically claims the presented row with a
  conditional `updateMany` (`revokedAt: null, replacedByTokenId: null`,
  pointing at a pre-generated successor id). Only one concurrent caller can
  win the claim; losers and reuse presentations revoke the family and get
  the generic 401. Added a stateful concurrent-refresh unit test (exactly
  one of two racing refreshes succeeds) and re-verified live: two parallel
  `POST /auth/refresh` calls with the same cookie returned `[200, 401]`.
- **SF2 — stronger tests:** the logout spec now runs against stateful
  two-family rows and asserts the second family stays active, and a new
  `AuthContext` test drives the real interceptor into the registered
  handler and asserts navigation to `/login` with
  `sessionExpired: true` and the saved `/dashboard` location.
- **SF3 — single-flight boot restore:** `authService.refreshToken()` now
  delegates to the api module's `refreshAccessToken()`, so boot restore
  and interceptor refreshes share one in-flight rotation; covered by a new
  test asserting two concurrent boot refreshes issue one HTTP refresh.
- **DoD 6/7 — test backing:** `Login.test.tsx` gains a keyboard-only
  completion test (focus order email → password, Enter submits, lands on
  the dashboard) and a responsive-layout test asserting the mobile-first
  single-column classes (`px-4 sm:px-6 lg:px-8`, `max-w-md w-full`).
- **P1 — timing parity:** unknown-email logins now run Argon2 verification
  against a lazily generated dummy hash, so they cost the same as
  wrong-password logins.
- **P2 — hash-free refresh path:** the refresh lookup now selects only
  `id`, `name`, and `email` for the related user instead of loading the
  full row with its password hash.
- **Cookie-parser import:** `main.ts` uses
  `import cookieParser = require('cookie-parser')`. The earlier namespace
  import typechecked under the API tsconfig but is not callable under
  `esModuleInterop` configurations (and the original default import was
  not callable at runtime under the API tsconfig); the `import = require`
  form is callable and typechecks under both.
- P3 (the `/forgot-password` link awaiting SP-105) is unchanged: it
  predates this story and building that flow is SP-105's scope.

Re-verification after the fix pass: backend 39 tests passed, frontend 30
tests passed, both typechecks pass, `pnpm lint` passes, both builds pass,
and the full live script (`/tmp/sp102_live.py`) passes again on the rebuilt
API together with the concurrent-refresh race check above.

## Prisma 7 upgrade addendum (2026-10-13)

The project was upgraded from Prisma 5.22 to Prisma 7.10 after the editor's
Prisma 7 tooling rejected the schema `datasource url` (still valid in 5.x):

- `apps/api/prisma/schema.prisma`: `datasource` now declares only the
  provider; the generator switched to `prisma-client` with
  `output = "../src/generated/prisma"` (generated client is gitignored via
  `.gitignore` and regenerated by `pnpm --filter @studypilot/api db:generate`,
  which CI already runs before typecheck/build).
- New `apps/api/prisma.config.ts` holds the Migrate/CLI datasource URL,
  read from `DATABASE_URL` in the environment (empty when unset so
  `prisma generate` still runs); no connection string is hard-coded.
- `PrismaService` now passes a `PrismaPg` driver adapter
  (`@prisma/adapter-pg`, `connectionString` from the environment) to the
  generated `PrismaClient`, and the `Prisma` namespace imports in the
  exception filter moved from `@prisma/client` to the generated client.
  `apps/api/tsconfig.json` excludes `prisma.config.ts` from the app program.
- Re-verified on 7.10: `prisma validate` and `prisma generate` pass,
  `prisma migrate deploy` applied all migrations to an ephemeral
  PostgreSQL 15, backend 39 tests and frontend 30 tests pass, both
  typechecks, lint, and both builds pass, and the full live SP-102 script
  plus the concurrent-refresh race (`[200, 401]`) pass on the rebuilt API.
  The ephemeral database was removed afterwards.

## Open items

- The live database was an ephemeral local cluster created for this
  verification and removed afterwards; apply the migration to any shared dev
  database with `pnpm --filter @studypilot/api db:migrate` (CI uses
  `prisma migrate deploy`).
- A second browser tab racing a rotation can still force a re-login
  (accepted edge, Decision Q4). Refresh-token row pruning and rate limiting
  remain out of scope per the story.
