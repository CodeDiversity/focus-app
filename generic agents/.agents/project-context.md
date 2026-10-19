# Project context

This file is the customization point for the destination repository. Record
verified facts and accepted decisions here; link detailed architecture and
contracts instead of copying them. The starter has no selected product, stack,
tracker or release plan. Unknown is not approved or verified.

## Product and scope

- Project name/purpose: not configured; read existing product documentation.
- Source requirements and roadmap: not configured; identify before planning.
- Accepted release scope/exclusions: inherit recorded product decisions. If none
  exist, resolve material scope questions; no feature category is banned by default.
- Milestones: optional; use existing names, or `Not applicable`.
- Stable story IDs: preserve the repository's scheme; examples such as
  `FEATURE-1` and `FEATURE-1A` in this bundle are illustrative, never live IDs.

## Architecture and paths

- Languages/frameworks and dependency manager: discover from non-secret manifests.
- Production modules, tests, public interfaces and data models: inspect relevant
  paths and record evidence before claiming they exist.
- Contracts/architecture decisions: link the repository's existing documents.
- UI, backend, database and integrations: load only applicable layer guidance.
  A CLI/library need not acquire a web UI, service or database to use this workflow.
- Default workflow paths: `docs/epics/`, `docs/stories/`, and colocated
  `artifacts/` under each delivery home. Queues resolve actual evidence paths.
  If adopting other planning paths, update AGENTS.md, skills, wrappers and linked
  docs together; runtime path allowlists must match those changes.

## Verification

Record commands with working directories, prerequisites and pass conditions for
the actual repository. No package manager, test framework or command is assumed.

| Gate | Command / cwd | Prerequisites / expected result |
| --- | --- | --- |
| Focused tests | Discover relevant test runner and cases | No invented results |
| Required repository checks | Read CI and contributor documentation | Record unavailable dependencies |
| Integration | Use the real changed components together | Record environment and tested Git state |
| Manual / accessibility | Applicable workflows only | Required evidence differs from optional repeat instructions |

For a CLI, verification may cover argument validation, output, exit status,
filesystem behavior and piped input. For a library, verify public API consumers.
For a service, verify protocol behavior and persistence where applicable. For a
UI, verify interaction, accessibility and relevant viewport/input modes. These
are examples, not extra mandatory features. Do not run unverified mutation
commands against shared systems.

## Security and data policy

- Authentication/authorization: use verified existing mechanisms. Protected
  data reads/writes enforce principal/tenant ownership, including bulk paths.
  Public/shared access must have an explicit policy.
- Non-enumeration: use a uniform not-found response for missing and inaccessible
  private records. Record the framework-specific implementation here; never
  invent helper paths, guards or decorators.
- Sessions/tokens: follow the recorded storage and transport model. Never expose
  tokens in client bundles, URLs or logs. A server-rendered session model and a
  client access-token model need different implementation details; do not force
  one on the other. Document expiry, revocation, browser protections and storage
  boundaries when authentication work touches them.
- Accessibility: for interactive web UI, target WCAG 2.2 AA unless the project
  has a documented applicable standard. Apply the relevant platform standard to
  other UIs. Record applicability and required interaction evidence.
- Secrets: never read/search/write credential files, `.env` or `.env.*`; document
  variable names and configuration mechanisms only. Flag exposure by location.
- Shared DB, external tracker, deployment, push/merge and destructive operations:
  retain actual session permissions. Selecting a role grants none of these.

## Optional Jira configuration

Jira is disabled until a scoped request and verified connector configuration
establish its use. Local workflows do not require Jira; use `Not configured` in
tracker fields. Do not copy another repository's issue identities or approvals.

- Site/project/bounded JQL: unconfigured; verify before writes.
- Stable identity marker: default `Story-ID: <id>`; retain an existing verified
  marker if adopting a repository already synchronized under another convention.
- Managed labels, field ownership, issue hierarchy, versions and status IDs:
  discover and save in the ledger; do not assume values.
- Prune preservation policy/authorization: none. Explicitly choose full remote
  specification or exact recoverable Git history before any prune.
- Synchronization state: [ledger format](../docs/jira-sync/README.md); identity and
  baselines only, never delivery readiness or independent review evidence.

## Adoption ownership

The person or agent explicitly assigned to install this bundle may merge these
instructions and configuration into the destination repo. Restricted delivery
roles keep their own write limits: a planner/refiner cannot alter tool configs
or this file merely because they discover a configuration gap. Return one
concrete installation/configuration handoff when needed.
