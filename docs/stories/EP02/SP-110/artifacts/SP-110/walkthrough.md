# SP-110 Walkthrough — Create and Manage Semesters

**Review unit:** SP-110 (children A + B + C) · **Reviewed state:** commit `8242efc` (2026-10-21)
**Final review:** [review.md](./review.md) — verdict **PASS** · **Parent implementation index:** [implementation.md](./implementation.md)

## What changed

StudyPilot students can now manage their semesters end to end:

- **List** — the `/semesters` page shows every semester with its name, readable start–end dates, an **Active** badge on the current one, and its course count, in API order (newest start date first).
- **Create** — a form with name + start/end dates; invalid input (blank/over-long name, end before or equal to start) is rejected with field-level errors and nothing is saved.
- **Edit** — the same form pre-filled; changes are a partial merge, re-validated by the backend on the merged values.
- **Activate / deactivate** — "Set as active" makes the semester the student's **current** one: every other semester of that student is deactivated in the same database transaction, so at most one is ever active (decision D110-1).
- **Delete** — a confirmation dialog that names the semester and warns that its courses are **not** deleted — they remain, unaffiliated (decision D110-2).
- **Safety** — every request is scoped to the signed-in student; another student's semester id always yields the same generic 404 "Resource not found" (no existence oracle). Unauthenticated requests get 401.
- **Navigation** — a "Semesters" link in the header (authenticated users only); the page sits behind the app's protected-route guard.

Review-unit scope: [SP-110A](../../SP-110A-semester-management-api.md) (full API surface), [SP-110B](../../SP-110B-semester-management-ui.md) (the `/semesters` page), [SP-110C](../../SP-110C-semester-integration-signoff.md) (real-database end-to-end proof + human sign-off). Creation of the *first* semester during onboarding predates this unit (SP-107B) and is unchanged.

## How the code works

**Request flow (backend, `apps/api/src/modules/semesters/`):** the controller (`semesters.controller.ts`) exposes five routes, each taking the student id from the JWT principal via `@CurrentUser()` — never from the body or params. The service (`semesters.service.ts`) does all data work:

- `list` — one query scoped to the principal, counting attached courses, ordered `startDate` desc / `name` asc; each row projected to the 8-key `SemesterWithCount` (dates serialized `yyyy-MM-dd`).
- `get` / `update` / `delete` — the ownership predicate (`{ id, userId }`) is inside the query itself, so a missing id and a foreign id are indistinguishable: both return the uniform 404 `Resource not found`.
- `update` merges the patch over the stored values, then validates the **merged** values (a one-field date patch is only legal against the other stored date). `isActive: true` runs one transaction: deactivate all of the student's other semesters, then activate the target.
- `delete` runs one transaction: set `semesterId: null` on the semester's courses (explicit orphaning, not the schema's implicit default), then delete the semester row.

The Prisma schema (`Semester`, `Course`) is unchanged by this unit — no migration.

**UI flow (frontend, `apps/web/src/`):** the entity API (`entities/semester/api/semesterApi.ts`) is the data home for all five endpoints. The three feature components — `SemesterList`, `SemesterForm`, `DeleteSemesterDialog` — live in `features/semesters/ui/`; the page (`pages/semesters/ui/SemestersPage.tsx`) orchestrates them with page-local state and **re-reads the list from the API after every successful mutation**, so order, badges and course counts always re-derive from the server. Dates render via a local-date formatter (no time-zone shift). The delete dialog traps focus, starts on the safe action (Cancel), and cancels on Escape.

**Key choices:** single-active semantics (D110-1) because EP04/EP05 consume a singular "current semester"; delete-orphan (D110-2) because courses are historical data; calendar dates as `yyyy-MM-dd` everywhere (D107-7); the 7-key `POST` response is unchanged (onboarding keeps it) so the page re-fetches instead of appending after a create.

## Why it is correct

Every claim above was checked against the code at `8242efc`, and the automated gates were **re-executed by the reviewer** (disclosed bounded helper; all exit 0): web suite **340/340**, API unit **42/42**, full API suite on a real disposable Postgres **34/34 suites · 456/456 tests · 0 skipped** (including the 10-test e2e journey and the 31-test data-scoping matrix), typecheck + lint clean.

What that evidence establishes:

- **Lifecycle on real rows** — the e2e suite (real app, real PostgreSQL, students seeded through the actual register/login endpoints) proves create → list (order + shape) → get → patch (merged values on the wire *and* in the row) → activate (exactly one active row) → attach courses → delete (204; both courses survive with `semesterId: null`) → list re-derives.
- **Ownership** — the cross-student matrix proves uniform 404 ×3, the victim's row byte-identical, and the other student's ids never appearing in the serialized list body.
- **Single-active under concurrency** — two parallel activations both return 200; afterwards exactly one semester is active (last-write-wins; the invariant, not a winner/loser error, is the contract).
- **The rendered feature** — the 13-step browser walk was **performed by the user on 2026-10-21** and returned approval with no deviations (provenance in [SP-110C/implementation.md](../SP-110C/implementation.md)).

