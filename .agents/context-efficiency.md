# Measurement and evidence reuse

## efficiency.md — one row per dispatch

Each delivery home keeps `artifacts/efficiency.md`. Whoever dispatched or ran
the task (the live session, or the user) appends one row at closeout:

```markdown
| date | child | role | model | tokens in / out | tool calls | dispatches | outcome |
|---|---|---|---|---|---|---|---|
| 2026-11-16 | EP13L | implementer | default | 410k / 32k | 61 | 1 | implemented, 0 open findings |
```

Use the runtime's usage metadata when exposed; write `n/a` otherwise. Do not
read session logs or credentials to fill a cell. Sizing blocks record
**Actual at closeout** from this row. Revisit the protocol against the data
after every two children; do not add process without a row that motivates it.

## Evidence reuse

Reuse recorded verification when its tested code is unchanged; rerun only for
changed relevant code, a failed gate, or a named missing fact. After a context
reset, reconcile HEAD and dirty paths once, then continue. Reopen a verified
fact only for a concrete unresolved question.
