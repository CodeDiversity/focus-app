# SP-112A implementation record — Class Meetings API + Course Detail Projections

**Story:** [SP-112A](../../SP-112A-class-meetings-api.md) (parent [SP-112](../../README.md))
**Parent / review unit:** SP-112 — one combined parent review after A+B+C (`../SP-112/review.md`); this child is the backend leg.
**Layer:** Backend (NestJS + Prisma + PostgreSQL)
**Baseline:** `2a9cc13` (docs(SP-112B): mark Needs refinement — record UI/UX gaps for ui-refiner) — the commit before the first included change
**Completed:** 2026-10-23, implementer, single sequential writer
**Status:** Implementation complete — awaiting the combined SP-112 parent review.

## Summary

The `courses` module is now the **full course surface** (SP-107B onboarding
`POST` + SP-111A management + SP-112A meetings):

- **`ClassMeeting` model** (new, D112-1): `dayOfWeek Int` (0–6, Sunday=0) +
  `startTime`/`endTime` `HH:mm` strings — the `AvailabilitySlot` precedent;
  `userId` (cascade from `User`) + `courseId` (cascade from `Course`, D112-4);
  `@@unique([courseId, dayOfWeek, startTime])` backs the 409 "slot taken"
  rule. One migration: `20261023000000_class_meetings`.
- **Four nested meeting routes** (D112-2): `GET/POST
  /courses/:id/meetings`, `PATCH/DELETE /courses/:id/meetings/:meetingId`.
  Every route passes a course-ownership gate first (`findFirst({ where:
  { id, userId } })` → uniform 404), then scopes the meeting query to
  **both** `courseId` and the principal's `userId` (repo ownership
  convention); `:id`/`:meetingId` are plain strings (malformed → 404, never
  400). Validation: DTO + service re-checks (backend authoritative) —
  `dayOfWeek` integer 0–6; `HH:mm` with hour 00–23 / minute 00–59;
  `endTime` strictly after `startTime` same day (no midnight wrap); P2002 →
  409 `A meeting already exists at this time.`; DELETE is 204.
- **`GET /courses/:id` detail projections** (D112-3): the SP-111A route now
  returns `CourseWithSemester` **plus** `meetings: ClassMeeting[]` (ordered
  `dayOfWeek` asc, `startTime` asc) and `assignments: Assignment[]` (read-only
  10-key projection, ordered `dueDate` asc, `title` asc — empty until EP03
  builds management; D112-6). The **list** route stays light (12-key
  `CourseWithSemester`, no nested collections). The detail response is the
  **14-key** shape (12 + the two collections).
- **Tests:** one new unit spec (34 tests, mocked Prisma) + one new
  two-student data-scoping spec (36 tests, real HTTP + real Postgres,
  self-skips without `DATABASE_URL`); the existing `courses.service.spec.ts`
  `get()` tests were extended to the detail projection; the existing
  `courses-data-scoping.spec.ts` / `courses-e2e.spec.ts` key-list assertions
  were split (12-key for create/list/patch, 14-key for detail).

## Changed paths (commit scope)

| Path | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | `ClassMeeting` model + `Course.meetings` + `User.classMeetings` relations (D112-1/2/4) |
| `apps/api/prisma/migrations/20261023000000_class_meetings/migration.sql` | **new** — `class_meetings` table + per-course unique + both FKs (cascade) |
| `apps/api/src/modules/courses/dto/create-class-meeting.dto.ts` | **new** — `dayOfWeek` int 0–6; `startTime`/`endTime` `HH:mm` |
| `apps/api/src/modules/courses/dto/update-class-meeting.dto.ts` | **new** — all three fields optional (partial merge) |
| `apps/api/src/modules/courses/courses-meetings.service.ts` | **new** — list/create/update/delete + exported `toMeetingResponse` (the one canonical 6-key shape, reused by the detail projection) |
| `apps/api/src/modules/courses/courses.service.ts` | `get()` extended with the `meetings` + `assignments` projections (`toAssignmentResponse`); header comment updated to the full course surface |
| `apps/api/src/modules/courses/courses.controller.ts` | four nested routes; `@HttpCode(HttpStatus.NO_CONTENT)` on DELETE (F112A-1); header comment updated |
| `apps/api/src/modules/courses/courses.module.ts` | `CoursesMeetingsService` provider; header comment updated |
| `apps/api/src/common/ownership/ownership.ts` | convention comment: `ClassMeeting` added to the scoped-model list |
| `apps/api/src/modules/courses/courses-meetings.service.spec.ts` | **new** — 34 unit tests |
| `apps/api/src/modules/courses/courses-meetings-data-scoping.spec.ts` | **new** — 36 integration tests (two-student matrix) |
| `apps/api/src/modules/courses/courses.service.spec.ts` | `get()` projection tests (14-key detail shape; `DETAIL_PROJECTION`) — +1 test |
| `apps/api/src/modules/courses/courses-data-scoping.spec.ts` | detail key-list assertions split 12/14 (no test-count change) |
| `apps/api/src/modules/courses/courses-e2e.spec.ts` | `COURSE_DETAIL_KEYS` (14) added; stale "13-key" titles corrected (F112A-2; no test-count change) |

