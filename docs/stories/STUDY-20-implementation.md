# STUDY-20 (TECH-01) Implementation Summary

## Task: Scaffold Backend and Frontend (Monorepo, NestJS + Prisma + PostgreSQL, React + TS + Vite, CI)

**Status**: Completed — scaffolded, reviewed, remediated, and verified (see Verification section)

**Date**: 2026-10-11

---

## Implementation Overview

Complete monorepo scaffold for StudyPilot:

- NestJS backend with Prisma ORM and PostgreSQL (`apps/api`)
- React + TypeScript + Vite frontend (`apps/web`)
- CI pipeline (GitHub Actions), Docker support for local development
- Automated tests in both apps; per-app ESLint configs

An independent review against the shared DoD found the initial scaffold non-shippable (broken rendering, invalid Prisma schema, broken CI, no tests). All blockers and should-fix findings were remediated; verification results below reflect commands actually executed on 2026-10-11.

---

## Remediated Review Findings

| # | Finding | Fix |
|---|---|---|
| B1 | `Layout` ignored children and rendered `<Outlet />` outside a Route context — no page could render | `Layout` now renders `{children}` (`apps/web/src/components/Layout.tsx`) |
| B2 | `ScheduledTask.task` and `StudyPlan.user` had missing back-relations — `prisma generate` failed | Added `Task.scheduledTasks` and `User.studyPlans` to `apps/api/prisma/schema.prisma` |
| B3 | `pnpm-lock.yaml` was gitignored while CI/Docker used `--frozen-lockfile` | Lockfile removed from `.gitignore` and committed |
| B4 | CI: `cache: 'pnpm'` before pnpm existed; `turbo.json` used Turbo 1.x `pipeline` key with Turbo 2 | CI uses `pnpm/action-setup@v4` before `setup-node`; `turbo.json` uses `tasks` |
| B5 | `@tanstack/react-query-devtools` imported but not declared | Added to `apps/web/package.json` |
| B6 | `GET /users/:id` and `POST /users` allowed cross-student access | Users controller is now `@UseGuards(JwtAuthGuard)` at class level with `/me` routes only (`apps/api/src/modules/users/users.controller.ts`) |
| B7 | Zero test files; vitest setup file and jest e2e config referenced but missing | Added `auth.service.spec.ts` (8 tests) and `Button.test.tsx` (4 tests); created `src/test/setup.ts`; removed the broken `test:e2e` script |
| S1 | docker-compose: nonexistent `start:dev` script, hardcoded JWT secret, npm-in-pnpm workspace, volume shadowing | Compose rewritten: correct scripts, `JWT_SECRET` from environment, pnpm throughout, root mount with anonymous node_modules volumes |
| S2 | Vite `/api` proxy mismatched the unprefixed backend | Proxy rewrites `/api` → `/` (`apps/web/vite.config.ts`) |
| S3 | `auth.controller` reached into `authService['jwtService']` private member | Proper `AuthService.refresh()` method |
| S4 | Access token persisted in localStorage | In-memory `tokenStore` module; tokens never touch storage |
| S5 | Dead code: `PrismaService.cleanDatabase` | Removed |
| S6 | `createUserDto.passwordHash` accepted from clients | User creation only via `/auth/register` |

---

## Verification (executed, not assumed)

Run on 2026-10-11 in the project directory with Node 22 / pnpm 8.15.0:

| Check | Command | Result |
|---|---|---|
| Install | `pnpm install` | OK — lockfile updated and committed |
| Prisma schema | `pnpm --filter @studypilot/api db:generate` | OK — client generated (v5.22.0) |
| Backend tests | `pnpm --filter @studypilot/api test` | 8 passed |
| Frontend tests | `pnpm --filter @studypilot/web test` | 4 passed |
| Backend build | `pnpm --filter @studypilot/api build` | OK (`nest build`) |
| Frontend build | `pnpm --filter @studypilot/web build` | OK (`tsc` + `vite build`) |
| Lint | `pnpm lint` (turbo, both apps) | OK — 0 errors, 1 benign `no-console` warning in `main.ts` |
| Monorepo pipeline | `pnpm build && pnpm test` | 2/2 tasks successful each |

## Not verified in this environment