All seven implementer-side findings (F110A-1/2, F110B-1…5, F110C-1/2) were fixed or recorded as design decisions and verified present in the final code; the final review raised **no new findings**.

**Honest limitations:** the human walk approval is at the feature level (browser/version not provided); the reviewer re-executed the automated gates but did not perform the browser walk itself — that is a human gate with recorded user provenance, per the SP-105D/SP-106D/SP-107F precedent.

## Manual test workflows

**Prerequisites (all workflows):** a local dev stack — local PostgreSQL (migrated), `pnpm --filter @studypilot/api dev` (API :4000), `pnpm --filter @studypilot/web dev` (web :3000; the Vite proxy forwards `/api/*` to the API). Use a **throwaway account** (register a new email); the app reads its own `.env.local`. No shared-system mutation is required or authorized.

### W1 — Full lifecycle browser walk (the DoD 10 gate)

1. **Register** a brand-new account and log in. If the onboarding wizard is offered, complete or skip it to reach the app (optionally create a course in wizard step 3 — its semester later shows "1 course" in the list). *Expected: you land in the app; an email-verification banner may show (unverified account).*
2. Click the header **"Semesters"** link. *Expected: the link is present when authenticated and carries the active highlight on `/semesters`.*
3. With no semesters: *Expected: "No semesters yet" + a create CTA.*
4. **Create:** open the form; enter a name + start/end dates. First try an end date equal to or before the start date and save. *Expected: a field error under the date, nothing saved.* Then enter valid dates and save. *Expected: the new semester appears in the list.*
5. **Create a second semester** (different name). *Expected: two rows, newest start date first.*
6. **Edit** one row. *Expected: the form is pre-filled; rename + change dates → save → the row updates in place.*
7. **Activate:** click "Set as active" on one row, then "Deactivate". *Expected: the Active badge appears on exactly one row after activation; it disappears after deactivation.*
8. **Course count:** *Expected: "0 courses" on the new rows; "1 course" on the onboarding semester if you created one in step 1.*
9. **Delete:** click Delete on a row. *Expected: the dialog names the semester and warns its courses are not deleted; focus starts on Cancel; Tab/Shift+Tab cycle inside the dialog; Escape closes it with no request sent; Confirm removes the row and announces success.*
10. **Keyboard pass:** repeat create → edit → activate → delete using the keyboard only. *Expected: full Tab order through list → form → dialog; no mouse needed.*
11. **Error state:** stop the API and reload `/semesters`. *Expected: the error state + a retry control.* Restart the API and click retry. *Expected: the list loads.*
12. **Mobile viewport:** repeat the core walk (list, create, activate, delete) at a mobile viewport. *Expected: actions reachable, the dialog fits, no horizontal scroll.*
13. **Return approval** with the browser/version used and any per-step observations.

**Execution status: `Executed`** — performed by the user on **2026-10-21**; result **PASSED** with no deviations reported (browser/version not provided — recorded limitation). Provenance: [SP-110C/implementation.md](../SP-110C/implementation.md) → "Manual browser sign-off (DoD 10, AC3)". An optional user repeat of these steps remains available; it is not required for sign-off.

### W2 — Cross-student ownership (wire level)

**Setup:** two accounts A and B (both disposable). A creates a semester; B signs in.
1. As B, request A's semester id via `GET`, `PATCH` and `DELETE /semesters/:id` (e.g. with a quick HTTP client against `http://localhost:3000/api`).
2. As A, re-read the semester.

*Expected: all three of B's requests return 404 `Resource not found` (the same message as a missing id — B cannot tell A's semester exists); A's row is unchanged; B's own list is empty and never contains A's ids.*

**Execution status: `Executed`** at the wire level — the e2e cross-student matrix (real HTTP, real Postgres) and the dev-stack pre-flight both proved it (2026-10-20, implementer; the e2e leg re-executed green by the reviewer 2026-10-21). A browser-level repeat is an optional user check, not a required gate.

### W3 — API contract (automated)

Not applicable as a manual check — the full contract (shapes, ordering, 400/404/409/401, 204 on delete, `yyyy-MM-dd` dates on the wire) is covered by the automated suites, which the reviewer re-executed green on 2026-10-21 (web 340/340; API 456/456 on real Postgres; see [review.md](./review.md) → Evidence). No manual repetition is needed.

### W4 — Optional user repeat (regression confidence)

Repeat W1 steps 4–9 with a second throwaway account whenever you want extra confidence (e.g. after a dependency update). **Execution status: `Not executed — user test instructions`** (optional; not required for sign-off).
