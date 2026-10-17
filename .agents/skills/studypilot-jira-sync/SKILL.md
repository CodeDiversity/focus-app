---
name: studypilot-jira-sync
description: Use when pushing or pulling StudyPilot stories to Jira, reconciling tracker drift, inspecting the sync ledger, or removing reviewed story files after synchronization.
---

# StudyPilot Jira Sync

Reconcile Jira and local specifications while preserving human edits, execution
evidence and the identity of removed stories. This is an on-demand agent workflow,
not a daemon or installed CLI.

## Boundaries and modes

Write only `docs/jira-sync/`, scoped story specifications/navigation and tracker
pointers in `docs/stories/`, and existing epic tracker metadata in `docs/epics/`.
Do not author scope, dependency changes, readiness claims, implementation results
or reviewer verdicts. Imports are drafts for the planner/refiner. Preserve code,
reviewer reports, implementation/checkpoint artifacts and unrelated work. Never
read credential files, `.env` or `.env.*`. Use available Jira connector tools;
discover their schemas instead of inventing calls. Report unavailable tools.

Read delivery state and affected parent queues before story changes. Skip files
with unrelated dirty edits or an active writer; record blockers and continue
independent items. Coordinate one ledger writer at a time; stop mutations if
another session owns it. No automatic Git commit/push or Jira deletion.

| Mode | Behavior |
| --- | --- |
| `status` | Read-only local ledger health and pending/conflicting operations. |
| `preview` | Read repo/Jira and report proposed changes; write nothing. |
| `push` | Create/update Jira from local changes; save verified mappings. |
| `pull` | Import Jira stories and reconcile remote edits into local docs. |
| `sync` | Reconcile both directions against a common baseline. |
| `prune` | Remove eligible local specifications, retaining tombstones/evidence. |

These are natural-language requests, not shell commands. Bare invocation defaults
to preview. Explicit mode requests authorize that mode within their named scope;
honor established session authorization without asking again. Creating this role
does not authorize an initial live sync. Sync does not implicitly prune. Never
alter Jira project settings/versions. Status transitions require explicit or
established authorization and verified mappings/evidence.

## Bootstrap and identity

Read [ledger format](../../../docs/jira-sync/README.md) before ledger changes.
The ledger records synchronization, never a second execution queue. Verify exact
Jira site/project and bounded story JQL from existing mappings and connector
metadata; ask only for unresolved scope before external writes. Never silently
change scope or query every accessible project. Scope changes reset the cursor.
Discover editable fields, issue types, hierarchy, transitions and agreed fix
versions. Store actual field IDs/mappings rather than assumptions.

Inventory local IDs/keys and in-scope Jira stories on bootstrap. Reuse existing
epic and legacy parent keys; coordination summaries never receive duplicate
implementation issues. Each implementation child has a distinct issue. Keep stable
local IDs/paths; Jira keys are metadata. Search exact keys and unique stable-ID
markers in scope before creating. Use `StudyPilot-ID: <id>` in a supported
managed description section or agreed field. Ambiguous or duplicate matches block
the item; title similarity alone cannot establish identity.

Unmapped Jira stories use their verified local ID, otherwise `JIRA-<issue-key>`;
never guess an SP number. Import into its verified epic home or
`docs/stories/imported/<issue-key>.md` pending planner placement. Include original
requirements, provenance, remote status and `Needs refinement`. Create no competing
execution queue. Unknown dependencies/hierarchy remain blockers. Preserve unknown
ADF structures and human-owned text; block conversion that would lose information.

## Three-way reconciliation

Compare each mapped field with the last verified common baseline. Normalize only
line endings and known equivalent Markdown/ADF transport representations. Preserve
requirement IDs, order, meaning and links. Fingerprint canonical JSON (sorted keys,
UTF-8) with SHA-256. Shared fields are summary, requirements, AC/TR and explicitly
mapped epic/milestone/labels/dependencies. Execution/evidence stays repo-owned;
assignee, sprint, comments, worklogs and rank stay Jira-owned unless explicitly
mapped. Merge managed labels/links without replacing human-owned values.

