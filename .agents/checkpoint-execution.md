# Checkpoints (multi-window tasks only)

Write `<artifact-root>/<story-id>/checkpoint.md` only when a task will span a
context window or is being handed off. Single-window children write
`implementation.md` only. Create it before the first milestone that might not
finish; update after each code/test milestone and before any handoff. Keep it
under ~60 lines; link evidence, never paste logs or secrets.

```markdown
# <story-id> checkpoint — Updated: <date, tz>
Queue row: <README link> · Story: <path>
## Repository state
- Branch / HEAD / saved commits / uncommitted paths / other work to preserve
## Steps (S1…Sn; cite ACs as <STORY>-AC<n>, decisions by ID)
- [x] S1 <outcome + evidence>
- [ ] S2 <outcome>
- Current: <one bounded action>
## Verification
- <command · cwd · result · tested state>; <checks not yet run>
## Resume next
1. <exact file/symbol and action>  2. <focused check + expected result>
```

## Resume

1. Read core.md, your skill, the queue row, the story, this checkpoint.
2. `git status`, HEAD, relevant diff. Checkpoint claims are pointers, not proof; reconcile newer work, never reset/stash/discard to match.
3. Re-run or inspect the last milestone's check; adjust the next step.
4. Continue the first incomplete step within the original scope and boundaries.

If no checkpoint exists after an interruption, reconstruct one from story, code,
commits and tests; mark uncertain state unverified.

## Handoff and completion

Finish the current reversible step, save, commit finished milestones, record
uncommitted paths and reason if blocked. Hand the next session:

> Resume <story-id> as implementer. Read .agents/core.md and <checkpoint path>, reconcile Git state, continue the first incomplete step. Preserve unrelated work.

At completion write `implementation.md`, then reduce the checkpoint to a closed
pointer: ID, final commit, record link, open finding IDs. `Implemented —
awaiting parent review` is completion, not approval.
