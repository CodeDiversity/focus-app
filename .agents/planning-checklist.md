# Shared planning validation

Used by planner and plan reviewer. Apply [story sizing](story-sizing.md) for
file/context boundaries and atomic invariants. This checklist grants no writes.

## Feature-aware quality checks

Apply the **baseline checks to every epic**. Activate specialized checks **only when the proposed behavior warrants them**. Do not let an authentication example dictate an unrelated feature's design.

### Baseline, for every epic

- Original acceptance criteria, test requirements, shared DoD, and milestone are mapped to the actual child that owns each obligation.
- Story granularity, layer separation, integration ownership, and dependency order are consistent.
- Proposed implementation references real inspected code or is explicitly marked as new/proposed. An uninspected path is **unverified**, never claimed as fact.
- Define input validation, failure/empty/loading states, error recovery, authorization and privacy boundaries **where relevant**.
- Define keyboard behavior, focus/status feedback, and responsive usability for UI changes; test accessibility requirements that apply.
- Confirm that story steps, ACs, contracts, and tests describe the **same behavior**.
- Consider backwards compatibility, observability, data migration, performance, and rollback **when the change affects them**.
- No out-of-scope functionality, duplicate tracker issues, invented test outcomes, or unsupported security promises.

### Activate the relevant specialized checklists

| Feature / risk | Additional plan checks |
| --- | --- |
| Authentication, sessions, recovery | Token lifecycle, storage and hashing boundaries, session state, expiration, reuse, revocation, account enumeration, abuse limits, URL/error/log leakage, signed-in and signed-out flows. |
| Data CRUD and ownership | Entity relationships, field constraints, ownership checks on every read/write, update/delete semantics, pagination where needed, invalid and stale IDs, migrations. |
| Scheduling and time calculations | Time zones, daylight-saving transitions, recurrence, overlap handling, boundary dates, deterministic inputs/outputs, recalculation and persistence rules. |
| Concurrent or single-use operations | Atomic claim/conditional predicates, transaction boundaries, isolation/locking, losing-request outcome, rollback, retries, and database-backed race tests. |
| Frontend flows | Routing/guards, loading/empty/error/success states, validation, duplicate submission, browser refresh, keyboard/focus announcements, narrow-screen behavior. |
| Cross-layer API changes | Request/response shapes, field names, representation, normalization, validation, statuses, error contracts, serialization, compatibility, and end-to-end verification. |
| Notifications / external delivery | Triggers, consent, deduplication, retries, failure handling, rate limits, delivery observability and provider boundaries, if the capability is approved in scope. |
| Operational/data changes | Migration order, rollback/recovery strategy, feature flags if present, metrics, permissions, and deployment dependencies. |

For every claimed **security or consistency invariant**, give a concrete counterexample: competing requests or a malicious/invalid input, the mechanism that prevents the failure, the expected losing request or rollback, and the owning child test. Do not call a transaction, a mocked test, or future implementation a proven guarantee. If the mechanism is missing, narrow the claim or flag the decision/blocker.

For example, if the epic involves single-use credentials, check concurrent use of the same credential **and** distinct outstanding credentials for one account, plus concurrent issuance/revocation where relevant. If it involves access tokens, distinguish refresh revocation from access-token rejection based on actual guard behavior. These are **conditional examples**, not universal StudyPilot requirements.

## Quality gate and readiness

Validate the parent summary (if any), every child, the breakdown README, recorded decisions, and source epic **together** after the final dependent edit.

The README must contain a table with `Pass`, `Blocked`, or `Not applicable`, a concrete file/section reference, and a reason for each non-applicable row:

1. Child separation and sizing: each child's required sizing block supports a 30–90-minute outcome, or a justified cohesive multi-window task with bounded checkpoints. Verify indivisible-core rationale where relevant. Identify concrete splits for independently verifiable work; nominal session labels do not pass.
2. Original acceptance-criterion and test coverage.
3. All applicable Definition of Done obligations, including item 10. Use evidence appropriate to each condition: business rules
   and explicit automated-test requirements need automated tests; documentation
   and integrated review use inspected docs and recorded integrated verification.
   Do not require artificial automated tests for every DoD condition.
4. Contract consistency and integration test ownership.
5. Relevant code paths inspected, with unverified paths disclosed.
6. Feature-specific risks/counterexamples and their owning tests, if applicable.
7. Dependency mapping and sequencing.
8. Material decisions resolved or explicitly blocked.
9. Correction-log history, fixes, and verification completeness.
10. Jira identity/sync consistency, if sync is authorized.

Use distinct status judgments:

- **Draft:** planning or review remains incomplete.
- **Needs Decision:** a material unanswered decision blocks affected stories.
- **Plan Ready:** all applicable *planning* gate rows pass, with documented test obligations and no unresolved material planning findings.
- **Implementation Blocked:** an otherwise sound plan has incomplete upstream implementation dependencies or another execution blocker; this may coexist with `Plan Ready`.
- **Implementation Verified:** only when actual implementation evidence and required passing tests are available; this planner does not perform implementation or infer this status from documentation.

Do not present a planned test as a passing test. Incomplete upstream implementation blocks execution readiness, not the ability to prepare and validate a plan.

