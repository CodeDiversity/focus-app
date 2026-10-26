# SP-122 implementation index

**Parent:** [SP-122](../../SP-122-assignment-search-sorting-and-filters.md)
**Epic:** EP03 — Assignment & Task Management (Jira STUDY-16)
**Review unit:** combined SP-122 (A, B, C). Final review artifacts:
`./review.md` and `./walkthrough.md` (reviewer-owned, not yet created).

## Scope and baseline

- Baseline before first included change: `e0a1722` (SP-122 plan), per README Autopilot.
- Combined scope: SP-122A (backend), SP-122B (frontend), SP-122C (integration).
- No schema/migration changes. No new product behavior in C.

## Child evidence

| Child | Status | Implementation record | Checkpoint | Commit(s) |
|---|---|---|---|---|
| SP-122A | Implemented — awaiting parent review | `../SP-122A/implementation.md` | `../SP-122A/checkpoint.md` | `b88b1db` (+`cf25b00` docs) |
| SP-122B | Implemented — awaiting parent review | `../SP-122B/implementation.md` | `../SP-122B/checkpoint.md` | `d174526` (+`4623c3a` docs) |
| SP-122C | Implemented — awaiting parent review | `../SP-122C/implementation.md` | `../SP-122C/checkpoint.md` | (this commit) |

## Acceptance criteria (AC-E03-07) outcome

- Course, date, and status filtering work end-to-end over real HTTP + Postgres
  (SP-122C e2e, 23 tests): `courseId`, `status`, `priority`, `type`,
  `dueFrom`/`dueTo`, `q`, and all combinations.
- Sort matrix verified for all `sort` × `order` values, including nulls-last
  for `dueDate asc` and the `title`/`id` tie-break.
- Search verified case-insensitively on title and description; whitespace-only
  `q` behaves as absent.
- Ownership verified: B's list never contains A's rows; B filtering by A's
  `courseId` → uniform 404; B data unchanged.
- Validation verified: invalid enum/date/sort/order/q length and unknown params
  → 400 with field-level `errors`; unauthenticated → 401.
- Projection verified: every item key set equals the contract's
  `AssignmentListItem` keys; `course` and `subtasks` shapes match.
- No regression: POST/PATCH/DELETE/subtasks and `GET /courses/:id` projection
  verified (smoke in C plus full existing e2e suite).

## DoD coverage

| DoD | Owner | Evidence |
|---|---|---|
| 1 functional criteria | A/B/C | A endpoint + filters + sort; B list page + controls; C integrated proof |
| 2 invalid-input validation | A/B | DTO + service re-checks; controls mirror rules |
| 3 student data scoping | A/C | principal-scoped list; courseId gate; uniform 404; cross-student proof |
| 4 actionable API errors | A/B | field-level 400, uniform 404, display |
| 5 loading/empty/error states | B/C | page states; integrated |
| 6 keyboard accessibility | B | search, filters, sort, list |
| 7 responsive layouts | B | mobile + desktop |
| 8 automated business-rule tests | A/B/C | unit + data-scoping + e2e + component |
| 9 API/migration documentation | A | contract in SP-122 README; no migration |
| 10 integrated development review | C | DoD-10 note (D122C-1 exception) + this index |
| 11 reviewer walkthrough | Final reviewer | `./walkthrough.md` (pending) |

## Findings / deviations

- F122C-1 (open, against A): priority/status sort uses Postgres enum
  ordinal order, not lexicographic string order, despite D122-5 wording.
  Recorded in `../SP-122C/checkpoint.md` and `../SP-122C/implementation.md`.
  E2e expectations adjusted to actual ordinal order; no product change in C.
- D122C-1: DoD-10 manual browser pass not executed; session-owner-authorized
  automated substitute recorded (SP-113C precedent). Manual visual/mobile/
  keyboard/a11y ratification remains not performed.

## Verification summary

- With `DATABASE_URL` (disposable local Postgres 55432):
  - `pnpm --filter @studypilot/api exec jest --runInBand assignments-list-e2e.spec.ts`: 23 passed.
  - `pnpm --filter @studypilot/api exec jest --runInBand`: 43 suites, 1025 tests passed.
  - `pnpm --filter @studypilot/api exec tsc --noEmit`: pass.
- Frontend: `npm run test` (AssignmentsPage + assignmentApi): 29 passed;
  `pnpm --filter @studypilot/web typecheck`: pass.
- Without `DATABASE_URL`: the e2e spec self-skips (`describe.skip`); recorded
  as skipped, not claimed passed.

## Changed paths (C)

- `apps/api/src/modules/assignments/assignments-list-e2e.spec.ts` (new, test only)
- `docs/stories/EP03/SP-122/artifacts/SP-122C/checkpoint.md` (new)
- `docs/stories/EP03/SP-122/artifacts/SP-122C/implementation.md` (new)
- `docs/stories/EP03/SP-122/artifacts/SP-122/implementation.md` (new)
- `docs/stories/EP03/SP-122/README.md` (execution fields: C state, parent index link)
- `docs/stories/EP03/SP-122/SP-122C-assignment-list-integration.md` (Status + artifact pointer)

## Remaining / review handoff

All authorized C implementation work is finished. Request one combined
independent SP-122 review of A/B/C using this index. Formal DoD-10 independent
review and DoD-11 reviewer-owned `review.md` + `walkthrough.md` remain
outstanding. No child review, self-approval, tracker mutation, or release claim.
EOF