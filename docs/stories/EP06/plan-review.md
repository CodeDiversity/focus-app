# EP06 Plan Review — Study Planning & Scheduling

**Review date:** 2026-10-30
**Pass:** 2 (re-review of the plan corrected against pass 1 — the plan's own correction log records 15 rows, each `Addressed — awaiting re-review`, which is the planner's claim, not reviewer closure)
**Reviewer role:** reviewer, `plan_review` mode (planning stage, not implementation)
**Reviewed state:** branch `main`, HEAD `9ade8a7c6f66f52bb500fa0f0dc88ddff61cd5a4` (read directly from `.git/refs/heads/main`); the commit sequence was read from `.git/logs/refs/heads/main`, which shows `0cab534` → `d3ea7cd` ("correct the plan against the pass-1 plan review") → `9ade8a7` ("align the eight child stories with the corrected contract"), both `docs(EP06)`-scoped. The reviewed content is the **working tree** of `docs/stories/EP06/**` at that HEAD, which carries one uncommitted coordinator mechanics edit (the PR-002 correction-log row's reword "the coordinator-owned `## Autopilot` section" → "the coordinator-owned autopilot checkpoint section", `README.md:495`). The reword is present in the file I read; it changes no finding, decision, contract or evidence and is immaterial to this review.
**Reviewed paths:** `docs/stories/EP06/README.md` (execution queue, AC/TR traceability, shared API/data contract, decision register D06-1…D06-25, code baseline, invariants, open follow-ups, findings for the coordinator, plan correction log, quality gate, final review unit) and all eight children `EP06A…EP06H`; source epic `docs/epics/EP06-study-planning-and-scheduling.md`; shared DoD `docs/epics/README.md`; neighbouring plans `docs/stories/EP07/README.md`, `docs/stories/EP05/README.md`, `docs/stories/EP03/SP-120/README.md`, `docs/stories/EP04/README.md`
**Application code inspected independently:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261011000000_init/migration.sql` (+ the migrations directory listing), `apps/api/src/common/ownership/ownership.ts`, `apps/api/src/modules/availability/availability.service.ts`, `apps/api/src/modules/users/dto/update-user.dto.ts`, `apps/api/src/modules/users/users-profile-integration.spec.ts`, `apps/api/src/modules/calendar/calendar.service.ts`, `apps/api/src/test/test-http.ts`, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/navGroups.ts`, `apps/web/src/shared/types/academic.ts`, `apps/web/e2e/` (directory listing)
**Scope:** the plan's readiness as a whole — the fifteen pass-1 findings re-verified independently against the corrected plan and the code; plus a full re-verification of AC/TR coverage, child sizing and separation, the shared API/data contract's internal consistency, the ownership/uniform-404 claims, integration ownership, the dependency chain and the "EP06 does not depend on EP07" claim, the cross-epic seams, and every DoD obligation's owner.

**Limitations (honest):**
- The reviewer runtime has **no shell**, so no `git status` / `git log` / `git diff` and **no command execution** was possible. I verified HEAD's hash by reading `.git/refs/heads/main` and the commit sequence by reading `.git/logs/refs/heads/main`; the coordinator's record that the two correction commits touch `docs/stories/EP06/**` only is **coordinator-provided and reviewer-unverified** (the reflog messages are consistent with it). The unrelated dirty `apps/api/tsconfig.json` was not read, staged or modified.
- The application code was read **directly from the working tree at HEAD**, not at the plan's stated baseline `9b1ec19`. Every commit after `9b1ec19` in the reflog is `docs(EP06)`-scoped, and every code citation in the plan resolves exactly in the files as they stand, so the code is unchanged since the baseline.
- A plan review requires no test execution (no implementation exists). No test was run and none is claimed. `prisma migrate diff` was **not** executed.
- PR-016's failure mode rests on documented PostgreSQL semantics (`ALTER TABLE … DROP COLUMN` drops the indexes and constraints that involve the column), not on an execution in this review; the statement and the error it produces are quoted from the plan and from the PostgreSQL documentation.
- The `## Autopilot` section of `docs/stories/EP06/README.md` (lines 543–596) is coordinator-owned; it was read for context and **not** edited.
- No secrets were read; nothing under `.env`/`.env.*` was opened.

---

## Verdict

**`Changes Required`** — 3 open **should-fix** findings (PR-016 … PR-018), 4 **polish** findings (PR-019 … PR-022), **no blocker**. All fifteen pass-1 findings are **resolved** (see the disposition table); the correction pass did its job.

The three open findings are **new**, and they share one cause: the correction pass replaced prose with executable artifacts (a SQL step list, a named shared helper, a transaction sketch) and did not re-check those artifacts against the schema and the model they operate on. Each is a one-line fix in the plan; none reopens a settled user decision; none changes the epic's scope, its AC coverage or its child sizing.

- **PR-016** — the documented migration drops the unique index *after* dropping the column that owns it. PostgreSQL drops an index together with the column it indexes, so by the plan's own step 5 the named index no longer exists and the statement aborts with `index "scheduled_tasks_studyPlanId_taskId_key" does not exist`. The plan's note already explains that the column's foreign key goes with it — the index is the same case and was missed.
- **PR-017** — the shared `freeIntervals(...)` helper is named (PR-015's fix) but its contract does not pin the two inputs on which its two call sites differ: the "sessions already placed" that the contract says it subtracts has **no parameter**, and "with the availability windows omitted" (EP06D's call) has **no stated base**. An EP06C implementer following the plan literally produces an empty free-interval set for EP06D's re-check, so **every save is rejected with 409** — the epic's core flow.
- **PR-018** — the save's replace query filters `PlannedSession` by a `date` field the model does not have (the date lives on the parent `StudyPlan` row), so the documented Prisma call cannot type-check; and the natural "fix" (adding a `date` column to `PlannedSession`) would diverge from the documented model and the documented migration.

The rest of the plan is in good shape and I re-verified it end to end: all nine epic ACs and nine TRs have named owners, all eleven DoD obligations have an owner or a justified N/A, the eight children are substantive and correctly sized behind one sequential implementer, the ownership/uniform-404 story matches the repo convention, the dependency chain is correct, the "EP06 does not depend on EP07" claim holds in the code path rather than only in prose, and the five cross-epic seams are recorded with owners and verification tasks.

---

## Prior findings — disposition (pass 1 → pass 2)

Each pass-1 finding is listed with its **stable ID**, its disposition, the **fresh evidence** I gathered in this pass, and the **specific place in the corrected plan** that settles it. Dispositions are the reviewer's; the correction log's `Addressed — awaiting re-review` was treated as the planner's claim.

| ID | Sev | Disposition | Fresh evidence (pass 2) | Where the corrected plan settles it |
|---|---|---|---|---|
| PR-001 | Should-fix | **Resolved** | The read path is now server-owned end to end: `GET /study-plans` takes **no** query parameters and returns the effective window in `from`/`to`; the client never derives a date. I checked the endpoint table, the window subsection, the client's three mentions and EP06H's reload test — they all name the same no-parameter read, and no child contains a browser-clock derivation. | `README.md:244` (endpoint row: "**no query parameters** → the server picks the window (D06-23)"), `:248-250` ("The server owns the window in both directions"; "Most recent saved plan window" = `[max(StudyPlan.date) − 6 days, max(StudyPlan.date)]`), `:375` (rule 11); `EP06F…md:60` (AC 7), `:102` (note 1), `:105` (note 4), `:84` (page test); `EP06H…md:62` (test 2), `:84` (note 1); `D06-23` at `README.md:415` |
| PR-002 | Should-fix | **Resolved** (identifiers) — residual carried as **PR-016** | Every identifier verified against the init migration: `:155-167` creates `"scheduled_tasks" ("id", "studyPlanId", "taskId", "startTime", "endTime", "durationMinutes", …)`; `:188` creates `CREATE UNIQUE INDEX "scheduled_tasks_studyPlanId_taskId_key" ON "scheduled_tasks"("studyPlanId", "taskId")`; `:224`/`:227` create `scheduled_tasks_studyPlanId_fkey` / `scheduled_tasks_taskId_fkey` (`ON DELETE RESTRICT`). The schema carries **no** `@map` on any scalar field — only `@@map` on models (`schema.prisma:52…338`), so the physical columns are camelCase. The plan's names are now all correct and the SQL is labelled illustrative with `prisma migrate diff` named as the derivation — which was PR-002's stated acceptance condition. **What is still wrong is the statement order, not the names**: see PR-016. | `README.md:170-179` (migration steps, with the init-migration evidence at `:170`), `:431` (code baseline: the camelCase physical names, the unique index, the FKs, `ON DELETE RESTRICT`); `EP06D…md:28` (the physical names and the explicit "there are no such columns"), `:58` (AC 1), `:100` (baseline), `:104-125` (note 1, the illustrative SQL and the rollback) |
| PR-003 | Should-fix | **Resolved** | One arithmetic, one reading: `length = min(sessionLengthMinutes, remainingWork, remainingDailyBudget)`; the cap truncates and never skips; the deficit is `max(0, remainingWork − placedMinutes)`. I re-computed the review's counterexample by hand against the written formula (`dailyCapMinutes = 100`, one 180-minute window, a 200-minute assignment, `sessionLength 60`, `min 15`): a 60-minute session, then a 40-minute session → **100 placed / 100 deficit** — the numbers pass 1 attributed to Reading A. A grep for the two contradictory sentences ("the budget covers it", "the cap wins for the number of minutes placed") returns **no hit** anywhere in the epic folder. | `D06-20` at `README.md:412`; engine rules 4–5 at `:323-335` (the one arithmetic at `:325-329`, the short-session rule at `:331`, the deficit at `:333`, the worked example at `:335`); `EP06C…md:49-50` (ACs 4–5), `:68` (test group 5), `:107` (note 6), `:126` (risk) |
| PR-004 | Should-fix | **Resolved** | The body is pinned to `{ from, to, sessions: [{ assignmentId, date, startTime, endTime }] }`; `durationMinutes`/`assignmentTitle` are explicitly **response-only** and the client **projects** them away; the time representation is wall-clock `HH:mm` + a civil `YYYY-MM-DD` date in the profile zone in **both** directions; the write-side conversion (`wallToInstant`) and the read's inverse (`zoneDateParts`) are named; the duration is derived server-side, so the unreachable check is gone — a grep for "duration that does not match the range" now returns only the two sentences that explain **why** the case was removed. I verified the whitelist premise in the code: `test-http.ts:97-106` runs the global pipe with `whitelist: true, forbidNonWhitelisted: true`. | `README.md:243` (endpoint row), `:252` (the time representation), `:316` (the response-only projection paragraph), `:347-352` (the save body and its three conversions); `EP06D…md:60-61` (ACs 3–4), `:82` (the 400 on a body carrying `durationMinutes`), `:149-152` (the conversions); `EP06F…md:57` (AC 4), `:102` (note 1), `:80` (the page test) |
| PR-005 | Should-fix | **Resolved** | One comparator, one file: `compareAssignments(...)` in the new `apps/api/src/domain/study-planning/ordering.ts`, created by EP06B and imported by EP06C. The group order (on-time → overdue → undated) and the three tie-breaks (priority descending, `createdAt` ascending, `id` ascending) are now stated identically in four places, and the old "the same deterministic key" sentence is gone. The comparator's "on time" test is defined against the profile zone's civil today, which EP06B's note says the service supplies. | `README.md:190` (module table), `:270` (the read's ordering), `:321` (rule 2), `:401` (D06-9), `:414` (D06-22); `EP06B…md:59` (AC 7), `:69` (`ordering.spec.ts`), `:104` (note 5); `EP06C…md:48` (AC 3), `:101` (note 3) |
| PR-006 | Should-fix | **Resolved** | One ordered algorithm in four steps with **five** worked examples, and I executed the four steps over the review's counterexample bags and checked the post-condition after each step: `{60,90,120,240}` → `90/90/120/240` ✓; `{60,300,200,240}` → `200/200/200/240` ✓; `{60,15,120,10}` → `60/15/120/15` ✓; a null bag → the defaults ✓; `{600,…}` → the defaults ✓. In every case both cross-field rules hold and every value stays in bounds. The V-07-1 value is now pinned to the **effective** `sessionLengthMinutes` (60 with no stored bag, 90 for the counterexample bag). | `README.md:214-218` (the four steps), `:220-227` (the worked examples), `:231` and `:382` (the V-07-1 pinning); `EP06A…md:48-49` (ACs 1–2), `:53` (AC 6), `:62` (the step-by-step unit tests), `:92-98` (note 2); `D06-14` at `:406` |
| PR-007 | Should-fix | **Resolved** | The due date is converted **once**, to the profile zone's civil date, and the engine's due-date input is a `YYYY-MM-DD` string. I verified the named helper in the code: `calendar.service.ts:47-66` is `zoneDateParts(date, timeZone)`, and the calendar renders assignment/exam deadlines with it at `:276` — so the plan and the calendar the student sees use **one** conversion. The horizon and overdue comparisons are on civil dates on both sides (`YYYY-MM-DD` sorts chronologically). | `README.md:251` (the conversion paragraph), `:321` (rule 2), `:337` (rule 7), `:416` (D06-24); `EP06B…md:53` (AC 1), `:92` (note 1); `EP06C…md:100` (the input type), `:69` (test group 6); `EP06D…md:133` (note 2); `EP06G…md:49` (AC 1), `:91` (note 3) |
| PR-008 | Should-fix | **Resolved** | The save names its window; the server accepts any rolling window it could itself have generated (`today − 6 ≤ from ≤ today`); an older window is **409** `{ error: 'WINDOW_ROLLED_OVER' }` with an actionable message and nothing written; a midnight rollover is therefore **not** an error and the student's manual edits survive. The 409's shape, the message and the client's handling are stated in the contract, in EP06D and in EP06F, and EP06H carries the date-boundary risk. | `README.md:243` (the endpoint row's 409), `:320` (rule 1), `:354` (the rollover paragraph), `:413` (D06-21); `EP06D…md:62` (AC 5), `:83` (the service test), `:150` (note 6), `:161` (risk); `EP06F…md:59` (AC 6), `:83` (the page test), `:107` (note 6), `:115` (risk); `EP06H…md:94` (risk) |
| PR-009 | Should-fix | **Resolved** | D06-1 now carries an explicit **supersession** note naming D120-2, D120-4 and D120-8 and stating that the deferral is withdrawn, and FU-EP06-02 gives the orphaned expectation an owner (the coordinator). I read `docs/stories/EP03/SP-120/README.md:94`, `:96` and `:100` directly and confirmed the plan quotes each deferral accurately. EP03's file is not edited. | `README.md:393` (D06-1's supersession), `:471` (FU-EP06-02) |
| PR-010 | Polish | **Resolved** | Each wrong pointer is repointed: rule 4 now cites the generator rule and **D06-12** (not "rule 9", which is *Deferred*); the manual-edit bullets cite **D06-12** (not D06-11); "Replace semantics" cites **D06-13**; EP06D's baseline cites `formatToday` at `:68-75` (called at `:188`) and keeps `:156-179` for the range validation. I verified both line ranges in `calendar.service.ts` (`:68-75` = `formatToday`, `:156-179` = the order rule and the 31-day cap). | `README.md:323` (rule 4), `:360` (the manual-edit bullet), `:361` (replace semantics); `EP06D…md:96` (the baseline) |
| PR-011 | Polish | **Resolved** | EP06E is now named as an owner of TR-E06-09 in the traceability table **and** in the DoD 8 row, and EP06E's own file cites TR-E06-09 in its source requirements and in its DoD 6/7 rows as the recorded manual pass. No other TR's owner set changed. | `README.md:98`, `:111`; `EP06E…md:40`, `:101-102` |
| PR-012 | Polish | **Resolved** | The flagging semantics now have their own decision-register entry with provenance (a missing/non-positive estimate → `MISSING_ESTIMATE`; a missing due date → `MISSING_DUE_DATE`; `MISSING_ESTIMATE` wins; a non-positive estimate is **missing**, not "no work left"), and engine rule 10 and EP06B's scope/AC/risk notes point at it. | `README.md:340` (rule 10), `:417` (D06-25); `EP06B…md:25`, `:55` (AC 3), `:111` (risk) |
| PR-013 | Polish | **Resolved** | The staleness is recorded as a coordinator note with the evidence, and the seam row states that EP07's own two rows are stale. I read EP07's file: `:209` still says "EP06 consumes it to compute remaining work" and `:258` still says "EP06 consumes that endpoint (provisional seam V-07-2)" — both contradict D06-6, exactly as the note records. EP07's file is not edited by this plan. | `README.md:383` (the V-07-2 seam row), `:483` (F-EP06-05) |
| PR-014 | Polish | **Resolved** | The consequence for EP05's accepted plan is recorded as a coordinator note. I read `docs/stories/EP05/README.md:233` (D05-2 promises the widget "lights up with **no rework**"), `:244` (D05-13) and `:255` (V-05-1) — the quotes in the note are accurate, and the note states that the promise is not *broken* by EP06 but is not true of the distinct-type mechanism. EP05's file is not edited. | `README.md:381` (the V-05-1 seam row), `:484` (F-EP06-06) |
| PR-015 | Polish | **Resolved** as to the naming — **but the fix opened a new gap: PR-017** | The helper is now named and consistent everywhere: `freeIntervals(...)` in `apps/api/src/domain/study-planning/intervals.ts`, called by EP06C's placement and by EP06D's re-check. What the naming did **not** do is pin the helper's contract for the two inputs on which the call sites differ — see PR-017. | `README.md:55` (the merge rationale), `:189` (the module table), `:322` (rule 3); `EP06C…md:22-23`, `:102`; `EP06D…md:35`, `:153` |

