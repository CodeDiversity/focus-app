# Removed story specifications

No story specifications have been removed by the Jira-sync workflow.

The sync agent adds a stable `story-<lowercase-id>` anchor per first removal,
with Jira, recoverable content commit and retained review/implementation links.
It retains that entry through reopen/removal cycles; detailed history lives in
[ledger.json](./ledger.json). Parent delivery READMEs and artifacts remain in place.
