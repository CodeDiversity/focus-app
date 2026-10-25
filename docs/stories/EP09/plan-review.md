# EP09 Whole-Plan Review — Pass 2 (Focused Re-Review)

**Review date:** 2026-10-25
**Pass number:** 2 — focused re-review of the corrected lines only, per the pass-1 handoff; not a full re-review of the whole plan. Pass 1 (first whole-plan review, reviewed at `5cad9c7`, committed `9d3f546`) returned **Changes Required** with PR-001/PR-002 (should-fix) and PR-003/PR-004 (polish). The pass-1 report is preserved in Git history; this file is the latest report.
**Reviewed state:** branch `main`, HEAD `1f3b269`, clean tree — as stated by the coordinating session. The reviewer runtime has no shell access (no general command tool available), so Git state is taken from coordinator provenance, not re-verified; the planner's fix commit is `9a0aeb8` (`ep09-plan-fix-1`) per the Autopilot run record, and its diff could not be inspected for the same reason.
**Mode:** Plan review (plan-only, focused). No implementation quality review, no test execution, no user walkthrough (plan-only reviews do not create one).
**Context:** EP09 parent review unit, autopilot run 2026-10-25 (user request: plan + implement E2E data cleanup). The planner applied all four pass-1 corrections and recorded them as PC-EP09-02…PC-EP09-05 (status `Addressed — awaiting re-review`). This pass independently re-reads the current text; planner summaries and correction-log verification claims are treated as unverified.

## Scope and inputs

Corrected lines re-read in current text:

- `docs/stories/EP09/README.md` — Environment contract bullet 1 (lines 13-17) and SP-119 bullet (lines 23-28); quality gate row 9 (line 114); Outcome line (line 117); final implementation review unit — Gate line (line 124); plan correction log PC-EP09-02…PC-EP09-05 (lines 97-100); Autopilot section (lines 126-138)
- `docs/stories/EP09/SP-119-e2e-dedicated-test-database.md` — AC1 (lines 28-33), AC3 (lines 40-46), AC4 (lines 47-55), AC5 (lines 56-59), D119-2 (lines 89-103), D119-4 (lines 123-129), D119-5 (lines 131-139), Notes verification (lines 151-155), Sizing Files (lines 165-171) and Verification (lines 179-184)

Consistency-sweep inputs (re-confirmed, unchanged since pass 1): `docs/stories/EP09/artifacts/EP09/implementation.md` (open-findings section, lines 49-65), `docs/epics/EP09-e2e-test-automation.md` (AC1, lines 44-45), root `README.md` (current `pnpm test:e2e` wording, lines 155/181), `apps/web/e2e/helpers.ts`, `apps/web/e2e/login.spec.ts`, `apps/web/e2e/auth-journeys.spec.ts`, `apps/web/e2e/semesters-courses.spec.ts` (stale-wording footprint).

## Prior findings — closure verification (fresh evidence)

| ID | Pass-1 severity | Pass-1 closure condition | Pass-2 status |
|---|---|---|---|
| PR-001 | Should-fix | Gate line enumerates all five carried findings with expected dispositions; SP-117 F2 annotated open/monitored | **Resolved** |
| PR-002 | Should-fix | D119-5 states the message tail is mode-conditional so both modes keep an actionable, correct-cause message | **Resolved** |
| PR-003 | Polish | Environment contract bullet 1 cannot be read as requiring the dev stack for a default run | **Resolved** |
| PR-004 | Polish | Planned README/message wording covers the full one-time prerequisite chain | **Resolved** |

### PR-001 — Gate line now enumerates all five carried findings (resolved)

Current text, `docs/stories/EP09/README.md:124`:

> **Gate:** one combined EP09 parent review after SP-119 is implemented (fresh reviewer; disposes all five carried findings — the cleanup trio SP-116 F5 / SP-117 F4 / SP-118 F4, expected closed by SP-119's per-run database drop; SP-117 F1 (AC1 wording vs. SP-102 flow) and SP-118 F2 (course removal = archive, D111-2), user-deferred, final review records the disposition; SP-117 F2 (lost-output e2e failure), open/monitored, final review records the disposition — close on sustained green runs with report capture in place, or keep monitored; SP-118 F5 (helper consolidation), final review records the disposition).

Independent cross-check against the parent index (`artifacts/EP09/implementation.md:49-65`, re-read this pass): all five carried groups are present — the cleanup trio (index: open, "dedicated-test-DB + cleanup is a planner-scheduled infra story" → Gate: "expected closed by SP-119's per-run database drop"; SP-119 is that scheduled story), SP-117 F1 (index: open → Gate: user-deferred, disposition recorded — the user's "ok" deferral is recorded in the Autopilot section, README:128), SP-117 F2 (index: "open, monitored … 39 consecutive green runs after; HTML report + screenshots will capture any recurrence" → Gate: "open/monitored … close on sustained green runs with report capture in place, or keep monitored"), SP-118 F2 (index: open, archive/restore mapping → Gate: user-deferred, disposition recorded), SP-118 F5 (index: note, helper consolidation deliberately out of scope → Gate: disposition recorded). Every carried finding now has an explicit expected disposition; the pass-1 omission (SP-117 F2) is fixed and annotated open/monitored. Closure condition met.

### PR-002 — D119-5 fail-fast tail is now mode-conditional (resolved)

Current text, `SP-119-e2e-dedicated-test-database.md:131-137`:

> **D119-5 — No spec changes beyond stale messages.** The three specs + `helpers.ts` keep their journeys, unique-per-run data, and assertions; only the fail-fast wording ("Start the dev stack with `pnpm dev`") is updated — and the new tail is **mode-conditional**: self-contained (default) mode → "ensure Postgres is running"; `E2E_BASE_URL` set (external-stack mode) → keep the SP-116 AC2 semantics ("the externally provided stack at `<E2E_BASE_URL>` must be running"), so AC5's actionable-message promise holds in both modes.

Cross-check: AC5 (lines 56-59, "a dead port fails fast with the actionable message") and D119-4 (lines 123-129, `E2E_BASE_URL` "disables the `webServer` entries and the DB lifecycle (external-stack mode)") now agree with D119-5. A dead external stack gets advice pointing at the actual cause (the external stack), and a dead self-contained run gets the Postgres advice — the pass-1 D119-5↔AC5 contradiction is gone. Closure condition met.

### PR-003 — Environment contract bullet 1 is now port-agnostic (resolved)

Current text, `docs/stories/EP09/README.md:13-17`:

> - Tests run against the **real, unmocked stack** — a Vite dev server proxying `/api` to the NestJS API, plus Postgres. No API mocking in E2E tests. (Default self-contained runs use test-only instances on ports 3100/4100 — see the SP-119 bullet below; the dev-stack ports 3000/4000 are the target only in `E2E_BASE_URL` external-stack mode.)

The main statement is port-agnostic and the parenthetical annotates 3000/4000 as external-stack-only targets, agreeing with the SP-119 bullet below it (lines 23-28: default self-contained web :3100 / API :4100; `E2E_BASE_URL` for an externally provided stack). The two bullets no longer describe different stacks; a default run cannot be read as requiring the dev stack. Closure condition met.

### PR-004 — AC3/AC4 (and Notes/Sizing) now cover the full prerequisite chain (resolved)

Current text, `SP-119-e2e-dedicated-test-database.md`:

- AC3 (lines 40-46): "The message distinguishes **Postgres unreachable** ("ensure Postgres is running") from **configured dev database missing**: setup must connect to the configured dev database to `CREATE`/`DROP` the `*_e2e_test` database, so a missing dev database fails with its own actionable message (the `apps/api/.env.local` `DATABASE_URL` database does not exist — create it), never a generic one." — the two failure causes are distinguished, with the technical reason stated.
- AC4 (lines 51-55): "root README wording — which lists the one-time setup prerequisites (`pnpm install`, `apps/api/.env.local` with a `DATABASE_URL` whose database exists, `pnpm db:generate`) alongside "Postgres running; no `pnpm dev` needed", so epic AC1's "documented prerequisites" is literally complete."
- Notes verification (lines 151-155) and Sizing Verification (lines 179-184) both add "a run with the configured dev database missing failing fast with the distinct message".

Cross-check: epic AC1 (re-read, `docs/epics/EP09-e2e-test-automation.md:44-45`: "only the documented prerequisites (Postgres running)") is now literally satisfiable by the planned README wording; the root `README.md` still carries the stale "(needs the dev stack running: pnpm dev)" wording at lines 155/181 — that is the planned AC4 implementation target, not a plan inconsistency. AC1's "only Postgres running (no `pnpm dev`)" reads as the per-run runtime prerequisite, compatible with the one-time setup chain documented per AC4 (no new contradiction). AC3's message design is consistent with D119-2's secrets-safe rule (lines 95-97): the message names the env file/variable, never the URL value. Closure condition met.

## New internal-inconsistency sweep (corrections)

The planner stated it updated quality-gate row 9, the Outcome line, and Notes/Sizing verification for consistency. Independent re-read of each, plus the surrounding contract surface:

| Check | Current text | Result |
|---|---|---|
| Quality gate row 9 (README:114) | "Whole-plan review pass 1 … returned **Changes Required** — PR-001…PR-004 recorded below (PC-EP09-02…PC-EP09-05, addressed — awaiting re-review); the focused re-review (pass 2) is the coordinator's next step." | Accurate — matches pass-1 verdict and the correction log; correctly does not claim `Plan Ready` before re-review |
| Outcome line (README:117) | "**Plan Ready pending re-review** … the focused re-review (pass 2) must confirm `Plan Ready` before SP-119 dispatch. No application code or passing tests are claimed." | Honest and consistent with the queue (SP-119 `Ready`, next action Implement) |
| Correction log PC-EP09-02…05 (README:97-100) | Each entry: stable ID, date, severity, original location, original finding, correction, verification, status `Addressed — awaiting re-review` | Complete and well-formed; the corrections they describe match the current text (verified above) |
| Notes / Sizing verification (SP-119:151-155, 179-184) | Both include the missing-dev-DB fail-fast case | Consistent with AC3 |
| AC1 vs. AC3/AC4 (SP-119:28-33, 40-55) | Per-run "only Postgres running (no `pnpm dev`)" vs. one-time setup chain | Compatible — different scopes (per-run vs. one-time), no contradiction |
| AC3 vs. D119-2 (SP-119:40-46, 89-103) | Distinct failure messages vs. sanitized failure text / URL never printed | Consistent — message names the env file/variable, not the URL |
| AC5 vs. D119-4 vs. D119-5 (SP-119:56-59, 123-139) | External-stack mode disables servers + DB lifecycle; mode-conditional tail | All three agree |
| Bullet 1 vs. SP-119 bullet (README:13-17, 23-28) | Port-agnostic + annotation vs. 3100/4100 default / 3000/4000 external | Agree |
| Decisions bullet (README:66-72) and test inventory row 53 | Self-contained rationale; "resolves SP-116 F5 / SP-117 F4 / SP-118 F4" | Consistent with the Gate line's trio disposition |
| Autopilot section (README:126-138) | Stage `plan re-review`; `ep09-plan-review-2` dispatch pending; last result = pass 1; resume = pass 2 → SP-119 | Consistent with the current run state (this dispatch is the referenced re-review) |

**Result: the corrections introduced no new internal inconsistencies.**

## New findings

| ID | Severity | Area | Owner | Summary |
|---|---|---|---|---|
| PR-005 | Polish | SP-119 — Sizing Files line | Planner | Files line lists the message-wording change as `helpers.ts` + `login.spec.ts` but omits `auth-journeys.spec.ts`, which carries the stale wording in two places (verified in current code) |

### PR-005 — Sizing Files line omits `auth-journeys.spec.ts` (polish, non-blocking)

- **Requirement/source:** SP-119 Sizing block (lines 165-171); D119-5 scope statement; verified code footprint.
- **Observed gap:** the Files line says "test-only message wording in `apps/web/e2e/helpers.ts` + `login.spec.ts`". Current code (re-read this pass) carries the stale "Start the dev stack with `pnpm dev`" wording in **three** files: `helpers.ts:28-30` (`describeSetupFailure`), `login.spec.ts:33-35` (connection fail-fast) and `:44-46` (non-201 registration message), and `auth-journeys.spec.ts:34-35` + `:42` (the same two message families). `semesters-courses.spec.ts` carries none (grep-verified: no "pnpm dev" / "dev stack" / "Could not reach" match). The Files line therefore omits `auth-journeys.spec.ts`; conversely D119-5's "the three specs" phrasing is a loose upper bound (only two specs carry the wording).
- **Consequence:** an implementer following only the Files line would leave the stale, wrong-cause "start the dev stack" advice in `auth-journeys.spec.ts` — exactly the message D119-5/AC3 intend to make mode-conditional. The normative scope statements (D119-5, the "Explicitly out of scope" note at lines 61-64) define the true scope, and the final implementation review will check the actual diff against the story — so this is a summary imprecision, not an unmet AC.
- **Provenance note:** D119-5's "three specs + `helpers.ts`" phrasing predates the corrections (pass 1's quote of the pre-fix D119-5 carries it), and the planner's stated consistency updates covered the quality-gate row, Outcome line, and Notes/Sizing *verification* — so this is most likely pre-existing, surfaced by the pass-2 sweep rather than introduced by the corrections. Pass 1 verified the stale-wording footprint (its claims table) but did not cross-check the Files line against it; this pass corrects that. The fix commit diff could not be inspected (no shell access), so the exact origin is recorded as "unverified, most likely pre-existing".
- **Suggested correction:** one clause in the Files line — "test-only message wording in `apps/web/e2e/helpers.ts` + `login.spec.ts` + `auth-journeys.spec.ts`" (and, optionally, tighten D119-5 to "the specs that carry the stale fail-fast wording (login, auth-journeys) + `helpers.ts`"; the `auth-journeys.spec.ts:6` header comment "via the running dev stack" may be refreshed in the same edit).
- **Closure condition:** the Files line matches the verified stale-wording footprint. **Non-blocking:** polish with no unmet mandatory obligation; the verdict stands with it open, and the planner may fix or defer it to the SP-119 implementer.

## Verdict

**Plan Ready.**

All four pass-1 findings are verified closed in the current text with fresh evidence (PR-001/PR-002 should-fix; PR-003/PR-004 polish), and the consistency sweep found no new internal inconsistencies introduced by the corrections. The single new finding, PR-005, is polish and non-blocking. No user decision is required. SP-119 dispatch may proceed per the resume path.

## Handoff (coordinator)

- **Deferred passing-sync edits** (reviewer write boundary for this dispatch is the report only; apply verbatim, then commit `plan-review.md` + these updates):
  1. Correction log (README:97-100): set PC-EP09-02…05 status `Addressed — awaiting re-review (PR-00x)` → `Fixed — verified closed at pass 2 (`plan-review.md`, 2026-10-25, reviewed at `1f3b269`)`; add row `| PC-EP09-06 | 2026-10-25 | Polish (plan review pass 2, PR-005) | `SP-119-e2e-dedicated-test-database.md`, Sizing — Files line | Files line lists the message-wording change as `helpers.ts` + `login.spec.ts`, but `auth-journeys.spec.ts` also carries the stale "Start the dev stack with `pnpm dev`" wording in two places (lines 34-35, 42) | Not applied (polish, non-blocking) — suggested: add `auth-journeys.spec.ts` to the Files line; `semesters-courses.spec.ts` carries no such wording (verified) | Recorded — open (polish, non-blocking); verdict `Plan Ready` stands |`.
  2. Quality gate row 9 (README:114): replace the tail "the focused re-review (pass 2) is the coordinator's next step." with "Focused re-review pass 2 (`plan-review.md`, 2026-10-25, reviewed at `1f3b269`) verified all four closures — **Plan Ready**; PR-005 (polish, Files line) recorded as PC-EP09-06, non-blocking."
  3. Outcome line (README:117): replace with "**Outcome:** **Plan Ready** (confirmed at focused re-review pass 2, 2026-10-25, reviewed at `1f3b269`) — SP-119 is `Ready` (all decisions settled, implementation prerequisites met). Pass 1's PR-001/PR-002 (should-fix) and PR-003/PR-004 (polish) verified closed (PC-EP09-02…05); one new polish finding PR-005 (PC-EP09-06) is non-blocking. SP-119 dispatch may proceed. No application code or passing tests are claimed."
  4. Autopilot section (README:126-138): Stage → `SP-119 implementation`; Active dispatch → record `ep09-plan-review-2` returned **Plan Ready** (report `plan-review.md` pass 2) and next dispatch `sp119-implement` (fresh implementer); Last result → "focused re-review pass 2 (`plan-review.md`, reviewed at `1f3b269`): **Plan Ready** — PR-001…PR-004 verified closed with fresh text evidence; PR-005 (polish, Sizing Files line) recorded, non-blocking. Correction cycle 1 of max 2 without progress — cycle resolved by a passing verdict."; Resume → "implement SP-119 (fresh implementer; reviewer watch items O-3/O-4/O-5 apply; optional PR-005 Files-line fix may be applied by the planner first) → refresh parent index (O-1) → final EP09 parent review (fresh reviewer; disposes all carried findings per the corrected Gate line) → close."
  5. Execution queue: **no change required** — SP-119 row (`Ready` / next action `Implement (autopilot run in progress)`) and the `Next substory` line are already correct for a `Plan Ready` verdict.
- **Next dispatch:** SP-119 implementation (fresh implementer; watch items O-3/O-4/O-5 from pass 1 apply) → parent index refresh (O-1) → final combined EP09 parent review (fresh reviewer; disposes all five carried findings per the corrected Gate line).
- **No user decisions required.**

## Limitations

- Reviewer runtime has no shell access: Git HEAD (`1f3b269`) and clean-tree state are coordinator-provenance, not re-verified; the planner's fix commit (`9a0aeb8`) diff could not be inspected, so the PR-005 origin is recorded as "unverified, most likely pre-existing". All plan/code evidence in this report is reviewer-executed file reads of the current text.
- Plan-only review: no tests were run, no implementation quality review of SP-116/117/118, no user walkthrough (final implementation review only).
