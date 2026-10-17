# SP-106A implementation

Updated: 2026-10-17 America/New_York
Status: **Implemented — awaiting parent review**
Review unit: SP-106; one combined parent review after all children (B/C/D) land.
Story: [SP-106A](../../SP-106A-profile-schema-and-get.md)

## Delivered

`GET /users/me` now returns the student's stored time zone and preferences, with
credential fields still excluded by the explicit Prisma `select`.

- `apps/api/prisma/schema.prisma` (`User`): `timeZone String @default("UTC")`
  (first-class column, D106-1) and `preferences Json?` (bounded JSON bag for
  EP06 study defaults). No new model, no index changes.
- `apps/api/prisma/migrations/20261017141608_user_time_zone_preferences/`:
  one purely additive migration —
  `ALTER TABLE "users" ADD COLUMN "preferences" JSONB, ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC';`
  Existing rows backfill to `"UTC"` / `NULL`. `migration_lock.toml` picked up a
  Prisma 7 comment reword (`i.e.` → `e.g.`) from the same CLI run — Prisma-managed file.
- `apps/api/src/modules/users/users.service.ts`: `findById` and `create` selects
  gain `timeZone` + `preferences`. `create`'s `data` deliberately leaves both
  unset so the schema defaults apply. **`update` untouched** — SP-106B owns it
  (same file, one writer). `findAll`/`remove` untouched — SP-106B deletes them (D106-7).
- `apps/api/src/modules/users/users.service.spec.ts` (**new**, mocked
  `PrismaService`, no database): `findById` exact select match — pins the new
  fields and fails if `passwordHash` or any token relation is ever added to the
  select; `create` asserts `data` has no `timeZone`/`preferences` keys while the
  select returns the defaulted values.
- `apps/api/src/modules/users/users-data-scoping.spec.ts` (extended, real
  Postgres via the `test-http` harness): both students' own-record cases now
  assert `timeZone: "UTC"` + `preferences: null`; new case asserts a fresh
  student's body carries the new fields and has no `passwordHash` /
  `emailVerificationTokens` / `passwordResetTokens` / `refreshTokens` keys.
  The 401 no-token guard regression was already pinned by SP-104 (spec lines
  101–103) and was not duplicated.

API contract: the read side of the [shared API contract](../../README.md#shared-api-contract)
is implemented — `GET /users/me` → `{ id, email, name, emailVerifiedAt,
timeZone, preferences, createdAt, updatedAt }`. `auth.service.ts` maps
`create`/`findById` results to its own explicit field shapes, so
register/login/refresh wire responses are unchanged (additive, non-breaking).

## Migration and database notes

- Generated and applied with the repo's own `db:migrate` workflow
  (`dotenv -e .env.local -- prisma migrate dev --name user_time_zone_preferences`),
  then `db:generate` (Prisma 7.10.0; generated client stays gitignored).
- The local dev database (`localhost:5432/studypilot`) had drifted from the
  committed migrations, so `migrate dev` stalled on its interactive reset
  prompt. After explicit user consent (structured confirmation that the
  database holds only disposable test data), `prisma migrate reset --force`
  re-applied the six committed migrations, then `migrate dev` created and
  applied the new one. Prisma 7's AI-agent guard required the
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` variable carrying the user's
  exact consent text; no secret file was read or displayed at any point.
- `prisma migrate deploy` applies the migration set cleanly (the reset path
  replayed all seven migrations in order without error).

## Verification actually executed

- Unit (test-first): the new spec was run RED against the old 6-field selects
  (2 failed), then GREEN after the service change — `npx jest
  users.service.spec --runInBand`: **1 suite / 2 tests passed**.
- Integration against the migrated local PostgreSQL 15: `pnpm exec
  dotenv -e .env.local -- npx jest users-data-scoping --runInBand`: **14/14
  passed** (guard layer 7 + ownership layer 7), zero skips.
- Full API suite with `DATABASE_URL` provided: `npx jest --runInBand`:
  **23 suites / 260 tests passed**, zero failures.
- `pnpm typecheck`: passed. `pnpm lint`: 0 errors (one pre-existing
  `no-console` warning in `src/main.ts`, untouched by this child).

## Commits

- `fbd0ab7` schema + migration (`20261017141608_user_time_zone_preferences`)
- `71aff0d` service selects + new unit spec
- `775d4eb` integration spec extension

## Remaining parent scope

- SP-106B: `PATCH /users/me` (replaces PUT) + IANA/bounded-preferences
  validation + field-level 400 `errors` map + dead `findAll`/`remove`
  deletion.
- SP-106C: frontend form. SP-106D: cross-session round-trip, two-student HTTP
  proof, credential-exclusion wire proof, manual browser sign-off (DoD 10),
  and the parent implementation index.
- This child has no formal review; only the combined SP-106 parent review
  establishes sign-off. No Jira mutation occurred (child key still
  "Pending creation").
