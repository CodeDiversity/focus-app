# SP-102: Login, Logout, and Session Management

**Story ID:** SP-102
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** High / P0
**Dependencies:** SP-101
**Jira key:** STUDY-9

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

- Prisma `RefreshToken` model: `id`, `userId`, `familyId`, `tokenHash`, `expiresAt`, `revokedAt`, `replacedByTokenId`.
- Refresh token lifetime: 30 days (rotating). Store token hashes only, never raw tokens.
- Same-origin deployment assumption: Vite dev proxy in development, reverse proxy in production, so the httpOnly cookie works without cross-site cookie complexity.
- Frontend: auth context or hook, fetch/axios interceptor for 401 → refresh → retry, access token held in memory only (not localStorage).
- Automated tests for: rotation, reuse detection, logout revocation, expired refresh.

## Existing scaffold code (from STUDY-20)

- `apps/api/src/modules/auth/` — `POST /auth/login` (passport-jwt), `POST /auth/logout`, `POST /auth/refresh`; a mostly-unused `Session` model with `createSession`/`validateSession` helpers.
- `apps/web/src/pages/Login.tsx`, `context/AuthContext.tsx`, `services/tokenStore.ts` (access token in memory only), `services/api.ts` (401 → redirect to login).

Deltas this story must resolve against the acceptance criteria:

- Access token is signed for 1 day; the story requires **15 minutes**.
- No refresh-token model, no httpOnly cookie, no rotation, no reuse detection — the current `POST /auth/refresh` just re-signs the access token. Build the `RefreshToken` model and rotation here.
- Logout currently deletes `Session` rows; the story requires revoking the token family and clearing the refresh cookie. Remove or replace the `Session` model accordingly.
- The frontend redirects to login on 401; the story requires a **401 → refresh → retry** interceptor that keeps the student signed in across reloads.
