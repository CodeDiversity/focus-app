# All-story removal audit — 2026-10-17

Rechecked all **39 mapped local story records** against complete single-page live
Jira discovery (52 issues, `isLast=true`), parent queues and saved implementation
review verdicts. No unmapped specification files were found under `docs/stories/`
(excluding READMEs, plan reviews and artifacts). This is a removal audit, not a new
implementation review. No Jira fields/statuses were changed.

Correction: the earlier check relied on SP-105’s stale queue and incorrectly
reported that its final review was pending. The saved pass-2 review is **Pass** at
`8b363d4`, closes PR-107/PR-108 and supersedes that queue. The queue now records
Reviewed from the actual report; historical entries/reports remain unchanged.

Removed eight additional clean files: SP-105A/C/D/E/G/H/I/J. Their exact committed
content, Jira Done status, passing review, tombstones and recovery commands were
verified. SP-105’s 22 artifact files stayed byte-for-byte unchanged. Together with
the six SP-108 removals, **14 specifications are removed and 25 retained**.

SP-106’s actual saved review still says **Changes Required**. The IR-106-01 fix
exists, but the current queue requires a combined parent re-review. The fix alone
does not establish a passing final verdict.

| Story | Jira | Live status | Disposition |
| --- | --- | --- | --- |
| SP-101 | STUDY-6 | Done | Retained: saved review identifies reviewer as implementer; independent gate not established |
| SP-102 | STUDY-9 | Done | Retained: saved review identifies reviewer as implementer; independent gate not established |
| SP-103 | STUDY-12 | To Do | Retained: review not fully approved (DoD 1/7/10 unverified); Jira To Do |
| SP-104 | STUDY-10 | To Do | Retained: Jira To Do despite passing repo review |
| SP-105 | STUDY-7 | Done | Retained: dirty specification; parent also preserves shared context. Final parent review PASS |
| SP-105A | STUDY-22 | Done | Removed; Git recovery and tombstone verified |
| SP-105B | STUDY-23 | Done | Retained: dirty specification; parent also preserves shared context. Final parent review PASS |
| SP-105C | STUDY-24 | Done | Removed; Git recovery and tombstone verified |
| SP-105D | STUDY-25 | Done | Removed; Git recovery and tombstone verified |
| SP-105E | STUDY-26 | Done | Removed; Git recovery and tombstone verified |
| SP-105F | STUDY-27 | Done | Retained: dirty specification; parent also preserves shared context. Final parent review PASS |
| SP-105G | STUDY-28 | Done | Removed; Git recovery and tombstone verified |
| SP-105H | STUDY-29 | Done | Removed; Git recovery and tombstone verified |
| SP-105I | STUDY-30 | Done | Removed; Git recovery and tombstone verified |
| SP-105J | STUDY-31 | Done | Removed; Git recovery and tombstone verified |
| SP-106 | STUDY-11 | To Do | Retained: final parent review Changes Required; IR-106-01 fix awaits independent re-review |
| SP-106A | STUDY-32 | Done | Retained: final parent review Changes Required; IR-106-01 fix awaits independent re-review |
| SP-106B | STUDY-33 | To Do | Retained: final parent review Changes Required; IR-106-01 fix awaits independent re-review |
| SP-106C | STUDY-34 | To Do | Retained: final parent review Changes Required; IR-106-01 fix awaits independent re-review |
| SP-106D | STUDY-35 | To Do | Retained: final parent review Changes Required; IR-106-01 fix awaits independent re-review |
| SP-107 | STUDY-8 | To Do | Retained: not implemented or reviewed |
| SP-108 | STUDY-36 | Done | Retained: dirty specification; parent also preserves shared context. Final parent review PASS |
| SP-108A | STUDY-37 | Done | Removed; Git recovery and tombstone verified |
| SP-108B | STUDY-38 | Done | Removed; Git recovery and tombstone verified |
| SP-108C | STUDY-39 | Done | Removed; Git recovery and tombstone verified |
| SP-108D | STUDY-40 | Done | Retained: dirty specification; parent also preserves shared context. Final parent review PASS |
| SP-108E | STUDY-41 | Done | Removed; Git recovery and tombstone verified |
| SP-108F | STUDY-42 | Done | Removed; Git recovery and tombstone verified |
| SP-108G | STUDY-43 | Done | Removed; Git recovery and tombstone verified |
| SP-109 | STUDY-44 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |
| SP-109A | STUDY-45 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |
| SP-109B | STUDY-46 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |
| SP-109C | STUDY-47 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |
| SP-109D | STUDY-48 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |
| SP-109E | STUDY-49 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |
| SP-109F | STUDY-50 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |
| SP-109G | STUDY-51 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |
| SP-109H | STUDY-52 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |
| SP-109I | STUDY-53 | To Do | Retained: parent unfinished; A/B implemented, C–I queued |

## Evidence

- [SP-105 passing review](../stories/EP01/SP-105/artifacts/SP-105/review.md) and [reconciled queue](../stories/EP01/SP-105/README.md#execution-queue).
- [SP-106 review](../stories/EP01/SP-106/artifacts/SP-106/review.md) and [queue](../stories/EP01/SP-106/README.md#execution-queue).
- [Recovery index](./tombstones.md) and [ledger](./ledger.json).
