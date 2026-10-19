# SP-107F implementation record — Onboarding Wizard Integration Verification

**Story:** [SP-107F](../../SP-107F-wizard-integration.md) (parent [SP-107](../../README.md), Jira STUDY-8)
**Completed:** 2026-10-18 (dispatch `SP107-implementer-F`)
**Status:** Implemented — awaiting parent review (combined SP-107 review)
**Review unit:** SP-107 — one combined parent review after all children (A–F); this child is the named integration/index owner.
**Baseline:** `3dfa317` (HEAD at dispatch; `14e7a25` = SP-107E plus one coordinator bookkeeping commit — see F-107F-1).

## Summary

Verification-only child (SP-106D precedent): **no production, schema,
migration, harness, `package.json` or CI change was made.** One new e2e spec
proves the whole wizard as a student journey over real HTTP against a real
PostgreSQL database (AC1–AC6); the automated suites were re-executed green;
the manual browser sign-off supporting DoD 10 **cannot be performed in this
implementation runtime** and is recorded **CANNOT VERIFY** with the exact
human steps and the established closure path (AC7); the parent implementation
index was written at `../SP-107/implementation.md` (AC8).

## Deliverable

`apps/api/src/modules/onboarding/onboarding-e2e.spec.ts` (**new**) — real-app
harness (`test/test-http.ts`, `main.ts` parity; the harness already carries
`OnboardingModule`/`SemestersModule`/`CoursesModule` from SP-107A/B —
F-107F-2), students seeded through the real `POST /auth/register` +
`POST /auth/login`, self-skips when `DATABASE_URL` is unset, cleanup cascades
from the seeded users (verified: dev DB back to its pre-run state after the
run).

