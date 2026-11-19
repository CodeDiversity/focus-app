# EP16J — Start the Next Session from the Focus Page (optional)

**Story ID:** EP16J
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1) — **optional child** (D16-20): implemented only if the user accepts ▲ D-J1; reviewed with the EP16 unit if accepted.
**Layer:** Frontend
**Status:** Deferred to backlog (user, 2026-11-18): ▲ D-J1 ruled (b) — folded into BL-16-05. Not part of the EP16 review unit. This file stays as the spec if BL-16-05 is picked up.
**Dependencies:** EP16D implemented (Focus empty state with `h1`, Study history, Go to Today); EP13D/EP13I (`useStartPlannedSession`, the micro-start). Epic decision D16-12.
**ADHD value: 5 / 10.** Every hop between "I want to work" and "I am working" is an initiation tax, and ADHD initiation is the bottleneck EP16 exists to lower. Today a student who opens Focus (from the tab bar's muscle memory, the strip, or a bookmark) with no session running is told their next session is on Today and sent there to find the button. Offering that same next session — with **Start focus** and **Just 10 min** — right here removes one hop. Moderate rather than high value because Today is one tap away and already does this well.

## Plan at a glance

- **What this changes:** the Focus page's empty state shows the next planned session for today when there is one (title, time label, **Start focus**, **Just 10 min**) using the hero's exact hook and copy; **Go to Today** becomes the secondary link under it. With nothing planned today the state is EP16D's ("Your next session is on Today." / **Go to Today**).
- **Why it improves it:** starting from Focus becomes one tap, the same as from Today (product). In code, the hero's next-up block is lifted into a small `NextSessionStart` component used by both the Today hero and the Focus empty state — one start path, not two.
- **Decisions needing you:** ▲ **D-J1 — accept into EP16**. D-J2 (what to extract) is non-▲.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes.

## Summary

`TodayPlanCard` already renders the next-up block from `plan.nextSession` with `useStartPlannedSession`. Extract that block (label, title, meta, the two buttons, the start error) into `features/today-plan/ui/NextSessionStart.tsx`; render it in the hero as today and, when `useTodayPlanQuery()` has a `nextSession`, in `FocusPage`'s empty state above **Go to Today**. Starting lands on the timer exactly as from Today (same hook: `/focus` is already the current page, so the hook's navigation is a no-op and the page re-reads the session).

## Scope

**In:** `features/today-plan/ui/NextSessionStart.tsx` (new, extracted) + test; `TodayPlanCard.tsx` uses it (behaviour unchanged; tests pass unchanged); `pages/focus/ui/FocusPage.tsx` empty state reads `useTodayPlanQuery()` and renders it; `FocusPage.test.tsx`; copy audit.
**Out:** the running/paused timer; the celebration; any new copy beyond EP16D's; API changes (D16-13).

## Source requirement references

AC-E16-02 (one next action), AC-E16-12, D16-12. TR-E16-01, TR-E16-05. DoD-1, 5, 6, 7, 8.

## Acceptance criteria

1. On `/focus` with no open session and a `nextSession` for today, the empty state shows the heading row (EP16D), then the next-up block — "Next up", the title, the time label, **Start focus** (primary) and **Just 10 min** — then **Go to Today** as a text link; **Start focus** is the only primary control (D16-12 (8)) and receives the auto-focus EP16D gave **Go to Today**.
2. **Start focus** / **Just 10 min** start the session through `useStartPlannedSession` and the page shows the running timer without leaving `/focus`; a 409 (a session already open) shows the hook's existing error with **Go to your session** → reload.
3. With no `nextSession` (no plan, or today done) the empty state is exactly EP16D's; while the today-plan read loads, the block is not rendered (no layout shift larger than one block; no spinner); on a failed read the state is EP16D's (silent — Today owns that error).
4. `TodayPlanCard` renders byte-identically to EP16D's version (existing tests unchanged). Every string passes `expectNoForbiddenWords`.

## Tests (TR-E16-01, TR-E16-05)

- `NextSessionStart.test.tsx` (new, cases moved from `TodayPlanCard.test.tsx` where they belong): `shows Next up with Start focus and Just 10 min`; `hides Just 10 min for an IN_PROGRESS session`; `names the micro-start "Just 10 min of <title>"`; `shows the 409 error with Go to your session`.
- `TodayPlanCard.test.tsx`: existing cases pass unchanged.
- `FocusPage.test.tsx`: `empty state offers the next session's Start focus and Just 10 min above Go to Today`; `auto-focus lands on Start focus when a next session exists, on Go to Today otherwise`; `starting from the empty state shows the running timer on /focus`; `with no next session the empty state is EP16D's`; `a failed today-plan read falls back silently`; `passes the copy audit`.

## Technical notes

- **Inspected (2026-11-18, HEAD `90161c0`):** `TodayPlanCard.tsx` next-up block (`Next up`, `sessionTimeLabel(...)`, `Start focus`/`Resume focus`, `Just 10 min` with the EP13M label-in-name, `start.error` alert with **Go to your session**); `useStartPlannedSession(onRetry)` (`features/today-plan/model/useStartPlannedSession.ts`) navigates to `/focus` on success; `FocusPage.tsx` empty state (EP16D) with `emptyActionRef` auto-focus; `useTodayPlanQuery` (`features/today-plan/api/todayPlanApi.ts`, RTK, 60 s cache).
- **Design:** `NextSessionStart({ next, onStarted?, minutes })` owns the block and the hook; `FocusPage` passes `onStarted={() => void reload()}` so the timer appears without a route change (the hook's `navigate('/focus')` on the current path is a no-op in React Router 6). Auto-focus target: the primary button when the block renders, else **Go to Today**.
- **API need:** none.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-J1 | Accept into EP16's review unit: (a) accept; (b) defer to backlog (BL-16-05 focus-upgrades epic) | **(b) unless the user values the saved hop now** — the hop costs one tap and Today already does this well; the extraction is cheap, but it widens the review unit more than H/I. Recommended: defer, and fold into BL-16-05 | Ratified (b) — deferred (user, 2026-11-18 — "Implement H, I") |
| D-J2 | Extraction: (a) lift the hero's next-up block into `NextSessionStart` shared by both pages; (b) duplicate a smaller block on Focus | **(a)** — one start path; (b) is the two-flows problem EP16C just removed | Ratified (user, 2026-11-18 — "ratify all decisions") (applies if ever promoted) |

## Definition of Done

1, 5, 6, 7, 8 (TR-E16-01/05). 2, 3, 4, 9 N/A. 10–11 via the EP16 combined review (if accepted).

## Sizing

- **Outcome:** starting the next session is one tap from Focus, exactly as from Today.
- **Size:** about half a window (extraction + two pages' tests). No split.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/features/today-plan/ui/NextSessionStart.tsx` (new, + test), `TodayPlanCard.tsx`, `apps/web/src/pages/focus/ui/FocusPage.tsx` (+ test).
- **Start context:** this story; `TodayPlanCard.tsx` next-up block; `useStartPlannedSession.ts`; `FocusPage.tsx` empty state.
- **Verification:** `npx vitest run src/features/today-plan src/pages/focus`; tsc + eslint clean; manual: start from `/focus` on a phone.
- **Dependencies / exclusions:** EP16D. Focus-session upgrades → BL-16-05.
