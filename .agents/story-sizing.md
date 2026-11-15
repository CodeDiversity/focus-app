# Story sizing

Optimize for one cohesive, useful, independently verifiable outcome per story
with a bounded context footprint. Length is not size; a short ticket can hide
several jobs. Layer labels (backend/frontend) are scope, not separate writers.

## Default slice

- One observable outcome, normally **2–4 ACs**; more than five is a signal to look for a second outcome.
- A cohesive task may span windows via a [checkpoint](checkpoint-execution.md); needing another window is not a reason to split.
- Record the real production/test footprint including wiring, migrations and docs.

## Sizing block (required in every implementation story)

- **Outcome:** one sentence.
- **Actual at closeout:** filled from the `efficiency.md` row (dispatches, tokens if exposed); leave `tbd` when planning.
- **Files:** production and focused test paths; new paths marked.
- **Start context:** this story, exact contract sections, the few code/test paths to begin. Not every sibling.
- **Verification:** focused commands and observable pass conditions; unavailable infrastructure named as a dependency.
- **Dependencies / exclusions:** prerequisites; adjacent outcomes owned by other story IDs (every excluded source requirement still has an owner).

## Split only for meaningful work

Split when inspected scope is too large or holds substantial independent
outcomes, each with a useful verifiable result. Record the concrete reason.
A child under ~30 minutes of substantive work is a checklist item, not a story
(instructions, records, commits and waiting do not count). README-only,
status-only, evidence-only or routine-verification children are never created;
integration/index work belongs to an existing substantial child unless it adds
real integration code or a new test harness.

Keep **one atomic security invariant in one slice** (e.g. token claim +
retirement + revocation + password update as one transaction with rollback
tests); separate its HTTP adapter, not its writes. If the atomic core still
exceeds the target, record why and proceed with checkpoints.

Oversized **unimplemented** story: the planner keeps its ID as a coordination
record and creates children (B1/B2…), mapping every AC/TR/DoD obligation.
In-progress or completed work keeps its history; remaining-work splits are an
explicit planner task. A refiner that finds multiple outcomes returns a split
proposal; it never creates siblings. Feed actual effort back into the next
sizing via `efficiency.md`.