- Neither side changed: no-op, without rewriting either side.
- Local-only change: push in push/sync; report pending in pull.
- Remote-only change: pull in pull/sync; report pending in push.
- Both now equal: verify and advance baseline without writes.
- Same field changed differently: persist baseline/local/remote conflict; leave
  that field untouched. Disjoint fields may reconcile independently.
- Divergent existing records without a baseline: conflict; never choose a winner.
- New story: create the missing counterpart only in the authorized direction.

Re-read remote issue and local fingerprints immediately before mutations. Recompute
if either changed. Use conditional writes when supported; disclose when connector
limitations prevent atomic concurrency protection. Re-fetch after each write and
verify managed fields. Advance only field baselines verified equal on both sides;
partial failures retain old baselines and pending state. Resolve conflicts using
explicit user choices or evidence both sides now agree. Never silently prefer a
side. Jira Done never proves local Reviewed; execution state follows repo evidence.
Never map implementation complete to Done while final review remains pending.

## Efficiency and interrupted runs

Fetch minimal metadata in paginated batches, then full content for new, changed
or conflicted items. Check local hashes and pending operations every run even when
remote results are empty. Incremental discovery uses the saved cursor with at
least two minutes overlap and issue-key deduplication for timestamp ties. Advance
to the run's starting server time only after complete pagination and every item
is verified or durably pending/conflicted. Incomplete discovery keeps the cursor.
Full inventory is required at bootstrap, scope change, explicit full sync, or
when the last full reconciliation is over seven days old. Absence in results or
a direct 404 may mean lost permissions; never infer deletion or prune from it.

Before mutations, atomically persist a deterministic operation ID, intended fields,
source/target hashes and pending state. On timeout/crash, inspect pending entries
first: re-fetch updates, search exact stable identity before retrying creates.
Timeout means unknown outcome. If search indexing cannot rule out prior creation,
leave ambiguous and blocked rather than create again. Store only verified returned
keys. Honor Retry-After and limit transient retries to three per operation per run;
authentication, permission, validation and ambiguity errors block immediately.
Continue independent items. Validate JSON before atomic temporary-file replacement.
Never advance a baseline for unverified outcomes or store credentials/private
comments in the journal.

## Prune and reopen

Prune requires all gates, recorded per item:

1. Explicit prune scope; tracked, clean, committed/recoverable specification;
   no active/next work or writer.
2. Completed implementation/integration evidence and a passing independent final
   review for the whole review unit, with no unresolved required work. Child
   self-checks and interim reviews cannot replace the parent gate.
3. Exact current full specification verified in Jira, including AC/TR and relevant
   contracts, no pending/conflicted fields, and configured terminal completed Jira
   status. Do not transition Jira merely to qualify for pruning.
4. Persist tombstone first: ID, key/URL, former path, full local content hash,
   content commit, review/implementation paths, verified remote hash and timestamp.
   Preserve parent README, contracts, traceability and all artifacts. Unique shared
   context still needed elsewhere blocks pruning until planner preservation.
5. Repair live inbound navigation/queue links to the durable tombstone anchor or
   retained evidence, then remove only that specification. Preserve historical
   quotations and reports. Keep queue rows/dependencies intelligible; never remove
   entire delivery folders. Mark pruned only after deletion. Resume interrupted
   prune from its tombstone, rechecking all gates and exact local/remote hashes
   before deletion; changed or recreated files block removal. Preview never
   writes tombstones.

Parent specs with active children cannot be pruned. A missing local file without
a tombstone is a conflict, never deletion permission. Terminal tombstoned stories
are excluded from imports; remote content changes are flagged without resurrecting
them or erasing their historical baseline. A nonterminal status signals reopening:
flag it and, on authorized pull/sync, restore a draft at the former unoccupied path.
Occupied paths block restoration. Retain tombstone history, mark reopened, and hand
off to planner. Never restore Reviewed or reactivate implementation automatically.

## Report

Report scope/mode and created/updated/imported/unchanged/conflicted/blocked/pruned/
reopened counts, verified keys, ledger path and next actions. Distinguish proposals
from applied work and incomplete discovery from full inventory. Never claim live
sync or efficiency savings without evidence.
