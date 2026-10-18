# SP-106 parent implementation index

Updated: 2026-10-18 America/New_York (review pass 2 recorded; pass-2 findings fixed)
Prepared by: implementer (single sequential writer) after SP-106D completion;
SP-106E row and pass-2 closeout added 2026-10-18.
Purpose: index of every child's implementation evidence for the one combined
SP-106 parent review. The review report, when the read-only reviewer returns,
is saved at `./review.md` (this directory).

## Review status

- **Pass 1 (2026-10-17): `Changes Required`** — [`./review.md`](./review.md)
  (pass-2 report replaces it in place; pass-1 state remains in Git history at
  `12daf5f`). One blocking should-fix finding, **IR-106-01** (SP-106C): the SPA
  never read the stored time zone. Fixed in `5050b82`; polish IR-106-04/05
  closed; IR-106-02/03/06/08 left as polish.
- **Pass 2 (2026-10-18): `Changes Required`** — [`./review.md`](./review.md).
  SP-106E left three of its own ACs unmet (**IR-106-11** dead
  `supportedValuesOf` probe + `UTC±HH:MM` parser that never matched,
  **IR-106-09** display line not live), omitted two story-listed tests
  (**IR-106-10**), carried this index/README stale for E (**IR-106-13**), and
  DoD 10's browser sign-off predates the select UI (**IR-106-14**). Pass-1
  IR-106-01 closed and verified; IR-106-02/03/06 remained open polish.
  All automated gates were reviewer-executed (web 193/193, API 288/288 on
  disposable Postgres, typechecks, lints, Node Intl probes).
- **Pass-2 findings fixed 2026-10-18** by the implementer: IR-106-09, IR-106-10,
  IR-106-11, IR-106-13 (this index + README), plus ride-along polish IR-106-02,
  IR-106-03, IR-106-06 (B files) and IR-106-15(a–c) (E files). Post-fix gates:
  web **201/201** (19 files), API **26 suites / 292/292 zero skips** on a
  disposable Postgres, both typechecks clean, both lints clean. Detail:
  `SP-106E/implementation.md`, `SP-106E/checkpoint.md`,
  `SP-106B/checkpoint.md` (fix-pass section).
- **IR-106-14 closed 2026-10-18 (user ratification):** the coordinator
  confirmed the select-based `/profile` page tested and passing, extending the
  2026-10-17 integrated sign-off to the SP-106E select UI — the review's
  explicit user-ratification closure path. Recorded with provenance in
  `SP-106E/checkpoint.md`; DoD 10 is satisfied for the current tree. No
  browser-session details were fabricated by the implementer.
- **Remaining open (planner-owned, non-blocking per the review):** IR-106-08
  (SP-107 capture-point note — the stored zone stays `UTC` until the first
  Profile save; SP-107's ticket should state that it persists the
  browser-detected zone or record an approval of the status quo) and
  IR-106-15(d) (record E's Jira key on tracker creation).
- **Next:** the combined SP-106 parent **re-review** (finding IDs preserved;
  new IDs continue at IR-106-16). `Reviewed` is established only by a passing
  combined parent review.

## Status

All five children — A, B, C, D, E — are implemented and are hereby handed to
the combined SP-106 parent review. No child review has been performed or
asserted and none replaces this sign-off. SP-106 covers profile read/write,
time-zone validation on both layers, the profile form with its time-zone
select, and the integrated round-trip (original ACs AC-106-01…06, TR-106-01…03
plus SP-106E AC-106E-1…8; see the parent README traceability).

Sequence: A → B → C → D → E, one sequential writer. D is the named cross-layer
integration owner (round-trip suite, two-student HTTP proof, credential-exclusion
wire proof, manual browser sign-off, this index).

## Child evidence index

| Story | Delivered | Implementation | Checkpoint | Commits |
|---|---|---|---|---|
| [A](./../SP-106A-profile-schema-and-get.md) | `User.timeZone` (`@default("UTC")`) + `preferences Json?` with one additive migration; `GET /users/me` returns them, credentials excluded by explicit `select` | [implementation](./SP-106A/implementation.md) | [checkpoint](./SP-106A/checkpoint.md) | `fbd0ab7`, `71aff0d`, `775d4eb` |
| [B](./../SP-106B-patch-profile-validation.md) | `PATCH /users/me` (replaces `PUT`, no alias) with IANA + bounded-plain-object preferences validation; field-level 400 `errors` map via `FieldValidationPipe`; dead unscoped `findAll`/`remove` deleted; **pass-2 polish fix:** UTF-8 byte cap (IR-106-02), nested-aware `message` flattening + pipe spec (IR-106-03), `@IsNotEmpty()` name (IR-106-06) | [checkpoint](./SP-106B/checkpoint.md) (implementation record folded into the checkpoint) | [checkpoint](./SP-106B/checkpoint.md) | `51add91`, plus 2026-10-18 fix-pass commit (see B checkpoint) |
| [C](./../SP-106C-profile-preferences-form.md) | Profile page Time zone field (D106-3 pre-fill, client IANA validation, field-level API errors, loading/error/success states), stored-zone display line via the shared helper, `api.put` → `api.patch`; **IR-106-01 fix:** stored-zone hydration + re-seed and the unknown-zone PATCH guard | [implementation](./SP-106C/implementation.md) | [checkpoint](./SP-106C/checkpoint.md) | `6ece311`, `5050b82` |
| [D](./../SP-106D-profile-integration.md) | Integrated sign-off: new real-Postgres round-trip suite (cross-session, isolation, credential exclusion, field-level 400), full-suite re-runs, manual browser sign-off (DoD 10 — extended to the E select UI by the coordinator's 2026-10-18 ratification, IR-106-14 closed), this parent index | [implementation](./SP-106D/implementation.md) | [checkpoint](./SP-106D/checkpoint.md) | `426459e`, plus docs commits |
| [E](./../SP-106E-profile-timezone-select.md) | Profile time-zone **select dropdown** (D106-10): reusable `Select` component; `getTimeZones()` via standard `Intl.supportedValuesOf('timeZone')` with exported curated fallback, sorted by `GMT±HH:MM` offset then region, memoized; live display line via `watch('timeZone')`; stored-alias option guard; falsifiable list/sort/live/keyboard/responsive tests (**pass-2 fix:** IR-106-09/10/11/15a-c) | [implementation](./SP-106E/implementation.md) | [checkpoint](./SP-106E/checkpoint.md) | `4def5c2`, plus 2026-10-18 fix-pass commit (see E record) |

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
