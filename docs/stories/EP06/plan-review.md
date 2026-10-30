# EP06 Plan Review — Study Planning & Scheduling

**Review date:** 2026-10-30
**Pass:** 1 (first plan review of this epic — the plan's own correction log records "No plan-review pass yet")
**Reviewer role:** reviewer, `plan_review` mode (planning stage, not implementation)
**Reviewed state:** branch `main`, HEAD `6a756dcbcbe2253bf54df770cc5d6bcfa2a65ed8` (read directly from `.git/refs/heads/main`); the plan under review is the committed working tree of `docs/stories/EP06/**`
**Reviewed paths:** `docs/stories/EP06/README.md` (the breakdown, execution queue, contract, decision register, code baseline, invariants, follow-ups, findings, correction log, quality gate, final review unit) and all eight children `EP06A…EP06H`; source epic `docs/epics/EP06-study-planning-and-scheduling.md`; shared DoD `docs/epics/README.md`; neighbouring plans `docs/stories/EP07/README.md`, `docs/stories/EP05/README.md`, `docs/stories/EP04/README.md`, `docs/stories/EP03/README.md`, `docs/stories/EP03/SP-120/README.md`, `docs/stories/EP09/README.md`
**Application code inspected independently:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261011000000_init/migration.sql`, `apps/api/src/common/ownership/ownership.ts`, `apps/api/src/modules/availability/availability.service.ts`, `apps/api/src/modules/users/{users.controller.ts,users.service.ts,dto/update-user.dto.ts,dto/update-user.dto.spec.ts,users-profile-integration.spec.ts}`, `apps/api/src/modules/calendar/{calendar.service.ts,dto/list-calendar-events-query.dto.ts,calendar-data-scoping.spec.ts,calendar-e2e.spec.ts}`, `apps/api/src/modules/assignments/dto/update-assignment.dto.ts`, `apps/api/src/modules/courses/courses.controller.ts`, `apps/api/src/app.module.ts`, `apps/api/src/test/test-http.ts`, `apps/api/package.json`, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/navGroups.ts`, `apps/web/src/pages/profile/ui/ProfilePage.tsx`, `apps/web/src/shared/types/academic.ts`, `apps/web/src/entities/**` (client pattern), `apps/web/src/shared/ui/**`, `apps/web/src/shared/lib/**`, `apps/web/src/features/{availability,dashboard,calendar,assignments}/**`, `apps/web/.eslintrc.cjs`, `apps/web/e2e/**`, `apps/web/package.json`
**Scope:** the plan's readiness as a whole — AC/TR coverage, child sizing and separation, the shared API/data contract, the engine's stated behaviour against the epic's ACs, ownership/uniform-404 claims, integration ownership, dependency chain, cross-epic seams and DoD obligations.

**Limitations (honest):**
- The reviewer runtime has **no shell**, so no `git status` / `git log` / `git diff` and **no command execution** was possible. The coordinator's record that the plan is nine commits (`d4067d0`…`6a756dc`) on top of baseline `9b1ec19`, touching `docs/stories/EP06/**` only, is **coordinator-provided and reviewer-unverified**; I verified HEAD's hash and the branch by reading `.git/refs/heads/main`. The unrelated dirty `apps/api/tsconfig.json` was not read, staged or modified.
- A plan review requires no test execution (no implementation exists). No test was run and none is claimed.
- The plan's code baseline was re-verified against the **working tree at HEAD `6a756dc`** rather than at its stated baseline `9b1ec19`; by the coordinator's record the code is identical, and every code claim below was checked against the files as they stand.
- The `## Autopilot` section of `docs/stories/EP06/README.md` (lines 467–520) is coordinator-owned; it was read for context and **not** edited.
- No secrets were read; nothing under `.env`/`.env.*` was opened.

---

## Verdict

**`Changes Required`** — 9 open **should-fix** findings (PR-001 … PR-009), 6 **polish** findings (PR-010 … PR-015), **no blocker**.

The plan is strong where it counts: all nine epic ACs and all nine TRs have named owners, the eight children are substantive and correctly sequenced behind one sequential implementer, the ownership/uniform-404 story is consistent with the repo convention, the four coordinator findings are implemented with safe defaults, and the cross-epic seams are genuinely analysed rather than asserted. The open findings are **contract-precision defects in the shared seam** — the part every child implements and every E2E test asserts against — not product-scope problems. None of them reopens a settled user decision (D06-1…D06-6).

The three highest-impact ones, in plain terms:

- **PR-001** — the plan page is required to show the *saved* week on a reload, but the contract gives the client no server-owned way to learn the window (`GET /study-plans` requires `from`/`to`, and the plan forbids the client from deriving "today" from the browser). As written, EP06F AC 7 and EP06H's reload assertion cannot be implemented.
- **PR-002** — the documented migration SQL names columns and an index that **do not exist** in this schema (`"task_id"`, `"study_plan_id"`, `scheduled_tasks_study_plan_id_task_id_key`); the real names are camelCase (`"taskId"`, `"studyPlanId"`, `scheduled_tasks_studyPlanId_taskId_key`). The script fails on its first statement.
- **PR-003** — the daily-cap rule and the session-length rule contradict each other, so the number of minutes the planner places and the deficit it reports to the student depend on which sentence the implementer follows.

---

## Prior findings

None — this is pass 1 for this epic; the plan's correction log is empty and correct in saying so.

---

## Findings (prioritized)

| ID | Severity | Area | Location | Gap / counterexample (short) | Owner |
|---|---|---|---|---|---|
| PR-001 | Should-fix | Cross-layer contract | `README.md:228`; `EP06F…md:60,101`; `EP06H…md:50,62` | `GET /study-plans` requires `from`/`to`, but no server-provided window exists for a fresh mount, and the client may not use the browser's date → the "reload shows the saved week" flow is unimplementable | planner |
| PR-002 | Should-fix | Migration | `README.md:170-179`; `EP06D…md:100-118` | The documented SQL uses snake_case columns/index names that do not exist in this schema (real: `"taskId"`, `"studyPlanId"`, `scheduled_tasks_studyPlanId_taskId_key`) → the migration aborts on statement 1 | planner |
| PR-003 | Should-fix | Engine rules | `README.md:297,298`; `EP06C…md:104,127` | Daily cap vs session length: "a session is only placed when the budget covers it" vs "the cap wins for the number of minutes placed" → placed minutes and reported deficit differ per reading | planner |
| PR-004 | Should-fix | Cross-layer contract | `README.md:227,312`; `EP06D…md:60,138`; `EP06F…md:101` | Save body shape/time format/write-side conversion unpinned; the preview's session carries `durationMinutes`/`assignmentTitle` that the whitelist rejects; "a duration that does not match the range" is unreachable | planner |
| PR-005 | Should-fix | Engine/read consistency | `README.md:246`; `EP06B…md:102`; D06-9 (`README.md:355`) | The remaining-work read sorts overdue work **first** and omits `createdAt`, while the engine processes overdue work **last** — yet the contract calls them "the same deterministic key" | planner |
| PR-006 | Should-fix | Preferences contract | `README.md:213`; `EP06A…md:48,53,90` | Defensive reader: per-field default fallback vs cross-field clamp — AC 1 and AC 6 cannot both hold; the returned `sessionLengthMinutes` is unpinned (matters for seam V-07-1) | planner |
| PR-007 | Should-fix | Engine/service contract | `EP06B…md:90`; `EP06C…md:90-102`; `EP06D…md:119-125` | `Assignment.dueDate` (an instant) is never converted to a civil date in the profile zone before the horizon/overdue test → off-by-one-day placement vs the calendar the student sees | planner |
| PR-008 | Should-fix | Boundary date | `README.md:294,312`; `EP06D…md:32,139` | The save's window is recomputed from "today"; a preview→save midnight rollover yields a 400 that discards the student's manual edits — unspecified | planner |
| PR-009 | Should-fix | Cross-epic ownership | `README.md:347`; `SP-120/README.md:94,96,100` | D06-1 supersedes EP03's deferral of a standalone tasks module (and the `IN_PROGRESS`/`ARCHIVED` subtask lifecycle) to EP06; the supersession is not recorded, so the expectation now has no owner | planner + coordinator |
| PR-010 | Polish | Cross-references | `README.md:297,309,315,316`; `EP06D…md:92` | Wrong pointers inside normative text: rule 4 → "see rule 9" (rule 9 is *Deferred*); the manual-edit bullets cite D06-11 where D06-12 is meant; "Replace semantics (D06-12)" should be D06-13; the calendar's `formatToday` is at `:68-75`, not `:156-186` | planner |
| PR-011 | Polish | Traceability | `README.md:98`; `EP06E…md:126` | TR-E06-09's owners omit EP06E, although EP06E's own verification records its manual accessibility pass as TR-E06-09 evidence | planner |
| PR-012 | Polish | Decision register | `README.md:303,347-365`; `EP06B…md:25,109` | The flagging semantics (missing due date ⇒ flagged; `MISSING_ESTIMATE` precedence; a non-positive estimate treated as missing) are a material reading of AC-E06-09 but carry no decision-register entry or provenance | planner |
| PR-013 | Polish | Cross-epic staleness | `README.md:337`; `EP07/README.md:209,258` | EP07's V-07-2 rows still state that EP06 consumes `GET /study-sessions/confirmed-time`; D06-6 closes the seam the other way. EP06 records the analogous rename staleness (F-EP06-03) but not this | planner → coordinator note |
| PR-014 | Polish | Cross-epic consequence | `README.md:335,426`; `EP05/README.md:233,255` | EP05's D05-2 promises the widget "lights up with **no rework**"; a distinct `PLANNED_SESSION` type means the widget *does* need rework (event type, icon/label map, selector) | planner → coordinator note |
| PR-015 | Polish | Contract cohesion | `README.md:55`; `EP06C…md:22-23`; `EP06D…md:34,139` | "The rules are specified once and used twice" is only partly honoured: `intervals.ts` (EP06C) and `conflicts.ts` (EP06D) can drift unless the shared busy-window subtraction is one named helper | planner |

---

## Findings in detail

### PR-001 — Should-fix — The saved-plan read has no client-side source for the server-owned window

- **Requirement/source:** AC-E06-06 ("Students can review and edit proposed sessions before saving"), EP06F AC 7 ("The page reads the saved plan on mount, so a reload shows the saved week"), EP06H AC 1 and its test 2 ("reload `/plan` and assert the saved sessions are still shown"), DoD 1.
- **Observed gap:** the contract makes the window server-owned — "today" is the civil date in the student's profile `timeZone`, "the window is fixed — there is no `from` parameter on the preview or the save" (`README.md:294`), and EP06F note 4 forbids the browser clock ("It never computes 'today' from the browser's clock (the FU-EP04-01 lesson)", `EP06F…md:104`). But the only read endpoint, `GET /study-plans?from&to`, **requires** both parameters (`README.md:228`), and no endpoint returns a window without the client already supplying one (`GET /calendar/events` requires `from`/`to` too — `apps/api/src/modules/calendar/dto/list-calendar-events-query.dto.ts:16-39`).
- **Concrete consequence / counterexample:** a student saves a week, closes the tab, and reopens `/plan`. The page mounts with no proposal in client state and no window from the server. `GET /study-plans` cannot be called (no `from`/`to`), and computing them locally is exactly the browser-local derivation EP04 already logged as **FU-EP04-01** (`docs/stories/EP04/README.md:202`). The student sees "no plan saved" while a plan *is* saved — and EP06H's reload assertion (the cross-layer proof of AC-E06-06) cannot be written.
- **Suggested correction:** make the server the window's single source in the read path — e.g. make `from`/`to` **optional** on `GET /study-plans`, defaulting to the server's current 7-day window (and echoing `from`/`to`/`timeZone` in the response, which `SavedPlan` already carries), or expose the window on an endpoint the page already calls. Then state the client's fallback explicitly ("the page uses the window the server returns; it never derives dates locally").
- **Acceptance condition:** the shared contract's endpoint table and EP06F's AC 7 / client note state one unambiguous way for the page to obtain the window on a fresh mount, and EP06H's reload test can be written against it without a browser-local date.

### PR-002 — Should-fix — The documented migration SQL names objects that do not exist

- **Requirement/source:** EP06D AC 1 (the migration's shape) and TR-E06-04 ("the migration's shape and reversibility"), DoD 9 (API/migration documentation), EP06H's risk note ("EP06's migration (with its guard and its renames) must apply cleanly in that harness").
- **Observed gap:** the plan's migration steps (`README.md:170-179`) and EP06D's SQL (`EP06D…md:101-117`) use snake_case physical names: `DROP COLUMN "task_id"`, `ADD COLUMN "assignment_id" TEXT`, `DROP INDEX "scheduled_tasks_study_plan_id_task_id_key"`, `CREATE INDEX … ("study_plan_id")`.
- **Concrete consequence / counterexample:** this schema has **no `@map` on scalar fields**, so Prisma's physical columns are camelCase. `apps/api/prisma/migrations/20261011000000_init/migration.sql:155-167` creates `"scheduled_tasks" ("id", "studyPlanId", "taskId", "startTime", "endTime", "durationMinutes", …)` and line 188 creates `CREATE UNIQUE INDEX "scheduled_tasks_studyPlanId_taskId_key" ON "scheduled_tasks"("studyPlanId", "taskId")`; the FKs are `scheduled_tasks_studyPlanId_fkey` / `scheduled_tasks_taskId_fkey` (lines 224, 227). The plan's first DDL statement is therefore `ERROR: column "task_id" does not exist`, and its `DROP INDEX` names a non-existent index. The rollback text repeats the same error (`task_id NOT NULL`). (The plan's **Prisma** model in `README.md:141-157` is correct — `studyPlanId` / `assignmentId` with `@@map("planned_sessions")` — which makes the mismatch between the model and the SQL easy to miss.)
- **Suggested correction:** restate the migration steps against the real physical names (`"taskId"`, `"studyPlanId"`, `"assignmentId"`; index `scheduled_tasks_studyPlanId_taskId_key`; the enum rename `ALTER TYPE "ScheduledTaskStatus" RENAME TO "PlannedSessionStatus"` and the table rename are already correct), or mark the SQL as illustrative and require the implementer to derive it with `prisma migrate diff` (the repo's actual convention). Keep the empty-table guard and the documented rollback, both of which are sound.
- **Acceptance condition:** every identifier in the documented migration matches the schema produced by the existing migrations, and the guard, the NOT NULL step, the FK and the two indexes are stated in the real names (or the SQL is explicitly labelled illustrative with the derivation command named).

### PR-003 — Should-fix — The daily cap and the session-length rule contradict each other

- **Requirement/source:** AC-E06-07 (report work that cannot fit), AC-E06-05 (determinism), TR-E06-03 (the "daily cap" test group).
- **Observed gap:** three statements describe the interaction, and they do not agree. `README.md:297` (rule 4) says the cap "binds deterministically". `EP06C…md:104` (note 5) says "**A session is only placed when the day's remaining budget covers it**". `EP06C…md:127` (risks) says "When both bind, **the cap wins for the number of minutes placed** and the window wins for where they are placed." Rule 5's tail rule (`README.md:298`) keys the shortened session to the *remaining work*, never to the remaining budget.
- **Concrete consequence / counterexample:** `dailyCapMinutes = 100`, availability 09:00–12:00, one assignment of 200 min, `sessionLengthMinutes = 60`, `minSessionMinutes = 15`. Under the implementation note, the engine places one 60-minute session, the day's budget is 40, the next 60-minute session does not fit, nothing more is placed, 40 minutes of the student's day are left unused and 140 minutes are reported as a deficit. Under the risk note's "the cap wins for the number of minutes placed", the engine places a 40-minute tail session and reports 100 minutes unplaced. The two readings differ in the placed minutes, in the deficit minutes the student is shown (AC-E06-07), and in the expected values of TR-E06-03's cap group — the implementer cannot satisfy both statements.
- **Suggested correction:** state one rule. The cheaper-to-test and student-friendlier reading is that the session length is `min(sessionLengthMinutes, remaining work, remaining daily budget)` and the tail rule applies to whichever of the two minima binds; the alternative (refuse to place a session the budget cannot cover, leaving the budget partly unused) must then be stated explicitly together with the consequent deficit arithmetic. Whichever is chosen, record it as a decision with the reasoning, and pin both directions in the TR-E06-03 cap group.
- **Acceptance condition:** the contract contains one unambiguous cap-vs-length rule, its deficit arithmetic is stated, and the TR-E06-03 expectations can be written without choosing between two sentences.

### PR-004 — Should-fix — The save request/response contract is not pinned against the preview's session shape

- **Requirement/source:** AC-E06-06 (review and edit before saving), EP06D AC 4 (the malformed matrix), the "Cross-layer API changes" checklist (request/response shapes, field names, validation, end-to-end verification), EP06F's client.
- **Observed gap:** the body is `{ sessions: [{ assignmentId, date, startTime, endTime }] }` (`README.md:227`), but (a) the **preview's** session carries `durationMinutes` and `assignmentTitle` (`README.md:262`), and the global `FieldValidationPipe` runs with `whitelist: true, forbidNonWhitelisted: true` (`apps/api/src/test/test-http.ts:97-106`) — so a client that posts the session it holds is rejected with 400; (b) the time representation for the body is never stated (the preview uses wall-clock `"09:00"`, the rest of the API uses ISO instants), and the write-side conversion from a wall-clock time to the persisted instant is not specified anywhere (EP06D note 4 covers only *reading* confirmed sessions); (c) the malformed matrix lists "a duration that does not match the range" (`README.md:312`), but the body has no duration field — the check is either dead text or an implicit DTO field the client must be told about.
- **Concrete consequence / counterexample:** EP06F's move/resize edits rebuild the session list it received from `POST /study-plans/preview`. If it posts those objects (the natural implementation), the save returns 400 `property durationMinutes should not exist` and the student cannot save at all. If it projects to exactly the four documented fields, the contract still does not tell it whether `startTime` is `"09:00"` or an instant, nor how the server turns `"2026-11-02T09:00"` in the profile zone into the stored `DateTime` — the write path can land the session on the wrong instant, or be rejected by the DTO's date format.
- **Suggested correction:** specify (i) the exact field set the client may post and that the preview's session must be projected onto, (ii) the time format for both directions and the profile-zone wall-clock → instant conversion on write, and (iii) whether `durationMinutes` is accepted (then the "duration does not match the range" check is live and the client's edits round-trip) or derived server-side (then drop the check from the matrix).
- **Acceptance condition:** the endpoint table, EP06D's AC 4, EP06D's implementation notes and EP06F's client note agree on one body shape, one time representation and one derivation of the duration, and a reader can write EP06F's save call and EP06D's DTO from the contract alone.

### PR-005 — Should-fix — The remaining-work read's ordering contradicts the engine's, while the contract calls them the same

- **Requirement/source:** AC-E06-02, AC-E06-05 (deterministic ordering), D06-9, the contract sentence at `README.md:246`.
- **Observed gap:** D06-9 and engine rule 2 (`README.md:295`) order **on-time first (due date ascending), overdue last**, then priority descending, then `createdAt` ascending, then `assignmentId` ascending. The read's order is "due date ascending (nulls last), then priority descending, then `id` ascending" (`README.md:246`, `EP06B…md:102`) — no overdue/on-time grouping and no `createdAt` key — yet the contract asserts it is "**the same deterministic key the engine uses (D06-9), so the read and the plan agree on which work is 'next'**".
- **Concrete consequence / counterexample:** with one overdue assignment and one assignment due tomorrow, the read shows the **overdue** work first while the plan **defers** it behind the on-time work (rule 8) — the list and the plan visibly disagree about what is "next". With two assignments sharing a due date and a priority but different `createdAt`, the engine orders them by `createdAt`, the read by `id`: the same two rows can appear in opposite orders in the list and in the generated week.
- **Suggested correction:** make the read reuse the engine's comparator (extract it into the shared domain module and use it in both places), or state one comparator for both and correct the sentence. If the read intentionally differs, say why and do not claim they agree.
- **Acceptance condition:** one ordering is specified once, used by the engine and the read, and the contract no longer asserts an equality that the two definitions do not have.

### PR-006 — Should-fix — The defensive reader's cross-field repair is unspecified

- **Requirement/source:** EP06A AC 1 ("the cross-field rules `min ≤ sessionLength ≤ max` and `dailyCap ≥ min` hold for **every value the endpoint returns or accepts**"), AC 6 ("the affected field falls back to its default and **the other fields are unaffected**"), the contract's read behaviour (`README.md:213`: "each field falls back to its default independently"), and seam **V-07-1** (EP07 reads `sessionLengthMinutes` as its session-duration default).
- **Observed gap:** two incompatible descriptions. The contract and AC 6 describe a **per-field default fallback**. The implementation note (`EP06A…md:90`) describes per-field bounds fallback **plus** a cross-field repair: "it re-applies the cross-field rules by **lowering** `sessionLengthMinutes` into `[min, max]` and **raising** `dailyCapMinutes` to at least `minSessionMinutes` (falling back to the defaults if that is impossible)". "Lowering" cannot express the raise case, and "falling back to the defaults if that is impossible" does not say *which* defaults or in what order.
- **Concrete consequence / counterexample:** stored `{ sessionLengthMinutes: 60, minSessionMinutes: 90, maxSessionMinutes: 120, dailyCapMinutes: 240 }` — every field is individually in bounds, so the per-field rule changes nothing and the reader would return `60 / 90 / 120 / 240`, which **violates AC 1** (`min 90 > sessionLength 60`); the implementation note instead returns `90 / 90 / 120 / 240`. Two defensible readings, two different effective values — and the value EP07 will read as its session-duration default under V-07-1 differs (60 vs 90), so EP07's own re-check cannot be performed mechanically.
- **Suggested correction:** specify the reader as one ordered algorithm — e.g. (1) per field: accept only an integer inside its bounds, else use that field's default; (2) then repair the cross-field invariants in a stated order and stated direction, naming exactly which value is adjusted and what the result is when the repair is impossible; and align AC 1, AC 6 and the contract's read-behaviour sentence with it.
- **Acceptance condition:** one reader algorithm, stated in the shared contract, with worked examples for (a) an out-of-range field, (b) a `min > max` pair, and (c) an in-bounds set that violates a cross-field rule — and AC 1, AC 6 and the implementation note all agree with it.

### PR-007 — Should-fix — The due date's conversion to a civil date is unspecified

- **Requirement/source:** AC-E06-05 (deadline priority), AC-E06-07 (work that cannot fit before a deadline), engine rules 2, 7 and 8, the "Scheduling and time calculations" checklist (time zones, boundary dates, deterministic inputs/outputs).
- **Observed gap:** EP06B's domain input carries `dueDate: Date | null` (`EP06B…md:90` — an instant), while the engine's input carries `days: string[]` (civil dates) and the engine's grouping compares `dueDate >= days[0]` and `dueDate < days[0]` (`EP06C…md:102`) — an instant against a civil date, with no conversion named. EP06D's data gathering (note 2) converts the *confirmed sessions* into profile-zone wall-clock intervals but says nothing about `Assignment.dueDate`.
- **Concrete consequence / counterexample:** an assignment with `dueDate = 2026-11-01T00:30:00.000Z` and a profile zone of `America/New_York` is **31 October** for the student — and the calendar page renders it that way (the calendar converts deadlines with `zoneDateParts`, `apps/api/src/modules/calendar/calendar.service.ts:47-66`). If the engine compares the UTC date, the horizon admits 1 November: the planner schedules up to a day after the deadline the student sees, and a due date of "yesterday 19:30 local" is classified as overdue when the student would call it today.
- **Suggested correction:** state that the due date is converted to the **profile zone's civil date** (the same conversion the calendar uses) before the on-time/overdue grouping and the horizon comparison, and make the engine's input type explicit (`dueDate` as a civil date string or a day index, not an instant). Name the conversion in EP06D's data-gathering note and pin it in TR-E06-03's deadline-horizon group.
- **Acceptance condition:** the engine's input type for the due date and the zone conversion are stated in the shared contract, and the horizon/overdue test cases include a due date whose UTC day differs from its local day.

### PR-008 — Should-fix — The window is recomputed at save time; the preview→save rollover is unspecified

- **Requirement/source:** AC-E06-06 (review and edit, then save), the "Scheduling and time calculations" checklist (boundary dates), FU-EP06-01 (manual edits are lost on regeneration).
- **Observed gap:** the window is "the next 7 days starting today" and "there is no `from` parameter on the preview or the save" (`README.md:294`); the save therefore recomputes "today" itself, while the malformed matrix rejects "a date outside the window" with 400 (`README.md:312`). The contract never says the two windows can differ, and never says what the client should do when they do.
- **Concrete consequence / counterexample:** a student previews at 23:59 in their profile zone and saves at 00:05. The window has rolled forward; the sessions they moved and resized now carry yesterday's date, the save returns 400 `date is outside the plan window`, nothing is written, and because the proposal is client-held (D06-19) their manual edits are the only copy — which FU-EP06-01 says a regeneration discards. The student is left with a 400 and an unexplained loss of work.
- **Suggested correction:** state the relationship explicitly — e.g. the save validates against the current window and returns a 409/400 whose message names the rollover ("the week has rolled over — regenerate"), and the page regenerates while preserving nothing (or re-issuing the proposal) instead of showing a bare error; or accept a window that is the current or the immediately preceding one.
- **Acceptance condition:** the rollover behaviour is stated in the shared contract, the error is actionable (Rule 9), and EP06F's error/conflict handling and EP06H's date-boundary risk cover it.

### PR-009 — Should-fix — D06-1's supersession of EP03's deferral is not recorded (an expectation now has no owner)

- **Requirement/source:** `.agents/story-sizing.md` — "Every excluded source requirement still needs an owner"; the planning checklist's "no out-of-scope functionality" and coverage rows; D06-1 (user-settled 2026-10-30).
- **Observed gap:** EP03's SP-120 decision register deferred three things **to EP06**: "standalone tasks (EP06) can add top-level routes later" (D120-2), "`IN_PROGRESS` and `ARCHIVED` are lifecycle states for standalone tasks (EP06)" (D120-4), and "A standalone tasks module belongs to EP06" (D120-8) — `docs/stories/EP03/SP-120/README.md:94,96,100`. D06-1 (user-settled) schedules **assignments**, not subtasks, and EP06's plan creates no tasks module. The plan records D06-1 but neither notes that it supersedes the EP03 deferral nor gives the deferred expectation an owner; the *Open follow-ups* table contains only FU-EP06-01, and the *Findings for the coordinator* table does not mention it.
- **Concrete consequence / counterexample:** the `Task` model's `IN_PROGRESS`/`ARCHIVED` statuses and any top-level `/tasks` surface now have no owner anywhere in the plan set; a later planner or implementer reading EP03's register will look for them in EP06, find a plan that explicitly excludes them, and either build an unowned surface or drop a recorded requirement silently.
- **Suggested correction:** add the supersession to the decision register on D06-1 ("this decision supersedes EP03's D120-2/D120-4/D120-8 deferral of a standalone tasks module to EP06; that deferral is withdrawn") **and** record the now-unowned expectation in the *Open follow-ups* table with a suggested owner (a planner sizing pass, or EP08's scope), so nothing is silently dropped. This does not reopen D06-1 — the user already settled that assignments are scheduled.
- **Acceptance condition:** D06-1 names the EP03 decisions it supersedes, and the *Open follow-ups* table carries an entry (with an owner) for the standalone-task expectation that EP03 deferred to EP06.

### PR-010 — Polish — Wrong cross-references inside normative text

- `README.md:297` — rule 4 says "The cap is a **generator** rule (see rule 9)", but rule 9 is *Deferred*; the generator-rule concept is defined in the save/edit section and in D06-12.
- `README.md:309` and `:315` — the manual-edit bullets cite **D06-11** (the deficit categories) where **D06-12** (the manual-edit bounding decision) is meant; `README.md:316` labels the replace semantics "(D06-12)" where **D06-13** is meant.
- `EP06D…md:92` cites the calendar's "today" derivation as `calendar.service.ts:156-186`; `formatToday` is defined at `:68-75` and called at `:188` (the cited range holds the range validation and the profile lookup).
- **Correction / closure:** repoint each reference; the prose itself is already correct, so no behaviour changes.

### PR-011 — Polish — TR-E06-09's owners omit EP06E

`README.md:98` names "EP06F, EP06G (recorded), EP06H (collected)"; EP06E's own verification line (`EP06E…md:126`) records "a manual browser pass at a 375px viewport and with the keyboard only (recorded as part of TR-E06-09's evidence)". Either add EP06E as an owner or state that TR-E06-09 covers the plan surface only and EP06E's manual pass is recorded under its own verification evidence.

### PR-012 — Polish — The flagging semantics have no decision-register entry

Rule 10 (`README.md:303`) and EP06B's scope (`EP06B…md:25`, risks `:109`) make three material readings of AC-E06-09 — a missing **due date** is "necessary scheduling information" (flagged, never scheduled); `MISSING_ESTIMATE` takes precedence when both are missing; a non-positive estimate is treated as missing rather than as "no work left". They are specified in the contract but carry no decision ID or provenance. Add a decision-register entry (planner-recorded, grounded in the assignment-centric ACs, reversible).

### PR-013 — Polish — EP07's V-07-2 rows are now stale

`docs/stories/EP07/README.md:209` ("EP06 consumes it to compute remaining work") and its invariant row `:258` ("EP06 consumes that endpoint (provisional seam V-07-2)") now contradict D06-6, under which EP06 aggregates `StudySession` itself. EP06's seam table correctly records V-07-2 as closed (`README.md:337`), and F-EP06-03 already reports the analogous `ScheduledTask` → `PlannedSession` staleness — this is the same class of item and deserves the same coordinator note. EP06 must not edit EP07's file; record it as a coordinator note.

### PR-014 — Polish — EP05's "no rework" premise is affected by the new event type

EP05's D05-2 (`docs/stories/EP05/README.md:233`) promises the study-sessions widget "lights up with **no rework** when they land"; D05-13 (`:244`) and V-05-1 (`:255`) record the provisional seam. EP06's mechanism — a **distinct** `PLANNED_SESSION` calendar event type (`README.md:335`) — means the widget *does* need rework (a new event type in the API union, the icon/label map, the selector's decision). F-EP06-04 records the mechanism and the impact ("the dashboard widget keeps its empty state") but not this consequence for EP05's accepted plan. Note it for the coordinator; the coordinator has already ruled that the change stays out of EP06's scope.

### PR-015 — Polish — Name the one shared "busy window" helper

The justification for merging conflict detection into EP06C is that "the rules are specified once and used twice — by the placement and by the save-time re-check" (`README.md:55`). In practice the placement computes the free intervals in `scheduler.ts`/`intervals.ts` (EP06C) while the save-time re-check lives in a separate new file `apps/api/src/domain/study-planning/conflicts.ts` (EP06D), which "reuses the interval algebra from EP06C". Two implementations of "available − blocked − classes − confirmed" can drift, which would quietly re-open the epic's proposed story 4 (calendar conflict detection) as a second concern. Name the single shared helper (e.g. `busyWindows(...)`/`freeIntervals(...)`) that both call.

---

## Planning-coverage summary

### Epic acceptance criteria → owners (all nine covered)

| Epic AC | Owner(s) | Status | Note |
|---|---|---|---|
| AC-E06-01 preferred session durations | EP06A, EP06E | Covered | Shape/validation/API + surface; reader's exact behaviour needs PR-006 |
| AC-E06-02 remaining work from estimates + confirmed time | EP06B, EP06G | Covered | Aggregation is ownership-scoped; state A/B is honest (D06-7) |
| AC-E06-03 placement only inside available windows | EP06C, EP06D | Covered | Rule 3; window ownership needs PR-001/PR-007 |
| AC-E06-04 no overlap with classes/blocked/confirmed | EP06C, EP06D | Covered | Conflict rules + save-time re-check |
| AC-E06-05 deadline priority with deterministic tie-breaks | EP06C, EP06D | Covered | Ordering is total; the read's order disagrees — PR-005 |
| AC-E06-06 review and edit proposed sessions before saving | EP06D, EP06F | Covered as a plan | Blocked in practice by PR-001, PR-004, PR-008 |
| AC-E06-07 report work that cannot fit before a deadline | EP06C, EP06D, EP06G | Covered | Deficit minutes depend on PR-003 |
| AC-E06-08 never change assignment due dates | EP06C, EP06D | Covered | Engine purity + a field-for-field assertion (TR-E06-04) — sound |
| AC-E06-09 flag assignments missing scheduling information | EP06B, EP06C, EP06G | Covered | Flagging semantics need a register entry (PR-012) |

### Test requirements → owners (all nine covered)

| TR | Owner(s) | Status |
|---|---|---|
| TR-E06-01 preferences API matrix | EP06A | Covered (reader specifics → PR-006) |
| TR-E06-02 remaining-work tests | EP06B | Covered |
| TR-E06-03 engine unit matrix | EP06C | Covered; cap group depends on PR-003, horizon group on PR-007 |
| TR-E06-04 plan API tests | EP06D | Covered; migration shape depends on PR-002 |
| TR-E06-05 preferences-surface tests | EP06E | Covered |
| TR-E06-06 plan-page tests | EP06F | Covered; the journey depends on PR-001/PR-004 |
| TR-E06-07 remaining-work/warning-surface tests | EP06G | Covered |
| TR-E06-08 cross-layer E2E | EP06H | Covered as a plan; the reload assertion depends on PR-001 |
| TR-E06-09 recorded manual accessibility pass | EP06F, EP06G, EP06H | Covered — EP06E omitted (PR-011) |

### Shared DoD → owners (all eleven have an owner)

| DoD | Owner(s) | Status |
|---|---|---|
| 1 functional criteria | All children | Covered — ACs above |
| 2 invalid-input validation | EP06A, EP06B, EP06D, EP06E, EP06F, EP06G | Covered (EP06B: no input; justified N/A) |
| 3 student data scoping | EP06A, EP06B, EP06D, EP06H (+EP06C by construction) | Covered — uniform 404 verified against `ownership.ts:34-63` |
| 4 actionable API errors | EP06A, EP06B, EP06D, EP06E, EP06F, EP06G | Covered; field-level `errors` map precedent verified in `availability.service.ts:69-76` |
| 5 loading/empty/error states | EP06E, EP06F, EP06G | Covered |
| 6 keyboard accessibility | EP06E, EP06F, EP06G | Covered (move/resize keyboard path → `ui-refiner`) |
| 7 responsive layouts | EP06E, EP06F, EP06G | Covered (375px named in each) |
| 8 automated tests | All children (TR-E06-01…08) | Covered |
| 9 API/migration documentation | EP06A, EP06B, EP06D, EP06H | Covered — but the migration document is wrong (PR-002) |
| 10 integrated review | EP06 parent review unit | Covered — one combined review, `artifacts/EP06/review.md` |
| 11 reviewer walkthrough | Reviewer, once for the parent | Covered — `artifacts/EP06/walkthrough.md` |

**No DoD obligation is unowned.** Every DoD row has a named owner or a justified N/A, and the N/A reasons I checked (EP06B "the endpoint takes no input", EP06C "a pure function has no user context", EP06H "no product-code change") are honest.

### Child sizing and separation (evidence)

| Child | Outcome | Estimate | Independent, verifiable outcome? | Verdict |
|---|---|---|---|---|
| EP06A | `studyDefaults` shape, validator, defensive reader, `GET/PUT /study-preferences` | 2 | Yes — domain module + endpoint pair + own specs | Sound |
| EP06B | Remaining-work classification + ownership-scoped aggregation + read API | 1–2 | Yes | Sound |
| EP06C | Pure interval algebra + free-interval/conflict rules + deterministic engine | 2–3 | Yes — pure module, unit-testable without the DB | Sound |
| EP06D | Migration + plan service + preview/save/read API | 2–3 | Yes | Sound (migration text → PR-002) |
| EP06E | Preferences section on the profile page | 1 | Yes — own component + client + mount | Sound; **not padded** |
| EP06F | `/plan` page: generate → preview → move/resize/delete → save | 2–3 | Yes — route, nav entry, client, three test files | Sound |
| EP06G | Remaining-work + deficit-warning sections | 1 | Yes — two sections + a formatter | Sound; **not padded** |
| EP06H | New Playwright suite (6 scenarios) + regression sweep + parent index | 2 | Yes — a **new** test suite against the real stack | Sound; **substantive, not a verification-only child** |

All eight children carry the full sizing block required by `.agents/story-sizing.md` (Outcome, Request/token estimate, Model recommendation, Files, Start context, Verification, Dependencies/exclusions). None is README-only, status-only, evidence-only or routine-verification-only. The two splits the coordinator asked about hold up on the evidence:

- **Conflict detection merged into EP06C** — sound. The rules are the engine's placement primitives, and the save-time re-check reuses the same interval algebra, so a separate child would have no independently verifiable outcome. The caveat is PR-015 (one shared helper must exist so the two call sites cannot drift).
- **Plan persistence folded into EP06D** — sound. The migration, the transactional replace and the three endpoints are one atomic outcome ("the plan persists and round-trips"); splitting the migration from the endpoints would leave a schema with no writer. The counter-argument to check is the child is at the top of the sizing band (2–3 tokens) with a migration, a transaction and three endpoints — acceptable because the pieces are inseparable, and the plan says so.
- **EP06H is not padded** — it adds a new Playwright suite with six scenarios, a date-dependent fixture, an isolation case and a conflict case, plus the parent index and the three-suite regression sweep. That is "real integration implementation and a substantial new test harness", which the sizing policy requires for a separate integration child.

### Other planning-checklist rows

| # | Check | Result |
|---|---|---|
| 1 | Child separation and sizing | **Pass** (see table above) |
| 2 | Original AC/TR coverage | **Pass** — 9/9 ACs, 9/9 TRs, all six proposed stories covered |
| 3 | DoD obligations | **Pass** — all 11 owned; no unowned obligation |
| 4 | Contract consistency and integration ownership | **Fail → PR-001, PR-003, PR-004, PR-005, PR-006, PR-007, PR-008** |
| 5 | Relevant code paths inspected / unverified disclosed | **Pass** — I re-verified the baseline independently; the plan's citations are accurate (schema line ranges, `ownership.ts`, the availability precedent, `update-user.dto.ts:17-20`, `users-profile-integration.spec.ts:147-160`, `calendar.service.ts`, `test-http.ts:72-89`, `app.module.ts:13-33`, `App.tsx:37-60`, `navGroups.ts:74-84`, `ProfilePage.tsx:21-27,111-129`, the FSD rules, the 13 migrations) — **except** the migration SQL's object names (PR-002) and the `formatToday` citation (PR-010) |
| 6 | Feature-specific risks with counterexamples and owning tests | **Pass** — the nine-row invariants table is accurate against `ownership.ts`; each claim has a counterexample, a mechanism and an owning TR |
| 7 | Dependency mapping and sequencing | **Pass** — one sequential implementer, EP06A→…→EP06H, EP03/EP04 complete, **no EP07 dependency** (D06-6 is honoured in the code path, not just in prose), EP05 not a dependency |
| 8 | Material decisions resolved or blocked | **Pass with a note** — D06-1…D06-6 are settled; D06-15's `ui-refiner` handoff is explicit and correctly keeps EP06E/F/G at `Needs refinement`; the flagging reading needs a register entry (PR-012) |
| 9 | Correction-log history | **Pass** — empty and accurate for a first plan |
| 10 | Jira identity/sync | **Not applicable** — no sync authorised; all eight keys `Pending creation` |

### What is sound (recorded so the planner does not re-open it)

- **The four coordinator findings are implemented with sound defaults.** D06-7/V-07-3 states the two-state attribution honestly, names the upgrade point in EP06B, and correctly observes that it is unobservable today (I verified: no API writes `StudySession`; the only writes are `calendar-data-scoping.spec.ts:52` and `calendar-e2e.spec.ts:108`). D06-14's defensive reader is the right call against a second writer whose test file belongs to EP01. D06-8's rename is justified and its data risk is genuinely nil (I verified `StudyPlan`/`ScheduledTask` appear nowhere in `apps/` except the ownership comment). D06-18's `PLANNED_SESSION` mechanism is right: reusing `STUDY_SESSION` would make EP05's widget render proposals as logged time.
- **The engine is genuinely pure and genuinely deterministic.** The twelve rules, the total ordering, the half-open interval algebra and the no-write-path guarantee satisfy the epic's Technical Notes ("a pure TypeScript domain module", "persist confirmed results through Prisma transactions").
- **Ownership and the uniform 404 are consistent with the repo convention** (`ownership.ts:34-63`): every new endpoint is planned with `ownedWhere`/`assertOwned`/`assertAffected` and the same `Resource not found` message, `PlannedSession` is scoped through `studyPlan.userId`, and the save's foreign-assignment case returns the identical 404.
- **The module precedent is real and correctly cited** — the availability module's projection, `dtoErrors`, `throwFieldErrors`, `validateSlotTimes`, `ConflictException`, `assertAffected` and the "validation runs on the merged values" rule all exist at the cited lines, and the two registration lists (`app.module.ts:13-33`, `test-http.ts:72-89`) are the right pair to update.
- **One writer across all layers** is stated in the queue, and the sequence is dependency-correct (EP06E depends only on EP06A; EP06F on EP06D; EP06G on EP06B + EP06F; EP06H on all). No concurrent implementation is required anywhere.
- **The child file set is exactly the contract each child needs** — the sizing blocks' start-context lists point at the precise contract sections and code paths, with an explicit "do not read unrelated epic stories".
- **`GET /study-plans` / `POST /study-plans` are new routes with no route conflicts** (`/study-plans/remaining-work` vs `/study-plans`, `POST /study-plans/preview` vs `POST /study-plans`), and the module is new, so no existing route is disturbed.

---

## Handoff

### Findings the planner must address (owner: planner; re-review required)

**Should-fix — must be corrected before implementation starts**

1. **PR-001** — give the client a server-owned way to obtain the plan window on a fresh mount (make `from`/`to` optional on `GET /study-plans` with a server default, or expose the window another way); align EP06F's AC 7 / client note and EP06H's reload test.
2. **PR-002** — restate the migration steps against the real physical names (`"taskId"`, `"studyPlanId"`, `"assignmentId"`, `scheduled_tasks_studyPlanId_taskId_key`) or mark the SQL illustrative and name `prisma migrate diff` as the derivation; fix the rollback text the same way.
3. **PR-003** — choose one daily-cap vs session-length rule, state its deficit arithmetic, and record it as a decision.
4. **PR-004** — pin the save body's field set, the time representation and the write-side conversion; resolve the unreachable "duration does not match the range" check.
5. **PR-005** — use one ordering for the engine and the remaining-work read (or state that they differ) and correct the "same deterministic key" sentence.
6. **PR-006** — specify the defensive reader as one ordered algorithm and align AC 1, AC 6 and the contract's read-behaviour sentence; add worked examples.
7. **PR-007** — specify the due-date → profile-zone civil-date conversion and the engine's due-date input type.
8. **PR-008** — specify the preview→save rollover behaviour and make the error actionable.
9. **PR-009** — record D06-1's supersession of EP03's D120-2/D120-4/D120-8 deferral and give the deferred standalone-task expectation an owner in *Open follow-ups*.

**Polish (optional; fix if cheap)**

10. **PR-010** — repoint the wrong cross-references (rule 4 → the generator-rule definition; D06-11 → D06-12; "Replace semantics (D06-12)" → D06-13; the `formatToday` line range).
11. **PR-011** — add EP06E to TR-E06-09's owners, or scope TR-E06-09 to the plan surface explicitly.
12. **PR-012** — add a decision-register entry for the flagging semantics.
13. **PR-013** — add a coordinator note that EP07's V-07-2 rows (`:209`, `:258`) are stale under D06-6 (same class as F-EP06-03).
14. **PR-014** — add a coordinator note that EP05's D05-2 "no rework" premise is affected by the distinct `PLANNED_SESSION` type.
15. **PR-015** — name the single shared busy-window/free-interval helper used by EP06C and EP06D.

### Decisions needing the user

**None.** This review does not reopen any settled product choice:

- **D06-1 (assignments, not subtasks)** — accepted as settled; PR-009 only asks that its **supersession** of EP03's deferral be recorded, not that the choice change.
- **D06-2 (split across days)**, **D06-3 (fixed 7-day window)**, **D06-4 (the four preference fields)** — accepted as settled; PR-006/PR-007 pin the *behaviour* of choices already made.
- **D06-5 (move/resize/delete, conflicts re-checked on save)** — accepted as settled; PR-003/PR-008 pin rules that D06-5 depends on.
- **D06-6 (EP06 reads `StudySession` itself)** — accepted as settled and correctly implemented; the only consequence is the coordinator note in PR-013.

One optional question the coordinator may wish to settle (not required for a pass): whether the planner prefers reading A or reading B in PR-003. The reviewer recommends A (the session length is also bounded by the remaining daily budget, so no available minutes are wasted), because it keeps the student's declared daily cap meaningful and matches the risk note's wording; either is acceptable if it is stated once and pinned in the tests.

### Deferred edits (non-passing verdict — the docs sync is **not** performed)

Because the verdict is `Changes Required`, the passing-review docs sync is deferred. The coordinator (not the reviewer) should apply the following after the planner's correction pass and the re-review, **only if the re-review passes**:

1. **Correction log** (`docs/stories/EP06/README.md`, the *Plan correction log* table) — one row per finding with its stable ID, original claim, consequence, the planner's correction, the verification evidence and the status, plus a pointer to `docs/stories/EP06/plan-review.md`. The planner owns the correction rows; the reviewer records the disposition on re-review.
2. **Execution queue** — only the verdict-dependent fields: the status line, the reviewed children's states, `Active substory` / `Next substory` (pointing at the next concrete actionable work — the planner's correction pass for PR-001…PR-015 — or `None` with a reason), and a link to the saved report. **Do not** mark anything `Reviewed` (that is reserved for the passing final parent implementation review) and **do not** change the dependency or gate facts this review did not verify.
3. **Parent status line** — refresh the README's `**Status:**` line to match the queue and the verdict (it currently reads "Planning — breakdown complete (2026-10-30) … No implementation started", which stays true; after a passing plan review it should record the plan review's verdict and the report link).
4. **Decision provenance** — where a user decision closes a finding, record it (date and substance) in the same correction-log entry.
5. **The `## Autopilot` section is coordinator-owned** and must not be edited by the reviewer; the coordinator updates its own checkpoint (`stage`, `gates.plan`, `last_result`) as it sees fit.

**Nothing else was written.** This review created exactly one file: `docs/stories/EP06/plan-review.md`. No code, test, migration, story ticket, plan, epic document or Jira issue was modified, and no Git commit was made (the coordinator owns the commit of this report).
