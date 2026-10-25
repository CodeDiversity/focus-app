# SP-117: Auth Journey Coverage

**Story ID:** SP-117
**Epic:** [EP09: E2E Test Automation](../../epics/EP09-e2e-test-automation.md)
**Dependencies:** SP-116
**Status:** Queued

## Summary

Extend E2E coverage to the remaining auth journeys: registration, session
persistence across reload, logout, and the protected-route redirect.

## Scope / acceptance criteria

1. Registering a new account through the UI lands the user in the
   authenticated app (registration → session).
2. A logged-in session survives a page reload (token/cookie persistence).
3. Logging out returns to the login page; the protected route then redirects
   to login instead of rendering.
4. Visiting a protected route while logged out redirects appropriately.
5. Invalid login shows an actionable error (covered minimally by SP-116;
   extend here only if SP-116 kept it minimal).

## Notes

- Reuses the SP-116 infrastructure; no new config.
- Keep each journey an independent test with its own data (unique emails).

## Sizing

~1 hour. Tests only.
