# EP15: Schedule & Availability Redesign

**Epic ID:** EP15
**Status:** **Closed 2026-11-17** — all ten children implemented and the combined review passed at `c3f0892` (report: [artifacts/EP15/review.md](../stories/EP15/artifacts/EP15/review.md), sync `c9b6ef2`); R-EP15-19 closed by user confirmation 2026-11-17; remaining polish (R-EP15-20/21) tracked as EP15 backlog rows. Optional follow-up EP15K scheduled as its own unit (user, 2026-11-17). History: plan review passed 2026-11-16 (`dc5b20b`); all D15 decisions ratified by the user 2026-11-16. No tracker sync.
**Release:** 1.2 (post-1.1.x hardening)
**Priority:** High / P0
**Labels:** `studypilot`, `adhd`, `schedule`
**Dependencies:** EP04 (calendar read model, closed), EP06/EP13 (engine, closed), EP14 (in flight — one sequential writer). Cross-cutting into EP11 (navigation) and EP12A (civil-date helpers).
**Milestone:** M8 (D15-11).

## Epic Summary

Replace the opt-in "declare when you can study" model with a calendar the
student actually lives in: set when each day starts and ends, put work,
commutes and other commitments on the grid (once or weekly), mark the study
blocks you intend to keep, and everything left over is available for study.
The planner reads exactly what the calendar shows.

## Description

As a student with ADHD, I want to block out my real life on a calendar —
when I sleep, when I work, when I have class, when I intend to study — and
have StudyPilot treat the rest as study time, so that planning starts from
what my week really looks like instead of from a list of time slots I had to
invent in advance.

Today availability is inverted from how students think. The `/availability`
page asks the student to enumerate free windows, the planner refuses to
place anything outside them, and a student who has not done that homework
gets `NO_AVAILABLE_TIME`. Everything is weekly-recurring; there is no way to
say "I work this Saturday" or "no class next Tuesday". The calendar itself is
read-only: seven day columns of chips with no hour axis, and the editing
lives on a separate page in a dialog.

This epic makes the calendar the one scheduling surface. Scheduling stays
**deterministic** (explicit rules, no AI, no randomness; EP13's D13-1 and
AC-E13-14 stand). Non-blaming copy (EP08 D08-8, EP13 D13-9) binds every
new surface. **Minimalism binds every surface too (D15-14):** complexity
deters the students this product is for.

## Scope

- **Day bounds:** per-weekday wake and sleep times, with a stated default and
  a non-blocking prompt to set them.
- **Events:** student-created busy time (work, commute, appointments, …),
  one-off on a date or weekly on a set of weekdays with a start date and an
  optional end date; single-occurrence cancel; "this and following" change.
- **Study blocks:** recurring or one-off windows the student intends to
  study in, optionally tied to a course, carrying an energy level; the
  planner fills them first.
- **Free time as a first-class thing:** the calendar labels the remaining
  time as available for study, computed by the same function the planner
  uses.
- **A real week grid** with an hour axis and direct manipulation (select a
  range to create; move/resize), with a full keyboard and form path and a
  narrow-screen agenda equivalent.
- **Migration and retirement** of `AvailabilitySlot`, `/availability-slots`
  and the `/availability` page; navigation updated.
