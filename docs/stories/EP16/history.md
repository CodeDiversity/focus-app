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
| F-EP16F-01 | 2026-11-18 | EP16F's V-16-3 check: at 360×640 the unverified-email banner (EP01 surface) pushes Today's hero to y ≈ 817 for every new student. | Not an EP16 surface → BL-16-08; `today.spec.ts` records the measurement as an annotation and asserts AC-E16-02 with the banner dismissed. | Deferred — BL-16-08 |
| F-EP16F-02 | 2026-11-18 | After **Use this plan**, Today showed "No plan for today yet": the confirm writes through the entity client, so the RTK `todayPlan`/`calendar`/`recoverySummary` caches served the pre-plan result (≤ 60 s). Found by `today.spec.ts` (b); invisible to unit tests. | Fixed in the owning child (EP16C): `PlanProposal` resets the three caches before navigating; unit test + e2e. | Fixed in code |
| F-EP16F-03 | 2026-11-18 | AC-E16-04 "minutes appear once": the hero's done block repeated the badge's minutes ("25 minutes studied today. Anything else is a bonus."). Found by `today.spec.ts` (c). | Fixed in the owning child (EP16A hero / EP13D copy): the done sentence is "Anything else today is a bonus."; the badge alone carries the minutes. | Fixed in code |
| F-EP16F-04 | 2026-11-18 | axe on the proposal's 409 state: `text-danger` on `bg-danger/10` fails 4.5:1 (serious ×2) — unreachable by any earlier axe stop. | Fixed in the owning child (EP16C): `danger-strong` token (EP14D D-D2 precedent) on the conflict summary. Other `text-danger`-on-tint blocks (TodayPlanCard/Focus error states) are unexercised by axe and flagged for the combined review. | Fixed in code |

## Superseded decisions

Decisions in other homes amended by EP16 (bidirectional references added 2026-11-17): EP11 D11-4/D11-6/D11-10 (→ D11-11 row), EP15 D15-9 (Planning group dissolved), EP13E D-E10/D-E13/D-E14, EP13K D-K9/D-K10, EP05 D05-6 (display only).

**Refinement (2026-11-18):** two refiner dispatches (EP16B+C, EP16D+E) set all four stories Ready and added the non-▲ rows D-B5…10, D-C5…10, D-D5…8 and D-E4…7.

Back-references for the planner:
- EP16D D-D5 refines EP10C D10-11 (drawer close on route change; register in the EP10/EP11 records).
- EP16E D-E5 refines EP11B's drawer labels.
- EP16C D-C5 refines D16-10.
- EP16B D-B6 refines D16-3 (badge look) and EP05B D05-18.

Planner follow-ups applied the same day: contracts known windows (EP16C e2e specs, EP16D nav e2e), BL-16-06 ("Overdue" on EP03 surfaces), BL-16-07 (login double redirect) and EP16G (security).

**User rulings 2026-11-18:** "D-G1 ratify all" — EP16G's ▲ D-G1 (a) and D-G2 (a) ratified; the user instructed implementation to continue directly ("Continue to implement EP16G, and then also implement EP16B this turn"), so the plan review the checklist calls for on the new security invariant (D16-19) was **not run** — recorded as the user's decision; the EP16 combined review covers EP16G.

**Optional children (2026-11-18, D16-20):** after EP16E the user asked for an ADHD review of the shipped EP16 code and stories for the upgrades, optional for the epic, each with a 1–10 ADHD value score. Planner (live session) added EP16H (paused-session nudge, 7/10), EP16I (target in the strip, 6/10), EP16J (start from Focus, 5/10) and EP16K (phone-first proposal, 8/10), each gated by a ▲ acceptance row; BL-16-03 (quick capture) re-ranked 8/10 without a new story. Refinement is required only for EP16K if accepted.

**User rulings 2026-11-18 ("Implement H, I ratify all decisions"):** ▲ D-H1 and ▲ D-I1 accepted (EP16H, EP16I join the review unit; D-H2/D-H3/D-I2 ratified as recommended); ▲ D-J1 ratified (b) and ▲ D-K1 **overridden to (b)** — EP16J folded into BL-16-05, EP16K → BL-16-09. The same instruction accepted every owed TR-E16-04 manual pass ("mark all manual passes as passed/accepted") — recorded in the child records and the parent index as user-accepted without machine verification.

