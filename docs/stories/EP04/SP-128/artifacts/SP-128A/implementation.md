# SP-128A Implementation Record — Availability Slots API

**Story:** [SP-128A](../../../SP-128A-availability-slots-api.md)
**Status:** Implementation complete — awaiting parent review
**Completed:** 2026-10-28

## Changed paths (commit scope)

- `apps/api/src/modules/availability/` (all new): `availability.module.ts`, `availability.controller.ts`, `availability.service.ts`, `dto/create-availability-slot.dto.ts`, `dto/update-availability-slot.dto.ts`, `availability.service.spec.ts`, `availability-data-scoping.spec.ts`, `availability-e2e.spec.ts`
- `apps/api/src/app.module.ts` — registers `AvailabilityModule`
- `apps/api/src/test/test-http.ts` — registers `AvailabilityModule` in the integration harness (module-graph parity with `AppModule`)

No migration (D404-5 — the existing `AvailabilitySlot` model), no new dependency, no other module changed.

## Acceptance criteria outcomes

| AC | Requirement (story) | Outcome | Evidence |
|---|---|---|---|
| 1 | GET 200, ordered `dayOfWeek` asc then `startTime` asc; 7-key shape, never `userId` | Pass | Unit `list` pins the `orderBy` + scoped `where`; e2e journey list order across Mon/Wed/Fri; contract keys asserted (`SLOT_KEYS`) in all three specs |
| 2 | POST `{ dayOfWeek, startTime, endTime, isAvailable? }` → 201; omitted `isAvailable` → `true` | Pass | Unit: create writes no `isAvailable` key (schema default `true`); explicit `isAvailable: false` is written; e2e 201 lifecycle |
| 3 | dayOfWeek integer 0–6; `HH:mm` 00:00–23:59; `endTime` strictly after `startTime` (no midnight wrap); 400 field-level `errors` map; nothing written on failure | Pass | Unit validation matrix (7/−1/1.5; `"9:00"`, `"25:00"`, `"09:60"`; equal/before times); e2e field matrix incl. `"23:00"→"01:00"` wrap and post-run row-count assertions (nothing written) |
| 4 | PATCH any subset, merge onto stored values, validate merged, 200 updated; empty body 400; merged duplicate 409 | Pass | Unit: single-field, multi-field merge, merged-validation 400, empty body 400, P2002 → 409; e2e partial-merge PATCH + isAvailable flip PATCH + 409 'already exists' |
| 5 | DELETE → 204 and the slot is gone; repeated delete → uniform 404 | Pass | Unit delete/count-0 404; e2e 204 + row really gone (`findUnique` → null) + PATCH on the deleted id → 404 |
| 6 | Missing/foreign/malformed id → always the same `404 Resource not found` | Pass | Unit 404s for missing/foreign/malformed; data-scoping: B PATCH/DELETE on A's ids → 404 with row byte-identical; `'not-a-uuid'` and unknown uuid both exact `Resource not found` |
| 7 | Unauthenticated → 401; unknown body field (incl. `userId`) → 400 | Pass | Data-scoping: no token → 401 on all four routes; POST with `userId` body field → 400 field-level (`errors.userId`); unit pins the service-side `validateSync` re-check |
| 8 | No foreign rows exposed; list contains only the requesting student's slots | Pass | Data-scoping: B's list has exactly 1 row (B's own); B's per-student duplicate window (A has the same key) → 201, proving `@@unique([userId, dayOfWeek, startTime])` |

## DoD (story items)

- 1 functional — pass (AC table above). 2 validation — pass. 3 scoping — pass (data-scoping spec proves isolations). 4 actionable errors — pass (field map / 401 / uniform 404 / 409). 5–7 N/A (no UI). 8 automated tests — unit + data-scoping + integration specs, all passing. 9 API documented — the EP04 README shared contract implements this shape (no migration). 10–11 — combined SP-128 parent review + walkthrough (not this child's).

## Verification

| Command (cwd `apps/api` unless noted) | Result |
|---|---|
| `pnpm exec dotenv -e .env.local -- npx jest --testPathPattern availability` | 42/42 passed, 3/3 suites, **zero skips** (unit 19 + data-scoping + e2e against the real database) |
| `pnpm --filter api test -- availability` (without `DATABASE_URL` in env) | unit 19 passed; 2 integration suites self-skip per the repo convention |
| `pnpm --filter api typecheck` | pass |
| `pnpm --filter api lint` | pass (0 warnings) |
| Full `npx jest` (all API unit suites) | 698 passed, 391 integration-skipped, no regressions from the module registration |

Note: the integration runs were executed by injecting the project's configured `DATABASE_URL` via `dotenv -e .env.local` (the same pattern the package's `db:*` scripts use); the value was never read or displayed.

## Findings / deviations

- **F-A-1 (closed):** the service-side `validateSync` defense-in-depth (assignments precedent) rejects a hostile `userId` body field with an `errors.userId` 400 even for direct non-HTTP service calls; the unit spec needed a type cast to exercise it. Test-only change.
- **F-A-2 (closed, accepted as precedent):** the at-least-one-field PATCH check runs after the ownership read, matching `courses-meetings.service.ts` — an empty PATCH on an existing owned row reads then 400s (`At least one field must be provided`) with no write; on a missing/foreign row it 404s. Pinned in the unit spec.
- **F-A-3 (closed, environment-only):** a stale gitignored `apps/api/dist-test/` build output (from `tsconfig.e2e.json`, produced outside this story) contained macOS `" 2"` duplicate-collision files, and the base `tsconfig.json` (which excludes `dist` but not `dist-test`) pulled them into the program, breaking `tsc --noEmit` for the whole API. **Disposition:** removed the stale gitignored output; typecheck passes. Nothing committed (gitignored). The latent `tsconfig.json` gap (no `dist-test` exclude) was left untouched as out of story scope — recorded for the parent review/planner to consider.
- **F-A-4 (closed):** two of my own integration assertions initially assumed pre-PATCH list ordering (`[windowId, blockedId]`) and used an unconvincing id `.sort()`; corrected to explicit `dayOfWeek`-based expectations. Test-only change; the service behavior was correct throughout.

No open findings. No scope changes, no AC edits; overlap-related non-rule remains as the story records it (overlapping slots are permitted by the model; only the identical `(userId, dayOfWeek, startTime)` key conflicts).

## Documentation

No API doc change required outside the EP04 README shared contract: the implemented request/response shape matches it verbatim (verified — keys, ordering, status codes, and the 409 message text). No migration.
