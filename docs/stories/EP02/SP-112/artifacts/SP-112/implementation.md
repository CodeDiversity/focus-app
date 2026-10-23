# SP-112 parent implementation index

Updated: 2026-10-23 (SP-112C closeout)
Prepared by: implementer (single sequential writer) as SP-112C (AC 3) — the
named integration/index owner for the SP-112 review unit.
Purpose: index of every child's implementation evidence for the one combined
SP-112 parent review. The review report, when the read-only reviewer returns,
is saved at `./review.md` (this directory).

## Status

All three children — A, B, C — are implemented and are hereby handed to the
combined SP-112 parent review. No child review has been performed or asserted
and none replaces this sign-off. SP-112 covers recurring class meetings +
course detail: the `ClassMeeting` model + four nested meeting routes + the
14-key detail projections (A), the `/courses/:id` detail page with the
meetings + read-only assignments sections (B), and integrated end-to-end
verification (C) — epic AC-E02-04 (add recurring meetings) and AC-E02-06
(course details display assignments + meetings); see the
[parent README](../../README.md) for the full traceability map.

**DoD 10: the detail-page browser walk was performed — all steps PASS.** The
manual sign-off (C AC2) is a **human ratification gate** that stays with the
session owner (SP-110C/SP-111C precedent). Unlike SP-111C (no browser in the
implementation runtime), this session had a real browser: the 8-step
detail-page walk was executed at the browser level against the running dev
stack (headless Google Chrome 155.0.8059.85 via the REA scenario harness) and
every step passed — no deviations. The user's ratification is requested at
closeout. Provenance, per-step results and evidence IDs are in
[`SP-112C/implementation.md`](../SP-112C/implementation.md) → "Manual browser
sign-off (DoD 10, AC 2)". The automated proof (C e2e suite + the dev-stack
HTTP pre-flight through the web proxy) and the web component tests (B) stand
alongside it. Everything else in the review unit is implemented and verified.

Sequence: A → B → C, one sequential writer. C is the named cross-layer
integration owner (e2e journey suite, full-suite re-runs, DoD 10 sign-off,
this index).

## Child evidence index

| Story | Delivered | Implementation | Checkpoint | Commits |
|---|---|---|---|---|
| [A](../../SP-112A-class-meetings-api.md) | `ClassMeeting` model + migration `20261023000000_class_meetings` (D112-1/4); four nested meeting routes `GET/POST /courses/:id/meetings`, `PATCH/DELETE /courses/:id/meetings/:meetingId` (D112-2) — course-ownership gate first, every meeting query scoped to `courseId` + principal `userId`, uniform 404, `HH:mm` + `end > start` validation, P2002 → 409, DELETE 204; `GET /courses/:id` extended to the 14-key detail shape (`meetings` ordered dayOfWeek/startTime + read-only `assignments`, D112-3/6); list route unchanged | [implementation](../SP-112A/implementation.md) | [checkpoint](../SP-112A/checkpoint.md) | `080f2e9` |
| [B](../../SP-112B-course-detail-ui.md) | `/courses/:id` detail page (FSD): `CourseDetailPage` (header per D112B-11, clamp toggle, Archived banner, page states, live region), `MeetingsSection` + `MeetingForm` dialog (RHF+Zod mirroring the backend, focus trap, 400/409/404 branches) + `DeleteMeetingDialog`, read-only `AssignmentsSection`, `formatMeetingLabel` helper, `courseApi` to the 14-key `CourseDetail` + four meeting functions, `ClassMeeting`/`CourseAssignment` types, `CourseList` name → `Link` + row navigation, route inside `ProtectedRoute` | [implementation](../SP-112B/implementation.md) | [checkpoint](../SP-112B/checkpoint.md) | `8bbafb5` |
| [C](../../SP-112C-meetings-integration-signoff.md) | Real-Postgres e2e suite (19 tests: meeting lifecycle, HTTP validation matrix, cross-student matrix, dual-ownership, detail projections incl. seeded assignment + archived-course access); full API + web suite re-runs; dev-stack HTTP pre-flight; DoD 10 browser walk (performed, all steps PASS); this parent index | [implementation](../SP-112C/implementation.md) | [checkpoint](../SP-112C/checkpoint.md) | (this closeout commit) |

## Per-child scope and verification

