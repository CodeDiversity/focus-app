# SP-112C implementation record — Meetings & Course Detail Integration Sign-off

**Story:** [SP-112C](../../SP-112C-meetings-integration-signoff.md) (parent [SP-112](../../README.md))
**Parent / review unit:** SP-112 — one combined parent review after A+B+C (`../SP-112/review.md`); this child is the named integration/index owner.
**Layer:** Integration (verification child — SP-110C/SP-111C precedent)
**Baseline:** `8bbafb5` (SP-112B: course detail page — the commit before the first included change)
**Completed:** 2026-10-23, implementer, single sequential writer.
**Status:** Implementation complete — awaiting the combined SP-112 parent review. DoD 10 manual browser walk **performed — all 8 steps PASS, no deviations** (real headless Chrome 155.0.8059.85, 2026-10-23); the **human ratification gate stays with the session owner** (SP-110C/SP-111C precedent) and is requested at closeout — pending.

## Summary

Verification-only child: **no production, schema, migration, harness,
`package.json` or CI change was made.** One new e2e spec proves the meetings
+ course-detail feature as a student journey over real HTTP against a real
PostgreSQL database (AC1 lifecycle, the HTTP validation matrix, the
cross-student matrix, dual-ownership, the 14-key detail projections incl. the
seeded-assignment + archived-course cases, 401 on every route); the automated
suites were re-executed green on a disposable migrated Postgres and on the
bare no-DB path; the manual browser sign-off supporting DoD 10 was performed
in a real browser against the running dev stack (dev stack + full HTTP
pre-flight through the web proxy + the 8-step detail-page walk — all green);
the parent implementation index was written at
`../SP-112/implementation.md` (AC3). **No A/B product defects were found** —
every e2e case, pre-flight step and walk step passes against the A+B
implementation (the five findings below are all self-inflicted, in this
child's own scripts/assertions).

## Deliverable

`apps/api/src/modules/courses/courses-meetings-e2e.spec.ts` (**new**) — real
app harness (`test/test-http.ts`, `main.ts` parity; the harness already
carries the courses + semesters modules — no harness change), students seeded
through the real `POST /auth/register` + `POST /auth/login`, self-skips when
`DATABASE_URL` is unset, cleanup cascades from the seeded users (verified:
**0 users / 0 courses / 0 meetings / 0 assignments** left in the disposable
database after the run). The cases are ordered as the student journey and
each asserts on real rows via the harness `prisma` handle.

| Case | Claim proven |
|---|---|
| AC1 lifecycle (4 tests) | `POST /courses/:id/meetings` ×2 (Mon 09:00–10:30, Wed 14:00–15:30 → 201, exact 6-key shape, no `userId`/`courseId` on the wire; rows owned by A on the route course) → `GET` list (both rows, `dayOfWeek` asc / `startTime` asc) → `PATCH` (Mon → Tue 11:00–12:00; merged values on the wire **and** in the row) → `DELETE` (204; row gone; the list re-derives). *(AC-E02-04, DoD 1/8)* |
| Validation over HTTP (7 tests) | `end == start`, `end < start`, midnight wrap, `25:00`, `12:60`, weekday −1/7 → **400 with the field in `errors`** (nothing written); duplicate weekly slot (the journey meeting's own Tue 11:00) → **409 `A meeting already exists at this time.`** (the existing row unchanged). *(DoD 2/8)* |
| Cross-student matrix (2 tests) | B's `GET /courses/:id` + `POST`/`PATCH`/`DELETE` under A's course id → **uniform 404 `Resource not found`** ×4; A's meetings + course row **byte-identical** under unscoped before/after reads (no existence oracle, no partial write; B owns 0 meetings); B's list (incl. `includeArchived`) is empty and A's course/meeting ids appear nowhere in the serialized body (wire-level scoping). *(DoD 3/8)* |
| Dual-ownership (2 tests) | A `PATCH`es / `DELETE`s their meeting under A's *other* course id (CS201) → **uniform 404, no write** — the meeting lookup requires **both** `courseId = :id` and `userId`; the row survives untouched. *(DoD 3/8)* |
| Detail projections (3 tests) | `GET /courses/:id` → the exact **14-key** shape with the surviving meeting (canonical 6-key, contract ordering) and `assignments: []` until EP03; a directly-seeded assignment (no assignments API exists — EP03 owns management) appears in the read-only 10-key projection (ISO `dueDate`, schema defaults, no `userId`/`courseId`); an **archived** course's detail still returns its meetings + assignments (AC-E02-05 — the row survives the flag flip). *(AC-E02-06, DoD 1)* |
| Unauthenticated (1 test) | All five feature routes (detail + the four nested meeting routes) without a token → **401** (global-guard regression). *(DoD 3/8)* |

## Acceptance criteria verification

| AC | Status | Evidence |
|---|---|---|
| AC 1 e2e spec (lifecycle, validation, cross-student, dual-ownership, projections, 401) | ✅ | the spec above — **19/19 green** on the disposable migrated Postgres (the table in "Verification actually executed") |
| AC 2 manual browser sign-off (DoD 10) | ✅ **performed — all 8 steps PASS** (human ratification pending — requested at closeout) | the detail-page walk in a real browser against the running dev stack — the 8 steps, per-step results, provenance and evidence IDs below; no deviations. The **human ratification gate stays with the session owner** (SP-110C/SP-111C precedent): the user's approval of the recorded result is requested at closeout and is the final DoD-10 input alongside the combined parent review. |
| AC 3 parent index | ✅ | `../SP-112/implementation.md` (this commit) |

## Verification actually executed

### Disposable migrated Postgres (automated proof)

Target: an **ephemeral** `postgres:15-alpine` container (`sp112c-test-db`,
port 5433, `--rm`), migrations applied via `prisma migrate deploy` (all
applied, no pending). `.env`/`.env.local` were never read or displayed and no
connection string or token was printed; `DATABASE_URL` was supplied via the
process environment.

| Check | Command (cwd: repo root) | Result |
|---|---|---|
| New e2e spec | `DATABASE_URL=<disposable 5433 db> pnpm --filter @studypilot/api exec jest --runInBand courses-meetings` | **1 suite / 19 tests passed** (all cases) |
| Full API suite (with DB) | `DATABASE_URL=<disposable 5433 db> pnpm --filter @studypilot/api exec jest --runInBand` | **38/38 suites, 637/637 tests passed, 0 skipped** (baseline after SP-112A: 37 suites / 618 tests; + this spec's 19) |
| Full API suite (no DB) | `pnpm --filter @studypilot/api exec jest --runInBand` | 27 suites pass, **11 integration suites self-skip** (217 tests, incl. this spec's 19), 420 pass — the bare local path works |
| Typecheck | `pnpm --filter @studypilot/api exec tsc --noEmit` | clean |
| Lint / format | `eslint --max-warnings 0` + `prettier --check` on the new spec | clean (an `eslint --fix` pass applied formatting fixes — the F112C-2 companion) |
| Self-cleaning | row counts after the run | **0 users / 0 courses / 0 meetings / 0 assignments** for the spec's seeded identities — the suite cascades from the seeded users |
| Full web suite | `pnpm --filter @studypilot/web test` (cwd: repo root) | **41 files / 495 tests, all pass** (the combined feature: 70 course tests from SP-112B + the rest of the app; C makes no web change) |

### Dev-stack HTTP pre-flight (AC2 wire leg — performed)

Environment: the dev stack — `pnpm --filter @studypilot/api dev` (the API
reading the disposable `sp112c-test-db` on `:5433`), `pnpm --filter
@studypilot/web dev` (web `:3000`; the vite proxy forwards `/api/*` → the API).
Every request below went **through the web proxy** at
`http://localhost:3000/api` — the same path the browser takes. 23/25 checks
green on the first (corrected) run — the 2 "failures" are the script
expecting 201 on `POST /auth/login`, which returns **200 by design** (the
SP-111C pre-flight used 201-era wording; the auth contract is 200) — i.e.
effectively all green (F112C-3).

| Step | Result |
|---|---|
| Register + login A and B (`walk-a`/`walk-b.261023@studypilot.local`) | 201 / 200 with `accessToken` (both) |
| A: complete onboarding (`PATCH /onboarding`) | 200 — the browser walk skips the wizard |
| A: create semester + CS101 (instructor/credits/color/description) | 201 / 201 |
| A: create two meetings (Mon 09:00–10:30, Wed 14:00–15:30) | 201 ×2 |
| A: `GET /courses` | 1 row |
| A: `GET /courses/:id` (CS101) | 200 — exact **14 keys**, 2 meetings, 0 assignments |
| Meeting order | `1 09:00 \| 3 14:00` (dayOfWeek asc, startTime asc) |
| Seven invalid shapes (`end == start`, `end < start`, midnight wrap, `25:00`, `12:60`, weekday −1/7) | **400** with the field in `errors` ×7; still 2 meetings afterwards (nothing written) |
| Duplicate slot (Mon 09:00 again) | **409 `A meeting already exists at this time.`** |
| B: `GET` A's course | **404 `Resource not found`** (uniform; no existence oracle) |
| B: `GET /courses` | empty (0 rows) |
| Unauthenticated `GET /courses` | 401 |
| `GET /courses` (the SPA route, no `/api` prefix) | 200 — the SPA shell (`id="root"`) |

The walk data (the two users, CS101, its meetings) was left in the disposable
container for the browser walk and remains there after it; the container is
ephemeral (`--rm`).

## Manual browser sign-off (DoD 10, AC 2) — **PERFORMED, all steps PASS**

**Status: performed — all 8 steps PASS, no deviations.** The ticket's
detail-page walk was executed at the browser level on 2026-10-23 against the
running dev stack (the environment above). Provenance: who — the implementer
session via the REA `capture_browser_scenario` harness (a real browser was
available in this session, unlike SP-111C); when — 2026-10-23; browser —
**headless Google Chrome 155.0.8059.85** (the installed Google Chrome.app);
per-step observations — the table below (each step's capture is retained in
the REA session evidence store — 15 records; DOM/screenshot sha256 prefixes
recorded). The **human ratification gate stays with the session owner**
(SP-110C/SP-111C precedent): the user's approval of this recorded result is
requested at closeout; DoD 10 closes via that recorded ratification **plus**
the combined SP-112 parent review (pending).

| Step | Walk (per the ticket) | Result | Evidence (id — DOM sha256 prefix) |
|---|---|---|---|
| S1 | **Open a course from the list** (login → `/courses` → the course-name link) → **header fields** (name, code, instructor, semester, credits, description) + **assignments empty state** — 10 DOM checks | PASS | `ev_42a7dbd0…` — `bbea1e5d…` (re-captured ×3 with identical DOM: `ev_8265b46e…`, `ev_f295ff38…`, `ev_f61ebfa3…`) |
| S2 | **Add a meeting (valid)** — Thu 15:00–16:00: dialog, pick day, times, submit → POST 201, dialog closes, live-region "Meeting added.", the row renders | PASS | `ev_6a9834b2…` — `b58bab7c…` |
| S3 | **Add a meeting (invalid)** — end == start: the inline field error appears and **no API call is made** (client-side, DoD 2) | PASS | `ev_af4130af…` — `a3ace132…` |
| S4 | **Add a meeting (duplicate slot)** — the 409 surfaces as a form-level alert "A meeting already exists at this time."; the section keeps a single row | PASS | `ev_c7413aac…` — `0c1c7f24…` (re-captured: `ev_28fca0c5…`, identical DOM) |
| S5 | **Edit** (Mon → 10:00–11:30: PATCH 200, the row updates in place) + **delete** (Wed: confirmation dialog → DELETE 204, the row is removed) | PASS | `ev_083e5b0f…` — `e91f777b…` |
| S6 | **Archived-course banner** — archive the course (the SP-111B dialog) → the detail page shows the full-width Archived strip above the header; course restored via HTTP afterwards (200, `isActive: true`) | PASS | `ev_1cf43d3c…` — `51332f83…` (screenshot `1c4609ad5f2c…`) |
| S7a | **Keyboard-only pass** — Enter opens the Add-meeting dialog, Tab walks the fields (day → start → end → submit → cancel, wrapping), Escape closes; **0 page errors** | PASS | `ev_4ac68969…` — DOM `66169f76…`, AX `66744ff1…` (the AX capture does not expose focus state — a harness limitation, recorded; dialog open/close + zero errors are the observed proof) |
| S7b | **Keyboard create** — keys + Enter submit the form → POST 201, dialog closes, "Meeting added.", the row renders | PASS (assertion corrected — F112C-5) | `ev_51b8783e…` — DOM `704cd993…`, AX `961cde09…` + DOM re-verification `ev_19554204…` — `2f9b23c0…` (screenshot `3affddd1…`) |
| S8 | **Mobile viewport** (390×844) — login → `/courses` → the course-name link → detail: all three meeting rows, the header, the assignments empty state render; **0 page errors** | PASS | `ev_71947b4b…` — `2f9b23c0…` (DOM byte-identical to the desktop capture — the responsive layout is CSS-driven; screenshot `12b7e466…`) |

The walk's final page state was re-verified after the walk (this resume): the
detail DOM carries all three meeting rows (`Mon 10:00–11:30`,
`Tue 16:00–17:00`, `Thu 15:00–16:00`), the header fields, the assignments
empty state, zero page errors, and the detail `GET` returns 200 — the course
is active again after the S6 archive/restore.

## Findings / deviations

| ID | Description | Disposition |
|---|---|---|
| F112C-1 | The first draft of the new e2e spec was missing `=>` on one `it(...)` line (`async () {`) — `tsc` TS1005. | Fixed (test-only, this session). No product defect. |
| F112C-2 | 3 prettier formatting errors in the new spec. | Fixed (test-only, via `eslint --fix`). No product defect. |
| F112C-3 | The pre-flight script used `displayName` for `POST /auth/register` (the DTO field is `name`) and expected 201 on `POST /auth/login` (the API returns 200 by design) — 23/25 checks on the first run. | Fixed (script-level, this session). The auth contract is 200 — no product defect. |
| F112C-4 | The S4 scenario asserted an aria-label count that did not match the rendered 409 alert. | Fixed (scenario-assertion, this session). The 409 behavior itself is correct (form-level alert, single row) — no product defect. |
| F112C-5 | The S7b keyboard-create scenario expected the row "Thu 16:00–17:00", but the keyboard key sequence (`key-t` + two ArrowDowns) left the Day select on **Tuesday** — the created row is "Tue 16:00–17:00" (dayOfWeek 2; the documented create-mode default is Monday, `MeetingForm.tsx` `DEFAULT_DAY_OF_WEEK = 1`). The **app behaved correctly**: POST 201, dialog closed, "Meeting added." announced, the row rendered. | Resolved (scenario-assertion, this session): the DOM re-verification (`ev_19554204…` — all three rows, 0 page errors) + the DB read (row `78f8abe0…`, day 2, 16:00–17:00) confirm the row; the expected string was the scenario's error, not an A/B defect. |

**Product defects in A–B: none found** — every e2e case, pre-flight step and
walk step passes against the A+B implementation. The only open item in the
SP-112 unit is the pre-existing F-112B-1 (no `<Toaster />` mounted — 9
`toast.*` callers no-op in the built app; flagged for the combined parent
review, B-owned, pre-dates this unit).

No Jira mutation occurred (child key remains `Pending creation`).

## Commit scope

One scoped commit on `main` (baseline `8bbafb5`):
`apps/api/src/modules/courses/courses-meetings-e2e.spec.ts` (new),
`docs/stories/EP02/SP-112/artifacts/SP-112C/` (checkpoint + this record),
`docs/stories/EP02/SP-112/artifacts/SP-112/implementation.md` (parent index,
AC 3), `docs/stories/EP02/SP-112/README.md` (execution fields only — queue
row C, Active/Next), `docs/stories/EP02/SP-112/SP-112C-meetings-integration-signoff.md`
(status line only). The DoD-10 ratification records (this record's
Status/AC2/sign-off sections, the parent index DoD-10 section, the queue
"Next substory" field) land in a follow-up scoped commit once the user's
ratification lands, recorded in the queue row and the returned handoff (not
amended into this commit).

## Remaining work (outside this child)

- **DoD 10 human ratification** (user gate) — requested at closeout; the
  walk result is recorded above.
- **F-112B-1** (pre-existing, B-owned) — the missing `<Toaster />` mount;
  flagged for the combined parent review.
- **Combined SP-112 parent review** (one review after all children; report at
  `../SP-112/review.md` + `walkthrough.md`) — the implementer has prepared the
  parent index; the coordinator requests the independent review. DoD 10
  closes via the recorded ratification **plus** this review; no other DoD
  input is open.
