# SP-106A checkpoint

Updated: 2026-10-17 10:05 EDT
Status: in progress
Story: `docs/stories/EP01/SP-106/SP-106A-profile-schema-and-get.md`
Review unit: SP-106 (combined parent review after all children; parent index will be written by SP-106D at `docs/stories/EP01/SP-106/artifacts/SP-106/implementation.md`)
Role / scope: implementer; backend only — `timeZone` + `preferences` on `User` (one additive migration), `GET /users/me` returns them, credentials excluded. Excluded: PATCH/validation (SP-106B), form (SP-106C), round-trip + sign-off (SP-106D).

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at last update: `0da48102f52c109e71bcc1892607fd0664f0bde2` (docs-only SP-106 plan commits; working tree clean)
- Saved work: queue start recorded in the parent README (active/next + A row → In progress)
- Other work to preserve: none observed (clean tree at start)

## Progress

- [x] Reconciled state: clean tree on `main`; code matches the ticket's 2026-10-17 "Inspected" notes (`schema.prisma` User lines 17–41, `users.service.ts` selects, `users.controller.ts`, six migrations through `20261015060000_recovery_rate_limit_buckets`)
- [x] Confirmed consumers: `auth.service.ts` maps `create`/`findById` results to explicit `{id, name, email, emailVerifiedAt}` shapes, so added select fields are additive and non-breaking; local PostgreSQL 15 listening on 127.0.0.1:5432 for `db:migrate` + integration run
- [ ] Schema: `timeZone String @default("UTC")` + `preferences Json?` on `User` (AC1)
- [ ] Migration `*_user_time_zone_preferences` via `pnpm --filter @studypilot/api db:migrate -- --name user_time_zone_preferences` (uses `apps/api/.env.local`; purely additive), then `db:generate` (AC1)
- [ ] New unit spec `users.service.spec.ts` (red → green): `findById` select includes new fields / excludes `passwordHash` + token relations; `create` leaves them unset in `data` (AC2/AC3)
- [ ] `users.service.ts`: add `timeZone` + `preferences` to `findById` and `create` selects only — do NOT touch `update` (SP-106B owns it) (AC2)
- [ ] Extend `users-data-scoping.spec.ts`: GET /users/me 200 with `timeZone: "UTC"`, `preferences: null`, no `passwordHash`/token keys; both students' own-record cases gain the new fields; 401 no-token regression already pinned at spec lines 101–103 (AC2/AC3/AC4)
- [ ] Full verification: `pnpm --filter @studypilot/api exec jest --runInBand` (integration with `dotenv -e .env.local`), `typecheck`, `lint`
- [ ] Write `implementation.md`; update queue (A → Implemented — awaiting parent review; next → SP-106B)
- Current step: schema edit + migration generation

## Decisions and dependencies

- D106-1 (user-approved): first-class `timeZone` column + nullable `preferences Json?` bag; one additive migration; no new model.
- Shared API contract (breakdown README): GET shape `{ id, email, name, emailVerifiedAt, timeZone, preferences, createdAt, updatedAt }`; credentials never selected.
- Prisma 7: datasource URL comes from `prisma.config.ts` (`process.env.DATABASE_URL`); `db:migrate` prefixes `dotenv -e .env.local`. Never read/display `.env*` files.
- Generated client `apps/api/src/generated/` is gitignored — commit schema + migration only, not generated code.
- `prisma migrate dev` must not be run with `--force`; if it prompts for a data-losing reset, stop and record a blocker instead.

## Verification

- Not yet run (implementation starting).
- Expected: `pnpm --filter @studypilot/api exec jest --runInBand` all green (unit always; integration runs when `DATABASE_URL` is provided via `dotenv -e .env.local`); `pnpm --filter @studypilot/api typecheck` clean; `pnpm --filter @studypilot/api lint` clean.

## Resume next

1. Edit `apps/api/prisma/schema.prisma` `User`: add `timeZone String @default("UTC")` and `preferences Json?` (after `emailVerifiedAt` block, before `createdAt`); run `pnpm --filter @studypilot/api db:migrate -- --name user_time_zone_preferences`, then `pnpm --filter @studypilot/api db:generate`; commit.
2. Write `apps/api/src/modules/users/users.service.spec.ts` (mocked `PrismaService`), run `pnpm --filter @studypilot/api exec jest users.service --runInBand` and confirm RED, then add the two select fields to `findById` + `create` and confirm GREEN; commit.
3. Extend `users-data-scoping.spec.ts`; run `cd apps/api && dotenv -e .env.local -- npx jest users-data-scoping --runInBand`; commit.
4. Full suite + typecheck + lint; write `implementation.md`; update parent queue.
- Read next: `apps/api/prisma/schema.prisma` (User model), `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/users/users-data-scoping.spec.ts`, breakdown README "Shared API contract".