- **A** (backend, `080f2e9`): `prisma/schema.prisma` (`ClassMeeting` +
  `Course.meetings` + `User.classMeetings`), migration
  `20261023000000_class_meetings` (hand-written, verified byte-equivalent to
  `migrate diff` — the F111A-1 checksum-drift precedent),
  `create-class-meeting.dto.ts` + `update-class-meeting.dto.ts` (new),
  `courses-meetings.service.ts` (new — list/create/update/delete + the
  canonical 6-key `toMeetingResponse`), `courses.service.ts` (`get()` →
  14-key detail), `courses.controller.ts` (four nested routes),
  `courses.module.ts`, `ownership.ts` comment; 34 new unit + 36 new
  two-student data-scoping tests + the existing spec key-list splits. At its
  commit: API **37/37 suites, 618/618 tests, 0 skipped** on a disposable
  migrated Postgres (self-cleaning: 0 users / 0 courses / 0 meetings after);
  typecheck + lint + format clean. Findings F112A-1…4 — F112A-1 (product:
  the DELETE handler lacked `@HttpCode(NO_CONTENT)` — Nest defaults to 200;
  caught by the new data-scoping spec, fixed); F112A-2/3 test-only; F112A-4
  (the contract's "nulls-last" wording is a no-op on the NOT NULL
  `dueDate` — no code deviation).
- **B** (frontend, `8bbafb5`): 10 modified + 12 new files, all in
  `apps/web` — `CourseDetailPage` (336 lines, 16 tests), `MeetingForm`
  (328, 14 tests), `DeleteMeetingDialog` (167, 9), `MeetingsSection` (137, 8),
  `AssignmentsSection` (118, 5), `meetingLabel.ts` (18, 3), `courseApi`
  (+12 tests), `academic.ts`, `CourseList` (+3 navigation tests),
  `CoursesPage.test.tsx` (wrapper), `test/user.ts` (act-wrapped
  `selectOptions`/`clear`), `App.tsx` (route). At its commit: web **41/41
  files, 495/495 tests**; typecheck + lint + build clean. Findings
  F-112B-1…3 — F-112B-1 (**open, pre-existing**: no `<Toaster />` mounted
  anywhere while 9 files call `toast.*` — flagged for the combined parent
  review); F-112B-2/3 test-only (router wrappers; act-warning wrappers for
  this child's files — the 16 legacy raw-`userEvent` files remain a
  repo-wide cleanup).
- **C** (integration, this closeout commit):
  `apps/api/src/modules/courses/courses-meetings-e2e.spec.ts` (**new** — 19
  tests on real Postgres via the `test-http` harness; self-skips without
  `DATABASE_URL`; self-cleaning). **No production, schema, migration,
  harness, `package.json` or CI change.** Re-verified at closeout: API
  **38/38 suites, 637/637 tests, 0 skipped** on the disposable migrated
  Postgres; without a database 27 suites pass / 11 integration suites
  self-skip (420 pass / 217 skip); typecheck + lint + format clean; web
  **41/41 files, 495/495 tests**; dev-stack HTTP pre-flight through the web
  proxy 23/25 (the 2 "failures" are the script expecting 201 on login — the
  API returns 200 by design; effectively all green); **DoD 10 browser walk
  performed — all 8 steps PASS, no deviations** (the one S7b assertion
  mismatch was a scenario-script error, resolved by DOM + DB re-verification
  — no product defect). Findings: five self-inflicted (spec `=>`, spec
  formatting, pre-flight field/status, S4 aria-label count, S7b expected-day
  string) — all fixed/resolved in-session; **no A/B product defects found**.

## Combined Git scope for the review

Baseline: `43b0a4d` (the commit before the first SP-112 change).

| Commit | Content |
|---|---|
| `2a9cc13` | docs(SP-112B): mark Needs refinement — record UI/UX gaps for the ui-refiner (ui-refiner pass, docs-only) |
| `080f2e9` | SP-112A — 13 files: `schema.prisma`, migration (new), 2 new meeting DTOs, `courses-meetings.service.ts` (new) + spec (34) + data-scoping spec (36), `courses.service.ts`, `courses.controller.ts`, `courses.module.ts`, `ownership.ts` comment, `courses.service.spec.ts` (+1), `courses-data-scoping.spec.ts` + `courses-e2e.spec.ts` key-list splits, README execution fields, `artifacts/SP-112A/` |
| `303237e` | docs(SP-112B): refine the course detail UI ticket — D112B-1…16, implementation-ready (refiner pass, docs-only) |
| `650ab39` | docs(SP-112): reconcile queue — SP-112B Ready (docs-only) |
| `8bbafb5` | SP-112B — 22 files: 10 modified + 12 new (all `apps/web` — detail page, sections, dialogs, label helper, `courseApi`, types, `CourseList`, `App.tsx`, `test/user.ts` + tests), README execution fields, `artifacts/SP-112B/` |
| (C closeout) | SP-112C — `courses-meetings-e2e.spec.ts` (new, 19 tests), README execution fields, SP-112C status line, `artifacts/SP-112C/` (checkpoint + implementation record), `artifacts/SP-112/implementation.md` (this index) |

