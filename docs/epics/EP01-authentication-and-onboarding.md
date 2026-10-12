# EP01: Authentication & Onboarding

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Backend:** NestJS + Prisma + PostgreSQL
**Frontend:** React + TypeScript + Vite
**Dependencies:** None. Foundational epic.

## Epic Summary

Implement secure student authentication, account management, and initial academic setup.

## Description

As a student, I want to create an account and configure my academic profile so that I can manage coursework and access my information across devices.

The system must support authenticated sessions and provide a simple first-time setup experience.

## Scope

- Account registration and login
- Secure session management
- Password reset
- Initial semester setup
- User preferences and time zone
- Onboarding progress

## Acceptance Criteria

- Students can register, authenticate, and sign out.
- Password reset is available.
- Unauthenticated requests cannot access protected academic data.
- Students cannot access or modify another student's records.
- Students can complete or resume initial setup.
- Account and academic settings persist between sessions.

## Proposed Stories

1. Implement user registration.
2. Implement login, logout, and session management.
3. Implement password reset.
4. Implement student profile and preferences.
5. Implement initial onboarding flow.

## Technical Notes

Use NestJS authentication guards, secure password handling or a managed authentication provider, and Prisma for user-related persistence. Add account-ownership checks to protected resources.
