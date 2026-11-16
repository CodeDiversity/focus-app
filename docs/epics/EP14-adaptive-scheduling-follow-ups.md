# EP14: Adaptive Scheduling Follow-ups

**Epic ID:** EP14
**Predecessor:** [EP13: Adaptive Scheduling for ADHD](./EP13-adaptive-scheduling-for-adhd.md) — closed (combined review round 2 passed, 2026-11-16). EP14 is deliberately separate so EP13's signed-off review unit stays closed.
**Origin:** the user's rulings on [EP13R](../stories/EP13/EP13R-follow-up-register-and-triage.md) (2026-11-16: "ratify all of your findings on EP13R, put them in a new epic"). Requested as "EP13B"; created as EP14 because `EP13B` is already a stable EP13 child ID (see D14-1).
**Milestone:** M7 — release 1.1.x hardening (D14-2, ratified).
**Dependencies:** EP13 (closed). Cross-cutting into EP04 (calendar), EP03 (assignments) and EP10 (design tokens).

## Epic Summary

Finish what EP13's delivery surfaced: make the quality gates trustworthy (CI
that actually runs the live-database suites, a green gated baseline, reliable
E2E), pay the accessibility debt EP13's combined pass found, and give students
an honest say in what counts as hard work. Everything else that was raised is
kept, deliberately, in a tracked backlog with concrete revisit triggers.

## Description

EP13 shipped and passed review, but its review exposed that "CI will run it"
had been claimed for a week on branches CI never watches, that four
pre-existing gated tests are red (one of them hiding an app-wide validation
weakness), and that two accessibility patterns needed an allowlist in the new
axe gate. EP13's own product follow-ups were triaged by the user: two are
worth doing now (a student-owned "this is hard" flag that replaces an
unvalidated heuristic, and a guard that keeps easy work from drifting late);
six are backlogged with triggers.

## Scope

- CI coverage of delivery branches, with the gated suites running.
- The four pre-existing gated failures; strict body validation for boolean and numeric fields.
- The momentum payload carrying its own week dates (D05-6).
- E2E determinism (date-dependent fixtures, parallel-load flakes).
- The four accessibility defects from EP13M (focus return, 44px, success-badge contrast, calendar chip names) and removal of the axe allowlist.
- A per-assignment "hard" flag feeding placement, and a light-work timing guard; closes V-13-5.
- A backlog register with an enforced shape and a review ritual (tooling landed with this epic's breakdown).

## Out of scope

Everything ruled Backlog in EP13R (energy quick setup, "drained today", placement explainability, fragmentation, momentum goal history, EP13Q polish) — tracked in the EP14 Backlog register, not in this epic's stories. MVP exclusions stand (no AI, no LMS, no grade calculation).

## Acceptance Criteria

1. Every push to a delivery branch runs the full API suite including the `DATABASE_URL`-gated suites against a real Postgres, and a red gated test fails the job.
2. The full gated API run is green with zero failures; invalid boolean/number request bodies (e.g. `locked: "yes"`) return a field-level 400.
3. The momentum payload carries the week's seven civil dates; the client performs no date arithmetic for the week strip.
4. The full E2E suite passes deterministically under parallel load on any calendar date.
5. The four EP13M accessibility defects are fixed and the axe gate in `e2e/adaptive-scheduling.spec.ts` runs with no allowlist.
6. A student can mark an assignment as hard (or not hard); placement uses that flag in place of the D13-10 heuristic when set; light work prefers a LOW window only within the same part of the day as the earliest usable free NORMAL gap (C-EP14-07 — the wording matches EP14E-AC3).
7. Deferred items are tracked in a register whose shape is lint-enforced and reviewed at every breakdown and sign-off.

## Proposed Stories

See [the breakdown README](../stories/EP14/README.md): EP14A (CI), EP14B (API contract integrity), EP14C (E2E reliability), EP14D (accessibility debt), EP14E (effort-aware placement).

## Technical Notes

- CI already provisions Postgres and exports `DATABASE_URL` (`.github/workflows/ci.yml:13–30`); only the branch triggers (`:3–7`) exclude delivery branches. Every `main` push since 2026-10-25 failed at "Run backend tests" (Actions history).
- `enableImplicitConversion: true` is set in the global pipe (`apps/api/src/main.ts:20`) and its test mirror (`apps/api/src/test/test-http.ts:109`).
- The shared `Dialog` already restores focus (`apps/web/src/shared/ui/Dialog.tsx:45`); the two failing sites lose their trigger element — root cause per site is EP14D's first task.
- `isDemanding` (`apps/api/src/domain/study-planning/scheduler.ts:105`) is the heuristic EP14E makes overridable; `Assignment.type` is nullable (`schema.prisma:202`).
