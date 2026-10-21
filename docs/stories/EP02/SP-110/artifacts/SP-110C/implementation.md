# SP-110C implementation record — Semester Integration and Sign-off

**Story:** [SP-110C](../../SP-110C-semester-integration-signoff.md) (parent [SP-110](../../README.md))
**Parent / review unit:** SP-110 — one combined parent review after A+B+C (`../SP-110/review.md`); this child is the named integration/index owner.
**Layer:** Integration (verification child — SP-106D/SP-107F precedent)
**Baseline:** `c5e3fb5` (SP-110B closeout — the commit before the first included change)
**Completed:** 2026-10-20, implementer, single sequential writer.
**Updated:** 2026-10-21 — DoD 10 human browser walk ratified (PASSED).
**Status:** Reviewed (combined SP-110 parent review PASS 2026-10-21)

## Summary

Verification-only child: **no production, schema, migration, harness,
`package.json` or CI change was made.** One new e2e spec proves the semester
management feature as a student journey over real HTTP against a real
PostgreSQL database (AC1 lifecycle, AC2 cross-student matrix, single-active
race); the automated suites were re-executed green on a disposable migrated
Postgres; the manual browser sign-off supporting DoD 10 was prepared (dev
stack + full HTTP pre-flight through the web proxy — all green), and the
browser-level walk — a **human gate** — was performed by the user on
2026-10-21 and returned approval (ratification recorded below, AC3); the
parent implementation index was written at `../SP-110/implementation.md`
(AC4).

## Deliverable

`apps/api/src/modules/semesters/semesters-e2e.spec.ts` (**new**) — real-app
harness (`test/test-http.ts`, `main.ts` parity; the harness already carries
the semesters + courses modules), students seeded through the real
`POST /auth/register` + `POST /auth/login`, self-skips when `DATABASE_URL`
is unset, cleanup cascades from the seeded users (verified: the database was
back to 0 users / 0 semesters / 0 courses after the run). The cases are
ordered as the student journey and each asserts on real rows via the harness
`prisma` handle (the wire omits `semesterId` on courses by contract, so the
row is the source of truth for attachment).

| Case | Claim proven |
|---|---|
| AC1 (7 tests) | `POST /semesters` ×2 (the SP-107B endpoint: exact 7-key shape, `isActive: false`, rows owned by A) → `GET /semesters` (both rows, `startDate` desc order, exact 8-key `SemesterWithCount`, `courseCount 0`, calendar dates on the wire) → `GET /semesters/:id` (8 keys, own semester) → `PATCH` rename + re-date (merged values on the wire **and** in the row) → `PATCH { isActive: true }` on Spring (single-active: exactly one active row for A — Fall deactivated in the same transaction, D110-1) → attach two courses to Fall (list reports `courseCount 2`) → `DELETE` Fall (204; the semester row is gone, both course rows **survive with `semesterId: null`**, D110-2) → the list re-derives to the remaining semester (active, `courseCount 0`). |
| AC2 (2 tests) | B's `GET` / `PATCH` / `DELETE` on A's semester id → **uniform 404 `Resource not found`** ×3; A's row **byte-identical** under an unscoped before/after read (no existence oracle, no partial write); B's list is empty and A's ids appear nowhere in the serialized body (wire-level scoping). |
| Single-active race (1 test) | Two **parallel** `PATCH { isActive: true }` on different semesters (a stale client + a fresh one) → both 200 with `isActive: true`; afterwards **exactly one** of A's semesters is active, it is one of the two raced targets, and the previously-active Spring is deactivated — the invariant, not a winner/loser error, is the contract (D110-1, last-write-wins). |

## Acceptance criteria verification

| AC | Status | Evidence |
|---|---|---|
| AC1 e2e full lifecycle (AC-E02-01, D110-1/2, DoD 8/10) | ✅ | e2e case AC1 (10/10 suite green on real Postgres) |
| AC2 cross-student matrix (AC-E01-04, DoD 3) | ✅ | e2e case AC2 (uniform 404 ×3, byte-identical row, wire-level scoping) + the dev-stack pre-flight below |
| AC3 manual browser sign-off (DoD 10) | ✅ **PASSED** (ratified 2026-10-21) | The 13-step `/semesters` browser walk performed by the user 2026-10-21 — approved, no deviations reported (browser/version not provided — recorded limitation). Recorded CANNOT VERIFY at closeout (2026-10-20) until the human leg landed; see below. The dev-stack HTTP pre-flight + e2e wire proof stand alongside it. |
| AC4 parent index | ✅ | `../SP-110/implementation.md` (this commit) |

## Verification actually executed

### Disposable migrated Postgres (automated proof)

