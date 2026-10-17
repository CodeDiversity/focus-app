# SP-106 parent implementation index

Updated: 2026-10-17 America/New_York
Prepared by: implementer (single sequential writer) after SP-106D completion.
Purpose: index of every child's implementation evidence for the one combined
SP-106 parent review. The review report, when the read-only reviewer returns,
is saved at `./review.md` (this directory).

## Status

All four children — A, B, C, D — are implemented and are hereby handed to the
combined SP-106 parent review. No child review has been performed or asserted
and none replaces this sign-off. SP-106 covers profile read/write, time-zone
validation on both layers, the profile form, and the integrated round-trip
(original ACs AC-106-01…06, TR-106-01…03; see the parent README traceability).

Sequence: A → B → C → D, one sequential writer. D is the named cross-layer
integration owner (round-trip suite, two-student HTTP proof, credential-exclusion
wire proof, manual browser sign-off, this index).

## Child evidence index

| Story | Delivered | Implementation | Checkpoint | Commits |
|---|---|---|---|---|
| [A](./../SP-106A-profile-schema-and-get.md) | `User.timeZone` (`@default("UTC")`) + `preferences Json?` with one additive migration; `GET /users/me` returns them, credentials excluded by explicit `select` | [implementation](./SP-106A/implementation.md) | [checkpoint](./SP-106A/checkpoint.md) | `fbd0ab7`, `71aff0d`, `775d4eb` |
| [B](./../SP-106B-patch-profile-validation.md) | `PATCH /users/me` (replaces `PUT`, no alias) with IANA + bounded-plain-object preferences validation; field-level 400 `errors` map via `FieldValidationPipe`; dead unscoped `findAll`/`remove` deleted | [checkpoint](./SP-106B/checkpoint.md) (implementation record folded into the checkpoint) | [checkpoint](./SP-106B/checkpoint.md) | `51add91` |
| [C](./../SP-106C-profile-preferences-form.md) | Profile page Time zone field (D106-3 pre-fill, client IANA validation, field-level API errors, loading/error/success states), stored-zone display line via the shared helper, `api.put` → `api.patch` | [implementation](./SP-106C/implementation.md) | [checkpoint](./SP-106C/checkpoint.md) | `6ece311` |
| [D](./../SP-106D-profile-integration.md) | Integrated sign-off: new real-Postgres round-trip suite (cross-session, isolation, credential exclusion, field-level 400), full-suite re-runs, manual browser sign-off (DoD 10), this parent index | [implementation](./SP-106D/implementation.md) | [checkpoint](./SP-106D/checkpoint.md) | `426459e`, plus docs commits |

Shared contract delivered (README → Shared API contract):
`GET /users/me` → `{ id, email, name, emailVerifiedAt, timeZone, preferences,
createdAt, updatedAt }`; `PATCH /users/me` partial body
`{ name?, timeZone?, preferences? }` → same shape; 400 →
`{ statusCode, message: string[], error, errors: { <field>: string[] }, path,
timestamp }`; `PUT /users/me` removed (tokened PUT → 404); unauthenticated → 401.

## Integrated verification (SP-106D, recorded 2026-10-17)

- Disposable real PostgreSQL target (`studypilot_sp106d_test`, all 7 migrations
  via `prisma migrate deploy`, dropped afterwards); `DATABASE_URL` supplied
  in-process only.
- New `apps/api/src/modules/users/users-profile-integration.spec.ts`:
  **1 suite / 7 tests passed** — AC1 cross-session (real logout → new login,
  revoked credential asserted 401 while the new one refreshes 200, row re-read
  unscoped), AC2 (body-smuggling of B's id → 400, B's row byte-identical,
  per-principal reads only), AC3 (exact eight-key shape on GET **and** PATCH, no
  credential key or substring), AC4 (real 400 body carries `errors.timeZone`
  with the `message` array preserved and nothing written).
- Full API suite with `DATABASE_URL`: **25 suites / 288 tests passed, 0 skipped**
  (SP-106A baseline 260). Web suite **19 files / 188 tests passed**. API + web
  `typecheck` clean; API `lint` 0 errors (1 pre-existing `no-console` warning in
  `src/main.ts`), web `lint` clean.
- Live dev-stack pre-flight (API `:4000` + web `:3000` + dev db `studypilot`,
  7 migrations applied): register 201 → GET defaults → PATCH persisted
  (same session **and** new login) → invalid `timeZone` 400 with
  `errors.timeZone` → unauthenticated 401; no credential field in any body.
- Manual browser sign-off (DoD 10) performed by the human with the stack up:
  **approved with limitations — all blocks (A–F) run; no per-step screenshots
  and no browser/version recorded.** Limitations are transcribed in D's
  implementation record, not smoothed over.

## Cross-child notes for the reviewer

- **C's recorded deviation** (`SP-106C/implementation.md` → "Grounded deviations"):
  rendering field-level 400 messages required the thunk/adapter to carry the
  parsed `ApiError` (`{ message, apiError }`) instead of a bare string; slice
  state shape, `getErrorMessage` behavior and all other thunks are unchanged,
  and login/recovery flows were not touched. Also: `SessionUser.timeZone`/
  `preferences` are typed optional because the auth login/refresh responses
  select only `id/name/email/emailVerifiedAt`, so D106-3's browser-zone fallback
  stays honest for token-only users; and `ApiError.message` widened to
  `string | string[]`.
- **Cross-student impossibility is by construction:** no `id` parameter exists
  on `/users/me`; the target id comes from `@CurrentUser()`. D adds the wire
  proof that naming another student in the body is rejected (400 `errors.id`).
- **`preferences` is intentionally not surfaced in the M1 UI** (D106-9): the form
  submits `{ name, timeZone }` only, so a stored bag is never clobbered. EP06
  surfaces concrete study defaults.

## Known gates (recordings, not blockers)

- SP-106D's manual sign-off carries the recorded limitations above; the
  browser-independent wire proof stands on its own.
- Dev-database fixture rows created by this story's smoke runs (test-only
  accounts, e.g. `sp106d-preflight-…@test.local`) were left with the other
  disposable test data (SP-105D precedent). No academic data was touched.
- Jira: parent STUDY-11 exists; child keys STUDY-32…35 are recorded in metadata
  only. No tracker mutation was authorized or performed by the implementer.

## Reviewer inputs

- Shared contract and traceability: [SP-106 parent README](../../README.md)
  (Shared API contract; AC/TR/DoD maps; decision register D106-1…9; correction
  log CF-106-01).
- Suite entry points: `apps/api` — `DATABASE_URL=… npx jest --runInBand`
  (the new spec runs when `DATABASE_URL` is set; it self-skips otherwise);
  `apps/web` — `pnpm --filter @studypilot/web test`.
- Where this parent's verdict is recorded: `./review.md`.
