# Context, handoffs and efficiency

## Read only what the current role needs

Start with the parent README's Execution queue, then the active story, relevant
epic/DoD requirements, checkpoint and named contract/code sections. Locate headings
with search and read bounded sections. Implementation resumes do not require full
correction history, every sibling or past transcripts. Expand when dependencies,
security invariants or conflicting evidence require it. Whole-parent reviews still
cover every child, original AC/test requirement and applicable DoD obligation.
Load role-specific references on demand; reuse already-read unchanged instructions
within the session rather than opening them again at each milestone.

## One authoritative record per fact

- README queue: execution state, dependencies, active/next work and artifact paths.
- Child checkpoint: unfinished work, resume inputs, decisions needed to avoid rework.
- Child implementation record: completed behavior, verification and known gaps.
- Parent implementation index: child/evidence links and complete combined Git scope.
- Reviewer report: independent findings, closure evidence and verdict.

Other records link to these facts rather than repeating narratives. Historical
records stay intact; do not bulk rewrite finished stories to adopt this convention.
Required child status pointers and final review status sync remain scoped updates.

## Bounded handoff

At a deliberate handoff or fresh-context start, pass the following compact facts
with paths rather than full conversation history. A checkpoint can serve as the
handoff; do not create a second artifact merely to repeat it.

- Role, authorized scope and exact queue/story/checkpoint or review-index paths.
- Workspace/branch, base and HEAD (or explicit dirty paths); other work to preserve.
- Relevant paths/symbols/contract sections and settled decision links.
- Verification command, working directory, exit/result and tested Git state.
- Blockers, exact next action and required resume inputs.

The receiver reconciles Git state and stale evidence before continuing. A reviewer
still verifies claims independently. Transfer the single implementation writer
explicitly; a handoff does not authorize simultaneous writers or additional scope.

## Measure before claiming savings

For a deliberate workflow comparison, record a compact row per comparable task in
`<delivery-home>/artifacts/efficiency.md`: task/type/size, model and reasoning setting
when exposed, input/output tokens, cached-input tokens when exposed, tool calls,
repeated reads, review passes and completion outcome. Use available runtime usage
metadata; otherwise mark fields unavailable. Do not read raw session logs or
credentials merely to fill a metric. Normal story execution does not require a new
measurement artifact or tool call at every milestone.

Compare similar scopes and verification requirements. Report measured counts and
quality/rework outcomes together; distinguish prompt word reduction from actual
runtime tokens, latency or monetary savings. Do not weaken tests, security or
independent review to improve the numbers.
