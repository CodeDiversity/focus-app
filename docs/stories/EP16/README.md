# EP16 Story Breakdown — Today-First Simplification

**Epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 — release 1.3 (D16-1, ratified 2026-11-17)
**Epic dependency:** EP11, EP13, EP15 closed. **Ordering:** EP15K (its own review unit, Ready in [EP15's queue](../EP15/README.md)) runs first (D16-1 ruling); EP16A starts after EP15K's review passes.
**Status:** Breakdown complete (planner, 2026-11-17). Quality gate: **Plan Ready** (all decisions ratified by the user 2026-11-17) **+ Implementation Blocked** (EP15K first, D16-1) — see [history.md](./history.md). Plan review: **not required** by the checklist rule (no migration, no new invariant, six children); the user's 2026-11-17 instruction made it conditional on need, so none was run. No tracker sync.

## Plan at a glance

- **What this changes:** `/today` replaces the dashboard as the landing page (one next action, one deadlines list, one momentum row); planning becomes one action → one proposal → "Use this plan"; the plan-health page and the second planning flow retire behind redirects; navigation becomes Today · Plan · Calendar · Work ▾ with a header session indicator and a mobile bottom tab bar.
- **Why it improves it:** a student with ADHD opens the app and sees one thing to do and one button to start it (product); two near-identical planning flows and a page with no content of its own are deleted, and the dashboard's six regions become three (code).
- **Decisions needing you:** none — the optional upgrades were ruled 2026-11-18 ("Implement H, I ratify all decisions"): ▲ D-H1 and ▲ D-I1 accepted (EP16H, EP16I join the review unit); ▲ D-J1 and ▲ D-K1 deferred (→ BL-16-05, BL-16-09). Everything else is ratified (D16-16; D-D5…8, D-E4…7; D-H2/3, D-I2).
- **How to change this plan:** edit a Ruling cell in a story or in the epic register; ask the planner for AC or queue changes. Corrections and the quality gate live in [history.md](./history.md); routes, copy rules and known windows in [contracts.md](./contracts.md).

## Execution queue

**Delivery home:** `docs/stories/EP16/`

**Artifact root:** `./artifacts/` — one directory per child (`./artifacts/EP16A/`, …), plus `./artifacts/EP16/` for the parent index and combined review.

**Active substory:** None.

**Next substory:** None — the **EP16 combined review passed 2026-11-18** at `4f9ecd1` (pass 2, [review.md](./artifacts/EP16/review.md); round 1 [review-round-1.md](./artifacts/EP16/review-round-1.md)); EP16A–EP16I are Reviewed. Open polish is tracked (R-EP16-03 → BL-16-08, R-EP16-04 → BL-15-08, R-EP16-05 → planner backlog row wanted). Next work is the planner's epic closeout.

**Implementation owner:** `implementer`, one sequential writer across all layers.

**Final review:** one combined review for the EP16 unit (EP16A–EP16I) after EP16F; report at `./artifacts/EP16/review.md` with the DoD-11 section inside it. **Passed 2026-11-18 at `4f9ecd1`** — pass 1 ([review-round-1.md](./artifacts/EP16/review-round-1.md)) Changes Required (R-EP16-01); pass 2 ([review.md](./artifacts/EP16/review.md)) pass, R-EP16-01/02 closed, polish R-EP16-03/04/05 tracked.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP16A](./EP16A-today-page-and-landing-route.md) | Reviewed | Started 2026-11-17 on user instruction (EP15K review pass 2: only R-EP15K-02, user-owned, open). | None — combined review passed 2026-11-18 ([review.md](./artifacts/EP16/review.md)) | [implementation.md](./artifacts/EP16A/implementation.md) — green 2026-11-17 (web 1321/0, e2e 62/0 ×3); F-EP16A-01…03 |
| [EP16G](./EP16G-reset-student-data-on-logout.md) | Reviewed | ▲ D-G1/D-G2 ratified (user, 2026-11-18). | None — combined review passed 2026-11-18 ([review.md](./artifacts/EP16/review.md)) | [implementation.md](./artifacts/EP16G/implementation.md) — green 2026-11-18 (web 1325/0, 4 new); F-EP16G-01/02 |
| [EP16B](./EP16B-today-secondary-content.md) | Reviewed | EP16A, EP16G implemented. D-B5…D-B10 ratified by default 2026-11-18. | None — combined review passed 2026-11-18 ([review.md](./artifacts/EP16/review.md)) | [implementation.md](./artifacts/EP16B/implementation.md) — green 2026-11-18 (web 1355/0, e2e 62/0 ×2 + one cold-start timeout); F-EP16B-01…03 |
| [EP16C](./EP16C-one-planning-flow.md) | Reviewed | EP16B implemented. D-C5…D-C10 ratified by default; D-C11/D-C12 added (user tweak grant) 2026-11-18. | None — combined review passed 2026-11-18 ([review.md](./artifacts/EP16/review.md)) | [implementation.md](./artifacts/EP16C/implementation.md) — green 2026-11-18 (web 1356/0, e2e 61/0 + 1 fixme ×2); F-EP16C-01…03 |
| [EP16D](./EP16D-navigation-and-session-indicator.md) | Reviewed | D-D5…D-D8 ratified (user, 2026-11-18 — "ratify remaining"). | None — combined review passed 2026-11-18 ([review.md](./artifacts/EP16/review.md)) | [implementation.md](./artifacts/EP16D/implementation.md) — green 2026-11-18 (web 1396/0, e2e 61/0 + 1 planned skip); BL-14-07 reproduced + fixed; F-EP16D-01/02 |
| [EP16E](./EP16E-mobile-bottom-tab-bar.md) | Reviewed | D-E4…D-E7 ratified (user, 2026-11-18 — "ratify remaining"). | None — combined review passed 2026-11-18 ([review.md](./artifacts/EP16/review.md)) | [implementation.md](./artifacts/EP16E/implementation.md) — green 2026-11-18 (web 1428/0, e2e 61/0 + 1 planned skip incl. narrow journeys); F-EP16E-01 (deviation) /02 |
| [EP16F](./EP16F-cross-layer-e2e-and-parent-index.md) | Reviewed | EP16A–EP16E, EP16G implemented. | None — combined review passed 2026-11-18 ([review.md](./artifacts/EP16/review.md)) | [implementation.md](./artifacts/EP16F/implementation.md), [parent index](./artifacts/EP16/implementation.md) — green 2026-11-18 (web 1429/0; e2e 73/0/0 ×3; API gate 291/0); F-EP16F-01…05 (02–04 fixed) |
| [EP16H](./EP16H-paused-session-nudge.md) | Reviewed | Accepted (▲ D-H1 (a), user 2026-11-18). ADHD value 7/10. | None — combined review passed 2026-11-18 ([review.md](./artifacts/EP16/review.md)) | [implementation.md](./artifacts/EP16H/implementation.md) — green 2026-11-18 (web 1435/0) |
| [EP16I](./EP16I-target-in-session-strip.md) | Reviewed | Accepted (▲ D-I1 (a), user 2026-11-18). ADHD value 6/10. | None — combined review passed 2026-11-18 ([review.md](./artifacts/EP16/review.md)) | [implementation.md](./artifacts/EP16I/implementation.md) — green 2026-11-18 (web 1440/0; e2e 73/0) |
| [EP16J](./EP16J-start-next-session-from-focus.md) | Queued | **Cancelled for this epic (user, 2026-11-18)** — spec kept via BL-16-05; not in the EP16 unit. | None — see BL-16-05 | — |
| [EP16K](./EP16K-phone-first-proposal.md) | Queued | **Cancelled for this epic (user, 2026-11-18)** — spec kept via BL-16-09; not in the EP16 unit. | None — see BL-16-09 | — |

Sequence (one writer): EP16A → **EP16G** → EP16B → EP16C → EP16D → EP16E → EP16F → *accepted upgrades:* EP16H → EP16I (EP16J → BL-16-05, EP16K → BL-16-09) (EP16G inserted first on 2026-11-18 — a security fix goes before feature work, D16-19). Why: the landing page first so every later child verifies on the surface students will use; the secondary content before the plan flow because the plan note moves from `/plan` to Today and `/plan` is then rebuilt once; navigation after the pages it points at exist; the tab bar after the navigation contract it renders; E2E last over the final state. **Known windows** between children (nav labels, redirects, e2e URL assertions) are recorded in [contracts.md § Known windows](./contracts.md#known-windows-between-sequential-children) (D16-17).

## Stories

| Story | Outcome | Layer |
|---|---|---|
| [EP16A](./EP16A-today-page-and-landing-route.md) | `/today` with the hero and today's rows; every landing path resolves there; dashboard page removed; `features/dashboard` → `features/today`; day line without the IANA id; Button accessible name | Frontend |
| [EP16G](./EP16G-reset-student-data-on-logout.md) | Every per-student cache (six RTK Query slices + onboarding) emptied on logout or account switch; registry guard | Frontend (store; security) |
| [EP16B](./EP16B-today-secondary-content.md) | Plan note, compact momentum row, Coming up (merged deadlines), Classes today line; copy-audit helper | Frontend |
| [EP16C](./EP16C-one-planning-flow.md) | One `PlanProposal` surface on the catch-up data path; `/plan` rebuilt; plan-health page and catch-up routes retired behind redirects | Frontend |
| [EP16D](./EP16D-navigation-and-session-indicator.md) | Four-entry navigation; header session indicator; in-page links for Semesters and Study history; BL-14-07 fix | Frontend |
| [EP16E](./EP16E-mobile-bottom-tab-bar.md) | Bottom tab bar on narrow viewports; drawer reduced to account items | Frontend |
| [EP16F](./EP16F-cross-layer-e2e-and-parent-index.md) | `today.spec.ts`, plan-flow and navigation journeys, redirect matrix, axe stops, parent index | Integration |
| [EP16H](./EP16H-paused-session-nudge.md) *(optional, 7/10)* | After 15 min paused, the header strip reads "Paused a while" with **Resume** — a soft handle back for the most common abandonment path | Frontend |
| [EP16I](./EP16I-target-in-session-strip.md) *(optional, 6/10)* | The strip shows the target ("12:34 of 25 min"; "target reached" past it) — time blindness aid on every page | Frontend |
| [EP16J](./EP16J-start-next-session-from-focus.md) *(optional, 5/10)* | The Focus empty state offers the next session's **Start focus** / **Just 10 min** — one hop fewer to initiation | Frontend |
| [EP16K](./EP16K-phone-first-proposal.md) *(optional, 8/10)* | The proposal's editor folds behind one **Adjust sessions** disclosure below `md` — summary → week → decision on a phone | Frontend |

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
| 3 student data scoping | **EP16G** (client caches reset on logout / account switch — D16-19); EP16D (indicator state, EP16D-AC3); others N/A — no new reads |
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
| D16-20 | **Optional ADHD upgrade children (EP16H–EP16K):** the user's 2026-11-18 ADHD review request produced four upgrade stories, each carrying an **ADHD value score (n/10)** and a ▲ acceptance decision (D-H1, D-I1, D-J1, D-K1). They are **optional for the epic**: an accepted child is implemented after EP16F and reviewed with the EP16 unit; a deferred one becomes a backlog row (its ▲ ruling records the choice). The combined review waits for the accepted set; none blocks EP16F or the review of EP16A–EP16G. **Ruled 2026-11-18 ("Implement H, I ratify all decisions"): H and I accepted; J deferred → BL-16-05; K deferred → BL-16-09 (overrides the K recommendation).** | User request 2026-11-18 ("create stories for the upgrades, but make them optional for the epic… quantify their value for ADHD users 1/10"); planner (live session). |
| D16-19 | **EP16G added (security), queued first:** the EP16D refiner found, and the planner verified in `store.ts` and `AuthContext.tsx`, that no per-student RTK Query or onboarding state is reset on logout. A second student on the same tab can therefore see the first student's cached data for up to 60 s (300 s for the session slice). The gap predates EP16, but EP16's surfaces read those caches. It adds a new security invariant, and the planning-checklist rule calls for a plan review of EP16G; a focused review of that one story is recommended. | Planner, 2026-11-18. |

## Verification tasks

V-16-1…V-16-4 are defined in the [epic](../../epics/EP16-today-first-simplification.md#verification-tasks): V-16-1 copy audit (EP16B helper; every frontend child), V-16-2 route matrix (EP16A, EP16C; EP16F end-to-end), V-16-3 360×640 primary-control visibility (EP16F), V-16-4 unused-endpoint grep (EP16C).

## Backlog

Reviewed at every epic breakdown and every parent sign-off; list open rows across epics with `node tools/queue-lint.mjs --backlog docs/stories`. Status forms: [delivery-state](../../../.agents/delivery-state.md#backlog-register). Rows absorbed from other homes at this breakdown: BL-14-07 → EP16D; the Button item of BL-15-09 → EP16A (D16-14); BL-14-09 and BL-14-11 dropped as superseded by BL-15-08.

| ID | Item | Source | Why deferred | Revisit when | Owner | Last reviewed | Status |
|---|---|---|---|---|---|---|---|
| BL-16-01 | **Remove the unused `POST /study-plans/preview` + `PUT /study-plans` pair** once the web client calls only the catch-up pair | D16-4 (a) | API removal is outside a frontend-only epic; the endpoints are harmless while unused | EP16 has shipped and V-16-4 shows no caller for one full release, or the next API-cleanup story | planner | 2026-11-17 | Backlog |
| BL-16-02 | **Render the plan proposal on the EP15 week grid** and retire `PlanWeek` | D16-9 (a) | The EP15 grid is a week old; proposal/edit is a different mode; a follow-on epic once Today has landed | EP16 has shipped and a user asks to see the proposal against their calendar, or the next Plan-page story | planner | 2026-11-17 | Backlog |
| BL-16-03 | **Quick-capture assignment entry** — title-only add from Today, details later. *ADHD value 8/10 (2026-11-18 review): the tab bar (EP16E) puts Assignments one thumb-tap away, so a phone capture flow is now the natural next step; re-ranked, not re-scoped* | 2026-11-17 product review (honourable mention) | The seven-field form is EP03's contract; a capture mode needs its own defaults decision | A user asks, or the Today "Add assignment" control's abandonment is observed in a usage check | planner | 2026-11-17 | Backlog |
| BL-16-04 | **Reminders and notifications epic** — browser notifications for upcoming sessions; optional morning email digest | 2026-11-17 product review (#1); EP13 D13-8 | Needs the user's capability decision (scheduled jobs, notification permission) | The user approves the capability (D13-8) | user / planner | 2026-11-17 | Backlog |
| BL-16-05 | **Focus-session upgrades** — end-of-target cue, built-in break, first-subtask start step, "park it" box; **absorbs EP16J** (start the next session from the Focus empty state, 5/10 — spec ready in [EP16J](./EP16J-start-next-session-from-focus.md), D-J1 (b) 2026-11-18) | 2026-11-17 product review (#3) | Its own epic; reuses BL-16-04's permission if that lands first | EP16 has shipped, or a user asks | planner | 2026-11-17 | Backlog |
| BL-16-06 | **"Overdue" wording on `/assignments` and course pages** (`AssignmentRow.tsx:220`, EP03 surfaces) — EP16's copy rule replaces it with "Past due" on Today only | EP16B refinement, 2026-11-18 | Outside EP16's surfaces; the EP03/EP05 copy and its tests are a separate change | The next story that touches the assignments list or course detail page, or a user asks for consistent wording | planner | 2026-11-18 | Backlog |
| BL-16-09 | **Phone-first proposal** — the editor behind one **Adjust sessions** disclosure below `md` (ADHD value 8/10); full spec ready in [EP16K](./EP16K-phone-first-proposal.md) | EP16K deferral (▲ D-K1 (b), user, 2026-11-18) | The user chose H + I for this epic's unit | The next Plan-page story, or together with BL-16-02 (proposal on the EP15 grid) | planner | 2026-11-18 | Backlog |
| BL-16-08 | **"Verify your email" banner is ~290 px tall on a 360×640 phone**, pushing Today's hero below the fold for every unverified (i.e. new) student — measured by EP16F's V-16-3 check (F-EP16F-01: Start focus bottom at y ≈ 817 with the banner, in view once dismissed). A one-line phone variant (sentence + **Resend** + **Dismiss**) would restore AC-E16-02's intent for first-run students | EP16F, 2026-11-18 (F-EP16F-01) | EP01/SP-109 surface, outside EP16's children; EP16F asserts the Today contract with the banner dismissed | The next story touching the verification banner, or when a first-run usage check shows students not finding Start focus on phones | planner | 2026-11-18 | Backlog |
| BL-16-07 | **Login double redirect** — `PublicRoute` sends a new student to `/today` before `LoginPage` redirects again to `/onboarding`, so Today flashes first (same root cause as BL-14-07) | EP16D refinement, 2026-11-18 | EP16D fixes the menu-closing symptom only (D-D5); removing the double redirect changes the login flow's contract | EP16D has shipped, or a user reports seeing Today before onboarding | planner | 2026-11-18 | Backlog |

## Final implementation review unit

| Parent | In-scope children | Artifact paths | Index owner | Gate |
|---|---|---|---|---|
| [EP16](./README.md) | EP16A–EP16G plus the accepted EP16H and EP16I (D16-20; J/K deferred) | `./artifacts/EP16/` | EP16F's implementer writes the parent index; an accepted optional child appends its row | One combined EP16 review after EP16F and the accepted optional set — **passed 2026-11-18** (pass 2, [review.md](./artifacts/EP16/review.md)) |

Child implementation completion unblocks dependents; only the passing combined review establishes sign-off.
