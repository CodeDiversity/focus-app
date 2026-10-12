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