The local Prisma client regeneration (`prisma generate`) is gitignored
(`apps/api/src/generated/prisma/`) and is not part of the commit.

## Migration

`20261023000000_class_meetings` — hand-written (the F111A-1 precedent: the
local dev DB carries pre-existing checksum drift, so `prisma migrate dev`
refuses it) and verified byte-equivalent to
`prisma migrate diff --from-schema <git HEAD schema> --to-schema
prisma/schema.prisma --script`. Applied on the disposable verification DB via
`prisma migrate deploy` (all migrations applied, no pending). The migration
is `class_meetings` (table) + the per-course unique index + both cascade FKs —
nothing else (DoD 9).

## Acceptance criteria verification

| AC | Status | Evidence |
|---|---|---|
| AC 1 schema (D112-1, one migration) | ✅ | `ClassMeeting` model + relations in `schema.prisma`; migration above; client regenerated (`prisma.classMeeting` delegate present); applied on the disposable DB via `migrate deploy` |
| AC 2 `GET /courses/:id/meetings` (ordered; uniform 404; 401) | ✅ | unit: ownership gate + scoped/ordered `findMany` + 6-key shape; data-scoping: ordering, B/missing course → uniform 404, wire-level scoping, 401 |
| AC 3 `POST` (validation 400; uniform 404; P2002 409; 201) | ✅ | unit: 11-case invalid matrix (weekday −1/7/1.5/`'1'`, `9:00`, `25:00`, `12:60`, `end == start`, `end < start`, midnight wrap, non-string) + boundary values + P2002 409 + 404; data-scoping: the same 400/404/409 cases over real HTTP (the global pipe for format/whitelist, the service for bounds + cross-field rule) |
| AC 4 `PATCH` (partial merge; dual-ownership 404; merged-value 400; 409) | ✅ | unit: dual-ownership `findFirst({ id, courseId, userId })` miss → 404 no write; empty/null-only body → 400; partial write of only the provided fields; merged-value 400s; P2002 → 409; P2025 → 404; data-scoping: B's patch → 404 with A's row byte-identical; A's patch under A's *other* course id (dual-ownership) → 404 no write; collision → 409 |
| AC 5 `DELETE` (204; dual-ownership 404; 401) | ✅ | unit: scoped `deleteMany({ id, courseId, userId })`; 0 affected → uniform 404 via `assertAffected`; data-scoping: 204 + row gone, B → 404 row survives, dual-ownership → 404 row survives, missing id → identical 404 (the 204 status is pinned — F112A-1) |
| AC 6 detail projections (D112-3) | ✅ | unit (`courses.service.spec.ts`): the 14-key detail shape, `DETAIL_PROJECTION` (meetings ordered dayOfWeek/startTime; assignments ordered dueDate/title), ISO dates, no `userId`/`courseId`; data-scoping: A's detail carries the projected meetings + read-only assignments; B's detail never contains A's data; B reading A's course id → uniform 404; `courses-e2e.spec.ts` + `courses-data-scoping.spec.ts` key-list assertions updated to the 14-key detail shape (list route unchanged) |
| AC 7 ownership on all routes | ✅ | every query carries the principal `userId` in the `where` (course gate + meeting queries + `deleteMany`); `@CurrentUser()` only; the data-scoping two-student matrix proves it over real HTTP |

## Verification actually executed

### Disposable migrated Postgres (automated proof)

Target: an **ephemeral** `postgres:15-alpine` container (`sp112a-test-db`,
port 5433, `--rm`), migrations applied via `prisma migrate deploy` (all
applied, no pending), removed after the runs — no shared or persistent
database touched. `.env`/`.env.local` were never read or displayed;
`DATABASE_URL` was supplied via the process environment.

