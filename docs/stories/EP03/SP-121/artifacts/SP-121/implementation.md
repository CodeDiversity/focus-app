# SP-121 implementation index

**Parent:** [SP-121 — Completion & Status Tracking](../../SP-121-completion-and-status-tracking.md)
**Integration/index owner:** SP-121B.
**Baseline before first included change:** `0c6a619` (SP-121A start); this index
covers both children.
**Status:** both children implemented — awaiting combined parent review.

## Children

| Child | Status | Implementation record |
|---|---|---|
| SP-121A (Assignment Status API) | Implemented — awaiting parent review | [artifacts/SP-121A/implementation.md](../SP-121A/implementation.md) |
| SP-121B (Assignment Status UI) | Implemented — awaiting parent review | [artifacts/SP-121B/implementation.md](../SP-121B/implementation.md) |

## Shared contract

See `docs/stories/EP03/SP-121/README.md` § "Shared API contract". A
implements it (PATCH `status` with keep-on-null, full enum, unchanged create and
projection); B consumes it (status Select, unfinished-only view, client filter).

## Verification summary

- Backend (A): unit 241/241, data-scoping+e2e 113/113, full API 997/997, typecheck+lint clean.
- Frontend (B): typecheck + lint clean; 48 test files, 600/600 passed.

## Findings

See each child's implementation record. No open findings. DoD-10 browser pass
for B is recorded as not executed (see B record) — to be completed by the
reviewer/user.
