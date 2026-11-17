# EP14B — API Contract Integrity: Strict Bodies, Green Gated Baseline, Server-Owned Week Dates

**Story ID:** EP14B
**Parent epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** proposed M7 (D14-2)
**Layer:** Backend (+ one small frontend consumer change)
**Status:** Implemented — awaiting parent review (2026-11-16); EP14B-AC2's "fully green CI" clause open (F-EP14B-02). Record: [`artifacts/EP14B/implementation.md`](./artifacts/EP14B/implementation.md)
**Dependencies:** EP14A recommended first (so this story's gated evidence is a CI run). Sources: EP13R D-R14 and D-R8 (user rulings 2026-11-16), R-EP13-03, F-EP13K-01.

## Plan at a glance

- **What this changes:** request bodies stop being silently coerced (`locked: "yes"` → 400, not 200); the four pre-existing red gated tests are repaired so the gated baseline is zero failures; `GET /study-sessions/momentum` gains `week.days` (seven Monday-first civil dates) and the web week strip uses it instead of computing dates.
- **Why it improves it:** an invalid body that answers 200 is a real validation hole app-wide (security/DoD-2); a red baseline hides new regressions; the client doing date math broke D05-6 (code). Students see no change except correct errors.
- **Decisions needing you:** none — D-B1…D-B4 ratified (user, 2026-11-16).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Three API-contract corrections in one backend pass: strict input conversion,
a gated suite that is green against the contract as it now is, and an output
field that lets the client stop deriving dates.

## Scope

**In:** the global validation pipe and any query DTO that relied on implicit conversion; the four failing gated tests; the momentum payload + `MomentumWeekStrip`/`momentumCopy` consumer.
**Out:** any other endpoint's behavior; new validation rules beyond type strictness.

## Source requirement references

AC-E14-02, AC-E14-03; TR-E14-02, TR-E14-03; DoD-2, DoD-3, DoD-8, DoD-9.

## Acceptance criteria

1. A request body with a wrong-typed boolean or number (`{ locked: "yes" }`, `{ locked: 1 }`, `{ plannedMinutes: "25" }`) returns 400 with the field-level `errors` map and writes nothing; query parameters that are legitimately numeric (`?limit=10`) still parse.
2. The full gated API run (`DATABASE_URL=… npx jest --runInBand` on a freshly migrated DB) has **zero failures**, and the first fully green CI run on this branch is linked in the implementation record (R-EP14-01 — EP14A hands the known-red baseline to this story): the lock happy-path and lock-scoping fixtures no longer collide on `study_plans_userId_date_key`, and the bag-survival spec asserts the PATCH /users/me **merge** contract (R-EP06-06).
3. `GET /study-sessions/momentum` returns `week.days`: seven `YYYY-MM-DD` strings starting at `week.startDate`; the web week strip renders from it and `weekDates` is deleted; the payload is otherwise unchanged and `contracts.md` documents the field.

## Tests

- AC1: `validation-strictness.e2e-spec` (gated) — the three bodies above → 400 per field; `?limit=10` on GET /study-sessions → 200; unit: the pipe options pinned in `test-http.ts` equal `main.ts`.
- AC2: the four named failing tests (R-EP13-03) green; full gated run recorded with its command.
- AC3: `momentum.spec.ts` — `days` length 7, Monday first, across a month/year boundary; `MomentumCard.test.tsx` (the strip is rendered from `week.days`; delivered there, not in a separate `MomentumWeekStrip.test.tsx` — R-EP14-08b) with no `Date` arithmetic (grep-guard test that `momentumCopy.ts` no longer exports `weekDates`).

## Technical notes

- Inspected: `apps/api/src/main.ts:20` and `apps/api/src/test/test-http.ts:109` (`enableImplicitConversion: true`); `study-plans-e2e.spec.ts:532` `seedPlannedSession` (`studyPlan.create` on a fixed date, called twice per student); `:164–166` bag-survival block; `users.service.ts:97–126` (merge semantics); `apps/web/src/features/momentum/model/momentumCopy.ts` `weekDates`.
- Proposed (D-B2): `seedPlannedSession` upserts on `userId_date`, the pattern `study-sessions-planned-link-e2e.spec.ts:47` already uses.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-B1 | Coercion policy: (a) turn `enableImplicitConversion` off globally and add explicit `@Type(() => Number)` / boolean transforms to the query DTOs that need them; (b) keep implicit conversion, add strict per-field transforms that reject strings for booleans/numbers in bodies; (c) keep coercion and pin it as contract | **(a)** — correct by construction; the query DTOs needing conversion are few and get explicit, reviewable annotations; (b) leaves the hole open for every future field | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |
| D-B2 | Fixture repair: (a) upsert the study plan per (user, date); (b) distinct dates per call | **(a)** — the sibling-spec precedent | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |
| D-B3 | Bag-survival spec: (a) assert the merge contract; (b) delete the spec | **(a)** — the contract is real and worth pinning | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |
| ▲ D-B4 | Momentum `week.days`: (a) additive `days: string[]` (7, Monday-first); (b) replace `startDate`; (c) leave the client math (F-EP13K-01 accepted) | **(a)** — additive, removes the one D05-6 deviation | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |

## Definition of Done

1, 2 (the point of AC1), 3 (scoping suites green), 4 (field-level 400s), 8, 9 (`contracts.md` momentum row; pipe policy noted in the API README if one exists); 5–7 unchanged UI.

## Sizing

- **Outcome:** inputs are validated strictly, the gated baseline is zero failures, and the client no longer computes week dates.
- **Actual at closeout:** as planned + the latent UTC test fix (F-EP14B-01); two CI proof runs; Secret scan open (F-EP14B-02).
- **Files:** `apps/api/src/main.ts`, `apps/api/src/test/test-http.ts`, query DTOs found by grep (`list-study-sessions-query.dto.ts` et al.), `momentum.ts`, `types.ts`, `study-plans-e2e.spec.ts`, `study-plans-data-scoping.spec.ts`, new `validation-strictness.e2e-spec.ts`; web `entities/study-session/model/types.ts`, `features/momentum/{model/momentumCopy.ts, ui/MomentumWeekStrip.tsx}` + tests; `docs/stories/EP13/contracts.md` momentum row.
- **Start context:** this story; the inspected lines above; R-EP13-03 in `docs/stories/EP13/artifacts/EP13/review-round-1.md`.
- **Verification:** full gated run 0 failed locally **and** a green CI run link (the run includes the gated suites via EP14A's step); ungated API + web suites green; lint/typecheck.
- **Dependencies / exclusions:** E2E fixes → EP14C; CI trigger → EP14A.
