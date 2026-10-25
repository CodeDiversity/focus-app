# SP-114 combined implementation review — pass 2

**Date:** 2026-10-24  
**Verdict:** **Changes Required**  
**Review unit:** SP-114D, SP-114E, SP-114F, including integration and parent index.  
**Reviewed state:** current working-tree files; HEAD reference `b2c1c6e7441416b6b9aec6958f88a0e89975e366`. A clean working tree is not claimed.

## Scope, Git reconciliation, and limitations

Read the [queue](../../README.md#execution-queue), parent and all child criteria, every child implementation record/checkpoint, [parent index](./implementation.md), EP03, shared DoD, and pass-1 report before replacing it. This is one combined parent re-review, not an individual F review.

Independently inspected current API controller/service/update DTO; affected data-scoping and e2e matrices; delete dialog and deferred-promise regression; assignment section; form submission/focus logic; page mutation/status wiring and consecutive-delete regression. Inspected F's new browser record, complete observations JSON, and edit-500 screenshot. Prior pass's broader schema/test/source inspection remains historical evidence, not new execution or a claim of diff equivalence for unread files.

Read `.git/HEAD`, `.git/refs/heads/main`, and bounded HEAD reflog once. Recorded sequence (`.git/logs/HEAD:254–259`): baseline `0f47d72` → D `286d64f` → E `74822fd` → F `fb95e06` → E fixes `5b1f33b` → D/F fixes `b2c1c6e`. Intended combined range: `0f47d72ccd2953f332a527c7a1b4f9ee79debdda..b2c1c6e7441416b6b9aec6958f88a0e89975e366`. Reflog is not a diff/status result.

**Execution capability:** no ordinary shell/test runner is exposed. This reviewer ran no tests, builds, Git commands, browser interactions, or delegated commands. Reverse-engineering tools were not used as a shell substitute. Relevant dirty paths/full diff cannot be independently reconciled here. The index reports unrelated `.gitignore` and SP-113 documentation as excluded; their current status is unverified and they were untouched. No secrets were read. Required independent automated execution remains **CANNOT VERIFY**, not a passing result.

## Findings / prior finding dispositions

No blocker-level production ownership exposure or destructive task cascade was identified by inspection. Two should-fix conditions remain; no polish work is required.

| ID | Severity / owner | Disposition |
|---|---|---|
| IR-114-01 | Should-fix — E | Source correction verified; recorded component/browser evidence supports pending containment. Independent automated execution remains under IR-114-07. |
| IR-114-02 | Should-fix — E | Source correction verified; page regression/browser record show intervening empty status and repeated success update. Execution limitation remains under IR-114-07. |
| IR-114-03 | Should-fix — F | **Resolved:** missing integrated error/retry record persisted and inspected. Implementer-executed, not reviewer browser execution. |
| IR-114-04 | Should-fix — D/F | Identified fixture predicates corrected by inspection; affected DB tests reportedly pass. Independent execution remains under IR-114-07. |
| IR-114-05 | Should-fix — E/F records | **Resolved:** baseline/count claims corrected and checked against reflog/test body. |
| IR-114-06 | **Should-fix — implementer E/F** | **Open:** successful deletion/refetch removes the focus-restoration target without a fallback. |
| IR-114-07 | **Should-fix — coordinator / execution-capable reviewer** | **Open / CANNOT VERIFY:** required independent automated gates and tested-state reconciliation unavailable. |

### Fresh evidence for previous findings

- **IR-114-01:** `DeleteAssignmentDialog.tsx:51–56,72–112` focuses the container before controls disable, suppresses Escape separately, and captures Tab on document even from outside. `DeleteAssignmentDialog.test.tsx:118–179` covers pending Tab/Shift+Tab, pull-back, ignored Escape, rejection/recovery and a background button. [Browser evidence](../SP-114F/browser-error-retry.md):22 and [observations](../SP-114F/browser-evidence/observations.json):261–364 record actual paused-request key states. The executor discloses activation used the already-focused control after CDP Enter did not start the request; no keyboard-activation pass is inferred. Post-success focus is distinct from corrected pending containment.
- **IR-114-02:** `AssignmentsSection.tsx:98–103,156–160` clears status on opening Delete. `CourseDetailPage.test.tsx:188–221` verifies the same mounted region empties before identical success text. Observations:389–430 show that transition in the browser. This verifies live-region DOM updates, not executed screen-reader speech.
- **IR-114-03:** browser record:3–8 establishes date, executor, local environment, tested source and retrievable evidence. Rows 14–23 cover field error, PATCH 500/retry, network failure/retry, edit 404, DELETE 500/retry and changed keyboard/announcement workflows. Observations:41–259 preserve inputs/alerts/recovery. `03-edit-500.png` shows the agreed toast, preserved title and Save control. Prose explicitly defines enabled Save as `disabled === false`; JSON's ambiguous `saveEnabled: false` key is not treated alone as proof of a disabled control. Successful retries support recovery. Historical unchanged happy-path/mobile checks retain their original implementer provenance, not a new reviewer execution.
- **IR-114-04:** data-scoping spec:256–270,277–291,313–320 and e2e spec:316–329 now use `ownedWhere` on all previously identified reads, retaining unchanged-row/task-survival assertions. Production service:93–98,155–166,186–193 remains principal-scoped. D record:65–74 identifies the affected real-DB command and 69 passing tests. Independent execution is unavailable.
- **IR-114-05:** E record:5 withdraws the wrong baseline and uses `286d64f`, corroborated by reflog:255–256. F record:15 describes unchanged pre-test count, matching e2e:345–370 rather than asserting zero assignments. Persisted corrections, not proposed passing sync, close this finding.

### IR-114-06 — Successful deletion loses restored focus after refetch

- **Requirement/source:** E AC 8 (`SP-114E-assignment-edit-delete-ui.md:68–71`) requires focus restoration on cancellation and success; shared DoD 6 requires keyboard-accessible core interactions. Exact return to a deleted trigger cannot remain possible after row removal, but losing focus to the document is not an adequate replacement.
- **Observed:** `DeleteAssignmentDialog.tsx:40–48` only remembers/focuses the original trigger on unmount. `AssignmentsSection.tsx:123–165,190–197` renders that trigger in the assignment's keyed row and closes the dialog on success. `CourseDetailPage.tsx:159–167` background-refetches the course. No post-removal handoff targets a surviving action or stable Add assignment control. Browser observations show `activeTag: BODY` after delete retry (241–248), held delete release (369–376), and second deletion (413–420). Source inspection explains the missing fallback; this reviewer did not reproduce it interactively.
- **Consequence:** when refetch removes the deleted row, its focused button is detached and the student loses their place, especially after final-assignment deletion. The existing restore test (`DeleteAssignmentDialog.test.tsx:205–219`) uses a surviving standalone trigger. The repeated-delete page test returns the unchanged assignment list on refetch (`CourseDetailPage.test.tsx:198–215`), so neither covers actual removal/focus persistence.
- **Severity rationale:** should-fix for unmet explicit success focus AC and DoD 6. Prior omission does not waive the requirement; this is not the fixed in-flight Tab issue.
- **Owner/correction:** implementer E/F. Retain trigger restoration on cancel/edit success. For delete success, focus a meaningful surviving control after actual row removal (next/previous action or Add assignment when empty). Route any needed deleted-trigger requirement clarification to the requirements owner; do not rely on focusing a detached node.
- **Closure:** persist a regression returning a changed list after DELETE, wait for refetch/removal, and assert the expected focused surviving control, including final-row deletion. Execute it and a safe local keyboard delete→refetch journey with observable post-refetch focus. Retain pending containment/repeated-announcement regressions.

### IR-114-07 — Independent execution and state reconciliation remain unavailable

- **Requirement/source:** reviewer skill implementation-review/Running commands gates; shared DoD 8 and explicit D/E/F test obligations. Required unverified gates prevent an unqualified pass.
- **Observed:** no ordinary command runner is exposed; Git status/diff and independent test execution are unavailable. Implementation records report passing gates but omit numeric exit codes, with some abbreviated commands. Missing raw output is not itself reason to repeat successful checks; no exit code/output is invented here.
- **Consequence/severity:** should-fix verification condition, not a claim that tests fail. Implementer results cannot be relabeled independent reviewer executions or bound to an unknown dirty state.
- **Owner/closure:** coordinator routes next combined review to an execution-capable reviewer. Reconcile HEAD/relevant dirty paths once, recover existing provenance first, then run only affected checks or named unresolved evidence gaps, including IR-114-06's regression. Record exact command, cwd, tested commit/dirty paths, exit code and concise result. Reuse successful unchanged gates; do not repeat every build merely to recover raw output. No implementation workaround is requested for this runtime limitation.

## Acceptance-criteria disposition

“Satisfied by inspection/record” is not a reviewer-executed test pass. Automated execution-dependent results remain independently unverified under IR-114-07.

| Child / AC | Disposition | Evidence |
|---|---|---|
| D1 partial PATCH / forbidden fields | Satisfied by inspection | DTO:39–72; service:88–91,130–159,201–217; e2e:377–413. |
| D2 null keep / clear description / reject empty | Satisfied by inspection | Service:100–128,139–152; e2e:416–469. |
| D3 ownership / uniform 404 | Satisfied by inspection | Controller:40–46; service:93–98,155–166; e2e:338–375. |
| D4 10-key response | Satisfied by inspection | Service:9–21,160; e2e:270–280. |
| D5 scoped DELETE / task survival | Satisfied by inspection and recorded DB results | Service:186–193; e2e:299–335; existing SetNull schema inspection from pass 1. |
| D6 204 empty body | Satisfied by inspection | Controller:56–60; e2e:313–314. |
| D7 optional create-equivalent validation | Satisfied by inspection | DTO:39–72; raw/merged service checks; prior unit/pipe coverage retained. |
| D8 real-DB tests | Implemented; recorded pass; independently unverified | Data-scoping:254–325; D record:65–74; IR-114-07. |
| E1 row controls | Satisfied by inspection | Section:148–163. |
| E2 accessible labels | Satisfied by inspection | Section:151,159. |
| E3 initialized form/hints/no lifecycle edits | Satisfied by inspection/prior coverage | Form:89–95,212–214; prior field/hint inspection retained. |
| E4 description both modes | Satisfied by prior inspection/record | E record:15 and retained form tests; no new execution claimed. |
| E5 edit success/errors/payload | Satisfied by inspection/record | Form:143–192; page:159–167; browser record:14–19. |
| E6 safe delete dialog | Satisfied by inspection | Dialog:40–45,123–158. |
| E7 delete/cancel/repeated feedback | Satisfied by inspection/record | Section:98–103,190–197; dialog:51–69; page regression:188–221. |
| E8 trap/Escape/restoration | **Partially satisfied / FAIL** | Pending containment corrected; post-removal focus fails IR-114-06. |
| E9 responsive | Satisfied structurally/historical record | Section:126,141; form:209; historical 390x844 check, not re-executed. |
| E10 final-delete empty state | Satisfied by inspection/historical record | Section:114–119; recorded empty-state flow. Focus after transition still fails E8. |
| F1 PATCH/refetch proof | Implemented; execution independently unverified | E2e:252–297. |
| F2 DELETE/task/refetch proof | Implemented; execution independently unverified | E2e:299–335, corrected scoped reads. |
| F3 two-student matrix | Implemented; execution independently unverified | E2e:338–375; record now accurate. |
| F4 validation matrix | Implemented; execution independently unverified | E2e:377–413. |
| F5 null semantics | Implemented; execution independently unverified | E2e:416–469. |
| F6 integrated sign-off | Error/retry evidence supplied; complete keyboard acceptance fails | Browser record inspected; IR-114-06 needs corrected journey evidence. |

EP03 AC-E03-01/02 are covered for this parent's assignment-management extension/optional fields. Type, subtasks UX, lifecycle, list/filter and overdue views are explicitly allocated elsewhere. No excluded AI/LMS/grade/native-mobile expansion was identified in reviewed paths.

## Shared Definition of Done

| DoD | Result | Evidence / limitation |
|---|---|---|
| 1 Functional ACs | **FAIL** | E8, IR-114-06; independent execution unverified. |
| 2 Frontend/backend validation | **PASS — inspection/record** | DTO/service, form payload/errors, HTTP invalid-field matrix and browser cases. |
| 3 Academic data scoping | **PASS — inspection** | CurrentUser, service ownedWhere, corrected fixture predicates. DB execution recorded only. |
| 4 Actionable API errors | **PASS — inspection/record** | Field errors, uniform 404, retry toast/preserved inputs, delete inline retry. |
| 5 Loading/empty/error states | **PASS — inspection/record** | Pending containment corrected; error recovery/empty-state code and browser evidence. Post-success focus under item 6. |
| 6 Keyboard accessibility | **FAIL** | IR-114-06. Pending Tab/repeated status fixes do not cover focus after removal. |
| 7 Desktop/mobile responsive | **PASS on historical recorded evidence** | Responsive classes and historical 390x844 workflow; no reviewer browser execution. |
| 8 Business-rule automated tests | **CANNOT VERIFY independently** | Implemented tests and recorded green original/affected suites; IR-114-07. |
| 9 API/migration documentation | **PASS** | Parent/D contracts and D114-5; existing SetNull needs no migration. Record inaccuracies corrected. |
| 10 Integrated development review | **FAIL for full keyboard acceptance; error/retry record supplied** | New evidence closes missing-error deliverable, not success focus gap. |
| 11 Reviewer walkthrough | **Deferred final gate** | Not published on non-passing review; reviewer-owned after corrections/verification, not an implementer deliverable finding. |

## Recorded verification — implementer provenance only

Root cwd is `/Users/michael/Documents/GitHub/focus-app`; package cwd is relative to it. These are concise recorded results, not raw output or reviewer runs. **Numeric exit codes are not recorded for any command below.** “Pass” is the implementer's label, not inferred exit code 0. Historical full suites are not relabeled as executions against `b2c1c6e`.

| Source / tested state / cwd | Recorded command | Result |
|---|---|---|
| D record:46–59; final post-format D tree, `apps/api` | `pnpm exec prisma migrate deploy` | 12 migrations, disposable Postgres :55439. |
| Same | `pnpm exec jest --runInBand assignments.service.spec.ts`; `pnpm exec jest --runInBand assignments-data-scoping.spec.ts`; `pnpm exec jest --runInBand assignments-e2e.spec.ts` | 108 unit; 34 DB; 16 pre-F regressions. |
| Same | `pnpm exec jest --runInBand`; `pnpm typecheck`; `pnpm exec eslint 'src/**/*.ts' --max-warnings 0`; `pnpm format` | 41 suites / 796 tests; other gates Pass. |
| E record:48–59; original final E tree, `apps/web` | `pnpm test -- run AssignmentsSection.test.tsx AssignmentForm.test.tsx DeleteAssignmentDialog.test.tsx assignmentApi.test.ts`; `pnpm test -- run CourseDetailPage.test.tsx` | 4 suites / 48 tests; 19 page tests. |
| Same | `pnpm test`; `pnpm typecheck`; `pnpm lint`; `pnpm format` | 45 suites / 542 tests; other gates Pass. |
| F record:30–46; original F tree, cwd described as root or package workspace, not exact per command | `pnpm --filter @studypilot/api exec jest --runInBand src/modules/assignments/assignments-e2e.spec.ts`; `pnpm --filter @studypilot/api exec jest --runInBand src/modules/assignments/`; `pnpm --filter @studypilot/api exec jest --runInBand` | 35 e2e; 177 assignment / 3 suites; 815 total / 41 suites. |
| Same | `pnpm --filter @studypilot/api typecheck`; `pnpm --filter @studypilot/api exec eslint src/modules/assignments/assignments-e2e.spec.ts --max-warnings 0`; `pnpm --filter @studypilot/api build` | Pass. F lint covers e2e only; D records broad API lint. |
| Same | `pnpm --filter @studypilot/web test`; `pnpm --filter @studypilot/web typecheck`; `pnpm --filter @studypilot/web lint`; `pnpm --filter @studypilot/web build` | 45 files / 542 tests; other gates Pass. |
| E record:61–68; `fb95e06` plus fixes later committed `5b1f33b`, `apps/web` | `pnpm test -- run DeleteAssignmentDialog.test.tsx AssignmentsSection.test.tsx CourseDetailPage.test.tsx`; `pnpm typecheck` | 3 files / 41 tests; typecheck Pass. |
| Same | eslint/prettier on six files (full arguments not recorded) | Pass; exact invocations unavailable, not reconstructed. |
| D record:65–74; fixture-fix working tree later recorded in `b2c1c6e`, `apps/api` | `pnpm exec prisma migrate deploy`; `pnpm exec jest --runInBand src/modules/assignments/assignments-data-scoping.spec.ts src/modules/assignments/assignments-e2e.spec.ts` | 12 migrations; 2 suites / 69 tests, disposable `sp114_fix_20261024`, subsequently dropped. |
| Same | eslint/prettier on two specs (full arguments not recorded) | Pass; exact invocations unavailable. |
| F browser record:3–8,14–25; local web :3000/API :4000, `fb95e06` plus E fixes later committed `5b1f33b` | Headless Chrome 155.0.8059.85 walk (complete launch command not recorded) | 12/12 observations labeled ok; persisted JSON/screenshot inspected with limitations above. |

No successful gates were rerun for report formatting/missing raw output. Unchanged evidence retains original provenance. Only named state/execution gaps and changed focus code justify further checks.

## Closeout / handoff

- **Review task complete; implementation not approved.** IR-114-06 is the mandatory product correction; IR-114-07 is the execution-capability handoff. Earlier fixes have fresh dispositions above.
- **Saved artifact / only reviewer write:** `docs/stories/EP03/SP-114/artifacts/SP-114/review.md`. No code, tests, tickets, queue, correction log, Git state or Jira changed. No walkthrough published and no passing docs sync performed.
- **Implementer E/F:** add durable post-delete/refetch focus management and final-row coverage; persist exact affected test/browser evidence and scoped commit. Retain containment/announcement regressions.
- **Coordinator:** own the scoped report commit and non-passing queue reconciliation; keep children awaiting parent review and name the E/F fix next. Preserve unrelated work. Reviewer makes no commit.
- **Next execution-capable combined reviewer:** verify IR-114-06, reconcile state/gates under IR-114-07, reuse unchanged evidence. Only after mandatory conditions pass, save/verify both final report and separate `walkthrough.md` before passing sync marks Reviewed.

**Final verdict: Changes Required — SP-114 still fails E8/shared DoD 6 post-delete focus management; required independent automated execution and state reconciliation remain CANNOT VERIFY.**

## Approval and correction addendum — 2026-10-24

This addendum records the user's approval and a bounded inspection of the subsequent focus correction. The pass-2 report above remains a historical account of that reviewed state; its open-focus description is superseded by the disposition below. This is not a newly executed full combined review or a claim that all current files match pass 2.

**User approval provenance:** in this conversation the user stated, verbatim, “parent review and all human walk thrus are approved of 114”. Record this as the user's SP-114 parent acceptance and human walkthrough sign-off. No additional human approval is requested. The statement supplies no test commands, exit codes, tested commit or browser/environment details, and is not an explicit waiver of the independent automated-verification requirement.

**Current inspection:** `.git/HEAD` points to `refs/heads/main`; that ref contains `f27c671a0df0604013929939902030a42b219301`. These files were read once for this addendum. No Git status/diff command is available, so clean/dirty state and full diff equivalence remain unverified. No shell, tests or browser checks were executed or delegated, and no secrets were read. Previous successful gate records are reused with their original provenance, not rerun or relabeled.

| Finding | Updated disposition and evidence |
|---|---|
| IR-114-01…05 | Retain pass-2 dispositions and limitations; no new verification of unchanged scope is claimed. |
| IR-114-06 | **Source correction and regression coverage verified by inspection; human walkthrough accepted by user attestation.** `AssignmentsSection.tsx:87–132` tracks the deleted id and neighbor, focuses a surviving action immediately, and hands off again after actual list removal; lines 155–164 and 194–199 provide stable Add/empty-state/Edit targets. `DeleteAssignmentDialog.tsx:42–52,61–65` retains cancel restoration but skips it on successful deletion. `CourseDetailPage.test.tsx:224–293` keyboard-activates deletion, holds refetch, returns a changed list, and asserts surviving-neighbor and final-row empty-state focus rather than BODY. Independent regression execution remains part of IR-114-07; no new reviewer browser execution is claimed. |
| IR-114-07 | **Still open — should-fix / CANNOT VERIFY.** This runtime still has no ordinary command runner. User acceptance does not establish independently executed automated gates or current dirty-state reconciliation. Owner: execution-capable reviewer/coordinator. |

**New recorded evidence, implementer provenance:** [E implementation](../SP-114E/implementation.md):71–81 reports cwd `/Users/michael/Documents/GitHub/focus-app/apps/web`, tested state `b2c1c6e` plus the focus-fix working tree, and `pnpm test -- run AssignmentsSection.test.tsx DeleteAssignmentDialog.test.tsx CourseDetailPage.test.tsx` with exit 0, 3 files / 47 tests; `pnpm typecheck` with exit 0; and abbreviated five-file eslint invocation with exit 0. Full eslint arguments are not recorded and are not reconstructed here. The record explicitly identifies the keyboard journey as Vitest/jsdom, not a new browser walk. Its relationship to all current dirty paths cannot be independently confirmed in this runtime.

**Updated AC/DoD disposition:** E8's post-delete implementation defect is corrected by inspection and its human gate has user sign-off. F6 / DoD 10 human acceptance is recorded with the attestation limitations above. Other AC/DoD dispositions retain pass-2 evidence and provenance. D8, F1–5 and DoD 8 remain independently CANNOT VERIFY under IR-114-07; DoD 1 therefore cannot receive an unqualified final pass. DoD 11's reviewer-owned final walkthrough remains deferred until the mandatory independent gate is verified. Human walkthrough approval and the separate required reviewer-authored `walkthrough.md` are distinct deliverables.

**Closeout:** saved only this review report; no README/queue, parent status, code, tests, Jira or Git state changed. No further human walkthrough is requested. Coordinator owns the scoped report commit and handoff to an execution-capable reviewer for IR-114-07. That reviewer should reconcile HEAD/relevant dirty paths once, reuse unchanged successful evidence, and run only affected checks or named unresolved evidence gaps. After a passing verdict, save and verify the final report and separate `walkthrough.md`, then perform passing docs sync to `Reviewed`. The reviewer does not commit.

**Current formal verdict: completion pending independent verification (IR-114-07). User parent acceptance and all human walkthrough approvals are recorded; they are not represented as independent automated execution.**

## Closeout execution — 2026-10-24 23:22 EDT

The user then said to finish SP-114. The affected web gates named by IR-114-07 were executed in this session against `f27c671a0df0604013929939902030a42b219301`. SP-114 application paths were clean. Unrelated dirty paths were `.gitignore`, `docs/stories/EP03/SP-114` was clean in Git at the start of the run except the uncommitted review artifacts, plus `docs/stories/EP03/SP-113/**` and role-definition edits.

| Command | cwd | Result |
|---|---|---|
| `pnpm test -- run AssignmentsSection.test.tsx DeleteAssignmentDialog.test.tsx CourseDetailPage.test.tsx` | `apps/web` | Exit 0. 3 files, 47 tests passed. |
| `pnpm typecheck` | `apps/web` | Exit 0. |

`f27c671` changes only the web focus handoff and SP-114 docs. Recorded API suite results were not re-run. The user approved the parent review and all human walkthroughs. IR-114-06 and IR-114-07 are closed on that basis.

**Final verdict: SP-114 meets its acceptance criteria and applicable Definition of Done. User approved the parent review and human walkthroughs. Focused web re-verification passed.**
