# EP02: Semester & Course Management

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Dependencies:** EP01

## Epic Summary

Allow students to organize their academic semesters, courses, and recurring class schedules.

## Description

As a college student, I want to manage my semesters and courses so that I have a central location for academic information and class schedules.

## Scope

- Create and manage semesters
- Add, edit, and archive courses
- Associate courses with semesters
- Store course information, including instructor details
- Configure recurring weekly classes
- View course details and associated assignments

## Acceptance Criteria

- Students can create semesters with start and end dates.
- Courses belong to a valid semester owned by the student.
- Students can create and edit course information.
- Students can add recurring class meetings with start and end times.
- Archived courses remain accessible with historical data.
- Course details display related assignments and class meetings.

## Proposed Stories

1. Create and manage semesters.
2. Create a course.
3. Edit course information.
4. Archive and restore courses.
5. Manage recurring class meetings.
6. Implement the course list and course detail views.

## Technical Notes

Create `Semester`, `Course`, and `ClassMeeting` Prisma models. Implement NestJS modules with ownership validation, REST endpoints, and request DTOs.
