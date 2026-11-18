# EP16 Story Breakdown — Today-First Simplification

**Epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 — release 1.3 (D16-1, ratified 2026-11-17)
**Epic dependency:** EP11, EP13, EP15 closed. **Ordering:** EP15K (its own review unit, Ready in [EP15's queue](../EP15/README.md)) runs first (D16-1 ruling); EP16A starts after EP15K's review passes.
**Status:** Breakdown complete (planner, 2026-11-17). Quality gate: **Plan Ready** (all decisions ratified by the user 2026-11-17) **+ Implementation Blocked** (EP15K first, D16-1) — see [history.md](./history.md). Plan review: **not required** by the checklist rule (no migration, no new invariant, six children); the user's 2026-11-17 instruction made it conditional on need, so none was run. No tracker sync.

## Plan at a glance

- **What this changes:** `/today` replaces the dashboard as the landing page (one next action, one deadlines list, one momentum row); planning becomes one action → one proposal → "Use this plan"; the plan-health page and the second planning flow retire behind redirects; navigation becomes Today · Plan · Calendar · Work ▾ with a header session indicator and a mobile bottom tab bar.
- **Why it improves it:** a student with ADHD opens the app and sees one thing to do and one button to start it (product); two near-identical planning flows and a page with no content of its own are deleted, and the dashboard's six regions become three (code).
- **Decisions needing you:** none — every epic and story decision ratified by the user 2026-11-17 ("ratify all"; D16-16).
- **How to change this plan:** edit a Ruling cell in a story or in the epic register; ask the planner for AC or queue changes. Corrections and the quality gate live in [history.md](./history.md); routes, copy rules and known windows in [contracts.md](./contracts.md).

## Execution queue

**Delivery home:** `docs/stories/EP16/`

**Artifact root:** `./artifacts/` — one directory per child (`./artifacts/EP16A/`, …), plus `./artifacts/EP16/` for the parent index and combined review.

**Active substory:** None.

**Next substory:** EP16A — blocked until EP15K's review unit passes (D16-1); then dispatch the implementer. Refiner first for EP16B, EP16C, EP16D, EP16E (D16-15) — may run now, in parallel with EP15K's implementation, since the refiner writes only story files.

**Implementation owner:** `implementer`, one sequential writer across all layers.

**Final review:** one combined review for the EP16 unit (EP16A–EP16F) after EP16F; report at `./artifacts/EP16/review.md` with the DoD-11 section inside it.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP16A](./EP16A-today-page-and-landing-route.md) | Blocked | EP15K review unit not yet passed (D16-1). Decisions ratified 2026-11-17. Specified in-story; no refiner pass needed. | Implement after EP15K's review | — |
| [EP16B](./EP16B-today-secondary-content.md) | Needs refinement | EP16A implemented. Refiner: Coming up row, classes line, momentum row layout and copy (D16-15). | Refine | — |
| [EP16C](./EP16C-one-planning-flow.md) | Needs refinement | EP16B implemented (the plan note moves first); D16-4/D16-9 ratified. Refiner: proposal surface composition and copy (D16-15). | Refine | — |
| [EP16D](./EP16D-navigation-and-session-indicator.md) | Needs refinement | EP16A implemented. Refiner: session indicator placement and copy; Work group icon (D16-15). | Refine | — |
| [EP16E](./EP16E-mobile-bottom-tab-bar.md) | Needs refinement | EP16D implemented; ▲ D-E1 ratified (five flat tabs). Refiner: tab bar layout, labels, Focus-page behaviour (D16-15). | Refine | — |
| [EP16F](./EP16F-cross-layer-e2e-and-parent-index.md) | Queued | EP16A–EP16E implemented. | Implement | — |

Sequence (one writer): EP16A → EP16B → EP16C → EP16D → EP16E → EP16F. Why: the landing page first so every later child verifies on the surface students will use; the secondary content before the plan flow because the plan note moves from `/plan` to Today and `/plan` is then rebuilt once; navigation after the pages it points at exist; the tab bar after the navigation contract it renders; E2E last over the final state. **Known windows** between children (nav labels, redirects, e2e URL assertions) are recorded in [contracts.md § Known windows](./contracts.md#known-windows-between-sequential-children) (D16-17).

## Stories

| Story | Outcome | Layer |
|---|---|---|
| [EP16A](./EP16A-today-page-and-landing-route.md) | `/today` with the hero and today's rows; every landing path resolves there; dashboard page removed; `features/dashboard` → `features/today`; day line without the IANA id; Button accessible name | Frontend |
| [EP16B](./EP16B-today-secondary-content.md) | Plan note, compact momentum row, Coming up (merged deadlines), Classes today line; copy-audit helper | Frontend |
| [EP16C](./EP16C-one-planning-flow.md) | One `PlanProposal` surface on the catch-up data path; `/plan` rebuilt; plan-health page and catch-up routes retired behind redirects | Frontend |
| [EP16D](./EP16D-navigation-and-session-indicator.md) | Four-entry navigation; header session indicator; in-page links for Semesters and Study history; BL-14-07 fix | Frontend |
| [EP16E](./EP16E-mobile-bottom-tab-bar.md) | Bottom tab bar on narrow viewports; drawer reduced to account items | Frontend |
| [EP16F](./EP16F-cross-layer-e2e-and-parent-index.md) | `today.spec.ts`, plan-flow and navigation journeys, redirect matrix, axe stops, parent index | Integration |

**Why EP16A and EP16B are separate:** EP16A is the route and the primary action — it is complete and verifiable on its own (a student lands on Today and can start), and it carries the mechanical folder rename that every later child builds on; EP16B is new UI (three regions with their own copy and states) that needs a refiner pass EP16A does not. **Why EP16C is one child:** the proposal surface, the `/plan` rebuild and the redirects are one outcome — splitting them would leave a window with two flows or a dead page. **Why EP16E is its own child:** it depends on EP16D's contract and carries the only story-level ▲ decision (D-E1); dropping it would not touch any other child. **Why a separate integration child exists:** the landing route changes every existing journey's first step (`helpers.ts`), and the plan flow rewrite retires `catch-up.spec.ts`'s surface — a new suite over the final state, plus the parent index.

## Epic acceptance criteria — ownership

Original wording in the [epic](../../epics/EP16-today-first-simplification.md#acceptance-criteria-draft--stable-ids-ac-e16-0114-assigned-at-breakdown); stable IDs assigned here. Bold = primary owner.

| Epic AC (abbreviated) | Stable ID | Owner |
|---|---|---|
| Landing on Today after login, onboarding, `/`, `/dashboard`; first nav entry; title | AC-E16-01 | **EP16A**, EP16D (nav entry), EP16F |
| First content = the single next action, independent of other reads; visible without scrolling at 360×640 | AC-E16-02 | **EP16A**, EP16F (V-16-3) |
| Regions and order; cap 5 + "All assignments"; Past due badge; no counts in headings; forbidden words | AC-E16-03 | **EP16B** |
| No study-sessions list; minutes appear once, in the momentum row, with a history link | AC-E16-04 | EP16A (removal), **EP16B** (row) |
| Add assignment in one tap; open a deadline row's details | AC-E16-05 | EP16A (control kept), **EP16B** (rows) |
| One action → one proposal → Use this plan / Not now; grid, editing, conflicts, warnings, calibration kept; "keeps" and "moved forward" shown | AC-E16-06 | **EP16C** |
| Today's "Plan my week" opens the proposal; the plan-note link opens `/plan` (wording amended at breakdown, see history) | AC-E16-07 | EP16A (hero link), EP16B (note link), **EP16C** (targets) |
| Plan-health and catch-up routes redirect; page removed; information relocated | AC-E16-08 | **EP16C** |
| Nav = Today, Plan, Calendar, Work ▾; account menu unchanged; Home hidden; every former route reachable | AC-E16-09 | **EP16D**, EP16A (`/` redirect) |
| Session indicator while active/paused; nothing otherwise; Focus empty state → Today | AC-E16-10 | **EP16D** |
| Bottom tab bar on narrow viewports; drawer keeps account items | AC-E16-11 | **EP16E** |
| Keyboard, focus, one live region, reduced motion, WCAG 2.2 AA, text labels | AC-E16-12 | All frontend children; EP16F (axe) |
| No backend/engine/schema change; identity and determinism tests unchanged | AC-E16-13 | All children (D16-13); EP16F verifies the suites |
| All existing journeys pass; new journeys added | AC-E16-14 | **EP16F** |

## Requirement and test traceability

The epic defines TR-E16-01…06 in draft; owners assigned here.

| Req | Requirement | Owner |
|---|---|---|
| TR-E16-01 | Component tests for every new/changed page and widget: states, keyboard, copy rules | EP16A, EP16B, EP16C, EP16D, EP16E |
| TR-E16-02 | Route tests for every redirect (AC-E16-01, AC-E16-08) and `/` by auth state | EP16A, EP16C |
| TR-E16-03 | Playwright: `today.spec.ts`; plan-flow journey incl. "Replan preserves a locked session"; navigation + indicator + tab bar; redirect matrix; axe stops on `/today` and `/plan/proposal`; `helpers.ts` landing update | EP16F |
| TR-E16-04 | Manual accessibility pass (screen reader on the indicator and tab bar; 360×640 primary-control visibility) | EP16D, EP16E (recorded); EP16F (collected) |
| TR-E16-05 | Copy audit: forbidden-word assertion over every rendered string of the new surfaces | EP16B (helper + Today), EP16C, EP16D, EP16E (reuse) |
| TR-E16-06 | Momentum-row parity with `momentumCopy.ts` sentences | EP16B |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | N/A — no new inputs (the proposal reuses `PlanSessionEditor`'s validation) |
| 3 student data scoping | N/A — no new reads; existing authenticated client (EP16D verifies the indicator's cache reset on logout) |
| 4 actionable API errors | EP16C (confirm 409/rolled-over copy, reused) |
| 5 loading/empty/error states | EP16A, EP16B, EP16C, EP16D |
| 6 keyboard accessibility | EP16A, EP16B, EP16C, EP16D, EP16E |
| 7 responsive layouts | EP16A, EP16B, EP16C, EP16E |
| 8 automated tests | All children (TR-E16-01…03, 05, 06); TR-E16-04 is a recorded manual pass |
| 9 API/migration documentation | N/A (no API change); EP16C documents the client's single data path in contracts.md; EP16F the parent index |
| 10 integrated review | EP16 parent review unit |
| 11 reviewer walkthrough | Reviewer, once for the EP16 unit |

## Shared contracts

[contracts.md](./contracts.md): route matrix, Today's region contract, copy rules, the single proposal data path, the session-indicator contract, known windows, code baseline.

## Decision register

Epic-level decisions D16-1…D16-14 live in the [epic](../../epics/EP16-today-first-simplification.md#decision-register). All ratified by the user 2026-11-17. Breakdown-level additions:

| ID | Decision | Status / provenance |
|---|---|---|
| D16-15 | **Refiner gate:** EP16B (Coming up row, classes line, momentum row), EP16C (proposal composition and copy), EP16D (indicator placement/copy, Work icon) and EP16E (tab bar) are `Needs refinement`; EP16A reuses `TodayPlanCard` and is specified in-story. Refinement may run before EP15K finishes — it writes story files only. | Planner skill UI/UX handoff rule, 2026-11-17. |
| D16-16 | **Blanket ratification:** the user ratified every epic and story decision as recommended ("yes, ratify all", 2026-11-17), including ▲ D16-2, D16-4, D16-9 and EP16E D-E1. Rows added later by the refiner still need their own ruling unless the user extends the grant. | User ruling 2026-11-17. |
| D16-17 | **Known windows** between children (nav label vs route, redirect-only entries, e2e URL assertions) are acceptable on the development branch because the epic ships as one review unit; each window is listed in contracts.md with the child that closes it. | EP15 D15-15/D15-18 precedent, 2026-11-17. |
| D16-18 | **AC-E16-07 wording amended at breakdown:** the plan-note link opens `/plan` (see the week, replan from there), not the proposal directly — a curious click must not start a heavy proposal fetch. Epic text updated 2026-11-17 before any AC froze. | Planner, 2026-11-17; logged in history.md. |

## Verification tasks

V-16-1…V-16-4 are defined in the [epic](../../epics/EP16-today-first-simplification.md#verification-tasks): V-16-1 copy audit (EP16B helper; every frontend child), V-16-2 route matrix (EP16A, EP16C; EP16F end-to-end), V-16-3 360×640 primary-control visibility (EP16F), V-16-4 unused-endpoint grep (EP16C).

## Backlog

Reviewed at every epic breakdown and every parent sign-off; list open rows across epics with `node tools/queue-lint.mjs --backlog docs/stories`. Status forms: [delivery-state](../../../.agents/delivery-state.md#backlog-register). Rows absorbed from other homes at this breakdown: BL-14-07 → EP16D; the Button item of BL-15-09 → EP16A (D16-14); BL-14-09 and BL-14-11 dropped as superseded by BL-15-08.

| ID | Item | Source | Why deferred | Revisit when | Owner | Last reviewed | Status |
|---|---|---|---|---|---|---|---|
| BL-16-01 | **Remove the unused `POST /study-plans/preview` + `PUT /study-plans` pair** once the web client calls only the catch-up pair | D16-4 (a) | API removal is outside a frontend-only epic; the endpoints are harmless while unused | EP16 has shipped and V-16-4 shows no caller for one full release, or the next API-cleanup story | planner | 2026-11-17 | Backlog |
| BL-16-02 | **Render the plan proposal on the EP15 week grid** and retire `PlanWeek` | D16-9 (a) | The EP15 grid is a week old; proposal/edit is a different mode; a follow-on epic once Today has landed | EP16 has shipped and a user asks to see the proposal against their calendar, or the next Plan-page story | planner | 2026-11-17 | Backlog |
| BL-16-03 | **Quick-capture assignment entry** — title-only add from Today, details later | 2026-11-17 product review (honourable mention) | The seven-field form is EP03's contract; a capture mode needs its own defaults decision | A user asks, or the Today "Add assignment" control's abandonment is observed in a usage check | planner | 2026-11-17 | Backlog |
| BL-16-04 | **Reminders and notifications epic** — browser notifications for upcoming sessions; optional morning email digest | 2026-11-17 product review (#1); EP13 D13-8 | Needs the user's capability decision (scheduled jobs, notification permission) | The user approves the capability (D13-8) | user / planner | 2026-11-17 | Backlog |
| BL-16-05 | **Focus-session upgrades** — end-of-target cue, built-in break, first-subtask start step, "park it" box | 2026-11-17 product review (#3) | Its own epic; reuses BL-16-04's permission if that lands first | EP16 has shipped, or a user asks | planner | 2026-11-17 | Backlog |

## Final implementation review unit

| Parent | In-scope children | Artifact paths | Index owner | Gate |
|---|---|---|---|---|
| [EP16](./README.md) | EP16A–EP16F | `./artifacts/EP16/` | EP16F's implementer writes the parent index | One combined EP16 review after EP16F |

Child implementation completion unblocks dependents; only the passing combined review establishes sign-off.
