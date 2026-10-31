# EP12 combined implementation index

**Parent:** [EP12 — Tech Debt Cleanup](../../README.md)
**Status:** All three children implemented — combined EP12 parent review next.
**Review unit:** EP12 combined parent review — `./review.md` + `./walkthrough.md` (to be produced by the reviewer).
**Artifact home:** `docs/stories/EP12/artifacts/EP12/`
**Written by:** implementer (integration task).

## Review unit / complete inventory

| Child | Layer | Evidence | Actual implementation commit scope |
|---|---|---|---|
| EP12A — Consolidate IANA/time-zone date conversion | Backend | [implementation](../EP12A/implementation.md) · [checkpoint](../EP12A/checkpoint.md) | `6b28649` (`refactor(api): consolidate IANA date conversion into civil-date (EP12A)`) |
| EP12B — Adopt shared `Dialog` primitive across hand-rolled modals | Frontend | [implementation](../EP12B/implementation.md) · [checkpoint](../EP12B/checkpoint.md) | `950dfc1`, `4ccb528`, `e7f9378`, `ebe8b15`, `6f4788c` (plus test fix `2eab452`) |
| EP12C — Unify web API clients per domain | Frontend | [implementation](../EP12C/implementation.md) · [checkpoint](../EP12C/checkpoint.md) | `2fd6264` (`refactor(web): unify dashboard API clients via entityBaseQuery (EP12C)`) |
| EP12 — Integration / parent index | Docs | this file · [checkpoint](./checkpoint.md) | this integration commit (docs only) |

(Paths are relative to this file's directory: `docs/stories/EP12/artifacts/EP12/`.)

## Combined Git range

- Autopilot-recorded baseline (README `coordinator.baseline`): `6b28649`
  (EP12A implementation commit; HEAD when the EP12 run entered step mode).
- Earliest relevant baseline before any EP12 implementation change:
  `d3fb887` (`docs(EP12): add Tech Debt Cleanup epic — three children refined to Ready`).
- First included implementation commit: `6b28649` (EP12A).
- Last code commit before this index: `f04ac4b` (`docs(EP12C): record implementation commit hash`).
- Review the full range `d3fb887..{final}` (equivalently `6b28649^..{final}`):
  - EP12A: `civil-date.ts` (`zoneParts`, `wallClockToInstant`, private `tzOffsetMs`), `calendar-date.ts` (`addDays`, `dayOfWeekOf`), deletion of six private copies from `calendar.service.ts` and `study-plans.service.ts`, new/extended module specs, comment-only updates in `scheduler.ts`/`types.ts`.
  - EP12B: `shared/ui/Dialog.tsx` (`busy` prop, conditional focus restore), migration of 11 hand-rolled modals (delete + form dialogs + `CalendarEventDetails`), updated dialog tests.
  - EP12C: `rtkBaseQuery.ts` (`entityBaseQuery<Arg, Result>`), `features/calendar/api/calendarApi.ts` and `features/assignments/api/assignmentsApi.ts` delegating to entity clients, adapter-harness tests + T-12C-1/2/3.
  - Integration: this parent index, parent checkpoint, README queue/autopilot checkpoint reconciliation.
- Unrelated pre-existing dirty paths preserved and excluded from scope: none at integration time (working tree clean).

## Requirement / DoD coverage

Source items and DoD references: [EP12 README traceability](../../README.md#requirement-and-test-traceability).

| Item / DoD | Evidence owner / result |
|---|---|
| TD-01 — duplicated IANA time-zone date conversion consolidated | EP12A: single `zoneParts` + `wallClockToInstant` seam in `civil-date.ts`; `addDays`/`dayOfWeekOf` in `calendar-date.ts`; private copies deleted from both services; existing calendar/study-plans pins pass unchanged (AC-12A-1…AC-12A-6). |
| TD-02 — 11 hand-rolled modal dialogs adopted onto shared `Dialog` | EP12B: `busy` prop (AC-12B-1), all 11 dialogs render via `Dialog` with hand-rolled trap/escape/backdrop/scroll code removed (AC-12B-2), per-dialog semantics preserved (AC-12B-3), out-of-scope drawers/menus untouched (AC-12B-4). |
| TD-03 — parallel web API clients unified per domain | EP12C: entity modules own fetch/URL/whitelist; RTK slices delegate via `entityBaseQuery` with identical error mapping (AC-12C-1…AC-12C-6). |
| DoD 1 — functional criteria (no behavior change) | All three children: no product behavior change; existing suites green. |
| DoD 3 — student data scoping | EP12A: ownership scoping unchanged (`ownedWhere` paths untouched); calendar/study-plans service behavior identical. |
| DoD 4 — actionable API errors | EP12C: error mapping preserved (`{ message, code: String(status) }`). |
| DoD 5 — loading/empty/error states | EP12B: unchanged dialog shells; primitive adoption preserves states. |
| DoD 6 — keyboard accessibility | EP12B: focus trap, Escape, backdrop, scroll lock, focus restore preserved via `Dialog`; `busy` holds focus and sets `aria-busy`. |
| DoD 8 — automated tests | EP12A API 40 suites / 883 passed; EP12B web 1094 passed; EP12C web 1092 passed; lint/typecheck/build clean for each. |
| DoD 10 — integrated review | This parent review unit (all three children) — pending reviewer. |
| DoD 11 — reviewer walkthrough | To be produced by the reviewer as `walkthrough.md`. |

## Final verification and limitations

Child-recorded verification (not re-run for this docs-only integration step):

- EP12A (API): `pnpm --filter @studypilot/api test` — 40 suites, 883 passed, 436 skipped; lint (`--max-warnings 0`), typecheck, build, format all clean (2026-10-31).
- EP12B (web): `pnpm --filter @studypilot/web test` — 1094 passed; lint, typecheck, build clean.
- EP12C (web): `pnpm --filter @studypilot/web test` — 1092 passed; lint, typecheck, build clean.

Limitations / open items carried into review:

- EP12A T-12A-6 (DST spanning) is intentionally not a new helper test; it is pinned by the unmodified `calendar.service.spec.ts:80` recurrence case through the consolidated path (by design, F-12A-5).
- EP12B primitive restore-focus was made conditional on the close path (via `onClose`) to preserve success-skip behavior without new props; focus/scroll effect split from the keydown listener to avoid reset on unstable `onClose`.
- EP12C RTK slice suites switched from spying on `httpClient.request` to an adapter-based capture harness because delegated fetch routes through the entity client; assertions updated for empty-params object and lowercase axios method casing.
- No new browser/E2E walk was performed for EP12B accessibility; keyboard behavior is covered by unit tests. The reviewer may request a manual walk.
- Integration step performed no code changes and no test runs; child evidence above is the verification basis.
