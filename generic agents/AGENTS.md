# Repository delivery agents

Read [project context](.agents/project-context.md) for the repository's stack,
paths, scope, verification commands and policies. These are data for the workflow,
not permission to skip existing requirements.

Use the requested custom role in `.codex/agents/` when supported; `.vibe/agents/`
provides the same roles for Vibe, and `.opencode/agents/` for OpenCode.
Otherwise read its definition and shared skill.
Role availability does not require delegation.

Resolve ownership once, then act. A role identifies the permitted writes; it
does not require asking another agent to perform work already within that scope.
Routine status/evidence updates and scoped commits are part of finishing the
task. Use the [responsibility routing rule](.agents/context-efficiency.md#resolve-responsibility-once)
for a genuine boundary: perform permitted work, route one concrete outstanding
action when delegation is authorized, and continue independent work. Do not
repeatedly debate ownership, bounce the same action between roles, or ask the
user to arbitrate routine bookkeeping.

| Role | Shared skill | Write boundary |
| --- | --- | --- |
| autopilot | `.agents/skills/delivery-autopilot/SKILL.md` | Scoped coordination/status and run record; refiner/reviewer output commits; permitted verbatim review fallback |
| implementer | `.agents/skills/delivery-implementer/SKILL.md` | Code, tests, implementation/checkpoint artifacts; scoped execution-status updates |
| planner | `.agents/skills/delivery-planner/SKILL.md` | Only `docs/` |
| jira-sync | `.agents/skills/delivery-jira-sync/SKILL.md` | Sync ledger; scoped story specs/navigation and epic tracker metadata |
| refiner | `.agents/skills/delivery-refiner/SKILL.md` | Only the given unimplemented story |
| reviewer | `.agents/skills/delivery-reviewer/SKILL.md` | Report; final user walkthrough; passing verdict's scoped docs sync |
| dod-auditor | `.agents/skills/delivery-reviewer/SKILL.md` (static audit) | None |

An explicit autopilot invocation authorizes sequential delegation through the
enclosing parent review unit, including remaining children, integration, fixes
and independent review, subject to explicit user limits. Every specialist task
must start in a new isolated context (Codex: `fork_turns = "none"`); never reuse
finished agents across children or review rounds. If isolated dispatch is
unavailable, persist a concrete fresh-session handoff rather than run roles
inline. Ordinary single-child requests retain their scope. See the autopilot
skill for evidence-driven gate selection and resumable coordination.

One active implementer owns all layers sequentially in a shared workspace.
Legacy backend/frontend agent requests route to implementer; load their technical
skills only for affected layers. Coordinate a checkpoint handoff before another
implementation session takes over. Preserve other contributors' work.

For story work, read [delivery state](.agents/delivery-state.md) and the parent
README's execution queue first. Load the requested role's skill, relevant epic,
active story, shared DoD in `docs/epics/README.md`, and relevant contracts.
Use section-level reads; expand when dependencies or evidence require it.

Canonical workflow rules live in:

- [Story sizing](.agents/story-sizing.md): planning, refinement and scope assessment.
- [Checkpoint execution](.agents/checkpoint-execution.md): implementation/resume.
- [Review cadence](.agents/review-cadence.md): review unit and final gate.
- [Context and efficiency](.agents/context-efficiency.md): reads, handoffs and measurement.
- [Artifact conventions](docs/artifacts/README.md): layout and records.

Follow role write limits with every tool, including shell. Reviewer persistence
and restricted-runtime fallback are defined in its skill; an auditor stays
fully read-only. Never treat implementation completion as independent approval.
Before marking a review unit `Reviewed`/complete, the reviewer must also prepare
and verify its separate final `walkthrough.md`: code explanation, correctness
evidence after correction rounds, and manual test steps/expected results for
every applicable workflow, with honest execution labels. Both the final report
and walkthrough must be saved first. This applies to ordinary reviews as well
as autopilot; plan-only reviews and static audits do not create this document.

Before returning a task, follow the [closeout contract](.agents/context-efficiency.md#task-closeout-contract):
persist the role-authorized status/evidence, commit scoped writes when the role
may mutate Git, and return status, artifact paths, commit hashes, verification
and remaining work. A reviewer or auditor returns the explicit Git handoff
instead of committing. The coordinator owns deferred status edits and commits;
do not leave their ownership implicit or make the reviewer reconstruct progress.

Never read, display, search inside, or write credential or secret files, including
`.env` and `.env.*`. Flag exposed secrets by location without reproducing values.
Existing authorization boundaries for trackers, shared databases, deployment and
destructive actions remain in force.

## Ownership scoping

For protected data, every read/write must enforce the authenticated principal's
ownership or tenant boundary at the data-access layer, including bulk operations.
Use the repository's existing authentication and ownership helpers; do not invent
framework-specific decorators or paths. Verify affected-row counts and atomic
operations where relevant. Missing and inaccessible private records must not
reveal another principal's resources through different messages or statuses;
use the project's documented uniform not-found response. Deliberately public or
shared access requires an explicit authorization policy. See
[project context](.agents/project-context.md) for the actual mechanism.

## Jira synchronization

Use `jira-sync` for bidirectional story reconciliation and the durable
[ledger](docs/jira-sync/README.md). Preview is the default; explicit sync modes
retain existing tracker authorization boundaries. The ledger tracks sync identity
and baselines, not implementation state. Explicit prune may remove verified
completed specifications after the final review gate; keep parent queues,
traceability, contracts and artifacts. Preserve tombstones to prevent re-import.
