# Core rules (every role reads this; nothing else is mandatory)

Mandatory reads for any task: this file, your role skill, the parent story
README's **Execution queue**, the active story, and the shared DoD in
`docs/epics/README.md`. Everything else under `.agents/` is reference — load a
section when the task touches it. Skills name their own on-demand references.

## Roles and write boundaries

| Role | Skill | May write |
| --- | --- | --- |
| planner | `.agents/skills/planner/SKILL.md` | `docs/` only |
| refiner | `.agents/skills/refiner/SKILL.md` | the one given unimplemented story file |
| implementer | `.agents/skills/implementer/SKILL.md` | application code, tests, migrations; `artifacts/**`; the README's execution fields and the active child's Status/artifact pointers |
| reviewer | `.agents/skills/reviewer/SKILL.md` | its report (`review.md` / `plan-review.md`); on a passing verdict the scoped docs sync and its commit |

The **live session** (the human's chat session) is the coordinator: it picks the
next edge from the [playbook](workflow-graph.md), dispatches one specialist at
a time with a fresh context, checks deterministic gates itself, and commits
refiner output. There is no autopilot and no judge role. A read-only audit is
available on explicit request via the reviewer skill's static-audit mode.

**One writer.** Exactly one implementation session writes at a time. No parallel
implementers, no worktrees to get around it. A session may continue into the
next Ready child when context remains; it checkpoints between children. Hand
off explicitly before another session writes; never stash/reset/discard
another's work.

## Shared-understanding contract (every story)

A story must leave the reader with complete clarity on what is being done, why,
and which choices are theirs. Every story opens with:

```markdown
## Plan at a glance
- **What this changes:** <observable behavior / files>
- **Why it improves it:** <product/user quality and code quality — both when both apply>
- **Decisions needing you:** <▲ rows still Proposed, or "none">
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.
```

and carries a **Decisions** table: `ID | Options considered | Recommended | Ruling`.
Agents fill Options and Recommended; only the user (or a user-granted session)
writes Ruling. At implementation start, a row still `Proposed` becomes
`Ratified by default, <date>` — except rows marked **▲ material** (security,
persisted data, public contract, user-visible workflow), where the implementer
stops and asks. An override is one cell: `Overridden: <choice> (user, <date>)`.
The planner's chat response repeats each story's at-a-glance block verbatim.

## Identifiers

Follow [ID conventions](id-conventions.md): qualified child ACs
(`EP13J-AC3`), `D<nn>-<n>` epic / `D-<suffix><n>` story decisions with override
back-references, `F-<STORY>-<nn>` implementer findings, `R-<UNIT>-<nn>`
reviewer findings, `S<n>` checkpoint steps, `M<n>` milestones only.

## Evidence and records — one fact, one place

- Queue row: state, dependencies, next action, artifact links + one-line verdict.
- `checkpoint.md`: only for multi-window or handed-off tasks; closed to a pointer at the end.
- `implementation.md`: completed behavior, AC-by-AC outcome, verification, findings. The only home for test counts.
- `review.md`: findings, verdict, and a final **How to verify by hand** section.
- `history.md` (per delivery home): correction log, quality-gate table, superseded decisions.

Missing records are unverified, not done. Cite decisions by ID; never restate.

## Closeout (end every task with these fields)

```text
Status: <implemented / reviewed / blocked / partial>
Records: <paths written>
Commits: <verified hashes, or "pending: <paths> — <reason>">
Verification: <commands + cwd + result + tested state>
Remaining: <open work / blockers + owner>
```

If the role may commit: stage explicit owned paths only, inspect the staged
diff, one commit per finished child (code + records + queue row), never bypass
hooks. Then run `node tools/queue-lint.mjs <delivery-home>` and append one row
to `<delivery-home>/artifacts/efficiency.md` (see [measurement](context-efficiency.md)).

## Handoff template (coordinator → specialist)

```text
Role / task: <one bounded assignment; return at its end>
Read: .agents/core.md, <role skill>, <queue path>, <story path>
Rules that apply here: <inline the 3–10 specific lines this task needs — do not name whole files>
Repo: <workspace, branch, HEAD; paths to preserve>
Decisions: <IDs already ruled; ▲ rows still Proposed>
Return: closeout fields
```

## Model routing

| Task | Model tier |
| --- | --- |
| refiner, docs-only planner corrections, queue-lint fixes, static audit | small |
| planner breakdowns, implementer, reviewer | default |

## Security (binding for every role and every shell command)

Never read, display, search or write `.env`, `.env.*`, credentials, keys,
tokens or secret stores; flag an exposed secret by location only. Every Prisma
query on a student's academic data includes the authenticated `userId`
(helpers in `apps/api/src/common/ownership/ownership.ts`; `@CurrentUser()`,
never `@Req()`); not-owned or missing returns the uniform 404 `Resource not
found`, never 403. Access tokens live in memory only. Shared databases,
deployment, push/merge and destructive actions keep their existing
authorization; a role name grants none of it.
