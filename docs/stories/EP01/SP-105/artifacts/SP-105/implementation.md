# SP-105 parent implementation index

Updated: 2026-10-16 America/New_York
Prepared by: implementer (single sequential writer) after SP-105D completion.
Purpose: index of every child's implementation evidence for the one combined
SP-105 parent review. The review report, when the read-only reviewer returns,
is saved at `./review.md` (this directory).

## Status

All ten children — A, B, C, E, F, G, H, I, J and D — are implemented and are
hereby handed to the combined SP-105 parent review. No child review has been
performed or asserted and none replaces this sign-off. SP-105 covers password
reset end to end (original ACs 1–7; see the parent README traceability).

## Child evidence index

| Story | Delivered | Implementation | Checkpoint |
|---|---|---|---|
| [A](./../SP-105A-password-reset-backend-issuance.md) | Reset-token issuance, SHA-256 at rest, 1-h TTL, per-account 60 s cooldown, uniform generic 200, async SMTP | [implementation](./SP-105A/implementation.md) (historical [review](./SP-105A/review.md)) | — |
| [B](./../SP-105B-password-reset-backend-redemption.md) | Owner-first atomic redemption, cookie expiry post-commit, uniform token-400 | [implementation](./SP-105B/implementation.md) (historical [review](./SP-105B/review.md)) | — |
| [E](./../SP-105E-auth-session-coordination.md) | Shared login/refresh/reset owner-first coordination, snapshot rechecks | [implementation](./SP-105E/implementation.md) | [checkpoint](./SP-105E/checkpoint.md) |
| [F](./../SP-105F-password-reset-ip-limits.md) | Shared rolling per-IP limits (10 forgot / 30 reset per min), Retry-After | [implementation](./SP-105F/implementation.md) | [checkpoint](./SP-105F/checkpoint.md) |
| [G](./../SP-105G-recovery-session-client.md) | Shared frontend recovery-session boundary (drain barrier, generations, sanitization) | [implementation](./SP-105G/implementation.md) | [checkpoint](./SP-105G/checkpoint.md) |
| [C](./../SP-105C-password-reset-frontend-ui.md) | `/forgot-password` and `/reset-password` screens with retry/announcement handling | [implementation](./SP-105C/implementation.md) | [checkpoint](./SP-105C/checkpoint.md) |
| [H](./../SP-105H-postgres-test-harness.md) | Guarded real-PostgreSQL harness (fixtures, holds, blocking observation) | [implementation](./SP-105H/implementation.md) | [checkpoint](./SP-105H/checkpoint.md) |
| [I](./../SP-105I-credential-race-tests.md) | Credential race/expiry/rollback suite (15 cases) | [implementation](./SP-105I/implementation.md) | [checkpoint](./SP-105I/checkpoint.md) |
| [J](./../SP-105J-limiter-integration-tests.md) | Shared-limiter race/window/stale-cleanup suite (8 cases) | [implementation](./SP-105J/implementation.md) | [checkpoint](./SP-105J/checkpoint.md) |
| [D](./../SP-105D-password-reset-integration.md) | Integrated sign-off: suite execution, manual browser/SMTP smoke (D6), DoD 10, AC6 timing (D8), parent index | [implementation](./SP-105D/implementation.md) | [checkpoint](./SP-105D/checkpoint.md) |

## Integrated verification (SP-105D, recorded 2026-10-16)

- All six migrations applied to a disposable real PostgreSQL 15 and to the dev
  database; H/I/J suites executed unchanged: **3 suites / 26 tests, zero skips**
  (`git` commit evidence in D's artifacts). Ordinary API suite 20/237 green
  (18 pre-existing declared skips), web 11 files / 142 tests green, typechecks clean.
- Manual cross-layer smoke performed by the human per D6; blanket approval
  returned ("approved everything looks good."), with honestly recorded
  limitations (no per-step granular return, browser/version unspecified).
- SMTP delivery proven live through Mailpit; SMTP shown off-path (responses
  unchanged with SMTP refused). AC6 bounded timing per path class with min/
  median/max and a disclosure-first security assessment (no constant-time claim).

## Known gates (do not block review; recordings, not blockers for sign-off text)

- **SP-103 integrated evidence (D7):** SP-103's outstanding integrated DoD 1/7/10
  evidence remains a feature/release gate recorded in D's artifact and the
  parent README queue. It is separate from SP-105's implementation sign-off.
- SP-103 integrated sign-off is likewise tracked upstream for the feature
  release; the combined review may weigh it but must not silently absorb it.
- Jira keys remain Pending creation; no tracker sync was authorized or performed.

## Reviewer inputs

- Shared contract: [SP-105 parent](../../SP-105-password-reset.md) (shared API
  contract section); AC/TR/DoD maps in the parent README.
- Suite entry point: `pnpm --filter @studypilot/api run test:integration --runInBand`
  with a disposable migrated `TEST_DATABASE_URL` whose database name ends in
  `_test` (H's invocation contract).
- Where this parent's verdict is recorded: `./review.md`.
