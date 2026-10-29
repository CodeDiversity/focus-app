# EP10 Story Breakdown — UI Design System & Visual Refresh

**Epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md) (Jira key: Pending creation)
**Milestone:** M5 (Visual design system & refresh — MVP polish; cross-cutting)
**Epic dependency:** None blocking. EP10 is cross-cutting and can run in parallel with the functional epics; page-adoption stories require the pages they restyle to exist.
**Status:** Draft — seven frontend children planned; EP10A, EP10B, EP10C are `Needs refinement` (ui-refiner handoff, D10-3); EP10D–EP10G are `Queued` behind them. No implementation has started.
**Jira keys:** Pending creation (no sync authorized for this planning task).

## Execution queue

**Delivery home:** `docs/stories/EP10/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per child: `./artifacts/EP10A/`, …, `./artifacts/EP10G/`.

**Active substory:** None.

**Next substory:** EP10A — `ui-refiner` pass (D10-3), then implement (design tokens & theme foundation).

**Implementation owner:** `implementer`, one sequential writer across all layers (frontend only; the labels are scope, not concurrent roles).

**Final review:** one combined review for the EP10 parent review unit — all seven children — after EP10G is implemented. Reviewer artifacts: `./artifacts/EP10/review.md` + `./artifacts/EP10/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP10A](./EP10A-design-tokens-and-theme-foundation.md) | Needs refinement | None. | `ui-refiner` pass (D10-3), then implement | — |
| [EP10B](./EP10B-shared-ui-primitives-refresh.md) | Needs refinement | EP10A (tokens it consumes). | `ui-refiner` pass after EP10A is settled, then implement | — |
| [EP10C](./EP10C-app-shell-refresh.md) | Needs refinement | EP10B (primitives it composes). | `ui-refiner` pass after EP10B is settled, then implement | — |
| [EP10D](./EP10D-public-and-auth-pages-adoption.md) | Queued | EP10C (settled design system). | Implement after EP10C | — |
| [EP10E](./EP10E-academic-data-pages-adoption.md) | Queued | EP10C; the pages it restyles (semesters, courses, assignments) must exist. | Implement after EP10C | — |
| [EP10F](./EP10F-calendar-and-availability-pages-adoption.md) | Queued | EP10C; EP04 frontend children (SP-127B, SP-128B, SP-129A) implemented. | Implement after EP10C and the EP04 pages | — |
| [EP10G](./EP10G-dashboard-and-profile-adoption.md) | Queued | EP10C; the dashboard and profile pages must exist. | Implement after EP10C | — |

Sequence (one writer): EP10A → EP10B → EP10C → EP10D → EP10E → EP10F → EP10G. EP10D–EP10G are independent of each other once EP10C lands; the order above puts the public/auth shell-adjacent surfaces first, then the data-heavy pages, then calendar/availability, then dashboard/profile.

**Do not start EP10A, EP10B, or EP10C before their `ui-refiner` pass** — the palette, typography, spacing, radius, shadow, motion values, primitive variants, and shell layout are deliberately undecided (D10-3). EP10D–EP10G are mechanical adoption of the settled system; a page-level `ui-refiner` pass is only needed if a story proposes layout changes beyond token application.

## Stories

| Story | Epic proposed story | Layer | Jira |
|---|---|---|---|
| [EP10A](./EP10A-design-tokens-and-theme-foundation.md) | 1. Design tokens & theme foundation | Frontend | Pending creation |
| [EP10B](./EP10B-shared-ui-primitives-refresh.md) | 2. Shared UI primitives refresh | Frontend | Pending creation |
| [EP10C](./EP10C-app-shell-refresh.md) | 3. App shell refresh | Frontend | Pending creation |
| [EP10D](./EP10D-public-and-auth-pages-adoption.md) | 4. Public/auth pages adoption | Frontend | Pending creation |
| [EP10E](./EP10E-academic-data-pages-adoption.md) | 5. Academic data pages adoption | Frontend | Pending creation |
| [EP10F](./EP10F-calendar-and-availability-pages-adoption.md) | 6. Calendar & availability pages adoption | Frontend | Pending creation |
| [EP10G](./EP10G-dashboard-and-profile-adoption.md) | 7. Dashboard & profile adoption | Frontend | Pending creation |

All seven of the epic's proposed stories are covered. The epic defines no backend work; every child is frontend-only.

## Epic acceptance criteria — ownership

