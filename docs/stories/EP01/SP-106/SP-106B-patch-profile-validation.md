# SP-106B: PATCH /users/me with Time Zone and Preferences Validation

**Story ID:** SP-106B
**Parent:** [SP-106](./SP-106-profile-and-preferences.md) (Jira STUDY-11)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Backend
**Status:** Ready (planned 2026-10-17); implementation after SP-106A lands
**Dependencies:** SP-106A (fields must exist on the model and GET response)
**Jira key:** STUDY-33

## Summary

Replace `PUT /users/me` with `PATCH /users/me` that partially updates name, time zone, and preferences; validate IANA time zones and bounded preference objects; return field-level 400 errors; delete the dead, unscoped service methods.

## Description

As a student, I can update my profile fields individually (including my time zone) and get actionable field-level feedback when a value is invalid, so my settings save correctly.

## Acceptance Criteria

1. `PATCH /users/me` accepts `{ name?, timeZone?, preferences? }`; **only provided fields are updated**; the 200 response has the full profile shape from the shared contract. `PUT /users/me` is removed with no alias (a tokened `PUT` now 404s at the router). *(AC-106-02, D106-2)*
2. `timeZone` must be a valid IANA identifier (e.g. `America/New_York`); `Mars/Olympus`, `UTC+5`, `""`, and non-strings all return 400 with an actionable message; nothing is written. *(AC-106-03, TR-106-01, D106-4)*
3. `preferences` must be a plain JSON object with serialized size ≤ 4096 bytes; a top-level array, scalar, or oversized object returns 400. Unknown body fields return 400 (existing `forbidNonWhitelisted`). *(AC-106-02, D106-5)*
4. 400 responses include a field-level `errors` map (e.g. `{ errors: { timeZone: ["timeZone must be a valid IANA time zone, e.g. America/New_York"] } }`) in addition to the existing `message` array, which is preserved verbatim for compatibility. *(AC-106-06, D106-6)*
5. A `PATCH` by student A never modifies student B's row (self-scoped principal; no id in the request). *(AC-106-05, AC-E01-04, TR-106-03)*
6. The dead, unscoped `UsersService.findAll` and `UsersService.remove` are deleted (SP-104 flag; no route references them). *(D106-7)*

## Tests

Unit — `apps/api/src/modules/users/dto/update-user.dto.spec.ts` (**new**; pipe/validator-level, no database):

- valid `timeZone` passes; `Mars/Olympus`, `UTC+5`, `""`, and a non-string fail with the actionable message
- `preferences` object passes; top-level array / string / number fail; a > 4096-byte serialized object fails; a 4096-byte object passes (boundary)
- a name-only body validates (partial update); an unknown field fails (`forbidNonWhitelisted`)

