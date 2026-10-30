# EP06A: Study-Preferences Shape & API

**Story ID:** EP06A
**Title:** Backend — define the `studyDefaults` shape, validate it, and expose `GET/PUT /study-preferences`
**Parent epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Parent:** [EP06 breakdown](./README.md)
**Milestone:** M3
**Layer:** Backend
**Status:** Implemented — awaiting parent review (implemented 2026-10-30; commit `7457a0a`). Artifacts: [checkpoint](./artifacts/EP06A/checkpoint.md) · [implementation record](./artifacts/EP06A/implementation.md)
**Dependencies:** EP03 complete (assignments exist), EP04 complete (availability exists). No dependency on EP07 — the preferences shape is EP06's own (D06-4). Decisions D06-1…D06-25 are recorded in the parent README's decision register and the shared API/data contract section.
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

## Summary

EP06 defines the concrete shape of the study preferences that D106-1 left open: `User.preferences.studyDefaults` holds the student's default session length, the shortest and longest session they want, and their daily study cap. This story owns the shape, its validation, its defaults and its own endpoint pair — `GET /study-preferences` and `PUT /study-preferences` — plus the defensive reader that every later EP06 child relies on.

## Description & bounded scope

### In scope

1. **The `studyDefaults` shape and its bounds** (D06-4) — `{ sessionLengthMinutes, minSessionMinutes, maxSessionMinutes, dailyCapMinutes }`, integers, bounds `5..480 / 5..480 / 5..480 / 5..1440`, defaults `60 / 15 / 120 / 240`, with the cross-field rules `minSessionMinutes ≤ sessionLengthMinutes ≤ maxSessionMinutes` and `dailyCapMinutes ≥ minSessionMinutes`.
2. **The shared domain types and helpers** in `apps/api/src/domain/study-planning/preferences.ts` — the `StudyPreferences` type, the defaults, the bounds, the cross-field validator and the **defensive reader** (`readStudyPreferences(bag: unknown): StudyPreferences`), which never throws and falls back per field.
3. **A new module** `apps/api/src/modules/study-plans/` — the module, controller and service for the study-plan surface (this story ships only the preferences half of it; EP06B/EP06D extend the same module). Follows the `availability` module precedent: a projection that never exposes `userId`, DTO re-validation for non-HTTP callers, `ConflictException` for state conflicts, `assertAffected` for scoped writes. Registered in `apps/api/src/app.module.ts` **and** in `apps/api/src/test/test-http.ts` (the integration-spec module graph mirrors `AppModule`; a new route that is not in both cannot be reached by the e2e specs).
4. **`GET /study-preferences`** — the student's effective study defaults (the stored values with the defaults filled in for any missing or invalid field). It never exposes `userId` and never exposes the rest of the preferences bag.
5. **`PUT /study-preferences`** — accepts any subset of the four keys, merges it onto the **current effective** values, validates the merged result and writes the complete four-key object into `preferences.studyDefaults`, leaving every other key of the bag untouched. An invalid merged value → 400 with a field-level `errors` map; the write is atomic and never partially applied.
6. **The bag write rule** — the write is a **merge into** `preferences.studyDefaults`, not a replacement of the whole `preferences` column: the service reads the current row, replaces only the `studyDefaults` key and writes the whole column back. A student who stores unrelated preferences (SP106's free-form bag) keeps them.
7. **Tests** — unit, data-scoping and e2e specs for the new endpoints, including the defensive-read matrix.

### Out of scope

- The remaining-work calculation and its read API — **EP06B**.
- The scheduling engine, the conflict rules and the plan persistence — **EP06C / EP06D**.
- Any frontend work — **EP06E**.
- Narrowing `PATCH /users/me`'s free-form `preferences` bag (D06-14 — the bag stays open; EP06's reader is defensive instead).
- The `StudySession` aggregation and EP07's endpoint — **EP06B**, and EP07B respectively.
- The calendar read model — **not EP06's** (D06-18, seam V-05-1).