| Case | Claim proven |
|---|---|
| AC1 (1 test) | Register → login → `GET /onboarding` (exact fresh state + exact key set) → step 1 (`PATCH /users/me` + `PATCH /onboarding { step: 2 }`) → step 2 (`POST /semesters` 201 with `yyyy-MM-dd` dates, `isActive: false` + `PATCH /onboarding { step: 3, semesterId }`) → step 3 (`POST /courses` 201 + `PATCH /onboarding { completed: true }`) → final `GET` (completed, stored semester resolves). Real rows asserted via the harness `prisma` handle: the semester is owned by the student with the calendar dates; the course is owned by the student **and attached to the onboarding semester** (`course.semesterId === semester.id` — the response omits `semesterId` by contract, so the row is the source of truth). |
| AC2 (1 test) | Mid-flow (step 2): a fresh `GET` (reload) reports the saved step; a **real `POST /auth/logout`** (session revoked — old refresh cookie 401s on `/auth/refresh`, the new one 200s) + **fresh real login** reads back the saved step; the row (unscoped read) is the source of truth. |
| AC3 (1 test) | From step 2, `PATCH { completed: true }` → 200 terminal; reload shows `completed: true` with **no stored semester**; `semester.count` and `course.count` for the student are both **0** — completion without the optional data. |
| AC4 (2 tests) | Both completed students (full-flow A, skipped B): every `PATCH /onboarding` shape (`{ completed: true }`, `{ step: 1 }`, `{ semesterId }`) → **409** with the terminal message; neither state re-opens. Entry points: a **fresh login** session `GET`s `completed: true` — the decision input both frontend entry points (login redirect, `/onboarding` route, SP-107C) consume to resolve to the app, never the wizard (the redirect behavior itself is pinned by SP-107C's component tests in the web suite). |
| AC5 (3 tests) | A's `GET` returns only A's state (exact key set; no B id/email anywhere in the body); smuggling `userId` → 400 `errors.userId` (global `forbidNonWhitelisted`); A's terminal write 409s and **B's full user row is byte-identical** (unscoped before/after). A's `POST /courses` with B's semester id → **uniform 404 `Resource not found`**, no course row (count unchanged), B's semester row byte-identical (no existence oracle). A and B each create a semester with the **same name** (both 201; `findMany` → exactly 2 rows, one per student — per-student `@@unique([userId, name])`); A duplicating **A's own** name → **409**. |
| AC6 (2 tests) | A row seeded in the **backfill shape** (completedAt set, step 1 — the migration's one-shot `UPDATE … = now()`; real argon2id hash, real login) is terminal: `GET` → `completed: true` (wizard never offered), any `PATCH` → 409. A registration created **after** the migration starts at `step 1 / completed false / semesterId null` (wire + row). |

## Acceptance criteria verification

| AC | Status | Evidence |
|---|---|---|
| AC1 complete flow (AC-107-01/06/07, AC-E01-06) | ✅ | e2e case AC1 (10/10 suite green, real Postgres) |
| AC2 resume (AC-107-02/03, TR-107-01) | ✅ | e2e case AC2 (reload + real sign-out/in + row) |
| AC3 skip (AC-107-04, TR-107-02) | ✅ | e2e case AC3 (terminal, zero semester/course rows) |
| AC4 terminal (AC-107-05, TR-107-03) | ✅ | e2e cases AC4 (409 matrix + entry-point input on a fresh login) |
| AC5 cross-student isolation (AC-E01-03/04, TR-107-01…04) | ✅ | e2e cases AC5 (byte-identical row, uniform 404, per-student unique) |
| AC6 backfill (D107-2) | ✅ | e2e cases AC6 (backfill-shape row terminal; post-migration registration step 1) + dev-DB counts below |
| AC7 manual browser sign-off (DoD 10, AC-107-08) | ⛔ **CANNOT VERIFY** | See below — no human browser session in this implementation runtime |
| AC8 parent index | ✅ | `../SP-107/implementation.md` (this commit) |

## Verification actually executed

Target: the local dev PostgreSQL (port 5432, database `studypilot`, 9/9
migrations — coordinator-verified, `prisma migrate status` → "Database schema
is up to date!"), used only through `DATABASE_URL` supplied in the process
environment via the `dotenv -e .env.local` wrapper. `.env`/`.env.local` were
never read or displayed and no connection string or token was printed. The
specs self-clean: post-run the DB holds the same 3 users, 0 semesters, 0
courses, 0 `studypilot-test.invalid` rows.

| Check | Command (cwd) | Result |
|---|---|---|
| Migration state | `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx prisma migrate status` (repo root) | 9 migrations, no pending |
| Backfill counts (AC6, read-only) | `dotenv -e .env.local` + `psql` (query string stripped of Prisma-only URL params) | **3 users / 3 `onboardingCompletedAt` set / 0 null**; 2 rows pre-migration (both backfilled at the migration's `now()`, 2026-10-18 14:14:20 UTC); see the anomaly note below |
| New e2e spec | `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest onboarding-e2e --runInBand` (repo root) | **1 suite / 10 tests passed** |
| Full API suite | `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest --runInBand` (repo root) | **33/33 suites, 400/400 tests passed, 0 skipped** (baseline 32/390 after SP-107E; + this spec's 10) |
| Full web suite | `pnpm --filter @studypilot/web exec vitest run` (repo root) | **26/26 files, 283/283 tests passed** (SP-107E baseline — no regression) |
| Typecheck | `pnpm --filter @studypilot/api typecheck` / `pnpm --filter @studypilot/web typecheck` | clean (both) |
| Lint | `pnpm --filter @studypilot/api lint` / `pnpm --filter @studypilot/web lint` | clean (both, `--max-warnings 0`; the API `--fix` pass modified no files) |

### Backfill record (AC6, D107-2)

- **Pre-migration rows:** 2 of the 3 dev-DB users pre-date the onboarding
  migration (`20261018215837_user_onboarding_state`, applied
  2026-10-18 14:14:20 UTC); both carry `onboardingCompletedAt` = the
  migration's `now()` → the wizard is never offered for them. All 3 rows are
  completed (3/3/0).
- **Post-migration registrations start at step 1:** proven in the e2e suite
  (AC6 case 2 — a fresh registration reads `step 1 / completed false` on the
  wire and in the row) and by the schema defaults (`onboardingStep
  @default(1)`, `onboardingCompletedAt` nullable with no default).
- **Observed anomaly (no action, coordinator's awareness):** the third dev-DB
  user (`mtrew2015@gmail.com`, created 15:19:31 UTC) also carries the
  backfill timestamp (14:14:20 UTC) despite its later `createdAt` —
  consistent with the backfill `UPDATE` executing inside a long-lived
  migration transaction (statement snapshot after the row's registration;
  `now()` = transaction start). It does not affect the claim: the row is
  completed (wizard never offered for it), and post-migration registrations
  are proven to start at step 1 in the suite. (F-107F-3 in the checkpoint.)

## Manual browser sign-off (DoD 10, AC7) — **CANNOT VERIFY**

**Status: CANNOT VERIFY.** Reason: the manual browser sign-off is a **human
gate** (per the SP-105D/SP-106D precedent), and no human browser session is
available in this implementation runtime — the implementer cannot open a
browser, click through the wizard, or observe viewports. Per the ticket's own
rule, the smoke is recorded CANNOT VERIFY with the reason rather than claimed.
**No sign-off is claimed or implied.** The automated wire proof (AC1–AC6) and
the web component tests (SP-107C–E: per-step behavior, keyboard, responsive)
stand on their own; the manual run is the DoD 10 human confirmation of the
SPA + API + DB path.

### Exact steps the human must perform

Environment: the dev stack — local PostgreSQL (migrated; the running dev DB
is fine), `pnpm --filter @studypilot/api dev` (API `:4000`), `pnpm
--filter @studypilot/web dev` (web `:3000`), the app reading its
`.env.local`.

1. **Register** a brand-new account (post-migration → the wizard is for
   them). Note: the account is unverified, so the email-verification banner
   is expected to show.
2. **Log in** → the wizard appears at **step 1** (login-entry redirect).
3. **Step 1 (desktop viewport, keyboard only):** confirm the **pre-fill**
   (name + time zone — the time zone prefills from the profile /
   `Intl.DateTimeFormat().resolvedOptions().timeZone`); change the values;
   **save** → step 2.
4. **Reload the page** → the wizard resumes at **step 2**.
5. **Sign out** (wizard footer) → **sign back in** → the wizard resumes at
   **step 2** (survives sign-out/in).
6. **Step 2:** create the first semester (name + start/end dates); confirm
   the **end-after-start** validation (an end ≤ start shows a field error and
   saves nothing); save → step 3.
7. **Step 3:** confirm it is clearly **optional** — add a course (or use
   finish-without-course) → the wizard completes.
8. **Never re-appears:** sign out → sign in → land on the **dashboard**
   (not the wizard); visit `/onboarding` directly → redirects to the
   dashboard.
9. **Skip path:** register a **second** account, walk to step 2, click
   **skip** → completion is recorded, the student lands on the app, and the
   wizard never re-appears for that account (no semester/course created).
10. **Mobile viewport:** repeat the walk (register → login → step 1 → save →
    reload-resume → step 2 → step 3 → complete) at a mobile viewport,
    keyboard-only — confirm the layout fits and every control is reachable.
11. **Banner coexistence:** on the unverified account, confirm the
    email-verification banner coexists with the wizard without blocking it.
12. **Return approval** with the browser/version used and per-step
    observations (or the deviations observed).

### Closure path (SP-106 precedent)

The human performs the walk above; the **coordinator records the user's
ratification with provenance** (who/when/browser/limitations) in this record
or the parent review, exactly as SP-106D's sign-off was transcribed. DoD 10
then closes via that recorded ratification **plus** the combined SP-107
parent review — this child's CANNOT VERIFY stands until then.

## Findings / deviations

| ID | Description | Disposition |
|---|---|---|
| F-107F-1 | Coordinator snapshot said HEAD `14e7a25`; actual HEAD at dispatch was `3dfa317` (an autopilot bookkeeping commit — dispatch record only, no code difference). | Recorded — no action. Baseline for this child: `3dfa317`. |
| F-107F-2 | The ticket assigns the `test-http.ts` module imports to this child, but SP-107A (`9885601`) and SP-107B (`03a412a`) already added `OnboardingModule` / `SemestersModule` / `CoursesModule` to the harness (git log of `test-http.ts`). | Fixed by prior children — **no harness change in this child**; the spec runs against the existing wiring, and the full-suite re-run proves no regression. |
| F-107F-3 | Dev-DB backfill anomaly: one user created ~1 h after the migration's `now()` carries the backfill timestamp (long-lived migration transaction — see the Backfill record). | Recorded, no action — does not affect the AC6 claim; flagged for the coordinator's awareness. |

**Product defects in A–E: none.** Every e2e case passed on the first run;
no case failed on product code, so no finding was raised against the owning
children and no fix was needed in this child (ticket rule: only a
harness-wiring defect would be fixed here — none occurred).

No Jira mutation occurred (child key remains `Pending creation`).

## Commit scope

One scoped commit on `main` (baseline `3dfa317`):
`apps/api/src/modules/onboarding/onboarding-e2e.spec.ts` (new),
`docs/stories/EP01/SP-107/artifacts/SP-107F/` (checkpoint + this record),
`docs/stories/EP01/SP-107/artifacts/SP-107/implementation.md` (parent index,
AC8), `docs/stories/EP01/SP-107/README.md` (execution fields only — queue row
F, Active/Next substory, queue note). The README's `## Autopilot` section is
coordinator-owned and is not part of this commit. The commit hash is recorded
in the queue row and the returned handoff (not amended into this record).

## Remaining work (outside this child)

- **AC7 human sign-off** (the steps + closure path above) — the only open
  DoD 10 input; everything else in the review unit is implemented and
  verified.
- **Combined SP-107 parent review** (one review after all children; report at
  `../SP-107/review.md`) — the implementer has prepared the parent index;
  the coordinator requests the independent review.
