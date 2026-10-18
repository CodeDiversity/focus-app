# SP-106B Checkpoint

**Story:** SP-106B — PATCH /users/me with Time Zone and Preferences Validation
**Status:** Implemented — awaiting parent review (2026-10-17)
**Sequence:** A → B → C → D (sequential)

## Checkpoint 1: Validator + DTO + DTO spec (schema-free, no database)

### Files created/modified:
- `apps/api/src/modules/users/dto/validate-iana-time-zone.validator.ts` (new)
- `apps/api/src/modules/users/dto/validate-plain-object.validator.ts` (new)
- `apps/api/src/modules/users/dto/validate-bounded-size.validator.ts` (new)
- `apps/api/src/modules/users/dto/update-user.dto.ts` (extended)
- `apps/api/src/modules/users/dto/update-user.dto.spec.ts` (new)

### Evidence:
- IANA validator uses `Intl.DateTimeFormat` try/catch (D106-4) ✓
- DTO adds `timeZone?: string` + `@ValidateIanaTimeZone`, `preferences?: Record<string, unknown>` + `@IsPlainObject()` + size validator (D106-5) ✓
- DTO spec covers: valid/invalid timeZone, preferences bounds, partial update ✓
- **14/14 tests pass** (schema-free, no database)

## Checkpoint 2: Field-validation pipe + filter + controller/service + integration

### Files created/modified:
- `apps/api/src/common/pipes/validation.pipe.ts` (new) — `FieldValidationPipe` with `exceptionFactory` producing `{ message, errors }` (D106-6)
- `apps/api/src/common/filters/all-exceptions.filter.ts` (extended) — `NormalizedError` gains `errors?`
- `apps/api/src/common/filters/all-exceptions.filter.spec.ts` (extended) — validates `errors` map in 400 response
- `apps/api/src/main.ts` (updated) — `FieldValidationPipe` replaces `ValidationPipe`
- `apps/api/src/test/test-http.ts` (updated) — pipe parity with `FieldValidationPipe`
- `apps/api/src/modules/users/users.controller.ts` (updated) — `@Put('me')` → `@Patch('me')` (D106-2)
- `apps/api/src/modules/users/users.service.ts` (updated) — partial update (only provided fields), full safe select, dead `findAll`/`remove` deleted (D106-7)
- `apps/api/src/modules/users/users.service.spec.ts` (extended) — `update` touches only provided fields, returns full safe shape
- `apps/api/src/modules/users/users-data-scoping.spec.ts` (extended) — PATCH integration: valid update, invalid timeZone 400, cross-student isolation, PUT → 404

### Tests: 258/281 pass (2 skipped — integration tests need `DATABASE_URL`)
### Typecheck: clean
### Lint: clean (all new files pass `--max-warnings=0`)

### Acceptance criteria coverage:
- AC-106-02: `PATCH /users/me` accepts partial `{ name?, timeZone?, preferences? }`; only provided fields updated; 200 returns full profile shape; `PUT` removed → 404 ✓
- AC-106-03: Invalid IANA → 400 with actionable message; nothing written ✓
- AC-106-05: `preferences` must be plain JSON object, serialized ≤ 4096 bytes; top-level array/scalar → 400 ✓
- AC-106-06: 400 responses include field-level `errors` map; `message` array preserved ✓
- AC-106-05 (cross-student): PATCH by student A never modifies student B's row ✓
- D106-7: Dead `findAll`/`remove` deleted ✓

## Fix pass 2026-10-18 — parent review polish ride-alongs (IR-106-02, IR-106-03, IR-106-06)

Combined parent review pass 2 left three B-scoped polish findings open; they were
fixed as ride-alongs with the SP-106E fix pass (same verification run).

| ID | Affected paths | Observed issue | Disposition | Closure evidence |
|---|---|---|---|---|
| IR-106-02 | `dto/validate-bounded-size.validator.ts`, `dto/update-user.dto.spec.ts` | 4096 cap measured in UTF-16 code units (`String.length`) while D106-5 says bytes — a multi-byte-heavy bag could exceed the byte cap | fixed | `Buffer.byteLength(serialized, 'utf8') <= 4096`; new DTO test "measures the cap in UTF-8 bytes, not UTF-16 units" (2050×`é`: units < 4096, bytes > 4096 → rejected) |
| IR-106-03 | `common/pipes/validation.pipe.ts`, new `common/pipes/validation.pipe.spec.ts` | Custom `exceptionFactory` collected only top-level `constraints`, silently dropping nested-DTO subtrees from the `message` array | fixed | `message` now comes from the stock `this.flattenValidationErrors(errors)` (nested-aware; byte-identical for flat DTOs); `errors` map stays flat. New pipe spec covers flat + nested cases |
| IR-106-06 | `dto/update-user.dto.ts`, `dto/update-user.dto.spec.ts` | PATCH accepted an empty display name (`@IsOptional` + `@IsString` only) | fixed | `@IsNotEmpty()` added to `name`; DTO test "an empty display name fails" |

**Verification (fix pass, 2026-10-18):** full API suite with `DATABASE_URL`
(disposable Postgres `studypilot_sp106_fix`, all migrations via
`prisma migrate deploy`, dropped after the run): **26 suites / 292 tests
passed, 0 skipped** (was 25/288; +1 suite = the new pipe spec, +4 tests).
`pnpm --filter @studypilot/api typecheck` clean; `npx eslint "src/**/*.ts"`
no findings (the repo `lint` script's `--fix` was deliberately not run).
