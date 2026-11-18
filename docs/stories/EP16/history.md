# EP16 history (cold)

## Origin

Planned 2026-11-17 from the product review the user requested ("what feels like the next major feature or change?"). Of three recommendations — reminders, a merged daily surface, focus-session upgrades — the user chose the merged daily surface ("Definitely agree that #2 is our biggest opportunity"). The epic was drafted first with open questions; the user ruled D16-1, D16-3, D16-5, D16-6, D16-7 and D16-8 in chat the same day (navigation as recommended; tab bar included; Coming up cap 5 with a Past due badge; EP15K first; `/plan` loses the hero; momentum as one compact row — the planner's revised recommendation), then asked for the breakdown.

## Quality gate (planner, 2026-11-17)

| # | Check (planning-checklist) | Pass / Blocked / N/A + reference |
|---|---|---|
| 1 | Child separation and sizing | Pass — six children, each one observable outcome with 3–5 ACs; splits explained in the README's "Why" paragraph; no README-only or verification-only child |
| 2 | Original AC/TR coverage | Pass — AC-E16-01…14 each owned (README ownership table); TR-E16-01…06 assigned; AC-E16-07 wording amended before freeze (D16-18) |
| 3 | DoD obligations | Pass — DoD map in the README incl. 10 and 11; 2, 3, 9 N/A with reasons |
| 4 | Contract consistency and integration ownership | Pass — one `contracts.md` (routes, regions, copy, data path, indicator, nav); EP16F owns the e2e harness and the parent index |
| 5 | Code paths inspected; unverified disclosed | Pass — contracts § Code baseline with line references; three unverified items listed |
| 6 | Feature risks/counterexamples and owning tests | Pass — epic invariants table (reachability, indicator tenancy, locked-session preservation, never-lead-with-failure) each with an owning TR |
| 7 | Dependency mapping and sequence | Pass — queue order with rationale; EP15K-first ordering (D16-1); known windows (D16-17) |
| 8 | Material (▲) decisions ruled or explicitly blocked | Pass (updated 2026-11-17) — all ratified by the user ("ratify all", D16-16); initially Needs Decision on ▲ D16-2/D16-4/D16-9 and D-E1 |
| 9 | Correction log complete | Pass — empty (first plan); the AC-E16-07 amendment is logged below |
| 10 | Identifier consistency and at-a-glance blocks (`queue-lint` clean) | Pass — `node tools/queue-lint.mjs docs/stories/EP16` clean at breakdown |

**Outcome:** **Plan Ready** (updated 2026-11-17 after the user's "ratify all"; initially Needs Decision) **+ Implementation Blocked** (EP15K's review unit first, D16-1). **Plan review:** not required by the checklist rule (no migration or persisted-data contract, no new security/consistency invariant, six children); the user may request one.

**Refiner handoff (D16-15):** EP16B, EP16C, EP16D, EP16E. May run before EP15K finishes.

**Backlog review (planner step 0, 2026-11-17):** `queue-lint --backlog` listed 17 open rows. Fired triggers: BL-14-07 ("any work on the header/auth shell") → promoted to EP16D; BL-15-09's Button accessible-name item → EP16A (row stays open for its other items); BL-14-09 and BL-14-11 dropped as superseded by BL-15-08 (same flake and the same port collision, tracked once). All other rows stamped, triggers unchanged. New rows BL-16-01…05.

## Plan amendments at breakdown

| ID | Date | Change | Why |
|---|---|---|---|
| A-EP16-02 | 2026-11-18 | EP16D-AC3/AC4/AC5 wording, from the refiner's code findings. AC3 no longer cites a store logout reset (none existed; EP16G adds it). AC4 puts **Study history** on the Focus empty state's new heading row (no Focus page header exists). AC5 names the real trigger, a late programmatic `replace` redirect, not a `user` identity change. Observable outcomes unchanged. | The ACs described mechanisms the code does not have; they are corrected before freeze so the implementer is not held to a false premise. |
| A-EP16-03 | 2026-11-18 | EP16G added and queued first (D16-19). New invariant: no cross-student cached data. | Security finding, verified in code. The planning checklist calls for a plan review of the new invariant; a focused review of EP16G is recommended. |
| A-EP16-01 | 2026-11-17 | AC-E16-07: the plan-note link opens `/plan` instead of the proposal surface (epic text updated; D16-18). | A curious click on an informational sentence must not start a proposal fetch and open an editor; `/plan` shows the week and offers Replan. |

## Plan review history

None required at breakdown (checklist rule). The user's 2026-11-17 instruction ("if you need to do a plan review, do that") was checked against the rule: no migration, no persisted-data contract, no new invariant, six children — not run.

## Plan correction log

| ID | Date | Finding | Correction | Status |
|---|---|---|---|---|
| — | — | — | — | — |

## Superseded decisions

Decisions in other homes amended by EP16 (bidirectional references added 2026-11-17): EP11 D11-4/D11-6/D11-10 (→ D11-11 row), EP15 D15-9 (Planning group dissolved), EP13E D-E10/D-E13/D-E14, EP13K D-K9/D-K10, EP05 D05-6 (display only).

**Refinement (2026-11-18):** two refiner dispatches (EP16B+C, EP16D+E) set all four stories Ready and added the non-▲ rows D-B5…10, D-C5…10, D-D5…8 and D-E4…7.

Back-references for the planner:
- EP16D D-D5 refines EP10C D10-11 (drawer close on route change; register in the EP10/EP11 records).
- EP16E D-E5 refines EP11B's drawer labels.
- EP16C D-C5 refines D16-10.
- EP16B D-B6 refines D16-3 (badge look) and EP05B D05-18.

Planner follow-ups applied the same day: contracts known windows (EP16C e2e specs, EP16D nav e2e), BL-16-06 ("Overdue" on EP03 surfaces), BL-16-07 (login double redirect) and EP16G (security).
