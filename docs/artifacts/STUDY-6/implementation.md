# STUDY-6 (SP-101) Implementation Summary

## Task: User Registration

**Story:** [SP-101](../../stories/EP01/SP-101-user-registration.md) — Epic EP01, Milestone M1, Priority High/P0

**Status:** Completed — implemented per the story's Q4 two-PR sequence (commit 2 = backend + mechanical renames, commit 3 = register form UX)

**Date:** 2026-10-12

---

## Implementation Overview

Registration for students with display name, email, and password. Registration
issues no tokens; the frontend redirects to `/login` (SP-102 owns sign-in).

Landed as two commits matching the story's Q4 decision:

1. **Backend + mechanical frontend renames** — argon2id swap, single-name
   `User` model, `POST /auth/register` returning a flat `{ id, name, email }`,
   plus the frontend field renames needed to keep the monorepo compiling.
2. **Register form UX + tests** — zod rule changes, redirect to `/login`,
   accessible `Input` wiring, and the `Register.test.tsx` suite.

---

## Backend

### Endpoint

- `POST /auth/register` (`apps/api/src/modules/auth/auth.controller.ts` — routing unchanged)
  - 201 with `{ id, name, email }` — no token, no `passwordHash`.
  - 409 with "An account with this email already exists. Please sign in or
    register with a different email." on duplicates.
  - Validation via the existing global `ValidationPipe`
    (whitelist + forbidNonWhitelisted) and `AllExceptionsFilter`.

### Hashing (locked decision D1)

- bcrypt → argon2 (`argon2` package, OWASP argon2id defaults: memoryCost 19456,
  timeCost 2, parallelism 1) in `apps/api/src/modules/auth/auth.service.ts` —
  both `register` (hash) and `validateUser` (verify), so login keeps working
  for newly created users until SP-102 rewrites sessions.
- `bcrypt` and `@types/bcrypt` removed from `apps/api/package.json`.

### DTO

- `RegisterDto` (`apps/api/src/modules/auth/dto/register.dto.ts`): required
  `name` (trimmed, `@IsNotEmpty` with "Display name is required"),
  `email` (`@IsEmail`), `password` (`@MinLength(8)`). No composition rules.
- Email normalized (trim + lowercase) before the duplicate check and insert.

### Prisma model and migration

- `User`: `firstName`/`lastName`/`isVerified` → `name String` +
  `emailVerifiedAt DateTime?` (D5 — verification is SP-103).
- Migration: `apps/api/prisma/migrations/20261012000000_user_name_email_verified_at/migration.sql`
  (destructive; dev rows disposable per story Q2).
- Compile-ripple updates: `common/types.ts`, `jwt.strategy.ts`,
  `users.service.ts`, `create-user.dto.ts`, `update-user.dto.ts`.

## Frontend

- `Register.tsx`: single "Display name" field; zod schema mirrors the backend
  (length-only password rule, required name); success toast +
  `navigate('/login', { replace: true })`; no token stored, no user set.
- `services/auth.ts` + `context/AuthContext.tsx`: `register` returns
  `{ id, name, email }`, sets no token/user; signature `(name, email, password)`.
- Mechanical renames: `types/index.ts`, `Header.tsx`, `Dashboard.tsx`,
  `Profile.tsx` (Profile UX itself is SP-106).
- `Input.tsx`: labels now programmatically associated via `useId`
  (`htmlFor`/`id`), errors and hints announced via `aria-describedby`,
  `aria-invalid` on error. This was a pre-existing accessibility gap the new
  tests exposed.
- `Register.tsx` form uses `noValidate` so react-hook-form's field-level
  messages own validation instead of native email-format bubbles (which
  block submit before zod runs and show non-actionable browser text).

## Tests added

Backend (Jest):

- `auth.service.spec.ts` — rewritten: duplicate-email 409, email
  normalization, argon2id hash params and plaintext-never-stored, response
  without token/hash, argon2 verify paths, login/refresh retained.
- `dto/register.dto.spec.ts` (new) — missing/whitespace name, malformed
  email, short password, non-whitelisted `isAdmin`, valid payload.

Frontend (Vitest + Testing Library):

- `Register.test.tsx` (new) — field-level errors without submitting,
  8-char password accepted without composition rules, success redirects to
  `/login` with no token and no authenticated user, 409 toast, loading-state
  button, keyboard-only completion.

---

## Verification (executed, not assumed)

Run on 2026-10-12, Node 22 / pnpm 8.15.0:

| Check | Command | Result |
|---|---|---|
| Prisma client | `npx prisma generate` (apps/api) | OK (v5.22.0) |
| Backend typecheck | `npx tsc --noEmit` (apps/api) | OK |
| Backend tests | `npx jest` (apps/api) | 29 passed |
| Frontend typecheck | `npx tsc --noEmit` (apps/web) | OK |
| Frontend tests | `npx vitest run` (apps/web) | 17 passed |
| Frontend build | `npx tsc && npx vite build` (apps/web) | OK |
| Lint | eslint both apps | OK (0 errors; pre-existing `no-console` warning in `api/src/main.ts`) |
| Backend build | compiled via `tsc --noEmit` | OK |
| Migration apply | `pnpm --filter @studypilot/api db:migrate` | OK — both migrations applied, client regenerated (2026-10-12, after the dotenv-cli script fix) |
| Live-DB smoke test | Prisma + argon2 script against the dev database | OK — create with new model shape, exact duplicate rejected (P2002), argon2 verify round trip, cleanup |

## Environment note

`pnpm --filter @studypilot/api db:migrate` originally failed with P1012
(`DATABASE_URL` not found): the Prisma CLI auto-loads only `.env`, while this
repo keeps dev config in `.env.local`. Fixed by loading the file explicitly in
the `db:*` scripts via `dotenv-cli` (apps/api/package.json) — no secret is
duplicated or committed (`.env.local` is gitignored).

## Open items

- `emailVerifiedAt` is added to the model but only written by SP-103.
- Login (SP-102) must keep its uniform "Invalid email or password" message;
  register-time 409 intentionally allows email enumeration per the story's
  security note.
- Rate limiting on `/auth/register` is out of scope here (tracked in the story).
- `validateUser` does not normalize email casing; SP-102 should normalize on
  login to match register-side normalization.
- The `users.email` unique constraint is case-sensitive (plain `TEXT UNIQUE`);
  case-insensitive duplicate protection relies on service-layer
  normalization. A functional unique index on `lower(email)` (or `citext`)
  would add defense in depth — noted for SP-102's model work.
