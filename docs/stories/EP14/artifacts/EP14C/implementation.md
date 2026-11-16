# EP14C implementation record

**Story:** [EP14C — E2E Reliability](../../EP14C-e2e-reliability.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-16
**Commit scope:** `apps/web/e2e/{study-plan,login,auth-journeys}.spec.ts` (test code only), this record, story/queue rows, the EP14 Backlog register (BL-14-07, BL-14-08), `efficiency.md`.

Decisions applied: D-C1…D-C3 as ratified by the user (2026-11-16).

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP14C-AC1 — study-plan journey edits a proposal whose moved window is free; passes for any server "today" | **Done.** The journey reads the editor rows and moves the first proposal whose +15-min window avoids the Monday 09:00–10:00 class and the 20:00 availability edge (D-C1). All five tests in the file now take "today" from the server window (`getServerWindow`) instead of the wall clock; one call site needed `user1.accessToken` (the e2e folder is outside `tsc`'s include — checked with a direct `tsc` pass). | `study-plan.spec.ts` 5/5 **on Monday 2026-11-16** — the exact day/scenario that failed identically at baseline `9ffd854` |
| EP14C-AC2 — login registers per test; logout waits for the settled shell; both pass under `fullyParallel` | **Done.** Login: a fresh user inside each test (D-C2). Logout: diagnosed from reproduced traces (D-C3) — the menu was clicked ~270 ms after "Sign In" mid-redirect, and later the menu could be unmounted by a late post-login re-render (F-EP14C-02); fix: wait for the settled page heading, then log out as one retried unit (open → click → reached `/login`, URL checked first each attempt). | auth-journeys file ×30 on 8 workers: **150/150**; login ×20 on 8 workers: 40/40 |
| EP14C-AC3 — three consecutive full parallel runs, zero failures from these three files | **Done.** Runs at 2026-11-16 (default parallelism, self-contained stack): 47/2/5, 40/3/11, 47/2/5 (passed/failed/did-not-run). Failures from EP14C's files: **0, 0, 0**. Remaining failures: `assignments-list.spec.ts:23` and `calendar.spec.ts:100` every run (EP14D-owned, F-EP13M-01) and, once, `adaptive-scheduling.spec.ts:115` (F-EP14C-03, product race below). | per-run logs summarized here |

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP14C-01 | `auth-journeys.spec.ts` "visiting a protected route while logged out" | Failed once in a cold full run: the redirect waits for the boot-time `/api/auth/refresh`, which outlasted the fixed budget on a cold, loaded stack. | **Fixed** — waits on the real refresh response (clear error if it never answers), per-test budget 60 s; the behavior under test is "it redirects", not boot speed. | — |
| F-EP14C-02 | Header account menu after login | Under 8-worker load the menu is sometimes unmounted within ~1 s after login (a late post-login re-render; candidates: onboarding step 1's mount-time `refreshProfile`, the unverified-email focus refresh). A real user could see a just-opened menu close. | **Not fixed** (story is test-only); test verifies logout as one retried unit. Registered **BL-14-07**. | planner |
| F-EP14C-03 | `apps/web/src/pages/plan/ui/PlanPage.tsx` `loadSaved` | **Product race:** the mount-time saved-plan read ends with `setMode(hasSessions ? 'saved' : 'initial')`; a "Generate plan" click before it resolves shows the preview, then the late read flips the page back to "No plan yet." Reproduced **5/24** (journey 1, 8 workers). The study-plan journey clicks Generate the same way, so it is exposed too. | **Not fixed** (product code; EP14C is test-only) and the journey was **not** tuned to hide it. Registered **BL-14-08** with the trigger "before EP14D" — EP14D-AC4 needs all seven journeys reliably green. Recommended: promote to a small fix story. | planner / user |
| — | `login.spec.ts` 409 | The per-test registration removes the collision mechanism by construction, but the 409 did **not** reproduce on demand: a control run of the old spec also passed 40/40. Recorded as "mechanism removed, not proven against a live repro". | Closed as above | — |
