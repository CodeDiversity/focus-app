# EP11 Story Breakdown — Navigation & Information Architecture (ADHD-friendly)

**Epic:** [EP11: Navigation & Information Architecture (ADHD-friendly)](../../epics/EP11-navigation-and-information-architecture.md) (Jira key: Pending creation)
**Milestone:** M5 (Visual design system & refresh + navigation & IA — MVP polish; cross-cutting)
**Epic dependency:** EP10 (UI Design System & Visual Refresh), specifically EP10C (app shell refresh: header, layout, navigation, mobile drawer) — implemented and parent-reviewed (EP10 parent review PASSED 2026-10-29; review `docs/stories/EP10/artifacts/EP10/review.md`). EP11 evolves the refreshed shell; it does not redefine tokens or primitives.
**Status:** Refinement closed for both children (`ui-refiner` + technical-refine passes, 2026-10-29; D11-3 resolved). Per the execution queue: EP11A `Implemented — awaiting parent review` (`b7ae794` + `1aec0ea`); EP11B `Ready`; the combined EP11 parent review is pending. Plan review: pass 1 (2026-10-31, [plan-review.md](./plan-review.md)) recorded **Changes Required** (PR-001/PR-002); the planner correction pass landed 2026-11-01 (dispatched 2026-10-31) — re-review (pass 2) 2026-11-01: **Plan Ready** at HEAD `29a71dd` (PR-001/PR-002 independently verified closed; PR-003…PR-006 polish remain with their owners). (Reconciled 2026-11-01 per plan-review PR-002; this line pre-dated the refinement passes and EP11A's implementation.)
**Jira keys:** Pending creation (no sync authorized for this planning task).

## Execution queue

**Delivery home:** `docs/stories/EP11/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per child: `./artifacts/EP11A/`, `./artifacts/EP11B/`, plus `./artifacts/EP11/` for the combined parent review.

**Active substory:** None.

**Next substory:** EP11B — `Ready`; implement the grouped mobile drawer + Account section (consumes EP11A's `navGroups`).

**Implementation owner:** `implementer`, one sequential writer across all layers (frontend only; the labels are scope, not concurrent roles).

**Final review:** one combined review for the EP11 parent review unit — both children — after EP11B is implemented. Reviewer artifacts: `./artifacts/EP11/review.md` + `./artifacts/EP11/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP11A](./EP11A-desktop-grouped-navigation-and-account-menu.md) | Implemented — awaiting parent review | EP10C implemented & parent-reviewed (`410c343` + EP10 review PASS). UI refined (2026-10-29) and technical-refined (2026-10-29). | No action; combined EP11 parent review after EP11B. | [checkpoint](./artifacts/EP11A/checkpoint.md) · [implementation](./artifacts/EP11A/implementation.md) |
| [EP11B](./EP11B-mobile-drawer-grouped-sections.md) | Ready | EP11A implemented (`b7ae794`, `1aec0ea`) — shared `navGroups` contract available. UI refined and technical-refined (2026-10-29); Status `Ready`. | Implement EP11B: grouped mobile drawer sections + Account section, consuming `navGroups`. | `./artifacts/EP11B/` (pending) |

Sequence (one writer): EP11A → EP11B. EP11A defines the shared `navGroups`/`accountMenuItems` structure consumed by EP11B.

