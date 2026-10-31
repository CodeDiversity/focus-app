---
name: autopilot
description: Use when the user requests StudyPilot autopilot through final parent approval, including entry at planning, refinement, a specific substory, integration, review, or review fixes. Ordinary single-role or single-child requests retain their original scope.
---

# StudyPilot Autopilot

## Optional step mode

`/step <parent>` keeps coordination but allows only one foreground
specialist per explicit user continuation. Judges count too. Record
`execution: { mode: step, awaiting_continue: false }` before dispatch. After
the task returns, finish permitted persistence/commits and set
`execution.awaiting_continue: true`, `stage: paused`. Report the completed task,
records, and next proposed action, then STOP. Do not refill the allowance by
editing the checkpoint or perform the next role inline. `/continue`
(or an explicit `continue` in that same step session) authorizes one more task;
ordinary questions/status messages do not. A real blocker, scope limit, or live
writer still takes precedence. Starting step mode while a specialist is live
means wait for its return, not dispatch a successor. Normal autopilot defaults
to automatic mode; a step session remains stepped until the user chooses a
different execution mode explicitly.

Coordinate the existing delivery roles through a passing independent parent
review. Every specialist task gets a new, isolated context; the repository carries
progress. Autopilot is a coordinator, never the implementation or review owner.

The only router is [workflow-graph.md](../../workflow-graph.md). Walk its edge
table from the top and take the first match. If the prose table and the YAML
fence disagree, the YAML wins. Do not add an edge in this skill. Do not launch
the local runner, a shell, or another CLI to dispatch roles; that evades the
host's permission model. In-session dispatch stays on the host's native
isolated-session mechanism.

Save the parent README `## Autopilot` checkpoint before spawning the specialist
that edge names. The fence must be version 1, and `active_dispatch` must name
that role with `status: pending`. Dispatch is rejected until the file is saved.
Update it to `returned` after the specialist comes back, before the next spawn.
Do not write the specialist's story, epic, or code yourself.

## Scope and ownership

An explicit autopilot request authorizes the enclosing parent review unit and
its remaining descendants, integration, mandatory findings and re-review. An
entry such as `implement SP-106B` is a starting hint, not permission to skip
prerequisites. Resolve the parent from the story and queue; for nested splits,
use the enclosing feature review unit. Honor an explicitly narrower limit.
Do not continue into the next parent/epic. Ordinary child requests do not invoke
autopilot or acquire sibling authorization.

Read [delivery state](../../delivery-state.md) and the parent README execution
queue first. Apply [review cadence](../../review-cadence.md),
[context and closeout](../../context-efficiency.md), and
[checkpoint execution](../../checkpoint-execution.md). Load only the current
specialist's inputs; each specialist reads its own role definition and skill.

Autopilot may write the README's execution fields, the run record below, scoped
status/artifact pointers after verified handoffs, and coordinator-owned review
persistence/commits. It commits a refiner's story changes and reviewer outputs;
neither role is asked to mutate Git. Planning/scope/contracts belong to the
planner; application changes, tests and implementation records belong to the
single implementer. Autopilot never authors implementation evidence or approval.
Only the reviewer changes reports, except verbatim restricted-runtime fallback.

An explicit autopilot invocation authorizes sequential delegation to these
roles. Preserve their write limits and unrelated work. Tracker sync/prune,
shared database changes, deployment, push/merge and destructive actions retain
their existing authorization boundaries. Never read or write secret files.

## Fresh context for every dispatch

Create a new agent for **each** planning task, refinement, child implementation,
resumed task, integration task, correction round and review pass. In Codex use
`spawn_agent` with `fork_turns: "none"`, the requested `agent_type`, and a unique
task name. Never inherit the transcript, resume a finished specialist with
`followup_task`, or reuse a reviewer/implementer across rounds. Messages to a
currently running agent may clarify its current assignment or request handoff;
they must not give it the next task.

If a custom role is unavailable, a fresh default agent may read that role's
definition and shared skill. Other runtimes must use their supported isolated
new-agent/session mechanism. If isolation, delegation or nesting depth is
unavailable, persist progress and return one concrete fresh-session handoff.
Changing roles inline or silently accepting inherited context does not satisfy
the user's requirement. Do not invent unsupported tool flags or launch external
CLI processes to evade runtime permissions.

Dispatch only one specialist at a time. Assign an implementer exactly one child
or bounded correction/integration task and require it to return at that boundary.
Before any new writer, verify the preceding task has returned, persisted its
closeout and relinquished ownership. If an existing session owns implementation,
request its safe handoff once; never take over its work while it is active.
Fresh implementers are successive owners, never concurrent writers. Do not
create worktrees to bypass this rule. Do not ask specialists to delegate onward.

Use this compact handoff shape, filling actual paths and facts:

```text
Role / task / write boundary: <one bounded assignment; return before next task>
Authorization: <parent review unit, task scope, exclusions, settled decisions>
Read first: AGENTS.md, <role definition>, <role skill>, <queue path>
Inputs: <active story, checkpoint or review index/report; relevant contracts/DoD>
Repository: <absolute workspace, branch, base/HEAD, scoped and unrelated dirty paths>
Evidence: <recorded checks with tested state; finding IDs and closure conditions>
Return: status, saved records, verification, remaining work, writer handoff;
        verified commits for planner/implementer; Git handoff for refiner/reviewer.
```

Reference durable records instead of copying transcripts or prescribing the
review verdict. Keep model and permission settings inherited unless the user
has chosen otherwise.

## Resume and run record

