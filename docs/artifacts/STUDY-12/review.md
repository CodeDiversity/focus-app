# SP-103 / STUDY-12 Review

**Review date:** 2026-10-14  
**State reviewed:** Working tree based on `029837277c568ce0276d5bf67b12eac233353725`  
**Story:** `docs/stories/EP01/SP-103-email-verification.md`  
**Implementation record:** `docs/artifacts/STUDY-12/implementation.md`  
**Reviewer:** Read-only StudyPilot reviewer; report saved by coordinating parent.

No actionable implementation defect was found. All **169 automated tests passed freshly during this review**, and both applications passed typechecking. Full sign-off remains **CANNOT VERIFY** for actual PostgreSQL persistence/concurrency, Mailpit delivery, and desktop/mobile visual accessibility. The implementation record describes successful historical checks, but those checks were not independently reproduced or inspected in this pass.

Only this review report was written; source, configuration, and story files were unchanged.

## Prioritized findings

### Blockers

No implementation blockers identified.

**Sign-off evidence gap:** Independently verified integrated behavior remains unavailable. The story requires PostgreSQL locking verification and integrated delivery/browser inspection (`docs/stories/EP01/SP-103-email-verification.md:144`). Service tests use a serialized transaction double (`apps/api/src/modules/auth/email-verification.service.spec.ts:12`); frontend tests use JSDOM and fake HTTP responses (`apps/web/src/pages/VerifyEmail.test.tsx:34`). These checks cannot establish actual database locking, Mailpit capture, layout geometry, or visual focus.

The implementation record reports eleven PostgreSQL/HTTP/Mailpit checks, ten Chrome checks, six axe scans, and desktop/mobile inspection (`docs/artifacts/STUDY-12/implementation.md:63`, `:93`, `:108`). These are historical reported evidence, not independently executed integrated evidence for this review. This gap is not a demonstrated functional failure.

**Resolution:** Run or provide inspectable retained results for the documented isolated PostgreSQL/Mailpit/browser checks against this working tree, including migration application, confirmation/resend races, local email capture, cross-account isolation, keyboard flows, and desktop/mobile overflow and focus inspection.

### Should-fix

None identified in the implementation.

### Optional polish

Retain the integrated harness and nonsecret results in a reproducible location. The documented backend command references a temporary scratch script (`docs/artifacts/STUDY-12/implementation.md:63`); preserving it would make future regression reviews easier.

## Acceptance criteria

“Partially satisfied” means implementation and automated coverage support the criterion, but its integrated portion remains unverified. It does not indicate a demonstrated functional failure.

