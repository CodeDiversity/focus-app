# Generic delivery agents

A portable delivery workflow for any repository: planning, technical refinement,
implementation, review, static Definition of Done audits, resumable autopilot,
and optional bidirectional Jira synchronization. Copy this folder to keep the kit,
or install its contents into a repository as described below.

The bundle includes all seven repository roles in Codex, Vibe and OpenCode formats,
eight shared skills, delivery policies, reusable document templates and a clean
Jira ledger. It contains no application code, live tickets, historical evidence,
credentials, product exclusions, framework selection or prior approvals. Global
plugins and third-party skills are separate installations, not dependencies of
this workflow. The source repository's active configuration remains separate.

## Contents

| Path | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Role routing, write boundaries and completion rules |
| [.agents/project-context.md](.agents/project-context.md) | Destination repo's scope, stack, commands and policies |
| [.agents/skills/](.agents/skills/) | Eight `delivery-*` skills shared by every runtime |
| [.codex/agents/](.codex/agents/), [.vibe/agents/](.vibe/agents/), [.opencode/agents/](.opencode/agents/) | Seven role adapters for each runtime |
| [.agents/delivery-state.md](.agents/delivery-state.md) | Canonical execution queue and artifact paths |
| [.agents/story-sizing.md](.agents/story-sizing.md) | Cohesive slices and meaningful split criteria |
| [.agents/checkpoint-execution.md](.agents/checkpoint-execution.md) | Fresh-context resume and single-writer handoff |
| [.agents/review-cadence.md](.agents/review-cadence.md) | Whole-parent review and final walkthrough gate |
| [.agents/planning-checklist.md](.agents/planning-checklist.md) | Shared baseline and conditional planning validation |
| [.agents/context-efficiency.md](.agents/context-efficiency.md) | Bounded reads, evidence reuse, ownership and closeout |
| [docs/epics/README.md](docs/epics/README.md) | Generic shared Definition of Done |
| [docs/artifacts/README.md](docs/artifacts/README.md) | Artifact layout and ownership |
| [docs/jira-sync/](docs/jira-sync/) | Ledger schema, empty ledger and tombstone index |
| [templates/](templates/) | Epic, story, delivery queue, checkpoints and review records |
| [scripts/validate.py](scripts/validate.py) | Offline bundle structure, links and configuration checks |

## Install into a repository

1. Keep this directory intact as your reusable master. The dotted directories are
   part of the kit; enable hidden files in your file browser when copying it.
2. Copy `AGENTS.md`, `.agents/`, `docs/`, and `templates/` to the destination root,
   preserving their relative layout. Copy the adapter directory for your runtime
   (`.codex/agents/`, `.vibe/agents/`, or `.opencode/agents/`). You may install all
   three; they share the same skills and policies.
3. Merge with existing instructions and documentation. Preserve the destination's
   product/security rules, Definition of Done, queues and tracker ledger. Never
   overwrite a nonempty ledger with the empty starter. Treat conflicting files
   as a merge task, not as permission to replace the repo's setup.
4. Fill [.agents/project-context.md](.agents/project-context.md) using verified
   repository facts and accepted product decisions. Record actual commands and
   working directories. Do not invent a stack, roadmap or tracker configuration.
5. Check the shared DoD against the repo's obligations. Record applicability for
   non-UI, non-service and non-database work; retain stricter existing requirements.
6. Start a fresh agent session in the destination root and confirm it can read
   `AGENTS.md` and the requested skill. Where custom roles require registration,
   register the copied role files using that runtime's installed configuration
   schema. These adapter files alone do not guarantee role discovery.

For an existing local destination, this example copies missing files without
overwriting existing ones. Review/merge skipped conflicts before using the kit.
Set both paths yourself; these commands run in your terminal, not in a prompt:

```sh
bundle="/absolute/path/to/generic agents"
target="/absolute/path/to/destination-repo"
cp -Rn "$bundle/.agents" "$bundle/docs" "$bundle/templates" "$target/"
cp -n "$bundle/AGENTS.md" "$target/AGENTS.md"
mkdir -p "$target/.codex"
cp -Rn "$bundle/.codex/agents" "$target/.codex/"
```

