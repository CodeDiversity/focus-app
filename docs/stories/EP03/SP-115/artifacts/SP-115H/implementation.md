# SP-115H implementation record

**Story:** [SP-115H](../../SP-115H-assignment-type-ui.md) — frontend: optional assignment type UI
**Status:** Implementation complete — awaiting parent review
**Completed:** 2026-10-25
**Checkpoint:** [checkpoint.md](./checkpoint.md) (findings log; final dispositions below)

## Pre-implementation state

- ui-refiner pass completed 2026-10-25 (isolated session) and settled every
  previously open UI/UX gap in the story's `Decisions` section; implemented
  verbatim from those decisions.
- SP-115G implemented and committed (`77e733f`); the client was written against
  the live 11-key projection (`type` immediately after `priority`).

## AC-by-AC outcomes

| AC | Requirement | Outcome | Evidence |
|---|---|---|---|
| 1 | Set, omit, keep through the existing form and `assignmentApi`; create unset omits `type`; edit never sends `null` (D115-3); control never claims blank clears | **Met** | `AssignmentForm.tsx` zod schema gains `type` (`z.union` of the five identifiers + `''`); both submit branches send `type` only via conditional spread (`data.type ? { type } : {}`), so `''` → no key — never `type: null`. `assignmentApi.ts` create copies a truthy `type` only; update forwards the given payload and injects nothing. Tests: `assignmentApi.test.ts` exact-object asserts (set vs absent key), form `it.each` five-types create, edit-unchanged sends stored type, edit-null-stored omits the key, edit sets a type from null — all green. |
| 2 | Row truth: stored type visible with settled label; null renders no badge/label | **Met** | `AssignmentsSection.tsx` renders `TYPE_LABELS[assignment.type]` with the single neutral `TYPE_STYLE` (`bg-slate-100 text-slate-700` — the existing PENDING/LOW pairing) after the priority badge; `{assignment.type && ...}` means null renders nothing. Tests: typed row shows the slate `Homework` pill; null rows show none of the five labels. |
| 3 | Requests accept optional `type`; 400 field error renders on the control; in-flight/404/retry unchanged | **Met** | `CreateAssignmentRequest`/`UpdateAssignmentRequest` gained optional `type`. `'type'` added to `FIELDS`, so a server 400 maps via `setError` to the control (`aria-invalid` + accessible description, asserted for create and edit). In-flight lock, duplicate-submit guard, uniform 404 alert, network/5xx retry tests unchanged and passing (same create shape, `type` omitted). |
| 4 | Keyboard + narrow width; component tests over set/omit/keep/invalid/null display | **Met** | The Type select sits with Priority in one `sm:grid-cols-2` row so tab order is title → due date → duration → **type** → priority → description → buttons; the trap needs no change (DOM-order `FOCUSABLE`) and the existing trap tests now pass with the control in place; in-flight disabled loop includes Type. Mobile wrap: badge joins the existing `flex flex-wrap gap-2` cluster and stays in the same `parentElement` as Edit/Delete (asserted). Component tests cover set (5), omit, keep, server-invalid, and null display. |

## Verification

| Command | cwd | Result |
|---|---|---|
| `pnpm --filter @studypilot/web test -- src/features/courses/ui/AssignmentForm.test.tsx src/features/courses/ui/AssignmentsSection.test.tsx src/entities/assignment/api/assignmentApi.test.ts src/pages/courses/ui/CourseDetailPage.test.tsx src/features/courses/ui/DeleteAssignmentDialog.test.tsx src/entities/course/api/courseApi.test.ts` | repo root | **6 files, 121 tests passed** |
| `pnpm --filter @studypilot/web test` (full suite, regression safety) | repo root | **45 files, 563 tests passed** |
| `pnpm --filter @studypilot/web typecheck` | repo root | **pass** |
| `pnpm --filter @studypilot/web lint` | repo root | **clean, 0 warnings** |

## DoD-10 browser note (blocked for this context — recorded as the story allows)

The story requires one manual pass on course detail after G deployed locally.
**Not executed in this agent context** (honest label: blocker, not skipped
verification). Concretely: the app has no seeded demo account; registering a
throwaway user/course through the UI would write junk records into the shared
local dev database without authorization; and no authenticated interactive
browser session is available here. G's migration **is** applied to the local dev DB
(see [G's implementation record](../SP-115G/implementation.md)).

Manual steps for whoever runs the pass locally (the final SP-115 review's user
walkthrough or the user):

1. Start the API and web app locally; sign in.
2. Open a course → **Add assignment** → the dialog shows a **Type** select
   between Estimated duration and Priority, defaulting to "No type".
3. Create an assignment with `Type: Quiz` → the row shows the neutral
   `Quiz` pill **after** the priority badge; the page announces "Assignment added."
4. **Edit** it → the select is preselected to `Quiz`, and only the five
   identifiers are offered (no "No type" option). Leave it → saved unchanged.
5. Create another assignment leaving **No type** → its row shows no badge and
   no category text.
6. At a phone-height window the dialog (max-h-90vh) scrolls with the new row;
   at a narrow width the badge cluster wraps without hiding **Edit**/**Delete**.

This remains an open item feeding the final parent review (DoD-10 of the
combined unit), not a child-internal closure.

## Changed paths

- `apps/web/src/shared/types/academic.ts` — `AssignmentType` union + `Assignment.type: AssignmentType | null` (after `priority`, mirroring the projection)
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — optional `type` on both request interfaces; create sends a truthy `type` only; 10→11-key projection comments (D115-3 note on the update interface)
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — schema/`FIELDS`/defaultValues/submit payloads; Type+Priority classification grid row with mode-dependent options/hints (no "No type" option when a type is stored)
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — `TYPE_STYLE`/`TYPE_LABELS` maps; conditional type badge in the wrap cluster
- Tests: `AssignmentForm.test.tsx`, `AssignmentsSection.test.tsx`, `assignmentApi.test.ts` (new type behavior)
- Fixture-only: `DeleteAssignmentDialog.test.tsx`, `pages/courses/ui/CourseDetailPage.test.tsx`, `entities/course/api/courseApi.test.ts` (`type: null` where nothing is asserted; `AssignmentForm.test.tsx` sample gets `HOMEWORK` where a stored type is exercised)

## Findings and deviations

- **F-115H-1 (open, out of agent scope):** the DoD-10 manual browser pass was
  not executed here — see its section above; no code or test gap is implied by
  the component-level evidence. Owner: final review walkthrough / user.
- The refiner's settled decisions were implemented verbatim; one mechanical
  simplification: the five-type palette became a single `TYPE_STYLE` constant
  instead of a per-value `Record` (identical classes). No behavioral deviation.
- Otherwise no deviations from the story or the settled decisions. No new
  screen, filter, `OTHER` value, free text, clear affordance, or extra
  announcement was added.

## Commits

- `33075e2` — feat(SP-115H): set and show an optional assignment type in the course UI. Scope: the 13 app/artifact files listed above (server-side none; H is frontend-only) + README queue/status, status in the story file, and the parent index. Working tree verified clean after the commit; pre-commit hooks (eslint --fix, prettier) applied to the staged files and are included. The only follow-up edit is this hash note.
