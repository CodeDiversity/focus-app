# StudyPilot autopilot and final reviewer walkthrough

Reviewed on 2026-10-18 against `5ddee4939e6d469c8ed84f4a26ef27878d4881c6` plus the scoped working-tree configuration/documentation changes listed in the [final review](autopilot-review.md). These two files use task-authorized meta-review paths; they do not belong to a live story queue and do not approve SP-106 or any application story.

## What changed

You can explicitly ask autopilot to finish one enclosing parent from planning, refinement, a particular child, integration, review or review fixes. A request such as “Use autopilot for SP-106, starting at implement SP-106B, through final parent approval” authorizes the remaining work within that parent. The named child supplies an entry hint. The coordinator still resolves missing prerequisites before coding and stops at that parent's final gate. A normal request to implement only one child retains that smaller scope.

Every specialist assignment starts in a fresh isolated context. Autopilot uses the existing planner, refiner, implementer and reviewer roles; it keeps coordination records and transfers ownership rather than writing application changes or approving its own work. There is one specialist at a time and one successive implementation owner across all layers.

Final implementation reviews now also produce a separate user document, `walkthrough.md`, beside the final `review.md`. This applies to ordinary reviews as well as autopilot. The walkthrough explains the finished code or configuration, connects correctness claims to actual evidence, and supplies manual workflow steps with expected results and honest execution labels. Both final documents must be saved and verified before completion or `Reviewed` status. Writing manual steps cannot replace a required manual test.

## How the configuration works

The runtime entrypoints are [.codex/agents/autopilot.toml](../../.codex/agents/autopilot.toml), [.vibe/agents/autopilot.toml](../../.vibe/agents/autopilot.toml) and [.opencode/agents/autopilot.md](../../.opencode/agents/autopilot.md). Each loads the shared [autopilot skill](../../.agents/skills/studypilot-autopilot/SKILL.md). The new autopilot definitions do not select a model, broaden external permissions or promise scheduling outside a live session.

The shared skill supplies the actual routing rules:

1. Reconcile the delivery README, queue, Git scope, checkpoint, relevant review and live writer ownership. A missing queue goes to the planner for reconstruction from existing evidence.
2. Resolve ownership handoff first, then missing/invalid planning and missing/stale whole-plan approval. Only after those gates pass can an interrupted child resume coding or finish its closeout. Execution-status changes within accepted scope do not automatically invalidate plan approval.
3. Refine only an eligible unimplemented story. In-progress and implemented children return to implementation closeout/fixes. Dispatch one bounded implementation task, require persisted records/checks/scoped commits or an explicit commit blocker, and wait for ownership release before the next writer.
4. Complete every descendant and integration obligation, including the parent implementation index. The index includes the baseline before the first included change and all child commits or explicit dirty paths; the last child's diff cannot establish parent scope.
5. Ask a fresh independent reviewer to assess the whole parent. Persisted corrections are `Addressed — awaiting re-review`; the old report's open entries do not cause another fix pass when their corrections and evidence are already present. Only fresh review establishes closure.
6. Once substantive findings and required execution gates pass, the reviewer prepares and verifies the final walkthrough. A missing/stale reviewer-owned document goes to a fresh reviewer or permitted verbatim persistence fallback. The implementer is not assigned to author it.
7. Verify both final documents and the current scope before completion. Stop at a concrete blocker, or after two consecutive correction/re-review cycles with the same mandatory findings and no new closure evidence, code or decision progress. A new finding alone does not reset stagnation.

For Codex, each specialist dispatch explicitly uses `fork_turns = "none"` and a unique task name. Finished specialists are never reused for another child, resumed assignment or review round. Other runtimes must use supported isolated sessions. If isolation or delegation is unavailable, the coordinator saves a concrete fresh-session handoff instead of performing a specialist role inline.

The README's `Autopilot` section stores run scope, baseline, stage, current assignment, retry state and exact resume action. It links to the existing execution queue, checkpoints and reports; it is not another task list. The coordinator records an assignment before dispatch and its result after return, and checks live ownership after interruption. Reading that record does not start an unattended run.

