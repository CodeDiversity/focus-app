# <review-unit-id> plan review

Date / pass: <actual date and review round>
Reviewed state: <commit or explicit working-tree paths>
Scope / source requirements: <source epic, parent, every child, README/contracts>
Limitations: <missing inputs/capabilities; actual inspection coverage>

## Findings

| Stable ID | Severity | Requirement / original gap / location | Consequence | Owner / correction / closure condition |
| --- | --- | --- | --- | --- |
| PR-001 | <Blocker / Should-fix / Polish> | <specific source and path/line> | <concrete counterexample> | <verifiable closure condition> |

<Explicitly None if no findings. Retain persistent IDs across passes; never reuse
an old ID for a different finding.>

## Prior findings

<Each prior ID: resolved/still open/unverified, correction's actual Git state and
fresh independent evidence. Planner correction claims alone cannot close it.>

## Planning coverage

<Original AC/TR/DoD mapping, meaningful sizing evidence, shared contracts,
integration ownership, inspected code, dependency sequencing, material decisions,
applicable risks/counterexamples and source-policy provenance. Planned tests
are obligations, not executed results.>

## Verdict and handoff

Verdict: <Plan Ready / Changes Required / Needs Decision>
Implementation dependencies: <separate blockers or None>
Planner actions / user decisions: <stable findings and concrete next actions>
Persistence / passing sync: <actual saved report and permitted sync, or exact
deferred writes for coordinator fallback. Report precedes sync.>
Git handoff: coordinator commits scoped outputs; reviewer never mutates Git.

Plan-only reviews do not create a final walkthrough or approve implementation.