- **FU-EP04-01** (the calendar page's browser-local week derivation) is
  absorbed, since the page is rebuilt (D15-12).

## Out of scope

- External calendar import or sync (ICS, Google, Outlook) — backlog row.
- Reminders and notifications (EP13 D13-8 stands).
- Recurrence beyond weekly (biweekly, monthly, "every N weeks") — backlog row.
- Day bounds that cross midnight (D15-4 option b) — backlog row.
- Study blocks tied to a specific assignment (course-level only, D15-6).
- Editing class meetings from the calendar (they stay course-owned; the
  calendar links to the course).
- AI, syllabus parsing, LMS, grades, flashcards, native mobile.

## Acceptance Criteria (agreed 2026-11-16; stable IDs AC-E15-01…14 in the breakdown README)

**Day bounds**

1. A student can set, for each weekday, the time they wake and the time they
   go to sleep. A student who has never set them gets a stated default
   (08:00–23:00, D15-13) and sees a one-time, dismissible prompt to set them;
   nothing is blocked while the default is in force.
2. The planner never places a study session outside the student's day
   bounds for that weekday.

**Events (busy time)**

3. A student can add, edit and delete events (work, commute, appointments and
   the like) on the calendar, either as a one-off event on a date or as a
   weekly event on one or more weekdays with a start date and an optional end
   date.
4. A single occurrence of a weekly event can be cancelled, and a weekly event
   can be changed from a chosen date onward without altering its earlier
   occurrences.
5. The planner never places a study session over an event, a class meeting,
   a confirmed study session, or a locked or completed planned session.

**Study blocks**

6. A student can add, edit and delete study blocks (one-off or weekly),
   optionally tied to a course and carrying an energy level (HIGH / NORMAL /
   LOW). The planner fills a student's study blocks before any other free
   time, prefers the tied course's work inside a tied block, and treats free
   time inside a block as having that block's energy and all other free time
   as NORMAL.
7. Study blocks never reduce free time: time outside them, inside day bounds
   and not otherwise busy, stays available for study.

**Free time and the read model**

8. For every day in view the calendar shows the day bounds, every event,
   class meeting, deadline, study block and planned session, and the
   remaining free time labelled as available for study. The free time the
   calendar shows is computed by the same function the planner uses, so the
   two can never disagree.
9. All date and time arithmetic — recurrence expansion, time zone, daylight
   saving, free-time computation, the current week and its day headers — is
   server-owned in the student's profile zone; the client sends a date range
   and performs no zone arithmetic. (Closes FU-EP04-01.)

**Interaction**

10. On a pointer device a student can create an event or study block by
    selecting a time range on the week grid, and can move or resize an
    existing one by dragging. Every create, edit and delete is also reachable
    by keyboard and through a form, with identical results.
11. On narrow screens the agenda view offers the same create, edit and
    delete capabilities through the form path.
12. Day bounds, events, class meetings, deadlines, study blocks, planned
    sessions and free time are each identifiable without relying on colour
    alone, and opening any item shows its details.

**Migration, contract and invariants**

13. Every existing recurring blocked time becomes a weekly event and every
    existing available window becomes a weekly study block that keeps its
    energy; no student loses data. The `/availability` page and the
    `/availability-slots` API are retired; the old route redirects to the
    calendar and navigation is updated.
14. Identical inputs produce identical plans; no randomness. Every new
    resource is scoped to the authenticated student on every read and write,
    with the uniform 404 on misses.

## Requirements carried forward (unchanged, re-owned here)

EP04's AC-E04-01 (view by week), AC-E04-02 (classes and deadlines on the
correct dates), AC-E04-03 (planned sessions appear), AC-E04-06 (events open
to details), AC-E04-07 (profile time zone), AC-E04-08 (types identifiable
without colour) are preserved verbatim by the rebuilt surface; AC-E04-04/05
(recurring availability, blocked times) are superseded by AC-E15-03…07 and
AC-E15-13. EP06's AC-E06-03 ("places work only inside available study
windows") is re-read as "inside day bounds, not over busy time" (D15-1).
EP13's AC-E13-10 (energy attracts demanding work) continues to hold via
AC-E15-06.

## Proposed Stories

See the [breakdown README](../stories/EP15/README.md): EP15A (model,
migration, recurrence domain), EP15B (schedule API), EP15C (engine), EP15D
(planner gathering + calendar read model), EP15E (week grid), EP15F (day
bounds UI), EP15G (add/edit/delete via form), EP15H (direct manipulation),
EP15I (retirement + navigation), EP15J (cross-layer E2E + parent index).

## Technical Notes

### Inspected baseline (2026-11-16, not proposed)

