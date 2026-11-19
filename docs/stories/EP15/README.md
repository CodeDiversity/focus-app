# EP15 Story Breakdown — Schedule & Availability Redesign

**Epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 — release 1.2 (D15-11, ratified 2026-11-16)
**Epic dependency:** EP04, EP06, EP13 closed. **EP14 closed** — combined review round 2 passed 2026-11-16 (`1786732`), so D15-11's gate is met and implementation may start.
**Status:** Breakdown complete (planner, 2026-11-16). Quality gate: **Plan Ready** (Implementation Blocked lifted 2026-11-16 — EP14 closed) (see [history.md](./history.md)). **Plan review:** pass 1 ([plan-review-pass-1.md](./plan-review-pass-1.md)) Changes Required — R-EP15-01…09 closed; pass 2 ([plan-review-pass-2.md](./plan-review-pass-2.md)) Changes Required — R-EP15-10…16 corrected (C-EP15-10…16 in [history.md](./history.md)); pass 3 ([plan-review.md](./plan-review.md)) **Plan Ready** — R-EP15-10…13, 15, 16 closed; polish R-EP15-14 (residue), 17, 18 optional. No tracker sync. **Implementation review:** combined pass 1 **passed 2026-11-17** at `c3f0892` ([artifacts/EP15/review.md](./artifacts/EP15/review.md)); R-EP15-19 closed by user confirmation 2026-11-17 (review addendum); R-EP15-20/21 → BL-15-07/BL-15-08. **Epic closed 2026-11-17.**

## Plan at a glance

- **What this changes:** availability becomes "wake-to-sleep minus what is on the calendar": per-weekday day bounds, one-off and weekly events, study blocks the planner fills first, free time the calendar labels and the planner reads through one shared function; an hour-axis week grid with form, keyboard and drag paths; the old availability page and API retired.
- **Why it improves it:** students stop inventing time slots in advance and stop hitting `NO_AVAILABLE_TIME` (product); one gathering seam feeds both the calendar and the engine, so the two cannot disagree (code).
- **Decisions needing you:** none ▲ open — D15-1…D15-14 ratified 2026-11-16; story-level ▲ rows are listed per story and ratify by default at implementation start unless you edit them.
- **How to change this plan:** edit a Ruling cell in a story or in the epic register; ask the planner for AC or queue changes. Corrections and the quality gate live in [history.md](./history.md); shared contracts in [contracts.md](./contracts.md).

## Execution queue

**Delivery home:** `docs/stories/EP15/`

**Artifact root:** `./artifacts/` — one directory per child (`./artifacts/EP15A/`, …), plus `./artifacts/EP15/` for the parent index and combined review.

**Active substory:** None.

**Next substory:** None — EP15A–EP15K are Reviewed (EP15K's own unit passed 2026-11-18 on the user's manual-pass confirmation; [review.md](./artifacts/EP15K/review.md) + addendum). Next work is in the [EP16 queue](../EP16/README.md).

**Implementation owner:** `implementer`, one sequential writer across all layers (layer labels are scope, not concurrent roles).

