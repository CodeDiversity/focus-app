# SP-102: Login, Logout, and Session Management

**Story ID:** SP-102
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** High / P0
**Dependencies:** SP-101
**Jira key:** STUDY-9
**Refined:** 2026-10-13

## Summary

Implement JWT-based authentication with refresh token rotation, reuse detection, and logout revocation.

## Description

As a student, I want to sign in and stay signed in securely across devices, and sign out, so that my account is protected.

## Acceptance Criteria

- `POST /auth/login` with email and password returns a short-lived access token (15 minutes).
- The refresh token is delivered as an httpOnly, Secure, SameSite cookie scoped to the refresh path; it is never exposed to JavaScript.
- Wrong credentials return 401 with a generic "invalid email or password" message (no enumeration hints).
- `POST /auth/refresh` rotates the refresh token: a new pair is issued and the old refresh token is invalidated.
- Reuse of a rotated refresh token invalidates the entire token family (reuse detection) and forces re-login.
- `POST /auth/logout` revokes the token family and clears the refresh cookie.
- Requests with missing or invalid access tokens to protected endpoints return 401.
- The frontend keeps the student logged in across page reloads, transparently refreshes on 401, and redirects to login when the refresh flow fails.
- Login and session-expired states are handled with actionable messages.

## Technical Notes

### Endpoint and DTOs

- `POST /auth/login` in `apps/api/src/modules/auth/auth.controller.ts` — keep `LoginDto` (`apps/api/src/modules/auth/dto/login.dto.ts`); normalize email (trim + `toLowerCase()`) before lookup, matching `register` in `AuthService`. Success: `200 { accessToken, user: { id, name, email } }` plus `Set-Cookie` for the refresh token (see Cookie). Wrong credentials (unknown email or bad password): `401` with the generic message `Invalid email or password` — no distinction between the two cases (no user-enumeration leak).
- `POST /auth/refresh` in `apps/api/src/modules/auth/auth.controller.ts` — **remove `@UseGuards(JwtAuthGuard)`** (the scaffold requires a still-valid access token, which defeats refresh). No request body. Reads the raw refresh token from the cookie, verifies its hash against `RefreshToken`, checks expiry/revocation/reuse, rotates, sets the new cookie, and returns `200 { accessToken, user: { id, name, email } }` (Decision Q1 — same shape as login, so boot restore needs no extra call).
- `POST /auth/logout` in `apps/api/src/modules/auth/auth.controller.ts` — **remove `@UseGuards(JwtAuthGuard)`**; authorized by the refresh cookie instead, so logout still works after the 15-minute access token has expired (Decision Q3). Reads the cookie, revokes that one token family, clears the cookie (`Set-Cookie` with empty value, `Max-Age=0`, same `Path`/attributes), returns `200 { message: 'Logged out successfully' }`. Idempotent: a missing, unknown, or already-revoked cookie still clears the cookie and returns 200 (never 401 — the client must always be able to finish signing out locally).
- `AuthService` (`apps/api/src/modules/auth/auth.service.ts`): `login` creates a new token family per login/device; `refresh(rawToken)` performs rotation + reuse detection; `logout(rawToken)` revokes the family. Delete `createSession`/`validateSession` (Decision Q6). `refresh(user)` scaffold signature is removed.
- Access-token lifetime: change `JWT_EXPIRES_IN` default from `1d` to `15m` in `apps/api/src/modules/auth/auth.module.ts` (`signOptions.expiresIn`) and in the API env example (variable name only: `JWT_EXPIRES_IN`). `JwtStrategy` (`apps/api/src/modules/auth/strategies/jwt.strategy.ts`) is unchanged — it already rejects expired tokens, and protected endpoints keep returning 401 via `JwtAuthGuard` (`apps/api/src/modules/auth/guards/jwt-auth.guard.ts`).
- Login does **not** check `emailVerifiedAt` in this story (Decision Q5); verification gating is SP-103.

### Refresh tokens, rotation, and reuse detection

- Raw refresh token: cryptographically random opaque string (e.g. `crypto.randomBytes(32)` hex/base64url or `uuid` — pick one and use it consistently). Only `SHA-256` (or stronger) hash of the raw token is stored in `tokenHash`; the raw token exists only in the cookie and in flight. Never log raw or hashed tokens.
- Rotation (`POST /auth/refresh`), in a single Prisma transaction:
  1. Hash the presented token and look up the `RefreshToken` row.
  2. Not found, or `expiresAt` in the past → `401` with a generic `Invalid or expired session` message; clear the cookie.
  3. Row already rotated/revoked (`revokedAt` set or `replacedByTokenId` set) → **reuse detected (strict, no grace window — Decision Q4)**: revoke the entire family (set `revokedAt` on every row with that `familyId`), clear the cookie, return `401`.
  4. Otherwise: create the successor row (same `familyId`, new hash, new 30-day `expiresAt`), mark the presented row rotated (`replacedByTokenId` = successor id, `revokedAt` = now), sign a new 15-minute access token, set the new cookie.
