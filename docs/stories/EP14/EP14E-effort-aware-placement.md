# EP14E — Effort-Aware Placement: Student-Owned "Hard" Flag and a Light-Work Timing Guard

**Story ID:** EP14E
**Parent epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** proposed M7 (D14-2)
**Layer:** Backend + Frontend (migration, engine, assignment form)
**Status:** Implemented — awaiting parent review (implementer, 2026-11-16; record: [artifacts/EP14E/implementation.md](./artifacts/EP14E/implementation.md)); refined 2026-11-16 (technical + UI/UX); D-E1…D-E7 ruled; plan review pass 2 (Plan Ready) stands
**Refined:** 2026-11-16 (refiner; technical grounding for every layer + UI/UX for the assignment-form control; AC text unchanged)
**Dependencies:** EP14B (the new boolean body field must land under the strict-conversion policy, ▲ D-B1). Sources: EP13R D-R1 + D-R2 (user rulings 2026-11-16); F-EP13J-02, F-EP13J-04; closes V-13-5.

## Plan at a glance

- **What this changes:** an optional per-assignment "hard" flag (Auto / Hard / Not hard) that placement uses in place of the D13-10 guess when set; and a guard so light work only prefers a LOW-energy window that sits in the same part of the day as the earliest free NORMAL window.
- **Why it improves it:** the heuristic guesses what the student can simply say, and calibration can flip its 120-minute line (F-EP13J-02); without the guard, easy work can drift to a 22:00 LOW slot when 09:00 is free (F-EP13J-04) (product). Both stay deterministic, and the all-NORMAL identity (EP13J-AC3) must still hold (code).
- **Decisions needing you:** none — D-E1…D-E3 ratified (user, 2026-11-16); ▲ D-E4…D-E6 and D-E7 ratified by user grant 2026-11-16 ("finish EP14", recommended options).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Let the student own the "is this demanding?" call, keep the existing rule as
the automatic default, and stop light work from being pushed late in the day
for the sake of an energy match.

## Scope

**In:** migration + DTO + engine input + `isDemanding` override; the guard in `byEnergyPreference`; the assignment form control; tests; `contracts.md`.
**Out:** energy quick setup, per-day overrides, explainability (Backlog BL-14-01…03); any display of the flag on the assignment list/detail (D-E6); a new "no study after HH:mm" preference; changes to the remaining-work or plan payload shapes; AI, syllabus parsing, LMS, grades, flashcards, native mobile.

## Source requirement references

AC-E14-06; TR-E14-06; DoD-1–9.

## Acceptance criteria

1. Assignments carry an optional hard flag (Auto when unset); create/update accept it with validation; the response always includes it; existing rows read as Auto.
2. When set, placement treats the assignment as demanding (Hard) or light (Not hard) regardless of type and size; Auto keeps D13-10 exactly; with every window NORMAL the output stays byte-identical (EP13J-AC3 preserved).
3. **Within one day's gap list** (placement is day-centric — `placeBlock` scans a single date's free gaps, so days are never compared): light work prefers a LOW gap only if it lies in the same part of that day (`windowHintOf`) as that day's earliest free NORMAL gap; otherwise it takes that NORMAL gap. Which day a block lands on is decided by the existing per-day loop and budgets, unchanged. Demanding work is unchanged; deterministic (R-EP14-03).
4. The assignment form offers the three choices with keyboard support and plain copy (no percentages, no blame), following the EP13N named-choice pattern.

## Tests

Named per AC. API/domain: Jest (`describe`/`it` globals, `apps/api`); web: Vitest + Testing Library (`apps/web`).

