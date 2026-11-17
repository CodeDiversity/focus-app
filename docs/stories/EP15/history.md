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
| — | — | — | — | Required; not yet run |

## Plan correction log

| ID | Date | Finding | Correction | Status |
|---|---|---|---|---|
| — | — | — | — | Empty — first plan |

## Superseded decisions

None.
