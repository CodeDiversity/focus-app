# SP-101: User Registration

**Story ID:** SP-101
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** High / P0
**Dependencies:** None (first story)
**Jira key:** STUDY-6
**Refined:** 2026-10-12

## Summary

Allow a student to create an account with display name, email, and password, with argon2id-hashed credentials stored and validated input on both frontend and backend. Registration issues no tokens; the student is redirected to login (SP-102).

## Description

As a student, I want to register an account so that I can save my academic information and access it across devices.

## Acceptance Criteria

- Students can register with display name, email, and password via `POST /auth/register`.
- Passwords are hashed with argon2id; plaintext passwords are never stored or logged.
- Duplicate email returns 409 with an actionable message.
- Weak passwords (fewer than 8 characters) and malformed emails/names are rejected by frontend and backend validation with actionable field-level messages.
- Successful registration returns 201 with the created student — `{ id, name, email }` only — and no token and no password data.
- Registration does not issue session tokens; the frontend shows a success toast and redirects to `/login` without authenticating the user (tokens are SP-102).
- The register form handles loading and error states and is keyboard accessible.

## Technical Notes

### Endpoint and DTOs

- `POST /auth/register` in `apps/api/src/modules/auth/auth.controller.ts` — already routed; response shape changes (see below).
- `RegisterDto` (`apps/api/src/modules/auth/dto/register.dto.ts`): replace optional `firstName`/`lastName` with a required `name: string` (`@IsString()`, `@IsNotEmpty()` with actionable message); keep `email: string` (`@IsEmail()`) and `password: string` (`@MinLength(8)`). No password composition rules (NIST-style).
- Normalize email to lowercase (trim + `toLowerCase()`) before duplicate check and insert, so `Ada@example.com` and `ada@example.com` cannot both register.
- Success response: 201 with a flat `{ id, name, email }` object. No `accessToken`, no `passwordHash`. The existing `AuthResponse` (token + user) applies to login only (SP-102).
- Validation errors flow through the existing global `ValidationPipe` (whitelist, forbidNonWhitelisted) and `AllExceptionsFilter` in `apps/api/src/main.ts`; no new plumbing.

### Hashing (locked decision D1)

- Swap bcrypt for argon2id using the `argon2` package — both the `register` path (hash) and `validateUser` (verify) in `AuthService`, so login remains functional for newly created users until SP-102 rewrites sessions.
- Remove the `bcrypt` and `@types/bcrypt` dependencies from `apps/api/package.json`.
- Parameters: argon2id with OWASP-recommended defaults — memoryCost 19456 (19 MiB), timeCost 2, parallelism 1.
- Never log the password or `passwordHash`.

### Prisma model and migration

- `apps/api/prisma/schema.prisma` — `User` model: replace `firstName String?` / `lastName String?` with `name String`, and replace `isVerified Boolean @default(false)` with `emailVerifiedAt DateTime?` (nullable; D5 — verification is SP-103).
- New migration (e.g. `20261012000000_user_name_email_verified_at`): destructive change is acceptable — drop `firstName`/`lastName`/`isVerified`, add `name`/`emailVerifiedAt`. Existing dev rows are disposable; a `prisma migrate dev` reset is fine. Do not edit the existing `20261011000000_init` migration.
- Mechanical compile-fix ripple from the model rename (rename only, no behavior work): `apps/api/src/common/types.ts`, `apps/api/src/modules/auth/strategies/jwt.strategy.ts`, `apps/api/src/modules/users/dto/create-user.dto.ts`, `apps/api/src/modules/users/dto/update-user.dto.ts`, `apps/api/src/modules/users/users.service.ts` (create data + all selects), `apps/api/src/modules/users/users.controller.ts`.
- Frontend ripple: `apps/web/src/types/index.ts` (`User` type: `name`, `emailVerifiedAt`), `apps/web/src/context/AuthContext.tsx`, `apps/web/src/components/Header.tsx`, `apps/web/src/pages/Dashboard.tsx`, `apps/web/src/pages/Profile.tsx` — rename fields to keep the build green; Profile form UX is SP-106.

### Frontend

