# Review cadence

One formal implementation review per **parent review unit** (a split parent and
all its children, or a standalone story), after every child and integration
task is `Implemented — awaiting parent review`. No automatic per-child reviews
or audits; an explicit interim review may be requested and does not replace the
final one. A finished child can unblock a dependent child without a reviewer.

Before dispatch the implementer writes the parent index
`<artifact-root>/<parent-id>/implementation.md`: complete child inventory with
links, combined Git scope (baseline → final commit, **per-child diff ranges**),
the **test commands** run per child, AC/TR/DoD ownership, known gaps. The
reviewer starts from that index and verifies independently; it does not
rediscover scope.

The reviewer checks the combined implementation child by child in queue order,
writing a running report, and saves `<artifact-root>/<parent-id>/review.md`
whose final section is **How to verify by hand** (manual steps and expected
results per applicable workflow, each labelled `Executed` with evidence, `Not
executed — user instructions`, or `Not applicable` with reason). There is no
separate walkthrough document. On re-review the previous pass moves verbatim to
`review-round-<n>.md` and the new pass covers only changed children plus
cross-child behavior.

Only the passing final report marks rows `Reviewed`. Findings are fixed in the
owning child and re-reviewed together at the parent.

Plan review is **conditional**: see
[planning-checklist](planning-checklist.md#when-a-plan-review-is-required).
