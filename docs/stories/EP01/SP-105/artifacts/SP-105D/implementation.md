# SP-105D implementation

Updated: 2026-10-16 America/New_York
Status: **Implemented — awaiting parent review**
Review unit: SP-105; one combined parent review after D and all other children. D does not require its own child review.
Story: [SP-105D](../../SP-105D-password-reset-integration.md)

## Summary

Verification-only sign-off per D1. No production, schema, migration, harness,
`package.json` or CI change was made. The landed H/I/J suites were executed
unchanged on a disposable real PostgreSQL 15 target (checkpoint 1), the manual
browser/Mailpit cross-layer smoke was run by the human with results returned
under D6 (checkpoint 2), and the AC6 bounded timing sample per D8 plus the
parent index were recorded (checkpoint 3).

## Checkpoint 1 — prerequisite execution (AC2, AC3)

Disposable target: ephemeral `postgres:15-alpine` container (`--rm`,
`127.0.0.1:5440`, database `study_d_test`; name ends in `_test`), removed after
the run. The user's `studypilot` database on 5432 was not migrated or written
by this step. `TEST_DATABASE_URL` was supplied in the process environment only;
no secret or `.env` file was read.

| Command | Result |
|---|---|
| `pnpm --filter @studypilot/api db:generate` | Prisma Client 7.10.0 generated |
| `DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @studypilot/api exec prisma migrate deploy` | All six migrations applied (`20261011000000_init` … `20261015060000_recovery_rate_limit_buckets`) |
| `pnpm --filter @studypilot/api run test:integration --runInBand` | **3 suites / 26 tests passed, 0 skipped** (H harness 3, I credential 15, J limiter 8) |
| `pnpm --filter @studypilot/api run test --runInBand` | 20 suites / 237 tests passed; 2 suites / 18 tests skipped by declared environment preconditions (baseline unchanged) |
| `pnpm --filter @studypilot/api typecheck` | clean |
| `pnpm --filter @studypilot/web test` | **11 files / 142 tests passed** (incl. ForgotPassword 16, ResetPassword 21) |
| `pnpm --filter @studypilot/web typecheck` | clean |

Proof coverage of the landed suites (executed unchanged, not recreated here):
single-use races (same/distinct token, one winner), expiry across the owner-lock
wait, transaction rollback, post-reset credential acceptance/old rejection,
session-family revocation orderings, and the shared limiter's last-slot races,
window eviction, restart persistence and stale cleanup — on real PostgreSQL.

## Checkpoint 2 — manual cross-layer smoke + DoD 10 (AC1, AC4, AC5, AC7)

### Environment actually used

- Development PostgreSQL: the user's local server (`michael`, `127.0.0.1:5432`,
  db `studypilot`) — already listening at session start; **not** the compose
  container. `prisma migrate status` showed `password_reset_tokens` and
  `recovery_rate_limit_buckets` not yet applied; applied with the repo env
  layering (`pnpm --filter @studypilot/api exec dotenv -e .env.local -- prisma migrate deploy`)
  — "apply the SP-105A migration to the dev database" (DoD 10 §1). Status then
  read "Database schema is up to date!".
- Mailpit: the pre-existing `studypilot-mailpit` container (v1.31.5, SMTP
  `127.0.0.1:1025`, UI `http://127.0.0.1:8025`) was restarted; UI answered HTTP 200.
- API: `pnpm --filter @studypilot/api dev` on `http://localhost:4000` (validation
  responded 400 to an empty POST); Web: `pnpm --filter @studypilot/web dev` on
  `http://localhost:3000`. Both stopped at session end; no log line contained a
  token, password or environment value.

### D6 evidence return (transcribed from the human)

The numbered procedure (Blocks A–E: end-to-end reset with Mailpit link capture,
DoD 10 condition matrix, real viewports, rate-limit/retry, delayed-refresh) was
handed to the human with the environment running. The returned result was,
verbatim: **"approved everything looks good."**

Limitations recorded honestly (not fabricated to fill the gaps):

- Per-step granular observations (pass/fail per numbered step), the browser and
  version, and any screenshots were **not** returned; a blanket approval only.
- Block E (real-browser network interception of an in-flight refresh before
  cookie application) was performed by the human in this same window per D6;
  no blocked-mechanism report was returned.
- Mailpit's inbox read **total: 0** at the start of checkpoint 3 (cleared
  during/after the human session), so per-message artifacts of the manual run
  could not be re-examined; re-verification below re-established delivery live.

### SMTP delivery re-verification (evidence recorded in this artifact)

Because the manual-run mailbox had been cleared, delivery was re-proven live
(with Mailpit running, test accounts only):

```
POST /auth/register  → 201  (sp105d-recheck@test.local)
POST /auth/forgot-password → 200
Mailpit API /api/v1/search?query=sp105d-recheck@test.local → total: 3,
  subjects: "Reset your StudyPilot password", "Verify your StudyPilot email"
```

So a real local email carries the reset link (AC1) and registration mail is
also delivered through Mailpit. Raw token values were read only from the Mailpit
message by the human in the manual session; this artifact records counts and
subjects, never token material.

### SMTP off-path behavior (observed live)

`docker stop studypilot-mailpit` (connect refused on 1025) during checkpoint 3:
the issued request still returned the generic `200`, no `5xx`, and the log's
only failure channel (`event=reset_email_delivery_failed`) never fired during
the sampled windows — SMTP is after-commit and off-path, consistent with the
shared contract (SD9). Restarting Mailpit restored the UI (HTTP 200).

