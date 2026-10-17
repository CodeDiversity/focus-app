# SP-106B Implementation Record

**Story:** SP-106B — PATCH /users/me with Time Zone and Preferences Validation
**Status:** Implemented — awaiting combined parent review (2026-10-17)
**Parent:** SP-106 (STUDY-11)
**Delivery home:** `docs/stories/EP01/SP-106/`

## Summary

Replaced `PUT /users/me` with `PATCH /users/me` that partially updates name,
time zone, and preferences; validates IANA time zones and bounded preference
objects; returns field-level 400 errors; deleted dead, unscoped service methods.

## Files changed

### New files:
1. `apps/api/src/modules/users/dto/validate-iana-time-zone.validator.ts` — Custom class-validator using `Intl.DateTimeFormat` try/catch (D106-4)
2. `apps/api/src/modules/users/dto/validate-plain-object.validator.ts` — Rejects arrays, strings, numbers, null (D106-5)
3. `apps/api/src/modules/users/dto/validate-bounded-size.validator.ts` — Enforces 4096-byte serialized JSON cap (D106-5)
4. `apps/api/src/modules/users/dto/update-user.dto.spec.ts` — 14 unit tests for DTO validation (schema-free)
5. `apps/api/src/common/pipes/validation.pipe.ts` — `FieldValidationPipe` extending Nest's `ValidationPipe` with custom `exceptionFactory` producing `{ message, errors }` (D106-6)

### Modified files:
6. `apps/api/src/modules/users/dto/update-user.dto.ts` — Extended with `timeZone` + `preferences` fields
7. `apps/api/src/common/filters/all-exceptions.filter.ts` — `NormalizedError` gains `errors?`; `normalize` copies `record.errors` into response body
8. `apps/api/src/common/filters/all-exceptions.filter.spec.ts` — New test: 400 validation body includes `errors` field map; existing `message`-array assertions preserved
9. `apps/api/src/main.ts` — `ValidationPipe` → `FieldValidationPipe` (replaces stock pipe)
10. `apps/api/src/test/test-http.ts` — `ValidationPipe` → `FieldValidationPipe` (test-harness parity)
11. `apps/api/src/modules/users/users.controller.ts` — `@Put('me')` → `@Patch('me')` (D106-2)
12. `apps/api/src/modules/users/users.service.ts` — Partial update (only provided fields in Prisma `data`); select includes `timeZone` + `preferences`; dead `findAll`/`remove` deleted (D106-7)
13. `apps/api/src/modules/users/users.service.spec.ts` — Extended with `update` tests: partial update, full safe shape, credential exclusion
14. `apps/api/src/modules/users/users-data-scoping.spec.ts` — Extended with PATCH integration: valid update + same-session GET, invalid timeZone → 400 with `errors.timeZone`, cross-student isolation (TR-106-03), PUT → 404

## Acceptance criteria verification

| AC | Status | Evidence |
|---|---|---|
| AC-106-02: PATCH accepts partial `{ name?, timeZone?, preferences? }`; only provided fields updated; 200 returns full profile shape; PUT removed | ✅ | Controller `@Patch('me')`; service builds `data` from provided fields only; integration spec: `PATCH → 200`, `PUT → 404` |
| AC-106-03: Invalid IANA → 400 with actionable message; nothing written | ✅ | `IsIanaTimeZone` validator; integration spec: `Mars/Olympus → 400`, row unchanged |
| AC-106-05: `preferences` must be plain JSON object, serialized ≤ 4096 bytes | ✅ | `IsPlainObjectValidator` + `IsBoundedSizeValidator`; DTO spec: array/string/number/oversized fail; 4096-byte boundary passes |
| AC-106-06: 400 responses include field-level `errors` map; `message` array preserved | ✅ | `FieldValidationPipe.exceptionFactory` produces `{ message, errors }`; `AllExceptionsFilter` copies `errors` into response; filter spec validates both |
| AC-106-05 (cross-student): PATCH by student A never modifies student B's row | ✅ | Integration spec: student A patches, student B's row is byte-identical |
| D106-7: Dead `findAll`/`remove` deleted | ✅ | `UsersService` no longer exports `findAll` or `remove`; no route references them |

## Test results

- **Unit tests:** 258/281 pass (2 skipped — integration tests need `DATABASE_URL`)
- **Typecheck:** clean (`tsc --noEmit`)
- **Lint:** clean (`eslint --max-warnings=0` on all changed files)

## Dependencies

- **SP-106A:** Implemented — model fields (`timeZone` + `preferences`) exist on the User model; GET `/users/me` returns them. This child builds on A's schema and read side.
- **SP-106C:** Unblocked — C can now consume the PATCH endpoint with field-level error feedback.
- **SP-106D:** Unblocked — D can verify PATCH round-trip with the real endpoint.

## Known limitations

- The `preferences` JSON bag is accepted by the API but not surfaced in the M1 UI (D106-9). The form (SP-106C) omits `preferences` from the PATCH body, so partial updates leave it untouched — no data loss.
- Node ≥ 13 ships full ICU (standard assumption, pinned by `Intl.DateTimeFormat` try/catch in the validator).
