# EP08 Parent Implementation Review — Catch-Up & Recovery

**Review date:** 2026-10-31
**Pass:** implementation review pass 1 (combined parent review unit)
**Reviewer:** `reviewer` role — independent, read-only code review
**Verdict:** **FAIL — Changes Required** (0 blockers, 3 should-fix, 5 polish)

The nine epic acceptance criteria and the shared API/data contract are satisfied by
inspection plus the implementer's recorded integration evidence. The review unit
nevertheless fails three explicit obligations: the required API-level automated
tests for TR-E08-01/02/04 do not exist, EP08F AC 8 is unmet by two deterministic
pre-existing E2E failures with no recorded waiver, and the TR-E08-08
screen-reader/reduced-motion manual pass was never executed (`CANNOT VERIFY`).

---

## 1. Review scope and reviewed state

**Review unit:** EP08 parent + all six children — EP08A, EP08B, EP08C, EP08D,
EP08E, EP08F (one combined review, per `docs/stories/EP08/README.md` §Final
implementation review unit and `.agents/review-cadence.md`).

| Item | Value |
|---|---|
| Baseline (pre-EP08) | `53de89c` — `chore(EP08): clear pause; dispatch implementer on EP08A` |
| Implementation tip | `6ef788e` — `chore(EP08): close EP08F-implement dispatch (completed); all six children implemented` |
| Current HEAD | `1d157fb` — `chore(EP08): clear pause; dispatch reviewer on EP08 parent review` (coordinator bookkeeping only; no implementation change) |
| Reviewed code state | `6ef788e` |
| Branch | `main` |
| Working tree | Not independently inspected (no execution capability); coordinator records only the foreign dirty paths `.agents/skills/autopilot/SKILL.md` and `.agents/workflow-graph.md` |
| Report path | `docs/stories/EP08/artifacts/EP08/review.md` (README-resolved artifact root `./artifacts/EP08/`) |

Git history verified independently by reading `.git/HEAD`, `.git/refs/heads/main`
and `.git/logs/HEAD` (lines 281–317). Child implementation commits:
EP08A `c1d7f95`; EP08B `aff7794`; EP08C `8a9c543`; EP08D `9f815a6`;
EP08E `dde6780` (lock PATCH), `646e93f` (catch-up UI), `d9a7738` (verification
addendum); EP08F `6d06763` (Playwright suite), `a6d781b` (records + parent index).

**Reviewed paths (read in full or in the cited ranges):**

- `apps/api/prisma/schema.prisma` (`StudyPlan` L326–330, `PlannedSession` L343–360)
- `apps/api/prisma/migrations/20261031120000_planned_session_locked/migration.sql`
- `apps/api/src/modules/study-plans/study-plans.service.ts` (L315–1338, with
  `getRecoverySummary` L535–593, `catchUpPreview` L766–878, `catchUpConfirm`
  L880–1046, `setSessionLock` L1064–1091, `save` L1093–1240, `getPlan` L1242–1338)
- `apps/api/src/modules/study-plans/study-plan.controller.ts`
- `apps/api/src/modules/study-plans/dto/save-study-plan.dto.ts`,
  `dto/set-session-lock.dto.ts`
- `apps/api/src/domain/study-planning/catch-up.ts`, `conflicts.ts`,
  `catch-up.spec.ts`
- `apps/api/src/modules/study-plans/study-plans.service.spec.ts`
- `apps/web/src/entities/study-plan/api/studyPlanApi.ts` + `.test.ts`,
  `entities/study-plan/model/types.ts`
- `apps/web/src/features/recovery/ui/RecoverySummary.tsx` + `.test.tsx`,
  `MissedSessionRow.tsx`
- `apps/web/src/features/catch-up/ui/CatchUpPreview.tsx` + `.test.tsx`,
  `CatchUpPreservationCard.tsx` + `.test.tsx`, `CatchUpLockToggle.tsx` + `.test.tsx`
- `apps/web/src/pages/catch-up/ui/CatchUpPage.tsx` + `.test.tsx`,
  `apps/web/src/app/App.tsx`
- `apps/web/e2e/catch-up.spec.ts`, `apps/web/e2e/assignments-list.spec.ts`,
  `apps/web/e2e/calendar.spec.ts`
- `apps/web/src/shared/ui/Dialog.tsx`
- `docs/stories/EP08/README.md`, all six child story files, every child
  `implementation.md`/`checkpoint.md`, `docs/stories/EP08/artifacts/EP08/implementation.md`,
  `docs/epics/EP08-catch-up-and-recovery.md`, `docs/epics/README.md` §Definition of Done,
  `docs/stories/EP08/plan-review.md`

**Limitations.** Execution was unavailable to this reviewer: the runtime exposes
no `shell` tool (probe: `Unknown tool 'shell'.`) and nested delegation is
refused (`Subagent depth limit reached`). Every automated gate below is therefore
**reviewer-CANNOT-VERIFY**, and the recorded implementer results are reused with
explicit provenance rather than re-derived. Working-tree cleanliness and the
foreign-dirty-path claim could not be re-verified. VoiceOver and reduced-motion
behavior cannot be observed by this agent at all.

---

## 2. Execution capability and evidence provenance

