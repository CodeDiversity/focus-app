# SP-115 parent implementation index

**Parent:** [SP-115 breakdown](../../README.md) — Assignment Types (EP03, AC-E03-02 type half)
**Integration/index owner (child):** SP-115H — this index and the final
walkthrough hand-off belong to the combined review unit described in the [
parent README](../../README.md#final-implementation-review-unit).

## Implementation order and commit scope

Baseline before the first included change: `8027671` (last commit before any
assignment-type implementation code; the two planning commits and the later
`36be97c` docs footer fix are outside implementation scope).

| Child | Layer | Implementation record | Checkpoint | Commits (code scope) |
|---|---|---|---|---|
| [SP-115G](../../SP-115G-assignment-type-api.md) | Backend (Prisma/REST) | [implementation.md](../SP-115G/implementation.md) | [checkpoint.md](../SP-115G/checkpoint.md) | `77e733f` — schema/enum, nullable `Assignment.type`, migration `20261025000000_assignment_optional_type`, create/update validation, both 11-key mappers, API test updates. (`faf9235`/`36be97c` are G's closeout hashes/README footer doc follow-ups only.) |
| [SP-115H](../../SP-115H-assignment-type-ui.md) | Frontend | [implementation.md](../SP-115H/implementation.md) | [checkpoint.md](../SP-115H/checkpoint.md) | Scoped commit returned in the implementer handoff (hash recorded in its implementation record's Commits section after commit; commit cannot contain its own hash). |

## Shared contract status

The fixed contract in the [parent README](../../README.md#shared-api-contract)
is implemented across both children and verified at each layer:

- G: create/update semantics (omit/null → null; patch null/omit keeps), five-value
  validation with field-level 400, type-only patch non-empty, ownership
  unchanged (`ownedWhere` + uniform 404), 11-key projection in both mappers —
  unit 194, scoping 37, e2e 38, course e2e 19 (all with `DATABASE_URL`, none skipped).
- H: form control (create "No type" omits the key; edit preselects stored /
  omits for null-stored; never sends `null`), row pill with titled labels and
  neutral palette, `type` mapped server-error field, updated fixtures — web
  suites 121/focused and 563/full, typecheck and lint clean.

## Open items before the final review

- **F-115H-1 (open, review-handoff):** the DoD-10 manual browser pass was not
  executed in the agent context; steps and the exact reason are in
  [H's DoD-10 note](../SP-115H/implementation.md#dod-10-browser-note-blocked-for-this-context--recorded-as-the-story-allows).
  It is expected to be covered by the final review's manual walkthrough and/or
  a user pass, per the story's "record the pass or the blocker" closeout rule.
- Statuses: G is `Implemented — awaiting parent review`; H is the same — the
  one combined parent review (`review.md` + `walkthrough.md`) remains, and this
  index does not claim it happened.