- `apps/api/prisma/schema.prisma`: `AvailabilitySlot { dayOfWeek, startTime, endTime, isAvailable, energy }` with `@@unique([userId, dayOfWeek, startTime])`; `ClassMeeting` (course-owned, weekly wall-clock); `PlannedSession { anchor, windowHint, locked, status }`; `User.timeZone`, `User.preferences` (4096-byte bag). Last migration `20261116130000_assignment_hard_flag` (EP14E; `Assignment.hard` added). `AvailabilitySlot` at L328–344 after EP14E.
- `apps/api/src/modules/availability/*`: CRUD over `/availability-slots`; same-day `HH:mm` only, midnight wrap is 400 (SP-128A).
- `apps/api/src/modules/calendar/calendar.service.ts`: one read model `GET /calendar/events?from&to` (≤ 31 days), server-side weekly expansion, profile zone from `User.timeZone` (D404-1…D404-4). Event types `CLASS | ASSIGNMENT_DEADLINE | EXAM_DEADLINE | STUDY_SESSION | PLANNED_SESSION | AVAILABILITY | BLOCKED_TIME`.
- `apps/api/src/domain/study-planning/intervals.ts`: the one `freeIntervals({ base, blocked, classes, busy, placed })` helper; `base` is `{ kind: 'declared', windows }` or `{ kind: 'whole-day' }` (EP06D's save-time re-check, D06-12). Energy-aware merge (EP13J D-J2).
- `apps/api/src/domain/study-planning/scheduler.ts`: placement v2 scans gaps via `byEnergyPreference(free, demanding, minBlock)` — energy preference (D-J3) plus EP14E's day-centric light-work guard; `isDemanding` honours `Assignment.hard`; pure, zone-free.
- `apps/api/src/modules/study-plans/study-plans.service.ts` (`gatherPlanData`, ~L1016–1150): slots → `available` / `blocked` weekly windows; class meetings → `classes`; confirmed + preserved planned rows → `busy`.
- `apps/web/src/pages/calendar/ui/CalendarPage.tsx`: week derived from the browser clock (FU-EP04-01 open); `WeekView.tsx`: seven chip columns, no hour grid (D127B-1); `CalendarAgenda` below 640px (D129A-01).
- `apps/web/src/pages/availability/*`, `features/availability/*`: dialog-based CRUD (SP-128B, D128B-*).
- `apps/web/src/widgets/header/ui/navGroups.ts`: Planning = Calendar, Availability, Plan, Plan health (EP13E D-E13); Availability also in the account menu (EP11 D11-4/D11-6/D11-8).

### Shape

The data model, API, calendar payload, engine input and recurrence
semantics are specified once in [contracts.md](../stories/EP15/contracts.md).

### Decision register (ratified by the user, 2026-11-16; ▲ = material)

| ID | Decision | Options considered | Recommended | Ruling |
|---|---|---|---|---|
| ▲ D15-1 | Availability model | (a) invert: day bounds are the base, events subtract, study blocks are preferences; (b) keep opt-in windows and add day bounds as an extra clamp; (c) both models behind a per-student mode switch | **(a)** — it is the vision, it removes the `NO_AVAILABLE_TIME` dead end for new students, and the interval algebra needs no change (the base just becomes wake–sleep) | Ratified (user, 2026-11-16) |
| ▲ D15-2 | Persistence | (a) two new tables + an exceptions table, `availability_slots` migrated and dropped; (b) reuse `AvailabilitySlot` with new columns; (c) day bounds in the `preferences` JSON bag | **(a)** — one-off events and exceptions do not fit the weekly-unique slot model; the bag is capped at 4 KB and already holds study defaults | Ratified (user, 2026-11-16) |
| ▲ D15-3 | Public contract | (a) retire `/availability-slots` and `/availability`; add `/schedule/day-bounds`, `/schedule/blocks`, `/schedule/blocks/:id/occurrences/:date`; extend `GET /calendar/events` additively (`days[]`, new types) and drop the two old types; (b) keep `/availability-slots` as a compatibility facade | **(a)** — one client, no external consumers; a facade would keep two write paths for one truth | Ratified (user, 2026-11-16) |
| ▲ D15-4 | Day bounds crossing midnight | (a) v1: wake and sleep within one civil day, sleep strictly after wake, `24:00` allowed as the sleep value; cross-midnight is a backlog row with a trigger; (b) support cross-midnight by splitting the bound into the evening of day D and the small hours of day D+1 | **(a)** — the engine, density cap and daily cap are all per civil day; (b) changes "what is a study day" for every rule. Trigger for (b): a student sets 24:00 on three or more weekdays, or a user asks | Ratified (user, 2026-11-16) |
| D15-5 | Recurrence and exceptions | (a) weekly on a weekday set, start date, optional end date; one-off = no weekdays; exceptions = cancel one occurrence; "this and following" = end the series the day before and create a new one; "this occurrence only" edit = cancel + one-off create (the UI may offer it as one action); (b) RFC 5545 RRULE | **(a)** — covers work, commute and term changes; RRULE is a parser and an exceptions model we do not need yet | Ratified (user, 2026-11-16) |
| ▲ D15-6 | Study-block semantics | (a) preferred, not exclusive: filled first, free time elsewhere still usable; course tie is a preference, assignment tie not offered; (b) exclusive: the planner places only inside study blocks (today's model, re-skinned); (c) a per-student "only in my study blocks" toggle | **(a)**, with (c) as a backlog row (trigger: a user asks for containment) — exclusivity re-creates the dead end D15-1 removes | Ratified (user, 2026-11-16) |
| D15-7 | Energy's home | (a) energy lives on study blocks; free time outside a block is NORMAL; migrated windows keep their level; BL-14-01 ("my mornings are high energy") is re-reviewed at breakdown — a study block Mon–Fri 08:00–12:00 HIGH *is* that feature; (b) a separate energy-overlay entity | **(a)** | Ratified (user, 2026-11-16); BL-14-01 dropped as superseded at breakdown |
| D15-8 | Save-time conflict re-check base | (a) keep EP06D's `whole-day` base so a student may drag a session outside day bounds on purpose; (b) clamp manual edits to day bounds | **(a)** — the engine respects bounds, the student may override them; a 400 for "you said you'd be asleep" is not our call | Ratified (user, 2026-11-16) |
| ▲ D15-9 | Surface and navigation | (a) `/calendar` is the single schedule surface (label stays "Calendar"); `/availability` redirects there; Availability leaves the Planning group (which keeps Calendar, Plan, Plan health) and the account menu (amends EP11 D11-4/D11-6/D11-8); Plan page unchanged; (b) rename to "Schedule" | **(a)** — the route and label are already learned; renaming buys nothing | Ratified (user, 2026-11-16) **Superseded in part by EP16 D16-6 (2026-11-17):** the Planning group is dissolved — Calendar and Plan become top-level entries and Plan health retires (EP16C/EP16D). |
| ▲ D15-10 | Week grid | (a) an hour-axis week grid with direct manipulation replaces the chip columns (reverses EP04's D127B-1); day bounds render as the shaded region outside wake–sleep; chip columns remain the narrow-screen agenda's basis; (b) keep chip columns and add a separate editor grid | **(a)** — one grid, one mental model; exact interaction, hour range, snapping and copy are the refiner's (D404-9 precedent) | Ratified (user, 2026-11-16) |
| D15-11 | Milestone and sequencing | (a) new M8, release 1.2; planning proceeds now, implementation after the EP14 review unit passes; (b) fold into M7 | **(a)** — EP14 is hardening; this is product scope with a migration | Ratified (user, 2026-11-16) |
| D15-12 | FU-EP04-01 | (a) absorbed: AC-E15-09 owns the fix and its four required tests; (b) a standalone child before EP15 | **(a)** — the page is rebuilt; fixing it twice is waste | Ratified (user, 2026-11-16) |
| D15-13 | Default day bounds | (a) 08:00–23:00 every day; (b) 07:00–22:00; (c) no default — bounds are required before planning | **(a)** — a generous default keeps the planner usable on day one; (c) re-creates the opt-in dead end | Ratified (user, 2026-11-16) |
| ▲ D15-14 | **Minimalism principle** (binding on every EP15 surface; user instruction 2026-11-16: "minimalism and ease of use at the forefront for ADHD users; complexity will deter users") | — | (1) One surface (the calendar), one primary action ("Add"), two kinds (Busy / Study); no categories, colours, labels or tags beyond that. (2) Defaults for everything: bounds default, a new block defaults to the selected range (or the next whole hour), one-off, title optional. (3) Progressive disclosure: end date, course and energy sit behind one "More" disclosure and appear only when relevant. (4) Never block: setup prompts are dismissible banners, never modals or required steps. (5) Two-choice questions only: a weekly occurrence asks "Just this day" or "This and following" — never a third option. (6) Copy is short, concrete, non-blaming; no "recurrence", "series" or "exception" in UI text. (7) Nothing new in Profile/Settings: bounds are edited where they are seen. | Ratified (user, 2026-11-16) |

### Verification tasks

- **V-15-1:** AC-E15-08 invariant — one fixture, two call sites (`calendar.service` and `gatherPlanData`), identical free intervals, including a DST transition day and a day with a cancelled occurrence (EP15D).
- **V-15-2:** migration round-trip on a seeded database: every `availability_slots` row has exactly one `schedule_blocks` successor with the same weekday, times, kind and energy (EP15A).
- **V-15-3:** determinism — same inputs with events and study blocks → byte-identical plan (extends EP13J-AC3's identity test) (EP15C).
- **V-15-4:** ownership — every new table is reached through `userId`; cross-student reads/writes return the uniform 404; the calendar payload never carries another student's row (EP15B, EP15D).
