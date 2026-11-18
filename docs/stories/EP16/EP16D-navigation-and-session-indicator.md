# EP16D — Navigation and the Session Indicator

**Story ID:** EP16D
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend
**Status:** Needs refinement — indicator placement and copy, Work group icon, and the Courses/Focus header link treatment are the refiner's (D16-15). Implementation after EP16A (EP16C recommended first so the redirect-only "Plan health" entry never ships with the new groups — see Known windows).
**Dependencies:** EP16A implemented (`/today` exists). Epic decisions D16-6 (ratified a), D16-11, D16-12, D16-14 (BL-14-07). Amends EP11 D11-4/D11-6/D11-10 (→ D11-11), EP15 D15-9, EP13E D-E13 — back-references recorded by the planner 2026-11-17.

## Plan at a glance

- **What this changes:** the signed-in navigation becomes **Today · Plan · Calendar · Work ▾ (Assignments, Courses)**; Home is shown only when signed out; the Focus group is gone and a header **session indicator** ("Running · 12:34 · Back to session") appears on every page except `/focus` while a session is active or paused; Semesters is linked from the Courses page, Study history from the Focus page; the Focus page's empty state points to Today; the post-login account-menu unmount (BL-14-07) is reproduced and fixed.
- **Why it improves it:** four places to go instead of ten entries in four groups, and the one thing the Focus entry was for — getting back to a running timer — is now impossible to lose (product, AC-E16-09/10); `navGroups.ts` loses two groups, `Header.tsx` loses a menu type, and a known shell bug is closed while the shell is open (code).
- **Decisions needing you:** none ▲ — D-D1…D-D4 are refiner/technical.
- **How to change this plan:** edit a Ruling cell below or in the epic register; ask the planner for AC changes. AC text freezes when implementation starts.

## Summary

Apply the navigation contract and add the one widget that makes removing the
Focus entries safe. Every removed entry gets an in-page link where a student
would look for it.

## Scope

**In:** `navGroups.ts` (contract per contracts.md § Navigation contract); `Header.tsx` desktop menus (`DesktopMenu` type → `'work' | 'account'`), `isGroupActive`, drawer sections, tests; `widgets/session-indicator/` (new: `ui/SessionIndicator.tsx`, `model/useCurrentSession.ts`) mounted in the header; a shared elapsed-seconds helper extracted from `useFocusSession`; Courses page **Semesters** link; Focus page **Study history** link and empty-state CTA **Go to Today**; BL-14-07 reproduction, fix and regression test; logout cache reset verified for the indicator.
**Out:** the bottom tab bar (EP16E); the Focus page's timer behaviour; any new route.

## Source requirement references

AC-E16-09, AC-E16-10 (primary); AC-E16-01 (first nav entry), AC-E16-12. TR-E16-01, TR-E16-04, TR-E16-05. DoD-1, 5, 6, 7, 8.

## Acceptance criteria

1. `authenticatedNavGroups` is exactly Today (`/today`), Plan (`/plan`), Calendar (`/calendar`), Work ▾ {Assignments (`/assignments`), Courses (`/courses`)}; `unauthenticatedNavGroups` is Home only; `accountMenuItems` is unchanged; desktop renders three links and one dropdown, the drawer renders the same set plus the Account section; `aria-current="page"` and group-active highlighting work for Work's children; header and drawer tests assert the exact sets (TR-E16-01) and the EP11 keyboard model still passes.
2. **Session indicator:** on every protected page except `/focus`, while `GET /study-sessions/current` returns an `ACTIVE` or `PAUSED` session, the header shows "Running · mm:ss" (ticking client-side) or "Paused · mm:ss" (static) and one link **Back to session** → `/focus`; nothing renders when the read returns `null`, a `COMPLETED` session, or fails (a failed read is silent — the Focus page owns error UI); the read runs on every `location.pathname` change and on `visibilitychange` → visible, never on an interval (D16-11); appearance is announced once (`aria-live="polite"` on a wrapper whose text is the state sentence without the ticking time; the time is `aria-hidden`); the link is keyboard-reachable in the header's tab order before the account menu; 44 px target on narrow viewports.
3. After logout the indicator never shows the previous student's session (the store's logout reset covers its cache; a test logs in as A with a session, logs out, logs in as B without one → nothing renders).
4. The Courses page header carries a link **Semesters** → `/semesters`; the Focus page header carries a link **Study history** → `/focus/history`; the Focus page's empty state reads "No focus session in progress — your next session is on Today" with the primary **Go to Today** → `/today`; `/semesters` and `/focus/history` are reachable from the drawer only via these pages (no nav entry).
5. **BL-14-07:** the late post-login re-render that closes a just-opened account menu is reproduced in a test (auth context resolving after the menu opens), fixed in `Header.tsx` (menu state must survive a `user` object identity change), and the test stays as a regression; if it cannot be reproduced within the story, the implementation record says so with evidence and a new backlog row replaces BL-14-07.

