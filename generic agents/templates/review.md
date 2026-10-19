# <review-unit-id> implementation review

Date / pass: <actual date and review round>
Reviewed scope: <all children and original requirements>
Git scope: <baseline/final commits, included commits, explicit dirty paths>
Index / queue: <exact paths>
Limitations: <actual capability/evidence gaps>

## Findings

| Stable ID | Severity / rationale | Requirement / observed gap / location | Consequence | Owner / closure condition |
| --- | --- | --- | --- | --- |
| RV-001 | <Blocker / Should-fix / Polish> | <source and path/line> | <concrete failure> | <actual required correction/evidence> |

<Explicitly None if no findings. Every unmet mandatory obligation is at least
Should-fix; Polish is optional. Preserve finding IDs across re-review.>

## Correction-round closure

<Every prior ID: independently resolved/still open/unverified, actual corrected
Git state and closure evidence. Planned sync never closes implementation gaps.>

## Acceptance criteria

| Child / original AC | Satisfied / partial / unverified | File/line and actual evidence |
| --- | --- | --- |
| <every applicable criterion> | <disposition> | <specific evidence> |

## Definition of Done

| Condition | PASS / FAIL / CANNOT VERIFY / N/A with reason | Evidence / provenance |
| --- | --- | --- |
| <every shared and story-specific condition> | <actual disposition> | <code/line/test/integration/manual/doc evidence> |

## Verification

<Command/action, cwd/environment, tested commit/dirty paths, exit/result and who
executed it. Distinguish reviewer execution from supplied evidence. Record
unavailable checks without inventing results; static audits cannot execute them.>

## Final document gate

Walkthrough: <resolved path only on final passing review; pending otherwise>
Report and walkthrough saved/verified against final scope: <actual outcome>
<Required unverified/manual gates prevent a pass; optional repeat instructions
must be labeled unexecuted. Non-passing rounds save the report only.>

## Verdict and closeout

Verdict: <Meets AC and DoD / Does not meet, with failed/unverified conditions>
Records: <actual saved report/final walkthrough or exact verbatim fallback paths>
Passing docs sync: <actual permitted edits; deferred on non-pass or unsaved outputs>
Git handoff: <coordinator owns exact scoped commit/persistence actions>
Remaining: <findings, exact next owner/actions or None in reviewed scope>