**Summary:** 15/15 pass-1 findings resolved (9 should-fix, 6 polish). None regressed. The correction pass introduced no unresolved statement of the old findings' content — the two contradictory sentences PR-003 and PR-004 identified are gone from the plan (grep-verified), and the "same deterministic key" sentence PR-005 identified is gone.

---

## Findings (prioritized)

| ID | Severity | Area | Location | Gap / counterexample (short) | Owner |
|---|---|---|---|---|---|
| PR-016 | Should-fix | Migration | `README.md:173` (step 3) + `:176` (step 5); `EP06D…md:108` + `:119` | The step list drops the unique index **after** dropping the column that owns it → `DROP INDEX "scheduled_tasks_studyPlanId_taskId_key"` aborts (the index is already gone) | planner |
| PR-017 | Should-fix | Cross-layer contract (shared helper) | `README.md:189`, `:322`; `EP06C…md:23`, `:102`; `EP06D…md:35`, `:153` | `freeIntervals(...)` has no parameter for the "sessions already placed" it must subtract, and no stated base when the availability windows are omitted → EP06D's re-check computes an empty free set and **every save is 409** | planner |
| PR-018 | Should-fix | Cross-layer contract (persistence) | `EP06D…md:143`; model at `README.md:141-157` | The save's `deleteMany` filters `PlannedSession` by a `date` field the model does not have → the documented Prisma call cannot type-check; the "fix" (a `date` column on `PlannedSession`) diverges from the documented model and migration | planner |
| PR-019 | Polish | Contract naming | `README.md:284`, `:307`; `:405` (D06-13); `EP06D…md:63` | The payloads expose `days[].targetMinutes` while the column is `StudyPlan.targetHours`; the conversion and its rounding are not stated | planner |
| PR-020 | Polish | Cross-layer contract | `README.md:358`; `EP06D…md:61`; `EP06F…md:106` | The conflict `reason` vocabulary is enumerated only in EP06F's note; the shared contract names only the field | planner |
| PR-021 | Polish | Queue accuracy | `README.md:25` | EP06A's dependency cell still reads "D06-1…D06-19"; the register now runs to D06-25 | planner |
| PR-022 | Polish | Correction-log accuracy | `README.md:495` | The PR-002 row's verification names the autopilot checkpoint section as a grep hit; that section contains none of the tokens | planner |