Code scope summary across the unit (baseline `43b0a4d`): `apps/api` —
`courses` module only (2 new DTOs, 1 new service, service + controller
extended, 2 new spec files, 3 existing spec files' key-list splits, +1 new
e2e spec from C) + `prisma/schema.prisma` (1 new model + 2 relations) + 1 new
migration + the `ownership.ts` comment. API suite totals with a database:
547 (after SP-111C) → **618** (A: +71) → **637** (C: +19 e2e); suite count
35 → 37 → **38**. `apps/web` — `entities/course/api` extended,
`shared/types/academic.ts`, `features/courses/ui/` (5 new components + 5 new
test files), `pages/courses/ui/CourseDetailPage` (new), `CourseList`
(navigation), `App.tsx`, `test/user.ts`. Web suite totals: 425 (after
SP-111C) → **495** (B: +70; C makes no web change). No schema change beyond
the new `class_meetings` table; no migration, CI, `package.json` or secret
changes anywhere in the unit.

## AC / DoD coverage

Per the [README traceability tables](../../README.md#source-requirements-and-test-traceability):

| Req | Owning children | Evidence |
|---|---|---|
| AC-E02-04 (students can add recurring class meetings with start and end times) | A (API), B (meetings UI), C (integrated proof) | A 34 unit + 36 data-scoping (validation matrix, 409, 204, ordering); B 31 form/section/dialog tests; C e2e lifecycle (create → list ordered → PATCH → DELETE, real rows) + pre-flight + the DoD-10 walk (add/edit/delete in the browser) |
| AC-E02-06 (course details display related assignments and class meetings) | A (detail projections), B (detail page sections), C (integrated proof) | A unit + data-scoping (14-key detail; meetings + read-only assignments projected, ordered, no `userId`/`courseId` exposed); B page/section tests (both sections, empty states); C e2e (the seeded assignment appears in the projection; an archived course's detail still returns meetings + assignments) + pre-flight + the walk (S1 header + empty state, S6 archived banner, S8 mobile) |

DoD map (per the README): 1 A/B/C; 2 A (DTO + service re-checks) + B (form);
3 A (every route principal-scoped, uniform 404) + C (cross-student +
dual-ownership proofs); 4 A (field-level 400, specific 409, uniform 404) + B
(display); 5 B (page + section states) + C (integrated); 6 B (sections,
forms, dialogs); 7 B (mobile + desktop) + C (S8 mobile leg); 8 A (unit +
data-scoping) + B (component) + C (e2e); 9 A (contract in the README;
`class_meetings` migration); 10 C (manual browser sign-off — **performed,
all steps PASS; human ratification requested at closeout**) + the combined
parent review.

## Security invariants and owning proofs

Per the [README invariants table](../../README.md#security-invariants-and-counterexamples):

| Claim | Owning proof |
|---|---|
| No cross-student meeting read/write | A (unit + data-scoping: course gate `findFirst({ id, userId })` → uniform 404; meeting queries carry `userId`; a miss → uniform 404 — B never learns A's meetings exist); C e2e (B's GET/POST/PATCH/DELETE under A's course id → uniform 404; A's meetings byte-identical before/after; B's detail projection never contains A's meetings/assignments; 401 on every route) + pre-flight (B: 404 + empty list) |
| A meeting always belongs to the course in the URL | A (unit + data-scoping: the lookup requires **both** `courseId = :id` and `userId`; mismatch → uniform 404, no write); C e2e dual-ownership case (A PATCHes/DELETEs a meeting of A's *other* course via the first course's id → uniform 404, no write) |
| Meeting times are sane recurring times | A (validator + service re-checks: strict `HH:mm`, hour 00–23 / minute 00–59, `end > start` same day — 11-case unit matrix + the same over real HTTP); B (the form mirrors the rules client-side); C e2e (all seven invalid shapes → 400 field-level, nothing written) + pre-flight + the walk (S3 client-side invalid — no API call; S4 409) |
| Duplicate weekly slots are rejected | A (unit + data-scoping: `@@unique([courseId, dayOfWeek, startTime])` → 409 `A meeting already exists at this time.`); C e2e + pre-flight + the walk (S4: alert, single row) |

## DoD-10 item (AC 2 manual sign-off) — PERFORMED, all steps PASS

- **Status: performed — all 8 steps PASS, no deviations.** The detail-page
  walk (open the course from the list → header fields → add meeting
  (valid + invalid) → edit → delete → assignments empty state → archived
  banner → keyboard-only pass → mobile viewport) was executed at the browser
  level on 2026-10-23 against the running dev stack (headless Google Chrome
  155.0.8059.85 via the REA `capture_browser_scenario` harness; 15 evidence
  records retained in the REA session store). The **human ratification gate
  stays with the session owner** (SP-110C/SP-111C precedent) — the user's
  ratification is requested at closeout; DoD 10 closes via that recorded
  ratification **plus** the combined SP-112 parent review.
- **Standing on its own regardless:** the dev-stack bring-up + the full HTTP
  pre-flight through the web proxy (register/login, onboarding, semester +
  CS101 course, two meetings, list, 14-key detail + meeting order, seven
  invalid shapes → 400, duplicate → 409, no invalid/duplicate writes,
  cross-student 404 + empty list, unauthenticated 401, SPA shell) and the
  e2e suite (19 tests, real Postgres).
- **Exact walk steps + evidence:**
  [`SP-112C/implementation.md`](../SP-112C/implementation.md) → "Manual
  browser sign-off (DoD 10, AC 2)".
- **History:** the session had a real browser, so — unlike SP-111C — the walk
  was performed by the implementation session at the browser level rather
  than recorded CANNOT VERIFY; the human gate is the user's ratification of
  that recorded result.

## Cross-child notes for the reviewer

- **F112A-1 (A, fixed — product):** the `DELETE` handler lacked
  `@HttpCode(HttpStatus.NO_CONTENT)` (Nest defaults `@Delete` to 200; the
  contract specifies 204). Caught by the new data-scoping spec on the first
  real-DB run; the decorator was added; the full suite re-ran green.
- **F112A-2 (A, fixed — test-only):** the stale "13-key" label was a
  miscount — `CourseWithSemester` is 12 keys; the detail shape is 14
  (12 + `meetings` + `assignments`). The key-list constants were split
  across the three existing specs.
- **F112A-3 (A, fixed — test-only):** the PATCH collision cases patched only
  some fields, so merged-value 400s fired before the P2002 409; the cases
  now patch all three fields with valid merged values.
- **F112A-4 (A, no code deviation):** the README contract's "nulls-last"
  ordering note is a no-op — `Assignment.dueDate` is NOT NULL in the
  committed migrations; the implemented ordering is exactly what the column
  allows. Revisit in EP03 if `dueDate` becomes nullable.
- **F-112B-1 (B, OPEN — pre-existing, flagged for this review):** no
  `<Toaster />` is mounted anywhere in `apps/web` while 9 files call
  `toast.*` — toasts (incl. B's "other failure" branch) are no-ops in the
  built app. Pre-dates SP-112B; a one-line mount in the app shell would fix
  all 9 callers. Mounting app-shell chrome is a review decision.
- **F-112B-2/3 (B, fixed — test-only):** router wrappers for the
  `Link`/`useNavigate`-using tests; act-wrapped `selectOptions`/`clear`
  added to `test/user.ts` for this child's files (the 16 legacy
  raw-`userEvent` files remain a separate repo-wide cleanup, flagged with
  F-112B-1).
- **C findings (all self-inflicted, none an A/B defect):** the e2e spec's
  first draft (missing `=>`; prettier formatting); the pre-flight script
  (`displayName` vs the DTO's `name`; 201 vs the by-design 200 login); the
  S4 aria-label count assertion; the S7b expected-day string (the keyboard
  sequence left the Day select on Tuesday — the documented create-mode
  default is Monday — and the app behaved correctly). All fixed/resolved in
  session; every e2e case, pre-flight step and walk step passes against the
  A+B implementation.
- **Product defects in A–B:** none found by this child. The only open item
  in the unit is the pre-existing F-112B-1 (`<Toaster />` mount).

## Reviewer inputs

- Shared contract, traceability, decisions and gate:
  [SP-112 parent README](../../README.md) (Shared API contract; AC/DoD maps;
  decision register D112-1…6; quality gate; Final implementation review
  unit).
- Suite entry points: `apps/api` — `pnpm --filter @studypilot/api exec
  jest --runInBand` with `DATABASE_URL` set (the Postgres-backed specs
  self-skip when it is unset; they execute against the migrated local dev DB
  when it is set) or a disposable `postgres:15-alpine` + `prisma migrate
  deploy`; `apps/web` — `pnpm --filter @studypilot/web test`.
- Where this parent's verdict is recorded: `./review.md`.
