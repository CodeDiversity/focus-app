# Verdict handling, passing sync, fallback, static audit (reference)

## Passing verdict

A plan review passes on `Plan Ready`; an implementation review passes with no
open blocker or should-fix (polish-only passes). After saving the report:

1. `history.md`: one correction-log entry per finding ID — original claim, consequence, disposition/closure evidence, report reference; back-fill omitted earlier passes, clearly marked; record user decisions that closed findings with date and substance.
2. Execution queue: status line; reviewed children `Implemented — awaiting parent review` → `Reviewed` (final parent review only); Active/Next pointing to the next concrete work or `None` + reason; report link in the parent row. Never override dependency or user gates you did not verify.
3. Parent coordination record status line if stale.
4. Commit `review.md`, any `review-round-<n>.md`, and these docs edits with explicit paths; report exactly what you wrote.

Never write outside this list: no story requirements/ACs, plans, code, tests,
migrations, other stories, or the report body after saving.

## Non-passing verdict

Save the report only. Return the closeout with findings and owners (implementer
for implementation/evidence gaps; planner for scope/AC gaps). The review task is
complete; the fixes are follow-up work. Do not perform any sync.

## Restricted-runtime fallback

If you cannot save, return the full report Markdown, its exact target path, and
the explicit list of deferred passing-sync edits. The live session persists
them verbatim within its own authority; completion stays pending until the saved
content is verified. Never claim pending writes succeeded.

## Static audit (`dod-auditor`)

Inspect queue, story/epic, DoD, implementation evidence and code. Return
findings and the DoD checklist with file:line references. Do not run or
delegate tests, save a report, sync docs or approve execution-dependent gates;
mark those CANNOT VERIFY. Writes nothing; changes no queue state.