---

## Findings in detail

### PR-016 — Should-fix — The documented migration drops the unique index after the column that owns it

- **Requirement/source:** EP06D AC 1 ("the legacy `"taskId"` column, its foreign key and the per-plan unique constraint are gone"; "the migration's rollback step is documented and reversible"), TR-E06-04 ("the migration's shape and reversibility"), DoD 9 ("API changes and migrations are documented"), and the plan's own mandatory migration check (EP06D's test list: "apply the migration to a database that has the pre-EP06 schema and confirm that the guarded `"assignmentId"` step succeeds…").
- **Observed gap:** the README's normative step list puts the column drop at step 3 and the index drop at step 5, and EP06D's illustrative SQL block repeats that order:
  - `README.md:173` — "3. `ALTER TABLE "planned_sessions" DROP COLUMN "taskId";` — the FK constraint `scheduled_tasks_taskId_fkey` goes with the column (it was `ON DELETE RESTRICT`; the column's own `NOT NULL` goes too)."
  - `README.md:176` — "5. `DROP INDEX "scheduled_tasks_studyPlanId_taskId_key";` (the unique index on `("studyPlanId", "taskId")`); then `CREATE INDEX …`"
  - `EP06D…md:108` and `EP06D…md:119` — the same two statements, in the same order, in the SQL block.
  The unique index is `CREATE UNIQUE INDEX "scheduled_tasks_studyPlanId_taskId_key" ON "scheduled_tasks"("studyPlanId", "taskId")` (init migration `:188`) — it indexes the dropped column. PostgreSQL's documented behaviour for `ALTER TABLE … DROP COLUMN` is that any indexes and table constraints involving the column are dropped with it. The plan's own note at `README.md:173` already reasons this way for the foreign key; the index is the same case and was missed.
