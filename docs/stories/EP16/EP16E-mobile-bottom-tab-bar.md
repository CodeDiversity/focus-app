# EP16E — Mobile Bottom Tab Bar

**Story ID:** EP16E
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend
**Status:** Implemented — awaiting parent review (2026-11-18). Record: [implementation.md](./artifacts/EP16E/implementation.md). All ACs done; one recorded deviation (F-EP16E-01: the signed-in menu button is md-gated so "Open account menu" stays unique in the DOM).
**Refined:** 2026-11-18
**Dependencies:** EP16D must be implemented first. EP16E builds on four things it adds: the navigation contract, `CurrentSessionProvider` / `useCurrentSession` (D-D8), the header session strip (D-D6) and the drawer route-change rule (D-D5). EP16B provides `expectNoForbiddenWords`. Epic decisions: D16-7 (ratified a), D16-12.

## Plan at a glance

- **What this changes:**
  - Below `md` (768 px), a signed-in student gets a fixed bottom tab bar. It has five flat tabs: **Today · Plan · Calendar · Assignments · Courses**. Each tab has an icon and a text label, the current one is marked, and every tab is 44 px or taller.
  - The header's desktop nav and account trigger render only at `md` and up. That leaves exactly one landmark named "Primary" at any width.
  - The drawer keeps only the Account section. The menu button is now labelled "Open account menu".
  - The page reserves room for the bar plus the device safe area.
  - The bar is not rendered on `/focus` while a session is running or paused. It comes back as soon as the session is finished.
- **Why it improves it:** on a phone, the main destinations stay visible and one thumb-tap away instead of behind a menu icon. What is out of sight is forgotten (product, AC-E16-11). The drawer shrinks to account actions only. One shared media-query hook replaces CSS-only hiding, so tests and assistive tech see the same single navigation (code).
- **Decisions needing you:** none ▲. D-E1…D-E3 are ratified. The new D-E4…D-E7 are `Proposed` layout/technical rows and ratify by default when implementation starts.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts.

## Summary

Render EP16D's `navGroups` contract as a bottom bar on phones, flattened to
five tabs (▲ D-E1 (b)). The header keeps the session strip (EP16D) at every
width, so the bar never carries a second indicator.

## Scope

**In:**
- `widgets/tab-bar/ui/TabBar.tsx` and `widgets/tab-bar/model/useTabBarVisible.ts`, each with a test.
- `shared/lib/useMediaQuery.ts` (+ test).
- `Layout.tsx`: mounts the bar; bottom padding including `env(safe-area-inset-bottom)`.
- `Header.tsx`:
  - desktop nav and desktop auth area render only at `md`+ (D-E2);
  - the signed-in drawer is reduced to Account, with relabelled trigger and title (D-E5).
- `navGroups.ts`: `mobileTabItems` (flattened contract).
- `FocusPage.tsx`: refreshes the shared session state after Finish (AC4).
- Hide-on-`/focus` rule; reduced motion; manual a11y pass.

**Out (implementer must not drift into these):**
- Any change to desktop navigation.
- New routes.
- The header session strip, which belongs to EP16D and is unchanged here.
- A tab bar for signed-out visitors (D-E4).
- `viewport-fit=cover` / `index.html` (D-E6).
- Closing the drawer when the viewport crosses `md` (pre-existing).
- Hiding the bar while the on-screen keyboard is open.
- Migrating `CalendarPage`'s local `useNarrowViewport` (`CalendarPage.tsx:162-171`) to the new hook.
- An `AssignmentsPage` Courses link (only under D-E1 (a), not ruled).
- Rewriting e2e journeys (EP16F).

## Source requirement references

AC-E16-11 (primary); AC-E16-12. TR-E16-01, TR-E16-04, TR-E16-05. DoD-1, 5, 6, 7, 8.

## Acceptance criteria

1. Below `md`, a `<nav aria-label="Primary">` fixed to the bottom edge renders the entries of ▲ D-E1's ruling with icon + visible text label, `aria-current="page"` on the active entry (Work's children count as active for their parent if D-E1 = (a)), targets ≥ 44 × 44 px, visible focus rings; at `md` and above it does not render (not merely hidden), and the header's desktop `<nav aria-label="Primary">` is the only primary landmark — exactly one primary navigation landmark exists at any viewport.
2. `Layout` adds bottom padding equal to the bar's height plus `env(safe-area-inset-bottom)` below `md` so no page content or the Add assignment control is covered; the skip link still targets `#main-content`.
3. Below `md` the drawer contains only the Account section (Profile, Verify email when unverified, Logout); the hamburger button and the EP10C drawer mechanics (focus trap, Escape, route-change close, scroll lock) are unchanged; drawer tests assert the reduced set.
4. On `/focus` while a session is `ACTIVE` or `PAUSED` the bar does not render (distraction-free; D16-12); with no session it renders as elsewhere; any bar animation honours `prefers-reduced-motion`.
5. Copy audit passes over the bar; the manual pass (TR-E16-04) records screen-reader reading of the landmark and current entry at 360 × 640, and that the Today hero's primary control remains visible above the bar.