Unit — `apps/api/src/modules/users/users.service.spec.ts` (extend SP-106A's):

- `update` touches only the provided fields (an omitted field is not written — no `undefined` in the Prisma `data`)
- `update`'s `select` returns the full safe shape and excludes credentials

Unit — `apps/api/src/common/filters/all-exceptions.filter.spec.ts` (extend):

- a 400 validation exception body includes the `errors` field map; the existing `message`-array assertions stay unchanged (additive contract, D106-6)

Integration — extend `apps/api/src/modules/users/users-data-scoping.spec.ts` (real Postgres; self-skips without `DATABASE_URL`):

- valid `PATCH` (timeZone + preferences) → 200 with updated values; row verified via the test's unscoped read; a same-session `GET /users/me` returns the updated values *(TR-106-02, same-session half; the cross-session half is SP-106D)*
- invalid `timeZone` → 400 with `errors.timeZone`; row unchanged
- student A's `PATCH` leaves student B's row byte-identical; B's `GET` is unchanged
- tokened `PUT /users/me` → 404 (route removed)

## Technical Notes

- **Inspected (2026-10-17):** `apps/api/src/modules/users/users.controller.ts` (`@Put('me')` line 21), `apps/api/src/modules/users/dto/update-user.dto.ts` (name-only), `apps/api/src/main.ts` (global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted` + `transform`), `apps/api/src/common/filters/all-exceptions.filter.ts` (passes `message` arrays through; drops field names), `apps/api/src/common/filters/all-exceptions.filter.spec.ts` (field-level assertions — an additive `errors` map is safe), `apps/api/src/test/test-http.ts` (mirrors the global pipe, lines 81–91), `apps/api/src/modules/users/users.service.ts` (dead `findAll` lines 40–51, `remove` lines 102–110).
- **Custom validator:** `apps/api/src/modules/users/dto/validate-iana-time-zone.validator.ts` (**new**) — `@ValidatorConstraint` doing `new Intl.DateTimeFormat('en-US', { timeZone })` in try/catch (D106-4; mirrors the web `isValidTimeZone`). Node ≥ 13 ships full ICU; a unit test pins the assumption (valid + invalid + non-string).
- **DTO:** `timeZone?: string` + `@IsString()` + `@ValidateIanaTimeZone(...)`; `preferences?: Record<string, unknown>` + `@IsPlainObject()` (rejects arrays/scalars/null — `@IsObject()` would pass arrays) + a size validator (new, same file or sibling: `JSON.stringify(value).length <= 4096` — D106-5). `name` unchanged.
- **Field-level errors (D106-6):** Nest's stock `ValidationPipe` puts constraint messages in `message` but not field names. New `apps/api/src/common/pipes/validation.pipe.ts` (**new**): `FieldValidationPipe extends ValidationPipe` with a custom `exceptionFactory` that throws a 400 whose payload is `{ message: <same array as stock>, error: 'Bad Request', statusCode: 400, errors: { <property>: constraints[] } }`. Register it in `main.ts` (replacing the stock pipe) **and** in `test/test-http.ts` (harness parity — what tests exercise is what production runs). `AllExceptionsFilter.normalize` copies `record.errors` into the response body when present (additive; the `NormalizedError` interface gains `errors?`).
- **Controller/service:** `@Put('me')` → `@Patch('me')`; `UsersService.update` builds the Prisma `data` object from provided fields only, keeps the principal-scoped `where: { id }`, updates the `select` to the full safe shape (incl. SP-106A's fields), and drops `findAll`/`remove` (D106-7).
- **Shared-surface caution:** the pipe + filter changes are cross-cutting. The stock `message` array must remain byte-identical for all other endpoints (existing register/auth DTO specs are the regression net); the `errors` map is additive. Do not alter any other endpoint's DTOs in this child.
- **Contract:** the [shared API contract](./README.md#shared-api-contract) in the breakdown README.

## Definition of Done

1. ACs pass. 2. Backend validation (this child). 3. Self-scoped principal; cross-student impossible by construction, proven in AC5. 4. Field-level actionable 400s. 5–7. N/A — backend-only child. 8. Unit + integration tests above. 9. API contract change documented (breakdown README; implementation record notes the pipe/filter change). 10. Via the combined SP-106 parent review.

## Sizing

- **Outcome:** `PATCH /users/me` partially updates the profile with IANA/bounded-preferences validation and field-level 400 errors.
- **Time estimate:** ~90 minutes — the largest child. **Indivisible-core rationale:** endpoint + DTO/validators + the field-error pipe/filter change are one HTTP outcome; splitting the shared pipe/filter from the DTO would leave AC-106-06 untestable, and the dead-method deletion is the same service file. If it overruns, checkpoint at: (1) schema-free validator + DTO + unit specs green, (2) pipe/filter + controller/service + integration green.
- **Files:** `apps/api/src/modules/users/dto/update-user.dto.ts` (change), `apps/api/src/modules/users/dto/validate-iana-time-zone.validator.ts` (**new**), `apps/api/src/modules/users/dto/update-user.dto.spec.ts` (**new**), `apps/api/src/common/pipes/validation.pipe.ts` (**new**), `apps/api/src/common/filters/all-exceptions.filter.ts` (change), `apps/api/src/common/filters/all-exceptions.filter.spec.ts` (extend), `apps/api/src/main.ts` (pipe swap), `apps/api/src/test/test-http.ts` (pipe parity), `apps/api/src/modules/users/users.controller.ts` (PUT→PATCH), `apps/api/src/modules/users/users.service.ts` (partial update + select + delete dead methods), `apps/api/src/modules/users/users.service.spec.ts` (extend). Ten small files; one window with the checkpoint sequence above.
- **Start context:** this ticket, decisions D106-2/D106-4/D106-5/D106-6/D106-7, the [shared API contract](./README.md#shared-api-contract), `main.ts`, `all-exceptions.filter.ts` + spec, `test-http.ts`, the users controller/service/DTO, SP-106A's implementation record (field names).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand` against a disposable migrated PostgreSQL 15 — full suite green (the stock-`message` regression net for every other endpoint included); `pnpm --filter @studypilot/api typecheck`; `pnpm --filter @studypilot/api lint`.
- **Dependencies / exclusions:** SP-106A. Excluded outcomes owned elsewhere: the form (SP-106C), cross-session round-trip + manual sign-off (SP-106D). All mapped in the [README traceability table](./README.md#source-requirements-and-test-traceability).
