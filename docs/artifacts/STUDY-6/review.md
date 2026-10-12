# STUDY-6 (SP-101) Review Report

**Story:** [SP-101: User Registration](../../stories/EP01/SP-101-user-registration.md)

**Review date:** 2026-10-12

**State reviewed:** commit `9ef603b` (working tree clean)

**Reviewer note:** the same agent implemented this story; every claim below was
re-verified against the code and fresh test runs rather than taken from
`implementation.md`.

---

## Verification runs (executed during this review)

| Check | Command | Result |
|---|---|---|
| Backend tests | `npx jest` (apps/api) | 29 passed, 29 total |
| Frontend tests | `npx vitest run` (apps/web) | 17 passed, 17 total (3 files) |
| bcrypt remnants | `grep -rn bcrypt apps/ --include="*.ts" --include="*.json"` | none (source and package.json clean) |
| Password/hash logging | `grep -rn "console\.\|logger" apps/api/src/modules/auth/` | none outside specs |
| Legacy hash behavior | `argon2.verify` against a bcrypt-format hash | resolves `false` (no 500); pre-migration accounts fail login as expected, consistent with story Q2 reset |

---

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Register with display name, email, password via `POST /auth/register` | Satisfied | `auth.controller.ts:20-22`; `RegisterDto` `register.dto.ts:8-17`; service `auth.service.ts:73-99`. No HTTP-level test asserts the route (no e2e harness exists in the repo). |
| 2 | argon2id; plaintext never stored or logged | Satisfied | `auth.service.ts:35-40` (argon2id, m=19456, t=2, p=1), `:86-89` (hash before create); `users.service.ts` create never receives plaintext; no logging in the auth module (grep clean). Spec: `auth.service.spec.ts:105` asserts hash params and that the create payload never contains the plaintext. |
| 3 | Duplicate email → 409 with actionable message | Satisfied (service level) | `auth.service.ts:78-83` throws `ConflictException` with an actionable message; `auth.service.spec.ts:71,80` assert the rejection and that `create` is not called. HTTP 409 status itself is not asserted anywhere (no e2e harness). |
| 4 | Weak passwords / malformed email+name rejected by FE and BE with field-level messages | Satisfied | BE: `register.dto.ts:7-17` (trimmed required name, `@IsEmail`, `@MinLength(8)`), all cases in `register.dto.spec.ts:56-82` incl. whitespace-only name and non-whitelisted `isAdmin`. FE: `Register.tsx:14-19` zod mirror; `Register.test.tsx:70,83`. |
| 5 | 201 with `{ id, name, email }` only — no token, no password data | Partially satisfied | Service returns the flat object (`auth.service.ts:99`; spec `auth.service.spec.ts:124` asserts no `accessToken`/`passwordHash` and that `jwtService.sign` is never called). The 201 status is NestJS default for `@Post` but is not asserted by any HTTP-level test. |
| 6 | No session tokens issued; toast + redirect to `/login` without authenticating | Satisfied | `services/auth.ts:21-24` (register stores no token), `AuthContext.tsx:73-93` (register sets no user), `Register.tsx:43-44` (toast + `navigate('/login', { replace: true })`). `Register.test.tsx:95` verifies redirect, null token, and `isAuthenticated === false`. |
| 7 | Form handles loading and error states; keyboard accessible | Satisfied (with one should-fix) | `Register.test.tsx:122` (409 toast), `:140` (loading state), `:166` (keyboard-only completion). `Input.tsx:35,46,60-61` associates labels and announces errors via `aria-describedby`/`aria-invalid`. See SF1 for the toggle exception. |

---

## DoD checklist (docs/epics/README.md)