| Gate | Reviewer-executed? | Status | Recorded provenance |
|---|---|---|---|
| API typecheck (`tsc --noEmit`) | No — no shell | CANNOT VERIFY | EP08E record L45: clean (apps/api) |
| API lint | No | CANNOT VERIFY | EP08E record L45: clean |
| API unit suite | No | CANNOT VERIFY | EP08E record L45: 897 passed / 443 skipped / 0 failed (41 suites) |
| API integration specs | No | CANNOT VERIFY | Self-skip without `DATABASE_URL`; "green-or-gated" per EP08F record L52–54 |
| Web typecheck / lint | No | CANNOT VERIFY | EP08E record L46: clean |
| Web unit suite (vitest) | No | CANNOT VERIFY | EP08E record L46: 1131 passed / 100 files; one unreproduced full-run failure (L48) |
| Web E2E (Playwright, self-contained stack) | No | CANNOT VERIFY | EP08F record L63–78: 40 passed / 2 failed / 5 did not run, reproduced twice; control run without the new spec: 31 passed / same 2 failed |
| New catch-up E2E (9 tests) | No | CANNOT VERIFY | EP08F record L68–71: 9/9 green in the recorded full runs |
| Manual accessibility (TR-E08-08) | No | CANNOT VERIFY | EP08F record L94–116: keyboard/narrow-screen executed; VoiceOver + reduced-motion documented-not-executed |

Nothing in this report asserts a reviewer-executed pass. Statements of the form
"satisfied" mean *code inspection plus recorded evidence*, not independent
execution.

---

## 3. Findings

### 3.1 Blockers

None. No security exposure, data loss/corruption, or broken critical flow was
found. Every academic-data query is scoped to the authenticated `userId`, and
non-owned or missing records return the uniform 404 `Resource not found`
(see §7).

### 3.2 Should-fix

#### F-01 — Required API-level tests for TR-E08-01, TR-E08-02 and TR-E08-04 do not exist

| Field | Value |
|---|---|
| Requirement | README §Requirement and test traceability, TR-E08-01 (L84), TR-E08-02 (L85), TR-E08-04 (L87); TR-E08-05 "non-blaming copy" (L88); DoD 8 "Business rules have automated tests" |
| Severity | Should-fix — unmet explicit test obligation (the reviewer cannot relax a story test requirement) |
| Affected children | EP08A, EP08C, EP08D (sub-gap) |
| Owner | `implementer` |

**Observed gap.** A repo-wide search of `apps/api/**/*.spec.ts` for
`recovery-summary`, `catch-up/preview`, `catch-up/confirm`, `catchUpPreview`,
`catchUpConfirm` and `getRecoverySummary` returns **zero matches**. The only
EP08 test in `study-plans.service.spec.ts` is the `setSessionLock` block
(L536–591); the file's other suites are `getPreferences` (L105),
`updatePreferences` (L159) and `getRemainingWork` (L367). The EP08B domain suite
(`domain/study-planning/catch-up.spec.ts`, 12 tests) covers TR-E08-03 only.

The implementers recorded the deferral rather than the work:

- EP08A `implementation.md` L49: "Not run: integration (DB) e2e for the new
  endpoint; **TR-E08-01/02 data-scoping proof remains for the combined EP08
  review**."
- EP08C `implementation.md` L15–16: "**Tests:** — None added in this pass beyond
  existing suites; TR-E08-04 coverage relies on the existing study-plans
  service/e2e harnesses plus the new endpoints (**hidden/combined review**)."

A review cannot supply implementation tests; the deferral therefore leaves the
obligation unmet.

**Consequence / counterexample.** Concrete regressions that pass every current
test:

- Delete `status: 'SCHEDULED'` or the `assignment: { status: { in: [...] } }`
  filter from `getRecoverySummary` (service L550–561) → completed assignments
  become "missed work" (AC-E08-01) and nothing fails.
- Delete `studyPlan: { userId }` from that `findMany` → student B reads student
  A's missed sessions, and no test fails.
- Delete the `a.userId !== userId` guard in `catchUpConfirm` (L928–930) → a
  foreign `assignmentId` is accepted instead of the uniform 404, and no test
  fails.
- Change the delete filter at L1022–1028 from `status: 'SCHEDULED', locked:
  false` to an unfiltered delete → locked sessions are destroyed (AC-E08-06) and
  no API test fails.

`apps/web/e2e/catch-up.spec.ts` does exercise the happy path and the
immutability invariant against the real stack (L296–375: missed count, edited
proposal set, assignment snapshots field-for-field, zero study sessions). It
contains **no** 409 conflict case, no 400 malformed matrix, no
`WINDOW_ROLLED_OVER` case and no uniform-404 case (verified by search: the file
references no `409`, `400`, `WINDOW_ROLLED_OVER` or `Resource not found`).
`CatchUpPreview.test.tsx` L167/L198/L226 cover those branches only with a mocked
client, which does not pin the server.

**TR-E08-05 sub-gap.** `RecoverySummary.test.tsx` covers loading (L27), empty
(L37), missed/unfinished rendering (L53) and error/retry (L93, L101), but no test
asserts the recovery surface's copy is blame-free; the blame-free assertion exists
only for the catch-up preview (`CatchUpPreview.test.tsx` L390) and the warnings
(`WorkloadWarnings.test.tsx` L81). Entry-point navigation and 320px behavior are
covered by the E2E spec (L311–320, L682).

