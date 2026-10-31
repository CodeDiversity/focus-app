# EP08 — Catch-Up & Recovery: parent implementation index

**Epic:** [EP08](../../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17) · **Milestone:** M4
**Written by:** EP08F (integration child) · 2026-10-31
**Review unit:** combined EP08 parent review (one independent reviewer pass over all six children).

## Delivery summary

| Child | Scope | Commit(s) | Status |
| --- | --- | --- | --- |
| EP08A | Missed-session identification + `GET /study-plans/recovery-summary`; additive `locked` column + migration | `c1d7f95` | Implemented — awaiting parent review |
| EP08B | Pure `replan(...)` domain module reusing the EP06 engine | `aff7794` | Implemented — awaiting parent review |
| EP08C | `POST /study-plans/catch-up/preview` + `/confirm` (transactional, preserves locked/completed) | `8a9c543` | Implemented — awaiting parent review |
| EP08D | `/catch-up` recovery-summary UI + manual replan entry point | `9f815a6` | Implemented — awaiting parent review |
| EP08E | `/catch-up/preview` edit/confirm/decline UI + lock toggle (+ `PATCH …/sessions/:id/lock` endpoint) | `dde6780` (endpoint), `646e93f` (UI), `d9a7738` (addendum) | Implemented — awaiting parent review |
| EP08F | Cross-layer Playwright suite + this index + TR-E08-08 evidence collection | own commits, "test(EP08F)" (hash in `git log`; not embedded in this file) | Implemented — awaiting parent review |

**Baseline before the first included change:** `53de89cc68b3b19d365156ddff6ad0dd81772344`.
Child records: [`../EP08A/implementation.md`](../EP08A/implementation.md) ·
[EP08B](../EP08B/implementation.md) · [EP08C](../EP08C/implementation.md) ·
[EP08D](../EP08D/implementation.md) · [EP08E](../EP08E/implementation.md) ·
[EP08F](../EP08F/implementation.md).

## Requirement traceability (epic ACs → proof)

Epic AC bullets 1–9, in epic order:

| # | Epic AC | Delivered by | Automated proof |
| --- | --- | --- | --- |
| 1 | Missed sessions identified; completed assignments not treated as unfinished | EP08A query, EP08D UI | api unit specs (EP08A); E2E `catch-up.spec.ts:557` completed-exclusion |
| 2 | Replanning initiated manually | EP08D entry → EP08E preview | EP08D/E vitest; E2E `:682` keyboard path to entry; journey `:265` |
| 3 | Completed work and study logs unchanged | EP08C transaction scope | journey `:265` immutability asserts; EP08C service tests |
| 4 | Replacement sessions respect availability + commitments | EP08B `replan` on EP06 engine | `catch-up.spec.ts` unit suite (11 tests); journey preview asserts |
| 5 | Preview before confirming | EP08C preview, EP08E surface | EP08E vitest; journey `:265` (preview → edit → confirm) |
| 6 | Locked sessions preserved during replanning | EP08A column, EP08B `lockedPreserved`, EP08C confirm skip, EP08E toggle | E2E `:438` fields+count unchanged; EP08B unit; EP08E toggle specs |
| 7 | Work that cannot fit is reported | EP08C warnings/deferred, EP08E `WorkloadWarnings` | E2E `:514` server warnings ↔ UI copy 1:1 |
| 8 | Deadlines never silently extended | EP08B/C never mutate due dates | E2E `:514` + `:557` due-date-unchanged asserts |
| 9 | Proposed changes can be declined | EP08E decline path | E2E `:378` no request + byte-identical plan |

Cross-cutting: scoping (DoD 3) — every new endpoint uses owned queries
(`ownedWhere`/`assertOwned`/`assertAffected`); EP08E lock endpoint unit +
data-scoping specs; recorded-time path proven E2E `:612`.

## Verification snapshot (per child, executed)

- EP08A: api typecheck/lint clean; study-plans service suite 27/27.
- EP08B: api suites 41 / 894 green (incl. 11 new unit tests).
- EP08C: api suites 41 / 894 green (23 integration skipped — no local `DATABASE_URL`).
- EP08D: web vitest green (recovery UI + entry tests); typecheck/lint clean.
- EP08E: web vitest 1131/1131; api 897 passed / 443 skipped; honest flake addendum `d9a7738`.
- EP08F: web typecheck + eslint clean; new spec 9/9; full E2E 40 passed with only
  two **pre-existing** failures (control runs in
  [EP08F record](../EP08F/implementation.md#suite-baseline-evidence-ac-8)).

## Known gaps / carry-forwards for the parent review

1. **Pre-existing E2E focus-restoration failures** (tree at HEAD `9c0b222`, proven
   unrelated to EP08): `e2e/assignments-list.spec.ts:23` and
   `e2e/calendar.spec.ts:100` — focus not returned to trigger after Escape; no
   focus-restore logic exists in the current component tree (likely lost in the
   SP-109 reorg). Deterministic in isolation. Needs its own fix story or review
   ruling.
2. **`study-plans-e2e.spec.ts` dailyCapMinutes** — carried in story text as
   reported-not-blocking; the api integration specs self-skip locally without
   `DATABASE_URL` and could not be reproduced in this workspace.
3. **TR-E08-08 manual gaps** — VoiceOver screen-reader path and reduced-motion
   observation were not executed; keyboard/narrow-screen/focus-visible have
   durable Playwright evidence (EP08F record).
4. **`getPlan` omits `locked` on returned rows** (planner open question from
   EP08A) — the UI re-syncs locally after toggling; reviewer to confirm acceptability.
5. **Per-assignment `confirmedMinutes`** is State A / aggregate-only per V-08-5.

## Review unit

All six children are Implemented. Nothing here is self-approved: the combined EP08
parent review (one independent reviewer pass + final `walkthrough.md`) is the next
step and is now unblocked.