- `apps/web/src/pages/Register.tsx`: single "Display name" field replaces First/Last name pair. Zod schema: `name` required non-empty, `email` valid, `password` `min(8)` — drop the uppercase and number regex rules (composition rules are out, per NIST policy). Update the password hint text accordingly.
- `apps/web/src/services/auth.ts`: `register` no longer calls `tokenStore.setToken`; return type becomes `{ id, name, email }`.
- `apps/web/src/context/AuthContext.tsx`: `register` sets no user and stores no token; signature becomes `(name, email, password) => Promise<void>`.
- `Register.tsx` on success: `toast.success('Account created...')` then `navigate('/login', { replace: true })`. No email prefill, no cross-page state.
- Keep existing `Input`/`Button` components; error messages are field-level and announced (existing `error` prop wiring).

### Security

- Academic data scoping is not exercised here (no authenticated resources), but the response must never include `passwordHash` or tokens.
- Duplicate email returns 409 with an actionable message per the AC — this knowingly allows register-time email enumeration; accepted for this endpoint since the AC requires it. Login (SP-102) must keep its uniform "invalid email or password" message.

### Test cases to add

Backend (Jest, colocated `*.spec.ts`, extend `apps/api/src/modules/auth/auth.service.spec.ts`):

- `register > rejects when the email is already registered` — existing case, keep; assert 409 message and that `usersService.create` was not called.
- `register > hashes the password with argon2id and stores only the hash` — mock `argon2.hash`; assert `create` receives the argon2 hash and never the plaintext.
- `register > returns the created user without a token or password hash` — assert result has `id`/`name`/`email` only; no `accessToken` property.
- `validateUser > verifies credentials with argon2` — replaces bcrypt mocks; wrong password returns null, success returns user without `passwordHash`.

New `apps/api/src/modules/auth/dto/register.dto.spec.ts` (ValidationPipe-driven):

- rejects a missing/empty `name` with an actionable message.
- rejects a password shorter than 8 characters with an actionable message.
- rejects a malformed email.
- rejects non-whitelisted fields (e.g. `isAdmin`) per `forbidNonWhitelisted`.

Frontend (Vitest + Testing Library, colocated `*.test.tsx`, new `apps/web/src/pages/Register.test.tsx`, style per `Button.test.tsx`):

- shows field-level errors for an empty name, malformed email, and short password without submitting.
- submits and redirects to `/login` on success without storing a token (`tokenStore` untouched, no user set).
- shows an actionable error on 409 duplicate email.
- keeps the submit button in a loading state during submission.
- completes the entire form with keyboard only.

### Decisions

- Q1 (hashing scope): Swap bcrypt for argon2id everywhere in `AuthService` — `register` hashes, `validateUser` verifies; `bcrypt`/`@types/bcrypt` removed. Login stays functional between SP-101 and SP-102.
- Q2 (migration): Destructive migration is acceptable; existing dev rows disposable, `prisma migrate dev` reset OK. The `20261011000000_init` migration is not edited.
- Q3 (post-registration UX): Success toast + `navigate('/login')` with no email prefill and no cross-page state.
- Q4 (story structure): Kept as a single full-stack story — the Prisma rename couples both apps mechanically, so a backend-only story would break the web build. Implementation lands as two PRs in sequence: (1) backend (DTO, argon2 swap, migration, response shape) plus the mechanical frontend field renames to keep the monorepo green; (2) the register form UX (zod schema, AuthContext/register service, toast + redirect) and its tests.
- Trivia resolved without a question, noted for implementers: flat `{ id, name, email }` response body; argon2id OWASP defaults (m=19456, t=2, p=1); zod composition rules dropped alongside the backend's; email normalized to lowercase.

### Out of scope

- Login, logout, refresh rotation, and any token issuance (SP-102).
- Email sending and verification flows (SP-103) — `emailVerifiedAt` is added to the model here but only written by SP-103.
- Profile editing UX and preferences (SP-106) — the Profile page gets only the mechanical field rename to keep the build green.
- Data-preserving migration logic; social sign-in (D3); rate limiting on the register endpoint (worth adding with API-wide rate limiting later).
- AI features, syllabus parsing, LMS integrations — excluded from MVP.
