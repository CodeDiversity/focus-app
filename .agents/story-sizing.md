# StudyPilot story sizing

Use this policy when planning, refining, reviewing, or implementing a story.
Optimize for a cohesive, useful implementation outcome with a bounded context footprint.
Story length alone is not a size measure: a short ticket can hide several jobs.
Small slices do not create separate formal review gates: follow
[review cadence](review-cadence.md) for one final review of the completed parent.
All implementation slices share one sequential `implementer` owner; backend,
frontend and integration remain scope labels rather than concurrent coding roles.
Use [delivery state](delivery-state.md) for the next-task queue and canonical
artifact paths. A sizing/refinement gap is `Needs refinement`, not `Ready` to code.

## Default implementation slice

- Target **1–3 hours** for a substantive outcome including code, focused tests,
  required checks, documentation and handoff. This is a guide, not a split trigger.
  A cohesive task may span fresh
  windows using [checkpoint-based execution](checkpoint-execution.md); plan
  bounded code/test milestones rather than forcing it into one context.
  This is a planning estimate, not a runtime or token
  guarantee. Ground estimates in actual implementation work; do not inflate
  them with repeated reads, agent handoffs or bookkeeping to justify a story.
- Deliver **one observable outcome**, normally with **2–4 acceptance criteria**.
  Negative cases for that outcome belong in its test matrix. More than five
  criteria is a signal to inspect for separate outcomes, not to hide requirements
  in prose or merge unrelated criteria.
- Record the actual production/test footprint. Include required wiring,
  migrations and documentation in the estimate. File counts alone never require
  a split; they are not a quota or permission to
  omit necessary tests, security checks, accessibility, or documentation.
- State how the result can be tested and inspected before dependent stories land.
  An internal service or component can unblock later implementation while formal
  review and release remain gated on the complete parent scope.

## Required sizing block in each implementation story

Write this compact block, grounded in inspected code:

- **Outcome:** one sentence describing the behavior this slice delivers.
- **Time estimate:** 1–3 hours by default, including verification; explain
  uncertainty. For a justified cohesive multi-window task, give the total estimate
  and bounded milestones rather than claiming the whole task fits one window.
- **Files:** expected production and focused test paths, with new paths marked.
- **Start context:** this story, relevant epic/DoD requirements, exact shared
  contract sections, and the few code/test paths needed to begin. Dependencies
  link to their contract or implementation artifact; implementers need not read
  every sibling story, full correction history, or unrelated epic to start.
- **Verification:** focused test commands and observable pass conditions, plus
  required repository checks. Mark unavailable infrastructure as a dependency.
- **Dependencies / exclusions:** prerequisites and the adjacent outcomes owned by
  other story IDs. Every excluded source requirement still needs an owner.

Expand code inspection when a discovered dependency or security invariant requires
it. A start-context list is a useful entry point, not a read-access restriction.

## Require meaningful work before splitting

Split only when inspected scope is too large or contains substantial independent
outcomes, and each proposed child has a useful independently verifiable result.
For every proposed split, record the concrete complexity/risk/context problem it
solves and the substantive work in each child. Separate verification or a layer
label alone does not justify another story.

A proposed child with less than roughly 30 minutes of substantive work normally
belongs as a checklist item in the related story. Reading instructions, writing
its checkpoint/implementation record, committing and waiting for agents do not
count toward that minimum. Do not pad estimates to pass it. Small standalone
user-requested fixes remain valid; this is a rule against manufacturing children.

README updates, status/queue reconciliation, evidence/index records, routine
wiring and normal tests belong to the implementation they support. Do not create
a child solely to write a README, record completion, rerun existing gates or
request review. Assign integration/index ownership to an existing substantial
child. A separate integration story requires real integration implementation or
a substantial new test harness. Documentation-only stories require an independent
substantive deliverable, such as a researched architecture contract or migration
runbook, rather than routine documentation of the sibling implementation.

Assess service/domain logic separately from HTTP/DTO/controller behavior, shared
frontend state separately from screens, infrastructure setup separately from
test-suite construction, and test-suite construction separately from integration
sign-off. Split those outcomes only when they meet the meaningful-work gate above. A backend
or frontend label, subtask checklist, or "one endpoint" label does not establish
small scope. Each implementation slice gets its own story file and stable ID.

Keep **one atomic security invariant in one implementation slice**. For example,
reset-token claim, outstanding-token retirement, refresh revocation, and password
update must remain one transaction, including rollback tests. Separate its HTTP
adapter/cookie contract, not individual writes into partially safe increments.

If the remaining atomic core exceeds the target, record the inspected footprint,
estimate, inseparable invariant, and why further splitting would weaken it. Remove
independent surrounding outcomes first. The reviewer verifies this sizing rationale;
an unexplained oversized core is not ready. Do not promise a fixed context-token
cost or weaken an invariant to meet an estimate.

A cohesive multi-window task includes a checkpoint sequence: each step names a
code/test outcome, its verification, and its resume inputs. It remains one story
and one implementation task; needing another context window alone is not a reason
to split or reject it. Substantial independent outcomes may belong in separate stories;
small supporting steps remain with their cohesive outcome.

## Existing stories and execution feedback

For an oversized **unimplemented** story, the planner preserves its ID as a
coordination record and creates smaller children using the existing naming scheme
(for example, B1/B2). Map every original AC/test/DoD obligation to a child; retain
shared contracts, dependency order, Jira identity and named integration ownership.
The coordination record is not another implementation ticket. Do not duplicate
existing Jira keys or sync without authorization.

For **in-progress or completed** work, preserve its history and scope. The refiner
does not rewrite it. Any remaining-work split is an explicit planner task grounded
in what has actually landed, not an automatic renaming of completed work.

If refinement exposes multiple outcomes, return a concrete split proposal to the
planner instead of expanding the ticket. The refiner may only edit its given
story; it cannot create siblings or rewrite the parent/traceability tables.

Use a checkpoint for normal context turnover; continue the same task on resume.
If implementation reveals scope growth or repeated rediscovery despite
checkpoints, stop at a safe boundary and report completed behavior, remaining outcomes, relevant files,
and verification. Keep atomic work safe; do not silently drop ACs or create new
stories outside the role's authority. Feed actual effort/context observations
back into the next sizing assessment. High context use is evidence to reassess
task boundaries and resume inputs, not a reason to discard completed work.