## Source requirement references

- **Epic AC-E06-01** ("Students can set preferred study-session durations") — this story's backend half.
- **TR-E06-01** (this child's test obligations).
- **Shared DoD** — items 1, 2, 3, 4, 8, 9 apply; items 10/11 belong to the combined EP06 parent review.
- **Decisions:** D06-4 (the shape and the bounds), D06-7 (the defensive reader's role), D06-14 (the bag's second writer), D06-16 (the key names), D06-17 (the domain module's location); and the parent README's **Shared API and data contract** → *The study-preferences shape* and *Endpoints*.

## Acceptance criteria

1. `User.preferences.studyDefaults` has the documented shape: `sessionLengthMinutes` (integer, 5–480), `minSessionMinutes` (integer, 5–480), `maxSessionMinutes` (integer, 5–480), `dailyCapMinutes` (integer, 5–1440), with the defaults `60 / 15 / 120 / 240`; the cross-field rules `min ≤ sessionLength ≤ max` and `dailyCap ≥ min` hold for **every value the endpoint returns or accepts** — the reader's ordered algorithm (implementation note 2) guarantees them for the returned values, and the merged-value validator guarantees them for the accepted ones.
2. `GET /study-preferences` returns exactly the four keys with their **effective** values — the per-field defaults for any missing or invalid stored field, then the documented repair order (AC 6) — never `userId` and never any other key of the preferences bag; with no stored bag the values are the defaults `60 / 15 / 120 / 240`.
3. `PUT /study-preferences` accepts any subset of the four keys, merges it onto the current effective values and writes the **complete** four-key object into `preferences.studyDefaults`; the other keys of the student's `preferences` bag are preserved byte-for-byte.
4. An invalid merged value is rejected with a 400 carrying a field-level `errors` map — each out-of-range value and each broken cross-field rule is named — and **nothing is written** (the stored bag is unchanged).
5. Unknown body fields are rejected with 400 by the global `FieldValidationPipe` (repo convention), and the service re-runs the DTO constraint set for non-HTTP callers (the `availability.service.ts` precedent).
6. A stored `studyDefaults` that is not an object, or whose fields are of the wrong type or out of range, never fails a read: the affected field falls back to its default in the first step, and the **cross-field rules are then re-established by the documented repair order** (repair the inverted min/max pair → clamp `sessionLengthMinutes` into `[min, max]` → raise `dailyCapMinutes` to `minSessionMinutes`). The repair is the only thing that may change another field; a field that needs no repair is returned unchanged.
7. Unit, data-scoping and e2e specs cover the bounds matrix, the cross-field rules, the merge behaviour, the defensive read (including every repair step), the bag's other keys surviving, the ownership scoping and the uniform 404/401 behaviour.

## Tests to add / update

- `apps/api/src/domain/study-planning/preferences.spec.ts` (new) — the pure-domain unit tests:
  - each field's defaults when the bag is `null`, absent, not an object, or the field is missing;
  - each field's fallback when the stored value is a string, a float, a negative number, zero, or above its bound;
  - the cross-field validator: `min > sessionLength`, `sessionLength > max`, `dailyCap < min` each rejected, and the valid boundary combinations accepted;
  - **the reader's ordered algorithm, step by step**: the per-field fallback; the inverted min/max pair repaired (`minSessionMinutes := maxSessionMinutes`); the session length clamped into `[min, max]`; the daily cap raised to `minSessionMinutes`; and the **worked examples** from the shared contract (the review's counterexample bag `60 / 90 / 120 / 240` → `90 / 90 / 120 / 240`, and `60 / 300 / 200 / 240` → `200 / 200 / 200 / 240`);
  - **the post-condition**: for every input, the returned values satisfy both cross-field rules and every field is inside its bounds;
  - the reader never throws for any input (a fuzz of shapes).
- `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (new) — the service against a mocked Prisma service:
  - `GET` returns the effective values and never exposes `userId`;
  - `PUT` with a partial body merges onto the current effective values and writes the complete object;
  - `PUT` preserves the bag's other keys (the write is a merge into `studyDefaults`, not a replacement of the column);
  - `PUT` with an invalid merged value throws the field-level 400 and writes nothing;
  - `PUT` with an unknown field is rejected by the DTO re-validation (400);
  - the DTO is re-validated for non-HTTP callers (the `dtoErrors` precedent).
- `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (new) — the profile read carries the authenticated `userId`; a second student's preferences are unreachable; the projection never exposes `userId`; the write is scoped to the principal's own row.
- `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (new) — HTTP level: 200 on `GET` with the four-key shape; 200 on `PUT` with a partial body; 400 with a field-level `errors` map on an invalid value and on an unknown field; 400 on a broken cross-field combination; 401 unauthenticated; the stored `preferences` column still carries the student's unrelated keys after a `PUT`.

## Technical notes

### Verified baseline (inspected 2026-10-30 at HEAD `9b1ec19`)

- `apps/api/prisma/schema.prisma:29-30` — `User.timeZone String @default("UTC")` and `User.preferences Json?`, whose schema comment reads "future minimal prefs (EP06 study defaults)". The column is nullable, so a student who never sets the bag has `preferences = null`.
- `apps/api/src/modules/users/dto/update-user.dto.ts:17-20` — `preferences?: Record<string, unknown>` validated by `IsPlainObjectValidator` and `IsBoundedSizeValidator` only: the bag is a plain object of at most 4096 serialized bytes. There is **no** shape validation and no `studyDefaults` key handling today.
- `apps/api/src/modules/users/dto/validate-bounded-size.validator.ts:17-28` — the 4096-byte serialized cap.
- `apps/api/src/modules/users/users.service.ts:87-115` — the partial update writes only the fields the client provided; `preferences` is written verbatim when present.
- `apps/api/src/modules/users/dto/update-user.dto.spec.ts:67-73` — the DTO accepts a `studyDefaults`-keyed bag today (a plain object), so nothing about the bag's openness needs to change for EP06.
- `apps/api/src/modules/users/users-profile-integration.spec.ts:147-160` — a `preferences` bag containing `studyDefaults: { sessionLengthMinutes: 45 }` round-trips through `PATCH /users/me` unchanged. This is why D06-4's "duration default" is named `sessionLengthMinutes` (D06-16) and why EP06 does **not** narrow `PATCH /users/me` (D06-14).
- `apps/api/src/modules/availability/availability.service.ts:35-45` (`toSlotResponse` — the projection that never exposes `userId`), `:56-67` (`dtoErrors` — `validateSync` with `whitelist` + `forbidNonWhitelisted` for non-HTTP callers), `:69-76` (`throwFieldErrors`), `:242` (validation runs on the **merged** values of a PATCH), `:193` (`ConflictException`).
- `apps/api/src/app.module.ts:13-33` and `apps/api/src/test/test-http.ts:72-89` — the two module lists that must both gain the new module.
- `apps/api/src/common/ownership/ownership.ts:37-62` — `ownedWhere`, `assertOwned`, `assertAffected`, `RESOURCE_NOT_FOUND`.

### Implementation notes (concrete)

1. **Where the shape lives.** `apps/api/src/domain/study-planning/preferences.ts` exports `STUDY_PREFERENCE_DEFAULTS`, `STUDY_PREFERENCE_BOUNDS`, `type StudyPreferences`, `validateStudyPreferences(input): Record<string, string[]> | null` (the cross-field + bounds rules) and `readStudyPreferences(bag: unknown): StudyPreferences` (the defensive reader). The file imports nothing from `@nestjs/*` and nothing from Prisma (D06-17), so EP06C/EP06D and (later) EP08 can import it directly.
2. **The defensive reader — one ordered algorithm.** `readStudyPreferences` takes the whole `preferences` value (which may be `null`), narrows it to an object and runs **these four steps in this order**:
   1. **Per-field bounds fallback** — for each of the four keys, accept the stored value only if it is an integer inside that key's bounds (`5..480 / 5..480 / 5..480 / 5..1440`); otherwise use that key's default (`60 / 15 / 120 / 240`). The fields are independent at this step.
   2. **Repair the inverted min/max pair** — if `minSessionMinutes > maxSessionMinutes`, then `minSessionMinutes := maxSessionMinutes` (the maximum is kept, the minimum is lowered to it).
   3. **Clamp the session length** — if `sessionLengthMinutes < minSessionMinutes` then `sessionLengthMinutes := minSessionMinutes`; if `sessionLengthMinutes > maxSessionMinutes` then `sessionLengthMinutes := maxSessionMinutes`. (At most one applies, because step 2 guarantees `min ≤ max`.)
   4. **Repair the daily cap** — if `dailyCapMinutes < minSessionMinutes` then `dailyCapMinutes := minSessionMinutes`.

   The reader never throws and never returns an invalid combination: the post-condition is that every returned value is inside its bounds **and** both cross-field rules hold. The order is part of the contract (it is what makes the effective `sessionLengthMinutes` — and therefore EP07's V-07-1 re-check — mechanical), so the unit tests pin each step. The full algorithm, the worked examples and the V-07-1 pinning are in the parent README's shared contract, *The study-preferences shape* → *Read behaviour (defensive)*.
3. **The merge-on-partial-update rule.** `PUT /study-preferences` reads the current effective values (through the defensive reader), applies the client's subset on top, validates the merged result and writes the complete four-key object. A single-field update is therefore legal against the stored values only — exactly the `availability` module's "validation runs on the merged values" rule.
4. **Writing into the bag.** The service reads the user's current `preferences` (defaulting to `{}`), builds `{ ...currentBag, studyDefaults: merged }` and writes the whole column. The bag's other keys survive unchanged. The column's 4096-byte cap is re-checked after the merge (the bag's existing validator applies to the resulting value).
5. **The DTO.** `UpdateStudyPreferencesDto` with four optional integer fields, each carrying `@IsInt()` and `@Min()`/`@Max()` decorators. The service re-runs the same constraint set for non-HTTP callers with the `dtoErrors` helper.
6. **The projection.** `toStudyPreferencesResponse(prefs)` returns exactly `{ sessionLengthMinutes, minSessionMinutes, maxSessionMinutes, dailyCapMinutes }` — never `userId`, never the raw bag.
7. **The module.** `apps/api/src/modules/study-plans/study-plans.module.ts` + `study-plans.controller.ts` + `study-plans.service.ts` + `dto/`. The controller declares the DTO class as the `@Body()` metatype so the global `FieldValidationPipe` applies, and reads the principal with `@CurrentUser()` (never `@Req()`).
8. **The route paths.** `GET /study-preferences` and `PUT /study-preferences` are top-level (the `availability` module's `/availability-slots` precedent), **not** nested under `/users` — the study defaults are a domain surface, and the generic profile bag stays a profile concern.

### Risks / open questions (none blocking)

- **The bag's second writer (D06-14).** `PATCH /users/me` can still write a `studyDefaults` object. EP06's reader is defensive, so the planner keeps working, but the stored value may differ from the value the student last chose in the preferences surface until they re-save it. If the coordinator wants a single writer, EP01's `users-profile-integration.spec.ts:147-160` must change with it — that is a cross-epic edit and is **not** done here.
- **A partial bag is not an error.** A student who stored `{ sessionLengthMinutes: 45 }` through the generic bag gets `45 / 15 / 120 / 240` from `GET /study-preferences`. That is the documented per-field fallback, not a silent reinterpretation of the student's choice.
- **`preferences` is `null` for most accounts** (the M1 profile form never sends it — `apps/web/src/pages/profile/ui/ProfilePage.tsx:111-129`). The defaults are therefore the effective values for every existing student until they set their own.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is rejected — out-of-range values, broken cross-field combinations and unknown body fields each produce a 400 with a field-level `errors` map, and nothing is written.
3. Academic data is scoped to the authenticated student — the profile read and the write carry the `userId`, and a second student's preferences are unreachable.
4. API errors are actionable — the 400 names the offending field and the rule it broke.
5. Not applicable — no frontend async states in this story (the API's own error states are covered by 2/4).
6. Not applicable — no UI in this story.
7. Not applicable — no UI in this story.
8. Business rules have automated tests — the domain unit tests (the bounds and fallback matrix), the service unit tests (the merge behaviour), the data-scoping spec and the e2e spec.
9. API changes are documented — the endpoint contract and the `studyDefaults` shape live in the parent README's shared API/data contract section; the shape is recorded as the final answer to seam V-07-1.
10. Integrated review — the combined EP06 parent review.
11. Reviewer walkthrough — the combined EP06 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** the student's study-session defaults have a validated shape, a documented default, a defensive reader and a validated, ownership-scoped endpoint pair, so that every later EP06 child and EP07's V-07-1 re-check can rely on one contract.
- **Request/token estimate:** 2 requests/tokens — one small pure-domain module (the shape, the bounds, the cross-field rules, the defensive reader) with its unit tests, one NestJS module with two endpoints (the merge-on-partial-update rule and the field-level errors), and three spec files. The uncertainty is in the reader's repair ordering (which the unit tests pin step by step), not in the endpoints.
- **Model recommendation:** 3 — the work is conventional NestJS and ordinary validation, but the defensive reader's fallback ordering and the merge-on-partial-update rule are the two places where a subtle mistake produces a wrong (not a crashing) result. A capable mid-tier model is appropriate.
- **Files:**
  - `apps/api/src/domain/study-planning/preferences.ts` (new);
  - `apps/api/src/domain/study-planning/types.ts` (new — the shared types, created with this story);
  - `apps/api/src/domain/study-planning/preferences.spec.ts` (new);
  - `apps/api/src/modules/study-plans/study-plans.module.ts` (new);
  - `apps/api/src/modules/study-plans/study-plans.controller.ts` (new);
  - `apps/api/src/modules/study-plans/study-plans.service.ts` (new);
  - `apps/api/src/modules/study-plans/dto/update-study-preferences.dto.ts` (new);
  - `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (new);
  - `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (new);
  - `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (new);
  - `apps/api/src/app.module.ts` (modify — register the module);
  - `apps/api/src/test/test-http.ts` (modify — the integration-spec module graph).
- **Start context:** this story file; the parent README's shared API/data contract → *The study-preferences shape* + *Endpoints* and the decision register (D06-4, D06-7, D06-14, D06-16, D06-17); `apps/api/src/common/ownership/ownership.ts`; `apps/api/src/modules/availability/` (the module, the projection, the DTO re-validation and the merged-validation precedent); `apps/api/src/modules/users/` (the bag, its validators and the partial update). Do not read unrelated epic stories.
- **Verification:** `pnpm --filter api test -- study-plans` (the unit, data-scoping and e2e specs); `pnpm --filter api test -- preferences` (the domain unit tests); `pnpm --filter api test` (the full API suite — the users module's specs must stay green); `pnpm --filter api typecheck`; `pnpm --filter api lint`.
- **Dependencies / exclusions:** EP03 + EP04 complete. Excludes the remaining-work calculation (EP06B), the engine (EP06C), the plan persistence and the plan API (EP06D), all frontend work (EP06E), any change to `PATCH /users/me`'s bag contract, the `StudySession` aggregation, and the calendar read model.

## UI/UX gaps for the `ui-refiner`

None — this is a backend story (no user-facing surface). The `ui-refiner` pass is not required for EP06A; EP06E's preferences **surface** is the frontend half of this story and needs its own pass.