**Refiner notes on AC text.** The AC text above is kept verbatim. The planner owns AC wording; these notes flag interpretations and change no AC.

- **AC1:** D-E1 is ruled (b), five flat tabs, so the "(a)" clause does not apply. "At any viewport" is read for a **signed-in** student (D-E4).
  - Signed out, below `md`, there is no bar. The drawer's existing `<nav aria-label="Primary">` (Home) is the only one, and only while the drawer is open. That matches today's assistive-tech exposure: the desktop nav is `display:none`.
  - The current CSS-only hide is not a duplicate for assistive tech, because `display:none` leaves the accessibility tree. The real gaps are jsdom/test parity and the drawer's second "Primary" nav. D-E2's conditional render closes both.
- **AC3:** "Route-change close unchanged" means unchanged from EP16D: close on `PUSH`/`POP` and on a change of `user.id`, not on `REPLACE` redirects (EP16D D-D5). "Hamburger unchanged" covers the button, its `Menu` icon and its mechanics. Only its accessible name and the drawer title change (D-E5).
- **AC4:** "With no session it renders" includes the moment right after **Finish** on `/focus`. That needs an explicit `refresh()` of the shared state from `FocusPage`, because no route change happens.

## Tests (TR-E16-01, TR-E16-04, TR-E16-05), named per AC

Vitest + Testing Library. Stub `window.matchMedia` per test with the pattern in `CalendarPage.test.tsx:52-70`. Unmount before restoring the stub (EP15F flake note at `:198-199`).

**AC1:**
- `apps/web/src/widgets/tab-bar/ui/TabBar.test.tsx` (new):
  - `renders five tabs Today, Plan, Calendar, Assignments, Courses in contract order with an icon and a visible text label`
  - `derives its tabs from mobileTabItems (no drift from authenticatedNavGroups)`
  - `marks the active tab with aria-current="page" on /today, /plan, /calendar, /assignments, /courses`
  - `keeps the parent tab current on nested routes (/courses/abc, /plan/proposal)`
  - `marks no tab current on /profile, /semesters, /focus/history`
  - `each tab has a 44px minimum target and focus-visible ring classes`
  - `active state is not colour-only (weight and top indicator classes present)`
  - `lists tabs as a list of five links inside the Primary navigation`
- `apps/web/src/widgets/layout/ui/Layout.test.tsx`:
  - `exactly one Primary navigation landmark at 360px when signed in` (the bar)
  - `exactly one Primary navigation landmark at 1024px when signed in` (the header)
  - `no tab bar in the DOM at md and above`
  - `no tab bar when signed out below md`
- `apps/web/src/shared/lib/useMediaQuery.test.ts` (new):
  - `returns the fallback when matchMedia is unavailable`
  - `returns the current match and updates on change`
  - `unsubscribes on unmount`
- `Header.test.tsx`:
  - `renders the desktop nav and account trigger only at md and above`
  - `existing desktop cases still pass with matchMedia absent (fallback = desktop)`

**AC2:**
- `Layout.test.tsx`:
  - `pads main by the bar height plus the safe-area inset when the bar shows`
  - `does not pad main at md and above or when signed out`
  - `renders a skip-to-main-content link pointing at #main-content` (kept)
  - `renders header, nav with primary label, and main landmark` (kept, desktop fallback)

