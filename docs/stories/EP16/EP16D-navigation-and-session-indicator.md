# EP16D — Navigation and the Session Indicator

**Story ID:** EP16D
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend
**Status:** Reviewed — EP16 combined review passed 2026-11-18, pass 2 ([review.md](./artifacts/EP16/review.md)). Record: [implementation.md](./artifacts/EP16D/implementation.md). All ACs done; BL-14-07 reproduced pre-fix, fixed (D-D5) and kept as a regression.
**Refined:** 2026-11-18
**Dependencies:** EP16A implemented (`/today` exists; nav's first entry already `{ id: 'today', label: 'Today', icon: Sun, to: '/today' }`). EP16B implemented (`expectNoForbiddenWords`). Epic decisions D16-6 (ratified a), D16-11, D16-12, D16-14 (BL-14-07). Amends EP11 D11-4/D11-6/D11-10 (→ D11-11), EP15 D15-9, EP13E D-E13 — back-references recorded by the planner 2026-11-17. New D-D5 refines EP10C D10-11 (drawer route-change close) — back-reference requested.

## Plan at a glance

- **What this changes:** signed-in navigation becomes **Today · Plan · Calendar · Work ▾ (Assignments, Courses)**. Home shows only when signed out, and the Focus group is gone. While a focus session is running or paused, a slim **session strip** sits at the top of the header on every page except `/focus`. It reads "Running · 12:34" or "Paused · 12:34" with a **Back to session** link. Courses gets a **Semesters** link. The Focus empty state gets a page heading, a **Study history** link and **Go to Today**. The account menu no longer closes by itself just after login (BL-14-07). Root cause: a second, late post-login redirect.
- **Why it improves it:** four places to go instead of ten entries in four groups. The one job the Focus entry did, getting back to a running timer, becomes impossible to lose (product, AC-E16-09/10). In code: `navGroups.ts` loses two groups, `Header.tsx` loses two menu types, and a known shell race is closed with a regression test.
- **Decisions needing you:** none ▲. D-D1…D-D4 ratified. New D-D5…D-D8 are `Proposed` and technical/layout, so they ratify by default at implementation start. Refiner finding "RTK caches survive logout" (▲ security) is returned to the planner. It is not in this story.
- **How to change this plan:** edit a Ruling cell below or in the epic register; ask the planner for AC changes. AC text freezes when implementation starts.

## Summary

Apply the navigation contract and add the one widget that makes removing the
Focus entries safe. Every removed entry gets an in-page link where a student
would look for it. Fix the post-login account-menu race while the shell is open.

## Scope

**In:**
- `navGroups.ts` per [contracts.md § Navigation contract](./contracts.md#navigation-contract-ac-e16-09-ac-e16-11-d16-6-a-d16-7).
- `Header.tsx`: `DesktopMenu` becomes `'work' | 'account'`; the desktop nav, `isGroupActive`, drawer sections and tests follow the new contract. Add the session strip and its live text. Add the BL-14-07 route-change rule (D-D5).
- `widgets/session-indicator/` (new): one shared current-session read mounted in `Layout` (D-D8), plus the strip UI.
- `entities/study-session/model/elapsed.ts` (new): the elapsed arithmetic and `formatElapsed`, extracted from `useFocusSession`/`FocusTimer`.
- Courses page **Semesters** link.
- Focus page empty state: `h1`, **Study history** link, copy and **Go to Today** (D-D7).
- BL-14-07: reproduction, fix and regression tests.
- Logout isolation for the indicator (AC3).
- Minimal e2e edit (test-only) to the one journey that clicks the removed Planning/Focus menus.

**Out (implementer must not drift into these):**
- The bottom tab bar, the narrow-viewport drawer reduction and `useMediaQuery` (EP16E).
- Focus timer behaviour and the celebration block's links (`FocusTimer.tsx:202-212`, unchanged).
- Any new route.
- Any API change (D16-13).
- Resetting RTK Query caches on logout (refiner finding "RTK caches survive logout", planner).
- The post-login "Today flashes before onboarding" double navigation itself (registered as a finding, see BL-14-07 notes).
- Migrating `CalendarPage`'s local `useNarrowViewport`.
- Rewriting the e2e suites (EP16F).
- Fixing the pre-existing `<Link><Button>` nesting elsewhere (e.g. `AssignmentsPage.tsx:308-312`, `FocusPage.tsx:83-85`).
- The logo target.

## Source requirement references

AC-E16-09, AC-E16-10 (primary); AC-E16-01 (first nav entry), AC-E16-12. TR-E16-01, TR-E16-04, TR-E16-05. DoD-1, 5, 6, 7, 8 (3 verified for the indicator).

## Acceptance criteria

1. `authenticatedNavGroups` is exactly Today (`/today`), Plan (`/plan`), Calendar (`/calendar`), Work ▾ {Assignments (`/assignments`), Courses (`/courses`)}; `unauthenticatedNavGroups` is Home only; `accountMenuItems` is unchanged; desktop renders three links and one dropdown, the drawer renders the same set plus the Account section; `aria-current="page"` and group-active highlighting work for Work's children; header and drawer tests assert the exact sets (TR-E16-01) and the EP11 keyboard model still passes.
2. **Session indicator:** on every protected page except `/focus`, while `GET /study-sessions/current` returns an `ACTIVE` or `PAUSED` session, the header shows "Running · mm:ss" (ticking client-side) or "Paused · mm:ss" (static) and one link **Back to session** → `/focus`; nothing renders when the read returns `null`, a `COMPLETED` session, or fails (a failed read is silent — the Focus page owns error UI); the read runs on every `location.pathname` change and on `visibilitychange` → visible, never on an interval (D16-11); appearance is announced once (`aria-live="polite"` on a wrapper whose text is the state sentence without the ticking time; the time is `aria-hidden`); the link is keyboard-reachable in the header's tab order before the account menu; 44 px target on narrow viewports.
3. After logout the indicator never shows the previous student's session (the indicator's state is cleared when the signed-in user changes, and a read started for A is discarded — D-D8; the store-wide reset is EP16G; a test logs in as A with a session, logs out, logs in as B without one → nothing renders). *(Wording amended by the planner before freeze, A-EP16-02.)*
4. The Courses page header carries a link **Semesters** → `/semesters`; the Focus page's empty state gains a heading row carrying a link **Study history** → `/focus/history` (D-D7; the running timer stays distraction-free and keeps its existing celebration link), and reads "No focus session in progress" / "Your next session is on Today." with the primary **Go to Today** → `/today`; *(wording amended, A-EP16-02)* `/semesters` and `/focus/history` are reachable from the drawer only via these pages (no nav entry).
5. **BL-14-07:** the late post-login re-render that closes a just-opened account menu is reproduced in a test (auth context resolving after the menu opens), fixed in `Header.tsx` (menu state must survive a programmatic `replace` redirect — D-D5; wording amended, A-EP16-02), and the test stays as a regression; if it cannot be reproduced within the story, the implementation record says so with evidence and a new backlog row replaces BL-14-07.

**Refiner notes on AC text (2026-11-18). The planner applied the AC3, AC4 and AC5 suggestions as amendment A-EP16-02; the notes are kept for provenance:**
- **AC3 premise is false in the code.** There is no store logout reset. `store.ts:11-49` has no root-reducer reset, and `logout` (`AuthContext.tsx:259-269`) dispatches only `clearUser`. Under D-D1 the indicator's state is not in the store anyway. AC3's observable outcome stands and is tested as written. The mechanism is D-D8: state is owned by the provider and reset on a change of `user.id`, and any response from an earlier read generation is dropped. Suggested wording: "…(the indicator's state is cleared when the signed-in user changes; a read started for A is discarded) …".
- **AC5 names the wrong trigger.** A `user` object identity change cannot close the menu. `Header` keeps `openMenu` in its own state (`Header.tsx:408`). `Layout` sits outside `<Routes>` (`App.tsx:28-92`), and nothing keys `Header` or `AccountMenu`. The only reset is the pathname effect (`Header.tsx:416-420`), fired by a late `replace` navigation (see BL-14-07 notes). The fix is still in `Header.tsx`, as AC5 says (D-D5). The reproduction drives the late redirect, which is the "auth context resolving after the menu opens" sequence. Suggested wording: "…(menu state must survive a programmatic `replace` redirect)…".
- **AC4 "Focus page header":** `/focus` with a session has no page header. `FocusTimer` owns its `h1` (`FocusTimer.tsx:84`). The empty state has no `h1` at all (EmptyState renders `h3`). Per D-D7, the header with **Study history** lives in the empty state, and the running timer stays distraction-free (D16-12). Students reach history after a session through the existing celebration link "View study history". The AC's sentence is rendered as EmptyState title "No focus session in progress" plus description "Your next session is on Today."
- **AC-E16-12 "one live region":** the indicator's `aria-live` span is shell-level, not page-level. It uses no `role="status"`, so Today still has exactly one page `role="status"` (EP16A). Recorded so the EP16F axe/live-region checks count page regions only.

## Tests (TR-E16-01, TR-E16-04, TR-E16-05) — named per AC

Framework: Vitest + Testing Library (`apps/web`, `npx vitest run`); fake timers via `vi.useFakeTimers()` as in `useFocusSession.test.ts`.

**AC1:**
- `apps/web/src/widgets/header/ui/navGroups.test.ts` (new):
  - `authenticatedNavGroups is exactly Today, Plan, Calendar and Work {Assignments, Courses}` (ids, labels, `to`, order)
  - `unauthenticatedNavGroups is Home only`
  - `accountMenuItems is unchanged (Profile, Verify email when unverified, Logout)`
  - `every section is a link xor a group`
- `Header.test.tsx`, existing EP11 cases re-targeted:
  - `renders Today, Plan and Calendar as links plus the Work menu trigger` (replaces `renders Home and Today as single links plus Academics/Planning menu triggers`)
  - `shows no Home, Dashboard, Academics, Planning, Focus, Focus session, Study history, Semesters or Plan health entry when signed in` (replaces `exposes the EP13E Focus group and the Plan health entry (D-E13)`)
  - `renders only Home and auth buttons when unauthenticated` (kept)
  - Keyboard cases kept, run against **Work** (`Work menu`): `opens the Work menu on click with menu semantics`, `keeps only one menu open at a time` (Work + account), `closes on outside mousedown`, `closes on Escape and restores focus to the trigger`, `toggles the menu with Enter and Space on the trigger`, `opens with ArrowDown focusing the first item and ArrowUp focusing the last`, `cycles items with ArrowUp/ArrowDown and supports Home/End`, `activates the focused item with Enter and Space`, `closes when Tab moves focus out without restoring the trigger`
  - `marks the active dropdown item and its group trigger` (`/assignments`)
  - `highlights the Work trigger for /courses/:id and /assignments` (replaces the Academics nested case)
  - `marks the active single link` (Plan on `/plan`; replaces `…and keeps Home for authenticated users`)
- Drawer, updated:
  - `renders Today, Plan, Calendar, the Work section and the Account section for an authenticated user`
  - `marks the active drawer item with aria-current and keeps nested routes off the parent` (`/courses/abc`)
  - `traps focus inside the drawer after the grouped sections were added` (kept)

**AC2:**
- `apps/web/src/widgets/session-indicator/ui/SessionIndicator.test.tsx` (new):
  - `shows "Running · 00:42" and a Back to session link for an ACTIVE session`
  - `ticks once per second while ACTIVE`
  - `shows "Paused · 12:34" and does not tick for a PAUSED session`
  - `renders nothing for null`
  - `renders nothing for a COMPLETED session`
  - `renders nothing when the read fails`
  - `renders nothing on /focus and shows on /focus/history`
  - `Back to session links to /focus`
  - `the time is aria-hidden and the live text is the sentence only`
  - `announces once on appearance and stays silent on ticks and route changes`
  - `uses h:mm:ss past one hour`
  - `Back to session has a 44px target`
  - `passes the copy audit` (`expectNoForbiddenWords`)
- `apps/web/src/widgets/session-indicator/model/CurrentSessionProvider.test.tsx` (new):
  - `reads once on mount when signed in`
  - `does not read when signed out`
  - `reads again on every pathname change`
  - `reads on visibilitychange to visible, not to hidden`
  - `never reads on an interval` (advance 10 min of fake time; call count unchanged)
  - `drops a response that resolves after a newer read`
  - `refresh() re-reads`
  - `useCurrentSession outside a provider returns no session and a no-op refresh`
- `Header.test.tsx`:
  - `places the session strip before the logo and the account trigger in tab order`
  - `renders no strip and empty live text when there is no session`
- `apps/web/src/entities/study-session/model/elapsed.test.ts` (new):
  - `elapsedSecondsAt adds whole seconds since the response instant`
  - `elapsedSecondsAt never returns less than the payload's elapsedSeconds`
  - `formatElapsed renders mm:ss and h:mm:ss`
- Existing `useFocusSession.test.ts` and `FocusTimer.test.tsx` pass unchanged (they prove the extraction is arithmetic-identical).

**AC3:**
- `CurrentSessionProvider.test.tsx`:
  - `after logout and login as another student nothing renders`
  - `a read started for student A that resolves after logout is discarded`

**AC4:**
- `CoursesPage.test.tsx`: `header links to Semesters (/semesters)`
- `FocusPage.test.tsx`:
  - `renders the empty state pointing to Today with Go to Today` (replaces `renders empty state with Go to assignments when no session`)
  - `the empty state has an h1 "Focus session" and a Study history link to /focus/history`
  - `moves focus to Go to Today when the empty state appears` (existing auto-focus behaviour, re-targeted)
  - `passes the copy audit on the empty state`

**AC5:**
- `Header.test.tsx`:
  - `keeps the account menu open when a redirect replaces the route (BL-14-07)`
  - `closes menus and the drawer on a link navigation (PUSH) and on Back (POP)`
  - `closes menus and the drawer when the signed-in user changes`
- `apps/web/src/widgets/header/ui/Header.postLogin.test.tsx` (new, real `AuthProvider` + `PublicRoute` + `LoginPage` + `Header`, harness pattern of `ProtectedRoute.test.tsx` with `Providers`/`makeTestStore`): `a just-opened account menu survives the post-login onboarding redirect (BL-14-07 reproduction)`. Run it **before** the fix and record the failure in `implementation.md`.

**E2E (test-only, minimal; EP16F rewrites):** `apps/web/e2e/adaptive-scheduling.spec.ts:414-430`, the block that clicks the `Planning` and `Focus` menus. Re-point it so it asserts that the Work menu offers Assignments and Courses and that the **Plan** link is visible. Run the full Playwright suite once in EP15J external-stack mode as EP16A did.

**Manual (TR-E16-04, recorded in `implementation.md`):**
- VoiceOver (macOS Safari) and NVDA or TalkBack: start a session, go to Calendar. The strip's sentence is read once and nothing repeats while the time ticks. Tab from the top of the page reaches **Back to session** before the logo and the account trigger.
- 360 × 640: the strip fits on one line, and the link's target is 44 px.

## UI/UX

### Element decisions

| Element | Decision | Reason |
|---|---|---|
| Navigation data | `navGroups.ts`. Icons: Today `Sun` (exists), Plan `CalendarCheck`, Calendar `Calendar`, Work `Briefcase` (D-D3), Assignments `ClipboardList`, Courses `BookOpen`, Home `Home`. Drop the now-unused `Activity`, `CalendarDays`, `CalendarRange`, `GraduationCap`, `History`, `Timer` imports and update the `NavSection.id` doc comment. | One contract for desktop and drawer (EP11B). |
| Work dropdown | Existing `NavMenu` unchanged. Trigger `aria-label="Work menu"`; the menu's `aria-label` is "Work". | EP11 keyboard model reused, no new menu code. |
| Session strip | New `SessionIndicator` (`widgets/session-indicator/ui/SessionIndicator.tsx`), mounted as the **first child of `<header>`** (D-D6). | One placement at every width. It precedes the account trigger in DOM and visual order. |
| Live text | A persistent `<span className="sr-only" aria-live="polite" aria-atomic="true">` rendered by `SessionIndicator` whenever signed in. Its text is empty when no strip shows. | A live region must exist before its text changes to be announced reliably. Because it persists across routes, the text only changes on real transitions. |
| Shared read | `CurrentSessionProvider` in `Layout` (D-D8). `useCurrentSession()` is the consumer. | One read per route change for the whole shell. EP16E's tab bar and the Focus page reuse it. |
| Courses link | A plain `<Link to="/semesters">` styled like the ghost `Button` (classes below), with `CalendarRange` icon (aria-hidden) and text **Semesters**. It goes in the header's action cluster before **Add Course**: `CoursesPage.tsx:98-110` becomes `<div className="flex items-center gap-2">` [Semesters] [Add Course]. | Mirrors the Assignments page's "Study history" placement (`AssignmentsPage.tsx:307-312`) without nesting a `<button>` in an `<a>` (axe `nested-interactive`). |
| Focus empty state | `FocusPage.tsx:75-90` gets a header row: `h1` "Focus session" (`text-3xl font-bold text-text`, as `StudyHistoryPage.tsx:127`) and, on the right, a plain ghost-styled `<Link to="/focus/history">` with `History` icon and text **Study history**. Then `EmptyState` with the new copy, and the existing `<Link ref={emptyActionRef}><Button>` structure re-targeted to `/today` and labelled **Go to Today**. | The page had no `h1`. The primary stays the only primary control (D16-12 (8)). |

Ghost-link classes (copied from `Button` ghost + base so the new links match):
`inline-flex items-center gap-2 rounded-md px-4 py-2 text-body-sm font-medium text-text-muted hover:bg-surface-muted hover:text-text transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 max-sm:min-h-[44px]`.

### Layout and hierarchy

- **Header (no session):** unchanged row of logo, desktop nav, auth area, hamburger. Desktop nav shows Today, Plan, Calendar, Work ▾ with `gap-4 lg:gap-6`. Update the EP13E "five sections" comment at `Header.tsx:500-501`.
- **Header (session ACTIVE or PAUSED, any page but `/focus`):** a strip sits above the logo row, full width, with `border-b border-border bg-surface-muted`. Inner container `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex min-h-[44px] items-center justify-between gap-3`.
  - Left: icon (`Timer` while running, `Pause` while paused; `h-4 w-4`, aria-hidden), then **Running · 12:34** or **Paused · 12:34** in `text-body-sm text-text`. The time uses `tabular-nums` so the width does not jitter. The entire left group is `aria-hidden="true"`.
  - Right: link **Back to session** → `/focus`, `inline-flex min-h-[44px] items-center px-2 text-body-sm font-medium text-accent hover:underline` plus the standard focus ring.
  - It is a text link, not a button. On Today with a running session the hero's **Resume focus** stays the one primary control (D16-12 (8)), and the strip is the quiet way back.
- **Focus empty state:** `h1` + Study history link on the first row, then the icon, the title "No focus session in progress", the description "Your next session is on Today." and **Go to Today** (primary).
- **Courses:** `h1` "My Courses" and description unchanged; actions [Semesters (ghost link)] [Add Course (primary)].

### States

| Surface | Loading | Empty / none | Error | Ready |
|---|---|---|---|---|
| Strip | Keeps showing the **last known** state while a re-read is in flight, so it does not flicker on navigation. Before the first read: nothing. | `null` / `COMPLETED` → nothing; live text cleared silently. | Silent: nothing renders (D-D4). An error keeps the previous value only until the next successful read, so a failed read after a finish never resurrects a stale strip. On error the state becomes `null`. | ACTIVE ticks every 1 s (display only); PAUSED static. |
| Nav | n/a | Signed out: Home + Login / Get Started (unchanged). | n/a | Active link `aria-current="page"`; Work trigger bold + accent for `/assignments*`, `/courses*`. |
| Focus page | Unchanged ("Loading your session…"). | New header + copy + Go to Today. | Unchanged (`role="alert"` + Try again). | Unchanged timer. |

### Keyboard and focus

- EP11 menu model unchanged for **Work** and the account menu (`useMenuFocus`, `Header.tsx:64-148`): Enter/Space/ArrowDown/ArrowUp open, arrows cycle with wrap, Home/End, Escape closes and restores trigger focus, Tab closes without restoring, outside mousedown closes.
- Drawer mechanics unchanged except D-D5's rule (focus trap `:422-469`, Escape, scroll lock, focus restore to the hamburger).
- Tab order with a session: skip link → **Back to session** → logo → Today → Plan → Calendar → Work → account trigger. The strip link is before the account menu at every width, which satisfies AC2.
- The strip never takes focus by itself and never moves focus when it appears.

### Accessibility (WCAG 2.2 AA)

- Landmarks: no new landmark. The strip is a plain `div` inside `<header>` (banner). EP16D does not change the count of `<nav aria-label="Primary">`: one in the header, plus the drawer's while it is open, as today. EP16E makes it exactly one at every width.
- Live sentence (exact copy): "Your focus session is running." / "Your focus session is paused." It is set when the strip appears or the status changes, and cleared, without an announcement, when the strip goes away. The ticking time is never inside the live span. The wording deliberately differs from `FocusTimer`'s "Focus session running" (`FocusTimer.tsx:64-71`), which the e2e journeys match by text (`adaptive-scheduling.spec.ts:216,325`).
- Browse mode reads the live span ("Your focus session is running.") followed by the link "Back to session". The visible status group is aria-hidden, so it is not read twice.
- No colour-only meaning: the words Running/Paused and a distinct icon carry the state. No pulsing dot.
- Targets: the strip link is `min-h-[44px]` at every width. Nav and drawer targets are unchanged (drawer rows are already 44 px, `navLinkClass` mobile).
- Contrast: `text-text` / `text-accent` on `bg-surface-muted` use existing tokens already used together (e.g. ghost hover). Verify ≥ 4.5:1 in the manual pass.

### Responsive

- **Desktop (≥ `md`, 768 px):** the strip spans the header's width above the logo row. Nav has four entries.
- **`md` breakpoint:** the nav fits on one row with `gap-4` (four entries instead of five, so EP13E's crowding goes away).
- **360 px:** the strip fits on one line. Status is about 110 px, the link about 120 px, and 328 px are available. With h:mm:ss (about 130 px) it still fits, and it also fits at 320 px. Below `md` the drawer still lists the four primary entries until EP16E (Known window).
- The strip adds 44 px of chrome only while a session is open. EP16E/EP16F's 360 × 640 hero check (V-16-3) must include the running-session case.

### Reduced motion

The strip has no entrance or exit animation; it appears and disappears instantly. The tick is a text change, not motion. Nothing new needs a `motion-reduce:` companion.

### Copy (exact)

**Nav labels:** Today, Plan, Calendar, Work, Assignments, Courses (signed-in); Home (signed-out).

**Session strip:**
- Visible status: `Running · {mm:ss}` / `Paused · {mm:ss}` (h:mm:ss past one hour).
- Link: **Back to session**.
- Live sentence: "Your focus session is running." / "Your focus session is paused."

**Courses page:** **Semesters**.

**Focus empty state:**
- `h1`: "Focus session"
- Link: **Study history**
- Title: "No focus session in progress"
- Description: "Your next session is on Today."
- Primary: **Go to Today**

Every string passes `expectNoForbiddenWords`.

## Technical notes

### Inspected (2026-11-18, HEAD `d35970a`)

- `navGroups.ts:64-103`: Home, Today (EP16A), Academics, Planning (Calendar, Plan, Plan health), Focus (Focus session, Study history). `:113-123` holds `accountMenuItems`. No `navGroups.test.ts` exists yet.
- `Header.tsx` (751 lines), resolving the contracts' "Unverified" drawer item:
  - `DesktopMenu` type at `:29`; `isGroupActive` at `:51-55` (prefix match, reused for Work); `useMenuFocus` at `:64-148`; `NavMenu` at `:166-268`; `AccountMenu` at `:280-400`.
  - State at `:406-411`. The **route-change close effect is at `:416-420`** and the drawer focus-trap/scroll-lock effect at `:422-469`.
  - Desktop `<nav aria-label="Primary" className="hidden md:flex …">` at `:502-530`; desktop auth area `hidden md:flex` at `:533-558`; hamburger `md:hidden` at `:561-573`.
  - Drawer at `:577-748`: overlay `:579-587`; dialog `id="mobile-nav"`, `aria-label="Primary navigation"` at `:588-599`; "Menu" title row at `:601-611`; drawer `<nav aria-label="Primary">` at `:612-660`; Account section at `:661-730`; signed-out Login/Get Started at `:731-744`.
- `Layout.tsx:9-25` has the skip link → `#main-content`, then `<Header />` and `<main>` (with `EmailVerificationBanner`). `App.tsx:28-92` wraps `<Routes>` in `Layout`, so `Header` never remounts on navigation.
- Elapsed derivation, resolving the contracts' "Unverified" helper item: **no helper exists outside `useFocusSession`.** The anchor lives in `useFocusSession.ts:33-36,42-49`, the derivation at `:76-78`, and the 1 s display tick at `:69-74`. The formatter is a private `formatElapsed` in `FocusTimer.tsx:29-38` (mm:ss, h:mm:ss past one hour).
- `getCurrentStudySession()` (`studySessionApi.ts:74-77`) returns `StudySession | null` (`types.ts:2-17`, `status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'`).
- Logout cache reset, resolving the contracts' third "Unverified" item: **none exists.** `store.ts:11-49` registers five RTK Query slices plus `api` and has no root-reducer reset. `AuthContext.logout` (`:259-269`) clears the token and dispatches `clearUser` only. See § Findings for the planner.
- `FocusPage.tsx:75-90` is the empty state ("Go to assignments", auto-focus via `emptyActionRef` at `:38-51`). `CoursesPage.tsx:98-110` is the header (`h1` "My Courses" + Add Course). `StudyHistoryPage.tsx:127` is the `h1`. There is no in-app link to `/semesters` other than the nav (grep), and `/focus/history` is linked from `FocusTimer.tsx:206` and `AssignmentsPage.tsx:308`.

### Relevant files

| File | Change |
|---|---|
| `apps/web/src/widgets/header/ui/navGroups.ts` | New contract and icons (AC1). |
| `apps/web/src/widgets/header/ui/navGroups.test.ts` | **New.** Exact sets (AC1). |
| `apps/web/src/widgets/header/ui/Header.tsx` | `DesktopMenu = 'work' \| 'account'`; mounts `<SessionIndicator />` first in `<header>`; D-D5 route-change rule. |
| `apps/web/src/widgets/header/ui/Header.test.tsx` | Re-targeted EP11 cases, strip order, BL-14-07 cases. |
| `apps/web/src/widgets/header/ui/Header.postLogin.test.tsx` | **New.** BL-14-07 reproduction through the real login path. |
| `apps/web/src/widgets/session-indicator/model/CurrentSessionProvider.tsx` | **New.** The read (D-D1, D-D8). |
| `apps/web/src/widgets/session-indicator/model/useCurrentSession.ts` | **New.** Context consumer with a no-op default. |
| `apps/web/src/widgets/session-indicator/model/CurrentSessionProvider.test.tsx` | **New.** |
| `apps/web/src/widgets/session-indicator/ui/SessionIndicator.tsx` | **New.** Strip + live span. |
| `apps/web/src/widgets/session-indicator/ui/SessionIndicator.test.tsx` | **New.** |
| `apps/web/src/widgets/layout/ui/Layout.tsx` | Wraps its children in `<CurrentSessionProvider>`. |
| `apps/web/src/widgets/layout/ui/Layout.test.tsx` | Still passes (signed out → no read). |
| `apps/web/src/entities/study-session/model/elapsed.ts` | **New.** `ElapsedAnchor`, `anchorFor`, `elapsedSecondsAt`, `formatElapsed`. |
| `apps/web/src/entities/study-session/model/elapsed.test.ts` | **New.** |
| `apps/web/src/features/focus-session/model/useFocusSession.ts` | Uses `anchorFor`/`elapsedSecondsAt`; behaviour identical. |
| `apps/web/src/features/focus-session/ui/FocusTimer.tsx` | Imports `formatElapsed` from the entity; the private copy is deleted. |
| `apps/web/src/pages/focus/ui/FocusPage.tsx` (+ `FocusPage.test.tsx`) | Empty-state header, copy, Go to Today (AC4). |
| `apps/web/src/pages/courses/ui/CoursesPage.tsx` (+ `CoursesPage.test.tsx`) | Semesters link (AC4). |
| `apps/web/src/app/App.test.tsx` | Mock `getCurrentStudySession` (resolves `null`) because `App` now mounts the provider while signed in. |
| `apps/web/e2e/adaptive-scheduling.spec.ts` | `:414-430` minimal nav re-point (test-only). |

### Design

**Elapsed helper** (`entities/study-session/model/elapsed.ts`):

```ts
export interface ElapsedAnchor { elapsedSeconds: number; responseInstant: number }
export function anchorFor(session: StudySession, responseInstant: number): ElapsedAnchor;
export function elapsedSecondsAt(anchor: ElapsedAnchor, nowMs: number): number;
// = anchor.elapsedSeconds + Math.max(0, Math.floor((nowMs - anchor.responseInstant) / 1000))
export function formatElapsed(seconds: number): string; // moved verbatim from FocusTimer.tsx:29-38
```

- `useFocusSession` keeps its state shape and replaces the inline arithmetic at `:76-78`.
- The indicator evaluates PAUSED at `nowMs = anchor.responseInstant`, which is static, and ACTIVE at `Date.now()` on its own 1 s display interval. That interval runs only while ACTIVE and visible, and it is cleared on unmount, on PAUSED, or when hidden. It is a render tick, **not** a read: D16-11's "never on an interval" applies to the network call.

**`CurrentSessionProvider`** (D-D1 plain hook over the entity client, D-D8 single mount):
- Inputs: `useAuth()` (`isAuthenticated`, `user?.id`), `useLocation().pathname`.
- State: `{ session: StudySession | null, anchor: ElapsedAnchor | null, ownerId: string | null, settled: boolean }`.
- **Reads:** on mount when signed in, on every `pathname` change (including `/focus`, which EP16E needs), on `document.visibilitychange` when `visibilityState === 'visible'`, and on `refresh()`. No `setInterval` anywhere in the provider.
- **Generation guard:** a `useRef` counter is bumped per read and on every change of `user?.id`. A response applies only if its generation is current, the provider is mounted, and the user id is unchanged.
- **On `user?.id` change** (logout, session expiry, switch): reset synchronously in the same effect to `session: null`, `settled: false`, `ownerId: null`, then read if signed in.
- **Failure:** `session: null`, `settled: true`, silent (D-D4).
- **Context value:** `{ session, anchor, ownerId, settled, refresh }`. `useCurrentSession()` returns `{ session: null, anchor: null, ownerId: null, settled: false, refresh: () => {} }` outside a provider, so `FocusPage.test` and `Header.test` need no provider.
- Do **not** key the provider or `Header` on the user: that would remount the page tree on login and re-create the BL-14-07 symptom.
- Expected request volume: one `GET /study-sessions/current` per pathname change while signed in. On entering `/focus` there are two (provider + `useFocusSession.load`). That is accepted, with no polling.

**`SessionIndicator`:**
- Renders only when `isAuthenticated`.
- `visible = pathname !== '/focus' && ownerId === user.id && (session?.status === 'ACTIVE' || session?.status === 'PAUSED')`. Hidden on `/focus` exactly, shown on `/focus/history` (D-D2).
- Always renders the live span. The live text is computed from `visible` + status only, never from the time.

**Header mount:**
- `<header>`: `<SessionIndicator />` comes first, then the existing `max-w-7xl` row.
- The desktop nav loop is unchanged. `section.id as DesktopMenu` now only ever yields `'work'`.

**API need:** none (D16-13). Every field used already exists in the `StudySession` projection.

### BL-14-07: root-cause hypothesis and reproduction

**Hypothesis (grounded in code, not yet reproduced).** Signing in triggers two `replace` navigations about one network round-trip apart. The second one runs `Header`'s pathname effect, which closes any menu the student opened in between.

1. `LoginPage.onSubmit` → `login()` → the thunk dispatches `setLoading(true)` (`authSlice.thunks.ts:17`). `PublicRoute` (`PublicRoute.tsx:7-13`) swaps the outlet for its spinner, so `LoginPage` unmounts mid-submit while its `onSubmit` closure keeps running.
2. `setUser` + `setLoading(false)` → `PublicRoute` renders `<Navigate to="/today" replace />` (`:16-18`). This is **pathname change #1**: `/login` → `/today`. `Header` now renders `AccountMenu`, and the student (or Playwright) can open it.
3. The orphaned `onSubmit` continues: `await dispatch(fetchOnboardingState())` (`LoginPage.tsx:83`, one HTTP round-trip, slower under load). Then `navigate(completed ? from : '/onboarding', { replace: true })` (`:88`). For a student who has not finished onboarding (every per-test e2e user, EP14C D-C2), or whose `from` is not `/today`, this is **pathname change #2**.
4. `Header.tsx:416-420` (`setOpenMenu(null)` on `location.pathname`) closes the menu. The timing matches F-EP14C-02 (menu clicked about 270 ms after Sign In; menu gone within about 1 s).

**Ruled out by reading:** the F-EP14C-02 candidates (onboarding step 1's mount-time `refreshProfile`, the unverified-email `focus` refresh at `AuthContext.tsx:151-157`). They only replace the `user` object, and `openMenu` lives in `Header` state, which a re-render keeps. Nothing keys `Header`/`AccountMenu`, and `Layout` is outside `<Routes>`.

**Reproduction approach:**
1. **Unit:** in `Header.test.tsx`, render `Header` beside a test-only `<RedirectProbe>` that calls `navigate('/onboarding', { replace: true })` on a button click. Open the account menu, click the probe, and assert that `role="menu"` "Account" is still present. On today's code this fails.
2. **Integration:** in `Header.postLogin.test.tsx`, mock `authService.login` to resolve. Mock `fetchOnboardingState`'s API (`features/onboarding/api/onboardingApi.ts`) with a deferred promise.
   - Submit the login form and wait for `/today`.
   - Open the account menu, then resolve onboarding with `completed: false`.
   - Assert the URL is `/onboarding` **and** the menu is still open.
   - Record the pre-fix failure in `implementation.md`.
3. **Optional e2e confirmation:** the EP14C `auth-journeys.spec.ts:71-100` retry helper should no longer need its re-open loop. Do not remove it here; EP16F owns that.

**Fix (D-D5 (a)), in `Header.tsx`:**
- Read `useNavigationType()`. The pathname effect closes the drawer and desktop menus only when the navigation type is `PUSH` or `POP`, so a programmatic `REPLACE` redirect leaves them as they are.
- A second effect closes both when `user?.id` changes. This covers logout, session expiry (`navigate('/login', { replace: true })` at `AuthContext.tsx:177`) and the stale-`openMenu`-after-relogin edge.
- Every menu item and drawer link already closes its surface on click (`Header.tsx:255,371,387,621,649,691,708,721`), so user-initiated navigation behaves as before.
- If reproduction disproves the hypothesis, follow AC5's fallback.

**Residual (register as a finding, do not fix):** the same double navigation makes a new student see Today for one round-trip before `/onboarding`. That is a visible flash, and it needs a single post-login navigation (`PublicRoute`/`LoginPage`), which is outside the shell. It becomes `F-EP16D-0n` → planner backlog.

### Findings for the planner (not in this story's scope)

- **Refiner finding (no ID; planner assigns one) — ▲ security (DoD-3): RTK Query caches survive logout.**
  - `assignmentsApi`, `calendarApi`, `todayPlanApi`, `planHealthApi` and `momentumApi` each set `keepUnusedDataFor: 60`. `store.ts` has no reset, and `logout` dispatches only `clearUser`.
  - `TodayPage` calls `useTodayPlanQuery()` (`TodayPage.tsx:59`) without `refetchOnMountOrArgChange`, and `todayPlan` takes no arguments.
  - So if student B signs in on the same tab within 60 s of student A signing out, Today is likely served A's cached plan (and calendar events) without a request. Not reproduced by the refiner.
  - The contracts' and epic's "existing RTK reset" claim (epic § invariants, contracts § Session indicator, README DoD-3 row) is therefore unfounded.
  - The indicator is unaffected (D-D1/D-D8).
  - Recommended: a small dedicated child or hotfix that dispatches `<api>.util.resetApiState()` for every slice wherever the user becomes `null` or changes id, with a test per slice. Run it before EP16D. Planner and user to rule.
- **Known windows row (contracts, planner-owned):** "after EP16D, before EP16F — `adaptive-scheduling.spec.ts` nav block re-pointed minimally by EP16D".

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-D1 | Indicator data source: (a) plain hook over the entity client, re-read on route change + visibility; (b) RTK Query endpoint with tag invalidation from focus-session mutations | **(a)** — D16-11; no polling, no new cache to keep coherent | Ratified (user, 2026-11-17 — "ratify all") |
| D-D2 | Indicator on `/focus`: (a) hidden (the page is the timer); (b) shown everywhere | **(a)** — two timers on one screen is noise | Ratified (user, 2026-11-17 — "ratify all") |
| D-D3 | Work group icon: (a) `Briefcase`; (b) `ClipboardList`; refiner picks | **(a)** | Ratified (user, 2026-11-17 — "ratify all") |
| D-D4 | Failed `current` read: (a) silent (nothing renders); (b) a muted "couldn't check your session" line | **(a)** — the header must never carry an error surface | Ratified (user, 2026-11-17 — "ratify all") |
| D-D5 | BL-14-07 fix (refines EP10C D10-11 route-change close): (a) `Header` closes menus and the drawer on `PUSH`/`POP` pathname changes only (not `REPLACE` redirects) and on any `user.id` change; (b) remove the double post-login navigation at its source (`PublicRoute` + `LoginPage` single navigation); (c) both | **(a)** — fixes the symptom in the file AC5 names, keeps auth routing (and its `LoginPage`/`ProtectedRoute`/auth e2e tests) untouched; every header link already closes its surface on click, so user navigation is unchanged. (b) is the better long-term fix for the Today-before-onboarding flash and is returned as a finding | Ratified (user, 2026-11-18 — "ratify remaining") |
| D-D6 | Indicator placement: (a) one slim strip at the top of `<header>`, every width; (b) inline chip before the account menu on desktop plus a strip on mobile (needs a media-query hook in EP16D and two layouts); (c) inline at every width with a compact mobile form | **(a)** — at 360 px the logo row has about 90 px free, too little for status + "Back to session" (rules out c); (a) keeps one DOM instance, one live region and a tab order (strip → logo → … → account) that matches the visual order at every width and satisfies AC2; no hook needed before EP16E | Ratified (user, 2026-11-18 — "ratify remaining") |
| D-D7 | Study history link on `/focus`: (a) in a header row of the empty state only; the running/paused timer stays clean and the celebration keeps its "View study history" link; (b) a header row in every Focus state, including the running timer | **(a)** — D16-12 distraction-free timer; the two moments a student wants history (no session, just finished) both have the link | Ratified (user, 2026-11-18 — "ratify remaining") |
| D-D8 | Where the read lives (refines the mounting of D-D1, not its choice): (a) one `CurrentSessionProvider` in `Layout`, consumed by the header strip (and by EP16E's tab bar and Focus-page refresh); (b) the hook called inside `Header` only, with EP16E adding a second reader | **(a)** — one request per route change for the whole shell; EP16E's hide-on-`/focus` rule and post-finish refresh need the same state | Ratified (user, 2026-11-18 — "ratify remaining") |

## Definition of Done

1, 5, 6, 7, 8 (TR-E16-01/04/05). 3: verified for the indicator (AC3 tests). The wider RTK-cache finding goes to the planner. 2, 4, 9 N/A. 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** four navigation entries, a running session that follows the student to every page, every retired entry replaced by a link where it is needed, and the post-login menu race closed.
- **Size:** about one window, as planned. Thirteen source/test files plus one e2e edit. If the window runs short, AC5 (BL-14-07) is the separable tail. A split would be EP16D (AC1–AC4) plus EP16D2 (AC5, owning `Header.postLogin.test.tsx`). No split is proposed now.
- **Actual at closeout:** one session (one window), 2026-11-18. Nineteen source/test files plus the one e2e edit (the planned thirteen, plus `navGroups.test.ts` already counted, `App.test.tsx` mock, and the CoursesPage/FocusPage test updates). No split needed; AC5 completed in the same window. Web suite 1396/0 (+40); e2e 61/0 + 1 planned skip.
- **Files:** see § Relevant files.
- **Start context:** this story; contracts.md § Navigation contract, § Session indicator, § Known windows; `navGroups.ts`, `Header.tsx` (end to end), `Layout.tsx`, `useFocusSession.ts`, `FocusTimer.tsx:29-38`, `LoginPage.tsx:72-94`, `PublicRoute.tsx`.
- **Verification:**
  - In `apps/web`: `npx tsc --noEmit -p tsconfig.json`, `npx eslint src --max-warnings=0`, `npx vitest run`, all green.
  - Full Playwright suite once (external-stack mode, EP16A precedent).
  - Manual: start a session, go to Calendar, and the strip shows and ticks. Pause on `/focus`, go to Plan, and it shows "Paused". Finish, and it is gone. Log out and in as another student, and it is gone. Sign in as a new student and open the account menu at once; it stays open through the onboarding redirect.
- **Dependencies / exclusions:** EP16A, EP16B (helper), EP16C (sequence). Tab bar → EP16E; e2e rewrite → EP16F; RTK reset → planner (refiner finding).
