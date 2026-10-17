# SP-106D Implementation Record

**Story:** SP-106D — Profile and Preferences Integration Verification
**Status:** Implemented — awaiting combined parent review (2026-10-17)
**Parent:** SP-106 (STUDY-11)
**Delivery home:** `docs/stories/EP01/SP-106/`
**Review unit:** SP-106 — one combined parent review after every child (A–D) and this integration obligation; no child review.

## Summary

Verification-only child (SP-105D precedent): **no production, schema, migration,
harness, `package.json` or CI change was made.** One new integration spec proves
the profile/preferences round-trip on the real stack over real HTTP against a
real PostgreSQL database (AC1–AC4); the automated suites were re-executed green;
the manual browser sign-off supporting DoD 10 was performed by the human with
the dev stack running (AC5) and its result is transcribed below; the parent
implementation index was written at `./artifacts/SP-106/implementation.md`.

## Deliverable

`apps/api/src/modules/users/users-profile-integration.spec.ts` (**new**,
commit `426459e`) — real-app harness (`test/test-http.ts`, `main.ts` parity),
two students seeded through the real `POST /auth/register` + `POST /auth/login`,
self-skips when `DATABASE_URL` is unset, cleanup cascades from the two users.

| Case | Claim proven |
|---|---|
| AC1 | Register → login → `GET` returns defaults (`UTC`, `null`) → `PATCH` `{timeZone, preferences}` → **real `POST /auth/logout`** → **new real login** → `GET` returns the saved values; the logged-out refresh credential is asserted revoked (`POST /auth/refresh` with the old cookie → 401, with the new cookie → 200); the row is re-read unscoped to prove persistence is in the database, not a per-session cache. |
| AC2 | `PATCH { id: studentB.id, … }` is rejected 400 by the global pipe (`errors.id`) — A cannot name B at all; after A's legitimate self-PATCH, B's row is byte-identical under an unscoped read; each student's `GET` returns only their own id/email (neither other value appears anywhere in the serialized body); B's own profile still holds B's values. |
| AC3 | Both `GET` and `PATCH /users/me` bodies have **exactly** the eight contract keys (`Object.keys().sort()` equality) and contain no `passwordHash` / token / verification key or substring anywhere in the payload. |
| AC4 | `PATCH { timeZone: 'Mars/Olympus' }` → 400 whose real HTTP body carries `errors.timeZone` (IANA message), the preserved `message` array and `error: 'Bad Request'`; the stored `timeZone` is unchanged. |

## Acceptance criteria verification

| AC | Status | Evidence |
|---|---|---|
| AC1 cross-session persistence (AC-106-02, AC-106-05, TR-106-02) | ✅ | Integration case AC1 (7/7 suite green) + live dev-stack re-login curl pre-flight |
| AC2 cross-student isolation (TR-106-03, AC-E01-04) | ✅ | Integration cases AC2 (body-smuggling rejection, byte-identical B row, per-principal reads) |
| AC3 credential exclusion (AC-106-01) | ✅ | Integration cases AC3 (exact key-set equality on GET + PATCH) |
| AC4 field-level 400 (AC-106-06, D106-6) | ✅ | Integration case AC4 + live dev-stack 400 body recorded in the checkpoint |
| AC5 manual browser sign-off (DoD 10) | ✅ with recorded limitations | Human run, result + limitations below |

## Verification actually executed

Disposable target: a local database `studypilot_sp106d_test` created for this run,
migrated with `prisma migrate deploy` (all 7 migrations), used only through
`DATABASE_URL` supplied in the process environment, then dropped. The dev
`studypilot` database was **not** migrated, reset or written by the test run;
`.env`/`.env.local` were never read and no connection string or token was
printed.