## Tests (TR-E16-01, TR-E16-04, TR-E16-05)

- `navGroups.test.ts` / `Header.test.tsx` / drawer tests: exact sets by auth state; Work dropdown keyboard model (open, arrows, Escape, focus return); active states; no "Dashboard", "Academics", "Planning", "Focus", "Plan health" strings (negative).
- `SessionIndicator.test.tsx`: active (ticks with fake timers), paused (static), null/completed/error → nothing; hidden on `/focus`; re-read on route change and visibility; announcement text once; link target; copy audit.
- `useCurrentSession.test.ts`: call count per route change; no interval.
- Logout isolation test (AC3) at the store/header level.
- BL-14-07 regression test (AC5).
- Manual (TR-E16-04, recorded): screen reader reads the indicator's appearance once and does not chatter on ticks.

## Technical notes

- **Inspected:** `navGroups.ts:65-101` (four sections; `NavSection` invariant: link xor group); `Header.tsx:497-525` (desktop nav loop over `navGroups`), `:528-552` (auth area — the indicator's natural slot is before `AccountMenu`), `DesktopMenu` type, `isGroupActive`; `FocusPage.tsx:75-87` (empty state); `CoursesPage.tsx:100` (`h1`); `StudyHistoryPage.tsx:127`; `studySessionApi.ts:74` `getCurrentStudySession`; `useFocusSession.ts` (owns `displayedElapsed`; the derivation to extract).
- **Proposed:** `entities/study-session/model/elapsed.ts` — pure `elapsedSecondsAt(session, nowMs)` used by both `useFocusSession` and the indicator (identical arithmetic, so the two can never disagree); `useCurrentSession` is a small hook with `useLocation` + `visibilitychange` listener, not an RTK Query endpoint (no cache to invalidate from the Focus page's mutations — a route change away from `/focus` re-reads).
- **BL-14-07 hypothesis** (unverified): the `AccountMenu` subtree remounts because a parent keys on `user`; fix by stable keys or by holding `openMenu` state above the remount boundary. Confirm by reproduction first.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-D1 | Indicator data source: (a) plain hook over the entity client, re-read on route change + visibility; (b) RTK Query endpoint with tag invalidation from focus-session mutations | **(a)** — D16-11; no polling, no new cache to keep coherent | Ratified (user, 2026-11-17 — "ratify all") |
| D-D2 | Indicator on `/focus`: (a) hidden (the page is the timer); (b) shown everywhere | **(a)** — two timers on one screen is noise | Ratified (user, 2026-11-17 — "ratify all") |
| D-D3 | Work group icon: (a) `Briefcase`; (b) `ClipboardList`; refiner picks | **(a)** | Ratified (user, 2026-11-17 — "ratify all") |
| D-D4 | Failed `current` read: (a) silent (nothing renders); (b) a muted "couldn't check your session" line | **(a)** — the header must never carry an error surface | Ratified (user, 2026-11-17 — "ratify all") |

## Definition of Done

1, 5, 6, 7, 8 (TR-E16-01/04/05). 2, 3 (verified, no new tenancy — AC3 test), 4, 9 N/A. 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** four navigation entries, a running session that follows the student to every page, and every retired entry replaced by a link where it is needed.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/widgets/header/ui/navGroups.ts` (+ test), `apps/web/src/widgets/header/ui/Header.tsx` (+ tests), `apps/web/src/widgets/session-indicator/ui/SessionIndicator.tsx`, `model/useCurrentSession.ts` (new, + tests), `apps/web/src/entities/study-session/model/elapsed.ts` (new, + test), `apps/web/src/features/focus-session/model/useFocusSession.ts` (uses the helper), `apps/web/src/pages/focus/ui/FocusPage.tsx` (+ test), `apps/web/src/pages/courses/ui/CoursesPage.tsx` (+ test).
- **Start context:** this story; contracts.md § Navigation contract, § Session indicator, § Known windows; `navGroups.ts`, `Header.tsx:460-560`, `useFocusSession.ts`.
- **Verification:** web typecheck/lint/test green; manual: start a session, navigate to Calendar → indicator shows and ticks; pause → "Paused"; finish → gone; log out/in as another student → gone.
- **Dependencies / exclusions:** EP16A (EP16C recommended before). Tab bar → EP16E; e2e → EP16F.
