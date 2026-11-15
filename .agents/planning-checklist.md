# Planning checklist

Used by the planner (quality gate) and the reviewer (plan review). Grants no writes.

## Baseline, every breakdown

- Every original epic AC (`AC-E<nn>-<nn>`) and test requirement (`TR-E<nn>-<nn>`) is owned by a named child; shared DoD items mapped, including 10 and 11.
- Every story has the at-a-glance block, a Decisions table with Recommended filled and ▲ rows marked, qualified AC citations, and a sizing block.
- Proposed implementation cites inspected code or is marked proposed; uninspected paths are unverified.
- Steps, ACs, contracts and tests describe the same behavior; integration ownership and dependency order are consistent; no manufactured children.
- Validation, failure/empty/loading states, ownership/privacy, keyboard, focus and responsive behavior defined where relevant.
- For every claimed security or consistency invariant: a concrete counterexample, the preventing mechanism, the losing request's outcome, and the owning test. A mocked test or future work is not a guarantee.

Activate specialized checks only when the feature warrants them: auth/session
lifecycle and enumeration; data CRUD ownership on every read/write; time zones,
DST, recurrence and determinism; atomic/concurrent operations with
database-backed race tests; frontend routing/guards/refresh/duplicate submit;
cross-layer contracts and serialization; migrations/rollback/flags.

## Quality gate (README or history.md table)

| # | Check | Pass / Blocked / N/A + reference |
| --- | --- | --- |
| 1 | Child separation and sizing | |
| 2 | Original AC/TR coverage | |
| 3 | DoD obligations | |
| 4 | Contract consistency and integration ownership | |
| 5 | Code paths inspected; unverified disclosed | |
| 6 | Feature risks/counterexamples and owning tests | |
| 7 | Dependency mapping and sequence | |
| 8 | Material (▲) decisions ruled or explicitly blocked | |
| 9 | Correction log complete | |
| 10 | Identifier consistency and at-a-glance blocks (`queue-lint` clean) | |

Statuses: **Draft**, **Needs Decision** (a ▲ row blocks affected stories),
**Plan Ready**, **Implementation Blocked** (sound plan, unmet upstream
implementation; may coexist with Plan Ready). Never present a planned test as
a passing one.

## When a plan review is required

Dispatch a reviewer `plan_review` only when the breakdown (or a later planning
change) includes any of: a new migration or persisted-data contract; a new
security/consistency invariant; more than 8 children; or the user asks.
Otherwise the planner's quality-gate table is the planning gate and the queue
proceeds to refinement/implementation. Refining one child does not re-trigger a
plan review unless ACs, contracts, scope or dependencies changed.