**Closure condition.** API-level tests exist and are recorded green for the
cases TR-E08-01/02/04 enumerate — missed-session boundary + SCHEDULED +
completed-assignment exclusion + unfinished inclusion + ownership scoping +
uniform 404 + empty case; recovery-summary aggregation, `confirmedMinutes`,
message presence, empty/loading/error at the API boundary; preview
side-effect-free, confirm atomic, conflict 409 with per-session reasons,
unedited confirm succeeds, malformed-session matrix (400), window rollover
(409 `WINDOW_ROLLED_OVER`), foreign-assignment uniform 404, assignment rows
unchanged, decline leaves state unchanged — plus a blame-free-copy assertion on
the recovery surface.

---

#### F-02 — EP08F AC 8 is unmet: two pre-existing E2E specs are red, and the recorded root cause is factually wrong

| Field | Value |
|---|---|
| Requirement | `EP08F-cross-layer-e2e-and-parent-index.md` AC 8 (L49): "All pre-existing API, web and E2E suites stay green (the unrelated `study-plans-e2e.spec.ts` dailyCapMinutes failure, if still open, is reported but not a blocker for EP08)"; README TR-E08-07 (L90) "…pre-existing E2E specs staying green" |
| Severity | Should-fix — unmet explicit AC; no user-approved waiver exists, and the reviewer cannot grant one |
| Affected children | EP08F (triage target: `apps/web/src/shared/ui/Dialog.tsx`, EP03/EP04-era specs) |
| Owner | `implementer` (fix) or `user`/`planner` (scoped waiver); record correction by `implementer` |

**Observed gap.** The recorded full-suite runs are
`40 passed, 2 failed, 5 did not run` — reproduced twice (EP08F record L70–78) —
with failures at:

1. `apps/web/e2e/assignments-list.spec.ts:23` — after Escape closes the create
   dialog, `expect(emptyAdd).toBeFocused()` (L40) fails.
2. `apps/web/e2e/calendar.spec.ts:100` — SP-129A phone-agenda test; after Escape
   the entry button is not focused.

AC 8 exempts only the `study-plans-e2e` `dailyCapMinutes` failure. The record
labels the two focus failures "pre-existing … out of scope to fix here" and asks
for "its own fix story or a parent-review decision" (L92). A control run with
`catch-up.spec.ts` removed reproduces both (L72–74), so they are genuinely not
caused by EP08F — but AC 8 as written requires the pre-existing suites to be
green, and no waiver with a recorded source and exact scope exists. Under the
severity contract a user-approved waiver must have recorded provenance; a
reviewer cannot convert "pre-existing" into an exemption. The `5 did not run` in
the same runs are a further, unattributed coverage loss that the record does not
explain.

**Secondary defect — inaccurate root-cause claim.** The record states (L88–91)
"A repo-wide grep finds no focus-restore logic (`restoreFocus`/`triggerRef`/
`lastFocused`) in the current component tree; the recent SP-109 folder-reorg
commits … are the plausible point where the behavior was lost." This is false:
`apps/web/src/shared/ui/Dialog.tsx` implements exactly that behavior —

- `restoreFocusRef` (L45);
- captured on open: `restoreFocusRef.current = document.activeElement` (L101);
- Escape sets `closedViaOnCloseRef.current = true` before `onClose()` (L63);
- restored in the close cleanup: `restoreFocusRef.current?.focus()` (L112–114).

The failing assertions exercise this path. The most likely cause (inspection
hypothesis, not executed) is that the captured `HTMLElement` is detached by the
time of restoration — the parent re-renders/refetches on close and replaces the
trigger node, so `.focus()` on the stale reference is a no-op and focus falls to
`document.body`. That makes the triage target the existing `Dialog` restore path,
not a re-add of code "lost in SP-109"; the correction record needs to say so.

**Closure condition.** Either (a) both specs pass on a recorded full run after a
fix, with the record's root-cause claim corrected; or (b) a user-approved waiver
is recorded naming exactly these two tests and their scope, and the record's
claim is corrected. Re-review then re-checks the recorded run.

---

#### F-03 — TR-E08-08 screen-reader path and reduced-motion pass were never executed (`CANNOT VERIFY`)

| Field | Value |
|---|---|
| Requirement | README TR-E08-08 (L91): "Manual accessibility pass recorded … (keyboard, focus visibility, **screen-reader path**, **reduced motion**, narrow screen)"; EP08F AC 10 (L58–61); DoD 6/8 |
| Severity | Should-fix — required manual evidence absent; cannot be ratified by the reviewer |
| Affected children | EP08D, EP08E, EP08F |
| Owner | `user` / human operator (implementer available to fix defects found) |

**Observed gap.** EP08F `implementation.md` L113–116 states plainly:
"**Documented-not-executed (honest gaps for the reviewer walkthrough):** macOS
VoiceOver screen-reader path through `/catch-up` → preview → confirm; and
reduced-motion behavior (no animation forks were added, but it was never
manually [observed])."

