# EP10 Story Breakdown — UI Design System & Visual Refresh

**Epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md) (Jira key: Pending creation)
**Milestone:** M5 (Visual design system & refresh — MVP polish; cross-cutting)
**Epic dependency:** None blocking. EP10 is cross-cutting and can run in parallel with the functional epics; page-adoption stories require the pages they restyle to exist.
**Status:** Draft — seven frontend children planned; EP10A and EP10B implemented (awaiting parent review); EP10C is `Needs refinement` (ui-refiner handoff, D10-3); EP10D–EP10G are `Queued` behind them.

**Jira keys:** Pending creation (no sync authorized for this planning task).

## Execution queue

**Delivery home:** `docs/stories/EP10/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per child: `./artifacts/EP10A/`, …, `./artifacts/EP10G/`.

**Active substory:** None.

**Next substory:** EP10G — implement dashboard and profile adoption (EP10C satisfied).
**Implementation owner:** `implementer`, one sequential writer across all layers (frontend only; the labels are scope, not concurrent roles).

**Final review:** one combined review for the EP10 parent review unit — all seven children — after EP10G is implemented. Reviewer artifacts: `./artifacts/EP10/review.md` + `./artifacts/EP10/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP10A](./EP10A-design-tokens-and-theme-foundation.md) | Implemented — awaiting parent review | None (ui-refiner pass complete, D10-4…D10-9 recorded). | Combined EP10 parent review after all children | `./artifacts/EP10A/` (checkpoint, implementation, contrast record) · commit `322c417` |
| [EP10B](./EP10B-shared-ui-primitives-refresh.md) | Implemented — awaiting parent review | EP10A (tokens it consumes) — implemented (`322c417`). | Combined EP10 parent review after all children | `./artifacts/EP10B/` (checkpoint, implementation, tests) |
| [EP10C](./EP10C-app-shell-refresh.md) | Implemented — awaiting parent review | EP10B (primitives it composes) — implemented (`9a88d9c`). | Combined EP10 parent review after all children | `./artifacts/EP10C/` (checkpoint, implementation) |
| [EP10D](./EP10D-public-and-auth-pages-adoption.md) | Implemented — awaiting parent review | EP10C (settled design system) — satisfied. | Combined EP10 parent review after all children | `./artifacts/EP10D/` (checkpoint, implementation) |
| [EP10E](./EP10E-academic-data-pages-adoption.md) | Implemented — awaiting parent review | EP10C (settled design system) — satisfied. | Combined EP10 parent review after all children | `./artifacts/EP10E/` (checkpoint, implementation) |
| [EP10F](./EP10F-calendar-and-availability-pages-adoption.md) | Implemented — awaiting parent review | EP10C (settled); EP04 frontend pages implemented and parent-reviewed (SP-127 pass 3, SP-128 pass 1 w/ F-B-6 fix round open, SP-129 pass 3) — satisfied. | Combined EP10 parent review after all children | `./artifacts/EP10F/` (checkpoint, implementation) || [EP10G](./EP10G-dashboard-and-profile-adoption.md) | Queued | EP10C; the dashboard and profile pages must exist. | Implement after EP10C | — |

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
| TR-E10-03 | EP09 E2E journeys still pass (no visual-snapshot changes required) | EP10G (final verification owner). Scope caveat (PR-003): the existing suite covers auth/assignments/calendar/semesters-courses only; dashboard/profile adoption is verified by unit tests + manual pass, not E2E. E2E expansion to dashboard/profile is an EP09-scope decision requiring approval. |
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

