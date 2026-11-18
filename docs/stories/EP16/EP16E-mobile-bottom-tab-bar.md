# EP16E — Mobile Bottom Tab Bar

**Story ID:** EP16E
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend
**Status:** Needs refinement — tab bar layout, labels, icon sizes and the Focus-page behaviour are the refiner's (D16-15). ▲ D-E1 `Proposed`. Implementation after EP16D.
**Dependencies:** EP16D implemented (the navigation contract the bar renders). Epic decisions D16-7 (ratified a), D16-12.

## Plan at a glance

- **What this changes:** on narrow viewports (below `md`) a fixed bottom tab bar renders the primary navigation with icon + label and `aria-current`; the drawer keeps only the Account section; the layout reserves space for the bar and the device safe area; the bar hides on `/focus` while a session runs.
- **Why it improves it:** the main destinations stay visible and one tap away with the thumb, instead of behind a menu icon at the top of the screen — what is out of sight is forgotten (product, AC-E16-11); the drawer shrinks to account actions only (code).
- **Decisions needing you:** ▲ D-E1 — how the Work group appears in the bar (recommended: five flat tabs on mobile).
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts.

## Summary

Render EP16D's `navGroups` contract as a bottom bar on phones. The only real
question is the Work group: a tab that opens a menu defeats the point, so
the recommendation flattens it on mobile only.

## Scope

**In:** `widgets/tab-bar/ui/TabBar.tsx` (+ test); `Layout.tsx` bottom padding + `env(safe-area-inset-bottom)`; `Header.tsx` drawer reduced to Account on narrow viewports (the hamburger stays for it); hide-on-`/focus`-while-running rule; reduced motion; manual a11y pass.
**Out:** any change to desktop navigation; new routes; the header indicator (EP16D).

## Source requirement references

AC-E16-11 (primary); AC-E16-12. TR-E16-01, TR-E16-04, TR-E16-05. DoD-1, 5, 6, 7, 8.

## Acceptance criteria

1. Below `md`, a `<nav aria-label="Primary">` fixed to the bottom edge renders the entries of ▲ D-E1's ruling with icon + visible text label, `aria-current="page"` on the active entry (Work's children count as active for their parent if D-E1 = (a)), targets ≥ 44 × 44 px, visible focus rings; at `md` and above it does not render (not merely hidden), and the header's desktop `<nav aria-label="Primary">` is the only primary landmark — exactly one primary navigation landmark exists at any viewport.
2. `Layout` adds bottom padding equal to the bar's height plus `env(safe-area-inset-bottom)` below `md` so no page content or the Add assignment control is covered; the skip link still targets `#main-content`.
3. Below `md` the drawer contains only the Account section (Profile, Verify email when unverified, Logout); the hamburger button and the EP10C drawer mechanics (focus trap, Escape, route-change close, scroll lock) are unchanged; drawer tests assert the reduced set.
4. On `/focus` while a session is `ACTIVE` or `PAUSED` the bar does not render (distraction-free; D16-12); with no session it renders as elsewhere; any bar animation honours `prefers-reduced-motion`.
5. Copy audit passes over the bar; the manual pass (TR-E16-04) records screen-reader reading of the landmark and current entry at 360 × 640, and that the Today hero's primary control remains visible above the bar.

## Tests (TR-E16-01, TR-E16-04, TR-E16-05)

- `TabBar.test.tsx`: entries per D-E1; `aria-current`; absent at `md` (matchMedia stub); hidden on `/focus` with a running session, shown without; labels present as text.
- `Layout.test.tsx`: padding class present below `md`; skip link intact.
- Header drawer tests: Account-only set below `md`.
- Manual (TR-E16-04): VoiceOver/TalkBack landmark count and current-entry reading; 360 × 640 hero visibility (also V-16-3 in EP16F).

## Technical notes

- **Inspected:** `Header.tsx` desktop nav `hidden md:flex` (`:497`) — CSS-hidden, so a second `<nav aria-label="Primary">` would duplicate the landmark for assistive tech unless the mobile bar is rendered conditionally (matchMedia) or the header nav is removed from the tree below `md`; `Layout.tsx` (`<main className="flex-grow">`); `navGroups.ts` `NavSection` link-xor-group invariant.
- **Proposed:** `useMediaQuery('(min-width: 768px)')` in `shared/lib` (new, SSR-safe default) used by both the header nav and the bar so exactly one renders; the bar flattens `authenticatedNavGroups` by `flatMap(s => s.items ?? [s])` under D-E1 (b), or maps groups to their first item under (a).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-E1 | Work group in the bar: (a) one **Work** tab → `/assignments`, Courses reached via a header link on the Assignments page and the drawer; (b) five flat tabs — Today, Plan, Calendar, Assignments, Courses (the same contract flattened on mobile; desktop keeps the dropdown); (c) a Work tab that opens a two-item sheet | **(b)** — one tap, one outcome, no hidden state; five tabs fit 360 px with short labels; (c) re-creates the menu the bar exists to remove | Proposed |
| D-E2 | Single primary landmark: (a) render header nav and bar conditionally via a shared media-query hook; (b) label the bar "Primary (mobile)" | **(a)** — one landmark named Primary at any width | Proposed |
| D-E3 | Hide on `/focus`: (a) only while a session is active/paused; (b) always on `/focus` | **(a)** — the empty Focus page is a normal page | Proposed |

## Definition of Done

1, 5 (N/A beyond render/no-render), 6, 7, 8 (TR-E16-01/04/05). 2, 3, 4, 9 N/A. 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** on a phone, the main destinations are always visible and one thumb-tap away.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/widgets/tab-bar/ui/TabBar.tsx` (new, + test), `apps/web/src/shared/lib/useMediaQuery.ts` (new, + test), `apps/web/src/widgets/layout/ui/Layout.tsx` (+ test), `apps/web/src/widgets/header/ui/Header.tsx` (+ drawer tests), possibly `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (Courses link, only under D-E1 (a)).
- **Start context:** this story; contracts.md § Navigation contract; `Header.tsx` drawer section; `Layout.tsx`.
- **Verification:** web typecheck/lint/test green; manual at 360 × 640 and 768 px: one primary landmark, bar present/absent, hero visible, bar gone during a running session.
- **Dependencies / exclusions:** EP16D; ▲ D-E1 ruled. E2E → EP16F.
