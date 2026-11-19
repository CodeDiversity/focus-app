# EP16G — Reset Cached Student Data on Logout and User Change (security)

**Story ID:** EP16G
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend (store + auth wiring)
**Status:** Reviewed — EP16 combined review passed 2026-11-18, pass 2 ([review.md](./artifacts/EP16/review.md); invariant reviewer-verified in code and tests); record: [artifacts/EP16G/implementation.md](./artifacts/EP16G/implementation.md). ▲ D-G1 and D-G2 ratified (user, 2026-11-18).
**Dependencies:** none. Source: EP16D refinement finding (2026-11-18), verified by the planner against the code at `d35970a`.

## Plan at a glance

- **What this changes:** whenever the signed-in student becomes nobody (logout) or a different student (a session that resolves to another id), the web app empties every per-student cache: the six RTK Query slices (`api`, `assignmentsApi`, `calendarApi`, `todayPlanApi`, `planHealthApi`, `momentumApi`) and the onboarding slice. A registry test fails the build if a future slice is added to the store without joining the reset.
- **Why it improves it:** today nothing resets those caches. `logout` (`AuthContext.tsx:259-269`) only dispatches `clearUser`; `store.ts` has no reset; the read slices keep data for 60 s (`keepUnusedDataFor: 60`; the session `api` keeps it for 300 s) and do not refetch on mount. So a second student who signs in on the same tab within that window can be shown the first student's Today plan, calendar, assignments, momentum or onboarding state. This is an academic-data exposure on shared computers (product, security; core.md § Security). One central reset replaces "every slice must remember to clean up" (code).
- **Decisions needing you:** none — ▲ D-G1 and D-G2 ratified (user, 2026-11-18).
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts.

## Summary

Close a cross-student cache exposure that predates EP16 (the slices came with EP05/EP13) but that EP16's session indicator and Today page depend on. This is the one atomic security invariant in EP16, kept to one slice per story-sizing: one mechanism, every cache, one registry guard.

## Scope

**In:** a reset triggered by `clearUser` and by `setUser` whose `id` differs from the current one (`authSlice.ts:30-40`); `resetApiState()` for every RTK Query slice registered in `app/store/store.ts`; an onboarding-slice reset (`onboardingSlice.ts` — it has no `clearUser` handling today); a `PER_STUDENT_APIS` registry next to the store; tests.
**Out:** server-side changes (none needed — every endpoint already scopes by `userId`); the EP16D session indicator's own provider state (EP16D D-D8 owns it, and its AC3 cites this story); any change to token handling.

## Source requirement references

Shared DoD-3 (academic data scoped to the authenticated student); core.md § Security; EP16 epic invariants table (new row added by D16-19). EP16D-AC3 depends on this story.

## Acceptance criteria

1. After `logout()`, the state of every RTK Query slice in the store holds no queries and no mutations, and the onboarding slice is back to its initial state — asserted on the real store, not a mock.
2. When the signed-in user changes to a different `id` without a logout in between (e.g. a refresh resolving to another student), the same reset happens before the new student's first read is served; a `setUser` with the **same** `id` (profile refresh) does not reset anything.
3. Cross-student journey (integration test over the real store and the axios adapter): student A signs in, Today renders A's plan; A logs out; within 60 s B signs in on the same store; Today issues a fresh `GET /study-plans/today` and renders B's plan, and A's assignment title never appears in the DOM at any point after the logout.
4. A registry test reads the store's reducer keys and fails if any RTK Query `reducerPath` is missing from `PER_STUDENT_APIS` (so a future slice cannot skip the reset silently).

## Tests

- `app/store/resetOnUserChange.test.ts` (new): AC1 (logout empties all six + onboarding); AC2 (different id resets; same id does not — negative); AC4 registry completeness.
- `pages/today/ui/TodayPage.crossStudent.test.tsx` (new): AC3 journey with two students' fixtures; asserts request count and that A's title is absent after logout.
- Existing `features/auth/model/AuthContext.test.tsx` and `app/store/store.test.tsx` stay green.

## Technical notes

- **Inspected (planner, 2026-11-18):** `app/store/store.ts:11-49` (six `createApi` reducers + `auth` + `onboarding`; no root reset); `features/session/model/authSlice.ts:30-40` (`setUser` already tracks identity change for the banner; `clearUser`); `features/auth/model/AuthContext.tsx:85-95` (`applyUser` bumps `sessionVersion` on id change), `:259-269` (`logout`); `features/onboarding/model/onboardingSlice.ts` (no reset on logout); `keepUnusedDataFor` 60 s on five read slices, 300 s on `sessionApi`.
- **Proposed (D-G1 a):** `createListenerMiddleware` in `app/store/` with two effects: on `clearUser`, and on `setUser` where `prev.user?.id !== next?.id` (read from `listenerApi.getOriginalState()`), dispatch `x.util.resetApiState()` for each entry of `PER_STUDENT_APIS` and `resetOnboarding()`. The listener runs synchronously before the next render, which is what makes AC3's "never appears" hold.
- **Not verified:** whether any component holds per-student data in local state across a logout (pages unmount on the redirect to `/login`, so none is expected); the implementer records any found.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-G1 | Reset mechanism: (a) one store listener middleware on `clearUser` / identity-changing `setUser`, resetting every registered slice; (b) a root-reducer wrapper that returns `undefined` state on logout (resets everything, incl. `auth` flags like the banner); (c) call `resetApiState` inside `AuthContext.logout` and `applyUser` | **(a)** — central, synchronous, covers both triggers wherever they are dispatched, and leaves `auth`'s own state rules alone; (c) misses any future dispatch path; (b) is blunt and would reset `auth` mid-logout | Ratified (a) (user, 2026-11-18 — "D-G1 ratify all") |
| D-G2 | Registry: (a) explicit `PER_STUDENT_APIS` array + a completeness test against the store's reducer keys; (b) derive the list from the store at runtime | **(a)** — explicit and reviewable; the test gives (b)'s safety | Ratified (a) (user, 2026-11-18) |

## Definition of Done

1, 3 (the point of the story), 8. 2, 4–7, 9 N/A (no UI, no API). 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** no student can ever be shown another student's cached data after a logout or account switch on the same tab.
- **Actual at closeout:** under one window, one commit, 2026-11-18; files as planned plus `app/store/createAppStore.ts` (shared factory, F-EP16G-01); web 1325/0. Row in [efficiency.md](./artifacts/efficiency.md).
- **Files:** `apps/web/src/app/store/store.ts`, `apps/web/src/app/store/resetOnUserChange.ts` (new: listener + `PER_STUDENT_APIS`), `apps/web/src/features/onboarding/model/onboardingSlice.ts` (export a reset action), tests as listed.
- **Start context:** this story; `store.ts`, `authSlice.ts`, `AuthContext.tsx:85-95,259-269`, `onboardingSlice.ts`.
- **Verification:** `npx vitest run` and `npx tsc --noEmit` in `apps/web`; the AC3 journey test green.
- **Dependencies / exclusions:** none. EP16D's indicator state → EP16D (D-D8), which relies on this story for its AC3.
