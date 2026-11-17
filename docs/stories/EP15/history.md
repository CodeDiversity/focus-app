# EP15 history (cold)

## Origin

Planned 2026-11-16 from the user's vision ("a calendar-like interface where students can block availability and other events, and the remaining time is available for study; start and end time for each day; recurring events and recurring study sessions"). Acceptance criteria were agreed in chat before any story was written; the user then ratified every proposed decision (D15-1…D15-14) and asked for the full breakdown with **minimalism and ease of use for ADHD users at the forefront** (D15-14).

## Quality gate (planner, 2026-11-16)

| # | Check (planning-checklist) | Pass / Blocked / N/A + reference |
|---|---|---|
| 1 | Child separation and sizing | Pass — ten children, each one observable outcome with 3–5 ACs; splits recorded in the README's "Why" paragraph; no README-only or verification-only child |
| 2 | Original AC/TR coverage | Pass — AC-E15-01…14 each owned (README ownership table); TR-E15-01…11 assigned; EP04's carried-forward ACs re-owned by EP15E/EP15D |
| 3 | DoD obligations | Pass — DoD map in the README incl. 10 and 11 |
| 4 | Contract consistency and integration ownership | Pass — one `contracts.md`; EP15D owns the gathering seam both paths call; EP15J owns the E2E harness and the parent index |
| 5 | Code paths inspected; unverified disclosed | Pass — epic "Inspected baseline"; unverified items listed at the end of `contracts.md` |
| 6 | Feature risks/counterexamples and owning tests | Pass — `contracts.md` invariants table (ownership, course tie, free-time identity, bounds/busy, migration, determinism, colour/keyboard) |
| 7 | Dependency mapping and sequence | Pass — queue order with rationale; EP14 gate (D15-11); interim D15-15 recorded |
| 8 | Material (▲) decisions ruled or explicitly blocked | Pass — D15-1…D15-14 ratified by the user 2026-11-16; story ▲ rows auto-ratify (D15-17) |
| 9 | Correction log complete | Pass — empty (first plan) |
| 10 | Identifier consistency and at-a-glance blocks (`queue-lint` clean) | Pass — `node tools/queue-lint.mjs docs/stories/EP15` clean at breakdown |

**Outcome:** **Plan Ready** (planner gate) **+ Implementation Blocked** — EP14's review unit has not passed (D15-11). **Plan review required** (two migrations and a persisted-data contract; ten children) — dispatch before EP15A starts.

**Update 2026-11-16 (live session):** EP14's combined review round 2 passed (`1786732`) and plan review pass 3 is Plan Ready (`dc5b20b`) — Implementation Blocked lifted; EP15A set `Ready`, Next substory = EP15A.

**Refiner handoff (D15-16):** EP15E (grid), EP15G (block sheet), EP15H (direct manipulation). **Closed 2026-11-16:** one refiner dispatch settled all three (D-E5…D-E8, D-G6…D-G11, D-H5…D-H8); AC text unchanged; ▲ D-G10 and the ▲ story rows D-A1/D-A4/D-B1/D-B2 ruled under the user's blanket grant (D15-17); recorded assumptions: default start hour reads the browser clock for *today* only (a default, not date arithmetic); edit mode pre-fills from `GET /schedule/blocks`; grid `role="list"` kept for current locators; the plan page's `WeekGrid` is not borrowed.

**Backlog review (planner step 0, 2026-11-16):** `queue-lint --backlog` listed BL-14-01…05, BL-14-07, BL-14-08. BL-14-01 dropped as superseded by EP15 study blocks (D15-7); BL-14-02's trigger re-pointed at EP15's exceptions table; the rest stamped, triggers unchanged. New rows BL-15-01…06.

## Plan review history

| Pass | Date | Reviewed commit | Report | Verdict |
|---|---|---|---|---|
| 1 | 2026-11-16 | `a06838a` | [plan-review-pass-1.md](./plan-review-pass-1.md) | Changes Required — R-EP15-01…06 should-fix (planner), R-EP15-07…09 polish; no user ruling needed |
| 2 | 2026-11-16 | `bc48f54` | [plan-review-pass-2.md](./plan-review-pass-2.md) | Changes Required — R-EP15-01…09 closed; R-EP15-10…12 should-fix, R-EP15-13…16 polish (all planner) |
| 3 | 2026-11-16 | `8a29fbc` | [plan-review.md](./plan-review.md) | **Plan Ready** — R-EP15-10…13, 15, 16 closed; R-EP15-14 closed in Scope with polish residue; new polish R-EP15-17, R-EP15-18 (planner, optional); Implementation Blocked on the EP14 review unit (D15-11) |

