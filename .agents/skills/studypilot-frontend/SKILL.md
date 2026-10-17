---
name: studypilot-frontend
description: Frontend technical guidance for the single StudyPilot implementer when changing React components, RTK Query data flows, forms and validation, or UI state handling.
---

# StudyPilot Frontend Guidance

Supporting guidance for the single [implementer](../studypilot-implementer/SKILL.md).
Follow that skill's execution/ownership rules. Loading this skill does not create
a separate frontend implementation role.

Stack: React + TypeScript + Vite, Redux Toolkit + RTK Query for data fetching.

## Technical requirements

- Target WCAG 2.2 AA. Event types on the calendar must be distinguishable without color alone; core interactions must be keyboard accessible with visible focus states.
- Handle loading, empty, and error states in every view. Empty states should tell the student what to do next.
- Compose domain-specific RTK Query endpoints/services; do not build one large dashboard service owning unrelated business rules.
- Frontend validation mirrors backend validation. Surface API errors as actionable messages.
- Responsive layouts must work on desktop and mobile, including the calendar's weekly and agenda views.
- Match existing component and styling conventions. Minimal diffs; do not refactor unrelated code.

## Security rules

- Never read, display, quote, or write to `.env`, `.env.*`, credential, key, token, or secret-manager files. If a task needs a credential value, tell the user to set it themselves.
- Never embed API keys or secrets in client code — anything in the bundle is public.
- Access tokens live in memory only; never persist them to localStorage, sessionStorage, or cookies you control.

## Framework note

This is supporting layer guidance for the implementer, not a separate writer or
an additional authorization to change files.