- **Concrete consequence / counterexample:** an EP06D implementer who writes the migration from the plan's step list (or copies the illustrative block) runs the DDL and the fifth statement fails with `ERROR: index "scheduled_tasks_studyPlanId_taskId_key" does not exist`. The migration does not apply, so `StudyPlan`/`PlannedSession` never exist and EP06F, EP06G and EP06H are all blocked behind EP06D. The failure is loud and the fix is one line, but the plan's own required migration check is what surfaces it — after the fact, on the epic's critical path.
- **Suggested correction:** either (a) move the `DROP INDEX "scheduled_tasks_studyPlanId_taskId_key"` **before** the `DROP COLUMN "taskId"` (which is the order `prisma migrate diff` produces for a removed `@@unique` plus a removed column), or (b) delete the statement and extend the note at step 3 to say that dropping `"taskId"` removes the unique index `scheduled_tasks_studyPlanId_taskId_key` together with the column's foreign key and its `NOT NULL`. Apply the same correction to the README's step list, to EP06D's SQL block and to EP06D's rollback paragraph (which restores the index on the way back).
- **Acceptance condition:** the documented step list and the SQL block apply cleanly in the order given (no statement names an object that a previous statement has already removed), and the note at step 3 states which constraints and indexes go with the dropped column. The corrected SQL must still use the real physical names (PR-002 stays closed).

### PR-017 — Should-fix — The shared `freeIntervals(...)` helper's contract does not pin the two inputs on which its call sites differ