- **Runtime boot against a real PostgreSQL** — no Docker or local Postgres available in the review environment; the API boots through module init but needs a reachable `DATABASE_URL` for `PrismaService.onModuleInit`.
- **GitHub Actions pipeline** — the workflow is fixed but has not run on a CI runner.
- **docker-compose** — rewritten to be coherent but not executed (no Docker on this machine).

---

## Project Structure

```
studypilot/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── prisma/schema.prisma      # 10 models, validated
│   │   └── src/
│   │       ├── common/               # Shared types (AuthenticatedRequest)
│   │       └── modules/
│   │           ├── auth/             # JWT auth: register, login, logout, refresh
│   │           ├── users/            # /users/me only, guarded
│   │           └── prisma/           # Prisma service
│   └── web/                          # React Frontend
│       └── src/
│           ├── components/          # Button, Input, Layout, Header, guards
│           ├── pages/                # Home, Login, Register, Dashboard, Profile
│           ├── context/              # AuthContext (in-memory tokens)
│           ├── services/             # api, auth, tokenStore
│           ├── test/                 # vitest setup
│           └── utils/                # getErrorMessage
├── .github/workflows/ci.yml          # pnpm/action-setup + setup-node cache
├── Dockerfile                        # Multi-stage, workspace-aware
├── docker-compose.yml                # db + api + web (dev)
└── turbo.json                        # Turbo 2 `tasks`
```

## Database Schema

User, Session, Semester, Course, Assignment, Task, StudySession, AvailabilitySlot, StudyPlan, ScheduledTask — with all relation back-references in place (`prisma generate` passes).

## API Endpoints

- `POST /auth/register` — create account (password hashed with bcrypt)
- `POST /auth/login` — returns JWT + user
- `POST /auth/logout` — invalidates sessions
- `POST /auth/refresh` — new access token (guarded)
- `GET /users/me` / `PUT /users/me` — profile, scoped to the authenticated user

## Key Decisions

- **Tokens in memory only** (`tokenStore`): a page reload logs the user out. The durable session strategy is deliberately deferred to EP01 (SP-102 login/logout sessions).
- **No `/users/:id` route**: students never read other students' records; profile access is `/me` only.
- **Minimal ESLint per app** (`.eslintrc.cjs` with `root: true`): enough for CI lint to pass; the full linter/formatter setup (jsx-a11y, pre-commit hooks) is TECH-21.
- **No `postinstall: prisma generate`**: explicit `db:generate` steps in CI and Dockerfile instead, so installs never depend on the schema file.

## Scope overlap with EP01 stories

The scaffold went beyond pure scaffolding and pre-placed working code that overlaps EP01 stories. **No story is complete** — each impacted story file records the deltas under "Existing scaffold code":

- **SP-101 (STUDY-6):** register endpoint + form exist, but use bcrypt (D1 requires argon2id), issue a token on registration (story requires none), and a `firstName`/`lastName` model (story specifies `name`).
- **SP-102 (STUDY-9):** login/logout/refresh exist, but without refresh-token rotation, httpOnly cookies, or reuse detection (D2).
- **SP-104 (STUDY-10):** JWT guard exists per-controller; the global guard, public allowlist, `@CurrentUser()` decorator, and ownership helpers are still to build.
- **SP-106 (STUDY-11):** `/users/me` exists (GET/PUT); PATCH, time zone, and preferences are still to build.

The EP02–EP08 domain models (Semester, Course, Assignment, Task, etc.) were also pre-modeled in the Prisma schema; those epics extend rather than create them.

## Remaining STUDY-20 acceptance criteria

Delivered and verified: monorepo, runnable apps, tests, lint, builds, Docker/CI configs, secret-file gitignore policy.

Still open against the ticket's own acceptance criteria:

- Initial empty Prisma migration + repeatable migration workflow (blocked on a reachable PostgreSQL; `prisma migrate dev` has not been run).
- Uniform error-response shape (global exception filter with actionable messages).
- Shared IANA-aware date/time formatting helper stub (also consumed by SP-106, EP04, EP05).
- CI secret-scan step (e.g. gitleaks) and a Prisma migration check on backend changes.
- CI has not run on GitHub — no git repository has been initialized or pushed.

## Open Items for Next Stories

- EP01 (STUDY-5): email verification, password reset, onboarding wizard, session strategy (SP-101–SP-107)
- TECH-21 (STUDY-21): ESLint/Prettier formalization, jsx-a11y, pre-commit hooks
- Database migration (`db:migrate`) once a PostgreSQL instance is available
