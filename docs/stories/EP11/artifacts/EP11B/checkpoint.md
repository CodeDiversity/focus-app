# EP11B checkpoint
Updated: 2026-11-01 (start of task)
Execution state: [EP11 README execution queue](../../README.md) — row EP11B `In progress`.
Story: [EP11B-mobile-drawer-grouped-sections.md](../../EP11B-mobile-drawer-grouped-sections.md)
Review unit: EP11 parent; combined index `docs/stories/EP11/artifacts/EP11/implementation.md` (EP11B owns it).
Role / scope: implementer; frontend only — mobile drawer grouped sections + Account section; desktop behavior, `navGroups.ts` contract content, routes, backend all excluded.

## Repository state
- Workspace / branch: `/Users/michaelrobert/Desktop/focus-app`, `main`
- HEAD at last update: `c4aa040`
- Saved work: none yet (start claim: README queue row + story Status + this checkpoint)
- Other work to preserve: `.agents/skills/autopilot/SKILL.md`, `.agents/workflow-graph.md` — foreign dirty paths, NEVER stage.

## Progress
- [x] Queue claimed (`In progress`), story Status set, checkpoint created
- [ ] `Header.tsx`: delete `navLinks`/`NavLinkItem`/EP11B marker/`showVerify`; extend `navLinkClass` mobile branch (`gap-3 rounded-md hover:bg-surface-muted`, move `gap-2` to desktop branch); grouped `<nav>` body (single-link vs `section.items` branch, `mobile-nav-*` heading ids); Account section (identity row + separators + `visibleAccountItems` map, Verify-email as `Link`, Logout as plain 44px `<button>`); unauthenticated branch unchanged
- [ ] `Header.test.tsx`: new `describe('Header mobile drawer grouped sections (EP11B)')` — 8 cases (case 1 asserts `Plan` `href="/plan"` in Planning region); strengthen 2 existing cases (within(dialog) Dashboard click; Escape focus-restore assertion); keep EP11A 17 desktop + 3 untouched mobile cases green
- [ ] Verification: header suite, full web suite (gate: green at current HEAD per PR-005, not the dated 842), typecheck, lint
- [ ] `implementation.md` (child record) + combined parent index `artifacts/EP11/implementation.md` (maps `3853aaa` → HEAD, EP11A `b7ae794`/`1aec0ea`, EP06F amendment `2e35061`)
- [ ] Completion closeout: queue → `Implemented — awaiting parent review`, story Status, Next substory → combined parent review; scoped commits
- Current step: implement `Header.tsx` grouped drawer rendering.

## Decisions and dependencies
- Settled: D11-4 (incl. ratified `Plan` `/plan` in Planning — consume as-is, NOT drift), D11-8 keep-both (`Availability` ×2 asserted deliberately), D11-5 icons+text, D11-7 reuse EP10C drawer unchanged (focus trap/scroll lock/Escape/route-close/header).
- Story "Exact edits" section is the implementation spec (class strings, heading ids, element choices: `Link` for verify-email, plain `<button>` for Logout, avatar `text-sm`, `initials || User` fallback).
- Focus trap: 13 authenticated focusables (12 verified) — story risk note; test case 8 guards the wrap.
- No new contract fields/edits to `navGroups.ts` anticipated; stop-and-flag only for NEW fields.

## Verification
- Not yet run this task. Planned: `pnpm --filter web test -- src/widgets/header`; `pnpm --filter web typecheck`; `pnpm --filter web lint`; `pnpm --filter web test` (full).

## Resume next
1. `apps/web/src/widgets/header/ui/Header.tsx` — apply story "Exact edits" 1–7 (delete legacy list/marker/`showVerify`; `navLinkClass` mobile branch; grouped nav; Account section; keep unauthenticated branch).
2. `apps/web/src/widgets/header/ui/Header.test.tsx` — add EP11B describe (8 cases) + 2 strengthenings; then `pnpm --filter web test -- src/widgets/header` expecting all green.
- Read next: story `## Tests to add / update` + `### Exact edits`; `navGroups.ts` (as-is contract).
