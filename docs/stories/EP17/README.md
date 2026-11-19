# EP17 Story Breakdown — ADHD-Friendly Pacing and a One-Surface Plan Proposal

**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 — release 1.4 (proposed, D17-1)
**Epic dependency:** EP06, EP13, EP14, EP15, EP16 closed. No predecessor blocks the queue.
**Status:** Breakdown complete (planner, 2026-11-19). Quality gate: **Plan Ready** — every ▲ row ruled as recommended (user, 2026-11-19; D17-2 ruled (a) with a UI-visibility proviso, see the epic register); see [history.md](./history.md). **Plan review (required, D17-12): passed** — pass 1 Changes Required, corrections C-R-EP17-01…06 applied, pass 2 **Plan Ready** (2026-11-19, reviewed commit `005bc78`, [plan-review.md](./plan-review.md)); implementation may start with EP17A. No tracker sync.

## Plan at a glance

- **What this changes:** the scheduling engine gains a pacing objective so a week's work is spread across the days a student actually chose, instead of packed into the earliest ones; the proposal at `/plan/proposal` stops rendering the week twice and becomes one editable surface with a reachable confirm; and the spread levers become real preferences a student can change from the proposal itself.
- **Why it improves it:** "Plan my week" currently answers "when could this fit?" and returns two full days and a hollow Thursday, on a screen that makes moving one session a scavenger hunt. Afterwards it answers "what pace can I keep?" and shows it on one screen a student can nudge and confirm (product). In code, an implicit earliest-feasible objective becomes a stated, tested rule in a pure function, and a duplicated rendering of the same week disappears (code).
- **Decisions needing you:** none — every ▲ row ruled as recommended (user, 2026-11-19). ▲ D17-2 ruled (a) with a proviso: the study-days control must be visibly surfaced with its new instruction meaning (owned by EP17G, no new story).
- **How to change this plan:** edit a Ruling cell in a story or in the [epic register](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md#decision-register); ask the planner for AC or queue changes. Corrections and the quality gate live in [history.md](./history.md); engine rules, the preferences contract, the payload and the surface contract in [contracts.md](./contracts.md).

## Execution queue

**Delivery home:** `docs/stories/EP17/`

**Artifact root:** `./artifacts/` — one directory per child (`./artifacts/EP17A/`, …), plus `./artifacts/EP17/` for the parent index and the combined review.

**Active substory:** None (EP17G closed 2026-11-19).

**Next substory:** **EP17H** — EP17A–EP17G are implemented. EP17H owns the cross-layer e2e run (incl. TR-E17-06's "preset change re-plans", not run locally by EP17G) and the parent index. Dispatch an implementer.

**Implementation owner:** `implementer`, one sequential writer across all layers.

**Final review:** one combined review for the EP17 unit (EP17A–EP17H) after EP17H; report at `./artifacts/EP17/review.md` with the DoD-11 section inside it.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP17A](./EP17A-spread-preferences-contract.md) | Implemented — awaiting parent review | ▲ D17-2 ruled (a), ▲ D17-5 / ▲ D-A1 ratified (user, 2026-11-19). Plan review passed (pass 2, 2026-11-19). | Combined EP17 review after EP17H | [implementation.md](./artifacts/EP17A/implementation.md) — all 4 ACs met, 263 targeted tests green, legacy bag byte-identical, no migration; [plan-review.md](./plan-review.md) pass 2 Plan Ready |
| [EP17B](./EP17B-engine-daily-pacing.md) | Implemented — awaiting parent review | EP17A implemented (2026-11-19). ▲ D17-3 ruled (user, 2026-11-19). | Combined EP17 review after EP17H | [implementation.md](./artifacts/EP17B/implementation.md) — all 5 ACs met; rule 9 added, 96 scheduler tests green, 19/19 fixtures byte-identical at `spreadPercent 0`; F-EP17B-01 asks for a contracts §3 amendment |
| [EP17C](./EP17C-engine-study-day-selection.md) | Implemented — awaiting parent review | ▲ D17-2 ruled (a) and ▲ D-C2 ratified (user, 2026-11-19). EP17B implemented (2026-11-19). | Combined EP17 review after EP17H | [implementation.md](./artifacts/EP17C/implementation.md) — all 5 ACs met; rule 9b with a pass-aware budget (R-EP17-03), both carve-outs fixtured, 129 scheduler tests green, API suite 1338 passed / 0 failed; F-EP17C-02 is for EP17G |
| [EP17D](./EP17D-service-wiring-and-pacing-payload.md) | Implemented — awaiting parent review | EP17A–EP17C implemented (2026-11-19); ▲ D-D1 ratified (user, 2026-11-19). | Combined EP17 review after EP17H | [implementation.md](./artifacts/EP17D/implementation.md) — all 4 ACs met; `pacing` additive on both payloads, 1368 passed / 0 failed, both frozen snapshots untouched; F-EP17D-01…03. Also [F-EP17C-02-resolution.md](./artifacts/EP17D/F-EP17C-02-resolution.md) |
| [EP17E](./EP17E-editable-week-grid.md) | Implemented — awaiting parent review | EP17D implemented (2026-11-19). Refined 2026-11-19 (`40e1e22`); ▲ D17-4 and ▲ D-E1 ruled (user, 2026-11-19). | Combined EP17 review after EP17H | [implementation.md](./artifacts/EP17E/implementation.md) — all 8 ACs met; one `EditableWeek`, `PlanSessionEditor` deleted, human day labels; 105 targeted / 1455 full web tests green; F-EP17E-02 (pre-existing ISO dates in two EP16 cards) for the parent review |
| [EP17F](./EP17F-proposal-composition-and-decision.md) | Implemented — awaiting parent review | EP17E implemented (2026-11-19); refined 2026-11-19 (`40e1e22`); ▲ D-F1, ▲ D-F2, ▲ D-F7 ruled (user, 2026-11-19). Absorbs BL-16-09. | Combined EP17 review after EP17H | [implementation.md](./artifacts/EP17F/implementation.md) — all 6 ACs met; four regions, one fixed action bar above the tab bar, `shared/ui/Disclosure` new; 1472 web tests green, axe clean at two widths; F-EP17F-01 for the parent review |
| [EP17G](./EP17G-plan-time-pacing-controls.md) | Implemented — awaiting parent review | EP17F implemented (2026-11-19); refined 2026-11-19 (`40e1e22`); ▲ D17-8 / ▲ D-G1 / ▲ D-G5 ruled (user, 2026-11-19); D-G6…D-G9 ratified by default 2026-11-19. | Combined EP17 review after EP17H | [implementation.md](./artifacts/EP17G/implementation.md) — all 5 ACs met; `PresetRadioGroup` extracted to `shared/ui`, `PacingControls` behind "Change the pace", non-destructive `replan()`, Profile parity, ▲ D17-2 re-legend; 1512 web tests green; F-EP17G-01…03 |
| [EP17H](./EP17H-cross-layer-e2e-and-parent-index.md) | Queued | EP17A–EP17G implemented. | Implement last | — |

Sequence (one writer): EP17A → EP17B → EP17C → EP17D → EP17E → EP17F → EP17G → EP17H. Why: the preferences contract first, because both engine children read it; pacing before study-day selection, because "spread within the chosen days" needs something to spread; the service wiring once the engine is settled, so the payload is written once; the editable week before the page that composes it; the preset controls last among the frontend children, because they need a slot in the recomposed surface and the `pacing` values to display; integration over the final state. **Known windows** between children are listed in [contracts.md §7](./contracts.md#7-known-windows-between-sequential-children).

## Stories

| Story | Outcome | Layer |
|---|---|---|
| [EP17A](./EP17A-spread-preferences-contract.md) | The spread lever exists end to end in the preferences contract; every pre-EP17 bag still reads back valid | Backend (domain contract) |
| [EP17B](./EP17B-engine-daily-pacing.md) | The engine spreads an assignment's work across its horizon instead of front-loading it, without losing minutes or missing a deadline | Backend (pure domain) |
| [EP17C](./EP17C-engine-study-day-selection.md) | The planner uses at most the chosen number of study days, picked from availability, and spreads inside them | Backend (pure domain) |
| [EP17D](./EP17D-service-wiring-and-pacing-payload.md) | The paced engine reaches real students; the proposal payload carries a `pacing` block | Backend (module + API) |
| [EP17E](./EP17E-editable-week-grid.md) | One editable week; the duplicate read-only grid and editor list collapse; human day labels | Frontend |
| [EP17F](./EP17F-proposal-composition-and-decision.md) | A proposal composed around the decision, with a reachable confirm and a phone-first layout | Frontend |
| [EP17G](./EP17G-plan-time-pacing-controls.md) | Spread presets reachable from the proposal with an immediate re-preview; Profile parity | Frontend |
| [EP17H](./EP17H-cross-layer-e2e-and-parent-index.md) | End-to-end journeys, the protective gates, and the parent index | Integration |

**Why EP17B and EP17C are separate:** each is an independently verifiable change to the engine's documented rule list with its own fixtures, and EP17C is the one gated by ▲ D17-2 — keeping them together would block the pacing work behind an open decision. **Why EP17E and EP17F are separate (D17-4 splitting):** the user expected the in-place editing slice to be the largest, and it is two outcomes — "a session is edited where it is drawn" and "the page is composed around the decision" — each useful and verifiable alone. **Why EP17G is not folded into EP17F:** it is the only child that writes, it touches a second surface (Profile), and it carries the ▲ persistence decision. **Why a separate integration child exists:** the journeys span the engine, the API and the rebuilt surface, and the protective gates (identity, determinism, baseline) are real work with recorded evidence.

## Epic acceptance criteria — ownership

Original wording in the [epic](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md#acceptance-criteria-draft--stable-ids-ac-e17-0114-assigned-at-breakdown); stable IDs assigned here. Bold = primary owner.

| Epic AC (abbreviated) | Stable ID | Owner |
|---|---|---|
| An assignment with slack takes at most its daily pacing target; work is distributed across its horizon | AC-E17-01 | **EP17B** |
| Feasibility still wins; pacing introduces no new deadline miss | AC-E17-02 | **EP17B**, EP17C |
| No minutes lost; existing deficit/deferred fields and categories unchanged | AC-E17-03 | **EP17B**, EP17C |
| Engine stays pure and deterministic; pacing "off" is byte-identical | AC-E17-04 | **EP17B**, EP17C, EP17H (gate) |
| At most the chosen number of study days, deterministically selected; seven reproduces today | AC-E17-05 | **EP17C** |
| New spread key(s) additive; legacy bag valid; validator, reader, projection, merge all cover them | AC-E17-06 | **EP17A** |
| `weeklyGoalDays` means one thing; no decorative instruction | AC-E17-07 | **EP17C**, EP17A (docs), EP17G (copy) |
| Spread levers changeable from the proposal with an immediate re-plan; Profile parity | AC-E17-08 | **EP17G**, EP17D (payload half) |
| The week renders once and is edited in place | AC-E17-09 | **EP17E** |
| Human day labels; no raw ISO date shown | AC-E17-10 | **EP17E**, EP17F |
| One confirm and one decline, reachable from the editing area on desktop and phone | AC-E17-11 | **EP17F** |
| Every EP16C guarantee survives (conflicts, warnings, calibration, keeps, moved forward, locked rows) | AC-E17-12 | EP17E (per session), **EP17F** (page), EP17H (locked-row journey) |
| Keyboard, focus, reduced motion, WCAG 2.2 AA, copy rules on the rebuilt proposal | AC-E17-13 | EP17E, **EP17F**, EP17G; EP17H (axe) |
| Engine specs updated deliberately with reasons; identity and determinism gates pass; no route added or removed | AC-E17-14 | EP17B, EP17C (spec diffs), EP17D (routes), **EP17H** (gates) |

## Requirement and test traceability

| Req | Requirement | Owner |
|---|---|---|
| TR-E17-01 | Domain unit tests for pacing: spread with slack, no spread when tight, the many-small-assignments counterexample, the minute-sum invariant **per deficit category** (R-EP17-02: non-overdue — placed + deficit + deferred = remaining; `OVERDUE` — deficit = remaining, placed reported alongside) | **EP17B**, EP17C |
| TR-E17-02 | Determinism and byte-identical-at-"off" compatibility over a fixture battery | **EP17B**, EP17C; EP17H re-runs the gate |
| TR-E17-03 | Preferences contract tests incl. the frozen legacy-bag fixture | **EP17A** |
| TR-E17-04 | API tests for the `pacing` payload and the plan-time write + re-preview, with ownership scoping | **EP17D**, EP17G (client half) |
| TR-E17-05 | Component tests for the editable grid and the recomposed surface: every edit by keyboard and pointer, states, announcements, conflicts, copy audit | **EP17E**, EP17F, EP17G |
| TR-E17-06 | Playwright: spread + in-place nudge + confirm; preset change re-plans; locked session survives a replan; axe on the rebuilt proposal | **EP17H** |
| TR-E17-07 | The recorded, reviewed `scheduler.spec.ts` diff — each changed expectation names the rule that changed it | **EP17B**, EP17C |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | EP17A (bounds, cross-field), EP17G (preset/form input); engine children N/A (pure function, no input surface) |
| 3 student data scoping | EP17A (both preference routes), EP17D (both proposal reads), EP17G (the write reuses the scoped endpoint); others N/A — no new read or write |
| 4 actionable API errors | EP17A (field-level preference errors), EP17G (failed write / failed re-preview), EP17F (existing confirm errors preserved) |
| 5 loading/empty/error states | EP17E, EP17F, EP17G |
| 6 keyboard accessibility | EP17E, EP17F, EP17G |
| 7 responsive layouts | EP17E, EP17F, EP17G |
| 8 automated tests | All children |
| 9 API/migration documentation | EP17A (preferences contract), EP17B/EP17C (engine rule list), EP17D (payload) — all in [contracts.md](./contracts.md); **no migration** (▲ D17-5 (a)) |
| 10 integrated review | EP17 parent review unit |
| 11 reviewer walkthrough | Reviewer, once for the EP17 unit |

## Shared contracts

[contracts.md](./contracts.md): the inspected code baseline, the spread
preference levers, the pacing rule, study-day selection, the `pacing` payload
block, the proposal surface contract, and the known windows between children.

## Decision register

Epic-level decisions D17-1…D17-11 and ▲ D17-16 (refines ▲ D17-2) live in the
[epic](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md#decision-register).
All decisions ruled: every row ratified as recommended (user, 2026-11-19);
▲ D17-2 ruled (a) with a UI-visibility proviso (epic register). No open ▲ rows.
Breakdown-level additions:

| ID | Decision | Status / provenance |
|---|---|---|
| D17-12 | **Plan review is required** for this breakdown: the preferences bag gains persisted keys, which the planning-checklist counts as a new persisted-data contract. Eight children is at the rule's threshold, not over it, so the contract change is the trigger. The review should focus on EP17A (contract, backward compatibility) and EP17B/EP17C (the purity and no-silent-loss invariants). | Planner, 2026-11-19 (planning-checklist "When a plan review is required"). |
| D17-13 | **Backlog absorbed at this breakdown:** BL-16-02 → **partly promoted** to [EP17E](./EP17E-editable-week-grid.md) (the proposal's own grid becomes editable); its "render on the EP15 calendar grid" half stays deferred and keeps the row open. BL-16-09 → **promoted** to [EP17F](./EP17F-proposal-composition-and-decision.md) (the phone-first proposal; the EP16K spec is the input). Every other open row was reviewed and its trigger has not fired; `Last reviewed` stamped 2026-11-19 in its own home. | Planner, 2026-11-19 (`queue-lint --backlog`, delivery-state backlog register). |
| D17-14 | **▲ D17-2 is recommended, not ruled.** The user's 2026-11-19 message ("not clear to me what weeklyGoalDays is") delegated the call to the planner. The planner recommends option (a) — the key becomes a planning instruction — and records it ▲ and `Proposed` rather than self-ratifying, because it changes a persisted preference's meaning for every student who already set it. It blocks EP17C only; EP17A and EP17B proceed without it once their own rows are ruled. **Resolved:** ruled (a) (user, 2026-11-19) with the proviso that the study-days control is visibly surfaced with its new meaning (EP17G owns it; no new story). | Planner, 2026-11-19; ruled by user, 2026-11-19. |
| D17-15 | **The 1035-line `scheduler.spec.ts` diff is planned work, not a surprise:** D17-7 (a) requires each changed expectation to name the rule that changed it (TR-E17-07), and a frozen pre-EP17 baseline fixture preserves the old behaviour as an executable test rather than as a deleted assertion. | Planner, 2026-11-19. |

## Verification tasks

V-17-1…V-17-5 are defined in the
[epic](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md#verification-tasks):
V-17-1 pacing smoke (EP17B), V-17-2 the many-small-assignments counterexample
(EP17B), V-17-3 byte-identical baseline (EP17B, re-run by EP17H), V-17-4 no
raw ISO date rendered (EP17E), V-17-5 the 360×640 confirm reach (EP17F,
asserted by EP17H).

## Backlog

Reviewed at every epic breakdown and every parent sign-off; list open rows
across epics with `node tools/queue-lint.mjs --backlog docs/stories`. Status
forms: [delivery-state](../../../.agents/delivery-state.md#backlog-register).
Rows absorbed from other homes at this breakdown are recorded in D17-13; the
rows themselves live in their own home's register
([EP16](../EP16/README.md#backlog)).

| ID | Item | Source | Why deferred | Revisit when | Owner | Last reviewed | Status |
|---|---|---|---|---|---|---|---|
| BL-17-01 | **Intra-gap placement** — a block always starts at `interval.startMinute` (`scheduler.ts:437-469`), so sessions hug the top of the earliest gap even when the day has room to breathe; centring or distributing them inside a gap would smooth the *day* as EP17B smooths the *week* | D17-9 (a) | Cosmetic next to the day-level objective, and it would perturb a large share of the 1035-line engine spec for little student-visible gain | EP17 has shipped and a student reports their day feeling back-to-back despite the pacing, or the next engine story | planner | 2026-11-19 | Backlog |
| BL-17-02 | **Name the weekdays you study** — let a student pick Mon/Wed/Fri explicitly instead of a count the engine chooses days for | EP17C D-C3 | A second control and a second persisted contract; the count plus availability-based selection is the smaller change that answers the stated problem | A student asks for specific days, or a usage check shows the selected days repeatedly rejected by in-place edits | planner | 2026-11-19 | Backlog |
| BL-17-03 | **Placement explainability for pacing** — "this is on Thursday because your week is spread across 3 days" | EP17 breakdown, 2026-11-19; related to BL-14-03 | BL-14-03's trigger has not fired; explanation UI is its own design problem and EP17 already adds one summary sentence | BL-14-03 is promoted, or a student asks why a session landed on a given day | planner | 2026-11-19 | Backlog |

## Final implementation review unit

| Parent | In-scope children | Artifact paths | Index owner | Gate |
|---|---|---|---|---|
| [EP17](./README.md) | EP17A–EP17H | `./artifacts/EP17/` | EP17H's implementer writes the parent index | One combined EP17 review after EP17H; the required plan review (D17-12) **passed** — pass 2 Plan Ready, 2026-11-19 |

Child implementation completion unblocks dependents; only the passing
combined review establishes sign-off.