**AC3:**
- `Header.test.tsx`, drawer:
  - `below md the signed-in drawer contains only the Account section (Profile, Verify email when unverified, Logout)` (replaces EP16D's `renders Today, Plan, Calendar, the Work section and the Account section for an authenticated user`)
  - `the signed-in drawer has no Primary navigation and is labelled Account`
  - `the menu button reads Open account menu / Close account menu when signed in and Open menu / Close menu when signed out`
  - `renders Home and auth buttons with no grouped or Account sections when unauthenticated` (kept)
  - `opens and closes the drawer via the hamburger` (kept)
  - `closes the drawer on Escape and restores focus to the hamburger` (kept)
  - `locks body scroll while open and restores it on close` (kept)
  - `traps focus inside the drawer after the grouped sections were added` (kept; now over the Account items)
  - `shows Verify email only for an unverified user` (kept)
  - `shows the identity row with avatar initials and name` (kept)
  - `applies 44px rows and 20px aria-hidden icons in the drawer` (kept)

**AC4:**
- `apps/web/src/widgets/tab-bar/model/useTabBarVisible.test.ts` (new):
  - `hidden at md and above`
  - `hidden when signed out`
  - `hidden on /focus while ACTIVE`
  - `hidden on /focus while PAUSED`
  - `hidden on /focus until the first read for the route settles`
  - `shown on /focus when the read returns null`
  - `shown on /focus when the read fails`
  - `shown on /focus/history and other pages while a session runs`
- `TabBar.test.tsx`: `has no entrance or exit animation and no transition-transform without a motion-reduce companion`
- `FocusPage.test.tsx`: `finishing a session refreshes the shared current-session state`

**AC5:**
- `TabBar.test.tsx`: `passes the copy audit` (`expectNoForbiddenWords`)
- **Manual (TR-E16-04, recorded in `implementation.md`):**
  - VoiceOver (iOS Safari) and TalkBack (Chrome Android) at 360 × 640: one "Primary" navigation landmark; the current tab is read as "current page"; the five labels are read.
  - Today at 360 × 640 with and without a running session, where the header strip adds 44 px: **Start focus** / **Resume focus** is visible above the bar without scrolling. EP16F's V-16-3 automates the no-session case.
  - At 320 × 568, "Assignments" fits its tab without truncation or overlap. If it does not, stop and record a finding; the copy is user-visible.
  - The last row on Assignments and Courses scrolls fully above the bar.
  - At 768 px: no bar; the header nav is shown.
  - On `/focus` with a running session: no bar. After Finish: the bar appears.
- **E2E risk check:** run the existing narrow-viewport journeys once. They are `assignments-list.spec.ts:212` (375 × 667), `calendar.spec.ts:175` (375 × 667) and `catch-up.spec.ts:683` (320 × 568, as re-pointed by EP16C). A fixed bar can intercept clicks near the bottom edge. Fix with a test-only scroll or record it for EP16F; do not change the product to suit a test.

## UI/UX

### Element decisions

| Element | Decision | Reason |
|---|---|---|
| Tab data | `navGroups.ts` gains `export const mobileTabItems: NavItem[] = authenticatedNavGroups.flatMap((s) => s.items ?? [{ id: s.id, label: s.label, icon: s.icon, to: s.to as string }])`. The result is Today, Plan, Calendar, Assignments, Courses. | ▲ D-E1 (b). One source, so desktop and phone cannot drift. |
| Tab bar | New `TabBar` (`widgets/tab-bar/ui/TabBar.tsx`): `<nav aria-label="Primary">` > `<ul className="grid grid-cols-5">` > `<li>` > `NavLink` **without `end`** (D-E7). Icon `h-5 w-5` `aria-hidden`, then the label as text. | A list gives the screen-reader count ("list, 5 items"). Prefix matching keeps the section visible on nested routes. |
| Visibility | `useTabBarVisible()` (`widgets/tab-bar/model/useTabBarVisible.ts`) returns `isAuthenticated && !isMdUp && !(pathname === '/focus' && (!settled \|\| status ∈ {ACTIVE, PAUSED}))`. It uses `useAuth`, `useMediaQuery`, `useLocation` and EP16D's `useCurrentSession()`. | `Layout` needs the same boolean for its padding: one rule, one place. |
| Media query | New `useMediaQuery(query: string, fallback: boolean): boolean` (`shared/lib/useMediaQuery.ts`). It is `useSyncExternalStore` over `window.matchMedia` (the `CalendarPage.tsx:162-171` pattern) and returns `fallback` when `matchMedia` is not a function. Export `MD_UP_QUERY = '(min-width: 768px)'` (Tailwind `md`). | D-E2 (a). Synchronous on first render, so there is no flash of both navs. The fallback keeps the existing jsdom tests on the desktop layout. |
| Header gating | `Header` calls `useMediaQuery(MD_UP_QUERY, true)` and renders the desktop `<nav>` (`Header.tsx:502-530`) and the desktop auth area (`:533-558`) only when it returns true. The hamburger stays CSS `md:hidden` and is not gated, so the drawer tests keep working. | One Primary landmark. The desktop account trigger's name "Open account menu" never coexists with the relabelled mobile trigger. |
| Drawer (signed in) | Remove the drawer `<nav>` (`:612-660`) for signed-in students. The title row's "Menu" (`:602`) becomes "Account" and gets `id="mobile-nav-title"`. The dialog uses `aria-labelledby="mobile-nav-title"` instead of `aria-label="Primary navigation"`. The Account section's own `h2` "Account" (`:666-671`) is dropped, so the heading is not repeated; the section's `aria-labelledby` points at the title. The identity row, items, separators and Logout are unchanged. | AC3. |
| Drawer (signed out) | Unchanged: "Menu", `<nav aria-label="Primary">` with Home, Login / Get Started. | D-E4. |
| Menu button | Keep the `Menu`/`X` icon. When signed in, `aria-label` is "Open account menu" / "Close account menu". When signed out it stays "Open menu" / "Close menu". | D-E5 (a). AC3 keeps the button; only its name tells the truth now. |
| Mount | `Layout` renders `{tabBarVisible && <TabBar />}` **after** `<main>`. | DOM order is header, main, then the bar. Skip link → main is unchanged. Tab order reaches the bar after page content, the platform convention. |
| Focus page | `FocusPage`'s `onFinished` (`FocusPage.tsx:125-131`) also calls `useCurrentSession().refresh()` (pages → widgets import is allowed). | AC4: the bar returns after Finish without a route change. |

### Layout and visual spec

- **Bar container:** `fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]`.
  - `z-30` sits below menus (`z-40`), the drawer and dialogs (`z-50`, `Dialog.tsx:149`, `Header.tsx:579`), and `BlockSheet`'s mobile bottom sheet inside `Dialog`. So overlays cover the bar, and the drawer backdrop makes it inert.
- **Tab:** `flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[0.6875rem] leading-tight font-medium whitespace-nowrap` plus `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring`.
  - The cell is 56 px tall and 72 px wide at 360 (64 at 320), at least 44 × 44.
  - The ring is inset because the bar touches the screen edge.
- **States:**
  - Inactive: `text-text-muted`.
  - Active: `text-accent font-semibold` plus a 2 px top indicator (`border-t-2 border-accent`; inactive gets `border-t-2 border-transparent`). Weight and shape carry the meaning as well as colour.
  - Hover: `hover:text-text`. Colour transition only: `transition-colors duration-fast`.
- **Bar height:** 56 px (`3.5rem`) plus the inset.
- **Main padding** when the bar shows: `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` added to `<main className="flex-grow">` (`Layout.tsx:19`).
- **What the student sees first (phone):**
  - Header row: logo, menu button. The session strip sits above the row only while a session is open (EP16D).
  - Then the page. Today's hero comes first (EP16A).
  - The bar sits at the thumb's edge. It never shows a second session indicator.

### States

The bar has no loading, empty or error state of its own. It shows the static contract.

- **Hidden:** at `md`+; when signed out; on `/focus` before the first current-session read for that route settles, which avoids a show-then-hide flash; on `/focus` while ACTIVE or PAUSED.
- **Shown:** on `/focus` when the read returns null or COMPLETED, or fails (D-D4: a silent failure counts as no session); after Finish via `refresh()`; on every other route.

### Keyboard and focus

- The tabs are ordinary links (Tab / Shift+Tab, Enter). No roving tabindex: this is a nav list, not an ARIA `tablist`. A `tablist` would promise arrow-key semantics a navigation bar does not have.
- Visible inset focus ring on every tab.
- With the drawer open, its focus trap (`Header.tsx:422-469`) keeps Tab inside, and the backdrop covers the bar.
- Showing or hiding the bar never moves focus.

### Accessibility (WCAG 2.2 AA)

- **Exactly one `navigation` "Primary" when signed in.** Below `md` it is the bar: the header nav is not rendered and the drawer has no nav. At `md`+ it is the header nav, and the bar is not rendered.
- The current entry uses `aria-current="page"` from `NavLink`.
- Every tab has a visible text label; icons are `aria-hidden` (D11-5).
- 44 px targets (D11-9). The active state does not rely on colour alone.
- Reflow at 320 CSS px must hold without truncation. This is a manual check, see AC5.
- 2.4.11 Focus Not Obscured: the main padding keeps focused page controls clear of the bar. Page content that scrolls a focused control under the bar is covered by the padding at the end of the page. Mid-page, the browser's scroll-into-view can leave a control under a fixed bar. Accepted at AA because the bar covers only part of the viewport (2.4.11 requires "not entirely hidden"). Record it in the manual pass.

### Responsive

- **≥ 768 px (`md`):** no bar; header nav plus account menu (unchanged).
- **< 768 px, signed in:** bar plus main padding; header shows logo, the session strip (when present) and the menu button (Account).
- **360 px:** five 72 px tabs at 11 px. "Assignments" (the longest label) fits.
- **320 px:** five 64 px tabs; manual check per AC5.
- **Landscape phones:** the bar stays 56 px. `env()` is 0 unless `viewport-fit=cover` is added (D-E6).

### Reduced motion

The bar has no entrance, exit or slide animation. It mounts and unmounts instantly. The only transition is `transition-colors`, which is not motion. Nothing needs a `motion-reduce:` companion. A test asserts that no `animate-*` or `transition-transform` class exists without one.

### Copy (exact)

- **Tabs:** Today · Plan · Calendar · Assignments · Courses.
- **Landmark:** "Primary".
- **Signed-in menu button:** "Open account menu" / "Close account menu".
- **Drawer title:** "Account".

Every string passes `expectNoForbiddenWords`.

## Technical notes

### Inspected (2026-11-18, HEAD `d35970a`)

- `Header.tsx`: the desktop nav (`hidden md:flex`) is at `:502-530`, the auth area at `:533-558`, the hamburger at `:561-573`. The drawer runs `:577-748`: dialog at `:588-599`, title at `:601-611`, drawer nav at `:612-660`, Account section at `:661-730`, signed-out buttons at `:731-744`. The focus trap and scroll lock are at `:422-469`; route-change close at `:416-420` (as amended by EP16D D-D5).
- `Layout.tsx:9-25`. `Layout.test.tsx:36-48` asserts `navigation` "Primary" signed out with no matchMedia stub, so the desktop fallback keeps it passing.
- There is no shared media-query hook. The only one is the local `useNarrowViewport` in `CalendarPage.tsx:162-171` (`(max-width: 639px)`).
- `window.matchMedia` stubs exist in `App.test.tsx:35-44` (`matches: false` for every query), `CalendarPage.test.tsx`, `CalendarPage.drag.test.tsx` and `main.test.tsx`; `test/setup.ts` has none. **`App.test.tsx`'s stub makes `(min-width: 768px)` false, so App renders the narrow layout there.** Update any nav assertion in that file, or stub `min-width` queries as matching.
- `apps/web/index.html:6` has no `viewport-fit=cover`, so `env(safe-area-inset-bottom)` resolves to 0 in mobile Safari until it is added (D-E6).
- Fixed and bottom elements: `BlockSheet.tsx:85` is a `max-sm:fixed … bottom-0` sheet inside `Dialog` (`z-50`). `react-hot-toast` `<Toaster />` (`main.tsx:12`) uses its default top position. No conflict.
- Narrow e2e journeys: `assignments-list.spec.ts:212`, `calendar.spec.ts:175-222`, `catch-up.spec.ts:683-684`.

### Relevant files

| File | Change |
|---|---|
| `apps/web/src/shared/lib/useMediaQuery.ts` | **New.** Hook + `MD_UP_QUERY`. |
| `apps/web/src/shared/lib/useMediaQuery.test.ts` | **New.** |
| `apps/web/src/widgets/tab-bar/ui/TabBar.tsx` | **New.** |
| `apps/web/src/widgets/tab-bar/ui/TabBar.test.tsx` | **New.** |
| `apps/web/src/widgets/tab-bar/model/useTabBarVisible.ts` | **New.** |
| `apps/web/src/widgets/tab-bar/model/useTabBarVisible.test.ts` | **New.** |
| `apps/web/src/widgets/header/ui/navGroups.ts` | Adds `mobileTabItems`, with a case in `navGroups.test.ts`. |
| `apps/web/src/widgets/header/ui/Header.tsx` | Gates the desktop nav and auth area with `useMediaQuery`; reduces the signed-in drawer; relabels the button and title. |
| `apps/web/src/widgets/header/ui/Header.test.tsx` | Drawer and gating cases. |
| `apps/web/src/widgets/layout/ui/Layout.tsx` | Mounts the bar; adds the padding. |
| `apps/web/src/widgets/layout/ui/Layout.test.tsx` | Landmark, padding and skip-link cases. |
| `apps/web/src/pages/focus/ui/FocusPage.tsx` | `refresh()` after Finish. |
| `apps/web/src/pages/focus/ui/FocusPage.test.tsx` | Finish → refresh case. |
| `apps/web/src/app/App.test.tsx` | matchMedia stub or assertion update only, if needed. |

**API need:** none (D16-13).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-E1 | Work group in the bar: (a) one **Work** tab → `/assignments`, Courses reached via a header link on the Assignments page and the drawer; (b) five flat tabs — Today, Plan, Calendar, Assignments, Courses (the same contract flattened on mobile; desktop keeps the dropdown); (c) a Work tab that opens a two-item sheet | **(b)** — one tap, one outcome, no hidden state; five tabs fit 360 px with short labels; (c) re-creates the menu the bar exists to remove | Ratified (user, 2026-11-17 — "ratify all") |
| D-E2 | Single primary landmark: (a) render header nav and bar conditionally via a shared media-query hook; (b) label the bar "Primary (mobile)" | **(a)** — one landmark named Primary at any width | Ratified (user, 2026-11-17 — "ratify all") |
| D-E3 | Hide on `/focus`: (a) only while a session is active/paused; (b) always on `/focus` | **(a)** — the empty Focus page is a normal page | Ratified (user, 2026-11-17 — "ratify all") |
| D-E4 | Signed-out narrow viewports: (a) no bar; the drawer keeps Home + Login / Get Started unchanged; (b) a one-tab (Home) bar | **(a)** — a single-tab bar is noise; AC-E16-11's "four primary entries" are the signed-in contract | Ratified (user, 2026-11-18 — "ratify remaining") |
| D-E5 | Signed-in menu button and drawer title once the drawer holds only account items (refines EP11B drawer labels): (a) keep the `Menu` icon; name "Open account menu" / "Close account menu"; drawer title "Account"; the dialog is labelled by the title; the desktop account trigger renders only at `md`+ so the name stays unique; (b) replace the icon with the avatar-initials circle used on desktop; (c) keep "Open menu" / "Menu" | **(a)** — AC3 keeps the button; the name now says what it opens. (b) is the more recognisable affordance but changes the button, which AC3 freezes; ask the planner if wanted | Ratified (user, 2026-11-18 — "ratify remaining") |
| D-E6 | Safe-area handling: (a) `env(safe-area-inset-bottom)` in the bar's and main's bottom padding; `index.html` unchanged (inset resolves to 0 until `viewport-fit=cover` exists); (b) also add `viewport-fit=cover` to `index.html:6` | **(a)** — satisfies AC2 and is harmless; (b) extends content under notches in landscape and would need a left/right inset audit of the whole shell (a separate change) | Ratified (user, 2026-11-18 — "ratify remaining") |
| D-E7 | Active-tab matching: (a) prefix match (`NavLink` without `end`) — Courses current on `/courses/:id`, Plan on `/plan/proposal`; (b) exact match like the drawer (`end`) | **(a)** — a bar's job is "where am I"; on a nested page (b) would show no current tab at all | Ratified (user, 2026-11-18 — "ratify remaining") |

## Definition of Done

1, 5 (render / no-render only), 6, 7, 8 (TR-E16-01/04/05). 2, 3, 4, 9 N/A. 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** on a phone, the main destinations are always visible and one thumb-tap away.
- **Size:** about 0.5–1 window, as planned. One outcome, so no split.
- **Actual at closeout:** well under one window, 2026-11-18. Fourteen source/test files (the planned set; `App.test.tsx` needed no change — its narrow stub renders the bar harmlessly). Web suite 1428/0 (+32); full e2e 61/0 + 1 planned skip, narrow journeys included. One deviation recorded (F-EP16E-01).
- **Files:** see § Relevant files.
- **Start context:** this story; EP16D's implementation record (provider API, D-D5 as built); contracts.md § Navigation contract; `Header.tsx:484-750`; `Layout.tsx`; `CalendarPage.tsx:162-171`.
- **Verification:**
  - In `apps/web`, all green: `npx tsc --noEmit -p tsconfig.json`, `npx eslint src --max-warnings=0`, `npx vitest run`.
  - The three narrow e2e journeys once.
  - Manual checks at 320 × 568, 360 × 640 and 768 px: one primary landmark; bar present or absent; hero visible with and without a running session; bar gone during a running session and back after Finish.
- **Dependencies / exclusions:** EP16D (and EP16B's helper). E2E → EP16F.