Target: an **ephemeral** `postgres:15-alpine` container (port 5433),
migrations applied via `prisma migrate deploy` (no pending), removed after
the run — no shared or persistent database touched. `.env`/`.env.local` were
never read or displayed and no connection string or token was printed.

| Check | Command (cwd: repo root) | Result |
|---|---|---|
| New e2e spec | `DATABASE_URL=<disposable 5433 db> pnpm --filter @studypilot/api exec jest --runInBand semesters-e2e` | **1 suite / 10 tests passed** (all cases, first run) |
| Full API suite (with DB) | `DATABASE_URL=<disposable 5433 db> pnpm --filter @studypilot/api exec jest --runInBand` | **34/34 suites, 456/456 tests passed, 0 skipped** (baseline 33/446 after SP-110A; + this spec's 10) |
| Full API suite (no DB) | `pnpm --filter @studypilot/api exec jest --runInBand` | 26 suites pass, **8 integration suites self-skip** (112 tests, incl. this spec), 344 pass — the bare local path works |
| Typecheck | `pnpm --filter @studypilot/api typecheck` | clean |
| Lint / format | `pnpm --filter @studypilot/api lint` (`--max-warnings 0`) + `prettier --check` | clean (an `eslint --fix` pass applied 2 formatting fixes to the new spec) |
| Self-cleaning | row counts after the run | **0 users / 0 semesters / 0 courses** — the suite cascades from the seeded users |

### Dev-stack HTTP pre-flight (AC3 wire leg — performed)

Environment: the dev stack — local PostgreSQL (migrated dev DB), `pnpm
--filter @studypilot/api dev` (API `:4000`), `pnpm --filter @studypilot/web
dev` (web `:3000`; the vite proxy forwards `/api/*` → `:4000` with the prefix
stripped). Every request below went **through the web proxy** at
`http://localhost:3000/api` — the same path the browser takes. All green:

| Step | Result |
|---|---|
| Register + login A and B | 201 / 200 with `accessToken` (both) |
| A: create Fall + Spring semesters | 201 (7-key shape, `isActive: false`) |
| A: `GET /semesters` | 2 rows, `startDate` desc, 8 keys, `courseCount 0` |
| A: `GET /semesters/:id` (Fall) | 200 |
| A: `PATCH` rename + re-date | 200 (merged values returned) |
| A: `PATCH { isActive: true }` (Spring) | 200; the wire shows **exactly one** active semester |
| A: attach 2 courses to Fall (`POST /courses`) | 201 (both) |
| A: `DELETE` Fall | 204 |
| A: `GET /semesters` after the delete | Spring only, active, `courseCount 0` |
| B: `GET` / `PATCH` / `DELETE` on A's Spring | **404 `Resource not found`** ×3 (uniform; no existence oracle) |
| Unauthenticated `GET /semesters` | 401 |
| `GET /semesters` (the SPA route, no `/api` prefix) | 200 — the SPA shell (`id="root"`, the 3 module scripts), i.e. the route is served and protected by the app, not the API |

Row-level proof on the dev DB (unscoped read, then cleanup): Spring active
and untouched by B's attempts; both courses **orphaned** (`semesterId:
NULL`) and surviving. The two pre-flight users were then deleted; the dev DB
was restored to its pre-run state (4 users, 1 semester, 0 courses;
`refresh_tokens` untouched at 11). Both dev servers were stopped and the
disposable container removed.

## Manual browser sign-off (DoD 10, AC3) — **PASSED** (ratified 2026-10-21)

**Status: PASSED.** The manual browser walk (the 13 steps below) was
performed by the user on 2026-10-21 and returned approval: the `/semesters`
walk passed with **no deviations reported**. Provenance: who — the user
(session owner); when — 2026-10-21; browser/version — **not provided**
(recorded limitation: the approval is at the feature level, per the user's
report); per-step observations — none reported.

**History:** at closeout (2026-10-20) this sign-off was recorded
**CANNOT VERIFY** — the walk is a **human gate** (per the
SP-105D/SP-106D/SP-107F precedent) and no human browser session was
available in the implementation runtime; per the ticket's own rule it was
recorded CANNOT VERIFY with the reason rather than claimed, and no sign-off
was claimed or implied until the ratification above. What the implementer
**performed** and stands on its own regardless: the dev-stack bring-up + the
full HTTP pre-flight above (the wire leg of the same journey) and the
automated proof (the e2e suite + the A/B component and API tests).

### Exact steps the human must perform

Environment: the dev stack — local PostgreSQL (migrated; the running dev DB
is fine), `pnpm --filter @studypilot/api dev` (API `:4000`), `pnpm
--filter @studypilot/web dev` (web `:3000`), the app reading its
`.env.local`.

1. **Register** a brand-new account and **log in**. If the onboarding wizard
   (SP-107) is offered, complete or skip it to reach the app — optionally
   create a course in wizard step 3 (its semester will later show "1 course"
   in the list, which exercises the course-count display). Note: the account
   is unverified, so the email-verification banner may show.
2. Open **`/semesters`** via the header **"Semesters" link** — confirm the
   link is present when authenticated and carries the active highlight on
   `/semesters`.
3. **Empty state:** with no semesters yet, confirm the "No semesters yet"
   message + the create CTA.
4. **Create:** open the form; enter a name + start/end dates; confirm the
   **end-before-or-equal-start** validation shows a field error and saves
   nothing; save → the new semester appears in the list (the list re-reads
   from the API).
5. **Create a second semester** (a different name).
6. **Edit:** open edit on one row → confirm the form is **pre-filled**;
   rename + change the dates; save → the row updates in place with the merged
   values.
7. **Activate:** click **"Set as active"** on one row → the list re-reads and
   the **Active badge appears on exactly one row** (single-active, D110-1);
   then **Deactivate** it → the badge disappears.
8. **Course count:** confirm each row shows its course count ("0 courses" for
   the new ones; "1 course" for the onboarding semester from step 1, if you
   created one).
9. **Delete:** click **Delete** on a row → the dialog names the semester and
   warns that its courses are **not** deleted (they remain, unaffiliated —
   D110-2); focus starts on **Cancel**; **Tab/Shift+Tab cycle inside the
   dialog**; **Escape cancels** (confirm no request is sent); **Confirm** →
   the row is removed and the success status is announced.
10. **Keyboard pass:** repeat create → edit → activate → delete using the
    keyboard only (Tab order through list → form → dialog; no mouse).
11. **Error state:** stop the API, reload `/semesters` → the error state +
    **retry** appears; restart the API and retry → the list loads.
12. **Mobile viewport:** repeat the core walk (list, create, activate,
    delete) at a mobile viewport — actions reachable, the dialog fits, no
    horizontal scroll.
13. **Return approval** with the browser/version used and per-step
    observations (or the deviations observed).

### Closure (SP-106/SP-107 precedent)

The human gate is now satisfied: the user performed the walk above, and the
ratification with provenance is recorded in the Status block (who/when/
limitations — browser/version not provided), exactly as SP-106D's and
SP-107F's sign-offs were transcribed. DoD 10 closes via that recorded
ratification **plus** the combined SP-110 parent review (pending — report at
`../SP-110/review.md`); until that review passes, the review unit is not
signed off.

## Findings / deviations

| ID | Description | Disposition |
|---|---|---|
| F110C-1 | `prisma:error` P2025 log lines from `semesters.service.ts:285` (the scoped `semester.delete()` inside the delete transaction) appear in the API log on the uniform-404 delete path (e.g. B's DELETE on A's semester in the pre-flight). The service **intentionally** converts P2025 → uniform 404 `Resource not found` and the transaction rolls back — the log line is Prisma's internal error logging, not a defect; the row-level proof shows no partial write. | Recorded — no action. The behavior is pinned by A's unit + data-scoping specs and by this e2e (uniform 404, byte-identical row). Silencing the log would be cosmetic and is out of this child's verification scope. |
| F110C-2 | The first draft of the pre-flight script contained a zsh bug — a `${M:PATCH}` substring modifier in the cross-student matrix loop corrupted the request method. | Fixed (process-level): the matrix leg was re-run with a corrected inline command; all matrix results in the pre-flight table above are from the corrected run. No product code involved. |

**Product defects in A–B: none.** Every e2e case and every pre-flight step
passed on the first (corrected) run; no finding was raised against the
owning children and no fix was needed in this child (ticket rule: only a
harness-wiring defect would be fixed here — none occurred).

No Jira mutation occurred (child key remains `Pending creation`).

## Commit scope

One scoped commit on `main` (baseline `c5e3fb5`):
`apps/api/src/modules/semesters/semesters-e2e.spec.ts` (new),
`docs/stories/EP02/SP-110/artifacts/SP-110C/` (checkpoint + this record),
`docs/stories/EP02/SP-110/artifacts/SP-110/implementation.md` (parent index,
AC4), `docs/stories/EP02/SP-110/README.md` (execution fields only — queue row
C, Active/Next), `docs/stories/EP02/SP-110/SP-110C-semester-integration-signoff.md`
(status line only). The commit hash is recorded in the queue row and the
returned handoff (not amended into this record).

## Remaining work (outside this child)

- **Combined SP-110 parent review** (one review after all children; report at
  `../SP-110/review.md`) — the implementer has prepared the parent index;
  the coordinator requests the independent review. DoD 10 closes via the
  recorded ratification (2026-10-21) **plus** this review; no other DoD
  input is open.