- **EP14E-AC1**
  - `apps/api/src/modules/assignments/assignments-e2e.spec.ts` (DTO matrix, create and patch): `hard` true / false / null / omitted accepted; `'true'`, `1`, `0`, `'yes'`, `[]` → 400 with `errors.hard`; create with null/omitted stores null; PATCH `{ hard: null }` returns the stored value to null (D-E4); PATCH `{ hard: true }` alone is a valid non-empty body; PATCH without `hard` keeps the stored value.
  - `apps/api/src/modules/validation-strictness-e2e.spec.ts`: add `hard: "true"` to the wrong-typed-boolean case on `POST /assignments` and `PATCH /assignments/:id` (EP14B D-B1: `enableImplicitConversion: false` — nothing coerced, nothing written).
  - `apps/api/src/modules/assignments/assignments-data-scoping.spec.ts`: `KEYS` gains `'hard'` (12-key projection on create, get-list, patch); foreign-user PATCH `{ hard: true }` → uniform 404 `Resource not found`, row unchanged.
  - `apps/api/src/modules/assignments/assignments.service.spec.ts`: service-level `assertDto` rejects a non-boolean `hard` for non-HTTP callers (create + update); merge keeps the stored `hard` when the key is omitted and writes null on explicit null.
  - `apps/api/src/modules/courses/courses-e2e.spec.ts` (`GET /courses/:id` assignments): each assignment carries `hard` (null for a pre-existing row).
  - Migration (real-database integration run): add `assignments-e2e.spec.ts` case "a row inserted without hard reads back null (existing rows read as Auto)".
- **EP14E-AC2**
  - `apps/api/src/domain/study-planning/energy.spec.ts`, new `describe('effort flag (EP14E-AC2, D-E1)')`: `isDemanding` unit cases (`hard: true` on a 30-minute HOMEWORK → true; `hard: false` on EXAM and on 600 remaining minutes → false; `hard: null` / absent → D13-10 unchanged); placement cases reusing the `tagged` fixture — `'a HOMEWORK marked Hard scans HIGH first'`, `'an EXAM marked Not hard scans LOW first'`, `'Auto (null) keeps the D13-10 order'`; `'all-NORMAL identity holds with flags set'` extends the EP13J-AC3 case with `hard: true`/`false` on the four assignments (byte-identical to untagged, flags included in the compared input only).
  - `apps/api/src/domain/study-planning/remaining-work.spec.ts`: `classifyAssignments` carries `hard` onto `ClassifiedAssignment`/`SchedulableAssignment` when supplied (and omits the key when `undefined`, so pre-EP14E callers see the same shape).
  - `apps/api/src/modules/study-plans/study-plans-energy.service.spec.ts`: `gatherPlanData` maps `Assignment.hard` into the engine input (an assignment row with `hard: true` and HIGH/LOW windows is placed in HIGH on `POST /study-plans/preview`).
- **EP14E-AC3** (`energy.spec.ts`, new `describe('light-work timing guard (EP14E-AC3, D-E3)')`)
  - `'F-EP13J-04: 09:00 NORMAL + 22:00 LOW the same day → light work lands 09:00'`.
  - `'a LOW gap in the same part of the day as the earliest NORMAL gap is still preferred'` (e.g. NORMAL 09:00–10:00 + LOW 10:00–11:00, both MORNING → LOW).
  - `'cross-day: Monday 22:00 LOW only + Tuesday 09:00 NORMAL → the Monday block still lands Monday 22:00 (day choice untouched, R-EP14-03)'`.
  - `'no NORMAL gap that day → the guard does not apply (LOW still first)'`; `'a NORMAL gap shorter than minSessionMinutes does not anchor the guard'` (D-E7); `'an ineligible LOW gap still ranks ahead of HIGH for light work (preference, never constraint)'`.
  - `'demanding work is unchanged by the guard'` (same fixtures, HIGH-first result identical to before); `'critical work ignores the guard'`; `'is deterministic: same input twice and input order reversed'`.
  - The existing `'light work prefers the LOW window'` and `'preference, never a constraint…'` cases must pass unmodified.
