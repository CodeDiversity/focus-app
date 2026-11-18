# EP16G implementation record

**Story:** [EP16G — Reset Cached Student Data on Logout and User Change](../../EP16G-reset-student-data-on-logout.md)
**Status:** Implemented — awaiting parent review (EP16 combined review after EP16F)
**Date:** 2026-11-18
**Baseline:** `69bc401`.
**Commit scope:** `app/store/resetOnUserChange.ts` (new: `PER_STUDENT_APIS` registry + listener middleware), `app/store/createAppStore.ts` (new: the one store configuration), `app/store/store.ts` (now `createAppStore()`), `test/providers.tsx` (`makeTestStore` = `createAppStore()`), `features/onboarding/model/onboardingSlice.ts` (`resetOnboarding`), tests; this record, story, queue, efficiency.

Decisions applied: ▲ D-G1 (a) and D-G2 (a) — ratified by the user 2026-11-18 ("D-G1 ratify all"). The planning-checklist's plan review for the new invariant was **not run**: the user's instruction was to continue straight to implementation (recorded in history.md).

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP16G-AC1 — after `logout()` every RTK Query slice holds no queries/mutations and onboarding is initial, on the real store | **Done.** `clearUser` is matched by the listener, which dispatches `resetApiState()` for each registry entry and `resetOnboarding()`. The test seeds `todayPlanApi` and `assignmentsApi` through `upsertQueryData` and `applyOnboardingState`, then asserts every registered slice is `{ queries: {}, mutations: {} }` and onboarding equals its initial state. | `app/store/resetOnUserChange.test.ts` "EP16G-AC1" |
| EP16G-AC2 — a different `id` resets; the same `id` does not | **Done.** The listener reads the previous id from `getOriginalState()`; a `setUser` with the same id returns early. | "EP16G-AC2" (positive + negative) |
| EP16G-AC3 — cross-student journey: B's Today re-reads and never shows A's plan | **Done.** `TodayPage.crossStudent.test.tsx`: A's Today renders A's title (1 read); unmount, `clearUser`, `setUser(B)`, remount → A's title is absent synchronously (no cache hit), B's title renders, read count = 2. | `pages/today/ui/TodayPage.crossStudent.test.tsx` |
| EP16G-AC4 — registry completeness | **Done.** The test derives every slice shaped like an RTK Query state from the real store and asserts the set equals `PER_STUDENT_APIS`' reducer paths. | "EP16G-AC4" |

## Verification

- `apps/web`: `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src/app src/test src/features/onboarding src/pages/today --max-warnings=0` clean; `npx vitest run` → **122 files, 1325 passed, 0 failed** (4 new tests). Working tree of this commit, 2026-11-18.
- API unchanged (D16-13).

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP16G-01 | `app/store/store.ts`, `test/providers.tsx` | The app store and the test store duplicated their reducer/middleware configuration — exactly how a reset could land in one and not the other. | **Fixed here:** both build from `createAppStore()`. A first attempt derived the reducer map from the registry dynamically; RTK then lost the literal keys and `RootState` no longer typed the API slices, so the reducers are listed explicitly and the AC4 test keeps the two lists in step. | implementer — closed |
| F-EP16G-02 | process | The listener and its tests were written in the same step, so the suite passed on first run rather than failing first. The tests seed real cache entries and assert their absence, so they do test the behaviour. | Noted. | implementer |

## How to verify by hand

Not executed (no interactive browser); user instructions: sign in as student A, open Today, sign out, and within a minute sign in as student B on the same tab. Expected: Today shows a loading state and then B's plan; A's assignment titles never appear. Also: after A signs out, visiting `/onboarding` as a new student B shows B's wizard, not A's completed state.
