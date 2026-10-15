# StudyPilot

AI-powered study planner for students with ADHD. Helps students stay organized, manage deadlines, and build effective study habits.

## Project Structure

This is a **monorepo** managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turbo](https://turbo.build/repo).

```
studypilot/
├── apps/
│   ├── api/          # NestJS Backend
│   └── web/          # React + Vite Frontend
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
- **State Management**: TanStack Query (React Query)
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
- `PUT /users/me` - Update current user profile

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

The five repo agents are available as project-scoped Codex agents in `.codex/agents/`: `implementer`, `planner`, `refiner`, `reviewer`, and `dod-auditor`. The single implementer handles backend, frontend and integration substories sequentially, using layer-specific skills in `.agents/skills/`. It resumes through durable checkpoints and requests one final parent review. See [AGENTS.md](./AGENTS.md) for each role's scope. Reload your agent tool/session after changing role definitions so it discovers `implementer` instead of the retired backend/frontend roles.

Start a new Codex session in this repository after adding or changing agent definitions. For example: “Use the refiner agent to refine SP-105” or “Have the dod-auditor agent audit STUDY-20.” Models and approval settings inherit from the parent session; the two review roles specify a read-only sandbox. Planner and refiner write limits are enforced by instructions.

The original `.vibe/agents/` definitions remain available for Vibe. Codex uses the [project agent TOML format](https://learn.chatgpt.com/docs/agent-configuration/subagents).

### Development workflow

1. Create a feature branch from `develop`
2. Make your changes
3. Run `pnpm lint` and `pnpm test`
4. Commit with descriptive messages
5. Push and create a pull request

## License

MIT