- Refresh lifetime: 30 days per token, sliding on rotation (each successor gets a fresh 30 days, matching the ticket's "30 days (rotating)").
- Reuse response stays a generic 401 — do not tell the client "reuse detected" vs "expired" (no oracle for attackers).
- No background pruning job in this story; expired/revoked rows accumulate until a later cleanup task. Lookups must index `tokenHash` and `familyId` so this stays cheap.

### Cookie

- Name: `refresh_token`. Attributes: `HttpOnly; Path=/auth; SameSite=Lax; Max-Age=2592000` (30 days), plus `Secure` when `NODE_ENV=production` (omitted in local dev so `http://localhost` still works). `Path=/auth` is Decision Q2 — see Decisions for why this deviates from the ticket's literal "scoped to the refresh path" wording.
- Backend cookie plumbing (none exists yet): add `cookie-parser` (+ `@types/cookie-parser` dev) to `apps/api/package.json` and register it in `apps/api/src/main.ts`; set/clear cookies via the Express `@Res({ passthrough: true })` response in `auth.controller.ts`. Do not hand-roll cookie parsing.
- Frontend: the API axios instance in `apps/web/src/services/api.ts` must send cookies — set `withCredentials: true` on the instance (CORS in `apps/api/src/main.ts` already uses `credentials: true`). Same-origin assumption from the original ticket stands: Vite dev proxy (`apps/web/vite.config.ts` — confirm the actual config filename at implementation time) in development, reverse proxy in production, so no cross-site cookie handling is needed.

### Prisma model and migration

- `apps/api/prisma/schema.prisma`:
  - **Drop** the `Session` model and the `User.sessions` relation (Decision Q6).
  - **Add** `RefreshToken`: `id String @id @default(uuid())`, `userId String` (FK to `User`, `onDelete: Cascade`), `familyId String`, `tokenHash String @unique`, `expiresAt DateTime`, `revokedAt DateTime?`, `replacedByTokenId String?`, `createdAt DateTime @default(now())`; `@@index([familyId])`, `@@map("refresh_tokens")`. Add the `refreshTokens RefreshToken[]` relation on `User`.
- New migration (e.g. `20261013000000_refresh_tokens_drop_sessions`): drops `sessions`, creates `refresh_tokens`. Destructive is acceptable — dev rows are disposable (same precedent as SP-101's `20261012000000_user_name_email_verified_at`). Do not edit the existing `20261011000000_init` or `20261012000000_user_name_email_verified_at` migrations.

### Frontend

- `apps/web/src/services/tokenStore.ts` — unchanged contract: access token in memory only, never `localStorage`/`sessionStorage`. The refresh cookie is httpOnly and never touched by JS.
- `apps/web/src/services/api.ts` — replace the current "401 → clear token → `window.location.href = '/login'`" interceptor with a **401 → refresh → retry** interceptor:
  - On a 401 (excluding requests to `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`): run a **single-flight** refresh — concurrent 401s share one in-flight `POST /auth/refresh` promise (Decision Q4) — then retry the original request **once** with the new token.
  - If refresh fails, or the retried request is 401 again: clear the token, clear the user (via a callback/`AuthContext` hook, not a hard `window.location` reload — keep SPA state and the saved `from` location), and redirect to `/login` with session-expired state (Decision Q7).
  - Never retry the retried request a second time (no refresh loops).
- `apps/web/src/services/auth.ts` — `login` already stores the returned access token; `refreshToken()` now returns `{ accessToken, user }` and stores the token; `logout()` posts to `/auth/logout` (cookie carries the credential) and always clears the in-memory token in `finally`.
- `apps/web/src/context/AuthContext.tsx` — session restore on boot: on mount, attempt **one silent refresh** (`POST /auth/refresh`) before clearing `isLoading`. On success, store the token and set `user` from the refresh response; on failure, stay logged out **without** redirecting or toasting (public pages must not be bounced). The current "only fetch profile if an in-memory token exists" init is removed — there is never a token on a fresh load. `logout` clears user + token regardless of the API result.
- `apps/web/src/components/ProtectedRoute.tsx` / `PublicRoute.tsx` — no structural change; they already gate on `isLoading`/`isAuthenticated`, so boot refresh must hold `isLoading=true` until the silent refresh settles.
- `apps/web/src/pages/Login.tsx` — on session-expired redirect, show `toast.error('Your session has expired. Please sign in again.')` (or an equivalent inline banner) and, after successful re-login, navigate to the saved `from` location (already wired via `location.state.from`, defaulting to `/dashboard`).

### Security

- Academic data stays scoped to the authenticated student: refresh/logout act only on the family named by the caller's own cookie; no endpoint accepts a `userId` or `familyId` from the client.
- No user-enumeration leaks: login 401 is identical for unknown email vs wrong password; refresh/logout responses do not reveal whether a token ever existed.
- Raw refresh tokens are never stored, logged, or returned in a response body; only the httpOnly cookie carries them.
- Secrets by name only: `JWT_SECRET` signs access tokens (existing). No new secrets; the refresh token is data, not configuration.

### Relevant files

Existing files to change:

- `apps/api/prisma/schema.prisma` — drop `Session`, add `RefreshToken`, rewire `User` relations.
- `apps/api/src/modules/auth/auth.service.ts` — login issues a family, refresh rotates with reuse detection, logout revokes the family; delete `createSession`/`validateSession`.
- `apps/api/src/modules/auth/auth.controller.ts` — cookie set/clear, unguard refresh/logout, read token from cookie.
- `apps/api/src/modules/auth/auth.module.ts` — access-token lifetime default `1d` → `15m`.
- `apps/api/src/main.ts` — register cookie-parser middleware.
- `apps/api/package.json` — add `cookie-parser` (+ `@types/cookie-parser`).
- `apps/web/src/services/api.ts` — `withCredentials`, 401 → single-flight refresh → retry-once interceptor.
- `apps/web/src/services/auth.ts` — refresh returns/stores `{ accessToken, user }`; logout via cookie.
- `apps/web/src/context/AuthContext.tsx` — silent-refresh session restore on mount.
- `apps/web/src/pages/Login.tsx` — session-expired message; return to attempted page after re-login.

New files to create:

- `apps/api/prisma/migrations/20261013000000_refresh_tokens_drop_sessions/migration.sql` — generated by Prisma migrate (timestamp prefix may vary; never hand-edit prior migrations).

No new frontend/backend modules: rotation lives in `AuthService`, following the existing colocated-module convention.

### Test cases to add

Backend (Jest, colocated `*.spec.ts`, extend `apps/api/src/modules/auth/auth.service.spec.ts`; mock `PrismaService.refreshToken` alongside the existing `session` mock being removed):

- `login > issues a 15-minute access token and creates a new refresh family` — success path stores only the token hash, returns `{ accessToken, user }`, never the raw token or `passwordHash`.
- `login > rejects invalid credentials with a generic 401` — unknown email and wrong password both throw `UnauthorizedException` with the same `Invalid email or password` message (extends the existing invalid-credentials case).
- `refresh > rotates the token and invalidates the old one` — old row gets `replacedByTokenId`/`revokedAt`, successor shares the `familyId`, new pair returned.
- `refresh > rejects reuse of a rotated token and revokes the whole family` — presenting the old token again revokes every row in the family and throws 401.
- `refresh > rejects an expired refresh token` — `expiresAt` in the past → 401, no successor created.
- `refresh > rejects an unknown refresh token` — no row for the hash → 401.
- `logout > revokes only the current family and no other family of the same user` — a second family's rows stay active (Decision Q3).
- `logout > succeeds idempotently with a missing or unknown token` — no throw, no rows changed.
- `auth.controller` cookie behavior (new cases in the same spec style or a new `auth.controller.spec.ts` if the repo grows one): login sets an httpOnly `refresh_token` cookie with `Path=/auth`; refresh sets the rotated cookie; logout clears it with `Max-Age=0`.

Existing backend tests to update: the `refresh` describe block (old "re-signs for the authenticated user" contract is gone) and the Prisma mock (`session.*` → `refreshToken.*`); `apps/api/src/modules/auth/strategies/jwt.strategy.spec.ts` keeps passing unchanged (guard behavior is not modified).

Frontend (Vitest + Testing Library, colocated `*.test.tsx`, style per `apps/web/src/pages/Register.test.tsx` / `Button.test.tsx`; new `apps/web/src/pages/Login.test.tsx`, plus interceptor coverage in a new `apps/web/src/services/api.test.ts`):

- `Login > shows an actionable error on 401 invalid credentials` — generic invalid-credentials message is displayed, no navigation.
- `Login > shows the session-expired message and returns to the attempted page after re-login` — arriving with expired state toasts the expired message; successful login navigates to `from`, not the default.
- `AuthContext > restores the session on reload via silent refresh` — mount with a successful refresh sets the user and stores the token without a login interaction.
- `AuthContext > stays logged out without redirecting when silent refresh fails` — mount on a public page with a 401 refresh renders logged-out UI, no toast, no navigation.
- `api interceptor > refreshes once on 401 and retries the original request` — first call 401 → one refresh → retry succeeds with the new `Authorization` header.
- `api interceptor > shares a single refresh across concurrent 401s` — two parallel 401s trigger exactly one `POST /auth/refresh` (single-flight, Decision Q4).
- `api interceptor > redirects to login when refresh fails` — refresh 401 clears the token/user and navigates to `/login` with expired state; the original request is not retried again.
- `api interceptor > does not attempt refresh for auth endpoints` — a 401 from `/auth/login` surfaces directly (no refresh call, no loop).
- `logout > clears the local session even when the logout request fails` — user and in-memory token are cleared regardless of the API outcome.

### Decisions

- Q1 (refresh contract): `POST /auth/refresh` returns `{ accessToken, user }` (same shape as login); `AuthProvider` restores the session on mount with one silent refresh. No follow-up `GET /users/me` call on boot.
- Q2 (cookie path): Refresh cookie uses `Path=/auth`, not the literal `/auth/refresh`. Rationale: browsers only send a cookie to paths under its `Path`, so a `/auth/refresh`-scoped cookie would never reach `POST /auth/logout`, which must read it to revoke the family and clear it reliably. `Path=/auth` is the narrowest scoping that lets both endpoints work; unrelated APIs never receive the cookie. This is a deliberate, recorded deviation from the acceptance-criteria wording "scoped to the refresh path" — the criterion's intent (never exposed to JS, not sent site-wide) is preserved. Cookie name `refresh_token`; `SameSite=Lax`; `Secure` only in production so local `http` dev still works.
- Q3 (logout scope): Logout revokes **only the current device's token family** (the one named by the caller's cookie); other devices stay signed in, matching "stay signed in securely across devices." Logout is authorized by the refresh cookie, not the access token, and is idempotent (always 200, always clears the cookie).
- Q4 (reuse strictness): Strict reuse detection with **no grace window** — any presentation of an already-rotated token revokes the whole family. Legitimate races are prevented client-side instead: the interceptor single-flights refresh and retries once. A second browser tab racing rotation may still force a re-login; accepted and noted here as a known edge.
- Q5 (email verification): Login does **not** gate on `emailVerifiedAt` in SP-102. Newly registered (unverified) students can sign in; whether/when to block unverified logins is decided in SP-103.
- Q6 (Session model): The legacy `Session` model is dropped outright and replaced by `RefreshToken` in one destructive migration (dev data disposable, per the SP-101 precedent). `createSession`/`validateSession` are deleted — grep confirms they are referenced only inside `auth.service.ts`. Logout no longer `deleteMany`s sessions.
- Q7 (session-expired UX): On refresh failure mid-session, the student is redirected to `/login` with a "Your session has expired. Please sign in again." toast and, after re-login, returns to the originally attempted page (existing `from` plumbing in `ProtectedRoute`/`Login`). Silent boot refresh failures never toast or redirect.
- Q8 (rate limiting): No login/refresh rate limiting in SP-102 (no throttler dependency); deferred to later API-wide rate-limiting work, following the SP-101 precedent for the register endpoint. Recorded under Out of scope so it is not lost.
- Trivia resolved without a question, noted for implementers: raw refresh token is an opaque random string stored only as a hash; each rotation grants a fresh sliding 30-day expiry; expired/revoked rows are not pruned in this story; reuse vs expired both surface as a generic 401; the interceptor's no-refresh endpoint list is `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`.

### Out of scope

- Email verification and any login gating on `emailVerifiedAt` (SP-103); password reset (SP-105) — note reset/change-password should revoke all families when it lands, but building that here is out of scope.
- Auth guards and per-student data-scoping hardening beyond the existing `JwtAuthGuard` behavior (SP-104).
- Rate limiting / brute-force throttling on login or refresh (later API-wide work, Decision Q8).
- A "log out everywhere" endpoint or active-sessions/device management UI.
- Cross-site (separate-domain) cookie handling, CSRF tokens, and refresh-token pruning/cleanup jobs.
- Profile/preferences (SP-106) and onboarding (SP-107); social sign-in.
- AI features, syllabus parsing, LMS integrations, grade calculations, flashcards, and native mobile apps — excluded from MVP.