Inspect workspace/branch, HEAD, staging, scoped dirty paths, the queue, active
checkpoint and latest relevant review once. Verify claims against code and Git.
Reuse passing evidence for unchanged code/configuration; rerun affected checks
for changes, failures or named gaps. Missing records are unverified, not done.
An implemented or in-progress child goes to implementation closeout/fixes,
never back to the refiner. Do not reset existing IDs or completed work.

If no queue/path record exists, give the planner initialization grounded in
existing evidence. After resolving the delivery home, maintain the `## Autopilot`
checkpoint in that README using the schema in
[workflow-graph.md](../../workflow-graph.md). Replace only that section. It
records scope, stage, the active dispatch, retry state, gate judgment, writer
ownership, and the one blocker. It is not a second task list. Stages include
`ui_refine` when an unimplemented frontend child still has unsettled UI/UX
decisions; that is a gap in the old prose table, not a new approval gate.

The execution queue remains authoritative for active/next children and ordering;
checkpoints own unfinished implementation and reports own findings/verdicts.
The run record links to them instead of maintaining a second task list. Persist
the assignment before dispatch and its result after return, before advancing.
If dispatch fails, record it as not started. Runtime agent IDs may aid diagnosis
but cannot be required to resume. After interruption/compaction, check live agents
and reconcile the recorded dispatch before creating a successor. Unknown writer
ownership requires a handoff, not an assumption that the old agent disappeared.
An explicit resume continues the recorded scope; reading the record alone does
not start an unattended run or authorize a different parent.

## Select the next gate from evidence

Reconcile after every returned task, then take the first matching edge in
[workflow-graph.md](../../workflow-graph.md). Missing records are unverified,
not done. Do not treat a specialist status line as a gate. A live specialist
session is waited on, not replaced. Unknown writer ownership is a handoff
interrupt, not permission to start another writer.

An existing `Plan Ready` report remains usable when only execution status or
implementation detail changes within its accepted contracts/scope. Refining each
child does not automatically restart whole-plan review. For partial delivery
with missing plan approval, review the full plan and remaining-work impacts;
never pretend completed implementation is unimplemented to repair a planning gate.
Recorded fixes are `Addressed — awaiting re-review`, not reviewer closure. Once
every mandatory finding has a persisted correction and evidence, select re-review
even though the previous report still lists it open. Send an unchanged finding
back to implementation only for a specific remaining correction/evidence gap.

Respect documented dependency order and the requested entry. Resolve earlier
unmet prerequisites within authorized parent scope before the hinted child;
explain that adjustment. Do not skip blocked work or expand to another parent.
When independent eligible work exists within scope, it may continue sequentially
while a material answer is pending; keep the affected work blocked.

Before final review, reconcile the complete current descendant inventory,
including added/reopened children, every child closeout/commit (or explicit
commit blocker with owner), original AC/TR/DoD coverage, integration and the
parent implementation index. Use a baseline before the first included change,
all child commits and explicit working-tree paths; the last child's diff is
insufficient. If the baseline is missing, the implementer reconstructs it from
the earliest included change and Git history, recording the evidence; uncertain
scope remains blocked rather than inventing a baseline or restarting work.
Do not dispatch a reviewer to discover unfinished implementation.
No automatic child reviews or DoD audits. A standalone story is its review unit.

After any review returns, verify its report/path and verdict separately from
task completion. A final implementation pass also requires the shared reviewer's
user-facing `walkthrough.md`, after correction rounds and before completion:
code explanation, correctness evidence and workflow-specific manual test steps.
Verify its reviewed scope and actual/manual-pending labels; a report alone is
insufficient. If the walkthrough is missing/stale, request a fresh reviewer task
to prepare and verify that reviewer-owned deliverable, never an implementation
fix or an invented coordinator explanation. Persist an unsaved report and
walkthrough verbatim using the reviewer's
restricted-runtime fallback, reconcile permitted deferred non-passing status
edits, and commit the report and authorized docs before corrections/re-review
replace it. Passing-only sync stays deferred until a passing verdict. Keep
finding IDs and the reviewer's closure authority. On a pass, verify the
reviewer's permitted docs sync; persist any explicitly deferred passing-sync
edits as coordinator, then commit. Never ask the reviewer to commit.

## Stop and close out

Continue automatically while authorized work makes progress. Green tests,
`Implemented — awaiting parent review`, a completed reviewer task or planner
self-check is not independent approval. Mandatory `CANNOT VERIFY` gates block
an unqualified pass. Required human/browser evidence must be obtained under the
actual requirement; autopilot cannot ratify it, invent a waiver or weaken DoD.

Pause dependent work for material decisions, unavailable required execution,
missing permissions or external prerequisites. Persist the blocker and ask one
concrete question/action; do not repeatedly seek permission already granted.
Stop a correction loop after two consecutive correction/re-review cycles with
the same mandatory findings and no new closure evidence, code or decision
progress. Record attempts and the exact unresolved cause. A new finding alone
does not reset stagnation. This is a no-progress safeguard, not a cap on useful
iterations. Never relabel the gate passed to escape the loop.

Before returning, verify current parent sign-off still covers the final scope
and changes, reconcile run/queue/status records, inspect scoped staging and
commit coordinator-owned updates. Preserve unrelated staged work and never
bypass hooks. Report `commit pending` with exact paths/reason/owner if blocked.
Use the shared closeout fields: Status, Records, Commits, Verification, Remaining.
When incomplete, include a resume prompt with the exact README and checkpoint
or review paths. Prompt instructions provide orchestration during a live session;
they do not schedule future sessions or recover unsaved work automatically.
