# Review a completed story group once

For a parent story split into substories, perform **one formal implementation
review of the complete parent scope after all substories are implemented**.
Do not automatically dispatch a reviewer or DoD auditor after each substory.
This cadence applies in any coding agent. Explicit requests for an interim or
individual review can still be fulfilled; they do not replace the final review.
An unsplit standalone story is its own review unit. Plan review remains a review
of the whole breakdown before implementation.

## Planning and implementation

The planner identifies the review unit in the parent/breakdown README: parent
ID, all implementation descendants, integration/sign-off owner, source AC/test
mapping, and final artifact directory. Resolve paths using [delivery state](delivery-state.md): the parent README
records the delivery home and artifact root. Use stable story-ID directories for
new/migrated groups, keeping Jira keys in metadata. Do not
give a coordination record a new implementation issue merely to hold a review.
For nested splits, the enclosing feature parent owns the final review unless
the user explicitly chooses a different scope; do not review every nested group.

The single implementer runs substories sequentially across layers, including
integration work. It runs each substory's required tests/checks and writes its
`implementation.md` and checkpoint. Record **implementation complete — awaiting
parent review**, with the parent ID and artifact links. This can satisfy a
dependent substory's implementation prerequisite without a reviewer report.
Missing tests or incomplete required behavior cannot be relabeled complete.
Local self-checks, tests and safe incremental commits continue as normal.

The coordinator tracks child completion from actual artifacts and Git state.
Finishing the nominally last ID alone is insufficient: verify all in-scope
descendants, dependencies and integration obligations. A new child, reopened
work or a failed required check keeps the group from being ready. Do not use
reviewer dispatch as the default way to discover which substories are unfinished.

## Final review gate

After all children and required integration work are implemented, prepare a
parent `<artifact-root>/<parent-story-id>/implementation.md` index containing:

- Review scope: parent, complete child inventory and each implementation link.
- Combined Git change scope: base commit and final commit, or explicit working
  tree paths, including child commits; the last child's diff alone is insufficient.
- Original AC/test/DoD ownership and links to collected integration evidence.
- Commands/results and known gaps; do not label planned checks as executed.

The single implementer owns integration implementation and this index; no
additional implementation writer is needed. The documentation-only planner
never invents implementation evidence. The parent
checkpoint becomes `ready for review` and the coordinator dispatches the reviewer
once for the group. Do not require prior child `review.md` files as prerequisites.
If there is no coordinator in the current session, hand off the concrete review
request and index path instead of claiming a review was run.

The reviewer independently checks the **combined implementation**, including
every child AC, all original parent criteria, applicable DoD and cross-child
behavior. Missing child implementation records are evidence gaps; missing child
review reports are expected. It saves one report at the README-resolved
`<artifact-root>/<parent-story-id>/review.md`, with findings attributed
to affected child IDs and files. On a passing verdict it also performs the
reviewer skill's passing-review docs sync; on a non-passing verdict it saves
the report only and the coordinator/planner defers those docs edits until the
passing pass. Retain existing historical child reports.

Findings are fixed in the affected implementation scope and re-reviewed together
at the parent; no automatic child-by-child review cycle. Only the final passing
parent report establishes formal sign-off. Before that, parent and children
must distinguish implementation completion from review approval or release.