**`ui-refiner` gate satisfied for both children** — passes recorded 2026-10-29 (D11-3 closed): dropdown interaction model, icon set, account-menu trigger/avatar, mobile grouping labels, and copy are settled and recorded in the story files. (Reconciled 2026-11-01 per plan-review PR-002; this line pre-dated the passes.)

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
  - `{ id: 'planning', label: 'Planning', icon, items: [Calendar → /calendar, Availability → /availability, Plan → /plan] }` — dropdown on desktop, section on mobile. **The `Plan` entry is ratified contract, not drift:** EP06F authorized it as an additive edit to this shared EP11 file (story scope item 2 + AC 1, `docs/stories/EP06/EP06F-study-plan-page-preview-edit-and-save.md:23,:54`), implemented 2026-10-30 with its dependent test update (`docs/stories/EP06/artifacts/EP06F/implementation.md:19,:26`), and passed the combined EP06 parent review 2026-10-30 (`docs/stories/EP06/artifacts/EP06/review.md` lists `navGroups.ts` among reviewed paths; EP06 README `:504` ratifies `navGroups.ts` as "EP11's shared file… edited additively"). Verified in code at `apps/web/src/widgets/header/ui/navGroups.ts:84`. Both surfaces are expected to render it (plan-review PR-001).
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
| D11-3 | **Refinement gate — closed 2026-10-29.** Original decision: EP11A and EP11B `Needs refinement` (dropdown interaction, icon set, account-menu trigger, mobile labels, copy undecided; ui-refiner records them). Both `ui-refiner` passes and both technical-refine passes are now recorded in the story files; both children reached `Ready` (EP11A since implemented). | Planner skill UI/UX handoff rule; closed by the 2026-10-29 passes (`254ba68` EP11A ui-refine, `c1bffbf` EP11B ui-refine; technical-refine `3e0e9ed`/`3853aaa` EP11A, `957cbec`/`698ab00` EP11B — reflog-verified by plan-review pass 1). |
| D11-4 | **Grouped IA.** Groups: Dashboard; Academics (Semesters/Courses/Assignments); Planning (Calendar/Availability/Plan). Account menu: Profile, Availability, email-verification, Logout. The `Plan` (`/plan`) entry was added to the ratified Planning group 2026-10-30 by EP06F as a ratified additive edit to the shared nav file (EP06 parent review PASS); EP11 ratifies it here — expected contract content, not drift. | User decision (settled); EP06F additive amendment ratified by EP11 planner 2026-11-01 per plan-review PR-001. |
| D11-5 | **Icons + text.** lucide-react icons alongside labels; icon-only rejected. | User decision (settled). |
| D11-6 | **Account menu.** Personal/account actions move into user/avatar dropdown (desktop) and Account section (mobile). | User decision (settled). |
| D11-7 | **Reuse EP10C shell.** Dropdowns/account menu added to existing header; drawer, focus trap, scroll lock, skip link, landmarks reused. | EP10C baseline + D10-11…D10-16. |
| D11-8 | **Availability placement — resolved: keep both.** Availability appears in the Planning group (canonical/primary location) and in the account menu as a secondary shortcut (same route `/availability`). Resolved **keep both** by both `ui-refiner` passes (2026-10-29) — no deduplication; consistent with AC-E11-02. EP11B asserts the duplicate (2 `Availability` links in the grouped drawer). | User decision (settled grouping + account menu); resolved by ui-refiner passes 2026-10-29 — EP11A story "keep in both (Planning primary, account menu secondary)" (`EP11A-*.md:155-156,:362`), EP11B story "appears twice by design" (`EP11B-*.md:217,:276`). Recorded per plan-review PR-002. |
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

