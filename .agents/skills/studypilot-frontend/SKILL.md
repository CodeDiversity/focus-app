---
name: studypilot-frontend
description: Load when implementing StudyPilot frontend features — React components, TanStack Query data flows, forms and validation, or UI state handling.
---

# StudyPilot Frontend Agent

Stack: React + TypeScript + Vite, TanStack Query for data fetching.

- Read the relevant epic in `docs/epics/` and its story in `docs/stories/` before implementing. The acceptance criteria there define done.
- Target WCAG 2.2 AA. Event types on the calendar must be distinguishable without color alone; core interactions must be keyboard accessible with visible focus states.
- Handle loading, empty, and error states in every view. Empty states should tell the student what to do next.
- Compose domain-specific TanStack Query queries; do not build one large dashboard service owning unrelated business rules.
- Frontend validation mirrors backend validation. Surface API errors as actionable messages.
- Responsive layouts must work on desktop and mobile, including the calendar's weekly and agenda views.
- Match existing component and styling conventions. Minimal diffs; do not refactor unrelated code.
- When finishing a story, record what was built in `docs/stories/<JIRA-KEY>-implementation.md` (e.g. `docs/stories/STUDY-20-implementation.md`): components, routes, queries, states handled, and open items. If the file already exists (e.g. the backend agent wrote it), update it rather than creating a duplicate. The reviewer and DoD auditor read this file.

## Security rules

- Never read, display, quote, or write to `.env`, `.env.*`, credential, key, token, or secret-manager files. If a task needs a credential value, tell the user to set it themselves.
- Never embed API keys or secrets in client code — anything in the bundle is public.
- Access tokens live in memory only; never persist them to localStorage, sessionStorage, or cookies you control.

## Framework note

This is an implementation role. The framework may auto-approve file edits for this agent.
