# Ticket Artifacts

Per-ticket work records, one folder per Jira issue. Story and epic **planning** documents live in `docs/stories/` and `docs/epics/`; this directory holds the **outputs** of working a ticket.

## Layout

```
docs/artifacts/<JIRA-KEY>/
├── checkpoint.md       # implementer's current progress and fresh-context resume state
├── implementation.md   # written by the implementer (backend/frontend agents)
└── review.md           # reviewer report saved by parent; overwritten each pass
```

## Conventions

- **checkpoint.md** — created before substantive implementation and refreshed after code/test milestones and before context handoffs. Follow [checkpoint-based execution](../../.agents/checkpoint-execution.md) for the template, Git reconciliation, verification, and resume prompt. One task can span fresh windows or different coding agents using the same saved repository state. Use the Jira key when assigned, otherwise the stable story ID, and reuse any existing artifact directory. Checkpoints are progress records, not final implementation or review evidence.
- **implementation.md** — the implementer's record of what was built: endpoints, schema changes, migrations, components, commands, verification evidence, and open items. Created or updated when a story finishes. If both the backend and frontend agents work a ticket, the second updates the first's file rather than duplicating it.
- **review.md** — the reviewer's report for the latest pass only: acceptance-criterion verdicts, DoD checklist, blockers / should-fix / polish, and a one-line verdict. Overwritten on re-review so it always holds the current pass; earlier passes live in git history. Include the review date and the state reviewed (commit hash, or "working tree" when none).
- The reviewer is read-only and returns its report for the coordinating parent to save as `review.md`; implementers own `checkpoint.md` and `implementation.md` (plus their code). Neither role edits the other's artifacts or the planning docs.
- Jira comments should reference these files by their path here.

## Plan reviews before implementation

Plan reviews live beside the planning documents as `<breakdown-directory>/plan-review.md`, not in the implementation artifact folder. For SP-105 this is `docs/stories/EP01/SP-105/plan-review.md`.

The read-only reviewer returns a Markdown report containing the date/state reviewed, stable finding IDs, severity, evidence, consequences, closure conditions, and readiness verdict. The parent saves the report verbatim. The planner reads it, addresses each finding, and records original findings and dispositions in the breakdown README correction log without editing the reviewer report. Proposed fixes await independent re-review. The parent replaces the report on each reviewer pass; earlier committed reports remain in Git history. A plan-ready verdict does not certify implementation or passing application tests.
