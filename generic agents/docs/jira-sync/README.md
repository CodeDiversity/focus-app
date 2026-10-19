# Jira synchronization ledger

Use the [sync skill](../../.agents/skills/delivery-jira-sync/SKILL.md) for on-demand
reconciliation. The supplied ledger is deliberately uninitialized; it contains no
site, project, issue IDs, approvals or synchronization history. Verify those from
the destination repository and connector before any mutation. Jira is optional;
local planning, implementation and review work without it.

## Requests

- "Use jira-sync to preview stories in the configured project."
- "Use jira-sync to push the named parent and its children."
- "Use jira-sync to pull new and changed stories in the verified scope."
- "Use jira-sync to show local ledger status."
- "Use jira-sync to preview prune eligibility for the named parent."
- "Use jira-sync to prune eligible reviewed specifications for the named parent."

These are agent requests, not installed CLI commands. Preview/status are read-only;
push, pull and sync never imply prune or tracker status transitions. The ledger
tracks identity and synchronization; parent queues own delivery state.

## Completed-specification preservation

No deletion policy or historical exception is pre-approved. Before explicit prune,
record the repository's authorized policy in `prunePolicy`:

- `jira-full-spec`: verify the complete specification is preserved remotely.
- `git-history`: verify a committed blob exactly equals the clean local file;
  record full commit, path, SHA-256 and recovery command. A curated Jira summary
  may remain, but it is not a substitute for the recovered specification.

Both policies also require a verified terminal Jira state, passing independent
final review and saved/verified walkthrough, no required unfinished work, and a
durable tombstone before deletion. Keep queues, contracts, traceability and all
evidence. On reopening, restore a draft and reconcile changes; never restore
Reviewed automatically. See the skill for all concurrency and recovery gates.

## Ledger format (version 1)

[ledger.json](./ledger.json) is machine-readable and committed with reconciled
story changes when a commit is requested. Use atomic validated replacements and
one active sync writer. Keep stable IDs as keys; never use titles as identity.
Null means unknown/uninitialized, not verified empty or successful.

| Top-level field | Meaning |
| --- | --- |
| `schemaVersion` | Integer `1`; unsupported versions block writes until migrated. |
| `scope` | Verified `site`, `projectKey`, bounded `jql`; initially null. |
| `fieldMap` | Logical field → verified Jira field ID plus conversion/ownership rules. |
| `statusMap` | Local evidence state → verified Jira status ID and allowed transition; lists terminal completed statuses. Unmapped statuses never transition. |
| `cursor` | UTC discovery watermark; null until complete initial discovery. |
| `lastFullReconcileAt` | UTC time of last fully discovered and accounted-for full inventory. |
| `stories` | Stable local ID → record below; tombstones are retained permanently. |
| `operations` | Append-only operation records, including interrupted/failed work. |
| `runs` | Append-only run log: `runId`, mode, authorization, counts, and what was executed versus left blocked. Informational summary; `operations` remains authoritative. |
| `fingerprintAlgorithms` | Which digest produced which stored hash, and why they differ (see below). |

Each `stories[id]` record contains:

| Field | Meaning |
| --- | --- |
| `jira` | Verified `key`, `url`, `updatedAt`, `statusId`; nullable until creation verified. |
| `localPath`, `epicId`, `parentId` | Actual path and hierarchy; unknown mappings stay null. |
| `lifecycle` | `active`, `prune-pending`, `pruned` or `reopened`; separate from delivery status. |
| `baseline` | Per mapped field: `{value, sha256, verifiedAt}` for the last verified common value. Store normalized managed content only. Description baselines record the configured content model; advance them only after verified reconciliation. |
| `observed` | Last local/remote hashes, remote update time, observation time; not a success claim. |
| `conflicts` | Per field: baseline/local/remote values, hashes, detection time and resolution if explicitly chosen. |
| `blockers` | Reasons and required next action, including unavailable permissions or uncertain creation. |
| `tombstones` | Append-only historical removal records with the fields below. |

