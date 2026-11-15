# Plan review (reference — load only in `plan_review` mode)

Read the epic, DoD, breakdown README and `history.md`, every child, and any
previous `plan-review.md`. Inspect relevant code independently; treat planner
claims and correction statuses as unverified. Apply the
[planning checklist](../../planning-checklist.md) baseline and any activated
specialized checks.

Verify: original AC/TR coverage; justified splits and substantive children
([story-sizing](../../story-sizing.md)); one sequential implementer; integration
ownership; dependency status; shared contracts; applicable DoD; the
at-a-glance block and Decisions table on every story with ▲ rows marked;
qualified identifiers. Challenge every security/consistency claim with
concrete interleavings and failure paths. Distinguish a sound planned mechanism
from a proven one; do not fail an unimplemented story for tests that do not
exist yet.

Save `<delivery-home>/plan-review.md`: date, pass, reviewed commit or `working
tree`, scope, findings table (`R-<UNIT>-<nn>`: severity, original claim/gap,
file/section/line, consequence or counterexample, suggested correction, closure
condition), coverage summary, verdict `Plan Ready` / `Changes Required` /
`Needs Decision` (implementation blockers reported separately), and a compact
handoff: findings for the planner, ▲ decisions for the user. On re-review keep
IDs and list prior findings' status with fresh evidence. `Plan Ready` → perform
the passing sync; otherwise save the report only.
