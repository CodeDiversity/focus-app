# StudyPilot

AI-powered study planner for students with ADHD. Helps students stay organized, manage deadlines, and build effective study habits.

## Project Structure

This is a **monorepo** managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turbo](https://turbo.build/repo).

```
studypilot/
├── apps/
│   ├── api/          # NestJS Backend
│   └── web/          # React + Vite Frontend
├── packages/
│   └── config/
│       └── prettier/ # Shared Prettier config (@studypilot/prettier-config)
├── docs/             # Documentation & Epics
├── .github/          # GitHub Actions
├── package.json      # Root package.json
├── turbo.json        # Turbo configuration
└── pnpm-workspace.yaml
```

## Tech Stack

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Passport

### Frontend
- **Framework**: React 18
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit + RTK Query (auth state in an RTK slice; server data via RTK Query over the shared axios transport in `apps/web/src/shared/api/httpClient.ts`)
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+
- PostgreSQL
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd studypilot
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Copy example files
cp .env.example .env
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local

# Edit the files with your actual values
```

4. Initialize database:
```bash
cd apps/api
pnpm db:generate
pnpm db:migrate
```

5. Start development servers:
```bash
# In one terminal - start backend
pnpm --filter @studypilot/api dev

# In another terminal - start frontend
pnpm --filter @studypilot/web dev
```

Or use Turbo to run both:
```bash
pnpm dev
```

### Development email inbox

For local development with `pnpm dev`, install and start Docker Desktop (or
Docker Engine with the Compose plugin), then run from the repository root:

```bash
pnpm email:up
```

This uses the standalone `compose.mailpit.yml` and requires no root `.env` or
`JWT_SECRET`. SMTP and the inbox bind only to localhost. Add these settings to
`apps/api/.env.local`, preserving your database and authentication settings:

```dotenv
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM="StudyPilot <noreply@studypilot.local>"
FRONTEND_URL=http://localhost:3000
```

Leave `SMTP_USER` and `SMTP_PASSWORD` unset for Mailpit. Restart the API after
changing environment settings. Register or use **Resend verification email**
(wait for the resend cooldown if needed), then open <http://localhost:8025>.
Mailpit captures messages locally; they do not reach real email accounts.

To stop the inbox, run `pnpm email:down`. Messages are temporary and are removed
when the container is removed. Run `pnpm email:up` again to start a new inbox.

If port 1025 or 8025 is already occupied, stop the earlier Mailpit instance first.
For the standalone container used during manual setup, run
`docker stop studypilot-mailpit`. Run only one local inbox at a time.

Without pnpm, the equivalent start command is:

```bash
docker compose -f compose.mailpit.yml up -d
```

### Using Docker

Start all services with Docker Compose:
```bash
docker compose up -d
```

This will start:
- PostgreSQL database
- Backend API (port 4000)
- Frontend app (port 3000)
- Mailpit inbox (port 8025)

The full stack requires `JWT_SECRET` in your shell or root `.env`. When running
the API and frontend through pnpm, use `pnpm email:up` above instead: selecting
only `mailpit` in the full-stack file still validates the API's required variables.

## Scripts

### Root
```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all apps
pnpm lint         # Run linter
pnpm test         # Run all tests
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run database migrations
pnpm db:push      # Push schema changes to database
pnpm email:up     # Start the local Mailpit inbox (Docker required)
pnpm email:down   # Stop and remove the local inbox
pnpm clean        # Clean all builds and node_modules
```

### Backend (apps/api)
```bash
pnpm dev          # Start dev server with hot reload
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run linter
pnpm test         # Run unit tests
pnpm test:e2e     # Run e2e tests
```

### Frontend (apps/web)
```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview       # Preview production build
pnpm lint         # Run linter
pnpm test         # Run tests
```

### Linting & Formatting

Both apps share a single Prettier configuration from the workspace package
[`packages/config/prettier`](packages/config/prettier)
(`@studypilot/prettier-config`). The root `.prettierrc.cjs` points to it so
editor integrations and root-level runs resolve the same settings.

**Formatting** (Prettier):

```bash
pnpm --filter @studypilot/api format         # check; fails if any file is unformatted
pnpm --filter @studypilot/api format:write   # apply fixes
pnpm --filter @studypilot/web format
pnpm --filter @studypilot/web format:write
```

From an app directory, `pnpm format` / `pnpm format:write` work the same way.
`format` runs Prettier in `--check` mode, so it is safe to use as a gate;
`format:write` is the fix step.

**Linting** (ESLint):

```bash
pnpm --filter @studypilot/api lint   # TypeScript + Prettier-as-rule; fails on any error or warning
pnpm --filter @studypilot/web lint   # adds React, React Hooks, and jsx-a11y; fails on any error or warning
pnpm lint                            # both apps via Turbo
```

The backend config (`apps/api/.eslintrc.cjs`) extends `eslint:recommended`,
`@typescript-eslint/recommended`, and `prettier/recommended` (Prettier runs as
an ESLint rule, so formatting problems surface in lint output). The frontend
config (`apps/web/.eslintrc.cjs`) adds `react/recommended`,
`react-hooks/recommended`, and `jsx-a11y/recommended` plus explicit
accessibility rules. The generated Prisma client (`apps/api/src/generated`) is
excluded from linting and formatting.

**Overriding rules:** use an `eslint-disable` comment for a one-off exception,
or add an `overrides` entry to the app's `.eslintrc.cjs` for file-specific
rules:

```js
// eslint-disable-next-line no-console
console.log('one-off debug statement');
```

Formatting has no per-file override: change the shared settings in
`packages/config/prettier/.prettierrc.cjs` (affects all apps) and re-run
`format:write` in each app.

**Pre-commit hooks:** `husky` and `lint-staged` run on every `git commit`,
checking **staged files only** (never the whole codebase):

| Staged files | Commands |
|---|---|
| `apps/api/src/**/*.ts` | `eslint --fix --max-warnings 0`, `prettier --write` |
| `apps/web/src/**/*.{ts,tsx}` | `eslint --fix --max-warnings 0`, `prettier --write` |
| `packages/**/*.{ts,tsx,js,jsx,cjs,mjs}` | `prettier --write` |
| `**/package.json` | `prettier --write` |

Fixable problems (formatting, auto-fixable lint rules) are corrected and
re-staged automatically. Lint errors that cannot be auto-fixed (for example an
unused variable) **reject the commit** — fix the file and commit again. The
hooks install themselves on `pnpm install` (the root `prepare` script runs
`husky`), so run `pnpm install` once after a fresh clone before committing.

To bypass the hook for a deliberate exception (for example a work-in-progress
file), use `git commit --no-verify`. The same lint rules run in CI, so a
bypassed file will still fail the pipeline.

## Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and
pull request targeting `main` or `develop`. The single `build-and-test` job:

1. Checks out the repository.
2. Sets up Node.js 20 and pnpm.
3. Installs dependencies (`pnpm install --frozen-lockfile`).
4. Generates the Prisma client.
5. **Runs the linter** (`pnpm lint` — which delegates to each app via Turbo).
6. Typechecks, builds, and runs tests (both apps) against a PostgreSQL service.
7. Runs a secret scan (gitleaks).

The **lint step fails the build** when lint errors are present, so fixing lint
errors locally before pushing is required. To run the same check locally:

```bash
pnpm lint
```

This is `turbo run lint` which runs each app's ESLint. A local exit code of 0
means the CI lint step would also pass.

## Project Organization

### Backend (apps/api)
```
api/
├── prisma/              # Prisma schema and migrations
├── src/
│   ├── modules/         # Feature modules
│   │   ├── auth/        # Authentication
│   │   ├── users/       # User management
│   │   └── prisma/      # Prisma service
│   ├── main.ts          # Application entry
│   └── app.module.ts    # Root module
├── package.json
└── tsconfig.json
```

### Frontend (apps/web)
```
web/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom hooks
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   ├── context/         # React context
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Application entry
├── package.json
└── vite.config.ts       # Vite configuration
```

## Database Schema

The database schema is defined in `apps/api/prisma/schema.prisma`. Key models:

- **User**: User accounts and profiles
- **Session**: Auth sessions
- **Semester**: Academic semesters
- **Course**: Courses within semesters
- **Assignment**: Assignments with due dates
- **Task**: Individual tasks
- **StudySession**: Study tracking
- **AvailabilitySlot**: User availability
- **StudyPlan**: Daily study plans
- **ScheduledTask**: Tasks scheduled in study plans

## API Documentation

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh JWT token

### Users
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update current user profile

### Smoke-test the API

With the backend running and a local PostgreSQL configured:

```bash
# Register
curl -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Password123","firstName":"Ada"}'

# Login (copy the accessToken from the response)
curl -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Password123"}'

# Get profile
curl http://localhost:4000/users/me -H "Authorization: Bearer <token>"
```

## Definition of Done

Every completed story must satisfy:

1. ✅ Functional acceptance criteria pass
2. ✅ Frontend and backend validation handle invalid input
3. ✅ Academic data is scoped to the authenticated student
4. ✅ API errors produce actionable messages
5. ✅ Loading, empty, and error states are handled
6. ✅ Core interactions support keyboard accessibility
7. ✅ Responsive layouts work on desktop and mobile
8. ✅ Business rules have automated tests
9. ✅ API changes and migrations are documented
10. ✅ The feature has been reviewed in an integrated development environment

## Troubleshooting

### Database connection issues

```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Or with Docker
docker ps

# Test the connection manually
psql -h localhost -U studypilot -d studypilot
```

### Port already in use

```bash
# Find the process using a port
lsof -i :4000
lsof -i :3000

# Stop it
kill -9 <PID>
```

### Clean reinstall

```bash
rm -rf node_modules apps/*/node_modules
pnpm install
```

## Contributing

### Repo agents in Codex

The repo agents are available as project-scoped Codex agents in `.codex/agents/`: `autopilot`, `implementer`, `planner`, `refiner`, `reviewer`, `dod-auditor`, and `jira-sync`. The single implementation owner handles backend, frontend and integration work sequentially, using layer-specific skills in `.agents/skills/`. It resumes through durable checkpoints and requests one final parent review. See [AGENTS.md](./AGENTS.md) for each role's scope. Reload your agent tool/session after changing role definitions.

Every role starts from the parent story README execution queue to find the active/next substory and artifact paths. New and migrated features keep plans and records together under `docs/stories/<epic>/<parent>/`, with per-story records in `artifacts/<story-id>/`. For the active password-reset work, start at [SP-105 execution queue](docs/stories/EP01/SP-105/README.md#execution-queue).

Start a new Codex session in this repository after adding or changing agent definitions. For example: “Use the refiner agent to refine SP-105” or “Have the dod-auditor agent audit STUDY-20.” Models, sandbox and approval settings inherit from the parent session. Each role's write limits also apply through its instructions.

The `.vibe/agents/` and `.opencode/agents/` definitions provide the same roles for Vibe and OpenCode. Codex uses the [project agent TOML format](https://learn.chatgpt.com/docs/agent-configuration/subagents).

### Autopilot through parent approval

Use [autopilot](.agents/skills/studypilot-autopilot/SKILL.md) to coordinate the
remaining delivery gates from any point in a parent's lifecycle. For example:

> Use autopilot for SP-106, starting at implement SP-106B, through final parent approval.

Autopilot reconciles the execution queue, checkpoints, Git and review evidence;
runs planning/whole-plan review when needed; refines eligible unimplemented
children; implements them sequentially; completes integration; and requests one
combined parent review. It routes mandatory findings to the appropriate role
and requests fresh parent reviews until the gate passes or a concrete blocker
needs attention. The named child is an entry hint; this explicit autopilot
invocation authorizes finishing the enclosing parent, including earlier fixes.
Ordinary requests to implement one child keep their original scope.

Every specialist task gets a **new isolated context**, including each child,
resumed task and correction/review pass. Codex dispatch uses
`fork_turns = "none"`; finished agents are never reused. Compact handoffs point
to repository evidence instead of forwarding conversation history. A runtime
without isolated dispatch receives a concrete fresh-session handoff.

The parent README's `Autopilot` section records run scope, stage, in-flight task,
retry state and resume action; its existing execution queue still owns ordering.
To resume after an interruption:

> Resume autopilot for SP-106. Read docs/stories/EP01/SP-106/README.md, reconcile the Autopilot record, live writer ownership, queue and evidence, and continue through final parent approval.

Autopilot pauses for material unanswered decisions, unavailable required gates,
missing permissions, external blockers or repeated corrections without progress.
It preserves tracker/deployment authorization and required human evidence gates.
These instructions coordinate a live agent session; they do not schedule future
sessions automatically. This setup change does not start SP-106 execution.

### Final reviewer walkthrough

For every final implementation review, including reviews without autopilot, the
reviewer creates `walkthrough.md` beside the final `review.md` in the resolved
parent/standalone artifact directory. This separate document explains how the
code works and why the review/test evidence supports correctness after the
correction rounds. It also provides manual steps, prerequisites and expected
results for every applicable workflow, labeling performed checks separately
from unexecuted user instructions or justified non-applicable checks.

Both final documents must be saved and verified before `Reviewed`/complete.
Required manual gates still need actual evidence; a written checklist does not
execute them. Plan-only reviews, interim child reviews and static audits do not
create this final document. See the
[reviewer contract](.agents/skills/studypilot-reviewer/SKILL.md#final-user-walkthrough).

### Development workflow

1. Create a feature branch from `develop`
2. Make your changes
3. Run `pnpm lint` and `pnpm test`
4. Commit with descriptive messages
5. Push and create a pull request

## License

MIT