Field ownership in `fieldMap` uses a fixed vocabulary: `shared` (reconciled both
ways), `repo-evidence` (the repository decides; Jira status follows `statusMap`),
`jira` (never written by this agent: assignee, sprint, comments, worklogs, rank)
and optional `jira-curated` (Jira keeps its own transportable text and is deliberately
not a mirror). Configure description ownership explicitly: a managed shared section
reconciles requirements; curated summaries preserve human-owned prose and point to
the full local specification. Do not treat intentionally unmapped text divergence
as a conflict, or omit genuinely shared AC/TR fields from reconciliation.
`statusMap` holds the verified status IDs, the transition IDs allowed per status
and the proposed evidence-to-status mapping; a mapping being present never
authorizes a transition, and unmapped statuses never transition.

Use SHA-256 for canonical baselines and exact specification bytes. If the runtime
cannot calculate SHA-256, report the affected operation blocked or use an
authorized hashing tool. A weaker fingerprint may only detect likely changes;
it cannot establish equality, advance a verified baseline, or prove prune recovery.

Tombstones contain `formerPath`, `localContentSha256`, `contentCommit`,
`jiraKey`, `jiraUrl`, `remoteSpecSha256`, `verifiedAt`, `removedAt`,
`implementationPaths`, `finalReviewPath`, `reviewedCommit` (or explicit reviewed
working-tree scope), and `navigationAnchor`. `removedAt` stays null until actual
removal. The content commit must resolve to the exact recoverable specification
blob, not merely an ancestor containing a previous revision. Retain old tombstones
across reopen/prune cycles. Fingerprints alone are not a recoverable specification.
Git-preserved tombstones also record `preservation: git-history`, `recoveryCommand`,
`recoveryUrl`, the remote content model, and the final review hash. Recovery URLs
require the referenced commit on the remote; the local Git command works without
pushing. The ledger's `prunePolicy` records authorization; it is not review evidence.

Before deletion, create a stable Markdown entry in [tombstones.md](./tombstones.md)
with anchor `story-<lowercase-stable-id>`, Jira link, former path, content commit
and evidence links. Repair live inbound links to that anchor or surviving evidence.
The JSON holds detailed history; this Markdown index supplies durable navigation.

Each operation records `id`, `runId`, `storyId`, `action`, `target`,
`intendedFields`, `sourceSha256`, `targetSha256`, `preparedAt`, and an append-only
`attempts` array. Each attempt has `at`, `state` (`pending`, `verified`, `blocked`,
`unknown-outcome`), safe error/result summary, and verified returned key if any.
Create the pending attempt **before** external or destructive local writes.
Derive ID from scope/site, stable ID, action and intended managed content hash;
reuse it when resuming the same operation. A changed intent gets a new ID.
Re-check pending/unknown outcomes before further writes. Do not trim unresolved
operations; completed history can move into `history/<run-id>.json` only with an
index link and preserved mappings/baselines/tombstones in the live ledger.

Canonical fingerprints use SHA-256 of normalized UTF-8 JSON with sorted keys,
compact separators and Unicode retained. Values must be JSON objects, strings,
arrays, booleans or null (no floating-point transport metadata). Hash complete
specification bytes separately for recoverable-prune proof. Field normalization
must preserve meaningful ordering and requirement identities.

## Expected decisions

| Situation | Required result |
| --- | --- |
| Local and Jira AC changed differently | Save conflict; preserve both; no winner chosen. |
| Local summary changed, Jira AC changed | Reconcile disjoint mapped fields and verify each. |
| Create accepted but response timed out | Record unknown outcome; locate stable identity; block if uncertain. |
| Incremental page fails | Keep previous cursor; preserve verified per-item progress. |
| Child implemented, parent review pending | Sync specs if authorized; refuse prune and Done inference. |
| Terminal story previously pruned | Keep tombstone; skip re-import. |
| Pruned story becomes nonterminal | Restore draft on pull/sync; retain history and request planning. |
| Mapped issue returns 404 | Flag unavailable; retain local content. |
| Local specification missing without tombstone | Conflict; no automatic delete or recreation. |

No live Jira behavior is verified by these conventions alone. Runtime reports
must distinguish successful operations from planned, blocked or unknown outcomes.
