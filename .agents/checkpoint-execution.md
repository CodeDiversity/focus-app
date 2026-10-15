# Checkpoint-based implementation

Use for the single implementer's work across all layers in any coding agent. One implementation task may
span fresh context windows and different agent tools. The
repository, tests, and durable checkpoint carry progress; chat history is optional.
Smaller stories reduce scope, while checkpoints preserve progress within a story.

## Durable record

The implementer owns `docs/artifacts/<ticket-id>/checkpoint.md`, alongside the
final `implementation.md`. Use the real Jira key when assigned, otherwise the
stable story ID; reuse an existing artifact directory for that ticket. Do not
rename artifacts or invent tracker keys during a resume.

Create the checkpoint before substantive implementation. Update it after each
logical code/test milestone, before a deliberate fresh context or compaction,
and before handing off a blocker. Save early rather than waiting until context
is exhausted. Keep the latest actionable state concise (normally under 100 lines)
and link detailed evidence; do not copy transcripts or full test output.

Use this shape, filling facts rather than leaving placeholders:

```markdown
# <ticket-id> checkpoint
Updated: <date/time with timezone>
Status: in progress | blocked | implementation complete — awaiting parent review | ready for review | complete
Story: <path>
Review unit: <parent ID and implementation-index path, or standalone story>
Role / scope: implementer; <active layer, owned outcome and exclusions>

## Repository state
- Workspace / branch:
- HEAD at last update:
- Saved work: <verified commit hashes and purposes, or uncommitted paths>
- Other work to preserve: <paths; no stash/reset/cleanup instructions>

## Progress
- [x] <completed behavior / AC with code or test evidence>
- [ ] <remaining behavior / AC>
- Current step: <one bounded action, including partially written code>

## Decisions and dependencies
- <settled contract/decision links; blockers and unresolved questions>
- <failed approach and why, only when needed to avoid repeating it>

## Verification
- <command, working directory, result, relevant commit or dirty state>
- <failing tests, unavailable checks, or checks not yet run>

## Resume next
1. <exact next file/symbol and action>
2. <focused verification command and expected observable result>
- Read next: <minimal code/test paths and exact contract sections>
```

Never persist secrets, raw passwords/tokens, connection strings, account data,
request dumps, or sensitive command output. Refer to environment variable names.

## Fresh-window resume

1. Read repo instructions, the role's shared skill, the story, and its checkpoint.
   Follow links to relevant shared contracts/DoD and the next code/test paths.
   Do not replay the full epic, every sibling, or the entire previous conversation.
2. Check workspace, branch, `git status`, HEAD, and the relevant diff/commits.
   Treat checkpoint claims as pointers, not proof. Reconcile changed files and
   newer work before editing; preserve other contributors' work. Never switch,
   reset, stash, overwrite, or discard work merely to match the checkpoint.
3. Confirm the last milestone with its focused test or inspect its recorded
   evidence against unchanged code. If evidence is stale or unclear, rerun the
   relevant check. Record discrepancies and adjust the next step; do not repeat
   completed implementation simply because chat context is gone.
4. Continue the first incomplete step, keeping the original story ID, ACs,
   ownership, security invariants and approval boundaries. A fresh window does
   not authorize new scope, tracker writes, deployment, or shared DB mutations.

If there is no checkpoint after an interruption, reconstruct one from the story,
current code, commits/diff and available test evidence. Mark uncertain state
unverified; do not invent completed steps or rerun database mutations blindly.

## Safe handoff and completion

Finish the current reversible code/test step and save files before handoff.
An intentionally red test or partial adapter may be checkpointed as incomplete;
record exactly what is failing. Do not deploy incomplete work or interrupt a live
transaction to create a checkpoint. Keep atomic credential writes together.
Make the existing role's scoped commits when safe; if blocked, record uncommitted
paths. Checkpointing does not require discarding work or forcing a commit.

Give the user a short resume prompt with the exact checkpoint path:

> Resume <ticket-id> as implementer. Read repo instructions and
> docs/artifacts/<ticket-id>/checkpoint.md, reconcile Git state, and continue the
> first incomplete step. Preserve unrelated work.

Start a fresh session in any compatible coding agent with access to the same
repository state and paste that prompt. If that tool does not auto-load
`AGENTS.md`, explicitly include it in the prompt. Resume state must use file
paths, commits and test evidence, never tool-specific session IDs or chat memory.
Repository instructions do not automatically create fresh sessions or guarantee
recovery after an unsaved crash. A different checkout also needs the referenced
commits and saved uncommitted work; a checkpoint alone does not transfer code.
Before another agent/session takes over, the current implementation writer must
finish its safe handoff and relinquish ownership; never run both as simultaneous
writers. Record the active child and next child in the parent checkpoint when
working through a group. Legacy backend/frontend role labels resume as implementer
while retaining the story's layer and original evidence.

At task end, run required final verification and write `implementation.md`.
Follow [review cadence](review-cadence.md): a finished substory is `implementation
complete — awaiting parent review` and may unblock later implementation. Do not
dispatch an individual reviewer. Once every child and integration obligation is
implemented, the coordinator prepares the parent index and marks the parent
`ready for review`. Mark `complete` only with required final review evidence;
a checkpoint or green unit test alone is not formal sign-off.