Choose `.vibe` or `.opencode` instead of `.codex` for that adapter. This is a
non-overwriting copy, not an automatic merge or conflict detector. In particular,
an existing shared DoD must retain its content and incorporate the workflow's
integrated-review/final-walkthrough obligations. Keep this README for reference;
do not replace the destination's main README with it.

Some `cp` implementations return a nonzero exit status when `-n` skips existing
files. Check which files were preserved and merge their instructions explicitly.

All instruction paths are relative to the **destination repository root**.
Leaving the kit nested under `generic agents/` is useful for distribution, but
does not activate it in that parent repo. Keeping a nested installation requires
updating root instructions, role registrations, links and path permissions
consistently. Root installation is the supported default.

## Runtime adapters and permissions

The copied wrappers retain their runtime-specific format and capability limits.
Validate registration/tool configuration against the installed runtime version;
the kit does not install runtimes, enable tools, select models, grant shell
permissions or schedule background work.

- **Codex:** role definitions are TOML. They reference the shared skills. The
  reviewer requests workspace writes for narrowly permitted output persistence;
  the static auditor is read-only. Parent/runtime permissions still apply.
- **Vibe:** role definitions are TOML with tool permissions. The reviewer returns
  exact report/walkthrough content for coordinator persistence; it cannot write
  files. Refiner writes remain limited to the assigned story even if a tool's
  allowlist is broader. Planning/tool operations keep their approval settings.
- **OpenCode:** role definitions are Markdown with frontmatter. The supplied
  reviewer denies shell; it cannot independently execute test commands through
  shell. Use the documented evidence/fallback rules and `CANNOT VERIFY` when
  execution evidence is insufficient. The auditor denies edits and shell.

When a runtime does not load a custom role, explicitly ask a session to read its
definition and shared skill. Ordinary role work can use this fallback. Autopilot
requires **new isolated specialist contexts**; without supported isolated
delegation, it saves progress and returns a concrete fresh-session handoff.
Do not run its restricted specialist roles inline to bypass that requirement.

If you install skills globally instead, keep their relative supporting documents
available too; copying only `SKILL.md` files breaks dependencies. Repository-local
installation is recommended. Generic skill names are prefixed `delivery-` to
reduce collisions with unrelated skills.

## Roles and invocation

| Role | Shared skill | Main responsibility |
| --- | --- | --- |
| `planner` | `delivery-planner` | Docs-only breakdown, sizing, contracts and traceability |
| `refiner` | `delivery-refiner` | Technical refinement of one unimplemented story only |
| `implementer` | `delivery-implementer` | One sequential owner for all affected layers |
| Layer guidance | `delivery-backend`, `delivery-frontend` | Technical support for that implementer; no extra writers |
| `reviewer` | `delivery-reviewer` | Independent plan or whole-parent implementation review |
| `dod-auditor` | `delivery-reviewer` static audit mode | Static, read-only audit; no test execution or sign-off |
| `autopilot` | `delivery-autopilot` | Isolated sequential specialists through final parent review |
| `jira-sync` | `delivery-jira-sync` | Optional tracker reconciliation, safe prune and reopen |

Use natural-language requests with exact paths, for example:

```text
Use planner to initialize the delivery home for the named epic. Read
AGENTS.md, .agents/project-context.md and .agents/skills/delivery-planner/SKILL.md.
Ground the breakdown and queue in the actual repo; preserve existing work.

Use refiner on <exact story path>. Read the parent queue and refine only
that unimplemented story; return material decisions that remain unresolved.

Use implementer for <exact story path>. Read its parent queue and checkpoint,
complete the authorized scope and scoped closeout, and hand off for review.

Use reviewer to review <exact parent README and implementation-index paths>.
Verify the combined scope and all children. Save the report and, only on the
final passing implementation review, the separate final walkthrough.

Use autopilot for <exact parent README path>, entering at <stage or child>.
Continue the enclosing parent through final independent review and fixes,
using a new isolated specialist for every task. Stop within this parent.

Resume <story ID> as implementer from <exact checkpoint path>.
Reconcile Git state and continue the first incomplete step; preserve other work.
```

The angle-bracket text in these examples must be replaced with real paths/IDs.
Role invocation syntax varies by runtime; these are requests, not shell commands.
Selecting a single child does not authorize siblings. Explicit autopilot covers
the enclosing parent subject to user limits, but grants no external permissions.

## Initialize and run a feature

