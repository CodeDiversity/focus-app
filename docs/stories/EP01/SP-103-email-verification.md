# SP-103: Email Verification (Non-Blocking)

**Story ID:** SP-103
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** Medium / P1
**Dependencies:** SP-101
**Jira key:** STUDY-12

## Summary

Send a verification email after registration, confirm it via a single-use token, and show a dismissible banner to unverified students without blocking login.

## Description

As a student, I want my email verified so that account recovery works, without being blocked from using the app while I wait for the email.

## Acceptance Criteria

- Registration creates a single-use verification token (hashed, TTL 24 hours) and sends a verification link.
- Confirming the link marks `emailVerifiedAt` on the user.
- Used or expired tokens are rejected with an actionable message offering a resend.
- `POST /auth/resend-verification` is rate-limited (at most 1 per minute per account) and returns a generic success response.
- Unverified students can log in and use all features.
- The frontend shows a dismissible "verify your email" banner with a resend action until verified.
- Invalid email input on resend is handled with actionable messages.

## Technical Notes

- Prisma `EmailVerificationToken` model: `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt`.
- Email delivery behind a provider interface: log the link in development, SMTP via environment configuration in production. No vendor lock-in in the MVP.
- Do not reveal whether an email is registered in any endpoint response.
- Automated tests for: token single-use, expiry, resend rate limit.