| Check | Command (cwd: repo root) | Result |
|---|---|---|
| Full API suite (with DB) | `DATABASE_URL=<disposable 5433 db> pnpm --filter @studypilot/api exec jest --runInBand` | **37/37 suites, 618/618 tests passed, 0 skipped** (baseline after SP-111C: 35 suites / 547 tests; +2 new suites, +71 tests: 34 new unit + 36 new data-scoping + 1 in `courses.service.spec.ts`) |
| Full API suite (no DB) | `pnpm --filter @studypilot/api exec jest --runInBand` | 27 suites pass, **10 integration suites self-skip** (198 tests), 420 pass — the bare local path works |
| Self-cleaning | row counts after the with-DB run | **0 users / 0 courses / 0 meetings** — the suite cascades from the seeded users |
| Typecheck | `pnpm --filter @studypilot/api exec tsc --noEmit` | clean |
| Lint / format | `pnpm --filter @studypilot/api lint` (`eslint --max-warnings 0 --fix`) | clean; the `--fix` pass applied formatting-only rewraps to the four new/changed courses files (re-verified: the full with-DB suite re-ran green on the post-lint tree) |

### First-run failure (F112A-1)

The first with-DB full-suite run failed **2 tests, both in the new
data-scoping spec**: the DELETE cases expected 204 but the route answered
200 — the `@Delete` handler lacked `@HttpCode(HttpStatus.NO_CONTENT)` (Nest
defaults DELETE to 200). The contract specifies 204. Fixed in
`courses.controller.ts` (decorator added; the handler already returned no
body); the full suite re-ran 37/37, 618/618 green, and the post-lint tree was
re-verified the same way (table above). The row-level assertions (row gone /
row survives) had passed on the first run — only the status code was wrong.

## Findings / deviations

| ID | Description | Disposition |
|---|---|---|
| F112A-1 | The `DELETE /courses/:id/meetings/:meetingId` handler lacked `@HttpCode(HttpStatus.NO_CONTENT)` — Nest defaults `@Delete` to 200, so the route answered 200 where the contract specifies 204. Caught by the new data-scoping spec on the first real-DB run (2 tests: "A deletes their meeting → 204" and the cleanup sanity). | Fixed (product): the decorator was added to the controller handler. The full suite re-ran green (37/37, 618/618), including on the post-lint tree. |
| F112A-2 | The stale **"13-key" label** for `CourseWithSemester` was a miscount — the key list in the committed specs was always 12 keys (`id, code, name, description, color, credits, instructor, isActive, semesterId, semester, createdAt, updatedAt`); the e2e test titles said "13-key". The detail shape is therefore **14 keys** (12 + `meetings` + `assignments`), not the 15 assumed in the first draft of this child's checkpoint. | Fixed (test-only): the e2e titles now say 12-key/14-key; the three existing specs carry the split key lists (`COURSE_KEYS` 12 for create/list/patch, `COURSE_DETAIL_KEYS` 14 for detail). The SP-111C record's historical "13-key" wording is preserved verbatim (a past record, not rewritten). |
| F112A-3 | The first draft of the PATCH slot-collision cases patched only some fields; when the **merged** values were invalid, the 400 validation fired *before* the P2002 409, so the 409 was never exercised. | Fixed (test-only, unit + data-scoping): the collision cases now patch **all three** fields with valid merged values (a different meeting's slot, `end > start`), so the P2002 409 is what fires. No product defect — the service correctly validates merged values first. |
| F112A-4 | The README contract phrases the assignments ordering as "`dueDate` asc nulls-last, then title", but `Assignment.dueDate` is `DateTime` **NOT NULL** in the committed migrations — nulls-last is a no-op the DB cannot express through Prisma's `orderBy` for a non-null column. | No code deviation: the implemented ordering (`[{ dueDate: 'asc' }, { title: 'asc' }]`) is exactly what the contract requires for the NOT NULL column; the "nulls last" wording is a no-op safety note (recorded in the checkpoint). If EP03 ever makes `dueDate` nullable, the ordering must be revisited there. |

No Jira mutation occurred (child key remains `Pending creation`).

## Commit scope

One scoped commit on `main` (baseline `2a9cc13`) with exactly the "Changed
paths" table above — **excluding** the uncommitted ui-refiner pass in
`docs/stories/EP02/SP-112/SP-112B-course-detail-ui.md` (another role's write,
preserved in the working tree) and the gitignored generated Prisma client.
The closeout docs (this record, the checkpoint, the SP-112 README execution
fields, the SP-112A ticket status line) land in the same commit.

## Remaining work (outside this child)

- **SP-112B** (course detail UI) — the `ui-refiner` pass is complete in the
  working tree (decisions D112B-1…11 in its ticket); its queue state is for
  planner/coordinator reconciliation, then implementation.
- **SP-112C** (integration sign-off) — the named integration/index owner
  (e2e + DoD 10 + parent index).
- **Combined SP-112 parent review** — one review after every child is
  implemented (`../SP-112/review.md` + `walkthrough.md`); child completion
  unblocks dependent work, but only the passing combined review establishes
  sign-off.