1. Planner reads source requirements and initializes an epic plus delivery folder
   using the templates. Its README owns the queue, decisions, contracts,
   requirement/test traceability and resolved artifact paths.
2. Reviewer performs one whole-plan review. Planner corrects grounded findings;
   only an independent reviewer closes them. Plans and future tests are not
   implementation evidence.
3. Refiner prepares the next unimplemented story. One implementer executes ready
   children sequentially, persisting each checkpoint, implementation evidence,
   status updates and scoped commits before advancing.
4. The implementer completes integration obligations and the combined parent
   index. No routine per-child formal review is required.
5. Reviewer independently reviews the complete parent scope, with actual evidence
   and honest `PASS`/`FAIL`/`CANNOT VERIFY` dispositions. Fix mandatory findings
   and re-review; preserve finding IDs across rounds.
6. On final pass, reviewer saves and verifies `review.md` and the separate
   `walkthrough.md` before `Reviewed`. The coordinator persists permitted verbatim
   fallback outputs and commits reviewer artifacts; the reviewer never commits.

These records survive fresh contexts and tools. They do not recover unsaved code
or automatically restart sessions. An explicit writer handoff is required before
another implementation session takes ownership.

## Templates

Templates are scaffolds, not factual records or passing evidence. Replace every
angle-bracket field before using a document as an execution/readiness record;
delete inapplicable example rows with a reason. Preserve any existing naming
scheme. Only the owning role fills a record, using actual observed results.

| Template | Owner / destination |
| --- | --- |
| [epic.md](templates/epic.md) | Planner → `docs/epics/<epic-id>.md` |
| [delivery-readme.md](templates/delivery-readme.md) | Planner → delivery home `README.md`; scoped status exceptions apply |
| [parent-summary.md](templates/parent-summary.md) | Planner → delivery home `<parent-id>.md` |
| [story.md](templates/story.md) | Planner/refiner → delivery home `<story-id>.md` |
| [checkpoint.md](templates/checkpoint.md) | Implementer → resolved story artifact directory |
| [implementation.md](templates/implementation.md) | Implementer → resolved child/standalone artifact directory |
| [parent-implementation.md](templates/parent-implementation.md) | Implementer → parent artifact directory `implementation.md` |
| [plan-review.md](templates/plan-review.md) | Reviewer → delivery home `plan-review.md` |
| [review.md](templates/review.md) | Reviewer → parent/standalone artifact directory |
| [walkthrough.md](templates/walkthrough.md) | Reviewer → beside final `review.md` on final pass |

Shared workflow/DoD documents in `docs/` and `.agents/` are also reusable starter
documents. Use recorded legacy artifact locations until an authorized migration.

## Optional Jira setup

Local planning, implementation, review and autopilot work without Jira. Leave
tracker references `Not configured`; missing Jira is not a local delivery blocker.

For Jira, connect an available runtime-supported Jira connector yourself; do not
put credentials in the kit or ask agents to read secret files. Start with
`Use jira-sync to preview <bounded scope>`. Verify site, project/JQL, issue types,
hierarchy, stable-ID marker, field ownership, labels, versions and status mapping.
The starter [ledger](docs/jira-sync/ledger.json) has no verified mappings or history.

Explicit scoped `push`, `pull` or `sync` uses three-way reconciliation and durable
pending operations. Those modes do not authorize prune, issue deletion or status
transitions. Conflicts never silently choose a winner. Interrupted creates must
be located by stable identity before retrying. See the [ledger guide](docs/jira-sync/README.md)
for preservation, tombstones, safe recovery and reopening as a draft.

## Validate and maintain

Run this from anywhere, using Python 3.11 or later and the intact bundle path:

```sh
python3 "/absolute/path/to/generic agents/scripts/validate.py"
```

The validator checks all three adapter sets, TOML syntax, skill names/entrypoints,
local Markdown links, dependency presence and an uninitialized starter ledger.
It does not contact Jira, run your application, prove runtime schema compatibility,
or establish independent delivery approval. Run it against the reusable master;
a live installed ledger will intentionally differ from the empty starter.

Keep durable workflow behavior in shared skills/policies and repository-specific
facts in project context. If changing paths, update all role adapters and links.
After workflow changes, validate realistic tasks in unrelated stacks and check
that role boundaries, evidence provenance and final review gates still hold.
