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

See each child's implementation record. IR-121-1, IR-121-2, IR-121-3
(should-fix: missing frontend automated tests) and IR-121-4 (DoD-10 browser
pass) were closed on 2026-10-26 (see `artifacts/SP-121B/implementation.md`).
IR-121-5 (polish) optional and not blocking. All mandatory gates now have
evidence.
