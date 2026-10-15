# StudyPilot local coding

Read and follow [AGENTS.md](AGENTS.md) for repository rules and role boundaries.
This file is a tool entry point; the shared protocol applies to any coding agent.
Use the single [implementer](.agents/skills/studypilot-implementer/SKILL.md) for
all application layers; do not run parallel backend/frontend writers. Apply
[checkpoint-based execution](.agents/checkpoint-execution.md).

Read [delivery state](.agents/delivery-state.md) and the parent README's execution
queue to find the next task and canonical artifact directory.
When resuming in a fresh context, read the task's queue-resolved
`checkpoint.md`, reconcile Git state, and continue the
first incomplete step. Preserve completed and unrelated work; do not restart
the story from scratch. Follow the protocol for creating a missing checkpoint.
