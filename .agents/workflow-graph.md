# Delivery workflow graph

This file is the only router for StudyPilot delivery. The YAML fence is the
machine contract. The table below is the same edges in the same order. If they
disagree, the YAML wins. In-session autopilot executes this graph with the
host's native isolated dispatch. The local runner executes the same fence with
LangGraph. Neither executor may add an edge that is not listed here.

The README execution queue remains the child list. The `## Autopilot` section
is this run's checkpoint, not a second queue. An entry hint is recorded state.
It is not a jump. Every run starts at reconcile.

Jira sync and the DoD auditor are not nodes. An explicit user request may run
them beside the graph. They must not advance `stage`.

## How to execute one step

1. Reconcile evidence. Missing records are unverified, not done. Do not trust a
   specialist `Status:` line as a gate.
2. Walk the edge table from the top. Take the first match. Dispatch that one
   node, or stop on an interrupt.
3. Write the checkpoint before dispatch and again after return.
4. Use a fresh isolated context for every specialist node. `wait` resumes a
   live session; it does not start a second writer.

## Edge order

| Edge | When | Next |
| --- | --- | --- |
| wait_live_session | Writer is held and that session is still live | wait |
| writer_handoff | Writer is held or ownership is unknown | handoff |
| recorded_blocker | An unanswered material, evidence, permission, or handoff blocker is recorded | blocked |
| stagnation_unknown | Two correction cycles and no judgment yet on whether findings are unchanged | judge |
| stagnation | Two correction cycles with the same mandatory findings and no new evidence | blocked |
| breakdown_unknown | Breakdown validity is unverified | judge |
| breakdown_invalid | Breakdown, contracts, sizing, or scope is missing or invalid | planner |
| plan_unknown | Plan approval is unverified | judge |
| plan_findings_open | Plan findings are open and not yet corrected | planner |
| plan_not_ready | Plan approval is missing, awaiting re-review, or stale | plan_reviewer |
| planning_unknown | Planning satisfaction is unverified | judge |
| child_in_progress | Eligible child is in progress | implementer |
| child_unfinished_unknown | Closeout of the active child is unverified | judge |
| child_unfinished | Active child is unfinished or closeout is incomplete | implementer |
| child_blocked | First eligible child is blocked and no independent later child is eligible | blocked |
| ui_unknown | Unimplemented child may still need UI/UX decisions | judge |
| ui_needed | Frontend child is unimplemented and UI/UX decisions are unsettled | ui_refiner |
| tech_unknown | Unimplemented child may still need technical refinement | judge |
| tech_needed | Child needs technical refinement | refiner |
| refinement_unresolved | Child is queued or needs refinement, but neither refinement flag is set | judge |
| child_ready | Planning gates passed and the eligible child is Ready | implementer |
| descendants_unknown | Descendant completion is unverified | judge |
| descendants_incomplete | Some descendant is not implemented and no eligible child was selected | judge |
| integration_unknown | Integration or the combined index is unverified | judge |
| integration_incomplete | Descendants are implemented and integration or the index is incomplete | implementer |
| findings_unknown | Review findings are unverified | judge |
| findings_owner_unknown | Open findings have no owner yet | judge |
| fix_planner | Open mandatory findings are planning or scope gaps | planner |
| fix_implementer | Open mandatory findings are implementation or evidence gaps | implementer |
| parent_review | Closeout and integration are verified and the parent review is absent, stale, or awaiting closure | parent_reviewer |
| walkthrough_unknown | A passing review has an unverified walkthrough | judge |
| walkthrough_needed | The passing review's walkthrough is missing or stale | walkthrough |
| closeout_unknown | Final closeout is unverified | judge |
| closeout_incomplete | Final closeout is incomplete after a verified walkthrough | implementer |
| complete | Passing parent verdict, verified walkthrough, and persisted closeout | complete |
| unmatched | Nothing else matched | judge |

## Interrupts

Stop and ask one question. Do not relabel the gate passed.

