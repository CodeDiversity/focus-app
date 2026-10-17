# Jira synchronization ledger

Use the `jira-sync` agent for on-demand reconciliation. Its shared instructions
live in [the sync skill](../../.agents/skills/studypilot-jira-sync/SKILL.md).
This directory records what actually synchronized; parent README queues remain
authoritative for implementation state. The initial empty ledger is intentional:
no Jira connection, mapping, content transfer or cleanup has been performed.

## Requests

- “Use jira-sync to preview all StudyPilot stories.”
- “Use jira-sync to sync all stories in the configured project.”
- “Use jira-sync to push the SP-105 children.”
- “Use jira-sync to pull new and changed Jira stories.”
- “Use jira-sync to show status and retry verified pending operations.”
- “Use jira-sync to preview prune eligibility for SP-106.”
- “Use jira-sync to prune eligible reviewed SP-106 specifications.”

These invoke agent behavior, not installed CLI commands. No background scheduling
is configured. First use verifies project scope and connector availability.
Preview and status are read-only. Push/pull/sync do not remove specifications;
explicit prune does. An existing authorization remains valid within its scope.

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

Each `stories[id]` record contains:

| Field | Meaning |
| --- | --- |
| `jira` | Verified `key`, `url`, `updatedAt`, `statusId`; nullable until creation verified. |
| `localPath`, `epicId`, `parentId` | Actual path and hierarchy; unknown mappings stay null. |
| `lifecycle` | `active`, `prune-pending`, `pruned` or `reopened`; separate from delivery status. |
| `baseline` | Per mapped field: `{value, sha256, verifiedAt}` for the last verified common value. Store normalized managed content only. |
| `observed` | Last local/remote hashes, remote update time, observation time; not a success claim. |
| `conflicts` | Per field: baseline/local/remote values, hashes, detection time and resolution if explicitly chosen. |
| `blockers` | Reasons and required next action, including unavailable permissions or uncertain creation. |
| `tombstones` | Append-only historical removal records with the fields below. |

Tombstones contain `formerPath`, `localContentSha256`, `contentCommit`,
`jiraKey`, `jiraUrl`, `remoteSpecSha256`, `verifiedAt`, `removedAt`,
`implementationPaths`, `finalReviewPath`, `reviewedCommit` (or explicit reviewed
working-tree scope), and `navigationAnchor`. `removedAt` stays null until actual
removal. The content commit must resolve to the exact recoverable specification
blob, not merely an ancestor containing a previous revision. Retain old tombstones
across reopen/prune cycles. Fingerprints alone are not a recoverable specification.

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
