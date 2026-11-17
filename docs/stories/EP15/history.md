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

**Refiner handoff (D15-16):** EP15E (grid), EP15G (block sheet), EP15H (direct manipulation).

**Backlog review (planner step 0, 2026-11-16):** `queue-lint --backlog` listed BL-14-01…05, BL-14-07, BL-14-08. BL-14-01 dropped as superseded by EP15 study blocks (D15-7); BL-14-02's trigger re-pointed at EP15's exceptions table; the rest stamped, triggers unchanged. New rows BL-15-01…06.

## Plan review history

| Pass | Date | Reviewed commit | Report | Verdict |
|---|---|---|---|---|
| 1 | 2026-11-16 | `a06838a` | [plan-review.md](./plan-review.md) | Changes Required — R-EP15-01…06 should-fix (planner), R-EP15-07…09 polish; no user ruling needed |
| 2 | — | — | — | Pending (after the EP15E/G/H refiner passes) |

## Plan correction log

| ID | Date | Finding | Correction | Status |
|---|---|---|---|---|
| C-EP15-01 | 2026-11-16 | R-EP15-01: engine rules described the pre-EP14E hook; tier/guard interaction undefined. | contracts rule 3 = two tiers, EP14E `byEnergyPreference(free, demanding, minBlock)` unchanged within each tier; EP15C notes/AC3/AC4 name EP14E + `hard`; tier/guard test added to TR-E15-03; epic baseline refreshed. | Fixed in plan — awaiting re-review |
| C-EP15-02 | 2026-11-16 | R-EP15-02: typecheck window EP15C→EP15D and E2E window EP15D→EP15J unrecorded; `save` dating loop uncited. | EP15C owns a thin service adapter (Scope/AC1); EP15D retires slot assertions and cites both loops; EP15E/EP15I texts aligned; D15-18 + contracts § Known windows. | Fixed in plan — awaiting re-review |
| C-EP15-03 | 2026-11-16 | R-EP15-03: "just this day" edit order/partial failure; cross-day weekly drag undefined. | EP15G-AC2 create-then-cancel with partial-failure copy + test; D-G1 reworded; EP15H-AC2 cross-day = just-this-day, announced, no prompt; D-H4 added; invariants row. | Fixed in plan — awaiting re-review |
| C-EP15-04 | 2026-11-16 | R-EP15-04: overlapping study blocks undefined. | contracts rule 2 D-J2 resolution (earlier start, tie `blockId`); EP15C-AC3 + overlap test; invariants row. | Fixed in plan — awaiting re-review |
| C-EP15-05 | 2026-11-16 | R-EP15-05: no rollback statements. | Migration 1 rollback recorded; Migration 2 declared irreversible with the backup stance; EP15A-AC1 / EP15I-AC4 reference them. | Fixed in plan — awaiting re-review |
| C-EP15-06 | 2026-11-16 | R-EP15-06: Plan health omitted from the Planning group. | EP15I-AC3/Tests/at-a-glance, epic baseline and D15-9 say Calendar, Plan, Plan health. | Fixed in plan — awaiting re-review |
| C-EP15-07 | 2026-11-16 | R-EP15-07 (polish): identity adapter unstated. | Hull-plus-gaps adapter rule in contracts rule 5 and EP15C-AC4. | Fixed in plan |
| C-EP15-08 | 2026-11-16 | R-EP15-08 (polish): `createdAt::date` zone. | Assumption recorded (D-A2, contracts Migration 1). | Fixed in plan |
| C-EP15-09 | 2026-11-16 | R-EP15-09 (polish): ▲ markers missing on material story rows. | ▲ added to D-A1, D-A4, D-B1, D-B2 (rulings unchanged under D15-17). | Fixed in plan |

## Superseded decisions

None.
