# SP-115H: Assignment Type UI

**Story ID:** SP-115H
**Title:** Frontend: set and show an optional assignment type
**Parent:** [SP-115](./SP-115-assignment-types.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Refined:** 2026-10-25 (ui-refiner — UI/UX gaps settled in `Decisions` below)
**Status:** Implementation complete — awaiting parent review
**Dependencies:** SP-115G implemented (contract and migration) — met 2026-10-25. UI/UX gaps were settled by `ui-refiner` 2026-10-25; no remaining pre-code gate.
**Jira key:** Pending creation

## Summary

On the course page, a student can classify an assignment as homework, a paper,
a project, a quiz, or an exam when creating or editing it, and can see that
classification on the assignment. Leaving it unset does not invent a type.
Editing does not clear a type already stored.

## Bounded scope

In: the shared assignment type, the create/update client payload, the existing
course-detail form and assignment row, the fixtures those types force, and
this child's closeout (component tests, DoD-10 browser note, parent index).

Out: a new assignments page, type filters, overdue styling, status changes,
and any control that claims a blank type clears the stored value. If
implementation needs a new screen or a filter, stop and return that split to
the planner. Layout, badge color, and option copy are no longer open — they
were settled in `Decisions` (Technical notes) on 2026-10-25.

## Source requirement references

- **AC-E03-02** — optional type, the visible half. Due date, estimated
  duration, and priority already have controls (SP-113B/SP-114E).
- **AC-E03-01** — type is optional on the existing create, not a new flow.
- Shared DoD items 1, 2, 4, 5, 6, 7, 8, and 10. Item 3 stays enforced by G.
  Item 9 is G's migration. Item 11 is the final reviewer walkthrough.
- Contract and D115-1…4 in the [SP-115 README](./README.md).

## Acceptance criteria

1. **Set, omit, keep.** Create and edit can submit each of `HOMEWORK`,
   `PAPER`, `PROJECT`, `QUIZ`, and `EXAM` through the existing assignment
   form and `assignmentApi`. Create with no type omits `type` (the existing
   client drops unset fields; the API also stores an explicit null as null).
   Edit does not send null to clear a stored type (D115-3). The control must
   not tell the student that blank clears a stored type.
2. **Row truth.** A stored type is visible on the course assignment row as a
   neutral pill badge rendered after the priority badge, with the title-cased
   label from the `TYPE_LABELS` map in `Decisions`. A null type renders no
   badge and no category text (component, palette, treatment, and copy were
   settled 2026-10-25 — see `Decisions`).
3. **Errors and in-flight.** `CreateAssignmentRequest` and
   `UpdateAssignmentRequest` accept optional `type`. A 400 field error for
   `type` renders on that control. In-flight lock, duplicate submit, uniform
   404, and network retry stay the current form behavior.
4. **Keyboard and narrow width.** The new control is in the dialog tab order
   between Estimated duration and Priority (settled 2026-10-25), has an
   accessible name, and remains inside the existing focus trap. The
   assignment row still wraps without hiding the type or the existing edit
   and delete controls at a mobile width. Component tests cover set, omit,
   keep, invalid `type`, and null display.

## UI/UX gaps (ui-refiner)

Settled 2026-10-25 by `ui-refiner`; the former gap list is reduced to one
settled decision per question in the `Decisions` section of Technical notes.
No gap remains open before implementation.

## Tests

Named per AC (assert exact request objects; exact-object `toEqual` proves the
`type` key is present or absent):

- `AssignmentForm.test.tsx`:
  - create submits each of the five types (`it.each` over the identifiers)
    → `createAssignment` called with that `type`;
  - create with "No type" submits a payload **without** a `type` key;
  - edit (typed stored) preselects the stored value; unchanged submit sends
    the stored `type`; changing the select sends the new `type`; the
    "No type" option is **absent** in this mode;
  - edit (null stored) shows "No type" selected and unchanged submit omits
    the `type` key; selecting a type then submits it;
  - a server 400.field error for `type` renders on the control
    (`aria-invalid`, accessible description — same assertion style as the
    priority server-error test) and `type` is added to the FIELDS-mapping
    test matrix;
  - keyboard: Tab order includes `Type` between Estimated duration and
    Priority, and the trap still cycles both ways (extend the existing
    keyboard tests); add `Type` to the in-flight disabled-labels loop.
- `AssignmentsSection.test.tsx`: a typed row shows the settled label (e.g.
  `Quiz`); a null-type row shows none of the five labels; the type badge
  pairs the neutral palette (`bg-slate-100 text-slate-700`) with its label;
  existing edit/delete controls remain (unchanged assertion).
- `assignmentApi.test.ts`: create omits an unset `type` and sends a set
  `type`; update sends a set `type` and never sends `type: null`.
- Fixture compile fixes, not new behavior: `CourseDetailPage.test.tsx`,
  `DeleteAssignmentDialog.test.tsx`, and `entities/course/api/courseApi.test.ts`
  once `CourseAssignment` requires `type` (type fixtures: `null` for
  previously null-typed rows, an identifier where a type is asserted; the
  `Task.assignment` fixtures need the field too).
- **DoD-10:** one manual browser pass on course detail after G is deployed
  locally: set a type on create, see it on the row, change it on edit,
  confirm an untyped assignment shows no badge and no category, scroll the
  dialog at a phone-sized height with the new row (max-h-[90vh]), and check
  the badge cluster wraps without hiding Edit/Delete at a narrow width.
  Record the pass or the blocker in `./artifacts/SP-115H/implementation.md`.
  This is closeout for this child, not a separate story.

## Technical notes

### Inspected paths (2026-10-25)

- `apps/web/src/shared/types/academic.ts` — `Assignment` has no `type`.
  `CourseAssignment` is `Omit<Assignment, 'course'>`. Add
  `type: AssignmentType | null` to `Assignment` so both update together.
  `Task.assignment` uses `Assignment` and will require the field in fixtures.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — create copies only
  present optional fields. Update forwards the given object. Follow that:
  omit unset create type; do not add a null clear on update.
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — react-hook-form +
  zod. Priority is a required `Select`. `FIELDS` maps 400 errors. Dialog
  traps Tab and closes on Escape unless submitting.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — title, due date,
  status badge, priority badge, edit, delete. No type. Refetch stays the
  page's `onAssignmentChanged` callback; do not add a second fetch.
- `apps/web/src/shared/ui/Select.tsx` — labeled select with error and hint.
  Available, not mandatory.
- FSD: keep the form in `features/courses/ui/` (D113-4). The client stays in
  `entities/assignment/api/`. No lateral feature import.

### Decisions this child must not reopen

D115-1 fixes the five stored values. D115-3 forbids a clear. Display copy and
placement were the open gaps; they are settled in `Decisions` below — settling
them is not a license to add `OTHER` or a free-text type.

### Decisions (settled by ui-refiner, 2026-10-25)

One line per former gap, grounded in the inspected code:

- **Control type** — reuse `Select` (`shared/ui/Select.tsx`) for `Type`: a
  native select with label/error/hint slots fits a closed five-value enum and
  is keyboard- and mobile-picker-friendly. The priority `Select` is the
  precedent, not a requiredness claim — type has an empty option while
  priority does not.
- **Dialog placement** — a new `Type` select immediately *before* `Priority`,
  and the two selects pair inside one `sm:grid-cols-2` grid row placed after
  the existing due-date/duration grid (schedule row, then classification row
  — grouping only, title and descriptions do not move). Desktop dialog height
  is unchanged (same number of rows as today: the priority select just gains
  a neighbor). Tab order becomes title → due date → duration → **type** →
  priority → description → Cancel → submit; the trap logic needs no change
  because `FOCUSABLE` order is DOM order.
- **Mobile dialog** — rely on the existing `max-h-[90vh]` + `overflow-y-auto`
  dialog: `grid-cols-1` stacks the four fields at narrow widths and the extra
  row scrolls; no new scroll or height handling is written. The DoD-10
  browser pass confirms the dialog scrolls with the new row at a phone-sized
  height.
- **Create unset** — an empty first option with value `''` labeled
  **"No type"**. On submit `''` omits the key, matching the client's existing
  drop-unset-fields create pattern (D115-2 stores null). "No type" names the
  resulting state — like the row's "No due date" — and is not an action, so
  it never claims to clear anything. Create hint: `Optional.`
- **Edit, stored type** — preselect the stored type; the five identifiers are
  the only options. Changing selects submits the new value; leaving it
  submits the stored value (the same always-send-everything pattern the edit
  already uses for due date/duration/priority). Edit hint:
  `Pick a different value to change the type.`
- **Edit, null stored type** — when `assignment.type === null`, include the
  same "No type" option selected (a select must display a real option, and
  here nothing is stored, so the label is true). Submitting unchanged omits
  `type`, so null stays null. When a type **is** stored, "No type" is absent:
  the API cannot return to null (D115-3) and the control never offers what
  the API ignores.
- **Payload rule (uniform)** — send `type` in the request body only when a
  concrete value is selected; omit when `''`. This satisfies AC 1 in every
  mode: create-omit, edit-keep, and null-to-null edits never send `null`.
- **Row treatment (stored type)** — a third badge rendered after the priority
  badge, reusing the section's local `Badge` pill with one neutral palette
  already in the section's system: `bg-slate-100 text-slate-700` (the exact
  pairing the PENDING and LOW badges use). The five type values carry no
  severity semantics, so they share one palette: no new color is invented,
  and the D112B-4 text-plus-color rule holds because the label is always
  rendered. `TYPE_LABELS` is registered next to `STATUS_LABELS` /
  `PRIORITY_LABELS` as `Homework`, `Paper`, `Project`, `Quiz`, `Exam`
  (title-cased per the existing label maps).
