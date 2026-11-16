# EP14B — API Contract Integrity: Strict Bodies, a Green Gate, Server-Owned Week Dates

**Story ID:** EP14B
**Parent epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** M7 (D14-2)
**Layer:** Backend (+ one small frontend consumer change)
**Status:** Ready
**Dependencies:** EP14A (CI sees the branch; the gated run starts with exactly the one failure this story fixes). Sources: EP13R D-R14 (validation half) and D-R8 (user rulings 2026-11-16); R-EP13-03; F-EP13K-01; plan review R-EP14-03/-04/-05/-09 (corrections C-EP14-03…05, C-EP14-09).

## Plan at a glance

- **What this changes:** request bodies stop being silently coerced — `locked: "yes"`, `locked: "false"` (today it becomes `true`) and `plannedMinutes: "25"` return a field-level 400 — via one shared validation-pipe options constant used by production and every test; the branch's CI run goes green (the green half of EP14A's proof); `GET /study-sessions/momentum` gains `week.days` and the web week strip uses it instead of computing dates.
- **Why it improves it:** an invalid body that answers 200 — or flips `"false"` to `true` — is a real validation hole across ~25 number/boolean body fields (DoD-2); fifteen test files kept their own copy of the old pipe options and would have kept passing while production changed (code); the client doing date math broke D05-6. Students see no change except correct errors.
- **Decisions needing you:** none — D-B1 and D-B4 ratified by the user 2026-11-16 (D-B2/D-B3 moved to EP14A as D-A3/D-A4).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Turn implicit conversion off behind a single source of pipe options, prove
every body DTO still accepts what the real clients send, end with a green CI
run, and let the server own the momentum week's dates.

## Scope

**In:** `main.ts`, `test-http.ts` and every spec-local pipe/transform copy (switched to the shared constant); the body DTO inventory below; the momentum payload + `momentumCopy`/`MomentumWeekStrip` consumers.
**Out:** query/param DTOs (none rely on implicit conversion — plan review R-EP14-04); new validation rules beyond type strictness; the three gated test repairs (EP14A).

## Source requirement references

AC-E14-02 (validation half + green run), AC-E14-03; TR-E14-01 (green half), TR-E14-02, TR-E14-03; DoD-2, DoD-3, DoD-4, DoD-8, DoD-9.

## Acceptance criteria

1. With implicit conversion off, wrong-typed boolean/number body fields — at least `{ locked: "yes" }`, `{ locked: "false" }`, `{ locked: 1 }`, `{ plannedMinutes: "25" }` — return 400 with the field-level `errors` map and write nothing; the EP14A-recorded lock 400-case passes; `?limit=10&offset=5` on GET /study-sessions still parses.
2. One exported `VALIDATION_PIPE_OPTIONS` (or pipe factory) in `apps/api/src/common/pipes/` is the only definition used by `main.ts`, `test-http.ts` and every spec that builds a pipe; a guard test fails if `src/**` contains `enableImplicitConversion: true`.
3. The full gated run has **zero failures**, the proof branch's CI run is **green** (run URL recorded — TR-E14-01's green half), and the full Playwright suite (or at minimum the journeys exercising preferences, availability, meetings, courses, assignments, focus finish and onboarding) passes — every web form still sends correctly typed bodies.
4. `GET /study-sessions/momentum` returns `week.days`: seven `YYYY-MM-DD` strings starting at `week.startDate`; `MomentumWeekStrip` and `studiedOnSentence` use it and `weekDates` is deleted; the payload is otherwise unchanged and `contracts.md` documents the field.

## Tests