- **Requirement/source:** PR-015's correction (one shared helper so the placement and the save-time re-check cannot drift), engine rule 3 (`README.md:322`), the merge rationale (`README.md:55`), AC-E06-04 (no overlap with classes, blocked time or confirmed sessions), EP06C AC 2 and EP06D AC 4 (the conflict re-check on save), TR-E06-03/TR-E06-04.
- **Observed gap:** the helper is named and its job is described, but its **signature** and its **two modes** do not agree with the two call sites:
  - the contract says the free intervals are "the student's **available** `AvailabilitySlot` windows for that weekday, minus the **blocked** …, minus the `ClassMeeting` windows …, minus the confirmed `StudySession` intervals, **minus the sessions this run has already placed**" (`README.md:322`; the same list at `EP06C…md:23`);
  - the only signature given is `freeIntervals({ date, available, blocked, classes, busy })` (`EP06C…md:102`) — there is **no parameter** for "the sessions already placed";
  - EP06D calls it as `freeIntervals({ date, blocked, classes, busy })` — "the availability windows **omitted**" (`EP06D…md:153`; `README.md:359`; `README.md:55`) — but the helper's base is defined as "the day's available windows merged" (`EP06C…md:102`), and **what an omitted `available` means is never stated**: "no base windows" (→ an empty result) or "the whole day" (→ the intended hard-conflict-free intervals).
- **Concrete consequence / counterexample:** EP06C is implemented before EP06D, so the helper is written first, from `EP06C…md:102` — `base = merge(available ?? [])`. EP06D then calls it with the availability omitted, as its note instructs, and receives an **empty** free-interval set. Every submitted session is "not inside a free interval", so every save is rejected: `ConflictException` with a `conflicts` array naming every session — the epic's central flow (edit → save) is dead on arrival, and EP06H's conflict scenario would be the only test that passes. The symmetric failure is equally available: an implementer who reads "the whole day" into the omission but never gives the helper the "already placed" input lets the engine's second placement on a day overlap the first, because the contract says the helper subtracts those sessions and no parameter carries them.
- **Suggested correction:** pin the helper's contract in the shared contract section (rule 3) and in EP06C's note 4, and make EP06D's call site consistent with it: (1) give the helper an explicit parameter for the already-placed / already-submitted intervals (`placed`) — the engine passes the sessions it has placed so far, the re-check passes the other submitted sessions; and (2) state what an omitted `available` means — e.g. "when `available` is omitted the base is the whole day (00:00–24:00) minus the blocked windows, the class windows and the confirmed sessions, because a manual edit is not bounded by the student's declared availability (D06-12)". Then say in EP06D's note 7 which value it passes for `placed`.
- **Acceptance condition:** one written signature and one written set of semantics for `freeIntervals(...)`, sufficient for both call sites to be written from the contract alone, with the "availability omitted" mode and the "already placed" input named; and the two call sites (`EP06C…md:102`, `EP06D…md:153`) and the contract's rule 3 state the same thing. TR-E06-03's conflict-avoidance group and TR-E06-04's re-check group must be writable against it.

### PR-018 — Should-fix — The save's replace query filters `PlannedSession` by a field the model does not have

- **Requirement/source:** EP06D AC 5 ("A save replaces exactly the sessions inside the **named** window `[from, to]`"; "the window's previous sessions are gone"), D06-13, TR-E06-04 ("the save is atomic and replaces the window"), DoD 3 (the delete is ownership-scoped).
- **Observed gap:** EP06D's implementation note 6 gives the transaction, and its delete step reads:
  ```ts
  await tx.plannedSession.deleteMany({ where: { studyPlan: { userId }, date: { gte: from, lte: to } } });
  ```
  (`EP06D…md:143`). The `PlannedSession` model in the plan's own data model has **no `date` field** (`README.md:141-157`: `id`, `studyPlanId`, `assignmentId`, `startTime`, `endTime`, `durationMinutes`, `status`, `createdAt`, `updatedAt`); the civil date lives on the parent `StudyPlan.date` (`schema.prisma:311`, `@db.Date`), and the migration does not add a date column to `planned_sessions` (`README.md:170-179`).
- **Concrete consequence / counterexample:** `date` is not a field of `PlannedSession`, so the filter is rejected by Prisma's argument validation (`Unknown argument 'date'`) and by `tsc --noEmit`. The correct filter is on the relation — `where: { studyPlan: { userId, date: { gte: from, lte: to } } }` — which is also what makes the ownership scoping work, since the date lives on the owned `StudyPlan` row. The risk is not the typo but the repair: an implementer who reads the sketch as "a planned session carries its own date" adds a `date` column to `PlannedSession`, which is in neither the documented model nor the documented migration, so the column would not exist at runtime.
- **Suggested correction:** correct the delete filter to the relation form and state in one sentence that a planned session's civil date is its parent `StudyPlan.date` (the per-day container), so the replace scope is selected through the owned plan row. The same sentence should make the ownership scoping explicit (`studyPlan.userId`), so the sketch and the surrounding prose agree.
- **Acceptance condition:** the transaction sketch is a call that type-checks against the documented model, the replace scope is selected through `StudyPlan.date`, and the model in the shared contract and the migration are unchanged by the correction (no `date` column is added to `PlannedSession`).

### PR-019 — Polish — `targetMinutes` in the payloads vs `targetHours` in the column

`PlanPreview.days[].targetMinutes` (`README.md:284`) and `SavedPlan.days[].targetMinutes` (`README.md:307`) are minutes; the stored column is `StudyPlan.targetHours` (a `Float`, `schema.prisma:312`), which D06-13 defines as "the day's **planned** hours (the placed minutes ÷ 60)" (`README.md:405`); EP06D AC 7 speaks of "the planned hours" (`EP06D…md:63`). The conversion and its rounding are never stated, so a projection can return `0.75` where the payload says `45`. **Correction:** state in the payload documentation or in EP06D's projection note that `targetMinutes` = `round(targetHours × 60)` (equivalently the placed minutes for that date), and use one term in AC 7. **Closure:** one sentence in the shared contract, consistent with D06-13.

### PR-020 — Polish — The conflict `reason` vocabulary lives in only one child

