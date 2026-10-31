# EP08 — Correction round 1 (implementer)

Parent review pass 1 verdict: **FAIL** (`./review.md` §13). This record covers the
authorized correction round executed on top of base `a075ee3`. Status for every
finding below is **"Addressed — awaiting re-review"** where work was done here;
nothing is self-closed, and the human-gated findings (F-02's fix/waiver ruling,
F-03's manual pass) are explicitly left open for their owners.

Round scope (per the dispatch): F-01 (mandatory), F-02 evidence-only correction,
P-01…P-05 dispositions, the stray `apps/api/tsconfig.json` disposition, fresh
verification. No implementation-code change to shipped behavior was made or
needed — this round adds tests and records.

---

## F-01 — Required API-level tests for TR-E08-01/02/04 (+ TR-E08-05 copy sub-gap)

**Addressed — awaiting re-review.** All three routes now have API-level specs
where previously there were zero, covering the review's closure-condition list.

### New specs

1. `apps/api/src/modules/study-plans/study-plans-recovery-catch-up.service.spec.ts`
   — 20 unit tests (mocked `PrismaService`, **executed without `DATABASE_URL`**):
   - TR-E08-01: exact missed-classification `findMany` where-clause (civil-date
     `<` bound as UTC midnight, `SCHEDULED`, unfinished-assignment inclusion,
     ownership scope), uniform 404 (reads nothing else), empty case.
   - TR-E08-02: exact `MissedSession` projection (zone-rendered wall times,
     `locked` rides along), `missedCount`, `getRemainingWork` reuse (same items
     and total, no second implementation), contract key set, `userId` never in
     the payload, neutral message (same term list as the shipped UI tests).
   - TR-E08-04: preview side-effect-free (no write call, no transaction),
     confirm one-transaction + selective delete filter
     (`SCHEDULED && locked: false`) + `locked: false` insert + `targetHours`
     recomputed, PR-002 busy-exclusion (unedited resubmit never 409s), busy set
     includes confirmed/completed/locked, 409 per-session reason matrix, 400
     malformed matrix with the real pipe's flattened `sessions.<i>.<field>`
     keys, `WINDOW_ROLLED_OVER`, foreign/missing uniform 404.
   - The review's four counterexamples are each pinned by a failing-if-broken
     assertion (classification filters, `studyPlan.userId` scope, the
     `a.userId !== userId` guard, the delete filter).
   - **P-05 pin**: `save()`'s twin transaction is pinned in the same harness —
     unfiltered delete, no `locked` key — so drift between the write paths
     fails a test.

2. `apps/api/src/modules/study-plans/study-plans-catch-up-e2e.spec.ts` — 13
   `DATABASE_URL`-gated integration tests over real HTTP + real PostgreSQL
   (classification against the DB incl. locked-missed reporting; preview key
   set / seven-day window / side-effect-freedom proven by **row counts**;
   confirm happy path with field-for-field locked/completed preservation,
   `targetHours`, 201 status (the `save` twin), unedited resubmit, the
   `GET /study-plans` echo pinning the unchanged `SavedPlan` shape (P-03);
   `WINDOW_ROLLED_OVER`; the 400 matrix through the real pipe; foreign-vs-missing
   404 bodies identical modulo the response `timestamp`; no
   `catch-up/decline` route; the full 409 reason matrix against seeded
   locked/completed/`ClassMeeting`/blocked-slot rows).

3. `apps/api/src/modules/study-plans/study-plans-catch-up-data-scoping.spec.ts`
   — 5 gated cross-student tests (summary/preview isolation with exact counts,
   preservation counts never absorb another student's rows, foreign-id confirm
   = identical uniform 404 writing nothing anywhere, one student's confirm
   byte-identical on the other's rows, no cross-student ids in any payload).

4. TR-E08-05 sub-gap: `apps/web/src/features/recovery/ui/RecoverySummary.test.tsx`
   gains "copy contains no blaming terms" — the same term list as
   `CatchUpPreview.test.tsx` L390, applied to the whole rendered recovery
   surface (component copy + server message).

### Executed evidence (this round)

| Command (cwd) | Result |
|---|---|
| `npx jest study-plans-recovery-catch-up` (apps/api, **no** `DATABASE_URL`) | **20 passed / 0 failed** — executes without a DB, as required |
| `npx jest study-plans-catch-up-e2e study-plans-catch-up-data-scoping --runInBand` (apps/api, `DATABASE_URL` = throwaway local Postgres cluster, `prisma migrate deploy` applied) | **18 passed / 0 failed** — LIVE, not skipped |
| `npm test` (apps/api, no `DATABASE_URL`) | 917 passed / 461 skipped / 0 failed (67 suites) — +20 unit tests, +18 gated tests that self-skip locally |
| `npx jest --runInBand` (apps/api, same throwaway DB) | 1374 passed / 4 failed / 0 skipped — the 4 are **pre-existing** and unrelated; see "side finding" below |
| `npx vitest run src/features/recovery` (apps/web) | 8 passed (RecoverySummary 6/6) |
| `npx vitest run` (apps/web) | **1132 passed** (1131 baseline + 1 new) |
| `tsc --noEmit` + lint, both apps | clean |

### Side finding (recorded, NOT fixed — out of this round's scope)

The first-ever live execution of the **pre-existing** gated suites
`study-plans-e2e.spec.ts` + `study-plans-data-scoping.spec.ts` (EP08E's lock
toggle describes, which self-skipped locally in every recorded round — see
EP08E `implementation.md` L47) exposes **4 pre-existing failures** on a fresh
migrated database, reproducible with zero EP08 correction-round files present:

- `PATCH /study-plans/sessions/:id/lock` bodies `{ locked: 'yes' }` and
  `{ locked: 1 }` return **200**, not 400: the global pipe's
  `transformOptions.enableImplicitConversion` (main.ts, D106-6) coerces them to
  booleans before `@IsBoolean` sees them. A product-vs-test adjudication is
  needed (is silent coercion acceptable contract-wide, or must the DTO opt
  out?).
- The failed matrix then cascades into a `study_plans_userId_date_key` unique
  violation in the following test's seed.

Full-suite live count attributable to this: 4 failed / 1378, all four inside
those two pre-existing describes. Routed for triage alongside this round;
deliberately not fixed here (scope discipline — same standing as the two red
Playwright specs in F-02).

## F-02 — Two red pre-existing E2E specs + false root-cause claim

**Evidence-only correction made; the fix-or-waiver decision remains with the
user** (per the round's authorization; the ruling on waiving AC 8 was still
outstanding at execution time).

- Corrected the false claim in `../EP08F/implementation.md` (dated correction
  note) and in this parent index record: focus-restore logic **does** exist in
  `apps/web/src/shared/ui/Dialog.tsx` (`restoreFocusRef` L45, capture on open
  L101, Escape flag L63, restore in cleanup L112–114). The plausible cause is
  the restored reference being detached by a parent re-render, not code lost in
  SP-109.
- `Dialog.tsx` was **not** modified and the two specs were **not** fixed or
  waived here.

## F-03 — Screen-reader / reduced-motion pass

**Unchanged — human-owned.** Still `CANNOT VERIFY` until a recorded human pass
(VoiceOver traversal of `/catch-up` → preview → confirm; reduced-motion
observation) is added. No implementer action possible.

## Polish dispositions

| ID | Disposition |
|---|---|
| P-01 | **Routed to `planner`** — the fix is a row in the README's shared-contract endpoint table, a planner-owned section for this round (also the review names the owner as `planner`). No content change made here. |
| P-02 | **Routed to `planner` (contract).** A distinct reason for locked/completed planned-session collisions would require a **fifth code** in the closed `ConflictReason` enum — a contract change, exactly the option the review says only the planner can take ("record the mapping as intended" is the other half, also contract text). The current mapping is now **pinned as implemented behavior** by both new API specs (unit + live e2e) so it cannot drift silently. |
| P-03 | **Routed to `planner`.** Adding `locked` to `SavedPlan` changes EP06's unchanged shape — the already-open planner-owned question quoted in the finding. The unchanged shape is now **pinned** by the e2e "P-03 pin" test (exact `SavedPlanSession` key set), so if the planner extends the contract, a test fails with the reason. |
| P-04 | **Cannot be actioned retroactively; statement recorded** in EP08E `implementation.md`: the flake cannot be named — no surviving vitest output exists for that run (searched the environment's logs; the surviving logs are dev-server/agents-kit/Playwright, none contain the vitest failure line). Reoccurrence handling is recorded there. |
| P-05 | **Addressed via the review's second closure option** ("pin both write paths with tests"): the unit spec pins confirm's filtered delete + `locked: false` insert **and** save's unfiltered delete + no-`locked`-key insert in one harness. The shared-helper extraction was deliberately not done: it rewrites a shipped, green `save()` path for zero behavior change when the chosen closure path already fails tests on drift. |

## tsconfig disposition

The stray dirty change (`"dist-test"` added to `apps/api/tsconfig.json`
`exclude`) was **reverted**. `dist-test` (the `tsconfig.e2e.json` build output
directory) does not exist in this workspace, `tsconfig.e2e.json` already
excludes it for its own build, and `tsc --noEmit` is clean on the HEAD content.

## Records touched this round

- `./fix-round-1.md` (this file)
- `./checkpoint.md` (fix-round checkpoint, closed out)
- `./implementation.md` §Known gaps #1 corrected (repeated false claim)
- `../EP08F/implementation.md` dated correction note (evidence-only)
- `../EP08E/implementation.md` P-04 statement
- `docs/stories/EP08/README.md` execution queue rows (own hunks only)

## Return state

- F-01: implemented, executed, green (unit executed DB-free; gated executed
  live on a throwaway cluster and recorded as such — the normal local run still
  self-skips them, honestly labeled).
- F-02: corrected evidence only; awaiting the user's fix-vs-waiver ruling.
- F-03: untouched (human evidence still outstanding).
- P-01/P-02/P-03: routed to planner with the code-side behavior pinned by
  tests; P-04 recorded; P-05 closed-by-pin.
- Pre-existing unrelated reds (2 Playwright focus specs; 4 gated EP06 lock
  tests on live DB) are recorded with reproduction commands and are **not**
  caused or masked by this round.
- Awaiting: independent re-review of this round (nothing here is self-approved).