| AC | Status | Evidence |
| --- | --- | --- |
| **1. Atomic registration, hashed 24-hour token, unchanged success response despite SMTP failure** | **Partially satisfied** | Prepared token and detached delivery: `apps/api/src/modules/auth/auth.service.ts:119`. Nested account/token/cooldown creation: `apps/api/src/modules/users/users.service.ts:15`. SHA-256 hash and TTL: `apps/api/src/modules/auth/email-verification.service.ts:31`. Passing response/persistence-failure tests: `apps/api/src/modules/auth/auth.service.spec.ts:159`. Actual PostgreSQL rollback and initial Mailpit delivery were not rerun. |
| **2. Public explicit confirmation, owner-only verification, atomic retirement, session preservation** | **Partially satisfied** | Route outside auth guards: `apps/web/src/App.tsx:17`. Fragment capture/removal and explicit action: `apps/web/src/pages/VerifyEmail.tsx:21`, `:84`. Owner-before-token claims and all-token retirement: `apps/api/src/modules/auth/email-verification.service.ts:77`. Passing HTTP response/cookie and isolation tests: `apps/api/src/modules/auth/auth.controller.spec.ts:134`, `apps/api/src/modules/auth/email-verification.service.spec.ts:125`, `:170`. Actual database atomicity remains unverified this pass. |
| **3. Invalid/used/expired recovery, older links, concurrent single success** | **Partially satisfied** | Token rejection and expiry recheck after owner claim: `apps/api/src/modules/auth/email-verification.service.ts:78`. Passing expiry-boundary, same/different-token race, rollback and earlier-link tests: `apps/api/src/modules/auth/email-verification.service.spec.ts:136`. Passing recovery/retry tests: `apps/web/src/pages/VerifyEmail.test.tsx:147`. Actual PostgreSQL races were not rerun. |
| **4. Persisted per-account minute cooldown and generic public resend** | **Partially satisfied** | Conditional persisted owner claim and token creation: `apps/api/src/modules/auth/email-verification.service.ts:107`. Detached SMTP: `:42`. Passing generic-outcome, registration-cooldown, boundary, concurrent-instance and delivery-failure tests: `apps/api/src/modules/auth/email-verification.service.spec.ts:187`. Passing normalized public HTTP contract tests: `apps/api/src/modules/auth/auth.controller.spec.ts:141`. Actual restart/database concurrency remains unverified. |
| **5. Unverified sessions usable; verification status exposed** | **Satisfied** | Login/refresh project verification status without a gate: `apps/api/src/modules/auth/auth.service.ts:135`, `:189`, `:258`. JWT and protected frontend routes have no verification gate: `apps/api/src/modules/auth/strategies/jwt.strategy.ts:32`, `apps/web/src/components/ProtectedRoute.tsx:8`. Session tests pass, including profile-refresh failure retaining usable access: `apps/web/src/context/AuthContext.test.tsx:204`. |
| **6. Account-scoped banner dismissal and safe reconciliation** | **Satisfied** | Loaded/null-only banner and account-keyed state: `apps/web/src/components/EmailVerificationBanner.tsx:33`. Identity reset, deduplication, queued fresh reads, stale-response guards and transient-failure handling: `apps/web/src/context/AuthContext.tsx:50`. Passing navigation/logout/reload/account/focus/deferred-restoration tests: `apps/web/src/components/EmailVerificationBanner.test.tsx:81`, `apps/web/src/context/AuthContext.test.tsx:180`, `apps/web/src/pages/VerifyEmail.test.tsx:98`. |
| **7. Public resend form and frontend/backend validation** | **Satisfied** | Validation and malformed-input focus: `apps/web/src/pages/VerifyEmail.tsx:58`; always-available form: `:91`. Backend normalization/validation: `apps/api/src/modules/auth/dto/resend-verification.dto.ts:4`. Banner uses current account email: `apps/web/src/components/EmailVerificationBanner.tsx:16`. Passing DTO/HTTP/missing-token/validation tests: `apps/api/src/modules/auth/dto/resend-verification.dto.spec.ts:12`, `apps/web/src/pages/VerifyEmail.test.tsx:91`, `:185`. |
| **8. States, duplicate prevention, keyboard/accessibility/responsiveness** | **Partially satisfied** | Status/error regions, labels and disabled controls: `apps/web/src/pages/VerifyEmail.tsx:75`, `apps/web/src/components/EmailVerificationBanner.tsx:16`. Passing duplicate/cooldown/error/keyboard tests: `apps/web/src/pages/VerifyEmail.test.tsx:134`, `:212`, `apps/web/src/components/EmailVerificationBanner.test.tsx:113`, `:144`. Actual viewport geometry, visual focus and applicable WCAG behavior were not independently inspected. |
| **9. Reusable SMTP provider, Mailpit, fake test delivery, sanitized diagnostics** | **Partially satisfied** | Reusable interface/module: `apps/api/src/modules/email/email-provider.ts:1`, `apps/api/src/modules/email/email.module.ts:6`. Configuration validation, certificate checks, deadlines and sanitized failures: `apps/api/src/modules/email/smtp-email.provider.ts:19`. Pinned loopback Mailpit: `docker-compose.yml:24`. Passing SMTP unit tests and real TCP/Nodemailer cancellation regression: `apps/api/src/modules/email/smtp-email.provider.spec.ts:33`, `apps/api/src/modules/email/smtp-email.provider.integration.spec.ts:9`. Actual registration/resend Mailpit capture was not rerun. |

## Definition of Done

Checklist follows `docs/epics/README.md:30`. PASS entries have relevant automated backing; unexecuted integrated assertions are not inferred to pass.

| # | Condition | Result | Evidence |
| --- | --- | --- | --- |
| **1** | Functional acceptance criteria pass | **CANNOT VERIFY** | Automated behavior passes, but integrated portions of AC1–4, AC8 and AC9 remain unverified above. |
| **2** | Frontend/backend validation handles invalid input | **PASS** | Passing DTO/global-pipe HTTP and page-validation tests: `apps/api/src/modules/auth/auth.controller.spec.ts:151`, `apps/web/src/pages/VerifyEmail.test.tsx:185`. |
| **3** | Academic data scoped to authenticated student | **PASS — applicable story scope** | No academic-data endpoints or queries added. Existing profile routes remain JWT-guarded and use `req.user.id`: `apps/api/src/modules/users/users.controller.ts:9`. Passing owner/account-isolation tests: `apps/api/src/modules/auth/email-verification.service.spec.ts:170`, `apps/web/src/pages/VerifyEmail.test.tsx:73`, `apps/web/src/context/AuthContext.test.tsx:222`. This does not certify future academic modules. |
| **4** | API errors produce actionable messages | **PASS** | Passing invalid-link HTTP envelope and sanitized frontend retry tests: `apps/api/src/modules/auth/auth.controller.spec.ts:176`, `apps/web/src/pages/VerifyEmail.test.tsx:147`. |
| **5** | Loading, empty and error states handled | **PASS** | Passing missing/malformed-token, pending, duplicate, error and cooldown tests: `apps/web/src/pages/VerifyEmail.test.tsx:91`, `:134`, `apps/web/src/components/EmailVerificationBanner.test.tsx:113`. |
| **6** | Core interactions support keyboard accessibility | **PASS — tested interactions** | Passing keyboard confirmation/resend and banner dismissal: `apps/web/src/pages/VerifyEmail.test.tsx:212`, `apps/web/src/components/EmailVerificationBanner.test.tsx:144`. Focus styles: `apps/web/src/components/Button.tsx:28`, `apps/web/src/components/Input.tsx:60`. Full visual/WCAG inspection remains unverified. |
| **7** | Responsive desktop/mobile layouts work | **CANNOT VERIFY** | Responsive classes: `apps/web/src/pages/VerifyEmail.tsx:71`, `:84`, `:97`; `apps/web/src/components/EmailVerificationBanner.tsx:11`. Historical viewport evidence: `docs/artifacts/STUDY-12/implementation.md:108`. No independent actual viewport inspection or geometry test in this pass. |
| **8** | Business rules have automated tests | **PASS** | Fresh 101 API and 68 web tests passed. Expiry, cooldown, simulated races, owner isolation, explicit action, dismissal and reconciliation covered. Transaction doubles do not establish PostgreSQL locking: `apps/api/src/modules/auth/email-verification.service.spec.ts:12`. |
| **9** | API changes and migrations documented | **PASS** | Contracts match passing HTTP tests: `docs/artifacts/STUDY-12/implementation.md:20`, `apps/api/src/modules/auth/auth.controller.spec.ts:134`. Schema/migration record matches additive SQL: `docs/artifacts/STUDY-12/implementation.md:31`, `apps/api/prisma/migrations/20261013180000_email_verification/migration.sql:1`. Migration deployment is historical reported evidence. |
| **10** | Reviewed in integrated development environment | **CANNOT VERIFY** | Historical integrated record: `docs/artifacts/STUDY-12/implementation.md:63`, `:91`. Fresh tests included real loopback HTTP and SMTP deadline checks, but no complete browser/API/PostgreSQL/Mailpit environment. |

