# EP10B checkpoint

Updated: 2026-10-29
Execution state: EP10 README queue row EP10B — Ready → In progress → Implemented — awaiting parent review
Story: [EP10B-shared-ui-primitives-refresh.md](../../EP10B-shared-ui-primitives-refresh.md)
Review unit: EP10 combined parent review (after all children)
Role / scope: implementer; frontend only; shared UI primitives refresh.

## Repository state
- Workspace / branch: `main`
- Baseline HEAD before changes: `322c417` (EP10A)
- Other work to preserve: pre-existing uncommitted doc edits (autopilot skill, plan-review, story/readme) — preserved; only owned paths staged.

## Progress
- [x] Read story, parent README, epic, EP10A tokens/contrast record, existing shared/ui, dialog pattern.
- [x] Migrate Button/Input/Select to tokens (D10-12, D10-13).
- [x] Add Card, Dialog, Badge, EmptyState primitives (D10-14…D10-17).
- [x] Add component tests (Button, Input, Select, Card, Dialog, Badge, EmptyState).
- [x] Run typecheck/lint/build/tests (all green).
- [x] Update status + queue + implementation record.

## Findings
- F-B-1: Input/Select password toggle now exposes `aria-label` ("Show/Hide password") per D10-13; this broadened the accessible-name match in existing tests. Updated LoginPage tests to use `/^password$/i` (no functional change).
- F-B-2: Style assertions in existing callers referenced old Tailwind classes (`bg-primary-600`, `text-sm`, `text-secondary-500`?). Updated `AssignmentsSection` button assertion to new token classes (`bg-accent`, `text-body-sm`). Functional behavior unchanged.
- F-B-3: Removed `role="alert"` from Input/Select error paragraphs to preserve the original "field-level error, not form-level alert" contract relied on by callers (e.g. availability 400 field-map test). Error copy remains `aria-describedby` + `aria-invalid`.
- None blocking.

## Resume next
Implementation complete; awaiting combined EP10 parent review. Next actionable child: EP10C (ui-refiner pass).