The executed portion is real and durable: `catch-up.spec.ts:682` (320px: no
horizontal overflow, ≥44 px replan target, Tab-only path with computed
focus-visible ring) and `:731` (320px preview: stacked controls, ≥44 px targets,
lock toggle operable with server-persisted state), plus the EP08D/EP08E vitest
keyboard tests (`CatchUpPreview.test.tsx` L356 "keyboard operable — Tab/Enter
reach and operate every header/editor/toggle control", `CatchUpLockToggle.test.tsx`
L76 live-status announcement, `RecoverySummary.test.tsx` error `role="alert"`).
That satisfies DoD 6 and the focus-visibility part of TR-E08-08.

What remains is exactly the part this agent cannot produce: an actual
screen-reader traversal and an actual reduced-motion observation. Per the
severity contract, required evidence that cannot be verified stays `CANNOT
VERIFY` and prevents an unqualified pass; it is not downgraded because the
automated portion is strong.

**Closure condition.** A recorded human pass — date, environment, OS/browser,
and what was observed — covering (1) VoiceOver reading `/catch-up` → preview →
edit → confirm with sensible announcement order and no focus loss, and
(2) reduced-motion behavior (no meaningful motion or an acceptable static
equivalent). Any defect found is fixed and re-reviewed.

### 3.3 Polish

