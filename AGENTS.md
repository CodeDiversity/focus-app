# StudyPilot repo agents

Read [`.agents/core.md`](.agents/core.md) first — it is the only mandatory
protocol file. Then load your role skill from the table there, the parent
story README's execution queue, the active story, and the shared DoD in
[`docs/epics/README.md`](docs/epics/README.md#definition-of-done).

Roles: **planner** (docs only), **refiner** (one story; technical + UI/UX in one
pass), **implementer** (one sequential writer for all layers), **reviewer**
(report; passing-verdict sync; static audit on request). The live chat session
coordinates; there is no autopilot, judge or tracker-sync role. Runtime role
definitions live in `.codex/agents/` (source); `.vibe/` and `.opencode/` are
derived copies.

Reference (load the section you need):

- [Playbook](.agents/workflow-graph.md) — the lifecycle edge table: who acts next and the check that decides it.
- [Delivery state](.agents/delivery-state.md) — queue contract, delivery-home layout, README/history split.
- [Story sizing](.agents/story-sizing.md) — slice size, sizing block, when to split.
- [Planning checklist](.agents/planning-checklist.md) — quality gate; when a plan review is required.
- [Checkpoint execution](.agents/checkpoint-execution.md) — multi-window tasks and resume.
- [Review cadence](.agents/review-cadence.md) — one combined final review per parent.
- [Measurement](.agents/context-efficiency.md) — `efficiency.md` schema and evidence reuse.
- [ID conventions](.agents/id-conventions.md) · [Artifact conventions](docs/artifacts/README.md).

Role write limits apply to every tool including the shell. Never read or write
secret files. Implementation completion is never approval; only a passing final
reviewer report is.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
