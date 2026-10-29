# EP11 Story Breakdown — Navigation & Information Architecture (ADHD-friendly)

**Epic:** [EP11: Navigation & Information Architecture (ADHD-friendly)](../../epics/EP11-navigation-and-information-architecture.md) (Jira key: Pending creation)
**Milestone:** M5 (Visual design system & refresh + navigation & IA — MVP polish; cross-cutting)
**Epic dependency:** EP10 (UI Design System & Visual Refresh), specifically EP10C (app shell refresh: header, layout, navigation, mobile drawer) — implemented and parent-reviewed (EP10 parent review PASSED 2026-10-29; review `docs/stories/EP10/artifacts/EP10/review.md`). EP11 evolves the refreshed shell; it does not redefine tokens or primitives.
**Status:** Planning — two frontend children, both `Needs refinement` pending `ui-refiner` pass (D11-3). No implementation started.
**Jira keys:** Pending creation (no sync authorized for this planning task).

## Execution queue

**Delivery home:** `docs/stories/EP11/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per child: `./artifacts/EP11A/`, `./artifacts/EP11B/`, plus `./artifacts/EP11/` for the combined parent review.

**Active substory:** None.

**Next substory:** EP11A — `Ready`; implement EP11A (shared `navGroups.ts` + desktop grouped nav + account menu + tests). EP11B is blocked on EP11A (shared nav-groups contract + implementation order); its ui-refiner pass is complete.

**Implementation owner:** `implementer`, one sequential writer across all layers (frontend only; the labels are scope, not concurrent roles).

**Final review:** one combined review for the EP11 parent review unit — both children — after EP11B is implemented. Reviewer artifacts: `./artifacts/EP11/review.md` + `./artifacts/EP11/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP11A](./EP11A-desktop-grouped-navigation-and-account-menu.md) | Ready | EP10C implemented & parent-reviewed (`410c343` + EP10 review PASS). UI refined (2026-10-29) and technical-refined (2026-10-29); Status `Ready`. | Implement EP11A: shared `navGroups.ts` + desktop dropdowns + account menu + tests (mobile drawer untouched). | `./artifacts/EP11A/` (pending) |
| [EP11B](./EP11B-mobile-drawer-grouped-sections.md) | Needs refinement | EP11A (shared nav-groups contract + desktop implementation). `ui-refiner` pass required before implementation (D11-3). | After EP11A lands: run `ui-refiner` on EP11B, then implement grouped mobile drawer. | `./artifacts/EP11B/` (pending) |

Sequence (one writer): EP11A → EP11B. EP11A defines the shared `navGroups`/`accountMenuItems` structure consumed by EP11B.

**Do not start EP11A or EP11B before their `ui-refiner` pass** — dropdown interaction model, icon set, account-menu trigger/avatar, mobile grouping labels, and copy are deliberately undecided (D11-3).

## Stories

| Story | Epic proposed story | Layer | Jira |
|---|---|---|---|
| [EP11A](./EP11A-desktop-grouped-navigation-and-account-menu.md) | 1. Desktop grouped navigation & account menu | Frontend | Pending creation |
| [EP11B](./EP11B-mobile-drawer-grouped-sections.md) | 2. Mobile drawer grouped sections & account section | Frontend | Pending creation |

Both of the epic's proposed stories are covered. The epic defines no backend work; every child is frontend-only.

## Epic acceptance criteria — ownership