The shared contract names the field but not its values: "409 with a `conflicts` array naming each offending session (`sessionIndex`, `date`, `startTime`, `reason`)" (`README.md:358`; the same in EP06D AC 4, `EP06D…md:61`). The four values — `OVERLAPS_CLASS`, `OVERLAPS_BLOCKED_TIME`, `OVERLAPS_CONFIRMED_SESSION`, `OVERLAPS_PLANNED_SESSION` — appear only in EP06F's implementation note (`EP06F…md:106`), where the page maps them to student-facing wording. EP06D, which produces them, has no list to implement against, so the two sides can diverge and the page then shows an unmapped reason for a conflict the server did raise. **Correction:** list the four reason codes in the shared contract's save section and have EP06D's `findConflicts` emit exactly those values (EP06F's mapping then follows the contract). **Closure:** the same vocabulary appears in the shared contract and in EP06D's AC 4 / EP06F's note.

### PR-021 — Polish — EP06A's queue cell still reads "D06-1…D06-19"

`README.md:25` names "D06-1…D06-19 recorded in the decision register below"; the register now runs to **D06-25** (`README.md:417`). The coordinator's checkpoint already recorded this as leftover queue staleness. **Correction:** repoint the cell to "D06-1…D06-25". **Closure:** no queue cell names a decision range that the register does not contain.

### PR-022 — Polish — The PR-002 correction-log verification names a location with no hits