| Command | Result |
|---|---|
| `DATABASE_URL=… npx jest users-profile-integration --runInBand` (`apps/api`) | **1 suite / 7 tests passed** (AC1 1, AC2 3, AC3 2, AC4 1) |
| `DATABASE_URL=… npx jest --runInBand` (`apps/api`) | **25 suites / 288 tests passed, 0 skipped** (SP-106A baseline 260; +SP-106B/C units, +D's 7) |
| `pnpm --filter @studypilot/web test` | **19 files / 188 tests passed** |
| `pnpm --filter @studypilot/api typecheck` / `pnpm --filter @studypilot/web typecheck` | clean |
| `pnpm --filter @studypilot/api lint` / `pnpm --filter @studypilot/web lint` | 0 errors (API: 1 pre-existing `no-console` warning in `src/main.ts`, untouched); the new spec passes `--max-warnings=0` |

Runtime pre-flight on the real dev stack (API `:4000`, web `:3000`, dev db
`studypilot` with all 7 migrations, `prisma migrate status` → "Database schema
is up to date!"): register 201; `GET /users/me` → `timeZone: "UTC"`,
`preferences: null`; `PATCH {timeZone:"America/Chicago", preferences:{theme:"dark"}}`
→ 200; same-session `GET` and **new-login `GET`** both persisted; invalid
`timeZone` → 400 with `errors.timeZone` and the preserved `message` array;
unauthenticated `GET` → 401; no credential key in any body.

## Manual browser sign-off (DoD 10, AC5)

Environment actually used: the running dev stack (web `http://localhost:3000`,
API `http://localhost:4000`, local PostgreSQL `localhost:5432`, database
`studypilot`, all 7 migrations applied). The numbered procedure (Blocks A–F:
register + open Profile; pre-fill check against
`Intl.DateTimeFormat().resolvedOptions().timeZone`; valid change + display line;
reload/new-session persistence; invalid-value field error with no `PATCH` sent;
sign-out → sign-in persistence) was handed to the human with the stack up.

Returned result: **approved with limitations — all blocks (A–F) run; no
per-step screenshots and no browser/version recorded.**

Limitations recorded honestly (not fabricated to fill the gaps):

- Per-step observations were returned as a blanket approval, not a per-step
  pass/fail table; no screenshots were captured.
- The browser and version are **not** recorded — the sign-off is not attributed
  to a specific browser build.
- The automated wire proof (AC1–AC4) is browser-independent and stands on its
  own; the manual run is the DoD 10 human confirmation of the SPA + API + DB
  path, and the AC-106-04 pre-fill rule (D106-3) is additionally pinned by
  SP-106C's component tests (mocked `resolvedOptions`).

Cleanup: both dev servers were stopped at the end of the session (no listener on
`:3000`/`:4000`) and the disposable database was dropped. One dev-database
fixture row created by the curl pre-flight (`sp106d-preflight-…@test.local`) was
left in place with the other disposable test data, consistent with the SP-105D
precedent; no academic data is touched by these flows.

## Notes, deviations and gates

- No product deviation: this child is verification-only; the ticket's file
  list (one new spec) was the entire implementation surface.
- One spec-design correction during implementation (recorded): the first draft
  asserted the new session's access token differs from the previous one. Two
  logins inside the same second legitimately mint byte-identical access tokens
  (same `sub`/`email`/`iat`/`exp`), so "new session" is now proven by the
  refresh credential: a fresh cookie on the new login, 401 on the logged-out
  cookie, 200 on the new one (SP-105 family revocation).
- SP-106C's recorded error-plumbing deviation (thunk/adapter structured
  payload) remains as recorded in its implementation record — flagged there for
  the combined parent review, not re-litigated here.
- No Jira mutation occurred (child key STUDY-35 recorded in metadata only).
- Parent index written at `./artifacts/SP-106/implementation.md`; the combined
  parent review report is at `./artifacts/SP-106/review.md`.

## Combined parent review pass 1 (2026-10-17) — outcome and follow-up

The review returned **Changes Required** with one blocking should-fix finding,
IR-106-01, in **SP-106C** (this child's own AC1–AC4, AC5 sign-off and evidence
were all accepted; the finding was that the Profile page never read the stored
time zone, so D106-3's pre-fill branch was unreachable). IR-106-01 and polish
IR-106-04 were fixed in commit `5050b82` under SP-106C's scope — see
`../SP-106C/checkpoint.md`. Post-fix gates re-run by the implementer: web
193/193, API 25 suites / 288 tests 0 skips on a disposable Postgres, typechecks
and lint clean. The parent re-review is next; this child's evidence above is
otherwise unchanged (no API/integration artifact was touched by the fix).