- **EP14E-AC4** (`apps/web/src/features/assignments/ui/AssignmentForm.test.tsx`; new `EffortChoice.test.tsx` beside the component)
  - Component: `'renders How hard is this? as a radio group of exactly Auto / Hard / Not hard, Auto checked on create'`; `'the helper line follows the selection and carries no percentages or blame terms'` (copy table below, regexp `/%|\bfail|\bfault|\bshould have/i`); `'selected segment shows the check icon and a bold label, not colour alone'`.
  - Keyboard: `'Tab reaches the checked radio once; ArrowRight/ArrowLeft move and select, wrapping'`; `'Tab order is Type → Priority → effort group → Description'`; `'disabled while submitting'`.
  - Round-trip: `'create with Auto omits the hard key'`; `'create with Hard sends hard: true and Not hard sends hard: false'`; `'edit of a stored hard: true opens with Hard selected; of false with Not hard; of null with Auto'`; `'edit back to Auto sends hard: null'`; `'edit with Auto unchanged sends hard: null (idempotent)'`.
  - Errors: `'a 400 with errors.hard renders the message under the group and keeps the selection'` (add `'hard'` to `FIELDS`).
  - Existing tests re-walked: the Tab-trap / keyboard-only creation cases gain one tab stop between Priority and Description; the dialog-layout case (`max-w-lg max-h-[90vh] overflow-y-auto`) is unchanged.
  - Responsive: `'the three segments stay one row (grid-cols-3) with max-sm:min-h-[44px] targets'` (class assertion, the repo's responsive-test idiom — see the layout case in `AssignmentForm.test.tsx`).
  - E2E (`apps/web/e2e/assignments-list.spec.ts`, using the existing `Add an assignment` dialog helpers): create an assignment with Hard, reopen it via edit and see Hard checked; the existing axe check over the dialog (`e2e/helpers.ts` axe helper, EP14D no-allowlist gate) passes with the group present.

## Technical notes

- Inspected: `apps/api/src/domain/study-planning/scheduler.ts:103–111` (`DEMANDING_REMAINING_MINUTES`, `isDemanding`), `byEnergyPreference` (:124) and `windowHintOf` (:156) in the same file; `isDemanding` is called once, in the `progress` map (:240); `placeBlock` (:~340) scans one date's `freeFor(...)` list. `apps/api/prisma/schema.prisma:187–210` (`Assignment.type` nullable, no effort field); EP13N's radio-card pattern (`PresetRadioGroup` in `apps/web/src/features/study-preferences/ui/StudyPreferencesForm.tsx`, native fieldset/legend + radios, in-file, not exported).
- Refiner gate: the assignment-form placement, labels and helper copy are UI decisions (D13-14 rule applies) — settled below as D-E5/D-E6.

### Relevant files

Backend
- `apps/api/prisma/schema.prisma` — `Assignment`: add `hard Boolean?` after `type` (comment: null = Auto, D-E1a). New migration `apps/api/prisma/migrations/20261116130000_assignment_hard_flag/migration.sql` (name follows the `20261116120000_availability_slot_energy` convention): `ALTER TABLE "assignments" ADD COLUMN "hard" BOOLEAN;` — nullable, no default, additive; every existing row reads null = Auto. Header comment states the identity (no plan changes until a student chooses) and rollback (`DROP COLUMN "hard"`). Run `prisma generate`; no data backfill.
- `apps/api/src/modules/assignments/dto/create-assignment.dto.ts` and `update-assignment.dto.ts` — `@IsOptional() @IsBoolean({ message: 'hard must be true, false or null' }) hard?: boolean | null;` (the `isAvailable` precedent in `availability/dto/*`). `@IsOptional` skips null/undefined; `IsBoolean` is strict, and with `enableImplicitConversion: false` (EP14B D-B1; `main.ts`, `test/test-http.ts`) `'true'`/`1` are 400, never coerced. A `boolean | null` union emits design type `Object`, so no `@Transform` is needed (same as the file's other `| null` fields); do not add one.
- `apps/api/src/modules/assignments/assignments.service.ts` — (1) `toAssignmentResponse` (:~16) and the list projection (:~381 row type + mapper): add `hard: row.hard` after `type` (12 keys, always present); (2) `create`: `...(dto.hard != null ? { hard: dto.hard } : {})` (null/omitted stores null); (3) `update`: **`hard` is the one field where null is meaningful** (D-E4) — use `dto.hard !== undefined` (not `has()`) for the non-empty-body check, the merged object (`hard: dto.hard !== undefined ? dto.hard : existing.hard`) and `data.hard = dto.hard`; update the doc comment; the private `assertDto` already re-runs `validateSync` so non-HTTP callers get the same 400.
- `apps/api/src/modules/courses/courses.service.ts` — `toAssignmentResponse` (:~100, the `GET /courses/:id` projection) gains `hard: assignment.hard` after `type`.
- `apps/api/src/domain/study-planning/types.ts` — `hard?: boolean | null` on `AssignmentFacts` (:~109), `ClassifiedAssignment` (:~155); `SchedulableAssignment` (`ClassifiedAssignment &`) inherits it.
- `apps/api/src/domain/study-planning/remaining-work.ts` — in `classifyAssignments` (:~140–152) carry `hard` onto the base object exactly as `assignmentType` is carried (`...(assignment.hard !== undefined ? { hard: assignment.hard } : {})`) so callers that never set it see the old shape.
- `apps/api/src/modules/study-plans/study-plans.service.ts` — `gatherPlanData` (:~1071 `facts` map, beside `assignmentType: a.type ?? null`): add `hard: a.hard ?? null`. `remainingWorkInternal` (:~704) feeds the remaining-work payload, not placement, and `toRemainingWorkItem` does not project it — leave both unchanged (the `GET /study-plans/remaining-work` contract does not change).
- `apps/api/src/domain/study-planning/scheduler.ts` — see "Engine" below.

Frontend
- `apps/web/src/shared/types/academic.ts` — `hard: boolean | null` on `Assignment` (:~62, so `CourseAssignment = Omit<Assignment,'course'> & …` inherits) and `AssignmentListItem` (:~137).
- `apps/web/src/features/assignments/model/types.ts` — `AssignmentInteractionItem.hard: boolean | null`.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — `hard?: boolean | null` on `CreateAssignmentRequest` and `UpdateAssignmentRequest`; `createAssignment` builder adds `if (data.hard != null) body.hard = data.hard` (it copies keys selectively, so without this the field is dropped); update the `UpdateAssignmentRequest` doc comment: unlike `type`, a `hard: null` **is** sent and means Auto.
- `apps/web/src/features/assignments/ui/AssignmentForm.tsx` — schema field `effort: z.enum(['auto','hard','not-hard'])`, default from `assignment?.hard` (null→auto, true→hard, false→not-hard); submit mapping auto→`null`/omitted on create, hard→`true`, not-hard→`false`; add `'hard'` to `FIELDS` for 400 mapping (server error key is `hard`; map to the `effort` field via a small alias in the loop); render the group (below).
- `apps/web/src/features/assignments/ui/EffortChoice.tsx` (new) + `EffortChoice.test.tsx` — the compact segmented radio group.
- Fixtures: every test factory building an `AssignmentListItem`/`CourseAssignment`/`AssignmentInteractionItem` (e.g. in `AssignmentsSection.test.tsx`, `AssignmentForm.test.tsx`) gains `hard: null`; `tsc` flags the rest.

Docs
- `docs/stories/EP13/contracts.md` — Energy paragraph: the "Demanding" definition gains "unless the student sets `Assignment.hard`; `hard` overrides type and size"; add the light-work timing guard; the assignment endpoints' response is 12 keys (`hard` after `type`; `POST/PATCH /assignments` accept optional `hard`, PATCH null = Auto); migration name (DoD-9). EP14's own contract note, if any, lives there too — the file is the single home.

### Engine (the path of the flag)

`Assignment.hard` → `gatherPlanData` facts (`AssignmentFacts.hard`) → `classifyAssignments` (`ClassifiedAssignment.hard`, flagged/schedulable alike) → `SchedulableAssignment.hard` → `schedule()` `progress` map → `isDemanding(assignment)`:

```ts
export function isDemanding(a: { assignmentType?: string | null; hard?: boolean | null; remainingMinutes: number }): boolean {
  if (a.hard != null) return a.hard;            // D-E1/D-E2: the student's call wins
  return /* D13-10 rule, unchanged */;
}
```

`hard` is read from the input, so `Progress.demanding` stays fixed for the run. Critical work (rule 3, `preferEnergy = false`) ignores energy and the flag alike — feasibility is never traded for preference. Budgets, density, pinning and horizon never read `hard`.

Guard (D-E3, day-centric): change `byEnergyPreference(free, demanding)` to `byEnergyPreference(free, demanding, minBlock)`; call site in `placeBlock` passes the existing `minBlock`. For `demanding === true` the function is untouched. For light work, compute once per call `anchor = free.find(g => energyOf(g) === 'NORMAL' && g.endMinute - g.startMinute >= minBlock)` (`free` is one date's earliest-first list, so "earliest" is positional and days are never compared). If `anchor` is undefined, ranks are exactly `LIGHT_RANK` (guard inapplicable). Otherwise a LOW gap is *eligible* when `windowHintOf(gap.startMinute) === windowHintOf(anchor.startMinute)`; eligible LOW keeps rank 0; an ineligible LOW gets rank 1.5 (after every NORMAL, before HIGH — still preferred over HIGH for light work, D-E7). The stable index tie-break is unchanged. With every gap NORMAL there is no LOW, so the output is identical (EP13J-AC3).

### UI/UX (assignment-form control; EP14E-AC4)

Design principle (user, 2026-11-16, binding): minimal and ADHD-friendly — fewest controls, Auto by default, plain short copy, no percentages, no blame, no required step.

- **Reuse:** the native `fieldset`/`legend` + `input[type=radio]` group of EP13N (D-N5) and its focus-ring / check-icon / non-colour-only conventions, in a new compact `EffortChoice.tsx` (the EP13N group is an in-file card component with per-option descriptions; not extracted — a second, differently shaped consumer does not justify a shared primitive yet). No new shared primitive, no new dependency; `lucide-react` `CheckCircle2` as in EP13N.
- **Layout and hierarchy:** inside the existing `AssignmentForm` dialog, a full-width row **below the Type/Priority row and above Description**, a single three-segment control (`grid grid-cols-3 gap-2`) with the legend above and **one** helper line below — about 70 px, no disclosure (D-E5). It is optional and never touches validation, so Title → Create remains the whole required path; Auto is preselected on create and when editing a null row.
- **Copy (exact).** Legend: `How hard is this?` Segments: `Auto`, `Hard`, `Not hard`. One helper line under the group (the `aria-describedby` of the fieldset), text follows the selection:

  | Selected | Helper |
  |---|---|
  | Auto | `Auto — based on the type and size.` |
  | Hard | `Planned for your high-energy times when you have them.` |
  | Not hard | `Easy to fit in — planned for lower-energy times.` |

  No percentages, no "should/failed/behind" wording (D13-9). Reconciles ratified D-E2: the visible default is "Auto", described as "based on the type and size".
- **States:** default Auto (create / null); selected segment = accent border + tinted fill + check icon + bold label (not colour alone); `disabled` while submitting (reduced opacity, `cursor-not-allowed`, as EP13N); server 400 on `hard` → `text-body-sm text-danger` message under the group with `aria-describedby` on the fieldset and the selection preserved; no loading or empty state (the control is local form state). Edit mode: no extra hint text (Auto is always reachable, so unlike Type there is no "can't clear" caveat).
- **Accessibility (WCAG 2.2 AA):** native radios (sr-only, still focusable) in one named group → Tab enters once, arrows move and select, wrap-around; `legend` names the group; helper tied by `aria-describedby`; visible focus via `focus-within:ring-2 ring-focus-ring ring-offset-2` on the segment label; each label ≥ 44 px tall below `sm` (`max-sm:min-h-[44px]`, matches the form's other controls); contrast uses existing tokens (`text-text`, `text-text-muted`, `accent`) already passing the EP14D axe gate; helper text is static prose (no live region needed — the radio's own change is announced).
- **Responsive:** three short labels fit one row at 320 px, so the grid stays `grid-cols-3` at every width (no stacking, no extra height on mobile); the dialog keeps `max-w-lg max-h-[90vh] overflow-y-auto`, so the added row scrolls with the form.
- **Not shown anywhere else:** no badge/indicator on `AssignmentRow` or the course detail (D-E6); the flag is a quiet planning input, not a status.
- **Out of scope here:** energy tagging UI, explanations of why a block landed where it did (BL-14-03).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-E1 | Persisted shape: (a) nullable boolean `hard` (null = Auto); (b) nullable enum `effort` (LIGHT/NORMAL/HARD); (c) reuse `priority` | **(a)** — three honest states, one additive migration; (b) adds a NORMAL the engine has no use for; (c) conflates urgency with effort | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |
| ▲ D-E2 | Default: (a) Auto = D13-10 heuristic, labelled "Auto (based on type and size)"; (b) remove the heuristic, default Not hard | **(a)** — nobody's plan changes until they choose; V-13-5 closes as "student-overridable" | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |
| ▲ D-E3 (refines EP13J's D-J3) | Guard: (a) same-part-of-day rule via `windowHintOf`, applied within a single day's gap list (day choice never moves — placement is day-centric); (b) a new "no study after HH:mm" preference; (c) both | **(a)** — no new preference, deterministic, identity-preserving; the day-centric pin is R-EP14-03's correction inside the ratified option | Ratified (user, 2026-11-16, "ratify all decisions for the stories") |
| ▲ D-E4 (refines D114-5) | PATCH semantics of `hard`: (a) explicit `null` = clear to Auto, omitted = keep (the one nullable field where null is a value); (b) `null` = omitted like every other field, so a student could never return to Auto; (c) add a separate `'AUTO'` sentinel string | **(a)** — three honest states need a way back; AC1's "null" in the DTO matrix already implies it; the edit form sends the value every time (`null` for Auto), so no dirty tracking; create treats null/omitted alike | Ratified (user grant, 2026-11-16 — "finish EP14", recommended option) |
| ▲ D-E5 | Control placement: (a) a compact row below Type/Priority, above Description, always visible; (b) behind a "More options" disclosure; (c) inside the Priority/Type grid | **(a)** — about 70 px, preselected Auto, never required; a disclosure adds a click and hides the feature from the students it helps, and the dialog has no disclosure primitive to reuse; (c) squeezes a three-way choice into a half-width cell | Ratified (user grant, 2026-11-16 — "finish EP14", recommended option) |
| ▲ D-E6 | Control shape, copy and visibility: (a) compact three-segment radio group, labels Auto / Hard / Not hard, one selection-driven helper line, no flag shown in the assignment list or detail; (b) EP13N cards with a description per option; (c) a checkbox "This is hard"; (d) also badge the row | **(a)** — copy per the UI/UX table; per-option descriptions triple the height (b); a checkbox cannot say "not hard" or return to Auto (c); a badge on every row is noise for a planning input (d) | Ratified (user grant, 2026-11-16 — "finish EP14", recommended option) |
| D-E7 | Guard edge cases: (a) anchor = earliest NORMAL gap that can host a legal block (≥ `minBlock`); an ineligible LOW gap ranks after NORMAL but before HIGH; (b) anchor = earliest NORMAL gap regardless of length; ineligible LOW last | **(a)** — a 10-minute NORMAL sliver cannot host a block, so it must not veto a LOW slot; light work still prefers LOW to HIGH (preference, never a constraint); all within ratified D-E3(a) | Ratified (user grant, 2026-11-16 — "finish EP14", recommended option) |
## Definition of Done

1–9 as applicable; DoD-9 includes the migration and `contracts.md`; 10–11 via the parent review.

## Sizing

- **Outcome:** students decide what counts as hard, and easy work stops drifting late.
- **Actual at closeout:** one dispatch, one session (~95 tool calls, usage n/a); 4/4 ACs; 41 new API tests (gated 1625/0), 17 new web tests (1290/0), 1 new E2E case; two deviations recorded (F-EP14E-01 guard vs the `tagged` fixture, F-EP14E-02 `byEnergyPreference` exported for the D-E7 rank test). See the record.
- **Files:** `schema.prisma` + migration `20261116130000_assignment_hard_flag`, assignments DTOs/service/response + `courses.service.ts` projection, `study-plans.service.ts` `gatherPlanData`, `remaining-work.ts` (carry the flag), `scheduler.ts`, `types.ts`, `energy.spec.ts`, `EffortChoice.tsx` + `AssignmentForm.tsx` + web types/entity api + tests, `contracts.md`.
- **Start context:** this story; EP13J record (D-J1/D-J3); `scheduler.ts` energy section.
- **Verification:** API + web suites, gated run (via EP14A CI), the journeys unchanged.
- **Dependencies / exclusions:** EP14B (D-B1); backlog items BL-14-01…04.