**User ruling 2026-11-18 ("cancel the other optional EP16 stories for now"):** EP16J and EP16K confirmed cancelled for this epic; their specs stay reachable through BL-16-05 and BL-16-09 ("for now" keeps the door open). The combined review unit is EP16A–EP16I.

**Review round 1 (2026-11-18, reviewer, fresh session):** verdict Changes Required — R-EP16-01 (should-fix): EP16C's `/plan` and `/plan/proposal` error states used `text-danger` on `bg-danger/10` (< 4.5:1), the same pair as F-EP16F-04, unreachable by any axe stop. **Fix applied by the implementer the same day:** `text-danger-strong` on both EP16C sites **and** (R-EP16-02 folded in, as the reviewer offered) the five sibling tinted error texts (`TodayPlanCard` ×2, `FocusPage`, `WorkloadWarnings`, `RemainingWorkSection`); class assertions added to the PlanProposal and PlanPage error tests. R-EP16-03 → already BL-16-08; R-EP16-04 → already BL-15-08 (EP15 home). Pass 2 requested.

## Combined review — quality gate (reviewer, 2026-11-18)

**Review round 2 (2026-11-18, reviewer, same fresh session): PASS at `4f9ecd1`** ([review.md](./artifacts/EP16/review.md); round 1 moved verbatim to [review-round-1.md](./artifacts/EP16/review-round-1.md)). The unit EP16A–EP16I is **Reviewed**. Reviewer-verified evidence at `4f9ecd1`: focused vitest over every fix-touched area 133/0 (incl. the two new class assertions); tsc + eslint clean; the three EP16 e2e specs self-contained 20/0 (all axe stops); token computation `danger-strong` ≈ 5.54:1 on the tint; grep sweep — no tinted `text-danger` left in the seven corrected files. Full-suite context: reviewer full vitest green at pass 1 (`0827fe4`, 1440/0); at `4f9ecd1` three cross-session-load `waitFor` timeouts in EP16-untouched suites (CourseForm, CalendarPage) passed 213/213 in isolation; implementer-provided 1440/0 at `4f9ecd1`. Correction log per finding:

| ID | Original claim / gap | Consequence | Disposition / closure evidence | Report |
|---|---|---|---|---|
| R-EP16-01 | EP16C's `/plan` + `/plan/proposal` error states on the failing `text-danger`/`bg-danger/10` pair (AC-E16-12); parent index mislabelled them "pre-existing" | AA contrast failure (~4.14:1) on two EP16 surfaces; inaccurate index claim | **Closed** — `4f9ecd1`: `text-danger-strong` (≈ 5.54:1) + class assertions; index § 6 item 3 corrected; reviewer re-verified in code, tests and computation | review.md pass 2 |
| R-EP16-02 | Same pair on the five sibling sites named in round 1 | Latent AA debt adjacent to the fix | **Closed** — folded into `4f9ecd1`; reviewer grep confirms all five | review.md pass 2 |
| R-EP16-03 | AC-E16-02 residual for unverified students (email banner at 360×640) | New students' first-run hero below the fold | **Open — polish, tracked by BL-16-08** (pre-existing row; with-banner check user-accepted 2026-11-18) | review-round-1.md |
| R-EP16-04 | Full e2e suite not reliably green in one pass under cross-session load | CI/review friction, no product defect (all journeys green in isolation) | **Open — polish, tracked by BL-15-08** (EP15 home) | review-round-1.md |
| R-EP16-05 | (new, round 2) the same tinted `text-danger` pair across pre-EP16 surfaces — page error blocks (Assignments/Calendar/Study history), ~14 dialog/form error boxes, the `danger` Badge/`OVERDUE_STYLE` tinted badges | Pre-existing AA debt outside EP16's obligation | **Open — polish, planner**: wants one backlog row for an app-wide `danger-strong` sweep | review.md pass 2 |
