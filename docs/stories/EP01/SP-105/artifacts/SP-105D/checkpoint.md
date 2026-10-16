# SP-105D checkpoint

Story: [SP-105D](../../SP-105D-password-reset-integration.md) — cross-layer integration sign-off (verification only, D1).
Updated: 2026-10-16 America/New_York.

## Status

- Checkpoint 1 — Prerequisite execution (AC2/AC3): **complete**, all suites green.
- Checkpoint 2 — Manual cross-layer smoke + DoD 10 (AC1/AC4/AC5/AC7): **pending**; needs the human browser + Mailpit run per D6.
- Checkpoint 3 — AC6 timing sample + parent index: **pending**.

## Checkpoint 1 — executed 2026-10-16

Disposable target: ephemeral `postgres:15-alpine` container (`--rm`, `127.0.0.1:5440`,
database `study_d_test`; name ends in `_test`), removed after the run. The local
`studypilot` database on 5432 was not migrated or written. `TEST_DATABASE_URL` was
supplied in the process environment only; no secret or `.env` file was read.

Commands and results:

| Command | Result |
|---|---|
| `pnpm --filter @studypilot/api db:generate` | Prisma Client 7.10.0 generated |
| `DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @studypilot/api exec prisma migrate deploy` | All six migrations applied (`20261011000000_init` … `20261015060000_recovery_rate_limit_buckets`) |
| `pnpm --filter @studypilot/api run test:integration --runInBand` | **3 suites / 26 tests passed, 0 skipped** (H harness 3, I credential 15, J limiter 8) |
| `pnpm --filter @studypilot/api run test --runInBand` | 20 suites / 237 tests passed; 2 suites / 18 tests skipped by their declared environment preconditions (baseline unchanged) |
| `pnpm --filter @studypilot/api typecheck` | clean |
| `pnpm --filter @studypilot/web test` | **11 files / 142 tests passed** (incl. ForgotPassword 16, ResetPassword 21) |
| `pnpm --filter @studypilot/web typecheck` | clean |

No feature gap surfaced: no suite failed or was missing, so nothing was filed
back to A/B/C/E/F. No production, schema, harness, `package.json` or CI change was
needed or made in this story (D1/D5). Git state at checkpoint: queue README
reconciled to D `In progress`; artifact files only.

## Resume inputs (checkpoint 2)

Per D6 a human runs the numbered manual procedure with a real browser and Mailpit;
the implementer transcribes returned results verbatim into
`./artifacts/SP-105D/implementation.md`. Real-Postgres concurrency evidence
(entry criterion) is already green above (AC2/AC3 suites I/J).

Resume inputs: this checkpoint; the story's DoD 10 checklist and browser-verification
method; `docker-compose.yml` (Mailpit :1025 UI :8025); the SP-105C
`/forgot-password` and `/reset-password` screens; the Login "Forgot password?" link.

Environment bring-up (if not already running):

```sh
docker compose up -d db mailpit            # Postgres 15 + Mailpit UI http://127.0.0.1:8025
pnpm --filter @studypilot/api exec prisma migrate deploy   # dev DATABASE_URL via .env.local config by the user
pnpm --filter @studypilot/api dev          # http://localhost:4000
pnpm --filter @studypilot/web dev          # http://localhost:3000
```
