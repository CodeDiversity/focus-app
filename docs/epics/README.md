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

Epics synced to Jira (project STUDY, site adhdstudy.atlassian.net) on 2026-10-11, labeled `studypilot`, `mvp`. Only EP01 has a story breakdown so far (see [docs/stories/EP01](../stories/EP01/README.md)).

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

**Target accessibility:** WCAG 2.2 AA.

## Release Milestones

| Milestone | Included Epics | Outcome |
|---|---|---|
| M1 | EP01, EP02, EP03 | Functional academic tracker |
| M2 | EP04, EP05 | Calendar and dashboard |
| M3 | EP06, EP07 | Study planning and focus sessions |
| M4 | EP08 | Catch-up workflow and complete MVP |

Cross-cutting technical tasks, such as initial NestJS setup, Prisma migrations, CI, error handling, and deployment, should be tracked as technical stories or tasks linked to the appropriate milestone.

### Technical Tasks

| Task | Title | Milestone | Jira |
|---|---|---|---|
| TECH-01 | Scaffold backend and frontend (monorepo, NestJS + Prisma + PostgreSQL, React + TS + Vite, CI) | M1 | STUDY-20 |
| TECH-02 | Configure linter and formatter (ESLint, Prettier, jsx-a11y, pre-commit hooks) | M1 | STUDY-21 |

## Out of Scope

The MVP excludes AI, syllabus parsing, LMS integrations, grade calculations, flashcards, social collaboration, and native mobile apps.

These can be considered after validating the initial planner with students.
