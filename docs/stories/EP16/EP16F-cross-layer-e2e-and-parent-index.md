# EP16F — Cross-Layer E2E and Parent Index

**Story ID:** EP16F
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Integration
**Status:** Reviewed — EP16 combined review passed 2026-11-18, pass 2 ([review.md](./artifacts/EP16/review.md)). Record: [implementation.md](./artifacts/EP16F/implementation.md); parent index: [artifacts/EP16/implementation.md](./artifacts/EP16/implementation.md). Four defects found by the new journeys were fixed in their owning children (F-EP16F-02/03/04) and one deferred (F-EP16F-01 → BL-16-08).
**Dependencies:** EP16A–EP16E implemented. Epic decisions D16-13, D16-17; verification tasks V-16-2, V-16-3.

## Plan at a glance

- **What this changes:** a new `today.spec.ts` and `navigation.spec.ts`, a rewrite of `catch-up.spec.ts` into the single plan flow, the `/dashboard` → `/today` and `/plan/health` → `/plan` updates across `helpers.ts`, `adaptive-scheduling.spec.ts` and `auth-journeys.spec.ts`, axe stops on `/today` and `/plan/proposal`, the 360 × 640 primary-control assertion, and the parent `implementation.md` index.
- **Why it improves it:** the journeys students actually take — land, start, finish, come back; plan, confirm, replan with a lock — are proven end to end on the final surfaces, and the `test.fixme` windows left by EP16A/EP16C are closed (product, AC-E16-14; code).
- **Decisions needing you:** none.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes.

## Summary

Prove the epic on the stack and write the index the reviewer starts from. No
harness changes beyond the route updates (BL-15-08's port/DB-name work is
not in scope).

## Scope

**In:** `apps/web/e2e/today.spec.ts` (new), `navigation.spec.ts` (new), `catch-up.spec.ts` (rewritten as `plan-flow.spec.ts`), updates to `helpers.ts`, `adaptive-scheduling.spec.ts`, `auth-journeys.spec.ts`, `study-plan.spec.ts` where they assert old URLs/strings; axe stops; `docs/stories/EP16/artifacts/EP16/implementation.md`.
**Out:** harness ports/DB naming (BL-15-08); any product code (a defect found here is fixed in the owning child and recorded as `F-EP16F-nn`).

## Source requirement references

AC-E16-14 (primary); AC-E16-01, 02, 06–11 (journey coverage); AC-E16-13. TR-E16-03, TR-E16-04 (collected). DoD-1, 8, 9 (parent index), 10, 11 (enables).

## Acceptance criteria

1. `today.spec.ts`: (a) sign in → URL is `/today`, `h1` Today, the hero's primary control is within the viewport at 360 × 640 without scrolling (V-16-3); (b) no plan → **Plan my week** → `/plan/proposal` → **Use this plan** → `/today` shows a next session; (c) **Start focus** → `/focus` → finish → `/today` shows the momentum row with minutes and the hero's badge; (d) `/dashboard`, `/` (signed in) redirect to `/today` (V-16-2 part); axe clean on `/today` in states (a)–(c) with no allowlist.
2. `plan-flow.spec.ts` (replaces `catch-up.spec.ts`): lock a session → **Replan my week** → "What this plan keeps" lists it → **Use this plan** → the locked session survives; **Not now** makes no confirm request; conflict 409 path marks rows; `/plan/health`, `/plan/health/catch-up`, `/catch-up`, `/catch-up/preview` redirect per the route matrix (V-16-2 rest); axe clean on `/plan` and `/plan/proposal`; the preserved test ids from EP08F still resolve.
3. `navigation.spec.ts`: desktop shows exactly Today, Plan, Calendar, Work ▾ (Assignments, Courses) and the account menu; signed-out shows Home; at 360 × 640 the bottom bar renders D-E1's entries and the drawer only Account; a running session shows the header indicator on `/calendar` and not on `/focus`; Semesters is reachable from Courses, Study history from the Focus page; no "Dashboard"/"Plan health"/"Focus session" text in the shell (negative).
4. Every existing spec is green on the self-contained stack three consecutive times (`pnpm --filter @studypilot/web test:e2e`), with `helpers.ts` landing on `/today`; `test.fixme` markers from EP16A/EP16C are gone; the EP13J identity and EP15 determinism API tests are untouched and green (AC-E16-13 evidence from the gated API run).
5. `artifacts/EP16/implementation.md` is the parent index per review-cadence: child inventory with links, combined Git scope with per-child diff ranges, test commands per child, AC/TR/DoD ownership, known gaps, and the collected TR-E16-04 manual-pass records (EP16D, EP16E).

## Tests (TR-E16-03)

As AC1–AC4; run counts and the axe output recorded in the implementation record.

## Technical notes

- **Inspected:** `apps/web/e2e/` — `helpers.ts:209` (post-login landing), `adaptive-scheduling.spec.ts` (`/dashboard` at `:168-169, 202-204, 272, 312, 365, 377-381, 412, 431`; `/plan/health` `:178-184, 431`; `/catch-up` `:406-409`), `auth-journeys.spec.ts:108,161,179`, `catch-up.spec.ts` (`/plan/health*` ×12; test ids `catch-up-preservation`), `global-setup.ts`, the EP15J axe gate (`expectNoAxeViolations`).
- **Known limitation:** BL-15-08 (ports/DB name) — run on free ports or the external-stack mode as EP15J did; record which.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-F1 | `catch-up.spec.ts`: (a) rename to `plan-flow.spec.ts` and rewrite; (b) keep the name | **(a)** — the file name should say what it tests | Ratified (user, 2026-11-17 — "ratify all") |
| D-F2 | 360 × 640 hero check: (a) Playwright `boundingBox()` ≤ viewport height without scroll; (b) screenshot comparison | **(a)** — deterministic, no snapshot tooling (EP11 out-of-scope precedent) | Ratified (user, 2026-11-17 — "ratify all") |

## Definition of Done

1, 8 (TR-E16-03), 9 (parent index). 2–7 N/A (no product code). 10–11: enables the EP16 combined review.

## Sizing

- **Outcome:** the epic's journeys are green end to end on the final surfaces, and the reviewer has an index to start from.
- **Actual at closeout:** about one window, 2026-11-18. Three new/rewritten specs (19 journeys), five spec re-points, one helper; three product fixes in owning children with unit tests. Web 1429/0; self-contained e2e 73/0/0 ×3; API domain gate 291/0. Five findings (F-EP16F-01…05).
- **Files:** `apps/web/e2e/today.spec.ts`, `navigation.spec.ts` (new), `plan-flow.spec.ts` (renamed from `catch-up.spec.ts`), `helpers.ts`, `adaptive-scheduling.spec.ts`, `auth-journeys.spec.ts`, `study-plan.spec.ts`, `docs/stories/EP16/artifacts/EP16/implementation.md` (new).
- **Start context:** this story; contracts.md § Route matrix, § Known windows; `helpers.ts`; EP15J's record for the stack invocation.
- **Verification:** `pnpm --filter @studypilot/web test:e2e` × 3 green; gated API run green; outputs recorded.
- **Dependencies / exclusions:** EP16A–EP16E. Harness robustness → BL-15-08.