Original wording from [EP11](../../epics/EP11-navigation-and-information-architecture.md#acceptance-criteria); stable IDs assigned here (the epic carries none).

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Primary navigation is organized into grouped sections (Dashboard; Academics; Planning) with icons + text, reducing the top-level link count. | AC-E11-01 | **EP11A** (desktop), **EP11B** (mobile). |
| The account/user menu (desktop dropdown, mobile grouped section) contains Profile, Availability, email-verification (when unverified), and Logout; these are removed from the flat primary link list. | AC-E11-02 | **EP11A** (desktop dropdown), **EP11B** (mobile Account section). |
| Desktop groups render as dropdown menus; the account menu renders as an avatar/user dropdown; both are keyboard-operable. | AC-E11-03 | **EP11A**. |
| The mobile drawer renders grouped sections with headings and an Account section, reusing the EP10C drawer behavior. | AC-E11-04 | **EP11B**. |
| All existing routes remain reachable with no functional regression (routes, data, forms, dialogs, actions behave as before). | AC-E11-05 | **EP11A**, **EP11B**. |
| Keyboard accessibility: dropdowns open/close via keyboard, Escape closes, focus is managed and restored, `aria-expanded`/`aria-haspopup`/`role="menu"` present. | AC-E11-06 | **EP11A** (desktop), **EP11B** (drawer reuse). |
| Refreshed surfaces meet WCAG 2.2 AA for focus visibility and keyboard operability and respect `prefers-reduced-motion`. | AC-E11-07 | **EP11A**, **EP11B**. |
| No backend or API changes are required; if a story discovers a needed contract change, it is flagged and approved before implementation. | AC-E11-08 | All children (flag only; no implementation of backend changes). |

## Requirement and test traceability

The epic defines no test requirements (TR-*); stable TR IDs are assigned here.

| Req | Requirement | Owning children |
|---|---|---|
| AC-E11-01 | Grouped sections with icons + text | EP11A, EP11B |
| AC-E11-02 | Account menu contents + removal from flat list | EP11A, EP11B |
| AC-E11-03 | Desktop dropdowns + avatar menu, keyboard-operable | EP11A |
| AC-E11-04 | Mobile grouped drawer sections | EP11B |
| AC-E11-05 | No functional regression | EP11A, EP11B |
| AC-E11-06 | Keyboard accessibility (dropdowns/menus) | EP11A, EP11B |
| AC-E11-07 | WCAG 2.2 AA + reduced motion | EP11A, EP11B |
| AC-E11-08 | No backend/API changes unless flagged | All |
| TR-E11-01 | Header component tests: grouped nav by auth state, dropdown open/close/keyboard, account menu, mobile grouped sections, active `aria-current` | EP11A, EP11B |
| TR-E11-02 | Existing tests still pass after the nav redesign (no regression) | EP11A, EP11B |
| TR-E11-03 | Manual accessibility review recorded (keyboard, screen reader, focus, reduced motion) | EP11A, EP11B |
| TR-E11-04 | Reduced-motion verification (`prefers-reduced-motion`) for any new shell animation | EP11A, EP11B |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | Not applicable — no new input; existing validation unchanged. |
| 3 student data scoping | Not applicable — no data access changes. |
| 4 actionable API errors | Not applicable — no API changes; existing error copy preserved. |
| 5 loading, empty, and error states | Not applicable — no new async states at shell level (EP10C baseline). |
| 6 keyboard accessibility | EP11A, EP11B |
| 7 responsive layouts | EP11A, EP11B |
| 8 automated tests | EP11A, EP11B (TR-E11-01, TR-E11-02) |
| 9 API/migration documentation | Not applicable — no API or migration changes. |
| 10 integrated review | EP11 parent review unit (both children) |
| 11 reviewer walkthrough | Reviewer, once for the EP11 parent review unit |

## Shared nav contract (provisional)

This contract is the seam between EP11A (which implements the desktop consumption and defines the shared structure) and EP11B (which consumes it for the mobile drawer). Exact icons, labels, and dropdown behavior are settled by the `ui-refiner` pass (D11-3); the *structure and roles* below are the stable part.

Navigation data (defined once, consumed by both desktop and mobile):

- **`navGroups` (authenticated):**
  - `{ id: 'dashboard', label: 'Dashboard', icon, to: '/dashboard' }` — single link (not a dropdown).
  - `{ id: 'academics', label: 'Academics', icon, items: [Semesters → /semesters, Courses → /courses, Assignments → /assignments] }` — dropdown on desktop, section on mobile.
  - `{ id: 'planning', label: 'Planning', icon, items: [Calendar → /calendar, Availability → /availability] }` — dropdown on desktop, section on mobile.
- **`navGroups` (unauthenticated):** `{ id: 'home', label: 'Home', icon, to: '/' }` single link. (No grouped sections for guests.)
- **`accountMenuItems` (authenticated):** Profile → /profile; Availability → /availability; Verify email → /verify-email (only when `!user.emailVerifiedAt`); Logout (action). Rendered in the account/user menu (desktop dropdown, mobile Account section).
- **Home** remains a top-level link for unauthenticated users and (optionally) authenticated users per EP10C baseline; the ui-refiner decides whether Home stays in primary nav for authenticated users. Provisional: keep Home for all users (current behavior).

Usage rules:

- Both desktop and mobile consume the same `navGroups`/`accountMenuItems` definitions; no link may exist in one surface but not the other (prevents drift).
- Components reference semantic tokens and scale steps (EP10 contract); raw palette hex and arbitrary spacing values are not allowed in new/changed code.
- Icons are lucide-react components (D11-5); the exact set is finalized by the ui-refiner (D11-3).
- Tap targets ≥ 44×44px on mobile; visible focus rings on all interactive elements (D11-9).
- Dropdown/menu open state is controlled (not hover-only); Escape closes; focus is managed and restored (D10-11 pattern).
- Reduced motion: token durations only (D10-16); no new animation library.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D11-1 | **Milestone M5 (polish follow-up).** EP11 housed in M5 alongside EP10. | User decision prompt; recorded by planner 2026-10-29. |
| D11-2 | **Frontend only.** No backend/API changes. | Epic scope. |
| D11-3 | **EP11A and EP11B are `Needs refinement`.** Dropdown interaction, icon set, account-menu trigger, mobile labels, copy undecided; ui-refiner records them. | Planner skill UI/UX handoff rule. |
| D11-4 | **Grouped IA.** Groups: Dashboard; Academics (Semesters/Courses/Assignments); Planning (Calendar/Availability). Account menu: Profile, Availability, email-verification, Logout. | User decision (settled). |
| D11-5 | **Icons + text.** lucide-react icons alongside labels; icon-only rejected. | User decision (settled). |
| D11-6 | **Account menu.** Personal/account actions move into user/avatar dropdown (desktop) and Account section (mobile). | User decision (settled). |
| D11-7 | **Reuse EP10C shell.** Dropdowns/account menu added to existing header; drawer, focus trap, scroll lock, skip link, landmarks reused. | EP10C baseline + D10-11…D10-16. |
| D11-8 | **Availability placement (provisional).** Availability appears in both Planning group and account menu (per user decision listing it in both). ui-refiner may recommend deduplication. | User decision (settled grouping + account menu) — overlap flagged. |
| D11-9 | **Tap targets ≥ 44×44px on mobile** and visible focus rings (WCAG 2.2 AA). | Shared DoD 6/7. |

## Code baseline (inspected 2026-10-29, not proposed)

- **Header:** `apps/web/src/widgets/header/ui/Header.tsx` — flat `navLinks` array (Home, Dashboard, Semesters, Courses, Assignments, Calendar, Availability, Profile); mobile drawer (right-side slide-in, focus trap, scroll lock, Escape, route-change close) per D10-11; auth area (welcome text, verify link, Logout) per D10-15; `navLinkClass` active styling; `NavLink` with `end`.
- **Layout:** `apps/web/src/widgets/layout/ui/Layout.tsx` — skip link + landmarks (D10-14).
- **Routes:** `apps/web/src/app/App.tsx`.
- **Tests:** `apps/web/src/widgets/header/ui/Header.test.tsx` — nav by auth state, active highlight, mobile drawer toggle/Escape/scroll lock/auth actions.
- **Shared primitives:** `apps/web/src/shared/ui/{Button,Badge,Card,Dialog,EmptyState,Input,Select}.tsx` (EP10B).
- **Icons:** lucide-react `^0.312.0` (already a dependency); currently `Menu`, `X` imported in Header.
- **Auth context:** `useAuth` from `@/features/auth/model/AuthContext`.

## Security / privacy / accessibility invariants

No new credential or tenancy surface; this epic changes presentation/navigation only. See epic file for the invariant table.

## Plan correction log

(First plan of this epic. No plan-review pass yet.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| — | — | — | — | No findings yet. | — | — | — |

## Quality gate (2026-10-29)

**Verdict: Draft** — the breakdown is complete and internally consistent, but EP11A and EP11B are `Needs refinement` (D11-3) and the plan cannot be `Plan Ready` for them until the `ui-refiner` pass records dropdown interaction, icon set, account-menu trigger, mobile labels, and copy. No implementation blocker exists beyond refinement and the EP10C baseline (implemented and parent-reviewed). No backend or API dependency.

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Two frontend children, each a substantive outcome (desktop grouped nav + account menu; mobile grouped drawer). No README-only/status/verification-only children — tests stay with their owner. Split is by surface (desktop vs mobile) with substantial independent work; layer label alone did not mandate the split (distinct interaction models and test sets). |
| 2 | Original AC/TR coverage | Pass | All eight epic ACs mapped to owners above; four TRs assigned (TR-E11-01…04). AC-E11-08 (no backend changes) recorded as a flag-only obligation on all children. |
| 3 | Definition of Done | Pass | DoD map above; items 2/3/4/5/9 marked Not applicable with reasons (no input/data/API/migration/async-state changes). Items 10/11 belong to the combined EP11 parent review. |
| 4 | Contract consistency | Pass | One shared nav contract section (provisional values); EP11A defines, EP11B consumes; parent review verifies end to end. |
| 5 | Code paths inspected | Pass | Baseline section (Header, Layout, App, tests, shared primitives, icons, auth context). Unverified: exact icon set, dropdown interaction model, account-menu trigger, mobile labels, copy — for the ui-refiner (D11-3); no browser screenshots taken. |
| 6 | Feature-specific risks/counterexamples | Pass | Route hiding (shared navGroups), keyboard operability (button-triggered menus + Escape + focus), functional regression (visual/IA-only change) — table in epic file. |
| 7 | Dependencies | Pass | EP11A → EP11B. EP11A depends on EP10C (implemented and parent-reviewed). No dependency on EP05–EP08 implementation. |
| 8 | Material decisions | Blocked | D11-3 (ui-refiner) + D11-8 provisional (Availability placement overlap). D11-1, D11-2, D11-4…D11-7, D11-9 are planner-recorded and grounded. |
| 9 | Correction log | Pass | First plan; no findings yet. Log initialized. |
| 10 | Jira identity | Not applicable | No sync authorized; all keys are `Pending creation`. |

## Implementation review log

(No implementation yet.)

## Final implementation review unit

One combined review for the EP11 parent — no per-child review gate.

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [EP11](./README.md) | EP11A, EP11B | `./artifacts/EP11/` | EP11B (writes `./artifacts/EP11/implementation.md`, including nav regression verification) | One combined EP11 review after both children (`review.md` + `walkthrough.md`) |

Child implementation completion unblocks the dependent child; only the passing combined review establishes sign-off. EP11A and EP11B must complete their `ui-refiner` pass before implementation.

## Autopilot

```yaml
version: 1
scope:
  parent: EP11
  descendants: [EP11A, EP11B]
  entry: ""
  limits: enclosing parent review unit
stage: plan
coordinator:
  workspace: /Users/michaelrobert/Desktop/focus-app
  branch: main
  baseline: ""
  head: ""
active_dispatch:
  name: EP11A technical-refine
  role: none
  status: complete
  pointer: docs/stories/EP11/EP11A-desktop-grouped-navigation-and-account-menu.md
  session: ""
  assignment: technical_refine
last_result:
  evidence: "EP11 breakdown created: epic registered in M5, two frontend children (EP11A, EP11B), both Needs refinement (D11-3)."
  findings: ""
  scope_note: "New epic: ADHD-friendly nav redesign. User decisions: new epic EP11; grouped sections; icons+text; account menu for Profile/Availability/verify/Logout. Frontend only."
  cycles: 0
  same_findings: unknown
gates:
  breakdown: unknown
  plan: unknown
  ui: unknown
  refinement: unknown
  child_unfinished: unknown
  eligible_child_state: unknown
  closeout: unknown
  integration: unknown
  all_descendants_implemented: unknown
  review: unknown
  findings_owner: unknown
  open_findings: unknown
  walkthrough: unknown
  judged_at_head: ""
  queue_hash: ""
writer: none
session_live: unknown
blocker:
  kind: none
  owner: ""
  question: ""
  answer: ""
resume: ""
judgment_attempts: 0
```