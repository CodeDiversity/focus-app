# SP-106: Student Profile and Preferences — Combined Parent Implementation Review

**Review date:** 2026-10-17 (America/New_York)
**Pass:** 1 (single combined parent implementation review — SP-106A, SP-106B, SP-106C, SP-106D together)
**Mode:** Implementation review, parent scope (review cadence: one review after every child and the integration obligation)
**Reviewed state:** `main` @ `12daf5f6e2af48617b7a220bde9137516e5a4b61` (`12daf5f`, SP-106D's docs-completion commit). Commit existence/order verified read-only from `.git/refs/heads/main` and `.git/logs/HEAD`; working-tree cleanliness could **not** be read in this session (no shell) — see *Limitations*.
**Epic / milestone:** EP01 / M1 — Jira STUDY-11
**Report path:** `docs/stories/EP01/SP-106/artifacts/SP-106/review.md` (README-resolved artifact root; the parent index expects it at `./review.md`). No prior implementation review exists at this path, so no earlier report is replaced. No child review exists and none is required.
**Finding IDs:** `IR-106-01 … IR-106-08` are new (no prior pass for SP-106). They are stable and must be preserved on re-review.

**Verdict: `Changes Required`.** One open **should-fix** finding (IR-106-01, SP-106C) is enough to withhold sign-off; everything else found is polish or a recording. On this non-passing verdict **the report is saved only and the passing-review docs sync is deferred** (no correction-log entry, no queue state change, no parent status-line refresh). `Reviewed` is **not** established by this pass: only a passing combined parent review can set it (`delivery-state.md`, *Role-specific updates* → Reviewer).

---

## Reviewed scope and limitations

**Read and verified read-only in this session**

- Parent: `docs/stories/EP01/SP-106/README.md` (queue, decisions D106-1…9, shared contract, traceability, correction log, quality gate, review unit), `SP-106-profile-and-preferences.md`, `docs/epics/README.md#definition-of-done`, `docs/epics/EP01-authentication-and-onboarding.md` scope, `.agents/delivery-state.md`, `.agents/review-cadence.md`, the reviewer skill, `docs/artifacts/README.md`.
- Children and evidence: `SP-106A/B/C/D` tickets; `artifacts/SP-106/implementation.md` (parent index); `artifacts/SP-106A/{checkpoint,implementation}.md`; `artifacts/SP-106B/checkpoint.md`; `artifacts/SP-106C/{checkpoint,implementation}.md`; `artifacts/SP-106D/{checkpoint,implementation}.md`; the SP-105D precedent (`docs/stories/EP01/SP-105/artifacts/SP-105D/implementation.md`) and the SP-105 pass-2 review.
- Backend code: `apps/api/src/modules/users/{users.controller.ts,users.service.ts,users.service.spec.ts,users-data-scoping.spec.ts,users-profile-integration.spec.ts,dto/*}`; `apps/api/src/common/pipes/validation.pipe.ts`; `apps/api/src/common/filters/all-exceptions.filter.ts` (+ spec); `apps/api/src/main.ts`; `apps/api/src/test/test-http.ts`; `apps/api/prisma/schema.prisma`; `apps/api/prisma/migrations/20261017141608_user_time_zone_preferences/migration.sql`; `apps/api/src/modules/auth/auth.service.ts` (session-user projection paths); the installed stock `@nestjs/common` `ValidationPipe` and `class-validator` `ValidationExecutor` sources for the shared-surface comparison.
- Frontend code: `apps/web/src/pages/Profile.tsx` (+ `Profile.test.tsx`), `services/auth.ts`, `services/api.ts` (interceptor), `types/index.ts`, `utils/errors.ts`, `utils/datetime.ts`, `store/authSlice.thunks.ts` (+ spec), `context/AuthContext.tsx`, `components/Input.tsx`, `components/ProtectedRoute.tsx`; `README.md` (API list).
- Git identity/dates: `.git/HEAD`, `.git/refs/heads/main`, `.git/logs/HEAD` (reflog) — the claimed commits and their subjects/order are present there.
- Jira (read-only, no mutation): STUDY-11 (parent, six ACs) and STUDY-32…35 (children exist, keyed to SP-106A…D).

**Limitations — execution gates are CANNOT VERIFY, not run**

- This session has **no shell or command execution**: the Code Mode catalog exposes only Atlassian/OpenCode operations (verified by catalog `search`), so no `jest`, `vitest`, `tsc`, `eslint`, `prisma` or `git` command could be run first-hand.
- The reviewer skill's route 2 (**delegate a read-only command helper**) was **attempted and is structurally unavailable here**: the runtime returned `Subagent depth limit reached (1). Increase "experimental.subagent_depth" to allow nested subagents.` Both the git-evidence helper and the test-gate helper were refused, so no delegated run exists either.
- Therefore **route 3** applies: every executed gate below is marked **CANNOT VERIFY** and is explicitly **implementer-attested and unverified by this review**. I did not infer any passing result from the records.
- Working-tree cleanliness at review time is unread (`git status` unavailable); the commit graph alone was verified.
- The manual browser sign-off is **human-attested** (returned to the implementer and transcribed by it); it cannot be reproduced from here and is treated as a recording, not as measurement.
- No `studypilot` dev-database or disposable-database action was taken (no shell), and no `.env`/`.env.*` or secret file was read, opened or quoted at any point in this review.

**Commands the coordinator can run to close the execution gates** (unchanged from the D record's recipe; ~5 min for the targeted suite):

```sh
# from apps/api — disposable DB, never the dev `studypilot` database
createdb studypilot_sp106d_test
DATABASE_URL="postgresql://<user>@localhost:5432/studypilot_sp106d_test?schema=public" npx prisma migrate deploy
DATABASE_URL="…?schema=public" npx jest users-profile-integration --runInBand   # expect 1 suite / 7 tests
DATABASE_URL="…?schema=public" npx jest --runInBand                             # expect 25 suites / 288 tests, 0 skipped
dropdb studypilot_sp106d_test
# web
pnpm --filter @studypilot/web test          # expect 19 files / 188 tests
pnpm --filter @studypilot/api typecheck && pnpm --filter @studypilot/web typecheck
npx eslint "src/**/*.ts" "test/**/*.ts"     # apps/api, WITHOUT --fix (the `lint` script passes --fix)
pnpm --filter @studypilot/web lint
```

---

## Prioritized findings

| ID | Severity | Child / file | Original claim or gap | Consequence / counterexample | Required for closure |
|---|---|---|---|---|---|
| **IR-106-01** | **Should-fix** | SP-106C — `apps/web/src/pages/Profile.tsx:33-35,45-48,105-115`; precondition in `apps/api/src/modules/auth/auth.service.ts:214-224,269-280,388-409` and `apps/web/src/context/AuthContext.tsx:184-198` | D106-3: "the time-zone field pre-fills with the **stored** value; when the stored value is still the schema default (`"UTC"`), it pre-fills with `getBrowserTimeZone()`". The implementation cannot see the stored value: the SPA never reads `timeZone` from `GET /users/me`, so `user.timeZone` is `undefined` for every login/refresh/boot session and the code substitutes the browser zone. C's record justifies this as "the DB default for fresh students" — false for returning students. | **Silent overwrite of a stored preference.** Student sets `America/New_York` (PATCH hydrates the store, so it looks fine). Next login/reload (`AuthContext.tsx:186-187` → `refreshToken()` → login/refresh user shape has no `timeZone`), open Profile: the field and the "Your time zone: …" line show the **browser** zone (e.g. `Europe/Paris`), not the stored one. If the student edits only **Display Name** and saves, `Profile.tsx:57` sends `{ name, timeZone: 'Europe/Paris' }` and the PATCH overwrites the stored zone — every EP04/EP05 date rendering for that student then uses the wrong zone. The display line also shows a value that is not stored, contra the story note "the frontend uses the **stored** time zone for display". The web suite cannot catch this: `Profile.test.tsx` seeds a hydrated user, and the one "login shape" test (`:120-124`) asserts only the fallback, never a save. | Hydrate the authenticated profile before pre-fill (the codebase already has the primitive: `AuthContext.refreshProfile()` → `authService.getProfile()` = `GET /users/me`, single-flight at `AuthContext.tsx:94-137`), and re-seed the form **once** when that profile arrives (react-hook-form `defaultValues` do not update after mount, so a plain mount fetch is not enough — re-seed without clobbering an in-progress edit, e.g. on first hydration only). Optional hardening: omit `timeZone` from the PATCH body unless the field is dirty, so an untouched field can never write. Acceptance: with a stored non-UTC zone, after login/reload the field and the display line show the stored zone, and a name-only save leaves the stored row unchanged (new page test with a login-shape session user). |
| **IR-106-02** | Polish | SP-106B — `dto/validate-bounded-size.validator.ts:20-21`; unit titles `dto/update-user.dto.spec.ts:102,115-121` | D106-5 and the test titles say "serialized size ≤ **4096 bytes**"; the check is `JSON.stringify(value).length <= 4096`, i.e. UTF-16 code units. | A preferences object of multi-byte characters is accepted at up to ~8192 UTF-8 bytes (2× the stated cap); still bounded, so the abuse guard holds, but the enforced bound is not the documented one and the unit test name is inaccurate. | Size the cap with `Buffer.byteLength(JSON.stringify(value), 'utf8')` (or restate the rule in code units in D106-5/tests). |
| **IR-106-03** | Polish | SP-106B — `common/pipes/validation.pipe.ts:25-52` | D106-6 claims the stock `message` array is "preserved verbatim so no other endpoint's contract changes". | For **flat** DTOs the fabrication is byte-equivalent to stock (both emit `Object.values(constraints)` in class-validator order; I compared `@nestjs/common`'s `flattenValidationErrors` at `node_modules/@nestjs/common/pipes/validation.pipe.js:176-183` against this factory). For a DTO with **nested** validation the custom factory skips the whole subtree (`if (!constraints) continue;` on the parent error) and never applies the stock parent-path prefixing (`mapChildrenToValidationErrors`, `:185-210`) → a future nested DTO would silently lose its 400 messages. No nested DTO exists today (`grep ValidateNested|@Type\(` over `apps/api/src` → no matches), so there is **no live impact**. | Reuse `this.flattenValidationErrors(errors)` for the `message` array (keep the flat map for `errors`), or document the flat-only limitation in the pipe header. |
| **IR-106-04** | Polish | Docs (root `README.md:238-239`) | D106-2 removed `PUT /users/me` with no alias; the repo-level API list still documents it. | A developer/agent following the top-level README sends a tokened `PUT` and gets a 404. The canonical contract *is* documented (SP-106 README + A/B/D records), and the same section already carries other scaffold-era drift (`firstName` in the register curl, `README.md:249`), so this is drift, not a DoD 9 failure. | Change the line to `PATCH /users/me - Update current user profile` (worth doing inside the IR-106-01 fix pass). |
| **IR-106-05** | Polish / bookkeeping (planner-owned) | `docs/stories/EP01/SP-106/README.md:65-68,217` | The README's child-inventory Jira column says the four children are "Pending creation"; the child tickets carry `STUDY-32…35` and those issues exist in Jira (read-only check this pass). | The planning record understates reality; a reader can also see uneven tracker state (STUDY-32 `Done`, STUDY-33/34/35 and parent STUDY-11 `To Do`). | Planner records the keys/state via the authorized sync path; the reviewer neither edited Jira nor may rewrite the inventory table. |
| **IR-106-06** | Polish | SP-106B — `dto/update-user.dto.ts:7-9` | `PATCH` validates `name` only with `@IsString()` → an **empty** display name is accepted and persisted, while registration requires non-empty (`auth/dto/register.dto.ts:8-9`, `@IsNotEmpty`) and the form rejects `''` (`Profile.tsx:16`). | Minor backend/frontend validation asymmetry (DoD 2 is satisfied for the declared rules — `timeZone`, `preferences`, unknown fields — and no AC names name-emptiness). Likely pre-existing scaffold behaviour that B left intact by design ("`name` unchanged"). | Add `@IsNotEmpty()`/`@MinLength(1)` when the DTO is next touched, if an empty display name is not intended. |
| **IR-106-07** | Observation (no defect found) | `users.service.ts:63-65` | `findById` throws `NotFoundException('User with ID <id> not found')` rather than the uniform `Resource not found`. | **Not** an existence oracle: the id comes from `@CurrentUser()` only, so the message can only ever echo the caller's own id, and `/users/me` has no cross-student path. AGENTS.md's uniform-404 convention governs ownership-scoped academic records; this route is self-scoped by construction. Recorded for optional uniform-message alignment. | None required. |
| **IR-106-08** | Observation (recording gap, not a defect) | SP-106C/D + `README.md:135` (D106-3) | AC-106-04 holds at the **form** level only: a registered student's **stored** zone stays `"UTC"` (D106-1 default) until they open Profile and save; no automatic capture at registration. | Deliberate and user/planner-approved (D106-1 default `UTC`; D106-3 pre-fill rule), and SP-107's onboarding wizard is the intended capture point. Worth making explicit: a student who never opens Profile keeps `UTC` for EP04/EP05 date rendering. | SP-107's ticket should state that it persists the browser-detected zone (or an approval of the status quo should be recorded). |

---

## Acceptance coverage (original ACs, independently checked in code/tests)

| Req | Requirement (original, abridged) | Verdict | Evidence (read directly this pass) |
|---|---|---|---|
| AC-106-01 | `GET /users/me` returns the student's profile/preferences, credential fields excluded | **Pass (static)** | `users.controller.ts:16-19` (`@CurrentUser()`, no id parameter) → `users.service.ts:45-68` explicit 8-field `select`; `users.service.spec.ts:51-63` exact-select assertion; `users-data-scoping.spec.ts:142-161`; `users-profile-integration.spec.ts:103-115,269-276` exact key-set **and** substring scan; `schema.prisma:29-30` |
| AC-106-02 | `PATCH /users/me` updates name, time zone, preference fields | **Pass (static)** | `users.controller.ts:21-27`; `users.service.ts:87-115` (only provided fields built into `data`); `dto/update-user.dto.ts:6-19`; `users.service.spec.ts:124-161`; `users-data-scoping.spec.ts:184-216`; `users-profile-integration.spec.ts:151-160` (incl. `preferences`); web `services/auth.ts:92-95` (`api.patch`), `Profile.tsx:57` |
| AC-106-03 | Only valid IANA identifiers; rejected on **both** layers | **Pass (static)** | Backend `dto/validate-iana-time-zone.validator.ts:17-28` (`Intl` try/catch) + `update-user.dto.ts:11-14`; frontend `Profile.tsx:17-21` + `utils/datetime.ts:5-12`; tests `update-user.dto.spec.ts:32-63`, `Profile.test.tsx:126-138` (asserts **no** request sent); wire 400 with `errors.timeZone` in `users-data-scoping.spec.ts:218-244`, `users-profile-integration.spec.ts:296-322` |
| AC-106-04 | Time zone defaults to the browser-detected zone, changeable | **Pass with a should-fix caveat (IR-106-01)** | `Profile.tsx:33-35,45-48`; `Profile.test.tsx:103-124` pins both branches. The browser default *is* offered and changeable → AC met. **But** the stored value is never read by the SPA, so for returning students the field does not pre-fill the stored zone and an unrelated save overwrites it (IR-106-01) |
| AC-106-05 | All changes persist between sessions | **Pass (static)** | `users-profile-integration.spec.ts:138-207`: real register → login → GET defaults → PATCH → real `POST /auth/logout` → **new real login** → GET returns the saved values; old refresh cookie **401**, new cookie **200** (`:177-184`); row re-read unscoped (`:199-203`). Same-session half in `users-data-scoping.spec.ts:207-215` |
| AC-106-06 | Invalid input → actionable field-level messages; form handles loading/error/success | **Pass (static)** | Backend `validation.pipe.ts:25-52` + `all-exceptions.filter.ts:76-85` (+ spec `:85-101`); web `utils/errors.ts:51-70`, `Profile.tsx:59-77`, `Input.tsx:41,60-61,92-96`; tests `Profile.test.tsx:162-214` (field error under the input, `aria-invalid`, no toast; non-400 → sanitized toast; submit disabled + spinner) |
| TR-106-01 | invalid time zone rejection | **Pass (static)** | backend validator + DTO spec + wire 400 cases (above); frontend refine + `Profile.test.tsx:126-138` |
| TR-106-02 | profile persistence | **Pass (static)** | B same-session (`users-data-scoping.spec.ts:197-215`); D cross-session new-login (`users-profile-integration.spec.ts:138-207`) |
| TR-106-03 | no cross-student access | **Pass (static)** | by construction (no id parameter) + `users-data-scoping.spec.ts:246-271` + `users-profile-integration.spec.ts:210-266` (body-smuggled `id` → 400 `errors.id`, B's row `toEqual` before/after, per-principal reads) |
| AC-E01-03 | Unauthenticated requests cannot access protected data | **Pass (static)** | global `APP_GUARD` (SP-104); regression pinned at `users-data-scoping.spec.ts:105-122` (no token / malformed / expired → 401) |
| AC-E01-04 | Students cannot access or modify another student's records | **Pass (static)** | as TR-106-03 above |
| AC-E01-06 | Account settings persist between sessions | **Pass (static)** | as AC-106-05 above |

Jira cross-check (read-only): STUDY-11's six ACs match the local ticket's AC-106-01…06 in substance (the Jira text is a condensed paraphrase: "invalid values rejected on frontend and backend", "offered as a changeable default"). TR-106-01…03 exist only in the local ticket's Technical Notes; no requirement is owned only in prose. Children STUDY-32…35 exist and match A…D by summary.

---

## Decision register verification (D106-1 … D106-9)

| Decision | Status | Evidence |
|---|---|---|
| D106-1 — `timeZone String @default("UTC")` + `preferences Json?`, one additive migration, no new model | **Implemented** | `schema.prisma:29-30`; migration `20261017141608_user_time_zone_preferences/migration.sql:1-3` (`ALTER TABLE "users" ADD COLUMN "preferences" JSONB, ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC';`, purely additive); `users.service.spec.ts:78-121` pins that `create` never writes either column |
| D106-2 — converge on `PATCH`, remove `PUT` with no alias | **Implemented** | `users.controller.ts:21` (`@Patch('me')`, no `@Put` anywhere in the module); web `services/auth.ts:92-95`; regression `users-data-scoping.spec.ts:273-278` (tokened PUT → 404) |
| D106-3 — pre-fill stored value, else browser zone | **Partially implemented — IR-106-01** | `Profile.tsx:33-35` implements both branches *as far as the SPA's data allows*, but the stored value is never fetched for login/refresh sessions, so the first branch is unreachable on the normal path |
| D106-4 — `Intl.DateTimeFormat` try/catch on both layers, no new dependency | **Implemented** | backend `validate-iana-time-zone.validator.ts:17-28`; frontend `utils/datetime.ts:5-12` reused (not forked), `Profile.tsx:20` |
| D106-5 — plain object + serialized size ≤ 4096 bytes, both layers | **Implemented, unit inaccuracy — IR-106-02** | `validate-plain-object.validator.ts:16-18`; `validate-bounded-size.validator.ts:15-22`; frontend: the DTO is the only write path (`preferences` is not surfaced in M1 UI per D106-9), so the client-side "both layers" obligation is satisfied by omission |
| D106-6 — additive field-level `errors` map, `message` array preserved | **Implemented (flat-DTO equivalent) — see IR-106-03** | `validation.pipe.ts:25-52`; registered in `main.ts:14-23` **and** parity in `test/test-http.ts:83-92`; `all-exceptions.filter.ts:76-85` passes `errors` through additively (undefined keys are dropped by JSON); web `types/index.ts:57-63` already declared `errors?` |
| D106-7 — delete dead, unscoped `findAll`/`remove` | **Implemented** | `users.service.ts` now has only `create/findById/findByEmail/update`; repo-wide grep for `.findAll(`/`.remove(` → no matches; controller exposes only `GET/PATCH me` |
| D106-8 — free-text time-zone input, not a select | **Implemented** | `Profile.tsx:105-111` (text `Input` + zod `refine`); `Profile.test.tsx:126-138` proves an invalid typed value is rejected before any request |
| D106-9 — M1 form edits `name` + `timeZone` only; PATCH omits `preferences` | **Implemented** | `Profile.tsx:55-57`; API accepts `preferences` (`users-profile-integration.spec.ts:147-160`, `users-data-scoping.spec.ts:184-195`), so the stored bag is untouched by the form |

---

## Security invariants (AGENTS.md ownership/uniform-404 conventions + the four README invariants)

| Invariant | Verdict | Evidence / counterexample analysis |
|---|---|---|
| No cross-student profile/preference access | **Pass (static)** | The losing request cannot be constructed: no id in path or body (`users.controller.ts:16-27`), target id from `@CurrentUser()`, service keyed by that id (`users.service.ts:46-47,101-102`). Body-smuggling `{ id: studentB.id }` is rejected 400 by the global `forbidNonWhitelisted` pipe with `errors.id` (`users-profile-integration.spec.ts:216-221`); B's row is `toEqual`-identical after A's writes (`:211-231`), and neither student's id/email appears in the other's serialized body (`:234-249`) |
| Credential fields never exposed | **Pass (static)** | Explicit `select` is the boundary (`users.service.ts:32-41,51-60,104-113`), asserted by exact-object match in `users.service.spec.ts:51-63,104-120,147-160`; wire proof asserts the exact 8-key set **and** absence of each credential key as a substring anywhere in the payload (`users-profile-integration.spec.ts:31-49,103-115,269-293`). Auth-side projections that could leak were not broadened: login/refresh map only `id/name/email/emailVerifiedAt` (`auth.service.ts:214-224,269-280,388-409`) |
| Invalid or oversized preferences cannot be stored | **Pass (static), scope note IR-106-02** | `@Validate(IsPlainObjectValidator)` rejects arrays/scalars/null-behaviour handled by `@IsOptional`, size cap validator, plus the global pipe's `whitelist`+`forbidNonWhitelisted` → 400 before the service; unit cases `update-user.dto.spec.ts:66-127`; the cap's *unit* is code units, not bytes (IR-106-02) |
| Only IANA time zones are accepted | **Pass (static)** | `Intl.DateTimeFormat` try/catch on both layers (D106-4); `Mars/Olympus`, `UTC+5`, `''`, non-string covered by DTO unit cases (`update-user.dto.spec.ts:32-63`) and the wire 400 (`users-profile-integration.spec.ts:296-322`); nothing written on rejection (`:317-321`) |
| Uniform-404 / existence-oracle convention | **Pass (static)** | `/users/me` has no parameterised id, so "not mine" is not expressible; the only 404 is a missing *own* row (`users.service.ts:63-65`, message echoes the caller's own id → see IR-106-07). Academic-data helpers (`ownedWhere/assertOwned/assertAffected`) are unchanged and still exercised over real SQL in `users-data-scoping.spec.ts:306-438` |
| Secrets | **Pass (static)** | New/changed files contain no credential material: the integration spec derives a per-run password from `uuidv4()` and `@studypilot-test.invalid` addresses (`users-profile-integration.spec.ts:61-64`); the pre-existing `TEST_JWT_SECRET` placeholder in `test/test-http.ts:27` is explicitly not a secret. No `.env*` file was read by this review |

---

## Shared Definition of Done audit (SP-106 scope)

| DoD | Status | Evidence | Note |
|---|---|---|---|
| 1 Functional acceptance criteria pass | **Pass on static evidence; execution CANNOT VERIFY** | AC table above; the tests that pin each criterion exist in the tree and are asserted against the shipped code paths | The green run is implementer-attested (this session cannot execute); the suite/test inventory reconciles exactly (below) |
| 2 Frontend and backend validation handle invalid input | **Pass (static)** | Backend `update-user.dto.ts` + 3 validators + global pipe; frontend zod `refine` (`Profile.tsx:15-21`) | IR-106-06 (empty `name`) is a polish asymmetry, not an AC breach |
| 3 Academic data scoped to the authenticated student | **Pass (static)** | No academic endpoint exists yet; `/users/me` is self-scoped with no id parameter (`users.controller.ts:16-27`); ownership helpers unchanged; dead unscoped `findAll`/`remove` deleted (D106-7) | — |
| 4 API errors produce actionable messages | **Pass (static)** | Field-level `errors` map with the IANA/plain-object/size messages; sanitized toast for everything else; 401/404 envelopes unchanged | — |
| 5 Loading, empty, and error states handled | **Pass (static)** | `Profile.tsx:27,53,75-77,101-109,122` (disabled fields + button spinner, field errors, toast); tests `Profile.test.tsx:187-214` | "Empty" is the default `UTC`/`null` profile state rendered by the form |
| 6 Core interactions support keyboard accessibility | **Pass (static)** | Label→input association and `aria-invalid`/`aria-describedby` error wiring in `Input.tsx:39-49,56-61,92-96`; the new field is a native `<input>` inside a native `<form>` with native submit/buttons; no click-only handler on this page | Real-browser keyboard dimension was not separately measured (blanket approval only) — see *Manual sign-off* |
| 7 Responsive layouts work on desktop and mobile | **Pass (static)** | `Profile.tsx:81` (`max-w-2xl mx-auto px-4 sm:px-6 lg:px-8`), `:118` (`flex flex-col sm:flex-row gap-4`); the story adds one field inside the pre-existing card and changes no layout | No viewport measurement was returned (same caveat as 6) |
| 8 Business rules have automated tests | **Pass on static inventory; execution CANNOT VERIFY** | New/extended specs: `users.service.spec.ts`, `update-user.dto.spec.ts`, `all-exceptions.filter.spec.ts` (+case), `users-data-scoping.spec.ts` (+4 PATCH cases), `users-profile-integration.spec.ts` (7 cases), `Profile.test.tsx` (9 cases), `authSlice.thunks.test.ts` (+1 case) | Counts reconcile with the file inventory; green is implementer-attested |
| 9 API changes and migrations are documented | **Pass (with IR-106-04)** | Shared contract block + decision register in the SP-106 README; migration folder and SQL present; A/B/D implementation records describe the schema, pipe/filter change and route change | The repo-level `README.md:239` still lists the removed `PUT` (polish) |
| 10 Reviewed in an integrated development environment | **Pass on a recorded human sign-off (limitations disclosed)** | D's record: dev stack (web/API/local Postgres, 7 migrations) + host-level pre-flight + a human browser run of blocks A–F with "approved with limitations" | Honest and more specific than the SP-105D return, but human-attested and not reproducible here. See judgment below; a ratification of the granularity may be wanted for the EP01 release gate |

---

## Recorded deviations — assessment

1. **SP-106C error plumbing** (thunk `updateProfile` rejects `{ message, apiError }`; `AuthContext.updateProfileFn` rethrows with `apiError`; `SessionUser.timeZone`/`preferences` optional; `ApiError.message: string | string[]`). **Assessed as acceptable and contained.** The consumer set is closed: `updateProfile` is dispatched only by `AuthContext.updateProfileFn` (`AuthContext.tsx:256-280`), which handles the structured payload and falls back to the string path; `login` and the recovery flows still use the untouched string payload (`authSlice.thunks.ts:11-27,54-70`; `loginFn` at `AuthContext.tsx:218-224`). `apiErrorMessage` (`utils/errors.ts:35-39`) joins the preserved array; the widened `ApiError.message` has no other string-only consumer (`grep ApiError` → only `utils/errors.ts`, `services/api.ts:130`, `types/index.ts:57`). Runtime plumbing is consistent with the real interceptor, which rejects `{...axiosError, message}` while keeping `response.data` (`services/api.ts:186-196`), so `extractApiError` finds the `errors` map. **Limitation:** the "typecheck clean" claim for these type changes is implementer-attested (no `tsc` here). One real behavioural consequence of the deviation is IR-106-01's second half (optional typing made the fallback silent rather than fail-fast); fixing IR-106-01 as suggested does not require reverting the plumbing.
2. **SP-106D spec-design correction** ("new session" proven by a fresh refresh credential + revoked old cookie instead of an access-token string comparison). **Verified correct, and correctly reasoned.** `auth.service.ts:214-215` signs `{ sub, email }` with the module-level `expiresIn` (`auth.module.ts:28`) and no `jti`, so two logins in the same second legitimately mint byte-identical JWTs; comparing tokens would be a flaky assertion. The spec's replacement proof is stronger: `users-profile-integration.spec.ts:168-184` asserts a *different* refresh cookie (`randomBytes(32).base64url`, `auth.service.ts:48`), that the logged-out cookie is revoked (`401`) while the new one refreshes (`200`), and that the persisted values are in the row, not a per-session cache (`:199-203`).
3. **SP-106A/D "verification-only" boundaries** (no production/schema/harness change in D). Confirmed by the change set I read: D's only source artifact is the new spec (the reflog line for `426459e` reads `test(api): profile/preferences round-trip integration spec …`), and no `test-http.ts`/`package.json`/CI change appears in the records for D.

---

## Manual browser sign-off (AC5 / DoD 10) — honesty and adequacy

**Honesty: adequate, and unusually explicit.** D's implementation record states the returned result verbatim ("approved with limitations — all blocks (A–F) run; no per-step screenshots and no browser/version recorded"), enumerates the three limitations, says explicitly "not fabricated to fill the gaps", and a fourth recording state is preserved (dev-DB fixture row left in place, servers stopped, disposable DB dropped). The parent index repeats the limitations rather than smoothing them (`artifacts/SP-106/implementation.md:57-60,82-83`). Nothing in the artifact claims per-step or browser-attributed evidence.

**Adequacy for DoD 10, against the SP-105D precedent: adequate at that standard, with two disclosed gaps.** SP-105D's return was a blanket "approved everything looks good" with no per-step return, and it was accepted for DoD 10 only after an explicit user ratification (SP-105 pass 2, PR-108 path (b)). SP-106D's return is **more** granular than that (it affirms that each of blocks A–F was actually run) and matches the procedure the D ticket specified (register → Profile → pre-fill → change → save → reload persistence → display line, i.e. the functional round-trip). The residual gaps are: (i) no browser/version, so the sign-off is not attributed to a browser build; (ii) blocks A–F were functional, so DoD 6/7's real-browser dimension (keyboard-only navigation, real mobile viewport) was **not** separately measured — those rows rest on automated/static evidence. This review treats DoD 10 as supported by the recorded human sign-off, and records the following **non-code gate** for the coordinator:

> If EP01's release sign-off requires browser-attributed evidence, obtain a one-line user ratification of the blanket-approval granularity (SP-105D/PR-108 precedent) or run a targeted keyboard + viewport pass on `/profile`. Neither is a code finding, and neither was fabricated here.

---

## Execution evidence

**Reconciliation of the implementer-attested numbers against the tree (static cross-check, this pass).** Each reported count is consistent with the file inventory, and the arithmetic closes exactly:

- **API suites:** 28 `*.spec.ts` files exist under `apps/api/src`; the repo's jest config ignores exactly 3 by regex — `modules/auth/testing/recovery-db-harness.integration.spec.ts`, `modules/auth/password-reset.integration.spec.ts`, `modules/auth/recovery-rate-limit.integration.spec.ts` (the path regex at `apps/api/package.json:92-94`) → **25 suites**, matching D's "25 suites / 288 tests".
- **Test totals:** A's baseline "260 tests"; B's "281 total (258 run, 23 gated by missing `DATABASE_URL`)" = 260 + B's 21 additions (DTO spec 14 + `update` cases 2 + filter case 1 + PATCH integration cases 4); D adds 7 → **288 with `DATABASE_URL` supplied and zero skips** (the only other `describe.skip` gates are `DATABASE_URL`-based: `users-data-scoping.spec.ts:28`, `users-profile-integration.spec.ts:28`, `recovery-rate-limit.http.spec.ts:10`; `smtp-email.provider.integration.spec.ts` spins up its own in-process SMTP server and never skips).
- **Web:** 19 `*.test.ts(x)` files exist under `apps/web/src` → matches "19 files / 188 tests" (C's `Profile.test.tsx` contributes 9).
- **Commits:** `.git/logs/HEAD` contains each claimed commit in order with the matching subject — `fbd0ab7` (timeZone/preferences model), `71aff0d` (GET returns them), `775d4eb` (integration spec), `51add91` (PATCH + validation), `6ece311` (web profile field), `426459e` (D round-trip spec), `8328c8b` (D queue start), `12daf5f` (D record + parent index + queue). `.git/refs/heads/main` = `12daf5f6e2af48617b7a220bde9137516e5a4b61`.

**What was executed by this review: nothing.** Per the skill's route 3, table of claimed gates:

| Claimed gate (implementer/records) | Status in this review |
|---|---|
| `npx jest users-profile-integration --runInBand` → 1 suite / 7 tests passed (disposable Postgres) | **CANNOT VERIFY** — implementer-attested; execution unavailable (no shell; subagent delegation blocked at depth 1) |
| `npx jest --runInBand` with `DATABASE_URL` → 25 suites / 288 tests passed, 0 skipped | **CANNOT VERIFY** — implementer-attested; count inventory reconciles (above) |
| `pnpm --filter @studypilot/web test` → 19 files / 188 tests | **CANNOT VERIFY** — implementer-attested; file inventory matches |
| API/web `typecheck` clean; API `lint` 0 errors (1 pre-existing `no-console` warning); web `lint` clean | **CANNOT VERIFY** — implementer-attested. Static read found no obvious type inconsistency in the changed files, but that is not a typecheck |
| Dev-stack curl pre-flight (register/GET/PATCH/re-login/400/401, no credential key) | **CANNOT VERIFY** — implementer-attested; the code paths it exercises match the static contract |
| Manual browser sign-off (human, blocks A–F) | **CANNOT VERIFY (human-attested recording)** — see the judgment above |
| Jira: no tracker mutation by the implementer; STUDY-11 exists, children keyed STUDY-32…35 | **Verified read-only this pass** — STUDY-11 + four children exist; the children were created by the user's `update jira` commit (`cac8e43`), not by the implementer; this review performed no Jira write |

---

## Open items and handoff

**Blocker/should-fix (closes sign-off)**

1. **IR-106-01** (SP-106C): hydrate the stored profile before pre-fill and re-seed the form once; add a page test with a login-shape session user whose stored zone is non-UTC, asserting the field/display show the stored zone and that a name-only save leaves the stored row unchanged. Touches only `apps/web` (plus, if chosen, the PATCH body dirty-check). No backend/schema change needed. Expected effort: small (< 1 hour including the test).

**Polish (non-blocking, may ride along)**

2. **IR-106-02** size cap unit; **IR-106-03** pipe flat-DTO limitation; **IR-106-04** root README `PUT`→`PATCH`; **IR-106-06** empty-name asymmetry; **IR-106-05** planner-owned Jira/inventory bookkeeping; **IR-106-08** SP-107 capture note.

**Gates to record, not code work**

3. Execution gates: run the commands in *Limitations* on the fixed tree so the re-review can cite executed output instead of attestation (the disposable-DB recipe is the one D already used).
4. DoD 10 granularity: optional user ratification (SP-105D/PR-108 precedent) if browser-attributed evidence is required for the EP01 release gate. Do not record a ratification that has not been given.
5. Jira: no child key/status sync was performed or authorized by this review.

**Reviewer re-review:** after the IR-106-01 fix lands, re-review at the parent scope with the execution gates actually run. Finding IDs are preserved; new IDs continue at `IR-106-09`.

**Docs sync:** **deferred** — this is a non-passing verdict, so per the delivery-state rules and the reviewer skill I have written only this report. No correction-log entry, queue state, or parent status line was edited; the parent README still shows all four children as `Implemented — awaiting parent review`, which remains accurate. `Reviewed` will be established only by a passing combined parent review.

---

## Verdict

**`Changes Required` — SP-106 does not yet meet the DoD and acceptance criteria at `main @ 12daf5f`:** one open should-fix finding, **IR-106-01** — the SPA never reads the stored time zone, so after any login/reload the Profile field and its stored-zone display show the browser zone instead of the stored value (contra D106-3 and the story's display note) and a name-only save silently overwrites the stored zone, the exact failure this story exists to prevent. Every other AC, TR, epic AC, the four security invariants and DoD 1–10 are satisfied on static evidence, with these disclosed limitations: **all automated gates (API 25/288, web 19/188, typecheck, lint, the 7-case integration suite) and the manual browser sign-off are implementer/human-attested and were NOT re-executed by this review — CANNOT VERIFY**, because this session has no shell and nested helper delegation is blocked by the runtime's subagent depth limit. IR-106-02…IR-106-08 are polish, bookkeeping or recordings and do not condition sign-off.