- **Row treatment (null)** — no badge and no filler text. A type is unset on
  many rows, absence of a category is not an attribute worth a
  label (the "No due date" text exists only because the due-date line always
  renders), and a false "No type" pill in the colored-badge cluster would
  read as a category.
- **Row mobile wrap** — badges and Edit/Delete already live in one
  `flex flex-wrap gap-2` cluster inside a `flex-col sm:flex-row` list item;
  the third badge simply wraps to the next line at narrow widths and never
  displaces Edit or Delete. No layout code change; jsdom tests assert
  component presence and palette (no real layout), the DoD-10 pass confirms
  the wrap visually.
- **Labels and option order** — control label `Type` (single word, matching
  Title/Priority). Option `value`s are the fixed identifiers; option order is
  the D115-1 register order `HOMEWORK, PAPER, PROJECT, QUIZ, EXAM` (no new
  ordering decision), with the "No type" empty option first where present.
- **Announcement** — no separate type announcement and no success toast. The
  page's always-present `role="status"` region already announces
  "Assignment added." / "Assignment updated." once per successful dialog
  regardless of which fields changed, and the refetched row then carries the
  badge. A type-specific message would require plumbing field context
  through `onAssignmentChanged` for no comprehension gain.
- **Validation wiring (form)** — `zod` schema gains
  `type: z.union([z.enum(['HOMEWORK','PAPER','PROJECT','QUIZ','EXAM']), z.literal('')])`
  (form value `''` = unset; identifiers stay the wire format, per D115-1),
  `type` is added to `FIELDS` so a server 400 renders on the control, and the
  value is added to `defaultValues` as `assignment?.type ?? ''`.

