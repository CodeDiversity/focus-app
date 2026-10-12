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
| Backend tests | `pnpm --filter @studypilot/api test` | 13 passed (8 auth + 5 exception filter) |
| Frontend tests | `pnpm --filter @studypilot/web test` | 11 passed (4 Button + 7 datetime) |
| Backend build | `pnpm --filter @studypilot/api build` run twice | OK — `dist/main.js` present after both runs (regression check for the no-emit defect) |
| Frontend build | `pnpm --filter @studypilot/web build` | OK (`tsc` + `vite build`) |
| Lint | `pnpm lint` (turbo, both apps) | OK — 0 errors, 1 benign `no-console` warning in `main.ts` |
| Monorepo pipeline | `pnpm build && pnpm test` | 2/2 tasks successful each |

---

## Project Structure

```
studypilot/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── prisma/schema.prisma      # 10 models, validated
│   │   ├── prisma/migrations/        # Initial migration (20261011000000_init)
│   │   └── src/
│   │       ├── common/               # AuthenticatedRequest, exception filter
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
│           └── utils/                # getErrorMessage, datetime helpers
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

## Review remediation (2026-10-11, second pass)

All findings from [review.md](./review.md) were remediated:

| Finding | Resolution |
|---|---|
| Silent no-emit backend build (`incremental` + `deleteOutDir`) | `incremental` removed from `apps/api/tsconfig.json`; verified by double-build — `dist/main.js` present both times; CI asserts the artifact |
| No git repository | `git init` on `main` + initial commit (105 files); clone, `.gitignore`, and CI are unblocked |
| No migration workflow | Initial migration `20261011000000_init` generated offline via `prisma migrate diff` (10 tables, 228 lines) + `migration_lock.toml`; CI applies it with `prisma migrate deploy` against a postgres service |
| No secret-scan CI step | gitleaks step added to CI; local execution of the external binary was blocked by the runtime, so a grep-based pattern scan was run locally (clean) — CI performs the full scan |
| Date/time helper stub missing | `apps/web/src/utils/datetime.ts` — IANA-aware `formatDate`/`formatTime`/`formatDateTime`, `isValidTimeZone`, `getBrowserTimeZone` + 7 tests |
| No uniform error shape | `AllExceptionsFilter`: `{ statusCode, message, error, path, timestamp }`, Prisma P2002→409 and P2025→404 mapping, no internal-detail leakage + 5 tests |
| turbo `.next/**` outputs | Removed — `dist/**` only |
| Dead devDeps | `tsconfig-paths` (api) and `eslint-plugin-react-refresh` (web) removed; lockfile refreshed |
| QUICKSTART duplication | Unique content (smoke tests, troubleshooting) folded into README; QUICKSTART.md deleted |
| Unused root ESLint config | Root `.eslintrc.json` removed; per-app `.eslintrc.cjs` files are the configs of record |
| No explicit CI typecheck step (pass-2 review finding) | `typecheck` scripts added to both apps; CI runs them between lint and build |

Still open (environment-dependent, not code):

- CI has not executed on GitHub — the repository has no remote yet. Add a remote and push to see the pipeline run (lint, builds, artifact assertion, 24 tests, `migrate deploy`, gitleaks).
- Runtime boot against a live PostgreSQL — no Postgres/Docker in this environment; the CI postgres service will exercise boot and migration on the first CI run.
- docker-compose has not been executed (no Docker on this machine).

## Open Items for Next Stories

- EP01 (STUDY-5): email verification, password reset, onboarding wizard, session strategy (SP-101–SP-107)
- TECH-21 (STUDY-21): ESLint/Prettier formalization, jsx-a11y, pre-commit hooks
- Push to a GitHub remote so CI can run the full pipeline (the initial migration exists; CI applies it on first run)
