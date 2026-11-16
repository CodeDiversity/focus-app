# EP13 combined review — Adaptive Scheduling for ADHD (parent review unit)

**Date:** 2026-11-16 · **Pass:** 2 (re-review) · **Reviewed commit:** `619faef` (clean tree)
**Scope:** EP13A–EP13N incl. EP13H2 (15 application children; EP13P/EP13Q outside the unit, D13-18/D13-19)
**Reviewer:** `reviewer` role, assignment `parent_review`, round 2. Round 1 (does not pass, R-EP13-01…05) is preserved verbatim at [`review-round-1.md`](./review-round-1.md); this round re-verifies only what changed since `210f76c` (commits `5e3fe2a`, `619faef`) plus cross-child behavior, and cites round-1 evidence for everything untouched.

## Verdict

**Passes.** No blocker or should-fix finding remains open. All five round-1 findings are dispositioned below with fresh evidence: R-EP13-01, R-EP13-02, R-EP13-04 and R-EP13-05 are **resolved**; R-EP13-03 **stays open as a pre-existing, registered, non-gating finding** (verified identical at baseline `9ffd854` in round 1; registered as D-R14 in [`EP13R`](../../EP13R-follow-up-register-and-triage.md); same standing as F-EP13M-01/-02/-06 under the D-M5 precedent — no new evidence that any of the four failures is EP13-caused).

## Prior findings disposition (round 1 → round 2)

| ID | Round-1 severity | Round-2 disposition | Fresh evidence |
|---|---|---|---|
| R-EP13-01 | Should-fix | **Resolved** (fixed in `5e3fe2a`) | Reviewer-executed full gated run at `619faef` on a fresh `ep13_r2_gated` database: **4 failed / 1576 passed / 1580 total, 2 suites failed** (`study-plans-e2e.spec.ts`, `study-plans-data-scoping.spec.ts`) — exactly the pre-existing R-EP13-03 set, none of the four EP13-caused failures (a)–(d) remains. Each repair re-inspected below. |
| R-EP13-02 | Should-fix | **Resolved** (fixed in `5e3fe2a`) | Dated `## Correction (2026-11-16, R-EP13-02)` sections read in all ten records (EP13A/B/C/F/G/H/I/J/K/M `implementation.md`) — each retracts the "CI executes them" claim, names the real trigger scope (`main`/`develop` only) and cites the actual first execution at `210f76c`. Parent index test-command row corrected (`implementation.md` §Test commands) and §Known gaps updated. The CI-policy half is registered as D-R15 in EP13R (planner/user-owned; not a record-accuracy gap anymore). |
| R-EP13-03 | Should-fix (pre-existing, outside this unit) | **Still open — non-gating** (unchanged by design) | The four remaining gated failures reproduced by this round's run are the same four verified pre-existing at baseline `9ffd854` in round 1: lock 400-case (implicit-conversion coercion), lock happy-path + lock scoping (`seedPlannedSession` unique-constraint collision), bag-survival (replace-vs-merge premise obsoleted by R-EP06-06). Registered with a `Do next` recommendation as **D-R14** in [`EP13R`](../../EP13R-follow-up-register-and-triage.md) (awaiting user ruling). Per the round-1 disposition and the D-M5 precedent it does not gate this unit. |
| R-EP13-04 | Polish | **Resolved** (fixed in `5e3fe2a`) | `docs/stories/EP13/README.md` line 27 now reads "Reviewer artifacts: `./artifacts/EP13/review.md` (walkthrough + DoD-11 section inside it, D13-19)" — the stale `walkthrough.md` artifact name is gone. |
| R-EP13-05 | Should-fix (CANNOT VERIFY) | **Resolved** (user evidence recorded in `619faef`) | The user executed and signed the 7-item TR-E13-14 checklist in-session on 2026-11-16 ("the accessibility checklist is approved and passed now"); the parent index §TR-E13-14 records it as "Executed and signed (user, 2026-11-16) … passed, no defects reported" with the checked items preserved. This is the recorded manual evidence DoD-8/TR-E13-14 required; accepted as a real user sign-off per the dispatch. |

No new findings. Round-2 inspection surfaced nothing blocker-, should-fix- or polish-worthy beyond the dispositions above.

## What changed since round 1 — re-verification

The application diff `210f76c..619faef` is five files in `apps/api` (one production file, four spec files) plus docs; `apps/web` is untouched (verified: `git diff --stat 210f76c..HEAD -- apps/web` is empty), so every round-1 web/E2E/a11y result stands as recorded.

### The one production change — EP13C's missed query (R-EP13-01d)

`apps/api/src/modules/study-plans/study-plans.service.ts:758–767`: the recovery summary's legacy missed query now carries the same "actually done" exclusion as the reconciliation guard — `studySessions: { none: { status: 'COMPLETED', durationMinutes: { gte: 1 } } }` — verified **character-identical** to `reconcilePastSessions`' predicate at `:502`. Semantics re-checked: a past `SCHEDULED` row the guard protects (kept `SCHEDULED` because a linked session completed it with ≥1 minute) is now excluded from "missed" too, which is exactly what EP13C's rollover journey asserts (`study-plans-rollover-e2e.spec.ts` — green in this round's gated run). The matching unit where-pin was updated in `study-plans-recovery-catch-up.service.spec.ts:318–322` (green in the ungated run).

