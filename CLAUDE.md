# StudyPilot local coding

Read and follow [AGENTS.md](AGENTS.md) for repository rules and role boundaries.
This file is a tool entry point; the shared protocol applies to any coding agent.
Use the single [implementer](.agents/skills/studypilot-implementer/SKILL.md) for
all application layers; do not run parallel backend/frontend writers. Apply
[checkpoint-based execution](.agents/checkpoint-execution.md).

When resuming in a fresh context, read the task's
`docs/artifacts/<ticket-id>/checkpoint.md`, reconcile Git state, and continue the
first incomplete step. Preserve completed and unrelated work; do not restart
the story from scratch. Follow the protocol for creating a missing checkpoint.