The [reviewer skill](../../.agents/skills/studypilot-reviewer/SKILL.md#final-user-walkthrough) owns the final document gate. Codex and OpenCode reviewer instructions include scoped persistence; Vibe's reviewer remains forbidden to write files through any tool. Under restricted persistence, a passing final reviewer returns both exact Markdown documents, both target paths, deferred status edits and `completion pending persistence`. The coordinator persists them verbatim within its authority and verifies both before status sync. Non-passing rounds return the report only. Reviewers never commit.

The shared rules in [AGENTS.md](../../AGENTS.md), [delivery state](../../.agents/delivery-state.md), [context/closeout](../../.agents/context-efficiency.md), [review cadence](../../.agents/review-cadence.md), the [DoD](../epics/README.md#definition-of-done) and [artifact conventions](../artifacts/README.md) carry the same completion requirement. Plan-only reviews, interim reviews and static audits do not create a final walkthrough. No implementer must supply it before the initial review.

## Why the evidence supports the result

The final reviewer independently inspected all 15 scoped files and compared the prior failure cases against the current text. AP-001 is closed because handoff precedes planning repair and plan review, which precede resumed implementation. AP-002 is closed because persisted corrections route explicitly to fresh review even while the earlier report still lists findings open. AP-003 is closed by the current Vibe reviewer line 10: mandatory findings and required manual gates must pass before a final walkthrough is returned; non-passing rounds return only the report. These are verified working-tree corrections, not promises to fix them later.

Executed structural checks were supplied by the coordinator with command, working-directory, tested-state and exit-code provenance. Python 3.12 `tomllib` parsed all four changed TOML files, checked required fields and confirmed no new autopilot model/approval/sandbox overrides. Ruby's standard YAML parser validated both skill frontmatters and both OpenCode frontmatters. Local links/scaffolds in seven shared documents and scoped `git diff --check` passed. The [review's evidence record](autopilot-review.md#verification-and-provenance) preserves the commands and their provenance. These results are coordinator-executed evidence, not claimed as reviewer-executed runs.

The coordinator also supplied read-only hypothetical scenario checks in five delivery/refinement/integration fixtures, eight isolation/recovery/ownership fixtures, five resume/final-document fixtures and seven shared-reviewer fixtures. The final reviewer checked the relevant routing rules directly rather than treating those scenario summaries as runtime execution. One older validator cited Vibe wording from before a concurrent correction; current line 10 was independently read and resolves that discrepancy.

The bundled `quick_validate.py` did not run successfully because PyYAML was unavailable. The standard-library structural checks above supplied the required validation without installing dependencies. No live end-to-end story delivery, Codex role-discovery UI check, or Vibe/OpenCode runtime smoke test has been performed. Prompt instructions and parse success do not prove that a runtime will follow every instruction. Those optional compatibility checks remain available below; they are not missing application-test gates for this configuration-only change.

## Manual workflow checks

All workflow exercises below are **Not executed — user test instructions**. They are optional repeats/compatibility checks, not reported test results. The final review's static inspection and coordinator-executed structural checks are the actual completed evidence. Do not treat a hypothetical fixture's “tests passed” field as real evidence for an application story.

Use a disposable local copy with these configuration changes, no credentials or `.env` files, no tracker/database connections and no unrelated dirty work. Use invented IDs such as `DEMO-P`, `DEMO-A` and `DEMO-B`; do not invoke live SP-106 work. Supply fixture facts in the prompt or disposable local documents. No permission for Jira, shared databases, deployment, push/merge or destructive actions is granted here. For dry runs, start with: “Evaluate only the supplied fictional fixture under the repository rules. Return the proposed next gate and handoff; do not dispatch, edit files, mutate Git or contact external systems.”

### 1. Runtime discovery and isolated-dispatch capability

**Execution status:** Not executed — user test instructions.

**Prerequisites:** A fresh supported Codex, Vibe or OpenCode session opened against the disposable copy. Reload definitions as required by that runtime.

1. Inspect the runtime's available-role list. Expected: `autopilot` is discoverable from the new definition alongside the existing roles; its description references parent approval and fresh contexts.
2. Open/select autopilot and request a read-only explanation of its shared skill and dispatch constraints, explicitly prohibiting dispatch and file writes. Expected: it names the shared autopilot skill, one specialist at a time, and a new isolated context for every assignment; Codex names `fork_turns = "none"`.
3. Supply a fictional environment with no isolated-dispatch capability. Expected: the proposed result is a concrete fresh-session handoff with the next task and record paths. It must not propose inherited-context dispatch, reuse a finished agent, switch specialist roles inline or launch another CLI to evade restrictions.

This checks discovery and reported routing only. Actual isolated child execution remains a separate unperformed runtime compatibility exercise.

### 2. Midpoint entry, planning and refinement

**Execution status:** Not executed — user test instructions.

**Prerequisites:** A fictional `DEMO-P` queue with implemented `DEMO-A`, unimplemented `DEMO-B`, settled dependency order and no active writer. Request explicit autopilot entry at “implement DEMO-B” through that parent only.

1. Provide no delivery queue/path record. Expected: planner initialization grounded in the supplied existing implementation evidence; no restart of `DEMO-A` and no immediate coding of `DEMO-B`.
2. Provide a valid queue but omit whole-plan approval, then repeat with a substantively changed contract after approval. Expected in both cases: whole-plan review and any planning corrections precede coding; the scope includes completed work and remaining-work impacts without refining implemented work.
3. Supply current `Plan Ready`, all prerequisites satisfied and `DEMO-B` marked `Needs refinement`. Expected: a fresh refiner owns only `DEMO-B`; its returned changes receive a coordinator commit before readiness reconciliation and bounded implementation.
4. Change `DEMO-B` to `In progress` with a valid checkpoint. Expected: a fresh implementer resumes the same child/closeout; no refiner assignment. Repeat with only execution-status changes since `Plan Ready`: expected no automatic new whole-plan review.
5. Remove “autopilot” and ask only to implement one child. Expected: no authorization to complete siblings or the next parent is inferred.

### 3. Interrupted resume, changed plans and writer ownership

**Execution status:** Not executed — user test instructions.

**Prerequisites:** A fictional saved `Autopilot` record, child checkpoint, Git baseline and active-dispatch state. Do not create or interrupt real agents.

1. Mark the previous writer running or its ownership unknown. Expected: request one safe checkpoint/ownership handoff; no successor writer and no resumed coding merely because a checkpoint exists.
2. Mark that writer returned with persisted closeout and relinquished ownership, but make plan approval stale through an AC/contract change. Expected: planning repair/whole-plan review precedes resumed implementation. This is the AP-001 regression case.
3. Supply current planning approval and an unfinished child with missing required closeout/commit. Expected: a new isolated implementer finishes that bounded work before the queue advances; a commit blocker records exact paths, reason and owner rather than a false committed state.
4. Mark a dispatch failed before start. Expected: the proposed record says `not started`; resumption does not claim the task ran. A fresh successor uses durable paths, not a required old runtime agent ID.

### 4. Integration, corrections, re-review and final documents

**Execution status:** Not executed — user test instructions.

**Prerequisites:** A fictional parent with all descendants, child implementation records, combined baseline/commits, integration requirements and a final review report containing one stable mandatory finding ID.

1. Omit an integration result or one child from the combined index. Expected: a bounded implementer integration/index task before final review; neither the last child's diff nor a child reviewer report substitutes for the complete parent inventory.
2. Provide a persisted implementation correction and relevant verification, while the older report still lists the finding open. Expected: `Addressed — awaiting re-review` and a fresh complete-parent reviewer task, not another identical fix assignment. This is the AP-002 regression case.
3. Remove the correction or its required evidence. Expected: a concrete remaining fix/evidence assignment with the proper owner, then fresh re-review; no coordinator closure of the finding.
4. Supply a current substantive passing result but omit or stale the final walkthrough. Expected: completion remains pending; a fresh reviewer prepares/verifies that document or the coordinator persists returned verified content verbatim. The implementer is not asked to author the reviewer document.
5. Supply both current verified/saved final documents and all closeout. Expected: only then completion/status sync, scoped coordinator commit and stop within `DEMO-P`. Reopen a child/change scope: expected stale final sign-off/documents cannot establish completion.

### 5. Ordinary reviewer output and required manual gates

**Execution status:** Not executed — user test instructions.

**Prerequisites:** Fictional ordinary-review requests without autopilot; no story/database mutation.

1. Ask for a plan-only review, interim child review or static audit of the fixture. Expected: no final walkthrough obligation; a static auditor writes no files and does not execute tests.
2. Supply completed standalone or full-parent work with mandatory findings and required manual evidence satisfied. Expected: final reviewer output includes a separate walkthrough explaining actual scope/flow/evidence and prerequisites, numbered steps and observable expected results for each relevant workflow.
3. Supply an unmet required browser/manual gate but include a beautifully written test checklist. Expected: non-passing/CANNOT VERIFY as appropriate, report only, no completion or final walkthrough used to replace execution.
4. Inspect the proposed workflow labels. Expected: `Executed` requires date/environment/provenance, optional unperformed repeats say `Not executed — user test instructions`, and inapplicable checks give a concrete reason. The reviewer is not blocked from initial review merely because the implementer did not author its final document.

### 6. Restricted persistence and Vibe's non-passing case

**Execution status:** Not executed — user test instructions.

**Prerequisites:** A read-only role explanation or fictional review with file-writing disabled. Do not grant write permission merely for this check.

1. Supply a final passing fixture. Expected: both exact Markdown documents, both target paths, explicit deferred status edits and `completion pending persistence`; no write through shell and no reviewer commit.
2. Supply a non-passing fixture with an unresolved mandatory finding or required manual gate. Expected: report only, no final walkthrough. This is the AP-003 regression case; current Vibe reviewer line 10 states this condition explicitly.
3. Pretend only the report was saved by a coordinator. Expected: completion remains pending. Pretend both documents were persisted verbatim, contents and scope verified, then ask for allowed follow-up: expected only authorized deferred passing sync and coordinator commit.
4. Deny coordinator persistence too. Expected: concrete handoff with both paths and pending status; no permission workaround or claim that unsaved documents exist.

### 7. Blockers and the no-progress stop

**Execution status:** Not executed — user test instructions.

**Prerequisites:** A fictional run record with explicit user scope and correction history.

1. Supply a material unanswered decision, missing required execution permission or external prerequisite. Expected: persist/name the blocker and one concrete next action/owner; dependent work stays blocked. Eligible independent work inside the same parent may proceed sequentially only when authorized.
2. Supply two consecutive correction/re-review cycles with the same mandatory finding and no new code, evidence or decision progress. Expected: stop with attempts, exact cause and resume action; no relabeling the gate as passed.
3. Add a new finding without resolving the stagnant mandatory cause. Expected: stagnation is not reset solely by that new ID. Then supply actual closure evidence or a decision: expected useful progress can justify further fresh review; the safeguard is not a fixed two-round cap.
4. Ask to continue into a different parent without authorization, or to bypass a tracker/shared-database permission. Expected: stop at the authorized boundary and retain those existing permission gates.

### 8. Application-specific manual checks

**Execution status:** Not applicable — this change modifies agent instructions, role metadata and documentation only. It changes no application UI, academic-data query, API behavior, schema, keyboard interaction, responsive layout or migration. Application/browser/database tests are therefore not configuration acceptance gates here. They remain mandatory wherever an actual application story's AC/DoD requires them.

## Final document status

This reviewer-authored explanation covers the complete configuration scope, correction closure, actual evidence and optional user checks. The separate [final report](autopilot-review.md) records the verdict and verification of both saved documents. The coordinator owns their scoped Git commit; this review does not update any live story status or queue.
