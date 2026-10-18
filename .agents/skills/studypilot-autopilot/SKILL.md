---
name: studypilot-autopilot
description: Use when the user requests StudyPilot autopilot through final parent approval, including entry at planning, refinement, a specific substory, integration, review, or review fixes. Ordinary single-role or single-child requests retain their original scope.
---

# StudyPilot Autopilot

Coordinate the existing delivery roles through a passing independent parent
review. Every specialist task gets a new, isolated context; the repository carries
progress. Autopilot is a coordinator, never the implementation or review owner.

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
existing evidence. After resolving the delivery home, maintain a small
`## Autopilot` section in that README:

- **Scope and entry:** authorized parent/descendants, entry hint and explicit limits.
- **Coordinator:** workspace/branch and run identity; retain the original Git
  baseline until the parent implementation index owns the combined scope.
- **Stage:** reconcile, plan, plan review, refine, implement, integration,
  parent review, fix, walkthrough, blocked, or complete.
- **Active dispatch:** unique task name, role, bounded assignment, dispatch
  pending/running/returned/not started, and checkpoint/report pointer; `None`
  between dispatches.
- **Last result / retry state:** evidence link, finding IDs, changed scope and
  consecutive correction cycles without progress.
- **Resume:** exact next action or blocker, required input and owner.

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

Reconcile after every returned task, then select the first applicable action:

| Observed state | Next task / gate |
| --- | --- |
| Existing writer still owns work or ownership is unknown | Obtain safe checkpoint handoff and relinquished ownership before another writer; this does not authorize resumed coding. |
| Missing/invalid breakdown, contracts, sizing or scope/dependency decisions | Fresh planner corrects only the affected planning scope, preserving implementation. Material unanswered decisions remain blocked. |
| Missing whole-plan approval, unresolved plan findings, or substantive AC/contract/scope/dependency changes since approval | Fresh reviewer performs whole-plan review; route corrections to a fresh planner and re-review until `Plan Ready`. |
| Planning gates satisfied; active child is unfinished or closeout is incomplete | Fresh implementer resumes the same checkpoint or finishes missing records/checks/commits before advancing. |
| First eligible child needs technical refinement | Fresh refiner updates only that unimplemented story. Coordinator commits its output and reconciles readiness/dependencies; unanswered material questions prevent coding. |
| First eligible child is Ready | Fresh implementer completes only that child and its closeout, then returns. |
| All descendants implemented but integration or combined index is incomplete | Fresh implementer completes the bounded integration/index obligation, including any missing child closeout. |
| Mandatory parent-review findings still need persisted corrections or closure evidence | Fresh implementer fixes implementation/evidence gaps; fresh planner fixes scope/planning gaps. Refresh affected evidence/index, then fresh parent re-review. |
| All closeout/integration verified; final review absent/stale, or recorded corrections await independent closure | Fresh reviewer reviews the complete parent and combined Git scope once. |
| Final implementation report passes but the final walkthrough is missing/stale/unverified | Persist returned verified content via permitted fallback, or request a fresh reviewer to prepare/verify the final document. Completion stays pending. |
| Independent parent verdict passes current scope, final walkthrough is verified/saved, and all closeout is persisted | Record completion and stop within this parent. |

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
