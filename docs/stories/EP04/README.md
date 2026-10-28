# EP04 Story Breakdown — Academic Calendar & Availability

**Epic:** [EP04: Academic Calendar & Availability](../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Milestone:** M2 (Calendar and dashboard)
**Epic dependency:** EP02 (Semester & Course Management) — complete 2026-10-23; EP03 (Assignment & Task Management) — complete (all nine parents reviewed, see [EP03 README](../EP03/README.md)). EP04 implementation is **not blocked**.
**Status:** Draft — three parent stories broken down (SP-127, SP-128, SP-129) with five implementation children. Backend children are `Ready`; SP-127B is `Ready` (ui-refiner pass complete); SP-128B and SP-129A remain `Needs refinement` (ui-refiner handoff, D404-9).
**Jira keys:** Pending creation (no sync authorized for this planning task).

## Execution queue

**Delivery home:** `docs/stories/EP04/`

**Artifact root:** `./artifacts/` (stable story ID) — one directory per parent: `./artifacts/SP-127/`, `./artifacts/SP-128/`, `./artifacts/SP-129/`, and one per child: `./artifacts/SP-127A/`, …

**Active substory:** None.

**Next substory:** SP-129A — ui-refiner pass (D404-9), then implement (mobile agenda).

**Implementation owner:** `implementer`, one sequential writer across all layers (backend → frontend → integration; the labels are scope, not concurrent roles).

**Final review:** one combined review per parent (SP-127, SP-128, SP-129) — not per child. Reviewer artifacts: `./artifacts/<parent>/review.md` + `./artifacts/<parent>/walkthrough.md` (DoD 10/11).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [SP-127A](./SP-127/SP-127A-calendar-events-api.md) | Implemented — awaiting parent review | EP02 + EP03 complete (satisfied) — no upstream EP04 work. | Parent review (after SP-127B) | ./SP-127/artifacts/SP-127A/implementation.md |
| [SP-127B](./SP-127/SP-127B-calendar-week-view.md) | Implemented — awaiting parent review | SP-127A implemented (the read model it renders). | Parent review (after all SP-127 children) | ./SP-127/artifacts/SP-127B/implementation.md |
| [SP-128A](./SP-128/SP-128A-availability-slots-api.md) | Ready | EP02 + EP03 complete (satisfied) — no upstream EP04 work. | Implement (backend) | — |
| [SP-128B](./SP-128/SP-128B-availability-settings-ui.md) | Needs refinement | SP-128A implemented (the API it manages). | `ui-refiner` pass (D404-9), then implement | — |
| [SP-129A](./SP-129/SP-129A-mobile-agenda-view.md) | Needs refinement | SP-127B implemented (the event data + shared event components it reuses). | `ui-refiner` pass (D404-9), then implement | — |

Sequence (one writer): SP-127A → SP-127B → SP-129A → SP-128A → SP-128B. SP-127A and SP-128A are independent of each other and of the frontend work; the order above front-loads the read model the two frontend surfaces both consume.

**Do not start SP-127B, SP-128B, or SP-129A before their `ui-refiner` pass** — the layout, hierarchy, states, and copy of those three surfaces are deliberately undecided (D404-9).

## Stories

| Story | Epic proposed story | Breakdown | Layer | Jira |
|---|---|---|---|---|
| [SP-127](./SP-127/README.md) | 1. Build the weekly academic calendar (+ 2. Display course meetings, 3. Display assignments and exam deadlines, 4. Display planned study sessions) | 2 children: A (backend read model), B (frontend week view) | Backend + Frontend | Pending creation |
| [SP-128](./SP-128/README.md) | 5. Implement study availability and unavailable blocks | 2 children: A (backend CRUD), B (frontend settings page) | Backend + Frontend | Pending creation |
| [SP-129](./SP-129/README.md) | 6. Build the mobile agenda view | 1 child: A (frontend agenda presentation) | Frontend | Pending creation |

All six of the epic's proposed stories are covered. The epic defines no test requirements; test obligations are owned per child (see the traceability table).

## Epic acceptance criteria — ownership

Original wording from [EP04](../../epics/EP04-academic-calendar-and-availability.md#acceptance-criteria); stable IDs assigned here (the epic carries none).

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Students can view academic events by week. | AC-E04-01 | **SP-127A** (read model returns a date range) + **SP-127B** (week view). |
| Classes and deadlines display on their correct dates. | AC-E04-02 | **SP-127A** (recurring-meeting expansion + local-date bucketing) + **SP-127B** (rendering on the correct day). |
| Scheduled study sessions appear after they are created. | AC-E04-03 | **SP-127A** (session events in the read model) + **SP-127B** (rendering). *Creation is owned by EP06/EP07 — see the traceability note below.* |
| Students can configure recurring study availability. | AC-E04-04 | **SP-128A** (CRUD) + **SP-128B** (editor). |
| Students can block unavailable times. | AC-E04-05 | **SP-128A** (CRUD, `isAvailable: false`) + **SP-128B** (editor). |
| Events can be opened to view details. | AC-E04-06 | **SP-127B** (event details dialog). |
| Calendar dates respect the student's selected time zone. | AC-E04-07 | **SP-127A** (server-side zone resolution) + **SP-127B** (the zone label it renders). |
| Different event types are identifiable without relying on color alone. | AC-E04-08 | **SP-127B**, **SP-129A** (icon + text label per type). |

### Cross-epic note on AC-E04-03

The calendar read model (`SP-127A`) includes study-session events, but **EP04 creates no study sessions** — the user decision (2026-10-28) keeps session creation with EP06 (planned sessions) and EP07 (focus sessions / actual time). `SP-127A`'s integration proof seeds a session row directly and asserts it appears in the calendar payload; the end-to-end "created in the product → visible on the calendar" path is therefore owned by EP06/EP07, and EP04's calendar contract is the seam that must not change when they land. This is recorded, not dropped.

## Requirement and test traceability

The epic defines no test requirements (TR-*). Story-level obligations are owned per child:

| Req | Requirement | Owning children |
|---|---|---|
| AC-E04-01 | Weekly view of academic events | SP-127A, SP-127B |
| AC-E04-02 | Correct dates for classes and deadlines | SP-127A, SP-127B |
| AC-E04-03 | Study sessions appear once created | SP-127A, SP-127B (creation: EP06/EP07) |
| AC-E04-04 | Configure recurring study availability | SP-128A, SP-128B |
| AC-E04-05 | Block unavailable times | SP-128A, SP-128B |
| AC-E04-06 | Open an event for details | SP-127B |
| AC-E04-07 | Student-selected time zone | SP-127A, SP-127B |
| AC-E04-08 | Event types distinguishable without color | SP-127B, SP-129A |

Shared DoD ([docs/epics/README.md](../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | SP-127A/B, SP-128A/B, SP-129A |
| 2 invalid-input validation | SP-127A (range/date validation), SP-128A (field + cross-field rules), SP-128B (client mirror) |
| 3 student data scoping | SP-127A, SP-128A (every read/write carries the principal's `userId`; uniform 404) |
| 4 actionable API errors | SP-127A, SP-128A (field-level 400 / uniform 404 / 409 conflicts), SP-127B, SP-128B (message display) |
| 5 loading, empty, error states | SP-127B, SP-128B, SP-129A |
| 6 keyboard accessibility | SP-127B, SP-128B, SP-129A |
| 7 responsive layouts | SP-127B (week view), SP-129A (mobile agenda) |
| 8 automated tests | SP-127A (unit + data-scoping + integration), SP-127B (component), SP-128A (unit + data-scoping + integration), SP-128B (component), SP-129A (component) |
| 9 API/migration documentation | SP-127A, SP-128A (the shared contract below; **no migration** — the existing Prisma models cover both surfaces) |
| 10 integrated review | Per parent: SP-127, SP-128, SP-129 (browser pass + combined review) |
| 11 reviewer walkthrough | Reviewer, once per parent review unit |

## Shared API contract

Fixed cross-child contract. SP-127A and SP-128A implement it; SP-127B, SP-128B, SP-129A consume it; each parent's combined review verifies it end to end.

```text
GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD
  from/to: calendar dates in the student's profile time zone, inclusive;
            from <= to; the span may not exceed 31 days.
  200 → {
    timeZone: "America/New_York",       // the student's stored User.timeZone
    today: "2026-10-28",                // that zone's current date
    from: "2026-10-25", to: "2026-10-31",
    events: [ CalendarEvent, ... ]      // sorted: date asc, startTime asc, type, id
  }
  400 → field-level errors map (from/to shape, order, span)
  401 → unauthenticated

CalendarEvent {
  id: string            // stable per occurrence, e.g. "class:<meetingId>:2026-10-27"
  type: "CLASS" | "ASSIGNMENT_DEADLINE" | "EXAM_DEADLINE" | "STUDY_SESSION"
      | "AVAILABILITY" | "BLOCKED_TIME"
  title: string
  subtitle: string | null       // course code for CLASS / deadlines; null otherwise
  date: string                  // yyyy-MM-dd in the student's time zone
  startTime: string             // HH:mm in the student's time zone
  endTime: string | null        // HH:mm; null for point events (deadlines)
  courseId: string | null
  courseName: string | null
  courseColor: string | null
  assignmentId: string | null
  completed: boolean            // deadlines only; false for other types
  focus: boolean                // STUDY_SESSION only (StudySession.isFocusMode)
  link: string | null           // e.g. "/courses/<courseId>"
}

GET    /availability-slots
  200 → [{ id, dayOfWeek, startTime, endTime, isAvailable, createdAt, updatedAt }]
         ordered dayOfWeek asc, then startTime asc
POST   /availability-slots
  body: { dayOfWeek: 0-6, startTime: "HH:mm", endTime: "HH:mm", isAvailable?: boolean }
  201 → the created slot
  400 → field-level errors (dayOfWeek range, HH:mm pattern, endTime > startTime)
  409 → duplicate (userId, dayOfWeek, startTime)
PATCH  /availability-slots/:id
  body: { dayOfWeek?, startTime?, endTime?, isAvailable? }   // partial merge
  200 → the updated slot (validated on the merged values)
  400 → field-level errors (incl. an empty body)
  404 → uniform "Resource not found" (missing / foreign / malformed id)
  409 → duplicate (userId, dayOfWeek, startTime) after the merge
DELETE /availability-slots/:id
  204 → deleted
  404 → uniform "Resource not found"
```

Conventions both endpoints follow: the principal's `userId` comes from `@CurrentUser()` (never a body/query field); unknown fields are rejected by the global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`); the service re-checks every rule as defense in depth; a not-owned or missing record is always the same uniform 404 `Resource not found` (never 403).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D404-1 | **One calendar read model.** `GET /calendar/events` returns every event type for a date range as one normalized payload (the epic's technical note: "Create a normalized calendar-event representation for the frontend"). Meetings, deadlines, sessions, and availability are not separate endpoints the page stitches together. | Epic technical notes + the repo's existing projection pattern (`GET /courses/:id` returns meetings + assignments in one read). |
| D404-2 | **The server owns the date math.** Range bucketing, recurring-weekly expansion, and time-zone conversion happen in `SP-127A`; the frontend receives pre-bucketed local `date` + `HH:mm` values and does no zone arithmetic. | The epic AC "calendar dates respect the student's selected time zone" plus the DST hazard in the epic's technical note; it also keeps one tested implementation instead of two. |
| D404-3 | **The time zone is the stored profile zone, not a request parameter.** `SP-127A` resolves `User.timeZone` (schema default `"UTC"`, set by the Profile page, SP-106A) server-side; the API accepts no `tz` parameter. The payload echoes the zone so the UI can label it. | The AC says "the student's selected time zone" — the profile is where the student selects it; a client-supplied zone would let the page disagree with the profile. |
| D404-4 | **Recurring class meetings are weekly wall-clock and are not converted to instants.** A meeting stored as `dayOfWeek` + `HH:mm` (the `ClassMeeting` model, SP-112A) occurs at that local wall time on every matching date, so a DST change never shifts it; the payload carries the local `date` + `HH:mm` only. Assignment deadlines and study sessions are instants and are converted into the student's zone. | The `ClassMeeting` schema (no date/time-zone columns) + the epic's "handle time zones and daylight saving transitions" note. |
| D404-5 | **Availability uses the existing `AvailabilitySlot` model as-is — no migration.** `dayOfWeek` + `startTime`/`endTime` + `isAvailable` covers recurring available windows (`isAvailable: true`) and recurring blocked times (`isAvailable: false`). One-off dated blocks are **out of scope** for EP04 (the model is weekly-recurring); the user confirmed recurring-only on 2026-10-28. The epic's technical note ("keep recurring availability separate from actual planned study sessions") is honored as follows: availability stays a **recurring template** the student edits through its own resource (`/availability-slots`), a session is a **concrete instance** with a real start/end, they are different event types in the payload, and no availability slot is ever persisted as a session (or the reverse). They share one calendar payload only so the student can see both in one week. | The existing Prisma model + user decision 2026-10-28 + the epic's technical note. Reversible if dated blocks are requested later (a new model + migration). |
| D404-6 | **EP04 creates no study sessions.** The calendar reads `StudySession` rows; creation stays with EP06 (planned sessions) and EP07 (focus sessions). AC-E04-03's end-to-end proof is therefore owned by EP06/EP07; `SP-127A` proves the read path with a seeded row. | User decision 2026-10-28 + the epic's own dependency note ("Study-session display integrates with EP06"). |
| D404-7 | **Archived courses' recurring meetings are excluded; their assignment deadlines are not.** Archiving a course means "I no longer attend this" (SP-111), so its weekly meetings leave the calendar; a dated assignment deadline is a fact about that week and stays. The assignments page lists deadlines regardless of the course's archived state, so the calendar matches it. | SP-111's archive semantics + the existing assignments list behavior. Reversible. |
| D404-8 | **Completed deadlines stay on the calendar, labelled.** An assignment in `COMPLETED`/`GRADED` still shows its deadline in its week, marked with a text "Completed" label (not color-only), so reviewing a past week shows the truth. EP03's "unfinished" filtering applies to work lists, not to a dated schedule. | EP03's AC-E03-05 is scoped to unfinished-work views; the calendar is a schedule. Reversible. |
| D404-9 | **The three frontend children are `Needs refinement`.** Week-view layout (time grid vs. day columns, event-chip density, week start, hour range, day-column headers), the availability editor's interaction model, and the mobile agenda's presentation are deliberately undecided; `ui-refiner` records them before implementation. | The planner skill's UI/UX handoff rule. |
| D404-10 | **Frontend data access follows the implemented convention, not the EP05 note.** The calendar and availability clients are plain-axios entity API modules (`entities/calendar/api`, `entities/availability/api`), matching `entities/course/api/courseApi.ts` and `entities/assignment/api/assignmentApi.ts`. EP05's "use RTK Query" note is EP05's own decision for the dashboard and does not bind EP04; adopting RTK Query later is a client-side change with no contract impact. | The code as implemented (only `features/session/api/sessionApi.ts` uses RTK Query) + EP05's technical note. |
| D404-11 | **Availability has its own top-level resource** (`/availability-slots`), not a nested route under courses or a calendar sub-route: an availability slot belongs to the student, not to a course, and its lifetime is independent of the calendar surface. | The repo's resource-topology precedent (`/assignments` top-level — D113-2; meetings nested only because a meeting is intrinsic to its course — D112-2). |
| D404-12 | **The availability editor lives on its own page** (`/availability`), reachable from a "Manage availability" link on the calendar page and from the header nav. Keeping it off the calendar page keeps the week view uncluttered (ADHD-friendly) while staying discoverable. | The scope list treats availability as its own surface; the ui-refiner may revisit the entry point under D404-9. |
| D404-13 | **Study-session events carry a `focus` flag** derived from `StudySession.isFocusMode`, so focus blocks and plain study blocks are distinguishable in text, not only by color. | The `StudySession` schema column + AC-E04-08. |

## Code baseline (inspected 2026-10-28, not proposed)

- **Prisma** (`apps/api/prisma/schema.prisma`): `ClassMeeting` (userId, courseId, dayOfWeek 0–6, startTime/endTime `HH:mm`, `@@unique([courseId, dayOfWeek, startTime])`); `AvailabilitySlot` (userId, dayOfWeek, startTime, endTime, `isAvailable @default(true)`, `@@unique([userId, dayOfWeek, startTime])`); `StudySession` (userId, startTime/endTime instants, durationMinutes, notes, `isFocusMode @default(true)`, rating); `Assignment.dueDate DateTime?` (nullable, SP-113B) with `type AssignmentType?` (SP-115G); `User.timeZone String @default("UTC")` (SP-106A). **No migration is required for EP04** — both surfaces already have models.
- **API modules** (`apps/api/src/modules/`): assignments, auth, courses, email, onboarding, prisma, semesters, users. There is **no calendar module and no availability module** — EP04 creates both.
- **API conventions**: `apps/api/src/common/ownership/ownership.ts` (`ownedWhere`, `assertOwned`, `assertAffected`, uniform 404; the scope list already names `ClassMeeting`, `StudySession`, and `AvailabilitySlot`); `apps/api/src/common/pipes/validation.pipe.ts` (global whitelist + `forbidNonWhitelisted`); `apps/api/src/common/lib/calendar-date.ts` (the `yyyy-MM-dd` calendar-date parse/format precedent — no instant, no zone); `apps/api/src/common/decorators/current-user.decorator.ts` (`@CurrentUser()` only; the JWT principal carries id/email/name, **not** the time zone — the service must read `User.timeZone` from the database).
- **API test harness**: `apps/api/src/test/test-http.ts` (`createIntegrationApp` — real HTTP, real Postgres, self-skips without `DATABASE_URL`; it registers each feature module explicitly, so the new calendar and availability modules must be added there). Ownership specs live beside the module (`assignments-data-scoping.spec.ts`, `courses-meetings-data-scoping.spec.ts`).
- **Web app** (`apps/web/src/`): FSD layers `app / pages / widgets / features / entities / shared` with `import/no-restricted-paths` enforcement (`apps/web/.eslintrc.cjs`). Existing entity API modules use plain axios over `@/shared/api/httpClient` (`entities/course/api/courseApi.ts`, `entities/assignment/api/assignmentApi.ts`); RTK Query exists only in `features/session/api/sessionApi.ts`. Routes are registered in `apps/web/src/app/App.tsx`; the authenticated nav lives in `apps/web/src/widgets/header/ui/Header.tsx` (Home / Dashboard / Semesters / Courses / Assignments / Profile). `apps/web/src/shared/lib/datetime.ts` provides zone-aware `formatDate`/`formatTime`/`formatDateTime` and `getTimeZones()` — display helpers only; EP04's calendar arithmetic is server-side (D404-2).
- **Design reference for the frontend**: the redesigned `/assignments` page (`apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — `max-w-5xl` shell, header + upper-right CTA, a toolbar outside the results card, `role="status"` count header, distinct empty/no-match/error states) and the redesigned `/courses` page (`apps/web/src/pages/courses/ui/CoursesPage.tsx` + `features/courses/ui/CourseCard.tsx` + `CourseActionsMenu.tsx`, SP-126). The calendar and availability surfaces follow the same visual system.
- **No calendar/availability code exists** in the web app: no `pages/calendar`, no `pages/availability`, no `entities/calendar`, no `entities/availability`, no `features/calendar`, no `features/availability`.

## Security invariants and counterexamples

No new credential or tenancy surface; the invariants are ownership and input sanity.

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A calendar never leaks another student's events | Student B requests the calendar and passes student A's course id, assignment id, or availability-slot id | The read model is a single principal-scoped query set (`where: { userId }` on every model); the calendar accepts **no id parameters at all** — the range is the only input. Availability writes scope by `ownedWhere(userId, id)`; a foreign id returns the uniform 404 | SP-127A (data-scoping spec), SP-128A (data-scoping spec) |
| An availability slot cannot be hijacked by id | Student B PATCHes student A's slot id | `ownedWhere(userId, id)` in the where clause; Prisma P2025 is normalized to the same uniform 404 by the global filter; the client cannot send `userId` (unknown field → 400) | SP-128A (unit + data-scoping) |
| Availability times are sane and non-overlapping with themselves | Client posts `dayOfWeek: 7`, `startTime: "9:00"`, `endTime: "09:00"` (not strictly after), or an unknown field | DTO decorators + service re-check (backend authoritative); the cross-field `endTime > startTime` rule and the 0–6 range are enforced server-side; `forbidNonWhitelisted` rejects unknown fields; nothing is written on failure | SP-128A (validator + 400 cases), SP-128B (form mirrors the rules) |
| The calendar cannot be used to widen the read surface | Client sends `tz`, `courseId`, `userId`, or `includeArchived` as query parameters | The calendar query DTO whitelists `from`/`to` only; the global pipe rejects unknown query parameters with a 400; archived-course exclusion is a fixed server-side rule (D404-7), not a client switch | SP-127A (query validation tests) |
| The zone cannot be spoofed to shift a deadline to another day | Client sends `tz=Pacific/Auckland` to move a deadline across midnight | No zone parameter exists (D404-3); the zone comes from the stored `User.timeZone` row | SP-127A (contract test) |

## Plan correction log

(First plan of this epic. Implementation review findings are appended here with stable IDs and are never rewritten.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|

## Quality gate (2026-10-28)

**Verdict: Draft** — the breakdown is complete and internally consistent, but the three frontend children are `Needs refinement` (D404-9) and the plan cannot be `Plan Ready` for them until the `ui-refiner` pass records the layout, states, and copy. The backend children are `Ready`. No implementation blocker exists (EP02 and EP03 are complete).

| # | Check | Result | Reference |
|---|---|---|---|
| 1 | Child separation and sizing | Pass | Five implementation children across three parents; each has a sizing block grounded in inspected files. The split is layer + surface based: a read-model API, its week view, an availability API, its editor, and the mobile agenda presentation. No README-only, status-only, or verification-only children — e2e specs and the parent index belong to the frontend children (EP03's SP-125 pattern). |
| 2 | Original AC/TR coverage | Pass | All eight original ACs mapped to owners above; the epic defines no TRs; the AC-E04-03 creation dependency on EP06/EP07 is recorded explicitly, not dropped. |
| 3 | Definition of Done | Pass | DoD map above; items 1–11 assigned per child. Item 9 is satisfied by the shared contract (no migration). |
| 4 | Contract consistency | Pass | One shared contract section; SP-127A/SP-128A implement, the frontend children consume, each parent's combined review verifies. |
| 5 | Code paths inspected | Pass | Baseline section (schema, API modules, ownership/validation conventions, test harness, web FSD layout, nav/routes, design references). Unverified: no browser screenshots were taken and the `ui-refiner` decisions are outstanding by design. |
| 6 | Feature-specific risks/counterexamples | Pass | Scheduling/time-zone risks: DST (D404-4), week-range boundaries and the 31-day cap (SP-127A), zone resolution from the profile (D404-3), and the ownership/input invariants table above. |
| 7 | Dependencies | Pass | EP02 + EP03 complete (satisfied); SP-127A → SP-127B → SP-129A; SP-128A → SP-128B. No EP04 child depends on EP05+; EP05 (dashboard) and EP06 (scheduling) consume EP04's outputs later. |
| 8 | Material decisions | Blocked | D404-9: the layout/hierarchy/states/copy of the three frontend surfaces are for `ui-refiner`. D404-1…8 and D404-10…13 are planner-recorded, grounded, and reversible. |
| 9 | Correction log | Pass | Empty — first plan of this epic. |
| 10 | Jira identity | Not applicable | No sync was authorized; all keys are `Pending creation`. |

## Final implementation review units

One combined review per parent — no per-child review gate.

| Parent | In-scope children | Artifact paths | Integration/index owner | Gate |
|---|---|---|---|---|
| [SP-127](./SP-127/README.md) | SP-127A, SP-127B | `./artifacts/SP-127/` | SP-127B (writes `./artifacts/SP-127/implementation.md`) | One combined SP-127 review after both children (`review.md` + `walkthrough.md`) |
| [SP-128](./SP-128/README.md) | SP-128A, SP-128B | `./artifacts/SP-128/` | SP-128B (writes `./artifacts/SP-128/implementation.md`) | One combined SP-128 review after both children |
| [SP-129](./SP-129/README.md) | SP-129A | `./artifacts/SP-129/` | SP-129A (writes `./artifacts/SP-129/implementation.md`) | One combined SP-129 review after the child |

Child implementation completion unblocks the dependent child; only the passing combined review establishes sign-off.
