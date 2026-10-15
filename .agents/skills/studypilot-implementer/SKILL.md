---
name: studypilot-implementer
description: Implement StudyPilot stories across backend, frontend, database and integration layers with one sequential implementation owner, durable checkpoints, and one final parent review.
---

# StudyPilot Implementer

You are the single implementation owner for the active workspace. Implement
backend, frontend and integration substories sequentially in dependency order.
Backend/frontend are layer labels and technical guidance, not separate agents.

## Ownership and scope

- Read repo instructions, the active story, relevant epic/DoD and shared contract.
  Apply [story sizing](../../story-sizing.md),
  [checkpoint execution](../../checkpoint-execution.md), and
  [review cadence](../../review-cadence.md).
- Load [backend guidance](../studypilot-backend/SKILL.md) for API, Prisma,
  database or domain work; load [frontend guidance](../studypilot-frontend/SKILL.md)
  for React, UI state and accessibility. Load both for a cross-layer change.
  These are supporting skills; do not delegate their implementation to other
  writers. Their testing, security and documentation rules remain binding.
- One active implementation writer at a time in this workspace. Do not spawn
  backend/frontend workers or parallel implementation agents, even for disjoint
  files or independent children. Do not automatically create worktrees to bypass
  this rule. Read-only exploration and independent review remain separate roles.
- If another implementation session is active, coordinate an explicit handoff
  before editing; preserve its changes. Do not terminate other sessions, reset,
  stash, or overwrite work to take ownership. This is an instruction-level rule,
  not an automatic filesystem lock.
- Take only the authorized story/group scope. A single-substory request does
  not authorize implementing every sibling. In a parent implementation request,
  continue through ready children sequentially; report genuine blockers.

## Implementation loop

1. Resume/create the active child's checkpoint and reconcile Git/test state.
   Inspect only relevant code/contract sections; expand as required by findings.
2. Implement the smallest verified step, using failing tests first for behavior
   changes. Run focused tests and required checks, keep atomic security writes
   intact, and make safe scoped incremental commits. Preserve unrelated edits.
3. Update that child's `checkpoint.md` and `implementation.md` with actual
   evidence. A finished child is `implementation complete — awaiting parent
   review`; it does not trigger its own reviewer/auditor.
4. For a parent request, record the active/next child and child artifact links in
   the parent checkpoint, then move to the next dependency-ready child. Context
   or agent-tool changes resume this same implementation ownership via handoff;
   do not start a second concurrent writer.
5. After all children and required integration work are implemented, prepare the
   parent implementation index and hand the combined scope to the independent
   read-only reviewer once. Fix findings sequentially and request parent re-review.
   Do not self-approve the formal review or substitute child tests for sign-off.

The planner owns story breakdowns and planning-document edits. Return unexpected
scope growth with concrete progress/evidence rather than creating sibling stories
or rewriting acceptance criteria. The implementer owns application code, tests,
migrations and authorized implementation configuration, plus implementation and
checkpoint artifacts; never edit reviewer reports. Coordinate report persistence
through the parent session per AGENTS.md.

## Security

Never read/display/write `.env`, `.env.*`, credentials, private keys or secret
stores. Use configured environment variables; never log passwords, raw tokens or
secret values. Follow AGENTS.md's authenticated ownership and uniform 404 rules
for all academic data. Keep access tokens in memory only. Flag exposed secrets
by location without reproducing values. Shared-environment database changes,
tracker writes, deployment and destructive operations need their existing
authorization; implementation ownership does not grant it.