Original wording from [EP10](../../epics/EP10-ui-design-system-and-visual-refresh.md#acceptance-criteria); stable IDs assigned here (the epic carries none).

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| A documented design-token set drives all styling; Tailwind config and global CSS reflect it, and pages no longer hard-code ad-hoc color/spacing values where a token exists. | AC-E10-01 | **EP10A** (tokens), **EP10B–EP10G** (consume tokens; no ad-hoc values). |
| Shared UI primitives use the token set and expose consistent variants, sizes, and states (loading, disabled, error, focus). | AC-E10-02 | **EP10B**. |
| The app shell uses the refreshed system and remains usable on desktop and mobile, including keyboard navigation. | AC-E10-03 | **EP10C**. |
| Every existing page renders with the refreshed visual system with no functional regression (routes, data, forms, dialogs, and actions behave as before). | AC-E10-04 | **EP10D**, **EP10E**, **EP10F**, **EP10G**. |
| Loading, empty, and error states are visually consistent across pages. | AC-E10-05 | **EP10B** (shared state primitives), **EP10D–EP10G** (apply them). |
| Refreshed surfaces meet WCAG 2.2 AA for color contrast, focus visibility, and keyboard operability, and respect `prefers-reduced-motion`. | AC-E10-06 | **EP10A** (token contrast/motion), **EP10B**, **EP10C**, **EP10D–EP10G**. |
| No backend or API changes are required; if a story discovers a needed contract change, it is flagged and approved before implementation. | AC-E10-07 | All children (flag only; no implementation of backend changes). |

## Requirement and test traceability

The epic defines no test requirements (TR-*); stable TR IDs are assigned here.

| Req | Requirement | Owning children |
|---|---|---|
| AC-E10-01 | Token-driven styling | EP10A, EP10B, EP10C, EP10D, EP10E, EP10F, EP10G |
| AC-E10-02 | Consistent primitives (variants/states) | EP10B |
| AC-E10-03 | Refreshed, usable app shell | EP10C |
| AC-E10-04 | All pages refreshed, no functional regression | EP10D, EP10E, EP10F, EP10G |
| AC-E10-05 | Consistent loading/empty/error states | EP10B, EP10D, EP10E, EP10F, EP10G |
| AC-E10-06 | WCAG 2.2 AA + reduced motion | EP10A, EP10B, EP10C, EP10D, EP10E, EP10F, EP10G |
| AC-E10-07 | No backend/API changes unless flagged | All |
| TR-E10-01 | Primitive component tests (variants, states, focus, a11y) | EP10B |
| TR-E10-02 | Existing page/component tests still pass after adoption | EP10D, EP10E, EP10F, EP10G |
| TR-E10-03 | EP09 E2E journeys still pass (no visual-snapshot changes required) | EP10G (final verification owner) |
| TR-E10-04 | Manual accessibility review recorded (contrast, keyboard, screen reader) | EP10C, EP10D, EP10E, EP10F, EP10G |
| TR-E10-05 | Reduced-motion verification (`prefers-reduced-motion`) | EP10A, EP10B, EP10C |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | Not applicable — no new input; existing validation unchanged. |
| 3 student data scoping | Not applicable — no data access changes. |
| 4 actionable API errors | Not applicable — no API changes; existing error copy preserved. |
| 5 loading, empty, and error states | EP10B, EP10D, EP10E, EP10F, EP10G |
| 6 keyboard accessibility | EP10B, EP10C, EP10D, EP10E, EP10F, EP10G |
| 7 responsive layouts | EP10C, EP10D, EP10E, EP10F, EP10G |
| 8 automated tests | EP10B (primitive tests), EP10D–EP10G (page tests + TR-E10-03) |
| 9 API/migration documentation | Not applicable — no API or migration changes. |
| 10 integrated review | EP10 parent review unit (all seven children) |
| 11 reviewer walkthrough | Reviewer, once for the EP10 parent review unit |

## Shared design-token contract (provisional)

This contract is the seam between EP10A (which implements it) and EP10B–EP10G (which consume it). Exact values are deliberately not fixed here; they are settled by the `ui-refiner` pass on EP10A (D10-3) and recorded as decisions D10-4…D10-9 before implementation. The *names and roles* below are the stable part.

Tokens (Tailwind theme extension + CSS custom properties in `apps/web/src/index.css`):

- **Color (semantic, not raw hex in components):** `background`, `surface`, `surface-muted`, `text`, `text-muted`, `border`, `border-strong`, `accent` (primary action), `accent-hover`, `danger`, `success`, `warning`, `focus-ring`. Each semantic token maps to a concrete palette entry in EP10A; components reference only semantic tokens.
- **Typography:** `fontFamily.sans` (Inter/system-ui baseline), a small set of size/line-height steps (display, heading, body, caption) and font weights (regular, medium, semibold). No new font family without a recorded decision.
- **Spacing/radius/shadow/motion:** a constrained scale (Tailwind's default spacing scale is the baseline; radius steps sm/md/lg/xl; shadow steps sm/md/lg; motion durations fast/base/slow with `prefers-reduced-motion` zeroing). Components use scale steps, not arbitrary values.
- **Dark mode:** out of scope unless the ui-refiner records it (D10-9).

Usage rules:

- Components and pages reference semantic tokens and scale steps; raw palette hex and arbitrary spacing values are not allowed in new/changed code.
- The legacy `.card`, `.btn*`, `.input-error`, `.error-message` classes evolve to consume tokens; their class names are retained where existing callers depend on them, to keep adoption incremental.
- Primitive variants/sizes are defined once in `shared/ui` (EP10B); pages compose primitives rather than re-implementing styles.
- All interactive elements keep a visible focus ring using `focus-ring`; tap targets are at least 44×44px on mobile (`min-h-[44px]`).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D10-1 | **Evolve, don't replace.** The existing visual system (Tailwind `primary`/`secondary`, Inter, `.card`/`.btn`) is the baseline; the refresh evolves it into semantic tokens rather than discarding it. Rationale: every page and component already depends on these names; a hard replacement would force a big-bang rewrite and risk functional regression. Reversible if the ui-refiner recommends a clean break. | Inspected `tailwind.config.js`, `index.css`, `shared/ui/*`. Provisional. |
| D10-2 | **Frontend only.** No backend/API changes. If a story finds a required contract change, it flags it and stops for approval rather than implementing it. | Epic scope + user authorization ("no backend changes unless flagged"). |
| D10-3 | **EP10A, EP10B, EP10C are `Needs refinement`.** Palette, typography, spacing, radius, shadow, motion, primitive variants, and shell layout are deliberately undecided; the `ui-refiner` records them before implementation. | Planner skill UI/UX handoff rule. |
| D10-4 | **Semantic color tokens** (names in the contract above) are the only color references in components/pages. | Provisional; values settled by ui-refiner on EP10A. |
| D10-5 | **Typography stays Inter/system-ui** unless the ui-refiner proposes and records a change; the scale is constrained to a small set of steps. | Baseline `fontFamily.sans`. Provisional. |
| D10-6 | **Spacing/radius/shadow/motion use constrained scales**; arbitrary values are disallowed in new/changed code. | ADHD-friendly minimalism goal. Provisional. |
| D10-7 | **Legacy class names (`.card`, `.btn*`) are retained but tokenized**, so adoption can be incremental without a big-bang rewrite. | D10-1. Provisional. |
| D10-8 | **Tap targets ≥ 44×44px on mobile** and visible focus rings on all interactive elements (WCAG 2.2 AA). | Shared DoD 6/7 + target accessibility. |
| D10-9 | **Dark mode is out of scope** unless the ui-refiner recommends and records it as a decision. | MVP boundary; not requested. Provisional. |
| D10-10 | **Milestone M5** (new) houses EP10 rather than M1–M4: the refresh is MVP-scoped polish that touches shared primitives used by every page, so it is tracked as its own milestone within MVP 1.0 rather than being wedged into a functional epic's milestone. Functional adoption stories sequence after the pages they restyle exist. | User decision prompt ("M2 or new milestone"). |

## Code baseline (inspected 2026-10-29, not proposed)

- **Tailwind:** `apps/web/tailwind.config.js` — `primary` (blue 50–900), `secondary` (slate 50–900), `fontFamily.sans: ['Inter', 'system-ui', 'sans-serif']`, no plugins.
- **Global CSS:** `apps/web/src/index.css` — base html/body/heading/link/button/input/label styles, `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-outline`, `.card`, `.input-error`, `.error-message`, custom scrollbar, focus-visible handling.
- **Shared primitives:** `apps/web/src/shared/ui/{Button,Input,Select}.tsx` (plus `Button.test.tsx`). No `Card`, `Dialog`, `Badge`, or `EmptyState` primitive exists yet — EP10B may introduce them.
- **App shell:** `apps/web/src/widgets/header/ui/Header.tsx` (nav Home/Dashboard/Semesters/Courses/Assignments/Calendar/Availability/Profile, logo, auth buttons), `apps/web/src/widgets/layout/ui/Layout.tsx`, `apps/web/src/app/App.tsx` (routes).
- **Pages:** `apps/web/src/pages/{home,login,register,forgot-password,reset-password,verify-email,onboarding,dashboard,semesters,courses,calendar,availability,assignments,profile}`.
- **Design references:** `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` and `apps/web/src/pages/courses/ui/CoursesPage.tsx` + `features/courses/ui/CourseCard.tsx` + `CourseActionsMenu.tsx` (SP-126) — the "redesigned page" pattern.
- **FSD enforcement:** `apps/web/.eslintrc.cjs` (`import/no-restricted-paths`); `@/` alias.
- **Accessibility baseline:** focus rings via Tailwind `focus:ring-2 focus:ring-primary-500`; mobile tap targets `min-h-[44px]`; `prefers-reduced-motion` not yet handled centrally.
- **No calendar/availability/app-shell redesign decisions** are recorded yet — those are the ui-refiner's job (D10-3).

## Security / privacy / accessibility invariants

No new credential or tenancy surface; this epic changes presentation only.

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A visual refresh does not regress keyboard operability | A restyled control loses its focus ring or becomes mouse-only | Primitives own focus styles (D10-8); page adoption keeps native elements; manual keyboard pass recorded | TR-E10-04, EP10B/C |
| A visual refresh does not regress functional behavior | A restyled form breaks submission or a restyled dialog breaks Escape/close | Adoption stories are visual-only; existing page tests + E2E journeys re-run | TR-E10-02, TR-E10-03 |
| Reduced motion is respected | Animations run for users with `prefers-reduced-motion: reduce` | Motion tokens zero out durations under the media query (EP10A) | TR-E10-05 |

## Plan correction log

(First plan of this epic.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|

## Quality gate (2026-10-29)

**Verdict: Draft** — the breakdown is complete and internally consistent, but EP10A/EP10B/EP10C are `Needs refinement` (D10-3) and the plan cannot be `Plan Ready` for them until the `ui-refiner` pass records the palette, typography, spacing, radius, shadow, motion, primitive variants, and shell layout. EP10D–EP10G are `Queued` behind them. No implementation blocker exists beyond refinement; EP10F additionally waits on the EP04 frontend pages (already implemented, awaiting parent review). No backend or API dependency.

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Seven frontend children, each a substantive outcome (tokens, primitives, shell, four adoption groups). No README-only/status/verification-only children — tests and adoption stay with their owner. Splits are by layer-surface and page group, each with substantial independent work. |
| 2 | Original AC/TR coverage | Pass | All seven epic ACs mapped to owners above; five TRs assigned (TR-E10-01…05). AC-E10-07 (no backend changes) recorded as a flag-only obligation on all children. |
| 3 | Definition of Done | Pass | DoD map above; items 2/3/4/9 marked Not applicable with reasons (no input/data/API/migration changes). Items 10/11 belong to the combined EP10 parent review. |
| 4 | Contract consistency | Pass | One shared design-token contract section (provisional values); EP10A implements, EP10B–EP10G consume; parent review verifies end to end. |
| 5 | Code paths inspected | Pass | Baseline section (Tailwind, global CSS, shared primitives, app shell, pages, design references, FSD, accessibility). Unverified: exact token values and primitive/shell specifics are for the ui-refiner (D10-3); no browser screenshots taken. |
| 6 | Feature-specific risks/counterexamples | Pass | Accessibility regression (focus rings, tap targets), functional regression (visual-only adoption), reduced motion — table above. |
| 7 | Dependencies | Pass | EP10A → EP10B → EP10C → EP10D/E/F/G. EP10F additionally depends on EP04 frontend pages (implemented, awaiting review). No dependency on EP05–EP08 implementation. |
| 8 | Material decisions | Blocked | D10-3 (ui-refiner) + D10-4…D10-7/D10-9 provisional token/primitive/shell values. D10-1, D10-2, D10-8, D10-10 are planner-recorded and grounded. |
| 9 | Correction log | Pass | Empty — first plan of this epic. |
| 10 | Jira identity | Not applicable | No sync authorized; all keys are `Pending creation`. |

## Final implementation review unit

One combined review for the EP10 parent — no per-child review gate.

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [EP10](./README.md) | EP10A, EP10B, EP10C, EP10D, EP10E, EP10F, EP10G | `./artifacts/EP10/` | EP10G (writes `./artifacts/EP10/implementation.md`, including the TR-E10-03 E2E verification) | One combined EP10 review after all seven children (`review.md` + `walkthrough.md`) |

Child implementation completion unblocks the dependent child; only the passing combined review establishes sign-off. EP10A–EP10C must complete their `ui-refiner` pass before implementation.