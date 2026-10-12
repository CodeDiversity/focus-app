# SP-101: User Registration

**Story ID:** SP-101
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** High / P0
**Dependencies:** None (first story)
**Jira key:** STUDY-6

## Summary

Allow a student to create an account with display name, email, and password, with hashed credentials stored and validated input on both frontend and backend.

## Description

As a student, I want to register an account so that I can save my academic information and access it across devices.

## Acceptance Criteria

- Students can register with display name, email, and password via `POST /auth/register`.
- Passwords are hashed with argon2id; plaintext passwords are never stored or logged.
- Duplicate email returns 409 with an actionable message.
- Weak passwords (fewer than 8 characters) and malformed emails/names are rejected by frontend and backend validation with actionable field-level messages.
- Successful registration returns 201 with the created student (id, name, email) and no password data.
- Registration does not issue session tokens; the student is redirected to login (see SP-102).
- The register form handles loading and error states and is keyboard accessible.

## Technical Notes

- Prisma `User` model: `id`, `name`, `email` (unique), `passwordHash`, `emailVerifiedAt` (nullable), `createdAt`, `updatedAt`.
- Use class-validator DTOs on the backend and mirrored validation in the React form.
- Password policy: minimum 8 characters, no composition rules (NIST-style).
- Email sending is SP-103; this story does not send mail.

## Existing scaffold code (from STUDY-20)

The TECH-01 scaffold pre-placed a working registration flow. This story completes and corrects it rather than starting from scratch:

- `apps/api/src/modules/auth/` — `POST /auth/register` with validation, duplicate-email 409, and tests in `auth.service.spec.ts`.
- `apps/web/src/pages/Register.tsx` — validated form with loading and error states.

Deltas this story must resolve against the acceptance criteria:

- Hashing uses **bcrypt**; locked decision D1 and this story require **argon2id** — swap the hash in `AuthService` and its spec.
- The scaffold's register returns a JWT immediately; this story requires registration to issue **no tokens** (redirect to login; tokens are SP-102).
- The `User` model uses `firstName`/`lastName` and `isVerified`; this story specifies a `name` field and nullable `emailVerifiedAt` — align the Prisma model, DTOs, and UI.