`README.md:495` states: "Grepped the epic folder for `task_id`/`assignment_id`/`study_plan_id`: the only hits are the coordinator-owned autopilot checkpoint section (not edited) and EP06D's explicit 'there are no such columns' statement." I grepped the epic folder for those tokens: the **autopilot checkpoint section (lines 543–596) contains none of them**. The hits are EP06D's explicit statement (`EP06D…md:28`), the correction log's own "Original finding" quotes (`:495`–`:499`, `:503`), and the pass-1 report. The substantive conclusion holds (no snake_case identifier appears in the plan's normative text), but the sentence misstates where the hits are — and it misstates it about a section a reader is told not to edit. **Correction:** restate the verification as "the only normative occurrence is EP06D's explicit 'there are no such columns' statement; the remaining occurrences are this log's own quotes of the original finding and the pass-1 report". **Closure:** the verification cell names only locations that actually contain the tokens.

---

## Planning-coverage summary

### Epic acceptance criteria → owners (all nine covered)

| Epic AC | Owner(s) | Status | Note |
|---|---|---|---|
| AC-E06-01 preferred session durations | EP06A, EP06E | Covered | The shape, the validation, the API and the surface; the reader's behaviour is now one ordered algorithm (PR-006 closed) |
| AC-E06-02 remaining work from estimates + confirmed time | EP06B, EP06G | Covered | Ownership-scoped aggregation; the two-state attribution is honest and named (D06-7, V-07-3) |
| AC-E06-03 placement only inside available windows | EP06C, EP06D | Covered | Rule 3; the shared helper's contract needs the pin in PR-017 |
| AC-E06-04 no overlap with classes/blocked/confirmed | EP06C, EP06D | Covered | The conflict rules + the save-time re-check; the re-check's inputs are PR-017 |
| AC-E06-05 deadline priority with deterministic tie-breaks | EP06C, EP06D | Covered | One comparator, one implementation (PR-005 closed); the due date is a civil date (PR-007 closed) |
| AC-E06-06 review and edit proposed sessions before saving | EP06D, EP06F | Covered as a plan | The save body, the time representation, the window and the rollover are all pinned (PR-001/004/008 closed); the replace query is PR-018 |
| AC-E06-07 report work that cannot fit before a deadline | EP06C, EP06D, EP06G | Covered | One deficit arithmetic (PR-003 closed) |
| AC-E06-08 never change assignment due dates | EP06C, EP06D | Covered | Engine purity + a field-for-field assertion (TR-E06-04) — sound |
| AC-E06-09 flag assignments missing scheduling information | EP06B, EP06C, EP06G | Covered | The semantics now have a decision entry (PR-012 closed) |

### Test requirements → owners (all nine covered)

| TR | Owner(s) | Status |
|---|---|---|
| TR-E06-01 preferences API matrix | EP06A | Covered |
| TR-E06-02 remaining-work tests | EP06B | Covered |
| TR-E06-03 engine unit matrix | EP06C | Covered; the cap group and the horizon group are now pinned (PR-003/PR-007 closed) |
| TR-E06-04 plan API tests | EP06D | Covered; the migration's shape needs PR-016's one-line fix and the re-check's inputs need PR-017 |
| TR-E06-05 preferences-surface tests | EP06E | Covered |
| TR-E06-06 plan-page tests | EP06F | Covered |
| TR-E06-07 remaining-work/warning-surface tests | EP06G | Covered |
| TR-E06-08 cross-layer E2E | EP06H | Covered as a plan; the reload assertion is now writable (PR-001 closed) |
| TR-E06-09 recorded manual accessibility pass | EP06E, EP06F, EP06G (recorded), EP06H (collected) | Covered (PR-011 closed) |

### Shared DoD → owners (all eleven have an owner)

| DoD | Owner(s) | Status |
|---|---|---|
| 1 functional criteria | All children | Covered — the AC table above |
| 2 invalid-input validation | EP06A, EP06B, EP06D, EP06E, EP06F, EP06G | Covered (EP06B: no input; justified N/A) |
| 3 student data scoping | EP06A, EP06B, EP06D, EP06H (+EP06C by construction) | Covered — the uniform 404 verified against `ownership.ts:34-63`; EP06D's replace scope is scoped through `studyPlan.userId` (subject to PR-018's correction) |
| 4 actionable API errors | EP06A, EP06B, EP06D, EP06E, EP06F, EP06G | Covered — the field-level `errors` map precedent verified in `availability.service.ts:56-76`, `:242` |
| 5 loading/empty/error states | EP06E, EP06F, EP06G | Covered |
| 6 keyboard accessibility | EP06E, EP06F, EP06G | Covered (the move/resize keyboard path → `ui-refiner`) |
| 7 responsive layouts | EP06E, EP06F, EP06G | Covered (375px named in each) |
| 8 automated tests | All children (TR-E06-01…08) | Covered |
| 9 API/migration documentation | EP06A, EP06B, EP06D, EP06H | Covered, subject to PR-016 (the migration's statement order) and PR-020 (the reason vocabulary) |
| 10 integrated review | EP06 parent review unit | Covered — one combined review, `./artifacts/EP06/review.md` |
| 11 reviewer walkthrough | Reviewer, once for the parent | Covered — `./artifacts/EP06/walkthrough.md` |

**No DoD obligation is unowned.** The N/A reasons I checked (EP06B "the endpoint takes no input"; EP06C "a pure function has no user context"; EP06H "no product-code change") are honest.

### Child sizing and separation (evidence)

| Child | Outcome | Estimate | Independent, verifiable outcome? | Verdict |
|---|---|---|---|---|
| EP06A | `studyDefaults` shape, validator, defensive reader, `GET/PUT /study-preferences` | 2 | Yes — domain module + endpoint pair + own specs | Sound |
| EP06B | Remaining-work classification + ownership-scoped aggregation + read API + the shared comparator | 1–2 | Yes | Sound |
| EP06C | Pure interval algebra + the shared `freeIntervals` helper + the deterministic engine | 2–3 | Yes — pure module, unit-testable without the DB | Sound (its helper's contract needs PR-017) |
| EP06D | Migration + plan service + preview/save/read API | 2–3 | Yes | Sound (the migration text → PR-016; the replace query → PR-018) |
| EP06E | Preferences section on the profile page | 1 | Yes — own component + client + mount | Sound; **not padded** |
| EP06F | `/plan` page: generate → preview → move/resize/delete → save | 2–3 | Yes — route, nav entry, client, three test files | Sound |
| EP06G | Remaining-work + deficit-warning sections | 1 | Yes — two sections + a formatter | Sound; **not padded** |
| EP06H | New Playwright suite (6 scenarios) + regression sweep + parent index | 2 | Yes — a **new** test suite against the real stack | Sound; **substantive, not a verification-only child** |

All eight children carry the full sizing block required by `.agents/story-sizing.md` (Outcome, Request/token estimate, Model recommendation, Files, Start context, Verification, Dependencies/exclusions). None is README-only, status-only, evidence-only or routine-verification-only. The two splits the coordinator asked about hold up on the evidence:

- **Conflict detection merged into EP06C** — sound: the conflict rules *are* the engine's placement primitives, and the save-time re-check reuses them, so a separate child would have no independently verifiable outcome. The caveat is PR-017 (the shared helper's contract must be pinned so the two call sites cannot drift — which is exactly what PR-015 asked for).
- **Plan persistence folded into EP06D** — sound: the migration, the transactional replace and the three endpoints are one atomic outcome ("the plan persists and round-trips"); splitting the migration from the endpoints would leave a schema with no writer. The child sits at the top of the sizing band (2–3), acceptable because the pieces are inseparable and the plan says so.
- **EP06H is not padded** — it adds a new Playwright suite with six scenarios, a date-dependent fixture, an isolation case and a conflict case, plus the parent index and the three-suite regression sweep: "real integration implementation and a substantial new test harness", which the sizing policy requires for a separate integration child.

### Other planning-checklist rows

| # | Check | Result |
|---|---|---|
| 1 | Child separation and sizing | **Pass** (see the table above) |
| 2 | Original AC/TR coverage | **Pass** — 9/9 ACs, 9/9 TRs, all six proposed stories covered |
| 3 | DoD obligations | **Pass** — all 11 owned; no unowned obligation |
| 4 | Contract consistency and integration ownership | **Fail → PR-016, PR-017, PR-018** (all three are newly introduced by the correction pass; the pass-1 contract defects are closed) |
| 5 | Relevant code paths inspected / unverified disclosed | **Pass** — I re-verified the baseline independently: the schema's model line ranges, the init migration's physical identifiers, `ownership.ts:26-29/34/37/46/60`, the availability module's projection/DTO-revalidation/merged-validation/conflict precedents (`availability.service.ts:35-45, 56-76, 193, 242`), the global pipe (`test-http.ts:97-106`) and the module list (`:72-89`), `update-user.dto.ts:17-20`, `users-profile-integration.spec.ts:147-160`, the calendar's zone helpers (`calendar.service.ts:47-66, 68-75, 105-132, 156-179`) and its deadline rendering (`:276`), the routes (`App.tsx:37-60`), the nav contract (`navGroups.ts:74-84`), the E2E directory (five existing specs, no plan spec). The code baseline's `formatToday` and `zoneDateParts` citations are now correct (PR-010 closed). The plan's unverified items are disclosed (the `ui-refiner` decisions, any browser rendering, EP07A's migration, EP05's calendar decision) |
| 6 | Feature-specific risks with counterexamples and owning tests | **Pass** — the eleven-row invariants table is accurate against `ownership.ts`; each claim has a counterexample, a mechanism and an owning TR; the two new rows added in the correction pass (the browser-local week, the midnight rollover) are consistent with D06-21/D06-23 |
| 7 | Dependency mapping and sequencing | **Pass** — one sequential implementer, EP06A→…→EP06H, EP03/EP04 complete, **no EP07 dependency** (D06-6 is honoured in the code path, not just in prose; V-07-3 is a one-way coupling that is unobservable until EP07A lands), EP05 not a dependency |
| 8 | Material decisions resolved or blocked | **Pass with a note** — D06-1…D06-6 are settled and were not reopened; D06-15's `ui-refiner` handoff is explicit and correctly keeps EP06E/F/G at `Needs refinement`; D06-20…D06-25 are planner-recorded, grounded and reversible, with D06-20 carrying the coordinator's settled PR-003 reading |
| 9 | Correction-log history | **Pass with a note** — 15 rows, one per pass-1 finding, each with the original location, the original finding, the correction, the verification and the status; the log states that the reviewer owns closure. One verification cell misstates where a grep hit is (PR-022) |
| 10 | Jira identity/sync | **Not applicable** — no sync authorised; all eight keys `Pending creation` |

### The plan's own quality-gate verdict (`Draft`) — is it correctly stated, and does it block the other children?

**Correctly stated, and it does not block the other children.** The plan's `Draft` verdict is its own readiness assessment (the plan says so at `README.md:514`), and its stated reason is exactly right: EP06E, EP06F and EP06G are `Needs refinement` because their presentation and interaction decisions are deliberately undecided and belong to the `ui-refiner` (D06-15). That is the repo's own convention — `.agents/story-sizing.md`: "A sizing/refinement gap is `Needs refinement`, not `Ready` to code" — and it mirrors EP05's own pre-`ui-refiner` state (D05-12). The three children's "UI/UX gaps for the `ui-refiner`" sections each enumerate the open decisions concretely (EP06E: 8 gaps; EP06F: 9; EP06G: 9), so the handoff is actionable rather than vague, and the queue and the status line both carry the gate ("Do not start EP06E, EP06F or EP06G before their `ui-refiner` pass", `README.md:36`).

EP06A, EP06B, EP06C, EP06D and EP06H carry **no** undecided UI decision — their "UI/UX gaps" sections say so explicitly — so the `Draft` verdict does not gate them, and the plan says that too (`README.md:512`). The reviewer's verdict is independent of the planner's readiness table: the open findings in this report are contract-precision defects in the migration, the shared helper and the save's replace query — none of them is a UI decision, and none of them depends on the `ui-refiner`.

---

## Handoff

### Findings the planner must address (owner: planner; re-review required)

**Should-fix — must be corrected before implementation starts**

1. **PR-016** — fix the migration's statement order: drop the unique index **before** the column that owns it (or state that dropping `"taskId"` removes the index with it and delete the statement). Apply it to `README.md:170-179`, EP06D's SQL block (`EP06D…md:105-122`), the note at step 3 and the rollback paragraph.
2. **PR-017** — pin the shared `freeIntervals(...)` helper: one signature, one semantics, the "already placed / already submitted" input named, and what an omitted `available` means (the whole day, minus the hard conflicts, per D06-12). Align `README.md:189`, `:322`, `EP06C…md:102` and `EP06D…md:153`.
3. **PR-018** — correct the save's replace filter to the relation form (`studyPlan: { userId, date: { gte: from, lte: to } }`), state that a planned session's civil date is its parent `StudyPlan.date`, and leave the model and the migration unchanged (no `date` column on `PlannedSession`).

**Polish (optional; fix if cheap)**

4. **PR-019** — state the `targetMinutes` ↔ `targetHours` conversion and use one term in EP06D's AC 7.
5. **PR-020** — list the four conflict `reason` codes in the shared contract and have EP06D emit them.
6. **PR-021** — repoint EP06A's queue cell to "D06-1…D06-25".
7. **PR-022** — restate the PR-002 row's verification so it names only the locations that actually contain the tokens.

### Decisions needing the user

**None.** This review does not reopen any settled product choice, and nothing in the three open findings needs a product decision:

- **D06-1 (assignments, not subtasks)** — accepted as settled; PR-009's supersession recording is closed.
- **D06-2 (split across days)**, **D06-3 (fixed 7-day window)**, **D06-4 (the four preference fields)** — accepted as settled; PR-006/PR-007 pin the *behaviour* of choices already made.
- **D06-5 (move/resize/delete, conflicts re-checked on save)** — accepted as settled; PR-017 pins the helper the re-check depends on, without touching the decision.
- **D06-6 (EP06 reads `StudySession` itself)** — accepted as settled and correctly implemented; the only consequence is the coordinator note F-EP06-05.
- **D06-20 (the daily cap truncates rather than skips)** — the coordinator's settled Reading A is implemented consistently; nothing to revisit.

### Deferred edits (non-passing verdict — the docs sync is **not** performed)

Because the verdict is `Changes Required`, the passing-review docs sync is **deferred** and the coordinator should apply the following **only after a passing re-review**:

1. **Correction log** (`docs/stories/EP06/README.md`, the *Plan correction log* table) — one row per finding with its stable ID, the original claim, the consequence, the planner's correction, the reviewer's verification evidence and the disposition, plus a pointer to `docs/stories/EP06/plan-review.md`. The planner owns the correction rows; the reviewer records the disposition on re-review. **This review's dispositions are recorded in the *Prior findings — disposition* table above** (PR-001…PR-015 → resolved) and in the findings table (PR-016…PR-022 → open). The existing 15 rows still read `Addressed — awaiting re-review`; on the next pass they should carry this review's dispositions, and rows for PR-016…PR-022 should be added when the planner corrects them.
2. **Execution queue** — only the verdict-dependent fields: the status line, the reviewed children's states, `Active substory` / `Next substory` (pointing at the next concrete actionable work — the planner's correction pass for PR-016…PR-022, then EP06A's implementation; the `ui-refiner` gate for EP06E/EP06F/EP06G stays a recorded gate with provenance), and a link to the saved report. **Do not** mark anything `Reviewed` (that is reserved for the passing final parent implementation review) and **do not** change the dependency or gate facts this review did not verify. PR-021's stale decision range in EP06A's dependency cell is a **plan-text** correction for the planner, not a queue field the reviewer may write.
3. **Parent status line** — refresh `README.md:6` so it matches the queue and the verdict (it currently reads "Planning — breakdown complete (2026-10-30) … No implementation started", which stays true; after a passing plan review it should record the plan review's verdict and the report link).
4. **Decision provenance** — where a user decision closes a finding, record it (date and substance) in the same correction-log entry. No user decision closed any finding in this pass; D06-20 remains the coordinator's settled reading of 2026-10-30 and is recorded in the plan already.
5. **The `## Autopilot` section is coordinator-owned** and must not be edited by the reviewer; the coordinator updates its own checkpoint (`stage`, `gates.plan`, `last_result`) as it sees fit.

**Nothing else was written.** This review created exactly one file: `docs/stories/EP06/plan-review.md` (this report, replacing the pass-1 report in place per the reviewer's re-review rule; the pass-1 report remains in Git history at commit `1b595e6`). No code, test, migration, story ticket, plan, epic document or Jira issue was modified, and **no Git commit was made** — the coordinator owns the commit of this report.