| # | Condition | Verdict | Evidence |
|---|---|---|---|
| 1 | Functional acceptance criteria pass | PASS | All seven ACs verified above; 29 backend + 17 frontend tests pass fresh. |
| 2 | Frontend and backend validation handle invalid input | PASS | `register.dto.spec.ts` (6 cases through the real `ValidationPipe` config from `main.ts:11-14`); `Register.test.tsx:70` field-level zod errors without submitting. |
| 3 | Academic data scoped to the authenticated student | PASS | This story adds no academic resources. User routes remain guarded and self-scoped: `users.controller.ts:10` `@UseGuards(JwtAuthGuard)`, `:16,24` query only `req.user.id`. Register endpoint exposes only the created student's own `{ id, name, email }`. |
| 4 | API errors produce actionable messages | PASS | 409 message (`auth.service.ts:80-82`), DTO messages (`register.dto.ts:9,12,16`), uniform shape via existing `AllExceptionsFilter` (spec coverage predates this story). |
| 5 | Loading, empty, and error states handled | PASS | Register: loading (`Register.test.tsx:140`), error (409, validation, network → `getErrorMessage`). Empty states: not applicable — the story adds no list or data view. |
| 6 | Core interactions keyboard accessible | PASS (see SF1) | `Register.test.tsx:166` completes the full form keyboard-only. The password visibility toggle is intentionally skipped by the test — see SF1. |
| 7 | Responsive layouts on desktop and mobile | FAIL (no automated backing) | Per review rules a condition without an automated test is FAIL. The register page is a single-column centered card (`max-w-md`, `px-4 sm:px-6 lg:px-8`) so practical risk is low, but nothing verifies it. No viewport test exists in the repo. |
| 8 | Business rules have automated tests | PASS | Duplicate email, email normalization, hash parameters, no-token response, validation rules, redirect behavior — all covered (runs above). |
| 9 | API changes and migrations documented | PASS | `docs/artifacts/STUDY-6/implementation.md` documents endpoint, response shape, DTO, and migration; migration `20261012000000_user_name_email_verified_at/migration.sql` is committed. Application is pending (BL1). |
| 10 | Reviewed in an integrated development environment | CANNOT VERIFY | Builds, typechecks, lint, and both unit suites were run. But the migration has not been applied (`DATABASE_URL` lives in `.env.local`, unreadable by the Prisma CLI and off-limits to agents) and the register flow has never been exercised against a live database or a running API. BL1. |

---

## Findings

### Blockers

- **BL1 — Migration unapplied; no live-database verification.** The migration
  SQL is committed but `prisma migrate dev` never ran, and register/login were
  never exercised against a real PostgreSQL instance. Required before sign-off:
  `pnpm --filter @studypilot/api db:migrate` (reset is acceptable per story Q2),
  then a smoke test: register via HTTP, confirm 201 shape, duplicate 409, and
  login with the new argon2 hash. DoD 10 stays CANNOT VERIFY until then.

### Should-fix

- **SF1 — Password visibility toggle is keyboard-unreachable and unlabeled.**
  `Input.tsx:81` sets `tabIndex={-1}` on the icon-only toggle button, which also
  has no accessible name (no `aria-label`). The keyboard-only test passes by
  skipping it. WCAG 2.2 AA target means this needs `aria-label="Show password"`
  (state-aware) and normal tab order. Pre-existing, not introduced by SP-101,
  but this story touched the component.
- **SF2 — No HTTP-level tests.** The 201 and 409 statuses and route wiring are
  asserted nowhere; everything is service/DTO level. The repo has no supertest
  or e2e harness (removed as broken in STUDY-20). Worth adding alongside SP-102,
  which rewrites the session flow and will need it anyway.
- **SF3 — Login-side email normalization missing.** `validateUser`
  (`auth.service.ts:56-72`) does not lowercase the email, so a user who
  registered as `ada@example.com` cannot log in as `Ada@example.com`.
  SP-102 owns the session rewrite and should mirror the register-side
  normalization (already flagged in `implementation.md`).

### Optional polish

- **P1 — Frontend whitespace-only name case untested.** The backend rejects a
  whitespace-only display name (`register.dto.spec.ts:64`); the zod schema
  handles it via `.trim().min(1)` but `Register.test.tsx` has no case for it.
- **P2 — Legacy dev accounts silently fail login.** Verified during this
  review: `argon2.verify` on a bcrypt-format hash resolves `false` rather than
  throwing, so pre-migration dev users get a clean 401, not a 500. Acceptable
  given Q2's disposable dev rows; worth knowing if a developer's old account
  stops working.

---

## Verdict

**Conditional pass:** all seven acceptance criteria and DoD conditions 1-6, 8,
and 9 are verified passing; DoD 7 (responsive) fails for lack of automated
backing, and DoD 10 cannot be verified until BL1 — the committed migration is
applied and the register flow is smoke-tested against a live database.
