# EP14A — CI Runs the Full Gate on Delivery Branches

**Story ID:** EP14A
**Parent epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** M7 (D14-2)
**Layer:** Integration (CI configuration, gated test repairs, process rule)
**Status:** Ready
**Dependencies:** none. Push authorization for the proof branch granted (user, 2026-11-16). Sources: EP13R D-R15 and the test-repair half of D-R14 (user rulings 2026-11-16); R-EP13-02, R-EP13-03; plan review R-EP14-01/-02 (corrections C-EP14-01/-02).

## Plan at a glance

- **What this changes:** `.github/workflows/ci.yml` runs on pushes to every branch, so the `DATABASE_URL`-gated API suites — already wired to the workflow's Postgres service — execute on the work under review; three pre-existing gated test defects (two fixture collisions, one stale spec premise) are repaired; the first branch run is recorded red with exactly one named gated failure, the validation defect EP14B fixes; and a closeout rule makes "gated suites passed" a claim that must cite a run.
- **Why it improves it:** CI on `main` has failed at "Run backend tests" on every push since at least 2026-10-25, and for a week eight EP13 records said "CI executes the gated suites" while CI never watched delivery branches (product: a gate nobody can see is not a gate). This story makes the gate visible and leaves it with one known, owned red test instead of four (code).
- **Decisions needing you:** none — D-A1/D-A2 ratified by the user 2026-11-16.
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Widen the CI triggers, repair the three gated-suite failures that are test
defects, and prove on a real branch run that a failing gated test fails the
job. The fourth pre-existing failure is a production validation defect and is
EP14B's first acceptance criterion; EP14B also owns the first green run.

## Scope

**In:** workflow triggers; `seedPlannedSession` fixture collisions; the bag-survival spec's premise; the proof run on a scratch branch (deleted afterwards); the evidence rule in the implementer skill; diagnosis of any additional failure the first CI run shows.
**Out:** the lock-body validation defect and strict validation generally (EP14B); new CI jobs, caching or concurrency groups; E2E in CI.

## Source requirement references

AC-E14-01, AC-E14-02 (test-repair half); TR-E14-01; DoD-8, DoD-9.

## Acceptance criteria

1. A push to any branch triggers `build-and-test`; pull requests to `main`/`develop` still trigger it (PR branches therefore run twice — accepted, D-A1).
2. The two lock-toggle fixture collisions (`study_plans_userId_date_key`) and the bag-survival spec are repaired against the current contract (PATCH /users/me **merges**, R-EP06-06): a local full gated run shows **exactly one** failure — the lock 400-case (`locked: "yes"` → 200 under implicit conversion), recorded as EP14B-AC1's starting point.
3. The first CI run on the proof branch is red with exactly that one named gated test failing inside `Run backend tests` (the job log quoted in the record with its run URL); any other failure that run shows is diagnosed and either fixed here (test/environment) or recorded as a finding with an owner.
4. The implementer skill's closeout states that a gated-suite pass is recorded only with a CI run link or a local run command + result; "CI will run it" is not evidence.

## Tests

- TR-E14-01 (red half): the proof-branch run URL and the quoted failing-test line; the local gated run command and count.
- The repaired specs themselves: `study-plans-e2e.spec.ts` (lock happy-path, bag-survival), `study-plans-data-scoping.spec.ts` (lock scoping).
- Static: the `ci.yml` diff touches only the `on:` block.

## Technical notes

- Inspected: `.github/workflows/ci.yml:3–7` (`push`/`pull_request` on `[main, develop]`), `:13–30` (Postgres 15 service, `DATABASE_URL`/`TEST_DATABASE_URL`), `:73–77` (`test:integration --runInBand`, then `test`); Actions history (public API): every `main` push since 2026-10-25 failed at "Run backend tests".
- `study-plans-e2e.spec.ts:532` `seedPlannedSession` calls `studyPlan.create` on a fixed date and is called twice per student; `study-sessions-planned-link-e2e.spec.ts:47` already upserts on `userId_date` (D-B2's pattern). Bag-survival block `:164–166`; merge semantics `users.service.ts:97–126`.
- Plan review notes the widened `push` changes nothing else in `ci.yml` (no new jobs, secrets as today, tags excluded, no concurrency block).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-A1 | Trigger set: (a) push on all branches + existing PR trigger; (b) push on `hfi/**` + `main`/`develop`; (c) manual `workflow_dispatch` only | **(a)** — branch naming can change; the job is already bounded (one runner, one Postgres); duplicate PR-branch runs accepted | Ratified (user, 2026-11-16) |
| D-A2 | Where the evidence rule lives: (a) implementer skill closeout (one line); (b) core.md; (c) a queue-lint check for "CI" wording | **(a)** — the implementer writes the claim; core.md is at its word budget | Ratified (user, 2026-11-16) |
| D-A3 (was EP14B D-B2) | Fixture repair: (a) upsert the study plan per (user, date); (b) distinct dates per call | **(a)** — the sibling-spec precedent | Ratified (user, 2026-11-16, as D-B2; moved here by C-EP14-01) |
| D-A4 (was EP14B D-B3) | Bag-survival spec: (a) assert the merge contract; (b) delete the spec | **(a)** — the contract is real and worth pinning | Ratified (user, 2026-11-16, as D-B3; moved here by C-EP14-01) |

## Definition of Done

1, 8 (repaired specs + the recorded red run), 9 (the rule documented); 2–7 N/A; 10–11 via the parent review.

## Sizing

- **Outcome:** CI executes the full API gate on the branch under review, with one known, owned red test.
- **Actual at closeout:** tbd.
- **Files:** `.github/workflows/ci.yml`; `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts`, `study-plans-data-scoping.spec.ts`; `.agents/skills/implementer/SKILL.md` (one line).
- **Start context:** this story; the inspected lines above; R-EP13-03 in `docs/stories/EP13/artifacts/EP13/review-round-1.md`.
- **Verification:** local gated run (fresh throwaway DB) = exactly the lock 400-case failing; proof-branch CI run URL red on that one test; scratch branch deleted after EP14B's green run.
- **Dependencies / exclusions:** the remaining red test and the green run → EP14B; E2E → EP14C.