## Plan correction log

| ID | Date | Finding | Correction | Status |
|---|---|---|---|---|
| C-EP15-01 | 2026-11-16 | R-EP15-01: engine rules described the pre-EP14E hook; tier/guard interaction undefined. | contracts rule 3 = two tiers, EP14E `byEnergyPreference(free, demanding, minBlock)` unchanged within each tier; EP15C notes/AC3/AC4 name EP14E + `hard`; tier/guard test added to TR-E15-03; epic baseline refreshed. | Fixed in plan — verified closed, plan review pass 2 ([plan-review-pass-2.md](./plan-review-pass-2.md), at `bc48f54`) |
| C-EP15-02 | 2026-11-16 | R-EP15-02: typecheck window EP15C→EP15D and E2E window EP15D→EP15J unrecorded; `save` dating loop uncited. | EP15C owns a thin service adapter (Scope/AC1); EP15D retires slot assertions and cites both loops; EP15E/EP15I texts aligned; D15-18 + contracts § Known windows. | Fixed in plan — verified closed, plan review pass 2 ([plan-review-pass-2.md](./plan-review-pass-2.md), at `bc48f54`) |
| C-EP15-03 | 2026-11-16 | R-EP15-03: "just this day" edit order/partial failure; cross-day weekly drag undefined. | EP15G-AC2 create-then-cancel with partial-failure copy + test; D-G1 reworded; EP15H-AC2 cross-day = just-this-day, announced, no prompt; D-H4 added; invariants row. | Fixed in plan — verified closed, plan review pass 2 ([plan-review-pass-2.md](./plan-review-pass-2.md), at `bc48f54`) |
| C-EP15-04 | 2026-11-16 | R-EP15-04: overlapping study blocks undefined. | contracts rule 2 D-J2 resolution (earlier start, tie `blockId`); EP15C-AC3 + overlap test; invariants row. | Fixed in plan — verified closed, plan review pass 2 ([plan-review-pass-2.md](./plan-review-pass-2.md), at `bc48f54`) |
| C-EP15-05 | 2026-11-16 | R-EP15-05: no rollback statements. | Migration 1 rollback recorded; Migration 2 declared irreversible with the backup stance; EP15A-AC1 / EP15I-AC4 reference them. | Fixed in plan — verified closed, plan review pass 2 ([plan-review-pass-2.md](./plan-review-pass-2.md), at `bc48f54`) |
| C-EP15-06 | 2026-11-16 | R-EP15-06: Plan health omitted from the Planning group. | EP15I-AC3/Tests/at-a-glance, epic baseline and D15-9 say Calendar, Plan, Plan health. | Fixed in plan — verified closed, plan review pass 2 ([plan-review-pass-2.md](./plan-review-pass-2.md), at `bc48f54`) |
| C-EP15-07 | 2026-11-16 | R-EP15-07 (polish): identity adapter unstated. | Hull-plus-gaps adapter rule in contracts rule 5 and EP15C-AC4. | Fixed in plan |
| C-EP15-08 | 2026-11-16 | R-EP15-08 (polish): `createdAt::date` zone. | Assumption recorded (D-A2, contracts Migration 1). | Fixed in plan |
| C-EP15-09 | 2026-11-16 | R-EP15-09 (polish): ▲ markers missing on material story rows. | ▲ added to D-A1, D-A4, D-B1, D-B2 (rulings unchanged under D15-17). | Fixed in plan |
| C-EP15-10 | 2026-11-16 | R-EP15-10: EP15G-AC2 "always asks" conflicted with ▲ D-G10 (series-level edits skip the prompt); weekly→one-off body unspecified. | EP15G-AC2 carries the D-G10 exception + `PATCH { weekdays: null, endDate: null, effectiveFrom }` wiring; contracts § PATCH semantics sentence; EP15B test named. | Fixed in plan — verified closed, plan review pass 3 ([plan-review.md](./plan-review.md), at `8a29fbc`; wording residue R-EP15-17, polish) |
| C-EP15-11 | 2026-11-16 | R-EP15-11: native `type="time"` cannot enter the ratified `24:00` sleep. | EP15F-AC2: `00:00` sleep = midnight, sent as `24:00`, shown as `00:00` with helper text (D-G6 mapping); TR-E15-06 test. | Fixed in plan — verified closed, plan review pass 3 ([plan-review.md](./plan-review.md), at `8a29fbc`) |
| C-EP15-12 | 2026-11-16 | R-EP15-12: E2E slot seeding (`helpers.ts:173–191`) and the `/availability` axe stop unrecorded in Known windows. | EP15D re-points seeding to the schedule API; EP15I retargets the axe stop; D15-18 and contracts § Known windows updated. | Fixed in plan — verified closed, plan review pass 3 ([plan-review.md](./plan-review.md), at `8a29fbc`) |
| C-EP15-13 | 2026-11-16 | R-EP15-13 (polish): `week.ts` bootstrap vs its own grep test. | Test allows exactly one `new Date(` inside `utcTodayGuess`. | Fixed in plan |
| C-EP15-14 | 2026-11-16 | R-EP15-14 (polish): `shared/ui/Switch.tsx` ownerless. | EP15F owns it; EP15G reuses (D-G9 text aligned). | Fixed in plan |
| C-EP15-15 | 2026-11-16 | R-EP15-15 (polish): EP15A baseline stale. | Line refs and last migration refreshed. | Fixed in plan |
| C-EP15-16 | 2026-11-16 | R-EP15-16 (polish): "fills study blocks first" scope. | contracts rule 3: per day (placement is day-centric). | Fixed in plan |
| C-EP15-17 | 2026-11-16 | R-EP15-14 residue, R-EP15-17, R-EP15-18 (plan review pass 3, polish). | `Switch.tsx` owned by EP15F in both Files lists; contracts weekly→one-off requires explicit `endDate: null`; EP15G wiring row 3 + at-a-glance carry D-G10; one midnight helper copy ("00:00 means midnight") in EP15F/EP15G; EP15F validates after the mapping. | Fixed in plan (polish; no re-review) |

