# SP-128 Parent Implementation Record — Availability & Unavailable Blocks

**Parent:** [SP-128](../../SP-128-availability-and-unavailable-blocks.md)
**Status:** Reviewed (pass 1, 2026-10-28) — SP-128A and SP-128B `Reviewed`; F-B-6 kind-selector fix verified (vitest `src/features/availability` 37/37) and the correction round closed.
**Prepared by:** SP-128B's implementer (the integration/index owner, per the README's review unit)
**Baseline:** `9bf65f7` (the commit before SP-128A's first included change)

## Children and commit scope

| Child | Layer | Status | Record | Commit scope |
|---|---|---|---|---|
| [SP-128A](../../SP-128A-availability-slots-api.md) | API | Implementation complete — awaiting parent review | [artifacts/SP-128A/implementation.md](../SP-128A/implementation.md), [checkpoint](../SP-128A/checkpoint.md) | `35ed47d` — `apps/api/src/modules/availability/*` (7 files), `app.module.ts`, `test/test-http.ts`, EP04 README + SP-128 README/queue updates |
| [SP-128B](../../SP-128B-availability-settings-ui.md) | Web | Implementation complete — awaiting parent review | [artifacts/SP-128B/implementation.md](../SP-128B/implementation.md), [checkpoint](../SP-128B/checkpoint.md) | the SP-128B feature commit (this closeout's handoff) — `apps/web/src/entities/availability/*`, `features/availability/*`, `pages/availability/*`, `App.tsx`, `Header.tsx`, `e2e/calendar.spec.ts`, the SP-128 README/queue and artifact updates |

No work outside these two children; no integration code beyond SP-128B's consumption of the SP-128A contract (the layer boundary the splitting was built on).

## Integration notes (contract pairing)

- The shared contract in the [EP04 README](../../../../../../epics/README.md) is implemented by SP-128A and consumed by SP-128B **as written**: GET/POST/PATCH/DELETE `/availability-slots`, the 400 `errors` field map, the 409 duplicate ("An availability slot already exists at this time." — the UI renders the API's message verbatim), the uniform 404 `Resource not found` (the edit dialog's "this time slot may no longer exist." recovery + cancel-refetch), 201/200/204 shapes with `userId` never exposed.
- End-to-end proof beyond the two children's own suites: the extended `calendar.spec.ts` journey creates an available window and a blocked time **through the SP-128B UI** against the SP-128A API in the self-contained e2e stack and asserts both render as calendar events (`Available: Available, 09:00` / `Blocked: Blocked time, 20:00`) — the contract verified consumer → implementation → the SP-127A read model. 4/4 calendar e2e tests pass; the full picture including states and announcements is the children's 56 unit/component tests.
- No migration (D404-5), no schema divergence, no frontend-side contract re-shaping: the client sends exactly `{ dayOfWeek, startTime, endTime, isAvailable }` and maps the API order as-is (Monday-first grouping is presentation only).

## Combined-review inputs

- Each child's `implementation.md` holds its AC/DoD outcomes, verification table, and findings with dispositions (SP-128B's: F-B-1…5; F-B-4 is the open, cross-feature pointer — the pre-existing `semesters-courses.spec.ts` course-test failures, verified at the baseline — for the review to route).
- SP-128A verification: availability API suites 42/42 with a real database, typecheck/lint clean, full API unit suite 698 passed (see its record).
- SP-128B verification: 56/56 availability tests, web suite 760/760, typecheck/lint clean, calendar e2e 4/4 (see its record).
- Story DoD items 10–11 (integrated development-environment review + the reviewer walkthrough) belong to the upcoming combined review unit: one review for SP-128A + SP-128B, `review.md` + `walkthrough.md` at this folder.
