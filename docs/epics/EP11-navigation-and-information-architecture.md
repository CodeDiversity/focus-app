# EP11: Navigation & Information Architecture (ADHD-friendly)

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Dependencies:** EP10 (UI Design System & Visual Refresh) — specifically EP10C (app shell refresh: header, layout, navigation, mobile drawer). EP11 evolves the refreshed shell; it does not re-introduce tokens or primitives. No backend dependency.
**Milestone:** M5 (Visual design system & refresh — MVP polish; cross-cutting). EP11 is a polish follow-up within M5 that evolves the EP10C app shell; see decision D11-1.

## Epic Summary

Redesign the app navigation from a flat eight-link list into grouped, icon-supported sections with a user/account menu, to reduce cognitive load and improve scannability for ADHD users, without changing product behavior, routes, or data flows.

## Description

As a student, I want navigation that groups related destinations and keeps personal/account actions out of my way, so I can find what I need quickly and stay focused, without visual noise or unnecessary choices.

The redesign is navigation-only: every existing route, data flow, form, dialog, and business rule stays intact. It evolves the EP10C app shell (header, desktop nav, mobile drawer, account area) into a grouped information architecture with icons + text and an account/user menu. It builds on the token system and primitives delivered by EP10A/EP10B and the shell delivered by EP10C; it introduces no new backend or API work.

## Scope

- Grouped primary navigation on desktop and mobile:
  - Dashboard (single link).
  - Academics (Semesters, Courses, Assignments).
  - Planning (Calendar, Availability, Plan). The `Plan` (`/plan`) entry was added 2026-10-30 by EP06F as a ratified additive edit to EP11's shared nav file (`navGroups.ts`; EP06 parent review PASS 2026-10-30) — expected contract content, not drift; see D11-4 and plan-review PR-001.
- Icons + text for every nav entry (lucide-react, already a dependency).
- Desktop: Academics and Planning render as dropdown menus; Dashboard is a single link; an account/user avatar menu groups Profile, Availability, email-verification (when unverified), and Logout.
- Mobile drawer: grouped sections with headings (Dashboard, Academics, Planning) and an Account section; account actions live in the Account section.
- Keyboard operability for dropdowns and the account menu (open/close, Escape, focus management, arrow navigation, `aria-*`).
- Active-link highlighting (`aria-current="page"`) preserved per group/item.
- Reduced motion respected for any new animation (token durations only).
- Preservation of routing, auth behavior, skip link, and landmarks (EP10C/D10-14).

## Acceptance Criteria

- Primary navigation is organized into grouped sections (Dashboard; Academics; Planning) with icons + text, reducing the top-level link count.
- The account/user menu (desktop dropdown, mobile grouped section) contains Profile, Availability, email-verification (when unverified), and Logout; these are removed from the flat primary link list.
- Desktop groups render as dropdown menus; the account menu renders as an avatar/user dropdown; both are keyboard-operable.
- The mobile drawer renders grouped sections with headings and an Account section, reusing the EP10C drawer behavior.
- All existing routes remain reachable with no functional regression (routes, data, forms, dialogs, actions behave as before).
- Keyboard accessibility: dropdowns open/close via keyboard, Escape closes, focus is managed and restored, `aria-expanded`/`aria-haspopup`/`role="menu"` present.
- Refreshed surfaces meet WCAG 2.2 AA for focus visibility and keyboard operability and respect `prefers-reduced-motion`.
- No backend or API changes are required; if a story discovers a needed contract change, it is flagged and approved before implementation.

## Proposed Stories

1. EP11A — Desktop grouped navigation & account menu (dropdowns, icons, avatar menu).
2. EP11B — Mobile drawer grouped sections & account section (responsive + a11y + tests).

## Technical Notes

- **Baseline shell (inspected 2026-10-29):** `apps/web/src/widgets/header/ui/Header.tsx` renders a flat `navLinks` array (Home, Dashboard, Semesters, Courses, Assignments, Calendar, Availability, Profile) for authenticated users, a mobile drawer (right-side slide-in, focus trap, scroll lock, Escape, route-change close) per D10-11, and an auth area (welcome text, verify link, Logout) per D10-15. `apps/web/src/widgets/layout/ui/Layout.tsx` provides skip link + landmarks (D10-14). Routes in `apps/web/src/app/App.tsx`.
- **Frontend architecture:** FSD layers (`app/pages/widgets/features/entities/shared`); header lives in `widgets/header/ui`. Single `@/` alias. Shared primitives in `shared/ui` (Button, etc.).
- **No backend work:** frontend-only. Any story that finds a required API/contract change flags it and stops for approval (D11-2-equivalent of D10-2).
- **Icons:** lucide-react is already a dependency; icon set is finalized by the `ui-refiner` (D11-3).
- **Accessibility target:** WCAG 2.2 AA. Reduced motion via token durations (D10-16).
- **Out of scope:** new product features, backend/API changes, native mobile apps, dark mode, and visual-regression snapshot tooling. Business logic and data flows are unchanged. Replacing the EP10C drawer mechanism is out of scope; EP11B reuses it.

## Decision Register

