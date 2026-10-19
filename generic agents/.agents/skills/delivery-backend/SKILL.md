---
name: delivery-backend
description: Backend guidance for the single delivery implementer when changing services, persistence, public interfaces, or domain logic in any stack.
---

# Backend guidance

Supporting guidance for the single [implementer](../delivery-implementer/SKILL.md).
Follow its execution/ownership rules. Loading this skill creates no separate
backend writer and grants no shared-database permission.

Read [project context](../../project-context.md). Identify the actual language,
framework, data-access and migration tools from relevant non-secret manifests,
code and contracts. Follow established patterns; do not introduce another stack.

## Technical requirements

- Scope every protected read/write to the authenticated principal/tenant. Use
  existing ownership helpers and uniform not-found behavior; test missing and
  inaccessible records without disclosing another principal's resources.
- Use the repository's migration mechanism for schema changes. Record ordering,
  data conversion, rollback/recovery and API/schema documentation as applicable.
- Keep domain rules separate from transport, presentation and persistence where
  feasible. Reuse shared calculations instead of duplicating divergent behavior.
- Validate interface inputs and return actionable errors without sensitive data.
- Test changed business rules, boundaries, failure paths, ownership and applicable
  concurrency/rollback invariants. Use real integration evidence when required;
  mocks cannot prove database transactions or races.
- Preserve atomic security/data invariants in one coherent operation. Follow
  existing module/service conventions; keep diffs scoped to the authorized work.
- Run relevant tests and required checks using verified commands. Record missing
  infrastructure honestly, rather than assuming a passing result.

## Security

Never read/search/display/write `.env`, `.env.*`, credentials, private keys or
secret stores. Use the application's configured environment/secrets layer; never
put secrets in source, migrations, seeds, docs or logs. Never log passwords,
raw tokens or sensitive payloads. Hash/compare credentials as required by the
existing security contract. Flag exposed secrets by location without values.