| Interrupt | Stop when |
| --- | --- |
| handoff | A writer still owns the work, or ownership is unknown. Do not start another writer. |
| material_decision | A material product, security, or contract decision is unanswered. |
| human_evidence | Required human or browser evidence is missing. Autopilot cannot ratify it. |
| missing_permission | A required permission or external prerequisite is unavailable. Do not auto-approve. |
| stagnation | Two consecutive correction or re-review cycles made no progress. |
| missing_judgment | Two read-only judgment passes still left a required gate unknown. |

## Non-edges

- No parallel implementers, and no worktree created to get around that.
- No automatic child review and no automatic DoD audit.
- No Jira sync unless the user explicitly authorizes that separate workflow.
- No advance into the next parent or epic.
- An implemented child never returns to the refiner or UI refiner.
- An entry hint does not skip an earlier unmet prerequisite.
- Refining a child does not restart whole-plan review unless acceptance
  criteria, contracts, scope, or dependencies changed.
- The runner is not a writer and does not approve a gate.

## Checkpoint

Replace only the `## Autopilot` section. Leave the execution queue untouched.
`judged_at_head` and `queue_hash` record when judgment gates were last
verified. If HEAD or the queue changes, those gates return to `unknown`.

```yaml
version: 1
scope:
  parent: SP-1
  descendants: []
  entry: ""
  limits: enclosing parent review unit
stage: reconcile
coordinator:
  workspace: ""
  branch: ""
  baseline: ""
  head: ""
active_dispatch:
  name: ""
  role: ""
  status: none
  pointer: ""
  session: ""
  assignment: ""
last_result:
  evidence: ""
  findings: ""
  scope_note: ""
  cycles: 0
  same_findings: unknown
gates:
  breakdown: unknown
  plan: unknown
  ui: unknown
  refinement: unknown
  child_unfinished: unknown
  eligible_child_state: unknown
  closeout: unknown
  integration: unknown
  all_descendants_implemented: unknown
  review: unknown
  findings_owner: unknown
  open_findings: unknown
  walkthrough: unknown
  judged_at_head: ""
  queue_hash: ""
writer: none
session_live: unknown
blocker:
  kind: none
  owner: ""
  question: ""
  answer: ""
resume: ""
judgment_attempts: 0
```

## Graph contract

