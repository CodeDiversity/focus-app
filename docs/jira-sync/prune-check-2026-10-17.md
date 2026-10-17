# Completed-story removal check — 2026-10-17

**Correction after full recheck:** SP-105’s saved pass-2 final review is Pass; the
earlier pending-review claim below came from its stale queue. Eight clean SP-105
children have now also been removed. See the [all-story audit](./all-story-removal-audit-2026-10-17.md)
for the current disposition of all 39 mapped local story records. Earlier checks
below are retained as history and do not supersede the newer audit.

**Follow-up executed:** The user approved Git-history-backed removal. Removed
SP-108A, SP-108B, SP-108C, SP-108E, SP-108F and SP-108G after verifying clean files,
exact committed content, current Jira Done status and the passing parent review.
Recovery records are in [tombstones.md](./tombstones.md) and [ledger.json](./ledger.json).
Repaired 18 navigation links in the surviving parent specification and README;
all 17 SP-108 artifact files remained byte-for-byte unchanged. The parent and D
remain because of existing uncommitted edits; SP-101/102 still lack independent
final review evidence. Other review/status blockers remain as described below.
No Jira content or status was changed. The original pre-approval check follows.

Request: remove Jira-synced story specifications marked completed in the repo.
Mode: prune. Result: **0 files removed**; the checked candidates have unmet
preservation or review gates. No Jira mutation, transition, Git commit or push.

Checked at 18:31 UTC against Jira site `adhdstudy.atlassian.net`, project `STUDY`,
and local HEAD `91145acd1d73c91a11a29ca08b5b5210d844e609` plus existing working-tree
changes. Existing dirty ledger/story files were preserved, not overwritten.
This is a candidate check, not a new full synchronization or ledger baseline.

## Findings

| Local completion candidate | Verified Jira state | Removal blockers |
| --- | --- | --- |
| SP-101 / STUDY-6 | Done | Detailed specification is present in Jira, but the saved review explicitly says the same agent implemented the story; an independent final-review gate is not established by that report. |
| SP-102 / STUDY-9 | Done | Jira contains a shorter specification and explicitly delegates full endpoints, Prisma changes, file list and Decisions Q1–Q8 to the local file. Its saved review also explicitly identifies the reviewer as the implementer. |
| SP-104 / STUDY-10 | To Do | Not terminal in Jira; remote specification still contains 403 ownership behavior, while the repo convention requires uniform 404. Full specification preservation is not established. |
| SP-108 / STUDY-36 | Done | Jira holds summary and repo pointer, not the full specification. Parent specification and delivery README have existing uncommitted changes. |
| SP-108A–G / STUDY-37–43 | Done (all seven) | Jira descriptions contain summaries and repo pointers, not full specifications/ACs. D also has existing uncommitted specification changes. The parent passing review is retained and does not resolve the preservation gate. |

SP-105 and SP-106 groups are implemented but their current parent queues still
await passing final re-reviews; they are not eligible under the completion gate.
SP-103 awaits review. SP-109 remains active work with an unfinished parent scope.
No implementation, contract, traceability or review artifact was modified.

## Policy conflict to resolve

The current ledger's `fieldMap.description` records the 2026-10-17 decision that
Jira is **not a mirror**: requirements and acceptance criteria remain repo-owned,
and existing human descriptions are preserved. The
[prune protocol](../../.agents/skills/studypilot-jira-sync/SKILL.md#prune-and-reopen)
requires the “Exact current full specification verified in Jira” before removal.
Most completed stories therefore cannot currently satisfy both policies.

Choose a preservation approach before removal: keep the existing Jira description
and publish the complete specification as a verified Jira attachment, or permit
Git-history-backed removal with durable ledger/tombstone recovery links instead
of requiring Jira to hold the full specification. Either approach needs an
explicit policy decision; this check did not change the policy or publish content.
The independent-review and clean-file gates still apply separately.

## Evidence retained

- [SP-101 review](../artifacts/STUDY-6/review.md), reviewer note.
- [SP-102 review](../artifacts/STUDY-9/review.md), reviewer note.
- [SP-108 queue](../stories/SP-108/README.md#execution-queue) and
  [passing parent report](../stories/SP-108/artifacts/SP-108/review.md).
- [Sync ledger](./ledger.json), description ownership policy and verified mappings.

Jira was fetched directly for STUDY-6, STUDY-9 and STUDY-36, and in a complete
single-page query for STUDY-10 and STUDY-37–43, including description/status/updated.
Remote observations support this check only; they do not mark any file pruned.