(First plan of this epic. Plan-review pass 1 findings PR-001…PR-006 recorded below as PC-EP10-01…PC-EP10-06; original findings preserved verbatim in summary form. Status dispositions are the planner's; reviewer closure is pending re-review.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PC-EP10-01 | 2026-10-29 | Should-fix (plan review pass 1, PR-001) | `docs/stories/EP04/README.md` queue rows 25–29 + Status/Next substory; `docs/stories/EP04/SP-128/SP-128B-…md` Status line; `docs/stories/EP10/EP10F-…md` Dependencies/Technical notes/Sizing; `docs/stories/EP10/README.md` queue row EP10F + quality-gate rows 7 + verdict line | EP04 dependency status stale/inconsistent: EP10F and the EP10 README claimed the EP04 frontend children (SP-127B, SP-128B, SP-129A) were "implemented"/"implemented, awaiting parent review", while the EP04 README queue still listed SP-128B/SP-129A as `Needs refinement` and the SP-128B story `Status` read `Ready … not implemented`. | Reconciled EP04 README queue rows + Status/Next substory to the actual parent-reviewed state (SP-127A/B Reviewed pass 3; SP-128A Reviewed; SP-128B Reviewed pass 1 with F-B-6 fix round open; SP-129A Reviewed pass 3); updated SP-127A/B, SP-128A, SP-128B story `Status` lines; updated EP10F Dependencies/Technical notes/Sizing and the EP10 README queue row EP10F + quality-gate row 7 + verdict line to "implemented and parent-reviewed (SP-128B F-B-6 fix round open)". | Cross-file comparison: EP04 README queue rows 25–29 now match the implementation records (`SP-127/artifacts/SP-127/review.md` PASS pass 3, `SP-128/artifacts/SP-128/review.md` PASS pass 1, `SP-129/artifacts/SP-129/review.md` PASS pass 3) and the SP-128 README F-B-6 status; EP10F dependency text matches. | Addressed — awaiting re-review |
| PC-EP10-02 | 2026-10-29 | Polish (plan review pass 1, PR-002) | `docs/stories/EP10/EP10D-…md` AC #1 ("All six public/auth surfaces"), Sizing ("six surfaces", "the six page directories") | EP10D says "six" public/auth surfaces but lists seven directories (`home, login, register, forgot-password, reset-password, verify-email, onboarding`). | Changed "six" → "seven" in AC #1, the request/token estimate, and the start context. | Verified the seven directories are listed in EP10D Technical notes and the EP10 README code baseline; count now consistent. | Addressed — awaiting re-review |
| PC-EP10-03 | 2026-10-29 | Polish (plan review pass 1, PR-003) | `docs/stories/EP10/EP10G-…md` AC #6, Tests; `docs/stories/EP10/README.md` traceability (TR-E10-03) | EP10G's final E2E verification (TR-E10-03) exercises auth/assignments/calendar/semesters-courses only; the EP09 E2E suite has no dashboard/profile spec, so dashboard/profile adoption is covered only by unit tests + manual pass. | Stated explicitly in EP10G AC #6 and Tests that dashboard/profile adoption is verified by unit tests + manual pass, not E2E, and that any E2E expansion is an EP09-scope decision requiring approval (no silent spec addition). Added the same caveat to the EP10 README TR-E10-03 row. | Verified against the listed EP09 E2E specs (`auth-journeys`, `assignments-list`, `calendar`, `semesters-courses`, `login`) in EP10G Technical notes; no dashboard/profile spec exists. | Addressed — awaiting re-review |
| PC-EP10-04 | 2026-10-29 | Polish (plan review pass 1, PR-004) | `docs/stories/EP10/EP10A-…md` AC #6 ("Token text/background pairs meet WCAG 2.2 AA contrast (recorded values)") | "Recorded values" was an unspecified note with no concrete home. | Specified the contrast record's home: (a) the `ui-refiner` decision register on EP10A (D10-3/D10-4 palette mapping with per-pair ratios) and (b) the EP10A implementation record under `./artifacts/EP10A/`. Exact values remain the `ui-refiner`'s job (D10-3). | Cross-referenced AC #6 with the EP10A UI/UX gaps section and the DoD item 6 focus-ring note; both now point at the same two locations. | Addressed — awaiting re-review |
| PC-EP10-05 | 2026-10-29 | Polish (plan review pass 1, PR-005) | `EP10A` (6 ACs), `EP10B` (6), `EP10C` (6), `EP10G` (6) | Story sizing notes >5 ACs as a signal to inspect; the extra criteria are a11y/responsive/reduced-motion DoD obligations attached to each surface. | Decision: keep the ACs as-is (no grouping). The extra criteria are legitimate DoD obligations attached to each surface, not separate outcomes; grouping them into a single "accessibility & responsiveness" AC would obscure traceability to DoD items 6/7/8. Revisit only if a future refinement makes the grouping clearer. | Re-inspected each affected story's AC list; all map 1:1 to DoD items and source AC-E10-06. No split or grouping required. | Addressed — awaiting re-review |
| PC-EP10-06 | 2026-10-29 | Polish (plan review pass 1, PR-006) | `docs/stories/EP10/EP10A-…md` DoD item 6 ("Not applicable — focus styles retained (verified in EP10B/C)"); `index.css` base `button/input/select` focus rings use `primary-500` | EP10A tokenizes the focus-ring color (semantic `focus-ring`), so focus visibility is partly an EP10A concern even though primitives verify behavior in EP10B/C. | Updated DoD item 6: component behavior stays verified in EP10B/C, but EP10A now includes a quick verification that the `focus-ring` token meets WCAG 2.2 AA contrast against the surfaces it appears on (`surface`, `background`, `surface-muted`), recorded alongside the contrast record (AC #6). | Cross-checked with the shared contract (`focus-ring` semantic token) and AC #6's recorded-values locations; wording now assigns the token-level check to EP10A and the behavior check to EP10B/C. | Addressed — awaiting re-review |

## Quality gate (2026-10-29)

**Verdict: Draft** — the breakdown is complete and internally consistent, but EP10A/EP10B/EP10C are `Needs refinement` (D10-3) and the plan cannot be `Plan Ready` for them until the `ui-refiner` pass records the palette, typography, spacing, radius, shadow, motion, primitive variants, and shell layout. EP10D–EP10G are `Queued` behind them. No implementation blocker exists beyond refinement; EP10F additionally waits on the EP04 frontend pages (implemented and parent-reviewed: SP-127 pass 3, SP-128 pass 1 with SP-128B F-B-6 fix round open, SP-129 pass 3). No backend or API dependency.

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Seven frontend children, each a substantive outcome (tokens, primitives, shell, four adoption groups). No README-only/status/verification-only children — tests and adoption stay with their owner. Splits are by layer-surface and page group, each with substantial independent work. |
| 2 | Original AC/TR coverage | Pass | All seven epic ACs mapped to owners above; five TRs assigned (TR-E10-01…05). AC-E10-07 (no backend changes) recorded as a flag-only obligation on all children. |
| 3 | Definition of Done | Pass | DoD map above; items 2/3/4/9 marked Not applicable with reasons (no input/data/API/migration changes). Items 10/11 belong to the combined EP10 parent review. |
| 4 | Contract consistency | Pass | One shared design-token contract section (provisional values); EP10A implements, EP10B–EP10G consume; parent review verifies end to end. |
| 5 | Code paths inspected | Pass | Baseline section (Tailwind, global CSS, shared primitives, app shell, pages, design references, FSD, accessibility). Unverified: exact token values and primitive/shell specifics are for the ui-refiner (D10-3); no browser screenshots taken. |
| 6 | Feature-specific risks/counterexamples | Pass | Accessibility regression (focus rings, tap targets), functional regression (visual-only adoption), reduced motion — table above. |
| 7 | Dependencies | Pass | EP10A → EP10B → EP10C → EP10D/E/F/G. EP10F additionally depends on EP04 frontend pages (implemented and parent-reviewed: SP-127 pass 3, SP-128 pass 1 with SP-128B F-B-6 fix round open, SP-129 pass 3). No dependency on EP05–EP08 implementation. |
| 8 | Material decisions | Blocked | D10-3 (ui-refiner) + D10-4…D10-7/D10-9 provisional token/primitive/shell values. D10-1, D10-2, D10-8, D10-10 are planner-recorded and grounded. |
| 9 | Correction log | Pass | Plan-review pass 1 findings recorded as PC-EP10-01…PC-EP10-06 below with dispositions "Addressed — awaiting re-review"; original findings preserved. |
| 10 | Jira identity | Not applicable | No sync authorized; all keys are `Pending creation`. |

## Final implementation review unit

One combined review for the EP10 parent — no per-child review gate.

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [EP10](./README.md) | EP10A, EP10B, EP10C, EP10D, EP10E, EP10F, EP10G | `./artifacts/EP10/` | EP10G (writes `./artifacts/EP10/implementation.md`, including the TR-E10-03 E2E verification) | One combined EP10 review after all seven children (`review.md` + `walkthrough.md`) |

Child implementation completion unblocks the dependent child; only the passing combined review establishes sign-off. EP10A–EP10C must complete their `ui-refiner` pass before implementation.

## Autopilot

```yaml
version: 1
scope:
  parent: EP10
  descendants: [EP10A, EP10B, EP10C, EP10D, EP10E, EP10F, EP10G]
  entry: ""
  limits: enclosing parent review unit
stage: implement
coordinator:
  workspace: /Users/michaelrobert/Desktop/focus-app
  branch: main
  baseline: ""
  head: 9a88d9c
active_dispatch:
  name: EP10F implement
  role: implementer
  status: completed
  pointer: docs/stories/EP10/EP10F-calendar-and-availability-pages-adoption.md  session: ""
  assignment: complete_child
last_result:
  evidence: ""
  findings: ""
  scope_note: ""
  cycles: 0
  same_findings: unknown
gates:
  breakdown: true
  plan: pass
  ui: unknown
  refinement: false
  child_unfinished: false
  eligible_child_state: "Needs refinement"
  closeout: unknown
  integration: unknown
  all_descendants_implemented: false
  review: absent
  findings_owner: none
  open_findings: false
  walkthrough: missing
  judged_at_head: "d3cfeaf"
  queue_hash: "ep10-readme-v2"
writer: none
session_live: unknown
blocker:
  kind: none
  owner: ""
  question: ""
  answer: ""
resume: ""
judgment_attempts: 1
```