**Final review:** one combined review for the EP15 unit (EP15A–EP15J) after EP15J; report at `./artifacts/EP15/review.md` with the DoD-11 section inside it — **passed 2026-11-17** (pass 1, reviewed commit `c3f0892`).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [EP15A](./EP15A-schedule-model-migration-and-recurrence-domain.md) | Reviewed | None — EP14 review unit passed 2026-11-16 (D15-11 met); plan review pass 3 Plan Ready (`dc5b20b`); ▲ D-A1/D-A4 ruled. | None — combined review passed 2026-11-17 | [implementation.md](./artifacts/EP15A/implementation.md) — green 2026-11-17 (gated 1663/0, 33 new); 0 open findings |
| [EP15B](./EP15B-schedule-api.md) | Reviewed | EP15A implemented. | None — combined review passed 2026-11-17 | [implementation.md](./artifacts/EP15B/implementation.md) — green 2026-11-17 (gated 1767/0, 104 new); 0 open findings; F-EP15B-01 fixed a latent `parseCalendarDate` 500 |
| [EP15C](./EP15C-engine-day-bounds-and-preferred-study-blocks.md) | Reviewed | EP15A implemented (shares the `domain/schedule` types). | None — combined review passed 2026-11-17 | [implementation.md](./artifacts/EP15C/implementation.md) — green 2026-11-17 (identity 15/15 vs the EP14E snapshot); 0 open findings; adapter carries windows as preferred (F-EP15C-01) |
| [EP15D](./EP15D-planner-gathering-and-calendar-read-model.md) | Reviewed | EP15A, EP15B, EP15C implemented. | None — combined review passed 2026-11-17 | [implementation.md](./artifacts/EP15D/implementation.md) — green 2026-11-17 (V-15-1 identity gated; `availability_slots` has no reader); 0 open findings |
| [EP15E](./EP15E-week-grid.md) | Reviewed | EP15D implemented (payload). Refined 2026-11-16 (D-E5…D-E8). | None — combined review passed 2026-11-17 | [implementation.md](./artifacts/EP15E/implementation.md) — green 2026-11-17 (web 1335/0, e2e see record); TR-E15-11 screen-reader step not executed; 0 open findings |
| [EP15F](./EP15F-day-bounds-ui.md) | Reviewed | EP15B + EP15E implemented. | None — combined review passed 2026-11-17 | [implementation.md](./artifacts/EP15F/implementation.md) — green 2026-11-17 (web 1363/0, e2e see record); TR-E15-11 screen-reader step not executed; 0 open findings |
| [EP15G](./EP15G-add-edit-delete-blocks-via-form.md) | Reviewed | EP15B + EP15E implemented. Refined 2026-11-16 (D-G6…D-G11; ▲ D-G10 ruled by user grant). | None — combined review passed 2026-11-17 | [implementation.md](./artifacts/EP15G/implementation.md) — green 2026-11-17 (web 1406/0; e2e not run in the worktree — see record); TR-E15-11 visual + screen-reader steps not executed; 0 open findings (F-EP15G-03/-04 noted) |
| [EP15H](./EP15H-direct-manipulation-on-the-grid.md) | Reviewed | EP15G implemented 2026-11-17 (the form it pre-fills). Refined 2026-11-16 (D-H5…D-H8). | None — combined review passed 2026-11-17 | [implementation.md](./artifacts/EP15H/implementation.md) — green 2026-11-17 (web 1437/0; e2e not run in the worktree — drag journey is EP15J's); TR-E15-11 visual/VoiceOver steps not executed; 0 open findings (F-EP15H-02/-03 noted) |
| [EP15I](./EP15I-retire-availability-and-update-navigation.md) | Reviewed | EP15G implemented (the replacement editor exists); EP15H implemented 2026-11-17. | None — combined review passed 2026-11-17 | [implementation.md](./artifacts/EP15I/implementation.md) — green 2026-11-17 (gated API 1778/0, web 1374/0; e2e deferred to EP15J); EP15I-AC2 search clean; F-EP15I-01 noted |
| [EP15J](./EP15J-cross-layer-e2e-and-parent-index.md) | Reviewed | EP15A–EP15I implemented 2026-11-17. | None — combined review passed 2026-11-17 ([review.md](./artifacts/EP15/review.md)) | [implementation.md](./artifacts/EP15J/implementation.md) — Playwright 62/0 × 3 (2026-11-17); F-EP15J-01 (caption target size) fixed; parent index [written](./artifacts/EP15/implementation.md) |
| [EP15K](./EP15K-calmer-weekly-drag-outcomes.md) | Reviewed | Own review unit (outside EP15A–EP15J). ▲ D-K1/D-K2 + D-K3 ratified (user, 2026-11-17). | None — unit review passed 2026-11-18 | [review.md](./artifacts/EP15K/review.md) — pass 2 + user manual-pass confirmation 2026-11-18; R-EP15K-01…05 closed |

Sequence (one writer): EP15A → EP15B → EP15C → EP15D → EP15E → EP15F → EP15G → EP15H → EP15I → EP15J. Why: the model and its copy migration first so every later child verifies against migrated data; the API before the engine so the service wiring (EP15D) lands on both; the read-only grid before any editor; the form path (EP15G) before the pointer path (EP15H) so keyboard parity exists before drag; retirement only once the replacement editor is live; E2E last over the final state. **Interim (D15-15):** between EP15D and EP15I the old `/availability` page still edits `availability_slots`, which nothing reads any more — acceptable on the development branch because the epic ships as one review unit.

## Stories

| Story | Outcome | Layer |
|---|---|---|
| [EP15A](./EP15A-schedule-model-migration-and-recurrence-domain.md) | Tables, copy migration, pure recurrence/day-bounds domain | Backend (persistence + pure domain) |
| [EP15B](./EP15B-schedule-api.md) | `/schedule/day-bounds` and `/schedule/blocks` API incl. split, delete-from, occurrence cancel | Backend |
| [EP15C](./EP15C-engine-day-bounds-and-preferred-study-blocks.md) | Engine: day-bounds base, dated busy, preferred study blocks, course tie, identity | Backend (pure domain) |
| [EP15D](./EP15D-planner-gathering-and-calendar-read-model.md) | One gathering seam; planner reads the new model; calendar payload `days[]` + new types | Backend |
| [EP15E](./EP15E-week-grid.md) | Hour-axis week grid, bounds shading, free time, new chips, profile-zone week (FU-EP04-01) | Frontend |
| [EP15F](./EP15F-day-bounds-ui.md) | Dismissible prompt + "when does your day start and end" sheet | Frontend |
| [EP15G](./EP15G-add-edit-delete-blocks-via-form.md) | Add / edit / delete events and study blocks through one sheet; weekly two-choice prompt; agenda parity | Frontend |
| [EP15H](./EP15H-direct-manipulation-on-the-grid.md) | Drag-select to create, drag to move, resize — pre-filling EP15G's sheet | Frontend |
| [EP15I](./EP15I-retire-availability-and-update-navigation.md) | Drop `availability_slots`, delete the module/page, redirect, nav update, docs | Backend + Frontend |
| [EP15J](./EP15J-cross-layer-e2e-and-parent-index.md) | `schedule.spec.ts`, calendar spec rewrite, axe gate, parent index | Integration |

**Why EP15C is its own pure-domain child** (EP06C/EP13F precedent): the ranking and identity invariants need deterministic unit tests without HTTP or persistence. **Why EP15G and EP15H are separate:** the form path is the accessibility baseline every action must have (AC-E15-10's "identical results"); the pointer path is an enhancement with its own interaction risk. **Why EP15F is not folded into EP15E:** it writes (PUT) where EP15E only reads, and it owns the first-run prompt. **Why a separate integration child exists:** EP15J adds a new Playwright suite over multi-step journeys the unit level cannot cover (bounds → event → free time shrinks → plan respects it; study block → plan fills it first; cancel one occurrence), plus the parent index.

## Epic acceptance criteria — ownership

Original wording in the [epic](../../epics/EP15-schedule-and-availability-redesign.md#acceptance-criteria-agreed-2026-11-16-stable-ids-ac-e15-0114-in-the-breakdown-readme); stable IDs assigned here.

| Epic AC (abbreviated) | Stable ID | Owner |
|---|---|---|
| Per-weekday wake/sleep; default + one-time dismissible prompt; nothing blocked | AC-E15-01 | **EP15A** (default reader), **EP15B** (API), **EP15F** (UI), EP15J |
| Planner never places outside day bounds | AC-E15-02 | **EP15C**, EP15D, EP15J |
| Add/edit/delete events, one-off or weekly with start/optional end | AC-E15-03 | **EP15B** (API), **EP15G** (UI), EP15A (model) |
| Cancel one occurrence; change from a date onward without altering earlier ones | AC-E15-04 | **EP15B** (split, cancel), **EP15G** (two-choice prompt) |
| Planner never places over events, classes, confirmed or locked/completed sessions | AC-E15-05 | **EP15C**, **EP15D** |
| Study blocks: course tie, energy; filled first; tied course preferred; energy semantics | AC-E15-06 | **EP15C** (engine), EP15B (fields), EP15G (UI) |
| Study blocks never reduce free time | AC-E15-07 | **EP15C**, EP15D |
| Calendar shows bounds, all items, free time; same function as the planner | AC-E15-08 | **EP15D** (payload + V-15-1), **EP15E** (rendering) |
| Server-owned date math; client no zone arithmetic; profile-zone week (FU-EP04-01) | AC-E15-09 | **EP15D** (server), **EP15E** (client week derivation) |
| Pointer create/move/resize; keyboard + form path with identical results | AC-E15-10 | **EP15G** (form + keyboard), **EP15H** (pointer) |
| Agenda offers the same create/edit/delete via the form | AC-E15-11 | **EP15G** |
| Every kind identifiable without colour; details on open | AC-E15-12 | **EP15E**, EP15G |
| Migration keeps all data; old page/API retired; redirect; nav updated | AC-E15-13 | **EP15A** (copy), **EP15I** (retire) |
| Determinism; ownership on every read/write; uniform 404 | AC-E15-14 | **EP15B**, **EP15C**, **EP15D** |

## Requirement and test traceability

The epic defines no TR IDs; stable TR IDs are assigned here.

| Req | Requirement | Owner |
|---|---|---|
| TR-E15-01 | Migration round-trip (V-15-2); `expandBlocks` matrix (one-off, weekly, end date, exceptions, DST day, 24:00); `readDayBounds` defaults | EP15A |
| TR-E15-02 | API: validation matrix per field; ownership matrix (foreign/missing/malformed → uniform 404); split and delete-from transactions; occurrence cancel idempotence; course 404 | EP15B |
| TR-E15-03 | Engine: bounds base, dated blocked, preferred-first ranking, course tie, energy from blocks, critical-work precedence, identity (EP15C-AC4), determinism (V-15-3), purity | EP15C |
| TR-E15-04 | Gathering seam used by both paths; calendar `days[]` shape; new event types; old types gone; V-15-1 free-time identity incl. DST and cancelled occurrence; catch-up path passes through | EP15D |
| TR-E15-05 | Grid rendering: hour axis, bounds shading, free-time labels, kind markers (text/icon), details; profile-zone week derivation with the 26-hour-spread case (FU-EP04-01 evidence a–d); agenda parity; states; keyboard; narrow | EP15E |
| TR-E15-06 | Bounds UI: prompt shown only when `configured: false`, dismiss persists for the session, sheet round-trip, "same every day" expansion, validation mirror, keyboard | EP15F |
| TR-E15-07 | Block sheet: create/edit/delete for both kinds; weekly switch + weekday chips; "More" fields; two-choice prompt wiring to `effectiveFrom` / `?from=` / occurrence cancel; 400/404/409 handling; agenda entry; keyboard | EP15G |
| TR-E15-08 | Pointer: drag-select pre-fills the sheet; move/resize PATCH; snapping; escape cancels; no pointer-only action lacks a form equivalent; reduced motion | EP15H |
| TR-E15-09 | Retirement: migration drops the table; no reference to `availability-slots`/`AvailabilitySlot`/`/availability` remains except the redirect; nav tests; docs | EP15I |
| TR-E15-10 | E2E: `schedule.spec.ts` journeys, `calendar.spec.ts` rewrite, axe gate on the grid and sheet with no allowlist, all suites green on the self-contained stack | EP15J |
| TR-E15-11 | Manual accessibility pass recorded for every new surface (keyboard, focus, screen reader, reduced motion, narrow screen) | EP15E, EP15F, EP15G, EP15H (recorded); EP15J (collected) |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | All children |
| 2 invalid-input validation | EP15B (API); EP15F, EP15G (client mirror); N/A EP15A, EP15C, EP15D (no new inputs), EP15E, EP15H (reuse EP15G's), EP15I, EP15J |
| 3 student data scoping | EP15A (migration keeps `userId`), EP15B, EP15D |
| 4 actionable API errors | EP15B; EP15F/EP15G surface them |
| 5 loading/empty/error states | EP15E, EP15F, EP15G, EP15H |
| 6 keyboard accessibility | EP15E, EP15F, EP15G, EP15H |
| 7 responsive layouts | EP15E, EP15F, EP15G (EP15H is pointer-only by design; agenda = form path) |
| 8 automated tests | All children (TR-E15-01…10); TR-E15-11 is a recorded manual pass |
| 9 API/migration documentation | EP15A, EP15I (migrations), EP15B, EP15D (contracts.md), EP15I (README API/schema lists), EP15J (parent index) |
| 10 integrated review | EP15 parent review unit |
| 11 reviewer walkthrough | Reviewer, once for the EP15 unit |

## Shared contracts

[contracts.md](./contracts.md): data model and the two migrations, recurrence semantics, API, calendar payload, engine input and rules, invariants, code baseline.

## Decision register

Epic-level decisions D15-1…D15-14 live in the [epic](../../epics/EP15-schedule-and-availability-redesign.md#decision-register-ratified-by-the-user-2026-11-16--material) (all ratified 2026-11-16). Breakdown-level additions:

| ID | Decision | Status / provenance |
|---|---|---|
| D15-15 | **Interim between EP15D and EP15I:** the old availability page keeps editing `availability_slots`, which no reader uses after EP15D; the table is dropped by EP15I. Accepted because the epic is one review unit on a development branch; nothing ships in between. | Planner, 2026-11-16. |
| D15-18 | **Known windows (R-EP15-02):** EP15C ships a thin service adapter so typecheck and every suite stay green until EP15D; EP15D retires the slot-event assertions in `calendar.spec.ts` and re-points `helpers.ts` availability seeding to the schedule API (test-only); EP15I removes the "Manage availability" expectation with the links and retargets the `/availability` axe stop; EP15J rewrites the spec. Details in [contracts.md § Known windows](./contracts.md#known-windows-between-sequential-children-r-ep15-02). | Planner, 2026-11-16 (plan review pass 1). |
| D15-16 | **Refiner gate (closed 2026-11-16 — one dispatch refined all three; D-E5…D-E8, D-G6…D-G11, D-H5…D-H8):** EP15E, EP15G and EP15H were `Needs refinement` — grid layout and hour range, free-time display threshold, the sheet's layout and weekday chips, the "More" disclosure, two-choice prompt copy, drag affordances and snapping are the refiner's, bound by D15-14. EP15F's small surface is specified in-story (EP13J precedent). | Planner skill UI/UX handoff rule. |
| D15-17 | **Story-level ▲ rows auto-ratify** at implementation start unless edited — the user's ruling "ratify all of the proposed decisions" (2026-11-16) covers the breakdown's recommended options. | User ruling 2026-11-16, applied by the planner. |

## Verification tasks

V-15-1…V-15-4 are defined in the [epic](../../epics/EP15-schedule-and-availability-redesign.md#verification-tasks) and owned as noted there (EP15D, EP15A, EP15C, EP15B/EP15D).

## Backlog

Reviewed at every epic breakdown and every parent sign-off; list open rows across epics with `node tools/queue-lint.mjs --backlog docs/stories`. Status forms: [delivery-state](../../../.agents/delivery-state.md#backlog-register).

| ID | Item | Source | Why deferred | Revisit when | Owner | Last reviewed | Status |
|---|---|---|---|---|---|---|---|
| BL-15-01 | **Cross-midnight day bounds** — a study day that ends after midnight (D15-4 option b) | D15-4 | Every engine rule (density, daily cap, rollover) is per civil day; splitting a bound across two dates changes "what is a study day" | A usage check after EP15J ships shows students setting `24:00` on three or more weekdays, or a user asks | planner | 2026-11-19 | Backlog |
| BL-15-02 | **"Only in my study blocks" toggle** — exclusive placement (D15-6 option c) | D15-6 | Re-creates the opt-in dead end D15-1 removes; no demand yet | A user asks for containment | planner | 2026-11-19 | Backlog |
| BL-15-03 | **Recurrence beyond weekly** — every N weeks, monthly | D15-5 | Weekly covers work, commute and term changes; alternating shifts unproven | A student reports an alternating-week shift pattern, or a user asks | planner | 2026-11-19 | Backlog |
| BL-15-04 | **External calendar import/sync** (ICS, Google, Outlook) | Epic out-of-scope list | MVP integrations exclusion; a sync model (read-only vs two-way, conflicts) is its own epic | The user lifts the integrations exclusion, or a student asks to import a calendar | planner / user | 2026-11-19 | Backlog |
| BL-15-05 | **Undo a cancelled occurrence** — restore "just this day" | D15-5 (cancel is one-way) | D15-14 keeps the editor to two choices; an undo toast is the likely shape | EP15G's refiner pass asks for undo, or a student reports cancelling by mistake | planner | 2026-11-17 | Promoted → [EP15K](./EP15K-calmer-weekly-drag-outcomes.md) |
| BL-15-06 | **Edit class meetings from the calendar** | Epic out-of-scope list | Meetings are course-owned (SP-112A); the calendar links to the course | A user asks | planner | 2026-11-19 | Backlog |
| BL-15-07 | **Enforce single-worker gated API runs** — `maxWorkers: 1` under `DATABASE_URL`, or a package script encoding `--runInBand` | R-EP15-20 / F-EP15I-01 | Test-infra change outside the EP15 review unit's scope; the documented invocation works | The next story that touches the API test harness, or a recorded false-red gated run | planner | 2026-11-19 | Backlog |
| BL-15-08 | **E2E harness robustness** — env-derived ports/throwaway-DB name (worktrees collide on 4100/3100), and the pre-existing `adaptive-scheduling` journey-5 flake under parallel load | R-EP15-21 / F-EP15J-02, -03 | Infra polish; the external-stack mode and free-port runs are both proven | The next e2e-touching story, or a second concurrent-session collision | planner | 2026-11-19 | Backlog |
| BL-15-09 | **UI polish batch** — stacked empty-week + bounds banners (F-EP15F-03); `shared/ui/Button` drops its accessible name while loading (F-EP15G-03 — **absorbed by EP16A**, EP16 D16-14); no `GET /schedule/blocks/:id` so edit reads the list (F-EP15G-04); React `act`-warning baseline in web page suites (F-EP15H-02) | EP15E–H advisory findings (review § Findings) | None blocks an AC; each is owned and worked around where user-facing | The next calendar/design-system story, or a user report | planner | 2026-11-19 | Backlog |

## Final implementation review unit

| Parent | In-scope children | Artifact paths | Index owner | Gate |
|---|---|---|---|---|
| [EP15](./README.md) | EP15A–EP15J | `./artifacts/EP15/` | EP15J's implementer writes the parent index | One combined EP15 review after EP15J — **passed 2026-11-17** (pass 1, `c3f0892`; [review.md](./artifacts/EP15/review.md)) |

Child implementation completion unblocks dependents; only the passing combined review establishes sign-off.