## Definition of Done

- The four acceptance criteria pass, including client validation and the API
  field error on `type`.
- Loading, empty, and error behavior of the existing form still holds, with
  null type not shown as a category (DoD 5).
- The new control is keyboard accessible and the row works at desktop and
  mobile widths (DoD 6, 7).
- Component tests above pass (DoD 8).
- DoD-10 browser note is in `./artifacts/SP-115H/implementation.md`.
- Parent index at `./artifacts/SP-115/implementation.md` links G and H
  evidence and the contract. That index is this child's closeout, not a
  separate story.
- Do not mark the parent reviewed. Item 11 belongs to the reviewer.

## Sizing

- **Outcome:** A student can set an optional assignment type on the course
  page and see the stored value, without clearing it by accident.
- **Time estimate:** 2–2.5 hours after the 2026-10-25 UI/UX decisions (met),
  including fixture updates, component tests, and the browser note. The
  index is closeout, not extra scope. The former uncertainty (row treatment)
  is settled: badge with the neutral existing palette, hidden when null.
- **Files:** `shared/types/academic.ts`; `entities/assignment/api/assignmentApi.ts`
  and its test; `features/courses/ui/AssignmentForm.tsx` and its test;
  `features/courses/ui/AssignmentsSection.tsx` and its test. Fixture-only:
  `DeleteAssignmentDialog.test.tsx`, `pages/courses/ui/CourseDetailPage.test.tsx`,
  `entities/course/api/courseApi.test.ts`. No new route.
- **Start context:** this file (Decisions + Tests), the SP-115 README, and
  G's implementation record for the live response shape. Do not read stories
  4–7 or the full correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/features/courses/ui/AssignmentForm.test.tsx src/features/courses/ui/AssignmentsSection.test.tsx src/entities/assignment/api/assignmentApi.test.ts src/pages/courses/ui/CourseDetailPage.test.tsx src/features/courses/ui/DeleteAssignmentDialog.test.tsx src/entities/course/api/courseApi.test.ts` passes. Then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Unblocked for code: G is implemented
  (commit `77e733f`) and this file's UI/UX gaps were settled on 2026-10-25.
  Excludes type filters, status, subtasks,
  and clearing type. Those epic ACs stay owned in the [EP03 README](../README.md).
