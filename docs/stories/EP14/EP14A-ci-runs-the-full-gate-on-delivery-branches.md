# EP14A — CI Runs the Full Gate on Delivery Branches

**Story ID:** EP14A
**Parent epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** proposed M7 (D14-2)
**Layer:** Integration (CI configuration + process rule)
**Status:** Ready
**Dependencies:** none. Source: EP13R D-R15 (user ruling 2026-11-16), R-EP13-02.

## Plan at a glance

- **What this changes:** `.github/workflows/ci.yml` runs on pushes to every branch (delivery branches included), so the `DATABASE_URL`-gated API suites — already wired to the workflow's Postgres service — execute on the work being reviewed; plus one closeout rule that a gated-suite claim cites a run.
- **Why it improves it:** for a week, eight EP13 records said "CI executes the gated suites" while CI only watched `main`/`develop`; the first real run found 8 failures (product). A gate that cannot see the branch is not a gate (code).
- **Decisions needing you:** none ▲; D-A1/D-A2 auto-ratify at implementation start.
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Widen the CI triggers so the existing Postgres-backed job runs on delivery
branches, and make "the gated suites passed" a claim that must carry evidence
(a CI run link or a recorded local run).

## Scope

**In:** workflow triggers; a gated-suite evidence rule in the implementer skill's closeout.
**Out:** new CI jobs, caching or matrix changes; E2E in CI (separate decision, not raised); fixing red tests (EP14B/EP14C).

## Source requirement references

AC-E14-01; TR-E14-01; DoD-8, DoD-9.

## Acceptance criteria

1. A push to any branch (including `hfi/**` delivery branches) triggers `build-and-test`; pull requests to `main`/`develop` still trigger it.
2. In that job the gated suites run against the workflow's Postgres service (`DATABASE_URL` set) and a failing gated test fails the job — verified by one deliberately red throwaway commit on a scratch branch, reverted.
3. The implementer skill's closeout states that a gated-suite pass is recorded only with a CI run link or a local run command + result; "CI will run it" is not evidence.

## Tests

- TR-E14-01: the scratch-branch red/green pair from EP14A-AC2, both run links recorded in the implementation record.
- Static: `git diff` of `ci.yml` shows only the `on:` block changed.

## Technical notes

- Inspected: `.github/workflows/ci.yml:3–7` (`push`/`pull_request` on `[main, develop]`), `:13–30` (Postgres 15 service, `DATABASE_URL`/`TEST_DATABASE_URL`), `:73–77` (`test:integration --runInBand`, then `test`).
- Proposed: `on: push: branches: ['**']` plus the existing `pull_request` block.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-A1 | Trigger set: (a) push on all branches + existing PR trigger; (b) push on `hfi/**` + `main`/`develop`; (c) manual `workflow_dispatch` only | **(a)** — branch naming can change; the job is already bounded (one runner, one Postgres) | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |
| D-A2 | Where the evidence rule lives: (a) implementer skill closeout (one line); (b) core.md; (c) a queue-lint check for "CI" wording | **(a)** — the implementer writes the claim; core.md is at its word budget | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |

## Definition of Done

1, 8 (the red/green proof), 9 (the rule documented); 2–7, 10–11 N/A beyond the parent review.

## Sizing

- **Outcome:** CI executes the full API gate on the branch under review.
- **Actual at closeout:** tbd.
- **Files:** `.github/workflows/ci.yml`; `.agents/skills/implementer/SKILL.md` (one line).
- **Start context:** this story; the three `ci.yml` ranges above.
- **Verification:** two CI run links (red, then green) on a scratch branch.
- **Dependencies / exclusions:** needs push access to a scratch branch (user authorization at implementation time — pushing is outward-facing); test repairs owned by EP14B/EP14C.