```yaml
version: 1
scope: parent_review_unit
checkpoint: readme_autopilot_section
queue: readme_execution_queue
non_nodes:
  - jira-sync
  - dod-auditor
nodes:
  - id: wait
    role: none
    fresh_context: false
    commit: none
    writes: []
  - id: judge
    role: dod-auditor
    fresh_context: true
    commit: none
    read_only: true
    writes: []
  - id: planner
    role: planner
    fresh_context: true
    commit: specialist
    writes: ["docs/**"]
  - id: plan_reviewer
    role: reviewer
    fresh_context: true
    commit: coordinator
    writes: ["plan-review.md"]
  - id: ui_refiner
    role: ui-refiner
    fresh_context: true
    commit: coordinator
    writes: ["docs/stories/**/*.md"]
  - id: refiner
    role: refiner
    fresh_context: true
    commit: coordinator
    writes: ["docs/stories/**/*.md"]
  - id: implementer
    role: implementer
    fresh_context: true
    commit: specialist
    writes: ["application", "docs/stories/**/README.md execution fields", "artifacts/**"]
  - id: parent_reviewer
    role: reviewer
    fresh_context: true
    commit: coordinator
    writes: ["review.md"]
  - id: walkthrough
    role: reviewer
    fresh_context: true
    commit: coordinator
    writes: ["walkthrough.md", "review.md"]
  - id: handoff
    interrupt: handoff
    fresh_context: false
    commit: none
  - id: blocked
    interrupt: blocked
    fresh_context: false
    commit: none
  - id: complete
    fresh_context: false
    commit: none
edges:
  - id: wait_live_session
    when:
      all:
        - { field: writer_ownership, eq: held }
        - { field: session_live, eq: true }
    to: wait
    stage: reconcile
    question: "The previous specialist session is still running. Wait for it; do not start another writer."
  - id: writer_handoff
    when:
      field: writer_ownership
      in: [held, unknown]
    to: handoff
    interrupt: handoff
    stage: blocked
    question: "A writer still owns this work, or ownership is unknown. Obtain a safe checkpoint handoff and relinquished ownership before another writer."
  - id: recorded_blocker
    when:
      all:
        - { field: blocker_kind, in: [material_decision, human_evidence, missing_permission, handoff, stagnation, missing_judgment] }
        - { field: blocker_answered, eq: false }
    to: blocked
    interrupt: recorded
    stage: blocked
    question: "A blocker is already recorded. Answer that one question, then resume."
  - id: stagnation_unknown
    when:
      all:
        - { field: retry_cycles, gte: 2 }
        - { field: same_findings, eq: unknown }
    to: judge
    stage: reconcile
  - id: stagnation
    when:
      all:
        - { field: retry_cycles, gte: 2 }
        - { field: same_findings, eq: true }
    to: blocked
    interrupt: stagnation
    stage: blocked
    question: "Two correction cycles made no progress on the same mandatory findings. Stop. Do not relabel the gate passed."
  - id: breakdown_unknown
    when: { field: breakdown_valid, eq: unknown }
    to: judge
    stage: reconcile
  - id: breakdown_invalid
    when: { field: breakdown_valid, eq: false }
    to: planner
    assignment: plan_correction
    stage: plan
  - id: plan_unknown
    when: { field: plan_approval, eq: unknown }
    to: judge
    stage: reconcile
  - id: plan_findings_open
    when: { field: plan_approval, eq: findings_open }
    to: planner
    assignment: plan_correction
    stage: plan
  - id: plan_not_ready
    when: { field: plan_approval, in: [missing, findings_awaiting_rereview, stale] }
    to: plan_reviewer
    assignment: plan_review
    stage: plan_review
  - id: planning_unknown
    when: { field: planning_satisfied, eq: unknown }
    to: judge
    stage: reconcile
  - id: child_in_progress
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: eligible_child_state, eq: "In progress" }
    to: implementer
    assignment: resume_checkpoint
    stage: implement
  - id: child_unfinished_unknown
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: child_unfinished, eq: unknown }
    to: judge
    stage: reconcile
  - id: child_unfinished
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: child_unfinished, eq: true }
    to: implementer
    assignment: resume_checkpoint
    stage: implement
  - id: child_blocked
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: eligible_child_state, eq: Blocked }
    to: blocked
    interrupt: material_decision
    stage: blocked
    question: "The first eligible child is blocked. Ask the one recorded question. Do not skip it for a dependent sibling."
  - id: ui_unknown
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: needs_ui_refinement, eq: unknown }
        - { field: eligible_child_state, in: ["Needs refinement", Queued] }
    to: judge
    stage: reconcile
  - id: ui_needed
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: needs_ui_refinement, eq: true }
        - { field: eligible_child_state, in: ["Needs refinement", Queued] }
    to: ui_refiner
    assignment: ui_refine
    stage: ui_refine
  - id: tech_unknown
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: needs_technical_refinement, eq: unknown }
        - { field: eligible_child_state, in: ["Needs refinement", Queued] }
    to: judge
    stage: reconcile
  - id: tech_needed
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: needs_technical_refinement, eq: true }
        - { field: eligible_child_state, in: ["Needs refinement", Queued] }
    to: refiner
    assignment: technical_refine
    stage: refine
  - id: refinement_unresolved
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: eligible_child_state, in: ["Needs refinement", Queued] }
    to: judge
    stage: reconcile
  - id: child_ready
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: eligible_child_state, eq: Ready }
    to: implementer
    assignment: complete_child
    stage: implement
  - id: descendants_unknown
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: all_descendants_implemented, eq: unknown }
    to: judge
    stage: reconcile
  - id: descendants_incomplete
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: all_descendants_implemented, eq: false }
        - { field: eligible_child_state, eq: none }
    to: judge
    stage: reconcile
  - id: integration_unknown
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: all_descendants_implemented, eq: true }
        - { field: integration_complete, eq: unknown }
    to: judge
    stage: reconcile
  - id: integration_incomplete
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: all_descendants_implemented, eq: true }
        - { field: integration_complete, eq: false }
    to: implementer
    assignment: integration
    stage: integration
  - id: findings_unknown
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: all_descendants_implemented, eq: true }
        - { field: integration_complete, eq: true }
        - { field: open_findings, eq: unknown }
    to: judge
    stage: reconcile
  - id: findings_owner_unknown
    when:
      all:
        - { field: open_findings, eq: true }
        - { field: findings_owner, eq: unknown }
    to: judge
    stage: reconcile
  - id: fix_planner
    when:
      all:
        - { field: open_findings, eq: true }
        - { field: findings_owner, eq: planner }
    to: planner
    assignment: fix
    stage: fix
  - id: fix_implementer
    when:
      all:
        - { field: open_findings, eq: true }
        - { field: findings_owner, eq: implementer }
    to: implementer
    assignment: fix
    stage: fix
  - id: parent_review
    when:
      all:
        - { field: planning_satisfied, eq: true }
        - { field: all_descendants_implemented, eq: true }
        - { field: integration_complete, eq: true }
        - { field: open_findings, eq: false }
        - { field: review, in: [absent, stale, fail] }
    to: parent_reviewer
    assignment: parent_review
    stage: parent_review
  - id: walkthrough_unknown
    when:
      all:
        - { field: review, eq: pass }
        - { field: walkthrough, eq: unknown }
    to: judge
    stage: reconcile
  - id: walkthrough_needed
    when:
      all:
        - { field: review, eq: pass }
        - { field: walkthrough, in: [missing, stale] }
    to: walkthrough
    assignment: walkthrough
    stage: walkthrough
  - id: closeout_unknown
    when:
      all:
        - { field: review, eq: pass }
        - { field: walkthrough, eq: verified }
        - { field: closeout_complete, eq: unknown }
    to: judge
    stage: reconcile
  - id: closeout_incomplete
    when:
      all:
        - { field: review, eq: pass }
        - { field: walkthrough, eq: verified }
        - { field: closeout_complete, eq: false }
    to: implementer
    assignment: closeout
    stage: implement
  - id: complete
    when:
      all:
        - { field: review, eq: pass }
        - { field: walkthrough, eq: verified }
        - { field: closeout_complete, eq: true }
        - { field: open_findings, eq: false }
        - { field: planning_satisfied, eq: true }
    to: complete
    stage: complete
  - id: unmatched
    when: { always: true }
    to: judge
    stage: reconcile
    question: "No delivery edge matched. Judge the gates before dispatching a specialist."
interrupts:
  - id: handoff
  - id: material_decision
  - id: human_evidence
  - id: missing_permission
  - id: stagnation
  - id: missing_judgment
non_edges:
  - id: implemented_child_never_returns_to_refiner
    given:
      eligible_child_state: "Implemented — awaiting parent review"
      needs_ui_refinement: true
      needs_technical_refinement: true
      all_descendants_implemented: false
    never: [refiner, ui_refiner]
  - id: hint_does_not_skip_prerequisites
    given:
      breakdown_valid: false
      entry_hint: implement SP-106B
    expect: planner
  - id: hint_does_not_change_route
    given:
      eligible_child_state: Ready
      all_descendants_implemented: false
      integration_complete: false
    entry_hints: ["", "implement SP-1A"]
    expect: implementer
  - id: stagnation_stops
    given:
      retry_cycles: 2
      same_findings: true
      open_findings: true
      findings_owner: implementer
    expect: blocked
    interrupt: stagnation
  - id: no_fanout
    note: route returns one target; edges have no parallel key
```