## Implementation review history

| Pass | Date | Reviewed commit | Report | Verdict |
|---|---|---|---|---|
| 1 | 2026-11-17 | `c3f0892` | [artifacts/EP15/review.md](./artifacts/EP15/review.md) | **Pass** — no blocker or should-fix; polish R-EP15-19…21 open (optional). Reviewer re-ran all three gates: gated API `--runInBand` 85 suites 1778/0, web unit 1374/0, Playwright self-contained 62/0 (closing the external-stack-only disclosure of parent index § 6.1). |

## Implementation correction log

| ID | Date | Finding (original claim / consequence) | Disposition / closure evidence | Status |
|---|---|---|---|---|
| R-EP15-19 | 2026-11-17 | TR-E15-11 claims a recorded manual accessibility pass per surface; the screen-reader steps were executed on no surface and the EP15G/EP15H visual passes and OS reduce-motion toggle were not executed (no screen reader in the environment). Consequence: the screen-reader experience of the grid, sheets and drag announcements is unverified by a human. | Open (polish). Every child record carries verbatim VoiceOver/visual instructions; the review's DoD-11 section labels each step `Not executed — user instructions` as the DoD prescribes. Closed 2026-11-17: the user confirmed executing all remaining manual steps and that they passed ("Mark all human steps as passed"); recorded in the EP15E/F/G/H records and the [review addendum](./artifacts/EP15/review.md#addendum--r-ep15-19-closed-by-the-user-2026-11-17-recorded-by-the-live-session). | Closed — user-confirmed 2026-11-17 |
| R-EP15-20 | 2026-11-17 | (= F-EP15I-01.) The gated API suite is documented as single-worker, but nothing enforces it; `npx jest` with `DATABASE_URL` set runs parallel workers on one database and fails spuriously. Consequence: a future runner can record false reds. | Open (polish). Closure: `maxWorkers: 1` when the gate env is present, or a package script encoding `--runInBand`, committed and recorded. ([review.md](./artifacts/EP15/review.md) § Findings) | Open — polish (planner) |
| R-EP15-21 | 2026-11-17 | (= F-EP15J-02/-03.) Fixed e2e ports 4100/3100 and the config-derived throwaway DB name collide across worktrees; the pre-existing `adaptive-scheduling.spec.ts` journey 5 flakes under parallel machine load. Consequence: self-contained e2e runs are fragile with two concurrent sessions. | Open (polish). The reviewer's self-contained run at `c3f0892` passed 62/0 on free ports. Closure: env-derived ports/DB name (or per-worktree hash) and a serialization or longer wait for journey 5, committed and recorded. ([review.md](./artifacts/EP15/review.md) § Findings) | Open — polish (planner) |

## Superseded decisions

None.

## Epic closure

EP15 **closed 2026-11-17**: combined implementation review pass 1 passed at `c3f0892` (sync `c9b6ef2`); R-EP15-19 closed by user confirmation the same day; R-EP15-20/21 handed to the planner as backlog rows BL-15-07/BL-15-08; advisory UI findings batched as BL-15-09. M8 (release 1.2) delivered on the schedule side. EP15K was scheduled by the user as its own follow-up unit (see the queue).
