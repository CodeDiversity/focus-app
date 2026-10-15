# Ticket Artifacts

Per-ticket work records, one folder per Jira issue. Story and epic **planning** documents live in `docs/stories/` and `docs/epics/`; this directory holds the **outputs** of working a ticket.

## Layout

```
docs/artifacts/<JIRA-KEY>/
├── implementation.md   # written by the implementer (backend/frontend agents)
└── review.md           # written by the reviewer; overwritten each pass
```

## Conventions

- **implementation.md** — the implementer's record of what was built: endpoints, schema changes, migrations, components, commands, verification evidence, and open items. Created or updated when a story finishes. If both the backend and frontend agents work a ticket, the second updates the first's file rather than duplicating it.
- **review.md** — the reviewer's report for the latest pass only: acceptance-criterion verdicts, DoD checklist, blockers / should-fix / polish, and a one-line verdict. Overwritten on re-review so it always holds the current pass; earlier passes live in git history. Include the review date and the state reviewed (commit hash, or "working tree" when none).
- The reviewer may write **only** `review.md`; implementers may write **only** `implementation.md` (plus their code). Neither role edits the other's file or the planning docs.
- Jira comments should reference these files by their path here.

## Plan reviews before implementation

Plan reviews live beside the planning documents as `<breakdown-directory>/plan-review.md`, not in the implementation artifact folder. For SP-105 this is `docs/stories/EP01/SP-105/plan-review.md`.

The read-only reviewer returns a Markdown report containing the date/state reviewed, stable finding IDs, severity, evidence, consequences, closure conditions, and readiness verdict. The parent saves the report verbatim. The planner reads it, addresses each finding, and records original findings and dispositions in the breakdown README correction log without editing the reviewer report. Proposed fixes await independent re-review. The parent replaces the report on each reviewer pass; earlier committed reports remain in Git history. A plan-ready verdict does not certify implementation or passing application tests.