| ID | Decision | Provenance |
|---|---|---|
| D11-1 | **Milestone M5 (polish follow-up).** EP11 is housed in M5 alongside EP10 rather than opening a new M6, because it is UX polish that evolves the same EP10C app-shell surfaces and reuses the EP10 token/primitive system. M5's EP10 review remains complete and reviewed; EP11 is a new polish epic within M5. | User decision prompt ("M5 or new M6"). Recorded by planner 2026-10-29. |
| D11-2 | **Frontend only.** No backend/API changes. If a story finds a required contract change, it flags it and stops for approval. | Epic scope + user authorization ("no backend changes unless flagged"). |
| D11-3 | **Refinement gate — closed 2026-10-29.** Original decision: EP11A and EP11B `Needs refinement` — dropdown interaction details (open/close triggers, keyboard model, focus management, animation), the exact lucide icon set, account-menu trigger/avatar treatment, mobile grouping labels, and copy deliberately undecided; the `ui-refiner` records them before implementation. Both `ui-refiner` passes and both technical-refine passes are now recorded in the child story files; both children reached `Ready` (EP11A since implemented). | Planner skill UI/UX handoff rule; closed by the 2026-10-29 passes (`254ba68` EP11A ui-refine, `c1bffbf` EP11B ui-refine; technical-refine `3e0e9ed`/`3853aaa` EP11A, `957cbec`/`698ab00` EP11B — reflog-verified by plan-review pass 1, 2026-10-31). |
| D11-4 | **Grouped information architecture.** Primary nav groups: Dashboard (single), Academics (Semesters/Courses/Assignments), Planning (Calendar/Availability/Plan). Account menu groups Profile, Availability, email-verification, Logout. The `Plan` (`/plan`) entry was added to the ratified Planning group 2026-10-30 by EP06F as a ratified additive edit to the shared nav file (`navGroups.ts:84`; EP06F story scope item 2 + AC 1; EP06 parent review PASS 2026-10-30); EP11 ratifies it — expected contract content, not drift (plan-review PR-001). | User decision (settled); EP06F additive amendment ratified by EP11 planner 2026-11-01. |
| D11-5 | **Icons + text.** Every nav entry and account-menu item shows a lucide icon alongside its text label; icon-only navigation is rejected (ADHD-friendly scannability). | User decision (settled). |
| D11-6 | **Account menu.** Profile, Availability, email-verification, Logout move into a user/avatar dropdown on desktop and a grouped Account section on mobile; primary nav keeps Dashboard + Academics + Planning. | User decision (settled). |
| D11-7 | **Reuse EP10C shell.** Dropdowns/account menu are added to the existing header; the mobile drawer, focus trap, scroll lock, skip link, and landmarks from EP10C are reused, not replaced. | EP10C baseline + D10-11…D10-16. |
| D11-8 | **Availability placement — resolved: keep both.** Availability is listed under both the Planning group and the account menu in the user's decisions. Resolved by both `ui-refiner` passes (2026-10-29): it stays in the Planning group (canonical/primary location) **and** is exposed in the account menu (desktop) / Account section (mobile) as a secondary shortcut — no deduplication, consistent with AC-E11-02. | User decision (settled grouping + account menu); resolved by ui-refiner passes 2026-10-29 — EP11A story "keep in both (Planning primary, account menu secondary)" (`:155-156,:362`), EP11B story "appears twice by design" (`:217,:276`). Recorded per plan-review PR-002. |
| D11-9 | **Tap targets ≥ 44×44px on mobile** and visible focus rings on all interactive elements (WCAG 2.2 AA), per D10-8. | Shared DoD 6/7 + target accessibility. |
| D11-10 | **Availability leaves the navigation (amends D11-4, D11-6, D11-8).** EP15 retires the `/availability` page (EP15 D15-9, ratified 2026-11-16): the Planning group becomes Calendar + Plan, the account menu drops Availability, and `/availability` redirects to `/calendar`. Applied by [EP15I](../stories/EP15/EP15I-retire-availability-and-update-navigation.md); EP11's own review verdicts are unchanged. | EP15 planner, 2026-11-16 (id-conventions rule 4: bidirectional override reference). |

## Security / privacy / accessibility invariants

No new credential or tenancy surface; this epic changes presentation/navigation only.

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| Grouped nav does not hide or break access to any route | A grouped dropdown swallows a link or a mobile section omits an entry | Shared `navGroups`/`accountMenuItems` definition consumed by both desktop and mobile; component tests assert the full set per auth state | TR-E11-01 (EP11A, EP11B) |
| Dropdowns/account menu remain keyboard-operable | A menu opens only on hover or traps focus incorrectly | Button-triggered menus with Escape close, focus management, `aria-*`, reusing EP10C drawer trap | TR-E11-01, TR-E11-03 |
| Navigation change does not regress functional behavior | A restyled nav breaks routing or auth flow | Visual/IA-only change; existing page tests + manual pass | TR-E11-02 |

## Out of Scope

AI features, new product features, backend/API changes, native mobile apps, dark mode (unless the ui-refiner recommends and records it), and visual-regression snapshot tooling. Business logic and data flows are unchanged. No new routes are added.