Plan-review pass 1 (2026-10-31, `./plan-review.md`, commit `4163f67`) returned **Changes Required**: PR-001/PR-002 should-fix (planner-owned), PR-003…PR-005 polish (other owners). The planner correction pass (dispatched 2026-10-31 as `EP11-plan-fix-1`, corrections landed 2026-11-01) addressed the two planner findings below. Dispositions are the planner's own readiness assessment — only a passing re-review (pass 2) establishes reviewer closure.

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PR-001 | 2026-10-31 | Should-fix | `README.md:97-103` (shared nav contract); epic Scope + D11-4; `EP11B-*.md:112` (verified baseline), `:70` (test case 1), `:239` (focus-trap count), `:33`/`:236` (drift rule) | Every EP11 document omitted the EP06F-ratified `Plan` (`/plan`) entry that exists in the shared contract (`navGroups.ts:84`): contract/D11-4/Scope said Planning = Calendar/Availability only; EP11B's baseline said the same, its test matrix never asserted `Plan`, the focus-trap note counted "11–12" focusables (real: 13), and the stop-and-report drift rule would plausibly trigger a false stop against a ratified entry. Live drift: the legacy drawer (`Header.tsx:418-431`) lacks `/plan` while the desktop Planning dropdown has it — a one-surface-rule violation no EP11 record acknowledged. | Ratified Planning = Calendar/Availability/**Plan** with EP06F provenance in the README shared nav contract, D11-4, and epic Scope + epic D11-4. EP11B story: baseline corrected (Planning → Calendar/Availability/Plan, `/plan` added to the routes bullet, reconciliation note added to the baseline header); test case 1 extended to assert `Plan` (`href="/plan"`) inside the Planning region; focus-trap count corrected to **13** with enumeration; new risk records the drawer's current `/plan` absence and that the grouped render restores one-surface parity; drift rule (out-of-scope bullet + risk) clarified so consuming the ratified `Plan` is explicitly expected behavior, not contract drift; ordering/copy bullets include the `Plan` label. Historical records (EP11A implementation record, dated 2026-10-29 inspections) stay verbatim — forward reconciliation only. | Re-inspected at HEAD `3157a01`: `navGroups.ts:76-86` (Planning = Calendar `:80`, Availability `:83`, Plan `:84`), `Header.tsx:418-431` (legacy drawer lacks `/plan`), `App.tsx:66` (`/plan` route exists). Ratification chain: EP06F story `:23,:54` (scope item 2 + AC 1 — the report's suggested correction said "AC 2"; the verified authorizing AC is AC 1) → EP06F implementation `:19,:26` → EP06 README `:504` → EP06 parent review PASS 2026-10-30 with `navGroups.ts` in reviewed paths (`artifacts/EP06/review.md:5,:9,:14`). Focusables re-enumerated at 13: close, Home, Dashboard, Semesters, Courses, Assignments, Calendar, Availability, Plan, Profile, Availability, Verify email, Logout (12 when email verified). | Closed — verified at plan-review pass 2 (Plan Ready, 2026-11-01, at HEAD 29a71dd); see ./plan-review.md pass-2 section. |
| PR-002 | 2026-10-31 | Should-fix | `README.md:6` (Status line), `:163` (quality-gate row 8), `README.md:125` + epic D11-8; adjacent same-class staleness also reconciled: `README.md:30` queue note + both D11-3 register rows | Planning records unreconciled after the verified 2026-10-29 refinement passes: Status still read "both `Needs refinement` … No implementation started"; quality-gate row 8 still `Blocked`; D11-8 still "(provisional) … ui-refiner may recommend deduplication" although both passes settled **keep both**. A downstream reader acting on the top-level status could mis-select work or re-open a closed gate (the queue table itself was correct). | Status line refreshed to match the verified queue (refinement closed; EP11A `Implemented — awaiting parent review`; EP11B `Ready`; parent review pending; pass-1 verdict stated honestly). Row 8 flipped `Blocked → Pass` with refinement-commit provenance + pass-1 verification, explicitly noting pass-2 pending. D11-8 recorded resolved **keep both** (Planning canonical + account-menu secondary, per both 2026-10-29 ui-refiner passes) in the README **and** epic registers; epic D11-3 row annotated closed; the stale "deliberately undecided" queue note reconciled. | Cross-checked against the (correct) execution-queue rows, story headers (`EP11A:9-12`, `EP11B:9-12`), both ui-refiner resolutions (`EP11A:155-156,:362`; `EP11B:217,:275`), and plan-review pass 1's reflog-verified commit chain (`254ba68`, `c1bffbf`, `3e0e9ed`, `3853aaa`, `957cbec`, `698ab00`). Provenance phrasing states pass 1 = Changes Required and pass 2 pending — no passing plan review claimed. | Closed — verified at plan-review pass 2 (Plan Ready, 2026-11-01, at HEAD 29a71dd); see ./plan-review.md pass-2 section. |

PR-003/PR-004/PR-005 (polish) are **not planner-owned** and were not edited here: PR-003 → coordinator annotation on `artifacts/EP11A/checkpoint.md:39` (annotate, never rewrite); PR-004 → explicit outside-click focus negative case in the parent review's manual keyboard pass; PR-005 → EP11B implementer gates on "full web suite green at current HEAD", not the dated 842 count. See `./plan-review.md`.

## Quality gate (2026-10-29)

**Verdict: Plan Ready** *(updated 2026-11-01 by plan-review pass 2 at HEAD `29a71dd`; the original 2026-10-29 verdict was `Draft` — its sole block D11-3 verifiably closed 2026-10-29; pass 1 recorded Changes Required and the PR-001/PR-002 corrections were independently verified closed at pass 2)* — the breakdown is complete and internally consistent; both children carry recorded `ui-refiner` + technical-refine passes (EP11A since implemented, EP11B `Ready`). No implementation blocker exists beyond the EP10C baseline (implemented and parent-reviewed). No backend or API dependency. Manual a11y/reduced-motion evidence (TR-E11-03/04) and DoD 10/11 remain gates of the combined EP11 parent review; PR-003…PR-006 polish remain with their owners.

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Two frontend children, each a substantive outcome (desktop grouped nav + account menu; mobile grouped drawer). No README-only/status/verification-only children — tests stay with their owner. Split is by surface (desktop vs mobile) with substantial independent work; layer label alone did not mandate the split (distinct interaction models and test sets). |
| 2 | Original AC/TR coverage | Pass | All eight epic ACs mapped to owners above; four TRs assigned (TR-E11-01…04). AC-E11-08 (no backend changes) recorded as a flag-only obligation on all children. |
| 3 | Definition of Done | Pass | DoD map above; items 2/3/4/5/9 marked Not applicable with reasons (no input/data/API/migration/async-state changes). Items 10/11 belong to the combined EP11 parent review. |
| 4 | Contract consistency | Pass | One shared nav contract section (provisional values); EP11A defines, EP11B consumes; parent review verifies end to end. |
| 5 | Code paths inspected | Pass | Baseline section (Header, Layout, App, tests, shared primitives, icons, auth context). Unverified: exact icon set, dropdown interaction model, account-menu trigger, mobile labels, copy — for the ui-refiner (D11-3); no browser screenshots taken. |
| 6 | Feature-specific risks/counterexamples | Pass | Route hiding (shared navGroups), keyboard operability (button-triggered menus + Escape + focus), functional regression (visual/IA-only change) — table in epic file. |
| 7 | Dependencies | Pass | EP11A → EP11B. EP11A depends on EP10C (implemented and parent-reviewed). No dependency on EP05–EP08 implementation. |
| 8 | Material decisions | Pass | *(flipped 2026-11-01, plan correction pass — was Blocked)* D11-3 closed: ui-refiner passes for both children 2026-10-29 (`254ba68`, `c1bffbf`) + technical-refine (`3e0e9ed`/`3853aaa` EP11A, `957cbec`/`698ab00` EP11B); plan-review pass 1 (2026-10-31, `./plan-review.md`) independently verified the closure ("verifiably closed"). D11-8 resolved keep-both by both ui-refiner passes. D11-4 additively amended for the ratified `Plan` entry (PR-001). D11-1…D11-9 all recorded and grounded. Pass 1 recorded Changes Required; PR-001/PR-002 corrections landed 2026-11-01 (`60aa37f`); plan-review pass 2 (2026-11-01, `./plan-review.md`) returned **Plan Ready** — PR-001/PR-002 independently verified closed at HEAD `29a71dd`; PR-003…PR-006 polish remain with their owners. |
| 9 | Correction log | Pass | First plan; no findings yet. Log initialized. *(reconciled 2026-11-01: correction log now records PR-001/PR-002 — closed at pass 2 — plus polish PR-003…PR-006 with owners.)* |
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

Run: 2026-10-31 — user request "finish up 11b and the parent review" authorizes the EP11 parent review unit through final approval. Reconcile note: EP11A's implementation closeout is verified against Git (`b7ae794` + `1aec0ea`, records under `./artifacts/EP11A/`); refinement passes for both children verified (`3853aaa`, `957cbec`, `698ab00`). Reconcile also verified no independent whole-plan review exists for this epic (no `plan-review.md`; quality gate `Draft` is planner-owned and its sole block D11-3 is closed) → graph edge `plan_not_ready` dispatches the whole-plan review before EP11B implementation, per the partial-delivery rule (review the full plan and remaining-work impacts; EP11A is treated as implemented, not unimplemented). Unrelated dirty paths `.agents/skills/autopilot/SKILL.md` and `.agents/workflow-graph.md` belong to another contributor — never staged by this run.

```yaml
version: 1
execution:
  mode: auto
  awaiting_continue: false
scope:
  parent: EP11
  descendants: [EP11A, EP11B]
  entry: "implement EP11B + combined parent review"
  limits: enclosing parent review unit
stage: plan_review
coordinator:
  workspace: /Users/michaelrobert/Desktop/focus-app
  branch: main
  baseline: "3853aaa"  # before EP11A's first included change (b7ae794)
  head: "60aa37f"
active_dispatch:
  name: EP11-plan-review-2
  role: reviewer
  status: pending
  pointer: docs/stories/EP11/plan-review.md  # pass 2 appended; verify PR-001/PR-002 closure at 60aa37f
  session: ""
  assignment: plan_review
last_result:
  evidence: "EP11-plan-fix-1 (planner, ses_e6ac46467ffeVm2PpGGTzr7Yuy) corrected PR-001/PR-002 docs-only; runtime had no shell — coordinator verified the working tree and committed the 3 authorized docs paths (60aa37f). Planner also grounded one report deviation (authorizing criterion is EP06F AC 1 + scope item 2, not AC 2) and reconciled adjacent same-class staleness. Coordinator re-verified: README contract/D11-4/D11-8/status line/quality-gate row 8/correction log; EP11B baseline + test case 1 Plan assertion + 13-focusable count + drift-rule wording."
  findings: "PR-001/PR-002: Fixed in plan — Addressed, awaiting re-review (pass 2) — only the reviewer closes. PR-003 (annotate EP11A checkpoint stale line), PR-004 (parent-review manual outside-click case), PR-005 (suite-count gate = green at current HEAD) remain open polish with their owners; non-blocking."
  scope_note: "ADHD-friendly nav redesign; frontend only; user decisions D11-4..D11-6. Entry hint EP11B+parent review; prerequisite plan review dispatched first (missing plan approval). On pass-2 Plan Ready: child_ready → implementer EP11B."
  cycles: 1
  same_findings: unknown
gates:
  breakdown: verified_valid  # quality gate 2026-10-29 checks 1-9 pass; sized; AC/TR coverage complete
  plan: findings_awaiting_rereview  # pass 1 Changes Required; PR-001/PR-002 corrections committed 60aa37f
  ui: resolved               # ui-refiner passes for EP11A and EP11B recorded 2026-10-29
  refinement: resolved       # technical-refine passes for both children (3853aaa, 957cbec)
  child_unfinished: false    # no active child; EP11A closeout verified
  eligible_child_state: Ready  # EP11B
  closeout: unknown
  integration: unknown       # EP11B owns the combined index (artifacts/EP11/implementation.md)
  all_descendants_implemented: false
  review: absent             # combined parent review not yet run
  findings_owner: unknown
  open_findings: unknown
  walkthrough: unknown
  judged_at_head: "60aa37f"  # queue child rows unchanged since reconcile; adjacent stale queue-note reconciled per PR-002
  queue_hash: "fb00e75bf41a6e9e"
writer: none
session_live: false
blocker:
  kind: none
  owner: ""
  question: ""
  answer: ""
resume: "If interrupted: read this section + the Execution queue above + docs/stories/EP11/plan-review.md (pass 1 Changes Required; PR-001/PR-002 corrections committed at 60aa37f). Active dispatch EP11-plan-review-2 (reviewer, plan_review pass 2) — verify whether a pass-2 section was appended to plan-review.md before any successor dispatch; writer ownership is none; on Plan Ready → child_ready → implementer EP11B."
judgment_attempts: 0
```