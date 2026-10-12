# SP-105: Password Reset

**Story ID:** SP-105
**Epic:** [EP01: Authentication & Onboarding](../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Priority:** High / P0
**Dependencies:** SP-102, SP-103 (email provider)
**Jira key:** STUDY-7

## Summary

Implement a secure forgot-password/reset-password flow with single-use tokens and full session revocation on reset.

## Description

As a student, I want to reset a forgotten password so that I can regain access to my account.

## Acceptance Criteria

- `POST /auth/forgot-password` always returns the same generic success response whether or not the email is registered.
- Reset tokens are single-use, hashed at rest, and expire after 1 hour.
- `POST /auth/reset-password` with a valid token updates the password hash with the same policy as registration.
- A successful reset revokes every refresh token family for the account, forcing re-login on all devices.
- Used or expired tokens are rejected with an actionable message offering a new request.
- The frontend provides request and reset screens (reached from the email link), with loading, empty, and error states and keyboard accessibility.
- Reset flow is rate-limited per account and per IP.

## Technical Notes

- Prisma `PasswordResetToken` model: `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt`.
- Reuse the email provider interface from SP-103.
- Automated tests for: token single-use and expiry, session revocation on reset, generic response on unknown email, rate limiting.
