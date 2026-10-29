# StudyPilot MVP — Shared Reference

**Project:** StudyPilot
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Backend:** NestJS + Prisma + PostgreSQL
**Frontend:** React + TypeScript + Vite
**AI functionality:** Excluded from MVP

## Epics

| Epic | Title | File | Dependencies | Jira |
|---|---|---|---|---|
| EP01 | Authentication & Onboarding | [EP01-authentication-and-onboarding.md](./EP01-authentication-and-onboarding.md) | None | STUDY-5 |
| EP02 | Semester & Course Management | [EP02-semester-and-course-management.md](./EP02-semester-and-course-management.md) | EP01 | STUDY-18 |
| EP03 | Assignment & Task Management | [EP03-assignment-and-task-management.md](./EP03-assignment-and-task-management.md) | EP02 | STUDY-16 |
| EP04 | Academic Calendar & Availability | [EP04-academic-calendar-and-availability.md](./EP04-academic-calendar-and-availability.md) | EP02, EP03 | STUDY-14 |
| EP05 | Student Dashboard | [EP05-student-dashboard.md](./EP05-student-dashboard.md) | EP02–EP04 | STUDY-19 |
| EP06 | Study Planning & Scheduling | [EP06-study-planning-and-scheduling.md](./EP06-study-planning-and-scheduling.md) | EP03, EP04 | STUDY-15 |
| EP07 | Focus Sessions & Time Tracking | [EP07-focus-sessions-and-time-tracking.md](./EP07-focus-sessions-and-time-tracking.md) | EP03 | STUDY-13 |
| EP08 | Catch-Up & Recovery | [EP08-catch-up-and-recovery.md](./EP08-catch-up-and-recovery.md) | EP06, EP07 | STUDY-17 |
| EP10 | UI Design System & Visual Refresh | [EP10-ui-design-system-and-visual-refresh.md](./EP10-ui-design-system-and-visual-refresh.md) | None (cross-cutting) | Pending creation |

Epics synced to Jira (project STUDY, site adhdstudy.atlassian.net) on 2026-10-11, labeled `studypilot`, `mvp`. EP01, EP02, EP03 and EP04 have story breakdowns (see [docs/stories/EP01](../stories/EP01/README.md), [docs/stories/EP02](../stories/EP02/README.md), [docs/stories/EP03](../stories/EP03/README.md), [docs/stories/EP04](../stories/EP04/README.md)); EP02 covers all six proposed stories — SP-110 (story 1, complete 2026-10-21), SP-111 (stories 2–4, complete 2026-10-22) and SP-112 (stories 5–6, complete 2026-10-23); the epic is complete. EP04 is broken down (planned 2026-10-28) as SP-127 (weekly academic calendar), SP-128 (study availability and unavailable blocks) and SP-129 (mobile agenda view).

## Definition of Done

Every completed story must satisfy the following applicable conditions:

1. The functional acceptance criteria pass.
2. Frontend and backend validation handle invalid input.
3. Academic data is scoped to the authenticated student.
4. API errors produce actionable messages.
5. Loading, empty, and error states are handled.
6. Core interactions support keyboard accessibility.
7. Responsive layouts work on desktop and mobile.
8. Business rules have automated tests.
9. API changes and migrations are documented.
10. The feature has been reviewed in an integrated development environment.
11. Before final completion, the reviewer has saved a user-facing walkthrough
    explaining the code, evidence for correctness after review corrections,
    and manual test steps/expected results for each applicable workflow.

Item 11 is a final reviewer-owned deliverable, once per complete parent review
unit (or standalone story), in both ordinary and autopilot reviews. It is not
required from the implementer before initial review. Save `walkthrough.md`
beside the resolved final `review.md`; verify both before marking `Reviewed`
or complete. Label performed manual checks separately from unexecuted user
instructions; required manual gates still need actual evidence. See the
[reviewer workflow](../../.agents/skills/studypilot-reviewer/SKILL.md#final-user-walkthrough).

**Target accessibility:** WCAG 2.2 AA.

## Release Milestones

| Milestone | Included Epics | Outcome |
|---|---|---|
| M1 | EP01, EP02, EP03 | Functional academic tracker |
| M2 | EP04, EP05 | Calendar and dashboard |
| M3 | EP06, EP07 | Study planning and focus sessions |
| M4 | EP08 | Catch-up workflow and complete MVP |
| M5 | EP10 | Visual design system & refresh (MVP polish; cross-cutting) |

Cross-cutting technical tasks, such as initial NestJS setup, Prisma migrations, CI, error handling, and deployment, should be tracked as technical stories or tasks linked to the appropriate milestone.

### Frontend architecture

`apps/web` uses **Feature-Sliced Design** layers, decided 2026-10-17
([SP-109](../jira-sync/tombstones.md#story-sp-109), user decision; breakdown and per-story
sizing in [docs/stories/SP-109](../stories/SP-109/README.md)):

```text
apps/web/src/
  app/       providers, router, Redux store + typed hooks   (top layer)
  pages/     route screens, one folder per route            (pages/<route>/ui)
  widgets/   composed blocks (layout, header, guards)       (widgets/<block>/ui)
  features/  user actions: components, hooks, slices, API   (features/<feature>/{ui,model,api,lib})
  entities/  domain data and its API                        (entities/<entity>/{model,api})
  shared/    reusable UI, HTTP transport, helpers           (no upward imports)
  test/      test support (exempt from layer ordering)
```

Imports use the single `@/` → `apps/web/src` alias and may only point downward
(`shared` → `entities` → `features` → `widgets` → `pages` → `app`); the only
sanctioned upward imports are RTK `RootState`/`AppDispatch` types from
`@/app/store`. ESLint enforces this (SP-109A/I). New frontend work in EP02–EP08
places components, RTK slices/queries and API modules in the owning feature
folder rather than in flat top-level folders.

### Technical Tasks

| Task | Title | Milestone | Jira |
|---|---|---|---|
| TECH-01 | Scaffold backend and frontend (monorepo, NestJS + Prisma + PostgreSQL, React + TS + Vite, CI) | M1 | STUDY-20 |
| TECH-02 | Configure linter and formatter (ESLint, Prettier, jsx-a11y, pre-commit hooks) | M1 | STUDY-21 |

## Out of Scope

The MVP excludes AI, syllabus parsing, LMS integrations, grade calculations, flashcards, social collaboration, and native mobile apps.

These can be considered after validating the initial planner with students.
