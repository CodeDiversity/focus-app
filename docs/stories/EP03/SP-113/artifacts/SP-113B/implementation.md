# SP-113B implementation

**Status:** Implemented — awaiting combined SP-113 parent review (2026-10-24).
**Scope:** frontend quick assignment creation only; [story](../../SP-113B-quick-create-assignment-ui.md),
[queue and shared contract](../../README.md#execution-queue).

## Delivered behavior / acceptance outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 — affordances | Pass. Primary small header button and empty-state CTA open the dialog; course context comes from the route, not a form field. No per-row management controls. | `AssignmentsSection.test.tsx`; route-context assertion in `CourseDetailPage.test.tsx`. |
| 2 — form / validation | Pass. Title, optional date/duration, priority default Medium. RHF/zod mirrors title and duration bounds; enum select; past dates accepted. Date parts become local-midnight ISO, blank optionals omitted. API field map displayed through shared error helpers. | `AssignmentForm.test.tsx` (invalid titles/durations, all four server fields, blank optionals, past date, selected priority); API adapter tests. |
| 3 — submit / success | Pass. POST `/assignments` via shared axios; fields/buttons disabled while pending, in-flight guard prevents duplicate writes. Success closes dialog, announces “Assignment added.” and background-refetches course detail without blanking the old content. New rows retain server order; no success toast/highlight. | Pending-request form test; page test holds refetch unresolved, checks live region/old content, then resolves it and observes new row. |
| 4 — failures | Pass. 400 field errors or sanitized fallback toast; uniform 404 form alert and Back to courses link; network/5xx use fixed retry copy, keep values and re-enable submit. | Form tests cover all branches and successful resubmission after failure. |
| 5 — nullable dates | Pass. Assignment and derived CourseAssignment accept null; null renders muted “No due date”, real dates use shared browser-zone formatter. No client re-sort. | Section null/date/order/prop-update tests; full typecheck. |
| 6 — keyboard / responsive | Pass at component/static-layout level. Initial title focus, two-way Tab trap, Escape/cancel, trigger focus restoration, labeled fields and error descriptions; trap retained during pending request. Full keyboard-only creation tested. Dialog bounded to viewport, scrollable, max-w-md; date/duration stack below sm, header wraps on narrow widths. | Form keyboard/layout assertions; existing Input/Select/Button focus/error semantics; section responsive classes. Real-browser mobile/desktop integrated sign-off remains C's named obligation, not claimed here. |

Applicable DoD 1/2/4/5/6/7/8 are covered above. DoD 3: no ownership/API changes;
the authenticated shared client and existing scoped detail fetch are reused,
with course ownership enforced by A. DoD 9: no API/migration change in B.
DoD 10 remains SP-113C plus final combined review; DoD 11 remains the final
reviewer's separate walkthrough. This record is not independent approval.

## Changed paths / commit scope

All source paths below are under `apps/web/src/`:

- New `entities/assignment/api/assignmentApi.ts` + `.test.ts`: typed create
  adapter, optional-field omission, 10-key response projection.
- New `features/courses/ui/AssignmentForm.tsx` + `.test.tsx`: four-field
  dialog, client/API validation, focus management, pending/error/retry states.
- Updated `features/courses/ui/AssignmentsSection.tsx` + `.test.tsx`:
  affordances, dialog hosting, null due dates, server-ordered projection.
- Updated `pages/courses/ui/CourseDetailPage.tsx` + `.test.tsx`:
  route course id, callback, live announcement and background refresh.
- Updated `shared/types/academic.ts`: nullable assignment due date.
- Closeout scope: this record, B checkpoint, B ticket Status/artifact pointers,
  parent README execution status/queue only. No scope/AC/decision changes.

Code baseline: `c6efca5` (A). HEAD advanced during this task to `00d2eea`
(README/A-record reconciliation only, no source changes). B's scoped commit
is returned in the handoff rather than inserted into its own record. Existing
`.gitignore` edit is unrelated and excluded; existing A record edits were
committed by their owner in `00d2eea` and preserved.

## Findings / deviations — final dispositions

| ID | Source / affected path | Observation | Disposition / owner / closure |
|---|---|---|---|
| F-B-1 | AC 6; new `AssignmentForm.tsx`, donor `MeetingForm.tsx` inspected only | Donor skips keyboard handling while submitting; copying that would allow Tab to escape when all controls are disabled. | **Fixed**, implementer. New dialog takes focus during submission and continues trapping Tab, with pending-request regression passing. Donor left unchanged (outside B scope). |

Product/contract deviations: **None**. No open findings in assigned B scope.
Transient test-harness failures were corrected: Providers needs initialEntries
for router context; setupUser's tab has no options (use Shift+Tab keyboard);
Button uses utility classes; layout assertion must select the grid rather
than Input's wrapper. Nullable-date widening required a non-null assertion on
the existing explicitly dated page-test fixture, not a production fallback.

## Verification

Commands executed from repository root, against B source changes on `00d2eea`
before the closeout-only docs update. No database mutation or live API use.

| Command | Result |
|---|---|
| Initial focused API/form test invocation | Expected red: both new production modules absent; implemented afterward. |
| First focused four-file run | 40/43 passed; harness corrections above applied. Initial typecheck exposed wrapper tab signature and dated fixture; corrected. |
| `pnpm --filter @studypilot/web test` (final) | **44 files, 519 tests passed**, exit 0. |
| `TZ=America/Los_Angeles pnpm --filter @studypilot/web test -- src/features/courses/ui/AssignmentForm.test.tsx src/features/courses/ui/AssignmentsSection.test.tsx src/entities/assignment/api/assignmentApi.test.ts src/pages/courses/ui/CourseDetailPage.test.tsx` | **4 files, 44 tests passed**, exit 0. Proves local-midnight conversion outside UTC; keyboard-only/layout test included. Initial layout assertion selected wrong wrapper; fixed and rerun green. |
| `pnpm --filter @studypilot/web typecheck` | Passed, exit 0. |
| `pnpm --filter @studypilot/web lint` | Passed, exit 0. |
| `pnpm --filter @studypilot/web build` | Passed, exit 0; Vite notes a >500 kB chunk. |

Non-fatal existing output: Vite CJS/PostCSS module-type and React Router future
warnings; full-suite act warnings in unrelated legacy tests and intentional
Redux diagnostics. No production build/test failure remains. Source formatted
with repo Prettier config. Component tests mock the entity API; the adapter
tests exercise serialized axios requests, not a live server.

## Remaining work / handoff

- No remaining B implementation work; single-child authorization ends here.
- Next owner: implementer for **SP-113C**, once requested, for real-HTTP/e2e,
  integrated browser sign-off and parent implementation index.
- Request one independent combined SP-113 review only after C finishes; no
  child review or self-approval. Final report and walkthrough remain outstanding.

## Review corrections — F113-001 / F113-002 (2026-10-24)

This section supersedes the original B-only handoff above. C has finished;
both requested corrections are implemented, awaiting combined independent
parent re-review, not independently approved.

### Findings / deviations — final dispositions

| ID | Source / affected paths | Observation | Disposition / owner / closure evidence |
|---|---|---|---|
| F113-001 | Shared WCAG AA, B AC5; `AssignmentsSection.tsx` and test | Null-date text used secondary-400 on white (2.564:1). | **Fixed**, implementer: secondary-500 (`#64748b`) on white = **4.758842787868666:1**, above 4.5:1. Updated null-date regression passes, with date/order/refetch assertions retained. |
| F113-002 | B AC3; `CourseDetailPage.tsx`, `AssignmentsSection.tsx`, page tests | Consecutive successes left identical text in the status region. | **Fixed**, implementer: both CTAs invoke `onAssignmentFormOpen`, clearing the persistent status region in the opening interaction, before a later submission restores exact `Assignment added.` copy. Two parameterized consecutive-create regressions assert the same mounted region is empty before each submission and populated after each success. Refetch/no-success-toast preserved. |

Product/contract deviations: **None**. No outstanding implementation findings
in this correction scope. The reviewer report remains reviewer-owned and
unchanged; its open dispositions require independent re-review. No timers,
same-batch clear/restore, invisible-character workaround, or unrelated palette
or meeting-announcement changes.

### AC outcomes after corrections

| B AC | Outcome |
|---|---|
| 1 — affordances | Pass: both header and empty-state CTA open the form; consecutive tests cover both. |
| 2 — form/validation | Pass: unchanged implementation; full frontend suite rerun. |
| 3 — submit/success | Pass: separate clear and success updates now repeat for consecutive creates; exact copy, route context, background refresh and no success toast retained. |
| 4 — failures | Pass: unchanged form error/retry behavior; full suite rerun. |
| 5 — nullable dates | Pass: muted AA-compliant null label; dated rows/order/prop updates retained. |
| 6 — keyboard/responsive | Existing keyboard/static responsive checks pass in full suite. No layout/focus behavior changed; actual browser/mobile/screen-reader execution not claimed. C's temporary D113C-1 exception remains unchanged. |

### Verification / tested state

Cwd: repository root `/Users/michael/Documents/GitHub/focus-app`.
Tested state: `578d44256b088e19d048c39f6168bbebb4696bc1` plus the four
correction source/test paths below; later changes are status/closeout docs only.

| Command / check | Result |
|---|---|
| `pnpm --filter @studypilot/web test -- src/features/courses/ui/AssignmentsSection.test.tsx src/pages/courses/ui/CourseDetailPage.test.tsx` before production fix | Expected red, exit 1: 3 failed / 23 passed. Null-date class and both second-open status resets fail against old production code. |
| `pnpm --filter @studypilot/web test` after fix | Exit 0: **44 files / 521 tests passed**, including section/page/form regressions. Existing Vite/PostCSS/Router and unrelated act warnings remain nonfatal. |
| `pnpm --filter @studypilot/web typecheck` | Exit 0. |
| `pnpm --filter @studypilot/web lint` | Exit 0. |
| `pnpm --filter @studypilot/web exec prettier --config ../../packages/config/prettier/.prettierrc.cjs --check src/features/courses/ui/AssignmentsSection.tsx src/features/courses/ui/AssignmentsSection.test.tsx src/pages/courses/ui/CourseDetailPage.tsx src/pages/courses/ui/CourseDetailPage.test.tsx` | Exit 0. |
| Pure Node WCAG sRGB luminance calculation using source token `#64748b` / white | Exit 0; **4.758842787868666:1**. Deterministic source-color calculation, not browser sampling. |

No API/database/config changes; previous unchanged backend/build evidence
remains historical, not claimed rerun. Component tests prove the DOM lifecycle,
not screen-reader speech. No live browser or assistive-technology run performed.

### Correction commit scope / handoff

- Four owned source/test paths: `apps/web/src/features/courses/ui/AssignmentsSection{,.test}.tsx`
  and `apps/web/src/pages/courses/ui/CourseDetailPage{,.test}.tsx`.
- Docs: B checkpoint/implementation, B ticket Status/pointers, parent README
  execution fields, parent checkpoint/index correction pointers.
- Baseline: `578d44256b088e19d048c39f6168bbebb4696bc1`; correction commit is
  the commit introducing this section (verified hash returned in handoff).
- Preserve/exclude unrelated `.gitignore` and untracked reviewer-owned
  `artifacts/SP-113/review.md`. Coordinator owns report persistence.
- Next owner: coordinator requests **one combined independent SP-113 re-review**
  including both corrections. Reviewer owns final verdict and walkthrough;
  nothing is marked Reviewed by this implementation pass.
