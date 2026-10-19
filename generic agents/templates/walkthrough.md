# <review-unit-id> final walkthrough

Reviewer: <independent reviewer identity/round>
Reviewed state: <final Git scope and tested state>
Final report / index / stories: <exact links covering the complete review unit>

Create this document only after mandatory findings and required verification
gates pass. This scaffold is not evidence. Verify and save it alongside the final
report before completion sync; refresh it when the reviewed scope changes.

## What changed

<Explain finished user/system workflows and every child/integration outcome.>

## How the code works

<Request/interface/data flow, key changed files/symbols, choices, validation,
ownership and error handling. Docs/config work explains its actual workflow.>

## Why the evidence supports correctness

<Connect original AC/DoD obligations to invariants, actual automated/integrated/
manual evidence and closure of mandatory findings across rounds. Cite tested
state and provenance; distinguish inspection from execution and retain limits.>

## Manual test workflows

### <One applicable workflow; repeat for each>

- Execution status: <Executed with date/environment/evidence, or Not executed —
  user test instructions, or Not applicable with a concrete reason>
- Prerequisites: <safe local/disposable data, actual setup and permissions needed;
  never secrets or implied shared-system mutation authorization>

1. <Concrete action>
   Expected result: <exact observable behavior>
2. <Relevant negative/edge action, including authorization/accessibility as applicable>
   Expected result: <exact observable behavior>

<Unexecuted optional user repeats are instructions, not test results. Every
AC/DoD-required manual check already needs actual evidence for a passing review.
For no applicable manual workflow, state Not applicable and explain why.>

## Verification of this document

<Reviewer confirms final scope, all applicable workflow coverage, working links,
honest execution labels and final report linkage. Coordinator verifies saved
verbatim outputs when fallback persistence was needed; reviewer never commits.>