| ID | Finding | Location | Consequence | Owner | Closure |
|---|---|---|---|---|---|
| P-01 | The shared contract's endpoint table omits the new lock endpoint. | `docs/stories/EP08/README.md` L142–147 (4 rows) vs `study-plan.controller.ts` `@Patch('sessions/:sessionId/lock')`, `dto/set-session-lock.dto.ts`, `study-plans.service.ts` L1064–1091 | A reader of the canonical contract seam cannot discover `PATCH /study-plans/sessions/:sessionId/lock` (`{locked:boolean}` → `{id, locked}`, 400/401/404). It is documented in EP08E's refinement (commit `3202c79`) and code comments, so this is consistency, not a missing API doc. | `planner` | Add the row to the contract table. |
| P-02 | Collisions with locked/completed planned sessions are reported as `OVERLAPS_CONFIRMED_SESSION`. | `domain/study-planning/conflicts.ts` L97–103; confirm busy set built at `study-plans.service.ts` L956–974 | A student who submits a time overlapping a **locked** session is told "This overlaps a confirmed session" (`types.ts` L114). The conflict is correctly detected and AC-E08-06 still holds; only the attributed cause is misleading. This is contract-compliant (the contract mandates EP06's `overlaps` precedence and the four reason codes), hence polish. | `planner` (contract) / `implementer` (copy) | Either add a distinct reason/copy for planned-session collisions or record the mapping as intended in the contract. |
| P-03 | `getPlan` does not expose `locked`. | `study-plans.service.ts` L1314–1326 (`SavedPlanSession` has no lock field) | The saved-plan read cannot render lock state after reload; the catch-up surface only shows per-session lock state for **missed** sessions (`preview.missedSessions[].locked` → `CatchUpPreservationCard`). `SavedPlan` is EP06's unchanged shape, so this is not a contract violation — it is the already-open, planner-owned question in the EP08E row (L29: "contract extension to list current-window SCHEDULED sessions with `{id, locked}`"). | `planner` | Resolve the open question; extend the contract and `getPlan` if the plan-page toggle is wanted. |
| P-04 | One unreproduced full-suite web failure was never named. | EP08E `implementation.md` L48 | One run of 1131 reported "a single unnamed failure"; two full runs and three targeted catch-up runs were green (32/32 each). Without the test name the event cannot be triaged, so the residual risk is unresolvable rather than dismissed. | `implementer` | Record the file/test name if it recurs. |
| P-05 | `catchUpConfirm` re-implements the `save` transaction inline. | `study-plans.service.ts` L999–1043 vs `save` L1198–1237 | The two blocks are near-identical except confirm's delete filter (`status: 'SCHEDULED', locked: false`) and `locked: false` on insert. Combined with F-01 (confirm has no tests), drift between the two write paths would be undetected. | `implementer` | Extract a shared private helper parameterised by the delete filter, or pin both paths with tests. |

---

## 4. Epic acceptance criteria (AC-E08-01 … AC-E08-09)

Evidence is inspection plus recorded integration evidence (not reviewer-executed).

| ID | Criterion | Result | Evidence |
|---|---|---|---|
| AC-E08-01 | Missed planned sessions identified without treating a completed assignment as unfinished | Satisfied | `getRecoverySummary` L550–561: `studyPlan.date < bound` (civil-today UTC midnight, L547–548), `status: 'SCHEDULED'`, `assignment.status in (PENDING, IN_PROGRESS)`, `studyPlan.userId` scoping. UI: `RecoverySummary.tsx` + `MissedSessionRow.tsx`. E2E: `catch-up.spec.ts:296–320` (3 missed) and `:557` (completed assignment's planned sessions absent from API and UI). |
| AC-E08-02 | Students can initiate replanning manually | Satisfied | `RecoverySummary.tsx` L55 → `/catch-up/preview`; `POST /study-plans/catch-up/preview` (`study-plan.controller.ts` L69); E2E `:311–320` asserts the click issues the preview call against the server window. |
| AC-E08-03 | Completed work and historical study logs remain unchanged | Satisfied | Confirm writes only `studyPlan.upsert` + `plannedSession.deleteMany/createMany` in one `$transaction` (L1005–1043); no `StudySession`/`Assignment`/`Task` write in the module. E2E `:364–375` asserts assignments field-for-field identical, `/api/study-sessions` empty, missed count unchanged. |
| AC-E08-04 | Replacement sessions respect current availability and existing commitments | Satisfied | `catch-up.ts` `replan` reuses `schedule()`; `catch-up.spec.ts:54` proves output equals calling `schedule()` directly; confirm re-checks with the shared `findConflicts` over classes/blocked/busy + other submitted sessions (`conflicts.ts` L70–103). |
| AC-E08-05 | Students can preview changes before confirming them | Satisfied | `catchUpPreview` L766–878 performs reads only (no write calls); `CatchUpPreview.tsx` renders/edits the proposal; E2E `:312–348` preview → edit → confirm. |
| AC-E08-06 | Manually locked sessions are preserved during replanning | Satisfied | Delete filter `status: 'SCHEDULED', locked: false` (L1022–1028); locked + completed planned sessions enter the busy set (L956–974); domain tests `catch-up.spec.ts:94`, `:121`, `:135`; E2E `:438` proves a locked row's fields and the row count are unchanged and nothing is placed on it; `setSessionLock` + `CatchUpLockToggle` provide the toggle. |
| AC-E08-07 | The app reports work that cannot be accommodated before its deadline | Satisfied | Engine deficit/feasibility warnings flow through the preview payload (`warnings`, `deferred`); UI `WorkloadWarnings`; E2E `:514` matches rendered copy 1:1 to the server warnings and re-checks the due date. |
| AC-E08-08 | Replanning never silently extends assignment deadlines | Satisfied | No assignment write path exists in EP08; the pure engine takes due dates as inputs. E2E `:369–370` snapshot equality; domain purity test `catch-up.spec.ts:219`. |
| AC-E08-09 | Students can decline proposed schedule changes | Satisfied | Decline is client-side ("Not now" makes no request — `CatchUpPreview.test.tsx` L155); E2E `:378` asserts no confirm call and a byte-identical plan. |

**Child ACs.** No unmet child AC was identified apart from **EP08F AC 8**
(F-02) and **EP08F AC 10** (partially met — F-03). EP08A's and EP08C's functional
ACs are met by inspection; their **test** obligations are the separate F-01 gap.

---

## 5. Technical requirements (TR-E08-01 … TR-E08-08)

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| TR-E08-01 | Missed-session identification tests (boundary, completed exclusion, unfinished inclusion, ownership scope, uniform 404, empty) | **FAIL** | No test exists (F-01). Behaviour itself is correct by inspection (service L550–576). |
| TR-E08-02 | Recovery-summary tests (aggregation, remaining-work reuse, confirmed total, non-blaming message, empty/loading/error at the API boundary) | **FAIL** | No test exists (F-01). `confirmedMinutes` reuses `getRemainingWork`'s `unattributedConfirmedMinutes` (L583–589), message is neutral (L590–591). |
| TR-E08-03 | Rescheduling engine tests (reuse of `schedule()`, locked preservation, completed preservation, completed-assignment exclusion, determinism, purity, deficit categories) | Satisfied (recorded) | `catch-up.spec.ts` 12 tests: reuse (L54), completed exclusion (L74, L84), locked (L94, L121), completed (L135), categories (L162, L174), determinism (L188), missed passthrough (L200), purity (L219). Not reviewer-executed. |
| TR-E08-04 | Catch-up API tests (preview side-effect-free, confirm atomic + preserves completed/locked, conflict 409 with reasons, unedited confirm, 400 matrix, window rollover, foreign-assignment 404, assignment rows unchanged, decline no-op, missed-list correctness) | **FAIL** | No API-level test exists for any enumerated case (F-01). Partially mitigated by E2E (decline, immutability, missed list) and by mocked client tests (409/rollover/400) that do not pin the server. |
| TR-E08-05 | Recovery-summary UI tests (missed list, unfinished rows, non-blaming copy, entry point, loading/empty/error, keyboard, narrow screen) | **Partially satisfied** | `RecoverySummary.test.tsx` L27/L37/L53/L93/L101 cover loading, empty, rows, error, retry; entry point + 320px + Tab path covered by `catch-up.spec.ts:682`, `:311–320`. **Gap:** no blame-free-copy assertion on this surface (folded into F-01). |
| TR-E08-06 | Catch-up plan UI tests (generate → preview → edit → confirm, decline unchanged, warnings, locked indicator, loading/empty/error, keyboard, narrow screen) | Satisfied (recorded) | `CatchUpPreview.test.tsx` 12 tests incl. confirm body (L127), decline (L155), 409 (L167), rollover (L198), 400 (L226), skeleton (L248), empty (L255), fetch error (L275), locked read-only (L289), toggle revert (L298), persisted unlock (L323), keyboard (L356), blame-free copy (L390); `CatchUpPreservationCard.test.tsx`; `catch-up.spec.ts:731`. |
| TR-E08-07 | Cross-layer E2E against the real stack (full journey, decline, locked, warning, completed exclusion, reload survival, **API and web suites and pre-existing E2E specs staying green**) | **Partially satisfied** | `catch-up.spec.ts` 9 tests cover every listed workflow and are recorded green; the "pre-existing E2E specs staying green" clause fails (F-02). |
| TR-E08-08 | Manual accessibility pass recorded (keyboard, focus visibility, screen-reader path, reduced motion, narrow screen) | **CANNOT VERIFY / partially FAIL** | Keyboard, focus visibility and narrow screen: executed (Playwright + vitest, cited in F-03). Screen-reader path and reduced motion: never executed (F-03). |

---

## 6. Shared API and data contract

| Contract element | Result | Evidence |
|---|---|---|
| Additive `locked Boolean @default(false)` on `PlannedSession`; no new table; no `StudySession` change | Conforms | `schema.prisma` L353–355; migration `ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false` with rollback note |
| Missed-session boundary = civil today as UTC midnight of the date string (no zone conversion) | Conforms | `toCivilDate(...)` → ``new Date(`${todayCivil}T00:00:00.000Z`)`` (L547–548); `lt` (strictly before) L552 |
| `MissedSession` shape, never exposes `userId` | Conforms | L563–576 builds exactly `{id, assignmentId, assignmentTitle, date, startTime, endTime, durationMinutes, locked}` |
| `RecoverySummary` shape incl. `message` | Conforms | L585–592; `unfinishedWork` reuses `getRemainingWork` |
| `GET /study-plans/recovery-summary` → 200 / 401 / 404 uniform | Conforms | Controller L50; missing principal → `NotFoundException(RESOURCE_NOT_FOUND)` L540–541 |
| `POST /study-plans/catch-up/preview` — no body, no window input, side-effect free | Conforms | Controller L69 takes no `@Body()`; service L766–878 performs reads only |
| `CatchUpPreview` shape incl. `lockedPreserved` / `completedPreserved` counts | Conforms | Built in `catchUpPreview`; counts derived from the busy-set classification (locked/completed intervals are never re-emitted into `days`) |
| `POST /study-plans/catch-up/confirm` body = EP06 save shape | Conforms | `SaveStudyPlanDto` / `SaveStudyPlanSessionDto` reused (`{from,to,sessions:[{assignmentId,date,startTime,endTime}]}`) |
| Confirm step 1 — window validation incl. `WINDOW_ROLLED_OVER` | Conforms | L883–898 |
| Confirm step 2 — busy set = confirmed sessions + completed planned + locked planned + other submitted; replaced SCHEDULED non-locked excluded | Conforms | L956–974 (`preservedBusy` filter `COMPLETED || locked`), `findConflicts` adds other submitted as `placed` (`conflicts.ts` L70–76) |
| Confirm step 3 — delete only `SCHEDULED && locked === false` in `[from,to]` | Conforms | L1022–1028 |
| Confirm step 4 — `targetHours` recomputed from `dto.sessions`, 0 for empty days | Conforms | L999–1009 |
| Confirm step 5 — insert `SCHEDULED`, `locked: false` | Conforms | L1031–1041 |
| Confirm step 6 — never touch `StudySession`/`Assignment`/`Task` | Conforms | No write to those models in the module |
| Decline is client-side; no server endpoint | Conforms | `CatchUpPreview.test.tsx` L155; no decline route in the controller |
| `PATCH /study-plans/sessions/:sessionId/lock` (EP08E user decision 2026-10-31) | Implemented, **not in the contract table** | Controller + `set-session-lock.dto.ts` + service L1064–1091; see P-01 |
| `SavedPlan` (existing `GET /study-plans`) | Conforms; omits `locked` | L1242–1338; see P-03 |

**Deviation from the plan, recorded:** none found in the endpoint set or shapes.
The one contract-level omission is documentation-only (P-01).

---

## 7. Ownership and uniform-404 verification

| Path | Scoping mechanism | Result |
|---|---|---|
| `getRecoverySummary` | `plannedSession.findMany({ where: { studyPlan: { userId, ... } } })`; principal row fetched by `id` and 404s if absent | Scoped |
| `catchUpPreview` | `gatherPlanData(userId)` reads preferences/assignments/meetings/blocked by `userId`; planned sessions via `studyPlan: { userId }` | Scoped |
| `catchUpConfirm` | `data` gathered by `userId`; each submitted `assignmentId` checked (`!a || a.userId !== userId` → uniform 404, L928–930); `preservedPlanned` filtered by `studyPlan: { userId }` (L956–957); deletes/inserts inside `studyPlan: { userId }` | Scoped |
| `setSessionLock` | scoped `updateMany` with `ownedWhere` + `assertAffected` (L1078), then a scoped read (L1085–1088) → uniform 404 | Scoped; **unit-tested** (`study-plans.service.spec.ts` L565–570) |

All four return the same `Resource not found` 404 for missing **and** foreign
records — no 403 and no distinguishing message, so there is no existence oracle.
The behaviour is correct by inspection; the **executed** ownership proof required
by TR-E08-01/04 is missing (F-01).

---

## 8. Decision register (D08-1 … D08-8)

| ID | Decision | Implementation evidence | Result |
|---|---|---|---|
| D08-1 | Reuse the EP06 engine; no second algorithm | `catch-up.ts` calls `schedule()`; equivalence test `catch-up.spec.ts:54`; only named helpers imported | Conforms |
| D08-2 | Replanning is a proposed change set (preview side-effect free, confirm transactional, decline persists nothing) | L766–878 read-only; `$transaction` L1005–1043; decline = no call | Conforms |
| D08-3 | Completed work and historical logs never touched | Only `StudyPlan`/`PlannedSession` writes; E2E `:364–375` | Conforms |
| D08-4 | Locked is an explicit student toggle; locked sessions never moved/deleted and treated as busy | `locked` column + `PATCH .../lock` + delete filter + busy set + toggle UI with revert-on-failure | Conforms |
| D08-5 | Missed = civil date < today, `SCHEDULED`, assignment `PENDING`/`IN_PROGRESS` | L550–554 (uses the shared unfinished-status semantics) | Conforms |
| D08-6 | Catch-up window = next 7 days from today | Preview window from `gatherPlanData`; confirm requires `to` = `from + 6` (L890) | Conforms |
| D08-7 | UI decisions settled by `ui-refiner` before EP08D/E implementation | `ui-refiner` commits `5dd603f` (EP08E) and EP08D's decision set; UI matches (header/editor/preservation card/toggle) | Conforms |
| D08-8 | No blame or punitive messaging | Server message neutral (L590–591); blame-free test on preview (`:390`) and warnings (`WorkloadWarnings.test.tsx:81`); **no blame-free test on the recovery surface** | Conforms (copy); test gap → F-01 |

---

## 9. Security / privacy / accessibility invariants

| Claim | Result | Mechanism / evidence |
|---|---|---|
| A student cannot read or replan another student's plan | Holds by inspection; **executed proof missing** | Every query carries `userId` (§7); foreign assignment in confirm → uniform 404 (L928–930); foreign session in lock → uniform 404 (unit-tested). API-level 404 tests absent (F-01). |
| Confirm never touches historical logs or assignments | Holds | Only `StudyPlan`/`PlannedSession` writes; E2E `:369–375`. |
| Replanning never extends a deadline | Holds | Engine is pure; due dates are inputs; no assignment write path; E2E `:369–370`. |
| Locked sessions survive replanning | Holds | Delete filter + busy set + domain tests + E2E `:438`. |
| Declining leaves state unchanged | Holds | Preview is read-only; E2E `:378` (no confirm request, identical plan). |
| Completed assignments are not "unfinished work" | Holds | Status filter L554; E2E `:557`. |
| No blame/punitive messaging | Holds for shipped copy | D08-8 above; recovery-surface assertion missing (F-01). |
| Keyboard / focus visibility / narrow screen | Holds (recorded) | `catch-up.spec.ts:682`, `:731`; `CatchUpPreview.test.tsx:356`; `CatchUpLockToggle.test.tsx:76`. |
| Screen-reader path / reduced motion | **CANNOT VERIFY** | Never executed (F-03). |
| No committed secrets | Holds | No credential-like values observed in the reviewed files; `.env*` not read. |

---

## 10. Definition of Done (shared, `docs/epics/README.md` L29–55)

| # | Condition | Result | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | PASS (epic ACs) | §4 — all nine satisfied by inspection + recorded E2E. Child AC 8/10 handled under F-02/F-03. |
| 2 | Frontend and backend validation handle invalid input | PASS | `SaveStudyPlanDto` + `SetSessionLockDto` + global `FieldValidationPipe`; service field errors (L883–919, L1071); client-side edit validation; tests (`CatchUpPreview.test.tsx:226`, service spec L580). |
| 3 | Academic data scoped to the authenticated student | PASS (inspection) | §7. Executed API proof missing (F-01). |
| 4 | API errors produce actionable messages | PASS | Field-level `errors` maps, 409 with per-session `reasons`, `WINDOW_ROLLED_OVER` banner with a working "Create new plan". Copy caveat P-02. |
| 5 | Loading, empty, error states handled | PASS | `RecoverySummary.test.tsx` L27/L37/L93; `CatchUpPreview.test.tsx` L248/L255/L275. |
| 6 | Core interactions support keyboard accessibility | PASS (recorded) | `catch-up.spec.ts:682` Tab path + focus ring; `CatchUpPreview.test.tsx:356`; `CatchUpLockToggle.test.tsx` aria-pressed + live status. |
| 7 | Responsive layouts work on desktop and mobile | PASS (recorded) | 320×568 E2E at `:682` and `:731` (no horizontal overflow, ≥44 px targets, stacked controls). |
| 8 | Business rules have automated tests | **FAIL** | F-01 — TR-E08-01/02/04 absent, TR-E08-05 blame-free sub-gap. Execution of the existing suites is also `CANNOT VERIFY` (no shell). |
| 9 | API changes and migrations documented | PASS | Migration SQL with rationale/rollback; README contract; code doc comments. P-01 (lock row missing from the contract table) and P-03 (`locked` absent from `SavedPlan`) are consistency items. |
| 10 | Feature reviewed in an integrated environment | PASS (recorded) | Self-contained stack runs recorded in EP08F §Suite baseline evidence; this combined parent review. Reviewer could not re-execute. |
| 11 | Reviewer saved a user-facing walkthrough before completion | **FAIL (pending by design)** | Not produced: a non-passing verdict defers the walkthrough and the passing docs sync. The gate stays open until a passing re-review. |

---

## 11. Watch-item adjudications (handed to this review)

1. **Two pre-existing E2E failures** (`assignments-list.spec.ts:23`,
   `calendar.spec.ts:100`). Adjudicated in **F-02**. They are provably not caused
   by EP08 (control run), but AC 8 is unmet and no waiver exists; additionally
   the recorded "no focus-restore logic exists" claim is false — `Dialog.tsx`
   L45/L63/L101/L112–114 implements it, so the defect is in the existing restore
   path. Needs either a fix (Dialog) or a user-approved, scoped waiver, plus a
   corrected record.
2. **EP08E unreproduced load flake.** Adjudicated as **P-04**, not a blocker.
   One unnamed failure in one full web run of 1131; two subsequent full runs and
   three targeted catch-up runs (32/32 each) were green. The catch-up suites are
   not implicated. No action beyond recording the test name on recurrence.
3. **`DATABASE_URL`-gated self-skipping specs.** Distinguished:
   *Pinned* — `setSessionLock` behaviour (uniform 404, `{id, locked}` payload,
     400 on non-boolean) is unit-tested with a mocked Prisma client
     (`study-plans.service.spec.ts` L536–591), so its contract does not depend on
     a live database. The EP06 `save`/`getPlan` paths likewise have unit coverage.
   *Unverified* — the EP08A/EP08C read and confirm endpoints have **no** unit or
     integration coverage at all; the integration suites that would host them
     (`study-plans-e2e.spec.ts`, `study-plans-data-scoping.spec.ts`) contain no
     EP08 endpoint cases and self-skip without `DATABASE_URL`. This is not merely
     a locally-skipped gate: the cases do not exist (F-01).
4. **TR-E08-08 VoiceOver + reduced motion.** Adjudicated in **F-03**:
   `CANNOT VERIFY`. The human-evidence gate applies; a passing verdict is
   impossible until it is recorded.

---

## 12. Verification performed by this reviewer

- **Executed:** nothing. No shell; nested delegation refused. All automated gates
  are `CANNOT VERIFY` (§2).
- **Read/verified statically:** Git refs and reflog (HEAD, tip, baseline, child
  commits); every reviewed path in §1; the API/data contract end to end
  (§6); ownership scoping (§7); the decision register (§8); the DoD map (§10).
- **Evidence reused with provenance:** implementer records as listed in §2.
  Where a record's claim conflicted with the code (the focus-restore claim), the
  code was treated as authoritative and the discrepancy is reported (F-02).
- **Not performed:** any mutation, test run, format/fix command, commit, or read
  of `.env*`/secret files.

---

## 13. Verdict

**FAIL — Changes Required.** EP08 does not meet DoD 8 (missing required
automated tests for TR-E08-01/02/04 and TR-E08-05's blame-free assertion), EP08F
AC 8 (two pre-existing E2E specs are red with no recorded waiver), or
TR-E08-08/EP08F AC 10 (screen-reader and reduced-motion manual evidence is
unexecuted, so it is `CANNOT VERIFY`). No blockers; the nine epic ACs, the
shared API/data contract, ownership scoping, and D08-1…D08-8 otherwise hold.

---

## 14. Git handoff and deferred edits

This review was read-only and **nothing was committed**. Working tree state was
not independently verified (no execution capability).

**To commit (reviewer-authored, this pass):**

```
git add docs/stories/EP08/artifacts/EP08/review.md
```

No `walkthrough.md` was written and no docs sync was performed: both are gated on
a passing verdict (`.agents/skills/reviewer/SKILL.md` §Final user walkthrough,
§Passing-review docs sync).

**Deferred passing-sync edits (do NOT apply now — they belong to the pass that
closes F-01…F-03):**

1. `docs/stories/EP08/README.md` §Implementation review log — add the F-01…F-03 /
   P-01…P-05 dispositions with closure evidence.
2. Execution queue — EP08A…EP08F rows `Implemented — awaiting parent review` →
   `Reviewed`; `Active substory` / `Next substory` to the concrete next action;
   links to `review.md` + `walkthrough.md`.
3. Parent status line (README L6) — currently still reads "Breakdown complete
   (planner) … Plan Ready"; refresh to the verdict.
4. Write `docs/stories/EP08/artifacts/EP08/walkthrough.md` (mandatory before
   completion).

**Remaining work (in order):**

1. **F-01** (`implementer`): add the TR-E08-01/02/04 API tests and the
   recovery-surface blame-free assertion; record the run.
2. **F-02** (`implementer`, or `user`/`planner` waiver): fix or waive the two
   focus-restoration E2E failures; correct the "no focus-restore logic" claim —
   the restore path is `apps/web/src/shared/ui/Dialog.tsx` L45/L63/L101/L112–114.
3. **F-03** (`user`/human): execute and record the VoiceOver + reduced-motion
   pass.
4. Polish P-01…P-05 at the owners' discretion.
5. Re-dispatch the reviewer for the final parent review; only a passing pass
   writes the walkthrough, syncs the queue, and marks EP08 `Reviewed`.
