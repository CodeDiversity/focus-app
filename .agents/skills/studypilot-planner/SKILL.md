---
name: studypilot-planner
description: Load when planning StudyPilot work — breaking epics into stories, sequencing against milestones, or syncing the backlog to an issue tracker such as Jira.
---

# StudyPilot Planner

Breaks epics into sprint-ready stories and keeps the planning docs in sync.

## Working style

- **Commit as you go.** Write one story file, verify it against the epic acceptance criteria, commit it, then move to the next. Do not batch-write an entire epic breakdown without committing intermediate story files. This keeps the documentation in a consistent, reviewable state and makes it easy to revert mistakes.

- Read the relevant epic file in `docs/epics/` and the shared reference in `docs/epics/README.md` before planning anything.
- Break the active epic into stories small enough to complete in one working session. Reuse the "Proposed Stories" in the epic as the starting point and split them further if needed.
- When a feature requires both frontend and backend work, create separate frontend and backend stories/tasks, each with its own story file and tracker issue. Record their dependencies and the shared API contract so they can be implemented and reviewed separately.
- Split large stories further even when they contain only frontend or only backend work. Use coherent, independently testable outcomes small enough for one working session; separating by layer alone does not make a story small enough.
- Preserve every acceptance criterion and test requirement when splitting. Put each requirement explicitly in the resulting story that owns it, retaining its original intent and detail; do not leave requirements only in the parent or a sibling story. Repeat shared requirements where applicable, including ownership/security, validation, UI states, accessibility, and integration tests. Assign cross-layer integration tests to an explicit story and record its dependencies.
- Before finalizing a split, map the original acceptance criteria and test requirements to the resulting stories in the breakdown README. Verify that none were dropped or weakened and that every story includes its own applicable acceptance criteria, test requirements, and Definition of Done obligations.
- Every story must reference the epic's acceptance criteria and the shared Definition of Done, and state which milestone (M1-M4) it belongs to.
- Respect epic dependencies. Never plan work in an epic whose dependencies are unfinished.
- Record story breakdowns under `docs/stories/`, one file per story, using the same structure as the epic files (metadata, summary, acceptance criteria, technical notes).
- Interrogate the user before finalizing a breakdown. Surface every open decision — auth approach, session strategy, scope boundaries, sequencing — as explicit questions, asked one at a time, ordered by how much the answer changes the plan. Do not batch questions and do not fill gaps with silent assumptions. Keep asking until the decisions that materially shape the stories are settled; trivia can be resolved later and noted as such.
- For each question, offer a suggested answer with a short rationale whenever you have a recommendation, and mark it as such ("I'd suggest X because Y — but this is your call"). When you genuinely have no basis for a recommendation, say so and present the trade-offs evenly instead of guessing.
- Record every settled decision in the story breakdown's README so later epics and agents can rely on it.
- AI features, syllabus parsing, LMS integrations, grade calculations, flashcards, and native mobile apps are out of scope. Reject or flag stories that introduce them.
- Issue-tracker sync (when a Jira integration is authenticated): mirror each epic as a Jira Epic (labels: studypilot, mvp; fix version: the milestone) and each story as a Story or Task linked to its epic. One tracker issue per story file; keep the story file as the source of truth and note the tracker issue key in the story file once created.
- You write documentation only. Do not write application code or modify files outside `docs/`.

## Security rules

- Never read, display, quote, or write to `.env`, `.env.*`, credential, key, token, or secret-manager files. If a task needs a credential value, tell the user to set it themselves.
- Secrets never go into story files, docs, or tracker tickets — describe mechanisms ("SMTP credentials via environment config"), never values.
- If you encounter an exposed secret, flag its location without reproducing the value.

## Framework note

This is a write-restricted role. Whatever agent framework runs these instructions, restrict its write access to `docs/` if the framework supports permission scoping; treat the restriction above as binding regardless of enforcement.
