# EP13C implementation record

**Story:** [EP13C — Rolling Reconciliation and Auto-Forgiveness](../../EP13C-rolling-reconciliation-and-auto-forgiveness.md)
**Status:** Implemented — awaiting parent review (EP13 combined review unit)
**Date:** 2026-11-14
**Commit scope:** `apps/api/src/modules/study-plans/` (service, controller, five specs — two new), EP13C docs/queue updates. No migration (the `RESCHEDULED` status existed unused since EP06). No frontend change (EP13D/E own the client).

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| 1 — after reconciliation no owned `SCHEDULED` row predates today (profile zone; locked rows roll and keep `locked`) | **Done.** `reconcilePastSessions`: one conditional `updateMany` (`SCHEDULED`, `studyPlan.date < UTC-midnight-of-civil-today`, not actually done) → `RESCHEDULED`; invoked at the start of plan read, preview, save, catch-up preview/confirm, recovery summary and today. | unit: predicate deep-equal + Auckland boundary; gated: rows verified `RESCHEDULED` in the database, locked flag kept |
| 2 — idempotent, concurrency-safe, never writes history | **Done.** Conditional predicate (a racing second reconcile matches 0 rows); identical call on every read; no `StudySession`/`Assignment`/`Task`/`User` write anywhere in the flow. | unit: identical-calls + ordering + immutability tests; gated: study-session count unchanged across reads |
| 3 — `GET /study-plans/today` with deterministic `nextSession` or null + reason | **Done.** All of today's sessions with live statuses; next = first startable (session `SCHEDULED`/`IN_PROGRESS`, assignment unfinished) by startTime, ties by the shared comparator then id; `NO_PLAN` vs `NOTHING_LEFT_TODAY`. | unit: shape/projection/pick/reasons; gated: live journey (completed row skipped, open row picked) |
| 4 — no re-accumulation; totals as rolled-forward work | **Done.** The legacy missed ledger is empty after any read; the reshape reports `rolledForward` detail + count/minutes **bounded to the last 7 days** and filtered to unfinished assignments, so it structurally cannot become a ledger. | unit: rolled-query bound deep-equal; gated: `missedCount` 0 + rolled ids verified |
| 5 — a normal plan read alone yields a valid current plan | **Done.** `getPlan` reconciles before answering; catch-up remains an optional regeneration. | unit: "the saved-plan read alone self-heals"; gated: plain `GET /study-plans` rolls the seeded rows |

## Verification (from `apps/api`, 2026-11-14)

- `pnpm test`: **947 passed, 0 failed**, 471 skipped (gated live-DB suites — self-skip without `DATABASE_URL`, executed by CI). EP13B's 937 + 10 new unit tests.
- `pnpm lint`, `pnpm typecheck`, `pnpm format`: clean.

New/changed tests: `study-plans-reconciliation.service.spec.ts` (new, 10 unit tests — predicate, zone boundary, idempotence/ordering, immutability, self-healing `getPlan`, today shape/pick/reasons, the 25-hour DST-day civil filter, uniform 404); `study-plans-rollover-e2e.spec.ts` (new, gated, 4 journeys incl. the full what-now → start → finish loop — CI-executed); `study-plans-recovery-catch-up.service.spec.ts` (reconcile-aware no-write helper, re-pinned queries, reshaped keys); `study-plans-catch-up-e2e.spec.ts` (post-reconciliation expectations + in-database status proof); `study-plans-reality.service.spec.ts` (reconcile mock).

## Deviations from the plan (each with why)

1. **"Not actually done" predicate refined.** The README contract said "no linked completed StudySession"; implemented as "no linked `COMPLETED` session with `durationMinutes ≥ 1`". The literal predicate would permanently pin any row whose linked session finished with **0 minutes** — but EP13B deliberately hands those back as `SCHEDULED` precisely so the work rolls forward. The refinement preserves the contract's intent and is pinned by both unit and gated tests.
2. **The recovery summary is reshaped additively, not replaced.** EP13E owns the frontend; dropping `missedSessions`/`missedCount` now would crash the shipped EP08D page between C and E. The legacy keys keep their exact query (truthfully near-empty after reconciliation — which is itself the non-blaming outcome); the new `rolledForward`/`rolledForwardCount`/`rolledForwardMinutes` keys carry the reshape.
3. **`CatchUpPreview.missedSessions` now lists the last-7-days rolled-forward sessions** (same `MissedSession` shape, same bound and unfinished-assignment filter as the summary). After read-time reconciliation a past `SCHEDULED` row cannot exist at query time, so EP08's literal query would always return `[]` and the catch-up preview would lose its "what you're recovering from" context. The field name is historical; EP13E relabels the surface.
4. **EP08's "preview is side-effect-free" pins evolved** to "no writes beyond the idempotent reconciliation; the proposal itself persists nothing". This was scheduled by the EP13 README contract (reconciliation runs at the start of preview); the decline guarantee (AC-E08-09) is intact and still pinned — every permitted write is asserted to be exactly the rollover shape.
5. **`confirmedMinutesToday` uses the canonical civil-date mapping, not wall-clock bounds.** Found while testing: `wallClockToInstant` resolves a DST-transition-day's midnight with the **post-transition** offset (2026-11-01 00:00 New York → 05:00Z, not 04:00Z), so wall-clock day bounds would silently drop the first local hour of every DST-end day. Implemented as a safe instant over-fetch filtered by `toCivilDate(startTime) === today` — the same rule every other surface uses to assign a session to a day. Pinned by the 25-hour-day unit test.
6. **The rollover does not filter by assignment status** (a finished assignment's stale planned row rolls too). Harmless — every list that reports rolled/missed work filters to unfinished assignments — and it keeps the predicate to one conditional write.

## Findings

| ID | Finding | Disposition |
|---|---|---|
| F-EP13C-01 | `wallClockToInstant` (EP12A, "kept verbatim") resolves a DST-transition-day midnight with the post-transition offset — a latent 1-hour-per-year boundary for any consumer that uses it to bound a civil day. EP13C avoided it (deviation 5); existing save-path uses convert *within-day* wall times where the effect is the standard ambiguous-hour semantics, not a day boundary. | Routed as an observation for the planner/EP12 follow-up roster; nothing changed in the helper (not this story's scope). Non-blocking. |
| F-EP13C-02 | Gated suites (incl. both new E2E journeys) not executed locally — no `DATABASE_URL`. | Open evidence item for the EP13 parent review unit; CI executes them on every push. Same disposition as F-EP13A-03/F-EP13B-02. |

## Changed paths

- `apps/api/src/modules/study-plans/study-plans.service.ts` — `reconcilePastSessions` + call-site wiring (gatherPlanData, getPlan, recovery, today), `getToday`, the recovery reshape, the catch-up recovered-from query, `TodaySession`/`TodayPlan` types.
- `apps/api/src/modules/study-plans/study-plan.controller.ts` — `GET /study-plans/today`.
- `apps/api/src/modules/study-plans/study-plans-reconciliation.service.spec.ts`, `study-plans-rollover-e2e.spec.ts` — **new**.
- `apps/api/src/modules/study-plans/study-plans-recovery-catch-up.service.spec.ts`, `study-plans-catch-up-e2e.spec.ts`, `study-plans-reality.service.spec.ts` — re-pinned.
- Docs: this record, `checkpoint.md`, EP13 README queue row, EP13C story status.