- AC1: `validation-strictness-e2e.spec.ts` (gated via `describeIntegration`; the name matches Jest's `.*\.spec\.ts$` — R-EP14-05) — the four bodies above → 400 per field, no write; `?limit=10&offset=5` → 200.
- AC2: `validation-pipe-options.spec.ts` — `main.ts` and `test-http.ts` import the constant; grep guard over `src/**` for `enableImplicitConversion: true`.
- AC3: the full gated run and the CI run URL; the Playwright command and count.
- AC4: `momentum.spec.ts` — `days` length 7, Monday first, across a month/year boundary; `MomentumWeekStrip.test.tsx` renders from `days`; `momentumCopy.test.ts` updated (its `weekDates` case removed, `studiedOnSentence` driven by `days`).

## Technical notes

- Inspected: `apps/api/src/main.ts:20`, `apps/api/src/test/test-http.ts:109` (`enableImplicitConversion: true`). Spec-local copies that must switch to the constant (plan review R-EP14-03): `assignments.service.spec.ts:168–174, 534, 1059, 1108`; `auth.controller.spec.ts:215–220`; `auth/dto/{register,reset-password,forgot-password,resend-verification,verify-email}.dto.spec.ts:9–11`; `study-plans-recovery-catch-up.service.spec.ts:611–624, 886, 978, 1017, 1074, 1161` — the implementer greps for the full list.
- Query side (R-EP14-04): `ListStudySessionsQueryDto.limit/offset` already convert explicitly (`list-study-sessions-query.dto.ts:34–45`); other query DTOs and every `@Param` are strings — unaffected.
- Body side inventory (R-EP14-04, ~25 fields / 14 DTOs): onboarding `step`/`completed`; availability `dayOfWeek`/`isAvailable`; courses `credits`/`isActive`; class-meeting `dayOfWeek`; semester `isActive`; subtask `orderIndex`; assignment `estimatedHours`; study-session `plannedMinutes`/`confirmedMinutes`; the eight study-preference integers; lock `locked`. Web forms spot-checked to convert explicitly (`MeetingForm.tsx:197`, `AvailabilitySlotForm.tsx:328`, `StudyPreferencesForm.tsx:415–476`, `CourseForm.tsx:264`, `AssignmentForm.tsx:168,182`) — AC3's Playwright run is the proof. Nested bodies unaffected (`save-study-plan.dto.ts:67–68` has `@Type`).
- Momentum: `weekDates` in `apps/web/src/features/momentum/model/momentumCopy.ts` and its second consumer `studiedOnSentence` (`:65`); test `momentumCopy.test.ts:62`.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-B1 | Coercion policy: (a) turn `enableImplicitConversion` off globally behind one shared options constant; (b) keep implicit conversion, add strict per-field transforms that reject strings; (c) keep coercion and pin it as contract | **(a)** — correct by construction; the plan review's enumeration shows no query/param DTO depends on it, so the change is body-only | Ratified (user, 2026-11-16) |
| ▲ D-B4 | Momentum `week.days`: (a) additive `days: string[]` (7, Monday-first); (b) replace `startDate`; (c) leave the client math (F-EP13K-01 accepted) | **(a)** — additive, removes the one D05-6 deviation | Ratified (user, 2026-11-16) |

(D-B2 and D-B3 moved to EP14A as D-A3/D-A4 with their rulings, C-EP14-01.)

## Definition of Done

1, 2 (the point of AC1), 3 (scoping suites green), 4 (field-level 400s), 8, 9 (`contracts.md` momentum row; pipe policy noted where the API documents validation); 5–7 unchanged UI (proven by AC3's Playwright run).

## Sizing

- **Outcome:** bodies are validated strictly behind one source of truth, the gate is green on CI, and the client no longer computes week dates.
- **Actual at closeout:** tbd.
- **Files:** `apps/api/src/common/pipes/` (new constant), `main.ts`, `test/test-http.ts`, the spec-local pipe copies listed above, new `validation-strictness-e2e.spec.ts` and `validation-pipe-options.spec.ts`; `domain/study-planning/{momentum.ts, types.ts}` + `momentum.spec.ts`; web `entities/study-session/model/types.ts`, `features/momentum/{model/momentumCopy.ts, model/momentumCopy.test.ts, ui/MomentumWeekStrip.tsx}` + test; `docs/stories/EP13/contracts.md` momentum row.
- **Start context:** this story; EP14A's record (the remaining failing test and the run URL).
- **Verification:** full gated run 0 failed; ungated API + web suites; Playwright (AC3); proof-branch CI run green; lint/typecheck.
- **Dependencies / exclusions:** EP14A first; E2E reliability → EP14C.
