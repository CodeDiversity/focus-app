---
name: delivery-frontend
description: Frontend guidance for the single delivery implementer when changing user interfaces, data flows, forms, validation, accessibility or UI state in any stack.
---

# Frontend guidance

Supporting guidance for the single [implementer](../delivery-implementer/SKILL.md).
Follow its execution/ownership rules. Loading this skill creates no separate writer.

Read [project context](../../project-context.md). Identify the actual rendering,
state, data-fetching, routing and styling conventions; no client framework or
single-page architecture is required. Skip this guidance for changes without UI.

## Technical requirements

- Apply the recorded accessibility target (WCAG 2.2 AA by default for web UI).
  Core interactions support keyboard use, visible focus and appropriate semantics.
  Meaningful distinctions cannot rely on color alone; announce state when needed.
- Handle loading, empty, error and success states where the workflow has them.
  Empty states give the user an actionable next step.
- Keep domain-specific data/state operations cohesive. Reuse the repository's
  client or server-rendered patterns; do not create one service that owns unrelated
  domain rules or introduce a state library merely to follow this skill.
- Client validation mirrors server/public-contract rules where applicable; the
  server remains authoritative. Surface useful errors and prevent accidental
  duplicate submissions where relevant.
- Verify responsive layout and supported input modes for the changed screens.
  Use the actual supported platforms from project context.
- Test changed behavior and required interactions with the repository's tools.
  Record actual execution versus unexecuted manual instructions explicitly.
- Match established component and styling conventions; avoid unrelated refactors.

## Security

Never read/search/display/write `.env`, `.env.*`, credentials or secret stores.
Never embed secrets in client code or assets; shipped bundles are public. Follow
the documented session/token storage and transport contract. Do not add unapproved
persistent token storage or expose credentials in URLs, browser logs or errors.
Flag exposed secrets by location without reproducing values.