**Blast radius inspected:**
- The query stays scoped `studyPlan: { userId, … }` — ownership unchanged (DoD-3 holds).
- `catchUpPreview` (`study-plans.service.ts:1244–1250`) keys off `status: 'RESCHEDULED'`; guard-protected rows stay `SCHEDULED` and never reach it — no interaction.
- The save/confirm selective deletes (`:1478–1484`, `:1702–1710`) filter `SCHEDULED && !locked` in the plan's date range — unrelated to missed semantics, untouched.
- The today read (`getToday`, `:853`) reconciles first and was verified in round 1; unchanged.
- No other `missedSessions`/`missedCount` producer exists (`grep` over the service: the only other site is `catchUpPreview`, covered above).

### The three gated-test repairs (R-EP13-01 a/b/c) — test-only, inspected + executed

- **(a)** `study-plans-catch-up-e2e.spec.ts:686–699` — the EP08 P-03 saved-shape pin now includes `anchor` and `windowHint` (EP13G-AC5's contract) while still proving no `locked` leak; the comment records why. Correct: it pins the *current* contract instead of the pre-EP13G one.
- **(b)** `study-plans-catch-up-data-scoping.spec.ts:255–266` — the cross-student scoping test now asserts rolled semantics (`missedCount: 0`, `rolledForwardCount: 1` for A; both 0/empty for B), matching EP13C's AC; the nothing-crosses property it exists for is strengthened, not weakened (B's summary must stay empty on *both* counters).
- **(c)** `study-sessions-planned-link-e2e.spec.ts:264–280` — the absorb journey seeds its own dedicated assignment, removing the fixture bleed (earlier tests' leftover SCHEDULED rows for the shared assignment); the earliest-candidate determinism of `absorbNext` (verified in round 1 at `study-sessions.service.ts:365–374`) is now exercised against only its own rows.

All three suites passed in this round's gated run.

### Record and index corrections (R-EP13-02/-04), user sign-off (R-EP13-05)

Verified by direct read at `619faef`: the ten correction sections (diffed in `5e3fe2a`), the corrected parent-index test-command row, the README artifact line, and the signed §TR-E13-14 (diffed in `619faef`). The EP13R register (`EP13R-follow-up-register-and-triage.md`, D-R1…D-R16) exists, carries D-R14 (= R-EP13-03) and D-R15 (CI trigger policy) with evidence links, and is docs-only — it changes nothing in this unit.

## Reviewer-executed verification (evidence discipline)

All commands at commit `619faef`, clean tree, this worktree, 2026-11-16, reviewer-executed. Round-1 results at `210f76c` are cited (not rerun) for everything the diff does not touch.

| Command (cwd) | Result |
|---|---|
| `npx jest` (`apps/api`) | **1104 passed, 0 failed**, 476 skipped (27 gated suites self-skip), exit 0 |
| `psql -h localhost -d postgres -c "create database ep13_r2_gated"` → `DATABASE_URL=postgresql://michaelrobert@localhost:5432/ep13_r2_gated npx prisma migrate deploy` (`apps/api`) | **All migrations applied successfully** to the fresh database (incl. the three EP13 migrations) |
| `DATABASE_URL=… JWT_SECRET=$(openssl rand -hex 32) JWT_REFRESH_SECRET=$(openssl rand -hex 32) npx jest --runInBand` (`apps/api`) | **4 failed, 1576 passed, 1580 total; 2 suites failed** (`study-plans-e2e`, `study-plans-data-scoping`) — jest exit non-zero on the known set. Verbose re-run of the two suites confirms the four failing tests by name: lock 400-case, lock happy-path, lock scoping, bag-survival — **exactly the R-EP13-03 set**, nothing else. Database dropped afterwards. |
| `pnpm lint` + `pnpm typecheck` (`apps/api`) | clean, exit 0 (the one app with changed code) |
| `git diff --stat 210f76c..HEAD -- apps/web` | empty — `apps/web` untouched since round 1; web unit (1264/0), lint/typecheck, and the 7/7 E2E journeys stand on round-1 reviewer-executed evidence at `210f76c` ([review-round-1.md](./review-round-1.md) §Reviewer-executed verification) |

## Child and cross-child dispositions (round 2)

Only EP13C's production behavior changed. Per-child AC tables from round 1 remain valid and are incorporated by reference ([review-round-1.md](./review-round-1.md) §Child-by-child AC dispositions); deltas:

| Child | Round-2 status |
|---|---|
| EP13C | 5/5 ACs satisfied, internal inconsistency **closed**: committed test and committed code now agree (the R-EP13-01(d) exclusion), the un-updated sibling scoping spec (b) is on rolled semantics, both suites green in this round's gated run. R-EP13-01(b)/(d) closed. |
| EP13G | R-EP13-01(a) closed — the P-03 pin tracks the anchor/windowHint contract; catch-up e2e suite green. |
| EP13I | R-EP13-01(c) closed — absorb journey isolated; planned-link e2e suite green. |
| EP13M | F-EP13M-07 remains closed-by-execution, now with a green result (modulo R-EP13-03); parent index no longer repeats the wrong CI claim. |
| EP13A/B/D/E/F/H/H2/J/K/L/N | Unchanged code; round-1 dispositions stand (all ACs satisfied). Records now carry the R-EP13-02 corrections where applicable. |

Cross-child: the recovery summary, catch-up preview/confirm, today read and plan save all sit on the one reconciliation predicate, now applied consistently at both read sites (reconcile guard + missed query); the gated e2e suites that chain them (rollover, catch-up, recovery scoping, planned-link) are green in this round's serial run. Epic ACs AC-E13-01…14: round-1 coverage stands; AC-E13-04's "rolled sessions stop being missed" is now also pinned at the summary level by the corrected scoping spec.

## DoD table (round 2)

| DoD | Disposition | Evidence |
|---|---|---|
| 1 functional criteria | PASS | Round-1 AC tables + this round's gated run; EP13C delta re-verified above |
| 2 invalid-input validation | PASS for EP13 endpoints; the app-wide coercion caveat stays pre-existing (R-EP13-03 → D-R14) | Round 1 `[T]`+`[C]` + probe; unchanged code |
| 3 student data scoping | PASS | Round-1 inspection of all EP13 endpoints; the one changed query re-inspected (`studyPlan: { userId }` kept); scoping suites green in this round's gated run (except the two pre-existing lock cases, R-EP13-03) |
| 4 actionable API errors | PASS | Round 1; unchanged code |
| 5 loading/empty/error states | PASS | Round 1; `apps/web` untouched |
| 6 keyboard accessibility | PASS | Automated half round 1 (reviewer-run journeys); human half now signed (R-EP13-05 resolved) |
| 7 responsive layouts | PASS | Round-1 code-level evidence + the signed 375px checklist item (§TR-E13-14 item 7) |
| 8 automated tests | **PASS** — ungated 1104/0; gated 1576 passed with only the four pre-existing R-EP13-03 failures (registered D-R14); TR-E13-14's manual pass recorded and signed | reviewer-executed runs this round |
| 9 API/migration documentation | PASS | Round 1 (migrations re-deployed clean this round); records corrected per R-EP13-02 |
| 10 integrated review | PASS | Round-1 reviewer-run journeys 7/7 at `210f76c`; no web/app-behavior change since except the missed-query fix, covered by the gated rollover/scoping journeys this round |
| 11 walkthrough + How to verify by hand | This report (below), per D13-19 | — |

## Walkthrough (D13-19 — reviewer narrative, round-2 delta)

The round-1 walkthrough ([review-round-1.md](./review-round-1.md) §Walkthrough) describes the unit and stands unchanged — the spine (reality accounting), the surfaces, the engine and the experience children are exactly as reviewed there, and nothing user-visible moved between the rounds. What round 2 adds is the closure of the unit's one systemic weakness: the gate that had never run now runs and is green for everything EP13 owns. The single production correction makes EP13C internally consistent — the recovery summary now applies the same "actually done" test the rollover guard does, so a row protected from rolling because a linked session genuinely finished it can never resurface as "missed" (reachable only with hand-crafted history, but the code and its committed test now agree). The three test repairs pin current contracts instead of pre-EP13 ones. The records that claimed CI coverage that never existed now say plainly what happened and when the suites actually first ran; the policy gap behind it (CI never watches delivery branches) is registered for a user ruling (D-R15), as is the pre-existing four-failure residue (D-R14). The human half of the accessibility pass is signed. The unit is done.

## How to verify by hand

Steps 1–9 are unchanged from round 1 and stand with their labels ([review-round-1.md](./review-round-1.md) §How to verify by hand — journeys 1–7 `Executed — 2026-11-16, reviewer`; energy windows `Not executed — user instructions`; ownership negative case `Executed`). Round-2 deltas:

10. **Screen reader / reduced motion / 375px (TR-E13-14 items 1–7).** `Executed — user, 2026-11-16, in-session sign-off recorded in the parent index §TR-E13-14 (commit 619faef): passed, no defects reported.`
11. **Gated API suites.** `Executed — this review, 2026-11-16, commit 619faef`: fresh database `ep13_r2_gated`, `prisma migrate deploy`, `npx jest --runInBand` → **4 failed / 1576 passed**, the four failures being exactly the pre-existing R-EP13-03 set (D-R14). Expect 0 failures once D-R14's fix story lands. Database dropped afterwards.
12. **Recovery summary never counts a completed-but-unrolled row as missed (the R-EP13-01d fix).** `Executed — gated rollover + recovery suites this round.` Manually: seed a past planned session, complete it via a linked focus session (≥1 min), leave its row `SCHEDULED`; GET the recovery summary → `missedCount: 0` and the row is not listed.
