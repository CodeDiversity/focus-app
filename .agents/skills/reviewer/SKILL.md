---
name: reviewer
description: Review a StudyPilot plan before implementation (when required) or a completed parent review unit before sign-off; independent, read-only except for the report and the passing-verdict sync.
---

# Reviewer

Mandatory reads: `.agents/core.md`, this file, the queue, the parent index or
breakdown README, the DoD. On demand: [plan-review.md](plan-review.md) (plan
mode), [passing-sync.md](passing-sync.md) (verdict handling, fallback, static
audit), [review-cadence](../../review-cadence.md), [planning-checklist](../../planning-checklist.md).
Assignments: `plan_review`, `parent_review`, `dod-auditor` (static audit, writes
nothing). Fresh session per dispatch; one mode per dispatch.

Read-only for code, tests, migrations, stories, plans. Your own writes are:
the report at its mode's path; on a passing verdict the docs sync in
[passing-sync.md](passing-sync.md) and its scoped commit. Never run fix/format
commands, install dependencies, or mutate Git otherwise. Never read secrets; a
committed secret is a blocker finding cited by location only.

## Implementation review (`parent_review`)

Start from the implementer's parent index (inventory, per-child diff ranges,
test commands). Verify independently — the index is a map, not evidence. Then,
child by child in queue order, writing a running report:

- Each AC (`<STORY>-AC<n>`): satisfied / partially / unverified, with file:line.
- DoD items as PASS / FAIL / CANNOT VERIFY with evidence appropriate to each: executed tests for business rules and explicit test obligations; code inspection plus tests for validation, ownership, errors; interaction/browser evidence for UI states, keyboard, responsive; docs inspection for API/migration docs; recorded integrated verification for DoD-10; this report's final section for DoD-11.
- Ownership scoping on every academic-data query and endpoint; uniform 404.
- Run the tests that cover changed business rules when permitted; report actual output. If you cannot, CANNOT VERIFY — never assume.
- Cross-child behavior and the original parent ACs.
- Out-of-MVP features flagged.

Findings: `R-<UNIT>-<nn>`, stable across rounds, each with requirement/source,
observed gap, severity, owner, concrete closure condition. Group by shared
cause and owner; keep every affected child/path.

| Severity | Means |
| --- | --- |
| Blocker | Security exposure, data loss/corruption, critical broken flow. |
| Should-fix | Any unmet explicit AC, DoD item, required record or deliverable; inaccurate scope/completion claims. Documentation-only requirements included. |
| Polish | Optional; no unmet mandatory obligation. |

Green tests, small fix size, or a past polish classification never downgrade an
explicit requirement. You cannot grant waivers; a user waiver needs a recorded
source and exact scope. Required evidence you cannot verify stays CANNOT VERIFY
and blocks an unqualified pass.

**Report** at `<artifact-root>/<parent-id>/review.md`: date, pass number,
reviewed commit (or `working tree`), scope, prioritized findings table +
details, AC and DoD tables, verdict, and the final section:

### How to verify by hand

For each applicable workflow: safe prerequisites, numbered actions, exact
expected results, relevant negative/edge cases (validation, errors, ownership,
keyboard, responsive). Label each `Executed — <date, env, evidence>`, `Not
executed — user instructions`, or `Not applicable — <reason>`. Instructions
are not results; any AC/DoD-required manual gate needs real evidence before a
pass. Use disposable local data; no secrets, no shared-system mutations.

On re-review: move the previous `review.md` verbatim to `review-round-<n>.md`,
cover changed children plus cross-child behavior, keep finding IDs, list prior
findings resolved / still open / unverified with fresh evidence.

**Verdict** (one line): passes when no blocker or should-fix remains open;
otherwise list the failing conditions. Then follow [passing-sync.md](passing-sync.md).
Close a finding only against persisted, independently verified correction with
its Git state cited.

## Plan review (`plan_review`)

Only when [planning-checklist](../../planning-checklist.md#when-a-plan-review-is-required)
requires it or the user asks. Follow [plan-review.md](plan-review.md).

## Evidence discipline

Record command, cwd, tested commit/dirty state, exit code, concise result for
every gate; distinguish reviewer-executed from implementer-provided evidence.
Reuse recorded results for unchanged code; rerun only for changed code, a
failed gate or a named missing fact. Finish the report once every AC/DoD item
has an evidence-backed disposition; do not loop on a hypothetical verdict. End
with the closeout fields.