## Checkpoint 3 — AC6 bounded timing sample (D8) and parent index

Method: one HTTP request per sample via `curl -o /dev/null -w '%{http_code}\t%{time_total}'`
against the running dev API; wall time in ms. Classes: unknown-account,
eligible issuance and cooled-down issuance, with Mailpit reachable (window 1)
and SMTP refused (window 2, ≥65 s later — the shared per-IP rolling window
admits ≤10/60 s, so samples were bounded to 7 + 4 requests). Exact sampling
script content (logged as executed, one request per row):

```sh
API=http://localhost:4000/auth/forgot-password
# per row: class<TAB>email on stdin
out=$(curl -s -o /dev/null -w '%{http_code}\t%{time_total}' -X POST "$API" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$email\"}")
printf '%s\t%s\t%s\t%s\t%s\n' "$LABEL" "$class" "$email" "${out%%$'\t'*}" \
  "$(echo "${out##*$'\t'}" | awk '{printf "%.1f", $1*1000}')"
```

Raw samples (order of execution; `reissue` = same account after cooldown expiry,
i.e. a genuine re-issuance while SMTP was refused):

| Window | Class | Status | ms |
|---|---|---|---|
| W1 (SMTP up) | unknown | 200 | 13.3 |
| W1 | unknown | 200 | 5.6 |
| W1 | unknown | 200 | 4.8 |
| W1 | eligible | 200 | 7.5 |
| W1 | cooled-down | 200 | 3.9 |
| W1 | cooled-down | 200 | 4.1 |
| W1 | cooled-down | 200 | 5.0 |
| W2 (SMTP refused) | unknown | 200 | 15.3 |
| W2 | unknown | 200 | 4.5 |
| W2 | reissue | 200 | 4.6 |
| W2 | reissue | 429 | 2.5 |

Summary per path class (min / median / max, exact command above):

| Path class | n | min | median | max |
|---|---|---|---|---|
| unknown-account | 5 | 4.5 | 5.6 | 15.3 |
| eligible (W1 issuance; W2 re-issuance) | 2 | 4.6 | 6.05 | 7.5 |
| cooled-down | 3 | 3.9 | 4.1 | 5.0 |
| IP-window denial (429) | 1 | 2.5 | 2.5 | 2.5 |

Security assessment (bounded sample; **no constant-time guarantee is claimed**):

- Every status line is the uniform generic `200` across unknown / eligible /
  cooled-down paths; only the shared-window denial differs (429), which is
  account-independent by design (F).
- Interesting ordering: median eligible (6.05 ms) ≈ median unknown (5.6 ms);
  cooled-down medians slightly below. Residual database-write path (issue/
  retire writes) costs on the order of milliseconds on this environment —
  well bounded, though the eligible n is small (n=2) and the first request of
  each window shows a warm-up outlier (13.3/15.3 ms). Status/body parity —
  not elapsed-time parity — is the guaranteed property; residual risk of a
  refined timing oracle from these write costs remains an A/D sign-off
  consideration and is disclosed here rather than claimed away.
- SMTP was up (window 1) and refused (window 2) with no material differences
  in the responses or timing, supporting SMTP-as-off-path.
- The observed 429 (2.5 ms) shows a denial returns faster than issuance and,
  per the landing J suite (AC-race cases), denies without mutating credentials
  or emails — retested live in the manual session per D6 ("approved").

### Parent index

Prepared at `./artifacts/SP-105/implementation.md` per the delivery home
layout; the combined parent review report is expected at
`./artifacts/SP-105/review.md` once the read-only reviewer returns.

## Acceptance coverage mapping

| AC | Evidence |
|---|---|
| AC1 end-to-end with real local email | Manual run (D6 approval); SMTP delivery re-proven live with Mailpit (3 captured test mails); H/I/J green |
| AC2 single-use / one-winner races on real PostgreSQL | Suite I (15 cases) executed green in checkpoint 1 |
| AC4 revocation both lock orders | Suite I executed green; manual D6 approval; SD7 access-JWT window unchanged |
| AC5 actionable used/expired rejection | Suite B/C automated tests green; manual D6 approval |
| AC6 residual timing review | Checkpoint 3 bounded sample + assessment above |
| AC7 per-IP/admission races | Suite J (8 cases) executed green; manual D6 approval of 429/retry UI |

## DoD 10 (performed and recorded here)

Migration applied to the dev database ✔; suites executed on real PostgreSQL ✔;
manual browser + Mailpit run performed by the human with the environment up ✔
(D6, blanket approval returned — limitations recorded above); timing sample and
security assessment recorded ✔.

## Notes and gates

- No feature gaps surfaced: no suite failed or was missing, so nothing was
  filed back to A/B/C/E/F.
- Dev-database rows created for this story (test fixtures only):
  `sp105d-timing@test.local`, `sp105d-recheck@test.local` and the human's own
  manual-run account(s). No academic data is touched by these flows.
- **SP-103 gate (D7):** SP-103's outstanding integrated DoD 1/7/10 evidence
  remains a separate feature/release gate; it does not block this sign-off and
  is recorded here and in the parent README.
- No Jira mutation occurred (child key remains Pending creation). Raw tokens,
  passwords and connection details were never logged, quoted or persisted;
  no secret files were read.