## Verification executed during this review

The coordinating parent ran tests and typechecks; the delegated reviewer inspected implementation and covering test source. Test source was unmodified.

### API

Inline Jest invocation used `NODE_ENV=test`, `cache:false`, and disabled only Haste-map and test-sequencer disk persistence. No test behavior was replaced. Initial restricted execution had **91 passing tests and 10 blocked by localhost `listen EPERM`**. The approved rerun outside the restriction completed:

```text
Test Suites: 12 passed, 12 total
Tests:       101 passed, 101 total
Snapshots:   0 total
Time:        2.1 s
Exit code:   0
```

Includes real loopback controller/global-validation-pipe HTTP tests and real TCP/Nodemailer delivery-deadline regression. The exception-filter suite emitted its existing synthetic-error fixture log.

Reproducible invocation, from `apps/api`:

```sh
node -e 'process.env.NODE_ENV="test"; const {createRequire}=require("module"); const r=createRequire(require.resolve("jest")); r("jest-haste-map").default.prototype._persist=function(){}; r("@jest/test-sequencer").default.prototype.cacheResults=function(){}; require("jest").runCLI({runInBand:true,cache:false,watch:false,coverage:false},[process.cwd()]).then(({results})=>{process.exitCode=results.success?0:1;}).catch(e=>{console.error(e);process.exitCode=1;});'
```

### Web

In-memory Vite configuration disabled configuration-file generation, credential-file loading, cache and dependency optimization. Existing aliases, React plugin, globals, JSDOM, setup and CSS behavior were preserved.

```text
Test Files: 8 passed (8)
Tests:      68 passed (68)
Duration:   4.04 s
Exit code:  0
```

Existing React Router/PostCSS notices, synthetic logout-network output and registration-test act warnings were nonfatal.

Reproducible invocation, from `apps/web`:

```sh
node --input-type=module -e 'import { startVitest } from "vitest/node"; import react from "@vitejs/plugin-react"; import path from "node:path"; const names={"@":"src","@components":"src/components","@pages":"src/pages","@hooks":"src/hooks","@services":"src/services","@types":"src/types","@utils":"src/utils","@context":"src/context"}; const alias=Object.fromEntries(Object.entries(names).map(([k,v])=>[k,path.resolve(v)])); const ctx=await startVitest("test",[],{watch:false,cache:false,config:false},{configFile:false,envFile:false,plugins:[react()],resolve:{alias},test:{globals:true,environment:"jsdom",setupFiles:"./src/test/setup.ts",css:true,cache:false,watch:false,deps:{optimizer:{web:{enabled:false},ssr:{enabled:false}}}}}); if(ctx){await ctx.close();} else {process.exitCode=1;}'
```

### Other checks and limits

- In each app, `./node_modules/.bin/tsc --noEmit --incremental false` exited **0**, with no diagnostics.
- Reviewer scoped `git diff --check` exited **0**, with no output.
- **Fresh total: 169 tests passed; no Turbo result cache used.**
- No credential files were read; no real mailboxes were contacted.
- Historical builds, migration deployment, browser/axe and Mailpit smoke checks were not counted as fresh execution.

## Scope

No AI features, syllabus parsing, LMS integrations, grade calculations, flashcards or native mobile work were introduced.

**Verdict: No implementation defects found; SP-103 is not fully approved because DoD conditions 1, 7 and 10 remain CANNOT VERIFY in this review.**
