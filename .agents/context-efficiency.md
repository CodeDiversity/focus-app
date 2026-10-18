# Context, handoffs and efficiency

## Read only what the current role needs

Start with the parent README's Execution queue, then the active story, relevant
epic/DoD requirements, checkpoint and named contract/code sections. Locate headings
with search and read bounded sections. Implementation resumes do not require full
correction history, every sibling or past transcripts. Expand when dependencies,
security invariants or conflicting evidence require it. Whole-parent reviews still
cover every child, original AC/test requirement and applicable DoD obligation.
Load role-specific references on demand; reuse already-read unchanged instructions
within the session rather than opening them again at each milestone.

After compaction, reconcile current HEAD and relevant dirty paths once. Reuse
recorded verification when its tested code/configuration is unchanged. Read
only missing citations or unresolved evidence; batch those bounded reads.
Rerun a gate when relevant changes, a failure or an identified evidence gap
justify it. Reopening an already verified fact requires a concrete unresolved
question, rather than another general confirmation of the same claim.

When evidence collection is complete, draft and save the report. Classify each
finding against the current story requirements and DoD, recording the rationale
once; historical reports provide context but do not waive current obligations.
Revisit a classification only for new evidence or a specific rule conflict.
Any required criterion still unverified or unmet must remain explicit in the
coverage and verdict. Do not spend repeated passes debating a hypothetical
passing verdict before writing the findings.

## One authoritative record per fact

- README queue: execution state, dependencies, active/next work and artifact paths.
- Child checkpoint: unfinished work, resume inputs, decisions needed to avoid rework.
- Child implementation record: completed behavior, verification and known gaps.
- Parent implementation index: child/evidence links and complete combined Git scope.
- Reviewer report: independent findings, closure evidence and verdict.
- Jira-sync ledger: tracker identity, last common spec baseline, pending mutations
  and removal tombstones; never a duplicate execution queue.

Other records link to these facts rather than repeating narratives. Historical
records stay intact; do not bulk rewrite finished stories to adopt this convention.
Explicit Jira-sync pruning may remove a completed specification under its skill
gates; preserve historical evidence and repair live navigation to its tombstone.
Required child status pointers and final review status sync remain scoped updates.

## Bounded handoff

At a deliberate handoff or fresh-context start, pass the following compact facts
with paths rather than full conversation history. A checkpoint can serve as the
handoff; do not create a second artifact merely to repeat it.

- Role, authorized scope and exact queue/story/checkpoint or review-index paths.
- Workspace/branch, base and HEAD (or explicit dirty paths); other work to preserve.
- Relevant paths/symbols/contract sections and settled decision links.
- Verification command, working directory, exit/result and tested Git state.
- Blockers, exact next action and required resume inputs.

The receiver reconciles Git state and stale evidence before continuing. A reviewer
still verifies claims independently. Transfer the single implementation writer
explicitly; a handoff does not authorize simultaneous writers or additional scope.

## Task closeout contract

Close out each assigned task before returning to the coordinating parent or
user, and each implemented child before advancing to the next child. Use the
existing queue/checkpoint/implementation record; do not add a parallel tracker.

1. Persist completed and remaining work within the role's write boundary.
   The implementer updates the queue row, active/next fields, child's status and
   artifact pointers. Use `Implemented — awaiting parent review` for finished
   implementation; reserve `Reviewed` for a passing final parent review.
   Mark completed checklist items in the record that owns them. If a runtime
   task list exists, close finished entries there too; incomplete work remains
   pending or blocked. Runtime status never replaces repository evidence.
2. Run the required checks and record commands, working directory, results and
   tested Git state. A missing required check or incomplete behavior stays
   explicit; do not label it done to unblock the parent.
3. If the role may mutate Git, inspect the scoped diff, stage explicit owned
   paths/hunks and commit the task's code/docs/status updates before returning
   or starting the next child. Inspect the staged diff before committing so
   unrelated staged work is excluded. Never use blanket staging in a shared
   workspace. Record verified commit hashes in the handoff, then check remaining
   scoped changes with `git status --short`. Incremental commits do not replace
   the final status/artifact update. Do not amend merely to put a commit's own
   hash inside it; the returned handoff can identify that final commit.
4. If committing is blocked by permissions, hooks, mixed ownership or an
   explicit user restriction, save permitted progress and return `commit
   pending`, exact paths, reason and next owner/action. Never bypass hooks,
   discard other work, or claim a commit succeeded. Reviewers never mutate Git;
   auditors write nothing. Their handoff names the coordinator as owner of
   permitted deferred persistence/status updates and scoped commits.

End the response with these compact fields (links replace repeated narratives):

```text
Status: <implemented / reviewed / blocked / partial; distinguish task completion from approval>
Records: <queue/story/checkpoint/implementation or report paths; deferred writes if any>
Commits: <verified hashes and purpose, or none with reason and commit owner>
Verification: <commands + cwd + results + tested state, or evidence link; unavailable gates>
Remaining: <open work/blockers + next action and owner, or none in assigned scope>
```

The coordinator checks this closeout against the linked records and Git before
dispatching final review. Return missing status/evidence/commit closeout to its
owner as one bounded correction; do not launch a reviewer to reconstruct it.
Do not poll an already finished agent for repeated completion acknowledgements.
Once a review report is returned, the coordinator persists any permitted fallback
writes, reconciles deferred non-passing status updates, and commits the report
and authorized docs changes. Preserve the review verdict verbatim. A completed
review task may have a non-passing verdict; it does not remain running merely
because implementation fixes are required.

## Measure before claiming savings

For a deliberate workflow comparison, record a compact row per comparable task in
`<delivery-home>/artifacts/efficiency.md`: task/type/size, model and reasoning setting
when exposed, input/output tokens, cached-input tokens when exposed, tool calls,
repeated reads, review passes and completion outcome. Use available runtime usage
metadata; otherwise mark fields unavailable. Do not read raw session logs or
credentials merely to fill a metric. Normal story execution does not require a new
measurement artifact or tool call at every milestone.

Compare similar scopes and verification requirements. Report measured counts and
quality/rework outcomes together; distinguish prompt word reduction from actual
runtime tokens, latency or monetary savings. Do not weaken tests, security or
independent review to improve the numbers.
