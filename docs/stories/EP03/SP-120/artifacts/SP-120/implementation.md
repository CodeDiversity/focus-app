# SP-120 parent implementation index

**Parent:** [SP-120 breakdown](../../README.md) — Assignment Subtasks (EP03, AC-E03-03)
**Integration/index owner:** SP-120J. This index does not claim the combined review.

## Implementation order and commit scope

Baseline before the first included change: `c7007db` (SP-120J UI refinement; I's API commit `5e65cfc` is already on this baseline).

| Child | Layer | Implementation record | Checkpoint | Commit scope |
|---|---|---|---|---|
| [SP-120I](../../SP-120I-subtask-api.md) | Backend | [implementation.md](../SP-120I/implementation.md) | [checkpoint.md](../SP-120I/checkpoint.md) | `5e65cfc` — nested subtask routes, DTOs, course-detail `subtasks` projection, unit/data-scoping/e2e. No migration (D120-1). |
| [SP-120J](../../SP-120J-subtask-ui.md) | Frontend | [implementation.md](../SP-120J/implementation.md) | [checkpoint.md](../SP-120J/checkpoint.md) | Closeout commit on top of `c7007db` (hash in the implementer handoff; this file is inside that commit). Checklist, dialog, client functions, page announcements, tests, this index. |

## Shared contract status

The contract in the [parent README](../../README.md#shared-api-contract) is implemented at both layers:

- I: four nested routes, ownership gates, 6-key projection, course-detail `subtasks` ordered `orderIndex` asc then `createdAt` asc, other assignment keys unchanged. Verification is in I's record (unit, data-scoping, e2e, typecheck, lint).
- J: consumes that projection. Mutations use the nested client. Success announces a subtask sentence and background-refetches `getCourse` (D112B-10 / D120-5). No second list fetch. Partial reorder refetches without a success sentence.

## Open items before the final review

- **J-4 (open, review-handoff):** the DoD-10 manual browser pass was not executed in this agent context. Steps and the reason are in [J's browser note](../SP-120J/implementation.md#dod-10-browser-note-blocked-for-this-context--recorded-as-the-story-allows). Expected to be covered by the final review walkthrough and/or a user pass. The story allows recording the blocker as this child's closeout.
- Statuses: I and J are `Implemented — awaiting parent review`. The combined review (`review.md` + `walkthrough.md`) has not happened. This index does not claim it.
